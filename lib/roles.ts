// Role model and server-side access control (spec §3).
//
// This is the Data Access Layer the Next.js authentication guide recommends:
// proxy.ts does a cheap "is there a session?" check, and the real role
// enforcement happens here, as close to the data as possible.
//
// Roles live in the `app_users` table, keyed by the Supabase Auth user id, so
// an event can always name the individual who acted (SN-SCAN-03, SN-REL-05).
// A signed-in person with NO app_users row is a plain customer — absence of a
// row means "no staff access", which is the safe default.
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { getSessionUser } from "@/lib/auth";

import type { AppRole } from "@/lib/roles-shared";

// Labels and role names are pure values — re-exported so server code can
// import everything from here, while client components import the pure
// module directly and never pull Supabase into the bundle.
export * from "@/lib/roles-shared";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: AppRole;
  status: "invited" | "active" | "suspended";
  /** Logistics company a driver belongs to (bridges to orders.partner). */
  partnerName: string | null;
  /** Relay shops this user may act on — empty for non-merchants. */
  relayIds: string[];
}

/** True when the error means "that table isn't there yet" (migration not run). */
function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    /app_users|relay_users/.test(err.message ?? "")
  );
}

/**
 * The signed-in person, with their role.
 *
 * Memoised per render pass with React `cache`, so guards in a layout and in
 * the page below it don't hit the database twice.
 *
 * Degrades to role "customer" if the Phase 1 migration hasn't been run yet or
 * the database is unreachable: the customer app keeps working and every staff
 * guard fails closed.
 */
export const getAppUser = cache(async (): Promise<AppUser | null> => {
  const session = await getSessionUser();
  if (!session) return null;

  const fallback: AppUser = {
    id: session.id,
    email: session.email,
    name: session.name,
    phone: session.phone,
    role: "customer",
    status: "active",
    partnerName: null,
    relayIds: [],
  };

  try {
    const { data, error } = await supabaseAdmin()
      .from("app_users")
      .select("id, email, full_name, phone, role, status, partner_name, relay_users(relay_id)")
      .eq("id", session.id)
      .maybeSingle();

    if (error) {
      if (!isMissingTable(error)) {
        console.error("[roles] app_users lookup failed:", error.message);
      }
      return fallback;
    }
    if (!data) return fallback; // signed in, no staff row → customer

    return {
      id: data.id,
      email: data.email ?? session.email,
      name: data.full_name || session.name,
      phone: data.phone ?? session.phone,
      role: (data.role ?? "customer") as AppRole,
      status: (data.status ?? "active") as AppUser["status"],
      partnerName: data.partner_name ?? null,
      relayIds: ((data.relay_users ?? []) as { relay_id: string }[]).map((r) => r.relay_id),
    };
  } catch (e) {
    console.error("[roles] app_users unreachable:", e instanceof Error ? e.message : e);
    return fallback;
  }
});

/**
 * Require one of `roles`, or redirect away. Use at the top of every staff
 * layout, page and server action — never rely on proxy.ts alone.
 */
export async function requireStaff(roles: AppRole[]): Promise<AppUser> {
  const user = await getAppUser();
  if (!user) redirect("/login");
  if (user.status !== "active") redirect("/login?denied=suspended");
  if (!roles.includes(user.role)) redirect("/login?denied=role");
  return user;
}

/** True when the merchant may act on this relay (AT-02). */
export function canActOnRelay(user: AppUser, relayId: string): boolean {
  if (user.role === "admin" || user.role === "support") return true;
  return user.relayIds.includes(relayId);
}

// ---------------------------------------------------------------------------
// Actor — who is performing an action, resolved on the server
// ---------------------------------------------------------------------------
// Every status change and every event must carry a *server-resolved* identity.
// Nothing here is ever taken from the client.

export interface Actor {
  /** app_users.id, or null for the legacy env-password admin. */
  userId: string | null;
  name: string;
  role: AppRole;
  isStaff: boolean;
}

/** The legacy console admin (env ADMIN_USERNAME/PASSWORD + cookie). */
async function getLegacyAdmin(): Promise<Actor | null> {
  const store = await cookies();
  if (store.get("admin_session")?.value !== "authenticated") return null;
  return {
    userId: null,
    name: process.env.ADMIN_USERNAME || "Admin",
    role: "admin",
    isStaff: true,
  };
}

/**
 * The authenticated actor for the current request, or null if nobody is
 * signed in. Staff identity wins over the legacy admin cookie.
 */
export async function getActor(): Promise<Actor | null> {
  const user = await getAppUser();
  if (user && user.role !== "customer") {
    return { userId: user.id, name: user.name, role: user.role, isStaff: true };
  }
  const legacy = await getLegacyAdmin();
  if (legacy) return legacy;
  if (user) {
    return { userId: user.id, name: user.name, role: "customer", isStaff: false };
  }
  return null;
}

/** The actor, which must be staff holding one of `roles`. */
export async function requireActor(roles: AppRole[]): Promise<Actor | { error: string }> {
  const actor = await getActor();
  if (!actor) return { error: "Veuillez vous connecter." };
  if (!actor.isStaff || !roles.includes(actor.role)) {
    return { error: "Vous n'êtes pas autorisé à effectuer cette action." };
  }
  return actor;
}

export function isActorError(a: Actor | { error: string }): a is { error: string } {
  return "error" in a;
}
