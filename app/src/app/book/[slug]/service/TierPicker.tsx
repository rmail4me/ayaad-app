'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/ui/Button';
import { Textarea } from '@/ui/Input';
import { PriceBreakdown, StickyActions } from '@/ui/Card';
import { quote } from '@/lib/pricing';
import type { Service, ServiceTier } from '@/lib/types';

export function TierPicker({ service, tiers }: { service: Service; tiers: ServiceTier[] }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');

  const selection = useMemo(() => {
    if (service.pricing_model === 'tier_bedroom') {
      const picked = Object.entries(qty).find(([, v]) => v > 0);
      return picked ? [{ tier_key: picked[0], qty: 1 }] : [];
    }
    return Object.entries(qty).filter(([, v]) => v > 0).map(([k, v]) => ({ tier_key: k, qty: v }));
  }, [qty, service.pricing_model]);

  const q = quote(service, tiers, selection);
  const flatOrVisit = service.pricing_model === 'flat' || service.pricing_model === 'per_visit';
  const canContinue = selection.length > 0 || flatOrVisit;

  const continueBooking = () => {
    const payload = { tiers: flatOrVisit ? [] : selection, notes };
    document.cookie = `ayaad_draft=${encodeURIComponent(JSON.stringify(payload))}; path=/; max-age=1800; samesite=lax`;
    router.push(`/book/${service.slug}/slot` as any);
  };

  return (
    <div className="space-y-6">
      {service.pricing_model === 'tier_bedroom' ? (
        <div role="radiogroup" aria-label="Home size" className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {tiers.map(t => {
            const selected = qty[t.tier_key] === 1;
            return (
              <button key={t.tier_key} role="radio" aria-checked={selected}
                onClick={() => setQty({ [t.tier_key]: 1 })}
                className={clsx(
                  'rounded-md p-3 text-start border transition-colors duration-fast',
                  selected ? 'bg-accent-subtle border-accent text-accent' : 'bg-surface-raised border-border text-text hover:bg-surface',
                )}>
                <div className="text-sm font-semibold">{t.label_en}</div>
                <div className="text-xs text-text-muted mt-0.5">AED {(t.price_fils / 100).toFixed(0)}</div>
              </button>
            );
          })}
        </div>
      ) : service.pricing_model === 'per_unit' ? (
        <div className="space-y-3">
          {tiers.map(t => (
            <div key={t.tier_key} className="flex items-center justify-between rounded-md bg-surface-raised border border-border p-3">
              <div>
                <div className="text-sm font-semibold text-text">{t.label_en}</div>
                <div className="text-xs text-text-muted">AED {(t.price_fils / 100).toFixed(0)}</div>
              </div>
              <div className="flex items-center gap-3">
                <button aria-label="Decrease" disabled={!qty[t.tier_key]}
                  onClick={() => setQty(s => ({ ...s, [t.tier_key]: Math.max(0, (s[t.tier_key] ?? 0) - 1) }))}
                  className="w-9 h-9 rounded-sm border border-border flex items-center justify-center disabled:opacity-50">
                  <Minus className="w-4 h-4" aria-hidden />
                </button>
                <span className="w-6 text-center font-semibold tabular-nums">{qty[t.tier_key] ?? 0}</span>
                <button aria-label="Increase"
                  onClick={() => setQty(s => ({ ...s, [t.tier_key]: (s[t.tier_key] ?? 0) + 1 }))}
                  className="w-9 h-9 rounded-sm border border-border flex items-center justify-center">
                  <Plus className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md bg-surface p-4 text-sm text-text">
          Flat price · <span className="font-semibold">AED {((service.base_price_fils ?? 0) / 100).toFixed(0)}</span>
        </div>
      )}

      <Textarea
        label="Special instructions (optional)"
        placeholder="e.g. please bring extra towels, cat in the bedroom, security code 1234"
        value={notes} onChange={e => setNotes(e.target.value)}
        help="You can edit this up to 4 hours before your appointment."
      />

      <div className="rounded-md bg-surface-muted p-4">
        <PriceBreakdown lines={q.lines} subtotal_fils={q.subtotal_fils}
          service_fee_fils={q.service_fee_fils} vat_fils={q.vat_fils} total_fils={q.total_fils} />
      </div>

      <StickyActions>
        <Button fullWidth size="lg" disabled={!canContinue} onClick={continueBooking}>
          Continue to pick a time
        </Button>
      </StickyActions>
    </div>
  );
}
