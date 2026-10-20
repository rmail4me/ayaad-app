'use server';
import { redirect } from 'next/navigation';
import { clearSessionCookie, getCurrentUser, startBalanceTopup } from '@/lib/data';

export async function logoutAction() {
  await clearSessionCookie();
  redirect('/auth');
}

export async function startTopupAction(amount_fils: number):
  Promise<{ ok: true; redirect: string } | { ok: false; error: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: 'Not signed in' };
    if (!user.company_id) return { ok: false, error: 'No company linked' };
    const r = await startBalanceTopup(user.company_id, amount_fils, user.id);
    return { ok: true, redirect: r.checkout_url };
  } catch (e: any) { return { ok: false, error: e.message ?? 'Could not start top-up' }; }
}
