'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, CheckCircle2 } from 'lucide-react';
import { Doctor } from '@/lib/radiology-store';
import { DoctorProfileUpdate, apiErrorMessage, resolveMediaUrl } from '@/lib/api-client';
import { Button, TextInput } from '@/components/ui';
import { formatRegNo } from '@/lib/print-helper';

const MAX_BYTES = 2 * 1024 * 1024;
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
 * Degree / registration number / signature image: the details printed in the
 * report signature block. Shared by the doctor's own profile and the Super Admin.
 */
export default function DoctorSignatureForm({ doctor, onSave, onSaved, formId }: DoctorSignatureFormProps) {
  const [degree, setDegree] = useState(doctor.degree || '');
  const [regNo, setRegNo] = useState(doctor.registrationNumber || '');
  const [sigPreview, setSigPreview] = useState(resolveMediaUrl(usableSignatureUrl(doctor.signatureUrl)));
  const [sigUpload, setSigUpload] = useState<string | null>(null); // data URL, '' = remove
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDegree(doctor.degree || '');
    setRegNo(doctor.registrationNumber || '');
    setSigPreview(resolveMediaUrl(usableSignatureUrl(doctor.signatureUrl)));
    setSigUpload(null);
  }, [doctor.id, doctor.degree, doctor.registrationNumber, doctor.signatureUrl]);

  const pickFile = (file?: File | null) => {
    setError('');
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) {
      setError('Please choose a PNG, JPG or WEBP image.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('The signature image must be 2 MB or smaller.');
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

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body: DoctorProfileUpdate = { degree: degree.trim(), registrationNumber: regNo.trim() };
      if (sigUpload !== null) body.signatureUrl = sigUpload;
      const updated = await onSave(body);
      setSigUpload(null);
      setSigPreview(resolveMediaUrl(usableSignatureUrl(updated.signatureUrl)));
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
    <form id={formId} onSubmit={submit} className="space-y-5" data-testid="doctor-signature-form">
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
      </div>

      <div>
        <span className="block text-[12px] font-semibold text-slate-700 mb-1">Signature image</span>
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
        <p className="mt-1.5 text-[11px] text-slate-500">PNG, JPG or WEBP, up to 2 MB. A transparent PNG looks best.</p>
      </div>

      {/* How it will print */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
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
      </div>

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
