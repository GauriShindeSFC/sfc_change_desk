import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (onLoginSuccess) onLoginSuccess();
    }, 500);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDarkMode ? '#101520' : '#F8FAFC',
      color: isDarkMode ? '#FFFFFF' : '#0F172A',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      padding: '1.5rem',
      position: 'relative'
    }}>
      
      {/* Top-Right Corner Theme Toggle Icon Button (Rounded Rectangle matching Screenshot 1) */}
      <button
        type="button"
        onClick={() => setIsDarkMode(prev => !prev)}
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        style={{
          position: 'absolute',
          top: '1.5rem',
          right: '1.5rem',
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid #E2E8F0',
          color: isDarkMode ? '#FFFFFF' : '#0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: isDarkMode ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)',
          outline: 'none'
        }}
      >
        {isDarkMode ? <Sun size={20} strokeWidth={2} /> : <Moon size={20} strokeWidth={2} />}
      </button>

      <div style={{
        width: '100%',
        maxWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem'
      }}>
        
        {/* Razor-Sharp Resolution-Independent Vector ST FOX Logo (Matching Screenshot 2) */}
        <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
          {isDarkMode ? (
            <svg width="240" height="52" viewBox="0 0 240 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(0, 2)">
                {/* Origami Polygon Fox Mark */}
                <path d="M4 36L24 46L44 14L24 4L4 36Z" fill="#FFFFFF" />
                <path d="M24 4L44 14L24 24L4 36L24 4Z" fill="#E2E8F0" opacity="0.85" />
                
                {/* ST Text with Square Dot Below T */}
                <text x="56" y="36" fontFamily="'Inter', system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="34" fill="#FFFFFF" letterSpacing="0.02em">S</text>
                <text x="78" y="36" fontFamily="'Inter', system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="34" fill="#FFFFFF" letterSpacing="0.02em">T</text>
                <rect x="85" y="39" width="4" height="4" fill="#FFFFFF" rx="0.5" />
                
                {/* FOX Text */}
                <text x="108" y="36" fontFamily="'Inter', system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="34" fill="#FFFFFF" letterSpacing="0.04em">FOX</text>
              </g>
            </svg>
          ) : (
            <svg width="240" height="52" viewBox="0 0 240 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(0, 2)">
                {/* Origami Polygon Fox Mark */}
                <path d="M4 36L24 46L44 14L24 4L4 36Z" fill="#0F172A" />
                <path d="M24 4L44 14L24 24L4 36L24 4Z" fill="#334155" opacity="0.85" />
                
                {/* ST Text with Square Dot Below T */}
                <text x="56" y="36" fontFamily="'Inter', system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="34" fill="#0F172A" letterSpacing="0.02em">S</text>
                <text x="78" y="36" fontFamily="'Inter', system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="34" fill="#0F172A" letterSpacing="0.02em">T</text>
                <rect x="85" y="39" width="4" height="4" fill="#0F172A" rx="0.5" />
                
                {/* FOX Text */}
                <text x="108" y="36" fontFamily="'Inter', system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="34" fill="#0F172A" letterSpacing="0.04em">FOX</text>
              </g>
            </svg>
          )}
        </div>

        {/* Continue with Microsoft OAuth Button */}
        <button
          type="button"
          onClick={handleLogin}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.85rem 1rem',
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid #CBD5E1',
            borderRadius: '10px',
            color: isDarkMode ? '#FFFFFF' : '#0F172A',
            fontSize: '0.925rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            boxShadow: isDarkMode ? '0 2px 6px rgba(0, 0, 0, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.08)'
          }}
        >
          {/* 4-Color Microsoft Square Icon */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', width: '16px', height: '16px', flexShrink: 0 }}>
            <div style={{ backgroundColor: '#F25022', width: '7px', height: '7px' }} />
            <div style={{ backgroundColor: '#7FBA00', width: '7px', height: '7px' }} />
            <div style={{ backgroundColor: '#00A4EF', width: '7px', height: '7px' }} />
            <div style={{ backgroundColor: '#FFB900', width: '7px', height: '7px' }} />
          </div>
          <span>Continue with Microsoft</span>
        </button>

        {/* Divider Line */}
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          margin: '0.15rem 0'
        }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1' }} />
          <span style={{ fontSize: '0.725rem', fontWeight: 600, letterSpacing: '0.08em', color: isDarkMode ? '#64748B' : '#64748B', textTransform: 'uppercase' }}>
            OR WITH EMAIL
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : '#CBD5E1' }} />
        </div>

        {/* Email Input & Sign-in Code Form */}
        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <input
            type="email"
            placeholder="you@stfox.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
              border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid #CBD5E1',
              borderRadius: '10px',
              fontSize: '0.9rem',
              color: isDarkMode ? '#FFFFFF' : '#0F172A',
              outline: 'none'
            }}
          />

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              backgroundColor: isDarkMode ? '#174052' : '#0D9488',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
            }}
          >
            {isLoading ? 'Sending sign-in code...' : 'Email me a sign-in code'}
          </button>
        </form>

        {/* Footer Disclaimer */}
        <p style={{
          fontSize: '0.775rem',
          color: isDarkMode ? '#64748B' : '#64748B',
          textAlign: 'center',
          lineHeight: 1.45,
          margin: 0,
          marginTop: '0.25rem',
          maxWidth: '340px'
        }}>
          By continuing you agree to the terms of internal use. For access issues, contact your IT administrator.
        </p>

      </div>
    </div>
  );
}
