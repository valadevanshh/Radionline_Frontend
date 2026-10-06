/** Shared date formatters. Canonical: DD-MM-YYYY and DD-MM-YYYY HH:mm. */

function parseDate(input?: string | number | Date | null): Date | null {
  if (input == null || input === '') return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;

  const str = String(input).trim();
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(str)) {
    const [dd, mm, yyyy] = str.split(/[-/]/).map(Number);
    const d = new Date(yyyy, mm - 1, dd);
    return isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const [datePart, timePart] = str.split('T');
    const [yyyy, mm, dd] = datePart.split('-').map(Number);
    if (timePart) {
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(yyyy, mm - 1, dd);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function formatDate(input?: string | number | Date | null): string {
  const d = parseDate(input);
  if (!d) return '';
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

export function formatDateTime(input?: string | number | Date | null): string {
  const d = parseDate(input);
  if (!d) return '';
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
