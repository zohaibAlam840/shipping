"use server";

// Parcel custody: scanning, handover, collection and delivery.
// Spec §6 (SN-SCAN-01…07) and acceptance tests AT-04 … AT-08.
//
// Rules this file enforces, all server-side:
//   - the actor is the authenticated user, never a value sent by the client;
//   - a driver handover alone NEVER makes a parcel available (AT-05) — only
//     the merchant's own acceptance scan does;
//   - a merchant may act only on parcels at their own shop (AT-02);
//   - repeated or out-of-order scans produce no false events (AT-08);
//   - "Collected" requires the recipient's one-time code (AT-06), and home
//     delivery records date, time and driver automatically (AT-07).
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { getAppUser, requireActor, isActorError, canActOnRelay } from "@/lib/roles";
import { recordEvent, logAudit } from "@/lib/ledger";
import { verifyPickupCode } from "@/lib/pickup-code";
import { getParcelByToken, getParcelByRef, type Parcel, type ParcelStatus } from "@/lib/parcels";
import { sendPickupCodeToRecipient } from "@/app/sn-actions";
import type { ActionResult } from "@/app/actions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ScanResult extends ActionResult {
  parcelRef?: string;
  status?: ParcelStatus;
  statusFr?: string;
  /** True when the parcel was already in this state — not an error (AT-08). */
  duplicate?: boolean;
}

/**
 * Resolve a scanned payload.
 *
 * Accepts the opaque QR token or a typed parcel reference, so manual entry is
 * a first-class fallback when the camera fails or the label is damaged
 * (SN-SCAN-02, SN-SCAN-07).
 */
async function resolveParcel(input: string): Promise<Parcel | null> {
  const value = input.trim();
  if (!value) return null;
  return (await getParcelByToken(value)) ?? (await getParcelByRef(value));
}

/** Statuses from which a given transition is allowed. */
const ALLOWED_FROM: Record<string, ParcelStatus[]> = {
  collect: ["Booked"],
  depart: ["Accepted"],
  handover: ["Accepted", "In transit"],
  receipt: ["Awaiting relay acceptance"],
  pickup: ["Ready for pickup"],
  deliver: ["Accepted", "In transit"],
};

const RESULTING: Record<string, ParcelStatus> = {
  collect: "Accepted",
  depart: "In transit",
  handover: "Awaiting relay acceptance",
  receipt: "Ready for pickup",
  pickup: "Collected at relay",
  deliver: "Delivered to address",
};

const STEP_FR: Record<string, string> = {
  collect: "collecte",
  depart: "départ",
  handover: "remise au relais",
  receipt: "réception en boutique",
  pickup: "retrait par le destinataire",
  deliver: "livraison à domicile",
};

/** Shared guard: resolves the parcel and checks the transition is legal. */
async function guard(
  token: string,
  step: keyof typeof RESULTING,
): Promise<{ parcel: Parcel } | ScanResult> {
  const parcel = await resolveParcel(token);
  if (!parcel) {
    return { error: "Colis inconnu. Vérifiez le code ou saisissez-le manuellement." };
  }
  if (parcel.status === RESULTING[step]) {
    // Already done — report it plainly and write nothing (AT-08).
    return {
      ok: true,
      duplicate: true,
      parcelRef: parcel.parcelRef,
      status: parcel.status,
      error: `Ce colis a déjà été scanné pour la ${STEP_FR[step]}.`,
    };
  }
  if (!ALLOWED_FROM[step].includes(parcel.status)) {
    return {
      error: `Étape impossible : le colis est au statut « ${parcel.status} ».`,
      parcelRef: parcel.parcelRef,
      status: parcel.status,
    };
  }
  return { parcel };
}

function isScanResult(v: { parcel: Parcel } | ScanResult): v is ScanResult {
  return !("parcel" in v);
}

async function applyStatus(
  parcelId: string,
  patch: Record<string, unknown>,
): Promise<string | null> {
  const { error } = await supabaseAdmin().from("parcels").update(patch).eq("id", parcelId);
  return error ? error.message : null;
}

// ---------------------------------------------------------------------------
// Driver scans
// ---------------------------------------------------------------------------

/** AT-04: driver collects the parcel with a phone camera, no scanner hardware. */
export async function scanCollect(token: string, relayId?: string): Promise<ScanResult> {
  const actor = await requireActor(["driver", "admin", "support"]);
  if (isActorError(actor)) return actor;

  const g = await guard(token, "collect");
  if (isScanResult(g)) return g;

  const err = await applyStatus(g.parcel.id, {
    status: "Accepted",
    current_relay_id: relayId ?? g.parcel.currentRelayId,
    holder_user_id: actor.userId,
    updated_at: new Date().toISOString(),
  });
  if (err) return { error: err };

  void recordEvent({
    actor,
    eventType: "scan.collect",
    parcelId: g.parcel.id,
    orderId: g.parcel.orderId ?? undefined,
    resultingStatus: "Accepted",
    relayId: relayId ?? g.parcel.currentRelayId ?? undefined,
    source: "scanned",
  });
  revalidatePath("/driver");
  return { ok: true, parcelRef: g.parcel.parcelRef, status: "Accepted" };
}

/** Parcel leaves for the destination relay. */
export async function scanDepart(token: string): Promise<ScanResult> {
  const actor = await requireActor(["driver", "admin", "support"]);
  if (isActorError(actor)) return actor;

  const g = await guard(token, "depart");
  if (isScanResult(g)) return g;

  const err = await applyStatus(g.parcel.id, {
    status: "In transit",
    updated_at: new Date().toISOString(),
  });
  if (err) return { error: err };

  void recordEvent({
    actor,
    eventType: "scan.depart",
    parcelId: g.parcel.id,
    orderId: g.parcel.orderId ?? undefined,
    resultingStatus: "In transit",
    source: "scanned",
  });
  revalidatePath("/driver");
  return { ok: true, parcelRef: g.parcel.parcelRef, status: "In transit" };
}

/**
 * AT-05: the driver hands the parcel over.
 *
 * This deliberately does NOT make the parcel available for pickup — it only
 * moves it to "awaiting relay acceptance". The merchant's own scan is what
 * confirms physical receipt (SN-SCAN-04).
 */
export async function scanHandover(token: string, relayId: string): Promise<ScanResult> {
  const actor = await requireActor(["driver", "admin", "support"]);
  if (isActorError(actor)) return actor;
  if (!relayId) return { error: "Indiquez le point relais destinataire." };

  const g = await guard(token, "handover");
  if (isScanResult(g)) return g;

  const err = await applyStatus(g.parcel.id, {
    status: "Awaiting relay acceptance",
    current_relay_id: relayId,
    holder_user_id: actor.userId,
    updated_at: new Date().toISOString(),
  });
  if (err) return { error: err };

  void recordEvent({
    actor,
    eventType: "scan.handover",
    parcelId: g.parcel.id,
    orderId: g.parcel.orderId ?? undefined,
    resultingStatus: "Awaiting relay acceptance",
    relayId,
    source: "scanned",
  });
  revalidatePath("/driver");
  revalidatePath("/merchant");
  return { ok: true, parcelRef: g.parcel.parcelRef, status: "Awaiting relay acceptance" };
}

// ---------------------------------------------------------------------------
// Merchant scans
// ---------------------------------------------------------------------------

/**
 * AT-05 / SN-SCAN-04: the merchant acknowledges physical receipt.
 * Only this marks the parcel "Ready for pickup", and only for their own shop.
 */
export async function scanRelayReceipt(token: string): Promise<ScanResult> {
  const actor = await requireActor(["merchant", "admin", "support"]);
  if (isActorError(actor)) return actor;

  const user = await getAppUser();
  const g = await guard(token, "receipt");
  if (isScanResult(g)) return g;

  // SN-SCAN-07: a parcel that arrived at the wrong shop must not be accepted.
  const relayId = g.parcel.currentRelayId ?? g.parcel.destinationRelayId;
  if (user && user.role === "merchant") {
    if (!relayId || !canActOnRelay(user, relayId)) {
      return {
        error: "Ce colis n'est pas destiné à votre boutique. Signalez l'anomalie.",
        parcelRef: g.parcel.parcelRef,
      };
    }
  }

  const err = await applyStatus(g.parcel.id, {
    status: "Ready for pickup",
    current_relay_id: relayId,
    holder_user_id: actor.userId,
    updated_at: new Date().toISOString(),
  });
  if (err) return { error: err };

  void recordEvent({
    actor,
    eventType: "scan.relay_receipt",
    parcelId: g.parcel.id,
    orderId: g.parcel.orderId ?? undefined,
    resultingStatus: "Ready for pickup",
    relayId: relayId ?? undefined,
    source: "scanned",
  });

  // The pickup code is sent at the moment the parcel is actually collectable,
  // not at booking (founder answer 2).
  void sendPickupCodeToRecipient(g.parcel.id);

  revalidatePath("/merchant");
  return { ok: true, parcelRef: g.parcel.parcelRef, status: "Ready for pickup" };
}

/**
 * AT-06: hand the parcel to the recipient.
 * Requires the one-time code; the scan alone is never enough.
 */
export async function verifyPickup(token: string, code: string): Promise<ScanResult> {
  const actor = await requireActor(["merchant", "admin", "support"]);
  if (isActorError(actor)) return actor;
  if (!code?.trim()) return { error: "Saisissez le code de retrait du destinataire." };

  const user = await getAppUser();
  const g = await guard(token, "pickup");
  if (isScanResult(g)) return g;

  if (user && user.role === "merchant") {
    const relayId = g.parcel.currentRelayId;
    if (!relayId || !canActOnRelay(user, relayId)) {
      return { error: "Ce colis n'est pas dans votre boutique.", parcelRef: g.parcel.parcelRef };
    }
  }

  const { data: row } = await supabaseAdmin()
    .from("parcels")
    .select("pickup_code_hash")
    .eq("id", g.parcel.id)
    .maybeSingle();

  if (!verifyPickupCode(code, (row as any)?.pickup_code_hash ?? null)) {
    // A failed verification is itself evidence worth keeping.
    void recordEvent({
      actor,
      eventType: "pickup.code_rejected",
      parcelId: g.parcel.id,
      orderId: g.parcel.orderId ?? undefined,
      source: "scanned",
      exceptionCode: "wrong_pickup_code",
    });
    return { error: "Code de retrait incorrect.", parcelRef: g.parcel.parcelRef };
  }

  const now = new Date().toISOString();
  const err = await applyStatus(g.parcel.id, {
    status: "Collected at relay",
    pickup_verified_at: now,
    delivery_proof: "recipient_code",
    delivered_at: now,
    delivered_by: actor.userId,
    updated_at: now,
  });
  if (err) return { error: err };

  void recordEvent({
    actor,
    eventType: "pickup.verified",
    parcelId: g.parcel.id,
    orderId: g.parcel.orderId ?? undefined,
    resultingStatus: "Collected at relay",
    relayId: g.parcel.currentRelayId ?? undefined,
    source: "scanned",
    evidence: { proof: "recipient_code", verified_at: now },
  });
  void logAudit({
    actor,
    action: "parcel.collected",
    targetTable: "parcels",
    targetId: g.parcel.id,
    after: { status: "Collected at relay", proof: "recipient_code" },
  });

  revalidatePath("/merchant");
  return { ok: true, parcelRef: g.parcel.parcelRef, status: "Collected at relay" };
}

// ---------------------------------------------------------------------------
// Home delivery
// ---------------------------------------------------------------------------

/**
 * AT-07: driver confirms a home delivery from a phone.
 * The recipient's code is the proof; date, time and driver are recorded
 * automatically (founder answer 3). No signature or photo in Phase 1.
 */
export async function confirmHomeDelivery(token: string, code: string): Promise<ScanResult> {
  const actor = await requireActor(["driver", "admin", "support"]);
  if (isActorError(actor)) return actor;
  if (!code?.trim()) return { error: "Saisissez le code confidentiel du destinataire." };

  const g = await guard(token, "deliver");
  if (isScanResult(g)) return g;

  const { data: row } = await supabaseAdmin()
    .from("parcels")
    .select("pickup_code_hash")
    .eq("id", g.parcel.id)
    .maybeSingle();

  if (!verifyPickupCode(code, (row as any)?.pickup_code_hash ?? null)) {
    void recordEvent({
      actor,
      eventType: "delivery.code_rejected",
      parcelId: g.parcel.id,
      orderId: g.parcel.orderId ?? undefined,
      source: "scanned",
      exceptionCode: "wrong_delivery_code",
    });
    return { error: "Code incorrect.", parcelRef: g.parcel.parcelRef };
  }

  const now = new Date().toISOString();
  const err = await applyStatus(g.parcel.id, {
    status: "Delivered to address",
    delivered_at: now,
    delivered_by: actor.userId,
    delivery_proof: "recipient_code",
    pickup_verified_at: now,
    updated_at: now,
  });
  if (err) return { error: err };

  void recordEvent({
    actor,
    eventType: "delivery.confirmed",
    parcelId: g.parcel.id,
    orderId: g.parcel.orderId ?? undefined,
    resultingStatus: "Delivered to address",
    source: "scanned",
    evidence: { proof: "recipient_code", delivered_at: now, driver: actor.name },
  });
  void logAudit({
    actor,
    action: "parcel.delivered",
    targetTable: "parcels",
    targetId: g.parcel.id,
    after: { status: "Delivered to address", delivered_at: now },
  });

  revalidatePath("/driver");
  return { ok: true, parcelRef: g.parcel.parcelRef, status: "Delivered to address" };
}

/** SN-SCAN-06: a delivery attempt that failed, recorded without losing custody. */
export async function reportFailedAttempt(token: string, note: string): Promise<ScanResult> {
  const actor = await requireActor(["driver", "admin", "support"]);
  if (isActorError(actor)) return actor;

  const parcel = await resolveParcel(token);
  if (!parcel) return { error: "Colis inconnu." };

  const err = await applyStatus(parcel.id, {
    delivery_attempts: parcel.deliveryAttempts + 1,
    updated_at: new Date().toISOString(),
  });
  if (err) return { error: err };

  void recordEvent({
    actor,
    eventType: "delivery.failed_attempt",
    parcelId: parcel.id,
    orderId: parcel.orderId ?? undefined,
    source: "scanned",
    exceptionCode: "failed_attempt",
    exceptionNote: note,
    evidence: { attempt: parcel.deliveryAttempts + 1 },
  });
  revalidatePath("/driver");
  return { ok: true, parcelRef: parcel.parcelRef, status: parcel.status };
}

/** SN-SCAN-07: anything unexpected — wrong shop, damage, missing parcel. */
export async function reportParcelException(
  token: string,
  code: string,
  note: string,
): Promise<ScanResult> {
  const actor = await requireActor(["driver", "merchant", "admin", "support"]);
  if (isActorError(actor)) return actor;
  if (!note?.trim()) return { error: "Décrivez l'anomalie." };

  const parcel = await resolveParcel(token);
  if (!parcel) return { error: "Colis inconnu." };

  const err = await applyStatus(parcel.id, {
    status: "Issue",
    updated_at: new Date().toISOString(),
  });
  if (err) return { error: err };

  void recordEvent({
    actor,
    eventType: "parcel.exception",
    parcelId: parcel.id,
    orderId: parcel.orderId ?? undefined,
    resultingStatus: "Issue",
    relayId: parcel.currentRelayId ?? undefined,
    source: "scanned",
    exceptionCode: code || "other",
    exceptionNote: note,
  });
  void logAudit({
    actor,
    action: "parcel.exception",
    targetTable: "parcels",
    targetId: parcel.id,
    reason: note,
  });

  revalidatePath("/merchant");
  revalidatePath("/driver");
  return { ok: true, parcelRef: parcel.parcelRef, status: "Issue" };
}
