// S07 — Booking step 3: address + access instructions
import { notFound, redirect } from 'next/navigation';
import { getService, getCurrentUser, listAddresses } from '@/lib/data';
import { Stepper } from '@/ui/Card';
import { AddressForm } from './AddressForm';

const STEPS = ['Service', 'Slot', 'Address', 'Pay'];

export default async function BookAddressPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=/book/${slug}/address`);
  const addresses = await listAddresses(user.id);
  return (
    <div className="max-w-prose mx-auto space-y-6">
      <Stepper steps={STEPS} current={2} />
      <header>
        <h1 className="text-xl font-bold text-text">Where are you?</h1>
        <p className="text-sm text-text-muted mt-1">We&apos;ll match a nearby team.</p>
      </header>
      <AddressForm slug={slug} existing={addresses} />
    </div>
  );
}
