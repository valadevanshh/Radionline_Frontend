'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export interface PageShellProps {
  children: React.ReactNode;
  /** `full` for data tables; `form` constrains to --rn-form-max-width (720px). */
  width?: 'full' | 'form';
  className?: string;
}

export function PageShell({ children, width = 'full', className }: PageShellProps) {
  return (
    <div
      className={cn(
        'h-full w-full overflow-auto bg-[var(--rn-bg)]',
        'p-3 sm:p-4 md:p-6',
        className
      )}
    >
      <div
        className={cn('w-full', width === 'form' && 'mx-auto')}
        style={width === 'form' ? { maxWidth: 'var(--rn-form-max-width)' } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
