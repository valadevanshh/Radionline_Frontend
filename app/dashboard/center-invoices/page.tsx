'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, RefreshCw, CalendarDays, CalendarRange } from 'lucide-react';
import { ApiClient, apiErrorMessage, resolveMediaUrl } from '@/lib/api-client';
import { centerIdsWith, showCenterColumn, useSession } from '@/lib/access';
import { PageShell, PageHeader, StatusBadge } from '@/components/ui';
import { InvoiceActions } from '@/components/InvoiceActions';
import { currentBillingPeriodIST, formatPeriodLabel } from '@/lib/invoice-print';

export default function CenterInvoicesPage() {
  const currentPeriod = useMemo(() => currentBillingPeriodIST(), []);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState(currentPeriod);
  const [viewMode, setViewMode] = useState<'monthly' | 'day'>('monthly');
  const [dayFilter, setDayFilter] = useState('');
  const session = useSession();
  const multi = showCenterColumn(session);
  const invoiceCenters = (session?.centers || []).filter((c) =>
    centerIdsWith(session, 'invoices', 'read').includes(c.centerId)
  );
  const [centerFilter, setCenterFilter] = useState('ALL');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [inv, pr] = await Promise.all([
        ApiClient.getInvoices({ partyType: 'center' }),
        ApiClient.getPricing(centerFilter !== 'ALL' ? centerFilter : undefined).catch(() => null),
      ]);
      setInvoices(inv);
      setPricing(pr);
      const firstVisible = inv.find(
        (i: any) =>
          i.billingPeriod === periodFilter && (centerFilter === 'ALL' || i.partyId === centerFilter)
      );
      setSelected(firstVisible ? await ApiClient.getInvoice(firstVisible.id) : null);
      setDayFilter('');
    } catch (e: any) {
      setError(apiErrorMessage(e, 'Failed to load center invoices'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerFilter]);

  useEffect(() => {
    const firstVisible = invoices.find(
      (i) => i.billingPeriod === periodFilter && (centerFilter === 'ALL' || i.partyId === centerFilter)
    );
    if (!firstVisible) {
      setSelected(null);
      return;
    }
    if (selected?.id === firstVisible.id) return;
    ApiClient.getInvoice(firstVisible.id)
      .then(setSelected)
      .catch(() => setSelected(null));
    setDayFilter('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodFilter, invoices]);

  const visibleInvoices = invoices.filter(
    (i) => i.billingPeriod === periodFilter && (centerFilter === 'ALL' || i.partyId === centerFilter)
  );

  const periodOptions = useMemo(() => {
    const set = new Set([currentPeriod, ...invoices.map((i) => i.billingPeriod)]);
    return Array.from(set).sort().reverse();
  }, [invoices, currentPeriod]);

  const filteredDays = useMemo(() => {
    const days = selected?.byDay || [];
    if (viewMode === 'day' && dayFilter) return days.filter((d: any) => d.serviceDate === dayFilter);
    return days;
  }, [selected, viewMode, dayFilter]);

  const displayTotal = useMemo(() => {
    if (viewMode === 'day' && dayFilter) {
      return filteredDays.reduce((s: number, d: any) => s + Number(d.dayTotal || 0), 0);
    }
    return selected?.totalAmount ?? 0;
  }, [viewMode, dayFilter, filteredDays, selected]);

  const letterheadUrl = useMemo(() => {
    if (!selected) return null;
    const fromSession = invoiceCenters.find((c) => c.centerId === selected.partyId) as any;
    const url = fromSession?.headerTemplateUrl || '';
    return resolveMediaUrl(url) || null;
  }, [selected, invoiceCenters]);

  // Fallback: load centre letterhead from centers API when session lacks it
  const [centerLetterheads, setCenterLetterheads] = useState<Record<string, string>>({});
  useEffect(() => {
    ApiClient.getCenters()
      .then((centers) => {
        const map: Record<string, string> = {};
        for (const c of centers || []) {
          if (c.headerTemplateUrl) map[c.id] = resolveMediaUrl(c.headerTemplateUrl) || '';
        }
        setCenterLetterheads(map);
      })
      .catch(() => {});
  }, []);

  const effectiveLetterhead =
    letterheadUrl || (selected ? centerLetterheads[selected.partyId] || null : null);

  return (
    <PageShell>
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#009ef7]" />
            <span>Center Invoices & Billing</span>
          </div>
        }
        subtitle={`Monthly invoices (IST) · ₹${pricing?.center?.firstStudy ?? 30} first · ₹${pricing?.center?.additionalStudy ?? 15} additional · ${formatPeriodLabel(periodFilter)}`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              style={{
                height: 32,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                padding: '0 8px',
                fontSize: 12,
                background: '#fff',
                fontFamily: 'ui-monospace, monospace',
              }}
              aria-label="Billing month"
            >
              {periodOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                  {p === currentPeriod ? ' (current)' : ''}
                </option>
              ))}
            </select>
            {multi && invoiceCenters.length > 1 && (
              <select
                value={centerFilter}
                onChange={(e) => setCenterFilter(e.target.value)}
                style={{
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  padding: '0 8px',
                  fontSize: 12,
                  background: '#fff',
                  maxWidth: 200,
                }}
                aria-label="Centre"
                data-testid="center-invoices-filter"
              >
                <option value="ALL">All my centres</option>
                {invoiceCenters.map((c) => (
                  <option key={c.centerId} value={c.centerId}>
                    {c.centerName}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        }
      />

      {error && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 font-medium">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              setViewMode('monthly');
              setDayFilter('');
            }}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold cursor-pointer ${
              viewMode === 'monthly' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" /> Monthly
          </button>
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold cursor-pointer border-l border-slate-200 ${
              viewMode === 'day' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Day-based
          </button>
        </div>
        {viewMode === 'day' && (
          <input
            type="date"
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono bg-white"
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500">
            Monthly Invoices ({visibleInvoices.length}) · {periodFilter}
          </div>
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading…</div>
          ) : visibleInvoices.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 italic">
              No invoices for {periodFilter} yet
            </div>
          ) : (
            <ul>
              {visibleInvoices.map((inv) => (
                <li key={inv.id}>
                  <button
                    type="button"
                    onClick={async () => {
                      setSelected(await ApiClient.getInvoice(inv.id));
                      setDayFilter('');
                    }}
                    className={`w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${
                      selected?.id === inv.id ? 'bg-sky-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-mono text-xs font-bold">{inv.billingPeriod}</span>
                      <StatusBadge status={inv.status.toUpperCase()} />
                    </div>
                    {multi && (
                      <div
                        className="text-[11px] font-semibold text-slate-600 truncate"
                        data-testid="invoice-center-name"
                      >
                        {inv.partyName}
                      </div>
                    )}
                    <div className="mt-0.5 font-mono text-sm font-bold text-slate-900">₹{inv.totalAmount}</div>
                    {inv.locked && <div className="text-[10px] text-slate-400">Locked</div>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
          {!selected ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400 italic">
              Select a month to inspect billing details
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-900">{selected.partyName}</h2>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-2">
                    <span>Period {selected.billingPeriod}</span> ·{' '}
                    <StatusBadge status={selected.status.toUpperCase()} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold font-mono">₹{displayTotal}</div>
                  <div className="text-[10px] text-slate-400 uppercase">
                    {selected.currency}
                    {viewMode === 'day' && dayFilter ? ` · ${dayFilter}` : ' · month'}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                  Download / print invoice
                  {viewMode === 'day' && dayFilter ? ` · ${dayFilter}` : ' · full month'}
                </div>
                {viewMode === 'day' && !dayFilter && (
                  <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-2">
                    Select a service day to generate a day-based invoice.
                  </div>
                )}
                <InvoiceActions
                  invoice={{
                    id: selected.id,
                    partyType: selected.partyType || 'center',
                    partyName: selected.partyName,
                    billingPeriod: selected.billingPeriod,
                    status: selected.status,
                    totalAmount: selected.totalAmount,
                    currency: selected.currency,
                    locked: selected.locked,
                    byDay: selected.byDay,
                    lineItems: selected.lineItems,
                    issuerName: selected.partyName,
                  }}
                  letterheadUrl={effectiveLetterhead}
                  serviceDate={viewMode === 'day' ? dayFilter || null : null}
                />
              </div>

              <div className="text-[10px] font-bold uppercase text-slate-500">
                {viewMode === 'day' && dayFilter ? 'Selected day' : 'Per-day study breakdown'}
              </div>
              {filteredDays.length === 0 ? (
                <div className="text-xs text-slate-400 italic">No line items for this scope</div>
              ) : (
                <div className="space-y-2 max-h-[55vh] overflow-auto">
                  {filteredDays.map((day: any) => (
                    <div key={day.serviceDate} className="rounded-lg border border-slate-100 overflow-hidden">
                      <div className="flex justify-between bg-slate-50 px-3 py-1.5 text-xs font-bold">
                        <button
                          type="button"
                          className="hover:text-[#009ef7] cursor-pointer"
                          onClick={() => {
                            setViewMode('day');
                            setDayFilter(day.serviceDate);
                          }}
                        >
                          {day.serviceDate}
                        </button>
                        <span className="font-mono">₹{day.dayTotal}</span>
                      </div>
                      <ul className="md:hidden divide-y divide-slate-50" data-testid="invoice-day-items">
                        {day.studies.map((s: any) => (
                          <li key={s.id} className="px-3 py-2 text-[11px]">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-slate-800 min-w-0 break-words">
                                {s.patientName}
                              </span>
                              <span className="font-mono font-bold shrink-0">{'\u20B9'}{s.amount}</span>
                            </div>
                            <div className="text-slate-500 mt-0.5">
                              #{s.studyIndex} {s.bodyPart} {'\u00b7'} {s.modality}
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-[11px] min-w-[320px]">
                          <thead>
                            <tr className="text-slate-400 text-left">
                              <th className="px-3 py-1">Patient</th>
                              <th className="px-2 py-1">Study</th>
                              <th className="px-2 py-1">Modality</th>
                              <th className="px-2 py-1 text-right">₹</th>
                            </tr>
                          </thead>
                          <tbody>
                            {day.studies.map((s: any) => (
                              <tr key={s.id} className="border-t border-slate-50">
                                <td className="px-3 py-1.5">{s.patientName}</td>
                                <td className="px-2 py-1.5">
                                  #{s.studyIndex} {s.bodyPart}
                                </td>
                                <td className="px-2 py-1.5">{s.modality}</td>
                                <td className="px-2 py-1.5 text-right font-mono font-bold">₹{s.amount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
