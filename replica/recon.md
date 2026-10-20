# Recon Map — Justlife (clean-room clone)

- **Target app:** Justlife — Home Services (JUSTMOP.COM DMCC)
- **App Store:** https://apps.apple.com/ae/app/justlife-home-services/id1107705982
- **Web:** https://www.justlife.com/en-AE
- **Version observed:** iOS 7.51.1 (2026-10)
- **Rating:** 4.6 ★ · ~46k ratings · 4.78 avg service rating
- **Markets:** UAE (Dubai, Abu Dhabi, Sharjah, Ajman) + KSA (Riyadh, Jeddah)
- **Languages:** English, Arabic (RTL)

> Clean-room recon from public sources only. No partner-portal data, no decompiled binary, no scraped bundles. The user's Ayaad partner account is explicitly OUT as a source — its JL partner T&Cs forbid competitive use.

---

## 1. Scope

| | |
|---|---|
| **Platform** | iOS + Android + responsive web (same backend) |
| **Slice** | Core booking loop for **Home Cleaning** (hero vertical). Other verticals (healthcare, beauty, maintenance) reuse the same shape — flagged `should` / `could` in matrix. |
| **For** | A UAE cleaning operator (Ayaad) productizing its own direct-to-consumer app, independent of JL. |
| **Hard excludes** | Provider-side partner portal; DHA-regulated healthcare; actual professional sourcing/vetting (ops concern, not product); Tabby partnership. |

### 1a. Service catalog (locked — tight list, not JL's 60+)

Admin can toggle on/off, but these are the only services the clone ships with:

| # | Service | Pricing model | Dimensions | Notes |
|---|---|---|---|---|
| 1 | **AC Basic Cleaning** | per_unit | # of AC units × unit price | Inclusions + exclusions shown pre-booking |
| 2 | **Duct Cleaning** | flat | per home | — |
| 3 | **Duct & Coil Deep Cleaning** | flat | per home | — |
| 4 | **Deep Cleaning — Apartment** | tier_bedroom | Studio / 1BR / 2BR / 3BR / 4BR | Flat price per tier |
| 5 | **Deep Cleaning — Villa** | tier_bedroom | 3BR / 4BR / 5BR / 6BR+ | Flat price per tier |
| 6 | **Furniture Cleaning** | per_unit | per piece × seat-type (1-seater / 2-seater / 3-seater / L-shape / mattress / carpet) | — |
| 7 | **General Pest Control — Apartment** | tier_bedroom | Studio / 1BR / 2BR / 3BR / 4BR | One method; no roach/termite/bedbug fork |
| 8 | **General Pest Control — Villa** | tier_bedroom | 3BR / 4BR / 5BR / 6BR+ | — |
| 9 | **Handyman** | per_visit | call-out fee + optional hourly extension | — |
| 10 | **Painting** | quote | admin reviews → issues quote → customer accepts | Site visit may be required |
| 11 | **Water Tank Cleaning** | flat | per tank | Capacity note shown but single price |

**Seed prices:** Use Justlife's publicly observable prices wherever known; placeholder `AED TBD` otherwise. Admin edits on day 1 via admin console. No made-up numbers in code.

Every service has: `inclusions[]`, `exclusions[]`, `duration_estimate`, `images[]`, `faq[]`, `cancellation_window_hours`. Shown on the service page before customer enters the stepper.

**Pricing models (five total):**
- `per_unit` — AC Basic, Furniture
- `tier_bedroom` — Deep Cleaning (A/V split), Pest Control (A/V split)
- `flat` — Duct, Duct+Coil, Water Tank
- `per_visit` — Handyman (base + optional hourly extension)
- `quote` — Painting (manual quote flow; no price in stepper)

(The `hourly` model is kept in the enum for future use — Handyman extension uses it internally — but no catalog service exposes it to the customer.)

### 1b. Clone owns vs Reonxt ERP owns

The clone is a **standalone customer-facing app**. Reonxt is a thin downstream consumer.

| Concern | Owner | Notes |
|---|---|---|
| Customer account (phone/OTP, profile, addresses) | **Clone** | Single source of truth |
| Services catalog + prices + Fri surcharge + materials fee | **Clone** | Seeded with JL's public rates; admin-editable |
| **Admin console** (pricing config, services on/off, promo codes, user support) | **Clone** | New feature set — not in JL |
| Booking lifecycle (draft → paid → dispatched → completed → rated) | **Clone** | ERP receives a mirror |
| Payment gateway + Credits wallet | **Clone** | — |
| **Invoice generation (PDF + email + in-app view)** | **Clone** | Required on every successful payment |
| Pro-matching, dispatch, team scheduling | **Reonxt** | Not shown to customer |
| Inventory / stock consumption | **Reonxt** | Not shown to customer |
| Ops-side finance (COA, journals, VAT returns) | **Reonxt** | Clone's invoice is a customer-facing receipt; ERP mirrors to proper accounting |

### 1c. Integration contract — clone → Reonxt (one-way push)

- **Primary direction:** clone sends every paid booking to Reonxt as a work order
- **Transport:** HTTPS POST to a Reonxt webhook endpoint (to be defined with their team), auth via API key, idempotency key = booking ref
- **Payload:** customer name/phone, address + geo, service type, hours, pro count, materials flag, scheduled start, total paid, invoice no.
- **Secondary direction (optional):** Reonxt webhook back to clone when dispatcher assigns a pro, pro departs, pro arrives, service completed — drives the push/WA notifications in F02. If Reonxt can't do this in phase 1, clone falls back to polling or operator-triggered status updates via admin console.

Core loop (the one flow the business depends on):
```
pick service → choose hours + pros + materials → pick slot → address + access
→ pay (cash / card / Tabby / credits) → matched → service → rate → rebook
```

---

## 2. Sources

| Source | URL | Value |
|---|---|---|
| App Store listing | https://apps.apple.com/ae/app/justlife-home-services/id1107705982 | Positioning, 10M+ bookings claim, 30+ services, screenshot shape |
| Public homepage (UAE) | https://www.justlife.com/en-AE | Service grid, hero promise, trust stats |
| Service hub | https://www.justlife.com/en-AE/home-cleaning | Hero vertical landing shape |
| FAQ (highest-signal source) | https://www.justlife.com/en-AE/faq | **The real feature list — payment rules, cancellation windows, credits, matching, materials, recurring** |
| Footer sitemap | footer of homepage | 60+ service verticals |
| Help Center (Live Chat only) | in-app widget | Live Chat 7 AM – 11 PM Dubai |
| Public walkthrough videos | YouTube search `"justlife booking"` (watch, don't record) | Click-by-click of real flow |

Not consulted (ruled out by clean-room):
- App binary / JS bundle / network traces
- Partner portal of justmop.com
- Any logged-in account under T&Cs that forbids competitive use

---

## 3. Screen inventory

Mobile-first. Web shares most IDs.

| ID | Screen | Route / entry | Purpose | Key components | States |
|---|---|---|---|---|---|
| S01 | Splash + country select | app launch | Pick UAE / KSA | Country picker, language toggle | fresh, remembered |
| S02 | Location set | after S01 or any booking entry | Resolve geo for service availability | Map pin, locate-me, address search | empty, GPS denied, out-of-coverage |
| S03 | Home / service grid | `/` | Discover service verticals | 10 service tiles, search, promo banner | logged-out, logged-in, promo-active |
| S04 | Service landing | `/home-cleaning` etc. | Vertical pitch + Book Now | Hero, trust, FAQ accordion, CTA | - |
| S05 | Booking · Service details | step 1 of stepper | Hours, # of pros, materials, instructions | Hour counter, pro-count radio, materials toggle, special-instructions textarea | invalid, min-hours, materials-on |
| S06 | Booking · Date & time | step 2 | Pick slot | Date carousel (today → +30d), time-slot grid | sold-out, Fri surcharge, same-day |
| S07 | Booking · Address & access | step 3 | Where + how to get in | Saved address list, access-method radio (I'm home / key with security / under mat / unlocked door), pets toggle | no addresses, add new |
| S08 | Booking · Payment | step 4 | Pay + voucher | Payment chips (Cash / Card / Tabby / Credits), card list, voucher input, price breakdown | voucher valid/invalid, insufficient credits |
| S09 | Confirmation | after S08 | Order confirmed | Booking ref, ETA, "add to Apple Wallet" | pending, confirmed, matched |
| S10 | Auth · Phone + OTP | inline before S08 | First-time users | +971/+966 phone input, OTP 6-digit | OTP sent, resend, failed, blocked |
| S11 | Profile | menu → Profile | Edit personal details | Name, email, phone, DOB (optional) | - |
| S12 | Addresses | menu → Addresses | Manage address book | List, add, edit, set default | empty, max-10 |
| S13 | Payment methods | menu → Payment | Cards + Tabby + Credits link | List, add card (hosted gateway iframe), delete | empty, 3DS challenge |
| S14 | Credits wallet | menu → Credits | Balance + top-up | Balance, package tiles ("+30% bonus"), txn history | zero balance, expiring soon |
| S15 | Bookings list | bottom nav → Bookings | Upcoming / past | Tab (Upcoming/Past), booking cards with status badge | empty, loading |
| S16 | Booking details | tap on S15 card | Full booking view | Service summary, pro card, map, price breakdown, actions | pre-service, in-progress, completed, cancelled |
| S17 | Manage booking | from S16 | Reschedule / cancel / edit | Reschedule flow (→ S06), cancel confirm sheet, edit address, add instructions, request specific pro | fee-shown, inside-cancel-window, outside |
| S18 | Rate professional | push notif after completion | Collect feedback | 5-star rating, chips (polite/thorough/on-time), free-text, tip amount | skip, submitted |
| S19 | Live chat | menu → Help | Realtime support | Chat thread, quick-reply chips, attach photo | 7 AM–11 PM online, off-hours banner |
| S20 | Promotions | menu → Offers | Discover active promos | Promo cards, deep-link to prefilled booking | empty |
| S21 | FAQ / Help center | menu → Help → FAQ | Self-serve answers | Accordion by topic | - |
| S22 | Professional profile | tap pro name in S16 | View pro's rating/history | Avatar, name, rating, bookings count, reviews | - |
| S23 | Settings | menu → Settings | Lang, notifs, logout | Toggles, lang EN/AR, logout confirm | - |
| S24 | Recurring booking setup | end of S05 (if weekly/bi-weekly chosen) | Lock a recurring schedule | Frequency radio, specific-pro toggle, lifetime discount banner | - |
| S25 | Report issue | from S16 (within 24h) | File quality / damage / missing-item report | Issue type, photos, description | sent, under-review, resolved |

**Total: 25 primary screens.** Each has 2–5 states → ~90 state renders.

---

## 4. User flows

| ID | Flow | Path | Edges |
|---|---|---|---|
| **F01** | **First-time user books home cleaning (core loop)** | S03 → S04 → S05 → S06 → S07 → S10 (auth gate) → S08 → S09 | Clicks on happy path: **~9 taps** (beat it) · OTP timeout · payment 3DS · slot taken mid-flow · address outside coverage |
| F02 | Returning user books (fast path) | S03 → S05 → S06 → S07 (saved) → S08 (saved card) → S09 | **~6 taps** |
| F03 | Reschedule a booking | S15 → S16 → S17 → S06 → confirm | Inside 2h window = fee; same-day not guaranteed |
| F04 | Cancel a booking | S15 → S16 → S17 → cancel sheet | <7-day = void auth (1–5d); >7-day = bank refund (7–14d) or Credits (immediate, 60d expiry) |
| F05 | Rate completed session | push → S18 | Skip, submit, optional tip |
| F06 | Buy / use Justlife Credits | S14 → pick package → S13 pay → wallet credited | Credits auto-apply at S08 if balance sufficient |
| F07 | Apply voucher | S08 voucher field → apply → price updates | Invalid, expired, min-spend not met |
| F08 | Report quality issue (within 24h) | S16 → S25 → upload photos → submit | Case specialist responds <24h |
| F09 | Request specific cleaner (recurring) | S05 → "my cleaners" picker → book | Pro unavailable → suggest same-rated alt |
| F10 | Switch language EN ↔ AR | S23 → toggle → RTL swap | Live reflow, saved per profile |
| F11 | Switch city UAE ↔ KSA | S01 or S23 → country picker | Resets cart, keeps account |
| F12 | Set up recurring booking | S05 → freq weekly/bi-weekly → S24 → stepper | Lifetime discount banner |

Happy-path tap counts: **F01 = 9, F02 = 6**. These are the numbers the clone has to beat.

---

## 5. Components

| Component | Variants | States | Used in |
|---|---|---|---|
| Service tile card | hero / grid / promo | default, hover, loading | S03 |
| Stepper bar | 4-step with current/done/upcoming | - | S05–S08 |
| Hour counter | ± with min 2, max 12 | min, max, invalid | S05 |
| Pro-count radio | 1 / 2 / 3 / 4 pros | selected, hover | S05 |
| Materials toggle | on/off with price delta | on, off | S05 |
| Date carousel | horizontal scroll, today +30 | selected, sold-out, Fri | S06, F03 |
| Time slot grid | 30-min slots | available, taken, surcharge | S06 |
| Address card | saved address with default badge | selected, default, edit | S07, S12 |
| Access-method radio | 4 options | - | S07 |
| Payment chip | Cash / Card / Tabby / Credits | selected, disabled, insufficient | S08 |
| Voucher input | text + Apply button | pending, applied, invalid | S08 |
| Price breakdown | subtotal, materials, Fri, voucher, service fee, total | - | S08 |
| OTP input | 6-digit boxes with auto-advance | sending, sent, failed, blocked | S10 |
| Rating stars | tap-to-rate 1–5 | selected, submitted | S18, S22 |
| Chat bubble | user / support / system | sending, sent, failed, off-hours | S19 |
| Booking card | with status badge | pending, matched, in-progress, completed, cancelled | S15, S16 |
| Bottom nav | 4 tabs (Home, Bookings, Credits, Menu) | active, badge | all authed |
| Promo banner | dismissible, deep-link | shown, dismissed | S03 |
| Country/language toggle | pill | - | S01, S23 |

---

## 6. Inferred data model

```
User                id, phone, email?, name, locale (en|ar), country (ae|sa), created_at
                    evidence: S10 (phone+OTP), S11 fields, S23 lang
                    confidence: high

Address             id, user_id, label, line1, line2?, city, emirate, lat, lng, access_method (home|security_key|under_mat|unlocked), notes
                    evidence: S07, S12
                    confidence: high

PaymentMethod       id, user_id, type (card|tabby), brand, last4, exp, default
                    evidence: S13
                    confidence: high

Service             id, slug, name_en, name_ar, category (ac|deep|lite|furniture|pest|handyman|painting|water_tank|duct),
                    pricing_model (per_unit|tier_bedroom|flat|hourly|per_visit|quote),
                    base_price, currency, duration_estimate_min,
                    inclusions[], exclusions[], images[], faq[],
                    active, sort_order, cancellation_window_hours
                    evidence: locked service catalog (1a)
                    confidence: high

ServicePricingTier  id, service_id, tier_key (studio|1br|2br|3br|4br|5br|6br_plus|per_ac_unit|per_sofa_1|per_sofa_2|per_sofa_3|per_lshape|per_mattress|per_carpet),
                    label_en, label_ar, price, active, sort_order
                    evidence: AC per-unit, Deep A/V tiers, Pest A/V tiers, Furniture per-piece
                    confidence: high

Quote               id, user_id, service_id (painting), address_id, scope_notes, photos[],
                    admin_quoted_price?, status (requested|quoted|accepted|declined|expired),
                    quoted_by, quoted_at, expires_at
                    evidence: Painting pricing_model = quote
                    confidence: high

Professional        id, display_name, country, nationality, rating_avg, bookings_count, specialties[], photo_url, status (active|offline|on_leave)
                    evidence: FAQ "specific cleaner", S22, review complaints about reassignment
                    confidence: medium (status enum guessed)

Booking             id, user_id, service_id, address_id, start_at, hours, pro_count, materials, friday_surcharge, notes, status (draft|pending|matched|in_progress|completed|cancelled|no_show), total_amount, currency (AED|SAR), payment_method_id, voucher_code?, credits_used
                    evidence: S05–S09, FAQ pricing, S15 statuses
                    confidence: high

BookingAssignment   id, booking_id, pro_id, assigned_at, confirmed_at, started_at, ended_at
                    evidence: FAQ matching, 90% weekly stickiness, S16 pro card
                    confidence: high

RecurringSchedule   id, user_id, service_id, address_id, frequency (weekly|biweekly), preferred_pro_id?, next_booking_id?, active
                    evidence: FAQ, S24
                    confidence: high

CreditWallet        id, user_id, balance (AED), updated_at
                    evidence: S14, FAQ Credits section
                    confidence: high

CreditTxn           id, wallet_id, delta (+ for topup / refund, – for use), reason, booking_id?, expires_at (60d)
                    evidence: FAQ "credits valid 60 days"
                    confidence: high

Voucher             id, code, type (percent|flat|first-booking), value, min_spend, max_discount, starts_at, ends_at, usage_limit, used_count
                    evidence: FAQ voucher section, S08
                    confidence: medium

Rating              id, booking_id, pro_id, stars (1–5), comment?, tip_amount?, created_at
                    evidence: S18, FAQ rating section
                    confidence: high

IssueReport         id, booking_id, type (late|no_show|quality|damage|missing), description, photos[], status (open|under_review|resolved|rejected), created_at
                    evidence: FAQ quality section, S25
                    confidence: medium

SupportThread       id, user_id, booking_id?, status (open|closed), messages[]
                    evidence: Live Chat FAQ
                    confidence: medium
```

Key relationships: `User 1-* Address, Booking, PaymentMethod` · `Booking 1-1 BookingAssignment` (reassignable) · `User 1-1 CreditWallet 1-* CreditTxn` · `Booking 0-1 Rating`.

---

## 7. Feature matrix

Written separately to `replica/features.csv` (feature, area, priority, original, clone, notes).

---

## 8. What cannot be cloned (skip)

| Item | Reason |
|---|---|
| The brand name "Justlife" / logo / palette | Trademark + copyright. `/replica-brand` rebrands. |
| 4.78★ rating / "10M+ bookings" claim | Not yours to borrow. Use honest numbers. |
| Trained Justlife-Excellence-Center pro pool | Human asset. Build your own, or use Ayaad's existing. |
| Healthcare vertical (Doctor on Call, PCR, IV, physio) | DHA / MOH licensing. Years of regulatory work. **Hard skip.** |
| Pest control licensing | Dubai Municipality permit required. Skip in MVP. |
| Tabby BNPL partnership | Commercial contract. Launch with Cash + Card only; add later. |
| Insurance badge | Partnership. Don't claim insurance you don't have. |
| Dubai Economy's "e-trader" / permits for home-service aggregation | Must apply in your own name. |

---

## 9. Size

| Dimension | Count | Notes |
|---|---|---|
| Primary screens | 25 | mobile + web share |
| State renders | ~90 | includes empty/error/loading |
| User flows | 12 | F01 is critical path |
| Entities | 14 | all moderate complexity |
| Hard parts | 5 | listed below |

**Hard parts:**
1. **Pro matching & recurring stickiness** — 90% of their revenue is weekly-recurring with the same cleaner. The matcher is the moat.
2. **Payment orchestration** — auth-at-booking → capture-after-session for <7-day bookings; immediate capture for >7-day; Credits wallet with 60-day expiry; voucher stacking rules.
3. **Realtime support chat** — 7 AM–11 PM Dubai window with pre-emptive late-arrival notifications ("WhatsApp when cleaner arrives").
4. **Multi-vertical schema** — one Booking entity that doesn't collapse to lowest common denominator when adding beauty/maintenance.
5. **Fri + per-city pricing bands** — AED 34–55/hr varies by location; +AED 5/hr Fri; +AED 10/hr materials per pro. Pricing engine is non-trivial.

**Size: M → L.**
- MVP (home cleaning only, cash + card, no credits, no live chat, Dubai only): **~6 weeks**
- Feature-parity on cleaning vertical (credits, vouchers, recurring, chat, 4 UAE cities): **~1 quarter**
- Full multi-vertical super-app parity: **~2 quarters** (and skip healthcare entirely).

---

## Summary (five-line)

1. **Core loop:** pick service → stepper (hours/pros/materials, slot, address, pay) → confirmation → rate.
2. **25 screens / 12 flows / 14 entities / ~90 state renders.**
3. **Three hardest parts:** recurring pro-matching, payment orchestration (auth/capture + credits + vouchers), multi-vertical pricing engine.
4. **Out of scope:** JL brand/pool/ratings, DHA-regulated healthcare, Tabby partnership, pest-control permits, insurance claim.
5. **Next:** `/replica-architect` reads this file + `features.csv` and picks the stack.
