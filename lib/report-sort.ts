/** Calendar study dates support the ISO and day-first formats stored by the API. */
function studyDateKey(value?: string | null): number {
  const text = value?.trim() || '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/.exec(text);
  const dayFirst = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(text);
  if (!iso && !dayFirst) return Number.NEGATIVE_INFINITY;
  const [year, month, day] = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : [Number(dayFirst![3]), Number(dayFirst![2]), Number(dayFirst![1])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.getTime() : Number.NEGATIVE_INFINITY;
}

/** Newest study first; uploads break same-day ties. Undated rows remain at the bottom. */
export function compareReportsByStudyDateDesc(
  a: { studyDate?: string | null; createdAt?: string | null },
  b: { studyDate?: string | null; createdAt?: string | null },
): number {
  const first = studyDateKey(a.studyDate);
  const second = studyDateKey(b.studyDate);
  if (first !== second) return first > second ? -1 : 1;
  const uploaded = (value?: string | null) => {
    const timestamp = Date.parse(value || '');
    return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
  };
  const aUpload = uploaded(a.createdAt);
  const bUpload = uploaded(b.createdAt);
  return aUpload === bUpload ? 0 : aUpload > bUpload ? -1 : 1;
}
