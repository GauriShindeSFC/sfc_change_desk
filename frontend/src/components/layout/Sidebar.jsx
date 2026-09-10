import React, { useState } from 'react';
import {
  LayoutGrid,
  Menu,
  FileText,
  CheckCircle2,
  Settings,
  X
} from 'lucide-react';

function Sidebar({
  activeItem,
  onItemSelect,
  user,
  isMobile = false,
  mobileOpen = false,
  onCloseMobile,
  myRequestsCount = 6,
  worklistCount = 4
}) {
  const [isHovered, setIsHovered] = useState(false);

  const roleName = (user?.role || '').toLowerCase();
  const roleId = user?.roleId || '';
  
  const isSuperAdmin = roleId === 'role-1' || roleName.includes('super');
  const isAdmin = isSuperAdmin || roleId === 'role-2' || roleName.includes('admin');
  const isChangeManager = roleId === 'role-3' || roleName.includes('manager');
  const isChangeImplementer = roleId === 'role-5' || roleName.includes('implementer');

  const topNavItems = [
    { id: 'Dashboard', label: 'My Dashboard', icon: LayoutGrid },
    { id: 'Change Catalog', label: 'Change Request', icon: FileText }
  ];

  // On desktop: compact rail by default, expands to full width on hover.
  // On mobile: slides in/out full width.
  const isExpanded = isMobile || isHovered;
  const mini = !isExpanded;
  const width = isMobile ? 250 : isHovered ? 250 : 68;

  const handleSelect = (id) => {
    onItemSelect?.(id);
    if (isMobile) onCloseMobile?.();
  };

  const NavButton = ({ item }) => {
    const Icon = item.icon;
    const isActive = activeItem === item.id;
    return (
      <button
        key={item.id}
        onClick={() => handleSelect(item.id)}
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
          backgroundColor: isActive ? '#1E293B' : 'transparent',
          color: isActive ? '#FFFFFF' : '#94A3B8',
          fontWeight: 500,
          fontSize: '0.85rem',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease, color 0.15s ease',
          position: 'relative'
        }}
      >
        <Icon size={18} style={{ color: isActive ? '#FFFFFF' : '#64748B', flexShrink: 0 }} />
        {!mini && (
          <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
        )}
        {!mini && !isActive && Boolean(item.badge) && item.badge > 0 && (
          <span
            style={{
              padding: '0.1rem 0.45rem',
              borderRadius: 'var(--radius-lg)',
              fontSize: '0.7rem',
              fontWeight: 500,
              backgroundColor: 'var(--brand-primary)',
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
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
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

      {/* Management section (Visible to Change Manager, Change Implementer & Admin) */}
      {(() => {
        if (!isAdmin && !isChangeManager && !isChangeImplementer) return null;

        const visibleMgmtItems = [];

        if (isChangeManager || isChangeImplementer || isAdmin) {
          visibleMgmtItems.push({ id: 'My Worklist', label: 'My Worklist', icon: CheckCircle2, badge: worklistCount });
        }

        if (isAdmin) {
          visibleMgmtItems.push({ id: 'Organization Dashboard', label: 'Organization Dashboard', icon: LayoutGrid });
        }

        if (isSuperAdmin) {
          visibleMgmtItems.push({ id: 'Settings', label: 'Settings', icon: Settings });
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
