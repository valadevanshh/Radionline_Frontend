'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Radio,
  CheckCircle2,
  XCircle,
  Eye,
  FileEdit,
  Clock,
  Activity,
  AlertCircle,
  Building,
  User,
  FileText,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { RadiologyStore, XRayReport } from '@/lib/radiology-store';
import { ApiClient, getAccessToken, WS_BASE_URL, apiErrorMessage } from '@/lib/api-client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatPatientDisplayId } from '@/lib/uuid';

// A new live task banner shows for exactly 3 seconds; the list re-checks every 10s while the socket is down
const NEW_TASK_TOAST_MS = 3000;
const FALLBACK_POLL_MS = 10000;

export default function LiveDashboardPage() {
  const [reports, setReports] = useState<XRayReport[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);
  const [toastDurationMs, setToastDurationMs] = useState(NEW_TASK_TOAST_MS);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastReportIdRef = useRef<string | null>(null);

  // One banner at a time: a newer one replaces the current one and restarts its timer.
  // Hiding the banner never declines the case; it stays in the incoming list.
  const hideToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = null;
    toastReportIdRef.current = null;
    setToastNotice(null);
  };

  const showToast = (message: string, durationMs: number, reportId: string | null = null) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastReportIdRef.current = reportId;
    setToastNotice(message);
    setToastDurationMs(durationMs);
    setToastKey((k) => k + 1);
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null;
      toastReportIdRef.current = null;
      setToastNotice(null);
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);
  const [declineTarget, setDeclineTarget] = useState<XRayReport | null>(null);
  const router = useRouter();

  const openWorkspace = (report: XRayReport) => {
    router.push(`/dashboard/workspace/${report.id}`);
  };

  const loadReports = async () => {
    try {
      const data = await ApiClient.getReports();
      setReports(data);
    } catch {
      setReports(RadiologyStore.getReports());
    }
  };

  useEffect(() => {
    loadReports();

    const handleReportsChanged = () => loadReports();
    window.addEventListener('radionline_reports_changed', handleReportsChanged);

    // Setup WebSockets for Real-Time Incoming Records
    let ws: WebSocket | null = null;
    try {
      const token = getAccessToken();
      const baseUrl = WS_BASE_URL;
      const wsUrl = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'NEW_REPORT') {
            loadReports();
            if (payload.report) {
              const rep = payload.report as XRayReport;
              const urgentPrefix = rep.isUrgent ? '🚨 STAT URGENT LIVE SCAN' : '🔔 NEW LIVE SCAN';
              showToast(`${urgentPrefix} ARRIVED: ${rep.fullName} from ${rep.radiologyCenterName}`, NEW_TASK_TOAST_MS, rep.id || null);
            }
          } else if (payload.type === 'REPORT_CLAIMED' || payload.type === 'REPORT_REJECTED') {
            // A case accepted by any doctor leaves the incoming queue at once (refetch below confirms)
            if (payload.type === 'REPORT_CLAIMED') {
              const claimedId: string | undefined = payload.reportId || payload.report?.id;
              if (claimedId) {
                setReports((prev) =>
                  prev.map((r) =>
                    r.id === claimedId
                      ? {
                          ...r,
                          claimStatus: 'CLAIMED',
                          claimedByDoctorId: payload.claimedByDoctorId ?? r.claimedByDoctorId,
                          claimedByDoctorName: payload.claimedByDoctorName ?? r.claimedByDoctorName,
                        }
                      : r
                  )
                );
                if (toastReportIdRef.current === claimedId) hideToast();
              }
            }
            loadReports();
          }
        } catch (err) {
          console.warn('Live WebSocket parse error:', err);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
      };
    } catch (err) {
      console.warn('WebSocket init error:', err);
    }

    // Fallback if the live socket is down: refresh every FALLBACK_POLL_MS while the tab is visible,
    // and refresh whenever the tab becomes visible again.
    const pollTimer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (!ws || ws.readyState !== WebSocket.OPEN) loadReports();
    }, FALLBACK_POLL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadReports();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('radionline_reports_changed', handleReportsChanged);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(pollTimer);
      if (ws) ws.close();
    };
  }, []);

  const session = RadiologyStore.getSession();
  const docId = session?.doctorId || session?.email || '';
  const doctorName = session?.name || 'DR. CONSULTANT';

  // Accept Study Action -> Claims study and OPENS PACS VIEWER ONLY IF CLAIM SUCCEEDS
  const handleAcceptReport = async (report: XRayReport) => {
    try {
      const updated = await ApiClient.claimReport(report.id, docId, doctorName);
      RadiologyStore.saveReport(updated);
      setReports((prev) => prev.map((r) => (r.id === report.id ? updated : r)));
      openWorkspace(updated);
    } catch (err: any) {
      console.warn('Claim error:', err);
      if (String(err?.message || '').includes('API error 409')) {
        // Another doctor got there first: drop the stale item and say so plainly
        setReports((prev) => prev.filter((r) => r.id !== report.id));
        showToast('This case was already accepted by another doctor.', 5000);
      } else {
        showToast(apiErrorMessage(err, 'Could not accept this case. Please try again.'), 5000);
      }
      loadReports();
    }
  };

  // Decline Study Action
  const handleDeclineReport = (report: XRayReport) => {
    setDeclineTarget(report);
  };

  const executeDecline = async () => {
    if (!declineTarget) return;
    const report = declineTarget;
    setDeclineTarget(null);
    try {
      await ApiClient.rejectReport(report.id, docId, 'Doctor declined study from Live Feed');
      loadReports();
    } catch (err) {
      console.warn('Decline error:', err);
      loadReports();
    }
    showToast(`Declined study for ${report.fullName}${formatPatientDisplayId(report.patientNumber) ? ` (${report.patientNumber})` : ''}`, 4000);
  };

  const incomingPendingReports = reports
    .filter((r) => r.status !== 'Completed' && r.claimStatus !== 'CLAIMED' && (!r.claimedByDoctorId || r.claimedByDoctorId === 'UNCLAIMED'))
    .sort((a, b) => { const au=a.isUrgent?0:1, bu=b.isUrgent?0:1; if(au!==bu) return au-bu; const ap=(a.isPartial||((a.signedStudyCount||0)>0&&(a.signedStudyCount||0)<(a.studyCount||a.bodyParts?.length||0)))?0:1; const bp=(b.isPartial||((b.signedStudyCount||0)>0&&(b.signedStudyCount||0)<(b.studyCount||b.bodyParts?.length||0)))?0:1; if(ap!==bp) return ap-bp; return 0; });

  const claimedMyReports = reports
    .filter((r) => r.status !== 'Completed' && (r.claimedByDoctorId === docId || r.claimedByDoctorId === session?.email || r.assignedDoctorId === docId || r.assignedDoctorId === session?.email))
    .sort((a, b) => { const au=a.isUrgent?0:1, bu=b.isUrgent?0:1; if(au!==bu) return au-bu; const ap=(a.isPartial||((a.signedStudyCount||0)>0&&(a.signedStudyCount||0)<(a.studyCount||a.bodyParts?.length||0)))?0:1; const bp=(b.isPartial||((b.signedStudyCount||0)>0&&(b.signedStudyCount||0)<(b.studyCount||b.bodyParts?.length||0)))?0:1; if(ap!==bp) return ap-bp; return 0; });

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto bg-slate-50 text-slate-900 font-sans">
      {/* Toast Notification Banner */}
      {toastNotice && (
        <div
          key={toastKey}
          role="status"
          className="rn-toast bg-[#009ef7] text-white px-4 py-2 text-xs font-extrabold flex items-center justify-between shadow-md sticky top-0 z-40"
          style={{ animationDuration: `${toastDurationMs}ms` }}
        >
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-yellow-300 animate-pulse" />
            <span>{toastNotice}</span>
          </div>
          <button type="button" onClick={hideToast} className="text-white hover:text-slate-200 cursor-pointer font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="w-full p-3 sm:p-6 space-y-4 sm:space-y-5">
        
        {/* Top Concise Header Bar */}
        <div className="flex items-center justify-between gap-3 bg-white px-3 sm:px-5 py-3 sm:py-3.5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 bg-[#009ef7]/10 text-[#009ef7] rounded-lg border border-[#009ef7]/20 shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Doctor Live Dashboard</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className={`px-2.5 py-1 rounded-full border text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap ${
              wsConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span>{wsConnected ? <><span className="hidden sm:inline">Live WS </span>Connected</> : 'Polling'}</span>
            </div>
          </div>
        </div>

        {/* Section 1: Incoming Live Records Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#009ef7]" />
                <span>Incoming Live Patient Cases</span>
              </h2>
              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold text-[10px] rounded-full border border-rose-200">
                {incomingPendingReports.length} Waiting
              </span>
            </div>
          </div>

          {incomingPendingReports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {incomingPendingReports.map((r) => (
                <div
                  key={r.id}
                  className={`rounded-xl p-4 shadow-xs hover:shadow-md flex flex-col justify-between space-y-3 transition-all border ${
                    r.isUrgent
                      ? 'bg-rose-50/40 border-2 border-rose-500 hover:border-rose-600 shadow-rose-100'
                      : 'bg-white border-slate-200 hover:border-[#009ef7]'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header */}
                    <div className="flex items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        {formatPatientDisplayId(r.patientNumber) ? (
                          <span className="text-[11px] sm:text-xs font-extrabold font-mono text-[#009ef7] px-2 py-0.5 bg-[#009ef7]/10 rounded border border-[#009ef7]/20">
                            {r.patientNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] sm:text-xs font-bold text-slate-700 px-2 py-0.5 bg-slate-100 rounded border border-slate-200">
                            {r.modality || 'Study'}
                          </span>
                        )}
                        {r.isUrgent && (
                          <span className="px-2 py-0.5 bg-rose-600 text-white font-mono font-bold text-[10px] rounded uppercase animate-pulse flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> STAT URGENT
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 shrink-0 pt-0.5 sm:pt-0">
                        {r.studyDate}
                      </span>
                    </div>

                    {/* Patient Demographics */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        <span className={r.isUrgent ? "text-red-500 font-bold" : undefined}>{r.fullName}</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Gender: <strong className="text-slate-800">{r.gender.charAt(0)}</strong> • Age: <strong className="text-slate-800">{r.age} yrs</strong>
                      </p>
                    </div>

                    {/* Diagnostic Lab */}
                    <div className="text-xs text-slate-700 flex items-center gap-1.5 bg-slate-50 p-2 rounded border border-slate-200">
                      <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-semibold truncate">{r.radiologyCenterName}</span>
                    </div>

                    {/* Body Parts */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Body Part / Study:
                      </span>
                      <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded inline-block">
                        {r.bodyParts.join(', ')}
                      </span>
                    </div>

                    {/* Clinical History */}
                    {r.clinicalNotes && (
                      <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                          <Activity className="w-3 h-3 text-amber-600" /> History:
                        </span>
                        <p className="text-xs text-amber-900 font-sans italic leading-snug">
                          "{r.clinicalNotes}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Accept vs Decline Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAcceptReport(r)}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeclineReport(r)}
                      className="py-2 px-3 bg-white hover:bg-rose-50 text-rose-700 border border-slate-300 hover:border-rose-300 font-bold text-xs uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center shadow-xs">
              <Radio className="w-8 h-8 text-emerald-600 mb-2 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-800">
                No Pending Cases Waiting
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Incoming scans from diagnostic centers will appear here instantly.
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Accepted / Claimed Cases */}
        {claimedMyReports.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>My Accepted Active Cases ({claimedMyReports.length})</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {claimedMyReports.map((r) => (
                <div
                  key={r.id}
                  className={`rounded-xl p-4 space-y-2.5 shadow-xs border ${
                    r.isUrgent
                      ? 'bg-rose-50/40 border-2 border-rose-500 shadow-rose-100'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {formatPatientDisplayId(r.patientNumber) ? (
                        <span className="text-xs font-mono font-bold text-[#009ef7]">{r.patientNumber}</span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500">{r.modality || 'Study'}</span>
                      )}
                      {r.isUrgent && (
                        <span className="px-1.5 py-0.5 bg-rose-600 text-white font-mono font-bold text-[9px] rounded uppercase animate-pulse flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> URGENT
                        </span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
                      ACCEPTED
                    </span>
                  </div>
                  <div className={`text-sm font-bold ${r.isUrgent ? "text-red-500" : "text-slate-900"}`}>{r.fullName}{r.isPartial ? <span className="ml-2 text-[10px] font-semibold text-amber-600">{r.signedStudyCount}/{r.studyCount || r.bodyParts?.length} reported</span> : null}</div>
                  <div className="text-xs text-slate-500">{r.radiologyCenterName}</div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => openWorkspace(r)}
                      className="flex-1 py-1.5 bg-[#009ef7] hover:bg-[#008be0] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Open PACS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openWorkspace(r)}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Report</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      <ConfirmDialog
        open={!!declineTarget}
        title="Decline Case"
        message={declineTarget ? `Are you sure you want to decline the study for ${declineTarget.fullName}${formatPatientDisplayId(declineTarget.patientNumber) ? ` (${declineTarget.patientNumber})` : ''}?` : ''}
        confirmLabel="Decline"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={executeDecline}
        onCancel={() => setDeclineTarget(null)}
      />
    </div>
  );
}
