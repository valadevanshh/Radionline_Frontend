'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Search, Plus, Trash2, UserPlus, Briefcase, AlertTriangle, RefreshCw, SearchX } from 'lucide-react';
import { RadiologyStore, Doctor, UserAccount } from '@/lib/radiology-store';
import AddDoctorModal from '@/components/AddDoctorModal';
import { ApiClient, apiErrorMessage, isPendingApproval } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';
import { useConfirm, Modal } from '@/components/ui';
import DoctorSignatureForm from '@/components/DoctorSignatureForm';
import DoctorAvatar from '@/components/DoctorAvatar';
import DoctorDetailsModal from '@/components/DoctorDetailsModal';
import { experienceLabel } from '@/lib/doctor-profile';

const TOP_TAGS = 3;

export default function DoctorsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [session, setSession] = useState<UserAccount | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [usingCache, setUsingCache] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // Card click: full profile
  const [viewDoctor, setViewDoctor] = useState<Doctor | null>(null);
  // Super Admin: edit a doctor's profile + report signature details
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const currentSession = RadiologyStore.getSession();
      setSession(currentSession);
      const role = currentSession?.role;
      const isAllowedRole = role === 'SUPER_ADMIN' || role === 'MANAGER' || role === 'CENTER';
      // Doctor is not allowed to see this page. Allowed: SUPER_ADMIN, MANAGER, CENTER
      if (!currentSession || role === 'DOCTOR' || !isAllowedRole) {
        router.replace('/dashboard');
        setAuthorized(false);
      } else {
        setAuthorized(true);
      }
    };

    checkAuth();
    window.addEventListener('radionline_session_changed', checkAuth);
    return () => window.removeEventListener('radionline_session_changed', checkAuth);
  }, [router]);

  const canManageDoctors = session?.role === 'SUPER_ADMIN' || session?.role === 'MANAGER';
  const canEditSignature = session?.role === 'SUPER_ADMIN';
  const isManager = session?.role === 'MANAGER';

  const loadDoctors = useCallback(async () => {
    setLoadError('');
    try {
      let data: Doctor[];
      try {
        data = await ApiClient.getDoctorDirectory();
      } catch (err) {
        // API not restarted yet (no /doctors/directory): use the plain list
        if (!/API error 404/.test(err instanceof Error ? err.message : '')) throw err;
        data = await ApiClient.getDoctors();
      }
      setDoctors(data);
      setUsingCache(false);
    } catch (err) {
      const cached = RadiologyStore.getDoctors();
      setDoctors(cached);
      setUsingCache(cached.length > 0);
      setLoadError(apiErrorMessage(err, 'Could not load the doctors'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authorized) {
      loadDoctors();
      const handleDoctorsChanged = () => loadDoctors();
      window.addEventListener('radionline_doctors_changed', handleDoctorsChanged);
      return () => window.removeEventListener('radionline_doctors_changed', handleDoctorsChanged);
    }
  }, [authorized, loadDoctors]);

  // Keep an open profile in step with the reloaded list
  useEffect(() => {
    setViewDoctor((cur) => (cur ? doctors.find((d) => d.id === cur.id) || cur : cur));
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (d) =>
        (d.fullName || '').toLowerCase().includes(q) ||
        (d.email || '').toLowerCase().includes(q) ||
        (d.contactNumber || '').includes(q) ||
        (d.degree || '').toLowerCase().includes(q) ||
        (d.expertise || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [doctors, searchQuery]);

  // Add doctor: Super Admin saves at once; a Manager's request waits for Super Admin approval.
  const handleAddDoctor = async (doctor: Omit<Doctor, 'id' | 'createdAt'>) => {
    try {
      const saved = await ApiClient.saveDoctor(doctor);
      if (isPendingApproval(saved)) {
        toast.info(saved.message || 'Doctor request sent to the Super Admin for approval.');
        return;
      }
      RadiologyStore.saveDoctor(saved);
      toast.success(`Doctor saved: ${saved.fullName || doctor.fullName}`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save the doctor'));
    }
    loadDoctors();
  };

  // Delete doctor: Super Admin deletes; a Manager's delete becomes a request for approval.
  const handleDeleteDoctor = async (id: string) => {
    const ok = await confirm({
      title: isManager ? 'Request doctor deletion' : 'Delete doctor profile',
      message: isManager
        ? 'This sends a delete request to the Super Admin. The doctor is removed only after approval.'
        : 'Are you sure you want to delete this doctor profile?',
      confirmLabel: isManager ? 'Send Request' : 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const res = await ApiClient.deleteDoctor(id);
      if (isPendingApproval(res)) {
        toast.info(res.message || 'Delete request sent to the Super Admin for approval.');
        return;
      }
      RadiologyStore.deleteDoctor(id);
      setViewDoctor((cur) => (cur?.id === id ? null : cur));
      toast.success('Doctor deleted.');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete the doctor'));
    }
    loadDoctors();
  };

  if (authorized !== true) {
    return null;
  }

  const showError = !!loadError && !usingCache;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 space-y-3 max-w-7xl w-full mx-auto">

        {/* Page Top Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2 font-mono">
              <Users className="w-5 h-5 text-[#009ef7] shrink-0" />
              <span>Radiologists & Doctors</span>
            </h1>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Card view of each doctor — click a card to open the full profile (photo, experience, expertise, CV).
            </p>
          </div>

          {canManageDoctors && (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-[#009ef7] hover:bg-[#008be0] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer shrink-0 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Add Doctor</span>
            </button>
          )}
        </div>

        {/* Filter Toolbar & Data Card */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col min-h-0">

          {/* Search Filter Strip */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 flex-wrap shrink-0">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="rn-icon-vcenter w-4 h-4 absolute left-3 top-2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or expertise..."
                className="rn-input-iconpad w-full pl-9 pr-3 py-1.5 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs focus:outline-none focus:border-[#009ef7]"
                aria-label="Search doctors by name or expertise"
                data-testid="doctor-search"
              />
            </div>
            <div className="text-xs font-mono text-slate-500 font-bold">
              {filteredDoctors.length} {filteredDoctors.length === 1 ? 'DOCTOR' : 'DOCTORS'}
            </div>
          </div>

          {usingCache && loadError && (
            <div className="mx-3 mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900" role="status">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="flex-1 min-w-[160px]">{loadError}. Showing the last saved list.</span>
              <button
                type="button"
                onClick={() => loadDoctors()}
                className="inline-flex items-center gap-1 font-bold text-amber-900 hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              /* Loading skeleton cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 p-3" aria-busy="true" aria-label="Loading doctors">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 animate-pulse">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-200" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3.5 w-2/3 rounded bg-slate-200" />
                        <div className="h-3 w-1/2 rounded bg-slate-100" />
                        <div className="h-3 w-1/3 rounded bg-slate-100" />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-1.5">
                      <div className="h-5 w-12 rounded bg-slate-100" />
                      <div className="h-5 w-10 rounded bg-slate-100" />
                      <div className="h-5 w-14 rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : showError ? (
              /* Error state */
              <div className="p-12 text-center flex flex-col items-center justify-center" role="alert">
                <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mb-4 text-rose-600">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-mono">Could not load doctors</h3>
                <p className="text-xs text-slate-500 max-w-md mt-1 mb-6">{loadError}</p>
                <button
                  type="button"
                  onClick={() => {
                    setLoading(true);
                    loadDoctors();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#009ef7] hover:bg-[#008be0] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try again</span>
                </button>
              </div>
            ) : doctors.length === 0 ? (
              /* Empty State Card */
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-indigo-50 border border-indigo-200 rounded-full flex items-center justify-center mb-4 text-indigo-600">
                  <UserPlus className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-mono">
                  No Doctors / Radiologists Registered Yet
                </h3>
                <p className="text-xs text-slate-500 max-w-md mt-1 mb-6">
                  {canManageDoctors
                    ? 'Add consultant radiologist accounts to enable case assignment, digital signatures, and doctor logins.'
                    : 'No doctors are currently available in the directory.'}
                </p>
                {canManageDoctors && (
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#009ef7] hover:bg-[#008be0] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Doctor</span>
                  </button>
                )}
              </div>
            ) : filteredDoctors.length === 0 ? (
              /* No search matches */
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mb-4 text-slate-500">
                  <SearchX className="w-8 h-8" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight font-mono">No matching doctors</h3>
                <p className="text-xs text-slate-500 max-w-md mt-1 mb-6">
                  Nobody matches &ldquo;{searchQuery.trim()}&rdquo;. Try another name or expertise.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            ) : (
              /* Doctor cards: 1 col phones, 2 tablets, 3 laptops, 4 large desktops */
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 p-3"
                data-testid="doctor-cards"
              >
                {filteredDoctors.map((doc) => {
                  const tags = doc.expertise || [];
                  const extra = tags.length - TOP_TAGS;
                  return (
                    <div
                      key={doc.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setViewDoctor(doc)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setViewDoctor(doc);
                        }
                      }}
                      aria-label={`View profile of ${doc.fullName}`}
                      className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-xs text-left cursor-pointer transition-all hover:border-[#009ef7]/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009ef7]/40"
                      data-testid="doctor-card"
                    >
                      <div className="flex items-start gap-3">
                        <DoctorAvatar name={doc.fullName} photoUrl={doc.photoUrl} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-[14px] text-slate-900 truncate group-hover:text-[#009ef7]" title={doc.fullName}>
                            {doc.fullName}
                          </div>
                          <div className="text-[12px] text-slate-500 font-medium truncate" title={doc.degree || 'M.D. (Radiodiagnosis)'}>
                            {doc.degree || 'M.D. (Radiodiagnosis)'}
                          </div>
                          <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            <span>{experienceLabel(doc.yearsOfExperience)}</span>
                          </div>
                        </div>
                        {canManageDoctors && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDoctor(doc.id);
                            }}
                            className="p-1.5 -mr-1.5 -mt-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded hover:bg-rose-50 shrink-0"
                            title={isManager ? 'Request deletion' : 'Delete Doctor'}
                            aria-label={`${isManager ? 'Request deletion of' : 'Delete'} ${doc.fullName}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5 min-h-[24px]">
                        {tags.length ? (
                          <>
                            {tags.slice(0, TOP_TAGS).map((t) => (
                              <span
                                key={t}
                                className="max-w-[10rem] truncate rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800"
                              >
                                {t}
                              </span>
                            ))}
                            {extra > 0 && (
                              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                +{extra}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400">No expertise listed</span>
                        )}
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-semibold text-[#009ef7] opacity-0 group-hover:opacity-100 transition-opacity">
                        View full profile →
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      <DoctorDetailsModal
        doctor={viewDoctor}
        onClose={() => setViewDoctor(null)}
        showCredentials={canManageDoctors}
        onEdit={
          canEditSignature
            ? (d) => {
                setViewDoctor(null);
                setEditDoctor(d);
              }
            : undefined
        }
        onDelete={
          canManageDoctors
            ? (d) => {
                setViewDoctor(null);
                handleDeleteDoctor(d.id);
              }
            : undefined
        }
        deleteLabel={isManager ? 'Request deletion' : 'Delete'}
      />

      <Modal
        open={!!editDoctor}
        onClose={() => setEditDoctor(null)}
        title={editDoctor ? `Profile details - ${editDoctor.fullName}` : 'Profile details'}
        size="lg"
      >
        {editDoctor && (
          <DoctorSignatureForm
            doctor={editDoctor}
            onSave={(body) => ApiClient.updateDoctorProfile(editDoctor.id, body)}
            onSaved={(d) => {
              setEditDoctor(d);
              loadDoctors();
            }}
          />
        )}
      </Modal>

      <AddDoctorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddDoctor}
      />
    </div>
  );
}
