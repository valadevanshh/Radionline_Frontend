'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCog, Plus, Pencil, Trash2, X, RefreshCw } from 'lucide-react';
import { ApiClient, ManagerAccount, ManagerPage, ManagerPermissions, apiErrorMessage } from '@/lib/api-client';
import { RadiologyStore } from '@/lib/radiology-store';
import { toast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui';

const PAGES: Array<{ key: ManagerPage; label: string; hint: string }> = [
  { key: 'reports', label: 'All Reports', hint: 'Patient records: upload, edit, delete' },
  { key: 'doctors', label: 'Doctors', hint: 'Add doctor, freeze, delete' },
  { key: 'centers', label: 'Centers', hint: 'Add / edit centre, freeze, delete' },
];
const ACTIONS: Array<{ key: 'read' | 'write' | 'delete'; label: string }> = [
  { key: 'read', label: 'Read' },
  { key: 'write', label: 'Write (add / edit)' },
  { key: 'delete', label: 'Delete' },
];

const emptyPerms = (): ManagerPermissions => ({
  reports: { read: false, write: false, delete: false },
  doctors: { read: false, write: false, delete: false },
  centers: { read: false, write: false, delete: false },
});

type FormState = { id?: number; name: string; email: string; password: string; permissions: ManagerPermissions };

export default function ManagersPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<ManagerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await ApiClient.getManagers());
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not load managers'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ok = RadiologyStore.getSession()?.role === 'SUPER_ADMIN';
    setAllowed(ok);
    if (!ok) router.replace('/dashboard');
    else load();
  }, [router, load]);

  const setPerm = (page: ManagerPage, action: 'read' | 'write' | 'delete', value: boolean) => {
    setForm((f) => {
      if (!f) return f;
      const p = { ...f.permissions[page], [action]: value };
      if (action !== 'read' && value) p.read = true; // write / delete need read
      if (action === 'read' && !value) { p.write = false; p.delete = false; }
      return { ...f, permissions: { ...f.permissions, [page]: p } };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim() || (!form.id && !form.email.trim())) {
      toast.error('Name and email are required');
      return;
    }
    if ((!form.id || form.password) && form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    try {
      if (form.id) {
        await ApiClient.updateManager(form.id, {
          name: form.name,
          permissions: form.permissions,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success('Manager updated. New permissions apply right away.');
      } else {
        await ApiClient.createManager({ name: form.name, email: form.email, password: form.password, permissions: form.permissions });
        toast.success('Manager account created');
      }
      setForm(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not save the manager'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: ManagerAccount) => {
    const ok = await confirm({
      title: 'Deactivate manager',
      message: `${m.name} (${m.email}) will no longer be able to log in. Their past requests stay in Approvals.`,
      confirmLabel: 'Deactivate',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await ApiClient.deleteManager(m.id);
      toast.success('Manager deactivated');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not deactivate the manager'));
    }
  };

  const summary = (p: ManagerPermissions) =>
    PAGES.map(({ key, label }) => {
      const v = p[key];
      const bits = [v.read && 'R', v.write && 'W', v.delete && 'D'].filter(Boolean).join('/');
      return bits ? `${label}: ${bits}` : null;
    })
      .filter(Boolean)
      .join(' · ') || 'No pages';

  if (allowed !== true) return null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 space-y-3 max-w-6xl w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2 font-mono">
              <UserCog className="w-5 h-5 text-[#009ef7]" />
              <span>Managers</span>
            </h1>
            <p className="mt-0.5 text-[12px] text-slate-500">
              Choose which pages each Manager can open. Their add / edit / delete requests wait for your approval.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={load} className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold inline-flex items-center gap-1" aria-label="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="add-manager"
              onClick={() => setForm({ name: '', email: '', password: '', permissions: emptyPerms() })}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#009ef7] hover:bg-[#008be0] text-white text-xs font-bold uppercase tracking-wider rounded-lg font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Add Manager</span>
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-xs overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">No managers yet. Use Add Manager to create one.</div>
          ) : (
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Login email</th>
                  <th>Page access</th>
                  <th>Pending requests</th>
                  <th style={{ width: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} data-testid={`manager-row-${m.id}`}>
                    <td className="font-semibold">{m.name}</td>
                    <td className="font-mono text-[11px]">{m.email}</td>
                    <td className="text-[11px]">{summary(m.permissions)}</td>
                    <td className="font-mono">{m.pendingRequests}</td>
                    <td>
                      <button type="button" title="Edit" aria-label={`Edit ${m.name}`} className="p-1.5 text-slate-500 hover:text-[#009ef7]"
                        onClick={() => setForm({ id: m.id, name: m.name, email: m.email, password: '', permissions: m.permissions })}>
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button type="button" title="Deactivate" aria-label={`Deactivate ${m.name}`} className="p-1.5 text-slate-500 hover:text-rose-600" onClick={() => remove(m)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {form && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto">
          <form onSubmit={submit} className="bg-white w-full max-w-xl border border-slate-200 shadow-2xl rounded-xl text-xs" data-testid="manager-form">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h3 className="text-sm font-bold">{form.id ? 'Edit Manager' : 'Add Manager'}</h3>
              <button type="button" onClick={() => setForm(null)} aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block">
                <span className="block font-semibold mb-1">Name *</span>
                <input className="w-full px-3 py-2 border border-slate-300 rounded" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>
              <label className="block">
                <span className="block font-semibold mb-1">Login email *</span>
                <input type="email" className="w-full px-3 py-2 border border-slate-300 rounded disabled:bg-slate-100" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!form.id} required={!form.id} />
              </label>
              <label className="block">
                <span className="block font-semibold mb-1">{form.id ? 'New password (leave blank to keep)' : 'Password * (min 8)'}</span>
                <input type="password" autoComplete="new-password" className="w-full px-3 py-2 border border-slate-300 rounded" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </label>
              <div>
                <span className="block font-semibold mb-1">Page access</span>
                <table className="w-full border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-2">Page</th>
                      {ACTIONS.map((a) => <th key={a.key} className="p-2">{a.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {PAGES.map((p) => (
                      <tr key={p.key} className="border-t border-slate-200">
                        <td className="p-2"><div className="font-semibold">{p.label}</div><div className="text-[10px] text-slate-500">{p.hint}</div></td>
                        {ACTIONS.map((a) => (
                          <td key={a.key} className="p-2 text-center">
                            <input type="checkbox" data-testid={`perm-${p.key}-${a.key}`} aria-label={`${p.label} ${a.label}`}
                              checked={!!form.permissions[p.key][a.key]} onChange={(e) => setPerm(p.key, a.key, e.target.checked)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-1 text-[10px] text-slate-500">Read applies at once. Write and Delete only let the Manager send a request; nothing changes until you approve it.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
              <button type="button" className="px-3 py-2 border border-slate-300 rounded" onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" disabled={saving} className="px-3 py-2 bg-[#009ef7] text-white font-bold rounded disabled:opacity-60">
                {saving ? 'Saving...' : form.id ? 'Save changes' : 'Create manager'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
