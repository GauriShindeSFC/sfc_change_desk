import React from 'react';
import {
  LayoutGrid,
  Menu,
  Plus,
  FileText,
  CheckCircle2,
  TrendingUp,
  Sun,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const TOP_NAV = [
  { id: 'Dashboard', label: 'Dashboard', icon: LayoutGrid },
  { id: 'Change Catalog', label: 'Change Catalog', icon: Menu },
  { id: 'Change Request', label: 'Change Request', icon: Plus },
  { id: 'My Requests', label: 'My Requests', icon: FileText, badge: 6 },
  { id: 'Organization worklist', label: 'Organization worklist', icon: CheckCircle2, badge: 4 }
];

const MANAGEMENT_NAV = [
  { id: 'Catalogue Management', label: 'Catalogue Management', icon: Menu },
  { id: 'Reports', label: 'Reports', icon: TrendingUp },
  { id: 'Settings', label: 'Settings', icon: Sun }
];

export default function Sidebar({
  activeItem,
  onItemSelect,
  user,
  isMobile = false,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  myRequestsCount = 6,
  worklistCount = 4
}) {
  const topNavItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'Change Catalog', label: 'Change Catalog', icon: Menu },
    { id: 'Change Request', label: 'Change Request', icon: Plus },
    { id: 'My Requests', label: 'My Requests', icon: FileText, badge: myRequestsCount },
    { id: 'Organization worklist', label: 'Organization worklist', icon: CheckCircle2, badge: worklistCount }
  ];
  // On mobile the rail is always full width; it just slides in/out.
  const mini = collapsed && !isMobile;
  const width = isMobile ? 250 : mini ? 68 : 250;

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
          fontWeight: isActive ? 700 : 500,
          fontSize: '0.85rem',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease, color 0.15s ease',
          position: 'relative'
        }}
      >
        <Icon size={18} style={{ color: isActive ? '#0D9488' : '#64748B', flexShrink: 0 }} />
        {!mini && (
          <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
        )}
        {!mini && !isActive && Boolean(item.badge) && item.badge > 0 && (
          <span
            style={{
              padding: '0.1rem 0.45rem',
              borderRadius: '99px',
              fontSize: '0.7rem',
              fontWeight: 700,
              backgroundColor: '#0D9488',
              color: '#FFFFFF'
            }}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const iconBtnStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    color: '#94A3B8',
    cursor: 'pointer',
    flexShrink: 0
  };

  const aside = (
    <aside
      style={{
        width: `${width}px`,
        backgroundColor: '#0F172A',
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
        transition: 'transform 0.22s ease, width 0.16s ease',
        overflowX: 'hidden',
        overflowY: 'auto',
        padding: mini ? '1.25rem 0.6rem' : '1.25rem 0.85rem',
        flexShrink: 0,
        userSelect: 'none',
        borderRight: '1px solid #1E293B'
      }}
    >
      {/* Brand + controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: mini ? '0.25rem 0 1.5rem 0' : '0.25rem 0.2rem 1.5rem 0.4rem',
          justifyContent: mini ? 'center' : 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
          <img
            src="/images/white-favicon.png"
            alt="Logo"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/images/Favicon.png';
            }}
            style={{ width: '32px', height: '32px', objectFit: 'contain', display: 'block', flexShrink: 0 }}
          />
          {!mini && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 800,
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
                  fontWeight: 700,
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

        {isMobile ? (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            style={iconBtnStyle}
          >
            <X size={16} />
          </button>
        ) : (
          !mini && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              style={iconBtnStyle}
            >
              <ChevronLeft size={16} />
            </button>
          )
        )}
      </div>

      {mini && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          style={{ ...iconBtnStyle, alignSelf: 'center', marginBottom: '0.75rem' }}
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Main nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {topNavItems.map((item) => (
          <NavButton key={item.id} item={item} />
        ))}
      </nav>

      {/* Management section */}
      <div
        style={{
          fontSize: '0.6875rem',
          fontWeight: 700,
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
        {MANAGEMENT_NAV.map((item) => (
          <NavButton key={item.id} item={item} />
        ))}
      </nav>

      {/* User footer */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: '1rem',
          borderTop: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          justifyContent: mini ? 'center' : 'flex-start',
          paddingLeft: mini ? 0 : '0.35rem'
        }}
      >
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: '#27354A',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
            flexShrink: 0
          }}
        >
          {user?.initials || 'U'}
        </div>
        {!mini && (
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#F1F5F9',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {user?.name || 'Unknown user'}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
              {user?.role || user?.department || '—'}
            </span>
          </div>
        )}
      </div>
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
  backgroundColor: '#0F172A',
  color: '#94A3B8',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0
};
