/**
 * A4 Print Helper — builds a complete static report document (not a fragile live-DOM clone).
 * Opens a real-sized iframe, writes black-on-white A4 HTML with page breaks, then prints.
 */
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
  withHeader?: boolean;
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

function nl2br(s: string): string {
  return esc(s).replace(/\r\n|\n|\r/g, '<br/>');
}

export function buildReportPrintHtml(payload: PrintReportPayload, docTitle: string): string {
  const studiesHtml = (payload.studies || [])
    .map((st, i) => {
      const breakBefore = i > 0 ? 'page-break-before:auto;' : '';
      return `
      <section class="study" style="${breakBefore}">
        <h2 class="study-title">${esc(st.title)}</h2>
        <h3 class="sec">Technique</h3>
        <p class="body">${nl2br(st.technique || '—')}</p>
        <h3 class="sec">Findings</h3>
        <p class="body findings" style="${esc(payload.findingsCss || '')}">${nl2br(st.findings || '\u2014')}</p>
        <h3 class="sec">Impression</h3>
        <p class="body impression"><strong>${nl2br(st.impression || '—')}</strong></p>
      </section>`;
    })
    .join('\n');

  const imagesHtml = '';

  const letterhead =
    payload.withHeader === false
      ? ''
      : `<header class="letterhead">
          <div class="lh-row">
            ${
              payload.centerLogoUrl
                ? `<img class="logo" src="${esc(payload.centerLogoUrl)}" alt="" />`
                : `<div class="logo-fallback">PACS</div>`
            }
            <div class="lh-text">
              <div class="center-name">${esc(payload.centerName)}</div>
              ${
                payload.centerAddress || payload.centerPhone
                  ? `<div class="center-meta">${esc(
                      [payload.centerAddress, payload.centerPhone ? `Tel: ${payload.centerPhone}` : '']
                        .filter(Boolean)
                        .join(' · ')
                    )}</div>`
                  : ''
              }
              <div class="accredit">ISO 9001:2015 Certified · NABL Accredited · 24×7 Teleradiology</div>
            </div>
          </div>
        </header>`;

  const sheetStyle = [
    payload.bodyFontPt ? `font-size: ${payload.bodyFontPt}pt` : '',
    payload.bodyFontFamily ? `font-family: ${payload.bodyFontFamily}` : '',
  ].filter(Boolean).join('; ');

  const sigImg = payload.doctorSignatureUrl
    ? `<img class="sig-img" src="${esc(payload.doctorSignatureUrl)}" alt="Signature" />`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(docTitle)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 14mm 16mm 14mm;
      @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 9pt;
        color: #444;
        font-family: system-ui, sans-serif;
      }
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body {
      margin: 0; padding: 0;
      background: #fff; color: #000;
      font-family: Georgia, "Times New Roman", Times, serif;
      font-size: 11pt; line-height: 1.55;
    }
    .sheet { width: 100%; max-width: 100%; overflow: visible; }
    /* Studies flow across pages (no near-empty first page); the signature block stays whole */
    .sig-block { page-break-inside: avoid; break-inside: avoid; }
    .disclaimer { page-break-inside: avoid; }
    h2.study-title, h3.sec { page-break-after: avoid; }
    ${REPORT_SHEET_CSS}
  </style>
</head>
<body>
  <div class="sheet rn-sheet" style="${esc(sheetStyle)}">
    ${letterhead}
    <table class="demo">
      <tr>
        <td><span class="lbl">Patient Name</span><span class="val">${esc(payload.patientName)}</span></td>
        <td><span class="lbl">Patient ID</span><span class="val">${esc(payload.patientId)}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">Age / Sex</span><span class="val">${esc(payload.ageSex)}</span></td>
        <td><span class="lbl">Date of Study</span><span class="val">${esc(payload.studyDate)}</span></td>
      </tr>
      <tr>
        <td><span class="lbl">Referring Doctor</span><span class="val">${esc(payload.referringDoctor || '—')}</span></td>
        <td><span class="lbl">Modality</span><span class="val">${esc(payload.modality || '—')}</span></td>
      </tr>
      <tr>
        <td colspan="2"><span class="lbl">Study / Body Part</span><span class="val">${esc(payload.studyParts || '—')}</span></td>
      </tr>
    </table>
    <section class="clinical">
      <h3 class="sec">Clinical History</h3>
      <p class="body">${nl2br(payload.clinicalHistory || 'Not provided.')}</p>
    </section>
    ${imagesHtml}
    ${studiesHtml}
    <footer class="sig-block">
      <div class="sig-row">
      ${payload.qrSvg && payload.qrSvg.trim().startsWith('<svg') ? `<div class="sig-qr">${payload.qrSvg}<div class="sig-qr-cap">Scan to view this report</div></div>` : ''}
      <div class="sig-inner">
        ${sigImg}
        <div class="sig-name">${esc(payload.doctorName || 'Reporting Radiologist')}</div>
        ${payload.doctorDegree ? `<div class="sig-meta">${esc(payload.doctorDegree)}</div>` : ''}
        ${payload.doctorRegNo ? `<div class="sig-meta">${esc(formatRegNo(payload.doctorRegNo))}</div>` : ''}
        <div class="sig-meta">Reported: ${esc(payload.reportedAt)}</div>
      </div>
      </div>
      <div class="disclaimer">
        This report is based on the images provided and should be correlated clinically. It is not a substitute for clinical judgment.
      </div>
      <div class="foot">
        <span>${esc(payload.centerName)}</span>
        <span class="pages">End of report</span>
      </div>
    </footer>
  </div>
</body>
</html>`;
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
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      setTimeout(() => {
        w.focus();
        w.print();
      }, 400);
    }
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const trigger = () => {
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

  // Wait for images
  const imgs = Array.from(doc.images || []);
  if (imgs.length === 0) {
    setTimeout(trigger, 250);
  } else {
    let left = imgs.length;
    const done = () => {
      left -= 1;
      if (left <= 0) setTimeout(trigger, 150);
    };
    imgs.forEach((img) => {
      if (img.complete) done();
      else {
        img.onload = done;
        img.onerror = done;
      }
    });
    setTimeout(trigger, 3000); // safety
  }
}

/** Expose HTML builder for Playwright PDF verification without opening print dialog */
export function getReportPrintHtml(payload: PrintReportPayload, docTitle = 'Radiology Report') {
  return buildReportPrintHtml(payload, docTitle);
}
