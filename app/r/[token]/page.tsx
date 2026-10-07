'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, ShieldCheck } from 'lucide-react';
import { fetchPublicReport, resolveMediaUrl, type PublicReport } from '@/lib/api-client';
import { REPORT_SHEET_CSS, A4_PAGE, formatRegNo, printReportElement } from '@/lib/print-helper';
import { usableSignatureUrl } from '@/components/DoctorSignatureForm';

const MM_PX = 96 / 25.4;
const DASH = '\u2014';

/** Same rule as the viewer: a modality typed into the referring field is not a doctor. */
function referringName(v?: string | null): string {
  const s = (v || '').trim();
  const k = s.toLowerCase().replace(/\s+/g, '').replace('-', '');
  const mods = ['xray', 'xr', 'dx', 'cr', 'dr', 'ct', 'mri', 'usg', 'us', 'sono', 'sonography', 'ultrasound', 'blood', 'bloodreport'];
  return !s || mods.includes(k) ? '' : s;
}

/** Public, read-only view of one signed report (reached from the report QR code). */
export default function PublicReportPage() {
  const params = useParams<{ token: string }>();
  const token = String(params?.token || '');
  const [data, setData] = useState<PublicReport | null>(null);
  const [error, setError] = useState('');
  const [vpW, setVpW] = useState(0);
  const [sheetH, setSheetH] = useState(0);
  const roRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchPublicReport(token)
      .then(setData)
      .catch((e) => setError(e?.message || 'This report could not be loaded.'));
  }, [token]);

  const observe = useCallback((el: HTMLElement | null, kind: 'vp' | 'sheet') => {
    if (!el) return;
    if (!roRef.current) {
      roRef.current = new ResizeObserver((entries) => {
        entries.forEach((en) => {
          const t = en.target as HTMLElement;
          if (t.dataset.kind === 'vp') setVpW(t.clientWidth);
          else setSheetH(t.offsetHeight);
        });
      });
    }
    el.dataset.kind = kind;
    roRef.current.observe(el);
  }, []);
  useEffect(() => () => roRef.current?.disconnect(), []);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="max-w-sm w-full rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-[16px] font-bold text-slate-900">Report not available</h1>
          <p className="mt-2 text-[13px] text-slate-600" data-testid="public-report-error">{error}</p>
        </div>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100 text-[13px] text-slate-500">
        Loading report...
      </main>
    );
  }

  const { center, patient, study, signer } = data;
  const ageSex = `${patient.age != null ? `${patient.age} ${patient.ageUnit && patient.ageUnit !== 'Years' ? patient.ageUnit : 'Yrs'}` : DASH} / ${
    patient.gender ? patient.gender.charAt(0).toUpperCase() : DASH
  }`;
  const signedAt = signer.signedAt || study.signedAt;
  const reportedAt = signedAt ? new Date(signedAt).toLocaleString() : '';
  const sigUrl = resolveMediaUrl(usableSignatureUrl(signer.signatureUrl));
  const logoUrl = resolveMediaUrl(center.logoUrl || '');
  const headerUrl = resolveMediaUrl(center.headerTemplateUrl || '');
  const selfLink = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
  const sheetW = A4_PAGE.widthMm * MM_PX;
  const gutter = vpW > 0 && vpW < 640 ? 10 : 24;
  const scale = vpW > 0 ? Math.min(1, Math.max(0.2, (vpW - 2 * gutter) / sheetW)) : 1;
  const frameH = Math.max(sheetH, A4_PAGE.heightMm * MM_PX) * scale;

  const handlePrint = () => {
    const safe = (s: string) => (s || '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    printReportElement(null, `${safe(patient.name)}_${safe(patient.patientId)}_${safe(study.bodyPart)}`, {
      centerName: center.name,
      centerAddress: center.address || '',
      centerPhone: center.phone || '',
      centerLogoUrl: logoUrl,
      centerHeaderUrl: headerUrl,
      letterheadMode: center.letterheadMode || 'full-page',
      withHeader: true,
      patientName: patient.name,
      patientId: patient.patientId,
      ageSex,
      studyDate: patient.studyDate,
      referringDoctor: referringName(patient.referringDoctor),
      modality: study.modality,
      studyParts: study.bodyPart,
      clinicalHistory: study.clinicalHistory,
      studies: [{ title: study.title, technique: study.technique, findings: study.findings, impression: study.impression }],
      doctorName: signer.name || '',
      doctorDegree: signer.degree || '',
      doctorRegNo: signer.registrationNumber || '',
      doctorSignatureUrl: sigUrl,
      reportedAt,
      qrSvg: document.querySelector('[data-testid="sheet-qr"] svg')?.outerHTML || '',
    });
  };

  return (
    <main className="min-h-screen bg-slate-200 flex flex-col">
      <style>{REPORT_SHEET_CSS}</style>
      <header className="sticky top-0 z-10 bg-white/95 border-b border-slate-200 px-3 sm:px-5 py-2.5 flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-slate-900 truncate">Signed radiology report</div>
          <div className="text-[11px] text-slate-500 truncate">{center.name} &middot; read-only</div>
        </div>
        <button
          type="button"
          onClick={handlePrint}
          className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-[13px] font-semibold text-slate-800 flex items-center gap-1.5 hover:bg-slate-50"
        >
          <Printer className="w-4 h-4" />
          <span>PDF</span>
        </button>
      </header>

      <div ref={(el) => observe(el, 'vp')} className="flex-1" style={{ padding: gutter }} data-testid="public-report">
        <div style={{ width: sheetW * scale, height: frameH, margin: '0 auto', position: 'relative' }}>
          <div
            ref={(el) => observe(el, 'sheet')}
            className="rn-sheet shadow-xl"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${A4_PAGE.widthMm}mm`,
              minHeight: `${A4_PAGE.heightMm}mm`,
              padding: `${A4_PAGE.marginTopMm}mm ${A4_PAGE.marginSideMm}mm ${A4_PAGE.marginBottomMm}mm`,
              transform: scale === 1 ? undefined : `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {headerUrl ? (
              <header className="letterhead letterhead-banner" style={{ borderBottom: 'none', marginBottom: 14, textAlign: 'center' }}>
                <img src={headerUrl} alt="Letterhead Header" style={{ width: '100%', maxHeight: 140, objectFit: 'contain', display: 'block', margin: '0 auto' }} />
              </header>
            ) : (
              <header className="letterhead">
                <div className="lh-row">
                  {logoUrl ? <img className="logo" src={logoUrl} alt="" /> : <div className="logo-fallback">PACS</div>}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="center-name">{center.name}</div>
                    {(center.address || center.phone) && (
                      <div className="center-meta">
                        {[center.address, center.phone ? `Tel: ${center.phone}` : ''].filter(Boolean).join(' \u00b7 ')}
                      </div>
                    )}
                    <div className="accredit">{'ISO 9001:2015 Certified \u00b7 NABL Accredited \u00b7 24\u00d77 Teleradiology'}</div>
                  </div>
                </div>
              </header>
            )}

            <table className="demo">
              <tbody>
                <tr>
                  <td><span className="lbl">Patient Name</span><span className="val">{patient.name}</span></td>
                  <td><span className="lbl">Patient ID</span><span className="val">{patient.patientId}</span></td>
                </tr>
                <tr>
                  <td><span className="lbl">Age / Sex</span><span className="val">{ageSex}</span></td>
                  <td><span className="lbl">Date of Study</span><span className="val">{patient.studyDate}</span></td>
                </tr>
                <tr>
                  <td><span className="lbl">Referring Doctor</span><span className="val">{referringName(patient.referringDoctor) || DASH}</span></td>
                  <td><span className="lbl">Modality</span><span className="val">{study.modality || DASH}</span></td>
                </tr>
                <tr>
                  <td colSpan={2}><span className="lbl">Study / Body Part</span><span className="val">{study.bodyPart}</span></td>
                </tr>
              </tbody>
            </table>

            <section className="clinical">
              <h3 className="sec">Clinical History</h3>
              <p className="body">{study.clinicalHistory?.trim() || 'Not provided.'}</p>
            </section>

            <section className="study">
              <h2 className="study-title">{study.title}</h2>
              <h3 className="sec">Technique</h3>
              <p className="body">{study.technique || DASH}</p>
              <h3 className="sec">Findings</h3>
              <p className="body findings" data-testid="public-findings">{study.findings || DASH}</p>
              <h3 className="sec">Impression</h3>
              <p className="body impression"><strong>{study.impression || DASH}</strong></p>
            </section>

            <footer className="sig-block" data-testid="public-signature">
              <div className="sig-row">
                {selfLink ? (
                  <div className="sig-qr" data-testid="sheet-qr">
                    <QRCodeSVG value={selfLink} size={87} level="M" />
                    <div className="sig-qr-cap">Scan to view this report</div>
                  </div>
                ) : null}
                <div className="sig-inner">
                  {sigUrl ? <img className="sig-img" src={sigUrl} alt="Signature" /> : null}
                  <div className="sig-name">{signer.name || 'Reporting Radiologist'}</div>
                  {signer.degree ? <div className="sig-meta">{signer.degree}</div> : null}
                  {signer.registrationNumber ? <div className="sig-meta">{formatRegNo(signer.registrationNumber)}</div> : null}
                  {reportedAt ? <div className="sig-meta">Reported: {reportedAt}</div> : null}
                </div>
              </div>
              <div className="disclaimer">
                This report is based on the images provided and should be correlated clinically. It is not a substitute for clinical judgment.
              </div>
              <div className="foot">
                <span>{center.name}</span>
                <span>End of report</span>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}
