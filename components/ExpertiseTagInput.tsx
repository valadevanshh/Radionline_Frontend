'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import {
  EXPERTISE_SUGGESTIONS,
  MAX_EXPERTISE_TAGS,
  MAX_EXPERTISE_TAG_LEN,
  cleanTag,
} from '@/lib/doctor-profile';

interface ExpertiseTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  id?: string;
}

/** Multi-value tags (Neuro, MSK, Chest...). Enter or comma adds, Backspace on empty removes the last. */
export default function ExpertiseTagInput({ value, onChange, id }: ExpertiseTagInputProps) {
  const [draft, setDraft] = useState('');
  const [hint, setHint] = useState('');
  const has = (t: string) => value.some((v) => v.toLowerCase() === t.toLowerCase());
  const full = value.length >= MAX_EXPERTISE_TAGS;

  const add = (raw: string) => {
    setHint('');
    const parts = raw.split(',').map(cleanTag).filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    for (const tag of parts) {
      if (tag.length > MAX_EXPERTISE_TAG_LEN) {
        setHint(`Keep each expertise to ${MAX_EXPERTISE_TAG_LEN} characters or fewer.`);
        continue;
      }
      if (next.some((v) => v.toLowerCase() === tag.toLowerCase())) continue;
      if (next.length >= MAX_EXPERTISE_TAGS) {
        setHint(`You can add up to ${MAX_EXPERTISE_TAGS} expertise areas.`);
        break;
      }
      next.push(tag);
    }
    onChange(next);
    setDraft('');
  };

  const remove = (tag: string) => onChange(value.filter((v) => v !== tag));
  const suggestions = EXPERTISE_SUGGESTIONS.filter((s) => !has(s));

  return (
    <div>
      <div
        className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-[var(--rn-radius-control)] border border-[var(--rn-border)] bg-[var(--rn-surface)] px-2 py-1.5 transition-colors focus-within:border-[#009ef7]"
        data-testid="doctor-expertise"
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex max-w-full items-center gap-1 rounded-md border border-sky-200 bg-sky-50 py-0.5 pl-2 pr-1 text-[12px] font-semibold text-sky-800"
          >
            <span className="truncate">{tag}</span>
            <button
              type="button"
              onClick={() => remove(tag)}
              className="flex h-4 w-4 min-h-0 min-w-0 [@media(pointer:coarse)]:h-6 [@media(pointer:coarse)]:w-6 shrink-0 items-center justify-center rounded text-sky-700 hover:bg-sky-100 hover:text-sky-900"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          disabled={full}
          maxLength={MAX_EXPERTISE_TAG_LEN * 4}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(',')) add(v);
            else setDraft(v);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            } else if (e.key === 'Backspace' && !draft && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => draft.trim() && add(draft)}
          placeholder={full ? '' : value.length ? 'Add more...' : 'Type and press Enter, e.g. Neuro'}
          className="min-w-[140px] flex-1 bg-transparent text-[13px] font-medium text-[var(--rn-text)] outline-none placeholder:text-slate-400"
          style={{ border: 'none', boxShadow: 'none', height: 24, minHeight: 24, padding: '0 4px', background: 'transparent' }}
          aria-label="Add expertise"
        />
      </div>
      {suggestions.length > 0 && !full && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500">Suggestions:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex min-h-0 min-w-0 [@media(pointer:coarse)]:min-h-8 items-center gap-0.5 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:border-[#009ef7] hover:text-[#009ef7]"
            >
              <Plus className="h-3 w-3" />
              {s}
            </button>
          ))}
        </div>
      )}
      {hint && <p className="mt-1.5 text-[11px] font-medium text-amber-700">{hint}</p>}
    </div>
  );
}
