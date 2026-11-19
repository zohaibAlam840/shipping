-- ===========================================================================
-- YonelMa — COMPLETE database setup for a fresh Supabase project.
-- Generated for project qibmepufunfewdfffabn (18 Nov 2026).
--
-- Paste this whole file into Supabase Dashboard → SQL Editor → Run. One paste
-- replaces running schema.sql + the three migrations separately.
--
-- WARNING: part 1 DROPS and recreates orders / status_log / claims /
-- pricing_rules. That is correct for a new or empty project — do not run it
-- against a database that holds real bookings.
--
-- Includes the Data API grants required on projects created after
-- 30 October 2026, without which every query fails "permission denied".
-- ===========================================================================

-- ######################## PART 1 — core schema + demo seed ##################
-- YonelMa schema + demo seed.
-- Paste this whole file into the Supabase Dashboard → SQL Editor → Run.
-- Safe to re-run: it drops and recreates the YonelMa tables.

drop table if exists status_log cascade;
drop table if exists claims cascade;
drop table if exists orders cascade;
drop table if exists pricing_rules cascade;

create table pricing_rules (
  id serial primary key,
  origin text not null,
  destination text not null,
  band text not null,
  base_price numeric not null,
  transit_days text not null,
  unique (origin, destination, band)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  tracking_number text unique not null,
  customer_name text not null,
  customer_email text not null,
  origin text not null,
  destination text not null,
  band text not null,
  delivery text not null,
  insurance boolean not null default false,
  recipient_name text not null,
  recipient_phone text not null,
  recipient_address text not null,
  parcel_weight numeric,
  parcel_description text,
  parcel_declared_value numeric not null default 0,
  parcel_dimensions text,
  dropoff_point text,
  parcel_category text,
  chargeable_weight numeric,
  total numeric not null,
  status text not null default 'Order Created',
  payment text not null default 'Unpaid',
  incident boolean not null default false,
  partner text,
  created_at timestamptz not null default now()
);

create table status_log (
  id bigserial primary key,
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  by_who text not null,
  note text,
  at timestamptz not null default now()
);

create table claims (
  id bigserial primary key,
  order_number text not null,
  customer text not null,
  type text not null,
  status text not null default 'Open',
  detail text,
  opened timestamptz not null default now()
);

-- The app talks to the DB only from the server with the secret key, which
-- bypasses RLS. Enabling RLS with no policies blocks the public
-- (publishable-key) role entirely — locked down by default.
alter table pricing_rules enable row level security;
alter table orders enable row level security;
alter table status_log enable row level security;
alter table claims enable row level security;

-- ---------- Seed: pricing rules ----------
-- Official YonelMa pricing grid (France → Sénégal only at launch).
insert into pricing_rules (origin, destination, band, base_price, transit_days) values
('France','Senegal','0-1kg',19,'5–10 jours'),
('France','Senegal','1-3kg',39,'5–10 jours'),
('France','Senegal','3-7kg',64,'5–10 jours'),
('France','Senegal','7-15kg',109,'5–10 jours'),
('France','Senegal','15-25kg',169,'5–10 jours');

-- ---------- Seed: demo orders ----------
insert into orders (id, order_number, tracking_number, customer_name, customer_email, origin, destination, band, delivery, insurance, recipient_name, recipient_phone, recipient_address, parcel_weight, parcel_description, parcel_declared_value, parcel_dimensions, total, status, payment, incident, partner, created_at) values
('00000000-0000-0000-0000-000000000001','YM-2026-0148','YMT-7F2K9Q','Awa Ndiaye','awa@example.com','France','Senegal','3-7kg','Home collection',true,'Moussa Ndiaye','+221 77 123 45 67','Sicap Liberté 4, Villa 5023, Dakar',5.2,'Clothes & medication',180,'40×30×25 cm',70.2,'In Air Transit','Paid',false,'DakarExpress 3PL','2026-06-02T10:14:00Z'),
('00000000-0000-0000-0000-000000000002','YM-2026-0152','YMT-3B8MZX','Awa Ndiaye','awa@example.com','France','Senegal','1-3kg','Relay point',false,'Fatou Sarr','+221 76 555 22 11','Relay: Boutique Khadim, Médina, Dakar',2.1,'Phone accessories',60,'25×20×10 cm',25,'Delivered','Paid',false,'DakarExpress 3PL','2026-05-12T11:00:00Z'),
('00000000-0000-0000-0000-000000000003','YM-2026-0155','YMT-9D4PLA','Ibrahima Diallo','ibrahima@example.com','Senegal','France','7-15kg','Post office',true,'Mariama Diallo','+33 6 12 34 56 78','12 Rue de la République, 69002 Lyon',11,'Foodstuffs & fabrics',240,'55×40×30 cm',98.6,'Order Created','Unpaid',false,null,'2026-06-09T17:22:00Z'),
('00000000-0000-0000-0000-000000000004','YM-2026-0143','YMT-5H7QRN','Cheikh Ba','cheikh@example.com','France','Senegal','15-25kg','Home collection',true,'Abdou Ba','+221 78 901 23 45','Quartier Escale, Saint-Louis',22,'Household appliances',450,'60×50×45 cm',155,'Arrived in Dakar','Paid',true,'Teranga Logistics','2026-05-28T09:00:00Z'),
('00000000-0000-0000-0000-000000000005','YM-2026-0156','YMT-2J6WTC','Awa Ndiaye','awa@example.com','France','Senegal','0-1kg','Relay point',false,'Omar Ndiaye','+221 77 444 33 22','Relay: Pharmacie Yoff, Dakar',0.8,'Documents',0,'30×21×3 cm',15,'Pallet Preparation','Paid',false,null,'2026-06-08T14:05:00Z');

-- ---------- Seed: status history ----------
insert into status_log (order_id, status, by_who, note, at) values
('00000000-0000-0000-0000-000000000001','Order Created','Awa Ndiaye',null,'2026-06-02T10:14:00Z'),
('00000000-0000-0000-0000-000000000001','Received by E-Logik','Admin (Paris hub)',null,'2026-06-03T09:05:00Z'),
('00000000-0000-0000-0000-000000000001','Pallet Preparation','Admin (Paris hub)',null,'2026-06-03T15:40:00Z'),
('00000000-0000-0000-0000-000000000001','Collected by TAF','DakarExpress 3PL',null,'2026-06-05T08:00:00Z'),
('00000000-0000-0000-0000-000000000001','In Air Transit','DakarExpress 3PL','Air freight CDG → DSS','2026-06-06T19:25:00Z'),
('00000000-0000-0000-0000-000000000002','Order Created','Awa Ndiaye',null,'2026-05-12T11:00:00Z'),
('00000000-0000-0000-0000-000000000002','Received by E-Logik','Admin (Paris hub)',null,'2026-05-13T10:00:00Z'),
('00000000-0000-0000-0000-000000000002','Pallet Preparation','Admin (Paris hub)',null,'2026-05-13T16:00:00Z'),
('00000000-0000-0000-0000-000000000002','Collected by TAF','DakarExpress 3PL',null,'2026-05-15T07:30:00Z'),
('00000000-0000-0000-0000-000000000002','In Air Transit','DakarExpress 3PL',null,'2026-05-16T20:00:00Z'),
('00000000-0000-0000-0000-000000000002','Arrived in Dakar','DakarExpress 3PL',null,'2026-05-19T14:10:00Z'),
('00000000-0000-0000-0000-000000000002','Out for Delivery','DakarExpress 3PL',null,'2026-05-20T08:45:00Z'),
('00000000-0000-0000-0000-000000000002','Delivered','DakarExpress 3PL','Picked up at relay point','2026-05-20T13:30:00Z'),
('00000000-0000-0000-0000-000000000003','Order Created','Ibrahima Diallo',null,'2026-06-09T17:22:00Z'),
('00000000-0000-0000-0000-000000000004','Order Created','Cheikh Ba',null,'2026-05-28T09:00:00Z'),
('00000000-0000-0000-0000-000000000004','Received by E-Logik','Admin (Paris hub)',null,'2026-05-29T11:30:00Z'),
('00000000-0000-0000-0000-000000000004','Pallet Preparation','Admin (Paris hub)',null,'2026-05-29T17:00:00Z'),
('00000000-0000-0000-0000-000000000004','Collected by TAF','Teranga Logistics',null,'2026-06-01T08:00:00Z'),
('00000000-0000-0000-0000-000000000004','In Air Transit','Teranga Logistics',null,'2026-06-02T21:00:00Z'),
('00000000-0000-0000-0000-000000000004','Arrived in Dakar','Teranga Logistics',null,'2026-06-06T12:00:00Z'),
('00000000-0000-0000-0000-000000000004','Incident reported','Teranga Logistics','Outer carton damaged at customs — contents being verified','2026-06-07T10:15:00Z'),
('00000000-0000-0000-0000-000000000005','Order Created','Awa Ndiaye',null,'2026-06-08T14:05:00Z'),
('00000000-0000-0000-0000-000000000005','Received by E-Logik','Admin (Paris hub)',null,'2026-06-09T10:20:00Z'),
('00000000-0000-0000-0000-000000000005','Pallet Preparation','Admin (Paris hub)',null,'2026-06-10T09:00:00Z');

-- ---------- Seed: claims ----------
insert into claims (order_number, customer, type, status, detail, opened) values
('YM-2026-0143','Cheikh Ba','Damaged','Investigating','Partner reported damaged outer carton on arrival in Dakar. Awaiting photos and content check.','2026-06-07'),
('YM-2026-0131','Mame Diarra','Refund request','Refunded','Customer cancelled before parcel drop-off. Refund issued.','2026-05-20');

-- ---------- Data API grants (REQUIRED on projects created after 30 Oct 2026) ----------
-- Supabase no longer grants Data API access to new tables in `public`
-- automatically. Without these, every query from the app fails with
-- "permission denied", including reads made with the secret key.
-- Only service_role is granted: the app talks to the database exclusively
-- from the server with the secret key, so anon/authenticated stay with no
-- table access at all (matching the RLS-on-with-no-policies posture above).
grant select, insert, update, delete on public.pricing_rules to service_role;
grant select, insert, update, delete on public.orders        to service_role;
grant select, insert, update, delete on public.status_log    to service_role;
grant select, insert, update, delete on public.claims        to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ######################## PART 2 — drop-off point column ####################
-- Adds the drop-off point column (La Poste office / Mondial Relay point)
-- chosen by the customer at booking. Run once in the Supabase SQL Editor.
-- Safe to run repeatedly.
alter table orders add column if not exists dropoff_point text;

-- ######################## PART 3 — extra order columns #####################
-- Adds the optional order columns used by the latest features. Run once in
-- the Supabase SQL Editor. Safe to run repeatedly.
alter table orders add column if not exists dropoff_point text;
alter table orders add column if not exists parcel_category text;
alter table orders add column if not exists chargeable_weight numeric;

-- ######################## PART 4 — Phase 1 Senegal foundation ##############
-- ===========================================================================
-- YonelMa — Phase 1 foundation (Senegal domestic / SN → SN)
-- Spec: Functional Specifications Rev SF-002-EN, 16 Nov 2026 — §3, §5, §6, §10
--
-- HOW TO RUN: paste this whole file into Supabase Dashboard → SQL Editor → Run.
-- It is ADDITIVE and IDEMPOTENT: safe to re-run, and it never drops the
-- existing orders / status_log / claims data.
--
-- DO NOT move this into schema.sql — that file starts with DROP TABLE and is
-- only for rebuilding the France → Senegal tables from scratch.
--
-- What this adds:
--   app_users      staff + customer roles (§3)
--   relays         relay-shop network with lifecycle (§5)
--   relay_users    several authorised employees per shop (SN-REL-05)
--   driver_routes  driver rounds and stops (§10)
--   parcels        parcel as a first-class object + QR token (SN-SCAN-01)
--   events         custody ledger: actor, role, source, evidence (SN-SCAN-03)
--   audit_log      sensitive-action log (§3)
--   orders.*       route_type and the shared route fields (INT-01)
--
-- France → Senegal commercial behaviour is NOT touched: Legal Gate G0 (§9).
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Roles and accounts (§3)
-- ---------------------------------------------------------------------------
-- One row per person who can sign in. `id` is the Supabase Auth user id, so
-- the role travels with the real authenticated session — events can name the
-- individual who acted, which SN-SCAN-03 and SN-REL-05 both require.
create table if not exists app_users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  full_name   text not null default '',
  phone       text,
  role        text not null default 'customer'
              check (role in ('customer','admin','merchant','driver','support')),
  status      text not null default 'active'
              check (status in ('invited','active','suspended')),
  -- Logistics company a driver belongs to; matches orders.partner so the
  -- existing partner workspace can resolve "my assigned shipments".
  partner_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists app_users_role_idx on app_users(role);

-- ---------------------------------------------------------------------------
-- 2. Relay-shop network (§5)
-- ---------------------------------------------------------------------------
-- Lifecycle draft → pending → active → suspended/closed (SN-REL-02).
-- Only 'active' shops are offered at booking; the others stay readable so
-- parcels already in their hands can still be processed.
create table if not exists relays (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,              -- e.g. YM-SN-R001
  name          text not null,
  region        text not null default '',
  town          text not null default '',
  neighborhood  text,
  address       text not null default '',
  gps_lat       numeric,
  gps_lng       numeric,
  contact_name  text,
  contact_phone text,
  manager_user_id uuid references app_users(id) on delete set null,
  -- { "mon": "09:00-19:00", ... } — free-form so opening hours stay editable
  -- by the administrator without a migration (SN-REL-01).
  opening_hours jsonb not null default '{}'::jsonb,
  capacity      integer,                           -- indicative parcels on site
  -- INT-06: a relay may later serve international parcels too.
  permitted_services text[] not null default array['domestic']::text[],
  status        text not null default 'draft'
                check (status in ('draft','pending','active','suspended','closed')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists relays_status_idx on relays(status);
create index if not exists relays_town_idx   on relays(town);

-- SN-REL-05: several employees per shop, each action attributable.
create table if not exists relay_users (
  relay_id   uuid not null references relays(id) on delete cascade,
  user_id    uuid not null references app_users(id) on delete cascade,
  can_confirm_receipt boolean not null default true,
  can_hand_over       boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (relay_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 3. Driver routes (§10)
-- ---------------------------------------------------------------------------
create table if not exists driver_routes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,                -- e.g. T-021
  driver_id   uuid references app_users(id) on delete set null,
  route_date  date not null default current_date,
  origin_town      text,
  destination_town text,
  -- [{ "seq":1, "relay_id":"…", "label":"Shop A, Dakar" }, …]
  stops       jsonb not null default '[]'::jsonb,
  status      text not null default 'planned'
              check (status in ('planned','active','completed','cancelled')),
  created_at  timestamptz not null default now()
);

create index if not exists driver_routes_driver_idx on driver_routes(driver_id, route_date);

-- ---------------------------------------------------------------------------
-- 4. Parcels (§10, SN-SCAN-01)
-- ---------------------------------------------------------------------------
-- An order may carry several parcels. qr_token is an OPAQUE id: it is what the
-- QR code encodes, so scanning never exposes names, phones or addresses.
create table if not exists parcels (
  id            uuid primary key default gen_random_uuid(),
  parcel_ref    text not null unique,              -- e.g. YM-SN-000128
  qr_token      text not null unique
                default replace(gen_random_uuid()::text, '-', ''),
  order_id      uuid references orders(id) on delete cascade,
  seq           integer not null default 1,        -- parcel n of the order
  weight_kg     numeric,
  dimensions    text,
  declared_contents text,
  declared_value    numeric not null default 0,
  status        text not null default 'Booked'
                check (status in (
                  'Booked',
                  'Accepted',
                  'In transit',
                  'Awaiting relay acceptance',
                  'Ready for pickup',
                  'Collected at relay',
                  'Delivered to address',
                  'Issue',
                  'Cancelled'
                )),
  current_relay_id     uuid references relays(id) on delete set null,
  destination_relay_id uuid references relays(id) on delete set null,
  route_id      uuid references driver_routes(id) on delete set null,
  holder_user_id uuid references app_users(id) on delete set null,
  -- SN-SCAN-05: one-time pickup code. Only the hash is stored; the plain code
  -- goes to the recipient and is never readable back from the database.
  pickup_code_hash   text,
  pickup_code_sent_at timestamptz,
  pickup_verified_at  timestamptz,
  delivery_attempts  integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists parcels_order_idx  on parcels(order_id);
create index if not exists parcels_status_idx on parcels(status);
create index if not exists parcels_relay_idx  on parcels(current_relay_id);
create index if not exists parcels_route_idx  on parcels(route_id);

-- ---------------------------------------------------------------------------
-- 5. Event / custody ledger (SN-SCAN-03, SN-TRK-03)
-- ---------------------------------------------------------------------------
-- Append-only. A correction never edits or deletes the original row: it
-- inserts a new one carrying `correction_of` and a mandatory `reason`.
-- `at` is server time only — the client never supplies it.
create table if not exists events (
  id            bigserial primary key,
  parcel_id     uuid references parcels(id) on delete cascade,
  order_id      uuid references orders(id) on delete cascade,
  event_type    text not null,                     -- e.g. 'scan.relay_receipt'
  resulting_status text,
  actor_user_id uuid references app_users(id) on delete set null,
  actor_name    text not null default '',
  actor_role    text,
  relay_id      uuid references relays(id) on delete set null,
  route_id      uuid references driver_routes(id) on delete set null,
  -- SN-TRK-03: scanned vs manually declared vs partner-imported must stay
  -- distinguishable forever.
  source        text not null default 'scanned'
                check (source in ('scanned','manual','declared','imported','system')),
  evidence      jsonb,                             -- code verified, photo ref, signature
  exception_code text,
  exception_note text,
  correction_of bigint references events(id) on delete set null,
  reason        text,
  at            timestamptz not null default now()
);

create index if not exists events_parcel_idx on events(parcel_id, at);
create index if not exists events_order_idx  on events(order_id, at);
create index if not exists events_actor_idx  on events(actor_user_id, at);

-- ---------------------------------------------------------------------------
-- 6. Audit log (§3 "sensitive actions must be logged")
-- ---------------------------------------------------------------------------
create table if not exists audit_log (
  id            bigserial primary key,
  actor_user_id uuid,
  actor_name    text not null default '',
  actor_role    text,
  action        text not null,                     -- e.g. 'relay.approve'
  target_table  text,
  target_id     text,
  before        jsonb,
  after         jsonb,
  reason        text,
  at            timestamptz not null default now()
);

create index if not exists audit_log_target_idx on audit_log(target_table, target_id, at);

-- ---------------------------------------------------------------------------
-- 7. Shared route fields on orders (INT-01)
-- ---------------------------------------------------------------------------
-- route_type drives which screens, statuses and rules apply, so the three
-- routes share one order table instead of duplicating the platform.
alter table orders add column if not exists route_type text;
alter table orders add column if not exists origin_town text;
alter table orders add column if not exists destination_town text;
alter table orders add column if not exists collection_mode text; -- relay_dropoff | home_pickup
alter table orders add column if not exists delivery_mode   text; -- relay_pickup  | home_delivery
alter table orders add column if not exists origin_relay_id      uuid references relays(id) on delete set null;
alter table orders add column if not exists destination_relay_id uuid references relays(id) on delete set null;
alter table orders add column if not exists parcel_count integer not null default 1;

-- Backfill the existing rows: everything booked so far is France → Senegal.
update orders set route_type = 'FR_SN'
 where route_type is null and origin = 'France'   and destination = 'Senegal';
update orders set route_type = 'SN_FR'
 where route_type is null and origin = 'Senegal'  and destination = 'France';
update orders set route_type = 'SN_SN'
 where route_type is null and origin = 'Senegal'  and destination = 'Senegal';

-- SN-TRK-01 — secure tracking: the sequential reference YNM-2026-0004 is
-- guessable, so where tracking_number was set equal to order_number, replace
-- it with an unguessable code. The sequential order_number stays as the
-- internal/partner reference.
update orders
   set tracking_number = 'YMT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
 where tracking_number = order_number;

-- ---------------------------------------------------------------------------
-- 8. Row level security
-- ---------------------------------------------------------------------------
-- Same posture as the existing tables: the app reads and writes only from the
-- server with the secret key (which bypasses RLS), so enabling RLS with no
-- policies blocks the public publishable-key role outright.
alter table app_users     enable row level security;
alter table relays        enable row level security;
alter table relay_users   enable row level security;
alter table driver_routes enable row level security;
alter table parcels       enable row level security;
alter table events        enable row level security;
alter table audit_log     enable row level security;

-- ---------------------------------------------------------------------------
-- 9. Demo relay shops (§5 wireframe, AT-01)
-- ---------------------------------------------------------------------------
-- Matches the spec's illustrative admin screen: one ACTIVE, one PENDING.
-- Dummy data for the Dakar → Thiès demonstration.
insert into relays (code, name, region, town, neighborhood, address, contact_name, contact_phone, opening_hours, capacity, permitted_services, status)
values
  ('YM-SN-R001','Boutique Teranga','Dakar','Dakar','Sicap Liberté',
   'Sicap Liberté 4, Villa 5023, Dakar','Khadim Ndiaye','+221 77 123 45 67',
   '{"mon-fri":"09:00-19:00","sat":"09:00-14:00","sun":"closed"}'::jsonb,
   40, array['domestic']::text[], 'active'),
  ('YM-SN-R002','Alimentation Keur Thies','Thiès','Thiès','Quartier Escale',
   'Avenue Léopold Senghor, Quartier Escale, Thiès','Fatou Sarr','+221 76 555 22 11',
   '{"mon-sat":"08:30-20:00","sun":"closed"}'::jsonb,
   25, array['domestic']::text[], 'pending')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- 10. Staff accounts — manual step, cannot be seeded
-- ---------------------------------------------------------------------------
-- app_users.id must be a real Supabase Auth user id, so create each test
-- account in Dashboard → Authentication → Users, then run one line per person
-- (replace the uuid and email). Roles: admin | merchant | driver | support.
--
--   insert into app_users (id, email, full_name, role)
--   values ('<auth-user-uuid>', 'admin@yonelma.test', 'Admin Sénégal', 'admin')
--   on conflict (id) do update set role = excluded.role;
--
-- A merchant must then be attached to their shop (and only that shop):
--
--   insert into relay_users (relay_id, user_id)
--   select r.id, '<auth-user-uuid>' from relays r where r.code = 'YM-SN-R001'
--   on conflict do nothing;
--
-- Every customer who signs up normally gets no app_users row, which is
-- correct: absence of a row means "customer, no staff access".
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 11. Data API grants (REQUIRED on projects created after 30 Oct 2026)
-- ---------------------------------------------------------------------------
-- Supabase stopped granting Data API access to new public tables
-- automatically. Without these the app gets "permission denied" on every one
-- of the tables above, even with the secret key. Only service_role is
-- granted — anon/authenticated keep no table access.
grant select, insert, update, delete on public.app_users     to service_role;
grant select, insert, update, delete on public.relays        to service_role;
grant select, insert, update, delete on public.relay_users   to service_role;
grant select, insert, update, delete on public.driver_routes to service_role;
grant select, insert, update, delete on public.parcels       to service_role;
grant select, insert, update, delete on public.events        to service_role;
grant select, insert, update, delete on public.audit_log     to service_role;
grant usage, select on all sequences in schema public to service_role;
