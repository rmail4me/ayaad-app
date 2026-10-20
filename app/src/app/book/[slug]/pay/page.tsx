// S08 — Pay step (B2B: prepaid default, card fallback)
import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getService, getTiers, getCurrentUser, getAddress, getMyCompany } from '@/lib/data';
import { Stepper, PriceBreakdown } from '@/ui/Card';
import { quote } from '@/lib/pricing';
import { PayForm } from './PayForm';

const STEPS = ['Service', 'Slot', 'Address', 'Pay'];

export default async function BookPayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=/book/${slug}/pay`);
  const company = await getMyCompany();

  const c = await cookies();
  const draftRaw = c.get('ayaad_draft')?.value;
  if (!draftRaw) redirect(`/book/${slug}/service` as any);
  const draft = JSON.parse(draftRaw) as {
    tiers: { tier_key: string; qty: number }[];
    start_at?: string; address_id?: string; notes?: string;
  };
  if (!draft.start_at || !draft.address_id) redirect(`/book/${slug}/service` as any);

  const tiers = await getTiers(service.id);
  const q = quote(service, tiers, draft.tiers);
  const address = await getAddress(draft.address_id);

  return (
    <div className="max-w-prose mx-auto space-y-6">
      <Stepper steps={STEPS} current={3} />
      <header>
        <h1 className="text-xl font-bold text-text">Review and pay</h1>
        {company && <p className="text-sm text-text-muted mt-1">Billing to <span className="font-semibold text-text">{company.name_en}</span>{company.trn ? ` · TRN ${company.trn}` : ''}</p>}
      </header>

      <section className="space-y-3">
        <div className="rounded-md bg-surface-raised border border-border p-3">
          <div className="text-xs text-text-muted">Service</div>
          <div className="text-sm font-semibold text-text">{service.name_en}</div>
        </div>
        <div className="rounded-md bg-surface-raised border border-border p-3">
          <div className="text-xs text-text-muted">When</div>
          <div className="text-sm font-semibold text-text">
            {new Date(draft.start_at).toLocaleString('en-GB', {
              timeZone: 'Asia/Dubai', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })} · Dubai time
          </div>
        </div>
        <div className="rounded-md bg-surface-raised border border-border p-3">
          <div className="text-xs text-text-muted">Address</div>
          <div className="text-sm font-semibold text-text">
            {address?.label}: {address?.line1}{address?.line2 ? `, ${address.line2}` : ''}, {address?.city}
          </div>
        </div>
      </section>

      <div className="rounded-md bg-surface-muted p-4">
        <PriceBreakdown lines={q.lines} subtotal_fils={q.subtotal_fils}
          service_fee_fils={q.service_fee_fils} vat_fils={q.vat_fils} total_fils={q.total_fils} />
      </div>

      <PayForm slug={slug}
        totalFils={q.total_fils}
        prepaidBalanceFils={company?.prepaid_balance_fils ?? 0}
        hasCompany={!!company} />
    </div>
  );
}
