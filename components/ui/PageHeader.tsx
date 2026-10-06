'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-[var(--rn-border)] bg-[var(--rn-surface)] px-3 py-2.5 sm:px-4 md:h-[var(--rn-page-header-height)] md:flex-nowrap md:px-6 md:py-0',
        className
      )}
      style={{ minHeight: 'var(--rn-page-header-height)' }}
    >
      <div className="min-w-0">
        <h1 className="truncate text-[16px] font-semibold leading-5 text-[var(--rn-text)]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 truncate text-[12px] leading-4 text-[var(--rn-text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2 md:shrink-0 md:flex-nowrap">{actions}</div>}
    </header>
  );
}
