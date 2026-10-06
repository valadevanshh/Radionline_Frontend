'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

type ToastListener = (item: Omit<ToastItem, 'id'>) => void;

const listeners = new Set<ToastListener>();

function emit(kind: ToastKind, message: string) {
  listeners.forEach((fn) => fn({ kind, message }));
}

/** Non-blocking notifications. Requires <ToastProvider> in the tree. */
export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message),
  warning: (message: string) => emit('warning', message),
  info: (message: string) => emit('info', message),
};

const kindClass: Record<ToastKind, string> = {
  success: 'bg-[var(--rn-success)] text-[var(--rn-success-foreground)]',
  error: 'bg-[var(--rn-danger)] text-[var(--rn-danger-foreground)]',
  warning: 'bg-[var(--rn-warning)] text-[var(--rn-warning-foreground)]',
  info: 'bg-[var(--rn-info)] text-[var(--rn-info-foreground)]',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { ...item, id }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  useEffect(() => {
    listeners.add(push);
    return () => {
      listeners.delete(push);
    };
  }, [push]);

  return (
    <>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 flex w-[min(360px,calc(100vw-32px))] flex-col gap-2"
        style={{ zIndex: 'var(--rn-z-toast)' }}
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto rounded-[var(--rn-radius-card)] px-3 py-2.5 text-[13px] font-medium shadow-[var(--rn-shadow-md)]',
              kindClass[item.kind]
            )}
          >
            {item.message}
          </div>
        ))}
      </div>
    </>
  );
}
