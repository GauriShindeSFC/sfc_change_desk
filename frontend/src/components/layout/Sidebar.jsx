import React from 'react';
import { 
  LayoutGrid, 
  Menu, 
  Plus, 
  FileText, 
  CheckCircle2, 
  TrendingUp, 
  Sun,
  Settings as SettingsIcon
} from 'lucide-react';

export default function Sidebar({ activeItem, onItemSelect }) {
  const topNavItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'Change Catalog', label: 'Change Catalog', icon: Menu },
    { id: 'Change Request', label: 'Change Request', icon: Plus },
    { id: 'My Requests', label: 'My Requests', icon: FileText, badge: 6 },
    { id: 'Organization worklist', label: 'Organization worklist', icon: CheckCircle2, badge: 4 },
  ];

  const managementItems = [
    { id: 'Catalogue Management', label: 'Catalogue Management', icon: Menu },
    { id: 'Reports', label: 'Reports', icon: TrendingUp },
    { id: 'Settings', label: 'Settings', icon: Sun },
  ];

  return (
    <aside style={{
      width: '230px',
      backgroundColor: '#0F172A',
      color: '#A0AEC0',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      height: '100vh',
      position: 'sticky',
      top: 0,
      overflow: 'hidden',
      padding: '1.25rem 0.85rem',
      flexShrink: 0,
      userSelect: 'none',
      borderRight: '1px solid #1E293B'
    }}>
      
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.25rem 0.5rem 1.75rem 0.5rem' }}>
        <img
          src="/images/white-favicon.png"
          alt="Logo"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/images/Favicon.png';
          }}
          style={{
            width: '34px',
            height: '34px',
            objectFit: 'contain',
            display: 'block',
            flexShrink: 0
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
            ChangeDesk
          </span>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', marginTop: '0.15rem' }}>
            IT CHANGE MGMT
          </span>
        </div>
      </div>

      {/* Navigation Section 1: Main */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {topNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onItemSelect && onItemSelect(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? '#1E293B' : 'transparent',
                color: isActive ? '#FFFFFF' : '#94A3B8',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative'
              }}
            >
              <Icon 
                size={17} 
                color={isActive ? '#0D9488' : '#64748B'} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{
                  backgroundColor: '#1E293B',
                  color: '#94A3B8',
                  borderRadius: '99px',
                  padding: '0.1rem 0.5rem',
                  fontSize: '0.725rem',
                  fontWeight: 700
                }}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Navigation Section 2: MANAGEMENT Header */}
      <div style={{
        fontSize: '0.6875rem',
        fontWeight: 700,
        color: '#475569',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        margin: '1.5rem 0 0.5rem 0.85rem'
      }}>
        MANAGEMENT
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
        {managementItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onItemSelect && onItemSelect(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? '#1E293B' : 'transparent',
                color: isActive ? '#FFFFFF' : '#94A3B8',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Icon 
                size={17} 
                color={isActive ? '#0D9488' : '#64748B'} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span style={{ flex: 1 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom User Profile Footer */}
      <div style={{
        marginTop: 'auto',
        paddingTop: '1rem',
        borderTop: '1px solid #1E293B',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        paddingLeft: '0.35rem'
      }}>
        <div style={{
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
        }}>
          GS
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F1F5F9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Gauri Shinde
          </span>
          <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
            IT Operations
          </span>
        </div>
      </div>

    </aside>
  );
}
