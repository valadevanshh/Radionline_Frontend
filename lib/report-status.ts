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

/** t82: true once a doctor has created a report for the case (any study saved as draft or signed). */
export function hasDoctorReport(report: XRayReport): boolean {
  if (report.status === 'Completed') return true;
  return (report.studies || []).some((s) => {
    const st = String(s.reportStatus || '').toUpperCase();
    return st === 'SIGNED' || st === 'DRAFT';
  });
}
