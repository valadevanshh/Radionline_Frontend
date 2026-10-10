'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Building,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Activity,
  HeartPulse,
  X,
  BookmarkPlus,
  Shield,
  Stethoscope,
  Radio,
  Bell,
  Check,
  Receipt,
  Wallet,
  Briefcase,
  Menu,
  UserCircle,
  UserCog,
} from 'lucide-react';
import { RadiologyStore, UserAccount, XRayReport } from '@/lib/radiology-store';
import { hasCenterLevel } from '@/lib/access';
import { ApiClient, getAccessToken, WS_BASE_URL, apiErrorMessage, UserNotification } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatPatientDisplayId } from '@/lib/uuid';

// Number of nav items shown directly in the mobile bottom bar. The rest go in the "More" sheet.
const MOBILE_TAB_COUNT = 4;

// Live-update timing
const DOCTOR_NEW_TASK_TOAST_MS = 3000; // a new task notice for doctors shows for exactly 3 seconds
const FALLBACK_POLL_MS = 10000; // doctors re-check the list this often while the live socket is down

// True when a case is still open for this doctor to accept (same rule as the doctor notification list).
const isReportOpenForDoctor = (r: XRayReport, s: UserAccount | null) => {
  if (r.claimStatus === 'CLAIMED') return false;
  const docId = s?.doctorId || 'doc-1';
  return (
    !r.assignedDoctorIds ||
    r.assignedDoctorIds.includes('ALL') ||
    r.assignedDoctorIds.includes(docId) ||
    r.assignedDoctorId === docId ||
    r.assignedDoctorId === 'ALL'
  );
};

// Styles for the mobile overlays: "More" sheet (slides up) and Notifications panel (drops down).
// Animations are disabled for reduced motion; overlays never show above the mobile breakpoint.
const MOBILE_OVERLAY_CSS = `
@keyframes rn-more-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes rn-more-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes rn-notif-drop { from { transform: translateY(-24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.rn-more-sheet { animation: rn-more-slide-up 0.26s cubic-bezier(0.22, 1, 0.36, 1); }
.rn-more-backdrop { animation: rn-more-fade-in 0.2s ease-out; }
.rn-notif-panel { animation: rn-notif-drop 0.24s cubic-bezier(0.22, 1, 0.36, 1); }
@media (prefers-reduced-motion: reduce) {
  .rn-more-sheet, .rn-more-backdrop, .rn-notif-panel { animation: none; }
}
@media (min-width: 769px) {
  .rn-more-root, .rn-notif-root { display: none !important; }
}
.rn-mobile-toast { display: none; }
@media (max-width: 768px) {
  .rn-mobile-toast { display: flex; }
}
`;

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [session, setSession] = useState<UserAccount | null>(null);

  useEffect(() => {
    setSession(RadiologyStore.getSession());
    const handleSessionChange = () => setSession(RadiologyStore.getSession());
    window.addEventListener('radionline_session_changed', handleSessionChange);
    return () => window.removeEventListener('radionline_session_changed', handleSessionChange);
  }, []);

  // 'PACS Studio' is no longer a menu item: the viewer opens from a patient row (PACS button).
  // /dashboard/dicom-viewer stays as a redirect for old links.
  const getNavItems = () => {
    switch (session?.role) {
      case 'MANAGER':
        return [
          { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/dashboard/all-reports', label: 'All Reports', icon: FileText },
          { href: '/dashboard/doctors', label: 'Doctors', icon: Users },
          { href: '/dashboard/radiology', label: 'Centers', icon: Building },
          { href: '/dashboard/approvals', label: 'My Submissions', icon: Shield },
        ];
      case 'DOCTOR':
        return [
          { href: '/dashboard/live-feed', label: 'Live Dashboard', icon: Radio, isLive: true },
          { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
          { href: '/dashboard/my-work', label: 'My Work', icon: Briefcase },
          { href: '/dashboard/all-reports', label: 'All Reports', icon: FileText },
          { href: '/dashboard/doctor-earnings', label: 'Earnings', icon: Wallet },
          { href: '/dashboard/document-editor', label: 'Templates', icon: BookmarkPlus },
          { href: '/dashboard/doctors', label: 'Doctors', icon: Users },
          { href: '/dashboard/profile', label: 'My Profile', icon: UserCircle },
        ];
      case 'CENTER': {
        // Pages follow the login's per-centre permissions (best level over its centres)
        const items: Array<{ href: string; label: string; icon: typeof FileText; isLive?: boolean }> = [];
        if (hasCenterLevel(session, 'reports', 'read')) {
          items.push({ href: '/dashboard', label: 'Overview', icon: LayoutDashboard });
          items.push({ href: '/dashboard/all-reports', label: 'All Reports', icon: FileText });
        }
        if (hasCenterLevel(session, 'invoices', 'read')) items.push({ href: '/dashboard/center-invoices', label: 'Invoices', icon: Receipt });
        if (hasCenterLevel(session, 'center_info', 'read')) items.push({ href: '/dashboard/center-info', label: 'Center Info', icon: Building });
        if (session?.canManageCenterUsers) items.push({ href: '/dashboard/center-users', label: 'Users', icon: UserCog });
        return items;
      }
      case 'SUPER_ADMIN':
      default:
        return [
          { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/dashboard/approvals', label: 'Pending Approvals', icon: Shield },
          { href: '/dashboard/all-reports', label: 'All Reports', icon: FileText },
          { href: '/dashboard/invoices', label: 'Invoices', icon: Receipt },
          { href: '/dashboard/doctors', label: 'Doctors', icon: Users },
          { href: '/dashboard/radiology', label: 'Centers', icon: Building },
          { href: '/dashboard/center-users', label: 'Center Users', icon: UserCog },
        ];
    }
  };

  const navItems = getNavItems();
  const isWorkspaceRoute = pathname?.startsWith('/dashboard/workspace');

  // Mobile bottom bar: first MOBILE_TAB_COUNT items in the bar, every other page in the "More" sheet
  const isNavItemActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && !!pathname?.startsWith(href));
  const mobileTabItems = navItems.slice(0, MOBILE_TAB_COUNT);
  const mobileMoreItems = navItems.slice(MOBILE_TAB_COUNT);
  const isMoreRouteActive = mobileMoreItems.some((item) => isNavItemActive(item.href));

  const [moreOpen, setMoreOpen] = useState(false);
  const moreCloseRef = useRef<HTMLButtonElement>(null);

  // Mobile notifications panel (opened from the bell in the mobile top bar)
  const [mobileNotifOpen, setMobileNotifOpen] = useState(false);
  const notifCloseRef = useRef<HTMLButtonElement>(null);

  // Close the mobile overlays on navigation
  useEffect(() => {
    setMoreOpen(false);
    setMobileNotifOpen(false);
  }, [pathname]);

  // While a mobile overlay is open: lock body scroll, close on Esc, close if the screen becomes desktop-wide
  useEffect(() => {
    if (!moreOpen && !mobileNotifOpen) return;
    const closeOverlays = () => {
      setMoreOpen(false);
      setMobileNotifOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeOverlays();
    };
    const desktopQuery = window.matchMedia('(min-width: 769px)');
    const onViewportChange = () => {
      if (desktopQuery.matches) closeOverlays();
    };
    window.addEventListener('keydown', onKeyDown);
    desktopQuery.addEventListener('change', onViewportChange);
    (mobileNotifOpen ? notifCloseRef : moreCloseRef).current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      desktopQuery.removeEventListener('change', onViewportChange);
    };
  }, [moreOpen, mobileNotifOpen]);

  const [logoutGuard, setLogoutGuard] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  // Set after an Accept while another case is open in the viewer: ask before leaving that case
  const [openAcceptedGuard, setOpenAcceptedGuard] = useState<{ id: string; name: string } | null>(null);

  const doLogout = () => {
    ApiClient.logout();
    RadiologyStore.logout();
    onCloseMobile?.();
    router.push('/login');
  };

  const handleLogout = async () => {
    try {
      const session = RadiologyStore.getSession();
      const role = session?.role;
      if (role === 'DOCTOR') {
        const partial = await ApiClient.getMyPartialCases();
        if (partial?.total > 0) {
          const first = partial.items[0];
          const msg = first
            ? `${first.pendingStudyCount} of ${first.studyCount} reports for ${first.patientName} ${first.pendingStudyCount === 1 ? 'is' : 'are'} still pending. Log out anyway?`
            : `You have ${partial.total} case(s) with unfinished study reports. Log out anyway?`;
          setLogoutGuard({ open: true, message: msg });
          return;
        }
      }
    } catch (e) {
      console.warn('partial-cases check failed', e);
    }
    doLogout();
  };

  const handleMoreSignOut = () => {
    setMoreOpen(false);
    handleLogout();
  };

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifContainerRef = useRef<HTMLDivElement>(null);

  // Close notifications popover (and collapse sidebar if open) when clicking anywhere outside
  useEffect(() => {
    if (!notificationsOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (notifContainerRef.current && !notifContainerRef.current.contains(target)) {
        setNotificationsOpen(false);
        if (!collapsed) {
          onToggleCollapse();
        }
        if (mobileOpen) {
          onCloseMobile?.();
        }
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
        if (!collapsed) {
          onToggleCollapse();
        }
        if (mobileOpen) {
          onCloseMobile?.();
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        const target = event.target as HTMLElement | null;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
          return;
        }
        event.preventDefault();
        onToggleCollapse();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [notificationsOpen, collapsed, onToggleCollapse, mobileOpen, onCloseMobile]);
  const [liveReports, setLiveReports] = useState<XRayReport[]>([]);
  const [rejectedIds, setRejectedIds] = useState<string[]>([]);
  const [toastNotice, setToastNotice] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);
  const [toastDurationMs, setToastDurationMs] = useState(DOCTOR_NEW_TASK_TOAST_MS);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastReportIdRef = useRef<string | null>(null);

  // One toast at a time: a newer toast replaces the current one and restarts its timer.
  // Hiding a toast never dismisses or declines the case; it stays in the bell list.
  const hideToast = () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = null;
    toastReportIdRef.current = null;
    setToastNotice(null);
  };

  const showToast = (message: string, durationMs: number, reportId: string | null = null) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastReportIdRef.current = reportId;
    setToastNotice(message);
    setToastDurationMs(durationMs);
    setToastKey((k) => k + 1);
    toastTimerRef.current = setTimeout(() => {
      toastTimerRef.current = null;
      toastReportIdRef.current = null;
      setToastNotice(null);
    }, durationMs);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const loadBackendReports = async () => {
    try {
      const data = await ApiClient.getReports();
      setLiveReports(data);
    } catch {
      setLiveReports(RadiologyStore.getReports());
    }
  };

  // Per-user bell notifications (case reassigned to me, new Case Activity message)
  const [userNotifs, setUserNotifs] = useState<UserNotification[]>([]);
  const loadUserNotifs = async () => {
    try {
      const data = await ApiClient.getMyNotifications();
      setUserNotifs(Array.isArray(data?.items) ? data.items : []);
    } catch {
      // keep the current list; the bell still shows the case list
    }
  };

  useEffect(() => {
    loadBackendReports();
    loadUserNotifs();

    const handleReportsChange = () => loadBackendReports();
    window.addEventListener('radionline_reports_changed', handleReportsChange);

    // Live WebSocket connection for notifications
    let ws: WebSocket | null = null;
    try {
      const token = getAccessToken();
      const baseUrl = WS_BASE_URL;
      const wsUrl = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'USER_NOTIFICATION' && payload.notification) {
            // Sent only to this user's sockets by the server
            const n: UserNotification = payload.notification;
            setUserNotifs((prev) => [n, ...prev.filter((x) => x.id !== n.id)].slice(0, 50));
            showToast(`\u{1F514} ${n.title}`, 4000);
            return;
          }
          if (payload.type === 'NEW_REPORT' || payload.type === 'REPORT_COMPLETED' || payload.type === 'REPORT_CLAIMED' || payload.type === 'REPORT_REJECTED') {
            // A case accepted by any doctor leaves every other doctor's notifications at once
            // (marked claimed locally; the refetch below then drops it from their list).
            if (payload.type === 'REPORT_CLAIMED') {
              const claimedId: string | undefined = payload.reportId || payload.report?.id;
              if (claimedId) {
                setLiveReports((prev) =>
                  prev.map((r) =>
                    r.id === claimedId
                      ? {
                          ...r,
                          claimStatus: 'CLAIMED',
                          claimedByDoctorId: payload.claimedByDoctorId ?? r.claimedByDoctorId,
                          claimedByDoctorName: payload.claimedByDoctorName ?? r.claimedByDoctorName,
                        }
                      : r
                  )
                );
                if (toastReportIdRef.current === claimedId) hideToast();
              }
            }
            loadBackendReports();
            if (payload.report) {
              const updateText = `\u{1F514} Update: ${payload.report.fullName || 'Report'}`;
              const current = RadiologyStore.getSession();
              if (current?.role === 'DOCTOR') {
                // Doctors: a new task open to them shows for 3 seconds (the Live Dashboard page shows
                // its own banner, so skip it there). Claims by other doctors show no toast.
                if (payload.type === 'NEW_REPORT') {
                  const onLiveFeed = window.location.pathname.startsWith('/dashboard/live-feed');
                  if (!onLiveFeed && isReportOpenForDoctor(payload.report as XRayReport, current)) {
                    showToast(updateText, DOCTOR_NEW_TASK_TOAST_MS, payload.report.id || null);
                  }
                } else if (payload.type !== 'REPORT_CLAIMED') {
                  showToast(updateText, 4000);
                }
              } else {
                showToast(updateText, 4000);
              }
            }
          }
        } catch (e) {
          console.warn('Sidebar WS parse error:', e);
        }
      };
    } catch (err) {
      console.warn('Sidebar WS error:', err);
    }

    // Fallback for doctors if the live socket is down: refresh every FALLBACK_POLL_MS while the tab
    // is visible, and refresh whenever the tab becomes visible again.
    const pollTimer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const socketDown = !ws || ws.readyState !== WebSocket.OPEN;
      if (socketDown) loadUserNotifs();
      if (RadiologyStore.getSession()?.role !== 'DOCTOR') return;
      if (socketDown) loadBackendReports();
    }, FALLBACK_POLL_MS);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadBackendReports();
        loadUserNotifs();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('radionline_reports_changed', handleReportsChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(pollTimer);
      if (ws) ws.close();
    };
  }, []);


  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'DOCTOR': return 'Doctor';
      case 'MANAGER': return 'Manager';
      case 'CENTER': return 'Center';
      default: return role;
    }
  };

  const getRoleBadgeChar = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'A';
      case 'DOCTOR': return 'D';
      case 'MANAGER': return 'M';
      case 'CENTER': return 'C';
      default: return 'U';
    }
  };

  const handleAcceptReport = async (report: XRayReport) => {
    const docId = session?.doctorId || 'doc-1';
    const docName = session?.name || 'DR. RADIOLOGIST';
    try {
      const updated = await ApiClient.claimReport(report.id, docId, docName);
      RadiologyStore.saveReport(updated);
      await loadBackendReports();
      setNotificationsOpen(false);
      setMobileNotifOpen(false);
      const caseId = updated?.id || report.id;
      if (isWorkspaceRoute && !pathname?.endsWith(`/${caseId}`)) {
        // Another case is open in the viewer and may hold unsaved text: ask first
        setOpenAcceptedGuard({ id: caseId, name: report.fullName });
      } else {
        // Go straight into the PACS viewer; it opens on the first unreported study
        showToast(`Accepted: ${report.fullName}. Opening viewer...`, 3000);
        router.push(`/dashboard/workspace/${caseId}`);
      }
    } catch (err: any) {
      if (String(err?.message || '').includes('API error 409')) {
        // Another doctor got there first: drop the stale item and say so plainly
        setLiveReports((prev) => prev.filter((r) => r.id !== report.id));
        showToast('This case was already accepted by another doctor.', 3500);
      } else {
        showToast(apiErrorMessage(err, 'Could not accept this case. Please try again.'), 4000);
      }
      loadBackendReports();
    }
  };

  const handleRejectReport = async (report: XRayReport) => {
    const docId = session?.doctorId || 'doc-1';
    try {
      await ApiClient.rejectReport(report.id, docId, session?.name);
    } catch (err) {
      console.warn('Reject notice error:', err);
    }
    setRejectedIds((prev) => [...prev, report.id]);
    showToast(`Dismissed ${report.fullName}`, 3000);
  };

  const pendingNotifications = liveReports.filter((r) => {
    if (session?.role === 'DOCTOR') {
      if (rejectedIds.includes(r.id)) return false;
      return isReportOpenForDoctor(r, session);
    }
    if (session?.role === 'CENTER') {
      if (rejectedIds.includes(r.id)) return false;
      const myCenters = session?.centers?.length
        ? session.centers.map((c) => c.centerId)
        : session?.centerId
        ? [session.centerId]
        : [];
      return r.status === 'Completed' && (myCenters.length === 0 || myCenters.includes(r.radiologyCenterId));
    }
    if (session?.role === 'SUPER_ADMIN' || session?.role === 'MANAGER') {
      return r.status === 'Completed';
    }
    return false;
  });

  const unreadUserNotifs = userNotifs.filter((n) => !n.readAt).length;
  // Bell badge: open cases (existing rule) + unread personal notifications
  const bellCount = pendingNotifications.length + unreadUserNotifs;

  const openUserNotif = (n: UserNotification) => {
    if (!n.readAt) {
      const readAt = new Date().toISOString();
      setUserNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, readAt } : x)));
      ApiClient.markNotificationRead(n.id).catch(() => undefined);
    }
    setNotificationsOpen(false);
    setMobileNotifOpen(false);
    const link = n.link || (n.caseId ? `/dashboard/workspace/${n.caseId}` : '');
    if (!link) return;
    const path = link.split('?')[0];
    if (pathname === path) {
      // Case already open: just bring up its Activity panel for a message
      if (link.includes('activity=1')) window.dispatchEvent(new Event('radionline_open_activity'));
      return;
    }
    router.push(link);
  };

  const markAllUserNotifsRead = () => {
    const readAt = new Date().toISOString();
    setUserNotifs((prev) => prev.map((x) => (x.readAt ? x : { ...x, readAt })));
    ApiClient.markAllNotificationsRead().catch(() => undefined);
  };

  const formatNotifTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const renderUserNotifs = (mobile: boolean) =>
    userNotifs.length === 0 ? null : (
      <div className={mobile ? 'space-y-2' : 'space-y-1.5'} data-testid="user-notifs">
        <div className="flex items-center justify-between px-0.5">
          <span className={mobile ? 'text-[11px] font-bold uppercase tracking-wide text-slate-500' : 'text-[10px] font-bold uppercase tracking-wide text-slate-500'}>
            Updates{unreadUserNotifs > 0 ? ` (${unreadUserNotifs} new)` : ''}
          </span>
          {unreadUserNotifs > 0 && (
            <button
              type="button"
              onClick={markAllUserNotifsRead}
              className={mobile ? 'text-[12px] font-semibold text-[#009ef7] py-1' : 'text-[10px] font-semibold text-[#009ef7] hover:underline'}
            >
              Mark all read
            </button>
          )}
        </div>
        {userNotifs.slice(0, 20).map((n) => (
          <button
            type="button"
            key={`un-${n.id}`}
            data-testid="user-notif"
            data-kind={n.kind}
            onClick={() => openUserNotif(n)}
            className={`w-full text-left border ${
              mobile ? 'p-3 rounded-xl' : 'p-2.5 rounded-lg text-xs'
            } ${n.readAt ? 'bg-white border-slate-200' : 'bg-sky-50 border-[#009ef7]/40'} hover:bg-sky-100/60 active:bg-sky-100/60`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className={`min-w-0 font-bold text-slate-900 ${mobile ? 'text-[13px] leading-snug' : ''}`}>
                {!n.readAt && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#009ef7] mr-1.5 align-middle" />}
                {n.title}
              </div>
              <span className={mobile ? 'font-mono text-[10px] text-slate-400 font-bold shrink-0' : 'font-mono text-[9px] text-slate-400 font-bold shrink-0'}>
                {formatNotifTime(n.createdAt)}
              </span>
            </div>
            {n.body && (
              <div className={mobile ? 'text-[12px] text-slate-600 mt-0.5 break-words' : 'text-[11px] text-slate-600 mt-0.5 break-words'}>
                {n.body}
              </div>
            )}
          </button>
        ))}
      </div>
    );

  // Notification list shared by the desktop popover and the mobile notifications panel.
  // Same data and Accept / Dismiss handlers; the mobile variant only uses larger text and tap targets.
  const renderNotificationList = (mobile: boolean) => (
    <>
      {renderUserNotifs(mobile)}
      {renderCaseNotificationList(mobile)}
    </>
  );

  const renderCaseNotificationList = (mobile: boolean) =>
    pendingNotifications.length === 0 ? (
      userNotifs.length > 0 ? null : (
      mobile ? (
        <div className="py-10 flex flex-col items-center gap-2 text-center">
          <span className="w-11 h-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <Bell size={20} />
          </span>
          <span className="text-[13px] font-semibold text-slate-500">No active notifications</span>
        </div>
      ) : (
        <div className="p-6 text-center text-xs text-slate-400 italic">
          No active notifications
        </div>
      ))
    ) : (
      pendingNotifications.map((rep) => (
        <div
          key={rep.id}
          className={
            mobile
              ? 'p-3 bg-white border border-slate-200 rounded-xl space-y-2'
              : 'p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs'
          }
        >
          <div className="flex items-start justify-between gap-2">
            <div className={mobile ? 'min-w-0' : undefined}>
              <div className={mobile ? 'font-bold text-slate-900 text-[13px] leading-snug' : 'font-bold text-slate-900'}>
                {session?.role === 'CENTER' ? `Report Signed: ${rep.fullName}` : rep.radiologyCenterName}
              </div>
              <div className={mobile ? 'text-[12px] text-slate-500 font-medium mt-0.5' : 'text-[11px] text-slate-500 font-medium'}>
                {rep.fullName}{formatPatientDisplayId(rep.patientNumber) ? ` (${rep.patientNumber})` : ''}
              </div>
            </div>
            <span className={mobile ? 'font-mono text-[10px] text-slate-400 font-bold shrink-0' : 'font-mono text-[9px] text-slate-400 font-bold'}>
              {rep.studyDate}
            </span>
          </div>

          {session?.role === 'DOCTOR' && (
            <div className={mobile ? 'flex items-center gap-2 pt-0.5' : 'flex items-center gap-1.5 pt-1'}>
              <button
                type="button"
                onClick={() => handleAcceptReport(rep)}
                className={
                  mobile
                    ? 'flex-1 py-2 px-3 bg-[#009ef7] hover:bg-[#008be0] active:bg-[#008be0] text-white text-[12px] font-bold rounded-lg flex items-center justify-center gap-1.5'
                    : 'flex-1 py-1 px-2 bg-[#009ef7] hover:bg-[#008be0] text-white text-[10px] font-bold rounded flex items-center justify-center gap-1'
                }
              >
                <Check size={mobile ? 14 : 12} />
                <span>Accept</span>
              </button>
              <button
                type="button"
                onClick={() => handleRejectReport(rep)}
                className={
                  mobile
                    ? 'py-2 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-700 text-[12px] font-bold rounded-lg'
                    : 'py-1 px-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded'
                }
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      ))
    );

  const SidebarContent = (
    <aside
      className="bg-white border-r border-slate-200 relative"
      style={{
        width: collapsed ? 52 : 210,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.18s ease-in-out',
        userSelect: 'none',
      }}
    >
      {/* Unique Floating Border-Edge Toggle Button */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="hidden md:flex absolute -right-3 top-[10px] z-40 w-6 h-6 rounded-full bg-white border border-slate-200 shadow-[0_2px_6px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,158,247,0.3)] hover:border-[#009ef7] hover:bg-[#009ef7] text-slate-400 hover:text-white items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 group focus:outline-none"
        title={collapsed ? 'Expand Sidebar (Ctrl+B)' : 'Collapse Sidebar (Ctrl+B)'}
        aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
      >
        <ChevronLeft
          size={12}
          strokeWidth={2.5}
          className={`transition-transform duration-300 ease-out ${
            collapsed ? 'rotate-180 group-hover:text-white' : 'rotate-0 group-hover:text-white'
          }`}
        />
      </button>

      {/* Brand Header */}
      <div
        className="border-b border-slate-200 flex items-center shrink-0 transition-all duration-200 overflow-hidden"
        style={{
          height: 44,
          padding: collapsed ? '0' : '0 12px',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        <div
          onClick={collapsed ? onToggleCollapse : undefined}
          className={`flex items-center gap-2.5 min-w-0 ${
            collapsed ? 'w-full h-full justify-center cursor-pointer hover:bg-slate-50 transition-colors' : ''
          }`}
          title={collapsed ? 'Click to expand sidebar (Ctrl+B)' : undefined}
        >
          <img
            src="/logo.png"
            alt="Radionline"
            className="rounded-full object-contain shrink-0 transition-transform duration-200"
            style={{
              height: 28,
              width: 28,
            }}
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-extrabold text-[12px] tracking-tight text-slate-900 truncate">
                RADIONLINE
              </span>
              <span className="text-[9px] font-bold text-[#009ef7] tracking-wider font-mono uppercase">
                TELERADIOLOGY
              </span>
            </div>
          )}
        </div>

        {!collapsed && mobileOpen && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
            title="Close Drawer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Navigation list */}
      <nav
        style={{
          flex: 1,
          padding: '8px 6px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onCloseMobile?.()}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-sky-50 text-[#009ef7] font-bold border-l-3 border-[#009ef7]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              style={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '8px 0' : '7px 10px',
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={16} className={`shrink-0 ${isActive ? 'text-[#009ef7]' : 'text-slate-500'}`} />
              {!collapsed && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                  <span className="truncate">{item.label}</span>
                  {'isLive' in item && item.isLive && (
                    <span style={{ fontSize: 9, fontWeight: 800, background: '#ef4444', color: '#ffffff', padding: '1px 5px', borderRadius: 8, letterSpacing: '0.5px', marginLeft: 4 }}>
                      LIVE
                    </span>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section: Notifications + User Profile + Logout */}
      <div
        className="border-t border-slate-200 bg-slate-50/80 p-2 flex flex-col gap-1.5 shrink-0 relative"
      >
        {/* Toast Notice Banner if any */}
        {toastNotice && (
          <div
            key={toastKey}
            role="status"
            className={`rn-toast absolute bg-slate-900 text-white text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-xl z-50 flex items-center justify-between ${
              collapsed ? 'left-full ml-2 bottom-2 w-72' : '-top-12 left-2 right-2'
            }`}
            style={{ animationDuration: `${toastDurationMs}ms` }}
          >
            <span className="truncate">{toastNotice}</span>
            <button onClick={hideToast} className="text-slate-400 hover:text-white ml-2">
              <X size={12} />
            </button>
          </div>
        )}

        {/* 1. Notifications Button & Popover */}
        <div ref={notifContainerRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
                          }}
            className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-xs font-bold transition-all border ${
              notificationsOpen
                ? 'bg-sky-50 text-[#009ef7] border-[#009ef7]/40'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
            title="Notifications"
          >
            <div className="relative shrink-0 flex items-center justify-center">
              <Bell size={16} className={bellCount > 0 ? 'text-[#009ef7]' : 'text-slate-500'} />
              {bellCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center px-0.5 border border-white">
                  {bellCount}
                </span>
              )}
            </div>
            {!collapsed && (
              <span className="truncate">Notifications ({bellCount})</span>
            )}
          </button>

          {/* Notifications Popover */}
          {notificationsOpen && (
            <div
              className="absolute left-full bottom-0 ml-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase text-slate-900">
                  Notifications ({bellCount})
                </span>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto p-2 space-y-2">
                {renderNotificationList(false)}
              </div>
            </div>
          )}
        </div>

        {/* 2. User Profile (role fixed to logged-in account) */}
        <div className="relative">
          <div
            className="w-full flex items-center gap-2 p-2 rounded-lg text-xs font-bold border bg-white text-slate-800 border-slate-200"
            style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
            title={session ? `Signed in as ${getRoleLabel(session.role)} (${session.name})` : 'Not signed in'}
          >
            <div
              className="w-6 h-6 rounded-md bg-[#009ef7] text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0"
            >
              {session ? getRoleBadgeChar(session.role) : '?'}
            </div>
            {!collapsed && (
              <div className="flex items-center justify-between w-full min-w-0">
                <div className="truncate text-left leading-tight">
                  <div className="truncate font-bold text-slate-900 text-[11px]">{session?.name || 'Not signed in'}</div>
                  <div className="text-[10px] text-slate-500 font-mono font-semibold">{session ? getRoleLabel(session.role) : ''}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Sign Out Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 w-full p-2 rounded-lg text-xs font-bold text-slate-700 hover:text-rose-600 hover:bg-rose-50 border border-transparent transition-colors"
          style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
          title="Sign Out"
        >
          <LogOut size={16} className="shrink-0 text-slate-500" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <style>{MOBILE_OVERLAY_CSS}</style>

      {/* Desktop sidebar */}
      <div className="hidden-mobile" style={{ display: 'flex', height: '100%' }}>
        {SidebarContent}
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <>
          <div
            onClick={onCloseMobile}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 299,
            }}
          />
          <div
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              width: 210,
              zIndex: 300,
              display: 'flex',
            }}
          >
            {SidebarContent}
          </div>
        </>
      )}

      <ConfirmDialog
        open={logoutGuard.open}
        title="Unfinished Study Reports"
        message={logoutGuard.message}
        confirmLabel="Leave anyway"
        cancelLabel="Stay & finish"
        variant="danger"
        onConfirm={doLogout}
        onCancel={() => setLogoutGuard({ open: false, message: '' })}
      />

      <ConfirmDialog
        open={!!openAcceptedGuard}
        title="Case accepted"
        message={`${openAcceptedGuard?.name || 'The case'} is now yours. Open it now? Any unsaved text in the case you are viewing will be lost.`}
        confirmLabel="Open now"
        cancelLabel="Stay here"
        variant="primary"
        onConfirm={() => {
          const id = openAcceptedGuard?.id;
          setOpenAcceptedGuard(null);
          if (id) router.push(`/dashboard/workspace/${id}`);
        }}
        onCancel={() => {
          setOpenAcceptedGuard(null);
          showToast('Accepted. Open it later from My Work.', 3500);
        }}
      />

      {/* Mobile Floating Bottom Dock - hidden on case workspace */}
      {!isWorkspaceRoute && (
        <div
          className="mobile-tabbar"
          style={{
            position: 'fixed',
            bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            left: 12,
            right: 12,
            display: 'none',
            zIndex: 100,
            height: 56,
            borderRadius: 20,
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.04)',
            padding: '4px 6px',
            alignItems: 'center',
            justifyContent: 'space-around',
          }}
        >
          {mobileTabItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            
            // Concise label mapping for clean mobile layout
            let shortLabel = item.label;
            if (item.label.includes('Live')) shortLabel = 'Live';
            else if (item.label.includes('Dashboard') || item.label.includes('Overview')) shortLabel = 'Overview';
            else if (item.label.includes('Pending')) shortLabel = 'Pending';
            else if (item.label.includes('Reports')) shortLabel = 'Reports';
            else if (item.label.includes('Invoices')) shortLabel = 'Invoices';
            else if (item.label.includes('Templates')) shortLabel = 'Templates';
            else if (item.label.includes('PACS')) shortLabel = 'PACS';
            else if (item.label.includes('Doctors')) shortLabel = 'Doctors';
            else if (item.label.includes('Centers')) shortLabel = 'Centers';

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onCloseMobile?.()}
                className={`mobile-tabbar-item outline-none focus:outline-none focus:ring-0 ${
                  isActive ? 'bg-[#009ef7]/10' : 'hover:bg-slate-100/60'
                }`}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '5px 0',
                  borderRadius: 14,
                  gap: 2,
                  textDecoration: 'none',
                  border: 'none',
                  outline: 'none',
                  transition: 'all 0.18s ease-in-out',
                }}
              >
                <Icon
                  size={18}
                  className={`transition-transform duration-200 ${
                    isActive ? 'text-[#009ef7] scale-110' : 'text-slate-500'
                  }`}
                />
                <span
                  style={{
                    fontSize: 10,
                    lineHeight: '12px',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.01em',
                  }}
                  className={isActive ? 'font-bold text-[#009ef7]' : 'font-medium text-slate-500'}
                >
                  {shortLabel}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setMobileNotifOpen(false);
              setMoreOpen(true);
            }}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-label="More pages and sign out"
            className={`mobile-tabbar-item outline-none focus:outline-none focus:ring-0 ${
              moreOpen || isMoreRouteActive ? 'bg-[#009ef7]/10' : 'hover:bg-slate-100/60'
            }`}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '5px 0',
              borderRadius: 14,
              gap: 2,
              border: 'none',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.18s ease-in-out',
            }}
          >
            <Menu
              size={18}
              className={`transition-transform duration-200 ${
                moreOpen || isMoreRouteActive ? 'text-[#009ef7] scale-110' : 'text-slate-500'
              }`}
            />
            <span
              style={{ fontSize: 10, lineHeight: '12px', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}
              className={moreOpen || isMoreRouteActive ? 'font-bold text-[#009ef7]' : 'font-medium text-slate-500'}
            >
              More
            </span>
          </button>
        </div>
      )}

      {/* Mobile top bar (phones only, hidden on case workspace): logo + notifications bell.
          The dashboard layout reserves its height with the "mobile-topbar-offset" class. */}
      {!isWorkspaceRoute && (
        <div
          className="mobile-topbar bg-white/95 border-b border-slate-200"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            display: 'none',
            zIndex: 100,
            height: 'calc(48px + env(safe-area-inset-top, 0px))',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingLeft: 12,
            paddingRight: 8,
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          <Link href="/dashboard" aria-label="Go to dashboard" className="flex items-center outline-none">
            <img
              src="/logo.png"
              alt="Radionlineofficial"
              style={{ height: 32, width: 32, objectFit: 'contain', borderRadius: '50%' }}
            />
          </Link>

          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              setMobileNotifOpen(true);
            }}
            aria-haspopup="dialog"
            aria-expanded={mobileNotifOpen}
            aria-label={`Notifications (${bellCount})`}
            className={`relative w-10 h-10 rounded-full flex items-center justify-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#009ef7]/40 ${
              mobileNotifOpen ? 'bg-sky-50 text-[#009ef7]' : 'text-slate-600 hover:bg-slate-100 active:bg-slate-100'
            }`}
          >
            <Bell size={20} className={bellCount > 0 ? 'text-[#009ef7]' : undefined} />
            {bellCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold leading-none flex items-center justify-center ring-2 ring-white">
                {bellCount > 99 ? '99+' : bellCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Toast notices on phones (new task, accept / dismiss), shown just under the top bar and above panels */}
      {toastNotice && (
        <div
          key={toastKey}
          role="status"
          className="rn-mobile-toast rn-toast bg-slate-900 text-white text-[12px] font-semibold py-2 px-3 rounded-lg shadow-xl items-center justify-between"
          style={{
            position: 'fixed',
            left: 12,
            right: 12,
            top: isWorkspaceRoute
              ? 'calc(8px + env(safe-area-inset-top, 0px))'
              : 'calc(56px + env(safe-area-inset-top, 0px))',
            zIndex: 450,
            animationDuration: `${toastDurationMs}ms`,
          }}
        >
          <span className="truncate">{toastNotice}</span>
          <button type="button" onClick={hideToast} aria-label="Dismiss notice" className="text-slate-400 hover:text-white ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Mobile notifications panel (reuses the shared notification list + Accept / Dismiss handlers) */}
      {mobileNotifOpen && (
        <div className="rn-notif-root" style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
          <div
            className="rn-more-backdrop"
            onClick={() => setMobileNotifOpen(false)}
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.45)' }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rn-notif-title"
            className="rn-notif-panel bg-slate-50"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              borderBottomLeftRadius: 20,
              borderBottomRightRadius: 20,
              boxShadow: '0 16px 32px -8px rgba(15, 23, 42, 0.3)',
              paddingTop: 'env(safe-area-inset-top, 0px)',
              overflow: 'hidden',
            }}
          >
            <div className="flex items-center justify-between pl-4 pr-2 bg-white border-b border-slate-200 shrink-0" style={{ height: 52 }}>
              <div className="flex items-center gap-2">
                <h2 id="rn-notif-title" className="text-[15px] font-bold text-slate-900">
                  Notifications
                </h2>
                <span
                  className={`min-w-[22px] h-[20px] px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                    bellCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {bellCount}
                </span>
              </div>
              <button
                ref={notifCloseRef}
                type="button"
                onClick={() => setMobileNotifOpen(false)}
                aria-label="Close notifications"
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#009ef7]/40"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain p-3 space-y-2" style={{ flex: 1, minHeight: 0 }}>
              {renderNotificationList(true)}
            </div>
          </div>
        </div>
      )}

      {/* Mobile "More" sheet: pages that do not fit in the bottom bar + Sign out */}
      {moreOpen && (
        <div className="rn-more-root" style={{ position: 'fixed', inset: 0, zIndex: 400 }}>
          <div
            className="rn-more-backdrop"
            onClick={() => setMoreOpen(false)}
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.45)' }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rn-more-title"
            className="rn-more-sheet bg-white"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              boxShadow: '0 -12px 32px -8px rgba(15, 23, 42, 0.25)',
              paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1 shrink-0">
              <span className="block w-10 h-1 rounded-full bg-slate-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-1 pb-2 shrink-0">
              <h2 id="rn-more-title" className="text-[15px] font-bold text-slate-900">
                More
              </h2>
              <button
                ref={moreCloseRef}
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#009ef7]/40"
              >
                <X size={18} />
              </button>
            </div>

            {/* Overflow pages */}
            {mobileMoreItems.length > 0 && (
              <nav aria-label="More pages" className="px-3 overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
                <ul className="flex flex-col gap-1">
                  {mobileMoreItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isNavItemActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => {
                            setMoreOpen(false);
                            onCloseMobile?.();
                          }}
                          aria-current={isActive ? 'page' : undefined}
                          className={`flex items-center gap-3 px-3 py-2 rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#009ef7]/40 ${
                            isActive ? 'bg-sky-50' : 'hover:bg-slate-50 active:bg-slate-100'
                          }`}
                        >
                          <span
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              isActive ? 'bg-[#009ef7] text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Icon size={18} />
                          </span>
                          <span
                            className={`flex-1 min-w-0 truncate text-[14px] ${
                              isActive ? 'font-bold text-[#009ef7]' : 'font-semibold text-slate-800'
                            }`}
                          >
                            {item.label}
                          </span>
                          {'isLive' in item && item.isLive && (
                            <span className="text-[9px] font-extrabold tracking-wide bg-rose-500 text-white px-1.5 py-px rounded-lg">
                              LIVE
                            </span>
                          )}
                          <ChevronRight size={16} className={isActive ? 'text-[#009ef7]' : 'text-slate-300'} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}

            {/* Account + Sign out */}
            <div className="mx-3 mt-3 pt-3 border-t border-slate-100 flex flex-col gap-1 shrink-0">
              {session && (
                <div className="flex items-center gap-3 px-3 pb-1">
                  <div className="w-9 h-9 rounded-full bg-[#009ef7] text-white font-mono font-bold text-[12px] flex items-center justify-center shrink-0">
                    {getRoleBadgeChar(session.role)}
                  </div>
                  <div className="min-w-0 leading-tight">
                    <div className="truncate text-[13px] font-bold text-slate-900">{session.name}</div>
                    <div className="text-[11px] font-semibold text-slate-500">{getRoleLabel(session.role)}</div>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleMoreSignOut}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-left text-[14px] font-semibold text-rose-600 hover:bg-rose-50 active:bg-rose-50 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-rose-300"
              >
                <span className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                  <LogOut size={18} />
                </span>
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
