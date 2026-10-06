'use client';

import React, { useEffect, useState } from 'react';
import { Stethoscope, RefreshCw, Wallet } from 'lucide-react';
import { ApiClient } from '@/lib/api-client';
import { RadiologyStore } from '@/lib/radiology-store';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function DoctorEarningsPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (inv.length) {
        const d = await ApiClient.getInvoice(inv[0].id);
        setSelected(d);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
                {pricing?.variesByCenter ? 'Default: ' : ''}
                ₹{pricing?.doctor?.firstStudy ?? 20} first study · ₹{pricing?.doctor?.additionalStudy ?? 10} each
                additional · per-center breakdown
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {error && <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
              <Stethoscope className="w-3 h-3" /> Monthly payouts
            </div>
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading…</div>
            ) : invoices.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 italic">No earnings yet</div>
            ) : (
              <ul>
                {invoices.map((inv) => (
                  <li key={inv.id}>
                    <button
                      type="button"
                      onClick={async () => setSelected(await ApiClient.getInvoice(inv.id))}
                      className={`w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 ${
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
                    <div className="text-xl font-bold font-mono">₹{selected.totalAmount}</div>
                    <div className="text-[10px] text-slate-400">INR payout</div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-2">Per-center breakdown</div>
                  {(selected.byCenter || []).length === 0 ? (
                    <div className="text-xs text-slate-400 italic">No line items</div>
                  ) : (
                    <div className="space-y-3 max-h-[55vh] overflow-auto">
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
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
