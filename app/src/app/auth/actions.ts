'use server';
import { requestLoginLink, completeLogin, setSessionCookie } from '@/lib/data';

export async function requestLoginAction(email: string, _nextUrl: string):
  Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!/.+@.+\..+/.test(email)) return { ok: false, error: 'Enter a valid email' };
    await requestLoginLink(email);
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message ?? 'Could not send link' }; }
}

export async function completeLoginAction(token: string):
  Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await completeLogin(token);
  if (!res.ok) return res;
  await setSessionCookie(res.user.id);
  return { ok: true };
}
