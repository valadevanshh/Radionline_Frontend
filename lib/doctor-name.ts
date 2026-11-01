/**
 * t86: doctor / referrer names. "Dr" is a title the app adds, never part of the typed name.
 * stripDr("Dr. Dr.JAYESH") -> "JAYESH"; withDr("dr jayesh") -> "Dr. jayesh"; withDr(x, true) -> "DR. X".
 * cleanDr collapses repeated prefixes and keeps at most one ("DR. DR. X" -> "DR. X").
 */
const DR_PREFIX = /^\s*(?:(?:dr|doctor)(?:\s*\.\s*|\s+))+(?=\S)/i;

export function stripDr(name: string | null | undefined): string {
  const s = String(name || '').trim();
  return s.replace(DR_PREFIX, '').trim() || s;
}

export function hasDrPrefix(name: string | null | undefined): boolean {
  return DR_PREFIX.test(String(name || ''));
}

export function withDr(name: string | null | undefined, upper = false): string {
  const base = stripDr(name);
  if (!base) return '';
  return upper ? `DR. ${base.toUpperCase()}` : `Dr. ${base}`;
}

export function cleanDr(name: string | null | undefined): string {
  const s = String(name || '').trim();
  if (!s) return s;
  const m = s.match(DR_PREFIX);
  if (!m) return s;
  const title = /^\s*DR/.test(s) ? 'DR.' : 'Dr.';
  return `${title} ${s.slice(m[0].length).trim()}`;
}

/** Shown under name inputs when the user typed a Dr prefix. */
export const DR_HINT = "No need to type 'Dr.' - it is added automatically.";
