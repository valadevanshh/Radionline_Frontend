/**
 * A4 Print Helper — builds a complete static report document (not a fragile live-DOM clone).
 * Opens a real-sized iframe, writes the report source, splits it into A4 pages (letterhead,
 * QR code and "n of N pages" on every page, doctor block on the last) and prints.
 * The on-screen pages use the same source and the same paginator (lib/report-pages.ts).
 */
import { rnPaginate, REPORT_PAGES_CSS } from './report-pages';

export type PrintStudyBlock = {
  title: string;
  technique: string;
  findings: string;
  impression: string;
};

export type PrintReportPayload = {
  centerName: string;
  centerAddress?: string;
  centerPhone?: string;
  centerLogoUrl?: string;
  centerHeaderUrl?: string;
  withHeader?: boolean;
  letterheadMode?: 'header' | 'footer' | 'full-page' | 'preprinted' | 'none';
  patientName: string;
  patientId: string;
  ageSex: string;
  studyDate: string;
  referringDoctor: string;
  modality: string;
  studyParts: string;
  clinicalHistory: string;
  keyImageUrls?: string[];
  studies: PrintStudyBlock[];
  doctorName: string;
  doctorDegree?: string;
  doctorRegNo?: string;
  doctorSignatureUrl?: string;
  reportedAt: string;
  /** Body text size/family chosen in the editor (defaults: 11pt Georgia) */
  bodyFontPt?: number;
  bodyFontFamily?: string;
  /** Extra CSS for the findings text (bold / italic / underline / alignment toggles) */
  findingsCss?: string;
  /** QR code (SVG markup rendered by the viewer) linking to the public read-only report */
  qrSvg?: string;
  /** Where the QR code points; makes the code a link on screen and in the PDF */
  qrLink?: string;
};

/**
 * One stylesheet for the report sheet, shared by the PDF/print document and the
 * on-screen A4 page in the PACS viewer, so both lay out the same way.
 * Every rule is scoped under .rn-sheet.
 */
export const REPORT_SHEET_CSS = `
.rn-sheet { font-family: Georgia, "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.55; color: #000; background: #fff; }
.rn-sheet * { box-sizing: border-box; }
.rn-sheet .letterhead { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 14px; }
.rn-sheet .lh-row { display: flex; gap: 12px; align-items: flex-start; }
.rn-sheet .logo { width: 56px; height: 56px; object-fit: contain; flex-shrink: 0; }
.rn-sheet .logo-fallback { width: 48px; height: 48px; background: #000; color: #fff; display: flex; align-items: center; justify-content: center; font-family: system-ui, sans-serif; font-size: 9pt; font-weight: 700; flex-shrink: 0; }
.rn-sheet .center-name { font-family: system-ui, sans-serif; font-weight: 700; font-size: 14pt; line-height: 1.25; text-transform: uppercase; letter-spacing: 0.02em; }
.rn-sheet .center-meta { font-family: system-ui, sans-serif; font-size: 9pt; color: #222; margin-top: 2px; }
.rn-sheet .accredit { font-family: system-ui, sans-serif; font-size: 8.5pt; color: #555; margin-top: 4px; }
.rn-sheet table.demo { width: 100%; border-collapse: collapse; margin: 0 0 14px 0; font-family: system-ui, sans-serif; font-size: 10pt; line-height: 1.4; }
.rn-sheet table.demo td { border: 1px solid #000; padding: 7px 9px; vertical-align: top; width: 50%; }
.rn-sheet table.demo .lbl { display: block; color: #444; font-size: 8.5pt; margin-bottom: 2px; }
.rn-sheet table.demo .val { font-weight: 700; color: #000; text-transform: none; }
.rn-sheet h2.study-title { font-family: system-ui, sans-serif; font-size: 12pt; line-height: 1.4; font-weight: 700; text-align: center; text-transform: uppercase; text-decoration: underline; margin: 18px 0 10px; }
.rn-sheet h3.sec { font-family: system-ui, sans-serif; font-size: 10pt; line-height: 1.4; font-weight: 700; font-style: normal; text-decoration: none; text-transform: uppercase; letter-spacing: 0.04em; margin: 10px 0 4px; border: none; }
.rn-sheet p.body { margin: 0 0 8px; white-space: pre-wrap; word-wrap: break-word; }
.rn-sheet p.findings, .rn-sheet p.impression { border: none !important; outline: none !important; background: transparent !important; padding: 0 !important; }
.rn-sheet .study { margin-bottom: 8px; }
.rn-sheet .clinical { margin-bottom: 12px; }
.rn-sheet .sig-block { margin-top: 28px; font-family: system-ui, sans-serif; }
.rn-sheet .sig-row { display: flex; justify-content: flex-end; align-items: flex-end; gap: 14px; }
.rn-sheet .sig-inner { text-align: right; min-height: 70px; }
.rn-sheet .sig-qr { width: 23mm; flex-shrink: 0; text-align: center; font-family: system-ui, sans-serif; font-size: 7pt; line-height: 1.25; color: #444; }
.rn-sheet .sig-qr svg { display: block; width: 23mm; height: 23mm; }
.rn-sheet .sig-qr-cap { margin-top: 3px; }
.rn-sheet .sig-img { height: 52px; max-width: 220px; object-fit: contain; margin-bottom: 4px; display: inline-block; }
.rn-sheet .sig-name { font-weight: 700; font-size: 11pt; }
.rn-sheet .sig-meta { font-size: 9.5pt; color: #222; }
.rn-sheet .disclaimer { margin-top: 22px; padding-top: 10px; border-top: 1px solid #666; font-size: 8.5pt; color: #444; font-style: italic; }
.rn-sheet .foot { margin-top: 8px; display: flex; justify-content: space-between; font-family: system-ui, sans-serif; font-size: 8pt; color: #555; }
`;

/** "Reg. No. 1234" unless the stored value already says what it is (e.g. "MCI Reg. No. 1234"). */
export function formatRegNo(value?: string | null): string {
  const v = String(value || '').trim();
  if (!v) return '';
  return /reg/i.test(v) ? v : `Reg. No. ${v}`;
}

/** A4 geometry shared by print (@page margins) and the on-screen page. */
export const A4_PAGE = { widthMm: 210, heightMm: 297, marginTopMm: 14, marginSideMm: 14, marginBottomMm: 16 } as const;

function esc(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type LetterheadMode = NonNullable<PrintReportPayload['letterheadMode']>;

export type LetterheadLayout = {
  mode: LetterheadMode;
  /** How the centre letterhead is drawn on every page */
  kind: 'bg' | 'crop' | 'footer' | 'text' | 'none';
  /** Distance from the page edges to the area used by the report text + footer (mm) */
  topMm: number;
  bottomMm: number;
  sideMm: number;
  /** Full-page letterhead artwork leaves less room: use the tighter type scale */
  compact: boolean;
};

/**
 * One rule for every page of every report: which letterhead the centre uses and how much of
 * the page it takes. "No header" (withHeader === false) means pre-printed letterhead paper.
 */
export function resolveLetterhead(payload: Pick<PrintReportPayload, 'letterheadMode' | 'withHeader' | 'centerHeaderUrl'>): LetterheadLayout {
  const url = Boolean(payload.centerHeaderUrl);
  const mode: LetterheadMode =
    payload.withHeader === false ? 'preprinted' : payload.letterheadMode || (url ? 'full-page' : 'header');
  const side = A4_PAGE.marginSideMm;
  if (mode === 'preprinted') return { mode, kind: 'none', topMm: 38, bottomMm: 30, sideMm: side, compact: false };
  if (mode === 'none') return { mode, kind: 'none', topMm: A4_PAGE.marginTopMm, bottomMm: A4_PAGE.marginBottomMm, sideMm: side, compact: false };
  if (url && mode === 'full-page') return { mode, kind: 'bg', topMm: 48, bottomMm: 30, sideMm: side, compact: true };
  if (url && mode === 'header') return { mode, kind: 'crop', topMm: 50, bottomMm: A4_PAGE.marginBottomMm, sideMm: side, compact: false };
  if (url && mode === 'footer') return { mode, kind: 'footer', topMm: A4_PAGE.marginTopMm, bottomMm: 32, sideMm: side, compact: false };
  // A letterhead mode but no artwork uploaded: the text letterhead
  return { mode, kind: 'text', topMm: A4_PAGE.marginTopMm, bottomMm: A4_PAGE.marginBottomMm, sideMm: side, compact: false };
}

/** Everything the report pages need (screen and print). */
export const REPORT_ALL_CSS = REPORT_SHEET_CSS + REPORT_PAGES_CSS;

export type ReportSourceOptions = {
  /**
   * The on-screen editor shows the text in textareas, where a trailing line break opens an
   * empty last line: measure that line too.
   */
  editorText?: boolean;
};

function qrMarkup(payload: PrintReportPayload): string {
  return payload.qrSvg && payload.qrSvg.trim().startsWith('<svg') ? payload.qrSvg : '';
}

/**
 * Hidden source of the paginated report (see rnPaginate in report-pages.ts): the page shell
 * with the centre letterhead, the two footers and the report body as flat blocks.
 */
export function buildReportSourceHtml(payload: PrintReportPayload, opts: ReportSourceOptions = {}): string {
  const lh = resolveLetterhead(payload);
  const url = payload.centerHeaderUrl || '';
  const qr = qrMarkup(payload);
  const qrHref = payload.qrLink ? ` href="${esc(payload.qrLink)}" target="_blank" rel="noreferrer"` : '';
  const qrTag = payload.qrLink ? 'a' : 'div';
  const text = (s: string | undefined | null, fallback: string) => {
    let v = String(s ?? '').replace(/\r\n?/g, '\n');
    if (!v.trim() && !opts.editorText) v = '';
    if (!v) return esc(fallback);
    if (opts.editorText && v.endsWith('\n')) v += '\u200b';
    return esc(v);
  };

  const textHeader = `<header class="letterhead">
      <div class="lh-row">
        ${payload.centerLogoUrl ? `<img class="logo" src="${esc(payload.centerLogoUrl)}" alt="" />` : `<div class="logo-fallback">PACS</div>`}
        <div class="lh-text" style="min-width:0;flex:1">
          <div class="center-name">${esc(payload.centerName)}</div>
          ${
            payload.centerAddress || payload.centerPhone
              ? `<div class="center-meta">${esc(
                  [payload.centerAddress, payload.centerPhone ? `Tel: ${payload.centerPhone}` : ''].filter(Boolean).join(' \u00b7 ')
                )}</div>`
              : ''
          }
          <div class="accredit">ISO 9001:2015 Certified \u00b7 NABL Accredited \u00b7 24\u00d77 Teleradiology</div>
        </div>
      </div>
    </header>`;

  const chrome =
    lh.kind === 'bg'
      ? `<img class="rn-page-bg" src="${esc(url)}" alt="" />`
      : lh.kind === 'crop'
      ? `<div class="rn-page-crop"><img src="${esc(url)}" alt="Letterhead" /></div>`
      : lh.kind === 'footer'
      ? `<div class="rn-page-lhfoot"><img src="${esc(url)}" alt="" /></div>`
      : '';

  const pageStyle = [
    lh.compact ? 'font-size: 10pt; line-height: 1.3' : '',
    payload.bodyFontPt ? `font-size: ${payload.bodyFontPt}pt` : '',
    payload.bodyFontFamily ? `font-family: ${payload.bodyFontFamily}` : '',
  ]
    .filter(Boolean)
    .join('; ');
  const innerStyle = `top: ${lh.topMm}mm; bottom: ${lh.bottomMm}mm; left: ${lh.sideMm}mm; right: ${lh.sideMm}mm;`;

  const page = `<div class="rn-sheet rn-page${lh.compact ? ' rn-compact' : ''}" data-rn="page" data-letterhead="${lh.mode}" style="${esc(pageStyle)}">
    ${chrome}
    <div class="rn-page-inner" style="${innerStyle}">
      ${lh.kind === 'text' ? textHeader : ''}
      <div class="rn-page-content" data-rn-content></div>
      <div class="rn-page-foot" data-rn-foot></div>
    </div>
  </div>`;

  const footNormal = `<div class="rn-foot rn-foot-normal" data-rn="foot-normal">
    <div class="rn-foot-row">
      <span>${esc(payload.centerName)}</span>
      <span class="rn-pageno" data-rn-pageno></span>
      ${qr ? `<${qrTag} class="rn-foot-qr" data-rn-qr${qrHref}><span>Scan to view<br/>this report</span>${qr}</${qrTag}>` : '<span></span>'}
    </div>
  </div>`;

  const sigImg = payload.doctorSignatureUrl ? `<img class="sig-img" src="${esc(payload.doctorSignatureUrl)}" alt="Signature" />` : '';
  const footLast = `<div class="rn-foot rn-foot-last sig-block" data-rn="foot-last" data-testid="sheet-signature">
    <div class="sig-row">
      ${qr ? `<${qrTag} class="sig-qr" data-rn-qr data-testid="sheet-qr"${qrHref}>${qr}<div class="sig-qr-cap">Scan to view this report</div></${qrTag}>` : ''}
      <div class="sig-inner">
        ${sigImg}
        <div class="sig-name">${esc(payload.doctorName || 'Reporting Radiologist')}</div>
        ${payload.doctorDegree ? `<div class="sig-meta">${esc(payload.doctorDegree)}</div>` : ''}
        ${payload.doctorRegNo ? `<div class="sig-meta">${esc(formatRegNo(payload.doctorRegNo))}</div>` : ''}
        ${payload.reportedAt ? `<div class="sig-meta">Reported: ${esc(payload.reportedAt)}</div>` : ''}
      </div>
    </div>
    <div class="disclaimer">
      This report is based on the images provided and should be correlated clinically. It is not a substitute for clinical judgment.
    </div>
    <div class="foot">
      <span>${esc(payload.centerName)}</span>
      <span class="rn-pageno" data-rn-pageno></span>
      <span>End of report</span>
    </div>
  </div>`;

  const studies = (payload.studies || [])
    .map(
      (st, i) => `
    <h2 class="study-title" data-kwn data-b="title-${i}">${esc(st.title)}</h2>
    <h3 class="sec" data-kwn>Technique</h3>
    <p class="body" data-split data-b="technique-${i}">${text(st.technique, '\u2014')}</p>
    <h3 class="sec" data-kwn>Findings</h3>
    <p class="body findings" data-split data-b="findings-${i}" style="${esc(payload.findingsCss || '')}">${text(st.findings, '\u2014')}</p>
    <h3 class="sec" data-kwn>Impression</h3>
    <p class="body impression" data-split data-b="impression-${i}"><strong>${text(st.impression, '\u2014')}</strong></p>`
    )
    .join('');

  const flow = `<div data-rn="flow">
    <table class="demo">
      <tbody>
        <tr>
          <td><span class="lbl">Patient Name</span><span class="val">${esc(payload.patientName)}</span></td>
          <td><span class="lbl">Patient ID</span><span class="val">${esc(payload.patientId)}</span></td>
        </tr>
        <tr>
          <td><span class="lbl">Age / Sex</span><span class="val">${esc(payload.ageSex)}</span></td>
          <td><span class="lbl">Date of Study</span><span class="val">${esc(payload.studyDate)}</span></td>
        </tr>
        <tr>
          <td><span class="lbl">Referring Doctor</span><span class="val">${esc(payload.referringDoctor || '\u2014')}</span></td>
          <td><span class="lbl">Modality</span><span class="val">${esc(payload.modality || '\u2014')}</span></td>
        </tr>
        <tr>
          <td colspan="2"><span class="lbl">Study / Body Part</span><span class="val">${esc(payload.studyParts || '\u2014')}</span></td>
        </tr>
      </tbody>
    </table>
    <h3 class="sec" data-kwn>Clinical History</h3>
    <p class="body clinical-body" data-split data-b="clinical">${text(payload.clinicalHistory, 'Not provided.')}</p>
    ${studies}
  </div>`;

  return `<div class="rn-src" data-rn="src" style="display:none">${page}${footNormal}${footLast}${flow}</div>`;
}

export function buildReportPrintHtml(payload: PrintReportPayload, docTitle: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(docTitle)}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    .rn-out { width: 210mm; }
    .rn-out > .rn-page { break-after: page; page-break-after: always; }
    .rn-out > .rn-page:last-child { break-after: auto; page-break-after: auto; }
    ${REPORT_ALL_CSS}
  </style>
</head>
<body>
  <div class="rn-out" data-rn-out></div>
  ${buildReportSourceHtml(payload)}
</body>
</html>`;
}

/**
 * Paginate a document written from buildReportPrintHtml (the print iframe, or a page loaded in
 * a test browser). Returns the page count.
 */
export function paginateReportDocument(doc: Document): number {
  const src = doc.querySelector('[data-rn="src"]') as HTMLElement | null;
  const out = doc.querySelector('[data-rn-out]') as HTMLElement | null;
  if (!src || !out) return 0;
  const n = rnPaginate(src, out);
  src.parentNode?.removeChild(src);
  return n;
}

function whenReady(doc: Document, cb: () => void) {
  const fonts = (doc as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
  if (fonts && fonts.ready) fonts.ready.then(cb, cb);
  else cb();
}

function waitForImages(doc: Document, cb: () => void) {
  const imgs = Array.from(doc.images || []);
  let left = imgs.length;
  if (!left) return cb();
  const done = () => {
    left -= 1;
    if (left === 0) cb();
  };
  imgs.forEach((img) => {
    if (img.complete) done();
    else {
      img.addEventListener('load', done);
      img.addEventListener('error', done);
    }
  });
}

/** @deprecated keep name for call sites — now builds structured HTML */
export function printReportElement(
  _element: HTMLElement | null,
  docTitle: string = 'Radiology Report',
  payload?: PrintReportPayload
) {
  if (!payload || !payload.studies?.length) {
    console.error('printReportElement: structured payload required');
    window.print();
    return;
  }

  const html = buildReportPrintHtml(payload, docTitle);
  try {
    (window as unknown as { __RADIONLINE_LAST_PRINT_HTML__?: string }).__RADIONLINE_LAST_PRINT_HTML__ = html;
  } catch (_) {}

  // Real-sized iframe (0×0 iframes truncate/layout-collapse in Chromium)
  const existing = document.getElementById('radionline-print-iframe');
  if (existing?.parentNode) existing.parentNode.removeChild(existing);

  const iframe = document.createElement('iframe');
  iframe.id = 'radionline-print-iframe';
  iframe.setAttribute('title', 'Print report');
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

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    // Fallback: new window
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      whenReady(w.document, () => {
        paginateReportDocument(w.document);
        waitForImages(w.document, () => {
          w.focus();
          w.print();
        });
      });
    }
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  let printed = false;
  const trigger = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Print failed:', err);
    } finally {
      setTimeout(() => {
        try {
          if (iframe.parentNode) document.body.removeChild(iframe);
        } catch (_) {}
      }, 2000);
    }
  };

  // Paginate once fonts are ready, then print when the letterhead / signature images are in
  whenReady(doc, () => {
    try {
      const pages = paginateReportDocument(doc);
      try {
        (window as unknown as { __RADIONLINE_LAST_PRINT_PAGES__?: number }).__RADIONLINE_LAST_PRINT_PAGES__ = pages;
      } catch (_) {}
    } catch (err) {
      console.error('Report pagination failed:', err);
    }
    waitForImages(doc, () => setTimeout(trigger, 150));
    setTimeout(trigger, 4000); // safety
  });
}

/** Expose HTML builder for Playwright PDF verification without opening print dialog */
export function getReportPrintHtml(payload: PrintReportPayload, docTitle = 'Radiology Report') {
  return buildReportPrintHtml(payload, docTitle);
}
