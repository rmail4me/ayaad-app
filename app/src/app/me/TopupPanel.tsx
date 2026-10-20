'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { startTopupAction } from './actions';

const PRESETS = [1000, 2500, 5000, 10000] as const;

export function TopupPanel({ companyName }: { companyName: string }) {
  const [picked, setPicked]  = useState<number | 'custom'>(2500);
  const [custom, setCustom]  = useState<string>('');
  const [busy, setBusy]      = useState(false);
  const [err, setErr]        = useState<string | null>(null);

  const amountAED = picked === 'custom' ? Number(custom || '0') : picked;
  const amountFils = Math.round(amountAED * 100);
  const valid = amountAED >= 100 && amountAED <= 1000000;

  const go = async () => {
    setBusy(true); setErr(null);
    const res = await startTopupAction(amountFils);
    if (!res.ok) { setErr(res.error); setBusy(false); return; }
    window.location.href = res.redirect;
  };

  return (
    <details className="rounded-lg bg-surface-raised shadow-card p-4">
      <summary className="cursor-pointer text-sm font-semibold text-text flex items-center gap-2">
        <Plus className="w-4 h-4" aria-hidden /> Top up {companyName}&apos;s balance
      </summary>
      <div className="mt-4 space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map(p => (
            <button key={p} type="button" onClick={() => setPicked(p)} aria-pressed={picked === p}
              className={clsx(
                'rounded-md border py-2 text-sm font-medium tabular-nums',
                picked === p ? 'bg-accent-subtle border-accent text-accent' : 'bg-bg border-border text-text',
              )}>
              AED {p.toLocaleString()}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setPicked('custom')} aria-pressed={picked === 'custom'}
          className={clsx(
            'w-full rounded-md border py-2 text-sm font-medium',
            picked === 'custom' ? 'bg-accent-subtle border-accent text-accent' : 'bg-bg border-border text-text',
          )}>
          Custom amount
        </button>
        {picked === 'custom' && (
          <Input label="Amount (AED)" type="number" min="100" max="1000000" step="50"
                 inputMode="decimal" value={custom} onChange={e => setCustom(e.target.value)} autoFocus />
        )}
        {err && <p className="text-sm text-danger" role="alert">{err}</p>}
        <Button fullWidth size="lg" loading={busy} disabled={!valid} onClick={go}>
          Continue to Stripe {valid && `(AED ${amountAED.toLocaleString()})`}
        </Button>
        <p className="text-xs text-text-muted">
          You&apos;ll be redirected to Stripe to complete payment with a card. Balance is credited the moment Stripe confirms.
        </p>
      </div>
    </details>
  );
}
