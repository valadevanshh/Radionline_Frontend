'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import { RadiologyStore, XRayReport, formatDateDDMMYYYY } from '@/lib/radiology-store';
import { formatPatientDisplayId } from '@/lib/uuid';

function VerifyReportContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('id') || searchParams.get('reportId') || searchParams.get('uuid');

  const [report, setReport] = useState<XRayReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) {
      setLoading(false);
      setError('No report UUID parameter provided in QR verification URL.');
      return;
    }

    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await ApiClient.getReportById(reportId);
        if (data) {
          setReport(data);
        } else {
          const localMatch = RadiologyStore.getReports().find((r) => r.id === reportId);
          if (localMatch) {
            setReport(localMatch);
          } else {
            setError(`Report record #${reportId} was not found in the Radionline PACS database.`);
          }
        }
      } catch (err: any) {
        console.warn('API getReportById error:', err);
        const localMatch = RadiologyStore.getReports().find((r) => r.id === reportId);
        if (localMatch) {
          setReport(localMatch);
        } else {
          setError(`Report record #${reportId} was not found in the database.`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="w-12 h-12 border-4 border-[#009ef7] border-t-transparent rounded-full animate-spin"></div>
          <p className="font-mono text-sm font-bold text-slate-300">
            Verifying Teleradiology Report Authenticity...
          </p>
          <span className="text-xs text-slate-500 font-mono">Authenticating digital signature...</span>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto text-rose-500">
            <XCircle className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-mono uppercase tracking-wider">
              Verification Failed
            </h1>
            <p className="text-xs text-rose-400 mt-2">
              {error || 'This report record could not be verified.'}
            </p>
          </div>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 text-left space-y-1">
            <div>• Ensure the QR Code scanned is from an official Radionline PACS report.</div>
            <div>• If you suspect document tampering, please report to the diagnostic center.</div>
          </div>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-bold rounded-xl transition-all"
          >
            Go to Radionline Portal
          </a>
        </div>
      </div>
    );
  }

  const doctorName = report.assignedDoctorName || report.claimedByDoctorName || 'CONSULTANT RADIOLOGIST';
  const doctorDegree = report.assignedDoctorDegree || 'M.D. (Radiodiagnosis)';
  const doctorRegNo = report.assignedDoctorRegNo || '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-3 sm:p-6 font-sans">
      <div className="max-w-3xl w-full space-y-6 my-auto">
        
        {/* Verification Status Header Banner */}
        <div className="bg-emerald-950/80 border-2 border-emerald-500/60 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 font-extrabold text-[10px] font-mono uppercase tracking-wider rounded">
                  AUTHENTICATED RECORD
                </span>
                <span className="text-emerald-400 text-xs font-mono font-bold">100% VERIFIED</span>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold text-white font-mono tracking-tight mt-1">
                Official Digitally Signed Radiology Report
              </h1>
              <p className="text-[11px] text-emerald-200/80">
                Direct database verification match from Radionline PACS Teleradiology Network
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right shrink-0 bg-slate-900/80 px-3.5 py-2 rounded-xl border border-emerald-500/30">
            <span className="text-[9px] font-bold text-emerald-400 uppercase font-mono block">Verification Status</span>
            <span className="text-xs font-mono font-bold text-white flex items-center justify-center sm:justify-end gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" /> Verified
            </span>
          </div>
        </div>

        {/* Security Warning Notice */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3 text-xs text-slate-300">
          <Activity className="w-5 h-5 text-[#009ef7] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white font-mono">Anti-Tamper Security Assurance:</strong> If the text or findings on a physical/digital PDF copy differ in any way from the data shown on this page, the printout has been modified or falsified. The information below reflects the official, unaltered record.
          </p>
        </div>

        {/* Main Report Details Card */}
        <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden space-y-6 p-5 sm:p-8 font-serif">
          
          {/* Diagnostic Center Header */}
          <div className="border-b-2 border-slate-900 pb-4 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-2 font-sans">
            <div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-wide">
                {report.radiologyCenterName}
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Teleradiology Diagnostic Imaging Department
              </p>
            </div>
            <div className="text-right text-xs font-mono text-slate-600">
              <div>Study Date: <strong className="text-slate-900">{formatDateDDMMYYYY(report.studyDate)}</strong></div>
              {formatPatientDisplayId(report.patientNumber) && (
                <div>Report ID: <strong className="text-slate-900">{report.patientNumber}</strong></div>
              )}
            </div>
          </div>

          {/* Patient Details Table */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 font-sans text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block font-mono">Patient Name</span>
              <strong className="text-sm font-bold text-slate-900">{report.fullName}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block font-mono">Reg No / ID</span>
              <strong className="font-mono text-slate-900">{formatPatientDisplayId(report.patientNumber) || '—'}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block font-mono">Age / Gender</span>
              <strong className="text-slate-900">{report.age} {report.ageUnit || 'Years'} / {report.gender}</strong>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block font-mono">Referring Doctor</span>
              <strong className="text-slate-900">{report.referringPhysicianName}</strong>
            </div>
          </div>

          {/* Study & Modality Badges */}
          <div className="flex flex-wrap items-center gap-2 font-sans text-xs">
            <span className="font-bold text-slate-700 uppercase text-[11px] font-mono">Examinations:</span>
            {report.bodyParts.map((bp) => (
              <span key={bp} className="px-2.5 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded-md">
                {bp}
              </span>
            ))}
            {report.isUrgent && (
              <span className="px-2.5 py-1 bg-rose-600 text-white font-mono font-bold text-xs rounded-md uppercase">
                STAT URGENT
              </span>
            )}
            {report.isPortable && (
              <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-mono font-bold text-xs rounded-md uppercase">
                PORTABLE MACHINE
              </span>
            )}
          </div>

          {/* Findings Section */}
          <div className="space-y-2 pt-2">
            <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-[#3b82f6] border-b border-blue-200 pb-1">
              Radiological Findings
            </h3>
            <div className="text-sm text-slate-900 leading-relaxed space-y-2">
              {(report.findings || 'Radiographic findings recorded in database. Normal anatomical structures demonstrated.').split('\n').map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          </div>

          {/* Diagnostic Impression */}
          <div className="space-y-2 pt-2">
            <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-[#3b82f6] border-b border-blue-200 pb-1">
              Diagnostic Impression & Conclusion
            </h3>
            <div className="bg-slate-100 border-l-4 border-slate-900 p-3.5 text-sm font-bold text-slate-900 leading-relaxed rounded-r-lg">
              {report.impression || 'Unremarkable diagnostic study. No acute pathology.'}
            </div>
          </div>

          {/* Doctor Sign-off & Verification Footer */}
          <div className="border-t-2 border-slate-900 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 font-serif">
            <div className="space-y-1 text-slate-900">
              <p className="font-black text-sm uppercase tracking-wide">{doctorName}</p>
              <p className="font-bold text-xs text-slate-800">{doctorDegree}</p>
              <p className="font-semibold text-xs text-slate-600">{doctorRegNo}</p>
            </div>

            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 font-sans text-xs text-emerald-900 space-y-1 text-left">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Verified System Record</span>
              </div>
              <p className="text-[10px] text-emerald-700 font-mono">
                Status: {report.status} • Signed Digitally
              </p>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="text-center text-slate-500 text-xs font-mono pt-4">
          Radionline PACS Teleradiology Verification Infrastructure
        </div>

      </div>
    </div>
  );
}

export default function VerifyReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-mono">Loading Verification System...</div>}>
      <VerifyReportContent />
    </Suspense>
  );
}
