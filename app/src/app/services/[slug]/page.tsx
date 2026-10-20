// S04 — Service landing
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Chip } from '@/ui/Card';
import { getService, getTiers } from '@/lib/data';
import { fmtAED } from '@/lib/pricing';

export default async function ServiceLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) notFound();
  const tiers = await getTiers(service.id);
  const from = tiers.length ? Math.min(...tiers.map(t => t.price_fils)) : service.base_price_fils ?? 0;

  return (
    <article className="max-w-prose">
      <nav aria-label="Breadcrumb" className="text-sm text-text-muted mb-4">
        <Link href="/" className="hover:text-accent">Services</Link>
        <span className="mx-2">/</span>
        <span>{service.name_en}</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-text">{service.name_en}</h1>
        <div className="mt-2 flex items-center gap-2 text-sm">
          {service.pricing_model === 'quote' ? (
            <Chip variant="accent">Quote on request</Chip>
          ) : (
            <>
              <span className="text-text-muted">From</span>
              <span className="font-semibold text-text">{fmtAED(from)}</span>
              {service.pricing_model === 'per_unit'    && <span className="text-text-muted">per unit</span>}
              {service.pricing_model === 'tier_bedroom' && <span className="text-text-muted">per home</span>}
              {service.pricing_model === 'per_visit'   && <span className="text-text-muted">per visit</span>}
            </>
          )}
          {service.duration_estimate_min && (
            <span className="text-text-muted">· ~{service.duration_estimate_min} min</span>
          )}
        </div>
      </header>

      <section className="space-y-4 mb-8">
        <div>
          <h2 className="text-sm font-semibold text-text mb-2">What&apos;s included</h2>
          <ul className="space-y-1.5">
            {service.inclusions_en.map(i => (
              <li key={i} className="flex items-start gap-2 text-sm text-text">
                <Check className="w-4 h-4 text-success mt-0.5 shrink-0" aria-hidden />{i}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text mb-2">Not included</h2>
          <ul className="space-y-1.5">
            {service.exclusions_en.map(i => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                <X className="w-4 h-4 text-text-subtle mt-0.5 shrink-0" aria-hidden />{i}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Link href={`/book/${service.slug}/service` as any}
            className="inline-flex items-center justify-center w-full md:w-auto px-6 h-13 rounded-md bg-accent text-on-accent font-semibold hover:bg-accent-hover">
        Book now
      </Link>

      <p className="mt-4 text-xs text-text-muted">
        Free cancellation up to {service.cancellation_window_hours}h before start.
      </p>
    </article>
  );
}
