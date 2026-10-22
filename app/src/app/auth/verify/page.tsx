// Magic-link verify.
// GET: just render a "Continue" button; never consume the token.
// POST (triggered by button): completeLogin + set cookie + redirect.
// If already signed in, skip the button and go straight home.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/data';
import { ConfirmForm } from './ConfirmForm';

export default async function VerifyPage({
  searchParams,
}: { searchParams: Promise<{ t?: string; next?: string }> }) {
  const { t, next } = await searchParams;

  // If the person already has a valid session, skip the Continue step
  const user = await getCurrentUser();
  if (user) {
    const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
    redirect(safeNext as any);
  }

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
        One tap to complete sign-in. Please wait after you press — our database is in Seoul and
        it takes a couple of seconds.
      </p>
      <ConfirmForm token={t} next={next || '/'} />
      <p className="text-xs text-text-muted">
        Single-use link. Expires 24 hours after it was generated.
      </p>
    </div>
  );
}
