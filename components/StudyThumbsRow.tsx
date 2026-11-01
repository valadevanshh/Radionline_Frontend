'use client';

import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import type { XRayReport } from '@/lib/radiology-store';
import { formatDateDDMMYYYY, RadiologyStore } from '@/lib/radiology-store';
import { resolveMediaUrl, ApiClient, ReportHistoryResponse, ReportVersion } from '@/lib/api-client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import ImageLightbox, { LightboxItem } from '@/components/ImageLightbox';
import { useImageContextMenu } from '@/components/ui/ImageContextMenu';

/** ISO timestamp -> DD-MM-YYYY HH:MM in the viewer's local time ('-' if missing). */
function fmtDateTime(iso?: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const isPdf = (u: string) => /\.pdf(\?|$)/i.test(u);
const isDicom = (u: string) => /\.dcm(\?|$)/i.test(u);

function toItem(url: string, i: number, label: string): LightboxItem {
  const src = resolveMediaUrl(url);
  const kind = isPdf(url) ? 'pdf' : isDicom(url) ? 'dicom' : 'image';
  return { key: `${i}-${url}`, name: `${label} ${i + 1}`, kind, imageUrl: kind === 'image' ? src : null, pdfUrl: kind === 'pdf' ? src : null };
}

/** Expanded list row: each study of the case with its image thumbnails (click opens the lightbox). */
export default function StudyThumbsRow({ report }: { report: XRayReport }) {
  const [open, setOpen] = useState<{ items: LightboxItem[]; idx: number } | null>(null);
  const { onImageContextMenu, imageMenu } = useImageContextMenu();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [history, setHistory] = useState<ReportHistoryResponse | null>(null);
  const [histErr, setHistErr] = useState('');
  const [histLoading, setHistLoading] = useState(false);
  useEffect(() => { setIsSuperAdmin(RadiologyStore.getSession()?.role === 'SUPER_ADMIN'); }, []);
  const loadHistory = async () => {
    setHistLoading(true); setHistErr('');
    try { setHistory(await ApiClient.getReportHistory(report.id)); } catch (e) { setHistErr(e instanceof Error ? e.message : 'Could not load report history'); }
    setHistLoading(false);
  };
  const versionCard = (v: ReportVersion, label: string, tone: string) => (
    <div className={`rounded-md border px-2.5 py-1.5 text-[11px] ${tone}`}>
      <div className="flex flex-wrap items-center gap-x-2 font-semibold">
        <span>{label}</span>
        {v.reportStatus && <span className="font-mono text-[10px]">{v.reportStatus}</span>}
        {(v.signedByName || v.claimedByName) && <span className="font-normal text-slate-500">Dr {v.signedByName || v.claimedByName}</span>}
        {v.signedAt && <span className="font-normal text-slate-500">signed {fmtDateTime(v.signedAt)}</span>}
        {v.snapshotAt && <span className="font-normal text-slate-500">{v.event || 'archived'} {fmtDateTime(v.snapshotAt)}{v.reason ? ` \u00b7 ${v.reason}` : ''}</span>}
      </div>
      <div className="mt-0.5 text-slate-700 whitespace-pre-wrap line-clamp-4">{v.impression || v.findings || <i className="text-slate-400">No report text</i>}</div>
    </div>
  );
  const studies = report.studies?.length
    ? report.studies.map((s) => ({ key: s.id, part: s.bodyPart, date: s.studyDate || report.studyDate, time: s.studyTime || '', uploaded: s.uploadedAt || report.createdAt, completed: s.signedAt || null, status: s.reportStatus, images: s.images || [] }))
    : report.bodyParts.map((bp, i) => ({ key: `${i}`, part: bp, date: report.studyDate, time: '', uploaded: report.createdAt, completed: null as string | null, status: '', images: [] as string[] }));
  // Older responses have no per-study images: show the case images under the first study.
  if (studies.length && studies.every((s) => !s.images.length) && report.uploadedImages?.length) {
    studies[0] = { ...studies[0], images: report.uploadedImages };
  }

  return (
    <div className="px-4 py-2.5 bg-slate-50/70 space-y-2" data-testid="study-thumbs-row">
      {studies.map((s) => {
        const items = s.images.map((u, i) => toItem(u, i, s.part));
        return (
          <div key={s.key} className="flex items-start gap-3">
            <div className="w-60 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] font-bold text-slate-800">{s.part}</span>
                {s.status && <StatusBadge status={String(s.status).toUpperCase() === 'SIGNED' ? 'Completed' : 'Pending'} />}
                <span className="text-[10px] font-semibold text-sky-700" data-testid="study-image-count">{s.images.length} img</span>
              </div>
              <dl className="mt-1 grid grid-cols-[64px_1fr] gap-x-1 text-[10px] leading-4 text-slate-500 font-mono" data-testid="study-datetimes">
                <dt>Study</dt><dd className="text-slate-700">{formatDateDDMMYYYY(s.date || '')}{s.time ? ` ${s.time}` : ''}</dd>
                <dt>Uploaded</dt><dd className="text-slate-700">{fmtDateTime(s.uploaded)}</dd>
                <dt>Completed</dt><dd className={s.completed ? 'text-emerald-700' : 'text-slate-400'}>{fmtDateTime(s.completed)}</dd>
              </dl>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.length === 0 && <span className="text-[11px] italic text-slate-400">No images</span>}
              {items.map((it, i) => (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => setOpen({ items, idx: i })}
                  onContextMenu={onImageContextMenu(it.imageUrl, it.name)}
                  className="w-14 h-14 rounded-md border border-slate-200 bg-white overflow-hidden hover:border-[#009ef7] cursor-zoom-in"
                  title="Click to view"
                  aria-label={`Open ${it.name}`}
                  data-testid="row-thumb"
                >
                  {it.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.imageUrl} alt={it.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                      <FileText className="w-4 h-4" />
                      <span className="text-[9px] font-bold">{it.kind === 'pdf' ? 'PDF' : 'DCM'}</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {isSuperAdmin && (
        <div className="pt-1 border-t border-slate-200" data-testid="report-history">
          {!history ? (
            <button type="button" onClick={loadHistory} disabled={histLoading} className="text-[11px] font-semibold text-[#009ef7] hover:underline disabled:opacity-50">
              {histLoading ? 'Loading report history...' : 'Show report history (previous + current)'}
            </button>
          ) : (
            <div className="space-y-2">
              {history.studies.map((st) => (
                <div key={st.studyId} className="space-y-1">
                  <div className="font-mono text-[11px] font-bold text-slate-800">{st.bodyPart}</div>
                  {versionCard(st.current, 'Current', 'border-emerald-200 bg-emerald-50/40')}
                  {st.history.length === 0 && <div className="text-[10px] italic text-slate-400">No previous versions</div>}
                  {[...st.history].reverse().map((v, i) => (
                    <React.Fragment key={i}>{versionCard(v, `Previous v${v.version ?? st.history.length - i}`, 'border-slate-200 bg-white')}</React.Fragment>
                  ))}
                </div>
              ))}
            </div>
          )}
          {histErr && <div className="text-[11px] text-rose-600">{histErr}</div>}
        </div>
      )}
      {open && (
        <ImageLightbox
          items={open.items}
          index={open.idx}
          onIndex={(i) => setOpen((o) => (o ? { ...o, idx: i } : o))}
          onClose={() => setOpen(null)}
        />
      )}
      {imageMenu}
    </div>
  );
}
