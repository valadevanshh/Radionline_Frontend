'use client';

import React from 'react';
import { cn } from '@/lib/cn';

/**
 * Shared responsive table pattern (styles: "Responsive table / card pattern" in globals.css).
 *
 *  - Phones (< 768px): each row renders as a compact RowCard inside a RowCardList
 *    (key fields on top, secondary fields in a 2-column grid, actions in one row).
 *  - Tablets (768px - 1279px): the regular table renders inside a container with
 *    RT_CONTAINER. Fixed column widths relax so the table fits, cells marked with
 *    RT_TABLET_HIDE are hidden, and if a horizontal scroll is still needed the
 *    first column stays sticky.
 *  - Desktop (>= 1280px): the table is unchanged.
 *
 * Usage:
 *   <RowCardList isEmpty={rows.length === 0} empty="Nothing here">
 *     {rows.map((r) => <RowCard key={r.id} title={...} fields={[...]} actions={...} />)}
 *   </RowCardList>
 *   <div className={cn(RT_TABLE_ONLY, RT_CONTAINER, 'data-table-container')}>
 *     <table className="data-table"> ... <th className={RT_TABLET_HIDE}> ... </table>
 *   </div>
 */

/** Wrapper class for a table that should adapt on tablets. */
export const RT_CONTAINER = 'rt-container';
/** Column (th + td) hidden on tablets, visible on desktop. */
export const RT_TABLET_HIDE = 'rt-tablet-hide';
/** Extra detail line shown only on tablets (inside a visible cell) to replace hidden columns. */
export const RT_TABLET_ONLY = 'xl:hidden';
/** Action button group: wraps on tablets so the actions column stays narrow. */
export const RT_ACTIONS = 'rt-actions';
/** Visibility helpers: the card list shows below 768px, the table from 768px. */
export const RT_TABLE_ONLY = 'hidden md:block';
export const RT_CARDS_ONLY = 'md:hidden';

export interface RowCardField {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Span both grid columns (long values such as addresses or body part lists). */
  full?: boolean;
}

export interface RowCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right side of the header row, usually a status badge. */
  aside?: React.ReactNode;
  /** Chips row under the header (urgent / portable / body parts). */
  tags?: React.ReactNode;
  fields?: Array<RowCardField | null | false | undefined>;
  actions?: React.ReactNode;
  tone?: 'default' | 'urgent' | 'muted';
  className?: string;
  testId?: string;
}

export function RowCard({ title, subtitle, aside, tags, fields, actions, tone = 'default', className, testId }: RowCardProps) {
  const visibleFields = (fields || []).filter(Boolean) as RowCardField[];
  return (
    <div className={cn('rt-card', tone === 'urgent' && 'rt-card--urgent', tone === 'muted' && 'rt-card--muted', className)} data-testid={testId}>
      <div className="rt-card-head">
        <div className="min-w-0 flex-1">
          <div className="rt-card-title">{title}</div>
          {subtitle ? <div className="rt-card-sub">{subtitle}</div> : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {tags ? <div className="rt-card-tags">{tags}</div> : null}
      {visibleFields.length > 0 && (
        <dl className="rt-card-grid">
          {visibleFields.map((f, i) => (
            <div key={i} className={cn('rt-card-field', f.full && 'rt-card-field--full')}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {actions ? <div className="rt-card-actions">{actions}</div> : null}
    </div>
  );
}

export interface RowCardListProps {
  children?: React.ReactNode;
  isEmpty?: boolean;
  empty?: React.ReactNode;
  className?: string;
  testId?: string;
}

export function RowCardList({ children, isEmpty, empty, className, testId }: RowCardListProps) {
  return (
    <div className={cn(RT_CARDS_ONLY, 'rt-cards', className)} data-testid={testId}>
      {isEmpty ? <div className="rt-card-empty">{empty}</div> : children}
    </div>
  );
}
