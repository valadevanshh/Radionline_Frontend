'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  UploadCloud,
  Camera,
  FileText,
  Trash2,
  AlertTriangle,
  ChevronDown,
  Check,
  Loader2,
  Plus,
  Building2,
  Zap,
} from 'lucide-react';
import { RadiologyStore, XRayReport, Doctor, RadiologyCenter } from '@/lib/radiology-store';
import { ApiClient, apiErrorMessage, isPendingApproval, resolveMediaUrl } from '@/lib/api-client';
import { centerIdsWith } from '@/lib/access';
import { generateUUID, isUUID } from '@/lib/uuid';

/** Payload handed to the page on create (same contract as before, plus the case id the files were stored under). */
export type NewCasePayload = Omit<XRayReport, 'createdAt'>;

interface NewXRayReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Create mode: the page saves it (or submits it for approval). Throw to keep the dialog open. */
  onSave: (report: NewCasePayload) => Promise<void> | void;
  /** Edit mode: the patient record to correct (row Edit action). */
  initialReport?: XRayReport | null;
  /** Edit mode: called after a successful save / approval request. */
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
const ACCEPT = 'image/*,.dcm,application/dicom,application/pdf';

type Gender = 'Male' | 'Female' | 'Other';
type AgeUnit = 'Years' | 'Months' | 'Days';

interface PickedFile {
  key: string;
  name: string;
  blob: Blob;
  previewUrl: string | null; // object URL for images
  kind: 'image' | 'dicom' | 'pdf';
  progress: number; // 0..1 while uploading
  storedPath?: string; // after upload
  error?: string;
}

// Global CSS sizes inputs (unlayered), so the form controls get their size inline.
const fieldStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 12px',
  fontSize: 16,
  borderRadius: 12,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
};
const fieldErrorStyle: React.CSSProperties = { ...fieldStyle, border: '1px solid #f43f5e' };
const areaStyle: React.CSSProperties = { ...fieldStyle, height: 'auto', minHeight: 84, padding: '10px 12px', lineHeight: 1.4 };

function fileKind(file: File): PickedFile['kind'] | null {
  const n = file.name.toLowerCase();
  if (file.type.startsWith('image/')) return 'image';
  if (n.endsWith('.dcm') || file.type === 'application/dicom') return 'dicom';
  if (file.type === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  return null;
}

/** Same image handling as before: photos/scans larger than 1200px are scaled down to a JPEG (quality 0.8). */
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

function Segmented<T extends string>({
  value,
  options,
  onChange,
  testId,
  invalid,
}: {
  value: T | '';
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  testId?: string;
  invalid?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      data-testid={testId}
      className={`grid gap-1 p-1 rounded-xl bg-slate-100 border ${invalid ? 'border-rose-400' : 'border-slate-200'}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`h-9 rounded-lg text-[13px] font-semibold transition-colors truncate px-1 ${
              active ? 'bg-white text-[#0072b8] shadow-sm ring-1 ring-[#009ef7]/40' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function FieldLabel({ children, required, htmlFor }: { children: React.ReactNode; required?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-slate-700 mb-1.5">
      {children}
      {required && <span className="text-rose-500"> *</span>}
    </label>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-[12px] font-medium text-rose-600">{msg}</p>;
}

export default function NewXRayReportModal({ isOpen, onClose, onSave, initialReport, onUpdated }: NewXRayReportModalProps) {
  const isEdit = !!initialReport;

  const [caseId, setCaseId] = useState('');
  const [patientNumber, setPatientNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState<string>('');
  const [ageUnit, setAgeUnit] = useState<AgeUnit>('Years');
  const [gender, setGender] = useState<Gender | ''>('');
  const [centerId, setCenterId] = useState('');
  const [modality, setModality] = useState<string>('X-Ray');
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [customPart, setCustomPart] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isPortable, setIsPortable] = useState(false);
  const [referringDoctor, setReferringDoctor] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [doctorIds, setDoctorIds] = useState<string[]>(['ALL']);
  const [moreOpen, setMoreOpen] = useState(false);

  const [scans, setScans] = useState<PickedFile[]>([]);
  const [slips, setSlips] = useState<PickedFile[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [centers, setCenters] = useState<RadiologyCenter[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const slipInputRef = useRef<HTMLInputElement | null>(null);
  const objectUrls = useRef<string[]>([]);

  const session = typeof window !== 'undefined' ? RadiologyStore.getSession() : null;

  // Reset every time the dialog opens
  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setFormError(null);
    setSubmitting(false);
    setUploadPct(null);
    setScans([]);
    setSlips([]);
    setCustomPart('');
    setDragOver(false);
    if (initialReport) {
      setCaseId(initialReport.id);
      setPatientNumber(initialReport.patientNumber || '');
      setFullName(initialReport.fullName || '');
      setAge(initialReport.age !== undefined && initialReport.age !== null ? String(initialReport.age) : '');
      setAgeUnit((initialReport.ageUnit as AgeUnit) || 'Years');
      setGender(((initialReport.gender as Gender) || '') as Gender | '');
      setCenterId(initialReport.radiologyCenterId || '');
      setModality(initialReport.modality || 'X-Ray');
      setBodyParts(initialReport.bodyParts || []);
      setIsUrgent(!!initialReport.isUrgent);
      setIsPortable(!!initialReport.isPortable);
      setReferringDoctor(initialReport.referringPhysicianName || '');
      setPhone(initialReport.phone || '');
      setNotes(initialReport.clinicalNotes || '');
      setDoctorIds(initialReport.assignedDoctorIds?.length ? initialReport.assignedDoctorIds : ['ALL']);
      setMoreOpen(true);
    } else {
      setCaseId(generateUUID());
      setPatientNumber('');
      setFullName('');
      setAge('');
      setAgeUnit('Years');
      setGender('');
      setModality('X-Ray');
      setBodyParts([]);
      setIsUrgent(false);
      setIsPortable(false);
      setReferringDoctor('');
      setPhone('');
      setNotes('');
      setDoctorIds(['ALL']);
      setMoreOpen(false);
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
      // Centre logins may only upload where they have Reports = write
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

  // Free thumbnail object URLs when the dialog closes
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

  if (!isOpen) return null;

  const addFiles = async (files: FileList | File[] | null, target: 'scan' | 'slip') => {
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
      const blob = kind === 'image' ? await compressImage(f) : f;
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
    if (target === 'scan') setScans((prev) => [...prev, ...picked]);
    else setSlips((prev) => [...prev, ...picked]);
    if (picked.length && target === 'scan') setErrors((e) => ({ ...e, scans: '' }));
    if (rejected.length) setFormError(`Not added (use an image, DICOM .dcm or PDF): ${rejected.join(', ')}`);
    setPreparing(false);
  };

  const removeFile = (key: string, target: 'scan' | 'slip') => {
    const setter = target === 'scan' ? setScans : setSlips;
    setter((prev) => prev.filter((p) => p.key !== key));
  };

  const togglePart = (p: string) => {
    if (isEdit) return;
    setBodyParts((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
    setErrors((e) => ({ ...e, bodyParts: '' }));
  };

  const addCustomPart = () => {
    const v = customPart.trim().toUpperCase();
    if (!v) return;
    if (!bodyParts.includes(v)) setBodyParts((prev) => [...prev, v]);
    setCustomPart('');
    setErrors((e) => ({ ...e, bodyParts: '' }));
  };

  const toggleDoctor = (id: string) => {
    if (id === 'ALL') return setDoctorIds(['ALL']);
    setDoctorIds((prev) => {
      let next = prev.filter((x) => x !== 'ALL');
      next = next.includes(id) ? next.filter((x) => x !== id) : [...next, id];
      return next.length ? next : ['ALL'];
    });
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Enter the patient name';
    const n = Number(age);
    if (age.trim() === '' || !Number.isFinite(n) || n < 0 || n > 150 || !Number.isInteger(n)) e.age = 'Enter age (0–150)';
    if (!gender) e.gender = 'Choose gender';
    if (!isEdit) {
      if (!centerId) e.center = 'Choose the centre';
      if (!modality) e.modality = 'Choose modality';
      if (bodyParts.length === 0) e.bodyParts = 'Pick at least one body part';
      if (scans.length === 0) e.scans = 'Add at least one image';
    }
    return e;
  };

  /** Upload picked files one by one; returns stored paths (keeps going file by file, stops on first error). */
  const uploadAll = async (files: PickedFile[], subfolder: string, setter: React.Dispatch<React.SetStateAction<PickedFile[]>>, done: { n: number }, total: number) => {
    const paths: string[] = [];
    for (const f of files) {
      if (f.storedPath) {
        paths.push(f.storedPath);
        done.n += 1;
        continue;
      }
      const res = await ApiClient.uploadFileWithProgress(f.blob, f.name, { category: 'cases', entityId: caseId, subfolder }, (frac) => {
        setter((prev) => prev.map((p) => (p.key === f.key ? { ...p, progress: frac } : p)));
        setUploadPct(Math.round(((done.n + frac) / total) * 100));
      });
      setter((prev) => prev.map((p) => (p.key === f.key ? { ...p, progress: 1, storedPath: res.path } : p)));
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
      const first = ['scans', 'fullName', 'age', 'gender', 'center', 'modality', 'bodyParts'].find((k) => e[k]);
      const el = first ? document.querySelector(`[data-field="${first}"]`) : null;
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    try {
      const total = scans.length + slips.length;
      const done = { n: 0 };
      if (total > 0) setUploadPct(0);
      const scanPaths = await uploadAll(scans, 'uploads', setScans, done, total || 1);
      const slipPaths = await uploadAll(slips, 'clinical', setSlips, done, total || 1);
      setUploadPct(total > 0 ? 100 : null);

      if (isEdit && initialReport) {
        const res = await ApiClient.updateCaseDetails(initialReport.id, {
          fullName: fullName.trim(),
          age: Number(age),
          ageUnit,
          gender: gender as Gender,
          phone: phone.trim(),
          referringPhysicianName: referringDoctor.trim(),
          clinicalNotes: notes,
          isUrgent,
          isPortable,
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

      const center = centers.find((c) => c.id === centerId);
      const isAll = doctorIds.includes('ALL');
      const docNames = doctors.filter((d) => doctorIds.includes(d.id)).map((d) => d.fullName);
      try {
        localStorage.setItem(LAST_CENTER_KEY, centerId);
      } catch {
        /* storage full / private mode */
      }
      await onSave({
        id: caseId,
        fullName: fullName.trim().toUpperCase(),
        patientNumber,
        gender: gender as Gender,
        age: Number(age),
        ageUnit,
        phone: phone.trim(),
        radiologyCenterId: centerId,
        radiologyCenterName: center ? center.centerName : 'RADIOLOGY CENTER',
        referringPhysicianId: 'ref-doc-1',
        referringPhysicianName: referringDoctor.trim().toUpperCase(),
        assignedDoctorId: isAll ? 'ALL' : doctorIds[0] || 'ALL',
        assignedDoctorName: isAll ? 'ALL DOCTORS (Broadcast)' : docNames.join(', ') || 'ALL DOCTORS',
        assignedDoctorIds: doctorIds,
        claimStatus: 'UNCLAIMED',
        clinicalNotes: notes,
        bodyParts,
        modality,
        // No invented findings: the doctor starts from the matching template (or blank) in the viewer
        findings: '',
        impression: '',
        reportsByBodyPart: {},
        impressionsByBodyPart: {},
        status: 'Pending',
        isUrgent,
        isPortable,
        studyDate: todayDDMMYYYY(),
        dicomSnapshots: Array.from(new Set([...scanPaths, ...slipPaths])),
        uploadedImages: scanPaths,
        clinicalHistoryImages: slipPaths,
      });
      onClose();
    } catch (err) {
      setFormError(apiErrorMessage(err, isEdit ? 'Could not save the changes' : 'Could not upload this case'));
      setUploadPct(null);
    } finally {
      setSubmitting(false);
    }
  };

  const renderThumb = (f: PickedFile, target: 'scan' | 'slip') => (
    <div key={f.key} className="relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden aspect-square" data-testid="upload-thumb">
      {f.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={f.previewUrl} alt={f.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1 text-slate-500">
          <FileText className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">{f.kind === 'dicom' ? 'DICOM' : 'PDF'}</span>
          <span className="text-[10px] truncate max-w-full px-1">{f.name}</span>
        </div>
      )}
      {!submitting && (
        <button
          type="button"
          onClick={() => removeFile(f.key, target)}
          aria-label={`Remove ${f.name}`}
          className="absolute top-1 right-1 w-7 h-7 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white flex items-center justify-center"
          style={{ minHeight: 28, minWidth: 28 }}
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {submitting && (
        <div className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-900/20">
          <div className="h-full bg-[#009ef7] transition-all" style={{ width: `${Math.round(f.progress * 100)}%` }} />
        </div>
      )}
      {f.storedPath && (
        <span className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
          <Check className="w-3 h-3" />
        </span>
      )}
    </div>
  );

  const scanCount = scans.length;
  const footerStatus = submitting
    ? uploadPct !== null && uploadPct < 100
      ? `Uploading ${uploadPct}%`
      : 'Saving…'
    : preparing
    ? 'Preparing images…'
    : isEdit
    ? scanCount
      ? `${scanCount} new image${scanCount === 1 ? '' : 's'}`
      : ''
    : scanCount
    ? `${scanCount} image${scanCount === 1 ? '' : 's'} ready`
    : 'No images yet';

  return (
    <div
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center bg-slate-950/55 backdrop-blur-sm sm:p-4"
      data-testid="upload-image-dialog"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-dialog-title"
        className="relative bg-white text-slate-900 w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: 'min(94dvh, 940px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h2 id="upload-dialog-title" className="text-[17px] font-bold text-slate-900 leading-tight">
              {isEdit ? 'Edit patient details' : 'Upload Image'}
            </h2>
            <p className="text-[12px] text-slate-500 truncate mt-0.5">
              {isEdit
                ? `${initialReport?.fullName || ''} · ${initialReport?.radiologyCenterName || ''}`
                : selectedCenter && centers.length === 1
                ? selectedCenter.centerName
                : 'Add scans and a few patient details'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-40 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form id="upload-image-form" noValidate onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-4 space-y-5">
            {formError && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[13px] text-rose-700 font-medium flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* 1. Images */}
            <section data-field="scans">
              <FieldLabel required={!isEdit}>{isEdit ? 'Add more images' : 'Images'}</FieldLabel>
              {isEdit && existingImages.length > 0 && (
                <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1" data-testid="existing-images">
                  {existingImages.slice(0, 8).map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={resolveMediaUrl(src)} alt="" className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0" />
                  ))}
                  <span className="text-[12px] text-slate-500 shrink-0">
                    {existingImages.length} on file
                  </span>
                </div>
              )}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files, 'scan');
                }}
                className={`rounded-2xl border-2 border-dashed transition-colors ${
                  dragOver ? 'border-[#009ef7] bg-sky-50' : errors.scans ? 'border-rose-300 bg-rose-50/40' : 'border-slate-300 bg-slate-50/60'
                }`}
                data-testid="upload-dropzone"
              >
                {scans.length === 0 ? (
                  <div className="flex flex-col items-center text-center px-4 py-7 sm:py-9">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-[#009ef7] mb-3">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-[15px] font-semibold text-slate-800">
                      <span className="hidden sm:inline">Drag &amp; drop scans here</span>
                      <span className="sm:hidden">Add scans from your phone</span>
                    </p>
                    <p className="text-[12px] text-slate-500 mt-0.5">X-ray / scan images, DICOM (.dcm) or PDF</p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => scanInputRef.current?.click()}
                        className="h-11 px-5 rounded-xl bg-[#009ef7] hover:bg-[#008be0] text-white text-[14px] font-semibold inline-flex items-center gap-2"
                        data-testid="choose-files"
                      >
                        <Plus className="w-4 h-4" /> Choose files
                      </button>
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="sm:hidden h-11 px-5 rounded-xl bg-white border border-slate-300 text-slate-800 text-[14px] font-semibold inline-flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" /> Take photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5">
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {scans.map((f) => renderThumb(f, 'scan'))}
                      {!submitting && (
                        <button
                          type="button"
                          onClick={() => scanInputRef.current?.click()}
                          className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-[#009ef7] text-slate-500 hover:text-[#009ef7] flex flex-col items-center justify-center gap-1 bg-white"
                          aria-label="Add more images"
                        >
                          <Plus className="w-5 h-5" />
                          <span className="text-[11px] font-semibold">Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {preparing && (
                <p className="mt-1.5 text-[12px] text-slate-500 inline-flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing images…
                </p>
              )}
              <FieldError msg={errors.scans} />
              <input ref={scanInputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { addFiles(e.target.files, 'scan'); e.target.value = ''; }} data-testid="scan-input" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { addFiles(e.target.files, 'scan'); e.target.value = ''; }} />
            </section>

            {/* 2. Patient */}
            <section className="space-y-3">
              <div data-field="fullName">
                <FieldLabel required htmlFor="up-name">Patient name</FieldLabel>
                <input
                  id="up-name"
                  type="text"
                  autoComplete="off"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (errors.fullName) setErrors((x) => ({ ...x, fullName: '' }));
                  }}
                  placeholder="Full name"
                  style={errors.fullName ? fieldErrorStyle : fieldStyle}
                  data-testid="patient-name"
                />
                <FieldError msg={errors.fullName} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div data-field="age">
                  <FieldLabel required htmlFor="up-age">Age</FieldLabel>
                  <div className="flex gap-2">
                    <input
                      id="up-age"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={150}
                      value={age}
                      onChange={(e) => {
                        setAge(e.target.value);
                        if (errors.age) setErrors((x) => ({ ...x, age: '' }));
                      }}
                      placeholder="Age"
                      style={{ ...(errors.age ? fieldErrorStyle : fieldStyle), width: 96, flex: '0 0 96px', textAlign: 'center' }}
                      data-testid="patient-age"
                    />
                    <div className="flex-1 min-w-0">
                      <Segmented<AgeUnit>
                        value={ageUnit}
                        onChange={setAgeUnit}
                        options={[
                          { value: 'Years', label: 'Years' },
                          { value: 'Months', label: 'Months' },
                          { value: 'Days', label: 'Days' },
                        ]}
                        testId="age-unit"
                      />
                    </div>
                  </div>
                  <FieldError msg={errors.age} />
                </div>
                <div data-field="gender">
                  <FieldLabel required>Gender</FieldLabel>
                  <Segmented<Gender>
                    value={gender}
                    invalid={!!errors.gender}
                    onChange={(v) => {
                      setGender(v);
                      setErrors((x) => ({ ...x, gender: '' }));
                    }}
                    options={[
                      { value: 'Male', label: 'Male' },
                      { value: 'Female', label: 'Female' },
                      { value: 'Other', label: 'Other' },
                    ]}
                    testId="patient-gender"
                  />
                  <FieldError msg={errors.gender} />
                </div>
              </div>
            </section>

            {/* 3. Study */}
            <section className="space-y-3">
              {isEdit ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-[13px] text-slate-700 space-y-1" data-testid="edit-fixed-study">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold truncate">{initialReport?.radiologyCenterName}</span>
                    <span className="text-slate-400">·</span>
                    <span>{initialReport?.modality || 'X-Ray'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(initialReport?.bodyParts || []).map((bp) => (
                      <span key={bp} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold">
                        {bp}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">Centre, modality and body parts can’t be changed after upload.</p>
                </div>
              ) : (
                <>
                  <div data-field="center">
                    <FieldLabel required htmlFor="up-center">Centre</FieldLabel>
                    {centers.length === 1 ? (
                      <div className="h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-[14px] font-semibold text-slate-800" data-testid="center-fixed">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        <span className="truncate">{centers[0].centerName}</span>
                      </div>
                    ) : (
                      <select
                        id="up-center"
                        value={centerId}
                        onChange={(e) => {
                          setCenterId(e.target.value);
                          setErrors((x) => ({ ...x, center: '' }));
                        }}
                        style={errors.center ? fieldErrorStyle : fieldStyle}
                        data-testid="center-select"
                      >
                        <option value="">Choose centre…</option>
                        {centers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.centerName}
                          </option>
                        ))}
                      </select>
                    )}
                    {centers.length === 0 && (
                      <p className="mt-1 text-[12px] text-amber-700">No centre available for uploads on this account.</p>
                    )}
                    <FieldError msg={errors.center} />
                  </div>

                  <div data-field="modality">
                    <FieldLabel required>Modality</FieldLabel>
                    <div className="flex flex-wrap gap-1.5" role="radiogroup" data-testid="modality">
                      {STUDY_MODALITY_OPTIONS.map((m) => {
                        const active = modality === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setModality(m)}
                            className={`h-9 px-3.5 rounded-full text-[13px] font-semibold border transition-colors ${
                              active ? 'bg-[#009ef7] border-[#009ef7] text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                            }`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div data-field="bodyParts">
                    <FieldLabel required>Body part</FieldLabel>
                    <div className="flex flex-wrap gap-1.5" data-testid="body-parts">
                      {Array.from(new Set([...BODY_PART_OPTIONS, ...bodyParts])).map((p) => {
                        const active = bodyParts.includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            aria-pressed={active}
                            onClick={() => togglePart(p)}
                            className={`h-9 px-3 rounded-full text-[12px] font-semibold border inline-flex items-center gap-1 transition-colors ${
                              active
                                ? 'bg-sky-50 border-[#009ef7] text-[#0072b8]'
                                : errors.bodyParts
                                ? 'bg-white border-rose-300 text-slate-700'
                                : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                            }`}
                          >
                            {active && <Check className="w-3.5 h-3.5" />}
                            {p}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={customPart}
                        onChange={(e) => setCustomPart(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomPart();
                          }
                        }}
                        placeholder="Other body part"
                        style={{ ...fieldStyle, flex: 1, minWidth: 0 }}
                        data-testid="custom-part"
                      />
                      <button
                        type="button"
                        onClick={addCustomPart}
                        className="h-11 px-4 rounded-xl border border-slate-300 text-slate-700 text-[14px] font-semibold hover:bg-slate-50 shrink-0"
                      >
                        Add
                      </button>
                    </div>
                    <FieldError msg={errors.bodyParts} />
                  </div>
                </>
              )}

              <label className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 cursor-pointer" data-testid="urgent-toggle">
                <span className="flex items-center gap-2 text-[14px] font-semibold text-slate-800">
                  <Zap className={`w-4 h-4 ${isUrgent ? 'text-rose-500' : 'text-slate-400'}`} />
                  Urgent
                  <span className="text-[12px] font-normal text-slate-500 hidden min-[380px]:inline">— report first</span>
                </span>
                <input type="checkbox" checked={isUrgent} onChange={(e) => setIsUrgent(e.target.checked)} className="sr-only peer" />
                <span className="relative w-11 h-6 rounded-full bg-slate-300 peer-checked:bg-rose-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 shrink-0" />
              </label>
            </section>

            {/* 4. More details (optional) */}
            <section className="rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                className="w-full flex items-center justify-between px-3.5 py-3 text-left"
                data-testid="more-details"
              >
                <span>
                  <span className="text-[14px] font-semibold text-slate-800">More details</span>
                  <span className="text-[12px] text-slate-500"> · optional</span>
                </span>
                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
              </button>
              {moreOpen && (
                <div className="px-3.5 pb-4 space-y-3 border-t border-slate-100 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <FieldLabel htmlFor="up-ref">Referring doctor</FieldLabel>
                      <input id="up-ref" type="text" value={referringDoctor} onChange={(e) => setReferringDoctor(e.target.value)} placeholder="Dr. name" style={fieldStyle} />
                    </div>
                    <div>
                      <FieldLabel htmlFor="up-phone">Patient mobile</FieldLabel>
                      <input id="up-phone" type="text" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" style={fieldStyle} />
                    </div>
                  </div>
                  <div>
                    <FieldLabel htmlFor="up-notes">Clinical notes</FieldLabel>
                    <textarea id="up-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Symptoms, history, reason for scan" style={areaStyle} />
                  </div>
                  {!isEdit && (
                  <div>
                    <FieldLabel>History slip / prescription</FieldLabel>
                    <div className="flex flex-wrap items-center gap-2">
                      {slips.length > 0 && <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 w-full">{slips.map((f) => renderThumb(f, 'slip'))}</div>}
                      {!submitting && (
                        <button
                          type="button"
                          onClick={() => slipInputRef.current?.click()}
                          className="h-10 px-4 rounded-xl border border-dashed border-slate-300 text-slate-700 text-[13px] font-semibold hover:border-[#009ef7] hover:text-[#009ef7] inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" /> Attach slip
                        </button>
                      )}
                    </div>
                    <input ref={slipInputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { addFiles(e.target.files, 'slip'); e.target.value = ''; }} />
                  </div>
                  )}
                  <label className="flex items-center gap-2.5 text-[14px] text-slate-800 cursor-pointer">
                    <input type="checkbox" checked={isPortable} onChange={(e) => setIsPortable(e.target.checked)} className="w-5 h-5 accent-[#009ef7]" />
                    Portable X-ray (bedside)
                  </label>
                  {!isEdit && (
                    <div>
                      <FieldLabel>Send to</FieldLabel>
                      <div className="flex flex-wrap gap-1.5" data-testid="send-to">
                        <button
                          type="button"
                          onClick={() => toggleDoctor('ALL')}
                          className={`h-9 px-3 rounded-full text-[12px] font-semibold border ${
                            doctorIds.includes('ALL') ? 'bg-[#009ef7] border-[#009ef7] text-white' : 'bg-white border-slate-300 text-slate-700'
                          }`}
                        >
                          All radiologists
                        </button>
                        {doctors.map((d) => {
                          const active = doctorIds.includes(d.id);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => toggleDoctor(d.id)}
                              className={`h-9 px-3 rounded-full text-[12px] font-semibold border ${
                                active ? 'bg-sky-50 border-[#009ef7] text-[#0072b8]' : 'bg-white border-slate-300 text-slate-700'
                              }`}
                            >
                              {d.fullName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {patientNumber && !isUUID(patientNumber) && (
                    <p className="text-[11px] text-slate-400 font-mono break-all">Patient ID: {patientNumber}</p>
                  )}
                </div>
              )}
            </section>
          </div>
        </form>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-slate-100 bg-white px-4 sm:px-6 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          {submitting && uploadPct !== null && (
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2.5" data-testid="upload-progress">
              <div className="h-full bg-[#009ef7] transition-all" style={{ width: `${uploadPct}%` }} />
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-slate-500 flex-1 min-w-0 truncate" data-testid="upload-status">
              {footerStatus}
            </span>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-11 px-4 rounded-xl text-[14px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="upload-image-form"
              disabled={submitting || preparing}
              className="h-11 px-5 rounded-xl bg-[#009ef7] hover:bg-[#008be0] disabled:opacity-60 text-white text-[14px] font-semibold inline-flex items-center gap-2"
              data-testid="upload-submit"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? <Check className="w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
              {isEdit ? 'Save changes' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
