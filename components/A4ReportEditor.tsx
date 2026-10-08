'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import SpellCheckTextarea from '@/components/SpellCheckTextarea';
import { buildReportSourceHtml, REPORT_ALL_CSS, type PrintReportPayload } from '@/lib/print-helper';
import { rnPaginate, createMeasureHost, REPORT_PAGES_SCREEN_CSS } from '@/lib/report-pages';

/**
 * Editable A4 report pages (PACS viewer).
 *
 * The page layout comes from the same source + paginator as the PDF: the report is laid out
 * off-screen into A4 pages (letterhead, QR code and "n of N pages" on every page, doctor block
 * on the last page) and each page is shown as static HTML. Where the findings / impression /
 * title fall, the page holds an empty placeholder and the editor is portalled into it; text
 * that runs over a page break is edited in one textarea per page, with the caret following
 * the text across pages as it reflows.
 */

type EditKind = 'findings' | 'impression' | 'title';
type Edit = { kind: EditKind; s: number; e: number };
type SheetPage = { html: string; edits: Edit[] };
type Plan = { src: string; pages: SheetPage[] };
type Slice = { s: number; dispEnd: number; value: string };

/** Editor-only rules (the paginated measure uses <p>; the editor uses a div around a textarea) */
const EDITOR_PAGES_CSS = `
.rn-page .rn-edit { margin: 0 0 8px; }
.rn-page.rn-compact .rn-edit { margin-bottom: 4px; }
.rn-page .rn-edit.rn-split-head { margin-bottom: 0; }
.rn-page textarea, .rn-page input[type="text"] { font: inherit; letter-spacing: inherit; padding: 0; min-height: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
.rn-page textarea { display: block; vertical-align: top; }
`;

function norm(s: string): string {
  return String(s || '').replace(/\r\n?/g, '\n');
}

interface A4ReportEditorProps {
  /** Report content; the first study's title / findings / impression come from the props below */
  payload: PrintReportPayload;
  findings: string;
  impression: string;
  onFindingsChange: (v: string) => void;
  onImpressionChange: (v: string) => void;
  /** When set, the study title is an input on the page */
  title?: string;
  onTitleChange?: (v: string) => void;
  scale: number;
  onPageCount?: (n: number) => void;
}

export default function A4ReportEditor({
  payload,
  findings,
  impression,
  onFindingsChange,
  onImpressionChange,
  title,
  onTitleChange,
  scale,
  onPageCount,
}: A4ReportEditorProps) {
  const findingsText = norm(findings);
  const impressionText = norm(impression);
  const titleEditable = typeof title === 'string' && Boolean(onTitleChange);
  const study0 = payload.studies?.[0] || { title: '', technique: '', findings: '', impression: '' };
  const source = buildReportSourceHtml(
    {
      ...payload,
      studies: [
        { ...study0, title: titleEditable ? (title as string) : study0.title, findings: findingsText, impression: impressionText },
        ...(payload.studies || []).slice(1),
      ],
    },
    { editorText: true }
  );

  const [plan, setPlan] = useState<Plan>({ src: '', pages: [] });
  const measureRef = useRef<ReturnType<typeof createMeasureHost> | null>(null);
  const [fontsTick, setFontsTick] = useState(0);

  // 1. Lay the report out into pages; editable blocks become placeholders
  useLayoutEffect(() => {
    if (!measureRef.current) measureRef.current = createMeasureHost(document, REPORT_ALL_CSS + EDITOR_PAGES_CSS);
    const m = measureRef.current;
    m.src.innerHTML = source;
    rnPaginate(m.src.firstElementChild as HTMLElement, m.out);
    m.src.innerHTML = '';
    const pages: SheetPage[] = [];
    Array.from(m.out.children).forEach((pg) => {
      const edits: Edit[] = [];
      pg.querySelectorAll('[data-b]').forEach((node) => {
        const el = node as HTMLElement;
        const b = el.getAttribute('data-b') || '';
        const kind: EditKind | null =
          b === 'findings-0' ? 'findings' : b === 'impression-0' ? 'impression' : b === 'title-0' && titleEditable ? 'title' : null;
        if (!kind) return;
        const s = parseInt(el.getAttribute('data-s') || '0', 10) || 0;
        const e = parseInt(el.getAttribute('data-e') || '0', 10) || 0;
        let ph: HTMLElement;
        if (kind === 'title') {
          ph = el;
          while (ph.firstChild) ph.removeChild(ph.firstChild);
        } else {
          ph = document.createElement('div');
          const keep = ['rn-first', 'rn-split-head', 'rn-split-tail'].filter((c) => el.classList.contains(c));
          ph.className = ['rn-edit', kind === 'findings' ? 'findings-editor' : 'impression-editor'].concat(keep).join(' ');
          ph.setAttribute('data-testid', kind === 'findings' ? 'findings-editor' : 'impression-editor');
          if (kind === 'findings' && el.getAttribute('style')) ph.setAttribute('style', el.getAttribute('style') as string);
          if (kind === 'impression') ph.style.fontWeight = '700';
          el.parentNode?.replaceChild(ph, el);
        }
        ph.setAttribute('data-edit', String(edits.length));
        edits.push({ kind, s, e });
      });
      pages.push({ html: (pg as HTMLElement).outerHTML, edits });
    });
    while (m.out.firstChild) m.out.removeChild(m.out.firstChild);
    setPlan({ src: source, pages });
  }, [source, titleEditable, fontsTick]);

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
    if (plan.pages.length) onPageCount?.(plan.pages.length);
  }, [plan.pages.length, onPageCount]);

  // 2. Find the placeholders in the page HTML (new nodes only when a page's HTML changed)
  const hostRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [targets, setTargets] = useState<{ plan: Plan | null; list: HTMLElement[][] }>({ plan: null, list: [] });
  useLayoutEffect(() => {
    const list = plan.pages.map((_, i) => Array.from(hostRefs.current[i]?.querySelectorAll<HTMLElement>('[data-edit]') || []));
    setTargets({ plan, list });
  }, [plan]);

  // 3. Slices of each text per page, in order
  const textOf = (k: EditKind) => (k === 'findings' ? findingsText : k === 'impression' ? impressionText : '');
  const slicesOf = (k: 'findings' | 'impression'): Slice[] => {
    const full = textOf(k);
    const raw = plan.pages.flatMap((p) => p.edits.filter((ed) => ed.kind === k));
    return raw.map((ed, j) => {
      const s = Math.min(ed.s, full.length);
      const e = Math.max(s, Math.min(ed.e, full.length));
      // A line break that ends a page is implied by the break; the next page holds the next line
      const hidden = j < raw.length - 1 && e > s && full[e - 1] === '\n';
      const dispEnd = hidden ? e - 1 : e;
      return { s, dispEnd, value: full.slice(s, dispEnd) };
    });
  };
  const slices: Record<'findings' | 'impression', Slice[]> = { findings: slicesOf('findings'), impression: slicesOf('impression') };
  const slicesRef = useRef(slices);
  slicesRef.current = slices;

  const areas = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const pendingCaret = useRef<{ kind: 'findings' | 'impression'; pos: number } | null>(null);

  const setText = useCallback(
    (k: 'findings' | 'impression', v: string) => (k === 'findings' ? onFindingsChange(v) : onImpressionChange(v)),
    [onFindingsChange, onImpressionChange]
  );

  // 4. After the text reflowed, put the caret back where the user is typing
  useLayoutEffect(() => {
    const pc = pendingCaret.current;
    if (!pc || plan.src !== source || targets.plan !== plan) return;
    const list = slicesRef.current[pc.kind];
    if (!list.length) return;
    let j = list.findIndex((sl) => pc.pos <= sl.dispEnd);
    if (j < 0) j = list.length - 1;
    const ta = areas.current.get(`${pc.kind}#${j}`);
    if (!ta || !ta.isConnected) return;
    pendingCaret.current = null;
    const local = Math.max(0, Math.min(pc.pos - list[j].s, ta.value.length));
    if (document.activeElement !== ta) ta.focus();
    if (ta.selectionStart !== local || ta.selectionEnd !== local) ta.setSelectionRange(local, local);
  });

  const focusSlice = (k: 'findings' | 'impression', j: number, where: 'start' | 'end') => {
    const ta = areas.current.get(`${k}#${j}`);
    if (!ta) return;
    ta.focus();
    const at = where === 'start' ? 0 : ta.value.length;
    ta.setSelectionRange(at, at);
  };

  const renderSlice = (k: 'findings' | 'impression', j: number) => {
    const list = slices[k];
    const sl = list[j];
    if (!sl) return null;
    const full = textOf(k);
    const n = list.length;
    return (
      <SpellCheckTextarea
        rows={1}
        minHeightPx={0}
        value={sl.value}
        fontClass=""
        textareaRef={(el) => {
          const key = `${k}#${j}`;
          if (el) areas.current.set(key, el);
          else if (areas.current.get(key)?.isConnected === false) areas.current.delete(key);
        }}
        onChange={(v, caret) => {
          const cur = slicesRef.current[k][j] || sl;
          const text = textOf(k);
          setText(k, text.slice(0, cur.s) + v + text.slice(cur.dispEnd));
          pendingCaret.current = typeof caret === 'number' ? { kind: k, pos: cur.s + caret } : null;
        }}
        onKeyDown={(e) => {
          const ta = e.currentTarget;
          const collapsed = ta.selectionStart === ta.selectionEnd;
          const atStart = collapsed && ta.selectionStart === 0;
          const atEnd = collapsed && ta.selectionStart === ta.value.length;
          const cur = slicesRef.current[k][j] || sl;
          if (e.key === 'Backspace' && atStart && j > 0 && cur.s > 0) {
            e.preventDefault();
            setText(k, full.slice(0, cur.s - 1) + full.slice(cur.s));
            pendingCaret.current = { kind: k, pos: cur.s - 1 };
          } else if (e.key === 'Delete' && atEnd && j < n - 1) {
            e.preventDefault();
            setText(k, full.slice(0, cur.dispEnd) + full.slice(cur.dispEnd + 1));
            pendingCaret.current = { kind: k, pos: cur.dispEnd };
          } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && atStart && j > 0 && !e.shiftKey) {
            e.preventDefault();
            focusSlice(k, j - 1, 'end');
          } else if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && atEnd && j < n - 1 && !e.shiftKey) {
            e.preventDefault();
            focusSlice(k, j + 1, 'start');
          }
        }}
      />
    );
  };

  // Portals: one editor per placeholder. While a new layout's placeholders are being looked up,
  // keep using the previous ones (same nodes when that page's HTML did not change), so the
  // textarea being typed in is not remounted on every keystroke.
  const portals: React.ReactNode[] = [];
  {
    const seen: Record<EditKind, number> = { findings: 0, impression: 0, title: 0 };
    plan.pages.forEach((pg, pi) =>
      pg.edits.forEach((ed, ei) => {
        const j = seen[ed.kind]++;
        const el = targets.list[pi]?.[ei];
        if (!el) return;
        let node: React.ReactNode = null;
        if (ed.kind === 'title') {
          node = (
            <input
              type="text"
              value={title || ''}
              onChange={(e) => onTitleChange?.(e.target.value)}
              aria-label="Report title"
              style={{ display: 'block', width: '100%', height: '1.4em', lineHeight: 1.4, textAlign: 'center', textTransform: 'uppercase', textDecoration: 'underline', outline: 'none', color: '#000' }}
            />
          );
        } else {
          node = renderSlice(ed.kind, j);
        }
        portals.push(createPortal(node, el, `${pi}-${ei}`));
      })
    );
  }

  return (
    <>
      <style>{REPORT_ALL_CSS + REPORT_PAGES_SCREEN_CSS + EDITOR_PAGES_CSS}</style>
      <div
        className="rn-pages select-text"
        data-testid="report-print-area"
        data-print-ready="1"
        data-page-count={plan.pages.length}
        data-scale={scale.toFixed(3)}
        style={{ position: 'absolute', top: 0, left: 0, transform: scale === 1 ? undefined : `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {plan.pages.map((pg, i) => (
          <div
            key={i}
            ref={(el) => {
              hostRefs.current[i] = el;
            }}
            data-testid="report-page"
            dangerouslySetInnerHTML={{ __html: pg.html }}
          />
        ))}
      </div>
      {portals}
    </>
  );
}
