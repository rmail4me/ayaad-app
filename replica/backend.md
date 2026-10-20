# Backend — Ayaad

Dropped the fake data layer. Everything now hits real services:
- **Postgres** (Supabase) via Drizzle ORM
- **Twilio Verify** for phone OTP (dev mode bypasses with code 123456)
- **Stripe Checkout** for card payments (test mode)
- **Resend** for transactional email + PDF invoice attachment
- **@react-pdf/renderer** for the VAT-compliant PDF
- **ERP outbox** table ready; actual push to Reonxt deferred until their API is defined

## Services the user must provision

The build skill forbids me from signing up. Each row below has: what to create, where, which env vars to populate.

| Service | What to create | Where | `.env.local` keys |
|---|---|---|---|
| **Supabase** | New project (free tier) in `eu-central-1` | https://supabase.com | `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Stripe** | Account, keep **test mode** on, enable AED currency, grab test keys | https://stripe.com | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Stripe CLI | `stripe listen --forward-to localhost:3000/api/webhooks/stripe` → copies a `whsec_...` for dev | https://stripe.com/docs/stripe-cli | `STRIPE_WEBHOOK_SECRET` |
| **Twilio** | Account + a Verify Service (Console → Verify → Services) | https://twilio.com | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` — can skip for dev with `AUTH_MODE=dev` |
| **Resend** | Account + verify `ayaad.ae` domain (SPF/DKIM already set per `reference_ayaad_email_deliverability`) | https://resend.com | `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_REPLY_TO` |
| **Reonxt** (ERP) | API endpoint + key (co-design still pending) | internal | `REONXT_API_URL`, `REONXT_API_KEY`, keep `REONXT_PUSH_ENABLED=false` until contract agreed |

All appear in `app/.env.example` with sample shapes.

## First-time setup

```bash
cd app
pnpm install
cp .env.example .env.local
# fill in DATABASE_URL first
pnpm db:migrate                     # applies drizzle/0001_init.sql (full schema + seed)
# fill in STRIPE_SECRET_KEY + NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, grab whsec via:
pnpm stripe:listen                  # in a second terminal; copy whsec_... to .env.local
pnpm dev                            # http://localhost:3000
```

Dev smoke test (no Twilio or Resend account needed):
1. Keep `AUTH_MODE=dev` — OTP accepts `123456`
2. Omit `RESEND_API_KEY` — invoice email will no-op (just log)
3. Full happy path works end-to-end: OTP → book → Stripe Checkout (test card `4242 4242 4242 4242`) → webhook marks paid → invoice issued, PDF created, email send attempted

Prod turn-on (replica-deploy):
- Set `AUTH_MODE=prod` and all Twilio vars
- Set `RESEND_API_KEY` and verify domain in Resend
- Switch Stripe to live keys
- Create Stripe webhook endpoint pointing at `https://<prod-domain>/api/webhooks/stripe`, paste its signing secret
- Fill `REONXT_*` once their endpoint exists, flip `REONXT_PUSH_ENABLED=true`

## Database

- **Migrations:** `drizzle/0001_init.sql` is the full canonical schema from `replica/schema.sql`, including RLS. `pnpm db:migrate` applies in order and records in `__ayaad_migrations`.
- **Seed:** two legal entities (Ayaad DMCC + Ayaade Musaeida LLC with placeholder TRNs — swap in real TRNs via admin or env) and 11 services with tier rows (prices placeholder, admin edits in M2).
- **Access rules (RLS):** every user-owned table has `user_id = auth.uid()` policies. Service role bypasses RLS (used by server actions, webhooks, admin console).
- **Test it:** second-user visibility test is a TODO for `/replica-test`. The policies are declared; needs integration-level verification before launch.
- **Backups:** Supabase runs daily automatic backups on all tiers. Point-in-time recovery is Pro-plan.

## Auth

- Phone + OTP via Twilio Verify
- Dev mode (`AUTH_MODE=dev`) short-circuits to code `123456`, zero Twilio spend
- Cookie session: `ayaad_uid` http-only, lax, 30 days, secure in production
- No roles yet on the customer side (user owns their records); admin has its own `admin_users` table and TOTP (deferred to M2)
- Account deletion: scaffolded in schema (`users.deleted_at`) but no `/me/delete` route yet — Apple will demand this before App Store review, add in M3
- `/me` route is a stub; profile edit comes in M1

## Payments

- **Stripe Checkout** (hosted) — zero card UI shipped by us; 3DS2 handled by Stripe
- Customer entity is Stripe's — we store `payment_intent_id` on the booking after Checkout returns
- Webhook `/api/webhooks/stripe` verifies signature, dedupes by `event.id` via `erp_inbox` table
- Handlers: `checkout.session.completed` → mark paid, issue invoice, email PDF; `.expired` / `.async_payment_failed` → mark expired; `charge.refunded` → noop (admin flow M2)
- Cash: single-tap confirm, immediate `paid` status; invoice issued and emailed inline
- **No subscriptions yet** (JL has none in-scope either)
- **Refunds via admin UI** — M2; `credit_notes` table ready

## Email

- Transactional via Resend from `noreply@ayaad.ae` (domain already SPF/DKIM/DMARC verified per existing memory)
- Templates written fresh in this repo (`sendInvoiceEmailNow` in `data.ts`) — nothing borrowed from Justlife
- PDF generated via `@react-pdf/renderer` and attached + a link to the hosted booking page
- `notifications_outbox` table collects fan-out notifications for M3 (Inngest will drain)

## Jobs

- M1: synchronous — invoice PDF + email happen inside the Stripe webhook handler
- M3 (Inngest): `invoice.email`, `erp.push`, `notifications.send`, `reminders.booking_24h`, `reminders.rate_prompt`, `issues.escalate_24h`
- All times stored UTC, rendered in Asia/Dubai

## Integrations

Only one external integration planned beyond payment / SMS / email: **Reonxt ERP**.
- Direction: clone → Reonxt one-way push on `booking.paid`, `booking.rescheduled`, `booking.cancelled`
- Transport: HTTPS POST, API-key auth, booking id as idempotency key
- Retry/backoff + DLQ via Inngest (M3) — table (`erp_outbox`) and admin replay UI (M2) ready to receive
- **Nothing is pushed yet** — `REONXT_PUSH_ENABLED=false` is the default; rows accumulate in `erp_outbox` for the ops team to inspect when Reonxt's endpoint is defined
- Co-design meeting with Reonxt needed to pin payload shape → that spec lives in the eventual handover doc (`/replica-deploy`)

## Security checklist

- [x] Secrets only in env vars, `.env*` in `.gitignore`, nothing in client bundles (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `TWILIO_AUTH_TOKEN` all server-only)
- [x] Input validation on server (currently via TS types + narrow server-action signatures; add zod schemas on every public route in M2)
- [x] Authorization: every table has RLS; service role used only in server actions and webhooks
- [ ] Second-user cross-tenant test — do in `/replica-test`
- [ ] Rate limits on `sendOtpAction` + `payBookingAction` — add in M2 (Vercel `@vercel/kv` + sliding window, or Upstash)
- [x] Webhook signature verification (Stripe)
- [ ] Upload size/type limits — no uploads shipped in M1; add when `issue_reports` photo flow lands
- [x] No PII in URLs or logs (only booking.id, which is a UUID)
- [ ] `npm audit` — run after `pnpm install` and before every deploy; add to CI in M2
- [ ] Privacy policy page listing processors (Supabase, Stripe, Twilio, Resend, Vercel) — M2 before launch

## Known limitations shipped with M1

- Admin console not built — pricing edits via DB only for now
- Reschedule / cancel not wired (schema ready; UI in M1 next pass)
- Rate limiting is TODO
- Email template is minimal plain HTML (no React Email yet)
- `isDev` Twilio bypass means production **must** set `AUTH_MODE=prod` or anyone with a phone number can log in as that number using code `123456`. There is a guard at startup logging a warning; add a prod assertion in M2.

## Next

- `/replica-test` — Playwright coverage of F01 (new user, card) and F02 (returning user, cash), plus RLS cross-tenant check
- Then M1 completion (reschedule / cancel / rate / recurring / i18n RTL)
- Then M2 (admin console, Reonxt handover draft)
