'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, FileSignature, ShieldCheck, Stethoscope, Printer, BookmarkPlus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { XRayReport, Doctor, RadiologyStore, RadiologyCenter, formatDateDDMMYYYY } from '@/lib/radiology-store';
import { printReportElement, type PrintReportPayload } from '@/lib/print-helper';
import { MODALITY_OPTIONS } from '@/lib/radiology-templates';
import { ApiClient, apiErrorMessage, resolveMediaUrl } from '@/lib/api-client';
import { canWriteTemplates, useSession } from '@/lib/access';
import { formatPatientDisplayId } from '@/lib/uuid';
import ReportTemplateModal from '@/components/ReportTemplateModal';


interface ReviewSignReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: XRayReport | null;
  currentDoctor?: Doctor;
  onSignComplete?: () => void;
  onSuccess?: () => void;
}

export default function ReviewSignReportModal({
  isOpen,
  onClose,
  report,
  currentDoctor,
  onSignComplete,
  onSuccess,
}: ReviewSignReportModalProps) {
  const [findings, setFindings] = useState('');
  const [impression, setImpression] = useState('');

  // Save Template Modal State
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [saveTmplTitle, setSaveTmplTitle] = useState('');
  const [saveTmplCenterId, setSaveTmplCenterId] = useState('ALL');
  const [saveTmplModality, setSaveTmplModality] = useState('X-Ray Chest');
  const [saveTemplateSuccess, setSaveTemplateSuccess] = useState(false);
  const [allCenters, setAllCenters] = useState<RadiologyCenter[]>([]);
  const session = useSession();
  const canCreateTemplate = canWriteTemplates(session);

  useEffect(() => {
    if (report) {
      const defaultFinding =
        report.reportsByBodyPart?.[report.bodyParts[0]] ||
        'Radiological evaluation of the X-Ray shows normal bony architecture and soft tissues.';
      const defaultImpression =
        report.impressionsByBodyPart?.[report.bodyParts[0]] || 'No acute abnormality seen.';

      setFindings(defaultFinding);
      setImpression(defaultImpression);
      setAllCenters(RadiologyStore.getCenters());
      ApiClient.getCenters().then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setAllCenters(list);
          RadiologyStore.setCenters(list);
        }
      }).catch(() => {});
    }
  }, [report]);

  if (!isOpen || !report) return null;

  const doctorName = currentDoctor ? currentDoctor.fullName : report.assignedDoctorName || '';

  const handleOpenSaveTemplate = () => {
    if (!canCreateTemplate) return;
    setSaveTmplTitle(report.bodyParts?.length ? `${report.bodyParts.join(', ')} — Master Template` : 'New Custom Radiology Template');
    setSaveTmplCenterId(report.radiologyCenterId || 'ALL');
    setSaveTmplModality('X-Ray Chest');
    setSaveTemplateModalOpen(true);
  };

  const handleConfirmSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateTemplate || !saveTmplTitle.trim()) return;

    let centerName = 'All Centers';
    if (saveTmplCenterId !== 'ALL') {
      const matched = allCenters.find((c) => c.id === saveTmplCenterId);
      if (matched) centerName = matched.centerName;
    }

    const contentHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
        <h2 style="color: #009ef7; border-bottom: 2px solid #009ef7; padding-bottom: 4px; text-transform: uppercase;">
          ${saveTmplTitle}
        </h2>
        <h3 style="color: #0f172a; margin-bottom: 8px;">RADIOLOGICAL FINDINGS:</h3>
        <p>${findings.replace(/\n/g, '<br/>')}</p>
        <br/>
        <h3 style="color: #0f172a; margin-bottom: 8px;">IMPRESSION & CONCLUSION:</h3>
        <div style="background-color: #f1f5f9; padding: 10px; border-left: 4px solid #009ef7;">
          <p>${impression.replace(/\n/g, '<br/>')}</p>
        </div>
      </div>
    `;

    RadiologyStore.saveTemplate({
      title: saveTmplTitle.trim(),
      centerId: saveTmplCenterId,
      centerName,
      modality: saveTmplModality,
      bodyPart: saveTmplModality,
      findings,
      impression,
      content: contentHtml,
    });

    setSaveTemplateModalOpen(false);
    setSaveTemplateSuccess(true);
    setTimeout(() => setSaveTemplateSuccess(false), 3000);
  };

  const handleSaveAndSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!findings || !impression) {
      alert('Please enter Radiological Findings and Diagnostic Impression before signing.');
      return;
    }

    const updatedPayload = {
      ...report,
      findings,
      impression,
      status: 'Completed' as const,
      assignedDoctorName: doctorName,
    };


    try {
      await ApiClient.saveReport(updatedPayload);
    } catch (err) {
      alert(apiErrorMessage(err, 'Could not sign this report'));
      return;
    }

    RadiologyStore.saveReport(updatedPayload);

    if (onSignComplete) onSignComplete();
    if (onSuccess) onSuccess();
    onClose();
  };


  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative bg-white text-slate-900 w-full max-w-2xl border border-slate-200 shadow-2xl my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#009ef7]/20 border border-[#009ef7]/40 text-[#009ef7]">
              <FileSignature className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Radiologist Case Review & Digital Sign-Off
                </h3>
                {report.isUrgent && (
                  <span className="px-2 py-0.5 bg-rose-600 text-white font-mono font-bold text-[10px] rounded uppercase animate-pulse flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-white" /> STAT URGENT
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-300 font-mono">
                {report.fullName}{formatPatientDisplayId(report.patientNumber) ? ` · ${report.patientNumber}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveAndSign} className="p-6 space-y-4 text-xs">
          {/* Patient Summary */}
          <div className="bg-slate-50 border border-slate-200 p-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500 font-semibold uppercase block text-[9px]">Patient Name</span>
              <span className="font-bold text-slate-900">{report.fullName}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold uppercase block text-[9px]">Age / Gender</span>
              <span className="font-bold text-slate-800">{report.age} Yrs / {report.gender}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold uppercase block text-[9px]">Investigations</span>
              <span className="font-bold text-[#009ef7]">{report.bodyParts.join(', ')}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold uppercase block text-[9px]">Signing Radiologist</span>
              <span className="font-bold text-emerald-700">{doctorName}</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 uppercase tracking-wider text-[11px]">
              Radiological Findings *
            </label>
            <textarea
              required
              rows={4}
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              className="w-full p-3 border border-slate-300 bg-white text-slate-900 focus:border-[#009ef7] focus:outline-none text-xs font-mono leading-relaxed"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 uppercase tracking-wider text-[11px]">
              Diagnostic Impression *
            </label>
            <textarea
              required
              rows={3}
              value={impression}
              onChange={(e) => setImpression(e.target.value)}
              className="w-full p-3 border border-slate-300 bg-white text-slate-900 focus:border-[#009ef7] focus:outline-none text-xs font-mono leading-relaxed font-bold"
            />
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Digital Signature Verified ({doctorName})</span>
            </div>
            <span className="text-[10px] font-mono uppercase bg-emerald-100 px-2 py-0.5 font-bold">
              Ready to Sign
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
            {canCreateTemplate && (
            <button
              type="button"
              onClick={handleOpenSaveTemplate}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all cursor-pointer shadow-xs border ${
                saveTemplateSuccess
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 border-purple-600 text-white'
              }`}
              title="Save current written findings & impression as reusable template"
            >
              {saveTemplateSuccess ? <CheckCircle2 className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
              <span>{saveTemplateSuccess ? 'Saved to Templates!' : '+ Save New Template'}</span>
            </button>
          )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!report) return;
                  const centerRec = allCenters.find(
                    (c) =>
                      c.id === report.radiologyCenterId ||
                      (c.centerName && report.radiologyCenterName && c.centerName.trim().toLowerCase() === report.radiologyCenterName.trim().toLowerCase())
                  );
                  const payload: PrintReportPayload = {
                    centerName: centerRec?.centerName || report.radiologyCenterName || 'RADIOLOGY CENTER',
                    centerAddress: centerRec?.address || '',
                    centerPhone: centerRec?.contactNumber || '',
                    centerLogoUrl: resolveMediaUrl(centerRec?.logoUrl || ''),
                    centerHeaderUrl: resolveMediaUrl(centerRec?.headerTemplateUrl || ''),
                    letterheadMode: centerRec?.letterheadMode || 'full-page',
                    patientName: report.fullName,
                    patientId: formatPatientDisplayId(report.patientNumber) || '—',
                    ageSex: `${report.age} ${report.ageUnit === 'Months' ? 'M' : report.ageUnit === 'Days' ? 'D' : 'Y'} / ${report.gender ? report.gender.charAt(0).toUpperCase() : 'M'}`,
                    studyDate: formatDateDDMMYYYY(report.studyDate),
                    referringDoctor: report.referringPhysicianName || '',
                    modality: report.bodyParts?.[0] || 'X-Ray',
                    studyParts: report.bodyParts?.join(', ') || '',
                    clinicalHistory: report.clinicalNotes || 'Not provided.',
                    studies: [
                      {
                        title: `RADIOGRAPH OF ${report.bodyParts?.join(', ') || 'STUDY'} VIEW`,
                        technique: 'Standard radiography',
                        findings: findings || report.findings || '',
                        impression: impression || report.impression || '',
                      },
                    ],
                    doctorName: doctorName || report.assignedDoctorName || 'Reporting Radiologist',
                    reportedAt: formatDateDDMMYYYY(report.studyDate),
                    withHeader: true,
                  };
                  printReportElement(null, `Radiology Case Review - ${report.patientNumber}`, payload);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-700" />
                <span>Print / PDF</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#009ef7] hover:bg-[#0095e8] transition-colors cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Sign & Authorize Report</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Save as Template in Report Format */}
      {canCreateTemplate && (
        <ReportTemplateModal
          isOpen={saveTemplateModalOpen}
          onClose={() => setSaveTemplateModalOpen(false)}
          prefill={{
            title: `${report?.bodyParts?.join(', ') || 'Study'} Template`,
            centerId: report?.radiologyCenterId || 'ALL',
            modality: report?.bodyParts?.[0] || 'X-Ray',
            bodyPart: report?.bodyParts?.[0] || 'CHEST PA/AP',
            findings: findings,
            impression: impression,
          }}
          onSaved={() => {
            setSaveTemplateSuccess(true);
            setTimeout(() => setSaveTemplateSuccess(false), 3000);
          }}
        />
      )}
    </div>
  );
}
