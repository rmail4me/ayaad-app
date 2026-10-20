import { Resend } from 'resend';

const key = process.env.RESEND_API_KEY;
if (!key) console.warn('[resend] RESEND_API_KEY not set — email sends will no-op');
export const resend = new Resend(key ?? 're_missing');

export const EMAIL_FROM = process.env.RESEND_FROM ?? 'Ayaad <noreply@ayaad.ae>';
export const EMAIL_REPLY_TO = process.env.RESEND_REPLY_TO ?? 'support@ayaad.ae';
