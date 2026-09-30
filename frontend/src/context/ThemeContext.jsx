import React, { createContext, useContext, useEffect } from 'react';

const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    try {
      localStorage.setItem('changedesk.theme', 'light');
    } catch {
      /* ignore */
    }
  }, []);

  return <ThemeCtx.Provider value={{ theme: 'light', toggle: () => {} }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
