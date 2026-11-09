'use client';

import { useId } from 'react';

export default function SignatureSizeControl({ value, onChange, disabled = false }: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between gap-3 text-[12px]">
        <label htmlFor={id} className="font-semibold text-slate-700">Signature size</label>
        <output htmlFor={id} className="font-mono text-slate-600">{value}%</output>
      </div>
      <input id={id} type="range" min={25} max={200} step={5} value={value}
        disabled={disabled} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-sky-500" />
      <div className="flex items-center justify-between text-[11px] text-slate-500">
        <span>Smaller</span>
        <button type="button" disabled={disabled || value === 100} onClick={() => onChange(100)}
          className="text-sky-600 disabled:opacity-50">Reset to 100%</button>
        <span>Larger</span>
      </div>
    </div>
  );
}
