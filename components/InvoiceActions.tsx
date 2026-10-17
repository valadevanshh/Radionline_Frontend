'use client';

import React from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { downloadInvoice, printInvoice, type InvoicePrintPayload } from '@/lib/invoice-print';

type Props = {
  invoice: Omit<InvoicePrintPayload, 'withLetterhead' | 'serviceDate' | 'letterheadUrl'>;
  letterheadUrl?: string | null;
  serviceDate?: string | null;
  compact?: boolean;
};

export function InvoiceActions({ invoice, letterheadUrl, serviceDate, compact }: Props) {
  const base = {
    ...invoice,
    letterheadUrl: letterheadUrl || null,
    serviceDate: serviceDate || null,
  };

  const btn =
    'inline-flex items-center gap-1.5 rounded-lg border text-xs font-bold cursor-pointer disabled:opacity-50';
  const size = compact ? 'px-2 py-1' : 'px-3 py-1.5';

  return (
    <div className={`flex flex-wrap gap-1.5 ${compact ? '' : ''}`} data-testid="invoice-actions">
      <button
        type="button"
        title="Print / Save PDF with letterhead"
        onClick={() => printInvoice({ ...base, withLetterhead: true })}
        className={`${btn} ${size} border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100`}
      >
        <Printer className="w-3.5 h-3.5" />
        {compact ? 'LH' : 'Print + letterhead'}
      </button>
      <button
        type="button"
        title="Print / Save PDF without letterhead"
        onClick={() => printInvoice({ ...base, withLetterhead: false })}
        className={`${btn} ${size} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
      >
        <FileText className="w-3.5 h-3.5" />
        {compact ? 'Plain' : 'Print plain'}
      </button>
      <button
        type="button"
        title="Download HTML with letterhead"
        onClick={() => downloadInvoice({ ...base, withLetterhead: true })}
        className={`${btn} ${size} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}
      >
        <Download className="w-3.5 h-3.5" />
        {compact ? 'DL+' : 'Download + letterhead'}
      </button>
      <button
        type="button"
        title="Download HTML without letterhead"
        onClick={() => downloadInvoice({ ...base, withLetterhead: false })}
        className={`${btn} ${size} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
      >
        <Download className="w-3.5 h-3.5" />
        {compact ? 'DL' : 'Download plain'}
      </button>
    </div>
  );
}
