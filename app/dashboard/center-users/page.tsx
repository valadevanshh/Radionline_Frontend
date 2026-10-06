'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserCog, Plus, Pencil, Unlink, ShieldCheck, RefreshCw, AlertTriangle, Building } from 'lucide-react';
import {
  ApiClient,
  apiErrorMessage,
  type CenterAccessLink,
  type CenterPage,
  type CenterUserRow,
  type CenterUsersResponse,
  type PageLevel,
} from '@/lib/api-client';
import { refreshSession, useSession } from '@/lib/access';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toast';

const PAGE_LABELS: Record<CenterPage, string> = {
  reports: 'Reports',
  invoices: 'Invoices',
  templates: 'Templates',
  center_info: 'Center Info',
};
const PAGE_ORDER: CenterPage[] = ['reports', 'invoices', 'templates', 'center_info'];
const LEVEL_LABELS: Record<PageLevel, string> = { none: 'No access', read: 'View only', write: 'View & edit' };
const DEFAULT_PERMS: Record<CenterPage, PageLevel> = { reports: 'write', invoices: 'read', templates: 'read', center_info: 'read' };

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 40,
  padding: '0 12px',
  fontSize: 14,
  borderRadius: 10,
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
};
const selectStyle: React.CSSProperties = { ...inputStyle, height: 36, fontSize: 13, padding: '0 8px' };

type DraftLink = { enabled: boolean; isAdmin: boolean; permissions: Record<CenterPage, PageLevel> };

function levelTone(level: PageLevel) {
  if (level === 'write') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (level === 'read') return 'bg-sky-50 text-sky-800 border-sky-200';
  return 'bg-slate-50 text-slate-400 border-slate-200 line-through';
}

export default function CenterUsersPage() {
  const session = useSession();
  const [data, setData] = useState<CenterUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState<string | null>(null);
  const [filterCenter, setFilterCenter] = useState('ALL');

  // Editor
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CenterUserRow | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [draft, setDraft] = useState<Record<string, DraftLink>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [unlinkTarget, setUnlinkTarget] = useState<{ user: CenterUserRow; link: CenterAccessLink } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiClient.getCenterUsers();
      setData(res);
      setForbidden(null);
    } catch (err) {
      const msg = apiErrorMessage(err, 'Could not load centre users');
      if (/API error 403/.test(err instanceof Error ? err.message : '')) setForbidden(msg);
      else toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const centers = useMemo(() => data?.manageableCenters || [], [data]);
  const users = useMemo(() => {
    const list = data?.users || [];
    if (filterCenter === 'ALL') return list;
    return list.filter((u) => u.centers.some((c) => c.centerId === filterCenter));
  }, [data, filterCenter]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setEmail('');
    setPassword('');
    const d: Record<string, DraftLink> = {};
    centers.forEach((c, i) => {
      const preselect = filterCenter !== 'ALL' ? c.centerId === filterCenter : centers.length === 1 || i === 0;
      d[c.centerId] = { enabled: preselect, isAdmin: false, permissions: { ...DEFAULT_PERMS } };
    });
    setDraft(d);
    setFormError(null);
    setEditorOpen(true);
  };

  const openEdit = (u: CenterUserRow) => {
    setEditing(u);
    setName(u.name);
    setEmail(u.email);
    setPassword('');
    const d: Record<string, DraftLink> = {};
    centers.forEach((c) => {
      const link = u.centers.find((l) => l.centerId === c.centerId);
      d[c.centerId] = link
        ? {
            enabled: true,
            isAdmin: !!link.isAdmin,
            permissions: PAGE_ORDER.reduce((acc, p) => ({ ...acc, [p]: (link.permissions?.[p] as PageLevel) || 'none' }), {} as Record<CenterPage, PageLevel>),
          }
        : { enabled: false, isAdmin: false, permissions: { ...DEFAULT_PERMS } };
    });
    setDraft(d);
    setFormError(null);
    setEditorOpen(true);
  };

  const linksFromDraft = (): CenterAccessLink[] =>
    Object.entries(draft)
      .filter(([, v]) => v.enabled)
      .map(([centerId, v]) => ({ centerId, isAdmin: v.isAdmin, permissions: v.permissions }));

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (saving) return;
    setFormError(null);
    const links = linksFromDraft();
    if (!editing) {
      if (!email.trim()) return setFormError('Email is required');
      if (links.length === 0) return setFormError('Pick at least one centre');
      if (password && password.length < 6) return setFormError('Password must be at least 6 characters');
    } else if (links.length === 0 && editing.otherCenterCount === 0) {
      return setFormError('Keep at least one centre, or use "Remove" to unlink the login');
    }
    setSaving(true);
    try {
      if (editing) {
        await ApiClient.updateCenterUser(editing.id, {
          name: editing.canEditLogin ? name.trim() || undefined : undefined,
          password: editing.canEditLogin && password ? password : undefined,
          centers: links,
        });
        toast.success(`Saved ${name || editing.email}`);
      } else {
        const res = await ApiClient.createCenterUser({
          name: name.trim() || undefined,
          email: email.trim(),
          password: password || undefined,
          centers: links,
        });
        toast.success(res.linkedExisting ? `Existing login ${res.user.email} linked` : `Login created for ${res.user.email}`);
      }
      setEditorOpen(false);
      await load();
      refreshSession(() => ApiClient.getMe());
    } catch (err) {
      setFormError(apiErrorMessage(err, 'Could not save this user'));
    } finally {
      setSaving(false);
    }
  };

  const confirmUnlink = async () => {
    if (!unlinkTarget) return;
    const { user, link } = unlinkTarget;
    setUnlinkTarget(null);
    try {
      await ApiClient.unlinkCenterUser(user.id, link.centerId);
      toast.success(`${user.email} removed from ${link.centerName || link.centerId}`);
      await load();
      refreshSession(() => ApiClient.getMe());
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not remove this access'));
    }
  };

  const setLink = (centerId: string, patch: Partial<DraftLink>) =>
    setDraft((prev) => ({ ...prev, [centerId]: { ...prev[centerId], ...patch } }));
  const setPerm = (centerId: string, page: CenterPage, level: PageLevel) =>
    setDraft((prev) => ({ ...prev, [centerId]: { ...prev[centerId], permissions: { ...prev[centerId].permissions, [page]: level } } }));

  if (forbidden) {
    return (
      <div className="flex-1 p-4 sm:p-6 bg-slate-50">
        <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-6 text-center" data-testid="center-users-forbidden">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h1 className="text-base font-extrabold text-slate-900">Centre users</h1>
          <p className="text-sm text-slate-600 mt-1">{forbidden}</p>
          <p className="text-xs text-slate-500 mt-2">Only the Super Admin and Center Admins can manage centre logins.</p>
        </div>
      </div>
    );
  }

  const isSA = session?.role === 'SUPER_ADMIN';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900">
      <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-[#009ef7]/10 text-[#009ef7] border border-[#009ef7]/20 rounded-lg shrink-0">
            <UserCog className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-extrabold font-mono uppercase tracking-tight truncate">
              {isSA ? 'Center Users' : centers.length > 1 ? 'Users of my centres' : 'Users of my centre'}
            </h1>
            <p className="text-[11px] text-slate-500 truncate">Logins, centre access and page permissions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {centers.length > 1 && (
            <select
              value={filterCenter}
              onChange={(e) => setFilterCenter(e.target.value)}
              style={{ ...selectStyle, width: 'auto', maxWidth: 200 }}
              aria-label="Filter by centre"
              data-testid="center-users-filter"
            >
              <option value="ALL">All centres</option>
              {centers.map((c) => (
                <option key={c.centerId} value={c.centerId}>
                  {c.centerName}
                </option>
              ))}
            </select>
          )}
          <button type="button" onClick={load} className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={centers.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#009ef7] hover:bg-[#008be0] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg font-mono"
            data-testid="center-users-add"
          >
            <Plus className="w-4 h-4" />
            <span>Add user</span>
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-3 sm:p-4">
        {loading && !data ? (
          <div className="text-center text-xs text-slate-500 py-10">Loading users…</div>
        ) : users.length === 0 ? (
          <div className="max-w-md mx-auto text-center bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-600">
            No centre logins yet. Use <strong>Add user</strong> to create one.
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3" data-testid="center-users-list">
            {users.map((u) => (
              <div key={u.id} className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col gap-2" data-testid="center-user-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                      {u.name}
                      {data?.currentUserId === u.id && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">You</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-mono truncate">{u.email}</div>
                    {u.otherCenterCount > 0 && (
                      <div className="text-[11px] text-amber-700 mt-0.5">Also used by {u.otherCenterCount} other centre{u.otherCenterCount > 1 ? 's' : ''}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:border-[#009ef7] hover:text-[#009ef7] shrink-0"
                    data-testid="center-user-edit"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {u.centers.map((l) => (
                    <div key={l.centerId} className="border border-slate-200 rounded-xl p-2 bg-slate-50/60">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-xs font-bold text-slate-800 truncate">{l.centerName || l.centerId}</span>
                          {l.isAdmin && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-800 border border-violet-200">
                              <ShieldCheck className="w-3 h-3" /> Admin
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setUnlinkTarget({ user: u, link: l })}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 shrink-0"
                          title="Remove this login from the centre"
                          data-testid="center-user-unlink"
                        >
                          <Unlink className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {PAGE_ORDER.map((p) => {
                          const lv = ((l.permissions?.[p] as PageLevel) || 'none') as PageLevel;
                          return (
                            <span key={p} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${levelTone(lv)}`}>
                              {PAGE_LABELS[p]}: {lv === 'write' ? 'Edit' : lv === 'read' ? 'View' : 'None'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Modal
        open={editorOpen}
        onClose={() => !saving && setEditorOpen(false)}
        title={editing ? `Edit ${editing.name}` : 'Add centre user'}
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setEditorOpen(false)} disabled={saving} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 bg-white">
              Cancel
            </button>
            <button
              type="submit"
              form="center-user-form"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#009ef7] hover:bg-[#008be0] disabled:opacity-60 text-white text-sm font-bold"
              data-testid="center-user-save"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <form id="center-user-form" onSubmit={handleSave} noValidate className="flex flex-col gap-3">
          {formError && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" role="alert" data-testid="center-user-error">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!editing}
                style={{ ...inputStyle, background: editing ? '#f1f5f9' : '#fff' }}
                placeholder="name@centre.com"
                autoComplete="off"
                data-testid="center-user-email"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-700">
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!!editing && !editing.canEditLogin}
                style={{ ...inputStyle, background: editing && !editing.canEditLogin ? '#f1f5f9' : '#fff' }}
                placeholder={editing ? '' : 'Full name (new login)'}
                data-testid="center-user-name"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-slate-700 sm:col-span-2">
              {editing ? 'New password (leave empty to keep)' : 'Password (new login, min 6 characters)'}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!!editing && !editing.canEditLogin}
                style={{ ...inputStyle, background: editing && !editing.canEditLogin ? '#f1f5f9' : '#fff' }}
                autoComplete="new-password"
                data-testid="center-user-password"
              />
            </label>
          </div>
          {!editing && (
            <p className="text-[11px] text-slate-500 -mt-1">
              If this email already has a centre login, it is linked to the selected centre(s); name and password are not changed.
            </p>
          )}
          {editing && !editing.canEditLogin && (
            <p className="text-[11px] text-amber-700 -mt-1">This login is also used by another centre, so only the Super Admin can rename it or reset its password.</p>
          )}

          <div className="flex flex-col gap-2">
            <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Centre access</div>
            {centers.map((c) => {
              const d = draft[c.centerId];
              if (!d) return null;
              return (
                <div key={c.centerId} className={`border rounded-xl p-2.5 ${d.enabled ? 'border-[#009ef7]/40 bg-sky-50/40' : 'border-slate-200 bg-white'}`} data-testid="center-user-link">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-800 cursor-pointer">
                      <input type="checkbox" checked={d.enabled} onChange={(e) => setLink(c.centerId, { enabled: e.target.checked })} style={{ width: 18, height: 18 }} />
                      {c.centerName}
                    </label>
                    {d.enabled && (
                      <label className="flex items-center gap-2 text-xs font-semibold text-violet-800 cursor-pointer">
                        <input type="checkbox" checked={d.isAdmin} onChange={(e) => setLink(c.centerId, { isAdmin: e.target.checked })} style={{ width: 16, height: 16 }} />
                        Center Admin (manages users)
                      </label>
                    )}
                  </div>
                  {d.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {PAGE_ORDER.map((p) => (
                        <label key={p} className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                          <span className="shrink-0 w-24">{PAGE_LABELS[p]}</span>
                          <select value={d.permissions[p]} onChange={(e) => setPerm(c.centerId, p, e.target.value as PageLevel)} style={selectStyle} data-testid={`perm-${p}`}>
                            {(['none', 'read', 'write'] as PageLevel[]).map((lv) => (
                              <option key={lv} value={lv}>
                                {LEVEL_LABELS[lv]}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!unlinkTarget}
        title="Remove access"
        message={
          unlinkTarget
            ? `Remove ${unlinkTarget.user.email} from ${unlinkTarget.link.centerName || unlinkTarget.link.centerId}? The login itself is kept${
                unlinkTarget.user.centers.length + unlinkTarget.user.otherCenterCount > 1 ? ' for its other centres' : ''
              }.`
            : ''
        }
        confirmLabel="Remove"
        onConfirm={confirmUnlink}
        onCancel={() => setUnlinkTarget(null)}
      />
    </div>
  );
}
