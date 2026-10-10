'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RADIOLOGY_TEMPLATES } from '@/lib/radiology-templates';
import { STUDY_MODALITY_OPTIONS } from '@/components/NewXRayReportModal';
import {
  FileText,
  BookmarkPlus,
  Activity,
  Search,
  Check,
  X,
} from 'lucide-react';
import { RadiologyStore, XRayReport, DocTemplate, RadiologyCenter } from '@/lib/radiology-store';
import { ApiClient, apiErrorMessage, isPendingApproval } from '@/lib/api-client';
import { canWriteTemplates, showCenterColumn, useSession } from '@/lib/access';
import { toast } from '@/components/ui/Toast';
import { formatPatientDisplayId } from '@/lib/uuid';

import { PageShell, PageHeader, StatusBadge } from '@/components/ui';
import ReportTemplateModal from '@/components/ReportTemplateModal';

export default function DocumentEditorStudioPage() {
  const [reports, setReports] = useState<XRayReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<XRayReport | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<DocTemplate[]>([]);
  const [allCenters, setAllCenters] = useState<RadiologyCenter[]>([]);

  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocTemplate | null>(null);
  const router = useRouter();
  const session = useSession();
  const canSaveTemplate = canWriteTemplates(session);

  useEffect(() => {
    if (session && session.role !== 'DOCTOR') {
      router.replace('/dashboard');
    }
  }, [session, router]);

  const openWorkspace = (report: XRayReport | null) => {
    if (!report) return;
    router.push(`/dashboard/workspace/${report.id}`);
  };

  const loadData = async () => {
    try {
      const [reps, tmpls, cntrs] = await Promise.all([
        ApiClient.getReports(),
        ApiClient.getTemplates(),
        ApiClient.getCenters(),
      ]);
      setReports(reps);
      setSavedTemplates(tmpls);
      setAllCenters(cntrs.length > 0 ? cntrs : RadiologyStore.getCenters());
    } catch {
      const list = RadiologyStore.getReports();
      setReports(list);
      setSavedTemplates(RadiologyStore.getTemplates());
      setAllCenters(RadiologyStore.getCenters());
    }
  };

  useEffect(() => {
    loadData();

    const handleReportsChange = () => loadData();
    const handleTemplatesChange = () => loadData();
    const handleCentersChange = () => loadData();

    window.addEventListener('radionline_reports_changed', handleReportsChange);
    window.addEventListener('radionline_templates_changed', handleTemplatesChange);
    window.addEventListener('radionline_centers_changed', handleCentersChange);
    return () => {
      window.removeEventListener('radionline_reports_changed', handleReportsChange);
      window.removeEventListener('radionline_templates_changed', handleTemplatesChange);
      window.removeEventListener('radionline_centers_changed', handleCentersChange);
    };
  }, []);

  const handleOpenCreateTemplate = () => {
    if (!canSaveTemplate) return;
    setEditingTemplate(null);
    setCreateTemplateOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: DocTemplate) => {
    if (!canSaveTemplate) return;
    setEditingTemplate(tmpl);
    setCreateTemplateOpen(true);
  };

  const filteredReports = reports.filter(
    (r) =>
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.patientNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.bodyParts.some((bp) => bp.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (session && session.role !== 'DOCTOR') {
    return null;
  }

  return (
    <PageShell className="p-0">
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <BookmarkPlus className="w-5 h-5 text-[#009ef7]" />
            <span>Radiology Document & Template Studio</span>
          </div>
        }
        subtitle="Manage report templates, master findings library, and PACS report editor"
        actions={
          <div className="flex items-center gap-2">
            {canSaveTemplate && (
              <button
                type="button"
                onClick={handleOpenCreateTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-[#009ef7]" />
                <span>Save Template</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => openWorkspace(selectedReport)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-slate-600" />
              <span>PACS Viewer</span>
            </button>

            <button
              type="button"
              onClick={() => openWorkspace(selectedReport)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#009ef7] hover:bg-[#008be0] text-xs font-bold text-white shadow-xs cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Open Studio</span>
            </button>
          </div>
        }
      />

      {/* Main Studio Body */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Patient Selector Sidebar */}
        <div className="w-full md:w-80 border-r border-slate-200 bg-white flex flex-col overflow-hidden shrink-0">
          <div className="p-2.5 border-b border-slate-200">
            <div className="relative">
              <Search className="rn-icon-vcenter w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rn-input-iconpad w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#009ef7]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredReports.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedReport(r)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  selectedReport?.id === r.id
                    ? 'border-[#009ef7] bg-sky-50/60'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] font-mono">
                  {formatPatientDisplayId(r.patientNumber) ? (
                    <span className="font-bold text-[#009ef7]">{r.patientNumber}</span>
                  ) : (
                    <span className="font-semibold text-slate-500">{r.modality || 'Study'}</span>
                  )}
                  <span className="text-slate-400">{r.studyDate}</span>
                </div>
                <div className="font-bold text-xs text-slate-900 mt-0.5">{r.fullName}</div>
                <div className="text-[10px] font-mono text-slate-500">{r.bodyParts.join(', ')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Active Workspace & Templates */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {/* Success banner */ false && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>New template created successfully! It is now available in your template library.</span>
            </div>
          )}

          {selectedReport ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  {formatPatientDisplayId(selectedReport.patientNumber) && (
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono text-[10px] font-bold">
                      {selectedReport.patientNumber}
                    </span>
                  )}
                  <span className="font-bold text-sm text-slate-900">{selectedReport.fullName}</span>
                </div>
                <StatusBadge status={selectedReport.status} />
              </div>

              <div className="font-mono text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>AGE/SEX: <strong>{selectedReport.age}/{selectedReport.gender}</strong></div>
                {showCenterColumn(session) && <div>CENTER: <strong>{selectedReport.radiologyCenterName}</strong></div>}
                <div>DOCTOR: <strong>{selectedReport.assignedDoctorName}</strong></div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => openWorkspace(selectedReport)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#009ef7] hover:bg-[#008be0] text-xs font-bold text-white shadow-xs cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Edit in DOC Studio</span>
                </button>

                {canSaveTemplate && (
                  <button
                    type="button"
                    onClick={handleOpenCreateTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 text-[#009ef7]" />
                    <span>Save New Template</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 italic bg-white rounded-xl border border-slate-200">
              Select a patient report from the list to start editing.
            </div>
          )}

          {/* Saved Templates List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SAVED RADIOLOGY REPORT TEMPLATES ({savedTemplates.length})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
              {savedTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => openWorkspace(selectedReport)}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    padding: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="tag" style={{ background: 'var(--teal-light)', color: 'var(--teal)' }}>
                      {tmpl.modality}
                    </span>
                    <span className="mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{tmpl.centerName}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)' }}>{tmpl.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: '#009ef7', fontWeight: 600 }}>Use Template →</span>
                    {canSaveTemplate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditTemplate(tmpl);
                        }}
                        className="text-[10px] font-bold text-slate-500 hover:text-purple-600 px-1.5 py-0.5 rounded hover:bg-purple-50 transition-colors"
                      >
                        Edit in Report View ✎
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Doctor Report Format Template Modal */}
      {canSaveTemplate && (
        <ReportTemplateModal
          isOpen={createTemplateOpen}
          onClose={() => {
            setCreateTemplateOpen(false);
            setEditingTemplate(null);
          }}
          initialTemplate={editingTemplate}
          prefill={selectedReport ? {
            title: `${selectedReport.bodyParts?.join(', ') || 'Study'} — Master Template`,
            centerId: selectedReport.radiologyCenterId || 'ALL',
            modality: selectedReport.modality || 'X-Ray',
            bodyPart: selectedReport.bodyParts?.[0] || 'CHEST PA/AP',
            findings: selectedReport.findings,
            impression: selectedReport.impression,
          } : undefined}
          onSaved={() => loadData()}
        />
      )}
    </PageShell>
  );
}
