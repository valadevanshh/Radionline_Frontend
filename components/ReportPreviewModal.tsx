'use client';

import React, { useState } from 'react';
import { X, Printer, CheckCircle, AlertTriangle } from 'lucide-react';
import { XRayReport, RadiologyStore, RadiologyCenter, formatDateDDMMYYYY } from '@/lib/radiology-store';
import { formatPatientDisplayId } from '@/lib/uuid';
import { printReportElement, type PrintReportPayload } from '@/lib/print-helper';
import PaginatedReport from '@/components/PaginatedReport';
import { ApiClient, publicReportLink, resolveMediaUrl } from '@/lib/api-client';
import { usableSignatureUrl } from '@/components/DoctorSignatureForm';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: XRayReport | null;
  withHeader?: boolean;
  selectedBodyPart?: string;
}

export default function ReportPreviewModal({
  isOpen,
  onClose,
  report,
  withHeader: initialWithHeader = true,
  selectedBodyPart: initialSelectedBodyPart,
}: ReportPreviewModalProps) {
  const [activeBodyPart, setActiveBodyPart] = useState<string>(
    initialSelectedBodyPart || report?.bodyParts?.[0] || 'GENERAL'
  );

  const [centers, setCenters] = useState<RadiologyCenter[]>(() => RadiologyStore.getCenters());

  React.useEffect(() => {
    if (initialSelectedBodyPart) {
      setActiveBodyPart(initialSelectedBodyPart);
    } else if (report?.bodyParts?.[0]) {
      setActiveBodyPart(report.bodyParts[0]);
    }
  }, [initialSelectedBodyPart, report]);

  React.useEffect(() => {
    if (!isOpen) return;
    const loadCenters = async () => {
      try {
        const fetched = await ApiClient.getCenters();
        if (Array.isArray(fetched) && fetched.length > 0) {
          setCenters(fetched);
          RadiologyStore.setCenters(fetched);
        }
      } catch (_) {
        setCenters(RadiologyStore.getCenters());
      }
    };
    loadCenters();
  }, [isOpen]);

  if (!isOpen || !report) return null;

  const doctors = RadiologyStore.getDoctors();

  const center =
    centers.find(
      (c) =>
        c.id === report.radiologyCenterId ||
        (c.centerName && report.radiologyCenterName && c.centerName.trim().toLowerCase() === report.radiologyCenterName.trim().toLowerCase())
    ) || {
      centerName: report.radiologyCenterName || 'RADIOLOGY CENTER',
      email: '',
      contactNumber: '',
      address: '',
      logoUrl: undefined,
      headerTemplateUrl: undefined,
      letterheadMode: undefined,
    };

  const centerHeaderUrl = resolveMediaUrl(center.headerTemplateUrl || '');
  const centerLogoUrl = resolveMediaUrl(center.logoUrl || '');
  const letterheadMode = initialWithHeader ? (center.letterheadMode || 'full-page') : 'preprinted';

  // Signed study: doctor details frozen at signing; otherwise the doctor's current profile
  const activeStudy =
    (report.studies || []).find((s) => s.bodyPart === activeBodyPart) || (report.studies || [])[0] || null;
  const frozen =
    activeStudy && String(activeStudy.reportStatus || '').toUpperCase() === 'SIGNED' && activeStudy.signer
      ? activeStudy.signer
      : null;
  const doctorId = activeStudy?.signedBy || report.assignedDoctorId;
  const doctor = doctors.find((d) => d.id === doctorId) || null;

  const docName = frozen?.name || doctor?.fullName || report.assignedDoctorName || 'Reporting Radiologist';
  const docDegree = (frozen ? frozen.degree : doctor?.degree || report.assignedDoctorDegree) || '';
  const docRegNo = (frozen ? frozen.registrationNumber : doctor?.registrationNumber || report.assignedDoctorRegNo) || '';
  const docSignature = resolveMediaUrl(usableSignatureUrl(frozen ? frozen.signatureUrl : doctor?.signatureUrl));
  // Public read-only link (token created at signing); no QR before the study is signed
  const verificationUrl = frozen ? publicReportLink(activeStudy) : '';

  const findingText =
    report.reportsByBodyPart?.[activeBodyPart] ||
    report.findings ||
    'Standard digital radiographs evaluated in multiple projections. Bony structures and soft tissues demonstrate normal radiological features.';
  const impressionText =
    report.impressionsByBodyPart?.[activeBodyPart] ||
    report.impression ||
    'No significant radiological abnormality detected in current study.';

  // One payload for the on-screen pages and the PDF, so both paginate the same way
  const payload: PrintReportPayload = {
    centerName: center.centerName || report.radiologyCenterName || 'RADIOLOGY CENTER',
    centerAddress: center.address || '',
    centerPhone: center.contactNumber || '',
    centerLogoUrl: centerLogoUrl,
    centerHeaderUrl: centerHeaderUrl,
    withHeader: letterheadMode !== 'preprinted',
    letterheadMode,
    patientName: report.fullName,
    patientId: formatPatientDisplayId(report.patientNumber) || '—',
    ageSex: `${report.age} ${report.ageUnit === 'Months' ? 'M' : report.ageUnit === 'Days' ? 'D' : 'Y'} / ${report.gender ? report.gender.charAt(0).toUpperCase() : 'M'}`,
    studyDate: formatDateDDMMYYYY(report.studyDate),
    referringDoctor: report.referringPhysicianName || '',
    modality: activeStudy?.modality || 'X-Ray',
    studyParts: activeBodyPart,
    clinicalHistory: (activeStudy as any)?.clinicalHistory || report.clinicalNotes || 'Not provided.',
    studies: [
      {
        title: `RADIOGRAPH OF ${activeBodyPart} VIEW`,
        technique: activeStudy?.technique || 'Standard radiography',
        findings: findingText,
        impression: impressionText,
      },
    ],
    doctorName: docName,
    doctorDegree: docDegree,
    doctorRegNo: docRegNo,
    doctorSignatureUrl: docSignature,
    reportedAt: activeStudy?.signedAt ? formatDateDDMMYYYY(activeStudy.signedAt) : formatDateDDMMYYYY(report.studyDate),
  };

  const handlePrint = () => {
    const qrSvg = verificationUrl
      ? document.querySelector('[data-testid="report-preview-pages"] [data-rn-qr] svg')?.outerHTML || ''
      : '';
    printReportElement(null, `X-Ray Report - ${report.patientNumber} (${activeBodyPart})`, {
      ...payload,
      qrSvg,
      qrLink: verificationUrl || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative bg-white text-slate-900 w-full max-w-3xl border border-slate-200 shadow-2xl my-4 sm:my-8 flex flex-col max-h-[95vh] sm:max-h-[92vh]">
        {/* Top Toolbar */}
        <div className="flex flex-col gap-2 px-3 sm:px-5 py-2.5 sm:py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0 print:hidden no-print">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-xs font-bold text-slate-100 break-words min-w-0">
                Report Preview — {formatPatientDisplayId(report.patientNumber) ? `${report.patientNumber} (${report.fullName})` : report.fullName}
              </h3>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#009ef7] hover:bg-[#0095e8] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center"
                aria-label="Close"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Multi Body Part Tabs in Toolbar */}
          {report.bodyParts.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-800 scrollbar-none">
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider mr-1 shrink-0">
                Select Report:
              </span>
              {report.bodyParts.map((bp) => (
                <button
                  key={bp}
                  type="button"
                  onClick={() => setActiveBodyPart(bp)}
                  className={`px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer rounded-xs border ${
                    activeBodyPart === bp
                      ? 'bg-[#009ef7] border-[#009ef7] text-white font-bold'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {bp}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* A4 pages: same layout as the PDF (letterhead, QR and "n of N pages" on every page, doctor block on the last) */}
        <div
          className="overflow-y-auto bg-slate-200 touch-pan-y overscroll-contain select-text flex-1 min-h-0"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <PaginatedReport payload={payload} qrValue={verificationUrl} testId="report-preview-pages" gutterPx={12} />
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3 bg-slate-100 border-t border-slate-200 print:hidden no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
