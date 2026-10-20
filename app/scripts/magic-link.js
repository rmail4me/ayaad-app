#!/usr/bin/env node
// One-shot magic-link generator (no email, no Resend).
// Usage:  node scripts/magic-link.js teammate@example.com [ttl_hours]
//   default ttl is 24 hours; max 168 (7 days). Shorter is safer.
//
// Does three things:
//   1. Pre-creates the user if they don't exist yet
//   2. Links them to Ayaad Demo Corp with role=booker so prepaid balance works
//   3. Mints a magic-link token (15-min TTL) and prints the clickable URL
//
// Share the URL by WhatsApp / Signal / in person. Clicking signs them in on
// https://ayaad-app.vercel.app. The link is single-use; expires in 15 min.

const { config } = require('dotenv');
config({ path: '.env.local' });

const { createHash, randomBytes } = require('node:crypto');
const postgres = require('postgres');

// Always use prod URL for sharing — this script is only meant for team invites.
// Override via APP_URL env var if you need a different host for a one-off.
const APP_URL = process.env.APP_URL || 'https://ayaad-app.vercel.app';
const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000c0ffee';

const email = (process.argv[2] || '').trim().toLowerCase();
if (!/.+@.+\..+/.test(email)) {
  console.error('Usage: node scripts/magic-link.js <email> [ttl_hours=24]');
  process.exit(2);
}
const ttlHours = Math.min(168, Math.max(1, Number(process.argv[3] ?? 24)));

(async () => {
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

  // 1 + 2: find-or-create user, make sure linked to demo company
  let [user] = await sql`select id, company_id, role from users where lower(email) = ${email} limit 1`;
  if (!user) {
    const [created] = await sql`
      insert into users (email, country, role, company_id)
      values (${email}, 'AE', 'booker', ${DEMO_COMPANY_ID})
      returning id, company_id, role
    `;
    user = created;
    console.log(`created user ${email} (role=${user.role}, linked to Ayaad Demo Corp)`);
  } else {
    if (!user.company_id) {
      await sql`update users set company_id = ${DEMO_COMPANY_ID}, role = 'booker' where id = ${user.id}`;
      console.log(`linked existing user ${email} to Ayaad Demo Corp`);
    } else {
      console.log(`user ${email} already exists (role=${user.role})`);
    }
  }

  // 3: mint a fresh magic-link token (default 24h; configurable via 2nd arg)
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  await sql`
    insert into auth_tokens (token_hash, user_id, email, purpose, expires_at)
    values (${tokenHash}, ${user.id}, ${email}, 'login', ${expiresAt})
  `;

  const url = `${APP_URL}/auth/verify?t=${encodeURIComponent(token)}`;
  console.log(`\n--- magic link (valid ${ttlHours}h, single-use) ---`);
  console.log(url);
  console.log('----------------------------------------------\n');
  console.log('Share by WhatsApp / Signal / in person.');

  await sql.end();
})().catch(e => { console.error(e.message); process.exit(1); });
