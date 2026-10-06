'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { ApiClient, MyWorkResponse } from '@/lib/api-client';
import { RadiologyStore, XRayReport } from '@/lib/radiology-store';
import { showCenterColumn, useSession } from '@/lib/access';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/format-date';
import { formatAsUUID } from '@/lib/uuid';
import { RowCard, RowCardList, RT_CONTAINER, RT_TABLE_ONLY } from '@/components/ui/ResponsiveTable';

type StatusFilter = '' | 'CLAIMED' | 'Completed';

export default function MyWorkPage() {
  const router = useRouter();
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const session = useSession();
  const showCenter = showCenterColumn(session);

  const [status, setStatus] = useState<StatusFilter>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [centerId, setCenterId] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [data, setData] = useState<MyWorkResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s = RadiologyStore.getSession();
    setSessionRole(s?.role || null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.getMyWork({
        status: status || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
        center: centerId || undefined,
        page,
        pageSize,
      });
      setData(res);
    } catch (e: any) {
      setData(null);
      setError(e?.message || 'Failed to load My Work');
    } finally {
      setLoading(false);
    }
  }, [status, dateFrom, dateTo, centerId, page, pageSize]);

  useEffect(() => {
    if (sessionRole && sessionRole !== 'DOCTOR') {
      setError('My Work is available for Doctor accounts only.');
      return;
    }
    if (sessionRole === 'DOCTOR') {
      load();
    }
  }, [load, sessionRole]);

  const totalPages = useMemo(() => {
    if (!data || data.page_size <= 0) return 1;
    return Math.max(1, Math.ceil(data.total / data.page_size));
  }, [data]);

  const centers = data?.centers || [];

  const statusBadge = (s: string) => {
    const base = 'px-2 py-0.5 rounded text-[10px] font-bold uppercase border';
    if (s === 'Completed') return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
    if (s === 'In Review' || s === 'CLAIMED') return `${base} bg-sky-50 text-sky-700 border-sky-200`;
    return `${base} bg-amber-50 text-amber-700 border-amber-200`;
  };

  const openWorkspace = (row: XRayReport) => {
    router.push(`/dashboard/workspace/${row.id}`);
  };

  const onFilterChange = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div className="h-full overflow-auto p-3 sm:p-6 bg-[var(--bg)]">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#009ef7]/10 text-[#009ef7] flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">My Work</h1>
              <p className="text-[11px] text-slate-500 font-mono">
                Your claimed and completed cases · scoped to your account
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
          <div className="col-span-2 flex items-center gap-1 text-[10px] font-bold uppercase text-slate-500 mr-1">
            <Filter className="w-3 h-3" /> Filters
          </div>
          <label className="flex flex-col gap-0.5 text-[10px] font-bold uppercase text-slate-500">
            Status
            <select
              value={status}
              onChange={(e) => onFilterChange(() => setStatus(e.target.value as StatusFilter))}
              className="w-full sm:w-auto text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-800 sm:min-w-[140px]"
            >
              <option value="">All my work</option>
              <option value="CLAIMED">In Review</option>
              <option value="Completed">Completed</option>
            </select>
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] font-bold uppercase text-slate-500">
            From
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onFilterChange(() => setDateFrom(e.target.value))}
              className="w-full sm:w-auto min-w-0 text-xs font-mono border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-800"
            />
          </label>
          <label className="flex flex-col gap-0.5 text-[10px] font-bold uppercase text-slate-500">
            To
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onFilterChange(() => setDateTo(e.target.value))}
              className="w-full sm:w-auto min-w-0 text-xs font-mono border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-800"
            />
          </label>
          {showCenter && (
          <label className="flex flex-col gap-0.5 text-[10px] font-bold uppercase text-slate-500">
            Center
            <select
              value={centerId}
              onChange={(e) => onFilterChange(() => setCenterId(e.target.value))}
              className="w-full sm:w-auto text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-800 sm:min-w-[160px]"
            >
              <option value="">All centers</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          )}
        </div>

        {error && (
          <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-500 font-mono">
              {data ? `${data.total} case(s)` : '—'}
            </span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-xs text-slate-400">Loading…</div>
          ) : !data || data.items.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 italic">
              No claimed or completed cases match these filters.
            </div>
          ) : (
            <>
            {/* Phones: compact case cards (shared RowCard pattern, < md) */}
            <RowCardList className="bg-slate-50" testId="my-work-cards">
              {data.items.map((row) => (
                <RowCard
                  key={row.id}
                  tone={row.isUrgent ? 'urgent' : 'default'}
                  title={
                    <span className={row.isUrgent ? 'text-red-500' : undefined}>
                      {row.fullName}
                      {row.isPartial || ((row.signedStudyCount || 0) > 0 && (row.signedStudyCount || 0) < (row.studyCount || row.bodyParts?.length || 0)) ? (
                        <span className="ml-2 text-[10px] font-semibold text-amber-600">
                          {row.signedStudyCount || 0} of {row.studyCount || row.bodyParts?.length || 0} reported
                        </span>
                      ) : null}
                    </span>
                  }
                  subtitle={<span className="font-mono">{formatAsUUID(row.patientNumber || row.id)}</span>}
                  aside={
                    <StatusBadge
                      status={row.status}
                      isPartial={
                        row.isPartial ||
                        ((row.signedStudyCount ?? 0) > 0 &&
                          (row.signedStudyCount ?? 0) < (row.studyCount ?? row.bodyParts?.length ?? 0))
                      }
                    />
                  }
                  fields={[
                    ...(showCenter ? [{ label: 'Center', value: row.radiologyCenterName }] : []),
                    { label: 'Study Date', value: <span className="font-mono">{formatDate(row.studyDate || (row as XRayReport & { workDate?: string }).workDate)}</span> },
                    { label: 'Body Parts', value: (row.bodyParts || []).join(', ') || '-', full: true },
                  ]}
                  actions={
                    <button
                      type="button"
                      onClick={() => openWorkspace(row)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#009ef7] hover:bg-[#008be0] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Open
                    </button>
                  }
                />
              ))}
            </RowCardList>
            <div className={`${RT_TABLE_ONLY} ${RT_CONTAINER} overflow-x-auto w-full`}>
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Patient</th>
                    {showCenter && <th className="px-3 py-2">Center</th>}
                    <th className="px-3 py-2">Study Date</th>
                    <th className="px-3 py-2">Body Parts</th>
                    <th className="px-3 py-2 min-w-[130px]">Status</th>
                    <th className="px-3 py-2 text-right sticky right-0 bg-slate-50 shadow-2xs">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5">
                        <div className={`font-bold ${row.isUrgent ? "text-red-500" : "text-slate-900"}`}>{row.fullName}{row.isPartial || ((row.signedStudyCount||0)>0 && (row.signedStudyCount||0)<(row.studyCount||row.bodyParts?.length||0)) ? <span className="ml-2 text-[10px] font-semibold text-amber-600">{row.signedStudyCount || 0} of {row.studyCount || row.bodyParts?.length || 0} reported</span> : null}</div>
                        <div className="font-mono text-[10px] text-slate-500">{formatAsUUID(row.patientNumber || row.id)}</div>
                      </td>
                      {showCenter && <td className="px-3 py-2.5 text-slate-700 font-medium">{row.radiologyCenterName}</td>}
                      <td className="px-3 py-2.5 font-mono text-slate-600">
                        {formatDate(row.studyDate || (row as XRayReport & { workDate?: string }).workDate)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 truncate max-w-[180px]">
                        {(row.bodyParts || []).join(', ') || '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge
                          status={row.status}
                          isPartial={
                            row.isPartial ||
                            ((row.signedStudyCount ?? 0) > 0 &&
                              (row.signedStudyCount ?? 0) < (row.studyCount ?? row.bodyParts?.length ?? 0))
                          }
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right sticky right-0 bg-white shadow-2xs">
                        <button
                          type="button"
                          onClick={() => openWorkspace(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#009ef7] hover:bg-[#008be0] text-white text-[11px] font-bold transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}

          {data && data.total > 0 && (
            <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-slate-500">
                Page {data.page} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-bold disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 text-[11px] font-bold disabled:opacity-40"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
