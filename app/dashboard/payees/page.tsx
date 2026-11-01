'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark, Plus, Pencil, RefreshCw, Search, Ban, CheckCircle2, Copy, Check } from 'lucide-react';
import {
  ApiClient,
  apiErrorMessage,
  type CenterReferrer,
  type PayeeAccount,
  type PayeeAccountInput,
  type PayeeType,
} from '@/lib/api-client';
import { useSession } from '@/lib/access';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';

const TYPE_LABELS: Record<PayeeType, string> = {
  REFERRER: 'Referring doctor',
  DOCTOR: 'Radiologist',
  OTHER: 'Other',
};

const fieldCls =
  'w-full h-9 px-3 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400';
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1';

type Option = { id: string; name: string };

const EMPTY: PayeeAccountInput = {
  payeeName: '',
  payeeType: 'REFERRER',
  centerId: null,
  doctorId: null,
  accountHolder: '',
  bankName: '',
  accountNumber: '',
  ifsc: '',
  upiId: '',
  notes: '',
  isActive: true,
};

function maskAccount(n?: string | null) {
  if (!n) return '—';
  return n.length <= 4 ? n : `•••• ${n.slice(-4)}`;
}

function CopyBtn({ value, label, boxed }: { value?: string | null; label: string; boxed?: boolean }) {
  const [done, setDone] = useState(false);
  if (!value) return null;
  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
      else {
        const ta = document.createElement('textarea');
        ta.value = value;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setDone(true);
      toast.success(`${label} copied`);
      setTimeout(() => setDone(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };
  return (
    <button type="button" title={`Copy ${label.toLowerCase()}`} aria-label={`Copy ${label.toLowerCase()}`} data-testid="copy-btn" onClick={copy}
      className={`inline-flex shrink-0 items-center justify-center rounded align-middle transition-colors ${boxed ? 'h-6 w-6 border border-slate-200 bg-white' : 'h-5 w-5'} ${done ? 'text-emerald-600' : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50'}`}>
      {done ? <Check size={boxed ? 13 : 12} /> : <Copy size={boxed ? 13 : 12} />}
    </button>
  );
}

function CopyLabel({ text, value, optional }: { text: string; value?: string | null; optional?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-semibold text-slate-600">
        {text}{optional && <span className="font-normal text-slate-400"> (optional)</span>}
      </span>
      <CopyBtn value={value?.trim()} label={text} />
    </div>
  );
}

export default function PayeesPage() {
  const session = useSession();
  const router = useRouter();
  const isSA = session?.role === 'SUPER_ADMIN';

  const [rows, setRows] = useState<PayeeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | PayeeType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [centers, setCenters] = useState<Option[]>([]);
  const [doctors, setDoctors] = useState<Option[]>([]);
  const [referrers, setReferrers] = useState<CenterReferrer[]>([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PayeeAccount | null>(null);
  const [form, setForm] = useState<PayeeAccountInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toggleTarget, setToggleTarget] = useState<PayeeAccount | null>(null);

  // Route guard: Super Admin only
  useEffect(() => {
    if (session && !isSA) router.replace('/dashboard');
  }, [session, isSA, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await ApiClient.getPayees());
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load payee accounts'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSA) return;
    load();
    ApiClient.getCenters()
      .then((cs) => setCenters((cs || []).map((c) => ({ id: String(c.id), name: c.centerName }))))
      .catch(() => setCenters([]));
    ApiClient.getDoctors()
      .then((ds) => setDoctors((ds || []).map((d) => ({ id: String(d.id), name: d.fullName || `${d.firstName} ${d.lastName}`.trim() }))))
      .catch(() => setDoctors([]));
  }, [isSA, load]);

  // Saved referrers of the selected centre (t77 list)
  useEffect(() => {
    if (!open || form.payeeType !== 'REFERRER' || !form.centerId) {
      setReferrers([]);
      return;
    }
    let alive = true;
    ApiClient.getCenterReferrers(form.centerId)
      .then((r) => alive && setReferrers(r || []))
      .catch(() => alive && setReferrers([]));
    return () => {
      alive = false;
    };
  }, [open, form.payeeType, form.centerId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== 'ALL' && r.payeeType !== typeFilter) return false;
      if (statusFilter === 'ACTIVE' && !r.isActive) return false;
      if (statusFilter === 'INACTIVE' && r.isActive) return false;
      if (!s) return true;
      return [r.payeeName, r.accountHolder, r.bankName, r.ifsc, r.upiId, r.centerName, r.doctorName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s));
    });
  }, [rows, q, typeFilter, statusFilter]);

  const set = <K extends keyof PayeeAccountInput>(k: K, v: PayeeAccountInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setFormError(null);
    setOpen(true);
  };
  const openEdit = (r: PayeeAccount) => {
    setEditing(r);
    setForm({
      payeeName: r.payeeName,
      payeeType: r.payeeType,
      centerId: r.centerId ?? null,
      doctorId: r.doctorId ?? null,
      accountHolder: r.accountHolder ?? '',
      bankName: r.bankName ?? '',
      accountNumber: r.accountNumber ?? '',
      ifsc: r.ifsc ?? '',
      upiId: r.upiId ?? '',
      notes: r.notes ?? '',
      isActive: r.isActive,
    });
    setFormError(null);
    setOpen(true);
  };

  const save = async () => {
    setFormError(null);
    if (!form.payeeName.trim()) return setFormError('Payee name is required.');
    if (form.payeeType === 'REFERRER' && !form.centerId) return setFormError('Select the centre of this referrer.');
    if (form.payeeType === 'DOCTOR' && !form.doctorId) return setFormError('Select the radiologist.');
    if (!form.accountNumber?.trim() && !form.upiId?.trim()) return setFormError('Enter a bank account or a UPI ID.');
    const body: PayeeAccountInput = {
      ...form,
      payeeName: form.payeeName.trim(),
      centerId: form.payeeType === 'REFERRER' ? form.centerId : null,
      doctorId: form.payeeType === 'DOCTOR' ? form.doctorId : null,
      accountNumber: form.accountNumber?.replace(/\s+/g, '') || null,
      ifsc: form.ifsc?.trim().toUpperCase() || null,
      upiId: form.upiId?.trim() || null,
      accountHolder: form.accountHolder?.trim() || null,
      bankName: form.bankName?.trim() || null,
      notes: form.notes?.trim() || null,
    };
    setSaving(true);
    try {
      if (editing) await ApiClient.updatePayee(editing.id, body);
      else await ApiClient.createPayee(body);
      toast.success(editing ? 'Payee updated' : 'Payee added');
      setOpen(false);
      load();
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not save payee'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    const r = toggleTarget;
    if (!r) return;
    setToggleTarget(null);
    try {
      const { id, centerName, doctorName, createdAt, updatedAt, ...rest } = r;
      void centerName; void doctorName; void createdAt; void updatedAt;
      await ApiClient.updatePayee(id, { ...rest, isActive: !r.isActive });
      toast.success(r.isActive ? 'Payee deactivated' : 'Payee reactivated');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not update payee'));
    }
  };

  if (!session || !isSA) {
    return <div className="p-6 text-sm text-slate-500">Checking access…</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
            <Landmark size={20} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900">Payee Accounts</h1>
            <p className="text-xs text-slate-500">Bank / UPI details of referring doctors, radiologists and others we pay.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="h-9 px-3 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5">
            <RefreshCw size={14} /> Refresh
          </button>
          <button id="payee-add" onClick={openNew} className="h-9 px-3 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 flex items-center gap-1.5">
            <Plus size={15} /> Add payee
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 mb-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${fieldCls} pl-8`} placeholder="Search name, bank, IFSC, UPI, centre…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={fieldCls} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'ALL' | PayeeType)}>
          <option value="ALL">All types</option>
          {(Object.keys(TYPE_LABELS) as PayeeType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select className={fieldCls} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ALL">All statuses</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Landmark className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="text-sm font-semibold text-slate-700">{rows.length ? 'No payees match these filters' : 'No payee accounts yet'}</p>
            <p className="text-xs text-slate-500 mt-1">Add the bank or UPI details of someone you pay.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2">Payee</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2 hidden md:table-cell">Linked to</th>
                  <th className="text-left px-3 py-2">Bank</th>
                  <th className="text-left px-3 py-2 whitespace-nowrap">Account no.</th>
                  <th className="text-left px-3 py-2">IFSC</th>
                  <th className="text-left px-3 py-2 hidden lg:table-cell">UPI</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className={r.isActive ? '' : 'opacity-60'}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 font-semibold text-slate-900">{r.payeeName}<CopyBtn value={r.payeeName} label="Payee name" /></div>
                      {r.accountHolder && r.accountHolder !== r.payeeName && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">A/c: {r.accountHolder}<CopyBtn value={r.accountHolder} label="Account holder" /></div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{TYPE_LABELS[r.payeeType] ?? r.payeeType}</td>
                    <td className="px-3 py-2 text-slate-600 hidden md:table-cell">
                      {r.payeeType === 'REFERRER' ? r.centerName || '—' : r.payeeType === 'DOCTOR' ? r.doctorName || '—' : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 text-slate-800">{r.bankName || '—'}<CopyBtn value={r.bankName} label="Bank" /></div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap" data-testid="cell-account">
                      <span className="inline-flex items-center gap-1.5 font-mono text-slate-800">
                        {maskAccount(r.accountNumber)}
                        <CopyBtn value={r.accountNumber} label="Account number" boxed />
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap" data-testid="cell-ifsc">
                      <span className="inline-flex items-center gap-1.5 font-mono text-slate-800">
                        {r.ifsc || '—'}
                        <CopyBtn value={r.ifsc} label="IFSC" boxed />
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 hidden lg:table-cell"><span className="inline-flex items-center gap-1">{r.upiId || '—'}<CopyBtn value={r.upiId} label="UPI ID" /></span></td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${r.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button title="Edit" onClick={() => openEdit(r)} className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600">
                          <Pencil size={14} />
                        </button>
                        <button title={r.isActive ? 'Deactivate' : 'Reactivate'} onClick={() => setToggleTarget(r)} className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600">
                          {r.isActive ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit payee account' : 'Add payee account'}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="h-9 px-4 rounded-lg border border-slate-300 text-sm bg-white hover:bg-slate-50">Cancel</button>
            <button id="payee-save" onClick={save} disabled={saving} className="h-9 px-4 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-60">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add payee'}
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Type</label>
            <select id="payee-type" className={fieldCls} value={form.payeeType}
              onChange={(e) => setForm((f) => ({ ...f, payeeType: e.target.value as PayeeType, centerId: null, doctorId: null }))}>
              {(Object.keys(TYPE_LABELS) as PayeeType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={fieldCls} value={form.isActive ? 'yes' : 'no'} onChange={(e) => set('isActive', e.target.value === 'yes')}>
              <option value="yes">Active</option>
              <option value="no">Inactive</option>
            </select>
          </div>

          {form.payeeType === 'REFERRER' && (
            <>
              <div>
                <label className={labelCls}>Centre</label>
                <select id="payee-center" className={fieldCls} value={form.centerId ?? ''} onChange={(e) => set('centerId', e.target.value || null)}>
                  <option value="">Select centre…</option>
                  {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Saved referrer</label>
                <select className={fieldCls} disabled={!form.centerId} value=""
                  onChange={(e) => e.target.value && set('payeeName', e.target.value)}>
                  <option value="">{!form.centerId ? 'Pick a centre first' : referrers.length ? 'Pick to fill name…' : 'No saved referrers'}</option>
                  {referrers.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
                </select>
              </div>
            </>
          )}

          {form.payeeType === 'DOCTOR' && (
            <div className="sm:col-span-2">
              <label className={labelCls}>Radiologist</label>
              <select className={fieldCls} value={form.doctorId ?? ''}
                onChange={(e) => {
                  const d = doctors.find((x) => x.id === e.target.value);
                  setForm((f) => ({ ...f, doctorId: e.target.value || null, payeeName: d ? d.name : f.payeeName }));
                }}>
                <option value="">Select radiologist…</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          <div className="sm:col-span-2">
            <CopyLabel text="Payee name" value={form.payeeName} />
            <input id="payee-name" className={fieldCls} value={form.payeeName} onChange={(e) => set('payeeName', e.target.value)} placeholder="e.g. DR. A. SHARMA" />
          </div>
          <div>
            <CopyLabel text="Account holder" value={form.accountHolder} />
            <input id="payee-holder" className={fieldCls} value={form.accountHolder ?? ''} onChange={(e) => set('accountHolder', e.target.value)} />
          </div>
          <div>
            <CopyLabel text="Bank" value={form.bankName} />
            <input id="payee-bank" className={fieldCls} value={form.bankName ?? ''} onChange={(e) => set('bankName', e.target.value)} />
          </div>
          <div>
            <CopyLabel text="Account number" value={form.accountNumber} />
            <input id="payee-acno" inputMode="numeric" className={`${fieldCls} font-mono`} value={form.accountNumber ?? ''} onChange={(e) => set('accountNumber', e.target.value.replace(/[^\d\s]/g, ''))} />
          </div>
          <div>
            <CopyLabel text="IFSC" value={form.ifsc} />
            <input id="payee-ifsc" maxLength={11} className={`${fieldCls} font-mono uppercase`} value={form.ifsc ?? ''} onChange={(e) => set('ifsc', e.target.value.toUpperCase())} placeholder="SBIN0001234" />
          </div>
          <div className="sm:col-span-2">
            <CopyLabel text="UPI ID" value={form.upiId} optional />
            <input className={fieldCls} value={form.upiId ?? ''} onChange={(e) => set('upiId', e.target.value)} placeholder="name@bank" />
          </div>
          <div className="sm:col-span-2">
            <CopyLabel text="Notes" value={form.notes} optional />
            <textarea rows={2} className={`${fieldCls} h-auto py-2`} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
          </div>
          {formError && <div className="sm:col-span-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{formError}</div>}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.isActive ? 'Deactivate payee?' : 'Reactivate payee?'}
        message={toggleTarget?.isActive ? `${toggleTarget?.payeeName} will be hidden from active payees. Details are kept.` : `${toggleTarget?.payeeName} will be marked active again.`}
        confirmLabel={toggleTarget?.isActive ? 'Deactivate' : 'Reactivate'}
        onConfirm={toggleActive}
        onCancel={() => setToggleTarget(null)}
      />
    </div>
  );
}
