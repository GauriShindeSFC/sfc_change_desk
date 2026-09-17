import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { login } from '../lib/auth.lib';

export default function LoginPage({ onLogin, onLoginSuccess }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('changedesk.theme') !== 'light';
    } catch {
      return true;
    }
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    try {
      localStorage.setItem('changedesk.theme', isDarkMode ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [isDarkMode]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const session = await login(email.trim());
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
      backgroundColor: 'var(--page-bg)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-family)',
      padding: '1.5rem',
      position: 'relative'
    }}>

      {/* Top-Right Corner Theme Toggle Icon Button */}
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
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-soft)',
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
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '0.925rem',
            fontWeight: 600,
            cursor: 'not-allowed',
            opacity: 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            boxShadow: 'var(--shadow-soft)'
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
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          <span style={{ fontSize: '0.725rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            OR WITH EMAIL
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
        </div>

        {/* Email Sign-in Form (Development Email-Only) */}
        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {error && (
            <div
              role="alert"
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'color-mix(in srgb, var(--error-color) 12%, transparent)',
                border: '1px solid color-mix(in srgb, var(--error-color) 45%, transparent)',
                color: 'var(--error-color)',
                fontSize: '0.8rem',
                fontWeight: 600,
                textAlign: 'left'
              }}
            >
              {error}
            </div>
          )}

          <input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@stfox.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font-family)',
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--brand-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.95rem',
              fontFamily: 'var(--font-family)',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              boxShadow: 'var(--shadow-card)'
            }}
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {/* Footer Disclaimer */}
        <p style={{
          fontSize: '0.775rem',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          lineHeight: 1.45,
          margin: 0,
          marginTop: '0.25rem',
          maxWidth: '340px'
        }}>
          By continuing you agree to the terms of internal use. For access issues, contact your IT administrator.
        </p>

        <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
          Development login: Enter any registered directory email
        </p>

      </div>
    </div>
  );
}
