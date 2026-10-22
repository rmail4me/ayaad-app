// Serve the invoice PDF to the customer who owns it (or any user in the same company).
// GET /api/invoices/<id>/pdf  → application/pdf download

import { NextResponse, type NextRequest } from 'next/server';
import { and, eq, or } from 'drizzle-orm';
import { db, schema } from '@/db/client';
import { getCurrentUser } from '@/lib/data';
import { renderInvoicePdf } from '@/lib/pdf/invoice';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  // Fetch invoice; access = owner user_id OR same company as the booking
  const [row] = await db.select().from(schema.invoices).where(eq(schema.invoices.id, id)).limit(1);
  if (!row) return new NextResponse('Not found', { status: 404 });

  // Access check
  if (row.userId !== user.id) {
    const [b] = await db.select({ companyId: schema.bookings.companyId })
      .from(schema.bookings).where(eq(schema.bookings.id, row.bookingId)).limit(1);
    if (!b || !b.companyId || b.companyId !== user.company_id) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  // Gather data for the PDF
  const [b]     = await db.select().from(schema.bookings).where(eq(schema.bookings.id, row.bookingId)).limit(1);
  const [bUser] = await db.select().from(schema.users).where(eq(schema.users.id, row.userId)).limit(1);
  const [legal] = await db.select().from(schema.legalEntities).where(eq(schema.legalEntities.id, row.legalEntityId)).limit(1);
  const [addr]  = await db.select().from(schema.addresses).where(eq(schema.addresses.id, b!.addressId)).limit(1);
  const [svc]   = await db.select().from(schema.services).where(eq(schema.services.id, b!.serviceId)).limit(1);
  const [co]    = b!.companyId
    ? await db.select().from(schema.companies).where(eq(schema.companies.id, b!.companyId)).limit(1)
    : [null as any];
  const lines   = await db.select().from(schema.invoiceLines).where(eq(schema.invoiceLines.invoiceId, id));

  const number = `${legal!.invoicePrefix}-${row.seqScope}-${String(row.number).padStart(6, '0')}`;

  const pdf = await renderInvoicePdf({
    number,
    issuedAt: (row.issuedAt as Date).toISOString(),
    serviceName: svc!.nameEn,
    legal: {
      name: legal!.name, trn: legal!.trn,
      address: `${legal!.addressLine1}, ${legal!.city}`,
      phone: legal!.phone ?? undefined, email: legal!.email ?? undefined,
    },
    billTo: {
      name: co?.nameEn ?? bUser?.fullName ?? 'Customer',
      phone: bUser?.email ?? bUser?.phone ?? '',
      addressLine1: addr!.line1,
      city: addr!.city,
    },
    lines: lines.map(l => ({
      description: l.descriptionEn, qty: l.qty,
      unit_fils: Number(l.unitPriceFils), total_fils: Number(l.lineTotalFils),
    })),
    subtotal_fils: Number(row.subtotalFils),
    vat_fils:      Number(row.vatFils),
    total_fils:    Number(row.totalFils),
    currency:      row.currency as any,
  });

  return new NextResponse(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${number}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
