import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import Dashboard from './components/Dashboard';
import { getSession, saveSession, clearSession, fetchMe } from './lib/auth';

export default function App() {
  const [session, setSession] = useState(() => getSession());

  // On load, re-validate the stored token and refresh the user record.
  useEffect(() => {
    if (!session) return;
    fetchMe().then((user) => {
      if (user) {
        const next = { ...getSession(), user };
        saveSession(next);
        setSession(next);
      } else {
        clearSession();
        setSession(null);
      }
    });
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = (nextSession) => {
    saveSession(nextSession);
    setSession(nextSession);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
  };

  return (
    <div className="app-container">
      {session ? (
        <Dashboard user={session.user} onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
}
