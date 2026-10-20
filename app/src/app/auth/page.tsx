// S10 — Phone + OTP auth gate
import { AuthForm } from './AuthForm';

export default async function AuthPage({
  searchParams,
}: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="max-w-sm mx-auto space-y-6 pt-6">
      <header className="text-center">
        <h1 className="text-2xl font-bold text-text">Sign in to Ayaad</h1>
        <p className="mt-2 text-sm text-text-muted">We&apos;ll email you a secure sign-in link.</p>
      </header>
      {error && (
        <div role="alert" className="rounded-md bg-danger-subtle text-danger p-3 text-sm">
          {error}
        </div>
      )}
      <AuthForm nextUrl={next || '/'} />
    </div>
  );
}
