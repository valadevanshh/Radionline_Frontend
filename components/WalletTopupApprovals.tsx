'use client';

/**
 * t83 (Super Admin): pop-up for pending centre wallet top-ups ("Payment done").
 * Polls every 30 s (and on focus); Approve credits the wallet, Reject leaves it unchanged.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Wallet, CheckCircle2, XCircle } from 'lucide-react';
import { ApiClient, apiErrorMessage, type WalletTopup } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';

export default function WalletTopupApprovals() {
  const [items, setItems] = useState<WalletTopup[]>([]);
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const seen = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const rows = await ApiClient.getWalletTopups('PENDING');
      setItems(rows);
      if (rows.some((r) => !seen.current.has(r.id))) setOpen(true);
    } catch {
      /* endpoint missing / offline: stay quiet */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  const close = () => {
    items.forEach((i) => seen.current.add(i.id));
    setOpen(false);
  };

  const decide = async (t: WalletTopup, approve: boolean) => {
    let note: string | undefined;
    if (!approve) {
      const n = window.prompt('Reason for rejecting (shown to the centre):', 'Payment not received');
      if (n === null) return;
      note = n;
    }
    setBusyId(t.id);
    try {
      if (approve) {
        const r = await ApiClient.approveWalletTopup(t.id);
        toast.success(`₹${t.amount} added to ${t.centerName || 'the centre'}'s wallet${r.balance != null ? ` (balance ₹${r.balance})` : ''}`);
      } else {
        await ApiClient.rejectWalletTopup(t.id, note);
        toast.success('Top-up rejected');
      }
      const rest = items.filter((i) => i.id !== t.id);
      setItems(rest);
      if (!rest.length) setOpen(false);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not update the top-up'));
    } finally {
      setBusyId(null);
    }
  };

  if (!items.length) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="wallet-approvals-pill"
          className="fixed bottom-4 right-4 z-[60] inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:bg-amber-600"
        >
          <Wallet className="w-4 h-4" /> {items.length} wallet top-up{items.length > 1 ? 's' : ''} to verify
        </button>
      )}
      <Modal open={open} onClose={close} title="Wallet top-ups to verify" size="md">
        <p className="mb-3 text-xs text-slate-500">
          Check that each payment reached the UPI account before approving. Approving adds the amount to the centre&apos;s wallet.
        </p>
        <ul className="divide-y divide-slate-100" data-testid="wallet-approvals">
          {items.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2.5">
              <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                <div className="text-sm font-semibold text-slate-900">{t.centerName || t.centerId}</div>
                <div className="text-[11px] text-slate-500">
                  {t.requestedBy || 'Centre'} · {new Date(t.requestedAt).toLocaleString('en-IN')}
                  {t.reference ? <> · UTR <span className="font-mono">{t.reference}</span></> : null}
                </div>
              </div>
              <div className="text-base font-bold font-mono text-slate-900">₹{t.amount.toLocaleString('en-IN')}</div>
              <div className="flex gap-1.5 ml-auto sm:ml-0">
                <button type="button" disabled={busyId === t.id} onClick={() => decide(t, true)} className="h-9 sm:h-8 px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-1 hover:bg-emerald-700 disabled:opacity-60">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
                <button type="button" disabled={busyId === t.id} onClick={() => decide(t, false)} className="h-9 sm:h-8 px-3 rounded-lg border border-rose-200 bg-white text-rose-700 text-xs font-bold inline-flex items-center gap-1 hover:bg-rose-50 disabled:opacity-60">
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
