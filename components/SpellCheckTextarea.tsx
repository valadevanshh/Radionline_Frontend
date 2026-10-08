'use client';

import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { isWordMisspelled, getSpellingSuggestion } from '@/lib/radiology-autocomplete';

interface SpellCheckTextareaProps {
  value: string;
  /** `caret` is the caret position after the edit (when the edit came from typing) */
  onChange: (value: string, caret?: number) => void;
  rows?: number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  fontClass?: string;
  /** Smallest height in px (default rows x 20) */
  minHeightPx?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef?: (el: HTMLTextAreaElement | null) => void;
}

/**
 * Transparent textarea + matching plain-text backdrop for wavy spellcheck underlines.
 * Misspelled spans must stay inline with no padding/background — otherwise long
 * radiology templates reflow and look broken in the PACS document pane.
 */
export default function SpellCheckTextarea({
  value,
  onChange,
  rows = 4,
  className = '',
  placeholder = '',
  disabled = false,
  fontClass = 'font-serif text-sm leading-relaxed',
  minHeightPx,
  onKeyDown,
  textareaRef: textareaRefProp,
}: SpellCheckTextareaProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const syncHeight = useCallback(() => {
    const ta = textareaRef.current;
    const bd = backdropRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const next = Math.max(ta.scrollHeight, minHeightPx ?? rows * 20);
    ta.style.height = `${next}px`;
    if (bd) bd.style.height = `${next}px`;
  }, [rows, minHeightPx]);

  useEffect(() => {
    syncHeight();
    const id = requestAnimationFrame(syncHeight);
    return () => cancelAnimationFrame(id);
  }, [value, fontClass, syncHeight]);

  const replaceWordAtCaret = (suggestion: string) => {
    const ta = textareaRef.current;
    if (!ta || !suggestion) return;
    const pos = ta.selectionStart ?? 0;
    const before = value.slice(0, pos);
    const after = value.slice(pos);
    const left = before.match(/[a-zA-Z0-9_]+$/)?.[0] || '';
    const right = after.match(/^[a-zA-Z0-9_]+/)?.[0] || '';
    const word = left + right;
    if (!word) return;
    const start = pos - left.length;
    const end = pos + right.length;
    onChange(value.slice(0, start) + suggestion + value.slice(end));
    requestAnimationFrame(() => {
      const next = start + suggestion.length;
      ta.focus();
      ta.setSelectionRange(next, next);
    });
  };

  const renderedBackdrop = useMemo(() => {
    if (!value) return null;

    const tokens = value.split(/(\b[a-zA-Z0-9_]+\b|\n|\s+)/);

    return tokens.map((token, idx) => {
      if (token === '\n') return <br key={idx} />;

      if (/^[a-zA-Z0-9_]+$/.test(token) && isWordMisspelled(token)) {
        const suggestion = getSpellingSuggestion(token);
        return (
          <span
            key={idx}
            title={suggestion ? `Suggestion: ${suggestion} (Ctrl+Click to apply)` : 'Unrecognized word'}
            className="underline decoration-wavy decoration-red-500 decoration-1 text-slate-900"
            style={{ textUnderlineOffset: '2px' }}
          >
            {token}
          </span>
        );
      }

      return <span key={idx}>{token}</span>;
    });
  }, [value]);

  return (
    <div className={`relative w-full bg-transparent ${className}`}>
      <div
        ref={backdropRef}
        aria-hidden="true"
        className={`absolute inset-0 w-full p-0 text-slate-900 whitespace-pre-wrap break-words overflow-hidden pointer-events-none select-none z-0 ${fontClass}`}
        style={{ boxSizing: 'border-box' }}
      >
        {renderedBackdrop}
        {value.endsWith('\n') && <br />}
      </div>

      <textarea
        ref={(el) => {
          textareaRef.current = el;
          textareaRefProp?.(el);
        }}
        rows={rows}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value, e.target.selectionStart ?? undefined)}
        onKeyDown={onKeyDown}
        onClick={(e) => {
          if (!e.ctrlKey && !e.metaKey) return;
          const ta = textareaRef.current;
          if (!ta) return;
          const pos = ta.selectionStart ?? 0;
          const before = value.slice(0, pos);
          const after = value.slice(pos);
          const left = before.match(/[a-zA-Z0-9_]+$/)?.[0] || '';
          const right = after.match(/^[a-zA-Z0-9_]+/)?.[0] || '';
          const word = left + right;
          if (!word || !isWordMisspelled(word)) return;
          const suggestion = getSpellingSuggestion(word);
          if (suggestion) replaceWordAtCaret(suggestion);
        }}
        placeholder={placeholder}
        spellCheck={false}
        className={`relative z-10 w-full p-0 bg-transparent caret-slate-900 outline-none border-0 resize-none overflow-hidden whitespace-pre-wrap break-words touch-pan-y select-text ${fontClass}`}
        style={{
          boxSizing: 'border-box',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          boxShadow: 'none',
          resize: 'none',
          // Must win over fontClass color utilities — opaque text + backdrop = double/ghosted report
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
          caretColor: '#0f172a',
        }}
      />
    </div>
  );
}
