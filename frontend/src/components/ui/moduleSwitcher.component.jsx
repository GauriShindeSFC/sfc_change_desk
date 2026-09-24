import React from 'react';
import { FileText, IndianRupee, Plane } from 'lucide-react';

export const MODULES = [
  { id: 'change_request', label: 'Change Request', icon: FileText, desc: 'IT & Infra Changes' },
  { id: 'prespend', label: 'Pre-Spend Request', icon: IndianRupee, desc: 'Budget & Purchases' },
  { id: 'travel', label: 'Travel Desk', icon: Plane, desc: 'Flights & Stays' }
];

export default function ModuleSwitcher({
  activeModule = 'change_request',
  onModuleChange,
  counts = {},
  pendingCounts = {},
  allowedModules = null // array of module IDs, or null for all
}) {
  const visibleModules = allowedModules
    ? MODULES.filter(m => allowedModules.includes(m.id))
    : MODULES;

  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem',
        backgroundColor: 'var(--input-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        gap: '0.25rem',
        width: 'fit-content',
        maxWidth: '100%',
        overflowX: 'auto'
      }}
    >
      {visibleModules.map(m => {
        const Icon = m.icon;
        const isSelected = activeModule === m.id;
        const count = counts[m.id];

        return (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onModuleChange?.(m.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 0.95rem',
              borderRadius: '7px',
              border: isSelected ? '1px solid var(--border-color)' : '1px solid transparent',
              backgroundColor: isSelected ? 'var(--card-bg)' : 'transparent',
              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: isSelected ? 600 : 500,
              fontSize: '0.825rem',
              cursor: 'pointer',
              boxShadow: isSelected ? '0 1px 3px rgba(0, 0, 0, 0.06)' : 'none',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <Icon
              size={15}
              style={{
                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                flexShrink: 0
              }}
            />
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              {m.label}
              {Boolean(pendingCounts && pendingCounts[m.id] > 0) && (
                <span
                  title={`${pendingCounts[m.id]} pending request${pendingCounts[m.id] > 1 ? 's' : ''}`}
                  style={{
                    width: '6.5px',
                    height: '6.5px',
                    borderRadius: '50%',
                    backgroundColor: '#D97706',
                    display: 'inline-block',
                    flexShrink: 0
                  }}
                />
              )}
            </span>
            {count !== undefined && count !== null && (
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.05rem 0.4rem',
                  borderRadius: '9999px',
                  backgroundColor: isSelected ? 'var(--input-bg)' : 'rgba(0,0,0,0.06)',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: 600
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
