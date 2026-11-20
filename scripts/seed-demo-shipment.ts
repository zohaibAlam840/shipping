// Seeds the Dakar → Rufisque demonstration shipment the specification asks
// for (§12): a real multi-parcel domestic booking with its custody history,
// so the founder can see tracking, labels and the operations dashboard
// working before any live traffic exists.
//
// Run: node scripts/seed-demo-shipment.ts
// Safe to re-run — it replaces the previous demo shipment.
import { readFileSync } from "node:fs";
import { hashPickupCode, encryptPickupCode } from "../lib/pickup-code.ts";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
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

const ORDER_NUMBER = "YNM-2026-8001";
const TRACKING = "YMT-DEMO2026";
/** Fixed so the demonstration is reproducible. Real codes are random. */
const DEMO_CODE = "482913";

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${URL}/rest/v1${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${path}: ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  if (!URL || !KEY) throw new Error("Supabase env vars missing — check .env.local");

  const zones = await api("/zones?select=id,code");
  const relays = await api("/relays?select=id,code,town");
  const dakar = relays.find((r: { code: string }) => r.code === "YM-SN-R001");
  const zone = zones.find((z: { code: string }) => z.code === "DK-REGION");
  if (!dakar || !zone) throw new Error("Run the Phase 1 migrations first (zones / relays missing).");

  // Clear any previous run so the script is idempotent.
  await api(`/orders?order_number=eq.${ORDER_NUMBER}`, { method: "DELETE" });

  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const plus = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };

  const [order] = await api("/orders", {
    method: "POST",
    body: JSON.stringify({
      order_number: ORDER_NUMBER,
      tracking_number: TRACKING,
      customer_name: "Fatou Diop",
      customer_email: "client@yonelma.sn",
      origin: "Senegal",
      destination: "Senegal",
      route_type: "SN_SN",
      band: "4 kg",
      delivery: "Relay point",
      insurance: false,
      recipient_name: "Awa Ndiaye",
      recipient_phone: "+221 77 123 45 67",
      recipient_email: null,
      recipient_address: "Point relais : Boutique Teranga, Sicap Liberté 4, Dakar",
      sender_phone: "+221 78 555 10 10",
      parcel_weight: 4,
      parcel_description: "Vêtements / Livres",
      parcel_declared_value: 25000,
      service_type: "relay_to_relay",
      collection_mode: "relay_dropoff",
      delivery_mode: "relay_pickup",
      origin_zone_id: zone.id,
      destination_zone_id: zone.id,
      origin_relay_id: dakar.id,
      destination_relay_id: dakar.id,
      origin_town: "Dakar",
      destination_town: "Rufisque",
      parcel_count: 2,
      currency: "XOF",
      total: 7000,
      scheduled_transport_date: iso(today),
      estimated_delivery_from: iso(today),
      estimated_delivery_to: iso(plus(2)),
      status: "Order Created",
      payment: "Unpaid",
    }),
  });

  const parcels = await api("/parcels", {
    method: "POST",
    body: JSON.stringify([
      {
        parcel_ref: "YM-SN-800001",
        order_id: order.id,
        seq: 1,
        weight_kg: 1.8,
        dimensions: "30×20×10 cm",
        declared_contents: "Vêtements",
        declared_value: 15000,
        // Already waiting for its recipient, so the pickup step is demoable.
        status: "Ready for pickup",
        current_relay_id: dakar.id,
        destination_relay_id: dakar.id,
        pickup_code_hash: hashPickupCode(DEMO_CODE),
        pickup_code_enc: encryptPickupCode(DEMO_CODE),
      },
      {
        parcel_ref: "YM-SN-800002",
        order_id: order.id,
        seq: 2,
        weight_kg: 4,
        dimensions: "40×30×20 cm",
        declared_contents: "Livres",
        declared_value: 10000,
        status: "In transit",
        // PostgREST bulk inserts require identical key sets across rows.
        current_relay_id: null,
        destination_relay_id: dakar.id,
        pickup_code_hash: hashPickupCode(DEMO_CODE),
        pickup_code_enc: encryptPickupCode(DEMO_CODE),
      },
    ]),
  });

  const first = parcels.find((p: { seq: number }) => p.seq === 1);
  const second = parcels.find((p: { seq: number }) => p.seq === 2);

  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

  // PostgREST bulk inserts require identical key sets, so every event is
  // normalised to the same shape before sending.
  const event = (e: Record<string, unknown>) => ({
    order_id: order.id,
    parcel_id: null,
    event_type: "",
    resulting_status: null,
    actor_name: "",
    actor_role: null,
    relay_id: null,
    source: "scanned",
    at: new Date().toISOString(),
    ...e,
  });

  await api("/events", {
    method: "POST",
    body: JSON.stringify([
      event({
        order_id: order.id,
        event_type: "order.created",
        resulting_status: "Booked",
        actor_name: "Fatou Diop",
        actor_role: "customer",
        source: "declared",
        at: hoursAgo(50),
      }),
      event({
        order_id: order.id,
        parcel_id: first.id,
        event_type: "scan.collect",
        resulting_status: "Accepted",
        actor_name: "Moussa Fall",
        actor_role: "driver",
        relay_id: dakar.id,
        source: "scanned",
        at: hoursAgo(28),
      }),
      event({
        order_id: order.id,
        parcel_id: first.id,
        event_type: "scan.handover",
        resulting_status: "Awaiting relay acceptance",
        actor_name: "Moussa Fall",
        actor_role: "driver",
        relay_id: dakar.id,
        source: "scanned",
        at: hoursAgo(6),
      }),
      event({
        order_id: order.id,
        parcel_id: first.id,
        event_type: "scan.relay_receipt",
        resulting_status: "Ready for pickup",
        actor_name: "Khadim Ndiaye",
        actor_role: "merchant",
        relay_id: dakar.id,
        source: "scanned",
        at: hoursAgo(5),
      }),
      event({
        order_id: order.id,
        parcel_id: second.id,
        event_type: "scan.collect",
        resulting_status: "Accepted",
        actor_name: "Moussa Fall",
        actor_role: "driver",
        relay_id: dakar.id,
        source: "scanned",
        at: hoursAgo(28),
      }),
      event({
        order_id: order.id,
        parcel_id: second.id,
        event_type: "scan.depart",
        resulting_status: "In transit",
        actor_name: "Moussa Fall",
        actor_role: "driver",
        source: "scanned",
        at: hoursAgo(4),
      }),
    ]),
  });

  console.log(`✓ Commande ${ORDER_NUMBER} · suivi ${TRACKING}`);
  console.log("✓ 2 colis : YM-SN-800001 (disponible), YM-SN-800002 (en transit)");
  console.log(`✓ Code de retrait de démonstration : ${DEMO_CODE}`);
  console.log(`\nSuivi public : /track → ${TRACKING}`);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
