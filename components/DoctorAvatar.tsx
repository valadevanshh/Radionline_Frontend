'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { resolveMediaUrl } from '@/lib/api-client';
import { doctorInitials } from '@/lib/doctor-profile';

export type DoctorAvatarSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

const sizeClass: Record<DoctorAvatarSize, string> = {
  sm: 'w-8 h-8 text-[12px] rounded-lg',
  md: 'w-12 h-12 text-[15px] rounded-xl',
  lg: 'w-16 h-16 text-[18px] rounded-xl',
  xl: 'w-20 h-20 text-[22px] rounded-2xl',
  xxl: 'w-28 h-28 text-[26px] rounded-full',
};

interface DoctorAvatarProps {
  name?: string | null;
  /** Stored path, /api/files/... URL or a data: URL */
  photoUrl?: string | null;
  size?: DoctorAvatarSize;
  className?: string;
}

/** Doctor profile picture with an initials fallback (also used when the image fails to load). */
export default function DoctorAvatar({ name, photoUrl, size = 'md', className }: DoctorAvatarProps) {
  const src = resolveMediaUrl(photoUrl || '');
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  return (
    <div
      className={cn(
        'shrink-0 overflow-hidden border flex items-center justify-center font-bold font-mono select-none',
        src && !failed ? 'border-slate-200 bg-slate-100' : 'border-indigo-200 bg-indigo-50 text-indigo-600',
        sizeClass[size],
        className
      )}
      aria-hidden={!name}
    >
      {src && !failed ? (
        <img
          src={src}
          alt={name ? `${name} profile picture` : 'Profile picture'}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          data-testid="doctor-avatar-img"
        />
      ) : (
        <span>{doctorInitials(name)}</span>
      )}
    </div>
  );
}
