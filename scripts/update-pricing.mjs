// Aligns the Supabase pricing_rules table with the official YonelMa grid:
//  - France → Sénégal: new prices
//  - removes the Sénégal → France route (future phase)
// Run with: node scripts/update-pricing.mjs
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SECRET_KEY;
const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const GRID = [
  { band: "0-1kg", base_price: 19, transit_days: "5–7 jours" },
  { band: "1-3kg", base_price: 39, transit_days: "5–7 jours" },
  { band: "3-7kg", base_price: 64, transit_days: "6–8 jours" },
  { band: "7-15kg", base_price: 109, transit_days: "7–10 jours" },
  { band: "15-25kg", base_price: 169, transit_days: "7–10 jours" },
];

// 1) Remove the Sénégal → France route.
const del = await fetch(`${URL}/rest/v1/pricing_rules?origin=eq.Senegal`, {
  method: "DELETE",
  headers,
});
const deleted = del.ok ? (await del.json()).length : `ERR ${del.status}`;
console.log(`Sénégal → France rows removed: ${deleted}`);

// 2) Update France → Sénégal prices.
for (const row of GRID) {
  const res = await fetch(
    `${URL}/rest/v1/pricing_rules?origin=eq.France&destination=eq.Senegal&band=eq.${encodeURIComponent(row.band)}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ base_price: row.base_price, transit_days: row.transit_days }),
    },
  );
  if (res.ok) {
    const updated = await res.json();
    console.log(`  ${row.band.padEnd(8)} → ${row.base_price} € (${updated.length} row)`);
  } else {
    console.log(`  ${row.band.padEnd(8)} FAILED ${res.status}: ${await res.text()}`);
  }
}

// 3) Show the final grid.
const check = await fetch(
  `${URL}/rest/v1/pricing_rules?select=origin,destination,band,base_price,transit_days&order=base_price`,
  { headers },
);
console.log("\nFinal pricing_rules:");
console.table(await check.json());
