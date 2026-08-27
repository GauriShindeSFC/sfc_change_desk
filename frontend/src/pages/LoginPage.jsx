import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { login } from '../lib/auth';

export default function LoginPage({ onLogin, onLoginSuccess }) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const session = await login(email.trim(), password);
      if (onLogin) onLogin(session);
      else if (onLoginSuccess) onLoginSuccess(session);
    } catch (err) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setIsLoading(false);
    }
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
        
        {/* Company logo */}
        <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
          <img
            src={isDarkMode ? '/images/white-stfox-logo.png' : '/images/black-stfox-logo.png'}
            alt="ST FOX"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = isDarkMode ? '/images/white-favicon.png' : '/images/black-favicon.png';
            }}
            style={{ height: '52px', width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
          />
        </div>

        {/* Continue with Microsoft OAuth Button (placeholder — SSO wiring pending) */}
        <button
          type="button"
          disabled
          title="Microsoft sign-in will be enabled soon"
          style={{
            width: '100%',
            padding: '0.85rem 1rem',
            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid #CBD5E1',
            borderRadius: '10px',
            color: isDarkMode ? '#FFFFFF' : '#0F172A',
            fontSize: '0.925rem',
            fontWeight: 600,
            cursor: 'not-allowed',
            opacity: 0.6,
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
          <span>Continue with Microsoft (coming soon)</span>
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

        {/* Email + Password Sign-in Form */}
        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {error && (
            <div
              role="alert"
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: '10px',
                backgroundColor: isDarkMode ? 'rgba(220, 38, 38, 0.12)' : '#FEF2F2',
                border: '1px solid ' + (isDarkMode ? 'rgba(248, 113, 113, 0.4)' : '#FCA5A5'),
                color: isDarkMode ? '#FCA5A5' : '#B91C1C',
                fontSize: '0.8rem',
                fontWeight: 600,
                textAlign: 'left'
              }}
            >
              {error}
            </div>
          )}

          <input
            type="email"
            required
            autoComplete="email"
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

          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
            }}
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
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

        <p style={{ fontSize: '0.72rem', color: isDarkMode ? '#475569' : '#94A3B8', textAlign: 'center', margin: 0 }}>
          Demo: <strong>gauri.shinde@company.com</strong> · <strong>changedesk123</strong>
        </p>

      </div>
    </div>
  );
}
