/**
 * One status vocabulary for every screen.
 * Aliases from the 6+ existing badge implementations collapse here so the
 * same case cannot read as "Completed" on one page and "Signed" on another.
 */

export type StatusKind =
  | 'pending'
  | 'in_review'
  | 'draft'
  | 'signed'
  | 'partial'
  | 'claimed'
  | 'unclaimed'
  | 'approved'
  | 'rejected'
  | 'paid'
  | 'overdue'
  | 'unknown';

export type PriorityKind = 'stat' | 'routine';

const STATUS_ALIASES: Record<string, StatusKind> = {
  pending: 'pending',
  'pending review': 'pending',
  'pending approval': 'pending',
  unassigned: 'pending',
  completed: 'signed',
  signed: 'signed',
  complete: 'signed',
  'in review': 'in_review',
  in_review: 'in_review',
  inreview: 'in_review',
  claimed: 'claimed',
  'in progress (claimed)': 'claimed',
  'in progress': 'in_review',
  unclaimed: 'unclaimed',
  draft: 'draft',
  partial: 'partial',
  'partially signed': 'partial',
  partially_signed: 'partial',
  'partially-signed': 'partial',
  'partial case': 'partial',
  'partially completed': 'partial',
  partially_completed: 'partial',
  approved: 'approved',
  rejected: 'rejected',
  paid: 'paid',
  overdue: 'overdue',
};

export const STATUS_LABEL: Record<StatusKind, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  draft: 'Draft',
  signed: 'Signed',
  partial: 'Partially Signed',
  claimed: 'Claimed',
  unclaimed: 'Unclaimed',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
  overdue: 'Overdue',
  unknown: 'Unknown',
};

export function normalizeStatus(raw?: string | null, isPartial?: boolean): StatusKind {
  if (isPartial) return 'partial';
  if (!raw) return 'unknown';
  const key = raw.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  return STATUS_ALIASES[key] ?? 'unknown';
}

export function statusLabel(raw?: string | null, isPartial?: boolean): string {
  const kind = normalizeStatus(raw, isPartial);
  if (kind === 'unknown' && raw) return raw;
  return STATUS_LABEL[kind];
}

export function normalizePriority(raw?: string | boolean | null): PriorityKind {
  if (raw === true) return 'stat';
  if (raw === false || raw == null) return 'routine';
  const key = String(raw).trim().toLowerCase();
  if (key === 'stat' || key === 'urgent' || key === 'stat urgent' || key === 'urgent stat') {
    return 'stat';
  }
  return 'routine';
}
