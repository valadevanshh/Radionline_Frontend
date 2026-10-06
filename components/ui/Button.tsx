'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-transparent text-[#009ef7] border-[1.5px] border-[#009ef7] hover:bg-[#009ef7] hover:text-white shadow-[0_2px_8px_rgba(0,158,247,0.12)] hover:shadow-[0_4px_16px_rgba(0,158,247,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95',
  secondary:
    'bg-transparent text-slate-700 border-[1.5px] border-slate-300 hover:bg-slate-100 hover:border-slate-400 hover:text-slate-900 hover:-translate-y-0.5 active:translate-y-0 active:scale-95',
  ghost:
    'bg-transparent text-slate-600 border-[1.5px] border-transparent hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 active:scale-95',
  danger:
    'bg-transparent text-rose-600 border-[1.5px] border-rose-500 hover:bg-rose-600 hover:text-white shadow-[0_2px_8px_rgba(225,29,72,0.12)] hover:shadow-[0_4px_16px_rgba(225,29,72,0.35)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[12px] rounded-lg',
  md: 'h-9.5 px-4 text-[13px] rounded-xl',
  lg: 'h-11 px-5 text-[14px] rounded-xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'rn-btn inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap select-none cursor-pointer transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#009ef7]/40',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
