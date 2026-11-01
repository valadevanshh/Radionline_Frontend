'use client';

/**
 * t83: centre prepaid wallet. Shows the balance (highlighted when it can't cover one report),
 * "Add money" -> UPI QR for the platform UPI ID -> "Payment done" (pending Super Admin approval).
 * Renders nothing for postpaid centres. variant="banner" is a slim warning for other pages.
 */
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Wallet, Plus, AlertTriangle, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { ApiClient, apiErrorMessage, type CenterWallet } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';

const AMOUNTS = [1000, 2000, 5000];

export function upiLink(upiId: string, name: string, amount: number, note: string) {
  const q = new URLSearchParams({ pa: upiId, pn: name, am: String(amount), cu: 'INR', tn: note.slice(0, 50) });
  return `upi://pay?${q.toString()}`;
}

export default function WalletCard({
  centerId,
  canTopUp,
  variant = 'card',
}: {
  centerId: string | null | undefined;
  canTopUp?: boolean;
  variant?: 'card' | 'banner';
}) {
  const [w, setW] = useState<CenterWallet | null>(null);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(1000);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!centerId) return;
    try {
      setW(await ApiClient.getCenterWallet(centerId));
    } catch {
      setW(null);
    }
  }, [centerId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!w || w.billingMode !== 'prepaid') return null;
  const pending = (w.topups || []).filter((t) => t.status === 'PENDING');

  if (variant === 'banner') {
    if (!w.lowBalance && !pending.length) return null;
    return (
      <div
        data-testid="wallet-banner"
        className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${
          w.insufficient ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}
      >
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>
          {w.insufficient
            ? `Wallet balance ₹${w.balance} can't cover a report (₹${w.reportCharge}). New uploads are paused until money is added.`
            : `Wallet balance is running low: ₹${w.balance} (about ${w.reportsLeft} report${w.reportsLeft === 1 ? '' : 's'} left).`}
          {pending.length ? ` ${pending.length} top-up awaiting approval.` : ''}
        </span>
        <Link href="/dashboard/center-invoices" className="ml-auto underline">
          Open wallet
        </Link>
      </div>
    );
  }

  const submit = async () => {
    if (!centerId) return;
    setBusy(true);
    try {
      await ApiClient.requestWalletTopup(centerId, amount, reference.trim() || undefined);
      toast.success('Payment marked as done. The Super Admin will verify it and credit your wallet.');
      setOpen(false);
      setReference('');
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not send the payment request'));
    } finally {
      setBusy(false);
    }
  };

  const tone = w.insufficient
    ? 'border-rose-300 bg-rose-50'
    : w.lowBalance
      ? 'border-amber-300 bg-amber-50'
      : 'border-slate-200 bg-white';

  return (
    <div className={`rounded-xl border p-3 sm:p-4 ${tone}`} data-testid="wallet-card">
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
          <Wallet className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Prepaid wallet · {w.centerName}
          </div>
          <div className="text-xl font-bold font-mono text-slate-900" data-testid="wallet-balance">₹{w.balance.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-500">₹{w.reportCharge} per report · about {w.reportsLeft} report{w.reportsLeft === 1 ? '' : 's'} left</div>
        </div>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={load} title="Refresh" className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50">
            <RefreshCw className="w-4 h-4" />
          </button>
          {canTopUp && (
            <button type="button" data-testid="wallet-add-money" onClick={() => setOpen(true)} className="h-9 px-3 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Add money
            </button>
          )}
        </div>
      </div>

      {(w.insufficient || w.lowBalance) && (
        <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${w.insufficient ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`} data-testid="wallet-warning">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {w.insufficient
            ? `Balance is less than one report charge (₹${w.reportCharge}). Add money to keep uploading.`
            : 'Balance is about to run out. Add money soon.'}
        </div>
      )}

      {(w.topups || []).length > 0 && (
        <ul className="mt-3 space-y-1">
          {(w.topups || []).slice(0, 4).map((t) => (
            <li key={t.id} className="flex items-center gap-2 text-[11px] text-slate-600">
              {t.status === 'PENDING' ? <Clock className="w-3.5 h-3.5 text-amber-600" /> : t.status === 'APPROVED' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-rose-600" />}
              <span className="font-mono font-semibold">₹{t.amount}</span>
              <span>{t.status === 'PENDING' ? 'Awaiting Super Admin approval' : t.status === 'APPROVED' ? 'Credited' : `Rejected${t.note ? `: ${t.note}` : ''}`}</span>
              <span className="ml-auto text-slate-400">{new Date(t.requestedAt).toLocaleDateString('en-IN')}</span>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add money to wallet"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="h-9 px-4 rounded-lg border border-slate-300 bg-white text-sm">Cancel</button>
            <button type="button" data-testid="wallet-payment-done" onClick={submit} disabled={busy} className="h-9 px-4 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60">
              {busy ? 'Sending…' : 'Payment done'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Amount</label>
            <select data-testid="wallet-amount" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm">
              {AMOUNTS.map((a) => (
                <option key={a} value={a}>₹{a.toLocaleString('en-IN')}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-3" data-testid="wallet-qr">
            <QRCodeSVG value={upiLink(w.upiId, w.upiName, amount, `Wallet ${w.centerName}`)} size={176} level="M" />
            <div className="text-center">
              <div className="text-lg font-bold font-mono text-slate-900">₹{amount.toLocaleString('en-IN')}</div>
              <div className="text-xs text-slate-500">Scan with any UPI app or pay to</div>
              {w.collectionLabel && (
                <div className="text-[11px] font-semibold text-slate-600 mt-0.5">{w.collectionLabel}</div>
              )}
              <div className="text-sm font-mono font-semibold text-slate-800">{w.upiId}</div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">UPI reference / UTR <span className="font-normal text-slate-400">(optional)</span></label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={60} placeholder="e.g. 4123 5678 9012" className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono" />
          </div>
          <p className="text-[11px] text-slate-500">After paying, press <b>Payment done</b>. The amount is added once the Super Admin confirms the payment.</p>
        </div>
      </Modal>
    </div>
  );
}
