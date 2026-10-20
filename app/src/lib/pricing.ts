import type { Service, ServiceTier } from './types';

// B2B pricing policy (user decision 2026-10-20):
//   * Listed prices are VAT-INCLUSIVE (match Justlife consumer convention)
//   * Service fee = 0 (corporate rate cards don't carry hidden platform fees)
//   * VAT 5% is back-calculated from gross for the invoice's taxable-amount line (UAE FTA format)
export const SERVICE_FEE_PCT_BP = 0;
export const VAT_RATE_BP = 500;

export const fils = (dirhams: number) => dirhams * 100;
export const dirhams = (fils: number) => fils / 100;

export function fmtAED(fils: number, locale: 'en' | 'ar' = 'en') {
  const d = fils / 100;
  if (locale === 'ar') return `${d.toFixed(2)} د.إ`;
  return `AED ${d.toFixed(2)}`;
}

export interface TierSelection { tier_key: string; qty: number; }

export interface PriceQuote {
  lines: { label: string; qty: number; unit_fils: number; line_fils: number }[];
  subtotal_fils: number;       // NET (ex-VAT) — matches invoice "taxable amount" line
  service_fee_fils: number;    // 0 for B2B
  vat_fils: number;            // 5% of net, back-calculated from gross
  total_fils: number;          // GROSS — what customer actually pays
}

export function quote(service: Service, tiers: ServiceTier[], selection: TierSelection[]): PriceQuote {
  const lines = selection.map(s => {
    const t = tiers.find(x => x.tier_key === s.tier_key)!;
    const line_fils = t.price_fils * s.qty;
    return { label: t.label_en, qty: s.qty, unit_fils: t.price_fils, line_fils };
  });

  // flat / per_visit services with no explicit tier picked fall back to base_price_fils
  let gross_fils = lines.reduce((a, l) => a + l.line_fils, 0);
  if (gross_fils === 0 && service.base_price_fils) {
    gross_fils = service.base_price_fils;
    lines.push({ label: service.name_en, qty: 1, unit_fils: service.base_price_fils, line_fils: service.base_price_fils });
  }

  // Back-calculate VAT from VAT-inclusive gross: vat = gross × 5/105
  const vat_fils = Math.round(gross_fils * VAT_RATE_BP / (10000 + VAT_RATE_BP));
  const net_fils = gross_fils - vat_fils;

  return {
    lines,
    subtotal_fils:   net_fils,   // ex-VAT; the invoice taxable-amount line
    service_fee_fils: 0,
    vat_fils,
    total_fils:      gross_fils, // what customer pays
  };
}
