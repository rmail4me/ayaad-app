-- =====================================================================
-- Migration 0002: B2B pivot (idempotent — safe to re-run)
-- =====================================================================

create table if not exists companies (
    id              uuid primary key default gen_random_uuid(),
    name_en         text not null,
    name_ar         text,
    trn             text,
    address_line1   text,
    address_line2   text,
    city            text,
    country         char(2) not null default 'AE' check (country in ('AE','SA')),
    phone           text,
    email           text,
    prepaid_balance_fils bigint not null default 0 check (prepaid_balance_fils >= 0),
    currency        char(3) not null default 'AED' check (currency in ('AED','SAR')),
    rate_card_json  jsonb,
    active          boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

drop trigger if exists t_companies_updated on companies;
create trigger t_companies_updated before update on companies
    for each row execute function set_updated_at();

-- users: add email (if 0001 didn't already have it), company_id, role
alter table users add column if not exists email      text;
alter table users add column if not exists company_id uuid references companies(id) on delete restrict;
alter table users add column if not exists role       text not null default 'booker';

-- role constraint (drop first in case re-run with different values)
alter table users drop constraint if exists users_role_check;
alter table users add  constraint users_role_check check (role in ('owner','admin','booker','approver','viewer'));

-- Make phone optional (safe even if already nullable)
alter table users alter column phone drop not null;
alter table users alter column phone_country drop not null;

create unique index if not exists users_email_uniq on users (lower(email)) where email is not null;
create index        if not exists users_company_idx on users (company_id);

-- bookings: add company + paid_from
alter table bookings add column if not exists company_id uuid references companies(id) on delete restrict;
alter table bookings add column if not exists paid_from  text not null default 'prepaid';

alter table bookings drop constraint if exists bookings_paid_from_check;
alter table bookings add  constraint bookings_paid_from_check check (paid_from in ('prepaid','card','wire','cash'));

alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add  constraint bookings_status_check check (status in
    ('draft','pending_approval','pending_payment','paid','matched','in_progress','completed','cancelled','no_show','expired'));

create index if not exists bookings_company_idx on bookings (company_id, status, start_at);

-- auth_tokens
create table if not exists auth_tokens (
    id              uuid primary key default gen_random_uuid(),
    token_hash      text not null unique,
    user_id         uuid references users(id) on delete cascade,
    email           text not null,
    purpose         text not null default 'login' check (purpose in ('login','email_change')),
    expires_at      timestamptz not null,
    consumed_at     timestamptz,
    created_at      timestamptz not null default now()
);
create index if not exists auth_tokens_email_idx on auth_tokens (email);
create index if not exists auth_tokens_exp_idx   on auth_tokens (expires_at);

-- company_balance_txns
create table if not exists company_balance_txns (
    id              uuid primary key default gen_random_uuid(),
    company_id      uuid not null references companies(id) on delete restrict,
    delta_fils      bigint not null,
    reason          text not null check (reason in ('topup','booking_use','booking_refund','admin_adjustment')),
    booking_id      uuid references bookings(id) on delete set null,
    actor_user_id   uuid references users(id) on delete set null,
    note            text,
    created_at      timestamptz not null default now()
);
create index if not exists balance_txns_company_idx on company_balance_txns (company_id, created_at desc);

-- RLS
alter table companies enable row level security;
alter table auth_tokens enable row level security;
alter table company_balance_txns enable row level security;

drop policy if exists "companies_member_read" on companies;
create policy "companies_member_read" on companies for select
    using (exists (select 1 from users u where u.id = auth.uid() and u.company_id = companies.id));

drop policy if exists "balance_txns_member_read" on company_balance_txns;
create policy "balance_txns_member_read" on company_balance_txns for select
    using (exists (select 1 from users u where u.id = auth.uid() and u.company_id = company_balance_txns.company_id));

-- Seed demo company (idempotent on fixed UUID)
insert into companies (id, name_en, name_ar, trn, address_line1, city, prepaid_balance_fils, active)
values (
  '00000000-0000-0000-0000-000000c0ffee',
  'Ayaad Demo Corp', 'شركة أياد التجريبية',
  '100-DEMO-TRN', 'Business Bay', 'Dubai',
  500000, true
) on conflict (id) do nothing;
