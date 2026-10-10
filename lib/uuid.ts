/**
 * Generates an RFC-4122 compliant v4 UUID.
 * Example: "8f3b2a1c-9d4e-4f5a-8b3c-1d2e3f4a5b6c"
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Checks whether a given string matches the standard 36-character v4 UUID pattern.
 */
export function isUUID(input?: string | null): boolean {
  if (!input) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.trim());
}

/**
 * Returns a clean, human-readable display string for patient number/ID.
 * If the value is missing, empty, or a raw UUID, returns null so raw UUIDs are not rendered in the UI.
 */
export function formatPatientDisplayId(patientNumber?: string | null): string | null {
  if (!patientNumber) return null;
  const trimmed = patientNumber.trim();
  if (!trimmed || isUUID(trimmed)) return null;
  return trimmed;
}

/**
 * Ensures an ID or patient number is formatted as a valid 36-character v4 UUID string.
 * If the input is already a valid UUID, returns it as-is.
 * If the input is a legacy format (e.g. PAT-1677, doc-1, center-1, rep-1789410856579),
 * converts it deterministically into a clean UUID string.
 */
export function formatAsUUID(input?: string | null): string {
  if (!input) return generateUUID();
  const trimmed = input.trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(12, '0');
  const p1 = hex.slice(0, 8);
  const p2 = hex.slice(0, 4);
  const p3 = '4' + hex.slice(4, 7);
  const p4 = 'a' + hex.slice(7, 10);
  const p5 = hex.slice(0, 12);
  return `${p1}-${p2}-${p3}-${p4}-${p5}`.toLowerCase();
}
