/**
 * t83: Excel (.xlsx) export of invoices (exceljs, loaded on demand so it stays out of the main bundle).
 */
import type { InvoicePrintPayload, InvoicePrintStudy } from '@/lib/invoice-print';

type Row = Record<string, unknown>;

function safe(s: string): string {
  return (s || 'invoice').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(0, 80);
}

async function saveWorkbook(wb: import('exceljs').Workbook, filename: string) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function styleHeader(row: import('exceljs').Row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
    c.alignment = { vertical: 'middle' };
  });
}

/** One invoice with its line items (optionally only one service day). */
export async function exportInvoiceExcel(
  invoice: Omit<InvoicePrintPayload, 'withLetterhead' | 'letterheadUrl'> & { recheckLines?: InvoicePrintStudy[]; includeRecheck?: boolean }
) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = invoice.issuerName || 'Radionline';
  const ws = wb.addWorksheet('Invoice');
  let lines: InvoicePrintStudy[] = invoice.lineItems?.length
    ? invoice.lineItems
    : (invoice.byDay || []).flatMap((d) => d.studies || []);
  if (invoice.serviceDate) lines = lines.filter((l) => l.serviceDate === invoice.serviceDate);
  const total = lines.reduce((s, l) => s + Number(l.amount || 0), 0);

  const meta: [string, string | number][] = [
    ['Invoice', invoice.id],
    [invoice.partyType === 'doctor' ? 'Doctor' : 'Centre', invoice.partyName],
    ['Billing month', invoice.billingPeriod],
    ...(invoice.serviceDate ? ([['Service day', invoice.serviceDate]] as [string, string][]) : []),
    ['Status', String(invoice.status || '').toUpperCase()],
    ['Total (INR)', total],
  ];
  if (invoice.partyType === 'doctor' && invoice.recheckLines?.length) {
    meta.push(['Recheck amount', invoice.includeRecheck ? 'Included' : 'Not included']);
  }
  meta.forEach(([k, v]) => {
    const r = ws.addRow([k, v]);
    r.getCell(1).font = { bold: true };
  });
  ws.addRow([]);

  const cols = ['Service date', 'Patient', 'Body part', 'Modality', 'Study #', 'Centre', 'Description', 'Amount (INR)'];
  styleHeader(ws.addRow(cols));
  for (const l of lines) {
    ws.addRow([
      l.serviceDate || '',
      l.patientName || '',
      l.bodyPart || '',
      l.modality || '',
      l.studyIndex ?? '',
      l.centerName || '',
      l.description || '',
      Number(l.amount || 0),
    ]);
  }
  const tr = ws.addRow(['', '', '', '', '', '', 'Total', total]);
  tr.font = { bold: true };
  [14, 24, 22, 12, 8, 22, 40, 14].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.getColumn(8).numFmt = '#,##0';

  const scope = invoice.serviceDate ? invoice.serviceDate : invoice.billingPeriod;
  await saveWorkbook(wb, `invoice-${safe(invoice.partyName)}-${safe(scope)}.xlsx`);
}

/** The invoice list currently shown (one row per invoice). */
export async function exportInvoiceListExcel(rows: Row[], label: string) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Invoices');
  styleHeader(ws.addRow(['Party', 'Type', 'Billing month', 'Total (INR)', 'Status', 'Locked', 'Invoice ID']));
  let sum = 0;
  for (const r of rows) {
    const amt = Number(r.totalAmount || 0);
    sum += amt;
    ws.addRow([
      String(r.partyName || ''),
      r.partyType === 'doctor' ? 'Doctor' : 'Centre',
      String(r.billingPeriod || ''),
      amt,
      String(r.status || '').toUpperCase(),
      r.locked ? 'Yes' : 'No',
      String(r.id || ''),
    ]);
  }
  const tr = ws.addRow(['Total', '', '', sum]);
  tr.font = { bold: true };
  [28, 10, 14, 14, 12, 8, 36].forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.getColumn(4).numFmt = '#,##0';
  await saveWorkbook(wb, `invoices-${safe(label)}.xlsx`);
}
