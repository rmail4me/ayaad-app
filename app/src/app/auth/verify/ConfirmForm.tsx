'use client';
import { useFormStatus } from 'react-dom';
import { Button } from '@/ui/Button';
import { confirmLoginAction } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" fullWidth size="lg" loading={pending} disabled={pending}>
      {pending ? 'Signing you in…' : 'Continue to Ayaad'}
    </Button>
  );
}

export function ConfirmForm({ token, next }: { token: string; next: string }) {
  return (
    <form action={confirmLoginAction}>
      <input type="hidden" name="t" value={token} />
      <input type="hidden" name="next" value={next} />
      <SubmitButton />
    </form>
  );
}
