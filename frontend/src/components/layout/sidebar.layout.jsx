import React, { useState } from 'react';
import {
  LayoutGrid,
  Menu,
  FileText,
  CheckCircle2,
  Settings,
  X,
  IndianRupee,
  Plane,
  Users,
  ExternalLink
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

function Sidebar({
  activeItem,
  onItemSelect,
  user,
  isMobile = false,
  mobileOpen = false,
  onCloseMobile,
  onHoverChange
}) {
  const [isHovered, setIsHovered] = useState(false);
  const { theme } = useTheme();
  const faviconSrc = theme === 'dark' ? '/images/white-favicon.png' : '/images/black-favicon.png';

  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsHovered(true);
      onHoverChange?.(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovered(false);
      onHoverChange?.(false);
    }
  };

  const roleName = (user?.role || '').toLowerCase();
  const roleId = user?.roleId || '';
  
  const isSuperAdmin = roleId === 'role-1' || roleName.includes('super');
  const isBoardUser = roleId === 'role-board' || roleName.includes('board');
  const isTravelAdmin = roleId === 'role-2-travel' || (roleName.includes('admin') && roleName.includes('travel'));
  const isPreSpendAdmin = roleId === 'role-2-prespend' || (roleName.includes('admin') && (roleName.includes('spend') || roleName.includes('prespend')));
  const isChangeAdmin = roleId === 'role-2-change' || (roleName.includes('admin') && !isTravelAdmin && !isPreSpendAdmin && !isSuperAdmin);
  const isAdmin = isSuperAdmin || isTravelAdmin || isPreSpendAdmin || isChangeAdmin || roleId === 'role-2' || roleName.includes('admin');
  const isChangeManager = roleId === 'role-3' || roleName.includes('manager');
  const isChangeImplementer = roleId === 'role-5' || roleName.includes('implementer');
  const isApprover = isSuperAdmin || isBoardUser || isAdmin || isChangeManager || isChangeImplementer;

  const topNavItems = [
    { id: 'Dashboard', path: '/dashboard', label: 'My Dashboard', icon: LayoutGrid },
    { id: 'Change Request', path: '/change-requests/new', label: 'Change Request', icon: FileText },
    { id: 'Pre-Spend Request', path: '/pre-spend', label: 'Pre-Spend Request', icon: IndianRupee },
    { id: 'Travel Desk', path: '/travel-desk', label: 'Travel Desk', icon: Plane },
    { id: 'Tribe CRM', label: 'Tribe CRM', icon: Users, externalUrl: 'https://tribe.stfox.com/jsp/iamlogin.jsp' }
  ];

  // On desktop: compact rail by default, expands to full width on hover.
  // On mobile: slides in/out full width.
  const isExpanded = isMobile || isHovered;
  const mini = !isExpanded;
  const width = isMobile ? 250 : isHovered ? 250 : 68;

  const handleSelect = (item) => {
    if (item?.externalUrl) {
      window.open(item.externalUrl, '_blank', 'noopener,noreferrer');
      if (isMobile) onCloseMobile?.();
      return;
    }
    onItemSelect?.(item.path || item.id || item);
    if (isMobile) onCloseMobile?.();
  };

  const NavButton = ({ item }) => {
    const Icon = item.icon;
    const isActive = activeItem === item.id;
    return (
      <button
        key={item.id}
        onClick={() => handleSelect(item)}
        title={mini ? item.label : undefined}
        className={`cd-nav-item${isActive ? ' cd-nav-item--active' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          width: '100%',
          padding: mini ? '0.65rem' : '0.65rem 0.85rem',
          justifyContent: mini ? 'center' : 'flex-start',
          borderRadius: 'var(--radius-lg)',
          border: 'none',
          color: isActive ? 'var(--primary-foreground)' : 'var(--sidebar-text)',
          fontWeight: isActive ? 600 : 500,
          fontSize: '0.85rem',
          cursor: 'pointer',
          position: 'relative',
          ...(isActive
            ? { backgroundColor: 'var(--primary)', boxShadow: 'var(--shadow-card)' }
            : {})
        }}
      >
        <Icon size={18} style={{ color: isActive ? 'var(--primary-foreground)' : 'var(--text-secondary)', flexShrink: 0, strokeWidth: isActive ? 2.25 : 2 }} />
        {!mini && (
          <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
        )}
        {!mini && item.externalUrl && (
          <ExternalLink size={13} style={{ color: 'var(--text-secondary)', flexShrink: 0, marginLeft: 'auto' }} />
        )}
        {!mini && item.comingSoon && (
          <span
            style={{
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              fontSize: '0.625rem',
              fontWeight: 600,
              backgroundColor: 'var(--sidebar-border)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--sidebar-border)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
              lineHeight: 1.2
            }}
          >
            Coming Soon
          </span>
        )}
      </button>
    );
  };

  const aside = (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: `${width}px`,
        backgroundColor: 'var(--sidebar-bg)',
        color: 'var(--sidebar-text)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: isMobile ? 120 : 100,
        transform: isMobile ? `translateX(${mobileOpen ? '0' : '-110%'})` : 'none',
        transition: 'transform 0.22s ease, width 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
        boxShadow: !isMobile && isHovered ? 'var(--shadow-pop)' : 'none',
        overflowX: 'hidden',
        overflowY: 'auto',
        padding: mini ? '1.25rem 0' : '1.25rem 0.85rem',
        flexShrink: 0,
        userSelect: 'none',
        borderRight: '1px solid var(--sidebar-border)'
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: mini ? 0 : '0.5rem',
          padding: mini ? '0.25rem 0 1.25rem 0' : '0.25rem 0.2rem 1.5rem 0.4rem',
          justifyContent: mini ? 'center' : 'space-between',
          width: '100%'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: mini ? 0 : '0.85rem', justifyContent: mini ? 'center' : 'flex-start', width: mini ? '100%' : 'auto', flex: mini ? 'none' : 1, minWidth: 0 }}>
          <img
            src={faviconSrc}
            alt="Logo"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/images/Favicon.png';
            }}
            style={{ width: '32px', height: '32px', objectFit: 'contain', display: 'block', flexShrink: 0, margin: mini ? '0 auto' : undefined }}
          />
          {!mini && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--sidebar-text)',
                  lineHeight: 1.15,
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                ChangeDesk
              </span>
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.08em',
                  marginTop: '0.15rem',
                  whiteSpace: 'nowrap'
                }}
              >
                IT CHANGE MGMT
              </span>
            </div>
          )}
        </div>

        {isMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            style={iconBtnStyle}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Main nav */}
      <nav className={`cd-sidebar-nav${mini ? ' cd-sidebar-nav--mini' : ''}`}>
        {topNavItems.map((item) => (
          <NavButton key={item.id} item={item} />
        ))}
      </nav>

      {/* Management section (Visible to Approvers & Admins, Hidden for standard requesters) */}
      {(() => {
        if (!isApprover) return null;

        const visibleMgmtItems = [];

        if (isApprover) {
          visibleMgmtItems.push({ id: 'My Worklist', path: '/worklist', label: 'My Worklist', icon: CheckCircle2 });
        }

        if (isSuperAdmin) {
          visibleMgmtItems.push({ id: 'Organization Dashboard', path: '/org-dashboard', label: 'Organization Dashboard', icon: LayoutGrid });
        }

        if (isSuperAdmin) {
          visibleMgmtItems.push({ id: 'Settings', path: '/settings', label: 'Settings', icon: Settings });
        }

        return (
          <>
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                margin: mini ? '1.25rem 0 0.5rem 0' : '1.5rem 0 0.5rem 0.85rem',
                textAlign: mini ? 'center' : 'left'
              }}
            >
              {mini ? '•••' : 'MANAGEMENT'}
            </div>

            <nav className={`cd-sidebar-nav cd-sidebar-nav--fill${mini ? ' cd-sidebar-nav--mini' : ''}`}>
              {visibleMgmtItems.map((item) => (
                <NavButton key={item.id} item={item} />
              ))}
            </nav>
          </>
        );
      })()}
    </aside>
  );

  if (!isMobile) return aside;

  return (
    <>
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 110 }}
        />
      )}
      {aside}
    </>
  );
}

const iconBtnStyle = {
  width: '30px',
  height: '30px',
  borderRadius: '7px',
  border: '1px solid var(--sidebar-border)',
  backgroundColor: 'var(--sidebar-bg)',
  color: 'var(--text-secondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0
};

export default React.memo(Sidebar);
