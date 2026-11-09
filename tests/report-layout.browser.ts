import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';
import { buildReportPrintHtml, type PrintReportPayload } from '../lib/print-helper';
import { rnPaginate } from '../lib/report-pages';

async function main() {
 mkdirSync('_ui_shots', { recursive: true });
 const browser = await chromium.launch({ ...(process.platform === 'win32' ? { channel: 'msedge' } : {}), headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 1.5 });
  const sample: PrintReportPayload = {
   centerName: 'Sample Diagnostic Centre', patientName: 'Sample Patient', patientId: 'CTR-000123',
   ageSex: '35 Y / Female', studyDate: '2026-11-08', reportDate: '2026-11-08',
   referringDoctor: 'Dr. Sample Referrer', modality: 'X-Ray', studyParts: 'CHEST PA', clinicalHistory: '',
   doctorName: 'Dr. Sample Radiologist', doctorDegree: 'MD (Radiodiagnosis)', doctorRegNo: 'SAMPLE-123', reportedAt: '',
   doctorSignatureUrl: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="230" height="60"><text x="5" y="38" font-family="cursive" font-style="italic" font-size="27" fill="#182f50">Sample Signature</text></svg>'),
   qrSvg: renderToStaticMarkup(createElement(QRCodeSVG, {value:'https://example.invalid/sample-report',size:87})),
   qrLink: 'https://example.invalid/sample-report',
   letterheadMode: 'preprinted', studies: [{ title: 'RADIOGRAPH OF CHEST PA VIEW', technique: '',
    findings: 'Both lung fields are clear. No focal consolidation or pleural effusion.\nCardiomediastinal silhouette is within normal limits.\nVisualised soft tissue shadows are normal.',
    impression: 'No acute cardiopulmonary abnormality.' }],
  };
  const render = async (payload: PrintReportPayload) => {
   await page.setContent(buildReportPrintHtml(payload, 'Sample report'), {waitUntil:'load'});
   await page.evaluate(() => document.fonts.ready);
   return page.evaluate(({ fn }) => {
    (window as any).__name = (value: any) => value;
    const paginate = (0, eval)(`(${fn})`);
    const src = document.querySelector('[data-rn="src"]') as HTMLElement;
    const out = document.querySelector('[data-rn-out]') as HTMLElement;
    const count = paginate(src, out); src.remove();
    return count;
   }, { fn: rnPaginate.toString() });
  };
  assert.equal(await render(sample), 1);
  const patientRows = await page.locator('[data-rn-out] .pt-row').evaluateAll(rows => rows.map(row => [...row.querySelectorAll('.pt-cell')].map(cell => ({label:cell.querySelector('.lbl')?.textContent,value:cell.querySelector('.val')?.textContent}))));
  assert.deepEqual(patientRows[0], [{label:'Patient Name',value:'Sample Patient'}, {label:'Age / Gender',value:'35 Y / Female'}]);
  assert.deepEqual(patientRows[1].map(cell=>cell.label), ['Patient ID', 'Referring Doctor', 'Report Date']);
  assert.equal(patientRows[1][0].value, 'CTR-000123');
  assert.equal(await page.locator('[data-rn-out] .pt-info-head').count(),0);
  const border = await page.locator('[data-rn-out] .pt-grid').evaluate(el=>{
    const style=getComputedStyle(el);
    return [style.borderTopWidth,style.borderRightWidth,style.borderBottomWidth,style.borderLeftWidth];
  });
  assert.deepEqual(border,['1px','1px','1px','1px']);
  const typography = await page.locator('[data-rn-out] .rn-page').evaluate(el => {
   const title = el.querySelector('h2')!;
   const findings = el.querySelector('p.findings')!;
   const intro = el.querySelector('.study-intro')!;
   const headings = [...el.querySelectorAll('h3')];
   return {
    family: getComputedStyle(findings).fontFamily,
    titleFamily: getComputedStyle(title).fontFamily,
    headingFamily: getComputedStyle(headings[0]).fontFamily,
    size: parseFloat(getComputedStyle(findings).fontSize),
    leading: parseFloat(getComputedStyle(findings).lineHeight),
    titleGap: intro.getBoundingClientRect().top - title.getBoundingClientRect().bottom,
    impressionGap: headings[1].getBoundingClientRect().top - findings.getBoundingClientRect().bottom,
    underline: getComputedStyle(headings[0]).textDecorationLine,
   };
  });
  assert.ok(typography.family.startsWith('"Times New Roman"'));
  assert.equal(typography.titleFamily, typography.family);
  assert.equal(typography.headingFamily, typography.family);
  assert.ok(Math.abs(typography.leading / typography.size - 1.6) < 0.001);
  assert.ok(Math.abs(typography.size - 13 * 96 / 72) < 0.01);
  assert.ok(typography.titleGap >= 18);
  assert.ok(typography.impressionGap >= 20);
  assert.equal(typography.underline, 'underline');
  const doctor = await page.locator('[data-rn-out] .sig-inner').boundingBox();
  const qr = await page.locator('[data-rn-out] .rn-qr').boundingBox();
  const row = await page.locator('[data-rn-out] .sig-row').boundingBox();
  assert.ok(doctor && qr && row);
  assert.ok(Math.abs(doctor.x - row.x) < 1);
  assert.ok(doctor.x + doctor.width < qr.x);
  assert.ok(Math.abs(qr.x + qr.width - row.x - row.width) < 1);
  assert.equal(await page.locator('[data-rn-out] .sig-inner').evaluate(el => getComputedStyle(el).textAlign), 'left');
  await page.locator('[data-rn-out] .rn-page').screenshot({path: '_ui_shots/report-clean-spacing.png'});
  const title = await page.locator('[data-rn-out] h2').boundingBox();
  const impression = await page.locator('[data-rn-out] p.impression').boundingBox();
  await page.screenshot({path:'_ui_shots/report-clean-body.png',clip:{x:48,y:title!.y-14,width:700,height:impression!.y+impression!.height-title!.y+34}});
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('[data-rn-out] p.findings').evaluate(el=>getComputedStyle(el).fontFamily), typography.family);
  await page.emulateMedia({media:'screen'});
  const tinySignature = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="20"><path d="M1 10 L59 10" stroke="black"/></svg>');
  await render({...sample, doctorSignatureUrl:tinySignature, doctorSignatureScale:100});
  const originalSignature = await page.locator('[data-rn-out] .sig-img').boundingBox();
  await render({...sample, doctorSignatureUrl:tinySignature, doctorSignatureScale:200});
  const largerSignature = await page.locator('[data-rn-out] .sig-img').boundingBox();
  assert.ok(largerSignature && originalSignature && largerSignature.width > originalSignature.width * 1.8);
  console.log('PASS: small signature images enlarge at 200%');
  const longText = Array.from({length: 110}, (_, i) => `Finding ${i + 1}: Preserved alignment and normal visualised soft tissues.`).join('\n');
  for (const mode of ['preprinted', 'none', 'header', 'full-page', 'footer'] as const) {
   const artwork = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123"><rect width="794" height="1123" fill="white"/></svg>');
   const payload = { ...sample, letterheadMode: mode, centerHeaderUrl: ['header', 'full-page', 'footer'].includes(mode) ? artwork : undefined, studies: [{...sample.studies[0], findings: longText}] };
   const count = await render(payload);
   assert.ok(count > 1);
   const result = await page.locator('[data-rn-out]').evaluate(out => {
    const findings = [...out.querySelectorAll('[data-b="findings-0"]')].map(el=>el.textContent || '').join('');
    const overflow = [...out.querySelectorAll('[data-rn-content]')].some(content => {
     const bottom = content.getBoundingClientRect().bottom;
     return [...content.children].some(el=>el.getBoundingClientRect().bottom>bottom+0.5);
    });
    const orphanHeading = [...out.querySelectorAll('[data-rn-content]')].some(el=>el.lastElementChild?.matches('h2,h3'));
    const details = [...out.querySelectorAll('[data-rn-content]')].flatMap((content, index) => [...content.children].filter(el=>el.getBoundingClientRect().bottom>content.getBoundingClientRect().bottom+0.5).map(el=>({page:index+1,tag:el.tagName,cls:el.className,overflow:el.getBoundingClientRect().bottom-content.getBoundingClientRect().bottom,text:el.textContent?.slice(-100)})));
    return {findings,overflow,orphanHeading,details};
   });
   assert.equal(result.findings.replace(/\s/g,''), longText.replace(/\s/g,''));
   assert.equal(result.overflow,false,`${mode} overflows: ${JSON.stringify(result.details)}`);
   assert.equal(result.orphanHeading,false,`${mode} leaves orphan heading`);
   console.log(`PASS ${mode}: ${count} pages, complete content, no overflow or orphan headings`);
  }
  console.log('PASS: 13pt Times New Roman, section spacing, print styles, signature and doctor details left, QR right.');
 } finally { await browser.close(); }
}
main().catch(err=>{console.error(err); process.exitCode=1;});
