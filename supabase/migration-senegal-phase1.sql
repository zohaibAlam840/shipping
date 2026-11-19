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
