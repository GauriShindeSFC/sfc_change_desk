import React, { useState, useEffect, useRef } from 'react';
import { Search, Menu } from 'lucide-react';

function Header({
  activeRoute = 'Dashboard',
  user,
  onLogout,
  isMobile = false,
  onMenuClick,
  onNavigate,
  searchQuery = '',
  onSearchChange
}) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  // Ensure light mode is strictly applied
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    try {
      localStorage.setItem('changedesk.theme', 'light');
    } catch {
      /* ignore */
    }
  }, []);

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user?.initials || 'U';

  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onSearchChange && localSearch !== searchQuery) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange, searchQuery]);

  const squareBtn = {
    width: '34px',
    height: '34px',
    borderRadius: '8px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--input-bg)',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0
  };

  return (
    <header
      style={{
        height: '60px',
        backgroundColor: 'var(--card-bg)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: isMobile ? '0 1rem' : '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        width: '100%'
      }}
    >
      {/* Left: menu (mobile) + breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
        {isMobile && (
          <button type="button" onClick={onMenuClick} aria-label="Open menu" style={squareBtn}>
            <Menu size={18} />
          </button>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.875rem',
            minWidth: 0
          }}
        >
          {!isMobile && (
            <>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Workspace</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>/</span>
            </>
          )}
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            {activeRoute === 'Dashboard' ? 'My Dashboard' : activeRoute}
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {!isMobile && activeRoute !== 'Dashboard' && !activeRoute?.includes('Change Request') && !['Pre-Spend Request', 'Travel Desk', 'Tribe CRM', 'Settings'].includes(activeRoute) && (
          <div style={{ width: '280px', position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Search size={14} />
            </div>
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search CR-ID, title, requester..."
              style={{
                width: '100%',
                padding: '0.45rem 0.85rem 0.45rem 2.2rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            />
          </div>
        )}

        {/* Profile Menu */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowProfileMenu((v) => !v)}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: '#27354A',
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {initials}
          </button>

          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '200px',
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: '0.5rem 0',
                zIndex: 50
              }}
            >
              <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                <strong style={{ display: 'block', fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                  {user?.name || 'Unknown user'}
                </strong>
                {(() => {
                  const roleStr = (user?.role || user?.applicationRole || '').trim().toLowerCase();
                  const isRequester = roleStr === 'requester' || user?.roleId === 'role-4';
                  if (isRequester || !user?.role) return null;
                  return (
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      {user.role}
                    </span>
                  );
                })()}
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  onLogout?.();
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#DC2626',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default React.memo(Header);
