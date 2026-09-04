import React, { useState, useEffect } from 'react';
import { Plus, X, Download } from 'lucide-react';
import { apiFetch } from '../lib/apiFetch';

function SettingsPage({ user }) {
  const isSuperAdmin = user?.roleId === 'role-1' || (user?.role || '').toLowerCase() === 'super admin';
  const isRequester = !isSuperAdmin && (user?.roleId === 'role-4' || user?.role === 'Requester');

  const defaultUsers = [
    { id: 'usr-0', name: 'Ashish SFC', email: 'ashish.sfc@company.com', empId: 'EMP-10001', role: 'Super Admin', status: 'Enabled' },
    { id: 'usr-1', name: 'Gauri Shinde', email: 'gauri.shinde@company.com', empId: 'EMP-10432', role: 'Change Manager', status: 'Enabled' },
    { id: 'usr-2', name: 'Priya Nair', email: 'priya.nair@company.com', empId: 'EMP-10433', role: 'Requester', status: 'Enabled' },
    { id: 'usr-3', name: 'Arjun Mehta', email: 'arjun.mehta@company.com', empId: 'EMP-10434', role: 'Admin', status: 'Enabled' },
    { id: 'usr-4', name: 'Sana Iqbal', email: 'sana.iqbal@company.com', empId: 'EMP-10435', role: 'Super Admin', status: 'Enabled' },
    { id: 'usr-5', name: 'Rahul Verma', email: 'rahul.verma@company.com', empId: 'EMP-10436', role: 'Requester', status: 'Disabled' }
  ];

  const defaultAuditLogs = [
    {
      id: 'log-1',
      timestamp: '26 Aug 2026, 10:42 AM',
      actor: 'Aashini Shah',
      action: 'Submitted change request',
      reference: 'CR-2049',
      details: 'Software Deployment · auto-routed to CAB — Application Board',
      category: 'Change requests'
    },
    {
      id: 'log-2',
      timestamp: '26 Aug 2026, 09:15 AM',
      actor: 'Arjun Mehta',
      action: 'Approved change request',
      reference: 'CR-2052',
      details: 'Rotate SSH keys — all bastion hosts',
      category: 'Approvals'
    },
    {
      id: 'log-3',
      timestamp: '25 Aug 2026, 05:03 PM',
      actor: 'Devika Rao',
      action: 'Modified catalog item',
      reference: 'Server Patching',
      details: 'Updated SLA from 7 to 5 business days',
      category: 'Catalog & workflow'
    },
    {
      id: 'log-4',
      timestamp: '25 Aug 2026, 02:47 PM',
      actor: 'Sana Iqbal',
      action: 'Rejected change request',
      reference: 'CR-2035',
      details: 'Emergency rollback — checkout service v2.3',
      category: 'Rejected'
    },
    {
      id: 'log-5',
      timestamp: '24 Aug 2026, 11:20 AM',
      actor: 'Devika Rao',
      action: 'Updated user status',
      reference: 'Karan Bhatt',
      details: 'Status changed to Disabled',
      category: 'User & role changes'
    },
    {
      id: 'log-6',
      timestamp: '23 Aug 2026, 04:08 PM',
      actor: 'Aashini Shah',
      action: 'Created workflow',
      reference: 'Expedited Workflow',
      details: 'Applied to Emergency Change category',
      category: 'Catalog & workflow'
    },
    {
      id: 'log-7',
      timestamp: '22 Aug 2026, 08:30 AM',
      actor: 'Priya Nair',
      action: 'Submitted change request',
      reference: 'CR-2044',
      details: 'Add VLAN for new Ahmedabad office floor',
      category: 'Change requests'
    }
  ];

  const [activeTab, setActiveTab] = useState(() => {
    const hash = (window.location.hash || '').replace('#', '').toLowerCase();
    return ['users', 'audit'].includes(hash) ? hash : 'users';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = (window.location.hash || '').replace('#', '').toLowerCase();
      if (['users', 'audit'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    window.location.hash = tabId;
  };
  const [auditFilter, setAuditFilter] = useState('All activity');
  const [users, setUsers] = useState(defaultUsers);
  const [auditLogs, setAuditLogs] = useState(defaultAuditLogs);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [categories, setCategories] = useState([
    { id: 'cat-srv', name: 'Server & Infra' },
    { id: 'cat-net', name: 'Network & Connectivity' },
    { id: 'cat-acc', name: 'Access & Security' },
    { id: 'cat-asset', name: 'IT Asset' }
  ]);
  const [newUserCategories, setNewUserCategories] = useState([]);
  const [editingUserCategories, setEditingUserCategories] = useState([]);

  useEffect(() => {
    const fetchCatalogCategories = async () => {
      try {
        const res = await apiFetch('/catalog/categories');
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) setCategories(body.data);
        }
      } catch (err) {
        console.warn('Failed to load categories:', err);
      }
    };
    fetchCatalogCategories();
  }, []);

  const handleOpenManageUser = async (targetUser) => {
    if (isRequester) return; // Block role-4 Requester from opening Manage User modal
    const initialCats = targetUser.categoryIds || [];
    setEditingUser({
      id: targetUser.id,
      name: targetUser.name || '',
      empId: targetUser.empId || targetUser.employeeId || 'EMP-10432',
      role: targetUser.role || 'Change Manager',
      status: targetUser.status || 'Enabled'
    });
    setEditingUserCategories(initialCats);
    try {
      const res = await apiFetch(`/settings/change-manager-categories/${targetUser.id}`);
      if (res.ok) {
        const body = await res.json();
        if (body.data && Array.isArray(body.data)) {
          setEditingUserCategories(body.data.map(d => d.categoryId));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch user categories:', err);
    }
  };

  const handleSaveManageUser = async (e) => {
    if (e) e.preventDefault();
    if (!editingUser) return;

    const updatedUserObj = {
      name: editingUser.name,
      empId: editingUser.empId,
      role: editingUser.role,
      status: editingUser.status
    };

    try {
      await apiFetch(`/settings/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedUserObj)
      });

      if (editingUser.role === 'Change Manager') {
        await apiFetch(`/settings/change-manager-categories/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({ categoryIds: editingUserCategories })
        });
      }

      const usersRes = await apiFetch('/settings/users');
      if (usersRes.ok) {
        const body = await usersRes.json();
        if (body.data && Array.isArray(body.data)) setUsers(body.data);
      }
    } catch (err) {
      console.warn('Failed to update user via API:', err);
    }

    setEditingUser(null);
  };

  // Invite User Modal Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    empId: '',
    role: 'Admin',
    status: 'Enabled'
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRes = await apiFetch('/settings/users');
        if (usersRes.ok) {
          const body = await usersRes.json();
          if (body.data && Array.isArray(body.data)) setUsers(body.data);
        }
      } catch (err) {
        console.warn('Failed to load users from API:', err);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const queryParam = auditFilter && auditFilter !== 'All activity' ? `?filter=${encodeURIComponent(auditFilter)}` : '';
        const auditRes = await apiFetch(`/settings/audit-logs${queryParam}`);
        if (auditRes.ok) {
          const body = await auditRes.json();
          if (body.data && Array.isArray(body.data)) setAuditLogs(body.data);
        }
      } catch (err) {
        console.warn('Failed to fetch audit logs:', err);
      }
    };
    fetchAuditLogs();
  }, [auditFilter]);

  const handleSaveInviteUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;

    const createdUser = {
      id: `usr-${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      empId: newUser.empId || `EMP-${10500 + users.length}`,
      employeeId: newUser.empId || `EMP-${10500 + users.length}`,
      role: newUser.role,
      status: newUser.status
    };

    try {
      const res = await apiFetch('/settings/users', {
        method: 'POST',
        body: JSON.stringify(createdUser)
      });

      let savedUserId = createdUser.id;
      if (res.ok) {
        const body = await res.json();
        if (body.data && body.data.id) savedUserId = body.data.id;
      }

      if (newUser.role === 'Change Manager') {
        await apiFetch(`/settings/change-manager-categories/${savedUserId}`, {
          method: 'PUT',
          body: JSON.stringify({ categoryIds: newUserCategories })
        });
      }

      const usersRes = await apiFetch('/settings/users');
      if (usersRes.ok) {
        const body = await usersRes.json();
        if (body.data && Array.isArray(body.data)) setUsers(body.data);
      }
    } catch (err) {
      console.warn('Failed to post invited user to backend:', err);
      setUsers(prev => [createdUser, ...prev]);
    }

    setIsInviteModalOpen(false);
    setNewUser({ name: '', email: '', empId: '', role: 'Admin', status: 'Enabled' });
    setNewUserCategories([]);
  };

  const handleExportAuditExcel = async () => {
    try {
      const res = await apiFetch('/settings/audit-logs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'excel', filter: auditFilter })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${auditFilter.toLowerCase().replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (err) {
      console.error('Failed to export audit logs to Excel:', err);
    }
  };

  const handleExportAuditPDF = async () => {
    try {
      const res = await apiFetch('/settings/audit-logs/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'pdf', filter: auditFilter })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${auditFilter.toLowerCase().replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (err) {
      console.error('Failed to export audit logs to PDF:', err);
    }
  };

  const auditFilters = ['All activity', 'Change requests', 'Approvals', 'Rejected', 'Catalog & workflow', 'User & role changes'];

  const filteredLogs = auditFilter === 'All activity'
    ? auditLogs
    : auditLogs.filter(log => log.category === auditFilter);

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Access Restricted</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Settings and user management are accessible to Super Admin users only.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Settings
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Users and system-wide audit history
          </p>
        </div>

        {/* Right Header Actions */}
        {isSuperAdmin && activeTab === 'users' && (
          <button
            onClick={() => setIsInviteModalOpen(true)}
            style={{
              padding: '0.55rem 1.1rem',
              backgroundColor: '#0D9488',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 3px rgba(13, 148, 136, 0.2)'
            }}
          >
            <Plus size={16} />
            <span>Invite user</span>
          </button>
        )}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', rowGap: '0.5rem' }}>
            <button
              onClick={handleExportAuditExcel}
              style={{
                padding: '0.55rem 1.1rem',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Download size={15} />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handleExportAuditPDF}
              style={{
                padding: '0.55rem 1.1rem',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap'
              }}
            >
              <Download size={15} />
              <span>Export PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'users', label: 'Users' },
          { id: 'audit', label: 'Audit Logs' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: '0.45rem 1.1rem',
                borderRadius: '99px',
                border: 'none',
                backgroundColor: isActive ? '#10172A' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem 0.85rem' }}>USER</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>EMAIL ID</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>ROLE</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>STATUS</th>
                <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr key={u.id} style={{ borderBottom: idx === users.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{u.name}</td>
                  <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{u.email}</td>
                  <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: 600 }}>{u.role}</td>
                  <td style={{ padding: '0.75rem 0.85rem' }}>
                    <span style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: '99px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: u.status === 'Enabled' ? '#D1FAE5' : 'var(--input-bg)',
                      color: u.status === 'Enabled' ? '#059669' : 'var(--text-secondary)'
                    }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenManageUser(u)}
                      disabled={isRequester}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isRequester ? 'var(--text-secondary)' : '#0D9488',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: isRequester ? 'not-allowed' : 'pointer',
                        opacity: isRequester ? 0.4 : 1
                      }}
                    >
                      Manage user
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Audit Sub-Filter Pills Bar */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {auditFilters.map(af => {
              const isSelected = auditFilter === af;
              return (
                <button
                  key={af}
                  onClick={() => setAuditFilter(af)}
                  style={{
                    padding: '0.4rem 0.95rem',
                    borderRadius: '99px',
                    border: isSelected ? 'none' : '1px solid var(--border-color)',
                    backgroundColor: isSelected ? '#10172A' : 'var(--card-bg)',
                    color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                    fontSize: '0.825rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  {af}
                </button>
              );
            })}
          </div>

          {/* Audit Logs Table */}
          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>TIMESTAMP</th>
                  <th style={{ padding: '0.75rem 1rem' }}>ACTOR</th>
                  <th style={{ padding: '0.75rem 1rem' }}>ACTION</th>
                  <th style={{ padding: '0.75rem 1rem' }}>REFERENCE</th>
                  <th style={{ padding: '0.75rem 1rem' }}>EMPLOYEE EMAIL</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <tr key={log.id} style={{ borderBottom: idx === filteredLogs.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.825rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {log.timestamp}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {log.actor}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.835rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {log.action}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.825rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {log.reference}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.825rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {log.employeeEmail || 'gauri.shinde@stfox.com'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Invite User Modal Dialog */}
      {isInviteModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.75rem 0.75rem 1.75rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                  Invite User
                </h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, marginTop: '0.25rem' }}>
                  Map this user to a defined role
                </p>
              </div>
              <button onClick={() => setIsInviteModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveInviteUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 1.75rem', overflowY: 'auto', flex: 1 }}>
              
              {/* Full name & Email ID 2-Col Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Full name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Neha Kapoor"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Email ID
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. neha.kapoor@stfox.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Employee ID Input */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Employee ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. EMP-10550"
                  value={newUser.empId}
                  onChange={(e) => setNewUser(prev => ({ ...prev, empId: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Role Select */}
              <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Role
                    </label>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>defined under Roles</span>
                  </div>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin">Admin</option>
                    <option value="Change Manager">Change Manager</option>
                    <option value="Requester">Requester</option>
                  </select>
                </div>

              {/* Dynamic Category Assignment Dropdown for Change Manager */}
              {newUser.role === 'Change Manager' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Appointed Categories (Change Manager) *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', backgroundColor: 'var(--input-bg)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    {categories.map((cat) => {
                      const isChecked = newUserCategories.includes(cat.id);
                      return (
                        <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewUserCategories(prev => [...prev, cat.id]);
                              } else {
                                setNewUserCategories(prev => prev.filter(c => c !== cat.id));
                              }
                            }}
                          />
                          <span>{cat.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Status
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {['Enabled', 'Disabled'].map(statusOpt => {
                    const isSelected = newUser.status === statusOpt;
                    return (
                      <button
                        key={statusOpt}
                        type="button"
                        onClick={() => setNewUser(prev => ({ ...prev, status: statusOpt }))}
                        style={{
                          padding: '0.65rem',
                          borderRadius: '8px',
                          border: isSelected ? '1px solid #0D9488' : '1px solid var(--border-color)',
                          backgroundColor: isSelected ? '#E6F4F1' : 'var(--card-bg)',
                          color: isSelected ? '#0D9488' : 'var(--text-primary)',
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer'
                        }}
                      >
                        {statusOpt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    padding: '0.65rem 1.35rem',
                    backgroundColor: '#0D9488',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(13, 148, 136, 0.2)'
                  }}
                >
                  Save user
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
      {/* Edit User Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '540px',
            maxHeight: '90vh',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.75rem 0.75rem 1.75rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Edit User
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Map this user to a defined role
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveManageUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 1.75rem', overflowY: 'auto', flex: 1 }}>
              {/* Row 1: Full name & Employee ID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Full name
                  </label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Employee ID
                  </label>
                  <input
                    type="text"
                    value={editingUser.empId}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, empId: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Role Select */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>Role</label>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>defined under Roles</span>
                </div>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Admin">Admin</option>
                    <option value="Change Manager">Change Manager</option>
                    <option value="Requester">Requester</option>
                  </select>
                </div>

              {/* Dynamic Category Assignment Dropdown for Change Manager */}
              {editingUser.role === 'Change Manager' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Appointed Categories (Change Manager) *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', backgroundColor: 'var(--input-bg)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    {categories.map((cat) => {
                      const isChecked = editingUserCategories.includes(cat.id);
                      return (
                        <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingUserCategories(prev => [...prev, cat.id]);
                              } else {
                                setEditingUserCategories(prev => prev.filter(c => c !== cat.id));
                              }
                            }}
                          />
                          <span>{cat.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status Section */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  Status
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditingUser(prev => ({ ...prev, status: 'Enabled' }))}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: editingUser.status === 'Enabled' ? '1.5px solid #059669' : '1px solid var(--border-color)',
                      backgroundColor: editingUser.status === 'Enabled' ? '#E6F4EA' : 'var(--input-bg)',
                      color: editingUser.status === 'Enabled' ? '#059669' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Enabled
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingUser(prev => ({ ...prev, status: 'Disabled' }))}
                    style={{
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: editingUser.status === 'Disabled' ? '1.5px solid #DC2626' : '1px solid var(--border-color)',
                      backgroundColor: editingUser.status === 'Disabled' ? '#FEE2E2' : 'var(--input-bg)',
                      color: editingUser.status === 'Disabled' ? '#DC2626' : 'var(--text-secondary)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Disabled
                  </button>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  style={{
                    padding: '0.6rem 1.25rem',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.6rem 1.25rem',
                    backgroundColor: '#0D9488',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Save user
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default React.memo(SettingsPage);
