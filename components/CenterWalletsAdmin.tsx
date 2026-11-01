'use client';

/** t83 (Super Admin): billing mode (postpaid / prepaid) and wallet balance per centre. */
import React, { useCallback, useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { ApiClient, apiErrorMessage, type CenterWallet } from '@/lib/api-client';
import { toast } from '@/components/ui/Toast';

export default function CenterWalletsAdmin() {
  const [rows, setRows] = useState<CenterWallet[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await ApiClient.getCenterWallets());
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const setMode = async (c: CenterWallet, mode: 'prepaid' | 'postpaid') => {
    try {
      const r = await ApiClient.setCenterBillingMode(c.centerId, mode);
      setRows((prev) => prev.map((x) => (x.centerId === c.centerId ? { ...x, ...r } : x)));
      toast.success(`${c.centerName} is now ${mode}`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not change billing mode'));
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white" data-testid="center-wallets-admin">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left">
        <Wallet className="w-4 h-4 text-sky-600" />
        <span className="text-sm font-bold text-slate-800">Centre billing mode & wallets</span>
        <span className="ml-auto text-xs text-slate-500">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-slate-100">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left">Centre</th>
                <th className="px-3 py-2 text-left">Billing</th>
                <th className="px-3 py-2 text-right">Wallet</th>
                <th className="px-3 py-2 text-right">Per report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => (
                <tr key={c.centerId}>
                  <td className="px-3 py-2 font-semibold text-slate-800">{c.centerName}</td>
                  <td className="px-3 py-2">
                    <select value={c.billingMode} onChange={(e) => setMode(c, e.target.value as 'prepaid' | 'postpaid')} className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs">
                      <option value="postpaid">Postpaid (monthly)</option>
                      <option value="prepaid">Prepaid (wallet)</option>
                    </select>
                  </td>
                  <td className={`px-3 py-2 text-right font-mono font-bold ${c.billingMode === 'prepaid' && c.insufficient ? 'text-rose-700' : c.billingMode === 'prepaid' && c.lowBalance ? 'text-amber-700' : 'text-slate-800'}`}>
                    {c.billingMode === 'prepaid' ? `₹${c.balance.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-600">₹{c.reportCharge}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-400">No centres</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
