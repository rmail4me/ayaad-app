# Ayaad DTC App — Internal Review Pack

For: Ayaad internal team (ops, finance, admin)
From: Riswan Kizhakkayil
Date: 2026-10-20
Status: M1 pilot — live but not advertised yet

**Try it:** https://ayaad-app.vercel.app

---

## In one minute

A corporate-only booking app for Ayaad services. Customers (dubbed "corporate contacts") sign in with their work email, then book from our 7-service catalog. Payment is pulled from the company's **prepaid balance**; card is a fallback if the balance runs out.

Everything after "booking confirmed" (dispatch, teams, inventory, finance) continues to live in Reonxt as it does today — this app is purely the **sales + customer experience** layer.

---

## How to test it (5 minutes)

### A. Sign in

1. Open **https://ayaad-app.vercel.app** on your laptop or phone (works both)
2. Click **Sign in**
3. Enter your work email
4. Check inbox — a sign-in link lands within 30 sec (sender for now is `onboarding@resend.dev` — this will change to `noreply@ayaad.ae` once the domain's DNS propagates)
5. Click the link → you're in

### B. Book a service

1. Pick any service — Deep Cleaning is a good test
2. Pick a tier (e.g., Furnished apartment deep clean intense — AED 419)
3. Pick tomorrow 10:00 Dubai
4. Add a dummy address
5. On the pay step — you'll see:
   - **Billing to Ayaad Demo Corp · TRN 100-DEMO-TRN** (we'll switch to real TRNs for launch)
   - **Company prepaid balance: AED <current>**
   - **Confirm booking** button
6. Click **Confirm booking** → you'll see confirmation + invoice number
7. Click **Account** → balance has dropped by the service price
8. Click **Bookings** → your booking shows with "Confirmed" status

### C. Verify the invoice

- Invoice number format: `AYD-YYYY-NNNNNN` (e.g., `AYD-2026-000003`)
- VAT 5% is back-calculated and shown as "Taxable amount + VAT + Total" (UAE FTA compliant)
- Legal entity: Ayaad Musaeida Cleaning Services DMCC (we'll add Ayaade Musaeida LLC as a second legal entity option before launch)

### D. Try the card path (optional)

If the demo prepaid balance is low, you'll see "Pay by card" become the default. Pick it → redirects to Stripe test checkout. Use test card:
- Number: `4242 4242 4242 4242`
- Expiry: any future
- CVC: any 3 digits

That's a successful card charge in test mode. Real card won't be charged. You'll be redirected back to the booking with status "Confirmed".

---

## What's in the catalog

| Service | Pricing style | Tier count |
|---|---|---:|
| AC Cleaning | per AC unit | 6 variants (basic / split / window / deep filter+duct / deep filter+coil / full system) |
| Furniture Cleaning | per piece | 10 (sofas 1-7 seater, recliner, carpet, mattress) |
| Deep Cleaning | property type | 8 (apt vs villa × furnished vs unfurnished × lite/intense/move-in-out) |
| Water Tank Cleaning | tank size | 2 (up to 1,000 gal / up to 2,000 gal) |
| Pest Control | property size | 8 (studio → 6BR apt + flies villa) |
| Painting (White / Off White) | property size | 9 (studio / 1-4 BHK apt / 2-5 BR villa) |
| Handyman | per hour | 1 (AED 130/hr) |

**Total 44 tier prices.** All matched to Justlife where JL offers that variant (37 of 44); Keyper used for 7 variants JL doesn't offer. Prices are VAT-inclusive. **No service fee** — the price shown is the price paid.

---

## What works today

- ✅ 11 of the 25 planned screens (sign-in, home, service detail, 4-step booking stepper, confirmation, bookings list, booking detail, account/balance)
- ✅ Email magic-link sign-in
- ✅ Company-linked users with 5 roles (owner / admin / booker / approver / viewer — only "owner" wired for now)
- ✅ Prepaid balance debit on booking paid
- ✅ Stripe test-mode card payment (as fallback when balance insufficient)
- ✅ Self-service top-up via Stripe
- ✅ VAT-compliant invoice PDF generation + email attachment
- ✅ Monotonic invoice numbering per legal entity per year
- ✅ ERP outbox collecting events for Reonxt (see `handover_erp_integration.md`)

## What's NOT yet built (M2 / M3)

- ❌ Reschedule / cancel buttons (schema exists; UI buttons missing)
- ❌ Rate the pro + tip flow
- ❌ Live chat / support
- ❌ Admin console (currently price edits + user/company CRUD = raw SQL)
- ❌ Approval routing (we have the status `pending_approval` but no routing logic)
- ❌ Multi-company switch (one user = one company)
- ❌ Per-company rate card overrides (schema has `rate_card_json`; code doesn't read it yet)
- ❌ Arabic UI + RTL mirror (tokens and font stack ready; copy still English only)
- ❌ Reonxt webhook push (contract pending co-design with Reonxt team)
- ❌ Reschedule / cancel refund logic
- ❌ Automated test coverage

---

## Open questions for the internal team

Please comment on these before launch planning:

1. **Legal entity on invoices** — do you want Ayaad DMCC or Ayaade Musaeida LLC to be the default biller? Should different services bill different entities?
2. **Prepaid balance expiry** — should prepaid balance expire (e.g., 12 months of inactivity), or carry forward indefinitely? JL has 60-day expiry; we currently have no expiry.
3. **Top-up minimums** — current is AED 100 min, AED 1,000,000 max. Any changes?
4. **Approval routing** — do any customers want a "booker places → approver confirms → payment debits" flow, or is single-step booking fine?
5. **Who can top up** — currently any user linked to a company can top up (and the top-up charge appears on that user's card). Should only "owner" / "admin" roles be allowed?
6. **Service availability by city** — right now all services available in Dubai; do we want to gate specific services to specific emirates for launch?
7. **Pricing — any lines wrong?** The 44 tier prices in the catalog use Justlife-matched rates. Please skim and flag anything that undercuts our cost.
8. **Service inclusions / exclusions text** — the short lists on each service page were written by me. Who's the right person to review and tighten the wording?
9. **Point of contact for support** — who should be the Resend sender name / `support@ayaad.ae` responder? Right now the sender is "Ayaad Sandbox" — not customer-facing yet.
10. **TRNs on invoice** — the demo invoice shows `100-DEMO-TRN`. Who provides the real TRN to swap in for Ayaad DMCC and Ayaade Musaeida LLC?

---

## Known limitations that will affect first-week ops

- **Admin tasks via SQL for now** — adding a new company, resetting a password, refunding a booking all require a developer to run a query. Admin console lands in M2.
- **Reonxt not integrated** — paid bookings land in our DB and sit in `erp_outbox`. Someone from ops will need to manually review and action each one until the Reonxt endpoint is live.
- **Email sender is Resend's sandbox** (`onboarding@resend.dev`) until the `ayaad.ae` DNS records propagate and Resend verifies the domain. Deliverability to Gmail/Outlook corporate inboxes may be degraded during this window — flag to any internal reviewer whose email bounces or spam-folders.
- **No scheduled sync with Reonxt** — until the webhook is wired, status chips in the customer app ("Team assigned", "In progress", "Completed") will stay at "Confirmed" forever. Not a bug — it's by design pending Reonxt integration.

---

## 2-week launch readiness checklist

Before we invite first paying corporate customer:

- [ ] Reonxt API contract agreed and endpoint deployed (unblocks `erp_outbox` push)
- [ ] Admin console shipped (M2) — pricing, companies, users, refunds editable without SQL
- [ ] Reschedule + cancel flows shipped
- [ ] Real TRNs loaded for both legal entities
- [ ] `ayaad.ae` Resend domain verified → magic-link + invoice emails send from `noreply@ayaad.ae`
- [ ] Service inclusions/exclusions text reviewed by ops
- [ ] First-use flow tested end-to-end by at least 2 internal reviewers from non-dev roles
- [ ] A real top-up tested with a real card (any small amount, test customer)
- [ ] Backup of Supabase DB scheduled (Supabase runs dailies by default — confirm)
- [ ] Privacy policy page added to app footer (lists Supabase, Stripe, Resend, Vercel as processors)
- [ ] Password reset / account deletion routes added (Apple App Store will demand this if we ship native)

---

## How to feed back

- Breaks / bugs: WhatsApp or email Riswan with the booking ref + screenshot
- Suggestions / wording changes: edit this doc inline and share back
- Pricing changes: send a corrected rate card; I'll update the DB
- Blocking issues (can't log in, can't pay, invoice wrong): same channel, mark "URGENT"

Thanks for the test.
