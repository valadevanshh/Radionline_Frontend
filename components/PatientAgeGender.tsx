'use client';

import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Plain age + gender controls (upload and edit).
 * Age: three compact steppers (Y / M / D badge, number, up/down arrows),
 * clamped Y 0-120, M 0-11, D 0-30. Gender: simple M / F / O choice.
 * Edits the same years / months / days strings and gender value the form stores.
 */
export type PatientGender = 'Male' | 'Female' | 'Other';

export interface PatientAgeGenderProps {
  ageY: string;
  ageM: string;
  ageD: string;
  setAgeY: (v: string) => void;
  setAgeM: (v: string) => void;
  setAgeD: (v: string) => void;
  gender: PatientGender | '';
  setGender: (g: PatientGender) => void;
  ageError?: string;
  genderError?: string;
  clearAgeError: () => void;
  clearGenderError: () => void;
  disabled?: boolean;
}

type Unit = 'Y' | 'M' | 'D';
export const AGE_MAX: Record<Unit, number> = { Y: 120, M: 11, D: 30 };
const UNIT_NAME: Record<Unit, string> = { Y: 'Years', M: 'Months', D: 'Days' };
const H = 32; // same height as the other compact inputs
// Age steppers: 36px tall / full-width on phones (touch), 28px x 50px from sm up.
const GENDERS: { value: PatientGender; short: string }[] = [
  { value: 'Male', short: 'M' },
  { value: 'Female', short: 'F' },
  { value: 'Other', short: 'O' },
];

const clamp = (n: number, u: Unit) => Math.min(AGE_MAX[u], Math.max(0, n));

export function AgeGenderLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-[11px] font-semibold text-slate-600 mb-0.5">
      {children} <span className="text-rose-500">*</span>
    </label>
  );
}

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-[11px] font-medium text-rose-600">{msg}</p> : null;
}

export default function PatientAgeGender(p: PatientAgeGenderProps) {
  const vals: Record<Unit, string> = { Y: p.ageY, M: p.ageM, D: p.ageD };
  const setters: Record<Unit, (v: string) => void> = { Y: p.setAgeY, M: p.setAgeM, D: p.setAgeD };
  const set = (u: Unit, v: string) => {
    const d = v.replace(/[^\d]/g, '').slice(0, 3);
    setters[u](d === '' ? '' : String(clamp(Number(d), u)));
    if (p.ageError) p.clearAgeError();
  };
  const step = (u: Unit, by: number) => set(u, String(clamp((Number(vals[u]) || 0) + by, u)));
  const border = p.ageError ? 'border-rose-400' : 'border-slate-300';

  const cap = 'block px-2 pt-1 text-[10px] sm:text-[9px] font-bold uppercase tracking-wide text-slate-400 leading-none';
  const UNIT_SHORT: Record<Unit, string> = { Y: 'Years', M: 'Months', D: 'Days' };

  // t101: Age and Gender are two "captioned" controls in the same style as Body part / View(s):
  // one bordered box, small uppercase caption inside each segment, big value, full-height arrows.
  return (
    <div className="flex gap-2 items-start" data-testid="agegender">
      <div data-field="age" className="flex-1 min-w-0 sm:flex-none sm:w-[228px]">
        <div
          className={`flex rounded-lg border bg-white divide-x divide-slate-200 overflow-hidden h-14 sm:h-10 focus-within:border-[#009ef7] focus-within:ring-2 focus-within:ring-sky-100 ${border}`}
          data-testid="patient-age"
        >
          {(['Y', 'M', 'D'] as Unit[]).map((u) => {
            const n = Number(vals[u]) || 0;
            return (
              <div key={u} className="flex flex-1 min-w-0" title={`${UNIT_NAME[u]} (0-${AGE_MAX[u]})`} data-testid={`age-${u.toLowerCase()}-box`}>
                <label htmlFor={`up-age-${u.toLowerCase()}`} className="flex-1 min-w-0 flex flex-col justify-center cursor-text">
                  <span className={cap}>
                    {UNIT_SHORT[u]}
                  </span>
                  <input
                    id={`up-age-${u.toLowerCase()}`}
                    inputMode="numeric"
                    autoComplete="off"
                    value={vals[u]}
                    onChange={(e) => set(u, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp') { e.preventDefault(); step(u, 1); }
                      else if (e.key === 'ArrowDown') { e.preventDefault(); step(u, -1); }
                    }}
                    placeholder="0"
                    aria-label={`Age ${UNIT_NAME[u].toLowerCase()} (0-${AGE_MAX[u]})`}
                    className="w-full min-w-0 px-2 bg-transparent text-[20px] sm:text-[14px] font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-300 leading-tight"
                    data-testid={`age-${u.toLowerCase()}`}
                    disabled={p.disabled}
                  />
                </label>
                <div className="flex flex-col w-8 sm:w-5 shrink-0">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => step(u, 1)}
                    disabled={p.disabled || n >= AGE_MAX[u]}
                    aria-label={`Increase ${UNIT_NAME[u].toLowerCase()}`}
                    className="flex-1 flex items-center justify-center text-slate-400 hover:bg-sky-50 hover:text-[#009ef7] active:bg-sky-100 disabled:opacity-25 disabled:hover:bg-transparent"
                    data-testid={`age-${u.toLowerCase()}-inc`}
                  >
                    <ChevronUp className="w-5 h-5 sm:w-3 sm:h-3" strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => step(u, -1)}
                    disabled={p.disabled || n <= 0}
                    aria-label={`Decrease ${UNIT_NAME[u].toLowerCase()}`}
                    className="flex-1 flex items-center justify-center text-slate-400 hover:bg-sky-50 hover:text-[#009ef7] active:bg-sky-100 disabled:opacity-25 disabled:hover:bg-transparent"
                    data-testid={`age-${u.toLowerCase()}-dec`}
                  >
                    <ChevronDown className="w-5 h-5 sm:w-3 sm:h-3" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <Err msg={p.ageError} />
      </div>
      <div data-field="gender" className="w-[36%] sm:w-auto shrink-0">
        <div
          role="radiogroup"
          aria-label="Gender"
          className={`flex flex-col rounded-lg border bg-white overflow-hidden h-14 sm:h-10 ${p.genderError ? 'border-rose-400' : 'border-slate-300'}`}
          data-testid="patient-gender"
        >
          <span className={`${cap} pb-0.5`}>Gender <span className="text-rose-500">*</span></span>
          <div className="flex flex-1 gap-1 px-1 pb-1 sm:gap-0.5 sm:px-0.5 sm:pb-0.5">
            {GENDERS.map((g) => {
              const on = p.gender === g.value;
              return (
                <button
                  key={g.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={g.value}
                  title={g.value}
                  onClick={() => {
                    p.setGender(g.value);
                    if (p.genderError) p.clearGenderError();
                  }}
                  className={`flex-1 sm:flex-none sm:w-8 rounded-md text-[16px] sm:text-[12px] font-bold transition-colors ${
                    on ? 'bg-[#009ef7] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  data-testid={`gender-${g.short.toLowerCase()}`}
                  disabled={p.disabled}
                >
                  {g.short}
                </button>
              );
            })}
          </div>
        </div>
        <Err msg={p.genderError} />
      </div>
    </div>
  );
}
