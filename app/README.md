# Ayaad — customer-facing DTC home-services app

M0 vertical slice (Milestone 0 per `../replica/architecture.md`).

## Status

Fake data layer in `src/lib/data.ts` — swap in Supabase + Drizzle later, screen code does not change.

Stack: Next.js 15 (App Router) · React 19 · Tailwind · Tokens from `/replica/design/`.
Payment, OTP, invoice email are all simulated locally (returns success after a brief await).

## Run

```bash
cd app
pnpm install   # or npm/yarn
pnpm dev       # http://localhost:3000
```

## Routes covered in M0

| Screen | Route |
|---|---|
| S03 Home / service grid | `/` |
| S04 Service landing | `/services/[slug]` |
| S05 Book — service details | `/book/[slug]/service` |
| S06 Book — pick slot | `/book/[slug]/slot` |
| S07 Book — address | `/book/[slug]/address` |
| S08 Book — pay | `/book/[slug]/pay` |
| S09 Confirmation | `/book/[slug]/confirmation/[id]` |
| S10 Auth (OTP) | `/auth` |
| S15 Bookings list | `/bookings` |
| S16 Booking details | `/bookings/[id]` |

## Vertical slice happy path

Fresh browser → `/` → pick "Deep Cleaning — Apartment" → 2BR → tomorrow 10am → add address → pay (fake card) → confirmation + invoice "email" logged → `/bookings` shows it.
