// Audit log + event ledger writes (spec §3, SN-SCAN-03, SN-TRK-03).
//
// Both helpers are BEST EFFORT: they never throw and never block the action
// that called them, so an un-run migration or a transient database error
// can't break a booking or a status update. Failures are logged instead.
import { supabaseAdmin } from "@/lib/supabase";
import type { Actor } from "@/lib/roles";

/** Source of a tracking update — must stay distinguishable (SN-TRK-03). */
export type EventSource = "scanned" | "manual" | "declared" | "imported" | "system";

export interface AuditEntry {
  actor: Actor | null;
  /** Dotted action name, e.g. "order.status_change", "relay.approve". */
  action: string;
  targetTable?: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}

/** Record a sensitive action (§3: "sensitive actions must be logged"). */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const { error } = await supabaseAdmin()
      .from("audit_log")
      .insert({
        actor_user_id: entry.actor?.userId ?? null,
        actor_name: entry.actor?.name ?? "système",
        actor_role: entry.actor?.role ?? null,
        action: entry.action,
        target_table: entry.targetTable ?? null,
        target_id: entry.targetId ?? null,
        before: entry.before ?? null,
        after: entry.after ?? null,
        reason: entry.reason ?? null,
      });
    if (error) console.error("[audit]", entry.action, error.message);
  } catch (e) {
    console.error("[audit]", entry.action, e instanceof Error ? e.message : e);
  }
}

export interface EventEntry {
  actor: Actor | null;
  /** e.g. "order.status_change", "scan.relay_receipt", "incident.reported". */
  eventType: string;
  orderId?: string;
  parcelId?: string;
  resultingStatus?: string;
  relayId?: string;
  routeId?: string;
  source: EventSource;
  evidence?: Record<string, unknown>;
  exceptionCode?: string;
  exceptionNote?: string;
  /** Id of the event this one corrects; a correction never edits the original. */
  correctionOf?: number;
  /** Mandatory when correcting a previous event (SN-TRK-03). */
  reason?: string;
}

/**
 * Append one row to the custody ledger. `at` is left to the database default
 * so the timestamp is always server time, never client-supplied.
 */
export async function recordEvent(entry: EventEntry): Promise<void> {
  try {
    const { error } = await supabaseAdmin()
      .from("events")
      .insert({
        parcel_id: entry.parcelId ?? null,
        order_id: entry.orderId ?? null,
        event_type: entry.eventType,
        resulting_status: entry.resultingStatus ?? null,
        actor_user_id: entry.actor?.userId ?? null,
        actor_name: entry.actor?.name ?? "système",
        actor_role: entry.actor?.role ?? null,
        relay_id: entry.relayId ?? null,
        route_id: entry.routeId ?? null,
        source: entry.source,
        evidence: entry.evidence ?? null,
        exception_code: entry.exceptionCode ?? null,
        exception_note: entry.exceptionNote ?? null,
        correction_of: entry.correctionOf ?? null,
        reason: entry.reason ?? null,
      });
    if (error) console.error("[event]", entry.eventType, error.message);
  } catch (e) {
    console.error("[event]", entry.eventType, e instanceof Error ? e.message : e);
  }
}
