'use client';

import React from 'react';
import { Siren, Bed } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface UrgentBadgeProps {
  className?: string;
  iconClassName?: string;
}

export function UrgentBadge({ className, iconClassName }: UrgentBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-[20px] h-[20px] bg-rose-600 text-white rounded shadow-2xs shrink-0 cursor-default select-none',
        className
      )}
      title="STAT Urgent"
      aria-label="STAT Urgent"
    >
      <Siren className={cn('w-3.5 h-3.5', iconClassName)} />
    </span>
  );
}

export interface PortableBadgeProps {
  className?: string;
  iconClassName?: string;
}

export function PortableBadge({ className, iconClassName }: PortableBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-[20px] h-[20px] bg-amber-100 text-amber-800 border border-amber-300 rounded shrink-0 cursor-default select-none',
        className
      )}
      title="Portable (Bedside)"
      aria-label="Portable (Bedside)"
    >
      <Bed className={cn('w-3.5 h-3.5', iconClassName)} />
    </span>
  );
}

export interface CaseFlagsProps {
  isUrgent?: boolean;
  isPortable?: boolean;
  className?: string;
}

export function CaseFlags({ isUrgent, isPortable, className }: CaseFlagsProps) {
  if (!isUrgent && !isPortable) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 shrink-0', className)}>
      {isUrgent && <UrgentBadge />}
      {isPortable && <PortableBadge />}
    </span>
  );
}
