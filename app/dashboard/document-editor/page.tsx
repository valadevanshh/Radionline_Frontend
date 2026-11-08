'use client';
import { withDr } from '@/lib/doctor-name';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookmarkPlus,
  Plus,
  Search,
  FileEdit,
  Trash2,
  Stethoscope,
  Building2,
  Layers,
} from 'lucide-react';
import { RadiologyStore, DocTemplate, RadiologyCenter, isSystemStandardTemplate } from '@/lib/radiology-store';
import { ApiClient, apiErrorMessage, isPendingApproval } from '@/lib/api-client';
import DoctorPicker, { DoctorOption, doctorOptionsFrom } from '@/components/DoctorPicker';
import { canManageTemplatesForDoctors, canViewTemplatesPage, canWriteTemplates, useSession } from '@/lib/access';
import { toast } from '@/components/ui/Toast';

import { PageShell, PageHeader } from '@/components/ui';
import ReportTemplateModal from '@/components/ReportTemplateModal';

export default function DocumentEditorStudioPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModality, setSelectedModality] = useState('ALL');
  const [savedTemplates, setSavedTemplates] = useState<DocTemplate[]>([]);
  const [allCenters, setAllCenters] = useState<RadiologyCenter[]>([]);

  const [createTemplateOpen, setCreateTemplateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DocTemplate | null>(null);
  const router = useRouter();
  const session = useSession();
  const isAdminView = !!session && session.role !== 'DOCTOR';
  const canSaveTemplate = canWriteTemplates(session) || canManageTemplatesForDoctors(session);
  const [doctorOptions, setDoctorOptions] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  useEffect(() => {
    if (session && !canViewTemplatesPage(session)) {
      router.replace('/dashboard');
    }
  }, [session, router]);

  useEffect(() => {
    if (!isAdminView) return;
    ApiClient.getDoctors()
      .then((d) => setDoctorOptions(doctorOptionsFrom(d)))
      .catch(() => setDoctorOptions(doctorOptionsFrom(RadiologyStore.getDoctors())));
  }, [isAdminView]);

  const doctorFilterOptions = useMemo(() => {
    const counts = new Map<string, number>();
    savedTemplates.forEach((t) => {
      if (t.doctorId) counts.set(String(t.doctorId), (counts.get(String(t.doctorId)) || 0) + 1);
    });
    const known = new Set(doctorOptions.map((d) => d.id));
    const extra: DoctorOption[] = [];
    savedTemplates.forEach((t) => {
      const id = t.doctorId ? String(t.doctorId) : '';
      if (id && !known.has(id)) { known.add(id); extra.push({ id, name: t.doctorName || id }); }
    });
    return [...doctorOptions, ...extra].map((d) => ({ ...d, count: counts.get(d.id) || 0 }));
  }, [doctorOptions, savedTemplates]);

  const selectedDoctorName = doctorFilterOptions.find((d) => d.id === selectedDoctorId)?.name;
  const modalPrefill = useMemo(
    () => (selectedDoctorId ? { doctorId: selectedDoctorId } : undefined),
    [selectedDoctorId],
  );

  const loadData = async () => {
    try {
      const [tmpls, cntrs] = await Promise.all([
        ApiClient.getTemplates(),
        ApiClient.getCenters(),
      ]);
      setSavedTemplates(tmpls.filter((t) => !isSystemStandardTemplate(t)));
      setAllCenters(cntrs.length > 0 ? cntrs : RadiologyStore.getCenters());
    } catch {
      setSavedTemplates(RadiologyStore.getTemplates());
      setAllCenters(RadiologyStore.getCenters());
    }
  };

  useEffect(() => {
    loadData();

    const handleTemplatesChange = () => loadData();
    const handleCentersChange = () => loadData();

    window.addEventListener('radionline_templates_changed', handleTemplatesChange);
    window.addEventListener('radionline_centers_changed', handleCentersChange);
    return () => {
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

  const handleDeleteTemplate = async (tmpl: DocTemplate) => {
    if (!window.confirm(`Are you sure you want to delete template "${tmpl.title}"?`)) return;
    try {
      const res = await ApiClient.deleteTemplate(tmpl.id);
      if (isPendingApproval(res)) {
        toast.info(res.message || 'Delete request sent to the Super Admin for approval.');
        return;
      }
      RadiologyStore.deleteTemplate(tmpl.id);
      toast.success('Template deleted successfully');
      loadData();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete template'));
    }
  };

  // Distinct modalities list from templates
  const modalities = useMemo(() => {
    const set = new Set<string>();
    savedTemplates.forEach((t) => {
      if (t.modality) set.add(t.modality.trim());
    });
    return Array.from(set).sort();
  }, [savedTemplates]);

  const filteredTemplates = useMemo(() => {
    return savedTemplates.filter((t) => {
      if (selectedDoctorId && String(t.doctorId || '') !== selectedDoctorId) return false;
      if (selectedModality !== 'ALL' && t.modality.trim().toLowerCase() !== selectedModality.trim().toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchModality = (t.modality || '').toLowerCase().includes(q);
        const matchBodyPart = (t.bodyPart || '').toLowerCase().includes(q);
        const matchFindings = (t.findings || '').toLowerCase().includes(q);
        const matchImpression = (t.impression || '').toLowerCase().includes(q);
        const matchCenter = (t.centerName || '').toLowerCase().includes(q);
        const matchDoctor = (t.doctorName || '').toLowerCase().includes(q);
        return matchTitle || matchModality || matchBodyPart || matchFindings || matchImpression || matchCenter || matchDoctor;
      }
      return true;
    });
  }, [savedTemplates, selectedModality, searchQuery, selectedDoctorId]);

  const hasFilters = !!(searchQuery || selectedModality !== 'ALL' || selectedDoctorId);

  if (session && !canViewTemplatesPage(session)) {
    return null;
  }

  return (
    <PageShell className="p-0">
      <PageHeader
        title={
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#009ef7]/10 text-[#009ef7] border border-[#009ef7]/20 rounded-xl">
              <BookmarkPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-slate-900 tracking-tight font-mono uppercase">
                  Radiology Report Templates
                </span>
                <span className="px-2 py-0.5 rounded-full bg-sky-50 text-[#009ef7] border border-sky-200 text-[10px] font-mono font-bold">
                  {filteredTemplates.length} {filteredTemplates.length === 1 ? 'Template' : 'Templates'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                {isAdminView
                  ? 'Create and manage report templates on behalf of doctors \u2014 each doctor sees only their own in PACS'
                  : 'Standardized master report templates for radiological findings and impressions'}
              </p>
            </div>
          </div>
        }
        actions={
          canSaveTemplate ? (
            <button
              type="button"
              onClick={handleOpenCreateTemplate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#009ef7] hover:bg-[#008be0] text-xs font-bold text-white shadow-xs hover:shadow transition-all cursor-pointer font-mono uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              <span>{isAdminView ? 'Add Template for Doctor' : 'Create Template'}</span>
            </button>
          ) : undefined
        }
      />

      {/* Main Body: Templates Only */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates by title, body part, modality, or findings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#009ef7] bg-slate-50/50 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isAdminView && (
                <div className="w-full sm:w-60">
                  <DoctorPicker
                    compact
                    options={doctorFilterOptions}
                    value={selectedDoctorId}
                    onChange={setSelectedDoctorId}
                    allLabel="All doctors"
                  />
                </div>
              )}
              <select
                value={selectedModality}
                onChange={(e) => setSelectedModality(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#009ef7] bg-slate-50/50 focus:bg-white text-slate-700 font-medium cursor-pointer"
              >
                <option value="ALL">All Modalities</option>
                {modalities.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedModality('ALL');
                    setSelectedDoctorId('');
                  }}
                  className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Templates Grid */}
          {filteredTemplates.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
              <div className="p-3 bg-slate-100 rounded-full text-slate-400">
                <BookmarkPlus className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">
                {selectedDoctorName && !searchQuery && selectedModality === 'ALL'
                  ? `${withDr(selectedDoctorName)} has no templates yet`
                  : 'No Templates Found'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {searchQuery || selectedModality !== 'ALL'
                  ? 'No templates match your current search and filters.'
                  : isAdminView
                    ? selectedDoctorName
                      ? 'Add one now and it will show up in their PACS template dropdown.'
                      : 'Add a template for a doctor - it will appear in their PACS template dropdown.'
                    : 'No report templates are currently available.'}
              </p>
              {canSaveTemplate && (
                <button
                  type="button"
                  onClick={handleOpenCreateTemplate}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#009ef7] hover:bg-[#008be0] text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    {isAdminView
                      ? selectedDoctorName ? `Add Template for ${withDr(selectedDoctorName)}` : 'Add Template for Doctor'
                      : 'Create Template'}
                  </span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="bg-white border border-slate-200 hover:border-[#009ef7]/60 hover:shadow-md transition-all rounded-2xl p-4 flex flex-col justify-between group shadow-2xs"
                >
                  <div>
                    {/* Top Row: Modality & Center Badges */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase bg-sky-50 text-[#009ef7] border border-sky-200">
                        {tmpl.modality}
                      </span>
                      <span
                        className="text-[10px] font-mono text-slate-400 truncate max-w-[120px] flex items-center gap-1"
                        title={tmpl.centerName || 'All Centers'}
                      >
                        <Building2 className="w-3 h-3 text-slate-300 shrink-0" />
                        <span className="truncate">{tmpl.centerName || 'All Centers'}</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#009ef7] transition-colors line-clamp-2 leading-snug">
                      {tmpl.title}
                    </h3>

                    {/* Creator Tag */}
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      {isAdminView && !tmpl.doctorName ? (
                        <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1" title="Not assigned to a doctor - visible to all doctors">
                          <Layers className="w-3 h-3" />
                          <span>Shared (no doctor)</span>
                        </span>
                      ) : tmpl.doctorName ? (
                        <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Stethoscope className="w-3 h-3" />
                          <span>{withDr(tmpl.doctorName)}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          <span>Centre Template</span>
                        </span>
                      )}
                      {tmpl.bodyPart && (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                          {tmpl.bodyPart}
                        </span>
                      )}
                    </div>

                    {/* Snippet Preview */}
                    {(tmpl.findings || tmpl.impression) && (
                      <div className="mt-3 bg-slate-50/70 border border-slate-100 rounded-xl p-2.5">
                        <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed font-serif italic">
                          "{tmpl.findings || tmpl.impression}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                    <span className="text-[10px] font-mono text-slate-400">
                      {tmpl.createdAt ? tmpl.createdAt.slice(0, 10) : ''}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {canSaveTemplate && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditTemplate(tmpl)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:text-[#009ef7] hover:bg-sky-50 border border-slate-200 transition-colors cursor-pointer"
                          title="Edit template in report view"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                      {canSaveTemplate && (tmpl.doctorId || !tmpl.id.startsWith('sys-')) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tmpl)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
          prefill={editingTemplate ? undefined : modalPrefill}
          onSaved={() => loadData()}
        />
      )}
    </PageShell>
  );
}
