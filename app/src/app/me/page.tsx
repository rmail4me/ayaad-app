// Profile / company balance page
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, Chip, Empty } from '@/ui/Card';
import { getCurrentUser, getMyCompany } from '@/lib/data';
import { logoutAction } from './actions';
import { TopupPanel } from './TopupPanel';
import { fmtAED } from '@/lib/pricing';

export default async function MePage({
  searchParams,
}: { searchParams: Promise<{ topup?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth?next=/me');
  const company = await getMyCompany();
  const { topup } = await searchParams;

  return (
    <div className="max-w-prose mx-auto space-y-4">
      <h1 className="text-xl font-bold text-text">Account</h1>

      {topup === 'success' && (
        <div className="rounded-md bg-success-subtle text-success p-3 text-sm" role="status">
          Top-up received. Your balance has been credited.
        </div>
      )}
      {topup === 'cancel' && (
        <div className="rounded-md bg-warning-subtle text-warning p-3 text-sm" role="status">
          Top-up cancelled. No charge was made.
        </div>
      )}

      <Card>
        <h2 className="text-sm font-semibold text-text mb-3">You</h2>
        <dl className="text-sm space-y-2">
          <div className="flex justify-between"><dt className="text-text-muted">Email</dt><dd>{user.email ?? '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-text-muted">Name</dt><dd>{user.full_name ?? '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-text-muted">Role</dt><dd className="capitalize">{user.role}</dd></div>
        </dl>
      </Card>

      {company ? (
        <Card>
          <h2 className="text-sm font-semibold text-text mb-3">Company</h2>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-text-muted">Name</dt><dd>{company.name_en}</dd></div>
            {company.trn && <div className="flex justify-between"><dt className="text-text-muted">TRN</dt><dd className="tabular-nums">{company.trn}</dd></div>}
            {company.address_line1 && <div className="flex justify-between"><dt className="text-text-muted">Address</dt><dd className="text-end">{company.address_line1}, {company.city}</dd></div>}
          </dl>
          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <span className="text-sm text-text-muted">Prepaid balance</span>
            <span className="text-lg font-bold text-accent">{fmtAED(company.prepaid_balance_fils)}</span>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Need to top up? Use the panel below (card) — balance is credited the moment Stripe confirms.
          </p>
        </Card>
      ) : (
        <Empty title="No company linked"
               body="Your account is not yet linked to a company. Reach out to ops to connect it for prepaid billing."
               action={<Link href="mailto:support@ayaad.ae" className="text-accent font-medium">Contact ops</Link>} />
      )}

      {company && <TopupPanel companyName={company.name_en} />}

      <form action={logoutAction}>
        <button type="submit" className="w-full h-11 rounded-md bg-surface-raised border border-border text-text text-sm font-medium hover:bg-danger-subtle hover:text-danger hover:border-danger">
          Sign out
        </button>
      </form>
    </div>
  );
}
