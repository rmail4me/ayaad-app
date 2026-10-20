// Stripe webhook. Verifies signature, dedupes by event.id via a small table
// (reuses erp_inbox for idempotency), and finalizes bookings on checkout.session.completed.
//
// Local dev: `pnpm stripe:listen` to forward events here, then paste the whsec into .env.local.

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { db, schema } from '@/db/client';
import { markPaid, issueInvoiceFor, sendInvoiceEmailNow, topupCompany } from '@/lib/data';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const sig = (await headers()).get('stripe-signature');
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !whsec) return NextResponse.json({ error: 'no-signature' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), sig, whsec);
  } catch (e: any) {
    return NextResponse.json({ error: `invalid-sig: ${e.message}` }, { status: 400 });
  }

  // Idempotency: skip if we've already processed this event.id
  const idemKey = `stripe:${event.id}`;
  try {
    await db.insert(schema.erpInbox).values({
      callbackType: event.type, idempotencyKey: idemKey, payloadJson: event as any,
    });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const kind = s.metadata?.kind;

        if (kind === 'topup') {
          const company_id    = s.metadata?.company_id!;
          const amount_fils   = Number(s.metadata?.amount_fils ?? 0);
          const actor_user_id = s.metadata?.actor_user_id ?? null;
          if (company_id && amount_fils > 0) {
            await topupCompany(company_id, amount_fils, `Stripe top-up ${s.id}`, actor_user_id);
          }
          break;
        }

        const booking_id = (s.metadata?.booking_id as string) || (s.client_reference_id as string);
        if (!booking_id) break;
        await markPaid(booking_id, 'card', s.payment_intent as string);
        const inv = await issueInvoiceFor(booking_id);
        try { await sendInvoiceEmailNow(inv.id); } catch (e) { console.warn('[webhook] email', e); }
        break;
      }
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired': {
        const s = event.data.object as Stripe.Checkout.Session;
        const booking_id = (s.metadata?.booking_id as string) || (s.client_reference_id as string);
        if (booking_id) {
          await db.update(schema.bookings)
            .set({ status: 'expired' })
            .where(eq(schema.bookings.id, booking_id));
        }
        break;
      }
      case 'charge.refunded': {
        // Refunds trigger /admin flow (M2). Noop here.
        break;
      }
    }
    await db.update(schema.erpInbox)
      .set({ processedAt: new Date() })
      .where(eq(schema.erpInbox.idempotencyKey, idemKey));
  } catch (e: any) {
    await db.update(schema.erpInbox)
      .set({ processingError: String(e?.message ?? e) })
      .where(eq(schema.erpInbox.idempotencyKey, idemKey));
    return NextResponse.json({ error: 'handler-failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
