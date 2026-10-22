'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, CheckCircle2, FileText, Eye, Download } from 'lucide-react';
import { Doctor } from '@/lib/radiology-store';
import { DoctorProfileUpdate, apiErrorMessage, resolveMediaUrl } from '@/lib/api-client';
import { Button, TextInput } from '@/components/ui';
import { formatRegNo } from '@/lib/print-helper';
import DoctorAvatar from '@/components/DoctorAvatar';
import ExpertiseTagInput from '@/components/ExpertiseTagInput';
import {
  CV_ACCEPT,
  CV_MAX_BYTES,
  CV_TYPES,
  MAX_YEARS_OF_EXPERIENCE,
  PHOTO_ACCEPT,
  PHOTO_MAX_BYTES,
  downloadFile,
  fileExt,
  isPdfName,
  openFileInNewTab,
  readAsDataUrl,
} from '@/lib/doctor-profile';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,image/webp';

/** A placeholder image is not a real signature. */
export function usableSignatureUrl(url?: string | null): string {
  const u = (url || '').trim();
  return u && !u.includes('placehold.co') ? u : '';
}

interface DoctorSignatureFormProps {
  doctor: Doctor;
  onSave: (body: DoctorProfileUpdate) => Promise<Doctor>;
  onSaved?: (doctor: Doctor) => void;
  /** Hide the inline Save button (when a modal footer provides one) */
  formId?: string;
}

/**
 * Doctor profile: profile picture, degree / registration number, experience, expertise,
 * signature image (the details printed in the report signature block) and CV.
 * Shared by the doctor's own profile and the Super Admin.
 */
export default function DoctorSignatureForm({ doctor, onSave, onSaved, formId }: DoctorSignatureFormProps) {
  const [degree, setDegree] = useState(doctor.degree || '');
  const [regNo, setRegNo] = useState(doctor.registrationNumber || '');
  const [years, setYears] = useState(doctor.yearsOfExperience != null ? String(doctor.yearsOfExperience) : '');
  const [expertise, setExpertise] = useState<string[]>(doctor.expertise || []);
  const [sigPreview, setSigPreview] = useState(resolveMediaUrl(usableSignatureUrl(doctor.signatureUrl)));
  const [sigUpload, setSigUpload] = useState<string | null>(null); // data URL, '' = remove
  const [photoPreview, setPhotoPreview] = useState(resolveMediaUrl(doctor.photoUrl || ''));
  const [photoUpload, setPhotoUpload] = useState<string | null>(null); // data URL, '' = remove
  const [cvUrl, setCvUrl] = useState(resolveMediaUrl(doctor.cvUrl || ''));
  const [cvName, setCvName] = useState(doctor.cvFileName || '');
  const [cvUpload, setCvUpload] = useState<string | null>(null); // data URL, '' = remove
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const cvRef = useRef<HTMLInputElement | null>(null);

  const expertiseKey = (doctor.expertise || []).join('\u0001');
  useEffect(() => {
    setDegree(doctor.degree || '');
    setRegNo(doctor.registrationNumber || '');
    setYears(doctor.yearsOfExperience != null ? String(doctor.yearsOfExperience) : '');
    setExpertise(doctor.expertise || []);
    setSigPreview(resolveMediaUrl(usableSignatureUrl(doctor.signatureUrl)));
    setSigUpload(null);
    setPhotoPreview(resolveMediaUrl(doctor.photoUrl || ''));
    setPhotoUpload(null);
    setCvUrl(resolveMediaUrl(doctor.cvUrl || ''));
    setCvName(doctor.cvFileName || '');
    setCvUpload(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    doctor.id,
    doctor.degree,
    doctor.registrationNumber,
    doctor.signatureUrl,
    doctor.photoUrl,
    doctor.yearsOfExperience,
    expertiseKey,
    doctor.cvUrl,
    doctor.cvFileName,
  ]);

  const pickFile = (file?: File | null) => {
    setError('');
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) {
      setError('Please choose a PNG, JPG or WEBP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Signature image: File must be 5 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || '');
      setSigUpload(url);
      setSigPreview(url);
    };
    reader.onerror = () => setError('Could not read that file.');
    reader.readAsDataURL(file);
  };

  const pickPhoto = async (file?: File | null) => {
    setError('');
    if (!file) return;
    if (!PHOTO_ACCEPT.split(',').includes(file.type)) {
      setError('Profile picture: please choose a PNG, JPG or WEBP image.');
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setError('Profile picture: File must be 5 MB or smaller.');
      return;
    }
    try {
      const url = await readAsDataUrl(file);
      setPhotoUpload(url);
      setPhotoPreview(url);
    } catch {
      setError('Could not read that file.');
    }
  };

  const pickCv = async (file?: File | null) => {
    setError('');
    if (!file) return;
    const mime = CV_TYPES[fileExt(file.name)];
    if (!mime) {
      setError('CV: please choose a PDF, DOC or DOCX file.');
      return;
    }
    if (file.size > CV_MAX_BYTES) {
      setError('CV: File must be 5 MB or smaller.');
      return;
    }
    if (file.size === 0) {
      setError('That CV file is empty.');
      return;
    }
    try {
      // Browsers often leave .doc/.docx without a type: label the data by its extension.
      const raw = await readAsDataUrl(file);
      const url = `data:${mime};base64,${raw.slice(raw.indexOf(',') + 1)}`;
      setCvUpload(url);
      setCvUrl(url);
      setCvName(file.name);
    } catch {
      setError('Could not read that file.');
    }
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    const yearsTrim = years.trim();
    const yearsNum = yearsTrim === '' ? null : Number(yearsTrim);
    if (yearsNum !== null && (!Number.isInteger(yearsNum) || yearsNum < 0 || yearsNum > MAX_YEARS_OF_EXPERIENCE)) {
      setError(`Years of experience must be a whole number from 0 to ${MAX_YEARS_OF_EXPERIENCE}.`);
      return;
    }
    setSaving(true);
    try {
      const body: DoctorProfileUpdate = {
        degree: degree.trim(),
        registrationNumber: regNo.trim(),
        yearsOfExperience: yearsNum,
        expertise,
      };
      if (sigUpload !== null) body.signatureUrl = sigUpload;
      if (photoUpload !== null) body.photoUrl = photoUpload;
      if (cvUpload !== null) {
        body.cvUrl = cvUpload;
        if (cvUpload) body.cvFileName = cvName;
      }
      const updated = await onSave(body);
      setSigUpload(null);
      setSigPreview(resolveMediaUrl(usableSignatureUrl(updated.signatureUrl)));
      setPhotoUpload(null);
      setPhotoPreview(resolveMediaUrl(updated.photoUrl || ''));
      setCvUpload(null);
      setCvUrl(resolveMediaUrl(updated.cvUrl || ''));
      setCvName(updated.cvFileName || '');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      onSaved?.(updated);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save these details. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form id={formId} onSubmit={submit} className="space-y-6" data-testid="doctor-signature-form">
      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <h3 className="text-[13px] font-bold text-slate-900">Profile picture</h3>
        <p className="mt-0.5 text-[12px] text-slate-500">Shown on the doctors directory and when someone opens your card.</p>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-4">
          <DoctorAvatar name={doctor.fullName} photoUrl={photoPreview} size="xxl" className="rounded-full ring-2 ring-white shadow-sm" />
          <div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={() => photoRef.current?.click()} data-testid="photo-upload">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                {photoPreview ? 'Replace photo' : 'Upload photo'}
              </Button>
              {photoPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPhotoUpload('');
                    setPhotoPreview('');
                  }}
                  data-testid="photo-remove"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Remove
                </Button>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">PNG, JPG or WEBP, up to 5 MB. A square photo looks best.</p>
          </div>
          <input
            ref={photoRef}
            type="file"
            accept={PHOTO_ACCEPT}
            className="hidden"
            data-testid="photo-file"
            onChange={(e) => {
              pickPhoto(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </section>

      <section>
        <h3 className="text-[13px] font-bold text-slate-900 mb-1">Professional details</h3>
        <p className="mb-3 text-[12px] text-slate-500">Degree, registration and years of practice shown on your public profile.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-[12px] font-semibold text-slate-700 mb-1">Degree / qualification</span>
            <TextInput
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              placeholder="e.g. MBBS, M.D. (Radiodiagnosis)"
              maxLength={120}
              data-testid="doctor-degree"
            />
          </label>
          <label className="block">
            <span className="block text-[12px] font-semibold text-slate-700 mb-1">Registration number</span>
            <TextInput
              value={regNo}
              onChange={(e) => setRegNo(e.target.value)}
              placeholder="e.g. MMC 2012/03/1234"
              maxLength={80}
              data-testid="doctor-regno"
            />
          </label>
          <label className="block sm:col-span-2 sm:max-w-xs">
            <span className="block text-[12px] font-semibold text-slate-700 mb-1">Years of experience</span>
            <TextInput
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_YEARS_OF_EXPERIENCE}
              step={1}
              value={years}
              onChange={(e) => setYears(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
              placeholder="e.g. 8"
              data-testid="doctor-experience"
            />
          </label>
        </div>
      </section>

      <section>
        <h3 className="text-[13px] font-bold text-slate-900">Expertise / specialisations</h3>
        <p className="mt-0.5 mb-2 text-[12px] text-slate-500">Add the areas you report, for example Neuro, MSK, Chest.</p>
        <ExpertiseTagInput id="doctor-expertise-input" value={expertise} onChange={setExpertise} />
      </section>

      <section>
        <h3 className="text-[13px] font-bold text-slate-900 mb-1">Signature image</h3>
        <p className="mb-2 text-[12px] text-slate-500">Printed under your name on every report you sign.</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="h-20 w-full sm:w-56 rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden">
            {sigPreview ? (
              <img src={sigPreview} alt="Signature" className="max-h-16 max-w-[90%] object-contain" data-testid="signature-preview" />
            ) : (
              <span className="text-[12px] text-slate-400">No signature uploaded</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {sigPreview ? 'Replace' : 'Upload'}
            </Button>
            {sigPreview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSigUpload('');
                  setSigPreview('');
                }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Remove
              </Button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            data-testid="signature-file"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">PNG, JPG or WEBP, up to 5 MB. A transparent PNG looks best.</p>
      </section>

      <section>
        <h3 className="text-[13px] font-bold text-slate-900 mb-1">Curriculum Vitae (CV)</h3>
        <p className="mb-2 text-[12px] text-slate-500">Upload your CV so centres and admins can review your credentials.</p>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-h-14 w-full sm:w-56 sm:shrink-0 rounded-lg border border-dashed border-slate-300 bg-white flex items-center gap-2 px-3 py-2 overflow-hidden">
            {cvUrl ? (
              <>
                <FileText className="w-5 h-5 shrink-0 text-[#009ef7]" />
                <span className="min-w-0 truncate text-[12px] font-semibold text-slate-800" title={cvName || 'CV'} data-testid="cv-name">
                  {cvName || 'CV'}
                </span>
              </>
            ) : (
              <span className="w-full text-center text-[12px] text-slate-400">No CV uploaded</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {cvUrl && isPdfName(cvName) && (
              <Button variant="ghost" size="sm" onClick={() => openFileInNewTab(cvUrl)} data-testid="cv-view">
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                View
              </Button>
            )}
            {cvUrl && (
              <Button variant="ghost" size="sm" onClick={() => downloadFile(cvUrl, cvName || 'CV')} data-testid="cv-download">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => cvRef.current?.click()} data-testid="cv-upload">
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {cvUrl ? 'Replace' : 'Upload'}
            </Button>
            {cvUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCvUpload('');
                  setCvUrl('');
                  setCvName('');
                }}
                data-testid="cv-remove"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Remove
              </Button>
            )}
          </div>
          <input
            ref={cvRef}
            type="file"
            accept={CV_ACCEPT}
            className="hidden"
            data-testid="cv-file"
            onChange={(e) => {
              pickCv(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">PDF, DOC or DOCX, up to 5 MB.</p>
      </section>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2">On the report</div>
        <div className="text-right text-[12px] text-slate-900" data-testid="signature-block-preview">
          {sigPreview ? <img src={sigPreview} alt="" className="inline-block h-10 object-contain mb-1" /> : null}
          <div className="font-bold text-[13px]">{doctor.fullName}</div>
          {degree.trim() ? <div>{degree.trim()}</div> : null}
          {regNo.trim() ? <div>{formatRegNo(regNo)}</div> : null}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Signed reports keep the details they were signed with. Changes here apply to reports you sign from now on.
        </p>
      </section>

      {error && <p className="text-[12px] font-medium text-rose-600" role="alert">{error}</p>}

      {!formId && (
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600">
              <CheckCircle2 className="w-4 h-4" /> Saved
            </span>
          )}
          <Button type="submit" disabled={saving} data-testid="doctor-profile-save">
            {saving ? 'Saving...' : 'Save details'}
          </Button>
        </div>
      )}
    </form>
  );
}
