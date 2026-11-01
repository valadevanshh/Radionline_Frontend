'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

export const OTHER_OPTION = 'OTHER';

interface BaseProps {
  options: string[];
  placeholder?: string;
  /** label used in the add-new prompt, e.g. "body part" or "view" */
  noun: string;
  /** called with the new value typed after picking OTHER */
  onAddNew: (value: string) => void;
  disabled?: boolean;
  testId?: string;
  invalid?: boolean;
  /** no own border (sits inside a shared container) */
  bare?: boolean;
}
interface SingleProps extends BaseProps { multiple?: false; value: string; onChange: (v: string) => void }
interface MultiProps extends BaseProps { multiple: true; value: string[]; onChange: (v: string[]) => void }

const norm = (s: string) => s.trim().toLowerCase();

/** Type-to-filter dropdown. Single or multi select; "OTHER" is always the last option. */
export default function Autocomplete(props: SingleProps | MultiProps) {
  const { options, placeholder, noun, onAddNew, disabled, testId, invalid, bare } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hi, setHi] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const selected: string[] = props.multiple ? props.value : props.value ? [props.value] : [];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = norm(query);
    const list = options.filter((o) => norm(o) !== norm(OTHER_OPTION) && (!q || norm(o).includes(q)));
    // starts-with matches first
    list.sort((a, b) => Number(!norm(a).startsWith(q)) - Number(!norm(b).startsWith(q)));
    return [...list.slice(0, 80), OTHER_OPTION];
  }, [options, query]);

  const pick = (opt: string) => {
    if (opt === OTHER_OPTION) {
      const typed = window.prompt(`Add new ${noun}`, query.trim());
      const v = (typed || '').trim();
      if (!v) return;
      onAddNew(v);
      opt = v;
    }
    if (props.multiple) {
      const has = props.value.some((x) => norm(x) === norm(opt));
      props.onChange(has ? props.value.filter((x) => norm(x) !== norm(opt)) : [...props.value, opt]);
      setQuery('');
    } else {
      props.onChange(opt);
      setQuery('');
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="relative w-full" data-testid={testId}>
      <div
        className={`flex flex-wrap items-center gap-1 w-full text-[12px] ${bare ? 'min-h-[34px] bg-transparent px-2 py-0.5' : `min-h-[32px] rounded-md border bg-white px-1.5 py-0.5 ${invalid ? 'border-rose-400' : 'border-slate-300'} focus-within:border-[#009ef7]`} ${disabled ? 'opacity-60' : ''} cursor-text`}
        onClick={() => !disabled && setOpen(true)}
      >
        {props.multiple &&
          selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-0.5 rounded bg-sky-50 border border-sky-200 text-sky-800 px-1 text-[11px] font-semibold">
              {s}
              <button type="button" aria-label={`Remove ${s}`} onClick={(e) => { e.stopPropagation(); pick(s); }} className="hover:text-rose-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        <input
          type="text"
          value={open ? query : props.multiple ? query : props.value}
          placeholder={selected.length && props.multiple ? '' : placeholder}
          disabled={disabled}
          onFocus={() => { setOpen(true); setHi(0); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setHi(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, filtered.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
            else if (e.key === 'Enter') { if (open && filtered[hi]) { e.preventDefault(); pick(filtered[hi]); } }
            else if (e.key === 'Escape') setOpen(false);
            else if (e.key === 'Backspace' && props.multiple && !query && props.value.length) props.onChange(props.value.slice(0, -1));
          }}
          className="flex-1 min-w-[60px] h-7 outline-none bg-transparent"
          style={{ border: 'none', boxShadow: 'none', padding: 0, background: 'transparent', height: 28, minHeight: 0 }}
          aria-label={placeholder}
          data-testid={testId ? `${testId}-input` : undefined}
        />
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </div>
      {open && !disabled && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full min-w-[200px] overflow-auto rounded-md border border-slate-200 bg-white shadow-lg text-[12px]" role="listbox">
          {filtered.map((o, i) => {
            const isSel = selected.some((s) => norm(s) === norm(o));
            const isOther = o === OTHER_OPTION;
            return (
              <li
                key={o + i}
                role="option"
                aria-selected={isSel}
                onMouseDown={(e) => { e.preventDefault(); pick(o); }}
                onMouseEnter={() => setHi(i)}
                className={`px-2 py-1.5 cursor-pointer flex items-center justify-between gap-2 ${i === hi ? 'bg-sky-50' : ''} ${isOther ? 'border-t border-slate-100 font-semibold text-[#009ef7]' : 'text-slate-700'}`}
                data-testid={isOther ? `${testId}-other` : undefined}
              >
                <span className="truncate">{isOther ? `OTHER (add new ${noun})` : o}</span>
                {isSel && <span className="text-sky-600 text-[10px] font-bold">✓</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
