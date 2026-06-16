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
  total numeric not null,
  status text not null default 'Pending Confirmation',
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
('00000000-0000-0000-0000-000000000001','YM-2026-0148','YMT-7F2K9Q','Awa Ndiaye','awa@example.com','France','Senegal','3-7kg','Home collection',true,'Moussa Ndiaye','+221 77 123 45 67','Sicap Liberté 4, Villa 5023, Dakar',5.2,'Clothes & medication',180,'40×30×25 cm',70.2,'In Transit','Paid',false,'DakarExpress 3PL','2026-06-02T10:14:00Z'),
('00000000-0000-0000-0000-000000000002','YM-2026-0152','YMT-3B8MZX','Awa Ndiaye','awa@example.com','France','Senegal','1-3kg','Relay point',false,'Fatou Sarr','+221 76 555 22 11','Relay: Boutique Khadim, Médina, Dakar',2.1,'Phone accessories',60,'25×20×10 cm',25,'Delivered','Paid',false,'DakarExpress 3PL','2026-05-12T11:00:00Z'),
('00000000-0000-0000-0000-000000000003','YM-2026-0155','YMT-9D4PLA','Ibrahima Diallo','ibrahima@example.com','Senegal','France','7-15kg','Post office',true,'Mariama Diallo','+33 6 12 34 56 78','12 Rue de la République, 69002 Lyon',11,'Foodstuffs & fabrics',240,'55×40×30 cm',98.6,'Pending Confirmation','Unpaid',false,null,'2026-06-09T17:22:00Z'),
('00000000-0000-0000-0000-000000000004','YM-2026-0143','YMT-5H7QRN','Cheikh Ba','cheikh@example.com','France','Senegal','15-25kg','Home collection',true,'Abdou Ba','+221 78 901 23 45','Quartier Escale, Saint-Louis',22,'Household appliances',450,'60×50×45 cm',155,'Arrived in Senegal','Paid',true,'Teranga Logistics','2026-05-28T09:00:00Z'),
('00000000-0000-0000-0000-000000000005','YM-2026-0156','YMT-2J6WTC','Awa Ndiaye','awa@example.com','France','Senegal','0-1kg','Relay point',false,'Omar Ndiaye','+221 77 444 33 22','Relay: Pharmacie Yoff, Dakar',0.8,'Documents',0,'30×21×3 cm',15,'Processing','Paid',false,null,'2026-06-08T14:05:00Z');

-- ---------- Seed: status history ----------
insert into status_log (order_id, status, by_who, note, at) values
('00000000-0000-0000-0000-000000000001','Pending Confirmation','Awa Ndiaye',null,'2026-06-02T10:14:00Z'),
('00000000-0000-0000-0000-000000000001','Parcel Received','Admin (Paris hub)',null,'2026-06-03T09:05:00Z'),
('00000000-0000-0000-0000-000000000001','Processing','Admin (Paris hub)',null,'2026-06-03T15:40:00Z'),
('00000000-0000-0000-0000-000000000001','Shipped from France','DakarExpress 3PL',null,'2026-06-05T08:00:00Z'),
('00000000-0000-0000-0000-000000000001','In Transit','DakarExpress 3PL','Air freight CDG → DSS','2026-06-06T19:25:00Z'),
('00000000-0000-0000-0000-000000000002','Pending Confirmation','Awa Ndiaye',null,'2026-05-12T11:00:00Z'),
('00000000-0000-0000-0000-000000000002','Parcel Received','Admin (Paris hub)',null,'2026-05-13T10:00:00Z'),
('00000000-0000-0000-0000-000000000002','Processing','Admin (Paris hub)',null,'2026-05-13T16:00:00Z'),
('00000000-0000-0000-0000-000000000002','Shipped from France','DakarExpress 3PL',null,'2026-05-15T07:30:00Z'),
('00000000-0000-0000-0000-000000000002','In Transit','DakarExpress 3PL',null,'2026-05-16T20:00:00Z'),
('00000000-0000-0000-0000-000000000002','Arrived in Senegal','DakarExpress 3PL',null,'2026-05-19T14:10:00Z'),
('00000000-0000-0000-0000-000000000002','Out for Delivery','DakarExpress 3PL',null,'2026-05-20T08:45:00Z'),
('00000000-0000-0000-0000-000000000002','Delivered','DakarExpress 3PL','Picked up at relay point','2026-05-20T13:30:00Z'),
('00000000-0000-0000-0000-000000000003','Pending Confirmation','Ibrahima Diallo',null,'2026-06-09T17:22:00Z'),
('00000000-0000-0000-0000-000000000004','Pending Confirmation','Cheikh Ba',null,'2026-05-28T09:00:00Z'),
('00000000-0000-0000-0000-000000000004','Parcel Received','Admin (Paris hub)',null,'2026-05-29T11:30:00Z'),
('00000000-0000-0000-0000-000000000004','Processing','Admin (Paris hub)',null,'2026-05-29T17:00:00Z'),
('00000000-0000-0000-0000-000000000004','Shipped from France','Teranga Logistics',null,'2026-06-01T08:00:00Z'),
('00000000-0000-0000-0000-000000000004','In Transit','Teranga Logistics',null,'2026-06-02T21:00:00Z'),
('00000000-0000-0000-0000-000000000004','Arrived in Senegal','Teranga Logistics',null,'2026-06-06T12:00:00Z'),
('00000000-0000-0000-0000-000000000004','Incident reported','Teranga Logistics','Outer carton damaged at customs — contents being verified','2026-06-07T10:15:00Z'),
('00000000-0000-0000-0000-000000000005','Pending Confirmation','Awa Ndiaye',null,'2026-06-08T14:05:00Z'),
('00000000-0000-0000-0000-000000000005','Parcel Received','Admin (Paris hub)',null,'2026-06-09T10:20:00Z'),
('00000000-0000-0000-0000-000000000005','Processing','Admin (Paris hub)',null,'2026-06-10T09:00:00Z');

-- ---------- Seed: claims ----------
insert into claims (order_number, customer, type, status, detail, opened) values
('YM-2026-0143','Cheikh Ba','Damaged','Investigating','Partner reported damaged outer carton on arrival in Dakar. Awaiting photos and content check.','2026-06-07'),
('YM-2026-0131','Mame Diarra','Refund request','Refunded','Customer cancelled before parcel drop-off. Refund issued.','2026-05-20');
