import type { XRayReport } from '@/lib/radiology-store';

/** True when the report for this body part (or, without one, any part of the case) is signed. */
export function isReportReady(report: XRayReport, bodyPart?: string): boolean {
  const studies = report.studies || [];
  if (studies.length) {
    const norm = (s: string) => (s || '').trim().toUpperCase();
    const list = bodyPart ? studies.filter((s) => norm(s.bodyPart) === norm(bodyPart)) : studies;
    if (list.length) return list.some((s) => String(s.reportStatus).toUpperCase() === 'SIGNED');
  }
  return report.status === 'Completed';
}
