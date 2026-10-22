'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Empty, StickyActions } from '@/ui/Card';
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

  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setGeoErr("Geolocation isn't supported on this browser."); return; }
    setGeoBusy(true); setGeoErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoBusy(false);
      },
      (err) => {
        setGeoErr(err.message || 'Location unavailable. You can skip it.');
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

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
      if (geo) { fd.set('lat', String(geo.lat)); fd.set('lng', String(geo.lng)); }
      const res = await saveAddressAction(fd);
      if (!res.ok) throw new Error(res.error);
      persist(res.id);
    } catch (e: any) {
      setErr(e.message ?? 'Could not save address');
      setSaving(false);
    }
  };

  const addrLabel = (a: Address) => [
    a.building_name,
    a.unit_number,
    a.block ? `Block ${a.block}` : null,
    a.line1,
  ].filter(Boolean).join(', ');

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
                    <span className="block text-sm text-text-muted">{addrLabel(a)}, {a.city}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <StickyActions>
            <div className="flex gap-2">
              <Button variant="secondary" fullWidth onClick={() => setAdding(true)}>Add another</Button>
              <Button fullWidth onClick={() => persist(picked)} disabled={!picked}>Use this address</Button>
            </div>
          </StickyActions>
        </>
      )}

      {(adding || existing.length === 0) && (
        <form action={submitNew} className="space-y-4">
          {existing.length === 0 && (
            <Empty title="No saved addresses yet" body="Add your first address below." />
          )}

          <Input label="Label" name="label" placeholder="Home, Head office, Site A" required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Building / Villa name" name="building_name" placeholder="Al Habtoor Tower / Villa 42" required />
            <Input label="Apartment / Villa number" name="unit_number" placeholder="1402 / Villa 42" required />
          </div>
          <Input label="Block / Plot (optional)" name="block" placeholder="Block B / Plot 17" />
          <Input label="Street / Area" name="line1" placeholder="Business Bay / Al Barsha / JVC" required />
          <Input label="Landmark (optional)" name="line2" placeholder="Opposite Dubai Mall metro exit 4" />
          <Input label="City" name="city" required defaultValue="Dubai" />

          <div className="rounded-md border border-border bg-surface-raised p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-text flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-accent" aria-hidden /> Location on map
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {geo
                    ? `Captured: ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}`
                    : 'Helps the team arrive faster. Browser will ask for permission.'}
                </div>
              </div>
              <button type="button" onClick={useMyLocation} disabled={geoBusy}
                className="shrink-0 inline-flex items-center gap-1.5 h-10 px-3 rounded-md bg-accent-subtle text-accent text-sm font-medium hover:bg-accent/10">
                {geoBusy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> :
                 geo    ? <CheckCircle2 className="w-4 h-4" aria-hidden /> :
                          <MapPin className="w-4 h-4" aria-hidden />}
                {geo ? 'Captured — update' : 'Use my current location'}
              </button>
            </div>
            {geo && (
              <a
                href={`https://www.google.com/maps?q=${geo.lat},${geo.lng}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-block text-xs text-accent underline"
              >
                Preview on Google Maps ↗
              </a>
            )}
            {geoErr && <p className="text-xs text-danger">{geoErr}</p>}
          </div>

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

          <StickyActions>
            <div className="flex gap-2">
              {existing.length > 0 && (
                <Button variant="secondary" fullWidth type="button" onClick={() => setAdding(false)}>Cancel</Button>
              )}
              <Button type="submit" fullWidth loading={saving}>Save & continue</Button>
            </div>
          </StickyActions>
        </form>
      )}
    </div>
  );
}
