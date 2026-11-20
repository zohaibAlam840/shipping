-- ===========================================================================
-- YonelMa — Phase 1c: pickup codes the sender can re-read (founder answer 2)
--
-- Apply: npm run db:exec -- --file supabase/migration-phase1c-pickup-codes.sql
--
-- The founder requires the pickup code to stay accessible from the sender's
-- private account, be emailed to the recipient, and NEVER appear on the public
-- tracking page. A one-way hash alone cannot satisfy the first requirement, so
-- the code is kept twice:
--   pickup_code_hash — salted SHA-256, used for constant-time verification
--   pickup_code_enc  — AES-256-GCM ciphertext, decrypted ONLY for the
--                      authenticated sender or an administrator
-- Neither column is ever exposed through the public tracking lookup.
-- ===========================================================================

alter table parcels add column if not exists pickup_code_enc text;

-- Sender-facing contact details, so the code can be emailed to the recipient
-- when an address is known (and the sender can always pass it on by hand).
alter table orders add column if not exists sender_phone text;

grant select, insert, update, delete on public.parcels to service_role;
grant select, insert, update, delete on public.orders  to service_role;
