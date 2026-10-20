// Email magic-link helpers. Replaces Twilio OTP for B2B.
// Flow:
//   1. User enters email → sendMagicLink()
//        a. Generate random 32-byte token, email the URL (…/auth/verify?t=TOKEN)
//        b. Store sha256(token) in auth_tokens with 15-min expiry
//   2. User clicks link → consumeMagicLink(rawToken)
//        a. Hash, look up, check expires_at > now and consumed_at is null
//        b. Create or find user by email
//        c. Mark consumed, return user

import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull, gt, sql } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from './resend';

const TTL_MIN = 15;

function sha256(s: string) {
  return createHash('sha256').update(s).digest('hex');
}

export async function sendMagicLink(email: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + TTL_MIN * 60 * 1000);

  // Look up existing user (if any) to attach to the token
  const [existing] = await db.select({ id: schema.users.id })
    .from(schema.users).where(eq(sql`lower(${schema.users.email})`, email.toLowerCase())).limit(1);

  await db.insert(schema.authTokens).values({
    tokenHash, email: email.toLowerCase(), userId: existing?.id, expiresAt,
  });

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?t=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#0a0f2c;padding:24px;">
      <img src="${process.env.NEXT_PUBLIC_APP_URL}/ayaad_logo.png" alt="Ayaad" height="36" style="margin-bottom:16px;" />
      <h2 style="color:#0045ba;">Sign in to Ayaad</h2>
      <p>Click the button below to sign in. The link expires in ${TTL_MIN} minutes and can be used once.</p>
      <p><a href="${link}" style="display:inline-block;background:#0045ba;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:600;">Sign in</a></p>
      <p style="color:#4b5365;font-size:12px;margin-top:24px;">If you didn't request this, ignore the message.</p>
    </div>`;

  // Dev convenience: also log the link to the server console
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[magic-link] ${email} → ${link}`);
  }

  if (process.env.RESEND_API_KEY) {
    await resend.emails.send({
      from: EMAIL_FROM, replyTo: EMAIL_REPLY_TO, to: email,
      subject: 'Sign in to Ayaad', html,
    });
  } else {
    console.warn('[magic-link] RESEND_API_KEY missing — email NOT sent (click the link printed above)');
  }
}

export async function consumeMagicLink(rawToken: string):
  Promise<{ ok: true; email: string; userId: string | null } | { ok: false; error: string }> {
  if (!rawToken) return { ok: false, error: 'Missing token' };
  const tokenHash = sha256(rawToken);

  const [row] = await db.select().from(schema.authTokens)
    .where(and(
      eq(schema.authTokens.tokenHash, tokenHash),
      isNull(schema.authTokens.consumedAt),
      gt(schema.authTokens.expiresAt, new Date()),
    )).limit(1);

  if (!row) return { ok: false, error: 'Link expired or already used' };

  await db.update(schema.authTokens).set({ consumedAt: new Date() })
    .where(eq(schema.authTokens.id, row.id));

  return { ok: true, email: row.email, userId: row.userId };
}
