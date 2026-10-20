'use server';
import { cookies } from 'next/headers';
import { createBooking, getCurrentUser, payFromPrepaid, startCardCheckout } from '@/lib/data';

type Res =
  | { ok: true; redirect: string }
  | { ok: true; booking_id: string }
  | { ok: false; error: string };

export async function payBookingAction(slug: string, method: 'prepaid' | 'card'): Promise<Res> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: 'Not signed in' };
    const c = await cookies();
    const draftRaw = c.get('ayaad_draft')?.value;
    if (!draftRaw) return { ok: false, error: 'No booking in progress' };
    const draft = JSON.parse(draftRaw) as {
      tiers?: { tier_key: string; qty: number }[];
      start_at?: string; address_id?: string; notes?: string;
    };
    if (!draft.start_at || !draft.address_id) return { ok: false, error: 'Draft missing details' };

    const booking = await createBooking({
      user_id: user.id, service_slug: slug,
      selection: draft.tiers ?? [], address_id: draft.address_id,
      start_at: draft.start_at, special_instructions: draft.notes,
    });

    c.delete('ayaad_draft');

    if (method === 'card') {
      const { checkout_url } = await startCardCheckout(booking.id);
      return { ok: true, redirect: checkout_url };
    }
    if (method === 'prepaid') {
      if (!user.company_id) return { ok: false, error: 'Prepaid requires a linked company. Pay by card.' };
      await payFromPrepaid(booking.id, user.id);
      return { ok: true, booking_id: booking.id };
    }
    return { ok: false, error: 'Unknown payment method' };
  } catch (e: any) {
    return { ok: false, error: e.message ?? 'Payment failed' };
  }
}
