'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { normalizePriority } from '@/lib/status';

export interface PriorityBadgeProps {
  priority?: string | boolean | null;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const kind = normalizePriority(priority);
  const isStat = kind === 'stat';
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-[var(--rn-radius-control)] border px-2 text-[12px] font-semibold uppercase leading-none tracking-wide',
        isStat
          ? 'border-[var(--rn-danger)]/30 bg-[var(--rn-danger)] text-[var(--rn-danger-foreground)]'
          : 'border-[var(--rn-border)] bg-[var(--rn-surface-muted)] text-[var(--rn-text-secondary)]',
        className
      )}
    >
      {isStat ? 'STAT' : 'Routine'}
    </span>
  );
}
