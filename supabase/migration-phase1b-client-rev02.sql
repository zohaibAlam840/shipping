-- ===========================================================================
-- YonelMa — Phase 1b: founder's answers to the Rev02 open questions
-- (client message, 20 Nov 2026). Additive + idempotent.
--
-- Apply with:  npm run db:exec -- --file supabase/migration-phase1b-client-rev02.sql
-- Then refresh the snapshot: npm run db:pull
--
-- Covers:
--   1. Multiple parcels per booking, each with its own ID, QR, label,
--      weight/dimensions, status and scan history.
--   2. Pickup code: readable by the sender, emailed to the recipient when an
--      address is known, NEVER exposed on the public tracking page.
--   3. Delivery proof: recipient code only, with date/time/driver recorded
--      automatically. No signature or photo in Phase 1.
--   4. Pilot area: Dakar region commercially active (Dakar, Pikine,
--      Guédiawaye, Keur Massar, Rufisque); Thiès test-only. Administrator can
--      activate further zones and relays progressively.
--   5. Pricing: uniform regional model by weight, administrator-editable by
--      zone / weight band / delivery method, no developer involvement.
--   6. Operating schedule: transport Tue/Thu/Sat, daily relay access,
--      1–3 business day delivery, all parameters configurable.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Geographical zones (founder answer 4)
-- ---------------------------------------------------------------------------
-- A zone groups the towns that share one pricing and service area. Commercial
-- status is what makes a zone bookable by real customers: 'test' zones stay
-- usable for demonstration without being commercially launched.
create table if not exists zones (
  id        uuid primary key default gen_random_uuid(),
  code      text not null unique,            -- e.g. DK-REGION
  name      text not null,
  country   text not null default 'Senegal',
  region    text not null default '',
  towns     text[] not null default '{}'::text[],
  commercial_status text not null default 'test'
            check (commercial_status in ('test','active','suspended')),
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists zones_commercial_idx on zones(commercial_status);

-- ---------------------------------------------------------------------------
-- 2. Relay shops: zone binding + commercial activation + cut-off
-- ---------------------------------------------------------------------------
alter table relays add column if not exists zone_id uuid references zones(id) on delete set null;
-- Separate from `status`: a relay can be operationally 'active' while still
-- only open for testing, which is exactly the Thiès case.
alter table relays add column if not exists commercial_status text not null default 'test'
  check (commercial_status in ('test','active','suspended'));
-- Per-shop parcel hand-in deadline on a transport day; null = network default.
alter table relays add column if not exists collection_cutoff time;
-- Days the shop itself opens, ISO weekday numbers (1=Mon … 7=Sun).
alter table relays add column if not exists opening_days integer[] not null default '{1,2,3,4,5,6}'::integer[];

-- ---------------------------------------------------------------------------
-- 3. Administrator-managed pricing (founder answer 5)
-- ---------------------------------------------------------------------------
-- Uniform regional model: price depends on weight band and service type, not
-- on distance between relays. Same-zone shipments use origin = destination.
-- Every field is editable from the admin console — no developer involvement,
-- which the founder called essential.
create table if not exists sn_pricing_rules (
  id          uuid primary key default gen_random_uuid(),
  origin_zone_id      uuid references zones(id) on delete cascade,
  destination_zone_id uuid references zones(id) on delete cascade,
  service_type text not null default 'relay_to_relay'
               check (service_type in ('relay_to_relay','relay_to_home','home_to_relay','home_to_home')),
  label        text not null default '',     -- e.g. "Jusqu'à 2 kg"
  -- Band is (min_weight_kg, max_weight_kg]: exclusive lower, inclusive upper,
  -- so 2 kg falls in the first band and 2.1 kg in the second.
  min_weight_kg numeric not null default 0,
  max_weight_kg numeric,                     -- null = no upper limit
  price         numeric not null,
  currency      text not null default 'XOF',
  status        text not null default 'active' check (status in ('active','inactive')),
  effective_from date,
  effective_to   date,
  sort_order    integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sn_pricing_lookup_idx
  on sn_pricing_rules(origin_zone_id, destination_zone_id, service_type, status);

-- ---------------------------------------------------------------------------
-- 4. Operating schedule (founder answer 6)
-- ---------------------------------------------------------------------------
-- Single configuration row. Transport runs on selected weekdays only, while
-- relay shops stay open to customers daily per their own hours.
create table if not exists operating_settings (
  id integer primary key default 1 check (id = 1),
  -- ISO weekdays: 2 = Tuesday, 4 = Thursday, 6 = Saturday.
  transport_days    integer[] not null default '{2,4,6}'::integer[],
  collection_cutoff time not null default '16:00',
  delivery_min_days integer not null default 1,
  delivery_max_days integer not null default 3,
  timezone          text not null default 'Africa/Dakar',
  updated_at timestamptz not null default now()
);

insert into operating_settings (id) values (1) on conflict (id) do nothing;

-- Exceptional closures / non-operating days. relay_id null = whole network.
create table if not exists non_operating_days (
  id        uuid primary key default gen_random_uuid(),
  day       date not null,
  label     text not null default '',
  relay_id  uuid references relays(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (day, relay_id)
);

create index if not exists non_operating_days_day_idx on non_operating_days(day);

-- ---------------------------------------------------------------------------
-- 5. Orders: multi-parcel, recipient email, service and schedule (answers 1,2,6)
-- ---------------------------------------------------------------------------
-- Recipient email is what lets the pickup code be emailed when available
-- (founder answer 2). It is optional: the sender can always pass the code on.
alter table orders add column if not exists recipient_email text;
alter table orders add column if not exists service_type text;
alter table orders add column if not exists origin_zone_id      uuid references zones(id) on delete set null;
alter table orders add column if not exists destination_zone_id uuid references zones(id) on delete set null;
alter table orders add column if not exists currency text not null default 'EUR';
-- Scheduling: the transport day the parcels are planned to move on, plus the
-- 1–3 business day window quoted to the customer.
alter table orders add column if not exists scheduled_transport_date date;
alter table orders add column if not exists estimated_delivery_from  date;
alter table orders add column if not exists estimated_delivery_to    date;

-- ---------------------------------------------------------------------------
-- 6. Parcels: per-parcel identity and delivery proof (answers 1, 3)
-- ---------------------------------------------------------------------------
-- parcel_ref, qr_token, weight, dimensions, status and event history already
-- exist per parcel. These complete the founder's requirements.
alter table parcels add column if not exists label_printed_at timestamptz;
-- Answer 3: code alone is proof; date, time and driver are recorded
-- automatically on confirmation.
alter table parcels add column if not exists delivered_at timestamptz;
alter table parcels add column if not exists delivered_by uuid references app_users(id) on delete set null;
alter table parcels add column if not exists delivery_proof text
  check (delivery_proof is null or delivery_proof in ('recipient_code','signature','photo'));
-- Where the one-time code was sent, for the audit trail. The code itself is
-- never stored in clear text and never leaves the sender's private account or
-- the recipient's email (answer 2).
alter table parcels add column if not exists pickup_code_sent_to text;

-- ---------------------------------------------------------------------------
-- 7. Seed: Dakar region live, Thiès test-only (answer 4)
-- ---------------------------------------------------------------------------
insert into zones (code, name, region, towns, commercial_status, sort_order) values
  ('DK-REGION', 'Région de Dakar', 'Dakar',
   array['Dakar','Pikine','Guédiawaye','Keur Massar','Rufisque']::text[], 'active', 10),
  ('TH-REGION', 'Région de Thiès', 'Thiès',
   array['Thiès']::text[], 'test', 20)
on conflict (code) do nothing;

-- Attach the demo relays to their zones. Boutique Teranga goes commercially
-- live in Dakar; the Thiès shop stays test-only, as instructed.
update relays r set zone_id = z.id, commercial_status = 'active'
  from zones z where z.code = 'DK-REGION' and r.code = 'YM-SN-R001';
update relays r set zone_id = z.id, commercial_status = 'test'
  from zones z where z.code = 'TH-REGION' and r.code = 'YM-SN-R002';

-- ---------------------------------------------------------------------------
-- 8. Seed: provisional Dakar pricing (answer 5)
-- ---------------------------------------------------------------------------
-- PROVISIONAL, FOR TESTING ONLY — not commercially validated. The
-- administrator can change every one of these from the console.
insert into sn_pricing_rules
  (origin_zone_id, destination_zone_id, service_type, label, min_weight_kg, max_weight_kg, price, currency, sort_order)
select z.id, z.id, 'relay_to_relay', v.label, v.min_kg, v.max_kg, v.price, 'XOF', v.sort_order
from zones z
cross join (values
  ('Jusqu''à 2 kg',        0,  2,  3000, 10),
  ('De 2 kg à 5 kg',       2,  5,  3500, 20),
  ('De 5 kg à 10 kg',      5, 10,  4500, 30),
  ('De 10 kg à 20 kg',    10, 20,  6000, 40)
) as v(label, min_kg, max_kg, price, sort_order)
where z.code = 'DK-REGION'
  and not exists (
    select 1 from sn_pricing_rules p
     where p.origin_zone_id = z.id and p.destination_zone_id = z.id
       and p.service_type = 'relay_to_relay' and p.min_weight_kg = v.min_kg
  );

-- ---------------------------------------------------------------------------
-- 9. Row level security + Data API grants
-- ---------------------------------------------------------------------------
alter table zones              enable row level security;
alter table sn_pricing_rules   enable row level security;
alter table operating_settings enable row level security;
alter table non_operating_days enable row level security;

grant select, insert, update, delete on public.zones              to service_role;
grant select, insert, update, delete on public.sn_pricing_rules   to service_role;
grant select, insert, update, delete on public.operating_settings to service_role;
grant select, insert, update, delete on public.non_operating_days to service_role;
grant usage, select on all sequences in schema public to service_role;
