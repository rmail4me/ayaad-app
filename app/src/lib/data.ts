// Real B2B data layer backed by Supabase Postgres + Drizzle.
// B2B pivot (2026-10-20): email magic link instead of phone OTP; company-level
// prepaid balance drives bookings by default; cards are top-up top-of-ledger.

import 'server-only';
import { cookies } from 'next/headers';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { quote, type TierSelection } from './pricing';
import { renderInvoicePdf } from './pdf/invoice';
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from './resend';
import { stripe } from './stripe';
import { sendMagicLink, consumeMagicLink } from './magic-link';
import type {
  Address, Booking, Company, Invoice, Service, ServiceTier, User, BookingTier, PaidFrom,
} from './types';

const COOKIE = 'ayaad_uid';

// -------- row <-> domain mapping --------
const toService = (r: any): Service => ({
  id: r.id, slug: r.slug, name_en: r.nameEn, name_ar: r.nameAr, category: r.category,
  pricing_model: r.pricingModel, base_price_fils: r.basePriceFils, currency: r.currency,
  duration_estimate_min: r.durationEstimateMin,
  inclusions_en: r.inclusionsEn ?? [], exclusions_en: r.exclusionsEn ?? [],
  hero_image_url: r.heroImageUrl, cancellation_window_hours: r.cancellationWindowHours,
  sort_order: r.sortOrder,
});
const toTier = (r: any): ServiceTier => ({
  id: r.id, service_id: r.serviceId, tier_key: r.tierKey, label_en: r.labelEn,
  label_ar: r.labelAr, price_fils: r.priceFils, sort_order: r.sortOrder,
});
const toUser = (r: any): User => ({
  id: r.id, phone: r.phone, phone_country: r.phoneCountry, email: r.email,
  full_name: r.fullName, locale: r.locale, country: r.country,
  company_id: r.companyId, role: r.role,
});
const toCompany = (r: any): Company => ({
  id: r.id, name_en: r.nameEn, name_ar: r.nameAr, trn: r.trn,
  address_line1: r.addressLine1, city: r.city, country: r.country,
  prepaid_balance_fils: Number(r.prepaidBalanceFils), currency: r.currency, active: r.active,
});
const toAddress = (r: any): Address => ({
  id: r.id, user_id: r.userId, label: r.label, line1: r.line1, line2: r.line2,
  city: r.city, emirate_or_region: r.emirateOrRegion, country: r.country,
  access_method: r.accessMethod, access_notes: r.accessNotes, pets: r.pets, is_default: r.isDefault,
});

// -------- Catalog --------
export async function listServices(): Promise<Service[]> {
  const rows = await db.select().from(schema.services)
    .where(eq(schema.services.active, true)).orderBy(schema.services.sortOrder);
  return rows.map(toService);
}
export async function getService(slug: string): Promise<Service | null> {
  const [row] = await db.select().from(schema.services).where(eq(schema.services.slug, slug)).limit(1);
  return row ? toService(row) : null;
}
export async function getTiers(service_id: string): Promise<ServiceTier[]> {
  const rows = await db.select().from(schema.servicePricingTiers)
    .where(and(eq(schema.servicePricingTiers.serviceId, service_id), eq(schema.servicePricingTiers.active, true)))
    .orderBy(schema.servicePricingTiers.sortOrder);
  return rows.map(toTier);
}

// -------- Session --------
export async function getCurrentUser(): Promise<User | null> {
  const c = await cookies();
  const uid = c.get(COOKIE)?.value;
  if (!uid) return null;
  const [row] = await db.select().from(schema.users).where(eq(schema.users.id, uid)).limit(1);
  return row ? toUser(row) : null;
}
export async function setSessionCookie(user_id: string) {
  (await cookies()).set(COOKIE, user_id, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: 60 * 60 * 24 * 30,
  });
}
export async function clearSessionCookie() { (await cookies()).delete(COOKIE); }

// -------- Auth (email magic link) --------
export async function requestLoginLink(email: string): Promise<void> {
  await sendMagicLink(email.trim().toLowerCase());
}
export async function completeLogin(rawToken: string):
  Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const r = await consumeMagicLink(rawToken);
  if (!r.ok) return r;

  // Find or create user
  let [existing] = await db.select().from(schema.users)
    .where(eq(sql`lower(${schema.users.email})`, r.email)).limit(1);
  if (!existing) {
    const [created] = await db.insert(schema.users).values({
      email: r.email, country: 'AE', role: 'booker',
    }).returning();
    existing = created;
  }
  return { ok: true, user: toUser(existing) };
}

// -------- Companies --------
export async function getCompany(id: string): Promise<Company | null> {
  const [row] = await db.select().from(schema.companies).where(eq(schema.companies.id, id)).limit(1);
  return row ? toCompany(row) : null;
}
export async function getMyCompany(): Promise<Company | null> {
  const u = await getCurrentUser();
  if (!u?.company_id) return null;
  return getCompany(u.company_id);
}

// Transaction-safe top-up (used by admin, Stripe wire webhook, or dev script)
export async function topupCompany(company_id: string, delta_fils: number, note: string, actor_user_id: string | null = null):
  Promise<Company> {
  if (delta_fils <= 0) throw new Error('Top-up amount must be positive');
  return db.transaction(async (tx) => {
    const [cur] = await tx.select().from(schema.companies).where(eq(schema.companies.id, company_id)).for('update').limit(1);
    if (!cur) throw new Error('Company not found');
    const next = Number(cur.prepaidBalanceFils) + delta_fils;
    const [row] = await tx.update(schema.companies).set({ prepaidBalanceFils: next })
      .where(eq(schema.companies.id, company_id)).returning();
    await tx.insert(schema.companyBalanceTxns).values({
      companyId: company_id, deltaFils: delta_fils, reason: 'topup',
      actorUserId: actor_user_id, note,
    });
    return toCompany(row);
  });
}

async function drawFromPrepaid(tx: any, company_id: string, amount_fils: number, booking_id: string, actor_user_id: string) {
  const [cur] = await tx.select().from(schema.companies).where(eq(schema.companies.id, company_id)).for('update').limit(1);
  if (!cur) throw new Error('Company not found');
  if (Number(cur.prepaidBalanceFils) < amount_fils) throw new Error('Insufficient prepaid balance');
  const next = Number(cur.prepaidBalanceFils) - amount_fils;
  await tx.update(schema.companies).set({ prepaidBalanceFils: next })
    .where(eq(schema.companies.id, company_id));
  await tx.insert(schema.companyBalanceTxns).values({
    companyId: company_id, deltaFils: -amount_fils, reason: 'booking_use',
    bookingId: booking_id, actorUserId: actor_user_id,
  });
}

// -------- Addresses --------
export async function listAddresses(user_id: string): Promise<Address[]> {
  const rows = await db.select().from(schema.addresses)
    .where(eq(schema.addresses.userId, user_id)).orderBy(desc(schema.addresses.isDefault));
  return rows.map(toAddress);
}
export async function addAddress(input: Omit<Address, 'id'>): Promise<Address> {
  if (input.is_default) {
    await db.update(schema.addresses).set({ isDefault: false })
      .where(eq(schema.addresses.userId, input.user_id));
  }
  const [row] = await db.insert(schema.addresses).values({
    userId: input.user_id, label: input.label, line1: input.line1, line2: input.line2,
    city: input.city, emirateOrRegion: input.emirate_or_region, country: input.country,
    accessMethod: input.access_method, accessNotes: input.access_notes,
    pets: input.pets, isDefault: input.is_default,
  }).returning();
  return toAddress(row);
}
export async function getAddress(id: string): Promise<Address | null> {
  const [row] = await db.select().from(schema.addresses).where(eq(schema.addresses.id, id)).limit(1);
  return row ? toAddress(row) : null;
}

// -------- Bookings --------
async function defaultLegalEntityId(): Promise<string> {
  const [row] = await db.select({ id: schema.legalEntities.id }).from(schema.legalEntities)
    .where(eq(schema.legalEntities.invoicePrefix, 'AYD')).limit(1);
  if (!row) throw new Error('Legal entity AYD not seeded');
  return row.id;
}

export async function createBooking(input: {
  user_id: string; service_slug: string; selection: TierSelection[];
  address_id: string; start_at: string; special_instructions?: string;
}): Promise<Booking> {
  const service = await getService(input.service_slug);
  if (!service) throw new Error('Unknown service');
  const tiers = await getTiers(service.id);
  const q = quote(service, tiers, input.selection);
  const legalEntityId = await defaultLegalEntityId();

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, input.user_id)).limit(1);
  if (!user) throw new Error('User not found');

  const [row] = await db.insert(schema.bookings).values({
    userId: input.user_id,
    companyId: user.companyId,
    serviceId: service.id,
    addressId: input.address_id,
    legalEntityId,
    startAt: new Date(input.start_at),
    durationMin: service.duration_estimate_min ?? 60,
    status: 'draft',
    paidFrom: 'prepaid',
    subtotalFils: q.subtotal_fils,
    serviceFeeFils: q.service_fee_fils,
    vatFils: q.vat_fils,
    totalFils: q.total_fils,
    currency: 'AED',
    specialInstructions: input.special_instructions,
    country: 'AE',
    pricingSnapshotJson: q as any,
  }).returning();

  if (input.selection.length) {
    const picked = input.selection.map(s => {
      const t = tiers.find(x => x.tier_key === s.tier_key)!;
      return {
        bookingId: row.id, tierKey: t.tier_key, labelEn: t.label_en, labelAr: t.label_ar,
        qty: s.qty, unitPriceFils: t.price_fils,
      };
    });
    await db.insert(schema.bookingTiers).values(picked);
  }

  return bookingFromDb(row.id);
}

export async function listMyBookings(user_id: string): Promise<Booking[]> {
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, user_id)).limit(1);
  // Company users see their whole company's bookings; standalone users see their own
  const rows = u?.companyId
    ? await db.select().from(schema.bookings).where(eq(schema.bookings.companyId, u.companyId)).orderBy(desc(schema.bookings.createdAt))
    : await db.select().from(schema.bookings).where(eq(schema.bookings.userId, user_id)).orderBy(desc(schema.bookings.createdAt));
  const out: Booking[] = [];
  for (const r of rows) out.push(await bookingFromDb(r.id));
  return out;
}
export async function getBooking(id: string): Promise<Booking | null> {
  try { return await bookingFromDb(id); } catch { return null; }
}

async function bookingFromDb(id: string): Promise<Booking> {
  const [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, id)).limit(1);
  if (!b) throw new Error('Booking not found');
  const tiers = await db.select().from(schema.bookingTiers).where(eq(schema.bookingTiers.bookingId, id));
  const [inv] = await db.select({ number: schema.invoices.number, scope: schema.invoices.seqScope })
    .from(schema.invoices).where(eq(schema.invoices.bookingId, id)).limit(1);
  return {
    id: b.id, public_ref: b.publicRef, user_id: b.userId, company_id: b.companyId,
    service_id: b.serviceId, address_id: b.addressId,
    start_at: (b.startAt as Date).toISOString(),
    duration_min: b.durationMin, status: b.status as any,
    paid_from: b.paidFrom as PaidFrom,
    tiers: tiers.map(t => ({
      tier_key: t.tierKey, label_en: t.labelEn, label_ar: t.labelAr, qty: t.qty, unit_price_fils: t.unitPriceFils,
    })) as BookingTier[],
    subtotal_fils: Number(b.subtotalFils), service_fee_fils: Number(b.serviceFeeFils),
    vat_fils: Number(b.vatFils), total_fils: Number(b.totalFils),
    currency: b.currency as any,
    special_instructions: b.specialInstructions,
    invoice_number: inv ? `AYD-${inv.scope}-${String(inv.number).padStart(6, '0')}` : null,
    created_at: (b.createdAt as Date).toISOString(),
  };
}

// -------- Payment: PREPAID (draw from company balance) --------
export async function payFromPrepaid(booking_id: string, actor_user_id: string):
  Promise<{ booking: Booking; invoice: Invoice }> {
  const [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, booking_id)).limit(1);
  if (!b) throw new Error('Booking not found');
  if (!b.companyId) throw new Error('Booking has no company — prepaid not available');
  if (b.status !== 'draft' && b.status !== 'pending_payment') throw new Error('Not payable');

  await db.transaction(async (tx) => {
    await drawFromPrepaid(tx, b.companyId!, Number(b.totalFils), b.id, actor_user_id);
    await tx.update(schema.bookings).set({
      status: 'paid', paidFrom: 'prepaid', paidAt: new Date(), capturedAt: new Date(),
    }).where(eq(schema.bookings.id, b.id));
    await tx.insert(schema.bookingEvents).values({
      bookingId: b.id, kind: 'paid.prepaid', actor: 'customer', dataJson: {} as any,
    });
  });

  const inv = await issueInvoiceFor(booking_id);
  try { await sendInvoiceEmailNow(inv.id); } catch (e) { console.warn('[invoice-email] inline fail', e); }
  await enqueueErpPush(booking_id);
  return { booking: await bookingFromDb(booking_id), invoice: inv };
}

// -------- Self-service prepaid top-up via Stripe Checkout --------
export async function startBalanceTopup(company_id: string, amount_fils: number, actor_user_id: string):
  Promise<{ checkout_url: string }> {
  if (amount_fils < 10000) throw new Error('Minimum top-up is AED 100');
  if (amount_fils > 100000000) throw new Error('Maximum top-up is AED 1,000,000 — contact ops');

  const [company] = await db.select().from(schema.companies).where(eq(schema.companies.id, company_id)).limit(1);
  if (!company) throw new Error('Company not found');

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    client_reference_id: company_id,
    metadata: { kind: 'topup', company_id, amount_fils: String(amount_fils), actor_user_id },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/me?topup=success`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/me?topup=cancel`,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'aed',
        unit_amount: amount_fils,
        product_data: { name: `Prepaid balance top-up — ${company.nameEn}` },
      },
    }],
    locale: 'en',
  });
  return { checkout_url: session.url! };
}

// -------- Payment: CARD (Stripe Checkout for top-up or direct booking pay) --------
export async function startCardCheckout(booking_id: string): Promise<{ checkout_url: string }> {
  const b = await bookingFromDb(booking_id);
  if (b.status !== 'draft' && b.status !== 'pending_payment') throw new Error('Not payable');

  const svc = (await db.select({ nameEn: schema.services.nameEn })
    .from(schema.services).where(eq(schema.services.id, b.service_id)).limit(1))[0];

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    client_reference_id: booking_id,
    metadata: { booking_id, public_ref: b.public_ref, company_id: b.company_id ?? '' },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${booking_id}?paid=1`,
    cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/bookings/${booking_id}?cancelled=1`,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'aed',
        unit_amount: b.total_fils,
        product_data: { name: `${svc?.nameEn ?? 'Ayaad service'} — ${b.public_ref}` },
      },
    }],
    locale: 'en',
  });

  await db.update(schema.bookings).set({
    status: 'pending_payment', paidFrom: 'card', paymentIntentId: session.payment_intent as string | null,
  }).where(eq(schema.bookings.id, booking_id));

  return { checkout_url: session.url! };
}

// -------- Webhook-driven finalization --------
export async function markPaid(booking_id: string, source: PaidFrom, payment_intent_id: string | null) {
  await db.update(schema.bookings).set({
    status: 'paid', paidFrom: source, paidAt: new Date(), capturedAt: new Date(),
    paymentIntentId: payment_intent_id,
  }).where(eq(schema.bookings.id, booking_id));
  await db.insert(schema.bookingEvents).values({
    bookingId: booking_id, kind: `paid.${source}`, actor: source === 'card' ? 'stripe' : 'customer',
    dataJson: { payment_intent_id } as any,
  });
}

export async function issueInvoiceFor(booking_id: string): Promise<Invoice> {
  const b = await bookingFromDb(booking_id);
  const legalEntityId = await defaultLegalEntityId();
  const year = new Date().getFullYear().toString();

  const company = b.company_id ? await getCompany(b.company_id) : null;
  const [addr] = await db.select().from(schema.addresses).where(eq(schema.addresses.id, b.address_id)).limit(1);

  const result = await db.transaction(async (tx) => {
    const [m] = await tx.select({ max: sql<number>`coalesce(max(${schema.invoices.number}), 0)` })
      .from(schema.invoices)
      .where(and(eq(schema.invoices.legalEntityId, legalEntityId), eq(schema.invoices.seqScope, year)));
    const next = (m?.max ?? 0) + 1;

    const [inv] = await tx.insert(schema.invoices).values({
      bookingId: booking_id, legalEntityId, userId: b.user_id,
      seqScope: year, number: next,
      billToJson: {
        bill_to_type: company ? 'company' : 'contact',
        company_name: company?.name_en ?? null,
        company_trn: company?.trn ?? null,
        contact_user_id: b.user_id,
        address_line1: addr?.line1, city: addr?.city,
      } as any,
      subtotalFils: b.subtotal_fils, vatFils: b.vat_fils, totalFils: b.total_fils, currency: b.currency,
      status: 'issued',
    }).returning();

    for (const t of b.tiers) {
      await tx.insert(schema.invoiceLines).values({
        invoiceId: inv.id, descriptionEn: t.label_en, descriptionAr: t.label_ar,
        qty: t.qty, unitPriceFils: t.unit_price_fils, lineTotalFils: t.unit_price_fils * t.qty,
      });
    }
    return inv;
  });

  return {
    id: result.id, number: `AYD-${result.seqScope}-${String(result.number).padStart(6, '0')}`,
    booking_id, issued_at: (result.issuedAt as Date).toISOString(),
    subtotal_fils: Number(result.subtotalFils), vat_fils: Number(result.vatFils),
    total_fils: Number(result.totalFils), currency: result.currency as any,
  };
}

export async function sendInvoiceEmailNow(invoice_id: string) {
  const [row] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, invoice_id)).limit(1);
  if (!row) return;
  const [b] = await db.select().from(schema.bookings).where(eq(schema.bookings.id, row.bookingId)).limit(1);
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, row.userId)).limit(1);
  const [legal] = await db.select().from(schema.legalEntities).where(eq(schema.legalEntities.id, row.legalEntityId)).limit(1);
  const [addr] = await db.select().from(schema.addresses).where(eq(schema.addresses.id, b!.addressId)).limit(1);
  const [svc]  = await db.select().from(schema.services).where(eq(schema.services.id, b!.serviceId)).limit(1);
  const lines  = await db.select().from(schema.invoiceLines).where(eq(schema.invoiceLines.invoiceId, invoice_id));
  const company = b!.companyId ? await getCompany(b!.companyId) : null;

  if (!u?.email) { console.log(`[invoice-email] user ${u?.id} has no email; skipping`); return; }

  const pdf = await renderInvoicePdf({
    number: `${legal!.invoicePrefix}-${row.seqScope}-${String(row.number).padStart(6, '0')}`,
    issuedAt: (row.issuedAt as Date).toISOString(),
    serviceName: svc!.nameEn,
    legal: { name: legal!.name, trn: legal!.trn, address: `${legal!.addressLine1}, ${legal!.city}`, phone: legal!.phone ?? undefined, email: legal!.email ?? undefined },
    billTo: {
      name: company?.name_en ?? (u.fullName ?? 'Customer'),
      phone: u.email ?? '',
      addressLine1: addr!.line1, city: addr!.city,
    },
    lines: lines.map(l => ({ description: l.descriptionEn, qty: l.qty, unit_fils: Number(l.unitPriceFils), total_fils: Number(l.lineTotalFils) })),
    subtotal_fils: Number(row.subtotalFils), vat_fils: Number(row.vatFils), total_fils: Number(row.totalFils),
    currency: row.currency as any,
  });

  if (!process.env.RESEND_API_KEY) {
    console.log(`[invoice-email] would send to ${u.email}, PDF ${pdf.length} bytes (RESEND_API_KEY not set)`);
    return;
  }
  await resend.emails.send({
    from: EMAIL_FROM, replyTo: EMAIL_REPLY_TO, to: u.email,
    subject: `Your Ayaad invoice ${legal!.invoicePrefix}-${row.seqScope}-${String(row.number).padStart(6, '0')}`,
    html: `<p>Thank you for your booking. Your tax invoice is attached.</p>
           <p>Total: AED ${(Number(row.totalFils)/100).toFixed(2)}</p>
           <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/bookings/${row.bookingId}">View booking</a></p>`,
    attachments: [{ filename: `invoice-${row.seqScope}-${row.number}.pdf`, content: pdf }],
  });
}

async function enqueueErpPush(booking_id: string) {
  const b = await bookingFromDb(booking_id);
  await db.insert(schema.erpOutbox).values({
    eventType: 'booking.paid',
    aggregateId: booking_id,
    idempotencyKey: `booking.paid:${booking_id}`,
    payloadJson: b as any,
  }).onConflictDoNothing();
}
