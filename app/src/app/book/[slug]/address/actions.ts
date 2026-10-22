'use server';
import { addAddress, getCurrentUser } from '@/lib/data';

export async function saveAddressAction(fd: FormData):
  Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: 'Not signed in' };
    const toNum = (v: FormDataEntryValue | null) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const a = await addAddress({
      user_id: user.id,
      label: String(fd.get('label') ?? 'Home'),
      building_name: (fd.get('building_name') as string | null) || null,
      unit_number:   (fd.get('unit_number')   as string | null) || null,
      block:         (fd.get('block')         as string | null) || null,
      line1: String(fd.get('line1') ?? ''),
      line2: (fd.get('line2') as string | null) || null,
      city:  String(fd.get('city')  ?? 'Dubai'),
      emirate_or_region: null,
      country: user.country,
      lat: toNum(fd.get('lat')),
      lng: toNum(fd.get('lng')),
      access_method: fd.get('access_method') as any,
      access_notes: null,
      pets: fd.get('pets') === 'true',
      is_default: true,
    });
    return { ok: true, id: a.id };
  } catch (e: any) {
    return { ok: false, error: e.message ?? 'Could not save' };
  }
}
