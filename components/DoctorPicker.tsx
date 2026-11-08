'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, Stethoscope, X } from 'lucide-react';
import type { Doctor } from '@/lib/radiology-store';
import { withDr } from '@/lib/doctor-name';

export interface DoctorOption {
  id: string;
  name: string;
  email?: string;
  count?: number;
}

export function doctorOptionsFrom(doctors: Doctor[]): DoctorOption[] {
  return doctors
    .map((d) => ({
      id: String(d.id),
      name: (d.fullName || `${d.firstName || ''} ${d.lastName || ''}`).trim() || d.email || String(d.id),
      email: d.email,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

interface Props {
  options: DoctorOption[];
  value: string;
  onChange: (id: string) => void;
  /** Show an "All doctors" entry (value '') - for list filters */
  allLabel?: string;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  id?: string;
  compact?: boolean;
}

const initials = (n: string) =>
  n.replace(/^dr\.?\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'DR';

/** Searchable single-select for doctors (type to filter, arrow keys + Enter, Esc to close). */
export default function DoctorPicker({
  options, value, onChange, allLabel, placeholder = 'Select doctor...', invalid, disabled, loading, className = '', id, compact,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hi, setHi] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.id === value) || null;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setHi(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = options.filter((o) => !q || o.name.toLowerCase().includes(q) || (o.email || '').toLowerCase().includes(q));
    const rows: (DoctorOption | null)[] = allLabel && !q ? [null, ...list] : list;
    return rows;
  }, [options, query, allLabel]);

  useEffect(() => {
    const el = listRef.current?.children[hi] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [hi]);

  const pick = (o: DoctorOption | null) => {
    onChange(o ? o.id : '');
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items.length) pick(items[hi] ?? null); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
  };

  const h = compact ? 'py-1.5' : 'py-2';

  return (
    <div ref={boxRef} className={`relative w-full ${className}`}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-2 px-3 ${h} rounded-lg border text-xs font-semibold text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
          invalid
            ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-100'
            : open
              ? 'border-[#009ef7] bg-white ring-2 ring-sky-100'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        }`}
      >
        <Stethoscope className={`w-3.5 h-3.5 shrink-0 ${selected ? 'text-purple-600' : 'text-slate-400'}`} />
        <span className={`flex-1 truncate ${selected ? 'text-slate-900' : 'text-slate-400 font-medium'}`}>
          {selected ? withDr(selected.name) : allLabel || placeholder}
        </span>
        {selected && allLabel && !disabled ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            className="p-0.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200"
            title="Clear"
          >
            <X className="w-3 h-3" />
          </span>
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute z-[700] mt-1 w-full min-w-[240px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setHi(0); }}
                onKeyDown={onKey}
                placeholder="Search by name or email..."
                className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-[#009ef7]"
              />
            </div>
          </div>
          <ul ref={listRef} role="listbox" className="max-h-60 overflow-y-auto py-1">
            {loading ? (
              <li className="px-3 py-4 text-center text-xs text-slate-400">Loading doctors...</li>
            ) : items.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-slate-500">
                {options.length === 0 ? 'No doctors found. Add a doctor first.' : `No doctor matches "${query}"`}
              </li>
            ) : (
              items.map((o, i) => {
                const isSel = o ? o.id === value : !value;
                return (
                  <li
                    key={o ? o.id : '__all'}
                    role="option"
                    aria-selected={isSel}
                    onMouseEnter={() => setHi(i)}
                    onMouseDown={(e) => { e.preventDefault(); pick(o); }}
                    className={`flex items-center gap-2.5 px-3 py-1.5 cursor-pointer text-xs ${i === hi ? 'bg-sky-50' : ''}`}
                  >
                    {o ? (
                      <span className="w-6 h-6 shrink-0 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center">
                        {initials(o.name)}
                      </span>
                    ) : (
                      <span className="w-6 h-6 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                        <Stethoscope className="w-3 h-3" />
                      </span>
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-semibold text-slate-800">{o ? withDr(o.name) : allLabel}</span>
                      {o?.email && <span className="block truncate text-[10px] text-slate-400">{o.email}</span>}
                    </span>
                    {typeof o?.count === 'number' && (
                      <span className="text-[10px] font-mono text-slate-400">{o.count}</span>
                    )}
                    {isSel && <Check className="w-3.5 h-3.5 text-[#009ef7] shrink-0" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}