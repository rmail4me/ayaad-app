# Ayaad — Component Specs

One block per component in the recon. Build each in isolation (storybook or a `/design` route) before touching any screen. Every state the recon saw, plus accessibility defaults.

Icon set: **Lucide** (MIT). Never trace Justlife's icons.
Illustrations: original, commissioned or AI-generated for Ayaad. Hero photography = own shoots or licensed (Unsplash/stock with commercial clearance).

---

## Primitives

### Button
```
variants  primary, secondary, ghost, destructive, link
sizes     sm 32px, md 44px, lg 52px  (md = touch-target-min; default)
states    default, hover, active, focus-visible (shadow-focus), disabled, loading
tokens    primary:  bg accent, text on-accent, radius md
          secondary:bg surface, text text, border 1px border, radius md
          ghost:    bg transparent, text accent, hover bg accent-subtle
          destructive: bg danger, text on-danger
          link:     text accent, underline on hover
a11y      real <button>, visible focus ring, loading retains accessible label
                ("Save, loading" with aria-busy); min 44×44 tap target
rtl       icon mirrors with ltr/rtl aware class
used on   S03, S04, S05, S06, S07, S08, S10, S13, S14, S15, S16, S17, S18, S19, S20
```

### IconButton
```
sizes     sm 32×32, md 44×44, lg 48×48
variants  neutral, accent, danger, ghost
a11y      requires aria-label; focus-visible ring
used on   header, cards, chat composer, bottom nav
```

### Input (text/email/phone/number)
```
sizes     md 44, lg 52
states    default, hover, focus (ring accent), filled, invalid, disabled, readonly
tokens    bg bg, border border-input, text text, placeholder text-subtle
          invalid: border danger, help text danger
a11y      <label> always present or aria-label; aria-describedby for error/help;
          inputmode and autocomplete set per field (tel, email, postal-code, etc.)
rtl       dir="auto" by default; phone input always ltr (locked)
used on   S07, S08, S10, S11, S12, S13, S14, S20, admin
```

### OTP Input
```
cells     6 cells, auto-advance on digit, backspace moves back
states    sending, sent, failed (shake + border danger), blocked, resend-cooldown
a11y      single visually hidden <input type="tel" inputmode="numeric" maxlength="6">
          backs the six cell display; one tab stop
used on   S10
```

### Select (native + custom)
```
default   native <select> for simple lists (country, emirate)
custom    Radix Select for search-in-list (city, service, pro)
states    default, open, selected, disabled
a11y      keyboard navigation, aria-activedescendant on custom
used on   S07 (city), S23 (lang/country), admin
```

### Textarea
```
sizes     3 rows default, auto-grow to 8
states    default, focus, invalid, disabled, counter (if max set)
used on   S05 (instructions), S19 (chat), S25 (issue), S07 (access notes)
```

### Checkbox / Radio / Switch
```
sizes     default 20×20 tap area ≥44
states    unchecked, checked, indeterminate, focus, disabled
tokens    checked: bg accent, check on-accent; focus: shadow-focus
a11y      labeled; group has <fieldset><legend>; switch uses role=switch
used on   S05 (materials), S07 (pets, default address), S23 (notif toggles)
```

### Chip / Tag / Badge
```
variants  neutral, accent, accent-2 (yellow highlight), success, warning, danger
sizes     sm 24, md 28
states    static, selectable (behaves as toggle), dismissible (with × button)
tokens    neutral: bg surface-muted, text text
          accent:  bg accent-subtle, text accent
          accent-2:bg accent-2, text on-accent-2 (yellow pill for promo flags)
          success: bg success-subtle, text success
used on   S03 (promo tag), S08 (payment methods), S16 (status badge),
          S14 (bonus +30%), S15 (upcoming/past tabs)
```

### Rating Stars
```
sizes     sm 16, md 24, lg 32
states    read-only (display avg), interactive (tap to set)
colors    filled = accent-2 (yellow), empty = border
a11y      role="radiogroup" when interactive; each star is role="radio" with aria-label "N stars";
          read-only renders as text "4.8 out of 5" visually hidden
used on   S18, S22
```

---

## Layout & Nav

### App Shell (mobile)
```
header 56, bottom-nav 64, safe-area insets honored
```

### Header
```
elements  logo (Ayaad wordmark SVG), country/city pill, lang toggle, menu
height    56 mobile, 72 desktop
bg        bg; shadow-sm on scroll
rtl       logo stays on logical start; nav mirrors
used on   all screens
```

### Bottom Nav (mobile only)
```
tabs      Home · Bookings · Credits · Menu  (4 only; Menu holds the rest)
states    active (text accent, icon filled), inactive (text text-muted), badge (red dot or count)
a11y      aria-current="page"; min 44 tap target
used on   S03, S15, S14, S23 and all auth'd screens
```

### Stepper Bar (horizontal, 4 steps)
```
steps     Service → Slot → Address → Pay
states    done (check icon, bg accent), current (filled dot, text accent, bold), upcoming (border, text text-muted)
responsive  mobile shows current step label only; desktop shows all
rtl       flows right-to-left
used on   S05, S06, S07, S08
```

### Container
```
max-widths  prose 680 (text), container 1200 (grid)
side-gutter 16 mobile, 24 tablet, 32 desktop
```

---

## Cards

### Service Tile
```
variants  grid (home), hero (service landing)
tokens    bg surface-raised, radius lg, shadow card, padding 16
contents  icon or image, name_en + name_ar, short tagline, chevron
states    default, hover (shadow-pop), pressed (scale .98)
used on   S03
```

### Address Card
```
contents  label, line1, city, access-method icon, default pill
states    default, selected (border 2 accent + bg accent-subtle), editing
used on   S07, S12
```

### Booking Card
```
contents  service name, date/time, address line, status badge, total AED, pro mini-chip
states    pending-payment, paid, matched, in-progress, completed, cancelled, no-show
badge     maps status → chip variant (pending=neutral, paid=info, matched=accent-subtle,
          in-progress=warning-subtle, completed=success, cancelled=danger-subtle)
used on   S15, S16
```

### Pro Card (mini)
```
contents  avatar initials, display name, star rating, last4 phone (optional)
privacy   never full phone; never ID numbers; name only if ERP shares
used on   S16, S22
```

### Credit Package Tile
```
contents  AED amount, bonus pill (+30%), effective savings, select CTA
states    default, selected (border accent), out-of-stock
used on   S14
```

---

## Forms & Flows

### Hour Counter
```
layout     [−] 2 hrs [+]
constraints min 2, max 12 (per service config)
states     min reached (− disabled), max reached (+ disabled), invalid
used on    S05 (future hourly variants)
```

### Pro Count Radio
```
options    1 / 2 / 3 / 4
layout     equal pills in a row
tokens     selected = bg accent, text on-accent; unselected = bg surface-muted
used on    future (currently per_unit services use their own counter)
```

### Date Carousel (today → +30)
```
layout     horizontal scroll, snap-x
cell       day-of-week over date number; 56×72
states     available (default), sold-out (text-subtle + line-through), surcharge (border accent-2),
           selected (bg accent + text on-accent), today (ring)
a11y       <button> per date; aria-pressed for selected; roving tabindex
used on    S06, F03
```

### Time Slot Grid
```
grid       3 cols mobile, 6 cols tablet+
cell       height 44; "08:00 AM" label
states     available, taken (disabled), surcharge (accent-2 dot), selected
used on    S06
```

### Access Method Radio
```
options    I'm home · Key with security · Under the mat · Door unlocked
layout     stacked cards with radio
icon       lucide per option
used on    S07
```

### Payment Chip
```
options    Cash · Card · Tabby · Credits
layout     horizontal row with logo
states     selected, disabled (grey+note), insufficient (credits)
a11y       role="radiogroup"
used on    S08
```

### Voucher Input
```
layout     text + Apply button
states     empty, pending (spinner on Apply), applied (chip + remove), invalid (border danger + msg)
success    inline price-breakdown line "Voucher XYZ applied: −AED 50"
used on    S08
```

### Price Breakdown
```
lines      Subtotal · Materials · Fri surcharge · Voucher (−) · Credits used (−) · Service fee · VAT 5% · Total
style      left label text-muted, right amount text; Total bold, border-top
rtl        amounts right/left-swap
used on    S08, S09, S16, invoice email
```

---

## Overlays

### Modal (bottom sheet on mobile, centered on desktop)
```
sizes     sm (confirm) 320, md (form) 480, lg (details) 640
anatomy   title, close, body, footer actions (cancel + primary)
states    opening (fade+slide 200ms ease-out), closing (ease-in), stuck (keyboard)
a11y      Radix Dialog, focus trap, Escape close, aria-labelledby
scroll    body scrollable; footer sticks
used on   S08 (confirm), S17 (cancel/reschedule), S23 (logout), S25 (issue report)
```

### Toast
```
positions bottom-center mobile, bottom-right desktop (RTL mirrors to bottom-left)
variants  success, danger, warning, info
duration  4s auto-dismiss (10s for danger); hover pauses
a11y      aria-live polite (info/success), assertive (danger)
```

### Drawer (menu / addresses picker)
```
side      right-end (RTL: logical start)
width     320
```

### Tooltip
```
delay     300ms open, 150ms close
tokens    bg text, text bg, radius sm, shadow pop
```

---

## Status / Feedback

### Empty State
```
layout    centered illustration (120×120), heading md, body sm text-muted, primary CTA
used on   S12 (no addresses), S13 (no cards), S15 (no bookings), S14 (no credits), S19 (no threads)
```

### Error State
```
layout    illustration (sadder), heading, body (what happened + what to do), retry button
sentry    captured and anonymized
```

### Loading
```
inline    spinner 16/24, text-muted
page      skeleton for cards (bg surface-muted animate pulse)
button    spinner replaces label (label kept for a11y via aria-label)
```

### Skeleton
```
blocks    radius sm, bg surface-muted, animate shimmer 1.4s
used on   S03, S15, S16 (first paint)
```

---

## Chat & Realtime

### Chat Bubble
```
roles     customer (bg accent, text on-accent, align end), agent (bg surface-muted, text text, align start), system (text text-muted centered)
tokens    max-width 76%, radius md with asymmetric corner on the align side
state     sending (opacity .6), sent (check), failed (danger + retry), unread (bold)
a11y      role="log"; aria-live polite
used on   S19
```

### Composer
```
layout    textarea + attach + send
states    empty (send disabled), typing, uploading, over-length warning
```

---

## Checkout-only

### Order Confirmation
```
icon      lucide check-circle in accent, 64
headline  "Booking confirmed" (2xl)
sublines  booking ref, service, start, address, total
actions   View booking · Download invoice · Add to Wallet
used on   S09
```

### Invoice (PDF via @react-pdf/renderer)
```
layout    A4 portrait; two-column header (logo + legal entity block)
head      Ayaad logo + legal name + TRN + address + phone
meta      Invoice # (AYD-2026-000123) · Date · Customer block · Address
table     Description EN / AR · Qty · Unit · Line Total
totals    Subtotal · VAT 5% · Total · In words
footer    Thank-you line + website + support email
rtl       Arabic column reads right-to-left; totals mirror
spec'd in architecture.md §4.1
```

---

## Admin-only

Same primitives + table component below.

### DataTable
```
features  sort, filter, pagination 25/50/100, select, row actions, empty state
sizes     compact (36 row), default (44 row)
sticky    first col optional, header always sticky
a11y      proper <table>, <th scope>, sortable headers aria-sort
used on   admin/users, admin/bookings, admin/erp-outbox, admin/issues
```

### Admin Nav (sidebar)
```
width     280 collapsed to 72
items     Dashboard · Services · Pricing · Vouchers · Users · Bookings · Issues · Quotes · ERP · Settings
badges    Pending count for Issues, Failed count for ERP
```

---

## Accessibility defaults (apply to every component)

- Focus-visible ring via `shadow-focus` on every interactive element
- `prefers-reduced-motion` honored (tokens.css handles)
- Minimum tap target 44×44
- `inputmode` and `autocomplete` on every form field
- Form errors tied to inputs via `aria-describedby`
- Live regions for toasts (polite) and errors (assertive)
- Color never the sole conveyor of status — pair with icon or label
- RTL via `dir="rtl"` on `<html>` for Arabic locale; use logical CSS (`margin-inline-start` etc.)

---

## Design-system check

Before any screen build:

1. Primitives built in isolation (storybook or `/design` route)
2. All states captured in a screenshot grid (`replica/design/screenshots/primitives.png`)
3. `python contrast.py tokens.json` → 25 pairs, 0 failing AA ✓
4. RTL mirror verified by swapping `dir="rtl"` on the design route

Then and only then does `/replica-build` start on real screens.
