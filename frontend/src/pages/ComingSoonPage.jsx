import React from 'react';

export default function ComingSoonPage() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 160px)',
        width: '100%'
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0.45rem 1rem',
          backgroundColor: '#F1F5F9',
          color: '#64748B',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          fontSize: '0.85rem',
          fontWeight: 600,
          letterSpacing: '0.02em',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
        }}
      >
        Coming Soon
      </div>
    </div>
  );
}
