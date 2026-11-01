'use client';

/** Super Admin: recent audit log for doctors / centres / centre users. */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import { ApiClient, apiErrorMessage, type AuditLogEntry } from '@/lib/api-client';

function formatAt(v?: string | null): string {
  if (!v) return '—';
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

function label(e: AuditLogEntry): string {
  const who = e.actorName || e.actorRole || 'system';
  const ent = e.entityType.replace('_', ' ');
  return `${e.action} · ${ent} · ${e.entityId}`;
}

export default function EntityAuditPanel() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      setErr('');
      setRows(await ApiClient.getAuditLog({ limit: 80 }));
    } catch (e) {
      setRows([]);
      setErr(apiErrorMessage(e, 'Could not load audit log'));
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white" data-testid="entity-audit-panel">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
        <ScrollText className="w-4 h-4 text-slate-600" />
        <span className="text-sm font-bold text-slate-800">Entity audit log</span>
        <span className="ml-auto text-xs text-slate-500">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="border-t border-slate-100 max-h-72 overflow-auto">
          {err ? <div className="px-3 py-3 text-xs text-rose-600">{err}</div> : null}
          {!err && !rows.length ? (
            <div className="px-3 py-4 text-center text-xs text-slate-400">No audit entries yet</div>
          ) : null}
          <ul className="divide-y divide-slate-100 text-xs">
            {rows.map((r) => (
              <li key={r.id} className="px-3 py-2" data-testid="audit-row">
                <div className="font-semibold text-slate-800">{label(r)}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {formatAt(r.at)} · {r.actorName || '—'}
                  {r.note ? ` · ${r.note}` : ''}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
