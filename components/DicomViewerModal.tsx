'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  XCircle,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Sun,
  Moon,
  Maximize2,
  Ruler,
  Sliders,
  Layers,
  Camera,
  Info,
  Check,
  RefreshCw,
  Eye,
  ChevronLeft,
  ChevronRight,
  Activity,
  Menu,
  FolderOpen,
  FileText,
  MousePointer,
  Search,
  Grid,
  Circle,
  Square,
  ArrowUpRight,
  Type,
  LayoutGrid,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Table as TableIcon,
  List,
  ListOrdered,
  Undo,
  Redo,
  FileCheck,
  Printer,
  Sparkles,
  ChevronDown,
  Download,
  Wand2,
  GripVertical,
  FlipHorizontal,
  FlipVertical,
  Trash2,
  BookmarkPlus,
  AlertTriangle,
  CheckCircle2,
  MoreVertical,
  MessageSquare,
  ChevronUp,
} from 'lucide-react';
import { XRayReport, RadiologyStore, DocTemplate, RadiologyCenter, Doctor } from '@/lib/radiology-store';
import { formatPatientDisplayId } from '@/lib/uuid';
import { AUTOCOMPLETE_SUGGESTIONS } from '@/lib/radiology-autocomplete';
import { STUDY_MODALITY_OPTIONS } from '@/components/NewXRayReportModal';
import { printReportElement, type PrintReportPayload, A4_PAGE } from '@/lib/print-helper';
import { usableSignatureUrl } from '@/components/DoctorSignatureForm';
import ReportTemplateModal from '@/components/ReportTemplateModal';
import A4ReportEditor from '@/components/A4ReportEditor';
import { stackedPagesHeightPx, useQrSvgMarkup } from '@/components/PaginatedReport';

// On-screen A4 page geometry (CSS px at 96 dpi) and body font stacks shared with the PDF
const MM_PX = 96 / 25.4;
const SHEET_FONT_STACKS: Record<string, string> = {
  'font-serif': 'Georgia, "Times New Roman", Times, serif',
  'font-sans': 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  'font-mono': 'ui-monospace, Menlo, Consolas, monospace',
};
const SHEET_FONT_PT: Record<string, number> = { 'text-xs': 10, 'text-sm': 11, 'text-base': 12 };
import { ApiClient, resolveMediaUrl, apiErrorMessage, publicReportLink, getAccessToken, WS_BASE_URL, type ImageAnnotation } from '@/lib/api-client';
import { canWriteTemplates } from '@/lib/access';

interface DicomViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  report?: XRayReport | null;
  onSaveSnapshot?: (snapshotUrl: string) => void;
  onSaveReport?: (updatedReport: XRayReport) => void;
  onOpenActivity?: () => void;
}

// Phone / tablet-portrait Viewer <-> Report swipe
const TAB_SWIPE_EDGE_PX = 24; // over the image, a swipe must start this close to a screen edge
const TAB_SWIPE_MIN_PX = 60; // minimum horizontal travel
const TAB_SWIPE_RATIO = 1.5; // horizontal travel must exceed vertical travel by this factor
const TAB_SWIPE_CSS = `
@keyframes rn-tab-in-right { from { transform: translateX(28px); opacity: 0.6; } to { transform: none; opacity: 1; } }
@keyframes rn-tab-in-left { from { transform: translateX(-28px); opacity: 0.6; } to { transform: none; opacity: 1; } }
.rn-tab-slide-from-right { animation: rn-tab-in-right 180ms ease-out; }
.rn-tab-slide-from-left { animation: rn-tab-in-left 180ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .rn-tab-slide-from-right, .rn-tab-slide-from-left { animation: none; }
}
`;

const generateDicomSvg = (bodyPart: string, modality: string) =>
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000" style="background:%2305070a;"><defs><radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="%23475569"/><stop offset="50%" stop-color="%231e293b"/><stop offset="100%" stop-color="%23020617"/></radialGradient></defs><rect width="1000" height="1000" fill="url(%23g)"/><path d="M 300 250 Q 500 150 700 250 T 700 750 Q 500 850 300 750 Z" fill="none" stroke="%2394a3b8" stroke-width="4" stroke-dasharray="8 4" opacity="0.6"/><path d="M 380 320 C 440 380 440 620 380 680" fill="none" stroke="%23f8fafc" stroke-width="12" opacity="0.85"/><path d="M 620 320 C 560 380 560 620 620 680" fill="none" stroke="%23f8fafc" stroke-width="12" opacity="0.85"/><ellipse cx="500" cy="500" rx="140" ry="220" fill="none" stroke="%23cbd5e1" stroke-width="6" opacity="0.75"/><text x="40" y="60" fill="%23009ef7" font-family="monospace" font-size="24" font-weight="bold">RADIONET DICOM WORKSTATION</text><text x="40" y="95" fill="%2394a3b8" font-family="monospace" font-size="18">${encodeURIComponent(modality)} — ${encodeURIComponent(bodyPart)}</text><text x="920" y="70" fill="%23f8fafc" font-family="sans-serif" font-size="42" font-weight="bold">R</text><line x1="40" y1="940" x2="240" y2="940" stroke="%23009ef7" stroke-width="4"/><text x="40" y="970" fill="%23009ef7" font-family="monospace" font-size="16">SCALE: 10 cm</text></svg>`;

export const SAMPLE_DICOM_SERIES = [
  {
    id: 'chest-pa-1',
    title: 'HIP & PELVIS AP/LAT PORTABLE',
    modality: 'DX (Digital Radiography)',
    bodyPart: 'HIP & PELVIS AP/LAT',
    studyDate: '08 Sep 2026 19:47',
    seriesDescription: 'PBH AP & RT HIP AP/LAT PORTABLE',
    kvp: '80 kVp',
    ma: '200 mA',
    exposureTime: '32 ms',
    pixelSpacing: '0.14 mm / px',
    rowsCols: '2048 x 2048',
    institution: 'DIAGNOSTICS PACS HUB',
    imageUrl: generateDicomSvg('HIP & PELVIS', 'DX'),
    ww: 1500,
    wl: -600,
  },
  {
    id: 'knee-ap-1',
    title: 'KNEE JOINT WEIGHT BEARING AP/LAT (DX)',
    modality: 'DX (Digital Radiography)',
    bodyPart: 'KNEE JOINT',
    studyDate: '08 Sep 2026 18:30',
    seriesDescription: 'Knee Joint Bilateral AP',
    kvp: '70 kVp',
    ma: '160 mA',
    exposureTime: '40 ms',
    pixelSpacing: '0.10 mm / px',
    rowsCols: '1920 x 1920',
    institution: 'ADVANCE PORTABLE X-RAY',
    imageUrl: generateDicomSvg('KNEE JOINT', 'DX'),
    ww: 2000,
    wl: 400,
  },
  {
    id: 'spine-lumbar-1',
    title: 'LUMBAR SPINE FLEXION/EXTENSION (DX)',
    modality: 'DX (Digital Radiography)',
    bodyPart: 'LUMBAR SPINE',
    studyDate: '08 Sep 2026 16:15',
    seriesDescription: 'L-Spine Neutral & Lateral',
    kvp: '85 kVp',
    ma: '250 mA',
    exposureTime: '80 ms',
    pixelSpacing: '0.12 mm / px',
    rowsCols: '2048 x 2500',
    institution: 'DIAGNOSTICS RESEARCH',
    imageUrl: generateDicomSvg('LUMBAR SPINE', 'DX'),
    ww: 1800,
    wl: 350,
  },
  {
    id: 'brain-ct-slice-1',
    title: 'BRAIN AXIAL NON-CONTRAST CT STACK (CT)',
    modality: 'CT (Computed Tomography)',
    bodyPart: 'BRAIN / HEAD',
    studyDate: '08 Sep 2026 14:00',
    seriesDescription: 'Axial 5mm Thin Slices',
    kvp: '120 kVp',
    ma: '200 mA',
    exposureTime: '500 ms',
    pixelSpacing: '0.48 mm / px',
    rowsCols: '512 x 512',
    institution: 'PACS HUB',
    imageUrl: generateDicomSvg('BRAIN / HEAD', 'CT'),
    ww: 80,
    wl: 40,
  },
];

import { RADIOLOGY_TEMPLATES, SystemReportTemplate as ReportTemplate } from '@/lib/radiology-templates';
export type { ReportTemplate };
export { RADIOLOGY_TEMPLATES };

export type ToolMode =
  | 'none'
  | 'pan'
  | 'zoom'
  | 'stack'
  | 'pointer'
  | 'magnifier'
  | 'wwwl'
  | 'measure'
  | 'angle'
  | 'cobb'
  | 'roi_ellipse'
  | 'arrow';

export type GridLayout = '1x1' | '1x2' | '2x1' | '2x2';

/** Stable key of a case image for saved marks: the stored file path (no host), else its position. */
function imageKeyFor(raw: string | undefined, idx: number): string {
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return `img-${idx}`;
  const marker = '/api/files/';
  const at = raw.indexOf(marker);
  let key = at >= 0 ? raw.slice(at + marker.length) : raw.replace(/^https?:\/\/[^/]+/i, '');
  key = key.split('?')[0].split('#')[0].replace(/^\/+/, '');
  return (key || `img-${idx}`).slice(0, 480);
}

type ArrowData = { x1: number; y1: number; x2: number; y2: number };

/** Arrow head polygon in viewBox units, drawn true-to-shape on a stretched (non-square) image. */
function arrowHeadPoints(a: ArrowData, imgW: number, imgH: number): string {
  const m = Math.max(imgW, imgH) || 1;
  const ax = (imgW || 1) / m;
  const ay = (imgH || 1) / m;
  const dx = (a.x2 - a.x1) * ax;
  const dy = (a.y2 - a.y1) * ay;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const L = Math.min(34, len * 0.45);
  const W = L * 0.55;
  const bx = a.x2 * ax - ux * L;
  const by = a.y2 * ay - uy * L;
  const p1 = [(bx - uy * W) / ax, (by + ux * W) / ay];
  const p2 = [(bx + uy * W) / ax, (by - ux * W) / ay];
  return `${a.x2},${a.y2} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`;
}

interface AnnotationLine {
  id: string;
  type: 'measure' | 'angle' | 'cobb' | 'ellipse';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3?: number;
  y3?: number;
  x4?: number;
  y4?: number;
  label?: string;
}

export default function DicomViewerModal({
  isOpen,
  onClose,
  report,
  onSaveSnapshot,
  onSaveReport,
  onOpenActivity,
}: DicomViewerModalProps) {
  const [isReportingOpen, setIsReportingOpen] = useState(true);
  const [withHeader, setWithHeader] = useState(true);
  const [gridLayout, setGridLayout] = useState<GridLayout>('1x1');
  const [activeViewportIdx, setActiveViewportIdx] = useState(0);
  const [mobileActiveView, setMobileActiveView] = useState<'dicom' | 'report'>('dicom');
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [isLgLayout, setIsLgLayout] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const [toolsMoreOpen, setToolsMoreOpen] = useState(false);
  const toolsMoreRef = useRef<HTMLDivElement | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [storedTemplates, setStoredTemplates] = useState<DocTemplate[]>([]);
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  // Save Template Modal State
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [saveTmplTitle, setSaveTmplTitle] = useState('');
  const [saveTmplCenterId, setSaveTmplCenterId] = useState('ALL');
  const [saveTmplModality, setSaveTmplModality] = useState('X-Ray');
  const [saveTemplateSuccess, setSaveTemplateSuccess] = useState(false);
  const [allCenters, setAllCenters] = useState<RadiologyCenter[]>([]);
  // Fresh doctor list for the live signature-block preview of studies not signed yet
  const [liveDoctors, setLiveDoctors] = useState<Doctor[]>([]);
  // Public QR links withdrawn in this session (Super Admin)
  const [revokedTokens, setRevokedTokens] = useState<string[]>([]);

  // Report Formatting State
  const [reportFontFamily, setReportFontFamily] = useState<'font-serif' | 'font-sans' | 'font-mono'>('font-serif');
  const [reportFontSize, setReportFontSize] = useState<'text-xs' | 'text-sm' | 'text-base'>('text-sm');
  const [reportTextAlign, setReportTextAlign] = useState<'text-left' | 'text-center' | 'text-right'>('text-left');
  const [isBoldActive, setIsBoldActive] = useState(false);
  const [isItalicActive, setIsItalicActive] = useState(false);
  const [isUnderlineActive, setIsUnderlineActive] = useState(false);

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTool, setActiveTool] = useState<ToolMode>('pan');

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => setIsLgLayout(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Phone / tablet-portrait tabs: swipe left on Viewer -> Report, swipe right on Report -> Viewer.
  // Listeners are passive (capture phase, never preventDefault), so image gestures keep working.
  const [tabSlideDir, setTabSlideDir] = useState<'from-right' | 'from-left' | null>(null);
  const viewerPaneRef = useRef<HTMLDivElement | null>(null);
  const tabSwipeRef = useRef<{ x: number; y: number; multi: boolean; ok: boolean } | null>(null);

  const switchMobileView = (next: 'dicom' | 'report') => {
    if (next !== mobileActiveView) setTabSlideDir(next === 'report' ? 'from-right' : 'from-left');
    setMobileActiveView(next);
  };

  const hasTextSelection = () => {
    if (typeof window === 'undefined') return false;
    const a = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    try {
      if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT') && a.selectionStart !== null && a.selectionStart !== a.selectionEnd) return true;
    } catch {
      // input types without a text selection
    }
    const sel = window.getSelection();
    return !!sel && !sel.isCollapsed && sel.toString().trim().length > 0;
  };

  const swipeStartAllowed = (target: EventTarget | null, x: number, root: Element, fromTabBar: boolean) => {
    const el = target instanceof Element ? target : null;
    if (!el) return fromTabBar;
    // A text field being edited (focused) or holding a selection keeps its own touch behaviour
    const field = el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]');
    if (field && (field.contains(document.activeElement) || hasTextSelection())) return false;
    if (fromTabBar) return true;
    // Image area: only edge swipes, so pan / window-level / zoom / measure are untouched
    if (viewerPaneRef.current && viewerPaneRef.current.contains(el)) {
      return x <= TAB_SWIPE_EDGE_PX || x >= window.innerWidth - TAB_SWIPE_EDGE_PX;
    }
    // Leave horizontally scrollable areas (thumbnail strip, A4 page wider than the screen) to scroll
    for (let n: Element | null = el; n && n !== root; n = n.parentElement) {
      const s = window.getComputedStyle(n);
      if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 2) return false;
    }
    return true;
  };

  const onTabSwipeStart = (e: React.TouchEvent<HTMLElement>, fromTabBar: boolean) => {
    if (isLgLayout || !isReportingOpen) {
      tabSwipeRef.current = null;
      return;
    }
    if (e.touches.length !== 1) {
      if (tabSwipeRef.current) tabSwipeRef.current.multi = true;
      return;
    }
    const t = e.touches[0];
    tabSwipeRef.current = {
      x: t.clientX,
      y: t.clientY,
      multi: false,
      ok: swipeStartAllowed(e.target, t.clientX, e.currentTarget, fromTabBar),
    };
  };

  const onTabSwipeMove = (e: React.TouchEvent<HTMLElement>) => {
    if (tabSwipeRef.current && e.touches.length > 1) tabSwipeRef.current.multi = true;
  };

  const onTabSwipeEnd = (e: React.TouchEvent<HTMLElement>) => {
    const s = tabSwipeRef.current;
    if (!s) return;
    if (e.touches.length > 0) {
      s.multi = true; // another finger is still down: a pinch, not a swipe
      return;
    }
    tabSwipeRef.current = null;
    if (!s.ok || s.multi || isLgLayout || !isReportingOpen) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < TAB_SWIPE_MIN_PX || Math.abs(dx) < TAB_SWIPE_RATIO * Math.abs(dy)) return;
    if (hasTextSelection()) return;
    if (dx < 0 && mobileActiveView === 'dicom') switchMobileView('report');
    else if (dx > 0 && mobileActiveView === 'report') switchMobileView('dicom');
  };

  const tabSwipeHandlers = (fromTabBar: boolean) => ({
    onTouchStartCapture: (e: React.TouchEvent<HTMLElement>) => onTabSwipeStart(e, fromTabBar),
    onTouchMoveCapture: onTabSwipeMove,
    onTouchEndCapture: onTabSwipeEnd,
    onTouchCancelCapture: () => {
      tabSwipeRef.current = null;
    },
  });

  useEffect(() => {
    if (!moreMenuOpen && !toolsMoreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
      if (toolsMoreRef.current && !toolsMoreRef.current.contains(e.target as Node)) {
        setToolsMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [moreMenuOpen, toolsMoreOpen]);

  useEffect(() => {
    if (isOpen) {
      setStoredTemplates(RadiologyStore.getTemplates());
      setAllCenters(RadiologyStore.getCenters());
      (async () => {
        try {
          const [tmpls, cntrs] = await Promise.all([
            ApiClient.getTemplates(),
            ApiClient.getCenters(),
          ]);
          if (tmpls?.length) {
            // Merge API templates with local/system templates so built-ins stay available
            const byId = new Map<string, DocTemplate>();
            RadiologyStore.getTemplates().forEach((t) => byId.set(t.id, t));
            tmpls.forEach((t) => {
              byId.set(t.id, t);
              RadiologyStore.saveTemplate(t);
            });
            setStoredTemplates(Array.from(byId.values()));
          }
          if (cntrs?.length) setAllCenters(cntrs);
        } catch (err) {
          console.warn('Failed to load templates/centers from API:', err);
        }
      })();
      ApiClient.getDoctors()
        .then((docs) => { if (docs?.length) setLiveDoctors(docs); })
        .catch(() => {});
    }

    const handleTemplatesChange = () => setStoredTemplates(RadiologyStore.getTemplates());
    const handleCentersChange = () => setAllCenters(RadiologyStore.getCenters());
    window.addEventListener('radionline_templates_changed', handleTemplatesChange);
    window.addEventListener('radionline_centers_changed', handleCentersChange);
    return () => {
      window.removeEventListener('radionline_templates_changed', handleTemplatesChange);
      window.removeEventListener('radionline_centers_changed', handleCentersChange);
    };
  }, [isOpen]);

  // Report Text & Content State
  const [reportTitle, setReportTitle] = useState(
    report?.bodyParts?.length ? `X-RAY ${report.bodyParts.join(' & ').toUpperCase()} EXAMINATION` : 'X-RAY EXAMINATION'
  );
  const [findingText, setFindingText] = useState(
    report?.findings || (report?.reportsByBodyPart && Object.values(report.reportsByBodyPart).join('\n\n')) || ''
  );
  const [impressionText, setImpressionText] = useState(
    report?.impression || (report?.impressionsByBodyPart && Object.values(report.impressionsByBodyPart).join('\n\n')) || ''
  );


  const norm = (s?: string | null) => (s || '').trim().toLowerCase();
  const caseModality = norm(report?.modality);
  const caseBodyParts = (report?.bodyParts || []).map((bp) => norm(bp)).filter(Boolean);
  const templateMatchesCase = (tmpl: DocTemplate) => {
    const tMod = norm(tmpl.modality);
    const tBp = norm(tmpl.bodyPart);
    // "X-Ray" should match "X-Ray Chest", "CT" match "CT Scan", etc.
    const modalityOk =
      !caseModality ||
      !tMod ||
      tMod === caseModality ||
      tMod.startsWith(caseModality) ||
      caseModality.startsWith(tMod) ||
      tMod.includes(caseModality) ||
      caseModality.includes(tMod.split(/\s+/)[0] || tMod);
    const bodyOk =
      caseBodyParts.length === 0 ||
      !tBp ||
      caseBodyParts.some((bp) => bp === tBp || bp.includes(tBp) || tBp.includes(bp));
    return modalityOk && bodyOk;
  };
  const filteredTemplates = showAllTemplates
    ? storedTemplates
    : storedTemplates.filter(templateMatchesCase);

  const handleOpenSaveTemplate = () => {
    if (!canWriteTemplates(RadiologyStore.getSession())) return;
    setSaveTmplTitle(reportTitle || (report?.bodyParts?.join(', ') ? `${report.bodyParts.join(', ')} — Custom Template` : 'New Custom Radiology Template'));
    {
      const sess = RadiologyStore.getSession();
      const wanted = report?.radiologyCenterId || 'ALL';
      if (sess?.role === 'CENTER') {
        const ok = (sess.centers || []).filter((c) => c.permissions?.templates === 'write').map((c) => c.centerId);
        setSaveTmplCenterId(ok.includes(wanted) ? wanted : ok[0] || wanted);
      } else {
        setSaveTmplCenterId(wanted);
      }
    }
    setSaveTmplModality(report?.modality || 'X-Ray');
    setSaveTemplateModalOpen(true);
  };

  const handleConfirmSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWriteTemplates(RadiologyStore.getSession()) || !saveTmplTitle.trim()) return;

    let centerName = 'All Centers';
    if (saveTmplCenterId !== 'ALL') {
      const matched = allCenters.find((c) => c.id === saveTmplCenterId);
      if (matched) centerName = matched.centerName;
    }

    const contentHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
        <h2 style="color: #009ef7; border-bottom: 2px solid #009ef7; padding-bottom: 4px; text-transform: uppercase;">
          ${reportTitle || saveTmplTitle}
        </h2>
        <h3 style="color: #0f172a; margin-bottom: 8px;">RADIOLOGICAL FINDINGS:</h3>
        <p>${findingText.replace(/\n/g, '<br/>')}</p>
        <br/>
        <h3 style="color: #0f172a; margin-bottom: 8px;">IMPRESSION & CONCLUSION:</h3>
        <div style="background-color: #f1f5f9; padding: 10px; border-left: 4px solid #009ef7;">
          <p>${impressionText.replace(/\n/g, '<br/>')}</p>
        </div>
      </div>
    `;

    const tmplPayload = {
      title: saveTmplTitle.trim(),
      centerId: saveTmplCenterId,
      centerName,
      modality: report?.modality || saveTmplModality,
      bodyPart: report?.bodyParts?.[0] || saveTmplModality,
      findings: findingText,
      impression: impressionText,
      content: contentHtml,
    };
    ApiClient.saveTemplate(tmplPayload)
      .then((saved) => {
        setSaveTemplateModalOpen(false);
        if (saved && (saved as { pendingApproval?: boolean }).pendingApproval) {
          setStatusToast((saved as { message?: string }).message || 'Template change sent to the Super Admin for approval.');
          setTimeout(() => setStatusToast(null), 4000);
          return;
        }
        RadiologyStore.saveTemplate(saved);
        setSaveTemplateSuccess(true);
        setTimeout(() => setSaveTemplateSuccess(false), 3000);
      })
      .catch((err) => {
        setStatusToast(apiErrorMessage(err, 'Could not save the template'));
        setTimeout(() => setStatusToast(null), 4000);
      });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportSavedSuccess, setReportSavedSuccess] = useState(false);

  const [activeBodyPartIdx, setActiveBodyPartIdx] = useState<number>(0);
  const [techniqueByPart, setTechniqueByPart] = useState<Record<string, string>>({});
  const [techniqueText, setTechniqueText] = useState('');
  const [leaveGuardOpen, setLeaveGuardOpen] = useState(false);
  const [leaveGuardAction, setLeaveGuardAction] = useState<null | (() => void)>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [studyStatuses, setStudyStatuses] = useState<Record<string, string>>({});

  const [bodyPartReports, setBodyPartReports] = useState<Record<string, string>>({});
  const [bodyPartImpressions, setBodyPartImpressions] = useState<Record<string, string>>({});

  const handleSwitchBodyPartTab = (newIdx: number) => {
    if (!report?.bodyParts || newIdx < 0 || newIdx >= report.bodyParts.length) return;
    const currentPart = report.bodyParts[activeBodyPartIdx] || 'GENERAL';
    const updatedRMap = { ...bodyPartReports, [currentPart]: findingText };
    const updatedIMap = { ...bodyPartImpressions, [currentPart]: impressionText };
    setBodyPartReports(updatedRMap);
    setBodyPartImpressions(updatedIMap);

    setActiveBodyPartIdx(newIdx);
    const newPart = report.bodyParts[newIdx];
    setFindingText(updatedRMap[newPart] || '');
    setImpressionText(updatedIMap[newPart] || '');
    setReportTitle(`X-RAY ${newPart.toUpperCase()} EXAMINATION`);
  };

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const initFromReport = async () => {
      if (!report) {
        setReportTitle('X-RAY EXAMINATION');
        setFindingText('');
        setImpressionText('');
        setBodyPartReports({});
        setBodyPartImpressions({});
        setActiveBodyPartIdx(0);
        setSelectedTemplateId('');
        return;
      }

      const parts = report.bodyParts && report.bodyParts.length > 0 ? report.bodyParts : ['GENERAL'];
      const rMap: Record<string, string> = { ...(report.reportsByBodyPart || {}) };
      const iMap: Record<string, string> = { ...(report.impressionsByBodyPart || {}) };

      const hasSavedContent = Boolean(
        (report.findings && report.findings.trim()) ||
        (report.impression && report.impression.trim()) ||
        Object.values(rMap).some((v) => v && String(v).trim()) ||
        Object.values(iMap).some((v) => v && String(v).trim())
      );

      let matchedTitle: string | null = null;
      let matchedTemplateKey = '';

      if (!hasSavedContent) {
        // Template auto-match by modality + body part (equality, case-insensitive trim)
        let matched: DocTemplate | null = null;
        const modality = (report.modality || '').trim();
        if (modality) {
          for (const bp of parts) {
            if (cancelled) return;
            try {
              matched = await ApiClient.matchTemplate(modality, bp);
            } catch (err) {
              console.warn('Template match error:', err);
              matched = null;
            }
            if (matched) break;
          }
        }

        if (matched) {
          const findingsText =
            matched.findings ||
            (matched.content ? matched.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '') ||
            '';
          const impressionVal = matched.impression || '';
          parts.forEach((p) => {
            rMap[p] = findingsText;
            iMap[p] = impressionVal;
          });
          matchedTitle = matched.title || null;
          matchedTemplateKey = matched.id ? `stored_${matched.id}` : '';
        } else {
          // No match: leave blank starting point (do not invent placeholder text)
          parts.forEach((p) => {
            rMap[p] = '';
            iMap[p] = '';
          });
        }
      } else {
        parts.forEach((p) => {
          if (!rMap[p]) {
            rMap[p] = report.findings || '';
          }
          if (!iMap[p]) {
            iMap[p] = report.impression || '';
          }
        });
      }

      if (cancelled) return;

      setBodyPartReports(rMap);
      setBodyPartImpressions(iMap);

      // Open on the first study that is not signed yet (falls back to the first study)
      const caseStudies = report.studies || [];
      const firstOpenIdx = parts.findIndex((bp, i) => {
        const st = caseStudies.find((s) => s.bodyPart === bp) || caseStudies[i];
        return String(st?.reportStatus || '').toUpperCase() !== 'SIGNED';
      });
      const startIdx = firstOpenIdx >= 0 ? firstOpenIdx : 0;
      setActiveBodyPartIdx(startIdx);

      const firstPart = parts[startIdx];
      setReportTitle(matchedTitle || `X-RAY ${firstPart.toUpperCase()} EXAMINATION`);
      setFindingText(rMap[firstPart] || '');
      setImpressionText(iMap[firstPart] || '');
      setSelectedTemplateId(matchedTemplateKey);

    };

    initFromReport();
    return () => {
      cancelled = true;
    };
  }, [report, isOpen]);

  const seriesList = React.useMemo(() => {
    if (report) {
      const rawImages: string[] = [];
      if (report.dicomFileUrl) rawImages.push(report.dicomFileUrl);
      if (report.uploadedImages && report.uploadedImages.length > 0) {
        rawImages.push(...report.uploadedImages);
      }

      const images = Array.from(
        new Set(rawImages.filter((img) => img && typeof img === 'string' && img.trim() !== '')),
      ).map((u) => resolveMediaUrl(u) || u);

      if (images.length > 0) {
        return images.map((imgUrl, idx) => ({
          id: `report-img-${idx}`,
          title: `${report.bodyParts?.[idx] || report.bodyParts?.[0] || 'Radiograph'}${formatPatientDisplayId(report.patientNumber) ? ` (${report.patientNumber})` : ''}`,
          modality: 'DX (Digital Radiography)',
          bodyPart: report.bodyParts?.[idx] || report.bodyParts?.[0] || 'X-RAY',
          studyDate: report.studyDate || new Date().toISOString().split('T')[0],
          seriesDescription: `${report.fullName} - ${report.bodyParts?.[idx] || 'Study Series'}`,
          kvp: '80 kVp',
          ma: '200 mA',
          exposureTime: '32 ms',
          pixelSpacing: '0.14 mm / px',
          rowsCols: '2048 x 2048',
          institution: report.radiologyCenterName || 'RADIONET PACS',
          imageUrl: imgUrl,
          ww: 1500,
          wl: -600,
        }));
      }

      return SAMPLE_DICOM_SERIES.map((s, idx) => ({
        ...s,
        title: `${report.bodyParts?.[idx] || report.bodyParts?.[0] || s.bodyPart}${formatPatientDisplayId(report.patientNumber) ? ` (${report.patientNumber})` : ''}`,
        institution: report.radiologyCenterName || s.institution,
        studyDate: report.studyDate || s.studyDate,
        seriesDescription: `${report.fullName} - ${report.bodyParts?.[idx] || s.seriesDescription}`,
      }));
    }

    return SAMPLE_DICOM_SERIES;
  }, [report]);

  const [viewportSeries, setViewportSeries] = useState<number[]>([0, 1, 2, 3]);

  const [viewportStates, setViewportStates] = useState(
    [0, 1, 2, 3].map((idx) => ({
      zoom: 1.0,
      pan: { x: 0, y: 0 },
      rotation: 0,
      flipH: false,
      flipV: false,
      ww: (seriesList[idx % seriesList.length] || seriesList[0]).ww,
      wl: (seriesList[idx % seriesList.length] || seriesList[0]).wl,
      invert: false,
    }))
  );

  const [imgSizes, setImgSizes] = useState<Record<number, { w: number; h: number }>>({});

  const [annotations, setAnnotations] = useState<Record<string, AnnotationLine[]>>({});

  // Saved arrow marks (shared with everyone who opens the case; drawn by doctors / Super Admin)
  const [marks, setMarks] = useState<ImageAnnotation[]>([]);
  const [draftArrow, setDraftArrow] = useState<(ArrowData & { vIdx: number }) | null>(null);
  const [selectedMarkId, setSelectedMarkId] = useState<number | null>(null);
  const svgRefs = useRef<(SVGSVGElement | null)[]>([]);
  const viewerSession = RadiologyStore.getSession();
  const canDrawArrows = viewerSession?.role === 'DOCTOR' || viewerSession?.role === 'SUPER_ADMIN';
  const canCreateTemplate = canWriteTemplates(viewerSession);
  const myUserId = viewerSession?.userId;
  const canRemoveMark = (m: ImageAnnotation) =>
    viewerSession?.role === 'SUPER_ADMIN' || (myUserId != null && m.authorUserId === myUserId);

  // Key of each series image (same order / de-duplication as seriesList)
  const seriesImageKeys = React.useMemo(() => {
    if (!report) return [] as string[];
    const raw: string[] = [];
    if (report.dicomFileUrl) raw.push(report.dicomFileUrl);
    if (report.uploadedImages && report.uploadedImages.length > 0) raw.push(...report.uploadedImages);
    const unique = Array.from(new Set(raw.filter((img) => img && typeof img === 'string' && img.trim() !== '')));
    return unique.map((u, idx) => imageKeyFor(u, idx));
  }, [report]);
  const imageKeyOfViewport = (vIdx: number) => {
    const sIdx = viewportSeries[vIdx] || 0;
    return seriesImageKeys[sIdx] || `sample-${sIdx}`;
  };

  const loadMarks = useCallback(async () => {
    if (!report?.id || !getAccessToken()) return;
    try {
      const rows = await ApiClient.getAnnotations(report.id);
      setMarks(Array.isArray(rows) ? rows : []);
    } catch {
      /* viewer still works without saved marks */
    }
  }, [report?.id]);

  useEffect(() => {
    if (!isOpen || !report?.id) return;
    setSelectedMarkId(null);
    setDraftArrow(null);
    loadMarks();
    let ws: WebSocket | null = null;
    try {
      const token = getAccessToken();
      if (token) {
        ws = new WebSocket(`${WS_BASE_URL}?token=${encodeURIComponent(token)}`);
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type === 'CASE_ANNOTATIONS_CHANGED' && data.caseId === report.id) loadMarks();
          } catch {
            /* ignore */
          }
        };
      }
    } catch {
      /* ignore */
    }
    return () => {
      if (ws) ws.close();
    };
  }, [isOpen, report?.id, loadMarks]);

  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDraw, setCurrentDraw] = useState<Partial<AnnotationLine> | null>(null);
  const [magnifierPos, setMagnifierPos] = useState<{ x: number; y: number } | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Width of the report pane (right side) in % of the workspace; the image viewer gets the rest.
  const [reportWidthPercent, setReportWidthPercent] = useState<number>(45);

  // A4 pages: measure the scroll viewport so the pages can be scaled to fit (or shown at 100%).
  // The pages themselves (letterhead, QR, "n of N pages", doctor block on the last page) are laid
  // out by A4ReportEditor with the same paginator as the PDF.
  const [pageZoom, setPageZoom] = useState<'fit' | 'actual'>('fit');
  const [pageViewportW, setPageViewportW] = useState(0);
  const [sheetPageCount, setSheetPageCount] = useState(1);
  const pageVpEl = useRef<HTMLDivElement | null>(null);
  const pageRO = useRef<ResizeObserver | null>(null);
  const setPageViewportEl = useCallback((el: HTMLDivElement | null) => {
    if (!pageRO.current && typeof ResizeObserver !== 'undefined') {
      pageRO.current = new ResizeObserver(() => {
        if (pageVpEl.current) setPageViewportW(pageVpEl.current.clientWidth);
      });
    }
    if (pageVpEl.current && pageRO.current) pageRO.current.unobserve(pageVpEl.current);
    pageVpEl.current = el;
    if (el) {
      pageRO.current?.observe(el);
      setPageViewportW(el.clientWidth);
    }
  }, []);
  useEffect(() => () => { pageRO.current?.disconnect(); pageRO.current = null; }, []);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const workspaceContainerRef = useRef<HTMLDivElement | null>(null);


  const currentStudyMeta = (() => {
    const parts = report?.bodyParts?.length ? report.bodyParts : [];
    const part = parts[activeBodyPartIdx] || parts[0];
    const studies = report?.studies || [];
    const match = studies.find((s) => s.bodyPart === part) || studies[activeBodyPartIdx];
    return { part, study: match, studies };
  })();

  const pendingStudyCount = (() => {
    const studies = report?.studies || [];
    if (studies.length) {
      return studies.filter((s) => (s.reportStatus || '').toUpperCase() !== 'SIGNED').length;
    }
    const parts = report?.bodyParts || [];
    return parts.filter((bp) => (studyStatuses[bp] || '').toUpperCase() !== 'SIGNED').length;
  })();

  const requestLeave = (action: () => void) => {
    if (pendingStudyCount > 0 && (report?.bodyParts?.length || 0) > 1) {
      setLeaveGuardAction(() => action);
      setLeaveGuardOpen(true);
      return;
    }
    action();
  };

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingStudyCount > 0 && (report?.bodyParts?.length || 0) > 1) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [pendingStudyCount, report?.bodyParts?.length]);

  // Sync technique + statuses when report / active part changes
  useEffect(() => {
    if (!report) return;
    const parts = report.bodyParts || [];
    const statusMap: Record<string, string> = {};
    const techMap: Record<string, string> = { ...(report.techniquesByBodyPart || {}) };
    (report.studies || []).forEach((s) => {
      if (s.bodyPart) {
        statusMap[s.bodyPart] = s.reportStatus || 'PENDING';
        if (s.technique) techMap[s.bodyPart] = s.technique;
      }
    });
    // Seed defaults
    parts.forEach((bp) => {
      if (!techMap[bp]) techMap[bp] = `${report.modality || 'Radiograph'} — ${bp}`;
      if (!statusMap[bp]) statusMap[bp] = 'PENDING';
    });
    setTechniqueByPart(techMap);
    setStudyStatuses(statusMap);
    const cur = parts[activeBodyPartIdx] || parts[0];
    if (cur) setTechniqueText(techMap[cur] || '');
  }, [report?.id]);

  // Keep the technique line in step with the study being reported (start study or tab switch)
  useEffect(() => {
    const parts = report?.bodyParts || [];
    const cur = parts[activeBodyPartIdx] || parts[0];
    if (cur && techniqueByPart[cur]) setTechniqueText(techniqueByPart[cur]);
  }, [activeBodyPartIdx, techniqueByPart, report?.bodyParts]);


  const handleSaveAndSubmitReport = async () => {
    if (!report) {
      alert('No active patient report selected.');
      return;
    }

    setIsSubmitting(true);

    const parts = report.bodyParts && report.bodyParts.length > 0 ? report.bodyParts : ['GENERAL'];
    const currentPart = parts[activeBodyPartIdx] || parts[0];
    const studies = report.studies || [];
    const currentStudy =
      studies.find((s) => s.bodyPart === currentPart) || studies[activeBodyPartIdx];
    const studyId = currentStudy?.id;
    if (!studyId) {
      setIsSubmitting(false);
      alert('Could not resolve study for this body part. Re-open the case and try again.');
      return;
    }

    const finalReportsMap: Record<string, string> = {
      ...bodyPartReports,
      [currentPart]: findingText,
    };
    const finalImpressionsMap: Record<string, string> = {
      ...bodyPartImpressions,
      [currentPart]: impressionText,
    };
    const finalTechniqueMap: Record<string, string> = {
      ...techniqueByPart,
      [currentPart]: techniqueText || `${report.modality || 'Radiograph'} — ${currentPart}`,
    };

    const payload = {
      findings: findingText,
      impression: impressionText,
      technique: finalTechniqueMap[currentPart],
      templateId: selectedTemplateId || undefined,
      clinicalNotes: report.clinicalNotes,
      dicomSnapshots: [],
      // saved so the public QR view shows the same title as the page / PDF
      title: sheetTitleFor(currentPart),
    };

    try {
      const result = await ApiClient.signStudyReport(report.id, studyId, payload);
      const updatedStudies = (result.report?.studies || studies).map((s) =>
        s.id === studyId
          ? { ...s, reportStatus: 'SIGNED', findings: findingText, impression: impressionText, technique: payload.technique }
          : s
      );
      const allSigned = (result.signedStudyCount || 0) >= (result.studyCount || parts.length);
      const updatedReport: XRayReport = {
        ...(result.report || report),
        ...report,
        status: allSigned || result.caseComplete ? 'Completed' : 'In Review',
        signatureApplied: allSigned || result.caseComplete,
        findings: findingText,
        impression: impressionText,
        reportsByBodyPart: finalReportsMap,
        impressionsByBodyPart: finalImpressionsMap,
        techniquesByBodyPart: finalTechniqueMap,
        dicomSnapshots: [],
        studies: updatedStudies,
        isPartial: !allSigned && (result.signedStudyCount || 0) > 0,
        signedStudyCount: result.signedStudyCount,
        studyCount: result.studyCount,
        pendingStudyCount: result.pendingStudyCount,
      };

      setBodyPartReports(finalReportsMap);
      setBodyPartImpressions(finalImpressionsMap);
      setTechniqueByPart(finalTechniqueMap);
      setStudyStatuses((prev) => ({ ...prev, [currentPart]: 'SIGNED' }));

      RadiologyStore.saveReport(updatedReport);
      if (allSigned || result.caseComplete) {
        RadiologyStore.updateReportStatus(report.id, 'Completed');
        window.dispatchEvent(
          new CustomEvent('radionline_report_completed', {
            detail: {
              report: updatedReport,
              message: `All studies completed for ${updatedReport.fullName}`,
            },
          })
        );
      }
      if (onSaveReport) onSaveReport(updatedReport);

      const toastMsg =
        result.toast ||
        `${currentPart} signed. ${result.signedStudyCount} of ${result.studyCount} done.`;
      setStatusToast(toastMsg);
      setTimeout(() => setStatusToast(null), 4000);

      // Auto-advance to next pending study
      if (result.nextStudyId || result.nextBodyPart) {
        const nextIdx = parts.findIndex(
          (bp, idx) =>
            bp === result.nextBodyPart ||
            updatedStudies[idx]?.id === result.nextStudyId ||
            (studyStatuses[bp] || updatedStudies.find((s) => s.bodyPart === bp)?.reportStatus || '') !== 'SIGNED' && bp !== currentPart
        );
        const fallbackIdx = parts.findIndex(
          (bp) => bp !== currentPart && (updatedStudies.find((s) => s.bodyPart === bp)?.reportStatus || studyStatuses[bp] || '') !== 'SIGNED'
        );
        const target = nextIdx >= 0 ? nextIdx : fallbackIdx;
        if (target >= 0) {
          // persist current maps then switch
          setTimeout(() => handleSwitchBodyPartTab(target), 300);
        }
      }

      setReportSavedSuccess(true);
      setTimeout(() => setReportSavedSuccess(false), 3500);
    } catch (err) {
      console.warn('Sign study error:', err);
      alert(apiErrorMessage(err, 'Failed to sign this study. Your text is still here; please try again.'));
    }

    setIsSubmitting(false);
  };

  const handleSaveDraft = async () => {
    if (!report || isSubmitting) return;
    setIsSubmitting(true);
    const parts = report.bodyParts || [];
    const currentPart = parts[activeBodyPartIdx] || parts[0] || 'CHEST PA/AP';
    const findingText = bodyPartReports[currentPart] || '';
    const impressionText = bodyPartImpressions[currentPart] || '';
    const techText = techniqueByPart[currentPart] || `${report.modality || 'X-Ray'} — ${currentPart}`;
    const studies = report.studies || [];
    const matchedStudy = studies.find((s) => s.bodyPart === currentPart) || studies[activeBodyPartIdx];
    const studyId = matchedStudy?.id || `${report.id}-st-${activeBodyPartIdx}`;

    try {
      await ApiClient.saveStudyDraft(report.id, studyId, {
        findings: findingText,
        impression: impressionText,
        technique: techText,
      });
      setStudyStatuses((prev) => ({ ...prev, [currentPart]: 'DRAFT' }));
      setStatusToast(`Draft saved for ${currentPart}`);
      setTimeout(() => setStatusToast(null), 3000);
    } catch (err: any) {
      console.warn('Save draft error:', err);
      setStatusToast(apiErrorMessage(err, 'Failed to save draft'));
      setTimeout(() => setStatusToast(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToolClick = (tool: ToolMode) => {
    setActiveTool(tool);
    setShowToolsDrawer(false);
    setMobileActiveView('dicom');
  };

  const handleGridChange = (layout: GridLayout) => {
    setGridLayout(layout);
  };

  const updateActiveViewport = (updater: (prev: typeof viewportStates[0]) => typeof viewportStates[0]) => {
    setViewportStates((prev) => {
      const next = [...prev];
      next[activeViewportIdx] = updater(next[activeViewportIdx]);
      return next;
    });
  };

  const handleApplyWwWlPreset = (preset: 'default' | 'bone' | 'soft' | 'lung' | 'brain') => {
    const currentSeries = seriesList[viewportSeries[activeViewportIdx] || 0] || seriesList[0];
    let ww = currentSeries.ww;
    let wl = currentSeries.wl;

    if (preset === 'bone') {
      ww = 2000;
      wl = 400;
    } else if (preset === 'soft') {
      ww = 400;
      wl = 50;
    } else if (preset === 'lung') {
      ww = 1500;
      wl = -500;
    } else if (preset === 'brain') {
      ww = 80;
      wl = 40;
    }

    updateActiveViewport((prev) => ({ ...prev, ww, wl }));
  };

  const handleResetActiveViewport = () => {
    const currentSeries = seriesList[viewportSeries[activeViewportIdx] || 0] || seriesList[0];
    updateActiveViewport(() => ({
      zoom: 1.0,
      pan: { x: 0, y: 0 },
      rotation: 0,
      flipH: false,
      flipV: false,
      ww: currentSeries.ww,
      wl: currentSeries.wl,
      invert: false,
    }));
  };

  const handleDeleteLastAnnotation = () => {
    const activeSeries = seriesList[viewportSeries[activeViewportIdx] || 0] || seriesList[0];
    const seriesKey = activeSeries.id || activeSeries.imageUrl || `series-${viewportSeries[activeViewportIdx] || 0}`;
    setAnnotations((prev) => {
      const list = prev[seriesKey] || [];
      if (list.length === 0) return prev;
      return {
        ...prev,
        [seriesKey]: list.slice(0, list.length - 1),
      };
    });
  };

  /** Pointer -> image coordinates (0..1000 viewBox of the image overlay), exact at any zoom, pan,
   *  rotation or flip. Uses the overlay's own box: the centre of its bounding box is the transformed
   *  centre, then the scale / rotation / flips are undone around it. */
  const pointToImage = (clientX: number, clientY: number, vIdx: number): { x: number; y: number } | null => {
    const svg = svgRefs.current[vIdx];
    const box = svg?.parentElement as HTMLElement | null | undefined;
    if (!svg || !box || !box.offsetWidth || !box.offsetHeight) return null;
    const state = viewportStates[vIdx];
    if (!state) return null;
    const r = svg.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let vx = (clientX - cx) / (state.zoom || 1);
    let vy = (clientY - cy) / (state.zoom || 1);
    const rad = (-(state.rotation || 0) * Math.PI) / 180;
    const rx = vx * Math.cos(rad) - vy * Math.sin(rad);
    const ry = vx * Math.sin(rad) + vy * Math.cos(rad);
    vx = state.flipH ? -rx : rx;
    vy = state.flipV ? -ry : ry;
    return {
      x: (vx / box.offsetWidth + 0.5) * 1000,
      y: (vy / box.offsetHeight + 0.5) * 1000,
    };
  };

  const getCanvasCoords = (e: React.PointerEvent<HTMLDivElement>, vIdx: number) => {
    const exact = pointToImage(e.clientX, e.clientY, vIdx);
    if (exact) return exact;
    const rect = e.currentTarget.getBoundingClientRect();
    const state = viewportStates[vIdx] || { zoom: 1.0, pan: { x: 0, y: 0 } };

    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const viewBoxX = (rawX / (rect.width || 1)) * 1000;
    const viewBoxY = (rawY / (rect.height || 1)) * 1000;

    const x = (viewBoxX - 500) / state.zoom - state.pan.x + 500;
    const y = (viewBoxY - 500) / state.zoom - state.pan.y + 500;

    return { x, y };
  };

  /** Saved arrow under a point (within ~14 screen px of its shaft), newest first. */
  const markAtPoint = (x: number, y: number, vIdx: number): ImageAnnotation | null => {
    const svg = svgRefs.current[vIdx];
    const box = svg?.parentElement as HTMLElement | null | undefined;
    const state = viewportStates[vIdx];
    if (!box || !state) return null;
    const sx = (box.offsetWidth * (state.zoom || 1)) / 1000;
    const sy = (box.offsetHeight * (state.zoom || 1)) / 1000;
    const key = imageKeyOfViewport(vIdx);
    const list = marks.filter((m) => m.imageKey === key && m.kind === 'arrow');
    for (let i = list.length - 1; i >= 0; i--) {
      const d = list[i].data;
      const ax = d.x1 * sx, ay = d.y1 * sy, bx = d.x2 * sx, by = d.y2 * sy;
      const px = x * sx, py = y * sy;
      const abx = bx - ax, aby = by - ay;
      const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby || 1)));
      const dist = Math.hypot(px - (ax + t * abx), py - (ay + t * aby));
      if (dist <= 14) return list[i];
    }
    return null;
  };

  const saveArrow = async (vIdx: number, a: ArrowData) => {
    if (!report?.id) return;
    const clamp = (v: number) => Math.round(Math.min(1000, Math.max(0, v)) * 100) / 100;
    const data = { x1: clamp(a.x1), y1: clamp(a.y1), x2: clamp(a.x2), y2: clamp(a.y2) };
    const imageKey = imageKeyOfViewport(vIdx);
    const tempId = -Date.now();
    const temp: ImageAnnotation = {
      id: tempId,
      caseId: report.id,
      imageKey,
      kind: 'arrow',
      data,
      authorUserId: myUserId,
      authorName: viewerSession?.name || '',
      authorRole: viewerSession?.role || '',
      createdAt: new Date().toISOString(),
    } as ImageAnnotation;
    setMarks((prev) => [...prev, temp]);
    try {
      const saved = await ApiClient.addAnnotation(report.id, { imageKey, kind: 'arrow', data });
      setMarks((prev) => {
        const rest = prev.filter((m) => m.id !== tempId && m.id !== saved.id);
        return [...rest, saved];
      });
    } catch (err) {
      setMarks((prev) => prev.filter((m) => m.id !== tempId));
      setStatusToast(apiErrorMessage(err, 'Could not save the arrow'));
      setTimeout(() => setStatusToast(null), 3500);
    }
  };

  const removeMark = async (m: ImageAnnotation) => {
    if (!report?.id || m.id < 0) return;
    const before = marks;
    setMarks((prev) => prev.filter((x) => x.id !== m.id));
    setSelectedMarkId(null);
    try {
      await ApiClient.deleteAnnotation(report.id, m.id);
    } catch (err) {
      setMarks(before);
      setStatusToast(apiErrorMessage(err, 'Could not remove the arrow'));
      setTimeout(() => setStatusToast(null), 3500);
    }
  };

  /** Undo: remove my latest arrow on the image in the active viewport. */
  const undoMyLastArrow = () => {
    const key = imageKeyOfViewport(activeViewportIdx);
    const mine = marks.filter((m) => m.imageKey === key && m.id > 0 && myUserId != null && m.authorUserId === myUserId);
    const last = mine[mine.length - 1];
    if (last) removeMark(last);
    else {
      setStatusToast('No arrow of yours on this image to undo');
      setTimeout(() => setStatusToast(null), 2500);
    }
  };

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>, vIdx: number) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    setActiveViewportIdx(vIdx);
    const { x, y } = getCanvasCoords(e, vIdx);
    setDragStart({ x: e.clientX, y: e.clientY });

    if (activeTool === 'arrow') {
      if (!canDrawArrows) return;
      const hit = markAtPoint(x, y, vIdx);
      if (hit) {
        setSelectedMarkId(hit.id);
        return;
      }
      setSelectedMarkId(null);
      setDraftArrow({ vIdx, x1: x, y1: y, x2: x, y2: y });
      return;
    }

    if (['measure', 'angle', 'cobb', 'roi_ellipse'].includes(activeTool)) {
      setIsDrawing(true);
      const type = activeTool === 'roi_ellipse' ? 'ellipse' : (activeTool as any);
      setCurrentDraw({
        id: Date.now().toString(),
        type,
        x1: x,
        y1: y,
        x2: x + 20,
        y2: y + 20,
        x3: x - 35,
        y3: y + 80,
        x4: x + 35,
        y4: y + 85,
      });
    }
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>, vIdx: number) => {
    const { x, y } = getCanvasCoords(e, vIdx);

    if (activeTool === 'magnifier') {
      const rect = e.currentTarget.getBoundingClientRect();
      setMagnifierPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    if (!dragStart) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (activeTool === 'arrow') {
      if (draftArrow && draftArrow.vIdx === vIdx) setDraftArrow({ ...draftArrow, x2: x, y2: y });
      return;
    }

    if (isDrawing && currentDraw) {
      if (currentDraw.type === 'cobb') {
        setCurrentDraw((prev) => ({
          ...prev,
          x2: x,
          y2: y,
          x3: (prev?.x1 || 0) - 35,
          y3: (prev?.y1 || 0) + 80,
          x4: x - 35,
          y4: y + 80,
        }));
      } else {
        setCurrentDraw((prev) => ({
          ...prev,
          x2: x,
          y2: y,
        }));
      }
    } else if (activeTool === 'pan') {
      const rect = e.currentTarget.getBoundingClientRect();
      const state = viewportStates[vIdx] || { zoom: 1.0, pan: { x: 0, y: 0 } };
      const viewBoxDx = (dx / state.zoom) * (1000 / (rect.width || 1));
      const viewBoxDy = (dy / state.zoom) * (1000 / (rect.height || 1));
      updateActiveViewport((prev) => ({
        ...prev,
        pan: { x: prev.pan.x + viewBoxDx, y: prev.pan.y + viewBoxDy },
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (activeTool === 'zoom') {
      updateActiveViewport((prev) => ({
        ...prev,
        zoom: Math.max(0.4, Math.min(4.0, prev.zoom - dy * 0.005)),
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (activeTool === 'wwwl') {
      updateActiveViewport((prev) => ({
        ...prev,
        ww: Math.max(10, prev.ww + dx * 2),
        wl: Math.max(-1000, Math.min(2000, prev.wl - dy * 2)),
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (activeTool === 'stack') {
      if (Math.abs(dy) > 15) {
        const seriesLength = SAMPLE_DICOM_SERIES.length;
        const delta = dy > 0 ? 1 : -1;
        setViewportSeries((prev) => {
          const next = [...prev];
          const currentIdx = next[vIdx] || 0;
          next[vIdx] = (currentIdx + delta + seriesLength) % seriesLength;
          return next;
        });
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    }
  };

  const handleViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>, vIdx: number) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    if (draftArrow) {
      const a = draftArrow;
      setDraftArrow(null);
      setDragStart(null);
      // Ignore taps / tiny drags; a cancelled gesture is not saved
      if (e.type !== 'pointercancel' && a.vIdx === vIdx && Math.hypot(a.x2 - a.x1, a.y2 - a.y1) >= 12) {
        saveArrow(vIdx, a);
      }
      return;
    }

    if (isDrawing && currentDraw && currentDraw.x1 !== undefined && currentDraw.y1 !== undefined) {
      const x1 = currentDraw.x1;
      const y1 = currentDraw.y1;
      const x2 = currentDraw.x2 || x1 + 10;
      const y2 = currentDraw.y2 || y1 + 10;

      let label = '';
      if (currentDraw.type === 'measure') {
        const distPx = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        label = `${(distPx * 0.14).toFixed(1)} mm`;
      } else if (currentDraw.type === 'ellipse') {
        const rx = Math.abs(x2 - x1) / 2;
        const ry = Math.abs(y2 - y1) / 2;
        const area = ((Math.PI * rx * ry) / 600).toFixed(1);
        label = `Area: ${area} cm² (HU: ${Math.round(44 + (rx + ry) / 4)})`;
      } else if (currentDraw.type === 'cobb') {
        const a1 = Math.atan2(y2 - y1, x2 - x1);
        const y4 = currentDraw.y4 || y2 + 60;
        const x4 = currentDraw.x4 || x2 - 20;
        const y3 = currentDraw.y3 || y1 + 60;
        const x3 = currentDraw.x3 || x1 - 20;
        const a2 = Math.atan2(y4 - y3, x4 - x3);
        let diff = Math.abs(a1 - a2) * (180 / Math.PI);
        if (diff > 90) diff = 180 - diff;
        label = `Cobb Angle: ${diff.toFixed(1)}°`;
      } else if (currentDraw.type === 'angle') {
        label = `Angle: 44.2°`;
      }

      const finalAnn: AnnotationLine = {
        id: Date.now().toString(),
        type: currentDraw.type || 'measure',
        x1,
        y1,
        x2,
        y2,
        x3: currentDraw.x3,
        y3: currentDraw.y3,
        x4: currentDraw.x4,
        y4: currentDraw.y4,
        label,
      };

      const currentSeries = seriesList[viewportSeries[vIdx] || 0] || seriesList[0];
      const seriesKey = currentSeries.id || currentSeries.imageUrl || `series-${viewportSeries[vIdx] || 0}`;

      setAnnotations((prev) => ({
        ...prev,
        [seriesKey]: [...(prev[seriesKey] || []), finalAnn],
      }));
    }

    setIsDrawing(false);
    setCurrentDraw(null);
    setDragStart(null);
  };

  const handleViewportWheel = (e: React.WheelEvent<HTMLDivElement>, vIdx: number) => {
    e.preventDefault();
    setActiveViewportIdx(vIdx);

    if (activeTool === 'stack') {
      const seriesLength = seriesList.length;
      const delta = e.deltaY > 0 ? 1 : -1;
      setViewportSeries((prev) => {
        const next = [...prev];
        const currentIdx = next[vIdx] || 0;
        next[vIdx] = (currentIdx + delta + seriesLength) % seriesLength;
        return next;
      });
    } else {
      const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
      updateActiveViewport((prev) => ({
        ...prev,
        zoom: Math.max(0.4, Math.min(4.0, prev.zoom + zoomDelta)),
      }));
    }
  };



  const numViewports = gridLayout === '1x1' ? 1 : gridLayout === '1x2' ? 2 : gridLayout === '2x1' ? 2 : 4;

  const toolsList: { id: ToolMode; label: string; icon: React.ReactNode }[] = [
    { id: 'pan', label: 'Move', icon: <Maximize2 className="w-4 h-4" /> },
    { id: 'zoom', label: 'Zoom', icon: <ZoomIn className="w-4 h-4" /> },
    { id: 'stack', label: 'Stack', icon: <Layers className="w-4 h-4" /> },
    { id: 'pointer', label: 'Pointer', icon: <MousePointer className="w-4 h-4" /> },
    { id: 'magnifier', label: 'Magnifier', icon: <Search className="w-4 h-4" /> },
    { id: 'wwwl', label: 'Windowing', icon: <Sun className="w-4 h-4" /> },
    { id: 'measure', label: 'Measure', icon: <Ruler className="w-4 h-4" /> },
    { id: 'angle', label: 'Angle', icon: <Sliders className="w-4 h-4" /> },
    { id: 'cobb', label: 'Cobb Angle', icon: <Activity className="w-4 h-4" /> },
    { id: 'roi_ellipse', label: 'Ellipse ROI', icon: <Circle className="w-4 h-4" /> },
    ...(canDrawArrows ? [{ id: 'arrow' as ToolMode, label: 'Arrow', icon: <ArrowUpRight className="w-4 h-4" /> }] : []),
  ];
  const primaryToolIds: ToolMode[] = canDrawArrows ? ['pan', 'zoom', 'wwwl', 'arrow', 'measure'] : ['pan', 'zoom', 'wwwl', 'measure'];
  const primaryTools = toolsList.filter((t) => primaryToolIds.includes(t.id));
  const overflowTools = toolsList.filter((t) => !primaryToolIds.includes(t.id));

  const handleSplitterPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch (err) {}
    setIsDraggingSplitter(true);
  };

  const handleSplitterPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSplitter || !workspaceContainerRef.current) return;
    const rect = workspaceContainerRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    // Viewer is on the left, so the pointer offset is the viewer's width; the report gets the rest.
    const pct = 100 - (offsetX / rect.width) * 100;
    const clampedPct = Math.max(20, Math.min(80, pct));
    setReportWidthPercent(clampedPct);
  };

  const handleSplitterPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingSplitter) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
      setIsDraggingSplitter(false);
    }
  };

  const patientName = report?.fullName || 'No Patient Selected';
  const patientAge = report?.age ? `${report.age} Yrs` : '—';
  const patientGender = report?.gender || '—';
  const patientId = formatPatientDisplayId(report?.patientNumber) || '—';
  const studyDate = report?.studyDate || '—';
  const reportDate = report?.createdAt
    ? new Date(report.createdAt).toLocaleString()
    : (report?.studyDate || new Date().toLocaleDateString());
  const radiologyCenterName = report?.radiologyCenterName || 'RADIONET DIAGNOSTICS & PACS HUB';

  // Referring doctor: use only referringPhysicianName. Never fall back to modality / assigned radiologist.
  const looksLikeModality = (s?: string | null) => {
    const v = (s || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!v) return true;
    const mods = ['xray', 'x-ray', 'xr', 'dx', 'cr', 'dr', 'ct', 'mri', 'usg', 'us', 'sono', 'sonography', 'ultrasound', 'blood', 'bloodreport'];
    return mods.some((m) => v === m.replace('-', '') || v === m);
  };
  const referringDoctorName = !looksLikeModality(report?.referringPhysicianName)
    ? (report?.referringPhysicianName || '').trim()
    : '';

  // Signature block: a signed study shows the details frozen when it was signed;
  // a study not signed yet previews the reporting doctor's current profile.
  const activeStudyInfo = (() => {
    const parts = report?.bodyParts?.length ? report.bodyParts : [];
    const part = parts[Math.min(activeBodyPartIdx, Math.max(0, parts.length - 1))];
    const list = report?.studies || [];
    return list.find((s) => s.bodyPart === part) || list[activeBodyPartIdx] || null;
  })();
  const frozenSigner =
    String(activeStudyInfo?.reportStatus || '').toUpperCase() === 'SIGNED' && activeStudyInfo?.signer
      ? activeStudyInfo.signer
      : null;
  const reportingDoctorId =
    activeStudyInfo?.signedBy || activeStudyInfo?.claimedBy || report?.assignedDoctorId || report?.claimedByDoctorId || '';
  const reportingDoctorRecord = reportingDoctorId
    ? liveDoctors.find((d) => d.id === reportingDoctorId) || RadiologyStore.getDoctors().find((d) => d.id === reportingDoctorId) || null
    : null;
  const doctorName = frozenSigner
    ? frozenSigner.name || ''
    : reportingDoctorRecord?.fullName || report?.assignedDoctorName || report?.claimedByDoctorName || '';
  const doctorDegree = (frozenSigner
    ? frozenSigner.degree || ''
    : reportingDoctorRecord?.degree || report?.assignedDoctorDegree || '').trim();
  const doctorRegNo = (frozenSigner
    ? frozenSigner.registrationNumber || ''
    : reportingDoctorRecord?.registrationNumber || report?.assignedDoctorRegNo || '').trim();
  const doctorSignatureUrl = resolveMediaUrl(
    usableSignatureUrl(frozenSigner ? frozenSigner.signatureUrl : reportingDoctorRecord?.signatureUrl)
  );
  // QR beside the doctor details: only once the study is signed (token created at signing)
  const activePublicToken =
    frozenSigner && activeStudyInfo?.publicToken && !revokedTokens.includes(activeStudyInfo.publicToken)
      ? activeStudyInfo.publicToken
      : '';
  const qrLink = activePublicToken ? publicReportLink(activeStudyInfo) : '';
  // QR SVG markup for the A4 pages and the PDF (the same code on every page)
  const [qrHarvestEl, sheetQrSvg] = useQrSvgMarkup(qrLink);
  // A signed study is dated by when it was signed (as on the public view)
  const sheetReportedAt = frozenSigner?.signedAt ? new Date(frozenSigner.signedAt).toLocaleString() : reportDate;
  const isSuperAdmin = RadiologyStore.getSession()?.role === 'SUPER_ADMIN';
  const handleRevokePublicLink = async () => {
    if (!report || !activeStudyInfo?.id || !activePublicToken) return;
    if (!window.confirm('Withdraw the public link for this report? The QR code on copies already printed or shared will stop working.')) return;
    try {
      await ApiClient.revokePublicLink(report.id, activeStudyInfo.id);
      setRevokedTokens((prev) => [...prev, activePublicToken]);
      setStatusToast('Public link withdrawn. Re-signing the study creates a new one.');
    } catch (err) {
      setStatusToast(apiErrorMessage(err, 'Could not withdraw the public link'));
    }
    setTimeout(() => setStatusToast(null), 4000);
  };

  const centerRecord =
    allCenters.find(
      (c) =>
        c.id === report?.radiologyCenterId ||
        (c.centerName && report?.radiologyCenterName && c.centerName.trim().toLowerCase() === report.radiologyCenterName.trim().toLowerCase())
    ) ||
    RadiologyStore.getCenters().find(
      (c) =>
        c.id === report?.radiologyCenterId ||
        (c.centerName && report?.radiologyCenterName && c.centerName.trim().toLowerCase() === report.radiologyCenterName.trim().toLowerCase())
    ) ||
    null;
  const centerPhone = (centerRecord?.contactNumber || '').trim();
  const centerAddress = (centerRecord?.address || '').trim();
  const centerLogoUrl = resolveMediaUrl((centerRecord?.logoUrl || '').trim());
  const centerHeaderUrl = resolveMediaUrl((centerRecord?.headerTemplateUrl || '').trim());
  const studyModality = (report?.modality || '').trim();
  const studyPartsLabel = (report?.bodyParts || []).filter(Boolean).join(', ');

  // Report sheet content shared by the on-screen A4 page and the PDF (active study only)
  const sheetParts = report?.bodyParts?.length ? report.bodyParts : ['EXAMINATION'];
  const sheetActivePart = sheetParts[Math.min(activeBodyPartIdx, sheetParts.length - 1)] || sheetParts[0];
  const ageSexLabel = `${patientAge} / ${patientGender && patientGender !== '\u2014' ? patientGender.charAt(0).toUpperCase() : '\u2014'}`;
  const sheetTitleFor = (part: string) =>
    (report?.bodyParts?.length || 0) <= 1 && reportTitle.trim()
      ? reportTitle.trim()
      : `${(studyModality || 'X-RAY').toUpperCase()} ${part}`.trim();
  const sheetTechniqueFor = (part: string) =>
    (part === sheetActivePart && techniqueText) ||
    techniqueByPart[part] ||
    [studyModality || 'Radiograph', part].filter(Boolean).join(' \u2014 ');
  const sheetFontPt = SHEET_FONT_PT[reportFontSize] || 11;
  const sheetFontStack = SHEET_FONT_STACKS[reportFontFamily] || SHEET_FONT_STACKS['font-serif'];
  const findingsCss = [
    isBoldActive ? 'font-weight: 700' : '',
    isItalicActive ? 'font-style: italic' : '',
    isUnderlineActive ? 'text-decoration: underline' : '',
    reportTextAlign === 'text-center' ? 'text-align: center' : '',
  ].filter(Boolean).join('; ');
  // Geometry: A4 pages stacked on screen (the page count comes from the paginator)
  const sheetWidthPx = A4_PAGE.widthMm * MM_PX;
  const sheetHeightPx = stackedPagesHeightPx(sheetPageCount);
  const sheetGutterPx = pageViewportW > 0 && pageViewportW < 640 ? 10 : 24;
  const sheetScale = pageZoom === 'fit' && pageViewportW > 0
    ? Math.min(1, Math.max(0.2, (pageViewportW - 2 * sheetGutterPx) / sheetWidthPx))
    : 1;

  const buildPrintPayload = (forScreen = false): PrintReportPayload => {
    // Same title / technique / text as the on-screen A4 pages
    const currentPart = sheetActivePart;
    const studies = [
      {
        title: sheetTitleFor(currentPart),
        technique: sheetTechniqueFor(currentPart),
        findings: forScreen ? findingText || '' : (findingText || '').trim(),
        impression: forScreen ? impressionText || '' : (impressionText || '').trim(),
      },
    ];
    const ageSex = ageSexLabel;
    return {
      centerName: radiologyCenterName,
      centerAddress,
      centerPhone,
      centerLogoUrl,
      centerHeaderUrl,
      letterheadMode: centerRecord?.letterheadMode || 'full-page',
      withHeader,
      patientName,
      patientId,
      ageSex,
      studyDate,
      referringDoctor: referringDoctorName,
      modality: studyModality,
      studyParts: currentPart,
      clinicalHistory: (report?.clinicalNotes || '').trim(),
      keyImageUrls: [],
      studies,
      doctorName,
      doctorDegree,
      doctorRegNo,
      doctorSignatureUrl,
      reportedAt: sheetReportedAt,
      bodyFontPt: sheetFontPt,
      bodyFontFamily: sheetFontStack,
      findingsCss,
      qrSvg: qrLink ? sheetQrSvg : '',
      qrLink: qrLink || undefined,
    };
  };

  const handlePrintCurrentStudy = () => {
    const payload = buildPrintPayload();
    const safe = (s: string) => (s || '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const part = report?.bodyParts?.[activeBodyPartIdx] || 'STUDY';
    const docTitle = `${safe(patientName)}_${safe(patientId)}_${safe(part)}`;
    printReportElement(null, docTitle, payload);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden font-sans select-none print:static print:bg-white print:p-0 print:overflow-visible ${
      theme === 'dark' ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      

      {/* 1. COMPACT WORKSPACE TOP BAR */}
      <div className={`border-b px-2 sm:px-3 py-2 flex items-center gap-2 shrink-0 z-30 print:hidden no-print ${
        theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        {/* Back / Close */}
        <button
          type="button"
          onClick={() => requestLeave(onClose)}
          className={`flex items-center justify-center h-10 w-10 shrink-0 rounded-lg transition-colors ${
            theme === 'dark' ? 'text-slate-300 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Close workspace"
          aria-label="Close workspace"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Patient + study summary */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className={`text-sm sm:text-base font-bold truncate leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              {patientName}
            </h1>
            {report?.isUrgent && (
              <span className="shrink-0 px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-bold uppercase">
                STAT
              </span>
            )}
          </div>
          <div className={`text-[12px] sm:text-[13px] truncate leading-snug ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>{patientAge !== '—' && patientAge !== '-' ? patientAge.replace(/ Yrs/i, 'y') : '—'} / {patientGender ? (String(patientGender).trim().toUpperCase().startsWith('F') ? 'F' : String(patientGender).trim().toUpperCase().startsWith('O') ? 'O' : 'M') : '—'}</span>
            <span className="mx-1.5 opacity-50">·</span>
            <span className="font-mono">{patientId}</span>
            <span className="mx-1.5 opacity-50 hidden sm:inline">·</span>
            <span className="hidden sm:inline">{report?.bodyParts?.join(', ') || report?.modality || 'Study'}</span>
            <span className="mx-1.5 opacity-50 hidden md:inline">·</span>
            <span className="hidden md:inline truncate">{radiologyCenterName}</span>
          </div>
        </div>

        {/* Mobile Activity shortcut */}
        {onOpenActivity && (
          <button
            type="button"
            onClick={onOpenActivity}
            className={`sm:hidden flex items-center justify-center h-10 w-10 shrink-0 rounded-lg border ${
              theme === 'dark'
                ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
            title="Case Activity"
            aria-label="Case Activity"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        )}

        {/* Mobile Viewer | Report tabs — large touch targets (swipe on the bar switches too) */}
        <div {...tabSwipeHandlers(true)} data-testid="mobile-view-tabs" className={`flex lg:hidden p-0.5 rounded-lg border shrink-0 ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-300'
        }`}>
          <button
            type="button"
            onClick={() => switchMobileView('dicom')}
            className={`min-h-[40px] px-3 sm:px-4 text-[13px] font-semibold rounded-md transition-all ${
              mobileActiveView === 'dicom'
                ? (theme === 'dark' ? 'bg-[#009ef7] text-white shadow' : 'bg-[#009ef7] text-white shadow')
                : (theme === 'dark' ? 'text-slate-400' : 'text-slate-600')
            }`}
          >
            Viewer
          </button>
          <button
            type="button"
            onClick={() => switchMobileView('report')}
            className={`min-h-[40px] px-3 sm:px-4 text-[13px] font-semibold rounded-md transition-all ${
              mobileActiveView === 'report'
                ? (theme === 'dark' ? 'bg-[#009ef7] text-white shadow' : 'bg-[#009ef7] text-white shadow')
                : (theme === 'dark' ? 'text-slate-400' : 'text-slate-600')
            }`}
          >
            Report
          </button>
        </div>

        {/* Desktop / tablet-landscape primary actions */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {onOpenActivity && (
            <button
              type="button"
              onClick={onOpenActivity}
              className={`flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg border text-[13px] font-semibold transition-colors ${
                theme === 'dark'
                  ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
              title="Case Activity"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden md:inline">Activity</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              handlePrintCurrentStudy();
            }}
            className={`flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg border text-[13px] font-semibold transition-colors ${
              theme === 'dark'
                ? 'border-slate-700 text-slate-100 hover:bg-slate-800'
                : 'border-slate-300 text-slate-800 hover:bg-slate-50'
            }`}
            title="Print Report or Save as PDF"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">Print / PDF</span>
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className={`flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg border text-[13px] font-semibold transition-colors ${
              theme === 'dark'
                ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
            title="Save Draft Report"
          >
            <BookmarkPlus className="w-4 h-4 text-[#009ef7]" />
            <span className="hidden md:inline">Save Draft</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndSubmitReport}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[13px] font-bold transition-colors disabled:opacity-60"
            title="Save & Submit Report"
          >
            {reportSavedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <FileCheck className="w-4 h-4" />}
            <span>{isSubmitting ? 'Submitting...' : reportSavedSuccess ? 'Submitted!' : 'Save & Submit'}</span>
          </button>
        </div>

        {/* More menu */}
        <div className="relative shrink-0" ref={moreMenuRef}>
          <button
            type="button"
            onClick={() => setMoreMenuOpen((v) => !v)}
            className={`flex items-center justify-center h-10 w-10 rounded-lg border transition-colors ${
              theme === 'dark'
                ? 'border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
            title="More actions"
            aria-label="More actions"
            aria-expanded={moreMenuOpen}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {moreMenuOpen && (
            <div className={`absolute right-0 top-full mt-1.5 w-56 rounded-lg border shadow-xl z-50 py-1 text-[13px] ${
              theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <button
                type="button"
                onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setMoreMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
              >
                {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </button>

              {isSuperAdmin && activePublicToken && (
                <button
                  type="button"
                  onClick={() => { setMoreMenuOpen(false); handleRevokePublicLink(); }}
                  data-testid="revoke-public-link"
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-rose-600 ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-rose-50'}`}
                >
                  <XCircle className="w-4 h-4" />
                  Withdraw public link
                </button>
              )}

              {canCreateTemplate && (
              <button
                type="button"
                onClick={() => { handleOpenSaveTemplate(); setMoreMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 text-left ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
              >
                <BookmarkPlus className="w-4 h-4" />
                Save New Template
              </button>
              )}
              <button
                type="button"
                onClick={() => { setIsReportingOpen(!isReportingOpen); setMoreMenuOpen(false); }}
                className={`w-full hidden lg:flex items-center gap-2 px-3 py-2.5 text-left ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
              >
                <FileText className="w-4 h-4" />
                {isReportingOpen ? 'Hide Report' : 'Show Report'}
              </button>
              {onOpenActivity && (
                <button
                  type="button"
                  onClick={() => { onOpenActivity(); setMoreMenuOpen(false); }}
                  className={`w-full flex sm:hidden items-center gap-2 px-3 py-2.5 text-left ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Activity
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handlePrintCurrentStudy();
                  setMoreMenuOpen(false);
                }}
                className={`w-full flex sm:hidden items-center gap-2 px-3 py-2.5 text-left ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}
              >
                <Printer className="w-4 h-4" />
                Print / PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* History notes — single collapsible line */}
      {report && (
        <div className={`border-b shrink-0 print:hidden no-print ${
          theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <button
            type="button"
            onClick={() => setHistoryExpanded((v) => !v)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[13px] ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {historyExpanded ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
            <span className={`font-semibold shrink-0 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>History </span>
            <span className={`truncate ${historyExpanded ? 'hidden' : ''}`}>
              {report.clinicalNotes || 'No prior clinical history recorded.'}
            </span>
          </button>
          {historyExpanded && (
            <p className={`px-3 pb-2 pl-9 text-[13px] leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
              {report.clinicalNotes || 'No prior clinical history recorded.'}
            </p>
          )}
        </div>
      )}

      {/* 4. MAIN WORKSTATION WORKSPACE */}
      <div
        ref={workspaceContainerRef}
        {...tabSwipeHandlers(false)}
        className={`flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0 print:bg-white print:overflow-visible print:block ${
          theme === 'dark' ? 'bg-[#020617]' : 'bg-slate-200'
        }`}
      >
        <style>{TAB_SWIPE_CSS}</style>

        {/* LEFT PANE: viewer toolbar + DICOM grid (toolbar attached to viewer only) */}
        <div
          ref={viewerPaneRef}
          data-testid="viewer-pane"
          className={`bg-black flex-1 min-h-0 flex flex-col overflow-hidden select-none relative print:hidden no-print transition-none ${
            isReportingOpen && mobileActiveView === 'report' ? 'hidden lg:flex' : 'w-full flex'
          } ${!isLgLayout && tabSlideDir === 'from-left' ? 'rn-tab-slide-from-left' : ''}`}
          style={{
            width: !isLgLayout ? '100%' : (isReportingOpen ? `${100 - reportWidthPercent}%` : '100%'),
          }}
        >
          {/* Single consolidated viewer toolbar */}
          <div
            data-testid="viewer-toolbar"
            className={`shrink-0 border-b px-2 pl-12 lg:pl-2 py-1.5 flex items-center gap-1 select-none text-[13px] print:hidden no-print order-last lg:order-none ${
              theme === 'dark' ? 'bg-slate-900/95 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            {primaryTools.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleToolClick(t.id)}
                title={t.label}
                className={`flex items-center justify-center gap-1 min-h-[40px] min-w-[40px] px-2 rounded-lg text-[12px] font-semibold shrink-0 ${
                  activeTool === t.id
                    ? 'bg-[#009ef7] text-white'
                    : (theme === 'dark' ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200')
                }`}
              >
                {t.icon}
                <span className="hidden 2xl:inline">{t.label}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={handleResetActiveViewport}
              title="Reset view"
              className={`flex items-center justify-center gap-1 min-h-[40px] min-w-[40px] px-2 rounded-lg text-[12px] font-semibold shrink-0 ${
                theme === 'dark' ? 'bg-slate-800/80 hover:bg-slate-700 text-cyan-300' : 'bg-white hover:bg-slate-100 text-blue-700 border border-slate-200'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden 2xl:inline">Reset</span>
            </button>

            <div className="relative shrink-0" ref={toolsMoreRef}>
              <button
                type="button"
                onClick={() => setToolsMoreOpen((v) => !v)}
                title="More tools"
                aria-label="More tools"
                aria-expanded={toolsMoreOpen}
                className={`flex items-center gap-1 min-h-[40px] px-2.5 rounded-lg text-[12px] font-semibold shrink-0 ${
                  toolsMoreOpen || overflowTools.some((t) => t.id === activeTool)
                    ? 'bg-[#009ef7] text-white'
                    : (theme === 'dark' ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200')
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>More</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {toolsMoreOpen && (
                <div
                  className={`absolute z-50 w-[min(100vw-1.5rem,20rem)] max-h-[70vh] overflow-y-auto rounded-xl border shadow-2xl p-2 space-y-2 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
                  } bottom-full mb-2 left-0 lg:bottom-auto lg:top-full lg:mt-2 lg:left-auto lg:right-0`}
                >
                  <p className="px-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Tools</p>
                  <div className="grid grid-cols-2 gap-1">
                    {overflowTools.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { handleToolClick(t.id); setToolsMoreOpen(false); }}
                        className={`flex items-center gap-2 min-h-[40px] px-2 rounded-lg text-[13px] font-semibold text-left ${
                          activeTool === t.id
                            ? 'bg-[#009ef7] text-white'
                            : (theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50')
                        }`}
                      >
                        {t.icon}
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <p className="px-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">View</p>
                  <div className="grid grid-cols-4 gap-1">
                    <button type="button" title="Zoom In" onClick={() => updateActiveViewport((prev) => ({ ...prev, zoom: Math.min(prev.zoom + 0.25, 4.0) }))} className={`flex items-center justify-center min-h-[40px] rounded-lg ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}><ZoomIn className="w-4 h-4" /></button>
                    <button type="button" title="Zoom Out" onClick={() => updateActiveViewport((prev) => ({ ...prev, zoom: Math.max(prev.zoom - 0.25, 0.4) }))} className={`flex items-center justify-center min-h-[40px] rounded-lg ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}><ZoomOut className="w-4 h-4" /></button>
                    <button type="button" title="Rotate CW" onClick={() => updateActiveViewport((prev) => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))} className={`flex items-center justify-center min-h-[40px] rounded-lg ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}><RotateCw className="w-4 h-4" /></button>
                    <button type="button" title="Rotate CCW" onClick={() => updateActiveViewport((prev) => ({ ...prev, rotation: (prev.rotation - 90 + 360) % 360 }))} className={`flex items-center justify-center min-h-[40px] rounded-lg ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}><RotateCcw className="w-4 h-4" /></button>
                    <button type="button" title="Flip Horizontal" onClick={() => updateActiveViewport((prev) => ({ ...prev, flipH: !prev.flipH }))} className={`flex items-center justify-center min-h-[40px] rounded-lg ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}><FlipHorizontal className="w-4 h-4" /></button>
                    <button type="button" title="Flip Vertical" onClick={() => updateActiveViewport((prev) => ({ ...prev, flipV: !prev.flipV }))} className={`flex items-center justify-center min-h-[40px] rounded-lg ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}><FlipVertical className="w-4 h-4" /></button>
                    <button type="button" title="Invert" onClick={() => updateActiveViewport((prev) => ({ ...prev, invert: !prev.invert }))} className={`flex items-center justify-center min-h-[40px] rounded-lg ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}><Sun className="w-4 h-4" /></button>
                    <button type="button" title="Undo line" onClick={handleDeleteLastAnnotation} className={`flex items-center justify-center min-h-[40px] rounded-lg text-amber-400 ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}><Undo className="w-4 h-4" /></button>
                  </div>

                  <p className="px-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">WW / WL</p>
                  <div className="flex flex-wrap gap-1">
                    {(['bone', 'soft', 'lung', 'brain'] as const).map((p) => (
                      <button key={p} type="button" onClick={() => { handleApplyWwWlPreset(p); setToolsMoreOpen(false); }} className={`min-h-[36px] px-3 rounded-lg text-[12px] font-semibold capitalize ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}>{p}</button>
                    ))}
                    <button type="button" onClick={() => { const activeSeries = seriesList[viewportSeries[activeViewportIdx] || 0] || seriesList[0]; const seriesKey = activeSeries.id || activeSeries.imageUrl || `series-${viewportSeries[activeViewportIdx] || 0}`; setAnnotations((prev) => ({ ...prev, [seriesKey]: [] })); setToolsMoreOpen(false); }} className="min-h-[36px] px-3 rounded-lg text-[12px] font-semibold text-rose-400">Clear</button>
                  </div>

                  <p className="px-1 pt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Grid</p>
                  <div className="flex gap-1">
                    {(['1x1', '1x2', '2x1', '2x2'] as GridLayout[]).map((layout) => (
                      <button
                        key={layout}
                        type="button"
                        onClick={() => { handleGridChange(layout); setToolsMoreOpen(false); }}
                        className={`min-h-[36px] flex-1 px-2 rounded-lg text-[12px] font-bold ${
                          gridLayout === layout ? 'bg-[#009ef7] text-white' : (theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100')
                        }`}
                      >
                        {layout}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            className="flex-1 min-h-0 grid gap-1 p-1 overflow-hidden"
            style={{
              gridTemplateColumns: gridLayout === '2x1' || gridLayout === '2x2' ? '1fr 1fr' : '1fr',
              gridTemplateRows: gridLayout === '1x2' || gridLayout === '2x2' ? '1fr 1fr' : '1fr',
            }}
          >
          {Array.from({ length: numViewports }).map((_, vIdx) => {
            const seriesIdx = viewportSeries[vIdx] || 0;
            const series = seriesList[seriesIdx] || seriesList[0];
            const state = viewportStates[vIdx];
            const isActive = activeViewportIdx === vIdx;

            return (
              <div
                key={vIdx}
                onClick={() => setActiveViewportIdx(vIdx)}
                onPointerDown={(e) => handleViewportPointerDown(e, vIdx)}
                onPointerMove={(e) => handleViewportPointerMove(e, vIdx)}
                onPointerUp={(e) => handleViewportPointerUp(e, vIdx)}
                onPointerCancel={(e) => handleViewportPointerUp(e, vIdx)}
                onWheel={(e) => handleViewportWheel(e, vIdx)}
                className={`relative bg-black border overflow-hidden flex items-center justify-center cursor-crosshair touch-none select-none ${
                  isActive ? 'border-cyan-400 ring-2 ring-cyan-500/30' : 'border-slate-800/80'
                }`}
              >
                <div className="w-full h-full relative flex items-center justify-center bg-[#030712] overflow-hidden pointer-events-none">
                  
                  {/* TRANSFORMED CANVAS WRAPPER */}
                  <div
                    className="relative max-w-full max-h-full flex items-center justify-center transition-transform duration-75 select-none pointer-events-auto"
                    style={{
                      aspectRatio: imgSizes[vIdx] ? `${imgSizes[vIdx].w} / ${imgSizes[vIdx].h}` : '1 / 1',
                      transform: `scale(${state.zoom}) translate(${state.pan.x / 10}%, ${state.pan.y / 10}%) rotate(${state.rotation}deg) scaleX(${state.flipH ? -1 : 1}) scaleY(${state.flipV ? -1 : 1})`,
                      transformOrigin: 'center center',
                    }}
                  >
                    <img
                      src={series.imageUrl}
                      alt={series.title}
                      onDragStart={(e) => e.preventDefault()}
                      onLoad={(e) => {
                        const w = e.currentTarget.naturalWidth || 1000;
                        const h = e.currentTarget.naturalHeight || 1000;
                        setImgSizes((prev) => ({ ...prev, [vIdx]: { w, h } }));
                      }}
                      style={{
                        filter: `brightness(${100 + (state.wl - 200) / 20}%) contrast(${Math.max(50, 100 * ((2000 - state.ww) / 500 + 1))}%) ${state.invert ? 'invert(100%)' : ''}`,
                      }}
                      className="w-full h-full object-cover select-none pointer-events-none block"
                    />

                    {/* SVG Annotations Layer */}
                    <svg
                      ref={(el) => { svgRefs.current[vIdx] = el; }}
                      viewBox="0 0 1000 1000"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible"
                      data-testid={`viewport-svg-${vIdx}`}
                    >
                      {(() => {
                        const key = imageKeyOfViewport(vIdx);
                        const iw = imgSizes[vIdx]?.w || 1000;
                        const ih = imgSizes[vIdx]?.h || 1000;
                        const list: (ArrowData & { id: number | string; selected?: boolean; draft?: boolean })[] = marks
                          .filter((m) => m.imageKey === key && m.kind === 'arrow' && m.data)
                          .map((m) => ({ ...m.data, id: m.id, selected: m.id === selectedMarkId }));
                        if (draftArrow && draftArrow.vIdx === vIdx) list.push({ ...draftArrow, id: 'draft', draft: true });
                        return list.map((a) => (
                          <g key={`mark-${a.id}`} data-testid={a.draft ? 'arrow-draft' : 'arrow-mark'} opacity={a.draft ? 0.85 : 1}>
                            <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="#000000" strokeOpacity="0.55" strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                            <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke={a.selected ? '#22d3ee' : '#facc15'} strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" strokeDasharray={a.selected ? '7 4' : undefined} />
                            <polygon points={arrowHeadPoints(a, iw, ih)} fill={a.selected ? '#22d3ee' : '#facc15'} stroke="#000000" strokeOpacity="0.55" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                          </g>
                        ));
                      })()}
                      {(() => {
                        const seriesKey = series.id || series.imageUrl || `series-${viewportSeries[vIdx] || 0}`;
                        const seriesAnnotations = annotations[seriesKey] || [];
                        return (seriesAnnotations).concat(currentDraw && activeViewportIdx === vIdx ? [currentDraw as AnnotationLine] : []).map((ann, aIdx) => {
                        if (ann.type === 'measure') {
                          const mx = (ann.x1 + ann.x2) / 2;
                          const my = (ann.y1 + ann.y2) / 2;
                          return (
                            <g key={ann.id || aIdx}>
                              <line x1={ann.x1} y1={ann.y1} x2={ann.x2} y2={ann.y2} stroke="#38bdf8" strokeWidth="3.5" strokeDasharray="6 3" />
                              <circle cx={ann.x1} cy={ann.y1} r="6" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                              <circle cx={ann.x2} cy={ann.y2} r="6" fill="#0284c7" stroke="#ffffff" strokeWidth="2" />
                              <rect x={mx - 40} y={my - 16} width="80" height="26" rx="5" fill="#0f172a" opacity="0.9" stroke="#38bdf8" strokeWidth="1.5" />
                              <text x={mx} y={my} textAnchor="middle" dominantBaseline="middle" fill="#38bdf8" fontSize="13" fontWeight="bold" fontFamily="monospace">
                                {ann.label || '34.5 mm'}
                              </text>
                            </g>
                          );
                        }

                        if (ann.type === 'ellipse') {
                          const cx = (ann.x1 + ann.x2) / 2;
                          const cy = (ann.y1 + ann.y2) / 2;
                          const rx = Math.abs(ann.x2 - ann.x1) / 2;
                          const ry = Math.abs(ann.y2 - ann.y1) / 2;
                          return (
                            <g key={ann.id || aIdx}>
                              <ellipse cx={cx} cy={cy} rx={Math.max(10, rx)} ry={Math.max(10, ry)} fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 4" />
                              <line x1={cx - 10} y1={cy} x2={cx + 10} y2={cy} stroke="#f59e0b" strokeWidth="2" />
                              <line x1={cx} y1={cy - 10} x2={cx} y2={cy + 10} stroke="#f59e0b" strokeWidth="2" />
                              <rect x={cx - 85} y={cy + ry + 10} width="170" height="28" rx="5" fill="#0f172a" opacity="0.9" stroke="#f59e0b" strokeWidth="1.5" />
                              <text x={cx} y={cy + ry + 22} textAnchor="middle" dominantBaseline="middle" fill="#fbbf24" fontSize="13" fontWeight="bold" fontFamily="monospace">
                                {ann.label || 'Area: 5.2 cm²'}
                              </text>
                            </g>
                          );
                        }

                        if (ann.type === 'cobb') {
                          const x3 = ann.x3 || ann.x1 - 35;
                          const y3 = ann.y3 || ann.y1 + 80;
                          const x4 = ann.x4 || ann.x2 - 35;
                          const y4 = ann.y4 || ann.y2 + 80;
                          const mx = (ann.x1 + ann.x2 + x3 + x4) / 4;
                          const my = (ann.y1 + ann.y2 + y3 + y4) / 4;
                          return (
                            <g key={ann.id || aIdx}>
                              <line x1={ann.x1} y1={ann.y1} x2={ann.x2} y2={ann.y2} stroke="#facc15" strokeWidth="4" />
                              <circle cx={ann.x1} cy={ann.y1} r="6" fill="#eab308" />
                              <circle cx={ann.x2} cy={ann.y2} r="6" fill="#eab308" />
                              <line x1={x3} y1={y3} x2={x4} y2={y4} stroke="#facc15" strokeWidth="4" />
                              <circle cx={x3} cy={y3} r="6" fill="#eab308" />
                              <circle cx={x4} cy={y4} r="6" fill="#eab308" />
                              <line x1={(ann.x1 + ann.x2) / 2} y1={(ann.y1 + ann.y2) / 2} x2={(x3 + x4) / 2} y2={(y3 + y4) / 2} stroke="#facc15" strokeWidth="2" strokeDasharray="4 4" />
                              <rect x={mx - 80} y={my - 15} width="160" height="30" rx="5" fill="#0f172a" opacity="0.95" stroke="#facc15" strokeWidth="1.5" />
                              <text x={mx} y={my} textAnchor="middle" dominantBaseline="middle" fill="#facc15" fontSize="13" fontWeight="extrabold" fontFamily="monospace">
                                {ann.label || 'Cobb Angle: 22.4°'}
                              </text>
                            </g>
                          );
                        }

                        if (ann.type === 'angle') {
                          const mx = ann.x2;
                          const my = ann.y2 - 25;
                          return (
                            <g key={ann.id || aIdx}>
                              <line x1={ann.x1} y1={ann.y1} x2={ann.x2} y2={ann.y2} stroke="#10b981" strokeWidth="3.5" />
                              <line x1={ann.x2} y1={ann.y2} x2={ann.x2 + 70} y2={ann.y2 + 45} stroke="#10b981" strokeWidth="3.5" />
                              <circle cx={ann.x2} cy={ann.y2} r="7" fill="#059669" stroke="#ffffff" strokeWidth="2" />
                              <rect x={mx - 55} y={my - 15} width="110" height="26" rx="5" fill="#0f172a" opacity="0.9" stroke="#10b981" strokeWidth="1.5" />
                              <text x={mx} y={my} textAnchor="middle" dominantBaseline="middle" fill="#34d399" fontSize="13" fontWeight="bold" fontFamily="monospace">
                                {ann.label || 'Angle: 44.2°'}
                              </text>
                            </g>
                          );
                        }

                        return null;
                      });
                    })()}
                    </svg>
                  </div>

                  {/* Interactive Magnifier Lens Overlay */}
                  {activeTool === 'magnifier' && magnifierPos && isActive && (
                    <div
                      className="absolute w-36 h-36 rounded-full border-2 border-amber-400 overflow-hidden shadow-2xl pointer-events-none z-40 bg-black"
                      style={{
                        left: `${magnifierPos.x - 72}px`,
                        top: `${magnifierPos.y - 72}px`,
                      }}
                    >
                      <img
                        src={series.imageUrl}
                        alt="Magnified View"
                        style={{
                          transform: `scale(${state.zoom * 2.5}) translate(${state.pan.x - (magnifierPos.x - 150) / 2}px, ${state.pan.y - (magnifierPos.y - 150) / 2}px)`,
                          filter: `brightness(${100 + (state.wl - 200) / 20}%) contrast(${Math.max(50, 100 * ((2000 - state.ww) / 500 + 1))}%) ${state.invert ? 'invert(100%)' : ''}`,
                        }}
                        className="max-w-none max-h-none absolute w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 border-2 border-amber-400/40 rounded-full pointer-events-none" />
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/80 text-amber-400 text-[9px] font-mono px-1 font-bold rounded-xs">
                        2.5X MAGNIFIER
                      </span>
                    </div>
                  )}

                  {/* Arrow tool actions (active viewport) */}
                  {activeTool === 'arrow' && canDrawArrows && isActive && (
                    <div
                      className="absolute top-2 right-2 z-30 flex items-center gap-1 pointer-events-auto"
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerUp={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="hidden sm:inline px-2 py-1 rounded bg-slate-950/90 border border-slate-700 text-[10px] font-mono text-amber-300">
                        Drag to draw · tap an arrow to select
                      </span>
                      <button
                        type="button"
                        onClick={undoMyLastArrow}
                        className="min-h-[34px] px-2.5 rounded-lg bg-slate-950/90 border border-slate-700 text-amber-300 text-[11px] font-bold inline-flex items-center gap-1"
                        title="Undo my last arrow on this image"
                        data-testid="arrow-undo"
                      >
                        <Undo className="w-3.5 h-3.5" /> Undo
                      </button>
                      {(() => {
                        const sel = marks.find((m) => m.id === selectedMarkId);
                        if (!sel || !canRemoveMark(sel)) return null;
                        return (
                          <button
                            type="button"
                            onClick={() => removeMark(sel)}
                            className="min-h-[34px] px-2.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold inline-flex items-center gap-1"
                            title="Delete the selected arrow"
                            data-testid="arrow-delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        );
                      })()}
                    </div>
                  )}

                  {/* Top Left Metadata Overlay */}
                  <div className="absolute top-2 left-2 pointer-events-none font-mono text-[9px] sm:text-[10px] text-cyan-300 bg-slate-950/90 backdrop-blur-xs px-2.5 py-1 border border-slate-800 leading-tight max-w-[70%] truncate z-10 rounded">
                    <p className="font-bold text-white uppercase truncate">{series.title}</p>
                    <p className="text-slate-400 truncate">{series.institution}</p>
                  </div>

                  {/* Bottom Right DICOM Parameters Overlay */}
                  <div className="absolute bottom-2 right-2 pointer-events-none font-mono text-[9px] sm:text-[10px] text-slate-300 bg-slate-950/90 backdrop-blur-xs px-2.5 py-1 border border-slate-800 text-right leading-tight z-10 rounded">
                    <p>WW: {state.ww} | WL: {state.wl}</p>
                    <p>ZOOM: {(state.zoom * 100).toFixed(0)}% | ROT: {state.rotation}°</p>
                    <p className="text-cyan-400 font-bold">VIEWPORT #{vIdx + 1} {isActive ? '(ACTIVE)' : ''}</p>
                  </div>
</div>
              </div>
            );
          })}
          </div>
        </div>

        {/* DRAGGABLE RESIZABLE GRID SPLITTER BAR */}
        {isReportingOpen && (
          <div
            onPointerDown={handleSplitterPointerDown}
            onPointerMove={handleSplitterPointerMove}
            onPointerUp={handleSplitterPointerUp}
            onPointerCancel={handleSplitterPointerUp}
            onDoubleClick={() => setReportWidthPercent(45)}
            className={`hidden lg:flex w-2.5 bg-slate-950 border-x border-slate-800 hover:border-cyan-500/60 hover:bg-cyan-500/10 cursor-col-resize select-none items-center justify-center shrink-0 z-30 transition-colors group print:hidden no-print ${
              isDraggingSplitter ? 'bg-cyan-500/20 border-cyan-400' : ''
            }`}
            title="Drag to resize DICOM / DOC split (Double-click to reset 55/45)"
          >
            <div className="w-1.5 h-8 bg-slate-700 group-hover:bg-cyan-400 rounded-full flex items-center justify-center pointer-events-none transition-colors">
              <GripVertical className="w-3 h-3 text-slate-950" />
            </div>
          </div>
        )}
        {/* RIGHT PANE: RADIOLOGY DOC REPORTING EDITOR */}
        {isReportingOpen && (
          <div
            style={{ width: isLgLayout ? `${reportWidthPercent}%` : '100%' }}
            className={`h-full min-h-0 border-r-0 flex flex-col overflow-hidden text-slate-900 shadow-2xl z-10 transition-none print:w-full print:max-w-none print:bg-white print:border-none print:shadow-none print:overflow-visible ${
              mobileActiveView === 'dicom' ? 'hidden lg:flex' : 'w-full lg:flex'
            } ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-200 text-slate-900'} ${
              !isLgLayout && tabSlideDir === 'from-right' ? 'rn-tab-slide-from-right' : ''
            }`}
            data-testid="report-pane"
          >
            
            {/* Rich Formatting Toolbar */}
            <div className={`border-b p-1.5 flex flex-wrap items-center gap-1.5 text-[13px] shrink-0 select-none print:hidden no-print ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
            }`}>
              {/* REPORT TEMPLATE DROPDOWN SELECTOR */}
              <div className="flex items-center gap-1 min-w-0 flex-1 basis-[min(100%,18rem)]">
                <Sparkles className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-cyan-400' : 'text-blue-600'}`} />
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    const tId = e.target.value;
                    setSelectedTemplateId(tId);
                    if (!tId) return;

                    const htmlToPlain = (html: string) =>
                      html
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
                        .replace(/<[^>]+>/g, '')
                        .replace(/&nbsp;/gi, ' ')
                        .replace(/&amp;/gi, '&')
                        .replace(/&lt;/gi, '<')
                        .replace(/&gt;/gi, '>')
                        .replace(/\r\n/g, '\n')
                        .replace(/\n{3,}/g, '\n\n')
                        .trim();

                    const applyFindingsImpression = (rawFindings: string, rawImpression: string, content?: string) => {
                      let findings = (rawFindings || '').trim();
                      let impression = (rawImpression || '').trim();
                      if ((!findings || !impression) && content) {
                        const plain = htmlToPlain(content);
                        const parts = plain.split(/\bIMPRESSION(?:\s*&\s*CONCLUSION)?\s*:?/i);
                        if (parts.length >= 2) {
                          if (!findings) {
                            findings = parts[0].replace(/^(?:RADIOLOGICAL\s+)?FINDINGS\s*:?/i, '').trim();
                          }
                          if (!impression) {
                            impression = parts.slice(1).join('\n').trim();
                          }
                        } else if (!findings) {
                          findings = plain.replace(/^(?:RADIOLOGICAL\s+)?FINDINGS\s*:?/i, '').trim();
                        }
                      }
                      setFindingText(findings);
                      setImpressionText(impression);
                      const parts = report?.bodyParts?.length ? report.bodyParts : [];
                      const currentPart = parts[activeBodyPartIdx] || parts[0];
                      if (currentPart) {
                        setBodyPartReports((prev) => ({ ...prev, [currentPart]: findings }));
                        setBodyPartImpressions((prev) => ({ ...prev, [currentPart]: impression }));
                      }
                    };

                    if (tId.startsWith('stored_')) {
                      const id = tId.replace('stored_', '');
                      const tmpl = storedTemplates.find((t) => t.id === id);
                      if (tmpl) {
                        setReportTitle(tmpl.title);
                        applyFindingsImpression(tmpl.findings || '', tmpl.impression || '', tmpl.content);
                      }
                    } else {
                      const tmpl = RADIOLOGY_TEMPLATES.find((t) => t.id === tId);
                      if (tmpl) {
                        setReportTitle(tmpl.title);
                        applyFindingsImpression(tmpl.findings, tmpl.impression);
                      }
                    }
                  }}
                  className={`min-w-0 flex-1 max-w-full px-2 py-1.5 text-[13px] border font-semibold rounded cursor-pointer transition-all ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-cyan-500/50 text-cyan-300 hover:border-cyan-400 focus:ring-1 focus:ring-cyan-400'
                      : 'bg-white border-blue-300 text-blue-800 hover:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs'
                  }`}
                >
                  <option value="">Load Report Template...</option>
                  {filteredTemplates.length === 0 && !showAllTemplates && (
                    <option value="" disabled>
                      No templates match modality/body part
                    </option>
                  )}
                  {filteredTemplates.map((tmpl) => (
                    <option
                      key={tmpl.id}
                      value={`stored_${tmpl.id}`}
                      className={theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}
                    >
                      [{tmpl.modality}{tmpl.bodyPart ? ` / ${tmpl.bodyPart}` : ''}] {tmpl.title} ({tmpl.centerName})
                    </option>
                  ))}
                </select>

                <label
                  className={`flex items-center gap-1 px-1.5 py-1 text-[10px] font-bold border rounded cursor-pointer select-none ${
                    theme === 'dark'
                      ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Show templates for all modalities and body parts"
                >
                  <input
                    type="checkbox"
                    checked={showAllTemplates}
                    onChange={(e) => setShowAllTemplates(e.target.checked)}
                    className="accent-[#009ef7]"
                  />
                  <span>All</span>
                </label>

                {canCreateTemplate && (
                <button
                  type="button"
                  onClick={handleOpenSaveTemplate}
                  title="Save current findings as reusable template"
                  aria-label="Save New Template"
                  className={`min-h-[36px] min-w-[36px] px-2 text-xs font-bold border rounded flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0 ${
                    saveTemplateSuccess
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : theme === 'dark'
                      ? 'bg-purple-950/80 border-purple-500/60 text-purple-300 hover:bg-purple-900 hover:text-white'
                      : 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200'
                  }`}
                >
                  {saveTemplateSuccess ? <CheckCircle2 className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                  <span className="hidden xl:inline whitespace-nowrap">{saveTemplateSuccess ? 'Saved!' : 'Save Template'}</span>
                </button>
                )}
              </div>

              <div className={`h-4 w-px mx-0.5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'}`} />

              <button
                type="button"
                onClick={() => setWithHeader(!withHeader)}
                className={`px-2.5 py-1 text-[10px] font-bold border transition-all cursor-pointer rounded shrink-0 ${
                  withHeader
                    ? (theme === 'dark' ? 'bg-cyan-600 text-white border-cyan-500 font-extrabold' : 'bg-blue-600 text-white border-blue-500 font-extrabold')
                    : (theme === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-300')
                }`}
              >
                {withHeader ? 'Header Included' : 'No Header'}
              </button>

              <div className={`h-4 w-px mx-0.5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'}`} />

              <button
                type="button"
                onClick={() => setIsBoldActive(!isBoldActive)}
                className={`p-1 border rounded font-bold transition-colors cursor-pointer ${
                  isBoldActive
                    ? (theme === 'dark' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-blue-600 text-white border-blue-500')
                    : (theme === 'dark' ? 'hover:bg-slate-800 border-slate-700 text-slate-200' : 'hover:bg-slate-200 border-slate-300 text-slate-800')
                }`}
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsItalicActive(!isItalicActive)}
                className={`p-1 border rounded italic transition-colors cursor-pointer ${
                  isItalicActive
                    ? (theme === 'dark' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-blue-600 text-white border-blue-500')
                    : (theme === 'dark' ? 'hover:bg-slate-800 border-slate-700 text-slate-200' : 'hover:bg-slate-200 border-slate-300 text-slate-800')
                }`}
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsUnderlineActive(!isUnderlineActive)}
                className={`p-1 border rounded underline transition-colors cursor-pointer ${
                  isUnderlineActive
                    ? (theme === 'dark' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-blue-600 text-white border-blue-500')
                    : (theme === 'dark' ? 'hover:bg-slate-800 border-slate-700 text-slate-200' : 'hover:bg-slate-200 border-slate-300 text-slate-800')
                }`}
                title="Underline"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>

              <div className={`h-4 w-px mx-0.5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'}`} />

              <button
                type="button"
                onClick={() => setReportTextAlign('text-left')}
                className={`p-1 border rounded transition-colors cursor-pointer ${
                  reportTextAlign === 'text-left'
                    ? (theme === 'dark' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-blue-600 text-white border-blue-500')
                    : (theme === 'dark' ? 'hover:bg-slate-800 border-slate-700 text-slate-200' : 'hover:bg-slate-200 border-slate-300 text-slate-800')
                }`}
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setReportTextAlign('text-center')}
                className={`p-1 border rounded transition-colors cursor-pointer ${
                  reportTextAlign === 'text-center'
                    ? (theme === 'dark' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-blue-600 text-white border-blue-500')
                    : (theme === 'dark' ? 'hover:bg-slate-800 border-slate-700 text-slate-200' : 'hover:bg-slate-200 border-slate-300 text-slate-800')
                }`}
                title="Align Center"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>

              <div className={`h-4 w-px mx-0.5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'}`} />

              <select
                value={reportFontFamily}
                onChange={(e) => setReportFontFamily(e.target.value as any)}
                className={`px-1 py-0.5 border text-xs font-sans rounded cursor-pointer ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="font-serif">Serif</option>
                <option value="font-sans">Sans-Serif</option>
                <option value="font-mono">Monospace</option>
              </select>

              <select
                value={reportFontSize}
                onChange={(e) => setReportFontSize(e.target.value as any)}
                className={`px-1 py-0.5 border text-xs rounded cursor-pointer ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value="text-xs">Small (10pt)</option>
                <option value="text-sm">Normal (11pt)</option>
                <option value="text-base">Large (12pt)</option>
              </select>
            </div>

            {/* Study chips + page zoom: screen-only bar above the A4 page */}
            <div className={`shrink-0 border-b px-2 py-1.5 flex items-center gap-2 select-none print:hidden no-print ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}>
              <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto no-scrollbar" data-testid="study-chips">
                {(report?.bodyParts?.length || 0) > 1 && report?.bodyParts?.map((part, idx) => {
                  const st = (studyStatuses[part] || report?.studies?.find((s) => s.bodyPart === part)?.reportStatus || 'PENDING').toUpperCase();
                  const label = st === 'SIGNED' ? 'Signed' : st === 'DRAFT' ? 'Draft' : 'Pending';
                  const dot = st === 'SIGNED' ? 'bg-emerald-500' : st === 'DRAFT' ? 'bg-amber-500' : 'bg-slate-400';
                  const active = activeBodyPartIdx === idx;
                  return (
                    <button
                      key={part}
                      type="button"
                      onClick={() => handleSwitchBodyPartTab(idx)}
                      title={`${part} - ${label}`}
                      className={`h-8 px-2.5 text-[12px] font-semibold rounded-md border flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#009ef7] text-white border-[#009ef7]'
                          : theme === 'dark'
                          ? 'bg-slate-950 text-slate-200 border-slate-700 hover:bg-slate-800'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : dot}`} />
                      <span className="max-w-[10rem] truncate">{part}</span>
                      <span className={`text-[10px] font-medium ${active ? 'text-white/85' : 'opacity-70'}`}>{label}</span>
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] font-medium opacity-70 shrink-0 hidden sm:inline" data-testid="page-count">
                A4 &middot; {sheetPageCount} {sheetPageCount === 1 ? 'page' : 'pages'}
              </span>
              <div className={`flex rounded-md border overflow-hidden shrink-0 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-300'}`} role="group" aria-label="Page zoom">
                {(['fit', 'actual'] as const).map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setPageZoom(z)}
                    data-testid={`page-zoom-${z}`}
                    className={`h-8 px-2.5 text-[12px] font-semibold cursor-pointer ${
                      pageZoom === z
                        ? (theme === 'dark' ? 'bg-cyan-600 text-white' : 'bg-blue-600 text-white')
                        : (theme === 'dark' ? 'bg-slate-950 text-slate-300' : 'bg-white text-slate-700')
                    }`}
                  >
                    {z === 'fit' ? 'Fit' : '100%'}
                  </button>
                ))}
              </div>
            </div>

            {/* A4 page (210 x 297 mm), laid out with the same stylesheet as the PDF and scaled to fit */}
            <div
              ref={setPageViewportEl}
              className={`flex-1 min-h-0 overflow-auto overscroll-contain select-text print:bg-white print:p-0 print:overflow-visible print:block ${
                theme === 'dark' ? 'bg-[#090d16]' : 'bg-slate-300'
              }`}
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y', padding: sheetGutterPx }}
              data-testid="report-page-viewport"
            >
              {qrHarvestEl}
              <div
                style={{ width: sheetWidthPx * sheetScale, height: sheetHeightPx * sheetScale, margin: '0 auto', position: 'relative' }}
                data-testid="report-page-frame"
              >
                <A4ReportEditor
                  payload={buildPrintPayload(true)}
                  findings={findingText}
                  impression={impressionText}
                  onFindingsChange={setFindingText}
                  onImpressionChange={setImpressionText}
                  title={(report?.bodyParts?.length || 0) <= 1 ? reportTitle : undefined}
                  onTitleChange={(report?.bodyParts?.length || 0) <= 1 ? setReportTitle : undefined}
                  scale={sheetScale}
                  onPageCount={setSheetPageCount}
                />
              </div>
            </div>

            {/* Mobile sticky primary actions (Report tab) */}
            <div className={`lg:hidden shrink-0 border-t px-3 py-2 flex items-center gap-2 print:hidden no-print ${
              theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              {onOpenActivity && (
                <button
                  type="button"
                  onClick={onOpenActivity}
                  className={`flex items-center justify-center h-11 w-11 rounded-lg border ${
                    theme === 'dark' ? 'border-slate-700 text-slate-200' : 'border-slate-300 text-slate-700'
                  }`}
                  title="Activity"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  handlePrintCurrentStudy();
                }}
                className={`flex items-center justify-center gap-1.5 h-11 px-3 rounded-lg border text-[13px] font-semibold ${
                  theme === 'dark' ? 'border-slate-700 text-slate-100' : 'border-slate-300 text-slate-800'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span className="hidden xs:inline">PDF</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAndSubmitReport}
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[14px] font-bold disabled:opacity-60"
              >
                {reportSavedSuccess ? <CheckCircle2 className="w-5 h-5" /> : <FileCheck className="w-5 h-5" />}
                {isSubmitting ? 'Submitting...' : reportSavedSuccess ? 'Submitted!' : 'Save & Submit'}
              </button>
            </div>

            {/* Bottom Thumbnail Bar */}
            <div className="bg-slate-900 border-t border-slate-800 p-2 flex items-center gap-2 overflow-x-auto text-xs shrink-0 no-scrollbar print:hidden no-print">
              <span className="text-[10px] font-bold font-mono text-slate-400 shrink-0">{studyDate}</span>

              {seriesList.map((s, idx) => (
                <div
                  key={s.id}
                  onClick={() => {
                    setViewportSeries((prev) => {
                      const next = [...prev];
                      next[activeViewportIdx] = idx;
                      return next;
                    });
                  }}
                  className={`w-14 h-11 border-2 cursor-pointer relative overflow-hidden rounded shrink-0 ${
                    viewportSeries[activeViewportIdx] === idx ? 'border-cyan-400 ring-2 ring-cyan-500/40' : 'border-slate-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={s.imageUrl} alt={s.title} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-cyan-300 text-[8px] font-mono text-center font-bold truncate">
                    {s.bodyPart.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Save as Template Modal in Report Format (DICOM Viewer Workstation) */}
      {canCreateTemplate && (
        <ReportTemplateModal
          isOpen={saveTemplateModalOpen}
          onClose={() => setSaveTemplateModalOpen(false)}
          prefill={{
            title: `${sheetTitleFor(sheetActivePart)} Template`,
            centerId: report?.radiologyCenterId || 'ALL',
            modality: studyModality || 'X-Ray',
            bodyPart: sheetActivePart,
            findings: findingText,
            impression: impressionText,
          }}
          onSaved={() => {
            setSaveTemplateSuccess(true);
            setTimeout(() => setSaveTemplateSuccess(false), 3000);
          }}
        />
      )}

      {statusToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-xl print:hidden no-print">
          {statusToast}
        </div>
      )}
      {leaveGuardOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 print:hidden no-print">
          <div className="bg-white text-slate-900 rounded-xl shadow-2xl max-w-md w-full p-5">
            <h3 className="text-lg font-bold mb-2">Unfinished reports</h3>
            <p className="text-sm text-slate-600 mb-4">
              {pendingStudyCount} of {report?.bodyParts?.length || 0} reports for {report?.fullName || 'this patient'} {pendingStudyCount === 1 ? 'is' : 'are'} still pending. Are you sure you want to leave?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold hover:bg-slate-50"
                onClick={() => { setLeaveGuardOpen(false); setLeaveGuardAction(null); }}
              >
                Stay
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700"
                onClick={() => {
                  const act = leaveGuardAction;
                  setLeaveGuardOpen(false);
                  setLeaveGuardAction(null);
                  act?.();
                }}
              >
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
