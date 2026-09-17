import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './sidebar.layout';
import Header from './header.layout';
import { apiFetch } from '../../lib/apiFetch.lib';

export default function AppLayout({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Responsive breakpoint listener
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Map path to active navigation label
  const getActiveItem = (pathname) => {
    if (pathname.startsWith('/worklist')) return 'My Worklist';
    if (pathname.startsWith('/catalog')) return 'Change Catalog';
    if (pathname.startsWith('/change-requests')) return 'Change Request';
    if (pathname.startsWith('/settings')) return 'Settings';
    if (pathname.startsWith('/pre-spend')) return 'Pre-Spend Request';
    if (pathname.startsWith('/travel-desk')) return 'Travel Desk';
    if (pathname.startsWith('/org-dashboard')) return 'Organization Dashboard';
    if (pathname.startsWith('/my-requests')) return 'My Requests';
    return 'Dashboard';
  };

  const activeItem = getActiveItem(location.pathname);

  const handleNavigate = (target, payload) => {
    if (typeof target === 'string') {
      const routeMap = {
        'Dashboard': '/dashboard',
        'My Dashboard': '/dashboard',
        'My Requests': '/my-requests',
        'Change Catalog': '/catalog',
        'Change Request': '/change-requests/new',
        'My Worklist': '/worklist',
        'Org Worklist': '/org-dashboard',
        'Organization Dashboard': '/org-dashboard',
        'Settings': '/settings',
        'Pre-Spend Request': '/pre-spend',
        'Travel Desk': '/travel-desk'
      };

      const dest = routeMap[target] || (target.startsWith('/') ? target : `/${target.toLowerCase().replace(/\s+/g, '-')}`);
      navigate(dest, { state: payload });
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--page-bg)] w-full">
      <Sidebar
        activeItem={activeItem}
        onItemSelect={handleNavigate}
        user={user}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onHoverChange={setIsSidebarHovered}
      />

      <div
        className="flex-1 flex flex-col min-w-0 transition-[margin-left] duration-200"
        style={{
          marginLeft: isMobile ? 0 : isSidebarHovered ? '250px' : '68px'
        }}
      >
        <Header
          activeRoute={activeItem}
          user={user}
          onLogout={onLogout}
          isMobile={isMobile}
          onMenuClick={() => setMobileOpen(true)}
          onNavigate={handleNavigate}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Dynamic Nested Content */}
        <main className={`flex-1 ${isMobile ? 'p-4' : 'px-8 py-7'}`}>
          <div className="max-w-[1600px] w-full mx-auto">
            <Outlet context={{ user, searchQuery, onNavigate: handleNavigate }} />
          </div>
        </main>
      </div>
    </div>
  );
}
