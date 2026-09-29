import React, { useState, useEffect } from 'react';
import { login, MICROSOFT_LOGIN_URL, fetchMe, saveSession, exchangeSsoCode } from '../lib/auth.lib';
import { useTheme } from '../context/ThemeContext';

export default function LoginPage({ onLogin, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();
  const logoSrc = theme === 'dark' ? '/images/white-stfox-logo.png' : '/images/black-stfox-logo.png';
  const faviconSrc = theme === 'dark' ? '/images/white-favicon.png' : '/images/black-favicon.png';

  // Capture Microsoft SSO callback (a single-use exchange code, never the JWT itself) or error from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoCode = params.get('ssoCode');
    const ssoError = params.get('error');

    if (ssoError) {
      setError(decodeURIComponent(ssoError));
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (ssoCode) {
      setIsLoading(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      exchangeSsoCode(ssoCode)
        .then((ssoToken) => fetchMe(ssoToken).then((user) => ({ ssoToken, user })))
        .then(({ ssoToken, user }) => {
          if (user) {
            const session = { token: ssoToken, user };
            saveSession(session);
            if (onLogin) onLogin(session);
            else if (onLoginSuccess) onLoginSuccess(session);
          } else {
            setError('Failed to retrieve user profile after Microsoft authentication.');
          }
        })
        .catch((err) => {
          setError(err.message || 'SSO authentication failed.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [onLogin, onLoginSuccess]);

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

  const handleMicrosoftSignIn = () => {
    setError('');
    window.location.href = MICROSOFT_LOGIN_URL;
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-6 text-foreground [font-family:var(--font-family)]">

      <div className="flex w-full max-w-[380px] flex-col items-center gap-6">

        {/* Company logo */}
        <div className="mb-3 flex justify-center">
          <img
            src={logoSrc}
            alt="ST FOX"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = faviconSrc;
            }}
            className="block h-[52px] w-auto max-w-full object-contain"
          />
        </div>

        {/* Continue with Microsoft OAuth Button */}
        <button
          type="button"
          onClick={handleMicrosoftSignIn}
          disabled={isLoading}
          className={`flex w-full items-center justify-center gap-3 rounded-[var(--radius-md)] border border-border bg-card px-4 py-[0.85rem] text-[0.925rem] font-semibold text-foreground shadow-[var(--shadow-soft)] [transition:all_0.15s_ease] ${
            isLoading ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {/* 4-Color Microsoft Square Icon */}
          <div className="grid h-4 w-4 shrink-0 grid-cols-2 gap-0.5">
            <div className="h-[7px] w-[7px] bg-[#F25022]" />
            <div className="h-[7px] w-[7px] bg-[#7FBA00]" />
            <div className="h-[7px] w-[7px] bg-[#00A4EF]" />
            <div className="h-[7px] w-[7px] bg-[#FFB900]" />
          </div>
          <span>Sign in with Microsoft</span>
        </button>

        {/* Divider Line */}
        <div className="my-[0.15rem] flex w-full items-center gap-4">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[0.725rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            OR WITH EMAIL
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Email Sign-in Form (Development Email-Only) */}
        <form onSubmit={handleLogin} className="flex w-full flex-col gap-[0.85rem]">
          {error && (
            <div
              role="alert"
              className="w-full rounded-[var(--radius-md)] border border-destructive/45 bg-destructive/12 px-[0.85rem] py-[0.6rem] text-left text-[0.8rem] font-semibold text-destructive"
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
            className="w-full rounded-[var(--radius-md)] border border-border bg-input px-4 py-[0.85rem] text-[0.9rem] text-foreground outline-none [font-family:var(--font-family)]"
          />

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full rounded-[var(--radius-md)] border-none bg-primary px-4 py-[0.85rem] text-[0.95rem] font-semibold text-white shadow-[var(--shadow-soft)] [transition:opacity_0.15s_ease] ${
              isLoading ? 'cursor-not-allowed opacity-70' : 'cursor-pointer opacity-100'
            }`}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

      </div>
    </div>
  );
}
