/** Short age for lists, titles and headers. */
export type AgeLike = {
  age?: number | string | null;
  ageUnit?: string | null;
  ageYears?: number | string | null;
  ageMonths?: number | string | null;
  ageDays?: number | string | null;
};

const int = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));

/**
 * Compound when the stored Y/M/D parts are present and agree with age + unit ("3M 5D", "45Y", "1Y 2M"),
 * else age + unit ("3m", "45y", "12d"). Empty string when there is no age.
 */
export function formatAgeShort(r?: AgeLike | null): string {
  if (!r) return '';
  const hasAge = r.age !== null && r.age !== undefined && r.age !== '' && !Number.isNaN(Number(r.age));
  const u = String(r.ageUnit || 'Years').trim().charAt(0).toLowerCase();
  const unit = u === 'm' ? 'm' : u === 'd' ? 'd' : 'y';
  if (r.ageYears != null || r.ageMonths != null || r.ageDays != null) {
    const y = int(r.ageYears);
    const m = int(r.ageMonths);
    const d = int(r.ageDays);
    const lead: [number, string] = y > 0 ? [y, 'y'] : m > 0 ? [m, 'm'] : d > 0 ? [d, 'd'] : [0, 'y'];
    if (y + m + d > 0 && (!hasAge || (lead[0] === int(r.age) && lead[1] === unit))) {
      return [y ? `${y}Y` : '', m ? `${m}M` : '', d ? `${d}D` : ''].filter(Boolean).join(' ');
    }
  }
  return hasAge ? `${int(r.age)}${unit}` : '';
}