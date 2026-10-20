// Twilio Verify wrapper. In AUTH_MODE=dev the code is always "123456"
// and nothing is sent — useful for local work without a Twilio bill.

import twilio from 'twilio';

const AUTH_MODE = process.env.AUTH_MODE ?? 'dev';
const sid = process.env.TWILIO_ACCOUNT_SID;
const token = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = AUTH_MODE === 'prod' && sid && token ? twilio(sid, token) : null;

export const isDev = AUTH_MODE !== 'prod';

export async function sendVerify(toE164: string): Promise<{ sid: string }> {
  if (isDev || !client || !serviceSid) {
    console.log(`[fake-otp] ${toE164} → code=123456`);
    return { sid: 'dev-' + Math.random().toString(36).slice(2, 10) };
  }
  const v = await client.verify.v2.services(serviceSid).verifications.create({
    to: toE164, channel: 'sms',
  });
  return { sid: v.sid };
}

export async function checkVerify(toE164: string, code: string): Promise<{ ok: boolean }> {
  if (isDev || !client || !serviceSid) return { ok: code === '123456' };
  const c = await client.verify.v2.services(serviceSid).verificationChecks.create({
    to: toE164, code,
  });
  return { ok: c.status === 'approved' };
}

export function toE164(countryIso: 'AE' | 'SA', localDigits: string): string {
  const digits = localDigits.replace(/\D/g, '').replace(/^0+/, '');
  return (countryIso === 'AE' ? '+971' : '+966') + digits;
}
