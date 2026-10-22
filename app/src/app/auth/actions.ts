'use server';
import { redirect } from 'next/navigation';
import { requestLoginLink, completeLogin, setSessionCookie } from '@/lib/data';

export async function requestLoginAction(email: string, _nextUrl: string):
  Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!/.+@.+\..+/.test(email)) return { ok: false, error: 'Enter a valid email' };
    await requestLoginLink(email);
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e.message ?? 'Could not send link' }; }
}

// Called from the "Confirm sign-in" button on /auth/verify.
// Only this POST path consumes the token — the page's GET is a no-op so
// link-preview bots (WhatsApp, iMessage, Slack) can't burn single-use tokens.
export async function confirmLoginAction(fd: FormData) {
  const token = String(fd.get('t') ?? '');
  // Open-redirect guard: only allow in-app paths that start with a single slash
  const rawNext = String(fd.get('next') ?? '/');
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';
  const res = await completeLogin(token);
  if (!res.ok) {
    redirect(`/auth?error=${encodeURIComponent(res.error)}` as any);
  }
  await setSessionCookie(res.user.id);
  redirect(next as any);
}
