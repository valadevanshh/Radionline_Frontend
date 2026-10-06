/** Typed mirror of app/design-tokens.css — use in JS/TS, not as a second palette. */

export const color = {
  primary: 'var(--rn-primary)',
  primaryHover: 'var(--rn-primary-hover)',
  primaryMuted: 'var(--rn-primary-muted)',
  surface: 'var(--rn-surface)',
  surfaceMuted: 'var(--rn-surface-muted)',
  bg: 'var(--rn-bg)',
  border: 'var(--rn-border)',
  text: 'var(--rn-text)',
  textSecondary: 'var(--rn-text-secondary)',
  textMuted: 'var(--rn-text-muted)',
  success: 'var(--rn-success)',
  successMuted: 'var(--rn-success-muted)',
  warning: 'var(--rn-warning)',
  warningMuted: 'var(--rn-warning-muted)',
  danger: 'var(--rn-danger)',
  dangerMuted: 'var(--rn-danger-muted)',
  info: 'var(--rn-info)',
  infoMuted: 'var(--rn-info-muted)',
} as const;

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
} as const;

export const type = {
  xs: 12,
  sm: 13,
  md: 14,
  base: 16,
  lg: 20,
  min: 12,
} as const;

export const radius = {
  control: 6,
  card: 10,
  modal: 14,
} as const;

export const layout = {
  pageHeaderHeight: 56,
  pagePadMobile: 16,
  pagePadDesktop: 24,
  formMaxWidth: 720,
  rowHeight: 44,
} as const;
