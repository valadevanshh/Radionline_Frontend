/** Explicit projection labels chosen on the upload form.

Image files are not views. Billing uses this list, not how many files were uploaded.
*/
export function explicitStudyViews(study: { viewList?: string[] | null; view?: string | null }): string[] {
  const list = Array.isArray(study.viewList)
    ? study.viewList.map((v) => String(v || '').trim()).filter(Boolean)
    : [];
  if (list.length) return list;
  const one = String(study.view || '').trim();
  return one ? [one] : [];
}
