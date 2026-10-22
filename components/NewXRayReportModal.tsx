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
import { ApiClient, apiErrorMessage, isPendingApproval, resolveMediaUrl } from '@/lib/api-client';
import { centerIdsWith } from '@/lib/access';
import { generateUUID, isUUID } from '@/lib/uuid';

/** Payload handed to the page on create (same contract as before, plus the case id the files were stored under). */
export type NewCasePayload = Omit<XRayReport, 'createdAt'> & {
  studyUploads?: { bodyPart: string; images: string[] }[];
};

interface NewXRayReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (report: NewCasePayload) => Promise<void> | void;
  initialReport?: XRayReport | null;
  onUpdated?: (result: { pending: boolean; message: string; report?: XRayReport }) => void;
}

export const STUDY_MODALITY_OPTIONS = ['X-Ray', 'CT', 'MRI', 'Sonography', 'Blood Report'] as const;

const BODY_PART_OPTIONS = [
  'CHEST PA/AP',
  'KNEE JOINT AP/LAT',
  'LUMBAR SPINE AP/LAT',
  'CERVICAL SPINE AP/LAT',
  'PELVIS WITH BOTH HIPS',
  'SKULL AP/LAT',
  'SHOULDER JOINT AP',
  'ABDOMEN ERECT/SUPINE',
  'FOOT AP/OBLIQUE',
  'HAND AP/OBLIQUE',
];

const LAST_CENTER_KEY = 'radionline_last_upload_center';
const LAST_MODALITIES_KEY = 'radionline_recent_modalities';
const ACCEPT = 'image/*,.dcm,application/dicom,application/pdf';
const CUSTOM_PART = '__custom__';

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
  bodyPart: string;
  customPart: string;
  views: PickedFile[];
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 10px',
  fontSize: 16, // 16px avoids iOS zoom-on-focus
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
};
const fieldErrorStyle: React.CSSProperties = { ...fieldStyle, border: '1px solid #f43f5e' };
const areaStyle: React.CSSProperties = {
  ...fieldStyle,
  height: 'auto',
  minHeight: 72,
  padding: '10px',
  lineHeight: 1.35,
  fontSize: 16,
};

function fileKind(file: File): PickedFile['kind'] | null {
  const n = file.name.toLowerCase();
  if (file.type.startsWith('image/')) return 'image';
  if (n.endsWith('.dcm') || file.type === 'application/dicom') return 'dicom';
  if (file.type === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  return null;
}

function compressImage(file: File, maxSide = 1200, quality = 0.8): Promise<Blob> {
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
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return resolve(file);
      }
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

function newStudy(): StudyDraft {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, bodyPart: '', customPart: '', views: [] };
}

function resolvedBodyPart(s: StudyDraft): string {
  if (s.bodyPart === CUSTOM_PART) return s.customPart.trim().toUpperCase();
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
    <label htmlFor={htmlFor} className="block text-[11px] font-semibold text-slate-600 mb-1">
      {children}
      {required && <span className="text-rose-500"> *</span>}
    </label>
  );
}

const compactField: React.CSSProperties = { ...fieldStyle, height: 36, fontSize: 14 };
const compactFieldError: React.CSSProperties = { ...compactField, border: '1px solid #f43f5e' };
const compactArea: React.CSSProperties = { ...compactField, height: 'auto', minHeight: 52, padding: '7px 10px', lineHeight: 1.35, resize: 'vertical' };
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
  const [fullName, setFullName] = useState('');
  const [ageY, setAgeY] = useState<string>('');
  const [ageM, setAgeM] = useState<string>('');
  const [ageD, setAgeD] = useState<string>('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [studyDate, setStudyDate] = useState<string>(todayIso());
  const [centerId, setCenterId] = useState('');
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
              customPart: '',
              views: [],
            }))
          : [newStudy()],
      );
      setIsUrgent(!!initialReport.isUrgent);
      setIsPortable(!!initialReport.isPortable);
      setReferringDoctor(initialReport.referringPhysicianName || '');
      setPhone(initialReport.phone || '');
      setNotes(initialReport.clinicalNotes || '');
      setSendTo(initialReport.assignedDoctorIds?.[0] || initialReport.assignedDoctorId || 'ALL');
      setStudyDate(toIsoDate(initialReport.studyDate) || todayIso());
    } else {
      setCaseId(generateUUID());
      setStudyDate(todayIso());
      setPatientNumber('');
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
      setStudies((prev) =>
        prev.map((s) => (s.key === studyKey ? { ...s, views: [...s.views, ...picked] } : s)),
      );
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
    else if (badInt(ageY, 150)) e.age = 'Years must be 0–150';
    else if (badInt(ageM, 11)) e.age = 'Months must be 0–11';
    else if (badInt(ageD, 31)) e.age = 'Days must be 0–31';
    if (!gender) e.gender = 'Choose gender';
    if (!isoToDDMMYYYY(studyDate)) e.studyDate = 'Choose the study date';
    if (!isEdit) {
      if (!centerId) e.center = 'Choose the centre';
      if (!modality) e.modality = 'Choose modality';
      if (readyStudies.length === 0) e.studies = 'Add at least one study with a body part and an image';
      else {
        const parts = readyStudies.map(resolvedBodyPart);
        if (new Set(parts).size !== parts.length) e.studies = 'Each study needs a different body part';
        for (const s of studies) {
          if (s.views.length > 0 && !resolvedBodyPart(s)) {
            e.studies = 'Choose a body part for every study that has images';
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
          referringPhysicianName: referringDoctor.trim(),
          clinicalNotes: notes,
          isUrgent,
          isPortable,
          studyDate: isoToDDMMYYYY(studyDate) || undefined,
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

      const studyUploads: { bodyPart: string; images: string[] }[] = [];
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
        studyUploads.push({ bodyPart: resolvedBodyPart(s), images: paths });
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

      await onSave({
        id: caseId,
        fullName: fullName.trim().toUpperCase(),
        patientNumber: patientNumber.trim(),
        gender: gender as Gender,
        age: derivedAge,
        ageUnit,
        ...ageParts,
        phone: phone.trim(),
        radiologyCenterId: centerId,
        radiologyCenterName: center ? center.centerName : 'RADIOLOGY CENTER',
        referringPhysicianId: 'ref-doc-1',
        referringPhysicianName: referringDoctor.trim().toUpperCase(),
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
        studyDate: isoToDDMMYYYY(studyDate) || todayDDMMYYYY(),
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

  const renderThumb = (f: PickedFile, onRemove?: () => void) => (
    <div
      key={f.key}
      className="relative rounded-lg border border-slate-200 bg-slate-50 overflow-hidden w-[4.5rem] h-[4.5rem] sm:w-16 sm:h-16 shrink-0"
      data-testid="upload-thumb"
    >
      {f.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={f.previewUrl} alt={f.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 p-1 text-slate-500">
          <FileText className="w-4 h-4" />
          <span className="text-[9px] font-bold uppercase">{f.kind === 'dicom' ? 'DCM' : 'PDF'}</span>
        </div>
      )}
      {!submitting && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${f.name}`}
          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white flex items-center justify-center"
        >
          <X className="w-3 h-3" />
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
      ...BODY_PART_OPTIONS,
      ...studies.map(resolvedBodyPart).filter(Boolean),
      ...(initialReport?.bodyParts || []),
    ]),
  );

  const genderOptions: { value: Gender; label: string }[] = [
    { value: 'Male', label: 'M' },
    { value: 'Female', label: 'F' },
    { value: 'Other', label: 'Other' },
  ];
  const ageBox = (id: string, val: string, set: (v: string) => void, unit: string, max: number, testId?: string) => (
    <div className="relative flex-1 min-w-0">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={val}
        onChange={(e) => {
          set(e.target.value.replace(/[^\d]/g, '').slice(0, max > 99 ? 3 : 2));
          if (errors.age) setErrors((x) => ({ ...x, age: '' }));
        }}
        placeholder="0"
        aria-label={unit === 'Y' ? 'Age years' : unit === 'M' ? 'Age months' : 'Age days'}
        style={{ ...(errors.age ? compactFieldError : compactField), paddingRight: 26 }}
        data-testid={testId}
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">{unit}</span>
    </div>
  );
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
        <div className="flex items-center gap-2 px-2 sm:px-4 py-2 border-b border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Back"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 shrink-0"
            data-testid="upload-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 id="upload-dialog-title" className="text-[16px] sm:text-[17px] font-bold text-slate-900 leading-tight truncate">
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
              className="h-8 px-3 rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 inline-flex items-center gap-1 shrink-0"
              data-testid="upload-clear"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        <form id="upload-image-form" noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-3 sm:px-4 py-2.5 space-y-2.5">
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
                <div className="flex flex-wrap gap-1">
                  {(initialReport?.bodyParts || []).map((bp) => (
                    <span key={bp} className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold">
                      {bp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Studies */}
            {!isEdit && (
              <section className="space-y-2" data-field="studies">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel required>Studies</FieldLabel>
                  <span className="text-[11px] font-semibold text-slate-500" data-testid="report-count">
                    {reportCount} report{reportCount === 1 ? '' : 's'} will be created
                  </span>
                </div>

                {studies.map((study, idx) => {
                  const bpValue = study.bodyPart;
                  return (
                    <div
                      key={study.key}
                      className="rounded-xl border border-slate-200 bg-slate-50/40 p-2.5 space-y-2"
                      data-testid="study-card"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          Study {idx + 1}
                        </span>
                        {studies.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStudy(study.key)}
                            className="text-[11px] font-semibold text-rose-600 hover:underline"
                            disabled={submitting}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 sm:items-start">
                        {/* Body part — full width on phone, side column on tablet+ */}
                        <div className="w-full sm:w-[42%] sm:max-w-[220px] sm:order-2 shrink-0 space-y-1.5">
                          <select
                            value={bpValue}
                            onChange={(e) =>
                              updateStudy(study.key, {
                                bodyPart: e.target.value,
                                customPart: e.target.value === CUSTOM_PART ? study.customPart : '',
                              })
                            }
                            style={fieldStyle}
                            data-testid="body-part-select"
                            disabled={submitting}
                          >
                            <option value="">Body part…</option>
                            {bodyPartOptions.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                            <option value={CUSTOM_PART}>+ Add body part…</option>
                          </select>
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
                        <div className="flex flex-wrap gap-1.5 min-w-0 flex-1 sm:order-1">
                          {study.views.map((f) => renderThumb(f, () => removeView(study.key, f.key)))}
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => {
                              activeStudyKey.current = study.key;
                              studyFileRefs.current[study.key]?.click();
                            }}
                            className="w-[4.5rem] h-[4.5rem] sm:w-16 sm:h-16 rounded-lg border-2 border-dashed border-slate-300 hover:border-[#009ef7] active:border-[#009ef7] text-slate-500 hover:text-[#009ef7] flex flex-col items-center justify-center gap-0.5 bg-white shrink-0"
                            data-testid="add-view"
                            title={study.views.length ? 'Add view' : 'Upload image'}
                          >
                            {study.views.length ? <ImagePlus className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
                            <span className="text-[10px] font-bold leading-tight text-center px-0.5">
                              {study.views.length ? 'Add view' : 'Upload'}
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => {
                              activeStudyKey.current = study.key;
                              cameraInputRef.current?.click();
                            }}
                            className="md:hidden w-[4.5rem] h-[4.5rem] sm:w-16 sm:h-16 rounded-lg border border-slate-300 text-slate-600 flex flex-col items-center justify-center gap-0.5 bg-white shrink-0"
                          >
                            <Camera className="w-5 h-5" />
                            <span className="text-[10px] font-bold">Photo</span>
                          </button>
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
                  onClick={() => setStudies((prev) => [...prev, newStudy()])}
                  className="w-full h-10 sm:h-9 rounded-lg border border-dashed border-slate-300 hover:border-[#009ef7] active:border-[#009ef7] text-[13px] sm:text-[12px] font-bold text-slate-700 hover:text-[#009ef7] inline-flex items-center justify-center gap-1.5 bg-white"
                  data-testid="add-study"
                >
                  <Plus className="w-4 h-4" />
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
                    renderThumb(f, () => setExtraScans((prev) => prev.filter((p) => p.key !== f.key))),
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
            <section className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-[150px_minmax(0,1fr)_150px] gap-2">
                <div data-field="patientNumber">
                  <FieldLabel htmlFor="up-pid">Patient ID</FieldLabel>
                  <input
                    id="up-pid"
                    type="text"
                    autoComplete="off"
                    value={isUUID(patientNumber) ? '' : patientNumber}
                    onChange={(e) => setPatientNumber(e.target.value.slice(0, 40))}
                    readOnly={isEdit}
                    placeholder="Optional"
                    style={isEdit ? { ...compactField, background: '#f8fafc', color: '#64748b' } : compactField}
                    data-testid="patient-id"
                  />
                </div>
                <div data-field="fullName" className="col-span-2 sm:col-span-1 order-last sm:order-none">
                  <FieldLabel required htmlFor="up-name">
                    Patient Name
                  </FieldLabel>
                  <input
                    id="up-name"
                    type="text"
                    autoComplete="off"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((x) => ({ ...x, fullName: '' }));
                    }}
                    placeholder="Patient full name"
                    style={errors.fullName ? compactFieldError : compactField}
                    data-testid="patient-name"
                  />
                  <FieldError msg={errors.fullName} />
                </div>
                <div data-field="studyDate">
                  <FieldLabel required htmlFor="up-study-date">
                    Study Date
                  </FieldLabel>
                  <input
                    id="up-study-date"
                    type="date"
                    value={studyDate}
                    max={todayIso()}
                    onChange={(e) => {
                      setStudyDate(e.target.value);
                      if (errors.studyDate) setErrors((x) => ({ ...x, studyDate: '' }));
                    }}
                    style={{ ...(errors.studyDate ? compactFieldError : compactField), padding: '0 6px' }}
                    data-testid="study-date"
                  />
                  <FieldError msg={errors.studyDate} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div data-field="age">
                  <FieldLabel required htmlFor="up-age">
                    Age
                  </FieldLabel>
                  <div className="flex gap-1.5">
                    {ageBox('up-age', ageY, setAgeY, 'Y', 150, 'patient-age')}
                    {ageBox('up-age-m', ageM, setAgeM, 'M', 11, 'patient-age-months')}
                    {ageBox('up-age-d', ageD, setAgeD, 'D', 31, 'patient-age-days')}
                  </div>
                  <FieldError msg={errors.age} />
                </div>
                <div data-field="gender">
                  <FieldLabel required>Gender</FieldLabel>
                  <div
                    role="radiogroup"
                    aria-label="Gender"
                    className={`flex rounded-lg border overflow-hidden ${errors.gender ? 'border-rose-400' : 'border-slate-300'}`}
                    data-testid="patient-gender"
                  >
                    {genderOptions.map((g, i) => {
                      const on = gender === g.value;
                      return (
                        <button
                          key={g.value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => {
                            setGender(g.value);
                            if (errors.gender) setErrors((x) => ({ ...x, gender: '' }));
                          }}
                          className={`flex-1 h-9 text-[13px] font-semibold transition-colors ${i > 0 ? 'border-l border-slate-300' : ''} ${
                            on ? 'bg-[#009ef7] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                          data-testid={`gender-${g.label.toLowerCase()}`}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                  <FieldError msg={errors.gender} />
                </div>
              </div>

              <div data-field="attachments">
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor="up-notes">Patient History</FieldLabel>
                  {!isEdit && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] text-slate-400">max 5 MB</span>
                      <button
                        type="button"
                        onClick={() => slipInputRef.current?.click()}
                        disabled={submitting}
                        className="h-6 px-2 rounded-md border border-[#009ef7] text-[#009ef7] text-[11px] font-semibold hover:bg-[#009ef7]/5 disabled:opacity-40 inline-flex items-center gap-1"
                        data-testid="add-attachment"
                      >
                        <Paperclip className="w-3 h-3" /> Attach reports
                      </button>
                    </div>
                  )}
                </div>
                <textarea
                  id="up-notes"
                  rows={2}
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
                        className="inline-flex items-center gap-1 h-7 max-w-[180px] pl-2 pr-1 rounded-md border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-700"
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

              <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-4">
                <div className={`w-full md:w-1/2 lg:max-w-sm ${isEdit ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : ''}`}>
                  <div>
                    <FieldLabel htmlFor="up-ref">Referring Physician</FieldLabel>
                    <input
                      id="up-ref"
                      type="text"
                      value={referringDoctor}
                      onChange={(e) => setReferringDoctor(e.target.value)}
                      placeholder="Dr. name"
                      style={compactField}
                    />
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
                <div className="flex items-center gap-4 md:h-9">
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
              </div>

              {!isEdit && (
                <div className={`grid gap-2 ${showCenterPicker ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
                  {showCenterPicker && (
                    <div data-field="center">
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
                          {d.fullName}
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
          className="shrink-0 border-t border-slate-100 bg-white px-3 sm:px-4 py-2"
          style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
        >
          {submitting && uploadPct !== null && (
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2" data-testid="upload-progress">
              <div className="h-full bg-[#009ef7] transition-all" style={{ width: `${uploadPct}%` }} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              form="upload-image-form"
              disabled={submitting || preparing}
              className="h-10 sm:h-9 px-4 sm:px-5 rounded-lg bg-[#009ef7] hover:bg-[#008be0] disabled:opacity-60 text-white text-[14px] sm:text-[13px] font-semibold inline-flex items-center gap-1.5 shrink-0"
              data-testid="upload-submit"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? <Check className="w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
              {isEdit ? 'Save' : 'Send for Reporting'}
            </button>
            <span className="text-[11px] sm:text-[12px] text-slate-500 flex-1 min-w-0 truncate text-right" data-testid="upload-status">
              {footerStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
