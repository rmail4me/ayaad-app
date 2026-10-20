'use server';
import { addAddress, getCurrentUser } from '@/lib/data';

export async function saveAddressAction(fd: FormData):
  Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: 'Not signed in' };
    const a = await addAddress({
      user_id: user.id,
      label: String(fd.get('label') ?? 'Home'),
      line1: String(fd.get('line1') ?? ''),
      line2: (fd.get('line2') ?? null) as string | null,
      city:  String(fd.get('city')  ?? 'Dubai'),
      emirate_or_region: null,
      country: user.country,
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
