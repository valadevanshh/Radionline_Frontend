'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, ChevronDown, Printer, Eye } from 'lucide-react';
import { XRayReport } from '@/lib/radiology-store';
import { formatPatientDisplayId } from '@/lib/uuid';

interface ReportOptionsPopoverProps {
  report: XRayReport;
  onSelectOption: (report: XRayReport, withHeader: boolean, bodyPart?: string) => void;
}

export default function ReportOptionsPopover({ report, onSelectOption }: ReportOptionsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleOpen = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverWidth = 256;
      let left = rect.right - popoverWidth;
      if (left < 10) left = rect.left;
      // keep the menu inside the viewport on narrow screens
      left = Math.min(left, window.innerWidth - popoverWidth - 10);
      // open upwards when there is not enough room below the button
      const estHeight = Math.min(320, 56 + report.bodyParts.length * 84);
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

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#009ef7] bg-[#009ef7]/10 hover:bg-[#009ef7]/20 border border-[#009ef7]/30 transition-all cursor-pointer rounded-lg shrink-0"
        title="View X-Ray Report Options"
      >
        <Eye className="w-3.5 h-3.5" />
        <span>Actions</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && mounted && createPortal(
        <div
          ref={popoverRef}
          style={{ position: 'absolute', top: coords.top, left: coords.left, zIndex: 9999 }}
          className="w-64 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 text-left animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 rounded-t-xl">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Report Options</p>
            <p className="text-xs font-semibold text-slate-900 truncate">{report.fullName}{formatPatientDisplayId(report.patientNumber) ? ` (${report.patientNumber})` : ''}</p>
          </div>

          <div className="py-1 max-h-64 overflow-y-auto">
            {report.bodyParts.map((part, idx) => (
              <div key={idx} className="px-2 py-1 border-b border-slate-100 last:border-0">
                <p className="text-[10px] font-bold text-[#009ef7] px-2 py-0.5 uppercase tracking-wide flex items-center justify-between">
                  <span>Report #{idx + 1}: {part}</span>
                  {report.bodyParts.length > 1 && (
                    <span className="text-[9px] text-slate-400 font-mono">Part {idx + 1}/{report.bodyParts.length}</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onSelectOption(report, true, part);
                  }}
                  className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 hover:bg-[#009ef7]/10 hover:text-[#009ef7] transition-colors cursor-pointer rounded"
                >
                  <Printer className="w-3.5 h-3.5 text-[#009ef7]" />
                  <span className="font-medium">View Report (With Header)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onSelectOption(report, false, part);
                  }}
                  className="w-full text-left flex items-center gap-2 px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer rounded"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-medium">View Report (Without Header)</span>
                </button>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
