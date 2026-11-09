/** Reports display the centre's patient ID; system IDs remain internal record identifiers. */
export function formatReportPatientId(centerPatientId?: string | null): string {
  return centerPatientId?.trim() || '\u2014';
}
