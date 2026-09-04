import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Sun, Moon, Menu, Check } from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';

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
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('changedesk.theme') === 'dark' || document.documentElement.classList.contains('dark');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    try {
      localStorage.setItem('changedesk.theme', isDarkMode ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [isDarkMode]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 10-Second Polling for Notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await apiFetch('/notifications');
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) {
            setNotifications(body.data);
            setUnreadCount(body.unreadCount || 0);
          }
        }
      } catch (err) {
        // Polling catch - silent
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  // Mark all notifications as read and clear inbox history
  const handleMarkAllRead = async () => {
    try {
      const res = await apiFetch('/notifications/mark-all-read', { method: 'PATCH' });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
    }
  };

  const handleNotifClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await apiFetch(`/notifications/${notif.id}/read`, { method: 'PATCH' });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.warn('Failed to mark notification as read:', err);
    }

    setShowNotifMenu(false);
    if (onNavigate) {
      if (notif.type === 'CR_SUBMITTED') {
        onNavigate('Organization worklist');
      } else {
        onNavigate('My Requests');
      }
    }
  };

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
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            {activeRoute}
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {!isMobile && activeRoute !== 'Dashboard' && !activeRoute?.includes('Change Request') && (
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

        <button
          type="button"
          onClick={() => setIsDarkMode((v) => !v)}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={squareBtn}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications Dropdown */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              if (showNotifMenu) {
                handleMarkAllRead();
              }
              setShowNotifMenu((prev) => !prev);
              setShowProfileMenu(false);
            }}
            style={squareBtn}
            title="Notifications"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                width: '320px',
                maxHeight: '400px',
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 60,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--input-bg)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Notifications</strong>
                  {unreadCount > 0 && (
                    <span style={{ fontSize: '0.7rem', backgroundColor: '#0D9488', color: '#FFF', padding: '0.1rem 0.4rem', borderRadius: '99px', fontWeight: 700 }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    style={{ background: 'none', border: 'none', color: '#0D9488', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ overflowY: 'auto', maxHeight: '320px' }}>
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      style={{
                        padding: '0.75rem 1rem',
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: !n.isRead ? 'rgba(13, 148, 136, 0.05)' : 'transparent',
                        opacity: n.isStale ? 0.6 : 1,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.775rem', fontWeight: 800, color: 'var(--text-primary)' }}>{n.title}</span>
                        {n.isStale && (
                          <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                            Already handled
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.3 }}>
                        {n.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    No notifications right now.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Menu */}
        <div ref={profileRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu((v) => !v);
              setShowNotifMenu(false);
            }}
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
              fontWeight: 700,
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
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  {user?.role || user?.email || '—'}
                </span>
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
