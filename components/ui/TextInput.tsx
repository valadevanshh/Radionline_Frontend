'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
    { leftIcon, rightIcon, className, type = 'text', ...props },
    ref
  ) {
    return (
      <div className="relative w-full">
        {leftIcon && (
          <span className="rn-icon-vcenter pointer-events-none absolute left-0 top-0 z-10 flex h-9 w-9 items-center justify-center text-[var(--rn-text-muted)]">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'rn-text-input',
            Boolean(leftIcon) && 'rn-text-input--left',
            Boolean(rightIcon) && 'rn-text-input--right',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <span className="rn-icon-vcenter absolute right-0 top-0 z-10 flex h-9 w-9 items-center justify-center text-[var(--rn-text-muted)]">
            {rightIcon}
          </span>
        )}
      </div>
    );
  }
);
