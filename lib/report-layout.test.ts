import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { buildReportSourceHtml, PrintReportPayload, REPORT_SHEET_CSS } from './print-helper';

test('report body line height is shared by the sheet and the editor copy', () => {
  assert.match(REPORT_SHEET_CSS, /\.rn-sheet \{[^}]*line-height: 1\.6/);
  assert.match(REPORT_SHEET_CSS, /p\.body, \.rn-sheet \.rn-body-copy \{[^}]*line-height: 1\.6/);
});

test('signature keeps aspect ratio and is larger than the old 52px box', () => {
  assert.match(REPORT_SHEET_CSS, /img\.sig-img \{[^}]*max-height: 26mm/);
  assert.match(REPORT_SHEET_CSS, /max-width: 68mm/);
  assert.match(REPORT_SHEET_CSS, /object-fit: contain/);
  assert.doesNotMatch(REPORT_SHEET_CSS, /sig-img \{[^}]*height: 52px/);
});

test('editor stylesheet uses the same body leading as the print sheet', () => {
  const editor = readFileSync(new URL('../components/A4ReportEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /line-height: 1\.6/);
  assert.match(editor, /rn-body-copy/);
});

const signaturePayload: PrintReportPayload = {
  centerName: 'Test centre', patientName: 'Test patient', patientId: 'P1', ageSex: '30 M',
  studyDate: '2026-11-08', referringDoctor: '', modality: 'XR', studyParts: 'CHEST',
  clinicalHistory: '', studies: [], doctorName: 'Dr Test', reportedAt: '',
  doctorSignatureUrl: '/signature.png',
};

test('signature scale reaches printed report dimensions with a legacy default', () => {
  for (const [scale, height, width] of [[undefined, 26, 68], [25, 6.5, 17], [50, 13, 34], [150, 39, 102], [200, 52, 136]] as const) {
    const html = buildReportSourceHtml({ ...signaturePayload, doctorSignatureScale: scale });
    assert.ok(html.includes(`max-height:${height}mm;max-width:${width}mm`));
  }
});

test('invalid signature scales cannot produce unsafe report dimensions', () => {
  for (const [scale, height, width] of [[NaN, 26, 68], [Infinity, 26, 68], [-10, 6.5, 17], [9999, 52, 136]]) {
    const html = buildReportSourceHtml({ ...signaturePayload, doctorSignatureScale: scale });
    assert.ok(html.includes(`max-height:${height}mm;max-width:${width}mm`));
  }
});


test('report patient ID preserves centre identifiers and handles missing values', async () => {
  const { formatReportPatientId } = await import('./report-patient-id');
  for (const [input, expected] of [
    [' CTR-00017 ', 'CTR-00017'], ['0000123', '0000123'], ['0', '0'],
    ['8f3b2a1c-9d4e-4f5a-8b3c-1d2e3f4a5b6c', '8f3b2a1c-9d4e-4f5a-8b3c-1d2e3f4a5b6c'],
    ['', '\u2014'], ['  ', '\u2014'], [null, '\u2014'], [undefined, '\u2014'],
  ] as const) {
    const patientId = formatReportPatientId(input);
    assert.equal(patientId, expected);
    const html = buildReportSourceHtml({ ...signaturePayload, patientId });
    assert.ok(html.includes(`<span class="lbl">Patient ID</span><span class="val">${expected}</span>`));
  }
});

test('report patient identifiers are escaped when printed', async () => {
  const { formatReportPatientId } = await import('./report-patient-id');
  const html = buildReportSourceHtml({ ...signaturePayload, patientId: formatReportPatientId('<img src=x onerror=alert(1)>') });
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<img src=x'));
});
