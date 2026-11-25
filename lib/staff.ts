// Staff accounts: administrators, relay merchants, drivers and support
// (spec §3, SN-REL-03, SN-REL-05).
//
// Account creation goes through Supabase's Admin API with the secret key, so
// it is server-only. Passwords are never stored here — a generated temporary
// password is returned once to the administrator who created the account and
// is not readable afterwards.
import { supabaseAdmin } from "@/lib/supabase";
import type { AppRole } from "@/lib/roles-shared";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface StaffMember {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: AppRole;
  status: "invited" | "active" | "suspended";
  partnerName: string | null;
  relayIds: string[];
  relayNames: string[];
  createdAt: string;
}

export async function getStaff(): Promise<StaffMember[]> {
  const db = supabaseAdmin();
  const [{ data, error }, { data: relays }] = await Promise.all([
    db
      .from("app_users")
      .select("*, relay_users(relay_id)")
      .order("created_at", { ascending: true }),
    db.from("relays").select("id, name"),
  ]);
  if (error) throw error;

  const relayName = Object.fromEntries(((relays ?? []) as any[]).map((r) => [r.id, r.name]));

  return ((data ?? []) as any[]).map((u) => {
    const relayIds = (u.relay_users ?? []).map((r: any) => r.relay_id);
    return {
      id: u.id,
      email: u.email,
      name: u.full_name ?? "",
      phone: u.phone ?? null,
      role: (u.role ?? "customer") as AppRole,
      status: (u.status ?? "active") as StaffMember["status"],
      partnerName: u.partner_name ?? null,
      relayIds,
      relayNames: relayIds.map((id: string) => relayName[id] ?? "—"),
      createdAt: u.created_at,
    };
  });
}

// ---------------------------------------------------------------------------
// Supabase Admin API
// ---------------------------------------------------------------------------

function adminApi(path: string, init: RequestInit = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return fetch(`${url}/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/**
 * A readable temporary password: three letter groups and digits, avoiding
 * characters that are easy to confuse when read out over the phone.
 */
export function generateTempPassword(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const pick = (set: string, i: number) => set[bytes[i] % set.length];
  return (
    [0, 1, 2].map((i) => pick(letters, i)).join("") +
    "-" +
    [3, 4, 5].map((i) => pick(digits, i)).join("") +
    "-" +
    [6, 7, 8].map((i) => pick(letters, i)).join("")
  );
}

/** Creates the auth user, or returns the id of an existing one. */
export async function createAuthUser(
  email: string,
  password: string,
  fullName: string,
): Promise<{ id?: string; error?: string }> {
  const res = await adminApi("/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.ok && body?.id) return { id: body.id };

  // Already registered → reuse the existing identity rather than failing.
  const list = await adminApi(`/admin/users?per_page=200`);
  const users = (await list.json().catch(() => ({})))?.users ?? [];
  const match = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
  if (match) return { id: match.id };

  return { error: body?.msg || body?.message || "Création du compte impossible." };
}

export async function setAuthPassword(userId: string, password: string): Promise<string | null> {
  const res = await adminApi(`/admin/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ password }),
  });
  if (res.ok) return null;
  const body = await res.json().catch(() => ({}));
  return body?.msg || body?.message || "Réinitialisation impossible.";
}
