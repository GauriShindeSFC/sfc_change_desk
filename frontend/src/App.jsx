import React, { useState } from 'react';
import LoginPage from './pages/LoginPage';
import Dashboard from './components/Dashboard';

export default function App() {
  const [view, setView] = useState('dashboard');

  return (
    <div className="app-container">
      {view === 'login' ? (
        <LoginPage onLoginSuccess={() => setView('dashboard')} />
      ) : (
        <Dashboard onLogout={() => setView('login')} />
      )}
    </div>
  );
}
