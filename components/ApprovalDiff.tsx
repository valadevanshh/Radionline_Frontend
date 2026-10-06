'use client';

import React, { useMemo } from 'react';
import { RowCard, RowCardList } from '@/components/ui/ResponsiveTable';

/** Fields that are large/noisy — show presence only unless changed */
const NOISE_KEYS = new Set([
  'uploadedImages',
  'dicomSnapshots',
  'dicomFileUrl',
  'dicomMetadata',
  'docContent',
  'content',
  'signatureUrl',
  'profileFileUrl',
  'headerTemplateUrl',
  'logoUrl',
  'reportsByBodyPart',
  'impressionsByBodyPart',
  'hasHeaderUrl',
  'hasNoHeaderUrl',
  'signatureApplied',
]);

const HIDDEN_ALWAYS = new Set(['password']);

function normalizeDisplay(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every((v) => typeof v === 'string' || typeof v === 'number')) {
      return value.join(', ');
    }
    return `[${value.length} items]`;
  }
  if (typeof value === 'object') {
    try {
      const s = JSON.stringify(value);
      return s.length > 120 ? s.slice(0, 117) + '…' : s;
    } catch {
      return '[object]';
    }
  }
  const s = String(value);
  if (s.startsWith('data:') || s.length > 160) {
    return `(${Math.min(s.length, 9999)} chars)`;
  }
  return s;
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function labelize(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export interface ApprovalDiffProps {
  actionType: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
}

export default function ApprovalDiff({ actionType, before, after }: ApprovalDiffProps) {
  const rows = useMemo(() => {
    const beforeObj = before && typeof before === 'object' ? before : {};
    const afterObj = after && typeof after === 'object' ? after : {};
    const isCreate = (actionType || '').toUpperCase().startsWith('CREATE');
    const isDelete = (actionType || '').toUpperCase().startsWith('DELETE');
    const isUpdate = (actionType || '').toUpperCase().startsWith('UPDATE');
    // An edit request only carries the fields it changes: compare just those
    // (the live record has many more fields that are not part of the request).
    const keySource =
      isUpdate && Object.keys(afterObj).length > 0
        ? Object.keys(afterObj)
        : [...Object.keys(beforeObj), ...Object.keys(afterObj)];
    const keys = Array.from(new Set(keySource)).filter((k) => !HIDDEN_ALWAYS.has(k));
    keys.sort((a, b) => a.localeCompare(b));

    const out: Array<{
      key: string;
      label: string;
      beforeVal: string;
      afterVal: string;
      changed: boolean;
    }> = [];

    for (const key of keys) {
      const bRaw = beforeObj[key];
      const aRaw = afterObj[key];
      const hasBefore = Object.prototype.hasOwnProperty.call(beforeObj, key);
      const hasAfter = Object.prototype.hasOwnProperty.call(afterObj, key);
      const changed = isCreate
        ? hasAfter && aRaw !== undefined && aRaw !== null && aRaw !== ''
        : isDelete
        ? hasBefore
        : !valuesEqual(bRaw, aRaw);

      // Hide unchanged noise; always show changed / important scalar fields
      if (!changed && NOISE_KEYS.has(key)) continue;
      if (!changed && !isCreate && !isDelete) {
        // hide unchanged empty-ish
        const bothEmpty =
          (bRaw === undefined || bRaw === null || bRaw === '') &&
          (aRaw === undefined || aRaw === null || aRaw === '');
        if (bothEmpty) continue;
      }
      if (!changed && !isCreate && !isDelete) {
        // keep important identity fields even if unchanged (small set)
        const keepUnchanged = new Set([
          'id',
          'fullName',
          'centerName',
          'patientNumber',
          'email',
          'title',
          'modality',
          'status',
        ]);
        if (!keepUnchanged.has(key)) continue;
      }

      out.push({
        key,
        label: labelize(key),
        beforeVal: isCreate ? '—' : normalizeDisplay(hasBefore ? bRaw : undefined),
        afterVal: isDelete
          ? '(will be deleted)'
          : key === 'addImages' && Array.isArray(aRaw)
          ? `${aRaw.length} new image${aRaw.length === 1 ? '' : 's'}`
          : normalizeDisplay(hasAfter ? aRaw : undefined),
        changed: !!changed,
      });
    }

    // Prefer changed rows first
    out.sort((a, b) => Number(b.changed) - Number(a.changed) || a.label.localeCompare(b.label));
    return out;
  }, [actionType, before, after]);

  if (!rows.length) {
    return (
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
        No comparable field changes to display.
      </div>
    );
  }

  const isCreate = (actionType || '').toUpperCase().startsWith('CREATE');
  const isDelete = (actionType || '').toUpperCase().startsWith('DELETE');

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
        {isCreate ? 'NEW VALUES' : isDelete ? 'CURRENT RECORD (DELETE)' : 'BEFORE → AFTER DIFF'}
        <span style={{ fontWeight: 500, marginLeft: 8, opacity: 0.85 }}>
          ({rows.filter((r) => r.changed).length} changed
          {!isCreate && !isDelete ? ` · ${rows.filter((r) => !r.changed).length} unchanged shown` : ''})
        </span>
      </div>
      {/* Phones: one compact card per field (shared RowCard pattern) */}
      <RowCardList className="p-0 gap-2" testId="approval-diff-cards">
        {rows.map((row) => (
          <RowCard
            key={row.key}
            className={row.changed ? 'border-l-4 border-l-amber-400' : undefined}
            title={
              <span className="text-xs">
                {row.label}
                {row.changed && <span className="ml-1.5 text-[9px] font-bold uppercase text-amber-700">changed</span>}
              </span>
            }
            fields={[
              !isCreate && {
                label: 'Before',
                value: <span className={`font-mono whitespace-pre-wrap ${row.changed ? 'text-red-800' : 'text-slate-500'}`}>{row.beforeVal}</span>,
              },
              {
                label: isDelete ? 'Action' : 'After',
                full: isCreate,
                value: <span className={`font-mono whitespace-pre-wrap ${row.changed ? 'text-green-800' : 'text-slate-500'}`}>{row.afterVal}</span>,
              },
            ]}
          />
        ))}
      </RowCardList>
      <table className="hidden md:table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr style={{ background: 'var(--surface-hover)', textAlign: 'left' }}>
            <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', width: '22%' }}>Field</th>
            {!isCreate && (
              <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', width: '39%' }}>Before</th>
            )}
            <th style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
              {isDelete ? 'Action' : 'After'}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.key}
              style={{
                background: row.changed ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                borderLeft: row.changed ? '3px solid #f59e0b' : '3px solid transparent',
              }}
            >
              <td
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid var(--border)',
                  fontWeight: row.changed ? 700 : 500,
                  color: 'var(--text)',
                  verticalAlign: 'top',
                }}
              >
                {row.label}
                {row.changed && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 9,
                      fontWeight: 700,
                      color: '#b45309',
                      textTransform: 'uppercase',
                    }}
                  >
                    changed
                  </span>
                )}
              </td>
              {!isCreate && (
                <td
                  style={{
                    padding: '6px 8px',
                    borderBottom: '1px solid var(--border)',
                    color: row.changed ? '#991b1b' : 'var(--text-secondary)',
                    fontFamily: 'ui-monospace, monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    verticalAlign: 'top',
                  }}
                >
                  {row.beforeVal}
                </td>
              )}
              <td
                style={{
                  padding: '6px 8px',
                  borderBottom: '1px solid var(--border)',
                  color: row.changed ? '#166534' : 'var(--text-secondary)',
                  fontFamily: 'ui-monospace, monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  verticalAlign: 'top',
                }}
              >
                {row.afterVal}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}