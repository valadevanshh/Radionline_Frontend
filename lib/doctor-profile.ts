/** Shared helpers for the doctor profile (My Profile) and the Doctors directory. */

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_ACCEPT = 'image/png,image/jpeg,image/webp';

export const CV_MAX_BYTES = 5 * 1024 * 1024;
export const CV_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
export const CV_ACCEPT = `.pdf,.doc,.docx,${Object.values(CV_TYPES).join(',')}`;

export const MAX_EXPERTISE_TAGS = 20;
export const MAX_EXPERTISE_TAG_LEN = 40;
export const MAX_YEARS_OF_EXPERIENCE = 70;

export const EXPERTISE_SUGGESTIONS = [
  'Neuro',
  'MSK',
  'Chest',
  'Abdomen',
  'Cardiac',
  'Breast',
  'Head & Neck',
  'Paediatric',
  'Oncology',
  'Emergency',
  'Interventional',
];

/** "Dr Rahul Shah" -> "RS", "Dr Shah" -> "S". */
export function doctorInitials(name?: string | null): string {
  const clean = (name || '').replace(/^\s*dr\.?\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'D';
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

export function experienceLabel(years?: number | null): string {
  if (years === null || years === undefined || Number.isNaN(years)) return 'Experience not set';
  if (years === 0) return 'Less than 1 year';
  return `${years} ${years === 1 ? 'year' : 'years'} experience`;
}

/** Extension of a file name, lower case, without the dot. */
export function fileExt(name?: string | null): string {
  const m = (name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

export function isPdfName(name?: string | null): boolean {
  return fileExt(name) === 'pdf';
}

/** Normalise a tag the same way the server does. */
export function cleanTag(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body = ''] = dataUrl.split(',', 2);
  const mime = head.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Open a stored file (or a not-yet-saved data: URL) in a new tab. */
export function openFileInNewTab(url: string): void {
  if (!url) return;
  if (url.startsWith('data:')) {
    const href = URL.createObjectURL(dataUrlToBlob(url));
    window.open(href, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(href), 60_000);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Download a stored file under a friendly name (falls back to opening it). */
export async function downloadFile(url: string, fileName: string): Promise<void> {
  if (!url) return;
  try {
    const blob = url.startsWith('data:')
      ? dataUrlToBlob(url)
      : await fetch(url).then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return res.blob();
        });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10_000);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
