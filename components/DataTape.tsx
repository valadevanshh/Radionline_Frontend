'use client';

import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, Clock, AlertTriangle, Users } from 'lucide-react';

export interface Metric {
  label: string;
  value: string;
  delta?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'navy' | 'teal' | 'amber' | 'red' | 'blue';
  sparkline?: number[];
}

const COLOR_MAP = {
  navy:  { dot: '#009ef7', border: 'border-[#009ef7]/30', bg: 'bg-[#009ef7]/10', text: 'text-[#009ef7]', badge: 'bg-[#009ef7]/10 text-[#009ef7] border border-[#009ef7]/30' },
  teal:  { dot: '#10b981', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-600', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  amber: { dot: '#f59e0b', border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-600', badge: 'bg-amber-50 text-amber-800 border border-amber-200' },
  red:   { dot: '#ef4444', border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-600', badge: 'bg-rose-50 text-rose-700 border border-rose-200' },
  blue:  { dot: '#6366f1', border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', text: 'text-indigo-600', badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
};

const ICON_MAP = {
  'TOTAL CASES': Activity,
  'COMPLETED': CheckCircle2,
  'PENDING REVIEW': Clock,
  'STAT URGENT': AlertTriangle,
  'RADIOLOGISTS': Users,
};

export function DataTape({ metrics }: { metrics: Metric[] }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-white border-b border-slate-200 p-2.5 sm:p-3 shrink-0">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 max-w-7xl mx-auto">
        {metrics.map((m) => {
          const c = COLOR_MAP[m.color ?? 'navy'];
          const IconComp = ICON_MAP[m.label as keyof typeof ICON_MAP] || Activity;

          return (
            <div
              key={m.label}
              className="relative bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200 rounded-xl p-2.5 transition-all duration-200 shadow-2xs flex flex-col justify-between gap-1"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono truncate">
                  {m.label}
                </span>
                <div className={`p-1 rounded-md ${c.bg} ${c.text}`}>
                  <IconComp className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex items-baseline justify-between gap-2 mt-0.5">
                <span className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono tracking-tight">
                  {m.value}
                </span>
                {m.delta && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${c.badge}`}>
                    {m.delta}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DataTape;
