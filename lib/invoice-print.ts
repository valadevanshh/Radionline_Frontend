/** Monthly invoice print / download (with or without letterhead). */

export type InvoicePrintStudy = {
  id?: string;
  serviceDate?: string;
  patientName?: string;
  bodyPart?: string;
  modality?: string;
  studyIndex?: number;
  amount?: number;
  description?: string;
  centerName?: string;
};

export type InvoicePrintDay = {
  serviceDate: string;
  dayTotal: number;
  studies: InvoicePrintStudy[];
};

export type InvoicePrintPayload = {
  id: string;
  partyType: string;
  partyName: string;
  billingPeriod: string;
  status: string;
  totalAmount: number;
  currency?: string;
  locked?: boolean;
  byDay?: InvoicePrintDay[];
  lineItems?: InvoicePrintStudy[];
  /** Restrict print to one service date (YYYY-MM-DD). Empty = full month. */
  serviceDate?: string | null;
  letterheadUrl?: string | null;
  withLetterhead: boolean;
  issuerName?: string;
};

export function currentBillingPeriodIST(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value ?? '0000';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  return `${y}-${m}`;
}

export function formatPeriodLabel(period: string): string {
  if (!period || period.length < 7) return period || '';
  const [y, m] = period.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inr(n: number): string {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function collectDays(payload: InvoicePrintPayload): InvoicePrintDay[] {
  let days = payload.byDay || [];
  if (!days.length && payload.lineItems?.length) {
    const map = new Map<string, InvoicePrintDay>();
    for (const li of payload.lineItems) {
      const day = li.serviceDate || 'unknown';
      if (!map.has(day)) map.set(day, { serviceDate: day, dayTotal: 0, studies: [] });
      const row = map.get(day)!;
      row.studies.push(li);
      row.dayTotal += Number(li.amount || 0);
    }
    days = Array.from(map.values()).sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));
  }
  if (payload.serviceDate) {
    days = days.filter((d) => d.serviceDate === payload.serviceDate);
  }
  return days;
}

export function buildInvoicePrintHtml(payload: InvoicePrintPayload): string {
  const days = collectDays(payload);
  const total = days.length
    ? days.reduce((s, d) => s + Number(d.dayTotal || 0), 0)
    : Number(payload.totalAmount || 0);
  const periodLabel = formatPeriodLabel(payload.billingPeriod);
  const scopeLabel = payload.serviceDate
    ? `Day invoice · ${payload.serviceDate}`
    : `Monthly invoice · ${periodLabel}`;
  const issued = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date());
  const issuer = payload.issuerName || 'Radionline';
  const status = (payload.status || 'pending').toUpperCase();
  const letterhead =
    payload.withLetterhead && payload.letterheadUrl
      ? `<div class="lh"><img src="${esc(payload.letterheadUrl)}" alt="Letterhead" /></div>`
      : payload.withLetterhead
        ? `<div class="lh-text">
            <div class="brand">${esc(issuer)}</div>
            <div class="brand-sub">Radiology Reporting · Billing Statement</div>
          </div>`
        : `<div class="lh-plain">
            <div class="brand">${esc(issuer)}</div>
            <div class="brand-sub">TAX / BILLING INVOICE</div>
          </div>`;

  const rows = days
    .flatMap((day) =>
      day.studies.map(
        (s, idx) => `<tr>
          <td>${esc(day.serviceDate)}</td>
          <td>${esc(s.patientName || '—')}</td>
          <td>${esc([s.bodyPart, s.modality].filter(Boolean).join(' · ') || s.description || 'Study')}</td>
          <td class="num">${esc(s.studyIndex != null ? `#${s.studyIndex}` : idx + 1)}</td>
          <td class="num">${esc(inr(Number(s.amount || 0)))}</td>
        </tr>`
      )
    )
    .join('');

  const daySummary = days
    .map(
      (d) => `<tr class="sum-row">
        <td colspan="4">${esc(d.serviceDate)} · ${d.studies.length} study${d.studies.length === 1 ? '' : 'ies'}</td>
        <td class="num">${esc(inr(d.dayTotal))}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Invoice ${esc(payload.id)} — ${esc(payload.billingPeriod)}</title>
<style>
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: "Segoe UI", system-ui, sans-serif;
    color: #0f172a; font-size: 11px; line-height: 1.45;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { max-width: 190mm; margin: 0 auto; }
  .lh img { width: 100%; max-height: 42mm; object-fit: contain; object-position: left center; display: block; }
  .lh-text, .lh-plain {
    border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px;
  }
  .lh { margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
  .brand { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
  .brand-sub { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 2px; }
  .meta { display: flex; justify-content: space-between; gap: 16px; margin: 14px 0 18px; }
  .meta h1 { margin: 0; font-size: 18px; font-weight: 800; }
  .meta .sub { color: #64748b; margin-top: 4px; }
  .badge {
    display: inline-block; padding: 3px 8px; border-radius: 4px;
    font-size: 10px; font-weight: 800; letter-spacing: 0.04em;
    border: 1px solid #cbd5e1; background: #f8fafc;
  }
  .badge.paid { color: #047857; border-color: #a7f3d0; background: #ecfdf5; }
  .badge.overdue { color: #b91c1c; border-color: #fecaca; background: #fef2f2; }
  .badge.pending { color: #b45309; border-color: #fde68a; background: #fffbeb; }
  .billto { margin-bottom: 14px; }
  .billto .lbl { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #64748b; }
  .billto .name { font-size: 14px; font-weight: 700; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em;
    color: #64748b; border-bottom: 1px solid #cbd5e1; padding: 6px 4px;
  }
  td { padding: 6px 4px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; font-family: ui-monospace, monospace; }
  .sum-row td { background: #f8fafc; font-weight: 600; }
  .totals {
    margin-top: 14px; display: flex; justify-content: flex-end;
  }
  .totals .box {
    min-width: 200px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;
    background: #f8fafc;
  }
  .totals .row { display: flex; justify-content: space-between; gap: 24px; margin: 2px 0; }
  .totals .grand { font-size: 16px; font-weight: 800; margin-top: 6px; padding-top: 6px; border-top: 1px solid #cbd5e1; }
  .foot {
    margin-top: 22px; padding-top: 10px; border-top: 1px solid #e2e8f0;
    font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between; gap: 12px;
  }
  @media print {
    body { background: white; }
    .noprint { display: none !important; }
  }
</style>
</head>
<body>
  <div class="sheet">
    ${letterhead}
    <div class="meta">
      <div>
        <h1>TAX INVOICE</h1>
        <div class="sub">${esc(scopeLabel)}</div>
        <div class="sub">Invoice ID: <strong>${esc(payload.id)}</strong></div>
      </div>
      <div style="text-align:right">
        <div><span class="badge ${esc(status.toLowerCase())}">${esc(status)}</span></div>
        <div class="sub" style="margin-top:8px">Issued ${esc(issued)} (IST)</div>
        <div class="sub">Period ${esc(payload.billingPeriod)}</div>
        ${payload.locked ? '<div class="sub">Period locked</div>' : ''}
      </div>
    </div>
    <div class="billto">
      <div class="lbl">Bill to</div>
      <div class="name">${esc(payload.partyName)}</div>
      <div class="sub">${esc(payload.partyType === 'doctor' ? 'Doctor payout statement' : 'Centre billing statement')}</div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Patient</th>
          <th>Study</th>
          <th class="num">#</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">No line items for this scope</td></tr>`}
        ${daySummary}
      </tbody>
    </table>
    <div class="totals">
      <div class="box">
        <div class="row"><span>Currency</span><span>${esc(payload.currency || 'INR')}</span></div>
        <div class="row"><span>Studies</span><span>${days.reduce((n, d) => n + d.studies.length, 0)}</span></div>
        <div class="row grand"><span>Total due</span><span>${esc(inr(total))}</span></div>
      </div>
    </div>
    <div class="foot">
      <span>Generated by ${esc(issuer)} · Computer-generated invoice</span>
      <span>${payload.withLetterhead ? 'With letterhead' : 'Without letterhead'}</span>
    </div>
  </div>
</body>
</html>`;
}

function openInvoiceFrame(html: string, mode: 'print' | 'download', filename: string) {
  try {
    (window as unknown as { __RADIONLINE_LAST_INVOICE_HTML__?: string }).__RADIONLINE_LAST_INVOICE_HTML__ = html;
  } catch (_) {}

  if (mode === 'download') {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }

  const existing = document.getElementById('radionline-invoice-print-iframe');
  if (existing?.parentNode) existing.parentNode.removeChild(existing);

  const iframe = document.createElement('iframe');
  iframe.id = 'radionline-invoice-print-iframe';
  iframe.setAttribute('title', 'Print invoice');
  iframe.style.position = 'fixed';
  iframe.style.left = '0';
  iframe.style.top = '0';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-1';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();

  const runPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (_) {}
  };

  const fonts = (doc as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
  const afterFonts = () => {
    const imgs = Array.from(doc.images || []);
    let left = imgs.length;
    if (!left) {
      setTimeout(runPrint, 50);
      return;
    }
    const done = () => {
      left -= 1;
      if (left <= 0) setTimeout(runPrint, 50);
    };
    imgs.forEach((img) => {
      if (img.complete) done();
      else {
        img.addEventListener('load', done);
        img.addEventListener('error', done);
      }
    });
  };
  if (fonts?.ready) fonts.ready.then(afterFonts, afterFonts);
  else afterFonts();
}

export function printInvoice(payload: InvoicePrintPayload) {
  const html = buildInvoicePrintHtml(payload);
  const daySuffix = payload.serviceDate ? `_${payload.serviceDate}` : '';
  const lh = payload.withLetterhead ? '_letterhead' : '_plain';
  openInvoiceFrame(html, 'print', `invoice_${payload.billingPeriod}_${payload.partyName}${daySuffix}${lh}`);
}

export function downloadInvoice(payload: InvoicePrintPayload) {
  const html = buildInvoicePrintHtml(payload);
  const daySuffix = payload.serviceDate ? `_${payload.serviceDate}` : '';
  const lh = payload.withLetterhead ? '_letterhead' : '_plain';
  const safeParty = (payload.partyName || 'party').replace(/[^\w\-]+/g, '_').slice(0, 40);
  openInvoiceFrame(
    html,
    'download',
    `invoice_${payload.billingPeriod}_${safeParty}${daySuffix}${lh}.html`
  );
}
