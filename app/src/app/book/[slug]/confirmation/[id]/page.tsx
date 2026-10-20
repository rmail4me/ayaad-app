// S09 — Order confirmation
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/ui/Button';
import { Chip } from '@/ui/Card';
import { getBooking, getAddress, listServices } from '@/lib/data';
import { fmtAED } from '@/lib/pricing';

export default async function ConfirmationPage({
  params,
}: { params: Promise<{ slug: string; id: string }> }) {
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) notFound();
  const [services, address] = await Promise.all([ listServices(), getAddress(booking.address_id) ]);
  const service = services.find(s => s.id === booking.service_id);
  return (
    <article className="max-w-prose mx-auto text-center space-y-6">
      <div className="flex justify-center">
        <CheckCircle2 className="w-16 h-16 text-success" aria-hidden />
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-text">Booking confirmed</h1>
      <p className="text-text-muted">
        Booking reference <span className="font-semibold tabular-nums">{booking.public_ref}</span>.
        We&apos;ll notify you when a team is on the way.
      </p>

      <dl className="text-start space-y-3 bg-surface-raised border border-border rounded-md p-4">
        <div className="flex justify-between gap-4">
          <dt className="text-xs text-text-muted">Service</dt>
          <dd className="text-sm text-text">{service?.name_en}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-xs text-text-muted">When</dt>
          <dd className="text-sm text-text">
            {new Date(booking.start_at).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', dateStyle: 'medium', timeStyle: 'short' })}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-xs text-text-muted">Where</dt>
          <dd className="text-sm text-text text-end">{address?.line1}, {address?.city}</dd>
        </div>
        <div className="flex justify-between gap-4 pt-3 border-t border-border">
          <dt className="text-sm font-semibold text-text">Total paid</dt>
          <dd className="text-sm font-semibold text-text">{fmtAED(booking.total_fils)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-xs text-text-muted">Invoice</dt>
          <dd><Chip variant="success">{booking.invoice_number}</Chip></dd>
        </div>
      </dl>

      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link href={`/bookings/${booking.id}` as any}
              className="inline-flex items-center justify-center h-11 px-4 rounded-md bg-accent text-on-accent font-medium hover:bg-accent-hover">
          View booking
        </Link>
        <Link href="/" className="inline-flex items-center justify-center h-11 px-4 rounded-md bg-surface border border-border text-text font-medium hover:bg-surface-muted">
          Back home
        </Link>
      </div>
    </article>
  );
}
