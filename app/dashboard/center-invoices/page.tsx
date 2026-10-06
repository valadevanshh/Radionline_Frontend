'use client';

import React, { useEffect, useState } from 'react';
import { Building2, RefreshCw, Receipt } from 'lucide-react';
import { ApiClient, apiErrorMessage } from '@/lib/api-client';
import { centerIdsWith, showCenterColumn, useSession } from '@/lib/access';
import { PageShell, PageHeader, StatusBadge } from '@/components/ui';

export default function CenterInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useSession();
  const multi = showCenterColumn(session);
  // Centres whose invoices this login may see (Invoices = view or edit)
  const invoiceCenters = (session?.centers || []).filter((c) => centerIdsWith(session, 'invoices', 'read').includes(c.centerId));
  const [centerFilter, setCenterFilter] = useState('ALL');

  const getCurrentPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

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
      const firstVisible = inv.find((i: any) => centerFilter === 'ALL' || i.partyId === centerFilter);
      setSelected(firstVisible ? await ApiClient.getInvoice(firstVisible.id) : null);
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

  const visibleInvoices = invoices.filter((i) => centerFilter === 'ALL' || i.partyId === centerFilter);

  const currentMonthPeriod = getCurrentPeriod();

  return (
    <PageShell>
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#009ef7]" />
            <span>Center Invoices & Billing</span>
          </div>
        }
        subtitle={`Rate Card: ₹${pricing?.center?.firstStudy ?? 30} first study · ₹${pricing?.center?.additionalStudy ?? 15} additional study · Current Period: ${currentMonthPeriod}`}
        actions={
          <div className="flex items-center gap-2">
          {multi && invoiceCenters.length > 1 && (
            <select
              value={centerFilter}
              onChange={(e) => setCenterFilter(e.target.value)}
              style={{ height: 32, borderRadius: 8, border: '1px solid #e2e8f0', padding: '0 8px', fontSize: 12, background: '#fff', maxWidth: 200 }}
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

      {error && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 font-medium">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500">
            Monthly Invoices ({visibleInvoices.length})
          </div>
          {loading ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading…</div>
          ) : visibleInvoices.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 italic">
              No finalized invoices for {currentMonthPeriod} yet
            </div>
          ) : (
            <ul>
              {visibleInvoices.map((inv) => (
                <li key={inv.id}>
                  <button
                    type="button"
                    onClick={async () => setSelected(await ApiClient.getInvoice(inv.id))}
                    className={`w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 cursor-pointer ${
                      selected?.id === inv.id ? 'bg-sky-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-mono text-xs font-bold">{inv.billingPeriod}</span>
                      <StatusBadge status={inv.status.toUpperCase()} />
                    </div>
                    {multi && <div className="text-[11px] font-semibold text-slate-600 truncate" data-testid="invoice-center-name">{inv.partyName}</div>}
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
                    <Receipt className="w-4 h-4 text-[#009ef7]" />
                    <h2 className="font-bold text-slate-900">{selected.partyName}</h2>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-2">
                    <span>Period {selected.billingPeriod}</span> · <StatusBadge status={selected.status.toUpperCase()} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold font-mono">₹{selected.totalAmount}</div>
                  <div className="text-[10px] text-slate-400 uppercase">{selected.currency}</div>
                </div>
              </div>

              <div className="text-[10px] font-bold uppercase text-slate-500">Per-day study breakdown</div>
              {(selected.byDay || []).length === 0 ? (
                <div className="text-xs text-slate-400 italic">No line items for this period</div>
              ) : (
                <div className="space-y-2 max-h-[55vh] overflow-auto">
                  {selected.byDay.map((day: any) => (
                    <div key={day.serviceDate} className="rounded-lg border border-slate-100 overflow-hidden">
                      <div className="flex justify-between bg-slate-50 px-3 py-1.5 text-xs font-bold">
                        <span>{day.serviceDate}</span>
                        <span className="font-mono">₹{day.dayTotal}</span>
                      </div>
                      {/* Phones: compact line items instead of a scrolling table */}
                      <ul className="md:hidden divide-y divide-slate-50" data-testid="invoice-day-items">
                        {day.studies.map((s: any) => (
                          <li key={s.id} className="px-3 py-2 text-[11px]">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-slate-800 min-w-0 break-words">{s.patientName}</span>
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

