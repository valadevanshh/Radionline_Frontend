'use client';

/**
 * Super Admin: manage UPI accounts that receive centre wallet top-ups.
 * The selected account is what centres see on the Add money QR.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Plus, Pencil, RefreshCw, CheckCircle2, Ban } from 'lucide-react';
import {
  ApiClient,
  apiErrorMessage,
  type PaymentCollectionAccount,
  type PaymentCollectionAccountInput,
} from '@/lib/api-client';
import { useSession } from '@/lib/access';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { upiLink } from '@/components/WalletCard';

const fieldCls =
  'w-full h-9 px-3 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400';
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1';

const EMPTY: PaymentCollectionAccountInput = {
  label: '',
  upiId: '',
  upiName: 'Radionline',
  isActive: true,
  select: false,
};

export default function PaymentQrPage() {
  const session = useSession();
  const router = useRouter();
  const [accounts, setAccounts] = useState<PaymentCollectionAccount[]>([]);
  const [active, setActive] = useState<{ id: number | null; upiId: string; upiName: string; label: string | null } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentCollectionAccount | null>(null);
  const [form, setForm] = useState<PaymentCollectionAccountInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (session && session.role !== 'SUPER_ADMIN') router.replace('/dashboard');
  }, [session, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getCollectionAccounts();
      setAccounts(res.accounts || []);
      setActive(res.active || null);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not load payment accounts'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.role === 'SUPER_ADMIN') load();
  }, [session?.role, load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, select: accounts.length === 0 });
    setFormError('');
    setOpen(true);
  };

  const openEdit = (a: PaymentCollectionAccount) => {
    setEditing(a);
    setForm({
      label: a.label,
      upiId: a.upiId,
      upiName: a.upiName,
      isActive: a.isActive,
      select: a.isSelected,
    });
    setFormError('');
    setOpen(true);
  };

  const save = async () => {
    if (!form.label?.trim()) return setFormError('Enter a label (e.g. Business ICICI).');
    if (!/^[\w.\-]{2,}@[A-Za-z][\w.\-]{1,}$/.test((form.upiId || '').trim())) {
      return setFormError('Enter a valid UPI ID (e.g. name@okaxis).');
    }
    setBusy(true);
    setFormError('');
    try {
      const body: PaymentCollectionAccountInput = {
        label: form.label.trim(),
        upiId: form.upiId.trim(),
        upiName: (form.upiName || 'Radionline').trim() || 'Radionline',
        isActive: form.isActive !== false,
        select: !!form.select,
      };
      if (editing) await ApiClient.updateCollectionAccount(editing.id, body);
      else await ApiClient.createCollectionAccount(body);
      toast.success(editing ? 'Account updated' : 'Account added');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(apiErrorMessage(e, 'Could not save'));
    } finally {
      setBusy(false);
    }
  };

  const select = async (a: PaymentCollectionAccount) => {
    if (a.isSelected) return;
    if (!a.isActive) {
      toast.error('Activate the account before selecting it for the QR');
      return;
    }
    try {
      await ApiClient.selectCollectionAccount(a.id);
      toast.success(`Centres will now pay to ${a.upiId}`);
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not select account'));
    }
  };

  if (session && session.role !== 'SUPER_ADMIN') return null;

  const previewUpi = active?.upiId || '';
  const previewName = active?.upiName || 'Radionline';

  return (
    <div className="h-full overflow-auto bg-[var(--bg)] p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#009ef7]/10 text-[#009ef7] flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">Receive Payments</h1>
              <p className="text-[11px] text-slate-500">
                Choose which UPI account centres pay into when they add money to their wallet. The selected
                account is what appears on their QR.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <button
              type="button"
              onClick={openCreate}
              data-testid="add-collection-account"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add UPI account
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500">
              Your receive accounts
            </div>
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading…</div>
            ) : accounts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">
                No accounts yet. Add a UPI ID to start receiving wallet top-ups.
              </div>
            ) : (
              <ul className="divide-y divide-slate-50" data-testid="collection-account-list">
                {accounts.map((a) => (
                  <li
                    key={a.id}
                    className={`flex flex-wrap items-center gap-3 px-3 py-3 ${a.isSelected ? 'bg-sky-50/70' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => select(a)}
                      disabled={!a.isActive || a.isSelected}
                      title={a.isSelected ? 'Currently selected for centre QR' : 'Use this for centre QR'}
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        a.isSelected
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : a.isActive
                            ? 'border-slate-300 hover:border-sky-500 cursor-pointer'
                            : 'border-slate-200 opacity-40 cursor-not-allowed'
                      }`}
                      data-testid={`select-collection-${a.id}`}
                    >
                      {a.isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{a.label}</span>
                        {a.isSelected && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-600 text-white">
                            Live on centre QR
                          </span>
                        )}
                        {!a.isActive && (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-slate-700 mt-0.5">{a.upiId}</div>
                      <div className="text-[11px] text-slate-500">Payee name on UPI: {a.upiName}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openEdit(a)}
                      className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="text-[10px] font-bold uppercase text-slate-500">Centre QR preview</div>
            {previewUpi ? (
              <div className="flex flex-col items-center gap-2" data-testid="collection-qr-preview">
                <QRCodeSVG value={upiLink(previewUpi, previewName, 1000, 'Wallet top-up')} size={168} level="M" />
                <div className="text-center">
                  <div className="text-sm font-bold text-slate-900">{active?.label || 'Selected account'}</div>
                  <div className="text-xs font-mono font-semibold text-slate-800">{previewUpi}</div>
                  <div className="text-[11px] text-slate-500 mt-1">This is what prepaid centres see when adding money.</div>
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-xs text-slate-400 italic">
                Select an account to preview the QR
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit receive account' : 'Add receive account'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="h-9 px-4 rounded-lg border border-slate-300 bg-white text-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              data-testid="save-collection-account"
              className="h-9 px-4 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {formError && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">{formError}</div>
          )}
          <div>
            <label className={labelCls}>Label</label>
            <input
              className={fieldCls}
              value={form.label || ''}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Business ICICI"
            />
          </div>
          <div>
            <label className={labelCls}>UPI ID</label>
            <input
              className={`${fieldCls} font-mono`}
              value={form.upiId || ''}
              onChange={(e) => setForm((f) => ({ ...f, upiId: e.target.value }))}
              placeholder="name@okaxis"
            />
          </div>
          <div>
            <label className={labelCls}>Name shown on UPI apps</label>
            <input
              className={fieldCls}
              value={form.upiName || ''}
              onChange={(e) => setForm((f) => ({ ...f, upiName: e.target.value }))}
              placeholder="Radionline"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={!!form.select}
              onChange={(e) => setForm((f) => ({ ...f, select: e.target.checked }))}
            />
            Use this account on the centre QR now
          </label>
          {editing && (
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive !== false}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Active
              {!form.isActive && (
                <span className="inline-flex items-center gap-1 text-slate-400 font-normal">
                  <Ban className="w-3 h-3" /> Won&apos;t appear for selection
                </span>
              )}
            </label>
          )}
        </div>
      </Modal>
    </div>
  );
}
