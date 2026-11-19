// Quick health check: verifies the YonelMa tables exist and shows row counts.
// Run with: node scripts/check-db.mjs
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SECRET_KEY;

let ok = true;
const TABLES = [
  // core (schema.sql)
  "pricing_rules", "orders", "status_log", "claims",
  // Phase 1 Senegal foundation (migration-senegal-phase1.sql)
  "app_users", "relays", "relay_users", "driver_routes", "parcels", "events", "audit_log",
];

for (const table of TABLES) {
  const res = await fetch(`${URL}/rest/v1/${table}?select=*&limit=0`, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      Prefer: "count=exact",
    },
  });
  if (res.ok) {
    const count = res.headers.get("content-range")?.split("/")[1] ?? "?";
    console.log(`✓ ${table.padEnd(15)} ${count} rows`);
  } else {
    ok = false;
    const body = await res.json().catch(() => ({}));
    console.log(`✗ ${table.padEnd(15)} ${body.message ?? res.status}`);
  }
}
console.log(
  ok
    ? "\nDatabase ready."
    : "\nTables missing or unreachable — paste supabase/setup-all.sql into the Supabase SQL Editor and re-run this.\n(A 'permission denied' message means the Data API grants at the end of that file haven't been applied.)",
);
process.exit(ok ? 0 : 1);
