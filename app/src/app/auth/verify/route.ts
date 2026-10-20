// Magic-link verify endpoint. Must be a Route Handler (not a Page) because
// Next 15 only allows cookie writes from Route Handlers or Server Actions.

import { NextResponse, type NextRequest } from 'next/server';
import { completeLogin, setSessionCookie } from '@/lib/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t');
  const next  = req.nextUrl.searchParams.get('next') || '/';

  if (!token) return redirectWithError(req, 'Link is missing a token.');

  const res = await completeLogin(token);
  if (!res.ok) return redirectWithError(req, res.error);

  await setSessionCookie(res.user.id);
  return NextResponse.redirect(new URL(next, req.url));
}

function redirectWithError(req: NextRequest, msg: string) {
  const url = new URL('/auth', req.url);
  url.searchParams.set('error', msg);
  return NextResponse.redirect(url);
}
