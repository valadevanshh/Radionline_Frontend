'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { ThemeProvider } from '@/lib/theme-context';
import { ApiClient, getAccessToken } from '@/lib/api-client';
import { refreshSession } from '@/lib/access';
import { RadiologyStore } from '@/lib/radiology-store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  // Phones show a fixed top bar (logo + notifications bell, rendered by Sidebar) except on the case workspace
  const reserveMobileTopBar = !pathname?.startsWith('/dashboard/workspace');

  useEffect(() => {
    const token = getAccessToken();
    const session = RadiologyStore.getSession();
    if (!token && !session) {
      router.replace('/login');
    } else {
      setAuthChecked(true);
      // Centre links / page permissions may have changed since login
      if (token) refreshSession(() => ApiClient.getMe());
    }
  }, [router]);

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>
        Verifying Session Authentication...
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div style={{ display: 'flex', height: '100vh', width: '100%', maxWidth: '100vw', overflow: 'hidden', background: 'var(--bg)' }}>
        {/* Sidebar (Closed by default as requested) */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area (Full Height Workspace, No Top Bar) */}
        <div
          className={reserveMobileTopBar ? 'mobile-topbar-offset' : undefined}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}
        >
          {/* Child View Workspace */}
          <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
