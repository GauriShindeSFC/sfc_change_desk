import React, { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import Dashboard from './components/Dashboard';
import ApprovalActionPage from './pages/ApprovalActionPage';
import { getSession, saveSession, clearSession, fetchMe } from './lib/auth';

export default function App() {
  const [session, setSession] = useState(() => getSession());

  const isApprovalAction =
    typeof window !== 'undefined' &&
    (window.location.pathname.includes('approval-action') ||
     new URLSearchParams(window.location.search).has('token'));

  // On load, re-validate the stored token and refresh the user record.
  useEffect(() => {
    if (!session || isApprovalAction) return;
    fetchMe().then((user) => {
      if (user) {
        const next = { ...getSession(), user };
        saveSession(next);
        setSession(next);
      }
    });
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApprovalAction]);

  const handleLogin = (nextSession) => {
    saveSession(nextSession);
    setSession(nextSession);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
  };

  if (isApprovalAction) {
    return <ApprovalActionPage />;
  }

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

