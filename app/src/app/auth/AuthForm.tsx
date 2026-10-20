'use client';
import { useState } from 'react';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { requestLoginAction } from './actions';

export function AuthForm({ nextUrl }: { nextUrl: string }) {
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<'enter' | 'sent'>('enter');
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState<string | null>(null);

  const send = async () => {
    setBusy(true); setErr(null);
    const res = await requestLoginAction(email, nextUrl);
    if (!res.ok) { setErr(res.error); setBusy(false); return; }
    setStage('sent'); setBusy(false);
  };

  if (stage === 'sent') {
    return (
      <div className="space-y-4 text-center">
        <h2 className="text-lg font-semibold text-text">Check your inbox</h2>
        <p className="text-sm text-text-muted">
          We sent a sign-in link to <span className="font-semibold text-text">{email}</span>.
          Click it on this device to continue.
        </p>
        <p className="text-xs text-text-muted">The link is good for 15 minutes.</p>
        <button className="text-sm text-accent font-medium" onClick={() => setStage('enter')}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={e => { e.preventDefault(); send(); }} className="space-y-4">
      <Input
        label="Work email"
        type="email"
        name="email"
        inputMode="email"
        autoComplete="email"
        placeholder="you@yourcompany.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      {err && <p className="text-sm text-danger" role="alert">{err}</p>}
      <Button type="submit" fullWidth size="lg" loading={busy} disabled={!/.+@.+\..+/.test(email)}>
        Email me a sign-in link
      </Button>
      <p className="text-xs text-text-muted text-center">
        For corporate customers only. First time? We&apos;ll create your account automatically.
      </p>
    </form>
  );
}
