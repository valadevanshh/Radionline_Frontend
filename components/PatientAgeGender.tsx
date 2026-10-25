'use client';

import React from 'react';

/**
 * Plain age + gender controls (upload and edit).
 * Age: three small number boxes (Years / Months / Days) with compact -/+ buttons,
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
const GENDERS: { value: PatientGender; short: string }[] = [
  { value: 'Male', short: 'M' },
  { value: 'Female', short: 'F' },
  { value: 'Other', short: 'O' },
];

const clamp = (n: number, u: Unit) => Math.min(AGE_MAX[u], Math.max(0, n));

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
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

  return (
    <div className="flex gap-1.5 items-start" data-testid="agegender">
      <div data-field="age" className="flex-1 min-w-0 sm:flex-none">
        <Label htmlFor="up-age-y">Age</Label>
        <div className="flex gap-0.5" data-testid="patient-age">
          {(['Y', 'M', 'D'] as Unit[]).map((u) => {
            const n = Number(vals[u]) || 0;
            return (
              <div
                key={u}
                className={`flex items-center flex-1 sm:flex-none sm:w-[78px] min-w-0 rounded-md border bg-white focus-within:border-[#009ef7] focus-within:ring-2 focus-within:ring-sky-100 ${border}`}
                style={{ height: H }}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => step(u, -1)}
                  disabled={p.disabled || n <= 0}
                  aria-label={`Decrease ${UNIT_NAME[u].toLowerCase()}`}
                  className="w-4 h-full shrink-0 text-slate-500 hover:text-[#009ef7] disabled:opacity-30 text-[14px] leading-none"
                  data-testid={`age-${u.toLowerCase()}-dec`}
                >
                  −
                </button>
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
                  placeholder={UNIT_NAME[u]}
                  aria-label={`Age ${UNIT_NAME[u].toLowerCase()} (0–${AGE_MAX[u]})`}
                  className="w-full min-w-0 h-full bg-transparent text-center text-[13px] outline-none placeholder:text-[9px] placeholder:text-slate-400"
                  data-testid={`age-${u.toLowerCase()}`}
                  disabled={p.disabled}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => step(u, 1)}
                  disabled={p.disabled || n >= AGE_MAX[u]}
                  aria-label={`Increase ${UNIT_NAME[u].toLowerCase()}`}
                  className="w-4 h-full shrink-0 text-slate-500 hover:text-[#009ef7] disabled:opacity-30 text-[14px] leading-none"
                  data-testid={`age-${u.toLowerCase()}-inc`}
                >
                  +
                </button>
              </div>
            );
          })}
        </div>
        <Err msg={p.ageError} />
      </div>
      <div data-field="gender" className="shrink-0">
        <Label>Gender</Label>
        <div
          role="radiogroup"
          aria-label="Gender"
          className={`flex rounded-md border overflow-hidden ${p.genderError ? 'border-rose-400' : 'border-slate-300'}`}
          style={{ height: H }}
          data-testid="patient-gender"
        >
          {GENDERS.map((g, i) => {
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
                className={`w-7 text-[12px] font-bold ${i ? 'border-l border-slate-300' : ''} ${
                  on ? 'bg-[#009ef7] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                data-testid={`gender-${g.short.toLowerCase()}`}
                disabled={p.disabled}
              >
                {g.short}
              </button>
            );
          })}
        </div>
        <Err msg={p.genderError} />
      </div>
    </div>
  );
}
