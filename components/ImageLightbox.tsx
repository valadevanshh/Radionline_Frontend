'use client';

import React, { useEffect } from 'react';
import { FileText, X } from 'lucide-react';

export interface LightboxItem {
  key: string;
  name: string;
  /** Image URL (object URL or server URL); null for DICOM / PDF without preview */
  imageUrl?: string | null;
  /** PDF URL shown in an iframe */
  pdfUrl?: string | null;
  kind: 'image' | 'dicom' | 'pdf';
  sizeBytes?: number;
}

/** Full-screen image viewer: Esc closes, arrow keys / buttons move between items. */
export default function ImageLightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: LightboxItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const n = items.length;
  useEffect(() => {
    if (!n) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const d = e.key === 'ArrowRight' ? 1 : -1;
        onIndex((index + d + n) % n);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [n, index, onIndex, onClose]);

  const item = items[index];
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[450] flex flex-col bg-slate-950/90"
      role="dialog"
      aria-label="Image preview"
      data-testid="upload-lightbox"
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2 text-white text-[13px]">
        <span className="truncate flex-1">
          {item.name}
          {n > 1 ? ` (${index + 1} / ${n})` : ''}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center px-2 pb-3"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full object-contain select-none" />
        ) : item.kind === 'pdf' && item.pdfUrl ? (
          <iframe src={item.pdfUrl} title={item.name} className="w-full max-w-4xl h-full bg-white rounded" />
        ) : (
          <div className="text-center text-slate-200 text-[13px] space-y-1">
            <FileText className="w-10 h-10 mx-auto" />
            <div className="font-semibold">
              {item.kind === 'dicom' ? 'DICOM file' : 'File'}
              {item.sizeBytes ? ` (${Math.round(item.sizeBytes / 1024)} KB)` : ''}
            </div>
            <div className="text-slate-400">Preview is not available here. Open it in the viewer.</div>
          </div>
        )}
        {n > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => onIndex((index - 1 + n) % n)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white text-xl"
            >
              &#8249;
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => onIndex((index + 1) % n)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white text-xl"
            >
              &#8250;
            </button>
          </>
        )}
      </div>
    </div>
  );
}
