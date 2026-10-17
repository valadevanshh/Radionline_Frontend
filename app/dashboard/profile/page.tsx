'use client';

import React, { useEffect, useState } from 'react';
import { PageShell } from '@/components/ui';
import DoctorSignatureForm from '@/components/DoctorSignatureForm';
import DoctorAvatar from '@/components/DoctorAvatar';
import { ApiClient, apiErrorMessage } from '@/lib/api-client';
import { Doctor, RadiologyStore } from '@/lib/radiology-store';

/** Doctor's own profile: the details printed in the report signature block. */
export default function MyProfilePage() {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [error, setError] = useState('');
  const session = RadiologyStore.getSession();

  useEffect(() => {
    if (session?.role !== 'DOCTOR') return;
    ApiClient.getMyDoctorProfile()
      .then(setDoctor)
      .catch((err) => setError(apiErrorMessage(err, 'Could not load your profile.')));
  }, [session?.role]);

  return (
    <PageShell width="form">
      <div className="space-y-4 pb-24 md:pb-6">
        <div>
          <h1 className="text-[18px] font-bold text-slate-900">My Profile</h1>
          <p className="text-[13px] text-slate-500">
            Add your photo, experience, expertise and CV. Signature details below are printed on every report you sign.
          </p>
        </div>

        {session?.role !== 'DOCTOR' ? (
          <p className="text-[13px] text-slate-600">This page is for doctor accounts.</p>
        ) : error ? (
          <p className="text-[13px] font-medium text-rose-600" role="alert">{error}</p>
        ) : !doctor ? (
          <p className="text-[13px] text-slate-500">Loading...</p>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
            <div className="mb-4 flex items-center gap-3">
              <DoctorAvatar name={doctor.fullName} photoUrl={doctor.photoUrl} size="sm" className="rounded-full" />
              <div className="min-w-0">
                <div className="text-[15px] font-bold text-slate-900 truncate">{doctor.fullName}</div>
                <div className="text-[12px] text-slate-500 truncate">{doctor.email}</div>
              </div>
            </div>
            <DoctorSignatureForm
              doctor={doctor}
              onSave={(body) => ApiClient.updateMyDoctorProfile(body)}
              onSaved={(d) => setDoctor(d)}
            />
          </div>
        )}
      </div>
    </PageShell>
  );
}
