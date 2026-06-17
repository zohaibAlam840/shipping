// Remaps existing order + status_log statuses to the new operational workflow.
// Data-only (no DDL), safe to re-run. Run: node scripts/migrate-statuses.mjs
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SECRET_KEY;
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const MAP = {
  "Pending Confirmation": "Order Created",
  "Parcel Received": "Received by E-Logik",
  Processing: "Pallet Preparation",
  "Shipped from France": "Collected by TAF",
  "In Transit": "In Air Transit",
  "Arrived in Senegal": "Arrived in Dakar",
  // "Out for Delivery" and "Delivered" are unchanged
};

async function remap(table) {
  for (const [oldS, newS] of Object.entries(MAP)) {
    const res = await fetch(
      `${BASE}/rest/v1/${table}?status=eq.${encodeURIComponent(oldS)}`,
      { method: "PATCH", headers, body: JSON.stringify({ status: newS }) },
    );
    const n = res.ok ? (await res.json()).length : `ERR ${res.status}`;
    if (n) console.log(`  ${table}: ${oldS} → ${newS} (${n})`);
  }
}

console.log("Remapping orders…");
await remap("orders");
console.log("Remapping status_log…");
await remap("status_log");
console.log("Done.");
