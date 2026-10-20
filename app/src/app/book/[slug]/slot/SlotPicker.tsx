'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Button } from '@/ui/Button';

const SLOT_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function dateKey(d: Date) { return d.toISOString().slice(0, 10); }

export function SlotPicker({ slug, duration_min }: { slug: string; duration_min: number }) {
  const router = useRouter();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [day, setDay]   = useState<string>(dateKey(addDays(today, 1)));
  const [hour, setHour] = useState<number | null>(null);

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);

  const confirm = () => {
    if (hour === null) return;
    const [y, m, d] = day.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, hour - 4, 0));
    const prev = document.cookie.split('; ').find(c => c.startsWith('ayaad_draft='))?.split('=')[1];
    const draft = prev ? JSON.parse(decodeURIComponent(prev)) : {};
    draft.start_at = dt.toISOString();
    draft.duration_min = duration_min;
    document.cookie = `ayaad_draft=${encodeURIComponent(JSON.stringify(draft))}; path=/; max-age=1800; samesite=lax`;
    router.push(`/book/${slug}/address` as any);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-text mb-2">Date</h2>
        <div className="flex gap-2 overflow-x-auto snap-x -mx-4 px-4 pb-1">
          {days.map(d => {
            const key = dateKey(d);
            const selected = day === key;
            return (
              <button key={key} onClick={() => setDay(key)} aria-pressed={selected}
                className={clsx(
                  'min-w-[72px] rounded-md p-2 text-center border snap-start shrink-0',
                  selected ? 'bg-accent text-on-accent border-accent' : 'bg-surface-raised text-text border-border',
                )}>
                <div className="text-xs uppercase">{d.toLocaleDateString('en-GB', { weekday: 'short' })}</div>
                <div className="text-lg font-semibold">{d.getDate()}</div>
                <div className="text-xs">{d.toLocaleDateString('en-GB', { month: 'short' })}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-text mb-2">Time</h2>
        <div className="grid grid-cols-3 gap-2">
          {SLOT_HOURS.map(h => {
            const label = `${h.toString().padStart(2, '0')}:00`;
            const selected = hour === h;
            return (
              <button key={h} aria-pressed={selected} onClick={() => setHour(h)}
                className={clsx(
                  'h-11 rounded-md border text-sm font-medium tabular-nums',
                  selected ? 'bg-accent text-on-accent border-accent' : 'bg-surface-raised text-text border-border hover:bg-surface',
                )}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <Button fullWidth size="lg" disabled={hour === null} onClick={confirm}>Continue</Button>
    </div>
  );
}
