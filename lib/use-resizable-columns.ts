"use client";

import { useState, useCallback, useEffect, useRef } from 'react';

function renderedWidths(table: HTMLTableElement | null | undefined): Record<string, number> {
  const measured: Record<string, number> = {};
  table?.querySelectorAll<HTMLElement>('thead th[data-column-key]').forEach(header => {
    if (header.offsetWidth) measured[header.dataset.columnKey!] = header.getBoundingClientRect().width;
  });
  return measured;
}

export function useResizableColumns(initialWidths: Record<string, number>, minimumWidths: Record<string, number> = {}) {
  const [widths, setWidths] = useState<Record<string, number>>(initialWidths);
  const config = useRef({ initialWidths, minimumWidths });
  config.current = { initialWidths, minimumWidths };
  const cleanup = useRef<null | (() => void)>(null);
  const minimumFor = useCallback((key: string) => {
    const settings = config.current;
    return settings.minimumWidths[key] ?? (key === 'actions' ? Math.max(160, settings.initialWidths[key]) : Math.min(120, settings.initialWidths[key]));
  }, []);
  const minimums = Object.fromEntries(Object.keys(initialWidths).map(key => [key, minimumFor(key)]));

  const applyResize = useCallback((baseline: Record<string, number>, key: string, value: number, table?: HTMLTableElement | null) => {
    const next = { ...baseline, [key]: Math.max(minimumFor(key), Math.min(1200, value)) };
    const keys = Object.keys(renderedWidths(table));
    if (keys.length && table?.parentElement) {
      // A full-width table must retain its width when one column shrinks. Put
      // the spare space into one neighbour instead of letting CSS stretch every column.
      const deficit = table.parentElement.clientWidth - keys.reduce((sum, column) => sum + next[column], 0);
      if (deficit > 0) {
        const index = keys.indexOf(key);
        const neighbour = keys[index + 1] || keys[index - 1];
        if (neighbour) next[neighbour] += deficit;
      }
    }
    setWidths(next);
  }, [minimumFor]);

  const resizeColumn = useCallback((key: string, value: number, table?: HTMLTableElement | null) => {
    applyResize({ ...widths, ...renderedWidths(table) }, key, value, table);
  }, [applyResize, widths]);

  const startResizing = useCallback((key: string, startX: number, currentWidth: number, table?: HTMLTableElement | null, pointerId?: number) => {
    cleanup.current?.();
    // Reading the displayed widths is side-effect free: a click must never resize.
    const baseline = { ...widths, ...renderedWidths(table) };
    const cursor = document.body.style.cursor;
    const selection = document.body.style.userSelect;
    let dragging = false;
    const move = (event: PointerEvent) => {
      if (pointerId !== undefined && event.pointerId !== pointerId) return;
      const delta = event.clientX - startX;
      if (!dragging && Math.abs(delta) < 3) return;
      dragging = true;
      applyResize(baseline, key, currentWidth + delta, table);
    };
    const stop = (event?: PointerEvent | Event) => {
      if (event && 'pointerId' in event && pointerId !== undefined && event.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('blur', stop);
      document.body.style.cursor = cursor;
      document.body.style.userSelect = selection;
      cleanup.current = null;
    };
    cleanup.current = stop;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
  }, [applyResize, widths]);

  useEffect(() => () => cleanup.current?.(), []);
  return { widths, minimums, resizeColumn, startResizing, tableWidth: Object.values(widths).reduce((sum, width) => sum + width, 0) };
}
