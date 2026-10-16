'use client';

import React from 'react';
import { MessageSquareText, Pencil } from 'lucide-react';

/** Row action: open the case's chat / activity thread (icon-only button with tooltip). */
export function RowChatButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-[#009ef7] hover:text-[#009ef7] hover:bg-sky-50/50 transition-all shrink-0 cursor-pointer shadow-2xs"
      title="Case Discussion & Activity Chat"
      aria-label="Chat"
      data-testid="row-chat"
    >
      <MessageSquareText className="w-4 h-4" />
    </button>
  );
}

/** Row action: edit the patient details (icon-only button with tooltip). */
export function RowEditButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-[#009ef7] hover:text-[#009ef7] hover:bg-sky-50/50 transition-all shrink-0 cursor-pointer shadow-2xs"
      title="Edit Patient Details"
      aria-label="Edit"
      data-testid="row-edit"
    >
      <Pencil className="w-4 h-4" />
    </button>
  );
}
