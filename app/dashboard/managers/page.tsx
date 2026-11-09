'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserCog, Plus, Pencil, Trash2, X, RefreshCw, Search } from 'lucide-react';
import { ApiClient, ManagerAccount, ManagerPage, ManagerPermissions, apiErrorMessage } from '@/lib/api-client';
import { RadiologyStore } from '@/lib/radiology-store';
import { toast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui';
import { useResizableColumns } from '@/lib/use-resizable-columns';
import ColumnResizeHandle from '@/components/ui/ColumnResizeHandle';

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
  const { widths, minimums, resizeColumn, startResizing, tableWidth } = useResizableColumns({
    name: 240, email: 260, access: 320, pending: 110, actions: 160,
  });
  const router = useRouter();
  const confirm = useConfirm();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<ManagerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      .join(' \u00B7 ') || 'No pages';

  if (allowed !== true) return null;

  const q = searchQuery.trim().toLowerCase();
  const filtered = q ? rows.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)) : rows;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900">
      <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4 space-y-3 w-full min-w-0">
        {/* Header (same style as Diagnostic Radiology Centers) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2 font-mono">
              <UserCog className="w-5 h-5 text-[#009ef7]" />
              <span>Managers</span>
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Choose which pages each Manager can open. Their add / edit / delete requests wait for your approval.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={load} title="Refresh" aria-label="Refresh"
              className="p-2 text-slate-500 hover:text-[#009ef7] border border-slate-200 rounded-lg hover:bg-sky-50 transition-colors cursor-pointer">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-testid="add-manager"
              onClick={() => setForm({ name: '', email: '', password: '', permissions: emptyPerms() })}
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-[#009ef7] hover:bg-[#008be0] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-xs cursor-pointer shrink-0 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Add Manager</span>
            </button>
          </div>
        </div>

        <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col min-h-0">
          {/* Search bar + count */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4 flex-wrap shrink-0">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="rn-icon-vcenter w-4 h-4 absolute left-3 top-2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by manager name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rn-input-iconpad w-full pl-9 pr-3 py-1.5 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs focus:outline-none focus:border-[#009ef7]"
              />
            </div>
            <div className="text-xs font-mono text-slate-500 font-bold">
              {filtered.length} MANAGER{filtered.length === 1 ? '' : 'S'}
            </div>
          </div>

          <div className="data-table-container flex-1 overflow-y-auto overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                {rows.length === 0 ? 'No managers yet. Use Add Manager to create one.' : 'No managers match your search.'}
              </div>
            ) : (
              <table className="data-table w-full" style={{ tableLayout: 'fixed', width: tableWidth, minWidth: '100%' }}>

                <thead>
                  <tr>
                    <th data-column-key="name" title="Manager Name" style={{ width: widths.name, position: 'relative' }}>
                      Manager Name
                      <ColumnResizeHandle columnKey="name" label="Manager Name" width={widths.name} minimum={minimums.name} onResizeStart={startResizing} onResize={resizeColumn} />
                    </th>
                    <th data-column-key="email" title="Login Email" style={{ width: widths.email, position: 'relative' }}>
                      Login Email
                      <ColumnResizeHandle columnKey="email" label="Login Email" width={widths.email} minimum={minimums.email} onResizeStart={startResizing} onResize={resizeColumn} />
                    </th>
                    <th data-column-key="access" title="Page Access" style={{ width: widths.access, position: 'relative' }}>
                      Page Access
                      <ColumnResizeHandle columnKey="access" label="Page Access" width={widths.access} minimum={minimums.access} onResizeStart={startResizing} onResize={resizeColumn} />
                    </th>
                    <th data-column-key="pending" title="Pending Requests" style={{ width: widths.pending, position: 'relative' }}>
                      Pending
                      <ColumnResizeHandle columnKey="pending" label="Pending Requests" width={widths.pending} minimum={minimums.pending} onResizeStart={startResizing} onResize={resizeColumn} />
                    </th>
                    <th data-column-key="actions" title="Actions" style={{ width: widths.actions, position: 'relative' }}>
                      Actions
                      <ColumnResizeHandle columnKey="actions" label="Actions" width={widths.actions} minimum={minimums.actions} onResizeStart={startResizing} onResize={resizeColumn} />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((m) => (
                    <tr key={m.id} data-testid={`manager-row-${m.id}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5" title={m.name}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#009ef7]/10 border border-[#009ef7]/20 flex items-center justify-center font-bold text-[#009ef7] text-sm shrink-0 font-mono">
                            {(m.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="font-bold text-slate-900 truncate">{m.name}</div>
                        </div>
                      </td>
                      <td className="p-3.5" title={m.email}>
                        <div className="font-mono text-[11px] bg-slate-100 border border-slate-200 px-2.5 py-1 rounded inline-block max-w-full truncate text-slate-700 align-middle">
                          {m.email}
                        </div>
                      </td>
                      <td className="p-3.5 text-[11px] text-slate-700" title={summary(m.permissions)}>
                        <div className="truncate">{summary(m.permissions)}</div>
                      </td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 font-bold text-[10px] rounded font-mono ${m.pendingRequests > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          {m.pendingRequests}
                        </span>
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap"><div className="rt-actions">
                        <button type="button" title="Edit" aria-label={`Edit ${m.name}`}
                          className="p-1.5 text-slate-400 hover:text-[#009ef7] transition-colors cursor-pointer rounded hover:bg-sky-50"
                          onClick={() => setForm({ id: m.id, name: m.name, email: m.email, password: '', permissions: m.permissions })}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" title="Deactivate" aria-label={`Deactivate ${m.name}`}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer rounded hover:bg-rose-50"
                          onClick={() => remove(m)}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {form && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/40 p-4 overflow-y-auto">
          <form onSubmit={submit} className="bg-white w-full max-w-xl border border-slate-200 shadow-2xl rounded-xl text-xs text-slate-900" data-testid="manager-form">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">{form.id ? 'Edit Manager' : 'Add Manager'}</h3>
              <button type="button" onClick={() => setForm(null)} aria-label="Close" className="text-slate-600 hover:text-slate-900"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block">
                <span className="block font-semibold mb-1 text-slate-800">Name *</span>
                <input className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-400 rounded-md focus:outline-none focus:border-[#009ef7] focus:ring-2 focus:ring-[#009ef7]/30" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </label>
              <label className="block">
                <span className="block font-semibold mb-1 text-slate-800">Login email *</span>
                <input type="email" className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-400 rounded-md focus:outline-none focus:border-[#009ef7] focus:ring-2 focus:ring-[#009ef7]/30 disabled:bg-slate-100 disabled:text-slate-600" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!form.id} required={!form.id} />
              </label>
              <label className="block">
                <span className="block font-semibold mb-1 text-slate-800">{form.id ? 'New password (leave blank to keep)' : 'Password * (min 8)'}</span>
                <input type="password" autoComplete="new-password" className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-400 rounded-md focus:outline-none focus:border-[#009ef7] focus:ring-2 focus:ring-[#009ef7]/30" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </label>
              <div>
                <span className="block font-semibold mb-1 text-slate-800">Page access</span>
                <table className="w-full border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left p-2 text-slate-800">Page</th>
                      {ACTIONS.map((a) => <th key={a.key} className="p-2 text-slate-800">{a.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {PAGES.map((p) => (
                      <tr key={p.key} className="border-t border-slate-200">
                        <td className="p-2"><div className="font-semibold">{p.label}</div><div className="text-[10px] text-slate-600">{p.hint}</div></td>
                        {ACTIONS.map((a) => (
                          <td key={a.key} className="p-2 text-center">
                            <input type="checkbox" className="w-4 h-4 accent-[#009ef7]" data-testid={`perm-${p.key}-${a.key}`} aria-label={`${p.label} ${a.label}`}
                              checked={!!form.permissions[p.key][a.key]} onChange={(e) => setPerm(p.key, a.key, e.target.checked)} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-1 text-[10px] text-slate-600">Read applies at once. Write and Delete only let the Manager send a request; nothing changes until you approve it.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
              <button type="button" className="px-3 py-2 bg-white text-slate-800 border border-slate-400 rounded hover:bg-slate-50" onClick={() => setForm(null)}>Cancel</button>
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
