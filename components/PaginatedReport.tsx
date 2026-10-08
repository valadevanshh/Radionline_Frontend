'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { buildReportSourceHtml, REPORT_ALL_CSS, A4_PAGE, type PrintReportPayload } from '@/lib/print-helper';
import { rnPaginate, createMeasureHost, REPORT_PAGES_SCREEN_CSS, SCREEN_PAGE_GAP_MM } from '@/lib/report-pages';

const MM_PX = 96 / 25.4;

/** Height in px of `count` A4 pages stacked on screen (before scaling). */
export function stackedPagesHeightPx(count: number): number {
  const n = Math.max(1, count);
  return (n * A4_PAGE.heightMm + (n - 1) * SCREEN_PAGE_GAP_MM) * MM_PX;
}

/**
 * QR code (qrcode.react) rendered off-screen so its SVG markup can go into the static report
 * pages and the print document. Returns the hidden element to mount and the markup.
 */
export function useQrSvgMarkup(value: string): [React.ReactNode, string] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState('');
  useLayoutEffect(() => {
    const next = value ? ref.current?.innerHTML || '' : '';
    setSvg((prev) => (prev === next ? prev : next));
  }, [value]);
  const el = (
    <div ref={ref} style={{ display: 'none' }} aria-hidden="true">
      {value ? <QRCodeSVG value={value} size={87} level="M" /> : null}
    </div>
  );
  return [el, svg];
}

interface PaginatedReportProps {
  /** Report content; qrSvg / qrLink are filled in from `qrValue` */
  payload: PrintReportPayload;
  /** Link encoded in the QR code on every page (the public read-only report) */
  qrValue?: string;
  /** 'fit' scales the pages down to the available width; 'actual' shows them at 100% */
  zoom?: 'fit' | 'actual';
  gutterPx?: number;
  onPageCount?: (n: number) => void;
  testId?: string;
}

/**
 * Read-only A4 report pages: the same source and paginator as the PDF, so the screen shows
 * exactly the pages that print (letterhead, QR and "n of N pages" on each, doctor on the last).
 */
export default function PaginatedReport({ payload, qrValue = '', zoom = 'fit', gutterPx, onPageCount, testId }: PaginatedReportProps) {
  const [qrEl, qrSvg] = useQrSvgMarkup(qrValue);
  const [vpW, setVpW] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const vpRef = useRef<HTMLDivElement | null>(null);
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<ReturnType<typeof createMeasureHost> | null>(null);
  const [fontsTick, setFontsTick] = useState(0);

  const source = buildReportSourceHtml({ ...payload, qrSvg: qrValue ? qrSvg : '', qrLink: qrValue || undefined });

  useLayoutEffect(() => {
    const target = pagesRef.current;
    if (!target) return;
    if (!measureRef.current) measureRef.current = createMeasureHost(document, REPORT_ALL_CSS);
    const m = measureRef.current;
    m.src.innerHTML = source;
    const n = rnPaginate(m.src.firstElementChild as HTMLElement, m.out);
    m.src.innerHTML = '';
    while (target.firstChild) target.removeChild(target.firstChild);
    while (m.out.firstChild) target.appendChild(m.out.firstChild);
    setPageCount(n || 1);
  }, [source, fontsTick]);

  useEffect(() => {
    const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
    let alive = true;
    fonts?.ready?.then(() => alive && setFontsTick((t) => t + 1));
    return () => {
      alive = false;
      measureRef.current?.host.remove();
      measureRef.current = null;
    };
  }, []);

  useEffect(() => {
    onPageCount?.(pageCount);
  }, [pageCount, onPageCount]);

  const setVp = useCallback((el: HTMLDivElement | null) => {
    vpRef.current = el;
    if (el) setVpW(el.clientWidth);
  }, []);
  useEffect(() => {
    const el = vpRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setVpW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sheetW = A4_PAGE.widthMm * MM_PX;
  const gutter = gutterPx ?? (vpW > 0 && vpW < 640 ? 10 : 24);
  const scale = zoom === 'fit' && vpW > 0 ? Math.min(1, Math.max(0.2, (vpW - 2 * gutter) / sheetW)) : 1;
  const frameH = stackedPagesHeightPx(pageCount) * scale;

  return (
    <div ref={setVp} style={{ padding: gutter }} data-testid={testId} data-page-count={pageCount}>
      <style>{REPORT_ALL_CSS + REPORT_PAGES_SCREEN_CSS}</style>
      {qrEl}
      <div style={{ width: sheetW * scale, height: frameH, margin: '0 auto', position: 'relative' }}>
        <div
          ref={pagesRef}
          className="rn-pages select-text"
          data-testid="report-pages"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: scale === 1 ? undefined : `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        />
      </div>
    </div>
  );
}
