'use client';

import React from 'react';
import { Mail, Phone, FileText, Eye, Download, PenLine, Trash2, Briefcase, Award, Hash } from 'lucide-react';
import { Doctor } from '@/lib/radiology-store';
import { resolveMediaUrl } from '@/lib/api-client';
import { Button, Modal } from '@/components/ui';
import DoctorAvatar from '@/components/DoctorAvatar';
import { usableSignatureUrl } from '@/components/DoctorSignatureForm';
import { downloadFile, experienceLabel, isPdfName, openFileInNewTab } from '@/lib/doctor-profile';

interface DoctorDetailsModalProps {
  doctor: Doctor | null;
  onClose: () => void;
  /** Show login details (Super Admin / Manager) */
  showCredentials?: boolean;
  onEdit?: (doctor: Doctor) => void;
  onDelete?: (doctor: Doctor) => void;
  deleteLabel?: string;
}

function Detail({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-0.5 break-words text-[13px] font-semibold text-slate-900">{children}</div>
    </div>
  );
}

/** Full doctor profile: photo, contact, credentials, experience, expertise, signature and CV. */
export default function DoctorDetailsModal({
  doctor,
  onClose,
  showCredentials,
  onEdit,
  onDelete,
  deleteLabel = 'Delete',
}: DoctorDetailsModalProps) {
  const sig = doctor ? resolveMediaUrl(usableSignatureUrl(doctor.signatureUrl)) : '';
  const cvUrl = doctor ? resolveMediaUrl(doctor.cvUrl || '') : '';
  const cvName = doctor?.cvFileName || 'CV';
  const expertise = doctor?.expertise || [];

  const footer =
    doctor && (onEdit || onDelete) ? (
      <div className="flex w-full flex-wrap items-center justify-end gap-2">
        {onDelete && (
          <Button variant="danger" size="sm" onClick={() => onDelete(doctor)} data-testid="doctor-details-delete">
            <Trash2 className="w-3.5 h-3.5" />
            {deleteLabel}
          </Button>
        )}
        {onEdit && (
          <Button size="sm" onClick={() => onEdit(doctor)} data-testid="doctor-details-edit">
            <PenLine className="w-3.5 h-3.5" />
            Edit profile
          </Button>
        )}
      </div>
    ) : undefined;

  return (
    <Modal
      open={!!doctor}
      onClose={onClose}
      title={doctor ? doctor.fullName : 'Doctor profile'}
      size="lg"
      footer={footer}
    >
      {doctor && (
        <div className="space-y-5" data-testid="doctor-details">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:text-left">
            <DoctorAvatar name={doctor.fullName} photoUrl={doctor.photoUrl} size="xl" className="rounded-full" />
            <div className="min-w-0">
              <div className="text-[17px] font-bold text-slate-900 break-words">{doctor.fullName}</div>
              <div className="text-[12px] font-medium text-slate-500">{doctor.degree || 'M.D. (Radiodiagnosis)'}</div>
              <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[12px] text-slate-600 sm:justify-start">
                {doctor.email && (
                  <a href={`mailto:${doctor.email}`} className="inline-flex min-w-0 items-center gap-1 hover:text-[#009ef7]">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="break-all">{doctor.email}</span>
                  </a>
                )}
                {doctor.contactNumber && (
                  <a href={`tel:${doctor.contactNumber}`} className="inline-flex items-center gap-1 font-mono hover:text-[#009ef7]">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {doctor.contactNumber}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Detail icon={Award} label="Degree">{doctor.degree || 'M.D. (Radiodiagnosis)'}</Detail>
            <Detail icon={Hash} label="Registration no.">
              {doctor.registrationNumber ? doctor.registrationNumber : <span className="font-medium text-slate-400">Not set</span>}
            </Detail>
            <Detail icon={Briefcase} label="Experience">
              {doctor.yearsOfExperience != null ? (
                experienceLabel(doctor.yearsOfExperience)
              ) : (
                <span className="font-medium text-slate-400">Not set</span>
              )}
            </Detail>
          </div>

          <div>
            <div className="mb-1.5 text-[12px] font-semibold text-slate-700">Expertise</div>
            {expertise.length ? (
              <div className="flex flex-wrap gap-1.5">
                {expertise.map((t) => (
                  <span
                    key={t}
                    className="rounded-md border border-sky-200 bg-sky-50 px-2 py-0.5 text-[12px] font-semibold text-sky-800"
                  >
                    {t}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-slate-400">No expertise listed.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-slate-700">Signature</div>
              <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white">
                {sig ? (
                  <img src={sig} alt={`${doctor.fullName} signature`} className="max-h-16 max-w-[90%] object-contain" />
                ) : (
                  <span className="text-[12px] text-slate-400">No signature uploaded</span>
                )}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-slate-700">CV</div>
              {cvUrl ? (
                <div className="flex min-h-20 flex-col justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-5 w-5 shrink-0 text-[#009ef7]" />
                    <span className="truncate text-[12px] font-semibold text-slate-800" title={cvName}>
                      {cvName}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isPdfName(cvName) && (
                      <Button variant="secondary" size="sm" onClick={() => openFileInNewTab(cvUrl)} data-testid="doctor-cv-view">
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" onClick={() => downloadFile(cvUrl, cvName)} data-testid="doctor-cv-download">
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
                  <span className="text-[12px] text-slate-400">No CV uploaded</span>
                </div>
              )}
            </div>
          </div>

          {showCredentials && (
            <div>
              <div className="mb-1.5 text-[12px] font-semibold text-slate-700">Login</div>
              <div className="inline-flex max-w-full flex-wrap gap-x-3 gap-y-1 rounded border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-[11px] text-amber-900">
                <span className="break-all">
                  USER: <strong>{doctor.username || doctor.email}</strong>
                </span>
                <span>
                  PASS: <strong>{doctor.password || 'N/A'}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
