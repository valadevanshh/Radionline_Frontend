'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FileText, ChevronDown, Printer } from 'lucide-react';
import { RadiologyStore, XRayReport } from '@/lib/radiology-store';
import { formatPatientDisplayId } from '@/lib/uuid';
import { hasDoctorReport, isReportReady } from '@/lib/report-status';
import { centerLetterheads } from '@/lib/report-layout';

interface ReportOptionsPopoverProps {
  report: XRayReport;
  onSelectOption: (report: XRayReport, withHeader: boolean, bodyPart?: string, letterheadId?: string) => void;
}

function centerHeaders(report: XRayReport) {
  const centers = RadiologyStore.getCenters();
  const id = (report.radiologyCenterId || '').trim();
  const name = (report.radiologyCenterName || '').trim().toLowerCase();
  const match =
    centers.find((c) => c.id === id) ||
    (name
      ? centers.find((c) => (c.centerName || '').trim().toLowerCase() === name)
      : undefined);
  return match ? centerLetterheads(match) : [];
}

export default function ReportOptionsPopover({ report, onSelectOption }: ReportOptionsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const letterheads = useMemo(() => centerHeaders(report), [report]);
  const showWithHeader = letterheads.length > 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverWidth = 288;
      let left = rect.right - popoverWidth;
      if (left < 10) left = rect.left;
      // keep the menu inside the viewport on narrow screens
      left = Math.min(left, window.innerWidth - popoverWidth - 10);
      // open upwards when there is not enough room below the button
      const estHeight = Math.min(440, 56 + report.bodyParts.length * (88 + Math.max(0, letterheads.length - 1) * 32));
      const openUp = rect.bottom + 4 + estHeight > window.innerHeight - 8 && rect.top - 4 - estHeight >= 8;
      setCoords({
        top: (openUp ? rect.top - 4 - estHeight : rect.bottom + 4) + window.scrollY,
        left: Math.max(10, left + window.scrollX),
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (buttonRef.current && buttonRef.current.contains(event.target as Node)) return;
      // presses inside the menu must reach its buttons (closing here unmounted the menu before the click)
      if (popoverRef.current && popoverRef.current.contains(event.target as Node)) return;
      setIsOpen(false);
    }
    function handleScroll(event: Event) {
      if (popoverRef.current && event.target instanceof Node && popoverRef.current.contains(event.target)) return;
      setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  // t82: no With/Without Header options until a doctor has created a report
  if (!hasDoctorReport(report)) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className="inline-flex items-center justify-center gap-1 p-2 text-xs font-semibold text-[#009ef7] bg-[#009ef7]/10 hover:bg-[#009ef7] hover:text-white border border-[#009ef7]/30 transition-all cursor-pointer rounded-lg shrink-0 shadow-2xs"
        title="View X-Ray Report Options"
        aria-label="Actions"
      >
        <FileText className="w-4 h-4" />
        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && mounted && createPortal(
        <div
          ref={popoverRef}
          style={{ position: 'absolute', top: coords.top, left: coords.left, zIndex: 9999 }}
          className="w-72 max-w-[calc(100vw-20px)] bg-white border border-slate-200 rounded-xl shadow-2xl py-1 text-left animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 rounded-t-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Report Options</p>
            <p className="text-xs font-semibold text-slate-900 truncate">{report.fullName}{formatPatientDisplayId(report.patientNumber) ? ` (${report.patientNumber})` : ''}</p>
          </div>

          <div className="py-1 max-h-64 overflow-y-auto">
            {report.bodyParts.map((part, idx) => {
              const ready = isReportReady(report, part);
              return (
              <div key={idx} className="px-2 py-1 border-b border-slate-100 last:border-0">
                <p className="text-[10px] font-bold text-[#009ef7] px-2 py-0.5 uppercase tracking-wide flex items-center justify-between">
                  <span>Report #{idx + 1}: {part}</span>
                  {report.bodyParts.length > 1 && (
                    <span className="text-[9px] text-slate-400 font-mono">Part {idx + 1}/{report.bodyParts.length}</span>
                  )}
                </p>
                {!ready ? (
                  <p className="flex items-center gap-2 px-2 py-1.5 text-xs text-amber-700" data-testid="report-pending">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="font-medium">Report pending</span>
                  </p>
                ) : (
                <>
                {showWithHeader ? (
                  letterheads.length > 1 ? letterheads.map((letterhead) => (
                  <button
                    key={letterhead.id}
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onSelectOption(report, true, part, letterhead.id);
                    }}
                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 hover:bg-[#009ef7]/10 hover:text-[#009ef7] transition-colors cursor-pointer rounded"
                    data-testid={`view-report-letterhead-${letterhead.id}`}
                    title={`View using ${letterhead.name}`}
                  >
                    <Printer className="w-3.5 h-3.5 text-[#009ef7] shrink-0" />
                    <span className="font-medium truncate">View Report ({letterhead.name})</span>
                  </button>
                  )) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onSelectOption(report, true, part, letterheads[0]?.id);
                    }}
                    className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 hover:bg-[#009ef7]/10 hover:text-[#009ef7] transition-colors cursor-pointer rounded"
                    data-testid="view-report-with-header"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#009ef7]" />
                    <span className="font-medium">View Report ({letterheads[0]?.name || 'With Header'})</span>
                  </button>
                  )
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onSelectOption(report, false, part);
                  }}
                  className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer rounded"
                  data-testid="view-report-without-header"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-medium">
                    {showWithHeader ? 'View Report (Without Header)' : 'View Report'}
                  </span>
                </button>
                </>
                )}
              </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
