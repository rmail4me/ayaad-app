// S06 — Booking step 2: pick date + time slot
import { notFound } from 'next/navigation';
import { getService } from '@/lib/data';
import { Stepper } from '@/ui/Card';
import { SlotPicker } from './SlotPicker';

const STEPS = ['Service', 'Slot', 'Address', 'Pay'];

export default async function BookSlotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();
  return (
    <div className="max-w-prose mx-auto space-y-6">
      <Stepper steps={STEPS} current={1} />
      <header>
        <h1 className="text-xl font-bold text-text">When works for you?</h1>
        <p className="text-sm text-text-muted mt-1">All slots are in Dubai time (GMT+4).</p>
      </header>
      <SlotPicker slug={service.slug} duration_min={service.duration_estimate_min ?? 60} />
    </div>
  );
}
