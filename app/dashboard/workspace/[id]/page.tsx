'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DicomViewerModal from '@/components/DicomViewerModal';
import CaseActivityPanel from '@/components/CaseActivityPanel';
import { RadiologyStore, XRayReport } from '@/lib/radiology-store';
import { ApiClient } from '@/lib/api-client';

/**
 * Unified case workspace: DICOM viewer + report editor side-by-side.
 * Replaces the prior separate-modal open path for case work.
 * Priority 6: Case Activity panel (flag/reassign, recheck, comment thread).
 */
export default function CaseWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const [report, setReport] = useState<XRayReport | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityOpen, setActivityOpen] = useState(false);

  // Opened from a "new message" notification: show the Case Activity panel
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('activity') === '1') {
      setActivityOpen(true);
    }
    const openActivity = () => setActivityOpen(true);
    window.addEventListener('radionline_open_activity', openActivity);
    return () => window.removeEventListener('radionline_open_activity', openActivity);
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoadError('Missing case id');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const remote = await ApiClient.getReportById(id);
        if (!cancelled) {
          const sess = RadiologyStore.getSession();
          if (sess?.role === 'DOCTOR') {
            const docId = sess.doctorId || sess.email || '';
            const isClaimedByOther = Boolean(
              (remote.claimedByDoctorId && remote.claimedByDoctorId !== docId && remote.claimedByDoctorId !== sess.email && remote.claimedByDoctorId !== 'UNCLAIMED') ||
              (remote.assignedDoctorId && remote.assignedDoctorId !== docId && remote.assignedDoctorId !== sess.email && remote.assignedDoctorId !== 'ALL' && (remote.status === 'In Review' || remote.status === 'Completed' || remote.claimStatus === 'CLAIMED')) ||
              (remote.studies && remote.studies.some((s) => s.claimedBy && s.claimedBy !== docId && s.claimedBy !== sess.email && s.claimedBy !== 'UNCLAIMED'))
            );
            if (isClaimedByOther) {
              setLoadError('Access Denied: This case has been accepted by another doctor.');
              return;
            }
          } else if (sess?.role === 'CENTER') {
            const centerIds = new Set(sess.centers?.map((c) => c.centerId) || (sess.centerId ? [sess.centerId] : []));
            if (centerIds.size > 0 && remote.radiologyCenterId && !centerIds.has(remote.radiologyCenterId)) {
              setLoadError('Access Denied: This case belongs to another radiology centre.');
              return;
            }
          }
          setReport(remote);
          RadiologyStore.saveReport(remote);
        }
      } catch (err: any) {
        const errMsg = err instanceof Error ? err.message : String(err || '');
        if (errMsg.includes('403') || errMsg.toLowerCase().includes('access denied')) {
          if (!cancelled) {
            setLoadError('Access Denied: This case has been accepted by another doctor or belongs to another centre.');
          }
          return;
        }
        const local = RadiologyStore.getReports().find((r) => r.id === id) || null;
        if (!cancelled) {
          if (local) {
            setReport(local);
          } else {
            setLoadError(errMsg || 'Failed to load case');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleClose = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-mono uppercase tracking-wider">
        Loading case workspace...
      </div>
    );
  }

  if (loadError || !report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm font-bold text-slate-800">Case not found</p>
        <p className="text-xs text-slate-500 font-mono">{loadError || `No report with id ${id}`}</p>
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 bg-[#009ef7] hover:bg-[#008be0] text-white text-xs font-bold rounded"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', minHeight: 0 }}>
      <DicomViewerModal
        isOpen={true}
        report={report}
        onClose={handleClose}
        onOpenActivity={() => setActivityOpen(true)}
        onSaveReport={(updated) => {
          setReport(updated);
          RadiologyStore.saveReport(updated);
        }}
      />

      <CaseActivityPanel
        report={report}
        open={activityOpen}
        onClose={() => setActivityOpen(false)}
        onClaimUpdated={(claimedBy, claimedByName) => {
          setReport((prev) =>
            prev
              ? {
                  ...prev,
                  claimedByDoctorId: claimedBy,
                  claimedByDoctorName: claimedByName,
                  assignedDoctorId: claimedBy,
                  assignedDoctorName: claimedByName,
                  claimStatus: 'CLAIMED',
                  status: prev.status === 'Completed' ? 'In Review' : prev.status,
                }
              : prev
          );
        }}
      />
    </div>
  );
}
