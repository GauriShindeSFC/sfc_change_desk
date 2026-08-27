import React, { useState, useEffect } from 'react';
import Sidebar from './layout/Sidebar';
import Header from './layout/Header';
import DashboardPage from '../pages/DashboardPage';
import MyRequestsPage from '../pages/MyRequestsPage';
import ChangeCatalogPage from '../pages/ChangeCatalogPage';
import ChangeRequestFormPage from '../pages/ChangeRequestFormPage';
import MyWorklistPage from '../pages/MyWorklistPage';
import SettingsPage from '../pages/SettingsPage';
import CatalogueManagementPage from '../pages/CatalogueManagementPage';
import ReportsPage from '../pages/ReportsPage';
import { useIsMobile } from '../lib/useIsMobile';

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

  const pages = {
    Dashboard: DashboardPage,
    'My Requests': MyRequestsPage,
    'Change Catalog': ChangeCatalogPage,
    'Change Request': ChangeRequestFormPage,
    'Organization worklist': MyWorklistPage,
    Settings: SettingsPage,
    'Catalogue Management': CatalogueManagementPage,
    Reports: ReportsPage
  };
  const ActivePage = pages[activeItem];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--page-bg)', width: '100%' }}>
      <Sidebar
        activeItem={activeItem}
        onItemSelect={setActiveItem}
        user={user}
        isMobile={isMobile}
        collapsed={!isMobile && collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header
          activeRoute={activeItem}
          user={user}
          onLogout={onLogout}
          isMobile={isMobile}
          onMenuClick={() => setMobileOpen(true)}
        />

        {/* Workspace Content Canvas */}
        <main style={{ flex: 1, padding: isMobile ? '1rem' : '1.25rem 1.5rem' }}>
          {ActivePage ? (
            <ActivePage onNavigate={setActiveItem} />
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
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
