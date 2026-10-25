'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export interface UrgentBadgeProps {
  className?: string;
  iconClassName?: string;
}

export function UrgentBadge({ className }: UrgentBadgeProps) {
  // Compact red dot (Portable is no longer shown in lists; it appears on the report)
  return (
    <span
      className={cn('inline-block w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-rose-100 shrink-0 cursor-default select-none', className)}
      title="Urgent"
      aria-label="Urgent"
      role="img"
      data-testid="urgent-dot"
    />
  );
}

export interface PortableBadgeProps {
  className?: string;
  iconClassName?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PortableBadge(_props: PortableBadgeProps) {
  // Portable is not surfaced in lists / cards; it is printed on the report.
  return null;
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
