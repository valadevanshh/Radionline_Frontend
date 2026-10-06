'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  width?: string | number;
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        'overflow-auto rounded-[var(--rn-radius-card)] border border-[var(--rn-border)] bg-[var(--rn-surface)]',
        className
      )}
    >
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'sticky top-0 z-[1] border-b border-[var(--rn-border)] bg-[var(--rn-surface-muted)] px-3 text-[12px] font-semibold uppercase tracking-wide text-[var(--rn-text-muted)]',
                  col.className
                )}
                style={{
                  height: 'var(--rn-row-height)',
                  ...(col.width != null ? { width: col.width } : {}),
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-10 text-center text-[13px] text-[var(--rn-text-secondary)]"
              >
                {empty ?? 'No records'}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={rowKey(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-[var(--rn-border)] last:border-b-0 hover:bg-[var(--rn-surface-muted)]',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-3 text-[13px] text-[var(--rn-text)]',
                      col.className
                    )}
                    style={{ height: 'var(--rn-row-height)' }}
                  >
                    {col.render
                      ? col.render(row, index)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
