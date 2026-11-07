import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { REPORT_SHEET_CSS } from './print-helper';

test('report body line height is shared by the sheet and the editor copy', () => {
  assert.match(REPORT_SHEET_CSS, /\.rn-sheet \{[^}]*line-height: 1\.35/);
  assert.match(REPORT_SHEET_CSS, /p\.body, \.rn-sheet \.rn-body-copy \{[^}]*line-height: 1\.35/);
});

test('signature keeps aspect ratio and is larger than the old 52px box', () => {
  assert.match(REPORT_SHEET_CSS, /img\.sig-img \{[^}]*max-height: 26mm/);
  assert.match(REPORT_SHEET_CSS, /max-width: 68mm/);
  assert.match(REPORT_SHEET_CSS, /object-fit: contain/);
  assert.doesNotMatch(REPORT_SHEET_CSS, /sig-img \{[^}]*height: 52px/);
});

test('editor stylesheet uses the same body leading as the print sheet', () => {
  const editor = readFileSync(new URL('../components/A4ReportEditor.tsx', import.meta.url), 'utf8');
  assert.match(editor, /line-height: 1\.35/);
  assert.match(editor, /rn-body-copy/);
});
