'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Receipt, Lock, Unlock, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import { RadiologyStore } from '@/lib/radiology-store';
import { useConfirm, StatusBadge } from '@/components/ui';
import { RowCard, RowCardList, RT_CONTAINER, RT_TABLE_ONLY } from '@/components/ui/ResponsiveTable';

type InvoiceRow = {
  id: string;
  partyType: string;
  partyId: string;
  partyName: string;
  billingPeriod: string;
  status: string;
  storedStatus?: string;
  locked: boolean;
  totalAmount: number;
  currency: string;
  linkedInvoiceId?: string | null;
};

export default function SuperAdminInvoicesPage() {
  const confirm = useConfirm();
  const [tab, setTab] = useState<'center' | 'doctor'>('center');
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any>(null);
  const [periodFilter, setPeriodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lockPeriod, setLockPeriod] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const session = RadiologyStore.getSession();

  useEffect(() => {
    if (session?.role && session.role !== 'SUPER_ADMIN') {
      // Non-admins should use role-specific pages
    }
  }, [session?.role]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [inv, per, pr] = await Promise.all([
        ApiClient.getInvoices({
          partyType: tab === 'center' ? 'center' : 'doctor',
          period: periodFilter || undefined,
          status: statusFilter || undefined,
        }),
        ApiClient.getBillingPeriods().catch(() => []),
        ApiClient.getPricing().catch(() => null),
      ]);
      setInvoices(inv);
      setPeriods(per);
      setPricing(pr);
      if (!lockPeriod) {
        const now = new Date();
        const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setLockPeriod(ym);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, periodFilter, statusFilter]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    try {
      const d = await ApiClient.getInvoice(id);
      setDetail(d);
    } catch (e: any) {
      setError(e?.message || 'Failed to load invoice detail');
    }
  };

  const markStatus = async (id: string, status: 'paid' | 'pending') => {
    try {
      await ApiClient.updateInvoiceStatus(id, status);
      setNotice(`Invoice status updated to ${status}.`);
      setTimeout(() => setNotice(null), 3000);
      await load();
      if (selectedId === id) await openDetail(id);
    } catch (e: any) {
      setError(e?.message || 'Failed to update status');
    }
  };

  const doLock = async (unlock = false) => {
    if (!lockPeriod) return;
    const title = unlock ? `Unlock Billing Period ${lockPeriod}?` : `Lock Billing Period ${lockPeriod}?`;
    const message = unlock
      ? `Unlocking period ${lockPeriod} allows new sign-offs to accrue again.`
      : `Locking period ${lockPeriod} makes totals for this month immutable.`;

    const ok = await confirm({
      title,
      message,
      confirmLabel: unlock ? 'Unlock Period' : 'Lock Period',
      variant: unlock ? 'primary' : 'danger',
    });
    if (!ok) return;

    try {
      const res = await ApiClient.lockBillingPeriod(lockPeriod, unlock);
      setNotice(
        unlock
          ? `Period ${res.period} unlocked.`
          : `Period ${res.period} locked. Invoices finalized: ${res.invoicesFinalized ?? 0}`
      );
      setTimeout(() => setNotice(null), 4000);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Lock operation failed');
    }
  };

  const periodOptions = useMemo(() => {
    const fromInv = invoices.map((i) => i.billingPeriod);
    const fromLocks = periods.map((p) => p.period);
    return Array.from(new Set([...fromLocks, ...fromInv])).sort().reverse();
  }, [invoices, periods]);

  return (
    <div className="h-full overflow-auto bg-[var(--bg)] p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#009ef7]/10 text-[#009ef7] flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">Invoices & Billing</h1>
              <p className="text-[11px] text-slate-500 font-mono">
                {pricing?.variesByCenter ? 'Default: ' : ''}
                Center ₹{pricing?.center?.firstStudy ?? 30}/+{pricing?.center?.additionalStudy ?? 15} · Doctor ₹
                {pricing?.doctor?.firstStudy ?? 20}/+{pricing?.doctor?.additionalStudy ?? 10} · IST months
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Lock month control */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Billing period (YYYY-MM)</label>
            <input
              value={lockPeriod}
              onChange={(e) => setLockPeriod(e.target.value)}
              placeholder="2026-09"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-mono w-36"
            />
          </div>
          <button
            type="button"
            onClick={() => doLock(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" /> Lock / Close Month
          </button>
          <button
            type="button"
            onClick={() => doLock(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Unlock className="w-3.5 h-3.5" /> Unlock
          </button>
          <div className="text-[11px] text-slate-500 flex-1 min-w-[200px]">
            Only Super Admin can lock a month or mark invoices paid/pending. Locked totals never change.
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          {(['center', 'doctor'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setSelectedId(null);
                setDetail(null);
              }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wide border-b-2 -mb-px cursor-pointer ${
                tab === t
                  ? 'border-[#009ef7] text-[#009ef7]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t === 'center' ? 'Center Invoices' : 'Doctor Invoices'}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono bg-white"
          >
            <option value="">All periods</option>
            {periodOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
          >
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {notice && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs px-3 py-2 font-medium">
            {notice}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs px-3 py-2 font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-slate-50 md:bg-white overflow-hidden">
            {/* Phones: compact invoice cards (shared RowCard pattern, < md) */}
            <RowCardList
              isEmpty={loading || invoices.length === 0}
              empty={loading ? 'Loading...' : 'No invoices yet. Sign off a report to accrue charges.'}
              testId="invoice-cards"
            >
              {invoices.map((inv) => (
                <RowCard
                  key={inv.id}
                  className={selectedId === inv.id ? 'ring-2 ring-sky-300' : undefined}
                  title={inv.partyName}
                  subtitle={<span className="font-mono">{inv.billingPeriod}</span>}
                  aside={<StatusBadge status={inv.status.toUpperCase()} />}
                  fields={[
                    { label: 'Total', value: <span className="font-mono font-bold">{'\u20B9'}{inv.totalAmount}</span> },
                    { label: 'Lock', value: inv.locked ? 'Locked' : 'Open' },
                  ]}
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          openDetail(inv.id);
                          detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        title="Mark paid"
                        onClick={() => markStatus(inv.id, 'paid')}
                        className="px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Paid</span>
                      </button>
                      <button
                        type="button"
                        title="Mark pending"
                        onClick={() => markStatus(inv.id, 'pending')}
                        className="px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending</span>
                      </button>
                    </>
                  }
                />
              ))}
            </RowCardList>
            <div className={`${RT_TABLE_ONLY} ${RT_CONTAINER} overflow-x-auto min-w-full`}>
              <table className="w-full text-left text-xs min-w-[500px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-bold">
                  <tr>
                    <th className="px-3 py-2">Party</th>
                    <th className="px-3 py-2">Period</th>
                    <th className="px-3 py-2">Total</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Lock</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                        Loading…
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-slate-400 italic">
                        No invoices yet. Sign off a report to accrue charges.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr
                        key={inv.id}
                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${
                          selectedId === inv.id ? 'bg-sky-50/60' : ''
                        }`}
                        onClick={() => openDetail(inv.id)}
                      >
                        <td className="px-3 py-2.5 font-semibold text-slate-800">{inv.partyName}</td>
                        <td className="px-3 py-2.5 font-mono">{inv.billingPeriod}</td>
                        <td className="px-3 py-2.5 font-mono font-bold">₹{inv.totalAmount}</td>
                        <td className="px-3 py-2.5">
                          <StatusBadge status={inv.status.toUpperCase()} />
                        </td>
                        <td className="px-3 py-2.5">{inv.locked ? '🔒' : '—'}</td>
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              title="Mark paid"
                              onClick={() => markStatus(inv.id, 'paid')}
                              className="p-1 rounded border border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Mark pending"
                              onClick={() => markStatus(inv.id, 'pending')}
                              className="p-1 rounded border border-amber-200 text-amber-700 hover:bg-amber-50 cursor-pointer"
                            >
                              <Clock className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div ref={detailRef} className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-3 sm:p-4 min-h-[280px] scroll-mt-3">
            {!detail ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Select an invoice to view per-day / per-center breakdown
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">{detail.partyName}</div>
                  <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 mt-1">
                    <span>{detail.id}</span> · <span>{detail.billingPeriod}</span> ·{' '}
                    <StatusBadge status={detail.status.toUpperCase()} />
                  </div>
                  <div className="mt-1 text-lg font-bold font-mono text-slate-900">
                    ₹{detail.totalAmount}{' '}
                    <span className="text-xs font-normal text-slate-500">{detail.currency}</span>
                    {detail.locked && (
                      <span className="ml-2 text-[10px] uppercase text-slate-500 font-bold">Locked</span>
                    )}
                  </div>
                </div>

                {detail.byDay?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Per-day studies</div>
                    <div className="space-y-2 max-h-72 overflow-auto">
                      {detail.byDay.map((day: any) => (
                        <div key={day.serviceDate} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span>{day.serviceDate}</span>
                            <span className="font-mono">₹{day.dayTotal}</span>
                          </div>
                          <ul className="mt-1 space-y-0.5">
                            {day.studies.map((s: any) => (
                              <li key={s.id} className="text-[10px] text-slate-600 flex justify-between gap-2">
                                <span className="truncate">
                                  {s.patientName} · {s.bodyPart} · {s.modality}
                                </span>
                                <span className="font-mono shrink-0">₹{s.amount}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detail.byCenter?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Per-center</div>
                    {detail.byCenter.map((c: any) => (
                      <div key={c.centerId} className="flex justify-between text-xs py-1 border-b border-slate-100">
                        <span className="font-semibold">{c.centerName}</span>
                        <span className="font-mono">₹{c.centerTotal}</span>
                      </div>
                    ))}
                  </div>
                )}

                {detail.status === 'overdue' && (
                  <div className="flex items-start gap-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-2">
                    Unpaid and the next calendar month (IST) has started relative to {detail.billingPeriod}.
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

