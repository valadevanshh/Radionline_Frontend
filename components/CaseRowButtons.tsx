'use client';

import React from 'react';
import { MessageSquareText, Pencil } from 'lucide-react';

/** Row action: open the case's chat / activity thread. */
export function RowChatButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:border-[#009ef7] hover:text-[#009ef7] font-bold transition-colors shrink-0 ${
        compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
      title="Chat about this case"
      aria-label="Chat"
      data-testid="row-chat"
    >
      <MessageSquareText className="w-3.5 h-3.5" />
      <span>Chat</span>
    </button>
  );
}

/** Row action: edit the patient details. */
export function RowEditButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white text-slate-700 hover:border-[#009ef7] hover:text-[#009ef7] font-bold transition-colors shrink-0 ${
        compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
      title="Edit patient details"
      aria-label="Edit"
      data-testid="row-edit"
    >
      <Pencil className="w-3.5 h-3.5" />
      <span>Edit</span>
    </button>
  );
}
