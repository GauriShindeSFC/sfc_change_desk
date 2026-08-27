import React, { useState, useEffect } from 'react';
import { Search, Bell, Sun, Moon } from 'lucide-react';

export default function Header({ activeRoute = 'Settings', userInitials = 'GS', onLogout }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <header style={{
      height: '60px',
      backgroundColor: 'var(--card-bg)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      width: '100%'
    }}>
      
      {/* Left Breadcrumb Path */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Workspace</span>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>/</span>
        <strong style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
          {activeRoute}
        </strong>
      </div>

      {/* Right Controls Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        
        {/* Search Bar Input */}
        <div style={{ width: '280px', position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: '0.85rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={14} />
          </div>
          <input
            type="text"
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

        {/* Dark Mode Toggle (In between Search Bar and Notification Bell) */}
        <button
          type="button"
          onClick={() => setIsDarkMode(!isDarkMode)}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--card-bg)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notification Bell Icon */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Bell size={16} />
            <span style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '6px',
              height: '6px',
              backgroundColor: '#DC2626',
              borderRadius: '50%'
            }} />
          </button>
        </div>

        {/* User Profile Avatar Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
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
              cursor: 'pointer'
            }}
          >
            {userInitials}
          </button>

          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: 'calc(100% + 8px)',
              width: '180px',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              padding: '0.5rem 0',
              zIndex: 50
            }}>
              <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                <strong style={{ display: 'block', fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                  Gauri Shinde
                </strong>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                  Change Manager
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu(false);
                  if (onLogout) onLogout();
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
