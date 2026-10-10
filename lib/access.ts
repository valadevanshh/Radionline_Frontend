'use client';

import { useEffect, useState } from 'react';
import { RadiologyStore, UserAccount, XRayReport, CenterPageLevel } from './radiology-store';

export type CenterPage = 'reports' | 'invoices' | 'templates' | 'center_info';

const RANK: Record<CenterPageLevel, number> = { none: 0, read: 1, write: 2 };

/** The stored session, kept in sync with login / refresh events. */
export function useSession(): UserAccount | null {
  const [session, setSession] = useState<UserAccount | null>(null);
  useEffect(() => {
    setSession(RadiologyStore.getSession());
    const onChange = () => setSession(RadiologyStore.getSession());
    window.addEventListener('radionline_session_changed', onChange);
    return () => window.removeEventListener('radionline_session_changed', onChange);
  }, []);
  return session;
}

/** Show the Diagnostic Center column / filter only when the user works with more than one centre.
 *  Unknown (old session without the flag) -> keep showing it. */
export function showCenterColumn(session: UserAccount | null | undefined): boolean {
  if (!session) return false;
  if (typeof session.multiCenter === 'boolean') return session.multiCenter;
  return session.role !== 'CENTER';
}

/** Centre login: level on a page for one centre (or the best level over all centres). */
export function centerLevel(session: UserAccount | null | undefined, page: CenterPage, centerId?: string): CenterPageLevel {
  if (!session || session.role !== 'CENTER') return 'none';
  const centers = session.centers;
  if (!centers || centers.length === 0) {
    // Session from before multi-centre support: primary centre with full rights
    if (!centerId || centerId === session.centerId) return session.centerId ? 'write' : 'none';
    return 'none';
  }
  if (centerId) {
    const c = centers.find((x) => x.centerId === centerId);
    return (c?.permissions?.[page] as CenterPageLevel) || 'none';
  }
  let best: CenterPageLevel = 'none';
  for (const c of centers) {
    const lv = (c.permissions?.[page] as CenterPageLevel) || 'none';
    if (RANK[lv] > RANK[best]) best = lv;
  }
  return best;
}

export function hasCenterLevel(session: UserAccount | null | undefined, page: CenterPage, level: CenterPageLevel, centerId?: string) {
  return RANK[centerLevel(session, page, centerId)] >= RANK[level];
}

/** Centres where a centre login has at least `level` on `page`. */
export function centerIdsWith(session: UserAccount | null | undefined, page: CenterPage, level: CenterPageLevel): string[] {
  if (!session || session.role !== 'CENTER') return [];
  if (!session.centers || session.centers.length === 0) return session.centerId ? [session.centerId] : [];
  return session.centers.filter((c) => RANK[(c.permissions?.[page] as CenterPageLevel) || 'none'] >= RANK[level]).map((c) => c.centerId);
}

/** "Upload Image" button: Super Admin, Manager (goes to approval), centre login with Reports = write somewhere. */
export function canUploadCase(session: UserAccount | null | undefined): boolean {
  if (!session) return false;
  if (session.role === 'SUPER_ADMIN' || session.role === 'MANAGER') return true;
  if (session.role === 'CENTER') return hasCenterLevel(session, 'reports', 'write');
  return false;
}

/** Row Edit: Super Admin, Manager (approval), centre login with Reports = write on the case's centre. */
export function canEditCase(session: UserAccount | null | undefined, report: Pick<XRayReport, 'radiologyCenterId'>): boolean {
  if (!session) return false;
  if (session.role === 'SUPER_ADMIN' || session.role === 'MANAGER') return true;
  if (session.role === 'CENTER') return hasCenterLevel(session, 'reports', 'write', report.radiologyCenterId);
  return false;
}

/** Delete: only Super Admin and Manager (Manager's delete waits for Super Admin approval). */
export function canDeleteRecords(session: UserAccount | null | undefined): boolean {
  return session?.role === 'SUPER_ADMIN' || session?.role === 'MANAGER';
}

/** Templates: create / edit — strictly limited to doctors only. */
export function canWriteTemplates(session: UserAccount | null | undefined): boolean {
  if (!session) return false;
  return session.role === 'DOCTOR';
}

/** Refresh the stored session from /auth/me (centre links / permissions may have changed). */
export async function refreshSession(fetchMe: () => Promise<UserAccount>): Promise<void> {
  try {
    const me = await fetchMe();
    const cur = RadiologyStore.getSession();
    if (!me || !cur || me.email?.toLowerCase() !== cur.email?.toLowerCase()) return;
    const next = { ...cur, ...me };
    if (JSON.stringify(next) !== JSON.stringify(cur)) RadiologyStore.setSession(next);
  } catch {
    /* offline / old API: keep the stored session */
  }
}
