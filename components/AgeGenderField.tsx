'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * Age + gender controls for the X-Ray patient row (create and edit).
 * Age: one numeric input with a Y / M / D unit picker (a dot marks units that hold a value,
 * and a compound age such as "3M 5D" is summarised inline). Gender: M / F / O pills.
 * Edits the same years / months / days strings and gender value the form stores, so
 * age, ageUnit, ageYears/Months/Days and validation are unchanged.
 */
export type AgeGenderGender = 'Male' | 'Female' | 'Other';

export interface AgeGenderProps {
  ageY: string;
  ageM: string;
  ageD: string;
  setAgeY: (v: string) => void;
  setAgeM: (v: string) => void;
  setAgeD: (v: string) => void;
  gender: AgeGenderGender | '';
  setGender: (g: AgeGenderGender) => void;
  ageError?: string;
  genderError?: string;
  clearAgeError: () => void;
  clearGenderError: () => void;
  disabled?: boolean;
}

type Unit = 'Y' | 'M' | 'D';
const UNITS: Unit[] = ['Y', 'M', 'D'];
const UNIT_MAX: Record<Unit, number> = { Y: 150, M: 11, D: 31 };
const H = 36; // same height as the other compact inputs

const GENDERS: { value: AgeGenderGender; short: string; icon: string; on: string; ring: string }[] = [
  { value: 'Male', short: 'M', icon: '\u2642', on: 'bg-sky-500 text-white border-sky-500', ring: 'text-sky-600' },
  { value: 'Female', short: 'F', icon: '\u2640', on: 'bg-pink-500 text-white border-pink-500', ring: 'text-pink-600' },
  { value: 'Other', short: 'O', icon: '\u26a7', on: 'bg-violet-500 text-white border-violet-500', ring: 'text-violet-600' },
];

const digits = (v: string, u: Unit) => v.replace(/[^\d]/g, '').slice(0, u === 'Y' ? 3 : 2);

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-[11px] font-semibold text-slate-600 mb-1">
      {children} <span className="text-rose-500">*</span>
    </label>
  );
}

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-[11px] font-medium text-rose-600">{msg}</p> : null;
}

/** Arrow-key navigation for a radio group of buttons. */
function radioKeys(e: React.KeyboardEvent, current: number, pick: (i: number) => void) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    pick((current + 1 + GENDERS.length) % GENDERS.length);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    pick((current - 1 + GENDERS.length) % GENDERS.length);
  }
}

function summary(y: string, m: string, d: string): string {
  return [y && Number(y) ? `${Number(y)}Y` : '', m && Number(m) ? `${Number(m)}M` : '', d && Number(d) ? `${Number(d)}D` : '']
    .filter(Boolean)
    .join(' ');
}

export default function AgeGenderField(p: AgeGenderProps) {
  const vals: Record<Unit, string> = { Y: p.ageY, M: p.ageM, D: p.ageD };
  const setters: Record<Unit, (v: string) => void> = { Y: p.setAgeY, M: p.setAgeM, D: p.setAgeD };
  const has = (v: string) => Number(v) > 0; // '0' counts as empty
  const firstUnit: Unit = has(p.ageY) ? 'Y' : has(p.ageM) ? 'M' : has(p.ageD) ? 'D' : 'Y';
  const [unit, setUnit] = useState<Unit>(firstUnit);
  const picked = useRef(false); // true once the user chooses a unit themselves
  const extKey = `${p.ageY}|${p.ageM}|${p.ageD}`;
  useEffect(() => {
    // Form cleared -> back to years; values loaded (e.g. edit) -> show the first filled unit.
    if (!has(p.ageY) && !has(p.ageM) && !has(p.ageD)) {
      picked.current = false;
      setUnit('Y');
    } else if (!picked.current && !has(vals[unit])) setUnit(firstUnit);
  }, [extKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPart = (u: Unit, v: string) => {
    setters[u](digits(v, u));
    if (p.ageError) p.clearAgeError();
  };
  const pickGender = (g: AgeGenderGender) => {
    p.setGender(g);
    if (p.genderError) p.clearGenderError();
  };
  const gIdx = Math.max(0, GENDERS.findIndex((g) => g.value === p.gender));
  const border = (err?: string) => (err ? 'border-rose-400' : 'border-slate-300');
  const multi = summary(p.ageY, p.ageM, p.ageD).split(' ').filter(Boolean).length > 1;

  return (
    <div className="flex gap-2 items-start" data-testid="agegender">
      <div data-field="age" className="flex-1 min-w-0">
        <Label htmlFor="up-age">Age</Label>
        <div
          className={`flex items-center rounded-lg border bg-white focus-within:border-[#009ef7] focus-within:ring-2 focus-within:ring-sky-100 ${border(p.ageError)}`}
          style={{ height: H }}
        >
          <input
            id="up-age"
            inputMode="numeric"
            autoComplete="off"
            value={vals[unit]}
            onChange={(e) => setPart(unit, e.target.value)}
            placeholder="0"
            aria-label={`Age in ${unit === 'Y' ? 'years' : unit === 'M' ? 'months' : 'days'}`}
            className="w-10 min-w-0 flex-1 h-full bg-transparent pl-2.5 pr-1 text-[14px] outline-none"
            data-testid="patient-age"
            disabled={p.disabled}
          />
          {multi && (
            <span className="text-[10px] font-semibold text-slate-500 mr-1 whitespace-nowrap" data-testid="age-summary">
              {summary(p.ageY, p.ageM, p.ageD)}
            </span>
          )}
          <div role="radiogroup" aria-label="Age unit" className="flex gap-0.5 p-0.5 mr-0.5 rounded-md bg-slate-100">
            {UNITS.map((u) => (
              <button
                key={u}
                type="button"
                role="radio"
                aria-checked={unit === u}
                title={`${u === 'Y' ? 'Years' : u === 'M' ? 'Months' : 'Days'}${vals[u] ? `: ${vals[u]}` : ''}`}
                onClick={() => {
                picked.current = true;
                setUnit(u);
              }}
                className={`relative w-7 h-[26px] rounded text-[11px] font-bold transition-colors ${
                  unit === u ? 'bg-white text-[#009ef7] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
                disabled={p.disabled}
              >
                {u}
                {has(vals[u]) && unit !== u ? <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#009ef7]" /> : null}
              </button>
            ))}
          </div>
        </div>
        <Err msg={p.ageError} />
      </div>
      <div data-field="gender" className="shrink-0">
        <Label>Gender</Label>
        <div role="radiogroup" aria-label="Gender" className="flex gap-1" data-testid="patient-gender">
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
                tabIndex={i === gIdx ? 0 : -1}
                onKeyDown={(e) => radioKeys(e, i, (j) => pickGender(GENDERS[j].value))}
                onClick={() => pickGender(g.value)}
                className={`inline-flex items-center gap-1 px-2.5 rounded-full border text-[12px] font-semibold transition-colors ${
                  on ? g.on : `bg-white border-slate-300 text-slate-600 hover:border-slate-400 ${p.genderError ? 'border-rose-400' : ''}`
                }`}
                style={{ height: H }}
                data-testid={`gender-${g.short.toLowerCase()}`}
                disabled={p.disabled}
              >
                <span className={`text-[14px] leading-none ${on ? '' : g.ring}`}>{g.icon}</span>
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
