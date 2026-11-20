"use server";

// Administrator configuration actions: relay shops, zones, pricing and the
// operating schedule.
//
// The founder requires every one of these to be editable from the console
// "without developer intervention" (answers 4, 5 and 6 of 20 Nov 2026), so
// each one is a full create/update, not a one-off script. Every mutation is
// attributed to the authenticated administrator and written to audit_log
// (§3: sensitive actions must be logged).
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase";
import { requireActor, isActorError } from "@/lib/roles";
import { logAudit } from "@/lib/ledger";
import type { ActionResult } from "@/app/actions";
import type { CommercialStatus, ServiceType } from "@/lib/sn-domain";
import type { RelayStatus } from "@/lib/relays";


function revalidateAdmin(extra?: string) {
  revalidatePath("/admin/relays");
  revalidatePath("/admin/zones");
  revalidatePath("/admin/pricing");
  revalidatePath("/admin/schedule");
  if (extra) revalidatePath(extra);
}

// ---------------------------------------------------------------------------
// Relay shops (SN-REL-01, SN-REL-02, SN-REL-04)
// ---------------------------------------------------------------------------

export interface RelayInput {
  id?: string;
  code: string;
  name: string;
  region: string;
  town: string;
  neighborhood?: string;
  address: string;
  gpsLat?: number | null;
  gpsLng?: number | null;
  contactName?: string;
  contactPhone?: string;
  openingHours?: Record<string, string>;
  openingDays?: number[];
  collectionCutoff?: string | null;
  capacity?: number | null;
  permittedServices?: string[];
  status?: RelayStatus;
  commercialStatus?: CommercialStatus;
  zoneId?: string | null;
  notes?: string;
}

export async function saveRelay(input: RelayInput): Promise<ActionResult & { id?: string }> {
  const actor = await requireActor(["admin", "support"]);
  if (isActorError(actor)) return actor;

  if (!input.code.trim()) return { error: "Le code du point relais est obligatoire." };
  if (!input.name.trim()) return { error: "Le nom du point relais est obligatoire." };

  const db = supabaseAdmin();
  const row: Record<string, unknown> = {
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    region: input.region?.trim() ?? "",
    town: input.town?.trim() ?? "",
    neighborhood: input.neighborhood?.trim() || null,
    address: input.address?.trim() ?? "",
    gps_lat: input.gpsLat ?? null,
    gps_lng: input.gpsLng ?? null,
    contact_name: input.contactName?.trim() || null,
    contact_phone: input.contactPhone?.trim() || null,
    opening_hours: input.openingHours ?? {},
    opening_days: input.openingDays ?? [1, 2, 3, 4, 5, 6],
    collection_cutoff: input.collectionCutoff || null,
    capacity: input.capacity ?? null,
    permitted_services: input.permittedServices ?? ["domestic"],
    zone_id: input.zoneId || null,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  if (input.status) row.status = input.status;
  if (input.commercialStatus) row.commercial_status = input.commercialStatus;

  if (input.id) {
    const { data: before } = await db.from("relays").select("*").eq("id", input.id).maybeSingle();
    const { error } = await db.from("relays").update(row).eq("id", input.id);
    if (error) return { error: error.message };
    void logAudit({
      actor,
      action: "relay.update",
      targetTable: "relays",
      targetId: input.id,
      before,
      after: row,
    });
    revalidateAdmin(`/admin/relays/${input.id}`);
    return { ok: true, id: input.id };
  }

  // A brand new shop starts as a draft unless the administrator said otherwise.
  if (!row.status) row.status = "draft";
  const { data: created, error } = await db.from("relays").insert(row).select("id").single();
  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Ce code de point relais existe déjà."
          : error.message,
    };
  }
  void logAudit({
    actor,
    action: "relay.create",
    targetTable: "relays",
    targetId: created.id as string,
    after: row,
  });
  revalidateAdmin();
  return { ok: true, id: created.id as string };
}

/** Move a relay through its lifecycle: draft → pending → active → suspended/closed. */
export async function setRelayStatus(id: string, status: RelayStatus): Promise<ActionResult> {
  const actor = await requireActor(["admin", "support"]);
  if (isActorError(actor)) return actor;

  const db = supabaseAdmin();
  const { data: before } = await db.from("relays").select("status").eq("id", id).maybeSingle();
  const { error } = await db
    .from("relays")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  void logAudit({
    actor,
    action: `relay.${status}`,
    targetTable: "relays",
    targetId: id,
    before: { status: before?.status ?? null },
    after: { status },
  });
  revalidateAdmin(`/admin/relays/${id}`);
  return { ok: true };
}

/** Open or close a relay commercially, independently of its operational state. */
export async function setRelayCommercialStatus(
  id: string,
  commercialStatus: CommercialStatus,
): Promise<ActionResult> {
  const actor = await requireActor(["admin", "support"]);
  if (isActorError(actor)) return actor;

  const db = supabaseAdmin();
  const { data: before } = await db
    .from("relays")
    .select("commercial_status")
    .eq("id", id)
    .maybeSingle();
  const { error } = await db
    .from("relays")
    .update({ commercial_status: commercialStatus, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  void logAudit({
    actor,
    action: "relay.commercial_status",
    targetTable: "relays",
    targetId: id,
    before: { commercial_status: before?.commercial_status ?? null },
    after: { commercial_status: commercialStatus },
  });
  revalidateAdmin(`/admin/relays/${id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Zones (founder answer 4 — progressive regional activation)
// ---------------------------------------------------------------------------

export interface ZoneInput {
  id?: string;
  code: string;
  name: string;
  region?: string;
  towns: string[];
  commercialStatus?: CommercialStatus;
  sortOrder?: number;
}

export async function saveZone(input: ZoneInput): Promise<ActionResult & { id?: string }> {
  const actor = await requireActor(["admin", "support"]);
  if (isActorError(actor)) return actor;
  if (!input.code.trim() || !input.name.trim()) {
    return { error: "Le code et le nom de la zone sont obligatoires." };
  }

  const db = supabaseAdmin();
  const row: Record<string, unknown> = {
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    region: input.region?.trim() ?? "",
    towns: input.towns.map((t) => t.trim()).filter(Boolean),
    sort_order: input.sortOrder ?? 100,
    updated_at: new Date().toISOString(),
  };
  if (input.commercialStatus) row.commercial_status = input.commercialStatus;

  if (input.id) {
    const { error } = await db.from("zones").update(row).eq("id", input.id);
    if (error) return { error: error.message };
    void logAudit({ actor, action: "zone.update", targetTable: "zones", targetId: input.id, after: row });
    revalidateAdmin();
    return { ok: true, id: input.id };
  }

  const { data: created, error } = await db.from("zones").insert(row).select("id").single();
  if (error) {
    return { error: error.code === "23505" ? "Ce code de zone existe déjà." : error.message };
  }
  void logAudit({ actor, action: "zone.create", targetTable: "zones", targetId: created.id as string, after: row });
  revalidateAdmin();
  return { ok: true, id: created.id as string };
}

/** Commercially activate or pause a whole zone (answer 4). */
export async function setZoneCommercialStatus(
  id: string,
  commercialStatus: CommercialStatus,
): Promise<ActionResult> {
  const actor = await requireActor(["admin", "support"]);
  if (isActorError(actor)) return actor;

  const { error } = await supabaseAdmin()
    .from("zones")
    .update({ commercial_status: commercialStatus, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  void logAudit({
    actor,
    action: "zone.commercial_status",
    targetTable: "zones",
    targetId: id,
    after: { commercial_status: commercialStatus },
  });
  revalidateAdmin();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Pricing (founder answer 5 — editable without developer intervention)
// ---------------------------------------------------------------------------

export interface PricingRuleInput {
  id?: string;
  originZoneId: string;
  destinationZoneId: string;
  serviceType: ServiceType;
  label: string;
  minWeightKg: number;
  maxWeightKg: number | null;
  price: number;
  currency?: string;
  status?: "active" | "inactive";
  sortOrder?: number;
}

export async function savePricingRule(input: PricingRuleInput): Promise<ActionResult & { id?: string }> {
  const actor = await requireActor(["admin", "support"]);
  if (isActorError(actor)) return actor;

  if (!input.originZoneId || !input.destinationZoneId) {
    return { error: "Zone d'origine et de destination obligatoires." };
  }
  if (!(input.price >= 0)) return { error: "Le prix doit être un nombre positif." };
  if (input.maxWeightKg != null && input.maxWeightKg <= input.minWeightKg) {
    return { error: "Le poids maximum doit être supérieur au poids minimum." };
  }

  const db = supabaseAdmin();
  const row: Record<string, unknown> = {
    origin_zone_id: input.originZoneId,
    destination_zone_id: input.destinationZoneId,
    service_type: input.serviceType,
    label: input.label?.trim() ?? "",
    min_weight_kg: input.minWeightKg,
    max_weight_kg: input.maxWeightKg,
    price: input.price,
    currency: input.currency ?? "XOF",
    status: input.status ?? "active",
    sort_order: input.sortOrder ?? 100,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data: before } = await db
      .from("sn_pricing_rules")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    const { error } = await db.from("sn_pricing_rules").update(row).eq("id", input.id);
    if (error) return { error: error.message };
    void logAudit({
      actor,
      action: "pricing.update",
      targetTable: "sn_pricing_rules",
      targetId: input.id,
      before,
      after: row,
    });
    revalidateAdmin();
    return { ok: true, id: input.id };
  }

  const { data: created, error } = await db
    .from("sn_pricing_rules")
    .insert(row)
    .select("id")
    .single();
  if (error) return { error: error.message };
  void logAudit({
    actor,
    action: "pricing.create",
    targetTable: "sn_pricing_rules",
    targetId: created.id as string,
    after: row,
  });
  revalidateAdmin();
  return { ok: true, id: created.id as string };
}

/**
 * Retire a pricing rule.
 *
 * Deactivates rather than deletes: a price that was once quoted to a customer
 * stays on record, and the rule can be brought back without retyping it.
 */
export async function setPricingRuleStatus(
  id: string,
  status: "active" | "inactive",
): Promise<ActionResult> {
  const actor = await requireActor(["admin", "support"]);
  if (isActorError(actor)) return actor;

  const { error } = await supabaseAdmin()
    .from("sn_pricing_rules")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  void logAudit({
    actor,
    action: `pricing.${status}`,
    targetTable: "sn_pricing_rules",
    targetId: id,
    after: { status },
  });
  revalidateAdmin();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Operating schedule (founder answer 6)
// ---------------------------------------------------------------------------

export interface ScheduleInput {
  transportDays: number[];
  collectionCutoff: string;
  deliveryMinDays: number;
  deliveryMaxDays: number;
}

export async function saveOperatingSettings(input: ScheduleInput): Promise<ActionResult> {
  const actor = await requireActor(["admin", "support"]);
  if (isActorError(actor)) return actor;

  if (input.transportDays.length === 0) {
    return { error: "Sélectionnez au moins un jour de transport." };
  }
  if (input.deliveryMaxDays < input.deliveryMinDays) {
    return { error: "Le délai maximum doit être supérieur ou égal au délai minimum." };
  }

  const db = supabaseAdmin();
  const { data: before } = await db.from("operating_settings").select("*").eq("id", 1).maybeSingle();
  const row = {
    id: 1,
    transport_days: [...input.transportDays].sort((a, b) => a - b),
    collection_cutoff: input.collectionCutoff,
    delivery_min_days: input.deliveryMinDays,
    delivery_max_days: input.deliveryMaxDays,
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from("operating_settings").upsert(row, { onConflict: "id" });
  if (error) return { error: error.message };

  void logAudit({
    actor,
    action: "schedule.update",
    targetTable: "operating_settings",
    targetId: "1",
    before,
    after: row,
  });
  revalidateAdmin();
  return { ok: true };
}

/** Exceptional closure — network-wide, or for a single relay. */
export async function addNonOperatingDay(
  day: string,
  label: string,
  relayId?: string | null,
): Promise<ActionResult> {
  const actor = await requireActor(["admin", "support"]);
  if (isActorError(actor)) return actor;
  if (!day) return { error: "Choisissez une date." };

  const { error } = await supabaseAdmin()
    .from("non_operating_days")
    .insert({ day, label: label?.trim() ?? "", relay_id: relayId || null });
  if (error) {
    return {
      error: error.code === "23505" ? "Cette date est déjà enregistrée." : error.message,
    };
  }
  void logAudit({
    actor,
    action: "schedule.closure_add",
    targetTable: "non_operating_days",
    targetId: day,
    after: { day, label, relay_id: relayId ?? null },
  });
  revalidateAdmin();
  return { ok: true };
}

export async function removeNonOperatingDay(id: string): Promise<ActionResult> {
  const actor = await requireActor(["admin", "support"]);
  if (isActorError(actor)) return actor;

  const { error } = await supabaseAdmin().from("non_operating_days").delete().eq("id", id);
  if (error) return { error: error.message };
  void logAudit({
    actor,
    action: "schedule.closure_remove",
    targetTable: "non_operating_days",
    targetId: id,
  });
  revalidateAdmin();
  return { ok: true };
}
