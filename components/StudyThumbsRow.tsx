'use client';

import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import type { XRayReport } from '@/lib/radiology-store';
import { formatDateDDMMYYYY } from '@/lib/radiology-store';
import { resolveMediaUrl } from '@/lib/api-client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import ImageLightbox, { LightboxItem } from '@/components/ImageLightbox';

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
  const studies = report.studies?.length
    ? report.studies.map((s) => ({ key: s.id, part: s.bodyPart, date: s.studyDate || report.studyDate, status: s.reportStatus, images: s.images || [] }))
    : report.bodyParts.map((bp, i) => ({ key: `${i}`, part: bp, date: report.studyDate, status: '', images: [] as string[] }));
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
            <div className="w-48 shrink-0">
              <div className="font-mono text-[11px] font-bold text-slate-800">{s.part}</div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                <span className="font-mono">{formatDateDDMMYYYY(s.date || '')}</span>
                {s.status && <StatusBadge status={String(s.status).toUpperCase() === 'SIGNED' ? 'Completed' : 'Pending'} />}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.length === 0 && <span className="text-[11px] italic text-slate-400">No images</span>}
              {items.map((it, i) => (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => setOpen({ items, idx: i })}
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
      {open && (
        <ImageLightbox
          items={open.items}
          index={open.idx}
          onIndex={(i) => setOpen((o) => (o ? { ...o, idx: i } : o))}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
