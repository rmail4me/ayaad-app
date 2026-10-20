// S15 — Bookings list
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, Chip, Empty } from '@/ui/Card';
import { getCurrentUser, listMyBookings, listServices } from '@/lib/data';
import { fmtAED } from '@/lib/pricing';
import type { BookingStatus } from '@/lib/types';

const STATUS_CHIP: Record<BookingStatus, { label: string; variant: Parameters<typeof Chip>[0]['variant'] }> = {
  draft:           { label: 'Draft',           variant: 'neutral' },
  pending_payment: { label: 'Pending payment', variant: 'warning' },
  paid:            { label: 'Confirmed',       variant: 'accent' },
  matched:         { label: 'Team assigned',   variant: 'accent' },
  in_progress:     { label: 'In progress',     variant: 'warning' },
  completed:       { label: 'Completed',       variant: 'success' },
  cancelled:       { label: 'Cancelled',       variant: 'danger' },
  no_show:         { label: 'No show',         variant: 'danger' },
  expired:         { label: 'Expired',         variant: 'neutral' },
};

export default async function BookingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth?next=/bookings');
  const [bookings, services] = await Promise.all([ listMyBookings(user.id), listServices() ]);
  const byId = new Map(services.map(s => [s.id, s]));

  if (bookings.length === 0) {
    return (
      <Empty title="No bookings yet"
             body="Pick a service to make your first booking."
             action={<Link href="/" className="inline-flex items-center justify-center h-11 px-4 rounded-md bg-accent text-on-accent font-medium">Browse services</Link>} />
    );
  }

  return (
    <section className="max-w-prose mx-auto space-y-4">
      <h1 className="text-xl font-bold text-text">Your bookings</h1>
      <ul className="space-y-3">
        {bookings.map(b => {
          const s = byId.get(b.service_id);
          const chip = STATUS_CHIP[b.status];
          return (
            <li key={b.id}>
              <Link href={`/bookings/${b.id}` as any} className="block focus:outline-none focus-visible:shadow-focus rounded-lg">
                <Card className="hover:shadow-pop transition-shadow duration-fast">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-text">{s?.name_en ?? 'Service'}</div>
                      <div className="text-xs text-text-muted mt-0.5">
                        {new Date(b.start_at).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                      <div className="text-xs text-text-muted">Ref {b.public_ref}</div>
                    </div>
                    <div className="text-end shrink-0">
                      <Chip variant={chip.variant}>{chip.label}</Chip>
                      <div className="text-sm font-semibold text-text mt-1">{fmtAED(b.total_fils)}</div>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
