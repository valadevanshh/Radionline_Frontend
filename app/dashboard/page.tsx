'use client';

import { formatAgeShort } from '@/lib/age-format';
import React, { useState, useEffect, useMemo } from 'react';
import { isReportReady } from '@/lib/report-status';
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
import NewXRayReportModal, { NewCasePayload } from '@/components/NewXRayReportModal';
import { formatPatientDisplayId } from '@/lib/uuid';
import { useResizableColumns } from '@/lib/use-resizable-columns';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { UrgentBadge, PortableBadge } from '@/components/ui/CaseFlags';
import { RowCard, RowCardList, RT_ACTIONS, RT_CONTAINER, RT_TABLET_HIDE, RT_TABLET_ONLY } from '@/components/ui/ResponsiveTable';
import ReportOptionsPopover from '@/components/ReportOptionsPopover';
import ReportPreviewModal from '@/components/ReportPreviewModal';

export default function DashboardOverviewPage() {
  const [reports, setReports] = useState<XRayReport[]>([]);
  const [doctorCount, setDoctorCount] = useState<number>(0);
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState<boolean>(false);
  const [session, setSession] = useState<UserAccount | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [revenueError, setRevenueError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<XRayReport | null>(null);
  const [chatTarget, setChatTarget] = useState<XRayReport | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<XRayReport | null>(null);
  const [previewWithHeader, setPreviewWithHeader] = useState(true);
  const [previewBodyPart, setPreviewBodyPart] = useState<string | undefined>(undefined);
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

  const visibleReports = useMemo(() => {
    return reports.filter((r: XRayReport) => {
      if (session?.role === 'CENTER') {
        const centerIds = new Set(
          session.centers?.map((c) => c.centerId) || (session.centerId ? [session.centerId] : [])
        );
        if (centerIds.size > 0 && !centerIds.has(r.radiologyCenterId)) return false;
      } else if (session?.role === 'DOCTOR') {
        const docId = session.doctorId || session.email || '';
        const isClaimed = Boolean(
          (r.claimStatus === 'CLAIMED') ||
          (r.claimedByDoctorId && r.claimedByDoctorId !== 'UNCLAIMED') ||
          (r.status === 'In Review' || r.status === 'Completed') ||
          (r.studies && r.studies.some((s) => s.claimedBy && s.claimedBy !== 'UNCLAIMED'))
        );
        if (isClaimed) {
          const isMine = Boolean(
            (r.claimedByDoctorId && (r.claimedByDoctorId === docId || r.claimedByDoctorId === session.email)) ||
            (r.assignedDoctorId && (r.assignedDoctorId === docId || r.assignedDoctorId === session.email)) ||
            (r.studies && r.studies.some((s) => s.claimedBy === docId || s.claimedBy === session.email))
          );
          if (!isMine) return false;
        }
      }
      return true;
    });
  }, [reports, session]);

  const completedCount = visibleReports.filter((r: XRayReport) => r.status === 'Completed').length;
  const pendingCount = visibleReports.filter((r: XRayReport) => r.status !== 'Completed').length;
  const urgentCount = visibleReports.filter((r: XRayReport) => r.isUrgent && r.status !== 'Completed').length;
  const todayDmy = (() => { const d = new Date(); return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`; })();
  const todayCount = visibleReports.filter((r: XRayReport) => formatDateDDMMYYYY(r.studyDate) === todayDmy).length;

  // Upload Image: errors go back to the dialog (it stays open); a Manager's upload waits for approval.
  const handleSaveNewReport = async (reportData: NewCasePayload) => {
    const saved = await ApiClient.saveReport(reportData);
    if (isPendingApproval(saved)) {
      toast.info(saved.message || 'Sent to the Super Admin for approval.');
    } else {
      RadiologyStore.saveReport(saved);
      toast.success(
        saved?.patientNumber ? `Case uploaded: ${reportData.fullName} · Patient ID ${saved.patientNumber}` : `Case uploaded: ${reportData.fullName}`,
      );
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
  const isDoctor = session?.role === 'DOCTOR';

  const handleSelectReportOption = (report: XRayReport, withHeader: boolean, bodyPart?: string) => {
    if (!isReportReady(report, bodyPart)) {
      toast.info('This report is still pending.');
      return;
    }
    setSelectedReport(report);
    setPreviewWithHeader(withHeader);
    setPreviewBodyPart(bodyPart);
    setIsPreviewOpen(true);
  };

  const sortedReports = [...visibleReports].sort((a: XRayReport, b: XRayReport) => (a.isUrgent === b.isUrgent ? 0 : a.isUrgent ? -1 : 1));

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
              Dashboard
            </h1>
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
            <span>All Reports ({visibleReports.length})</span>
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

      </div>

      {/* Stats-only overview: fills the viewport under the app shell (no page scroll on laptop/tablet) */}
      {(() => {
        const tally = (keys: string[]) => {
          const m = new Map<string, number>();
          keys.forEach((k) => { if (k) m.set(k, (m.get(k) || 0) + 1); });
          return [...m.entries()].sort((x, y) => y[1] - x[1]);
        };
        const total = visibleReports.length;
        const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
        const statusRows: [string, number, string, string][] = [
          ['Pending', visibleReports.filter((r) => r.status === 'Pending').length, 'from-amber-400 to-orange-400', '#fbbf24'],
          ['In Review', visibleReports.filter((r) => r.status === 'In Review').length, 'from-sky-400 to-blue-500', '#38bdf8'],
          ['Signed', completedCount, 'from-emerald-400 to-teal-500', '#10b981'],
        ];
        const allCentres = tally(visibleReports.map((r) => r.radiologyCenterName || ''));
        const partRows = tally(visibleReports.flatMap((r) => r.bodyParts || [])).slice(0, 5);
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const key = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
          return { key, label: d.toLocaleDateString('en-GB', { weekday: 'short' }), n: visibleReports.filter((r) => formatDateDDMMYYYY(r.studyDate) === key).length };
        });
        const dayMax = Math.max(1, ...days.map((d) => d.n));
        const weekTotal = days.reduce((a, d) => a + d.n, 0);
        const cards = [
          { label: 'Total Cases', value: total, hint: 'All time', icon: FileText, tone: 'from-slate-700 to-slate-900', ring: 'text-slate-700 bg-slate-100' },
          { label: 'Pending', value: pendingCount, hint: `${pct(pendingCount)}% of cases`, icon: Clock, tone: 'from-amber-400 to-orange-500', ring: 'text-amber-600 bg-amber-50' },
          { label: 'Signed', value: completedCount, hint: `${pct(completedCount)}% of cases`, icon: CheckCircle2, tone: 'from-emerald-400 to-teal-500', ring: 'text-emerald-600 bg-emerald-50' },
          { label: 'Urgent', value: urgentCount, hint: 'Awaiting report', icon: AlertTriangle, tone: 'from-rose-500 to-pink-500', ring: 'text-rose-600 bg-rose-50' },
          { label: 'Today', value: todayCount, hint: 'Studies today', icon: Activity, tone: 'from-sky-400 to-[#009ef7]', ring: 'text-sky-600 bg-sky-50' },
          isDoctor
            ? { label: 'Completion', value: `${pct(completedCount)}%`, hint: 'Signed / total', icon: CheckCircle2, tone: 'from-indigo-400 to-violet-500', ring: 'text-indigo-600 bg-indigo-50' }
            : { label: 'Radiologists', value: doctorCount, hint: 'On the panel', icon: Users, tone: 'from-indigo-400 to-violet-500', ring: 'text-indigo-600 bg-indigo-50' },
        ];
        const panelCls = 'bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_rgba(15,23,42,0.04)] p-3 sm:p-4 flex flex-col min-h-0 overflow-hidden';
        const panelHead = (title: string, right?: React.ReactNode) => (
          <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</h2>
            {right}
          </div>
        );
        const bars = (rows: [string, number, string?][], grad: string) =>
          rows.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">No data yet</div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col justify-start gap-3 pt-1 overflow-hidden">
              {rows.map(([k, n, g]) => (
                <div key={k}>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate text-slate-700 font-medium">{k}</span>
                    <span className="tabular-nums font-semibold text-slate-900">{n}<span className="ml-1 text-[10px] font-normal text-slate-400">{pct(n)}%</span></span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${g || grad}`} style={{ width: `${pct(n)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          );
        const empty = <div className="flex-1 flex items-center justify-center text-xs text-slate-400">No data yet</div>;
        const urgentAll = visibleReports.filter((r) => r.isUrgent).length;
        const portableCount = visibleReports.filter((r) => r.isPortable).length;
        const centreCols = allCentres.slice(0, 5).map(([name]) => {
          const rs = visibleReports.filter((r) => r.radiologyCenterName === name);
          return { name, p: rs.filter((r) => r.status !== 'Completed').length, s: rs.filter((r) => r.status === 'Completed').length };
        });
        const donut = (segs: { k: string; n: number; hex: string }[], unit: string) => {
          const sum = segs.reduce((a, x) => a + x.n, 0);
          const R = 40, C = 2 * Math.PI * R;
          let off = 0;
          return (
            <div className="flex-1 min-h-0 flex items-center justify-center gap-4 sm:gap-6">
              <div className="relative h-full max-h-[150px] aspect-square min-h-[96px]">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r={R} fill="none" stroke="#f1f5f9" strokeWidth="12" />
                  {sum > 0 && segs.filter((x) => x.n > 0).map((x) => {
                    const len = (x.n / sum) * C;
                    const el = <circle key={x.k} cx="50" cy="50" r={R} fill="none" stroke={x.hex} strokeWidth="12" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off}><title>{`${x.k}: ${x.n}`}</title></circle>;
                    off += len;
                    return el;
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold tabular-nums text-slate-900 leading-none">{sum}</span>
                  <span className="text-[10px] text-slate-400">{unit}</span>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs min-w-0">
                {segs.map((x) => (
                  <li key={x.k} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: x.hex }} />
                    <span className="text-slate-600 truncate">{x.k}</span>
                    <span className="ml-auto pl-2 tabular-nums font-semibold text-slate-900">{x.n}</span>
                    <span className="tabular-nums text-[10px] text-slate-400 w-8 text-right">{sum ? Math.round((x.n / sum) * 100) : 0}%</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        };
        const showCentres = session?.role !== 'CENTER';
        return (
          <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden bg-gradient-to-br from-slate-50 via-white to-sky-50/60 p-3 sm:p-4 flex flex-col gap-3" data-testid="dashboard-overview">
            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3 shrink-0" data-testid="dashboard-stats">
              {cards.map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_16px_rgba(15,23,42,0.04)] px-3 py-2.5 sm:px-4 sm:py-3" data-testid={`stat-${c.label.toLowerCase().replace(/\s+/g, '-')}`}>
                    <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${c.tone}`} />
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-slate-500 truncate">{c.label}</div>
                        <div className="text-2xl sm:text-[26px] font-bold tracking-tight text-slate-900 tabular-nums leading-tight">{c.value}</div>
                      </div>
                      <div className={`p-1.5 sm:p-2 rounded-xl shrink-0 ${c.ring}`}><Icon className="w-4 h-4" /></div>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{c.hint}</div>
                  </div>
                );
              })}
            </div>

            {/* Super Admin monthly revenue */}
            {session?.role === 'SUPER_ADMIN' && (
              <div className="shrink-0 rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50 via-white to-sky-50 shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-3 sm:px-4 py-2.5 flex items-center gap-x-4 gap-y-2 flex-wrap" data-testid="dashboard-revenue">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700"><Wallet className="w-4 h-4" /></div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 leading-tight">Monthly Revenue</div>
                    <div className="text-[10px] text-slate-400">{revenue?.currentPeriod || '-'}</div>
                  </div>
                </div>
                {revenue ? (
                  <div className="flex items-center gap-x-5 gap-y-1 flex-wrap">
                    {[
                      ['Billing', revenue.currentMonth.centerBilling, 'text-sky-700'],
                      ['Payouts', revenue.currentMonth.doctorPayouts, 'text-violet-700'],
                      ['Net', revenue.currentMonth.net, 'text-emerald-700'],
                    ].map(([k, v, c]) => (
                      <div key={String(k)} className="leading-tight">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">{k}</div>
                        <div className={`text-sm font-bold tabular-nums ${c}`}>{'\u20B9'}{Number(v).toLocaleString('en-IN')}</div>
                      </div>
                    ))}
                  </div>
                ) : revenueError ? (
                  <span className="text-xs text-rose-600 truncate">{revenueError}</span>
                ) : null}
                <Link href="/dashboard/invoices" className="ml-auto text-xs font-semibold text-[#009ef7] hover:underline inline-flex items-center gap-1 shrink-0">
                  Invoices <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Charts and breakdowns fill the remaining height */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 md:grid-rows-3 xl:grid-rows-2 gap-2.5 sm:gap-3">
              <div className={`${panelCls} min-h-[170px] md:col-span-2 xl:col-span-2`} data-testid="panel-7days">
                {panelHead('Cases \u00B7 last 7 days', (
                  <span className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-900 tabular-nums">{weekTotal}</span> total
                  </span>
                ))}
                {(() => {
                  const top = Math.max(2, Math.ceil(dayMax / 2) * 2);
                  const ticks = [top, top / 2, 0];
                  return (
                    <div className="flex-1 min-h-[90px] flex flex-col">
                      <div className="flex-1 min-h-0 flex gap-2">
                        {/* Y axis */}
                        <div className="flex flex-col justify-between text-[10px] tabular-nums text-slate-400 text-right w-5 shrink-0 -my-1.5">
                          {ticks.map((t) => <span key={t}>{t}</span>)}
                        </div>
                        {/* Plot area with gridlines and baseline */}
                        <div className="relative flex-1 min-w-0">
                          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            <div className="border-t border-dashed border-slate-200" />
                            <div className="border-t border-dashed border-slate-200" />
                            <div className="border-t border-slate-300" />
                          </div>
                          <div className="absolute inset-0 flex items-end justify-around gap-1.5 sm:gap-3 px-1">
                            {days.map((d, i) => {
                              const isToday = i === days.length - 1;
                              return (
                                <div key={d.key} className="relative flex-1 max-w-[44px] h-full flex items-end justify-center" title={`${d.key}: ${d.n} case${d.n === 1 ? '' : 's'}`}>
                                  {d.n > 0 ? (
                                    <div
                                      className={`relative w-full rounded-t-md ${isToday ? 'bg-gradient-to-t from-[#0086d1] to-[#33b5ff] shadow-[0_4px_12px_rgba(0,158,247,0.35)]' : 'bg-gradient-to-t from-sky-500/80 to-sky-300/80'}`}
                                      style={{ height: `${(d.n / top) * 100}%` }}
                                    >
                                      <span className={`absolute -top-4 inset-x-0 text-center text-[10px] font-semibold tabular-nums ${isToday ? 'text-[#009ef7]' : 'text-slate-600'}`}>{d.n}</span>
                                    </div>
                                  ) : (
                                    <div className={`w-full h-[3px] rounded-full ${isToday ? 'bg-[#009ef7]/40' : 'bg-slate-200'}`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      {/* X axis labels */}
                      <div className="flex gap-2 mt-1.5">
                        <div className="w-5 shrink-0" />
                        <div className="flex-1 flex justify-around gap-1.5 sm:gap-3 px-1">
                          {days.map((d, i) => {
                            const isToday = i === days.length - 1;
                            return (
                              <div key={d.key} className="flex-1 max-w-[44px] text-center leading-tight">
                                <div className={`text-[10px] ${isToday ? 'font-bold text-[#009ef7]' : 'text-slate-500'}`}>{isToday ? 'Today' : d.label}</div>
                                <div className="text-[9px] tabular-nums text-slate-400">{d.key.slice(0, 5).replace('-', '/')}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {/* Status donut */}
              <div className={`${panelCls} min-h-[180px]`} data-testid="panel-status">
                {panelHead('Status mix', <span className="text-[11px] text-slate-500">{pct(completedCount)}% signed</span>)}
                {donut(statusRows.map(([k, n, , hex]) => ({ k, n, hex })), 'cases')}
              </div>
              {/* Centre comparison (grouped columns) or priority mix for centre users */}
              {showCentres ? (
                <div className={`${panelCls} min-h-[180px]`} data-testid="panel-centres">
                  {panelHead('Centre comparison', (
                    <span className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-amber-400" />Pending</span>
                      <span className="inline-flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-emerald-500" />Signed</span>
                    </span>
                  ))}
                  {centreCols.length === 0 ? empty : (() => {
                    const cmax = Math.max(1, ...centreCols.map((c) => Math.max(c.p, c.s)));
                    return (
                      <div className="flex-1 min-h-[110px] flex flex-col">
                        <div className="relative flex-1 min-h-0 border-b border-slate-300">
                          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            <div className="border-t border-dashed border-slate-200" /><div className="border-t border-dashed border-slate-200" /><div />
                          </div>
                          <div className="absolute inset-0 flex items-end justify-around gap-3 px-2">
                            {centreCols.map((c) => (
                              <div key={c.name} className="h-full flex-1 max-w-[90px] flex items-end justify-center gap-1" title={`${c.name}: ${c.p} pending, ${c.s} signed`}>
                                {[[c.p, 'from-amber-400 to-orange-400'], [c.s, 'from-emerald-400 to-teal-500']].map(([n, g], j) => (
                                  <div key={j} className="relative flex-1 max-w-[26px] h-full flex items-end">
                                    <div className={`w-full rounded-t-md bg-gradient-to-t ${g}`} style={{ height: `${(Number(n) / cmax) * 88}%`, minHeight: Number(n) ? 4 : 2, opacity: Number(n) ? 1 : 0.3 }}>
                                      <span className="block -mt-4 text-center text-[10px] font-semibold tabular-nums text-slate-600">{n}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-around gap-3 px-2 mt-1.5">
                          {centreCols.map((c) => (
                            <div key={c.name} className="flex-1 max-w-[90px] text-center text-[10px] text-slate-600 truncate" title={c.name}>{c.name}</div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : null}
              {/* Body part horizontal bars */}
              <div className={`${panelCls} min-h-[160px]`} data-testid="panel-parts">
                {panelHead('Top body parts', <Link href="/dashboard/all-reports" className="text-[11px] font-semibold text-[#009ef7] hover:underline inline-flex items-center gap-0.5">All Reports <ArrowRight className="w-3 h-3" /></Link>)}
                {partRows.length === 0 ? empty : (() => {
                  const pmax = Math.max(1, ...partRows.map(([, n]) => n));
                  return (
                    <div className="flex-1 min-h-0 flex flex-col justify-start gap-2.5 pt-1 overflow-hidden">
                      {partRows.map(([k, n], i) => (
                        <div key={k} className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-2 text-xs">
                          <span className="truncate text-slate-700 font-medium" title={k}>{k}</span>
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-500" style={{ width: `${(n / pmax) * 100}%`, opacity: 1 - i * 0.12 }} />
                          </div>
                          <span className="tabular-nums font-semibold text-slate-900 w-6 text-right">{n}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {/* Priority donut */}
              <div className={`${panelCls} min-h-[180px]`} data-testid="panel-priority">
                {panelHead('Priority mix', <span className="text-[11px] text-slate-500">{portableCount} portable</span>)}
                {donut([
                  { k: 'Urgent', n: urgentAll, hex: '#f43f5e' },
                  { k: 'Routine', n: total - urgentAll, hex: '#38bdf8' },
                ], 'cases')}
              </div>
              {!showCentres && (
                <div className={`${panelCls} min-h-[160px]`} data-testid="panel-workload">
                  {panelHead('Workload')}
                  {bars([['Pending', pendingCount, 'from-amber-400 to-orange-400'], ['Signed', completedCount, 'from-emerald-400 to-teal-500'], ['Urgent open', urgentCount, 'from-rose-500 to-pink-500']], 'from-slate-300 to-slate-400')}
                </div>
              )}
            </div>
          </div>
        );
      })()}

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

      {selectedReport && (
        <ReportPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          report={selectedReport}
          withHeader={previewWithHeader}
          selectedBodyPart={previewBodyPart}
        />
      )}
    </div>
  );
}
