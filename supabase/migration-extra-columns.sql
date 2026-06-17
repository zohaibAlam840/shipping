-- Adds the optional order columns used by the latest features. Run once in
-- the Supabase SQL Editor. Safe to run repeatedly.
alter table orders add column if not exists dropoff_point text;
alter table orders add column if not exists parcel_category text;
alter table orders add column if not exists chargeable_weight numeric;
