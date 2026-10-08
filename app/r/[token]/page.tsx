'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer, ShieldCheck } from 'lucide-react';
import { fetchPublicReport, resolveMediaUrl, type PublicReport } from '@/lib/api-client';
import { printReportElement, type PrintReportPayload } from '@/lib/print-helper';
import PaginatedReport from '@/components/PaginatedReport';
import { usableSignatureUrl } from '@/components/DoctorSignatureForm';

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

  useEffect(() => {
    if (!token) return;
    fetchPublicReport(token)
      .then(setData)
      .catch((e) => setError(e?.message || 'This report could not be loaded.'));
  }, [token]);


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

  const payload: PrintReportPayload = {
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
  };

  const handlePrint = () => {
    const safe = (s: string) => (s || '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    printReportElement(null, `${safe(patient.name)}_${safe(patient.patientId)}_${safe(study.bodyPart)}`, {
      ...payload,
      qrSvg: document.querySelector('[data-testid="public-report"] [data-rn-qr] svg')?.outerHTML || '',
      qrLink: selfLink || undefined,
    });
  };

  return (
    <main className="min-h-screen bg-slate-200 flex flex-col">
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

      {/* A4 pages: same layout as the PDF (letterhead, QR and "n of N pages" on every page, doctor block on the last) */}
      <div className="flex-1" data-testid="public-report">
        <PaginatedReport payload={payload} qrValue={selfLink} />
      </div>
    </main>
  );
}
