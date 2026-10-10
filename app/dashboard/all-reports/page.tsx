'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Activity,
  CheckCircle2,
  Clock,
  Trash2,
  Eye,
  FileEdit,
  BookmarkPlus,
  X,
  AlertTriangle,
  Building,
  UploadCloud,
} from 'lucide-react';
import {
  RadiologyStore,
  XRayReport,
  Doctor,
  RadiologyCenter,
  UserAccount,
  formatDateDDMMYYYY,
} from '@/lib/radiology-store';
import { ApiClient, getAccessToken, WS_BASE_URL, apiErrorMessage, isPendingApproval } from '@/lib/api-client';
import { canDeleteRecords, canEditCase, canUploadCase, canWriteTemplates, showCenterColumn } from '@/lib/access';
import CaseActivityPanel from '@/components/CaseActivityPanel';
import { RowChatButton, RowEditButton } from '@/components/CaseRowButtons';
import { toast } from '@/components/ui/Toast';
import { RowCard, RowCardList, RT_ACTIONS, RT_CONTAINER, RT_TABLE_ONLY, RT_TABLET_HIDE, RT_TABLET_ONLY } from '@/components/ui/ResponsiveTable';
import ReportOptionsPopover from '@/components/ReportOptionsPopover';
import { formatPatientDisplayId } from '@/lib/uuid';
import ReportPreviewModal from '@/components/ReportPreviewModal';
import ReportTemplateModal from '@/components/ReportTemplateModal';
import NewXRayReportModal, { NewCasePayload } from '@/components/NewXRayReportModal';
import ReviewSignReportModal from '@/components/ReviewSignReportModal';
import { STUDY_MODALITY_OPTIONS } from '@/components/NewXRayReportModal';
import { useResizableColumns } from '@/lib/use-resizable-columns';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

function AllPatientReportsContent() {
  const searchParams = useSearchParams();
  const reportIdParam = searchParams.get('reportId') || searchParams.get('id');
  const searchParam = searchParams.get('search') || searchParams.get('patientNo') || searchParams.get('patientNumber');
  const [reports, setReports] = useState<XRayReport[]>([]);
  const [centers, setCenters] = useState<RadiologyCenter[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [session, setSession] = useState<UserAccount | null>(null);

  useEffect(() => {
    setSession(RadiologyStore.getSession());
  }, []);

  const [filterName, setFilterName] = useState('');
  const [filterGender, setFilterGender] = useState('ALL');
  const [filterCenterId, setFilterCenterId] = useState('ALL');
  const [filterPatientNo, setFilterPatientNo] = useState('');
  const [filterBodyPart, setFilterBodyPart] = useState('ALL');
  const [filterDoctorId, setFilterDoctorId] = useState('ALL');

  const { widths, startResizing } = useResizableColumns({
    idx: 40,
    center: 190,
    patient: 170,
    genderAge: 95,
    bodyParts: 140,
    radiologist: 160,
    status: 125,
    studyDate: 100,
    actions: 240,
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<XRayReport | null>(null);
  const [previewWithHeader, setPreviewWithHeader] = useState(true);
  const [previewBodyPart, setPreviewBodyPart] = useState<string | undefined>(undefined);
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);
  const [isReviewSignModalOpen, setIsReviewSignModalOpen] = useState(false);
  // Row actions: Edit (patient details) and Chat (case activity thread)
  const [editTarget, setEditTarget] = useState<XRayReport | null>(null);
  const [chatTarget, setChatTarget] = useState<XRayReport | null>(null);

  const router = useRouter();

  const openWorkspace = (report: XRayReport) => {
    router.push(`/dashboard/workspace/${report.id}`);
  };

  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);

  const handleOpenCreateTemplate = () => {
    if (!canWriteTemplates(session)) return;
    setCreateTemplateOpen(true);
  };

  const loadStoreData = async () => {
    try {
      const [repData, centerData, docData] = await Promise.all([
        ApiClient.getReports(),
        ApiClient.getCenters(),
        ApiClient.getDoctors(),
      ]);
      setReports(repData);
      if (centerData.length > 0) RadiologyStore.setCenters(centerData);
      setCenters(centerData.length > 0 ? centerData : RadiologyStore.getCenters());
      setDoctors(docData.length > 0 ? docData : RadiologyStore.getDoctors());
    } catch {
      setReports(RadiologyStore.getReports());
      setCenters(RadiologyStore.getCenters());
      setDoctors(RadiologyStore.getDoctors());
    }
    setSession(RadiologyStore.getSession());
  };

  useEffect(() => {
    loadStoreData();

    const handleReportsChanged = () => loadStoreData();
    const handleSessionChanged = () => loadStoreData();

    window.addEventListener('radionline_reports_changed', handleReportsChanged);
    window.addEventListener('radionline_session_changed', handleSessionChanged);

    // Real-Time WebSocket Connection
    let ws: WebSocket | null = null;
    try {
      const token = getAccessToken();
      const baseUrl = WS_BASE_URL;
      const wsUrl = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'CASE_DELETED' || data.type === 'CASE_UPDATED') {
            loadStoreData();
            return;
          }
          if (data.type === 'NEW_REPORT' || data.type === 'REPORT_CLAIMED' || data.type === 'REPORT_REJECTED') {
            if (data.report) {
              RadiologyStore.saveReport(data.report);
            }
            loadStoreData();
          }
        } catch (e) {
          console.error('WS message parse error:', e);
        }
      };
    } catch (err) {
      console.warn('WebSocket connection error:', err);
    }

    return () => {
      window.removeEventListener('radionline_reports_changed', handleReportsChanged);
      window.removeEventListener('radionline_session_changed', handleSessionChanged);
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    if (searchParam) {
      setFilterPatientNo(searchParam);
    }
    if (reportIdParam && reports.length > 0) {
      const matched = reports.find((r) => r.id === reportIdParam || r.patientNumber === reportIdParam);
      if (matched) {
        setSelectedReport(matched);
        setIsPreviewOpen(true);
      }
    }
  }, [searchParam, reportIdParam, reports]);


  const filteredReports = useMemo(() => {
    const list = reports.filter((r) => {
      if (filterName && !r.fullName.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterGender !== 'ALL' && r.gender !== filterGender) return false;
      if (filterCenterId !== 'ALL' && r.radiologyCenterId !== filterCenterId) return false;
      if (filterPatientNo && !r.patientNumber.toLowerCase().includes(filterPatientNo.toLowerCase())) return false;
      if (filterBodyPart !== 'ALL') {
        const matches = r.bodyParts.some((bp) => bp.toLowerCase().includes(filterBodyPart.toLowerCase()));
        if (!matches) return false;
      }
      if (filterDoctorId !== 'ALL' && r.assignedDoctorId !== filterDoctorId && r.referringPhysicianId !== filterDoctorId) return false;
      
      // Real-time disappearance: If logged in as Doctor, hide cases claimed by other doctors
      if (session?.role === 'DOCTOR' && session?.doctorId) {
        if (r.claimStatus === 'CLAIMED' && r.claimedByDoctorId && r.claimedByDoctorId !== session.doctorId) {
          return false;
        }
      }

      return true;
    });

    list.sort((a, b) => { const au=a.isUrgent?0:1, bu=b.isUrgent?0:1; if(au!==bu) return au-bu; const ap=(a.isPartial||((a.signedStudyCount||0)>0&&(a.signedStudyCount||0)<(a.studyCount||a.bodyParts?.length||0)))?0:1; const bp=(b.isPartial||((b.signedStudyCount||0)>0&&(b.signedStudyCount||0)<(b.studyCount||b.bodyParts?.length||0)))?0:1; if(ap!==bp) return ap-bp; return 0; }); return list;
  }, [reports, filterName, filterGender, filterCenterId, filterPatientNo, filterBodyPart, filterDoctorId, session]);

  const handleResetFilters = () => {
    setFilterName('');
    setFilterGender('ALL');
    setFilterCenterId('ALL');
    setFilterPatientNo('');
    setFilterBodyPart('ALL');
    setFilterDoctorId('ALL');
  };

  const handleSelectReportOption = (report: XRayReport, withHeader: boolean, bodyPart?: string) => {
    setSelectedReport(report);
    setPreviewWithHeader(withHeader);
    setPreviewBodyPart(bodyPart);
    setIsPreviewOpen(true);
  };

  const handleOpenReviewSign = (report: XRayReport) => {
    setSelectedReport(report);
    setIsReviewSignModalOpen(true);
  };

  // Upload Image: Super Admin / centre save at once; a Manager's upload waits for Super Admin approval.
  // Errors are thrown back to the dialog so nothing is shown as saved when it was not.
  const handleCreateReport = async (newRep: NewCasePayload) => {
    const saved = await ApiClient.saveReport(newRep);
    if (isPendingApproval(saved)) {
      toast.info(saved.message || 'Sent to the Super Admin for approval.');
      return;
    }
    RadiologyStore.saveReport(saved);
    loadStoreData();
    toast.success(`Case uploaded: ${newRep.fullName}`);
  };

  const handleCaseEdited = (result: { pending: boolean; message: string; report?: XRayReport }) => {
    if (result.pending) toast.info(result.message);
    else toast.success(result.message);
    if (result.report) RadiologyStore.saveReport(result.report);
    loadStoreData();
  };

  const handleClaimReport = async (report: XRayReport) => {
    const currentDocId = session?.doctorId || 'doc-1';
    const currentDocName = session?.name || 'DR. RADIOLOGIST';
    try {
      const updated = await ApiClient.claimReport(report.id, currentDocId, currentDocName);
      RadiologyStore.saveReport(updated);
      // Go straight into the PACS viewer; it opens on the first unreported study
      openWorkspace(updated?.id ? updated : report);
    } catch (err: any) {
      // Stay on the list and say what happened
      loadStoreData();
      if (String(err?.message || '').includes('API error 409')) {
        alert('This case was already accepted by another doctor.');
      } else {
        alert(apiErrorMessage(err, 'Could not accept this case. Please try again.'));
      }
    }
  };

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Only Super Admin and Manager can delete; a Manager's delete becomes a request for Super Admin approval.
  const handleDeleteReport = (id: string) => {
    if (!canDeleteRecords(session)) return;
    setDeleteTargetId(id);
  };

  const confirmDeleteReport = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try {
      const res = await ApiClient.deleteReport(id);
      if (isPendingApproval(res)) {
        toast.info(res.message || 'Delete request sent to the Super Admin for approval.');
        return;
      }
      RadiologyStore.deleteReport(id);
      toast.success('Patient record deleted.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete this record'));
    }
    loadStoreData();
  };

  const showCenter = showCenterColumn(session);
  const isDoctor = session?.role === 'DOCTOR';



  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900">
      {/* Top Section Header Bar */}
      <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-3 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="hidden min-[400px]:block p-1.5 bg-[#009ef7]/10 text-[#009ef7] border border-[#009ef7]/20 rounded-lg shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-x-2 gap-y-1 flex-wrap">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 font-mono tracking-tight uppercase">
                Patient X-Ray Reports
              </h1>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold text-[10px] rounded border border-slate-200">
                {filteredReports.length} {filteredReports.length === 1 ? 'REPORT' : 'REPORTS'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canWriteTemplates(session) && (
            <button
              type="button"
              onClick={handleOpenCreateTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold font-mono rounded-lg transition-colors cursor-pointer border border-slate-200"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">New Template</span>
            </button>
          )}

          {canUploadCase(session) && (
            <button
              type="button"
              onClick={() => setIsNewReportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#009ef7] hover:bg-[#008be0] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-2xs cursor-pointer font-mono shrink-0"
              data-testid="upload-image-btn"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Image</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar Strip */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
        
        {/* Mobile Filter Toggle Trigger */}
        <div className="flex items-center justify-between sm:hidden">
          <div className="relative flex-1 mr-2">
            <Search size={13} className="rn-icon-vcenter absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search patient name or ID..."
              value={filterName || filterPatientNo}
              onChange={(e) => {
                setFilterName(e.target.value);
                setFilterPatientNo(e.target.value);
              }}
              className="rn-input-iconpad w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:border-[#009ef7] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="px-3 py-1.5 bg-slate-100 border border-slate-300 text-slate-800 font-mono text-xs font-bold rounded-lg flex items-center gap-1 shrink-0"
          >
            <Filter size={13} />
            <span>Filter</span>
          </button>
        </div>

        {/* Filters Grid: Always visible on desktop (sm+), expandable on mobile */}
        <div className={`${mobileFilterOpen ? 'flex' : 'hidden sm:flex'} flex-wrap items-center gap-2 text-xs w-full sm:w-auto`}>
          <div className="relative hidden sm:flex items-center">
            <Search size={13} className="absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Patient name..."
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              className="rn-input-iconpad w-36 pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:border-[#009ef7] focus:outline-none"
            />
          </div>

          <input
            type="text"
            placeholder="Patient ID..."
            value={filterPatientNo}
            onChange={(e) => setFilterPatientNo(e.target.value)}
            className="w-28 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:border-[#009ef7] focus:outline-none"
          />

          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-2 py-1 text-xs focus:bg-white focus:border-[#009ef7] focus:outline-none"
          >
            <option value="ALL">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          {showCenter && (
            <select
              value={filterCenterId}
              onChange={(e) => setFilterCenterId(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1 text-xs focus:bg-white focus:border-[#009ef7] focus:outline-none max-w-[170px] truncate"
              data-testid="center-filter"
            >
              <option value="ALL">All Diagnostic Centers</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.centerName}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterBodyPart}
            onChange={(e) => setFilterBodyPart(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-2 py-1 text-xs focus:bg-white focus:border-[#009ef7] focus:outline-none max-w-[140px] truncate"
          >
            <option value="ALL">All Body Parts</option>
            <option value="CHEST">Chest PA/AP</option>
            <option value="KNEE">Knee Joint</option>
            <option value="LUMBAR">Lumbar Spine</option>
            <option value="SKULL">Skull AP/LAT</option>
            <option value="PELVIS">Pelvis with Both Hips</option>
          </select>

          <select
            value={filterDoctorId}
            onChange={(e) => setFilterDoctorId(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 rounded-lg px-2 py-1 text-xs focus:bg-white focus:border-[#009ef7] focus:outline-none max-w-[140px] truncate"
          >
            <option value="ALL">All Radiologists</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleResetFilters}
            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 font-mono text-xs font-bold inline-flex items-center gap-1 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Container: Mobile Card Layout + Desktop Table Layout */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        
        {/* Phones: compact case cards (shared RowCard pattern, < md) */}
        <RowCardList isEmpty={filteredReports.length === 0} empty="No matching radiology reports found." testId="all-reports-cards">
          {filteredReports.map((report) => (
            <RowCard
              key={report.id}
              tone={report.isUrgent ? 'urgent' : 'default'}
              title={
                <span className="inline-flex items-center gap-1.5 flex-wrap">
                  <span className={report.isUrgent ? 'text-red-500' : undefined}>{report.fullName}</span>
                  <span className="text-xs font-semibold text-slate-500 font-mono">
                    ({report.gender?.trim().toUpperCase().startsWith('F') ? 'F' : report.gender?.trim().toUpperCase().startsWith('O') ? 'O' : 'M'}/{report.age}y)
                  </span>
                  {report.isPartial ? <span className="text-[10px] text-amber-600 font-semibold">{report.signedStudyCount}/{report.studyCount || report.bodyParts?.length} reported</span> : null}
                </span>
              }
              subtitle={formatPatientDisplayId(report.patientNumber) ? <span className="font-mono font-bold">{report.patientNumber}</span> : undefined}
              aside={
                <StatusBadge
                  status={report.status}
                  isPartial={
                    report.isPartial ||
                    ((report.signedStudyCount ?? 0) > 0 &&
                      (report.signedStudyCount ?? 0) < (report.studyCount ?? report.bodyParts?.length ?? 0))
                  }
                />
              }
              tags={
                <>
                  {report.isUrgent && (
                    <span className="px-1.5 py-0.5 bg-rose-600 text-white font-mono font-bold text-[9px] rounded uppercase">
                      URGENT STAT
                    </span>
                  )}
                  {report.isPortable && (
                    <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-mono font-bold text-[9px] rounded border border-amber-300 uppercase">
                      PORTABLE
                    </span>
                  )}
                  {report.bodyParts.map((bp, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono font-bold text-[10px] rounded border border-slate-200">
                      {bp}
                    </span>
                  ))}
                </>
              }
              fields={[
                ...(showCenter ? [{ label: 'Center', value: report.radiologyCenterName }] : []),
                { label: 'Study Date', value: <span className="font-mono">{formatDateDDMMYYYY(report.studyDate)}</span> },
                { label: 'Radiologist', value: report.assignedDoctorName ? `Dr. ${report.assignedDoctorName}` : 'Unassigned' },
                { label: 'Referred By', value: report.referringPhysicianName || '-' },
              ]}
              actions={
                <>
                  <ReportOptionsPopover
                    report={report}
                    onSelectOption={handleSelectReportOption}
                  />
                  {isDoctor && (
                    <button
                      type="button"
                      onClick={() => openWorkspace(report)}
                      className="btn-pacs"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#009ef7]" />
                      <span>PACS</span>
                    </button>
                  )}
                  <RowChatButton onClick={() => setChatTarget(report)} />
                  {canEditCase(session, report) && <RowEditButton onClick={() => setEditTarget(report)} />}
                  {session?.role === 'DOCTOR' && report.claimStatus !== 'CLAIMED' && (
                    <button
                      type="button"
                      onClick={() => handleClaimReport(report)}
                      className="px-3 py-1.5 bg-[#009ef7] hover:bg-[#008be0] text-white text-xs font-bold rounded-lg"
                    >
                      Accept Case
                    </button>
                  )}
                  {session?.role === 'DOCTOR' && report.status === 'Pending' && (
                    <button
                      type="button"
                      onClick={() => handleOpenReviewSign(report)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg"
                    >
                      Sign
                    </button>
                  )}
                  {canDeleteRecords(session) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteReport(report.id)}
                      className="p-2 text-rose-600 hover:bg-rose-100 bg-rose-50 border border-rose-200/80 rounded-lg transition-colors flex items-center justify-center shrink-0"
                      title="Delete Report"
                      aria-label="Delete Report"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              }
            />
          ))}
        </RowCardList>

        {/* Tablet + desktop: table (tablets hide low-priority columns, see ResponsiveTable) */}
        <div className={`${RT_TABLE_ONLY} ${RT_CONTAINER} data-table-container flex-1 h-full overflow-y-auto bg-white`}>
          <table className="data-table">
            <thead>
              <tr>
                <th title="#" className={RT_TABLET_HIDE} style={{ width: widths.idx, position: 'relative' }}>
                  <span>#</span>
                  <div className="col-resizer" onMouseDown={(e) => startResizing('idx', e.clientX, widths.idx)} />
                </th>
                {showCenter && (
                  <th title="Diagnostic Center" className={RT_TABLET_HIDE} style={{ width: widths.center, position: 'relative' }}>
                    <span>Diagnostic Center</span>
                    <div className="col-resizer" onMouseDown={(e) => startResizing('center', e.clientX, widths.center)} />
                  </th>
                )}
                <th title="Patient Information" style={{ width: widths.patient, position: 'relative' }}>
                  <span>Patient Information</span>
                  <div className="col-resizer" onMouseDown={(e) => startResizing('patient', e.clientX, widths.patient)} />
                </th>
                <th title="Gender / Age" className={RT_TABLET_HIDE} style={{ width: widths.genderAge, position: 'relative' }}>
                  <span>Gender / Age</span>
                  <div className="col-resizer" onMouseDown={(e) => startResizing('genderAge', e.clientX, widths.genderAge)} />
                </th>
                <th title="Body Parts" style={{ width: widths.bodyParts, position: 'relative' }}>
                  <span>Body Parts</span>
                  <div className="col-resizer" onMouseDown={(e) => startResizing('bodyParts', e.clientX, widths.bodyParts)} />
                </th>
                <th title="Assigned Radiologist" style={{ width: widths.radiologist, position: 'relative' }}>
                  <span>Assigned Radiologist</span>
                  <div className="col-resizer" onMouseDown={(e) => startResizing('radiologist', e.clientX, widths.radiologist)} />
                </th>
                <th title="Status" style={{ width: widths.status, position: 'relative' }}>
                  <span>Status</span>
                  <div className="col-resizer" onMouseDown={(e) => startResizing('status', e.clientX, widths.status)} />
                </th>
                <th title="Study Date" className={RT_TABLET_HIDE} style={{ width: widths.studyDate, position: 'relative' }}>
                  <span>Study Date</span>
                  <div className="col-resizer" onMouseDown={(e) => startResizing('studyDate', e.clientX, widths.studyDate)} />
                </th>
                <th title="Actions" style={{ width: widths.actions, minWidth: 300, textAlign: 'right', position: 'sticky', right: 0 }} className="bg-slate-50 shadow-2xs z-10">
                  <span>Actions</span>
                  <div className="col-resizer" onMouseDown={(e) => startResizing('actions', e.clientX, widths.actions)} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={showCenter ? 9 : 8} className="text-center p-8 text-slate-500 italic font-sans">
                    No matching radiology reports found.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report, idx) => (
                  <tr key={report.id} className={`hover:bg-slate-50/80 transition-colors ${report.isUrgent ? 'bg-rose-50/20' : ''}`}>
                    <td title={String(idx + 1)} className={`p-3 font-mono text-slate-400 font-bold ${RT_TABLET_HIDE}`}>{idx + 1}</td>
                    {showCenter && (
                      <td title={report.radiologyCenterName} className={`p-3 font-bold text-slate-900 leading-snug ${RT_TABLET_HIDE}`}>
                        {report.radiologyCenterName}
                      </td>
                    )}
                    <td title={formatPatientDisplayId(report.patientNumber) ? `${report.fullName} (${report.patientNumber})` : report.fullName} className="p-3">
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                        <span className={report.isUrgent ? "text-red-500 font-bold" : undefined}>{report.fullName}</span>{report.isPartial ? <span className="ml-2 text-[10px] text-amber-600 font-semibold">{report.signedStudyCount}/{report.studyCount || report.bodyParts?.length} reported</span> : null}
                        {report.isUrgent && (
                          <span className="px-1.5 py-0.5 bg-rose-600 text-white font-mono font-bold text-[9px] rounded uppercase animate-pulse">
                            STAT URGENT
                          </span>
                        )}
                        {report.isPortable && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-mono font-bold text-[9px] rounded border border-amber-300 uppercase">
                            PORTABLE
                          </span>
                        )}
                      </div>
                      {formatPatientDisplayId(report.patientNumber) && (
                        <div className="font-mono text-[10px] text-slate-500 font-bold">{report.patientNumber}</div>
                      )}
                      <div className={`${RT_TABLET_ONLY} mt-0.5 text-[11px] text-slate-600`}>
                        {showCenter ? <>{report.radiologyCenterName} {'\u00b7'} </> : null}{report.gender?.trim().toUpperCase().startsWith('F') ? 'F' : report.gender?.trim().toUpperCase().startsWith('O') ? 'O' : 'M'}/{report.age}y {'\u00b7'} <span className="font-mono whitespace-nowrap">{formatDateDDMMYYYY(report.studyDate)}</span>
                      </div>
                    </td>
                    <td title={`${report.gender} / ${report.age}y`} className={`p-3 text-slate-800 font-medium ${RT_TABLET_HIDE}`}>
                      {report.gender?.trim().toUpperCase().startsWith('F') ? 'F' : report.gender?.trim().toUpperCase().startsWith('O') ? 'O' : 'M'} / {report.age}y
                    </td>
                    <td title={report.bodyParts.join(', ')} className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {report.bodyParts.map((bp, i) => (
                          <span key={i} className="font-mono text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded border border-slate-200">
                            {bp}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td title={`Dr. ${report.assignedDoctorName || 'Unassigned'} | Ref: ${report.referringPhysicianName}`} className="p-3">
                      <div className="font-bold text-slate-900">{report.assignedDoctorName}</div>
                      <div className="text-[10px] text-slate-500">Ref: {report.referringPhysicianName}</div>
                    </td>
                    <td title={report.status} className="p-3">
                      <StatusBadge
                        status={report.status}
                        isPartial={
                          report.isPartial ||
                          ((report.signedStudyCount ?? 0) > 0 &&
                            (report.signedStudyCount ?? 0) < (report.studyCount ?? report.bodyParts?.length ?? 0))
                        }
                      />
                    </td>
                    <td title={formatDateDDMMYYYY(report.studyDate)} className={`p-3 font-mono text-slate-500 text-[11px] ${RT_TABLET_HIDE}`}>
                      {formatDateDDMMYYYY(report.studyDate)}
                    </td>
                    <td style={{ width: widths.actions, minWidth: 300 }} className="p-3 text-right sticky right-0 bg-white shadow-2xs z-10">
                      <div className={`flex flex-wrap items-center gap-1.5 justify-end ${RT_ACTIONS}`}>
                        <ReportOptionsPopover
                          report={report}
                          onSelectOption={handleSelectReportOption}
                        />

                        {isDoctor && (
                          <button
                            type="button"
                            onClick={() => openWorkspace(report)}
                            className="btn-pacs"
                            title="PACS DICOM Workstation"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#009ef7]" />
                            <span>PACS</span>
                          </button>
                        )}

                        <RowChatButton compact onClick={() => setChatTarget(report)} />
                        {canEditCase(session, report) && <RowEditButton compact onClick={() => setEditTarget(report)} />}

                        {session?.role === 'DOCTOR' && report.claimStatus !== 'CLAIMED' && (
                          <button
                            type="button"
                            onClick={() => handleClaimReport(report)}
                            className="px-2 py-1 bg-[#009ef7] hover:bg-[#008be0] text-white text-[11px] font-bold rounded"
                          >
                            Accept Case
                          </button>
                        )}

                        {session?.role === 'DOCTOR' && report.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => handleOpenReviewSign(report)}
                            className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded"
                          >
                            Sign
                          </button>
                        )}

                        {canDeleteRecords(session) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReport(report.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-100 bg-rose-50 border border-rose-200/80 rounded-lg transition-colors flex items-center justify-center shrink-0"
                            title="Delete Report"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Modals */}
      {selectedReport && (
        <ReportPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          report={selectedReport}
          withHeader={previewWithHeader}
          selectedBodyPart={previewBodyPart}
        />
      )}

      <NewXRayReportModal
        isOpen={isNewReportModalOpen}
        onClose={() => setIsNewReportModalOpen(false)}
        onSave={handleCreateReport}
      />

      {/* Row Edit: same dialog in edit mode (patient details + extra images) */}
      <NewXRayReportModal
        isOpen={!!editTarget}
        initialReport={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={() => undefined}
        onUpdated={handleCaseEdited}
      />

      {/* Row Chat: the case's activity thread */}
      {chatTarget && (
        <CaseActivityPanel withBackdrop report={chatTarget} open={!!chatTarget} onClose={() => setChatTarget(null)} onClaimUpdated={() => loadStoreData()} />
      )}

      {selectedReport && (
        <ReviewSignReportModal
          isOpen={isReviewSignModalOpen}
          onClose={() => setIsReviewSignModalOpen(false)}
          report={selectedReport}
          onSignComplete={() => loadStoreData()}
        />
      )}
{/* Save Template Modal */}
      {/* Doctor Report Format Template Modal */}
      {canWriteTemplates(session) && (
        <ReportTemplateModal
          isOpen={createTemplateOpen}
          onClose={() => setCreateTemplateOpen(false)}
          onSaved={() => loadStoreData()}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteTargetId}
        title="Delete Patient Record"
        message={
          session?.role === 'MANAGER'
            ? 'This sends a delete request to the Super Admin. The record is deleted only after approval.'
            : 'Are you sure you want to delete this patient record, its studies, reports and chat? This action cannot be undone.'
        }
        confirmLabel={session?.role === 'MANAGER' ? 'Send Request' : 'Delete Record'}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteReport}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}

export default function AllPatientReportsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Loading Patient Reports...</div>}>
      <AllPatientReportsContent />
    </Suspense>
  );
}
