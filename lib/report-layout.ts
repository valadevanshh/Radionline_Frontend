export type ReportLetterheadMode = 'header' | 'footer' | 'full-page' | 'preprinted';
export type ReportHorizontalPosition = 'left' | 'center' | 'right';
export type ReportQrPosition = 'left' | 'right';

/** Per-centre print layout. Heights are safe top/bottom spaces in millimetres. */
export interface CenterReportLayout {
  headerHeightMm: number;
  footerHeightMm: number;
  qrPosition: ReportQrPosition;
  doctorDetailsPosition: ReportHorizontalPosition;
}

/** Defaults match resolveLetterhead's existing dimensions and placements. */
export const REPORT_LAYOUT_DEFAULTS: Record<ReportLetterheadMode, CenterReportLayout> = {
  header: { headerHeightMm: 42, footerHeightMm: 8, qrPosition: 'right', doctorDetailsPosition: 'left' },
  footer: { headerHeightMm: 14, footerHeightMm: 32, qrPosition: 'right', doctorDetailsPosition: 'left' },
  'full-page': { headerHeightMm: 48, footerHeightMm: 30, qrPosition: 'right', doctorDetailsPosition: 'left' },
  preprinted: { headerHeightMm: 38, footerHeightMm: 22, qrPosition: 'right', doctorDetailsPosition: 'left' },
};

const TEXT_LETTERHEAD_DEFAULTS: CenterReportLayout = {
  headerHeightMm: 14,
  footerHeightMm: 16,
  qrPosition: 'right',
  doctorDetailsPosition: 'left',
};

export function centerReportLayout(
  layout?: Partial<CenterReportLayout> | null,
  mode: ReportLetterheadMode = 'full-page',
  hasArtwork = true,
): CenterReportLayout {
  const defaults = hasArtwork || mode === 'preprinted'
    ? REPORT_LAYOUT_DEFAULTS[mode] || REPORT_LAYOUT_DEFAULTS['full-page']
    : TEXT_LETTERHEAD_DEFAULTS;
  const position = (value: unknown, fallback: ReportHorizontalPosition): ReportHorizontalPosition =>
    value === 'left' || value === 'center' || value === 'right' ? value : fallback;
  return {
    headerHeightMm: Number.isFinite(Number(layout?.headerHeightMm)) ? Number(layout?.headerHeightMm) : defaults.headerHeightMm,
    footerHeightMm: Number.isFinite(Number(layout?.footerHeightMm)) ? Number(layout?.footerHeightMm) : defaults.footerHeightMm,
    qrPosition: layout?.qrPosition === 'left' ? 'left' : layout?.qrPosition === 'right' ? 'right' : defaults.qrPosition,
    doctorDetailsPosition: position(layout?.doctorDetailsPosition, defaults.doctorDetailsPosition),
  };
}
