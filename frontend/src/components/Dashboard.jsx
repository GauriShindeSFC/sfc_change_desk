import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './layout/Sidebar';
import Header from './layout/Header';
import DashboardPage from '../pages/DashboardPage';
import MyRequestsPage from '../pages/MyRequestsPage';
import ChangeCatalogPage from '../pages/ChangeCatalogPage';
import ChangeRequestFormPage from '../pages/ChangeRequestFormPage';
import MyWorklistPage from '../pages/MyWorklistPage';
import SettingsPage from '../pages/SettingsPage';
import { useIsMobile } from '../lib/useIsMobile';

import { apiFetch } from '../lib/apiFetch';

const COLLAPSE_KEY = 'changedesk.sidebarCollapsed';

export default function Dashboard({ user, onLogout }) {
  const [activeItem, setActiveItem] = useState('Dashboard');
  const isMobile = useIsMobile();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navigationPayload, setNavigationPayload] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [myRequestsCount, setMyRequestsCount] = useState(0);
  const [worklistCount, setWorklistCount] = useState(0);
  const badgeRequestInFlight = useRef(false);

  const roleName = (user?.role || '').toLowerCase();
  const roleId = user?.roleId || '';
  const isSuperAdmin = roleId === 'role-1' || roleName.includes('super');
  const isAdmin = isSuperAdmin || roleId === 'role-2' || roleName.includes('admin');
  const isChangeManager = roleId === 'role-3' || roleName.includes('manager');
  const isChangeImplementer = roleId === 'role-5' || roleName.includes('implementer');
  const canSeeWorklist = isAdmin || isChangeManager || isChangeImplementer;

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  // Close the mobile drawer on navigation or when leaving the mobile breakpoint.
  useEffect(() => {
    setMobileOpen(false);
  }, [activeItem, isMobile]);

  // Live polling for Sidebar badge counters (excluding worklist)
  useEffect(() => {
    const fetchBadgeCounts = async () => {
      if (document.hidden || badgeRequestInFlight.current) return;
      badgeRequestInFlight.current = true;
      try {
        const reqRes = await apiFetch('/my-requests');
        if (reqRes.ok) {
          const reqBody = await reqRes.json();
          if (reqBody.data && Array.isArray(reqBody.data)) {
            setMyRequestsCount(reqBody.total ?? reqBody.data.length);
          }
        }
      } catch (err) {
        // Polling catch - silent
      } finally {
        badgeRequestInFlight.current = false;
      }
    };

    fetchBadgeCounts();
    const interval = setInterval(fetchBadgeCounts, 30000);
    return () => clearInterval(interval);
  }, [user?.id, activeItem]);

  const [visitedSections, setVisitedSections] = useState(() => {
    try {
      const saved = localStorage.getItem(`changedesk.visitedSections.${user?.id || 'default'}`);
      return saved ? JSON.parse(saved) : { 'My Requests': false, 'Organization worklist': false };
    } catch {
      return { 'My Requests': false, 'Organization worklist': false };
    }
  });

  useEffect(() => {
    if (activeItem === 'My Requests' || activeItem === 'Organization worklist') {
      setVisitedSections(prev => {
        const updated = { ...prev, [activeItem]: true };
        try {
          localStorage.setItem(`changedesk.visitedSections.${user?.id || 'default'}`, JSON.stringify(updated));
        } catch {
          /* ignore */
        }
        return updated;
      });
    }
  }, [activeItem, user?.id]);

  const handleNavigate = useCallback((page, payload = null) => {
    setActiveItem(page);
    setNavigationPayload(payload);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((c) => !c);
  }, []);

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const handleOpenMobile = useCallback(() => {
    setMobileOpen(true);
  }, []);

  let currentItem = activeItem;
  if (!isAdmin && !isChangeManager && !isChangeImplementer && (currentItem === 'My Worklist' || currentItem === 'Org Worklist' || currentItem === 'Organization worklist')) {
    currentItem = 'Dashboard';
  }
  if (!isAdmin && (currentItem === 'Org Worklist' || currentItem === 'Organization worklist' || currentItem === 'Organization Dashboard')) {
    currentItem = 'Dashboard';
  }
  if (!isSuperAdmin && currentItem === 'Settings') {
    currentItem = 'Dashboard';
  }
  const pages = {
    Dashboard: DashboardPage,
    'Organization Dashboard': DashboardPage,
    'My Requests': MyRequestsPage,
    'Change Catalog': ChangeCatalogPage,
    'Change Request': ChangeRequestFormPage,
    'My Worklist': MyWorklistPage,
    'Org Worklist': DashboardPage,
    'Organization worklist': DashboardPage,
    Settings: SettingsPage
  };
  const ActivePage = pages[currentItem];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--page-bg)', width: '100%' }}>
      <Sidebar
        activeItem={activeItem}
        onItemSelect={handleNavigate}
        user={user}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onCloseMobile={handleCloseMobile}
        myRequestsCount={visitedSections['My Requests'] ? 0 : myRequestsCount}
        worklistCount={worklistCount}
      />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        marginLeft: isMobile ? 0 : '68px',
        transition: 'margin-left 0.16s ease'
      }}>
        <Header
          activeRoute={activeItem}
          user={user}
          onLogout={onLogout}
          isMobile={isMobile}
          onMenuClick={handleOpenMobile}
          onNavigate={handleNavigate}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Workspace Content Canvas */}
        <main style={{ flex: 1, padding: isMobile ? '1rem' : '1.25rem 1.5rem' }}>
          {ActivePage ? (
            <ActivePage
              onNavigate={handleNavigate}
              initialData={navigationPayload}
              searchQuery={searchQuery}
              user={user}
              isOrgDashboard={activeItem === 'Organization Dashboard' || activeItem === 'Organization worklist' || activeItem === 'Org Worklist'}
            />
          ) : (
            <div
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem'
                }}
              >
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {activeItem}
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveItem('Dashboard')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  ← Back to Dashboard
                </button>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Viewing items for <strong>{activeItem}</strong>.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
