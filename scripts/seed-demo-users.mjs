// Creates the demonstration accounts the specification asks for (§12):
// customer, administrator, relay merchant, driver and support.
//
// Run with: node scripts/seed-demo-users.mjs
// Safe to re-run — existing accounts are reused, roles are re-applied.
//
// These are DEMO credentials for the test environment. Do not use this script
// against a production project.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SECRET_KEY;
const PASSWORD = process.env.DEMO_PASSWORD || "YonelMa2026!";

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

const USERS = [
  { email: "admin@yonelma.sn", name: "Admin Sénégal", role: "admin" },
  { email: "commercant@yonelma.sn", name: "Khadim Ndiaye", role: "merchant", relay: "YM-SN-R001" },
  { email: "chauffeur@yonelma.sn", name: "Moussa Fall", role: "driver", partner: "YonelMa Transport" },
  { email: "support@yonelma.sn", name: "Awa Sow", role: "support" },
  { email: "client@yonelma.sn", name: "Fatou Diop", role: "customer" },
];

async function rest(path, init = {}) {
  const res = await fetch(`${URL}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

/** Create the auth user, or find the existing one. */
async function ensureAuthUser(email, name) {
  const created = await rest("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: name },
    }),
  });
  if (created.ok && created.body?.id) return created.body.id;

  // Already registered → look it up.
  const found = await rest(`/auth/v1/admin/users?per_page=200`);
  const match = (found.body?.users ?? []).find((u) => u.email === email);
  if (match) return match.id;

  throw new Error(`${email}: ${JSON.stringify(created.body)}`);
}

async function main() {
  if (!URL || !KEY) throw new Error("Supabase env vars missing — check .env.local");

  const relays = await rest("/rest/v1/relays?select=id,code");
  const relayByCode = Object.fromEntries((relays.body ?? []).map((r) => [r.code, r.id]));

  for (const u of USERS) {
    const id = await ensureAuthUser(u.email, u.name);

    // A customer deliberately gets NO app_users row: absence of a row means
    // "customer, no staff access", which is the safe default in lib/roles.ts.
    if (u.role !== "customer") {
      const upsert = await rest("/rest/v1/app_users?on_conflict=id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({
          id,
          email: u.email,
          full_name: u.name,
          role: u.role,
          status: "active",
          partner_name: u.partner ?? null,
        }),
      });
      if (!upsert.ok) throw new Error(`app_users ${u.email}: ${JSON.stringify(upsert.body)}`);
    }

    // A merchant may act only on their own shop (AT-02).
    if (u.relay && relayByCode[u.relay]) {
      await rest("/rest/v1/relay_users?on_conflict=relay_id,user_id", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ relay_id: relayByCode[u.relay], user_id: id }),
      });
    }

    console.log(`✓ ${u.role.padEnd(9)} ${u.email}${u.relay ? ` → ${u.relay}` : ""}`);
  }

  console.log(`\nMot de passe commun : ${PASSWORD}`);
  console.log("Comptes de démonstration uniquement — à ne pas utiliser en production.");
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
