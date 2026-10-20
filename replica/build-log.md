# Build log — Ayaad

Format: `S## · YYYY-MM-DD · status · notes`

## 2026-10-20 — Deployed to Vercel

- Repo pushed to https://github.com/rmail4me/ayaad-app (69 files, main branch)
- Vercel project created, root directory set to `app/`
- 7 env vars configured (2 Config for NEXT_PUBLIC_*, 5 Sensitive)
- First deployment live; verify exact URL from Vercel dashboard (initial fetch to `ayaad-app.vercel.app` 404'd — may be `ayaad-app-rmail4me.vercel.app`)
- Still pending: real `STRIPE_WEBHOOK_SECRET` (needs webhook endpoint created against prod URL)
- Resend domain still verifying; sending from `onboarding@resend.dev` sandbox meanwhile

## 2026-10-20 — B2B pivot

Scope changed from consumer DTC to **corporate customers with prepaid balance**. New model, new auth, same catalog + stepper.

**New entities**
- `companies` — bill-to legal entity; carries `prepaid_balance_fils` + optional `rate_card_json` for per-customer price overrides
- `company_balance_txns` — lightweight ledger (topup / booking_use / refund / adjustment)
- `auth_tokens` — email magic-link tokens (sha256 stored, 15-min TTL, single-use)
- `users` gain `email` (unique), `company_id` FK, `role` enum (owner / admin / booker / approver / viewer); `phone` + `phone_country` made optional
- `bookings` gain `company_id` + `paid_from` ('prepaid' | 'card' | 'wire' | 'cash') + new status `pending_approval`

**Auth**
- Email magic link (Resend) replaces Twilio phone OTP as the primary flow
- Twilio code and env vars kept but now optional (future SMS reminders)
- `/auth` is email-only; `/auth/verify?t=…` consumes the token server-side
- Dev convenience: magic link URL printed to server console when `RESEND_API_KEY` is unset

**Payment**
- Default = draw from company's prepaid balance (one-transaction debit + status flip + ledger row)
- Fallback = Stripe Checkout card (becomes `paid_from='card'`)
- Insufficient balance = pay-by-card button is auto-selected
- No cash path from the customer app (B2B)
- Invoice `bill_to` is now the company name + TRN (not the individual contact)

**UI**
- `/me` shows user profile + company + prepaid balance + sign-out
- Pay step shows prepaid balance line, remaining after booking, top-up prompt if short
- Header shows user email instead of phone
- Bottom nav still 3-tab (Home / Bookings / Menu)

**Migrations**
- `drizzle/0002_b2b.sql` applied on top of `0001` — additive, safe to re-run on an empty DB
- Seed company `Ayaad Demo Corp` with AED 5,000 starting balance so dev works out of the box

**Known gaps (M1 continues)**
- No admin top-up UI yet — balances via SQL or `topupCompany()` helper
- No approval routing — all users book directly to paid; `pending_approval` status is defined but unused
- No multi-company switch — one user ↔ one company
- Rate card overrides table exists but code doesn't apply them yet
- Reset of users/bookings fixture needed if migrating a dev DB — the new schema is additive but seed data is not idempotent

## 2026-10-20 — M1 backend swap (fake → real)

Replaced the in-memory fake with real services. Signatures preserved — no screen code touched (except PayForm now handles the Stripe redirect branch).

- Postgres via Drizzle (Supabase), `drizzle/0001_init.sql` is the canonical migration
- Twilio Verify for OTP, dev mode (`AUTH_MODE=dev`) short-circuits with code 123456
- Stripe Checkout for cards (test mode) + signed webhook at `/api/webhooks/stripe`
- Resend transactional email + `@react-pdf/renderer` for VAT-compliant PDF invoice
- Invoice numbering: monotonic sequence inside a transaction, scoped per (legal_entity, year)
- ERP outbox table receives rows on paid; actual push disabled (`REONXT_PUSH_ENABLED=false`) until API co-designed
- Full checklist and setup steps in `replica/backend.md`
- Features matrix: 9 rows promoted to `yes` (phone+OTP, cash, card, 3DS, invoice PDF/email/numbering/VAT, ERP push)
- Current totals: **40 yes · 10 partial · 13 skip · 83 not started** out of 146

## 2026-10-20 — Scope cut: vouchers + credits removed

User decision — simplifies the stack considerably:
- **Dropped tables (4):** `credit_wallets`, `credit_txns`, `vouchers`, `voucher_redemptions`
- **Dropped routes (4):** apply-voucher, apply-credits, wallet GET, credits top-up
- **Dropped admin:** voucher CRUD
- **Dropped job:** credits.expire_sweep (daily FIFO)
- **UI:** bottom nav 4-tab → 3-tab (Home / Bookings / Menu); desktop header "Credits" link removed
- **Features matrix:** 10 rows flipped to `skip`
- **Schema cols:** `bookings.voucher_discount_fils`, `bookings.credits_used_fils`, `bookings.voucher_code` all removed
- **Kept:** `credit_notes` table — this is the VAT business concept (refund credit note vs an invoice), unrelated to the removed "credits wallet"
- **Impact:** M1 timeline shortens by ~1 week; price breakdown is now 4 lines (subtotal / service fee / VAT / total) instead of 6

## 2026-10-20 — M0 vertical slice shipped (fake data layer)

### Shell
- Monorepo deferred — single Next.js 15 app at `app/`
- Tokens from `/replica/design/tokens.css` imported into globals; Tailwind theme mapped
- Fonts: Plus Jakarta Sans + Noto Sans Arabic via Google Fonts (open license)
- Layout: sticky header + mobile bottom nav; container 1200 / prose 680
- Fake data layer at `src/lib/data.ts` with real function signatures — swap for Supabase+Drizzle later, zero screen changes
- Seed catalog: 11 services with Justlife-informed placeholder prices (admin edits in M2)

### Screens built in M0

| ID | Screen | Status | Notes |
|---|---|---|---|
| S03 | Home / service grid | ✅ done | all 11 service tiles, mobile+desktop grid |
| S04 | Service landing | ✅ done | hero, from-price, inclusions/exclusions, CTA; painting routes to quote flow (not built) |
| S05 | Booking · service details | ✅ done | tier-bedroom (radio), per-unit (counter), flat/visit (static); live price breakdown |
| S06 | Booking · slot picker | ✅ done | 14-day carousel + 9 hour slots; Dubai TZ enforced |
| S07 | Booking · address | ✅ done | saved-address picker + inline new-address form; 4 access methods; pets toggle |
| S08 | Booking · pay | ✅ done | cash / card chips; fake 300ms pay; VAT 5% + 5% service fee visible |
| S09 | Confirmation | ✅ done | ref + invoice no + total; actions to bookings list and home |
| S10 | Auth (phone + OTP) | ✅ done | +971/+966 country switch; fake OTP = 123456; cookie session |
| S15 | Bookings list | ✅ done | past/upcoming unified; status chips; empty state |
| S16 | Booking details | ✅ done | summary + price breakdown + invoice stub |

### Not yet built (deferred)

- S01 Splash / country select — defaults to AE for now
- S02 Location set — hardcoded to Dubai
- S11 Profile · S12 Addresses list · S13 Payment methods · S14 Credits — stubbed by header/menu links
- S17 Manage booking (reschedule/cancel) — needs real backend; skeleton to come in M1
- S18 Rate professional — M1 after bookings can be marked completed
- S19 Live chat — M3 (needs Supabase Realtime)
- S20 Promotions · S21 Help · S22 Pro profile · S23 Settings · S24 Recurring · S25 Report issue — all M1/M3

### Known limitations (fake data layer)

- Store resets on server restart; cookies carry user_id so you can sign back in trivially
- OTP always `123456` (logged to server console)
- Payment always succeeds after 300ms; no 3DS, no real card tokenization
- Invoice PDF not generated — just a line in server console
- ERP push logged, not sent — no real retry/backoff
- No email, no push, no WhatsApp
- No admin console yet
- No RLS yet (no real DB)
- No i18n/RTL wired to UI yet — tokens and font stack ready, UI copy is EN only

### Smoke-test happy path

```
http://localhost:3000
→ click "Deep Cleaning — Apartment"
→ Book now
→ pick "2 Bedrooms"
→ Continue
→ pick tomorrow, 10:00
→ Continue
→ (redirect to /auth?next=…)
→ enter +971 501234567, Send code, enter 123456
→ Add new address, fill fields, Save & continue
→ Pick "Credit or debit card", Pay now
→ Confirmation shows ref + invoice number
→ /bookings shows it with "Confirmed" chip
→ /bookings/[id] shows full detail + price breakdown + invoice stub
```

Expected server-log lines on happy path:
```
[fake-otp] AE 501234567 → code=123456 session=...
[fake-email] invoice AYD-2026-000001 → 501234567 (card)
[fake-erp-outbox] push booking ABCDEF → Reonxt (idem=...)
```

### Harder than expected

- **Cookie-driven draft state across the stepper** — simple to code but fragile for M0. Will be replaced in M1 with a real `bookings.draft` row keyed by user_id.
- **Server-action signatures with `payBookingAction`** — needed the slug but the referrer isn't accessible in app-router server actions. Took one iteration to pass slug as a parameter from the client. Future actions take ids/slugs explicitly, never read referrer.
- **Deep Cleaning / Pest tier prices** — JL doesn't publish these on the public web. Seeded with reasonable UAE market placeholders (studio AED 329 → 4BR 849, villa 3BR 899 → 6BR+ 1499). Admin edits via the admin console in M2 — these numbers should not be shown to the ERP team as "the final price list."

### Next

1. `pnpm install && pnpm dev` to see it work (user action)
2. `/replica-test` once we have real data layer, OR
3. `/replica-backend` to swap in Supabase + real Stripe + real Resend + real Twilio
