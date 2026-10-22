'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, CreditCard, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/ui/Button';
import { StickyActions } from '@/ui/Card';
import { payBookingAction } from './actions';

export function PayForm({
  slug, totalFils, prepaidBalanceFils, hasCompany,
}: {
  slug: string; totalFils: number; prepaidBalanceFils: number; hasCompany: boolean;
}) {
  const router = useRouter();
  const sufficient = hasCompany && prepaidBalanceFils >= totalFils;
  const [method, setMethod] = useState<'prepaid' | 'card'>(sufficient ? 'prepaid' : 'card');
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pay = async () => {
    setPaying(true); setErr(null);
    const res = await payBookingAction(slug, method);
    if (!res.ok) { setErr(res.error); setPaying(false); return; }
    if ('redirect' in res) { window.location.href = res.redirect; return; }
    router.push(`/book/${slug}/confirmation/${res.booking_id}` as any);
  };

  const fmt = (f: number) => `AED ${(f/100).toFixed(2)}`;

  return (
    <div className="space-y-4">
      {hasCompany && (
        <button type="button"
          onClick={() => sufficient && setMethod('prepaid')}
          disabled={!sufficient}
          aria-pressed={method === 'prepaid'}
          className={clsx(
            'w-full flex items-start gap-3 rounded-md border p-3 text-start',
            method === 'prepaid' ? 'bg-accent-subtle border-accent' : 'bg-surface-raised border-border',
            !sufficient && 'opacity-70 cursor-not-allowed',
          )}>
          <Wallet className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden />
          <span className="flex-1">
            <span className="flex items-center justify-between">
              <span className="text-sm font-semibold text-text">Company prepaid balance</span>
              <span className="text-sm text-text tabular-nums">{fmt(prepaidBalanceFils)}</span>
            </span>
            <span className="block text-xs text-text-muted mt-0.5">
              {sufficient
                ? `After this booking: ${fmt(prepaidBalanceFils - totalFils)}`
                : `Need another ${fmt(totalFils - prepaidBalanceFils)} — top up with card below`}
            </span>
          </span>
        </button>
      )}

      <button type="button"
        onClick={() => setMethod('card')}
        aria-pressed={method === 'card'}
        className={clsx(
          'w-full flex items-start gap-3 rounded-md border p-3 text-start',
          method === 'card' ? 'bg-accent-subtle border-accent' : 'bg-surface-raised border-border',
        )}>
        <CreditCard className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden />
        <span>
          <span className="block text-sm font-semibold text-text">Pay by card</span>
          <span className="block text-xs text-text-muted mt-0.5">
            Visa / Mastercard · 3D-Secure · receipt on company TRN
          </span>
        </span>
      </button>

      {!hasCompany && (
        <p className="text-xs text-text-muted flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          Your account is not linked to a company yet. Ask us to connect it for prepaid-balance billing.
        </p>
      )}

      {err && <p className="text-sm text-danger" role="alert">{err}</p>}

      <StickyActions>
        <Button fullWidth size="lg" loading={paying} onClick={pay}>
          {method === 'prepaid' ? 'Confirm booking' : 'Continue to Stripe'}
        </Button>
      </StickyActions>
      <p className="text-xs text-text-muted text-center">
        A VAT invoice to the company TRN is emailed immediately after confirmation.
      </p>
    </div>
  );
}
