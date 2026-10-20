'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Empty } from '@/ui/Card';
import { saveAddressAction } from './actions';
import type { Address } from '@/lib/types';

const ACCESS = [
  { k: 'home_present',       label: "I'll be home" },
  { k: 'key_with_security',  label: 'Key with security' },
  { k: 'under_mat',          label: 'Under the mat' },
  { k: 'unlocked',           label: "Door unlocked" },
] as const;

export function AddressForm({ slug, existing }: { slug: string; existing: Address[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<string>(existing.find(a => a.is_default)?.id ?? existing[0]?.id ?? '');
  const [adding, setAdding] = useState(existing.length === 0);
  const [access, setAccess] = useState<Address['access_method']>('home_present');
  const [pets,   setPets]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const persist = (addrId: string) => {
    const prev = document.cookie.split('; ').find(c => c.startsWith('ayaad_draft='))?.split('=')[1];
    const draft = prev ? JSON.parse(decodeURIComponent(prev)) : {};
    draft.address_id = addrId;
    document.cookie = `ayaad_draft=${encodeURIComponent(JSON.stringify(draft))}; path=/; max-age=1800; samesite=lax`;
    router.push(`/book/${slug}/pay` as any);
  };

  const submitNew = async (fd: FormData) => {
    setSaving(true); setErr(null);
    try {
      fd.set('access_method', access);
      fd.set('pets', String(pets));
      const res = await saveAddressAction(fd);
      if (!res.ok) throw new Error(res.error);
      persist(res.id);
    } catch (e: any) {
      setErr(e.message ?? 'Could not save address');
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {existing.length > 0 && !adding && (
        <>
          <ul className="space-y-2" role="radiogroup" aria-label="Saved addresses">
            {existing.map(a => (
              <li key={a.id}>
                <label className={clsx(
                  'flex items-start gap-3 rounded-md p-3 border cursor-pointer',
                  picked === a.id ? 'bg-accent-subtle border-accent' : 'bg-surface-raised border-border',
                )}>
                  <input type="radio" name="addr" checked={picked === a.id} onChange={() => setPicked(a.id)} className="mt-1" />
                  <span>
                    <span className="block text-sm font-semibold text-text">{a.label}</span>
                    <span className="block text-sm text-text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setAdding(true)}>Add another address</Button>
            <Button onClick={() => persist(picked)} disabled={!picked}>Use this address</Button>
          </div>
        </>
      )}

      {(adding || existing.length === 0) && (
        <form action={submitNew} className="space-y-4">
          {existing.length === 0 && (
            <Empty title="No saved addresses yet" body="Add your first address below." />
          )}
          <Input label="Label" name="label" placeholder="Home, Office, Apartment 302" required />
          <Input label="Address line 1" name="line1" required />
          <Input label="Address line 2" name="line2" placeholder="Apt, villa, floor" />
          <Input label="City" name="city" required defaultValue="Dubai" />

          <fieldset>
            <legend className="mb-1.5 block text-sm font-medium text-text">How will the team get in?</legend>
            <div className="grid grid-cols-2 gap-2">
              {ACCESS.map(({ k, label }) => (
                <button key={k} type="button" onClick={() => setAccess(k)}
                  aria-pressed={access === k}
                  className={clsx(
                    'rounded-md border px-3 h-11 text-sm font-medium text-start',
                    access === k ? 'bg-accent-subtle border-accent text-accent' : 'bg-surface-raised border-border text-text',
                  )}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pets} onChange={e => setPets(e.target.checked)} />
            Pets at home
          </label>

          {err && <p className="text-sm text-danger" role="alert">{err}</p>}

          <div className="flex gap-2">
            {existing.length > 0 && <Button variant="secondary" type="button" onClick={() => setAdding(false)}>Cancel</Button>}
            <Button type="submit" loading={saving}>Save & continue</Button>
          </div>
        </form>
      )}
    </div>
  );
}
