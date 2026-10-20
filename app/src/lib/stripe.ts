import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[stripe] STRIPE_SECRET_KEY not set — payment flows will fail');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_missing', {
  apiVersion: '2024-10-28.acacia',
  typescript: true,
  appInfo: { name: 'Ayaad', version: '0.0.2' },
});
