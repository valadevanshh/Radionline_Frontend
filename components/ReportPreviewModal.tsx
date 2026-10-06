'use client';

import React, { useState } from 'react';
import { X, Printer, CheckCircle, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { XRayReport, RadiologyStore, formatDateDDMMYYYY } from '@/lib/radiology-store';
import { printReportElement, formatRegNo, type PrintReportPayload } from '@/lib/print-helper';
import { publicReportLink, resolveMediaUrl } from '@/lib/api-client';
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
  const [withHeader, setWithHeader] = useState(initialWithHeader);
  const [activeBodyPart, setActiveBodyPart] = useState<string>(
    initialSelectedBodyPart || report?.bodyParts?.[0] || 'GENERAL'
  );

  React.useEffect(() => {
    if (initialSelectedBodyPart) {
      setActiveBodyPart(initialSelectedBodyPart);
    } else if (report?.bodyParts?.[0]) {
      setActiveBodyPart(report.bodyParts[0]);
    }
  }, [initialSelectedBodyPart, report]);

  if (!isOpen || !report) return null;

  const centers = RadiologyStore.getCenters();
  const doctors = RadiologyStore.getDoctors();

  const center = centers.find((c) => c.id === report.radiologyCenterId) || {
    centerName: report.radiologyCenterName || 'RADIOLOGY CENTER',
    email: 'info@diagnostic.com',
    contactNumber: '+91 98980 00000',
    address: 'Diagnostic Complex, City Center',
    logoUrl: undefined,
  };

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

  const handlePrint = () => {
    const findingText =
      report.reportsByBodyPart?.[activeBodyPart] ||
      report.findings ||
      'Standard digital radiographs evaluated in multiple projections. Bony structures and soft tissues demonstrate normal radiological features.';
    const impressionText =
      report.impressionsByBodyPart?.[activeBodyPart] ||
      report.impression ||
      'No significant radiological abnormality detected in current study.';

    const payload: PrintReportPayload = {
      centerName: center.centerName || report.radiologyCenterName || 'RADIOLOGY CENTER',
      centerAddress: center.address || '',
      centerPhone: center.contactNumber || '',
      centerLogoUrl: resolveMediaUrl(center.logoUrl || ''),
      withHeader: withHeader,
      patientName: report.fullName,
      patientId: report.patientNumber,
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
      qrSvg: document.querySelector('.print-area svg')?.outerHTML || '',
    };

    printReportElement(null, `X-Ray Report - ${report.patientNumber} (${activeBodyPart})`, payload);
  };

  const bodyPartsToDisplay = [activeBodyPart];

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="relative bg-white text-slate-900 w-full max-w-3xl border border-slate-200 shadow-2xl my-4 sm:my-8 flex flex-col max-h-[95vh] sm:max-h-[92vh]">
        {/* Top Toolbar */}
        <div className="flex flex-col gap-2 px-3 sm:px-5 py-2.5 sm:py-3 bg-slate-900 text-white border-b border-slate-800 shrink-0 print:hidden no-print">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="text-xs font-bold text-slate-100 break-words min-w-0">
                Report Preview — {report.patientNumber}
              </h3>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setWithHeader(!withHeader)}
                className={`px-3 py-1 text-xs font-semibold border transition-all cursor-pointer ${
                  withHeader
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {withHeader ? 'Header Included' : 'No Header'}
              </button>

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

        {/* Medical Document Sheet */}
        <div
          className="p-3 sm:p-6 md:p-10 overflow-y-auto bg-white text-slate-900 space-y-4 sm:space-y-6 print-area font-serif text-xs sm:text-sm touch-pan-y overscroll-contain select-text"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* 1. TOP PATIENT HEADER BORDERED TABLE */}
          <table className="w-full border-collapse border border-slate-900 text-[10px] sm:text-xs font-sans">
            <tbody>
              <tr className="border-b border-slate-900">
                <td className="p-1.5 sm:p-2 border-r border-slate-900 w-3/5">
                  Patient Name: <strong className="font-bold text-slate-900">{report.fullName}</strong>
                </td>
                <td className="p-1.5 sm:p-2 w-2/5">
                  Date: <strong className="font-bold text-slate-900">{formatDateDDMMYYYY(report.studyDate)}</strong>
                </td>
              </tr>
              <tr className="border-b border-slate-900">
                <td className="p-2 border-r border-slate-900">
                  Patient Id: <strong className="font-bold text-slate-900">{report.patientNumber}</strong>
                </td>
                <td className="p-2">
                  Age/Sex: <strong className="font-bold text-slate-900">{report.age} {report.ageUnit === 'Months' ? 'M' : report.ageUnit === 'Days' ? 'D' : 'Y'} / {report.gender.charAt(0).toUpperCase()}</strong>
                </td>
              </tr>
              <tr>
                <td className="p-2 border-r border-slate-900">
                  Ref Phy: <strong className="font-bold text-slate-900">{report.referringPhysicianName}</strong>
                </td>
                <td className="p-2">
                  Priority: <strong className={report.isUrgent ? "font-bold text-rose-600 uppercase" : "font-bold text-slate-900"}>{report.isUrgent ? "STAT URGENT" : "Routine"}</strong>
                  {report.isPortable && (
                    <span className="ml-2 font-mono font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                      PORTABLE
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* RENDER EACH BODY PART REPORT SECTION */}
          {bodyPartsToDisplay.map((part, pIdx) => {
            const findingText =
              report.reportsByBodyPart?.[part] ||
              report.findings ||
              'Standard digital radiographs evaluated in multiple projections. Bony structures and soft tissues demonstrate normal radiological features.';
            const impressionText =
              report.impressionsByBodyPart?.[part] ||
              report.impression ||
              'No significant radiological abnormality detected in current study.';

            return (
              <div
                key={part}
                className={
                  pIdx > 0
                    ? 'pt-6 border-t-2 border-slate-300 border-dashed print:border-none print:pt-0 print:break-before-page'
                    : ''
                }
              >
                {/* 1.5 REPEAT PATIENT HEADER ON NEW PRINT PAGES */}
                {pIdx > 0 && (
                  <table className="hidden print:table w-full border-collapse border border-slate-900 text-[10px] font-sans mb-4">
                    <tbody>
                      <tr className="border-b border-slate-900">
                        <td className="p-1 border-r border-slate-900 w-3/5">
                          Patient Name: <strong className="font-bold text-slate-900">{report.fullName}</strong>
                        </td>
                        <td className="p-1 w-2/5">
                          Date: <strong className="font-bold text-slate-900">{report.studyDate}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-1 border-r border-slate-900">
                          Patient ID: <strong className="font-bold text-slate-900">{report.patientNumber}</strong>
                        </td>
                        <td className="p-1">
                          Report #{pIdx + 1} of {report.bodyParts.length}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {/* 2. CENTERED BLUE ITALIC UNDERLINED TITLE */}
                <div className="text-center my-4">
                  <h2 className="text-[#3b82f6] font-bold italic underline text-base md:text-lg font-serif tracking-wide uppercase">
                    Radiograph of {part} view
                  </h2>
                </div>

                {/* 3. RADIOLOGICAL FINDINGS */}
                <div className="my-4 space-y-2 text-sm text-slate-900 leading-relaxed font-serif">
                  {findingText.split('\n').map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>

                {/* 4. CONCLUSION LINE */}
                <div className="my-4 font-serif text-sm flex items-start gap-2">
                  <span className="font-bold underline text-[#3b82f6] shrink-0">Conclusion:</span>
                  <span className="font-bold text-slate-900">{impressionText}</span>
                </div>
              </div>
            );
          })}



          {/* 5. BOTTOM COMPLIMENTS & DOCTOR SIGNATURE BLOCK WITH QR VERIFICATION */}
          <div className="mt-10 pt-4 font-serif text-xs border-t border-slate-300 space-y-4">
            <p className="text-slate-800 text-xs">
              Report with compliments to <strong>{report.referringPhysicianName}</strong>
            </p>

            {/* Left & Right Layout: Left = Doctor Details & Report ID (UUID), Right = QR Code */}
            <div className="flex items-end justify-between gap-4 pt-2">
              {/* Left Side: Doctor Name, Degree, Registration Number, Report ID / UUID */}
              <div className="space-y-0.5 text-slate-900 font-serif">
                {docSignature ? <img src={docSignature} alt="Signature" className="h-12 max-w-[200px] object-contain mb-1" /> : null}
                <p className="font-extrabold text-sm uppercase tracking-wide text-slate-900">
                  {docName}
                </p>
                {docDegree ? (
                  <p className="font-bold text-xs text-slate-700">
                    {docDegree}
                  </p>
                ) : null}
                {docRegNo ? (
                  <p className="font-semibold text-xs text-slate-600">
                    {formatRegNo(docRegNo)}
                  </p>
                ) : null}
                <p className="font-mono text-[10px] text-slate-500 pt-1 tracking-tight">
                  Report ID: <strong className="text-slate-800">{report.id}</strong>
                </p>
              </div>

              {/* Right Side: QR Code to the public read-only report (signed studies only) */}
              {verificationUrl ? (
              <div className="flex flex-col items-center justify-center text-center shrink-0">
                <div className="p-1.5 bg-white border border-slate-300 rounded shadow-2xs">
                  <QRCodeSVG
                    value={verificationUrl}
                    size={76}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-600 mt-1 uppercase tracking-tight">
                  Scan to view this report
                </span>
              </div>
              ) : null}
            </div>

            <div className="pt-2 text-[10px] font-sans text-emerald-700 font-semibold flex items-center justify-between border-t border-slate-200">
              <span>✓ Digitally Verified Teleradiology Report (UUID: {report.id})</span>
              <span className="font-bold text-slate-500">Page 1 of 1</span>
            </div>
          </div>
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
