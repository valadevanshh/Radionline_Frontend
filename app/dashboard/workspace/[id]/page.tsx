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
          setReport(remote);
          RadiologyStore.saveReport(remote);
        }
      } catch (err) {
        const local = RadiologyStore.getReports().find((r) => r.id === id) || null;
        if (!cancelled) {
          if (local) {
            setReport(local);
          } else {
            setLoadError(err instanceof Error ? err.message : 'Failed to load case');
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
