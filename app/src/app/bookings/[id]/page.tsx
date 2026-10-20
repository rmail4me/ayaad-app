// S16 — Booking details
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Card, Chip, PriceBreakdown } from '@/ui/Card';
import { getCurrentUser, getBooking, getAddress, listServices } from '@/lib/data';
import { fmtAED } from '@/lib/pricing';

export default async function BookingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=/bookings/${id}`);
  const b = await getBooking(id);
  if (!b || b.user_id !== user.id) notFound();
  const [services, address] = await Promise.all([ listServices(), getAddress(b.address_id) ]);
  const service = services.find(s => s.id === b.service_id);

  const lines = b.tiers.length
    ? b.tiers.map(t => ({ label: t.label_en, qty: t.qty, line_fils: t.unit_price_fils * t.qty }))
    : [{ label: service?.name_en ?? 'Service', qty: 1, line_fils: b.subtotal_fils }];

  return (
    <article className="max-w-prose mx-auto space-y-4">
      <nav className="text-sm text-text-muted">
        <Link href="/bookings" className="hover:text-accent">Bookings</Link>
        <span className="mx-2">/</span>
        <span>{b.public_ref}</span>
      </nav>

      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">{service?.name_en}</h1>
          <p className="text-xs text-text-muted">Ref {b.public_ref} · {b.invoice_number ?? 'No invoice yet'}</p>
        </div>
        <Chip variant={b.status === 'completed' ? 'success' : b.status === 'cancelled' ? 'danger' : 'accent'}>
          {b.status.replace('_', ' ')}
        </Chip>
      </header>

      <Card>
        <dl className="space-y-3">
          <div className="flex justify-between gap-4">
            <dt className="text-xs text-text-muted">When</dt>
            <dd className="text-sm text-text text-end">
              {new Date(b.start_at).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', dateStyle: 'full', timeStyle: 'short' })} · Dubai
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-xs text-text-muted">Where</dt>
            <dd className="text-sm text-text text-end">
              {address?.label}: {address?.line1}{address?.line2 ? `, ${address.line2}` : ''}, {address?.city}
            </dd>
          </div>
          {b.special_instructions && (
            <div className="flex justify-between gap-4">
              <dt className="text-xs text-text-muted">Instructions</dt>
              <dd className="text-sm text-text text-end whitespace-pre-wrap">{b.special_instructions}</dd>
            </div>
          )}
        </dl>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-text mb-2">Price</h2>
        <PriceBreakdown lines={lines} subtotal_fils={b.subtotal_fils}
          service_fee_fils={b.service_fee_fils} vat_fils={b.vat_fils} total_fils={b.total_fils} />
      </Card>

      {b.invoice_number && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-text">Invoice {b.invoice_number}</div>
              <div className="text-xs text-text-muted">Paid · {fmtAED(b.total_fils)}</div>
            </div>
            <Link href="#" className="text-sm text-accent font-medium">Download PDF</Link>
          </div>
        </Card>
      )}
    </article>
  );
}
