import clsx from 'clsx';
import type { HTMLAttributes } from 'react';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('rounded-lg bg-surface-raised shadow-card p-4', className)} {...rest} />;
}

export function Chip({
  children, variant = 'neutral', className,
}: { children: React.ReactNode; variant?: 'neutral' | 'accent' | 'accent-2' | 'success' | 'warning' | 'danger'; className?: string }) {
  const styles = {
    neutral:    'bg-surface-muted text-text',
    accent:     'bg-accent-subtle text-accent',
    'accent-2': 'bg-accent-2 text-on-accent-2',
    success:    'bg-success-subtle text-success',
    warning:    'bg-warning-subtle text-warning',
    danger:     'bg-danger-subtle text-danger',
  }[variant];
  return (
    <span className={clsx('inline-flex items-center px-2 h-7 rounded-sm text-xs font-medium', styles, className)}>
      {children}
    </span>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Booking steps" className="flex items-center gap-2 w-full">
      {steps.map((s, i) => {
        const done = i < current;
        const now  = i === current;
        return (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              aria-current={now ? 'step' : undefined}
              className={clsx(
                'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0',
                done && 'bg-accent text-on-accent',
                now && 'bg-accent-subtle text-accent border-2 border-accent',
                !done && !now && 'bg-surface-muted text-text-muted',
              )}
            >
              {done ? '✓' : i + 1}
            </div>
            <span className={clsx('text-sm truncate', now ? 'text-text font-semibold' : 'text-text-muted')}>{s}</span>
            {i < steps.length - 1 && <div className="h-px flex-1 bg-border mx-1" />}
          </div>
        );
      })}
    </nav>
  );
}

export function StickyActions({ children }: { children: React.ReactNode }) {
  // Mobile: sticky bar hovering above the fixed bottom nav. Desktop: inline.
  return (
    <div className={clsx(
      'sticky bottom-[calc(var(--bottom-nav)+env(safe-area-inset-bottom)+0.5rem)]',
      'md:static -mx-4 md:mx-0 px-4 md:px-0 py-3 md:py-0',
      'bg-bg/95 md:bg-transparent backdrop-blur-sm md:backdrop-blur-0',
      'border-t md:border-0 border-border',
    )}>
      {children}
    </div>
  );
}

export function Empty({
  title, body, action,
}: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="text-center py-12 px-6">
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      {body && <p className="mt-2 text-sm text-text-muted">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function PriceBreakdown({
  lines, subtotal_fils, service_fee_fils, vat_fils, total_fils, mode = 'summary',
}: {
  lines: { label: string; qty: number; line_fils: number }[];
  subtotal_fils: number; service_fee_fils: number; vat_fils: number; total_fils: number;
  mode?: 'summary' | 'full';
}) {
  const row = (label: string, fils: number, strong = false) => (
    <div className={clsx('flex justify-between text-sm py-1', strong && 'font-semibold text-base pt-3 border-t border-border mt-1')}>
      <span className={strong ? 'text-text' : 'text-text-muted'}>{label}</span>
      <span className="text-text tabular-nums">AED {(fils / 100).toFixed(2)}</span>
    </div>
  );
  return (
    <div className="space-y-0">
      {lines.map((l, i) => (
        <div key={i} className="flex justify-between text-sm py-1">
          <span className="text-text-muted">{l.label}{l.qty > 1 ? ` × ${l.qty}` : ''}</span>
          <span className="text-text tabular-nums">AED {(l.line_fils / 100).toFixed(2)}</span>
        </div>
      ))}
      {mode === 'full' && (
        <>
          {row('Taxable amount (ex-VAT)', subtotal_fils)}
          {service_fee_fils > 0 && row('Service fee', service_fee_fils)}
          {row('VAT (5%)', vat_fils)}
        </>
      )}
      {row(mode === 'summary' ? 'Total (incl. 5% VAT)' : 'Total', total_fils, true)}
    </div>
  );
}
