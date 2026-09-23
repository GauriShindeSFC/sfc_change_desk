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

function Sidebar({
  activeItem,
  onItemSelect,
  user,
  isMobile = false,
  mobileOpen = false,
  onCloseMobile,
  myRequestsCount = 6,
  worklistCount = 4,
  onHoverChange
}) {
  const [isHovered, setIsHovered] = useState(false);

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
    { id: 'Change Catalog', path: '/catalog', label: 'Change Request', icon: FileText },
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
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          width: '100%',
          padding: mini ? '0.65rem' : '0.65rem 0.85rem',
          justifyContent: mini ? 'center' : 'flex-start',
          borderRadius: '8px',
          border: 'none',
          backgroundColor: isActive ? 'var(--primary, #173C4E)' : 'transparent',
          color: isActive ? '#FFFFFF' : '#94A3B8',
          fontWeight: isActive ? 600 : 500,
          fontSize: '0.85rem',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease, color 0.15s ease',
          position: 'relative'
        }}
      >
        <Icon size={18} style={{ color: isActive ? '#FFFFFF' : '#64748B', flexShrink: 0, strokeWidth: isActive ? 2.25 : 2 }} />
        {!mini && (
          <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
        )}
        {!mini && item.externalUrl && (
          <ExternalLink size={13} style={{ color: '#64748B', flexShrink: 0, marginLeft: 'auto' }} />
        )}
        {!mini && item.comingSoon && (
          <span
            style={{
              padding: '0.15rem 0.45rem',
              borderRadius: '4px',
              fontSize: '0.625rem',
              fontWeight: 600,
              backgroundColor: '#1E293B',
              color: '#94A3B8',
              border: '1px solid #334155',
              whiteSpace: 'nowrap',
              letterSpacing: '0.02em',
              lineHeight: 1.2
            }}
          >
            Coming Soon
          </span>
        )}
        {!mini && !isActive && Boolean(item.badge) && item.badge > 0 && (
          <span
            style={{
              padding: '0.1rem 0.45rem',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.7rem',
              fontWeight: 500,
              backgroundColor: 'var(--primary, #173C4E)',
              color: '#FFFFFF'
            }}
          >
            {item.badge}
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
        backgroundColor: '#0B1018',
        color: '#A0AEC0',
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
        boxShadow: !isMobile && isHovered ? '4px 0 24px rgba(0, 0, 0, 0.45)' : 'none',
        overflowX: 'hidden',
        overflowY: 'auto',
        padding: mini ? '1.25rem 0' : '1.25rem 0.85rem',
        flexShrink: 0,
        userSelect: 'none',
        borderRight: '1px solid #1E293B'
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
            src="/images/white-favicon.png"
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
                  color: '#FFFFFF',
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
                  color: '#64748B',
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
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
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
                color: '#475569',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                margin: mini ? '1.25rem 0 0.5rem 0' : '1.5rem 0 0.5rem 0.85rem',
                textAlign: mini ? 'center' : 'left'
              }}
            >
              {mini ? '•••' : 'MANAGEMENT'}
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
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
  border: '1px solid #1E293B',
  backgroundColor: '#0B1018',
  color: '#94A3B8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0
};

export default React.memo(Sidebar);
