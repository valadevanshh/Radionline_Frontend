'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Users,
  Building,
  ArrowRight,
  CheckCircle2,
  Clock,
  BookmarkPlus,
  Eye,
  Activity,
  AlertTriangle,
  FileEdit,
  Plus,
  FolderOpen,
  Wallet,
  UploadCloud,
} from 'lucide-react';
import { RadiologyStore, XRayReport, formatDateDDMMYYYY, UserAccount } from '@/lib/radiology-store';
import { ApiClient, RevenueSummary, getAccessToken, WS_BASE_URL, isPendingApproval } from '@/lib/api-client';
import { canEditCase, canUploadCase, showCenterColumn } from '@/lib/access';
import CaseActivityPanel from '@/components/CaseActivityPanel';
import { RowChatButton, RowEditButton } from '@/components/CaseRowButtons';
import { toast } from '@/components/ui/Toast';
import DataTape, { Metric } from '@/components/DataTape';
import NewXRayReportModal, { NewCasePayload } from '@/components/NewXRayReportModal';
import { useResizableColumns } from '@/lib/use-resizable-columns';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { RowCard, RowCardList, RT_ACTIONS, RT_CONTAINER, RT_TABLET_HIDE, RT_TABLET_ONLY } from '@/components/ui/ResponsiveTable';

export default function DashboardOverviewPage() {
  const [reports, setReports] = useState<XRayReport[]>([]);
  const [doctorCount, setDoctorCount] = useState<number>(0);
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState<boolean>(false);
  const [session, setSession] = useState<UserAccount | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [revenueError, setRevenueError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<XRayReport | null>(null);
  const [chatTarget, setChatTarget] = useState<XRayReport | null>(null);
  const router = useRouter();

  const openWorkspace = (report: XRayReport) => {
    router.push(`/dashboard/workspace/${report.id}`);
  };

  const { widths, startResizing } = useResizableColumns({
    patient: 150,
    center: 150,
    bodyParts: 120,
    status: 80,
    studyDate: 90,
    actions: 300,
  });

  const loadDashboardData = async () => {
    const sess = RadiologyStore.getSession();
    setSession(sess);
    try {
      const [reps, docs] = await Promise.all([
        ApiClient.getReports(),
        ApiClient.getDoctors(),
      ]);
      setReports(reps);
      setDoctorCount(docs.length);
    } catch {
      setReports(RadiologyStore.getReports());
      setDoctorCount(RadiologyStore.getDoctors().length);
    }

    // Priority 7: Super Admin monthly revenue from real invoice tables only
    if (sess?.role === 'SUPER_ADMIN') {
      try {
        const rev = await ApiClient.getRevenueSummary(6);
        setRevenue(rev);
        setRevenueError(null);
      } catch (err: any) {
        setRevenue(null);
        setRevenueError(err?.message || 'Failed to load revenue');
      }
    } else {
      setRevenue(null);
      setRevenueError(null);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const handleReportsChanged = () => loadDashboardData();
    window.addEventListener('radionline_reports_changed', handleReportsChanged);
    // Live refresh when a case is added, edited or deleted elsewhere
    let ws: WebSocket | null = null;
    try {
      const token = getAccessToken();
      ws = new WebSocket(token ? `${WS_BASE_URL}?token=${encodeURIComponent(token)}` : WS_BASE_URL);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (['NEW_REPORT', 'CASE_DELETED', 'CASE_UPDATED', 'REPORT_CLAIMED', 'REPORT_SIGNED'].includes(data?.type)) {
            loadDashboardData();
          }
        } catch {
          /* ignore */
        }
      };
    } catch {
      /* ignore */
    }
    return () => {
      window.removeEventListener('radionline_reports_changed', handleReportsChanged);
      if (ws) ws.close();
    };
  }, []);

  const completedCount = reports.filter((r) => r.status === 'Completed').length;
  const pendingCount = reports.filter((r) => r.status !== 'Completed').length;
  const urgentCount = reports.filter((r) => r.isUrgent && r.status !== 'Completed').length;

  const metrics: Metric[] = [
    { label: 'TOTAL CASES', value: String(reports.length), delta: 'Live', trend: 'up', color: 'navy' },
    { label: 'COMPLETED', value: String(completedCount), delta: 'Live', trend: 'up', color: 'teal' },
    { label: 'PENDING REVIEW', value: String(pendingCount), delta: 'Live', trend: 'down', color: 'amber' },
    { label: 'STAT URGENT', value: String(urgentCount), delta: 'STAT', trend: 'neutral', color: 'red' },
    { label: 'RADIOLOGISTS', value: String(doctorCount), delta: 'Online', trend: 'up', color: 'blue' },
  ];

  // Upload Image: errors go back to the dialog (it stays open); a Manager's upload waits for approval.
  const handleSaveNewReport = async (reportData: NewCasePayload) => {
    const saved = await ApiClient.saveReport(reportData);
    if (isPendingApproval(saved)) {
      toast.info(saved.message || 'Sent to the Super Admin for approval.');
    } else {
      RadiologyStore.saveReport(saved);
      toast.success(`Case uploaded: ${reportData.fullName}`);
    }
    setIsNewReportModalOpen(false);
    loadDashboardData();
  };

  const handleCaseEdited = (result: { pending: boolean; message: string; report?: XRayReport }) => {
    if (result.pending) toast.info(result.message);
    else toast.success(result.message);
    loadDashboardData();
  };

  const showCenter = showCenterColumn(session);
  const canUpload = canUploadCase(session);

  const pendingReports = reports
    .filter((r) => r.status === 'Pending')
    .sort((a, b) => (a.isUrgent === b.isUrgent ? 0 : a.isUrgent ? -1 : 1));

  const sortedReports = [...reports].sort((a, b) => (a.isUrgent === b.isUrgent ? 0 : a.isUrgent ? -1 : 1));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900">
      {/* Sleek Minimal Top Action & Telemetry Strip */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center justify-between md:justify-start gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#009ef7]/10 text-[#009ef7] border border-[#009ef7]/20 rounded-lg shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <h1 className="text-xs sm:text-sm font-extrabold text-slate-900 font-mono uppercase tracking-tight truncate">
              Radiology Portal Overview
            </h1>
          </div>

          {/* Desktop Metric Chips */}
          <div className="hidden md:flex items-center gap-1.5 flex-wrap font-mono text-[11px]">
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded border border-slate-200">
              TOTAL: <strong className="text-slate-900">{reports.length}</strong>
            </span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded border border-emerald-200">
              COMPLETED: <strong>{completedCount}</strong>
            </span>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-bold rounded border border-amber-200">
              PENDING: <strong>{pendingCount}</strong>
            </span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 bg-rose-600 text-white font-bold rounded animate-pulse">
                STAT URGENT: <strong>{pendingCount}</strong>
              </span>
            )}
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded border border-indigo-200">
              RADIOLOGISTS: <strong>{doctorCount}</strong>
            </span>
          </div>

          {/* Mobile Top Upload Image Button */}
          {canUpload && (
          <div className="flex md:hidden items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsNewReportModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-transparent text-[#009ef7] border-[1.5px] border-[#009ef7] hover:bg-[#009ef7] hover:text-white text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all font-mono"
              data-testid="upload-image-btn-mobile"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Image</span>
            </button>
          </div>
          )}
        </div>

        {/* Desktop Action Buttons */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/all-reports"
            className="px-3 py-1.5 bg-transparent text-slate-700 border-[1.5px] border-slate-300 hover:bg-slate-100 hover:text-slate-900 text-xs font-bold font-mono rounded-lg transition-colors inline-flex items-center gap-1"
          >
            <span>All Reports ({reports.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {canUpload && (
            <button
              type="button"
              onClick={() => setIsNewReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-transparent text-[#009ef7] border-[1.5px] border-[#009ef7] hover:bg-[#009ef7] hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer font-mono shrink-0"
              data-testid="upload-image-btn"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Image</span>
            </button>
          )}
        </div>

        {/* Mobile Metric Cards Row */}
        <div className="flex md:hidden items-center justify-between gap-2 pt-1 border-t border-slate-100 font-mono text-[10px]">
          <div className="flex-1 bg-slate-100/80 p-1.5 rounded-lg text-center border border-slate-200/60">
            <div className="text-slate-500 font-semibold text-[9px] uppercase">Total</div>
            <div className="font-extrabold text-slate-900 text-xs">{reports.length}</div>
          </div>
          <div className="flex-1 bg-emerald-50/80 p-1.5 rounded-lg text-center border border-emerald-200/60">
            <div className="text-emerald-700 font-semibold text-[9px] uppercase">Completed</div>
            <div className="font-extrabold text-emerald-800 text-xs">{completedCount}</div>
          </div>
          <div className="flex-1 bg-amber-50/80 p-1.5 rounded-lg text-center border border-amber-200/60">
            <div className="text-amber-700 font-semibold text-[9px] uppercase">Pending</div>
            <div className="font-extrabold text-amber-800 text-xs">{pendingCount}</div>
          </div>
        </div>
      </div>

      {/* Priority 7: Super Admin monthly revenue */}
      {session?.role === 'SUPER_ADMIN' && (
        <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 shrink-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-[11px] font-extrabold font-mono uppercase tracking-tight text-slate-800">
                Monthly Revenue
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                ({revenue?.currentPeriod || '-'})
              </span>
            </div>
            <Link
              href="/dashboard/invoices"
              className="text-[10px] font-bold font-mono text-[#009ef7] hover:underline inline-flex items-center gap-1"
            >
              Invoices <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {revenue && (
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap font-mono text-[10px] sm:text-[11px]">
              <span className="px-2 py-0.5 bg-sky-50 text-sky-800 font-bold rounded border border-sky-200">
                BILLING: <strong>₹{revenue.currentMonth.centerBilling}</strong>
              </span>
              <span className="px-2 py-0.5 bg-violet-50 text-violet-800 font-bold rounded border border-violet-200">
                PAYOUTS: <strong>₹{revenue.currentMonth.doctorPayouts}</strong>
              </span>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded border border-emerald-200">
                NET: <strong>₹{revenue.currentMonth.net}</strong>
              </span>
            </div>
          )}
        </div>
      )}

      {/* STAT Urgent Review Banner (Compact 1-line Strip if Urgent cases exist) */}
      {pendingReports.length > 0 && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 font-mono overflow-hidden">
            <span className="px-1.5 py-0.5 bg-rose-600 text-white font-bold text-[9px] rounded uppercase animate-pulse shrink-0">
              STAT URGENT ({pendingReports.length})
            </span>
            <span className="font-bold text-rose-900 truncate">
              {pendingReports[0].fullName} ({pendingReports[0].patientNumber}){showCenter ? ` — ${pendingReports[0].radiologyCenterName}` : ''}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => openWorkspace(pendingReports[0])}
              className="btn-pacs"
            >
              <Eye className="w-3.5 h-3.5 text-[#009ef7]" />
              <span>PACS</span>
            </button>
            <button
              type="button"
              onClick={() => openWorkspace(pendingReports[0])}
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded"
            >
              Report
            </button>
          </div>
        </div>
      )}

      {/* Main Full-Height Clinical Patient Studies Data Table (Zero Bloated Cards) */}
      <div className={`flex-1 data-table-container ${RT_CONTAINER} overflow-y-auto bg-slate-50 md:bg-white pb-3 md:pb-6`}>
        {reports.length > 0 ? (
          <>
          {/* Phones: compact case cards (shared RowCard pattern) */}
          <RowCardList testId="overview-cards">
            {sortedReports.map((r) => (
              <RowCard
                key={r.id}
                tone={r.isUrgent ? 'urgent' : 'default'}
                title={<span className={r.isUrgent ? 'text-red-600' : undefined}>{r.fullName}</span>}
                subtitle={<span className="font-mono">{r.patientNumber} {'\u2022'} {r.gender}/{r.age}y</span>}
                aside={
                  <StatusBadge
                    status={r.status}
                    isPartial={
                      r.isPartial ||
                      ((r.signedStudyCount ?? 0) > 0 &&
                        (r.signedStudyCount ?? 0) < (r.studyCount ?? r.bodyParts?.length ?? 0))
                    }
                  />
                }
                tags={
                  <>
                    {r.isUrgent && (
                      <span className="px-1.5 py-0.5 bg-rose-600 text-white font-mono font-bold text-[9px] rounded uppercase">
                        STAT URGENT
                      </span>
                    )}
                    {r.bodyParts.map((bp, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] font-bold rounded border border-slate-200">
                        {bp}
                      </span>
                    ))}
                  </>
                }
                fields={[
                  ...(showCenter ? [{ label: 'Center', value: r.radiologyCenterName }] : []),
                  { label: 'Study Date', value: <span className="font-mono">{formatDateDDMMYYYY(r.studyDate)}</span> },
                ]}
                actions={
                  <>
                    <button type="button" onClick={() => openWorkspace(r)} className="btn-pacs">
                      <Eye className="w-3.5 h-3.5 text-[#009ef7]" />
                      <span>PACS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openWorkspace(r)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Report</span>
                    </button>
                    <RowChatButton onClick={() => setChatTarget(r)} />
                    {canEditCase(session, r) && <RowEditButton onClick={() => setEditTarget(r)} />}
                  </>
                }
              />
            ))}
          </RowCardList>
          <table className="data-table hidden md:table">
            <thead>
              <tr>
                <th title="Patient Information" style={{ width: widths.patient, position: 'relative' }}>
                  <span>Patient Information</span>
                  <div className="col-resizer" onMouseDown={(e) => startResizing('patient', e.clientX, widths.patient)} />
                </th>
                {showCenter && (
                  <th title="Diagnostic Center" className={RT_TABLET_HIDE} style={{ width: widths.center, position: 'relative' }}>
                    <span>Diagnostic Center</span>
                    <div className="col-resizer" onMouseDown={(e) => startResizing('center', e.clientX, widths.center)} />
                  </th>
                )}
                <th title="Modality / Body Parts" style={{ width: widths.bodyParts, position: 'relative' }}>
                  <span>Modality / Body Parts</span>
                  <div className="col-resizer" onMouseDown={(e) => startResizing('bodyParts', e.clientX, widths.bodyParts)} />
                </th>
                <th title="Status" style={{ width: widths.status, position: 'relative' }}>
                  <span>Status</span>
                  <div className="col-resizer" onMouseDown={(e) => startResizing('status', e.clientX, widths.status)} />
                </th>
                <th title="Study Date" style={{ width: widths.studyDate, position: 'relative' }}>
                  <span>Study Date</span>
                  <div className="col-resizer" onMouseDown={(e) => startResizing('studyDate', e.clientX, widths.studyDate)} />
                </th>
                <th title="Actions" style={{ width: widths.actions, textAlign: 'right', position: 'relative' }}>
                  <span>Actions</span>
                  <div className="col-resizer" onMouseDown={(e) => startResizing('actions', e.clientX, widths.actions)} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedReports.map((r) => (
                <tr key={r.id} className={`hover:bg-slate-50/80 transition-colors ${r.isUrgent ? 'bg-rose-50/20' : ''}`}>
                  <td title={`${r.fullName} (${r.patientNumber})`} className="p-3">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{r.fullName}</span>
                      {r.isUrgent && (
                        <span className="px-1.5 py-0.5 bg-rose-600 text-white font-mono font-bold text-[9px] rounded uppercase animate-pulse">
                          STAT URGENT
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500">
                      {r.patientNumber} • {r.gender}/{r.age}y
                    </div>
                    {showCenter && <div className={`${RT_TABLET_ONLY} mt-0.5 text-[11px] text-slate-600`}>{r.radiologyCenterName}</div>}
                  </td>
                  {showCenter && (
                    <td title={r.radiologyCenterName} className={`p-3 text-slate-600 font-medium ${RT_TABLET_HIDE}`}>
                      {r.radiologyCenterName}
                    </td>
                  )}
                  <td title={r.bodyParts.join(', ')} className="p-3">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] font-bold rounded border border-slate-200">
                      {r.bodyParts.join(', ')}
                    </span>
                  </td>
                  <td title={r.status} className="p-3">
                    <StatusBadge
                      status={r.status}
                      isPartial={
                        r.isPartial ||
                        ((r.signedStudyCount ?? 0) > 0 &&
                          (r.signedStudyCount ?? 0) < (r.studyCount ?? r.bodyParts?.length ?? 0))
                      }
                    />
                  </td>
                  <td title={formatDateDDMMYYYY(r.studyDate)} className="p-3 font-mono text-slate-500 text-[11px]">
                    {formatDateDDMMYYYY(r.studyDate)}
                  </td>
                  <td className="p-3 text-right">
                    <div className={`inline-flex items-center gap-1.5 ${RT_ACTIONS}`}>
                      <button
                        type="button"
                        onClick={() => openWorkspace(r)}
                        className="btn-pacs"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#009ef7]" />
                        <span>PACS</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openWorkspace(r)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] rounded transition-colors inline-flex items-center gap-1"
                      >
                        <FileEdit className="w-3 h-3" />
                        <span>Report</span>
                      </button>
                      <RowChatButton compact onClick={() => setChatTarget(r)} />
                      {canEditCase(session, r) && <RowEditButton compact onClick={() => setEditTarget(r)} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        ) : (
          <div className="p-5 sm:p-10 text-center flex flex-col items-center justify-center my-4 sm:my-8 mx-3 sm:mx-auto max-w-md bg-gradient-to-b from-white via-sky-50/40 to-slate-50 border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgba(0,158,247,0.06)] relative overflow-hidden transition-all duration-300">
            {/* Ambient Animated Gradient Orbs */}
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-sky-400/15 rounded-full blur-2xl animate-pulse-ring pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-cyan-400/15 rounded-full blur-2xl animate-pulse-ring pointer-events-none" style={{ animationDelay: '1.4s' }} />

            {/* Floating Icon with Double Pulsing Glow Rings */}
            <div className="relative mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[#009ef7]/20 blur-md animate-pulse-ring" />
              <div className="w-16 h-16 bg-gradient-to-tr from-[#009ef7] to-cyan-400 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_25px_rgba(0,158,247,0.35)] relative z-10 animate-float-icon">
                <FolderOpen className="w-8 h-8 text-white drop-shadow-md" />
              </div>
            </div>

            <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-mono uppercase bg-gradient-to-r from-slate-900 via-sky-950 to-slate-800 bg-clip-text text-transparent">
              No Patient Studies Recorded Yet
            </h3>

            {canUpload && (
            <button
              type="button"
              onClick={() => setIsNewReportModalOpen(true)}
              className="mt-4 group inline-flex items-center gap-2 px-5 py-2.5 bg-transparent text-[#009ef7] border-2 border-[#009ef7] hover:bg-[#009ef7] hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 shadow-[0_2px_12px_rgba(0,158,247,0.15)] hover:shadow-[0_4px_20px_rgba(0,158,247,0.35)] hover:scale-105 active:scale-95 cursor-pointer font-mono"
            >
              <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
              <span>Upload First Image</span>
            </button>
            )}
          </div>
        )}
      </div>

      {/* New X-Ray Patient Report Modal */}
      {isNewReportModalOpen && (
        <NewXRayReportModal
          isOpen={isNewReportModalOpen}
          onClose={() => setIsNewReportModalOpen(false)}
          onSave={handleSaveNewReport}
        />
      )}

      <NewXRayReportModal
        isOpen={!!editTarget}
        initialReport={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={() => undefined}
        onUpdated={handleCaseEdited}
      />

      {chatTarget && (
        <CaseActivityPanel withBackdrop report={chatTarget} open={!!chatTarget} onClose={() => setChatTarget(null)} onClaimUpdated={() => loadDashboardData()} />
      )}
    </div>
  );
}
