'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Flag, MessageSquare, RefreshCw, Send, X, AlertTriangle, Paperclip, FileText, Loader2 } from 'lucide-react';
import { ApiClient, ReportComment, getAccessToken, WS_BASE_URL, apiErrorMessage } from '@/lib/api-client';
import { Doctor, RadiologyStore, UserAccount, XRayReport } from '@/lib/radiology-store';
import { hasCenterLevel } from '@/lib/access';
import { formatPatientDisplayId } from '@/lib/uuid';

interface CaseActivityPanelProps {
  report: XRayReport;
  open: boolean;
  onClose: () => void;
  onClaimUpdated?: (claimedBy: string, claimedByName: string) => void;
  /** Show a dimmed backdrop (tap to close) — used when opened from a list row. */
  withBackdrop?: boolean;
}

/** Server times are UTC (with or without a trailing Z); show them in the viewer's local time. */
function formatThreadTime(v?: string | null): string {
  if (!v) return '';
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : `${v}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function kindLabel(kind: string) {
  switch (kind) {
    case 'FLAG':
      return 'Flag';
    case 'REASSIGN':
      return 'Reassign';
    case 'RECHECK':
      return 'Recheck';
    case 'COMMENT':
      return 'Message';
    case 'RECHECK_REQ':
      return 'Recheck request';
    case 'OTHER':
      return 'Other';
    case 'EDIT':
      return 'Edited';
    default:
      return kind;
  }
}

function kindBadgeClass(kind: string) {
  switch (kind) {
    case 'FLAG':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'REASSIGN':
      return 'bg-violet-100 text-violet-800 border-violet-300';
    case 'RECHECK':
    case 'RECHECK_REQ':
      return 'bg-rose-100 text-rose-800 border-rose-300';
    case 'OTHER':
      return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    case 'EDIT':
      return 'bg-sky-100 text-sky-800 border-sky-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
}

export default function CaseActivityPanel({
  report,
  open,
  onClose,
  onClaimUpdated,
  withBackdrop = false,
}: CaseActivityPanelProps) {
  const [session, setSession] = useState<UserAccount | null>(null);
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [toDoctorId, setToDoctorId] = useState('');
  const [recheckReason, setRecheckReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [chatKind, setChatKind] = useState<'COMMENT' | 'RECHECK_REQ' | 'OTHER'>('COMMENT');
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSession(RadiologyStore.getSession());
    const onSession = () => setSession(RadiologyStore.getSession());
    window.addEventListener('radionline_session_changed', onSession);
    return () => window.removeEventListener('radionline_session_changed', onSession);
  }, []);

  const load = useCallback(async () => {
    if (!report?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [thread, docs] = await Promise.all([
        ApiClient.getReportComments(report.id),
        ApiClient.getDoctors().catch(() => [] as Doctor[]),
      ]);
      setComments(thread);
      setDoctors(docs);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  }, [report?.id]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open || !report?.id) return;
    let ws: WebSocket | null = null;
    try {
      const token = getAccessToken();
      const baseUrl = WS_BASE_URL;
      const wsUrl = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (
            (payload.type === 'CASE_THREAD_UPDATED' ||
              payload.type === 'REPORT_REASSIGNED' ||
              payload.type === 'REPORT_RECHECK') &&
            (payload.caseId === report.id || payload.reportId === report.id)
          ) {
            load();
          }
        } catch {
          /* ignore */
        }
      };
    } catch {
      /* ignore */
    }
    return () => {
      if (ws) ws.close();
    };
  }, [open, report?.id, load]);

  if (!open) return null;

  const role = session?.role;
  // Centre logins need Reports = write on this case's centre to flag & reassign
  const canFlag =
    role === 'MANAGER' ||
    role === 'SUPER_ADMIN' ||
    (role === 'CENTER' && hasCenterLevel(session, 'reports', 'write', report.radiologyCenterId));
  const isOwningDoctor =
    role === 'DOCTOR' &&
    !!session?.doctorId &&
    (report.claimedByDoctorId === session.doctorId ||
      report.assignedDoctorId === session.doctorId);
  const canRecheck = isOwningDoctor && report.status === 'Completed';
  const canComment =
    role === 'CENTER' ||
    role === 'MANAGER' ||
    role === 'SUPER_ADMIN' ||
    role === 'DOCTOR';

  const needsText = chatKind !== 'COMMENT' || files.length === 0;
  const handleAddComment = async () => {
    if (busy || (needsText && !commentBody.trim())) return;
    setBusy(true);
    setError(null);
    try {
      const attachments: { path: string; name: string; size: number }[] = [];
      for (const f of files) {
        const res = await ApiClient.uploadFileWithProgress(f, f.name, { category: 'cases', entityId: report.id, subfolder: 'chat' });
        attachments.push({ path: res.path, name: f.name, size: f.size });
      }
      await ApiClient.addReportComment(report.id, commentBody.trim(), chatKind, attachments);
      setCommentBody('');
      setFiles([]);
      setChatKind('COMMENT');
      await load();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Failed to send'));
    } finally {
      setBusy(false);
    }
  };

  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list || []);
    const big = picked.filter((f) => f.size > 5 * 1024 * 1024);
    const ok = picked.filter((f) => f.size <= 5 * 1024 * 1024);
    if (big.length) setError(`File must be 5 MB or smaller: ${big.map((f) => f.name).join(', ')}`);
    setFiles((prev) => [...prev, ...ok].slice(0, 5));
  };

  const handleFlagReassign = async () => {
    if (!flagReason.trim() || !toDoctorId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await ApiClient.flagReassignReport(
        report.id,
        flagReason.trim(),
        toDoctorId
      );
      setFlagReason('');
      onClaimUpdated?.(result.claimedBy, result.claimedByName);
      window.dispatchEvent(new Event('radionline_reports_changed'));
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Flag & reassign failed');
    } finally {
      setBusy(false);
    }
  };

  const handleRecheck = async () => {
    if (!recheckReason.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await ApiClient.requestRecheck(report.id, recheckReason.trim());
      setRecheckReason('');
      window.dispatchEvent(new Event('radionline_reports_changed'));
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Recheck request failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    {withBackdrop && (
      <div className="fixed inset-0 bg-slate-900/40 print:hidden" style={{ zIndex: 319 }} onClick={onClose} aria-hidden="true" />
    )}
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col print:hidden" style={{ zIndex: 320 }} role="dialog" aria-label="Case chat" data-testid="case-activity-panel">
      <div className="h-12 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare size={16} className="text-[#009ef7] shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-extrabold text-slate-900 truncate">Case Activity</div>
            <div className="text-[10px] font-mono text-slate-500 truncate">
              {report.fullName}{formatPatientDisplayId(report.patientNumber) ? ` · ${report.patientNumber}` : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={load}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 bg-rose-50 border-b border-rose-200 text-[11px] text-rose-700 flex items-start gap-1.5">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/50">
        {loading && comments.length === 0 ? (
          <div className="text-[11px] text-slate-400 font-mono uppercase tracking-wider text-center py-8">
            Loading thread...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-[11px] text-slate-400 text-center py-8">
            No flags, rechecks, or comments yet.
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded-md p-2.5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${kindBadgeClass(
                    c.kind
                  )}`}
                >
                  {kindLabel(c.kind)}
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate">
                  {formatThreadTime(c.createdAt)}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-slate-800">
                {c.authorName}{' '}
                <span className="font-normal text-slate-400">({c.authorRole})</span>
              </div>
              {c.body && <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap break-words">{c.body}</p>}
              {!!c.attachments?.length && (
                <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid="chat-attachments">
                  {c.attachments.map((a, i) => {
                    const url = a.url || a.path;
                    const isImg = /\.(jpe?g|png|webp|gif|bmp)$/i.test(a.name || a.path);
                    return (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 max-w-[180px] rounded border border-slate-200 bg-slate-50 hover:border-[#009ef7] text-[11px] text-slate-700 overflow-hidden"
                        title={a.name}
                      >
                        {isImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt="" className="w-10 h-10 object-cover" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 ml-1.5 shrink-0 text-slate-400" />
                        )}
                        <span className="truncate pr-1.5">{a.name}</span>
                      </a>
                    );
                  })}
                </div>
              )}
              {(c.fromDoctorId || c.toDoctorId) && (
                <div className="text-[10px] text-slate-500 mt-1 font-mono">
                  {c.fromDoctorId ? `from ${c.fromDoctorId}` : ''}
                  {c.fromDoctorId && c.toDoctorId ? ' → ' : ''}
                  {c.toDoctorId ? `to ${c.toDoctorId}` : ''}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-slate-200 p-3 space-y-3 bg-white shrink-0 max-h-[45%] overflow-y-auto">
        {canComment && (
          <div className="space-y-1.5" data-testid="chat-composer">
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Message type">
              {([
                ['COMMENT', 'Message'],
                ['RECHECK_REQ', 'Recheck'],
                ['OTHER', 'Other'],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={chatKind === k}
                  onClick={() => setChatKind(k)}
                  className={`h-6 px-2.5 rounded-full border text-[11px] font-semibold ${
                    chatKind === k
                      ? k === 'RECHECK_REQ'
                        ? 'bg-rose-600 border-rose-600 text-white'
                        : k === 'OTHER'
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-[#009ef7] border-[#009ef7] text-white'
                      : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                  }`}
                  data-testid={`chat-kind-${k.toLowerCase()}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder={chatKind === 'RECHECK_REQ' ? 'Reason for recheck (required)…' : chatKind === 'OTHER' ? 'Describe the request…' : 'Message…'}
                rows={2}
                className="flex-1 text-xs border border-slate-200 rounded-md p-2 focus:outline-none focus:border-[#009ef7] resize-none"
                data-testid="chat-input"
              />
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="flex-1 px-2.5 rounded border border-slate-300 text-slate-600 hover:border-[#009ef7] hover:text-[#009ef7]"
                  title="Attach file (max 5 MB)"
                  aria-label="Attach file"
                  data-testid="chat-attach"
                >
                  <Paperclip size={14} />
                </button>
                <button
                  type="button"
                  disabled={busy || (needsText && !commentBody.trim())}
                  onClick={handleAddComment}
                  className="flex-1 px-2.5 rounded bg-[#009ef7] hover:bg-[#008be0] disabled:opacity-50 text-white"
                  title="Send"
                  aria-label="Send"
                  data-testid="chat-send"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.dcm"
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            {files.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {files.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 h-6 max-w-[170px] pl-2 pr-1 rounded border border-slate-200 bg-slate-50 text-[11px]" data-testid="chat-file-chip">
                    <span className="truncate">{f.name}</span>
                    <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="text-slate-400 hover:text-rose-600">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {chatKind === 'RECHECK_REQ' && (
              <p className="text-[10px] text-slate-500">Asks the reporting doctor to recheck. A reason is required.</p>
            )}
          </div>
        )}
        {canFlag && (
          <details className="space-y-1.5 group">
            <summary className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800 uppercase tracking-tight cursor-pointer select-none list-none">
              <Flag size={12} className="text-amber-600" />
              Flag &amp; Reassign
              <span className="ml-auto text-[10px] font-normal normal-case text-slate-400 group-open:hidden">tap to open</span>
            </summary>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Reason required..."
              rows={2}
              className="w-full text-xs border border-slate-200 rounded-md p-2 focus:outline-none focus:border-[#009ef7] resize-none"
            />
            <select
              value={toDoctorId}
              onChange={(e) => setToDoctorId(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-md p-2 focus:outline-none focus:border-[#009ef7] bg-white"
            >
              <option value="">Select doctor...</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fullName}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={busy || !flagReason.trim() || !toDoctorId}
              onClick={handleFlagReassign}
              className="w-full py-1.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-[11px] font-bold uppercase"
            >
              Flag &amp; Reassign
            </button>
          </details>
        )}

        {canRecheck && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-800 uppercase tracking-tight">
              Request Recheck
            </div>
            <textarea
              value={recheckReason}
              onChange={(e) => setRecheckReason(e.target.value)}
              placeholder="Recheck reason required..."
              rows={2}
              className="w-full text-xs border border-slate-200 rounded-md p-2 focus:outline-none focus:border-[#009ef7] resize-none"
            />
            <button
              type="button"
              disabled={busy || !recheckReason.trim()}
              onClick={handleRecheck}
              className="w-full py-1.5 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[11px] font-bold uppercase"
            >
              Request Recheck
            </button>
          </div>
        )}

      </div>
    </div>
    </>
  );
}
