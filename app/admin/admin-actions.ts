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
import { requireActor, isActorError, type AppRole } from "@/lib/roles";
import { createAuthUser, setAuthPassword, generateTempPassword } from "@/lib/staff";
import { logAudit, recordEvent } from "@/lib/ledger";
import type { ActionResult } from "@/app/actions";
import type { CommercialStatus, ServiceType } from "@/lib/sn-domain";
import type { RelayStatus } from "@/lib/relays";
import type { RouteStatus } from "@/lib/routes";


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

// ---------------------------------------------------------------------------
// Staff accounts (SN-REL-03, SN-REL-05)
// ---------------------------------------------------------------------------
// The administrator invites merchants and drivers, grants shop-specific
// access and resets credentials — all without developer involvement.

export interface StaffInput {
  email: string;
  fullName: string;
  phone?: string;
  role: AppRole;
  relayIds?: string[];
  partnerName?: string;
}

/**
 * Create a staff account and return a one-time temporary password.
 *
 * The password is shown to the administrator once so they can pass it on;
 * it is never stored in readable form and cannot be retrieved later — only
 * reset.
 */
export async function inviteStaff(
  input: StaffInput,
): Promise<ActionResult & { tempPassword?: string }> {
  const actor = await requireActor(["admin"]);
  if (isActorError(actor)) return actor;

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Adresse e-mail invalide." };
  if (!input.fullName.trim()) return { error: "Le nom complet est obligatoire." };
  if (input.role === "customer") return { error: "Choisissez un rôle du personnel." };

  const tempPassword = generateTempPassword();
  const created = await createAuthUser(email, tempPassword, input.fullName.trim());
  if (created.error || !created.id) return { error: created.error ?? "Création impossible." };

  const db = supabaseAdmin();
  const { error } = await db.from("app_users").upsert(
    {
      id: created.id,
      email,
      full_name: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      role: input.role,
      status: "invited",
      partner_name: input.partnerName?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) return { error: error.message };

  // A merchant may act only on the shops granted here (AT-02).
  if (input.relayIds?.length) {
    await db
      .from("relay_users")
      .upsert(
        input.relayIds.map((relay_id) => ({ relay_id, user_id: created.id! })),
        { onConflict: "relay_id,user_id" },
      );
  }

  void logAudit({
    actor,
    action: "staff.invite",
    targetTable: "app_users",
    targetId: created.id,
    after: { email, role: input.role, relays: input.relayIds ?? [] },
  });

  revalidatePath("/admin/staff");
  return { ok: true, tempPassword };
}

/** Change a staff member's role, shops or company. */
export async function updateStaff(
  userId: string,
  patch: { role?: AppRole; relayIds?: string[]; partnerName?: string | null; phone?: string | null },
): Promise<ActionResult> {
  const actor = await requireActor(["admin"]);
  if (isActorError(actor)) return actor;

  const db = supabaseAdmin();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.role) update.role = patch.role;
  if (patch.partnerName !== undefined) update.partner_name = patch.partnerName || null;
  if (patch.phone !== undefined) update.phone = patch.phone || null;

  const { error } = await db.from("app_users").update(update).eq("id", userId);
  if (error) return { error: error.message };

  if (patch.relayIds) {
    // Replace the grant set so removing a shop actually removes access.
    await db.from("relay_users").delete().eq("user_id", userId);
    if (patch.relayIds.length > 0) {
      await db
        .from("relay_users")
        .insert(patch.relayIds.map((relay_id) => ({ relay_id, user_id: userId })));
    }
  }

  void logAudit({
    actor,
    action: "staff.update",
    targetTable: "app_users",
    targetId: userId,
    after: { ...update, relays: patch.relayIds },
  });
  revalidatePath("/admin/staff");
  return { ok: true };
}

/** Suspend or reactivate an account. A suspended user fails every guard. */
export async function setStaffStatus(
  userId: string,
  status: "active" | "suspended",
): Promise<ActionResult> {
  const actor = await requireActor(["admin"]);
  if (isActorError(actor)) return actor;

  const { error } = await supabaseAdmin()
    .from("app_users")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { error: error.message };

  void logAudit({
    actor,
    action: `staff.${status}`,
    targetTable: "app_users",
    targetId: userId,
    after: { status },
  });
  revalidatePath("/admin/staff");
  return { ok: true };
}

/** Issue a new temporary password, shown once to the administrator. */
export async function resetStaffPassword(
  userId: string,
): Promise<ActionResult & { tempPassword?: string }> {
  const actor = await requireActor(["admin"]);
  if (isActorError(actor)) return actor;

  const tempPassword = generateTempPassword();
  const failure = await setAuthPassword(userId, tempPassword);
  if (failure) return { error: failure };

  await supabaseAdmin()
    .from("app_users")
    .update({ status: "invited", updated_at: new Date().toISOString() })
    .eq("id", userId);

  void logAudit({
    actor,
    action: "staff.reset_password",
    targetTable: "app_users",
    targetId: userId,
  });
  revalidatePath("/admin/staff");
  return { ok: true, tempPassword };
}

// ---------------------------------------------------------------------------
// Driver rounds (spec §10)
// ---------------------------------------------------------------------------

export interface RouteInput {
  id?: string;
  code: string;
  driverId: string | null;
  routeDate: string;
  originTown?: string;
  destinationTown?: string;
  status?: RouteStatus;
}

export async function saveRoute(input: RouteInput): Promise<ActionResult & { id?: string }> {
  const actor = await requireActor(["admin", "support"]);
  if (isActorError(actor)) return actor;
  if (!input.code.trim()) return { error: "Le code de la tournée est obligatoire." };
  if (!input.routeDate) return { error: "Choisissez la date de la tournée." };

  const db = supabaseAdmin();
  const row: Record<string, unknown> = {
    code: input.code.trim().toUpperCase(),
    driver_id: input.driverId || null,
    route_date: input.routeDate,
    origin_town: input.originTown?.trim() || null,
    destination_town: input.destinationTown?.trim() || null,
  };
  if (input.status) row.status = input.status;

  if (input.id) {
    const { error } = await db.from("driver_routes").update(row).eq("id", input.id);
    if (error) return { error: error.message };
    void logAudit({ actor, action: "route.update", targetTable: "driver_routes", targetId: input.id, after: row });
    revalidatePath("/admin/routes");
    return { ok: true, id: input.id };
  }

  const { data: created, error } = await db.from("driver_routes").insert(row).select("id").single();
  if (error) {
    return { error: error.code === "23505" ? "Ce code de tournée existe déjà." : error.message };
  }
  void logAudit({
    actor,
    action: "route.create",
    targetTable: "driver_routes",
    targetId: created.id as string,
    after: row,
  });
  revalidatePath("/admin/routes");
  return { ok: true, id: created.id as string };
}

export async function setRouteStatus(id: string, status: RouteStatus): Promise<ActionResult> {
  const actor = await requireActor(["admin", "support"]);
  if (isActorError(actor)) return actor;

  const { error } = await supabaseAdmin().from("driver_routes").update({ status }).eq("id", id);
  if (error) return { error: error.message };
  void logAudit({ actor, action: `route.${status}`, targetTable: "driver_routes", targetId: id, after: { status } });
  revalidatePath("/admin/routes");
  revalidatePath("/driver");
  return { ok: true };
}

/** Put parcels on a round, or take them off it when `routeId` is null. */
export async function assignParcelsToRoute(
  parcelIds: string[],
  routeId: string | null,
): Promise<ActionResult> {
  const actor = await requireActor(["admin", "support"]);
  if (isActorError(actor)) return actor;
  if (parcelIds.length === 0) return { error: "Sélectionnez au moins un colis." };

  const { error } = await supabaseAdmin()
    .from("parcels")
    .update({ route_id: routeId, updated_at: new Date().toISOString() })
    .in("id", parcelIds);
  if (error) return { error: error.message };

  // Assignment is an operational change, not a custody change: the parcel
  // does not move until a driver actually scans it.
  for (const parcelId of parcelIds) {
    void recordEvent({
      actor,
      eventType: routeId ? "route.assigned" : "route.unassigned",
      parcelId,
      routeId: routeId ?? undefined,
      source: "manual",
    });
  }
  void logAudit({
    actor,
    action: routeId ? "route.assign_parcels" : "route.unassign_parcels",
    targetTable: "driver_routes",
    targetId: routeId ?? "",
    after: { parcels: parcelIds.length },
  });

  revalidatePath("/admin/routes");
  revalidatePath("/driver");
  return { ok: true };
}
