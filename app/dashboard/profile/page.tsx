'use client';

import React, { useEffect, useState } from 'react';
import { PageShell } from '@/components/ui';
import DoctorSignatureForm from '@/components/DoctorSignatureForm';
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
          <p className="text-[13px] text-slate-500">Details printed under your signature on every report you sign.</p>
        </div>

        {session?.role !== 'DOCTOR' ? (
          <p className="text-[13px] text-slate-600">This page is for doctor accounts.</p>
        ) : error ? (
          <p className="text-[13px] font-medium text-rose-600" role="alert">{error}</p>
        ) : !doctor ? (
          <p className="text-[13px] text-slate-500">Loading...</p>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
            <div className="mb-4">
              <div className="text-[15px] font-bold text-slate-900">{doctor.fullName}</div>
              <div className="text-[12px] text-slate-500">{doctor.email}</div>
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
