'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Stethoscope, RefreshCw, Wallet, CalendarDays, CalendarRange } from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { InvoiceActions } from '@/components/InvoiceActions';
import { currentBillingPeriodIST, formatPeriodLabel } from '@/lib/invoice-print';

export default function DoctorEarningsPage() {
  const currentPeriod = useMemo(() => currentBillingPeriodIST(), []);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState(currentPeriod);
  const [viewMode, setViewMode] = useState<'monthly' | 'day'>('monthly');
  const [dayFilter, setDayFilter] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [inv, pr] = await Promise.all([
        ApiClient.getInvoices({ partyType: 'doctor' }),
        ApiClient.getPricing().catch(() => null),
      ]);
      setInvoices(inv);
      setPricing(pr);
      const first = inv.find((i: any) => i.billingPeriod === periodFilter) || inv[0];
      if (first) {
        setSelected(await ApiClient.getInvoice(first.id));
        if (first.billingPeriod !== periodFilter) setPeriodFilter(first.billingPeriod);
      } else {
        setSelected(null);
      }
      setDayFilter('');
    } catch (e: any) {
      setError(e?.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const first = invoices.find((i) => i.billingPeriod === periodFilter);
    if (!first) {
      setSelected(null);
      return;
    }
    if (selected?.id === first.id) return;
    ApiClient.getInvoice(first.id)
      .then(setSelected)
      .catch(() => setSelected(null));
    setDayFilter('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodFilter, invoices]);

  const periodOptions = useMemo(() => {
    const set = new Set([currentPeriod, ...invoices.map((i) => i.billingPeriod)]);
    return Array.from(set).sort().reverse();
  }, [invoices, currentPeriod]);

  const visibleInvoices = invoices.filter((i) => i.billingPeriod === periodFilter);

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

  return (
    <div className="h-full overflow-auto p-4 sm:p-6 bg-[var(--bg)]">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#009ef7]/10 text-[#009ef7] flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">Doctor Earnings</h1>
              <p className="text-[11px] text-slate-500 font-mono">
                Monthly payouts (IST) · {formatPeriodLabel(periodFilter)} ·{' '}
                {pricing?.variesByCenter ? 'Default: ' : ''}₹{pricing?.doctor?.firstStudy ?? 20} first · ₹
                {pricing?.doctor?.additionalStudy ?? 10} additional
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono bg-white"
            >
              {periodOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                  {p === currentPeriod ? ' (current)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

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

        {error && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <Stethoscope className="w-3 h-3" /> Monthly payouts · {periodFilter}
            </div>
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading…</div>
            ) : visibleInvoices.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 italic">No earnings for {periodFilter}</div>
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
                        <StatusBadge status={inv.status} />
                      </div>
                      <div className="mt-0.5 font-mono text-sm font-bold text-slate-900">₹{inv.totalAmount}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-4">
            {!selected ? (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400 italic">Select a month</div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">{selected.partyName}</h2>
                    <div className="text-[11px] font-mono text-slate-500">
                      {selected.billingPeriod} · <StatusBadge status={selected.status} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold font-mono">₹{displayTotal}</div>
                    <div className="text-[10px] text-slate-400">
                      INR payout{viewMode === 'day' && dayFilter ? ` · ${dayFilter}` : ''}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                    Download / print statement
                    {viewMode === 'day' && dayFilter ? ` · ${dayFilter}` : ' · full month'}
                  </div>
                  {viewMode === 'day' && !dayFilter && (
                    <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-2">
                      Select a service day to generate a day-based statement.
                    </div>
                  )}
                  <InvoiceActions
                    invoice={{
                      id: selected.id,
                      partyType: selected.partyType || 'doctor',
                      partyName: selected.partyName,
                      billingPeriod: selected.billingPeriod,
                      status: selected.status,
                      totalAmount: selected.totalAmount,
                      currency: selected.currency || 'INR',
                      locked: selected.locked,
                      byDay: selected.byDay,
                      lineItems: selected.lineItems,
                      issuerName: 'Radionline',
                    }}
                    letterheadUrl={null}
                    serviceDate={viewMode === 'day' ? dayFilter || null : null}
                  />
                </div>

                {viewMode === 'monthly' && (selected.byCenter || []).length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-500 mb-2">Per-center breakdown</div>
                    <div className="space-y-3 max-h-[40vh] overflow-auto">
                      {selected.byCenter.map((c: any) => (
                        <div key={c.centerId} className="rounded-lg border border-slate-100 overflow-hidden">
                          <div className="flex justify-between bg-slate-50 px-3 py-1.5 text-xs font-bold">
                            <span>{c.centerName}</span>
                            <span className="font-mono">₹{c.centerTotal}</span>
                          </div>
                          <ul className="divide-y divide-slate-50">
                            {c.studies.map((s: any) => (
                              <li key={s.id} className="px-3 py-1.5 text-[11px] flex justify-between gap-2">
                                <span className="truncate">
                                  {s.serviceDate} · {s.patientName} · #{s.studyIndex} {s.bodyPart} ({s.modality})
                                </span>
                                <span className="font-mono font-bold shrink-0">₹{s.amount}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(viewMode === 'day' || !(selected.byCenter || []).length) && (
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-500 mb-2">
                      {viewMode === 'day' && dayFilter ? 'Selected day' : 'Per-day studies'}
                    </div>
                    {filteredDays.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">No line items</div>
                    ) : (
                      <div className="space-y-2 max-h-[40vh] overflow-auto">
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
                            <ul className="divide-y divide-slate-50">
                              {day.studies.map((s: any) => (
                                <li key={s.id} className="px-3 py-1.5 text-[11px] flex justify-between gap-2">
                                  <span className="truncate">
                                    {s.patientName} · #{s.studyIndex} {s.bodyPart} ({s.modality})
                                    {s.centerName ? ` · ${s.centerName}` : ''}
                                  </span>
                                  <span className="font-mono font-bold shrink-0">₹{s.amount}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
