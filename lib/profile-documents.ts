export interface ProfileDocument { id?: string; url: string; fileName: string; }
export const DOCUMENT_MAX_FILES = 20;
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
export const DOCUMENT_BATCH_BYTES = 15 * 1024 * 1024;
export const DOCUMENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
};
export const DOCUMENT_ACCEPT = Object.keys(DOCUMENT_TYPES).map(ext => `.${ext}`).join(',');
