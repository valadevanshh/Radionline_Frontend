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
import { UrgentBadge, PortableBadge } from '@/components/ui/CaseFlags';
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
              const claimedBy = payload.claimedByDoctorId;
              if (claimedId) {
                if (claimedBy && claimedBy !== docId && claimedBy !== session?.email) {
                  // Accepted by another doctor: immediately disappear from this doctor's view
                  setReports((prev) => prev.filter((r) => r.id !== claimedId));
                  if (toastReportIdRef.current === claimedId) hideToast();
                  return;
                }
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
    .filter((r) => {
      if (r.status === 'Completed' || r.status === 'In Review' || r.claimStatus === 'CLAIMED') return false;
      if (r.claimedByDoctorId && r.claimedByDoctorId !== 'UNCLAIMED') return false;
      if (r.studies && r.studies.some((s) => s.claimedBy && s.claimedBy !== 'UNCLAIMED')) return false;
      return true;
    })
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
            <>
              {/* Mobile: compact stacked rows (below md) */}
              <div className="md:hidden bg-white border border-slate-200 rounded-xl shadow-xs divide-y divide-slate-100 overflow-hidden">
                {incomingPendingReports.map((r) => (
                  <div key={r.id} className={`p-3 space-y-2 ${r.isUrgent ? 'bg-rose-50/60 border-l-4 border-rose-500' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-sm font-bold truncate ${r.isUrgent ? 'text-red-500' : 'text-slate-900'}`}>{r.fullName}</span>
                          {r.isUrgent && <UrgentBadge />}
                          {r.isPortable && <PortableBadge />}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {formatPatientDisplayId(r.patientNumber) ? <span className="font-mono font-bold text-[#009ef7] mr-1">{r.patientNumber}</span> : null}
                          {r.modality || 'Study'} · {r.gender?.charAt(0)} · {r.age} yrs
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">{r.studyDate}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-1 min-w-0">
                      <Building className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{r.radiologyCenterName}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-bold rounded">{r.bodyParts.join(', ')}</span>
                      {r.clinicalNotes && <span className="text-[11px] text-amber-800 italic truncate max-w-full">Hx: {r.clinicalNotes}</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => handleAcceptReport(r)} className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase rounded-md flex items-center justify-center gap-1 cursor-pointer">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                      </button>
                      <button type="button" onClick={() => handleDeclineReport(r)} className="py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-slate-300 font-bold text-[11px] uppercase rounded-md flex items-center justify-center gap-1 cursor-pointer">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tablet / laptop / desktop: table (md and up) */}
              <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 font-bold">Patient</th>
                        <th className="px-3 py-2.5 font-bold">Modality</th>
                        <th className="px-3 py-2.5 font-bold">Body Part / Study</th>
                        <th className="px-3 py-2.5 font-bold hidden lg:table-cell">Center</th>
                        <th className="px-3 py-2.5 font-bold hidden xl:table-cell">History</th>
                        <th className="px-3 py-2.5 font-bold whitespace-nowrap">Date</th>
                        <th className="px-3 py-2.5 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {incomingPendingReports.map((r) => (
                        <tr key={r.id} className={`transition-colors ${r.isUrgent ? 'bg-rose-50/60 hover:bg-rose-50' : 'hover:bg-slate-50'}`}>
                          <td className={`px-3 py-2.5 ${r.isUrgent ? 'border-l-4 border-rose-500' : ''}`}>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-bold ${r.isUrgent ? 'text-red-500' : 'text-slate-900'}`}>{r.fullName}</span>
                              {r.isUrgent && <UrgentBadge />}
                              {r.isPortable && <PortableBadge />}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 whitespace-nowrap">
                              {formatPatientDisplayId(r.patientNumber) ? <span className="font-mono font-bold text-[#009ef7] mr-1">{r.patientNumber}</span> : null}
                              {r.gender?.charAt(0)} · {r.age} yrs
                            </div>
                            <div className="text-[11px] text-slate-500 lg:hidden truncate max-w-[180px]">{r.radiologyCenterName}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-bold text-slate-700 whitespace-nowrap">{r.modality || 'Study'}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="px-1.5 py-0.5 bg-blue-50 border border-blue-200 text-blue-800 font-bold rounded inline-block">{r.bodyParts.join(', ')}</span>
                          </td>
                          <td className="px-3 py-2.5 hidden lg:table-cell text-slate-700 font-semibold max-w-[200px] truncate" title={r.radiologyCenterName}>{r.radiologyCenterName}</td>
                          <td className="px-3 py-2.5 hidden xl:table-cell text-amber-800 italic max-w-[220px] truncate" title={r.clinicalNotes || ''}>{r.clinicalNotes || '—'}</td>
                          <td className="px-3 py-2.5 font-mono text-slate-500 whitespace-nowrap">{r.studyDate}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center justify-end gap-1.5">
                              <button type="button" onClick={() => handleAcceptReport(r)} title="Accept" className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] uppercase rounded-md flex items-center gap-1 cursor-pointer">
                                <CheckCircle2 className="w-3.5 h-3.5" /><span className="hidden lg:inline">Accept</span>
                              </button>
                              <button type="button" onClick={() => handleDeclineReport(r)} title="Decline" className="py-1.5 px-2.5 bg-white hover:bg-rose-50 text-rose-700 border border-slate-300 hover:border-rose-300 font-bold text-[11px] uppercase rounded-md flex items-center gap-1 cursor-pointer">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" /><span className="hidden lg:inline">Decline</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
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
                      {r.isUrgent && <UrgentBadge />}
                      {r.isPortable && <PortableBadge />}
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
