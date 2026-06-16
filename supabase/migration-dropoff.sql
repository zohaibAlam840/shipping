-- Adds the drop-off point column (La Poste office / Mondial Relay point)
-- chosen by the customer at booking. Run once in the Supabase SQL Editor.
-- Safe to run repeatedly.
alter table orders add column if not exists dropoff_point text;
