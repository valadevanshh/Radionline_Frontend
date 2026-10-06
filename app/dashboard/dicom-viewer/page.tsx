'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RadiologyStore } from '@/lib/radiology-store';

/**
 * Legacy PACS Studio entry. When a reportId is provided, redirect to the
 * unified case workspace. Without an id, open the most recent case workspace
 * or fall back to All Reports.
 */
function DicomViewerStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get('reportId') || searchParams.get('id');

  useEffect(() => {
    if (reportId) {
      router.replace(`/dashboard/workspace/${reportId}`);
      return;
    }
    router.replace('/dashboard/all-reports');
  }, [reportId, router]);

  return (
    <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-mono uppercase tracking-wider">
      Opening unified case workspace...
    </div>
  );
}

export default function DicomViewerStudioPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-xs text-slate-400">Loading PACS Studio...</div>}>
      <DicomViewerStudioContent />
    </Suspense>
  );
}
