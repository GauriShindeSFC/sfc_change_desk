import React, { useState } from 'react';
import Sidebar from './layout/Sidebar';
import Header from './layout/Header';
import DashboardPage from '../pages/DashboardPage';
import MyRequestsPage from '../pages/MyRequestsPage';
import ChangeCatalogPage from '../pages/ChangeCatalogPage';
import ChangeRequestFormPage from '../pages/ChangeRequestFormPage';
import MyWorklistPage from '../pages/MyWorklistPage';
import SettingsPage from '../pages/SettingsPage';
import CatalogueManagementPage from '../pages/CatalogueManagementPage';
import ReportsPage from '../pages/ReportsPage';

export default function Dashboard({ onLogout }) {
  const [activeItem, setActiveItem] = useState('Dashboard');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--page-bg)', width: '100%' }}>
      {/* Left Sidebar Panel */}
      <Sidebar activeItem={activeItem} onItemSelect={setActiveItem} />

      {/* Main Workspace Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <Header activeRoute={activeItem} userInitials="GS" onLogout={onLogout} />

        {/* Workspace Content Canvas */}
        <main style={{ flex: 1, padding: '1.25rem 1.5rem' }}>
          {activeItem === 'Dashboard' ? (
            <DashboardPage onNavigate={setActiveItem} />
          ) : activeItem === 'My Requests' ? (
            <MyRequestsPage onNavigate={setActiveItem} />
          ) : activeItem === 'Change Catalog' ? (
            <ChangeCatalogPage onNavigate={setActiveItem} />
          ) : activeItem === 'Change Request' ? (
            <ChangeRequestFormPage onNavigate={setActiveItem} />
          ) : activeItem === 'My Worklist' ? (
            <MyWorklistPage onNavigate={setActiveItem} />
          ) : activeItem === 'Settings' ? (
            <SettingsPage onNavigate={setActiveItem} />
          ) : activeItem === 'Catalogue Management' ? (
            <CatalogueManagementPage onNavigate={setActiveItem} />
          ) : activeItem === 'Reports' ? (
            <ReportsPage onNavigate={setActiveItem} />
          ) : (
            <div style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {activeItem}
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveItem('Dashboard')}
                  style={{
                    padding: '0.45rem 0.85rem',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  ← Back to Dashboard
                </button>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Viewing items for <strong>{activeItem}</strong>.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
