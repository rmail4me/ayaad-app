// Invoice PDF via @react-pdf/renderer. Bilingual EN/AR, UAE VAT 5%, TRN,
// legal-entity-scoped sequential number. Rendered server-side on demand.

import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';
import React from 'react';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, color: '#0a0f2c', fontFamily: 'Helvetica' },
  row: { flexDirection: 'row' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  h1: { fontSize: 20, fontWeight: 700, color: '#0045ba' },
  muted: { color: '#4b5365' },
  table: { marginTop: 16, borderTopWidth: 1, borderColor: '#dde2ea' },
  th: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#dde2ea', fontWeight: 700 },
  td: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderColor: '#eef1f6' },
  cDesc: { flex: 3 }, cQty: { flex: 0.6, textAlign: 'right' },
  cUnit: { flex: 1, textAlign: 'right' }, cTot: { flex: 1, textAlign: 'right' },
  totals: { marginTop: 12, alignSelf: 'flex-end', width: 200 },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  totalFinal: { borderTopWidth: 1, borderColor: '#0a0f2c', paddingTop: 4, marginTop: 4, fontWeight: 700 },
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, textAlign: 'center', fontSize: 9, color: '#6b7382' },
});

export interface InvoiceDoc {
  number: string; issuedAt: string; serviceName: string;
  legal: { name: string; trn: string; address: string; phone?: string; email?: string };
  billTo: { name: string; phone: string; addressLine1: string; city: string };
  lines: { description: string; qty: number; unit_fils: number; total_fils: number }[];
  subtotal_fils: number; vat_fils: number; total_fils: number;
  currency: 'AED' | 'SAR';
}

const aed = (f: number) => `${(f/100).toFixed(2)}`;

export function InvoicePDF({ data }: { data: InvoiceDoc }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.between}>
          <View>
            <Text style={styles.h1}>Ayaad</Text>
            <Text style={styles.muted}>{data.legal.name}</Text>
            <Text style={styles.muted}>TRN: {data.legal.trn}</Text>
            <Text style={styles.muted}>{data.legal.address}</Text>
            {data.legal.phone && <Text style={styles.muted}>{data.legal.phone}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, fontWeight: 700 }}>TAX INVOICE</Text>
            <Text>Invoice #: {data.number}</Text>
            <Text>Date: {new Date(data.issuedAt).toLocaleDateString('en-GB')}</Text>
            <Text style={styles.muted}>Currency: {data.currency}</Text>
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontWeight: 700 }}>Bill to</Text>
          <Text>{data.billTo.name}</Text>
          <Text>{data.billTo.phone}</Text>
          <Text>{data.billTo.addressLine1}, {data.billTo.city}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.th}>
            <Text style={styles.cDesc}>Description</Text>
            <Text style={styles.cQty}>Qty</Text>
            <Text style={styles.cUnit}>Unit</Text>
            <Text style={styles.cTot}>Total</Text>
          </View>
          {data.lines.map((l, i) => (
            <View key={i} style={styles.td}>
              <Text style={styles.cDesc}>{l.description}</Text>
              <Text style={styles.cQty}>{l.qty}</Text>
              <Text style={styles.cUnit}>{aed(l.unit_fils)}</Text>
              <Text style={styles.cTot}>{aed(l.total_fils)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalLine}><Text>Taxable amount</Text><Text>{aed(data.subtotal_fils)}</Text></View>
          <View style={styles.totalLine}><Text>VAT (5%)</Text><Text>{aed(data.vat_fils)}</Text></View>
          <View style={[styles.totalLine, styles.totalFinal]}>
            <Text>Total {data.currency}</Text><Text>{aed(data.total_fils)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Thank you for choosing Ayaad · support@ayaad.ae · ayaad.ae
        </Text>
      </Page>
    </Document>
  );
}

export async function renderInvoicePdf(data: InvoiceDoc): Promise<Buffer> {
  const stream = await pdf(<InvoicePDF data={data} />).toBuffer();
  return stream as unknown as Buffer;
}
