-- =====================================================================
-- Justlife Clone (Ayaad DTC) — Postgres schema
-- Target: Supabase Postgres 15+ with pgcrypto, btree_gist, pg_trgm
-- Conventions:
--   * uuid PKs, timestamptz UTC, money as integer fils (1 AED = 100 fils)
--   * enums as text + CHECK (easy to extend without migrations)
--   * every table has updated_at + trigger
--   * RLS on every user-owned table
-- =====================================================================

create extension if not exists pgcrypto;
create extension if not exists btree_gist;
create extension if not exists pg_trgm;

-- ---------- updated_at trigger ----------
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ---------- legal entities (for invoice numbering) ----------
create table legal_entities (
    id              uuid primary key default gen_random_uuid(),
    name            text not null,
    trn             text not null unique,          -- UAE/KSA tax reg number
    address_line1   text not null,
    address_line2   text,
    city            text not null,
    country         char(2) not null check (country in ('AE','SA')),
    phone           text,
    email           text,
    invoice_prefix  text not null unique,          -- e.g. 'AYD', 'AYM'
    active          boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create trigger t_legal_entities_updated before update on legal_entities
    for each row execute function set_updated_at();

-- ---------- users ----------
create table users (
    id              uuid primary key default gen_random_uuid(),
    phone           text not null,
    phone_country   char(2) not null check (phone_country in ('AE','SA')),
    email           text,
    full_name       text,
    locale          text not null default 'en' check (locale in ('en','ar')),
    country         char(2) not null check (country in ('AE','SA')),
    default_address_id uuid,                       -- FK added after addresses created
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    deleted_at      timestamptz,
    unique (phone_country, phone)
);
create index on users (phone);
create trigger t_users_updated before update on users
    for each row execute function set_updated_at();

-- ---------- addresses ----------
create table addresses (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references users(id) on delete cascade,
    label           text not null default 'Home',
    line1           text not null,
    line2           text,
    city            text not null,
    emirate_or_region text,
    country         char(2) not null check (country in ('AE','SA')),
    lat             numeric(9,6),
    lng             numeric(9,6),
    access_method   text not null default 'home_present'
        check (access_method in ('home_present','key_with_security','under_mat','unlocked')),
    access_notes    text,
    pets            boolean not null default false,
    is_default      boolean not null default false,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index on addresses (user_id);
create trigger t_addresses_updated before update on addresses
    for each row execute function set_updated_at();

alter table users
    add constraint fk_users_default_address
    foreign key (default_address_id) references addresses(id) on delete set null;

-- ---------- payment_methods ----------
create table payment_methods (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references users(id) on delete cascade,
    type            text not null check (type in ('card','tabby')),
    provider        text not null default 'stripe' check (provider in ('stripe','telr','ngenius','tabby')),
    provider_customer_id text not null,
    provider_pm_id  text not null,
    brand           text,
    last4           char(4),
    exp_month       smallint check (exp_month between 1 and 12),
    exp_year        smallint,
    is_default      boolean not null default false,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (provider, provider_pm_id)
);
create index on payment_methods (user_id);
create trigger t_pm_updated before update on payment_methods
    for each row execute function set_updated_at();

-- ---------- services (catalog) ----------
create table services (
    id              uuid primary key default gen_random_uuid(),
    slug            text not null unique,
    name_en         text not null,
    name_ar         text not null,
    category        text not null check (category in
        ('ac','duct','deep','furniture','pest','handyman','painting','water_tank')),
    pricing_model   text not null check (pricing_model in
        ('per_unit','tier_bedroom','flat','hourly','per_visit','quote')),
    base_price_fils bigint,                        -- for flat / per_visit base
    currency        char(3) not null default 'AED' check (currency in ('AED','SAR')),
    duration_estimate_min int,
    inclusions_en   text[] not null default '{}',
    inclusions_ar   text[] not null default '{}',
    exclusions_en   text[] not null default '{}',
    exclusions_ar   text[] not null default '{}',
    hero_image_url  text,
    images_url      text[] not null default '{}',
    faq_json        jsonb not null default '[]',
    cancellation_window_hours int not null default 2,
    active          boolean not null default true,
    sort_order      int not null default 0,
    country_scope   char(2)[] not null default array['AE','SA']::char(2)[],
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index on services (active, sort_order);
create trigger t_services_updated before update on services
    for each row execute function set_updated_at();

-- ---------- service_pricing_tiers ----------
create table service_pricing_tiers (
    id              uuid primary key default gen_random_uuid(),
    service_id      uuid not null references services(id) on delete cascade,
    tier_key        text not null,                 -- e.g. 'studio','1br','2br','per_ac_unit','per_sofa_3'
    label_en        text not null,
    label_ar        text not null,
    price_fils      bigint not null check (price_fils >= 0),
    active          boolean not null default true,
    sort_order      int not null default 0,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (service_id, tier_key)
);
create index on service_pricing_tiers (service_id);
create trigger t_tiers_updated before update on service_pricing_tiers
    for each row execute function set_updated_at();

-- ---------- bookings ----------
create table bookings (
    id              uuid primary key default gen_random_uuid(),
    public_ref      text not null unique default upper(substr(gen_random_uuid()::text,1,6)),
    user_id         uuid not null references users(id) on delete restrict,
    service_id      uuid not null references services(id) on delete restrict,
    address_id      uuid not null references addresses(id) on delete restrict,
    legal_entity_id uuid not null references legal_entities(id) on delete restrict,
    start_at        timestamptz not null,
    duration_min    int not null check (duration_min > 0),
    status          text not null default 'draft' check (status in
        ('draft','pending_payment','paid','matched','in_progress','completed',
         'cancelled','no_show','expired')),
    pricing_snapshot_json jsonb not null default '{}',
    subtotal_fils   bigint not null default 0,
    materials_fils  bigint not null default 0,
    surcharge_fils  bigint not null default 0,   -- Fri etc.
    service_fee_fils bigint not null default 0,
    vat_fils        bigint not null default 0,
    total_fils      bigint not null default 0,
    currency        char(3) not null default 'AED' check (currency in ('AED','SAR')),
    payment_method_id uuid references payment_methods(id) on delete set null,
    payment_intent_id text,                        -- stripe
    paid_at         timestamptz,
    captured_at     timestamptz,
    special_instructions text,
    country         char(2) not null check (country in ('AE','SA')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    constraint check_total check (total_fils >= 0)
);
create index on bookings (user_id, status, start_at desc);
create index on bookings (status, start_at);
create index on bookings (public_ref);

-- Slot-collision prevention: enforced in the application layer (createBooking in src/lib/data.ts).
-- Postgres-level gist exclusion was tried but hit "generation expression is not immutable" on Supabase's PG build.

create trigger t_bookings_updated before update on bookings
    for each row execute function set_updated_at();

-- ---------- booking_tiers (line items) ----------
create table booking_tiers (
    id              uuid primary key default gen_random_uuid(),
    booking_id      uuid not null references bookings(id) on delete cascade,
    tier_key        text not null,
    label_en        text not null,
    label_ar        text not null,
    qty             int not null check (qty > 0),
    unit_price_fils bigint not null check (unit_price_fils >= 0),
    created_at      timestamptz not null default now()
);
create index on booking_tiers (booking_id);

-- ---------- booking_assignments (mirrored from Reonxt) ----------
create table booking_assignments (
    id              uuid primary key default gen_random_uuid(),
    booking_id      uuid not null references bookings(id) on delete cascade,
    erp_assignment_ref text,
    pro_display_name text,
    pro_phone_last4 char(4),
    pro_rating_avg  numeric(3,2),
    status          text not null default 'pending' check (status in
        ('pending','assigned','en_route','arrived','in_progress','completed','no_show')),
    assigned_at     timestamptz,
    departed_at     timestamptz,
    arrived_at      timestamptz,
    completed_at    timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index on booking_assignments (booking_id);
create trigger t_assignments_updated before update on booking_assignments
    for each row execute function set_updated_at();

-- ---------- booking_events (append-only) ----------
create table booking_events (
    id              bigserial primary key,
    booking_id      uuid not null references bookings(id) on delete cascade,
    kind            text not null,
    actor           text not null check (actor in ('system','customer','admin','erp','stripe')),
    data_json       jsonb not null default '{}',
    created_at      timestamptz not null default now()
);
create index on booking_events (booking_id, created_at desc);

-- ---------- recurring_schedules ----------
create table recurring_schedules (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references users(id) on delete cascade,
    service_id      uuid not null references services(id) on delete restrict,
    address_id      uuid not null references addresses(id) on delete restrict,
    frequency       text not null check (frequency in ('weekly','biweekly')),
    preferred_pro_hint text,
    next_booking_id uuid references bookings(id) on delete set null,
    active          boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index on recurring_schedules (user_id, active);
create trigger t_recurring_updated before update on recurring_schedules
    for each row execute function set_updated_at();

-- ---------- invoices (VAT-compliant) ----------
create table invoices (
    id              uuid primary key default gen_random_uuid(),
    booking_id      uuid not null references bookings(id) on delete restrict,
    legal_entity_id uuid not null references legal_entities(id) on delete restrict,
    user_id         uuid not null references users(id) on delete restrict,
    seq_scope       text not null,                 -- e.g. '2026' or '2026-10'
    number          int not null,
    display_number  text generated always as (seq_scope || '-' || lpad(number::text, 6, '0')) stored,
    issued_at       timestamptz not null default now(),
    bill_to_json    jsonb not null,                -- frozen customer + address at issue time
    subtotal_fils   bigint not null,
    vat_rate_bp     int not null default 500,     -- 5%
    vat_fils        bigint not null,
    total_fils      bigint not null,
    currency        char(3) not null check (currency in ('AED','SAR')),
    pdf_storage_path text,
    status          text not null default 'draft' check (status in ('draft','issued','voided')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (legal_entity_id, seq_scope, number)
);
create index on invoices (user_id, issued_at desc);
create index on invoices (booking_id);
create trigger t_invoices_updated before update on invoices
    for each row execute function set_updated_at();

-- ---------- invoice_lines ----------
create table invoice_lines (
    id              uuid primary key default gen_random_uuid(),
    invoice_id      uuid not null references invoices(id) on delete cascade,
    description_en  text not null,
    description_ar  text not null,
    qty             int not null check (qty > 0),
    unit_price_fils bigint not null check (unit_price_fils >= 0),
    line_total_fils bigint not null check (line_total_fils >= 0),
    sort_order      int not null default 0
);
create index on invoice_lines (invoice_id);

-- ---------- credit_notes (refunds against invoices) ----------
create table credit_notes (
    id              uuid primary key default gen_random_uuid(),
    invoice_id      uuid not null references invoices(id) on delete restrict,
    legal_entity_id uuid not null references legal_entities(id) on delete restrict,
    seq_scope       text not null,
    number          int not null,
    display_number  text generated always as (seq_scope || '-CN-' || lpad(number::text, 6, '0')) stored,
    issued_at       timestamptz not null default now(),
    reason          text not null,
    amount_fils     bigint not null check (amount_fils > 0),
    currency        char(3) not null,
    pdf_storage_path text,
    created_at      timestamptz not null default now(),
    unique (legal_entity_id, seq_scope, number)
);
create index on credit_notes (invoice_id);

-- ---------- ratings ----------
create table ratings (
    id              uuid primary key default gen_random_uuid(),
    booking_id      uuid not null unique references bookings(id) on delete cascade,
    user_id         uuid not null references users(id) on delete cascade,
    stars           smallint not null check (stars between 1 and 5),
    comment         text,
    tip_fils        bigint not null default 0 check (tip_fils >= 0),
    created_at      timestamptz not null default now()
);
create index on ratings (user_id);

-- ---------- issue_reports ----------
create table issue_reports (
    id              uuid primary key default gen_random_uuid(),
    booking_id      uuid not null references bookings(id) on delete cascade,
    user_id         uuid not null references users(id) on delete cascade,
    type            text not null check (type in ('late','no_show','quality','damage','missing','other')),
    description     text not null,
    photos_json     jsonb not null default '[]',   -- [{path,bytes,mime}]
    status          text not null default 'open' check (status in ('open','under_review','resolved','rejected')),
    resolved_at     timestamptz,
    resolution_notes text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index on issue_reports (status, created_at desc);
create index on issue_reports (user_id);
create trigger t_issues_updated before update on issue_reports
    for each row execute function set_updated_at();

-- ---------- support_threads / support_messages ----------
create table support_threads (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid not null references users(id) on delete cascade,
    booking_id      uuid references bookings(id) on delete set null,
    subject         text,
    status          text not null default 'open' check (status in ('open','closed')),
    last_msg_at     timestamptz not null default now(),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index on support_threads (user_id, last_msg_at desc);
create trigger t_threads_updated before update on support_threads
    for each row execute function set_updated_at();

create table support_messages (
    id              uuid primary key default gen_random_uuid(),
    thread_id       uuid not null references support_threads(id) on delete cascade,
    from_role       text not null check (from_role in ('customer','agent','system')),
    body            text not null,
    attachments_json jsonb not null default '[]',
    created_at      timestamptz not null default now()
);
create index on support_messages (thread_id, created_at);

-- ---------- quotes (Painting) ----------
create table quotes (
    id              uuid primary key default gen_random_uuid(),
    public_ref      text not null unique default upper(substr(gen_random_uuid()::text,1,6)),
    user_id         uuid not null references users(id) on delete cascade,
    service_id      uuid not null references services(id) on delete restrict,
    address_id      uuid not null references addresses(id) on delete restrict,
    scope_notes     text not null,
    photos_json     jsonb not null default '[]',
    admin_quoted_fils bigint,
    currency        char(3) not null default 'AED',
    status          text not null default 'requested' check (status in
        ('requested','quoted','accepted','declined','expired')),
    quoted_by       text,                          -- admin user email
    quoted_at       timestamptz,
    expires_at      timestamptz,
    converted_booking_id uuid references bookings(id) on delete set null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index on quotes (user_id, status);
create index on quotes (status, created_at desc);
create trigger t_quotes_updated before update on quotes
    for each row execute function set_updated_at();

-- ---------- ERP outbox + inbox ----------
create table erp_outbox (
    id              uuid primary key default gen_random_uuid(),
    event_type      text not null,
    aggregate_id    uuid not null,                 -- usually booking.id
    idempotency_key text not null unique,
    payload_json    jsonb not null,
    status          text not null default 'pending' check (status in ('pending','in_flight','delivered','failed','dead')),
    attempts        int not null default 0,
    next_attempt_at timestamptz not null default now(),
    last_error      text,
    delivered_at    timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index on erp_outbox (status, next_attempt_at);
create index on erp_outbox (aggregate_id);
create trigger t_outbox_updated before update on erp_outbox
    for each row execute function set_updated_at();

create table erp_inbox (
    id              uuid primary key default gen_random_uuid(),
    callback_type   text not null,
    idempotency_key text not null unique,
    payload_json    jsonb not null,
    received_at     timestamptz not null default now(),
    processed_at    timestamptz,
    processing_error text
);
create index on erp_inbox (processed_at) where processed_at is null;

-- ---------- admin users + audit ----------
create table admin_users (
    id              uuid primary key default gen_random_uuid(),
    email           text not null unique,
    full_name       text not null,
    role            text not null default 'support' check (role in ('owner','admin','support','viewer')),
    password_hash   text not null,
    totp_secret     text,
    last_login_at   timestamptz,
    active          boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create trigger t_admin_users_updated before update on admin_users
    for each row execute function set_updated_at();

create table admin_audit_log (
    id              bigserial primary key,
    admin_user_id   uuid not null references admin_users(id) on delete restrict,
    action          text not null,
    entity          text not null,
    entity_id       text,
    before_json     jsonb,
    after_json      jsonb,
    created_at      timestamptz not null default now()
);
create index on admin_audit_log (admin_user_id, created_at desc);
create index on admin_audit_log (entity, entity_id);

-- ---------- notifications outbox ----------
create table notifications_outbox (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid references users(id) on delete cascade,
    channel         text not null check (channel in ('push','sms','whatsapp','email')),
    template        text not null,
    payload_json    jsonb not null,
    status          text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
    scheduled_at    timestamptz not null default now(),
    sent_at         timestamptz,
    error           text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
create index on notifications_outbox (status, scheduled_at);
create trigger t_notif_updated before update on notifications_outbox
    for each row execute function set_updated_at();

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table users enable row level security;
alter table addresses enable row level security;
alter table payment_methods enable row level security;
alter table bookings enable row level security;
alter table booking_tiers enable row level security;
alter table booking_assignments enable row level security;
alter table booking_events enable row level security;
alter table recurring_schedules enable row level security;
alter table invoices enable row level security;
alter table invoice_lines enable row level security;
alter table credit_notes enable row level security;
alter table ratings enable row level security;
alter table issue_reports enable row level security;
alter table support_threads enable row level security;
alter table support_messages enable row level security;
alter table quotes enable row level security;

-- Public-read on catalog
alter table services enable row level security;
alter table service_pricing_tiers enable row level security;
alter table legal_entities enable row level security;
create policy "catalog_public_read" on services for select using (active = true);
create policy "tiers_public_read"   on service_pricing_tiers for select using (active = true);
create policy "legal_entities_read" on legal_entities for select using (active = true);

-- Owner-only policies (one example; same shape on all user-owned tables)
create policy "users_owner_rw" on users
    for all using (id = auth.uid()) with check (id = auth.uid());

create policy "addresses_owner_rw" on addresses
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "pm_owner_rw" on payment_methods
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "bookings_owner_rw" on bookings
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "booking_tiers_owner_r" on booking_tiers for select
    using (exists (select 1 from bookings b where b.id = booking_id and b.user_id = auth.uid()));
create policy "booking_assignments_owner_r" on booking_assignments for select
    using (exists (select 1 from bookings b where b.id = booking_id and b.user_id = auth.uid()));
create policy "booking_events_owner_r" on booking_events for select
    using (exists (select 1 from bookings b where b.id = booking_id and b.user_id = auth.uid()));
create policy "recurring_owner_rw" on recurring_schedules
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "invoices_owner_r" on invoices for select using (user_id = auth.uid());
create policy "invoice_lines_owner_r" on invoice_lines for select
    using (exists (select 1 from invoices i where i.id = invoice_id and i.user_id = auth.uid()));
create policy "credit_notes_owner_r" on credit_notes for select
    using (exists (select 1 from invoices i where i.id = invoice_id and i.user_id = auth.uid()));
create policy "ratings_owner_rw" on ratings
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "issues_owner_rw" on issue_reports
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "threads_owner_rw" on support_threads
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "messages_owner_rw" on support_messages
    for all using (exists (select 1 from support_threads t where t.id = thread_id and t.user_id = auth.uid()))
    with check (exists (select 1 from support_threads t where t.id = thread_id and t.user_id = auth.uid()) and from_role = 'customer');
create policy "quotes_owner_rw" on quotes
    for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Service role (admin console + Inngest workers) bypasses RLS by default.

-- =====================================================================
-- Seed: 2 legal entities + 11 services (prices placeholders — admin edits)
-- =====================================================================
insert into legal_entities (name, trn, address_line1, city, country, invoice_prefix) values
    ('Ayaad Musaeida Cleaning Services DMCC', 'TRN-PLACEHOLDER-001', 'Business Bay', 'Dubai', 'AE', 'AYD'),
    ('Ayaade Musaeida LLC',                    'TRN-PLACEHOLDER-002', 'Al Bustan',    'Dubai', 'AE', 'AYM');

insert into services
    (slug, name_en, name_ar, category, pricing_model, base_price_fils, duration_estimate_min,
     inclusions_en, exclusions_en, cancellation_window_hours, sort_order)
values
    ('ac-basic-cleaning', 'AC Basic Cleaning', 'تنظيف المكيف الأساسي',
     'ac', 'per_unit', null, 45,
     array['Dust removal','Filter wash','Visible-coil wipe'],
     array['Deep coil cleaning','Duct cleaning','Gas refill'], 4, 10),
    ('duct-cleaning', 'Duct Cleaning', 'تنظيف المجاري',
     'duct', 'flat', null, 120,
     array['Full duct vacuum','Air outlet cleaning'],
     array['Coil deep clean','Chemical wash'], 4, 20),
    ('duct-coil-deep-cleaning', 'Duct & Coil Deep Cleaning', 'تنظيف عميق للمجاري والملف',
     'duct', 'flat', null, 180,
     array['Full duct vacuum','Coil chemical wash','Air outlet cleaning','Drainage flush'],
     array['Gas refill'], 4, 30),
    ('deep-cleaning-apartment', 'Deep Cleaning — Apartment', 'التنظيف العميق — شقة',
     'deep', 'tier_bedroom', null, 240,
     array['All rooms deep clean','Kitchen & bathroom deep','Windows interior'],
     array['Exterior windows','Carpet shampoo (add-on)'], 2, 40),
    ('deep-cleaning-villa', 'Deep Cleaning — Villa', 'التنظيف العميق — فيلا',
     'deep', 'tier_bedroom', null, 360,
     array['All rooms deep clean','Kitchen & bathroom deep','Windows interior'],
     array['Exterior windows','Garden'], 2, 50),
    ('furniture-cleaning', 'Furniture Cleaning', 'تنظيف الأثاث',
     'furniture', 'per_unit', null, 90,
     array['Vacuum','Shampoo + extraction','Deodorize'],
     array['Leather treatment','Dye repair'], 2, 60),
    ('pest-control-apartment', 'General Pest Control — Apartment', 'مكافحة الآفات العامة — شقة',
     'pest', 'tier_bedroom', null, 90,
     array['Spray treatment','Bait placement','1-month warranty'],
     array['Termite treatment','Bedbug deep treatment'], 2, 70),
    ('pest-control-villa', 'General Pest Control — Villa', 'مكافحة الآفات العامة — فيلا',
     'pest', 'tier_bedroom', null, 120,
     array['Spray treatment','Bait placement','1-month warranty'],
     array['Termite treatment','Bedbug deep treatment'], 2, 80),
    ('handyman', 'Handyman', 'عامل صيانة',
     'handyman', 'per_visit', 15000, 60,
     array['Call-out','Up to 1 hour included'],
     array['Materials','Specialist work'], 2, 90),
    ('painting', 'Painting', 'طلاء',
     'painting', 'quote', null, null,
     array['Priced on inspection'],
     array['Furniture moving (add-on)'], 24, 100),
    ('water-tank-cleaning', 'Water Tank Cleaning', 'تنظيف خزان المياه',
     'water_tank', 'flat', null, 90,
     array['Drain','Scrub + disinfect','Refill'],
     array['Pump repair'], 2, 110);

-- Example tier rows (prices placeholder; admin edits via console)
insert into service_pricing_tiers (service_id, tier_key, label_en, label_ar, price_fils, sort_order)
select id, 'per_ac_unit', 'Per AC Unit', 'لكل مكيف', 7000, 1 from services where slug = 'ac-basic-cleaning';

insert into service_pricing_tiers (service_id, tier_key, label_en, label_ar, price_fils, sort_order)
select id, k, le, la, 0, so from services s, (values
    ('studio','Studio','استوديو',1),
    ('1br','1 Bedroom','غرفة واحدة',2),
    ('2br','2 Bedrooms','غرفتان',3),
    ('3br','3 Bedrooms','3 غرف',4),
    ('4br','4 Bedrooms','4 غرف',5)
) t(k,le,la,so) where s.slug in ('deep-cleaning-apartment','pest-control-apartment');

insert into service_pricing_tiers (service_id, tier_key, label_en, label_ar, price_fils, sort_order)
select id, k, le, la, 0, so from services s, (values
    ('3br','3 Bedrooms','3 غرف',1),
    ('4br','4 Bedrooms','4 غرف',2),
    ('5br','5 Bedrooms','5 غرف',3),
    ('6br_plus','6+ Bedrooms','6 غرف أو أكثر',4)
) t(k,le,la,so) where s.slug in ('deep-cleaning-villa','pest-control-villa');

insert into service_pricing_tiers (service_id, tier_key, label_en, label_ar, price_fils, sort_order)
select id, k, le, la, 0, so from services s, (values
    ('per_sofa_1','1-Seater','مقعد واحد',1),
    ('per_sofa_2','2-Seater','مقعدان',2),
    ('per_sofa_3','3-Seater','ثلاثة مقاعد',3),
    ('per_lshape','L-Shape','شكل حرف L',4),
    ('per_mattress','Mattress','مرتبة',5),
    ('per_carpet','Carpet (per sqm)','سجاد (متر مربع)',6)
) t(k,le,la,so) where s.slug = 'furniture-cleaning';
