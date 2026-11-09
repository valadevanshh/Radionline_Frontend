"use client";
import { useRef, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui';
import { resolveMediaUrl } from '@/lib/api-client';
import { readAsDataUrl, fileExt, downloadFile, openFileInNewTab } from '@/lib/doctor-profile';
import { type ProfileDocument, DOCUMENT_ACCEPT, DOCUMENT_TYPES, DOCUMENT_MAX_FILES, DOCUMENT_MAX_BYTES, DOCUMENT_BATCH_BYTES } from '@/lib/profile-documents';

interface Props {
  title: string; value: ProfileDocument[]; onChange?: (files: ProfileDocument[]) => void;
  disabled?: boolean; onBusyChange?: (busy: boolean) => void;
}
export default function ProfileDocuments({ title, value, onChange, disabled, onBusyChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pick = async (files: File[]) => {
    setError('');
    if (!files.length || busy || disabled) return;
    if (value.length + files.length > DOCUMENT_MAX_FILES) { setError(`You can attach up to ${DOCUMENT_MAX_FILES} documents.`); return; }
    if (files.some(file => !DOCUMENT_TYPES[fileExt(file.name)])) { setError('Choose PDF, DOC, DOCX, PNG, JPG or WEBP files.'); return; }
    if (files.some(file => !file.size || file.size > DOCUMENT_MAX_BYTES)) { setError('Each document must be non-empty and 5 MB or smaller.'); return; }
    const pendingBytes = value.filter(file => file.url.startsWith('data:')).reduce((sum,file) => sum + Math.ceil((file.url.split(',')[1]?.length || 0)*3/4), 0);
    if (pendingBytes + files.reduce((sum,file)=>sum+file.size,0) > DOCUMENT_BATCH_BYTES) { setError('New documents must total 15 MB or less per save.'); return; }
    setBusy(true); onBusyChange?.(true);
    try {
      const added = await Promise.all(files.map(async file => {
        const raw = await readAsDataUrl(file);
        return {fileName: file.name.slice(0,150), url: `data:${DOCUMENT_TYPES[fileExt(file.name)]};base64,${raw.slice(raw.indexOf(',')+1)}`};
      }));
      onChange?.([...value, ...added]);
    } catch { setError('Could not read these documents. Please try again.'); }
    finally { setBusy(false); onBusyChange?.(false); }
  };
  return <section className="space-y-2" data-testid={title === 'Certificates' ? 'doctor-certificates' : 'center-documents'}>
    <h3 className="text-[13px] font-bold text-slate-900">{title}</h3>
    {value.length ? <ul className="space-y-2">{value.map((file,index) => <li key={file.id || `${index}-${file.fileName}`} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
      <FileText className="h-4 w-4 shrink-0 text-sky-600" />
      <span className="min-w-0 flex-1 break-all text-xs font-semibold text-slate-800">{file.fileName}</span>
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="ghost" onClick={() => openFileInNewTab(resolveMediaUrl(file.url))} aria-label={`View ${file.fileName}`}>View</Button>
        <Button size="sm" variant="ghost" onClick={() => downloadFile(resolveMediaUrl(file.url),file.fileName)} aria-label={`Download ${file.fileName}`}>Download</Button>
        {onChange && <Button size="sm" variant="ghost" disabled={disabled || busy} onClick={() => {setError('');onChange(value.filter((_,i)=>i!==index));}} aria-label={`Remove ${file.fileName}`}>Remove</Button>}
      </div>
    </li>)}</ul> : <p className="text-xs text-slate-400">No documents uploaded.</p>}
    {onChange && <>
      <Button size="sm" variant="secondary" disabled={disabled || busy} onClick={()=>input.current?.click()}><Upload className="h-4 w-4" />{busy ? 'Reading files...' : 'Upload documents'}</Button>
      <input ref={input} type="file" multiple accept={DOCUMENT_ACCEPT} className="hidden" aria-label={`Upload ${title}`} disabled={disabled || busy} onChange={event=>{const files=Array.from(event.target.files || []);event.target.value='';void pick(files);}} />
      <p className="text-[11px] text-slate-500">Select multiple files. PDF, DOC, DOCX, PNG, JPG or WEBP; 5 MB each. Up to 20 documents, 15 MB of new files per save.</p>
    </>}
    {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
  </section>;
}
