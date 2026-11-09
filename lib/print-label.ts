import type { XRayReport } from '@/lib/radiology-store';
import { formatDateDDMMYYYY } from '@/lib/radiology-store';
import { formatAgeShort } from '@/lib/age-format';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

const genderShort = (g?: string) => {
  const v = (g || '').trim().toUpperCase();
  return v.startsWith('F') ? 'F' : v.startsWith('O') ? 'O' : v ? 'M' : '-';
};

const PER_PAGE = 10; // A4 portrait, 2 columns x 5 rows

/** One envelope label: Patient Name / Age | Gender | Date / Study / ID | Ref. By */
export function labelHtml(r: XRayReport): string {
  const ref = (r.referringPhysicianName || '').trim();
  return `<table class="label">
  <tr><td colspan="6">Patient Name: ${esc(r.fullName)}</td></tr>
  <tr><td colspan="2">Age: ${esc(formatAgeShort(r))}</td><td colspan="2">Gender: ${esc(genderShort(r.gender))}</td><td colspan="2">Date: ${esc(formatDateDDMMYYYY(r.studyDate))}</td></tr>
  <tr><td colspan="6">Study: ${esc((r.bodyParts || []).join(' | ') || r.modality || '')}</td></tr>
  <tr><td colspan="3">ID: ${esc(r.patientNumber || '-')}</td><td colspan="3">Ref. By: ${esc(ref || '-')}</td></tr>
</table>`;
}

/** A4 portrait sheets with ten labels per page, arranged in two columns and five rows. */
export function buildLabelPrintHtml(reports: XRayReport[]): string {
  const pages: string[] = [];
  for (let i = 0; i < reports.length; i += PER_PAGE) {
    const cells = reports.slice(i, i + PER_PAGE).map((r) => `<div class="cell">${labelHtml(r)}</div>`).join('');
    pages.push(`<section class="sheet">${cells}</section>`);
  }
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Print Envelope</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; color: #000; }
  .sheet { width: 210mm; height: 297mm; padding: 10mm 8mm; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(5, minmax(0, 1fr)); gap: 4mm 8mm; page-break-after: always; break-after: page; overflow: hidden; }
  .sheet:last-child { page-break-after: auto; break-after: auto; }
  .cell { display: flex; align-items: flex-start; }
  .label { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9.5pt; }
  .label td { border: 1px solid #555; padding: 2.2mm 2mm; height: 9mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style></head><body data-testid="label-sheet">${pages.join('')}</body></html>`;

  return html;
}

/** Print through a hidden iframe without opening a preview window. */
export function printLabels(reports: XRayReport[]): boolean {
  if (!reports.length || typeof document === 'undefined') return false;
  const html = buildLabelPrintHtml(reports);
  document.getElementById('rn-label-print')?.remove();
  const frame = document.createElement('iframe');
  frame.id = 'rn-label-print';
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(frame);
  const win = frame.contentWindow;
  const doc = frame.contentDocument || win?.document;
  if (!win || !doc) {
    frame.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    setTimeout(() => frame.remove(), 500);
  };
  win.addEventListener('afterprint', cleanup);
  setTimeout(() => {
    win.focus();
    win.print(); // blocks until the dialog closes in most browsers
    setTimeout(cleanup, 60000); // fallback if afterprint never fires
  }, 150);
  return true;
}
