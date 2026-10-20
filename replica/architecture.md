# Architecture — Ayaad (customer-facing DTC app)

> **Brand lock** (color-picked from the new wordmark PNG — supersedes any earlier palette memory):
> - **App name:** Ayaad
> - **Logo:** `replica/brand/ayaad_logo.png` (wordmark; blue "ayaa" with yellow "y" ligature on white)
> - **Primary Blue:** `#0045BA` (royal / cobalt; direct pixel sample)
> - **Accent Yellow:** `#F0C000` (dominant from histogram; brightened spec `#FFC500` approved for digital use)
> - **Surface:** `#FFFFFF` with neutral grays for text/borders (greys to be set by `/replica-design` under WCAG AA)
> - **Font:** TBD by `/replica-design` — logo is a geometric lowercase sans, so pair with a modern humanist sans (Inter, Plus Jakarta Sans, or similar). Confirmed in design pass.
> - `/replica-brand` will SKIP naming + palette steps and only run its leftover-sweep (scan code for any `Justlife`, `JL`, `justmop`, or old teal `#00B294` / navy `#1a2a3a` remnants before launch).

**Inputs:** `replica/recon.md` (locked), `replica/features.csv` (11-service catalog, 129 features)
**Output of this doc:** stack decision + SQL schema + API map + build order
**Next step:** `/replica-design` reads this and produces design tokens + component specs

---

## 1. Stack

| Layer | Choice | Why (one line) |
|---|---|---|
| Monorepo | pnpm + Turborepo | One repo: `web/`, `admin/`, `mobile/`, `api/`, `shared/`, `db/`. Shared types land in one package. |
| Web (customer + admin) | **Next.js 15 App Router + TypeScript** | SSR for SEO on service landing pages; same deploy for `/admin` under auth. |
| Mobile | **Expo (React Native) + EAS** | Same TS + same API; EAS builds iOS + Android without a Mac studio. |
| UI primitives | Tailwind + shadcn/ui + lucide icons | Tokens come from replica-design. RTL comes free (Tailwind `dir="rtl"`). |
| i18n | `next-intl` (web) + `expo-localization` + `i18next` (mobile) | EN + AR with full RTL mirror. |
| Database | **Postgres on Supabase** | Managed Postgres + Auth + Storage + Realtime (support chat) + RLS in one place. One region: `eu-central-1` (closest to UAE with low latency). |
| ORM | **Drizzle** | Type-safe SQL, migrations as .sql files (same shape as what we hand Reonxt), tiny runtime. |
| Auth | **Supabase Auth (phone OTP)** | +971 + +966 routed via Twilio Verify under Supabase hood. |
| Payments | **Stripe** (primary) with a payment-gateway abstraction so **Telr / N-Genius** can be added behind the same interface | 3DS2 mandatory in UAE; Stripe handles it. Local gateway behind feature flag for commercial reasons later. Tabby = future. |
| Email | **Resend** | Transactional; good deliverability; cheap. SPF/DKIM/DMARC set on `ayaad.ae`. |
| SMS | **Twilio Verify** (OTP) + **Twilio SMS** (fallbacks) | UAE + KSA covered; cost acceptable. |
| WhatsApp | **Twilio WhatsApp Business API** | For "cleaner on the way" messages. Reuses existing +971 58 161 4653 line (Ayaad). |
| Push notifications | **Expo Push** → APNs + FCM | One API, both platforms. |
| Background jobs | **Inngest** | Durable, retries, DLQ, event-driven. Needed for: invoice PDF, ERP outbox retry, credits expiry sweep, reminder notifications. |
| PDF | **@react-pdf/renderer** | Invoice generation in Node; VAT-compliant layout, EN + AR. |
| Files | **Supabase Storage** | Invoice PDFs, issue-report photos, service hero images, pro avatars. |
| Realtime | **Supabase Realtime** | Support chat (`support_messages` table watched); booking status changes (`booking_events` channel). |
| Hosting | **Vercel** (web + admin) + **Supabase** (db + storage + realtime) + **Inngest Cloud** (jobs) | All managed. Zero DevOps for the operator. |
| Analytics | **PostHog** (self-hosted or EU cloud) | Funnels for S03→S09 booking conversion; privacy-first (PDPL concerns). |
| Error reporting | **Sentry** | Web + mobile + API. |
| Secrets | Vercel + Supabase env vars + 1Password for shared team secrets | — |
| CI | GitHub Actions | Lint + typecheck + migrations check + preview deploys. |

**One database. No microservices. The clone needs the original's features, not its architecture.**

---

## 2. Schema

Full SQL lives in `replica/schema.sql`. Highlights:

### Conventions
- `id uuid primary key default gen_random_uuid()`
- `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()` with an `update_updated_at` trigger
- Money as **integer fils** (`price_fils bigint`) + `currency char(3) check (currency in ('AED','SAR'))`. 1 AED = 100 fils. Never floats.
- Enums as text + CHECK (easier to migrate than Postgres enums)
- All times `timestamptz` stored UTC; UI converts to Asia/Dubai or Asia/Riyadh at render
- **RLS on every table.** Customer policies via `auth.uid()`; admin bypasses with service role.
- Foreign keys all have an explicit `on delete` rule — never defaulted

### Tables (22 total)

**Identity + address book**
- `users` (phone, phone_country, email?, full_name, locale, country, default_address_id, created_at, deleted_at)
- `addresses` (user_id, label, line1, line2, city, emirate_or_region, country, lat, lng, access_method, access_notes, pets, is_default)
- `payment_methods` (user_id, type, provider_customer_id, provider_pm_id, brand, last4, exp_month, exp_year, is_default)

**Catalog**
- `services` (slug, name_en, name_ar, category, pricing_model, base_price_fils?, currency, duration_estimate_min, inclusions_en[], inclusions_ar[], exclusions_en[], exclusions_ar[], hero_image_url, images_url[], faq_json, active, sort_order, cancellation_window_hours)
- `service_pricing_tiers` (service_id, tier_key, label_en, label_ar, price_fils, active, sort_order) — rows for Studio/1BR/.../6BR+, per_ac_unit, per_sofa_1/2/3/L/mattress/carpet

**Booking**
- `bookings` (user_id, service_id, address_id, start_at, duration_min, status, pricing_snapshot_json, subtotal_fils, materials_fils, surcharge_fils, voucher_discount_fils, credits_used_fils, service_fee_fils, vat_fils, total_fils, currency, payment_method_id, voucher_code?, special_instructions, country)
- `booking_tiers` (booking_id, tier_key, qty, unit_price_fils) — e.g. {per_ac_unit × 4, qty=4} or {2BR, qty=1}
- `booking_assignments` (booking_id, erp_assignment_ref?, pro_name_display, pro_phone_last4, assigned_at, departed_at, arrived_at, completed_at, status)
- `booking_events` (booking_id, kind, actor, data_json, created_at) — append-only event log for debugging
- `recurring_schedules` (user_id, service_id, address_id, frequency, preferred_pro_hint, next_booking_id?, active)

**Invoicing (VAT-compliant)**
- `invoices` (booking_id, seq_scope, number, issued_at, legal_entity_id, user_id, bill_to_json, subtotal_fils, vat_rate_bp, vat_fils, total_fils, currency, pdf_storage_path, status) — status = draft|issued|voided
- `invoice_lines` (invoice_id, description_en, description_ar, qty, unit_price_fils, line_total_fils)
- `credit_notes` (invoice_id, seq_scope, number, issued_at, reason, amount_fils, pdf_storage_path)
- `legal_entities` (name, trn, address, phone, email, invoice_prefix) — Ayaad DMCC / Ayaade Musaeida LLC — invoice numbering is per-entity

**Feedback / support**
- `ratings` (booking_id unique, user_id, stars, comment, tip_fils, created_at)
- `issue_reports` (booking_id, type, description, photos_json, status, resolved_at, resolution_notes)
- `support_threads` (user_id, booking_id?, status, last_msg_at)
- `support_messages` (thread_id, from_role, body, attachments_json, created_at)

**Painting quote flow**
- `quotes` (user_id, service_id, address_id, scope_notes, photos_json, admin_quoted_fils?, status, quoted_by, quoted_at, expires_at, converted_booking_id?)

**ERP integration**
- `erp_outbox` (event_type, aggregate_id, payload_json, idempotency_key, attempts, next_attempt_at, status, last_error) — jobs pick from here
- `erp_inbox` (callback_type, payload_json, received_at, idempotency_key unique, processed_at) — dedupes Reonxt webhooks

**Admin**
- `admin_users` (email, name, role, totp_secret, last_login_at)
- `admin_audit_log` (admin_user_id, action, entity, entity_id, before_json, after_json, created_at)

**Notifications**
- `notifications_outbox` (user_id, channel, template, payload_json, status, scheduled_at, sent_at, error)

### Hard constraints (DB-enforced, not UI)
- Slot availability check at booking: a transactional "insert into bookings where no overlapping booking exists for this pro/address" — exclusion constraint on `(address_id, tstzrange(start_at, start_at + duration_min))` with gist index. Prevents double-book.
- Credits balance can never go negative: `check (balance_fils >= 0)` + application layer uses `select ... for update` on the wallet row before debit.
- Invoice numbering: `unique (legal_entity_id, seq_scope, number)` — monotonic sequence per entity enforced at insert via advisory lock.
- Voucher usage: `unique (voucher_id, user_id)` when `voucher.user_scope = 'per_user_once'`.

### Row Level Security (summary)
- `users`: user can select/update own row only
- `addresses`, `payment_methods`, `bookings`, `credit_wallets`, `credit_txns`, `invoices`, `ratings`, `issue_reports`, `support_threads`, `quotes`: user can CRUD rows where `user_id = auth.uid()`
- `services`, `service_pricing_tiers`, `legal_entities`: everyone can read; only service role can write
- `booking_assignments`, `erp_outbox`, `erp_inbox`, `admin_*`: service role only
- `support_messages`: user can read messages in own threads; admin bypasses

---

## 3. API

### REST routes (customer-facing, under `/api/v1/*`)

| Method | Path | What | Who | Input | Output | Flow |
|---|---|---|---|---|---|---|
| POST | `/auth/otp/send` | Request OTP | anon | `{phone, country}` | `{session_token}` | F01, F10 |
| POST | `/auth/otp/verify` | Verify OTP, mint JWT | anon | `{session_token, code}` | `{access_token, refresh_token, user}` | F01 |
| POST | `/auth/logout` | Revoke tokens | user | — | 204 | F23 |
| GET | `/me` | Current user profile | user | — | `{user}` | S11 |
| PATCH | `/me` | Update profile | user | `{full_name?, email?, locale?}` | `{user}` | S11 |
| GET | `/services` | Catalog (active only) | anon | `?country=AE` | `[{service...}]` | S03 |
| GET | `/services/:slug` | Service detail + tiers | anon | — | `{service, tiers}` | S04 |
| GET | `/addresses` | Address list | user | — | `[{address...}]` | S07, S12 |
| POST | `/addresses` | Add | user | address body | `{address}` | S12 |
| PATCH | `/addresses/:id` | Edit | user | partial | `{address}` | S12 |
| DELETE | `/addresses/:id` | Remove | user | — | 204 | S12 |
| GET | `/payment-methods` | List | user | — | `[{pm...}]` | S13 |
| POST | `/payment-methods/setup-intent` | Create Stripe SetupIntent | user | — | `{client_secret}` | S13 |
| DELETE | `/payment-methods/:id` | Remove | user | — | 204 | S13 |
| POST | `/bookings` | Create draft | user | `{service_slug, tiers[], address_id, start_at, special_instructions}` | `{booking, price_quote}` | F01 S05–S07 |
| GET | `/bookings` | List mine | user | `?status=upcoming\|past` | `[{booking...}]` | S15 |
| GET | `/bookings/:id` | Detail | user | — | `{booking, assignment, invoice?}` | S16 |
| POST | `/bookings/:id/pay` | Confirm payment | user | `{payment_method_id, cash?}` | `{booking, invoice}` | F01 S08 → S09 |
| POST | `/bookings/:id/reschedule` | Change slot | user | `{new_start_at}` | `{booking, fee_fils?}` | F03 |
| POST | `/bookings/:id/cancel` | Cancel | user | — | `{refund_mode, refund_fils, fee_fils}` | F04 |
| PATCH | `/bookings/:id` | Edit address or instructions | user | partial | `{booking}` | S17 |
| POST | `/bookings/:id/rating` | Rate pro | user | `{stars, comment?, tip_fils?}` | `{rating}` | F05 S18 |
| POST | `/bookings/:id/issue` | Report issue (<24h) | user | `{type, description, photos[]}` | `{issue}` | F08 S25 |
| POST | `/quotes` | Request painting quote | user | `{service_slug, address_id, scope_notes, photos[]}` | `{quote}` | Painting |
| POST | `/quotes/:id/accept` | Accept quote → draft booking | user | `{start_at}` | `{booking}` | Painting |
| POST | `/quotes/:id/decline` | Decline | user | — | 204 | Painting |
| GET | `/invoices/:id` | Invoice JSON | user | — | `{invoice, lines}` | S16 |
| GET | `/invoices/:id.pdf` | Signed PDF URL | user | — | `{url, expires_at}` | S16 |
| GET | `/support/threads` | My threads | user | — | `[{thread...}]` | S19 |
| POST | `/support/threads` | Open thread | user | `{booking_id?, body}` | `{thread, first_message}` | S19 |
| POST | `/support/threads/:id/messages` | Send | user | `{body, attachments[]}` | `{message}` | S19 |
| GET | `/notifications` | List | user | `?unread_only=true` | `[{n...}]` | drawer |

**35 customer routes.** Mobile uses the same.

### Admin routes (under `/admin/api/*`, admin JWT required)

| Method | Path | What |
|---|---|---|
| POST | `/admin/auth/login` | Email + password + TOTP |
| GET/PATCH | `/admin/services/:id` + tiers CRUD | Pricing management |
| GET | `/admin/users?q=` | Search users |
| GET | `/admin/users/:id/bookings` | View bookings |
| POST | `/admin/bookings/:id/refund` | Issue refund (bank or credits) |
| POST | `/admin/bookings/:id/status` | Manually push a status (fallback if ERP webhook silent) |
| POST | `/admin/quotes/:id/issue` | Set painting quote price |
| GET | `/admin/issues?status=open` | Issue inbox |
| POST | `/admin/issues/:id/resolve` | Close |
| GET | `/admin/erp/outbox?status=failed` | ERP delivery log |
| POST | `/admin/erp/outbox/:id/replay` | Replay |
| GET | `/admin/analytics/*` | Dashboards |

**~20 admin routes.**

### Webhooks

**Inbound:**
| Path | From | What |
|---|---|---|
| POST `/webhooks/stripe` | Stripe | payment_intent.succeeded / .payment_failed / charge.refunded — update invoice, release credits |
| POST `/webhooks/erp/callbacks` | Reonxt | pro_assigned / pro_departed / pro_arrived / service_completed — update `booking_assignments`, trigger notifs |
| POST `/webhooks/twilio/sms` | Twilio | delivery status |
| POST `/webhooks/resend` | Resend | delivery / bounce / complaint |

**Outbound (via `erp_outbox` + Inngest):**
| Event | Payload | Idempotency |
|---|---|---|
| `booking.paid` | full booking + customer + address + invoice ref | key = booking.id |
| `booking.rescheduled` | booking + new slot | key = booking.id + version |
| `booking.cancelled` | booking + reason + refund mode | key = booking.id |
| `booking.amended` | address or instructions change | key = booking.id + version |
| `payment.confirmed` | payment ref + amount | key = payment_intent.id |

### Background jobs (Inngest)

| Job | Trigger | Does |
|---|---|---|
| `invoice.generate_pdf` | event `booking.paid` | Render PDF, upload to Storage, update `invoices.pdf_storage_path`, enqueue email |
| `invoice.email` | event `invoice.ready` | Send via Resend with PDF attachment + hosted link |
| `erp.push` | polls `erp_outbox` every 10s | Exponential backoff retry, DLQ after 10 attempts |
| `notifications.send` | polls `notifications_outbox` | Fan out to push/SMS/WA/email channels |
| `reminders.booking_24h` | cron hourly | Send push + WA 24h before each upcoming booking |
| `reminders.rate_prompt` | event `booking.completed` + 1h delay | Push "rate your pro" |
| `issues.escalate_24h` | polls `issue_reports` where open > 24h | Alert admin via Slack/email |

---

## 4. The parts that bite

1. **UAE VAT compliance.** 5% VAT, TRN on invoice, sequential numbering **per legal entity** (Ayaad DMCC and Ayaade Musaeida LLC have different TRNs — pick the right one per booking at invoice time). Arabic + English on same PDF. FTA audits sample invoices. Enforced via `unique (legal_entity_id, seq_scope, number)` + Postgres advisory lock on insert.

2. **Timezones.** UAE = Asia/Dubai (UTC+4, no DST). KSA = Asia/Riyadh (UTC+3, no DST). Store UTC, render per country. Don't let the Vercel region (UTC) leak into booking displays — one bug waiting to happen.

3. **Payment orchestration — auth vs capture.**
   - Booking ≥7 days out: immediate capture at pay time (so refund = full bank refund 7–14 days)
   - Booking <7 days out: auth-at-booking, capture after service (so cancel = void auth, 1–5 days)
   - Cash collection: booking marked `paid` only when ops confirms via ERP callback OR admin manual flip
   - 3DS2 challenge happens on step 4 — test the state machine ruthlessly

4. **Idempotency everywhere.**
   - Stripe webhooks retry — dedupe by `event.id`
   - Reonxt callbacks retry — dedupe by `(callback_type, idempotency_key)` unique
   - ERP outbox retries — Reonxt accepts the same `idempotency_key` and returns the first result

5. **Slot double-booking.** Postgres exclusion constraint with gist index on `(address_id, tstzrange(start_at, start_at + duration_min))` — two concurrent bookings on the same slot can't both commit.

6. **RTL + bidirectional PDF.** Invoice PDF must look right with Arabic right-aligned, numerals in whichever script, currency "AED" or "د.إ" per locale. Test with a sample booking in Arabic locale on day one.

7. **Painting quote expiry.** `quotes.expires_at` fires an Inngest job that marks it `expired` and emails the user. Admin can re-issue.

8. **Multi-pro assignments without a pro table.** The clone doesn't store pros (Reonxt does). `booking_assignments` only holds display info (name + last4 phone) that Reonxt callback supplies. Prevent PII bleed: don't accept full phone, don't store ID numbers.

9. **PDPL (UAE Personal Data Protection Law) deletion.** `/me/delete` enqueues a job that redacts user_id → null in bookings (keep business record), scrubs phone/email, revokes all tokens. 30-day grace per PDPL.

10. **Phone number formats.** `+971 50 1234567` and `+966 50 1234567` must both validate; store as E.164. Reject landlines.

11. **ERP outbox growth.** Partition by `created_at` monthly; archive rows past 90 days to cold storage.

---

## 5. Build order

### Milestone 0 — Vertical slice (prove the stack)
**One flow, end to end, ugly.**

> New user → phone OTP → browse → Deep Cleaning Apartment → pick 2BR tier → pick slot → add address → pay by card (Stripe) → see confirmation → receive invoice email → see booking in "upcoming" list.

- **Screens:** S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S15, S16
- **Tables:** users, services, service_pricing_tiers, addresses, payment_methods, bookings, booking_tiers, invoices, invoice_lines, legal_entities
- **Routes:** 12 (auth × 2, services × 2, addresses × 2, payment-methods × 2, bookings × 4)
- **Jobs:** invoice.generate_pdf, invoice.email
- **No ERP yet.** No admin UI yet. No vouchers, credits, cancel/reschedule, chat.

**Goal:** functional, deployed to Vercel + Supabase + Stripe test mode. Takes money. Produces a real PDF invoice. **~1 week.**

### Milestone 1 — Must-haves, catalog pass
- Remaining 10 services with their pricing models (AC per_unit, Furniture per_unit, Pest tier, Duct flat, Handyman per_visit, Painting quote, Water Tank flat)
- Reschedule / cancel with refund logic
- Rating flow + tip
- Issue report (<24h) + admin inbox
- Addresses CRUD UI + default
- Payment methods CRUD UI
- i18n EN + AR with RTL mirror

**Target: ~3 weeks.**

### Milestone 2 — Admin console + Invoicing hardening + ERP outbox
- Admin login (email + password + TOTP)
- Pricing CRUD per service × tier
- Voucher CRUD
- User search + refund action
- Issue inbox + resolution
- Invoice: credit notes + VAT line + Arabic layout + legal-entity switch
- Invoice resend
- ERP outbox + delivery log + manual replay UI
- ERP push on `booking.paid`, `booking.rescheduled`, `booking.cancelled`
- **Deliverable:** the integration-contract draft for Reonxt review (payload JSON + auth + idempotency rules + retry policy)

**Target: ~2 weeks. End of this = usable product for Ayaad.**

### Milestone 3 — Should-haves
- Live chat with Supabase Realtime
- WhatsApp notifications for pro-on-the-way (Twilio)
- Recurring bookings + preferred-pro hint
- ERP callbacks (pro_assigned/en_route/arrived/completed) wired to notifications
- Multi-city coverage polygons

**Target: ~3 weeks.**

### Milestone 4 — Could-haves (post-launch)
- Apple Wallet pass
- Referral program
- Blog / SEO service-area landing pages (programmatic)
- Analytics dashboard in admin
- `/replica-entrepreneur` fix plan folded back in

---

## Summary

- **Stack:** Next.js 15 + Expo + Supabase Postgres + Drizzle + Stripe + Resend + Twilio + Inngest + Vercel. One codebase, one DB, no microservices.
- **Tables:** 18 · **Customer routes:** 30 · **Admin routes:** ~18 · **Webhooks:** 4 in / 5 out · **Background jobs:** 7
- **Three riskiest parts:**
  1. UAE VAT invoicing (per-legal-entity numbering, bilingual PDF, FTA audit shape)
  2. Payment state machine (auth vs capture by lead time × voucher × credits × 3DS2)
  3. ERP outbox (idempotent push + Reonxt's unknown API shape — may need to co-design)
- **Next:** `/replica-design` — reads this file + recon, produces design tokens, type scale, component specs, WCAG contrast report.
