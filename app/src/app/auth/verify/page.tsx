// Magic-link verify — GET renders a "Confirm sign-in" button; actual token
// consume happens on the POST (server action). This defeats WhatsApp /
// iMessage / Slack link-preview bots that would otherwise burn the
// single-use token before the human even clicks.
import Link from 'next/link';
import { Button } from '@/ui/Button';
import { confirmLoginAction } from '../actions';

export default async function VerifyPage({
  searchParams,
}: { searchParams: Promise<{ t?: string; next?: string }> }) {
  const { t, next } = await searchParams;

  if (!t) {
    return (
      <div className="max-w-sm mx-auto space-y-4 pt-10 text-center">
        <h1 className="text-xl font-bold text-text">Link is incomplete</h1>
        <p className="text-sm text-text-muted">The sign-in link is missing a token. Request a new one.</p>
        <Link href="/auth" className="inline-flex items-center h-11 px-4 rounded-md bg-accent text-on-accent font-medium">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto space-y-6 pt-10 text-center">
      <h1 className="text-xl font-bold text-text">Confirm sign-in</h1>
      <p className="text-sm text-text-muted">
        You&apos;re one tap away. We&apos;ll complete sign-in and take you to your dashboard.
      </p>
      <form action={confirmLoginAction}>
        <input type="hidden" name="t" value={t} />
        <input type="hidden" name="next" value={next || '/'} />
        <Button type="submit" fullWidth size="lg">Continue to Ayaad</Button>
      </form>
      <p className="text-xs text-text-muted">
        Single-use link. Expires 24 hours after it was generated.
      </p>
    </div>
  );
}
