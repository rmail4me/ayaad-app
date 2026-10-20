// S05 — Booking step 1: service details (tier/qty picker)
import { notFound, redirect } from 'next/navigation';
import { getService, getTiers } from '@/lib/data';
import { Stepper } from '@/ui/Card';
import { TierPicker } from './TierPicker';

const STEPS = ['Service', 'Slot', 'Address', 'Pay'];

export default async function BookServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();
  if (service.pricing_model === 'quote') redirect(`/services/${service.slug}` as any);
  const tiers = await getTiers(service.id);
  return (
    <div className="max-w-prose mx-auto space-y-6">
      <Stepper steps={STEPS} current={0} />
      <header>
        <h1 className="text-xl font-bold text-text">{service.name_en}</h1>
        <p className="text-sm text-text-muted mt-1">Pick what you need.</p>
      </header>
      <TierPicker service={service} tiers={tiers} />
    </div>
  );
}
