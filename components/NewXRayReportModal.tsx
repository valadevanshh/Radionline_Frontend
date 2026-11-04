'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  UploadCloud,
  Camera,
  FileText,
  AlertTriangle,
  Check,
  Loader2,
  Plus,
  Building2,
  Minus,
  ImagePlus,
  ArrowLeft,
  Paperclip,
  RotateCcw,
} from 'lucide-react';
import { RadiologyStore, XRayReport, Doctor, RadiologyCenter } from '@/lib/radiology-store';
import { ApiClient, apiErrorMessage, isPendingApproval, resolveMediaUrl, CenterReferrer } from '@/lib/api-client';
import { centerIdsWith } from '@/lib/access';
import { generateUUID, isUUID, formatPatientDisplayId } from '@/lib/uuid';
import PatientAgeGender, { AGE_MAX } from '@/components/PatientAgeGender';
import ImageLightbox from '@/components/ImageLightbox';
import { bodyPartChoices, findPart, viewsFor, composeStudyName } from '@/lib/body-parts';
import { BODY_PARTS_DATA, VIEWS_DATA } from '@/lib/body-parts-data';
import Autocomplete from '@/components/ui/Autocomplete';
import { viewsForBodyPart } from '@/lib/body-view-map';
import { cleanDr, hasDrPrefix, stripDr, withDr, DR_HINT } from '@/lib/doctor-name';

/** Payload handed to the page on create (same contract as before, plus the case id the files were stored under). */
export type NewCasePayload = Omit<XRayReport, 'createdAt'> & {
  studyUploads?: { bodyPart: string; images: string[]; studyDate?: string; studyTime?: string }[];
};

interface NewXRayReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (report: NewCasePayload) => Promise<void> | void;
  initialReport?: XRayReport | null;
  onUpdated?: (result: { pending: boolean; message: string; report?: XRayReport }) => void;
}

export const STUDY_MODALITY_OPTIONS = ['X-Ray', 'CT', 'MRI', 'Sonography', 'Blood Report'] as const;

/** Body part + view choices come from lib/body-parts; old cases keep their saved name (listed under Other). */
const PART_CHOICES = bodyPartChoices();
const PART_VALUES = PART_CHOICES.map((c) => c.value);

const LAST_CENTER_KEY = 'radionline_last_upload_center';
const LAST_MODALITIES_KEY = 'radionline_recent_modalities';
const ACCEPT = 'image/*,.dcm,application/dicom,application/pdf';
const CUSTOM_PART = '__custom__';
const CUSTOM_PARTS_KEY = 'radionline_custom_body_parts';
const CUSTOM_VIEWS_KEY = 'radionline_custom_views';
const uniq = (xs: string[]) => Array.from(new Map(xs.map((x) => [x.trim().toLowerCase(), x.trim()])).values()).filter(Boolean);
const BASE_PART_NAMES = uniq(BODY_PARTS_DATA.filter((b) => b.name.trim().toUpperCase() !== 'OTHER').map((b) => b.name));
const BASE_VIEW_NAMES = uniq(VIEWS_DATA.map((v) => v.name));
function readList(key: string): string[] {
  try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []; } catch { return []; }
}
function addToList(key: string, value: string) {
  try { localStorage.setItem(key, JSON.stringify(uniq([...readList(key), value]))); } catch { /* ignore */ }
}

type Gender = 'Male' | 'Female' | 'Other';
type AgeUnit = 'Years' | 'Months' | 'Days';

interface PickedFile {
  key: string;
  name: string;
  blob: Blob;
  previewUrl: string | null;
  kind: 'image' | 'dicom' | 'pdf';
  progress: number;
  storedPath?: string;
  error?: string;
}

interface StudyDraft {
  key: string;
  /** body part choice (e.g. "KNEE (LEFT)"), CUSTOM_PART, or a legacy full name */
  bodyPart: string;
  /** projection for parts that have views (e.g. "AP/LAT") */
  view: string;
  /** selected views (multi-select); study name = BODY + ' ' + views joined by '/' */
  viewList: string[];
  customPart: string;
  views: PickedFile[];
  /** YYYY-MM-DD, this study's own date */
  studyDate: string;
  /** HH:MM (24h), when the image was scanned */
  studyTime: string;
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  height: 32,
  padding: '0 8px',
  fontSize: 13,
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
};
const fieldErrorStyle: React.CSSProperties = { ...fieldStyle, border: '1px solid #f43f5e' };
const areaStyle: React.CSSProperties = {
  ...fieldStyle,
  height: 'auto',
  minHeight: 44,
  padding: '6px 8px',
  lineHeight: 1.3,
  fontSize: 13,
};

function fileKind(file: File): PickedFile['kind'] | null {
  const n = file.name.toLowerCase();
  if (file.type.startsWith('image/')) return 'image';
  if (!file.type && /\.(jpe?g|png|webp|gif|bmp)$/.test(n)) return 'image';
  if (n.endsWith('.dcm') || file.type === 'application/dicom') return 'dicom';
  if (file.type === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  return null;
}

function compressImage(file: File, maxSide = 2048, quality = 0.95): Promise<Blob> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(file);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSide || height > maxSide) {
        if (width > height) {
          height = Math.round((height * maxSide) / width);
          width = maxSide;
        } else {
          width = Math.round((width * maxSide) / height);
          height = maxSide;
        }
      } else {
        // Already small enough: upload the original bytes untouched (no re-encode / no darkening).
        URL.revokeObjectURL(url);
        return resolve(file);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return resolve(file);
      }
      // White base so transparent PNG areas don't turn black when flattened to JPEG.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (b) => {
          URL.revokeObjectURL(url);
          resolve(b || file);
        },
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

function todayDDMMYYYY(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
}

/** Today as YYYY-MM-DD in the browser's local time zone (IST for the centres). */
function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** DD-MM-YYYY / DD/MM/YYYY / YYYY-MM-DD -> YYYY-MM-DD for <input type="date"> ('' if unknown). */
function toIsoDate(v?: string | null): string {
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}

/** YYYY-MM-DD -> DD-MM-YYYY (the stored study date format). */
function isoToDDMMYYYY(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

function newStudy(date?: string): StudyDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    bodyPart: '',
    view: '',
    viewList: [],
    customPart: '',
    views: [],
    studyDate: date || todayIso(),
    studyTime: nowHHMM(),
  };
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function resolvedBodyPart(s: StudyDraft): string {
  if (s.bodyPart === CUSTOM_PART) return s.customPart.trim().toUpperCase();
  if (s.viewList?.length) return `${s.bodyPart.trim()} ${s.viewList.map((v) => v.trim()).join('/')}`.trim().toUpperCase();
  if (findPart(s.bodyPart)) return composeStudyName(s.bodyPart, s.view).trim().toUpperCase();
  return (s.bodyPart || '').trim().toUpperCase();
}

function readRecentModalities(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LAST_MODALITIES_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function rememberModality(m: string) {
  try {
    const prev = readRecentModalities().filter((x) => x !== m && x !== 'X-Ray');
    localStorage.setItem(LAST_MODALITIES_KEY, JSON.stringify([m, ...prev].slice(0, 4)));
  } catch {
    /* ignore */
  }
}

function FieldLabel({ children, required, htmlFor }: { children: React.ReactNode; required?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-[11px] font-semibold text-slate-600 mb-0.5">
      {children}
      {required && <span className="text-rose-500"> *</span>}
    </label>
  );
}

const compactField: React.CSSProperties = { ...fieldStyle, height: 32, fontSize: 13 };
const compactFieldError: React.CSSProperties = { ...compactField, border: '1px solid #f43f5e' };
const compactArea: React.CSSProperties = { ...compactField, height: 'auto', minHeight: 34, padding: '6px 8px', lineHeight: 1.3, resize: 'vertical' };
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

function ageNum(v: string): number {
  const n = Number(v);
  return v.trim() === '' || !Number.isFinite(n) ? 0 : n;
}

/** Y/M/D boxes -> legacy single age + unit, using the largest non-zero unit. */
export function deriveAgeFromParts(y: string, m: string, d: string): { age: number; ageUnit: AgeUnit } {
  const Y = ageNum(y), M = ageNum(m), D = ageNum(d);
  if (Y > 0) return { age: Y, ageUnit: 'Years' };
  if (M > 0) return { age: M, ageUnit: 'Months' };
  if (D > 0) return { age: D, ageUnit: 'Days' };
  return { age: 0, ageUnit: 'Years' };
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-0.5 text-[11px] font-medium text-rose-600">{msg}</p>;
}

export default function NewXRayReportModal({ isOpen, onClose, onSave, initialReport, onUpdated }: NewXRayReportModalProps) {
  const isEdit = !!initialReport;

  const [caseId, setCaseId] = useState('');
  const [patientNumber, setPatientNumber] = useState('');
  const [centerPatientId, setCenterPatientId] = useState('');
  const [customParts, setCustomParts] = useState<string[]>([]);
  const [customViews, setCustomViews] = useState<string[]>([]);
  useEffect(() => { setCustomParts(readList(CUSTOM_PARTS_KEY)); setCustomViews(readList(CUSTOM_VIEWS_KEY)); }, []);
  const [fullName, setFullName] = useState('');
  const [ageY, setAgeY] = useState<string>('');
  const [ageM, setAgeM] = useState<string>('');
  const [ageD, setAgeD] = useState<string>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [studyDate, setStudyDate] = useState<string>(todayIso());
  const [editStudyDates, setEditStudyDates] = useState<Record<string, string>>({});
  const [centerId, setCenterId] = useState('');
  const [referrers, setReferrers] = useState<CenterReferrer[]>([]);
  const [saveReferrer, setSaveReferrer] = useState(false);
  const [refHasCut, setRefHasCut] = useState(false);
  const [refCutType, setRefCutType] = useState<'percent' | 'fixed'>('percent');
  const [refCutValue, setRefCutValue] = useState('');
  useEffect(() => {
    if (!centerId) { setReferrers([]); return; }
    let alive = true;
    ApiClient.getCenterReferrers(centerId).then((r) => { if (alive) setReferrers(Array.isArray(r) ? r : []); }).catch(() => { if (alive) setReferrers([]); });
    return () => { alive = false; };
  }, [centerId]);
  const [modality, setModality] = useState<string>('X-Ray');
  const [modalityChoices, setModalityChoices] = useState<string[]>([...STUDY_MODALITY_OPTIONS]);
  const [studies, setStudies] = useState<StudyDraft[]>([newStudy()]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isPortable, setIsPortable] = useState(false);
  const [referringDoctor, setReferringDoctor] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [sendTo, setSendTo] = useState('ALL');
  const [extraScans, setExtraScans] = useState<PickedFile[]>([]);
  const [slips, setSlips] = useState<PickedFile[]>([]);
  const [preparing, setPreparing] = useState(false);
  const pdfUrls = useRef(new Map<string, string>());
  const pdfUrlFor = (f: PickedFile) => {
    let u = pdfUrls.current.get(f.key);
    if (!u) {
      u = URL.createObjectURL(f.blob);
      pdfUrls.current.set(f.key, u);
      objectUrls.current.push(u);
    }
    return u;
  };
  const [lightbox, setLightbox] = useState<{ files: PickedFile[]; idx: number } | null>(null);

  const [centers, setCenters] = useState<RadiologyCenter[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const studyFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const slipInputRef = useRef<HTMLInputElement | null>(null);
  const editScanRef = useRef<HTMLInputElement | null>(null);
  const activeStudyKey = useRef<string>('');
  const objectUrls = useRef<string[]>([]);

  const session = typeof window !== 'undefined' ? RadiologyStore.getSession() : null;

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setFormError(null);
    setSubmitting(false);
    setUploadPct(null);
    setExtraScans([]);
    setSlips([]);
    const recent = readRecentModalities();
    const rest = STUDY_MODALITY_OPTIONS.filter((m) => m !== 'X-Ray');
    setModalityChoices([
      'X-Ray',
      ...recent.filter((m) => m !== 'X-Ray' && (STUDY_MODALITY_OPTIONS as readonly string[]).includes(m)),
      ...rest.filter((m) => !recent.includes(m)),
    ]);

    if (initialReport) {
      setCaseId(initialReport.id);
      setPatientNumber(initialReport.patientNumber || '');
      setCenterPatientId(initialReport.centerPatientId || '');
      setFullName(initialReport.fullName || '');
      {
        const r = initialReport;
        const a = r.age !== undefined && r.age !== null ? String(r.age) : '';
        const unit = (r.ageUnit as AgeUnit) || 'Years';
        const hasParts = r.ageYears != null || r.ageMonths != null || r.ageDays != null;
        const parts = hasParts
          ? { y: String(r.ageYears ?? 0), m: String(r.ageMonths ?? 0), d: String(r.ageDays ?? 0) }
          : { y: '', m: '', d: '' };
        const derived = deriveAgeFromParts(parts.y, parts.m, parts.d);
        if (hasParts && String(derived.age) === a && derived.ageUnit === unit) {
          setAgeY(parts.y);
          setAgeM(parts.m === '0' ? '' : parts.m);
          setAgeD(parts.d === '0' ? '' : parts.d);
        } else {
          setAgeY(unit === 'Years' ? a : '');
          setAgeM(unit === 'Months' ? a : '');
          setAgeD(unit === 'Days' ? a : '');
        }
      }
      setGender(((initialReport.gender as Gender) || '') as Gender | '');
      setCenterId(initialReport.radiologyCenterId || '');
      setModality(initialReport.modality || 'X-Ray');
      setStudies(
        (initialReport.bodyParts || []).length
          ? (initialReport.bodyParts || []).map((bp) => ({
              key: `${initialReport.id}-${bp}`,
              bodyPart: bp,
              view: '',
              viewList: [],
              customPart: '',
              views: [],
              studyDate: toIsoDate(initialReport.studyDate) || todayIso(),
              studyTime: '',
            }))
          : [newStudy()],
      );
      setEditStudyDates(
        Object.fromEntries(
          (initialReport.studies || []).map((st) => [
            st.id,
            toIsoDate(st.studyDate || initialReport.studyDate) || todayIso(),
          ]),
        ),
      );
      setIsUrgent(!!initialReport.isUrgent);
      setIsPortable(!!initialReport.isPortable);
      setReferringDoctor(stripDr(initialReport.referringPhysicianName || ''));
      setPhone(initialReport.phone || '');
      setNotes(initialReport.clinicalNotes || '');
      setSendTo(initialReport.assignedDoctorIds?.[0] || initialReport.assignedDoctorId || 'ALL');
      setStudyDate(toIsoDate(initialReport.studyDate) || todayIso());
    } else {
      setCaseId(generateUUID());
      setStudyDate(todayIso());
      setPatientNumber('');
    setCenterPatientId('');
      setFullName('');
      setAgeY('');
      setAgeM('');
      setAgeD('');
      setGender('');
      setModality('X-Ray');
      setStudies([newStudy()]);
      setIsUrgent(false);
      setIsPortable(false);
      setReferringDoctor('');
      setPhone('');
      setNotes('');
      setSendTo('ALL');
    }

    let cancelled = false;
    (async () => {
      let cList: RadiologyCenter[] = [];
      let dList: Doctor[] = [];
      try {
        [cList, dList] = await Promise.all([ApiClient.getCenters(), ApiClient.getDoctors()]);
      } catch {
        cList = RadiologyStore.getCenters();
        dList = RadiologyStore.getDoctors();
      }
      if (cancelled) return;
      let allowed = cList;
      if (session?.role === 'CENTER') {
        const ids = centerIdsWith(session, 'reports', 'write');
        allowed = cList.filter((c) => ids.includes(c.id));
      }
      setCenters(allowed);
      setDoctors(dList);
      if (!initialReport) {
        let pick = '';
        if (allowed.length === 1) pick = allowed[0].id;
        else {
          const last = typeof window !== 'undefined' ? localStorage.getItem(LAST_CENTER_KEY) : null;
          if (last && allowed.some((c) => c.id === last)) pick = last;
        }
        setCenterId(pick);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialReport?.id]);

  useEffect(() => {
    if (isOpen) return;
    objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrls.current = [];
  }, [isOpen]);

  const selectedCenter = useMemo(() => centers.find((c) => c.id === centerId), [centers, centerId]);
  const existingImages = useMemo(
    () => (initialReport?.uploadedImages || []).filter((x) => typeof x === 'string' && x.trim()),
    [initialReport],
  );

  const readyStudies = useMemo(
    () => studies.filter((s) => resolvedBodyPart(s) && s.views.length > 0),
    [studies],
  );
  const reportCount = readyStudies.length;

  if (!isOpen) return null;

  const { age: derivedAge, ageUnit } = deriveAgeFromParts(ageY, ageM, ageD);
  const ageParts = { ageYears: ageNum(ageY), ageMonths: ageNum(ageM), ageDays: ageNum(ageD) };

  const clearForm = () => {
    if (submitting) return;
    setPatientNumber('');
    setCenterPatientId('');
    setFullName('');
    setAgeY('');
    setAgeM('');
    setAgeD('');
    setGender('');
    setStudyDate(todayIso());
    setModality('X-Ray');
    setStudies([newStudy()]);
    setIsUrgent(false);
    setIsPortable(false);
    setReferringDoctor('');
    setPhone('');
    setNotes('');
    setSendTo('ALL');
    setSlips([]);
    setErrors({});
    setFormError(null);
    setUploadPct(null);
  };

  const pickFilesInto = async (files: FileList | File[] | null, studyKey: string | 'edit' | 'slip') => {
    const list = Array.from(files || []);
    if (!list.length) return;
    setPreparing(true);
    setFormError(null);
    const rejected: string[] = [];
    const picked: PickedFile[] = [];
    for (const f of list) {
      const kind = fileKind(f);
      if (!kind) {
        rejected.push(f.name);
        continue;
      }
      if (studyKey === 'slip' && f.size > MAX_ATTACHMENT_BYTES && kind !== 'image') {
        rejected.push(`${f.name} (File must be 5 MB or smaller)`);
        continue;
      }
      const blob = kind === 'image' ? await compressImage(f) : f;
      if (studyKey === 'slip' && blob.size > MAX_ATTACHMENT_BYTES) {
        rejected.push(`${f.name} (File must be 5 MB or smaller)`);
        continue;
      }
      let previewUrl: string | null = null;
      if (kind === 'image') {
        previewUrl = URL.createObjectURL(blob);
        objectUrls.current.push(previewUrl);
      }
      const ext = kind === 'image' ? (blob.type === 'image/jpeg' ? '.jpg' : '') : '';
      const baseName = f.name.replace(/\.[^.]+$/, '');
      picked.push({
        key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: ext ? `${baseName}${ext}` : f.name,
        blob,
        previewUrl,
        kind,
        progress: 0,
      });
    }
    if (studyKey === 'slip') setSlips((prev) => [...prev, ...picked]);
    else if (studyKey === 'edit') setExtraScans((prev) => [...prev, ...picked]);
    else {
      setStudies((prev) => {
        const target = prev.find((s) => s.key === studyKey);
        // Several images picked into an empty study -> one study box per image.
        if (target && target.views.length === 0 && picked.length > 1) {
          const out: StudyDraft[] = [];
          for (const s of prev) {
            if (s.key !== studyKey) out.push(s);
            else
              picked.forEach((p, i) =>
                out.push(i === 0 ? { ...s, views: [p] } : { ...newStudy(s.studyDate), views: [p] }),
              );
          }
          return out;
        }
        return prev.map((s) => (s.key === studyKey ? { ...s, views: [...s.views, ...picked] } : s));
      });
      setErrors((e) => ({ ...e, studies: '' }));
    }
    if (rejected.length) setFormError(`Not added (use an image, DICOM .dcm or PDF, attachments up to 5 MB): ${rejected.join(', ')}`);
    setPreparing(false);
  };

  const removeView = (studyKey: string, fileKey: string) => {
    setStudies((prev) =>
      prev.map((s) => (s.key === studyKey ? { ...s, views: s.views.filter((v) => v.key !== fileKey) } : s)),
    );
  };

  const updateStudy = (key: string, patch: Partial<StudyDraft>) => {
    setStudies((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
    setErrors((e) => ({ ...e, studies: '' }));
  };

  const removeStudy = (key: string) => {
    setStudies((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.key !== key)));
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Enter the patient name';
    const badInt = (v: string, max: number) => {
      if (v.trim() === '') return false;
      const n = Number(v);
      return !Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > max;
    };
    if (ageY.trim() === '' && ageM.trim() === '' && ageD.trim() === '') e.age = 'Enter age';
    else if (badInt(ageY, AGE_MAX.Y)) e.age = `Years must be 0–${AGE_MAX.Y}`;
    else if (badInt(ageM, AGE_MAX.M)) e.age = `Months must be 0–${AGE_MAX.M}`;
    else if (badInt(ageD, AGE_MAX.D)) e.age = `Days must be 0–${AGE_MAX.D}`;
    if (!gender) e.gender = 'Choose gender';
    if (isEdit) {
      const dates = Object.values(editStudyDates).length ? Object.values(editStudyDates) : [studyDate];
      if (dates.some((d) => !isoToDDMMYYYY(d) || d > todayIso())) e.studyDate = 'Choose a valid study date (not in the future)';
    } else if (studies.some((s) => s.views.length > 0 && (!isoToDDMMYYYY(s.studyDate) || s.studyDate > todayIso()))) {
      e.studies = 'Choose a study date (not in the future) for every study';
    }
    if (!isEdit) {
      if (!centerId) e.center = 'Choose the centre';
      if (!modality) e.modality = 'Choose modality';
      if (readyStudies.length === 0) e.studies = 'Add at least one study with a body part and an image';
      else {
        const parts = readyStudies.map(resolvedBodyPart);
        if (new Set(parts).size !== parts.length) e.studies = 'Each study needs a different body part';
        for (const s of studies) {
          if (s.views.length > 0 && !resolvedBodyPart(s)) {
            e.studies = 'Choose a body part and view for every study that has images';
            break;
          }
          if (s.bodyPart === CUSTOM_PART && !s.customPart.trim()) {
            e.studies = 'Enter the custom body part name';
            break;
          }
        }
      }
    }
    return e;
  };

  const uploadAll = async (
    files: PickedFile[],
    subfolder: string,
    onProgress: (key: string, frac: number, path?: string) => void,
    done: { n: number },
    total: number,
  ) => {
    const paths: string[] = [];
    for (const f of files) {
      if (f.storedPath) {
        paths.push(f.storedPath);
        done.n += 1;
        continue;
      }
      const res = await ApiClient.uploadFileWithProgress(
        f.blob,
        f.name,
        { category: 'cases', entityId: caseId, subfolder },
        (frac) => {
          onProgress(f.key, frac);
          setUploadPct(Math.round(((done.n + frac) / total) * 100));
        },
      );
      onProgress(f.key, 1, res.path);
      f.storedPath = res.path;
      paths.push(res.path);
      done.n += 1;
    }
    return paths;
  };

  const handleSubmit = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    setFormError(null);
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      const first = ['fullName', 'age', 'gender', 'center', 'modality', 'studies'].find((k) => e[k]);
      document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit && initialReport) {
        const total = extraScans.length;
        const done = { n: 0 };
        if (total > 0) setUploadPct(0);
        const scanPaths = await uploadAll(
          extraScans,
          'uploads',
          (key, frac, path) => {
            setExtraScans((prev) =>
              prev.map((p) => (p.key === key ? { ...p, progress: frac, storedPath: path || p.storedPath } : p)),
            );
          },
          done,
          total || 1,
        );
        setUploadPct(total > 0 ? 100 : null);
        const res = await ApiClient.updateCaseDetails(initialReport.id, {
          fullName: fullName.trim(),
          age: derivedAge,
          ageUnit,
          gender: gender as Gender,
          phone: phone.trim(),
          referringPhysicianName: withDr(referringDoctor),
          clinicalNotes: notes,
          isUrgent,
          isPortable,
          studyDate:
            isoToDDMMYYYY(
              (initialReport.studies || []).length
                ? editStudyDates[(initialReport.studies || [])[0].id] || studyDate
                : studyDate,
            ) || undefined,
          studyDates: Object.keys(editStudyDates).length
            ? Object.fromEntries(Object.entries(editStudyDates).map(([id, d]) => [id, isoToDDMMYYYY(d)]))
            : undefined,
          addImages: scanPaths,
        });
        if (isPendingApproval(res)) {
          onUpdated?.({ pending: true, message: res.message || 'Edit sent to the Super Admin for approval.' });
        } else {
          onUpdated?.({
            pending: false,
            message: res.updated ? 'Patient details saved.' : 'No changes to save.',
            report: res.report,
          });
        }
        onClose();
        return;
      }

      const allViews = readyStudies.flatMap((s) => s.views);
      const total = allViews.length + slips.length;
      const done = { n: 0 };
      if (total > 0) setUploadPct(0);

      const studyUploads: { bodyPart: string; images: string[]; studyDate?: string; studyTime?: string }[] = [];
      for (const s of readyStudies) {
        const paths = await uploadAll(
          s.views,
          'uploads',
          (key, frac, path) => {
            setStudies((prev) =>
              prev.map((st) =>
                st.key !== s.key
                  ? st
                  : {
                      ...st,
                      views: st.views.map((v) =>
                        v.key === key ? { ...v, progress: frac, storedPath: path || v.storedPath } : v,
                      ),
                    },
              ),
            );
          },
          done,
          total || 1,
        );
        studyUploads.push({ bodyPart: resolvedBodyPart(s), images: paths, studyDate: isoToDDMMYYYY(s.studyDate), studyTime: s.studyTime || undefined });
      }
      const slipPaths = await uploadAll(
        slips,
        'clinical',
        (key, frac, path) => {
          setSlips((prev) =>
            prev.map((p) => (p.key === key ? { ...p, progress: frac, storedPath: path || p.storedPath } : p)),
          );
        },
        done,
        total || 1,
      );
      setUploadPct(total > 0 ? 100 : null);

      const center = centers.find((c) => c.id === centerId);
      const isAll = sendTo === 'ALL';
      const doc = doctors.find((d) => d.id === sendTo);
      const bodyParts = studyUploads.map((s) => s.bodyPart);
      const scanPaths = studyUploads.flatMap((s) => s.images);
      try {
        localStorage.setItem(LAST_CENTER_KEY, centerId);
      } catch {
        /* ignore */
      }
      rememberModality(modality);

      // New referring doctor for this centre (optional referral cut)
      const refName = withDr(referringDoctor, true);
      if (session?.role !== 'MANAGER' && saveReferrer && refName && centerId && !referrers.some((r) => stripDr(r.name).toUpperCase() === stripDr(refName).toUpperCase())) {
        try {
          await ApiClient.addCenterReferrer(centerId, {
            name: refName,
            hasCut: refHasCut,
            cutType: refHasCut ? refCutType : null,
            cutValue: refHasCut ? Number(refCutValue) || 0 : null,
          });
        } catch {
          /* the case upload still goes ahead */
        }
      }

      await onSave({
        id: caseId,
        fullName: fullName.trim().toUpperCase(),
        patientNumber: '', // assigned by the server (random 7-digit Patient ID)
        centerPatientId: centerPatientId.trim() || undefined,
        gender: gender as Gender,
        age: derivedAge,
        ageUnit,
        ...ageParts,
        phone: phone.trim(),
        radiologyCenterId: centerId,
        radiologyCenterName: center ? center.centerName : 'RADIOLOGY CENTER',
        referringPhysicianId: 'ref-doc-1',
        referringPhysicianName: withDr(referringDoctor, true),
        assignedDoctorId: isAll ? 'ALL' : sendTo,
        assignedDoctorName: isAll ? 'ALL DOCTORS (Broadcast)' : doc?.fullName || 'ALL DOCTORS',
        assignedDoctorIds: isAll ? ['ALL'] : [sendTo],
        claimStatus: 'UNCLAIMED',
        clinicalNotes: notes,
        bodyParts,
        modality,
        findings: '',
        impression: '',
        reportsByBodyPart: {},
        impressionsByBodyPart: {},
        status: 'Pending',
        isUrgent,
        isPortable,
        studyDate: studyUploads[0]?.studyDate || todayDDMMYYYY(),
        dicomSnapshots: Array.from(new Set([...scanPaths, ...slipPaths])),
        uploadedImages: scanPaths,
        clinicalHistoryImages: slipPaths,
        studyUploads,
      });
      onClose();
    } catch (err) {
      setFormError(apiErrorMessage(err, isEdit ? 'Could not save the changes' : 'Could not upload this case'));
      setUploadPct(null);
    } finally {
      setSubmitting(false);
    }
  };


  const lightboxEl = lightbox ? (
    <ImageLightbox
      items={lightbox.files.map((f) => ({
        key: f.key,
        name: f.name,
        imageUrl: f.previewUrl,
        pdfUrl: f.kind === 'pdf' ? pdfUrlFor(f) : undefined,
        kind: f.kind,
        sizeBytes: f.blob.size,
      }))}
      index={lightbox.idx}
      onIndex={(i) => setLightbox((lb) => (lb ? { ...lb, idx: i } : lb))}
      onClose={() => setLightbox(null)}
    />
  ) : null;

  const renderThumb = (f: PickedFile, onRemove?: () => void, group?: PickedFile[]) => (
    <div
      key={f.key}
      className="relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden w-16 h-16 shrink-0 group/thumb"
      data-testid="upload-thumb"
    >
      {/* Whole tile opens the image; remove is a small corner control so it does not block the tap target */}
      <button
        type="button"
        onClick={() => {
          const list = group && group.length ? group : [f];
          setLightbox({ files: list, idx: Math.max(0, list.findIndex((x) => x.key === f.key)) });
        }}
        aria-label={`Open ${f.name}`}
        title="Tap to open"
        className="block w-full h-full cursor-zoom-in"
        data-testid="upload-thumb-open"
      >
        {f.previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={f.previewUrl} alt={f.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 p-1 text-slate-500">
            <FileText className="w-5 h-5" />
            <span className="text-[9px] font-bold uppercase">{f.kind === 'dicom' ? 'DCM' : 'PDF'}</span>
          </div>
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 py-0.5 text-center text-[9px] font-bold tracking-wide text-white bg-slate-950/55">
          Open
        </span>
      </button>
      {!submitting && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${f.name}`}
          title="Remove image"
          className="absolute top-0.5 right-0.5 z-10 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-sm ring-1 ring-white/80"
          data-testid="upload-thumb-remove"
        >
          <X className="w-2.5 h-2.5" strokeWidth={3} />
        </button>
      )}
      {submitting && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-900/20">
          <div className="h-full bg-[#009ef7]" style={{ width: `${Math.round(f.progress * 100)}%` }} />
        </div>
      )}
    </div>
  );

  const footerStatus = submitting
    ? uploadPct !== null && uploadPct < 100
      ? `Uploading ${uploadPct}%`
      : 'Saving…'
    : preparing
    ? 'Preparing…'
    : isEdit
    ? extraScans.length
      ? `${extraScans.length} new image${extraScans.length === 1 ? '' : 's'}`
      : ''
    : reportCount
    ? `${reportCount} report${reportCount === 1 ? '' : 's'} · ${readyStudies.reduce((n, s) => n + s.views.length, 0)} view${readyStudies.reduce((n, s) => n + s.views.length, 0) === 1 ? '' : 's'}`
    : 'Add a study to continue';

  const bodyPartOptions = Array.from(
    new Set([
      // free-text / legacy names kept selectable (e.g. an older "CHEST PA" being edited)
      ...studies.filter((s) => s.bodyPart && s.bodyPart !== CUSTOM_PART && !findPart(s.bodyPart)).map((s) => s.bodyPart),
      ...(initialReport?.bodyParts || []),
    ]),
  );

  const partOptions = uniq([...BASE_PART_NAMES, ...customParts, ...bodyPartOptions]);
  const viewOptions = uniq([...BASE_VIEW_NAMES, ...customViews]);

  const showCenterPicker = !isEdit && centers.length !== 1;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center bg-slate-950/55 backdrop-blur-sm sm:p-3"
      data-testid="upload-image-dialog"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-dialog-title"
        className="relative bg-white text-slate-900 w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'min(96dvh, 920px)' }}
      >
        <div className="flex items-center gap-2 px-3 sm:px-5 py-2.5 border-b border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Back"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 shrink-0"
            data-testid="upload-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 id="upload-dialog-title" className="text-[15px] font-bold text-slate-900 leading-tight truncate">
              {isEdit ? 'Edit patient details' : `Upload ${modality === 'X-Ray' ? 'X-Ray' : modality}`}
            </h2>
            {(isEdit || (selectedCenter && centers.length === 1)) && (
              <p className="text-[11px] text-slate-500 truncate">
                {isEdit
                  ? `${initialReport?.fullName || ''} · ${initialReport?.radiologyCenterName || ''}`
                  : selectedCenter?.centerName}
              </p>
            )}
          </div>
          {!isEdit && (
            <button
              type="button"
              onClick={clearForm}
              disabled={submitting}
              className="h-7 px-2.5 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 inline-flex items-center gap-1 shrink-0"
              data-testid="upload-clear"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        <form id="upload-image-form" noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-3 sm:px-5 pt-2 pb-3 sm:py-4 space-y-3 sm:space-y-4">
            {isEdit && session?.role !== 'SUPER_ADMIN' && (
              <div
                className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-800 font-medium"
                data-testid="edit-review-notice"
              >
                {initialReport?.pendingEdit
                  ? 'An earlier edit is In Review. New changes also need Super Admin approval before they show.'
                  : 'Changes are sent to the Super Admin for review and show only after approval.'}
              </div>
            )}
            {formError && (
              <div
                role="alert"
                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-[12px] text-rose-700 font-medium flex items-start gap-2"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {isEdit && (
              <div
                className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-2 text-[12px] text-slate-700 space-y-1"
                data-testid="edit-fixed-study"
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{initialReport?.radiologyCenterName}</span>
                  <span className="text-slate-400">·</span>
                  <span>{initialReport?.modality || 'X-Ray'}</span>
                </div>
                {formatPatientDisplayId(patientNumber) && (
                  <div className="text-[11px] text-slate-500" data-testid="patient-id">
                    Patient ID <b className="font-mono text-slate-800">{patientNumber}</b>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {(initialReport?.studies || []).length
                    ? (initialReport?.studies || []).map((st) => (
                        <span
                          key={st.id}
                          className="inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold"
                        >
                          {st.bodyPart}
                          <input
                            type="date"
                            value={editStudyDates[st.id] || ''}
                            max={todayIso()}
                            onChange={(e) => setEditStudyDates((m) => ({ ...m, [st.id]: e.target.value }))}
                            aria-label={`Study date ${st.bodyPart}`}
                            className="h-6 px-1 border border-slate-200 rounded text-[11px] font-normal"
                            data-testid="edit-study-date"
                          />
                        </span>
                      ))
                    : (initialReport?.bodyParts || []).map((bp) => (
                        <span key={bp} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold">
                          {bp}
                        </span>
                      ))}
                  {!(initialReport?.studies || []).length && (
                    <input
                      type="date"
                      value={studyDate}
                      max={todayIso()}
                      onChange={(e) => setStudyDate(e.target.value)}
                      aria-label="Study date"
                      className="h-6 px-1 border border-slate-200 rounded text-[11px]"
                      data-testid="edit-study-date"
                    />
                  )}
                </div>
                <FieldError msg={errors.studyDate} />
              </div>
            )}

            {/* Studies */}
            {!isEdit && (
              <section className="space-y-1.5 sm:space-y-2.5" data-field="studies">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel required>Studies</FieldLabel>
                  <span className="text-[11px] font-semibold text-slate-500" data-testid="report-count">
                    <span data-testid="image-count" className="mr-2 px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">{studies.reduce((a, x) => a + x.views.length, 0)} image{studies.reduce((a, x) => a + x.views.length, 0) === 1 ? '' : 's'}</span>
                    {reportCount} report{reportCount === 1 ? '' : 's'}<span className="hidden sm:inline"> will be created</span>
                  </span>
                </div>

                {studies.map((study, idx) => {
                  const bpValue = study.bodyPart;
                  return (
                    <div
                      key={study.key}
                      className="relative rounded-2xl sm:rounded-xl border border-slate-200 bg-white sm:bg-slate-50/40 shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:shadow-none p-2 sm:py-2.5 sm:pl-2 sm:pr-7 flex items-start gap-2"
                      data-testid="study-card"
                    >
                      <span className={`${studies.length > 1 ? '' : 'hidden sm:block'} w-4 pt-2 text-center text-[10px] font-bold text-slate-400 shrink-0`} title={`Study ${idx + 1}`}>
                        {idx + 1}
                        {study.views.length > 0 && (
                          <span className="block mt-1 text-[9px] font-semibold text-sky-600" data-testid="study-image-count" title={`${study.views.length} image(s) in this study`}>
                            {study.views.length}img
                          </span>
                        )}
                      </span>
                      {studies.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStudy(study.key)}
                          className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          disabled={submitting}
                          aria-label={`Remove study ${idx + 1}`}
                          title="Remove study"
                          data-testid="remove-study"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-1.5 sm:gap-3 sm:items-start">
                        {/* Body part — full width on phone, side column on tablet+ */}
                        <div className="w-full sm:order-2 shrink-0 space-y-1.5 sm:w-[64%] sm:max-w-[480px]">
                          {/* t85: body part + views as ONE control (shared border, labelled halves) */}
                          <div
                            className="flex flex-row rounded-xl sm:rounded-lg border border-slate-300 bg-white focus-within:border-[#009ef7] focus-within:ring-2 focus-within:ring-sky-100 divide-x divide-slate-200"
                            data-testid="study-naming"
                          >
                          <div className="flex-1 min-w-0 max-w-[45%]">
                          <span className="block px-2 pt-1 text-[10px] sm:text-[9px] font-bold uppercase tracking-wide text-slate-400">Body part <span className="text-rose-500">*</span></span>
                          <Autocomplete
                            bare
                            options={partOptions}
                            value={bpValue === CUSTOM_PART ? study.customPart : bpValue}
                            onChange={(v) => {
                              const allowed = new Set(viewsForBodyPart(v, customViews).map((x) => x.toUpperCase()));
                              updateStudy(study.key, {
                                bodyPart: v,
                                view: '',
                                customPart: '',
                                viewList: study.viewList.filter((x) => allowed.has(x.toUpperCase())),
                              });
                            }}
                            onAddNew={(v) => { addToList(CUSTOM_PARTS_KEY, v); setCustomParts(readList(CUSTOM_PARTS_KEY)); }}
                            noun="body part"
                            placeholder="Body part"
                            testId="body-part-select"
                            disabled={submitting}
                          />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="block px-2 pt-1 text-[10px] sm:text-[9px] font-bold uppercase tracking-wide text-slate-400">
                              View(s){bpValue ? <span className="ml-1 normal-case font-semibold text-sky-600">for {bpValue === CUSTOM_PART ? study.customPart || 'custom' : bpValue}</span> : null}
                            </span>
                            <Autocomplete
                              bare
                              multiple
                              options={viewsForBodyPart(bpValue === CUSTOM_PART ? study.customPart : bpValue, customViews)}
                              value={study.viewList}
                              onChange={(v) => updateStudy(study.key, { viewList: v })}
                              onAddNew={(v) => { addToList(CUSTOM_VIEWS_KEY, v); setCustomViews(readList(CUSTOM_VIEWS_KEY)); }}
                              noun="view"
                              placeholder={bpValue ? 'Pick view(s)' : 'Pick body part first'}
                              testId="view-select"
                              disabled={submitting}
                            />
                          </div>
                          </div>
                          <div className="flex rounded-xl sm:rounded-lg border border-slate-300 bg-white divide-x divide-slate-200 overflow-hidden focus-within:border-[#009ef7] focus-within:ring-2 focus-within:ring-sky-100 sm:w-fit" data-testid="study-when">
                            <label className="flex-1 min-w-0 sm:flex-none sm:w-[130px]">
                              <span className="block px-2 pt-1 text-[10px] sm:text-[9px] font-bold uppercase tracking-wide text-slate-400 leading-none">Study date</span>
                              <input
                                type="date"
                                value={study.studyDate}
                                max={todayIso()}
                                onChange={(e) => updateStudy(study.key, { studyDate: e.target.value })}
                                aria-label="Study date"
                                title="Study date"
                                style={{ ...fieldStyle, border: 'none', height: 32, minHeight: 0, padding: '0 8px', fontSize: 15, background: 'transparent' }}
                                data-testid="study-date"
                                disabled={submitting}
                              />
                            </label>
                            <label className="flex-1 min-w-0 sm:flex-none sm:w-[100px]">
                              <span className="block px-2 pt-1 text-[10px] sm:text-[9px] font-bold uppercase tracking-wide text-slate-400 leading-none">Time</span>
                              <input
                                type="time"
                                value={study.studyTime}
                                onChange={(e) => updateStudy(study.key, { studyTime: e.target.value })}
                                aria-label="Study time (scanned at)"
                                title="Study time (when the image was scanned)"
                                style={{ ...fieldStyle, border: 'none', height: 32, minHeight: 0, padding: '0 8px', fontSize: 15, background: 'transparent' }}
                                data-testid="study-time"
                                disabled={submitting}
                              />
                            </label>
                          </div>
                          {bpValue === CUSTOM_PART && (
                            <input
                              type="text"
                              value={study.customPart}
                              onChange={(e) => updateStudy(study.key, { customPart: e.target.value })}
                              placeholder="e.g. LEFT WRIST AP"
                              style={fieldStyle}
                              data-testid="custom-part"
                            />
                          )}
                        </div>

                        {/* Views */}
                        <div className="flex flex-wrap gap-1.5 min-w-0 flex-1 order-first sm:order-1">
                          {study.views.map((f) => renderThumb(f, () => removeView(study.key, f.key), study.views))}
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => {
                              activeStudyKey.current = study.key;
                              studyFileRefs.current[study.key]?.click();
                            }}
                            className={`${study.views.length ? 'w-16 h-16 flex-col shrink-0' : 'flex-1 h-16 flex-row gap-2.5 sm:flex-none sm:w-28 sm:h-24 sm:flex-col sm:gap-1 border-[#009ef7]/50 bg-sky-50/60 text-[#0284c7]'} rounded-xl border-2 border-dashed hover:border-[#009ef7] hover:bg-sky-50 active:border-[#009ef7] hover:text-[#009ef7] flex items-center justify-center gap-1 transition-colors ${study.views.length ? 'border-slate-300 bg-white text-slate-500' : ''}`}
                            data-testid="add-view"
                            title={study.views.length ? 'Add view' : 'Upload image'}
                          >
                            {study.views.length ? <ImagePlus className="w-5 h-5" /> : <UploadCloud className="w-7 h-7" />}
                            <span className={`${study.views.length ? 'text-[10px]' : 'text-[16px] sm:text-[10px]'} font-bold leading-none text-center`}>
                              {study.views.length ? 'Add view' : 'Upload image'}
                            </span>
                          </button>
                          {/* t103: camera "Take photo" tile removed; Upload image is the only media control */}
                        </div>
                      </div>

                      <input
                        ref={(el) => {
                          studyFileRefs.current[study.key] = el;
                        }}
                        type="file"
                        multiple
                        accept={ACCEPT}
                        className="hidden"
                        onChange={(e) => {
                          pickFilesInto(e.target.files, study.key);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  );
                })}

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setStudies((prev) => [...prev, newStudy(prev[prev.length - 1]?.studyDate)])}
                  className="w-full h-9 min-h-0 rounded-lg border border-dashed border-slate-300 hover:border-[#009ef7] active:border-[#009ef7] text-[13px] sm:text-[12px] font-bold text-slate-700 hover:text-[#009ef7] inline-flex items-center justify-center gap-1.5 bg-white"
                  data-testid="add-study"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Another Study
                </button>
                <FieldError msg={errors.studies} />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    pickFilesInto(e.target.files, activeStudyKey.current || studies[0]?.key || 'edit');
                    e.target.value = '';
                  }}
                />
              </section>
            )}
            {/* Edit: add more images */}
            {isEdit && (
              <section data-field="scans">
                <FieldLabel>Add more images</FieldLabel>
                {existingImages.length > 0 && (
                  <div className="mb-1.5 flex items-center gap-1.5 overflow-x-auto" data-testid="existing-images">
                    {existingImages.slice(0, 8).map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={resolveMediaUrl(src)}
                        alt=""
                        className="w-12 h-12 rounded-md object-cover border border-slate-200 shrink-0"
                      />
                    ))}
                    <span className="text-[11px] text-slate-500 shrink-0">{existingImages.length} on file</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {extraScans.map((f) =>
                    renderThumb(f, () => setExtraScans((prev) => prev.filter((p) => p.key !== f.key)), extraScans),
                  )}
                  <button
                    type="button"
                    onClick={() => editScanRef.current?.click()}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 flex flex-col items-center justify-center gap-0.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[9px] font-bold">Add</span>
                  </button>
                </div>
                <input
                  ref={editScanRef}
                  type="file"
                  multiple
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    pickFilesInto(e.target.files, 'edit');
                    e.target.value = '';
                  }}
                />
              </section>
            )}

            {/* Patient */}
            <section className="space-y-2 sm:space-y-2.5">
              <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2" data-testid="row-id-name" data-field="patientId">
                <div className="min-w-0">
                  <FieldLabel htmlFor="up-cpid">Centre Patient ID</FieldLabel>
                  <input
                    id="up-cpid"
                    type="text"
                    autoComplete="off"
                    value={centerPatientId}
                    readOnly={isEdit}
                    onChange={(e) => setCenterPatientId(e.target.value.slice(0, 40))}
                    placeholder="Optional"
                    title="The centre's own patient / registration number"
                    style={isEdit ? { ...compactField, background: '#f1f5f9', color: '#334155' } : compactField}
                    className="font-mono"
                    data-testid="center-patient-id-input"
                  />
                </div>
                {/* System Patient ID is internal (reports / print only); not shown in the upload form. */}
                <div
                  data-field="fullName"
                  className="min-w-0"
                >
                  <FieldLabel required htmlFor="up-name">
                    Patient Name
                  </FieldLabel>
                  <input
                    id="up-name"
                    type="text"
                    autoComplete="off"
                    value={fullName}
                    readOnly={isEdit}
                    title={isEdit ? 'Patient name cannot be changed here' : undefined}
                    onChange={(e) => {
                      if (isEdit) return;
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((x) => ({ ...x, fullName: '' }));
                    }}
                    placeholder="Patient full name"
                    style={
                      isEdit
                        ? { ...compactField, background: '#f1f5f9', color: '#334155', cursor: 'not-allowed' }
                        : errors.fullName
                        ? compactFieldError
                        : compactField
                    }
                    data-testid="patient-name"
                  />
                  <FieldError msg={errors.fullName} />
                </div>
              </div>
              {/* Age + Gender + Patient History on one line (stacks on phones) */}
              <div className="grid grid-cols-1 md:grid-cols-[auto_minmax(0,1fr)] gap-x-2.5 gap-y-2 items-start" data-testid="row-age-history">
                <div className="min-w-0">
                  <PatientAgeGender
                    ageY={ageY}
                    ageM={ageM}
                    ageD={ageD}
                    setAgeY={setAgeY}
                    setAgeM={setAgeM}
                    setAgeD={setAgeD}
                    gender={gender}
                    setGender={setGender}
                    ageError={errors.age}
                    genderError={errors.gender}
                    clearAgeError={() => setErrors((x) => ({ ...x, age: '' }))}
                    clearGenderError={() => setErrors((x) => ({ ...x, gender: '' }))}
                    disabled={submitting}
                  />
                </div>

              <div data-field="attachments" className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor="up-notes">Patient History</FieldLabel>
                  {!isEdit && (
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] text-slate-400">max 5 MB</span>
                      <button
                        type="button"
                        onClick={() => slipInputRef.current?.click()}
                        disabled={submitting}
                        className="h-6 min-h-0 px-2 rounded-md border border-[#009ef7] text-[#009ef7] text-[11px] font-semibold hover:bg-[#009ef7]/5 disabled:opacity-40 inline-flex items-center gap-1"
                        data-testid="add-attachment"
                      >
                        <Paperclip className="w-3 h-3" /> Attach reports
                      </button>
                    </div>
                  )}
                </div>
                <textarea
                  id="up-notes"
                  rows={1}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Symptoms, history, reason for scan"
                  style={compactArea}
                />
                {!isEdit && slips.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {slips.map((f) => (
                      <span
                        key={f.key}
                        className="inline-flex items-center gap-1 h-6 max-w-[180px] pl-2 pr-1 rounded-md border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-700"
                        data-testid="attachment-chip"
                      >
                        <FileText className="w-3 h-3 shrink-0 text-slate-400" />
                        <span className="truncate">{f.name}</span>
                        {submitting ? (
                          <span className="text-[10px] text-slate-400">{Math.round(f.progress * 100)}%</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSlips((prev) => prev.filter((p) => p.key !== f.key))}
                            aria-label={`Remove ${f.name}`}
                            className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-rose-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                {!isEdit && (
                  <input
                    ref={slipInputRef}
                    type="file"
                    multiple
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      pickFilesInto(e.target.files, 'slip');
                      e.target.value = '';
                    }}
                  />
                )}
              </div>
              </div>

              <div className="flex flex-row items-end gap-2 sm:gap-3">
                <div className={`flex-1 min-w-0 sm:max-w-sm ${isEdit ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : ''}`}>
                  <div>
                    <FieldLabel htmlFor="up-ref">Referring Physician</FieldLabel>
                    <input
                      id="up-ref"
                      type="text"
                      value={referringDoctor}
                      onChange={(e) => setReferringDoctor(e.target.value)}
                      placeholder="Name only (Dr. is added)"
                      list="up-ref-list"
                      autoComplete="off"
                      style={compactField}
                    />
                    <datalist id="up-ref-list">
                      {referrers.map((r) => <option key={r.name} value={stripDr(r.name)} />)}
                    </datalist>
                    {hasDrPrefix(referringDoctor) && (
                      <div className="mt-1 text-[11px] font-semibold text-amber-700" data-testid="dr-hint">{DR_HINT}</div>
                    )}
                    {!isEdit && referringDoctor.trim() && !referrers.some((r) => stripDr(r.name).toUpperCase() === stripDr(referringDoctor).toUpperCase()) && (
                      <div className="mt-1.5 space-y-1 text-[11px] text-slate-700" data-testid="new-referrer">
                        <label className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={saveReferrer} onChange={(e) => setSaveReferrer(e.target.checked)} className="accent-[#009ef7]" data-testid="save-referrer" />
                          Save as new referring doctor
                        </label>
                        {saveReferrer && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input type="checkbox" checked={refHasCut} onChange={(e) => setRefHasCut(e.target.checked)} className="accent-[#009ef7]" data-testid="referrer-cut" />
                              Referral cut
                            </label>
                            {refHasCut && (
                              <>
                                <select value={refCutType} onChange={(e) => setRefCutType(e.target.value as 'percent' | 'fixed')} className="h-6 border border-slate-300 rounded px-1 text-[11px]" aria-label="Cut type">
                                  <option value="percent">%</option>
                                  <option value="fixed">{'\u20B9'} fixed</option>
                                </select>
                                <input type="number" min={0} max={refCutType === 'percent' ? 100 : undefined} value={refCutValue} onChange={(e) => setRefCutValue(e.target.value)} placeholder={refCutType === 'percent' ? 'e.g. 10' : 'e.g. 50'} className="h-6 w-20 border border-slate-300 rounded px-1 text-[11px]" aria-label="Cut value" data-testid="referrer-cut-value" />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {isEdit && (
                    <div>
                      <FieldLabel htmlFor="up-phone">Patient mobile</FieldLabel>
                      <input
                        id="up-phone"
                        type="text"
                        inputMode="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Mobile number"
                        style={compactField}
                      />
                    </div>
                  )}
                </div>
                {!isEdit && (
                <div className="flex items-center gap-2 sm:gap-3 h-8 shrink-0">
                  <label className="inline-flex items-center gap-2 h-7 text-[13px] font-semibold text-slate-800 cursor-pointer" data-testid="urgent-toggle">
                    <input
                      type="checkbox"
                      checked={isUrgent}
                      onChange={(e) => setIsUrgent(e.target.checked)}
                      className="w-4 h-4 accent-rose-500"
                    />
                    Urgent
                  </label>
                  <label className="inline-flex items-center gap-2 h-7 text-[13px] font-semibold text-slate-800 cursor-pointer" data-testid="portable-toggle">
                    <input
                      type="checkbox"
                      checked={isPortable}
                      onChange={(e) => setIsPortable(e.target.checked)}
                      className="w-4 h-4 accent-[#009ef7]"
                    />
                    Portable
                  </label>
                </div>
                )}
              </div>

              {!isEdit && (
                <div className={`grid gap-1.5 ${showCenterPicker ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
                  {showCenterPicker && (
                    <div data-field="center" className="col-span-2 sm:col-span-1">
                      <FieldLabel required htmlFor="up-center">
                        Centre
                      </FieldLabel>
                      <select
                        id="up-center"
                        value={centerId}
                        onChange={(e) => {
                          setCenterId(e.target.value);
                          setErrors((x) => ({ ...x, center: '' }));
                        }}
                        style={errors.center ? compactFieldError : compactField}
                        data-testid="center-select"
                      >
                        <option value="">Choose centre…</option>
                        {centers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.centerName}
                          </option>
                        ))}
                      </select>
                      <FieldError msg={errors.center} />
                    </div>
                  )}
                  <div data-field="modality">
                    <FieldLabel htmlFor="up-modality">Modality</FieldLabel>
                    <select
                      id="up-modality"
                      value={modality}
                      onChange={(e) => setModality(e.target.value)}
                      style={errors.modality ? compactFieldError : compactField}
                      data-testid="modality"
                    >
                      {modalityChoices.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <FieldLabel htmlFor="up-send">Send to</FieldLabel>
                    <select
                      id="up-send"
                      value={sendTo}
                      onChange={(e) => setSendTo(e.target.value)}
                      style={compactField}
                      data-testid="send-to"
                    >
                      <option value="ALL">All radiologists</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {cleanDr(d.fullName)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

            </section>
          </div>
        </form>

        <div
          className="shrink-0 border-t border-slate-100 bg-white/95 backdrop-blur px-3 pt-2 sm:pt-1.5 shadow-[0_-4px_16px_-8px_rgba(15,23,42,0.15)] sm:shadow-none"
          style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
        >
          {submitting && uploadPct !== null && (
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2" data-testid="upload-progress">
              <div className="h-full bg-[#009ef7] transition-all" style={{ width: `${uploadPct}%` }} />
            </div>
          )}
          <div className="sm:hidden text-center text-[11px] text-slate-500 mb-1.5 truncate" data-testid="upload-status-mobile">{footerStatus}</div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              form="upload-image-form"
              disabled={submitting || preparing}
              className="h-12 sm:h-8 flex-1 sm:flex-none justify-center px-4 rounded-xl sm:rounded-lg bg-[#009ef7] hover:bg-[#008be0] disabled:opacity-60 text-white text-[15px] sm:text-[13px] font-semibold inline-flex items-center gap-2 sm:gap-1.5 shrink-0 shadow-[0_6px_16px_-6px_rgba(0,158,247,0.6)] sm:shadow-none"
              data-testid="upload-submit"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? <Check className="w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
              {isEdit ? 'Save' : 'Send for Reporting'}
            </button>
            <span className="hidden sm:block text-[12px] text-slate-500 flex-1 min-w-0 truncate text-right" data-testid="upload-status">
              {footerStatus}
            </span>
          </div>
        </div>
      </div>
      {lightboxEl}
    </div>
  );
}
