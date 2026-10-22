-- Add explicit structured fields to addresses (B2B ops wants to see these clearly on dispatch).
-- Safe to re-run.

alter table addresses add column if not exists building_name text;
alter table addresses add column if not exists unit_number  text;   -- Apt / Villa / Flat number
alter table addresses add column if not exists block         text;   -- Block / Plot (optional)
