import React, { useState, useEffect } from 'react';
import { Plus, X, Download } from 'lucide-react';

export default function SettingsPage() {
  const defaultUsers = [
    { id: 'usr-1', name: 'Gauri Shinde', email: 'gauri.shinde@stfox.com', empId: 'EMP-10432', dept: 'IT Operations', role: 'Change Manager', status: 'Enabled' },
    { id: 'usr-2', name: 'Aashini Shah', email: 'aashini.shah@stfox.com', empId: 'EMP-10433', dept: 'Development', role: 'Requester', status: 'Enabled' },
    { id: 'usr-3', name: 'Priya Nair', email: 'priya.nair@stfox.com', empId: 'EMP-10214', dept: 'Product Engineering', role: 'CAB Approver', status: 'Enabled' },
    { id: 'usr-4', name: 'Arjun Mehta', email: 'arjun.mehta@stfox.com', empId: 'EMP-10892', dept: 'Infrastructure', role: 'CAB Approver', status: 'Enabled' },
    { id: 'usr-5', name: 'Rohan Deshmukh', email: 'rohan.d@stfox.com', empId: 'EMP-10305', dept: 'HR Systems', role: 'Requester', status: 'Disabled' }
  ];

  const defaultRoles = [
    { id: 'role-1', name: 'Admin', usersCount: 2, desc: 'Full administrative access across settings, workflows, and catalog items.' },
    { id: 'role-2', name: 'Change Manager', usersCount: 3, desc: 'Can review, route, schedule, and override change requests.' },
    { id: 'role-3', name: 'CAB Approver', usersCount: 8, desc: 'Can sign off or reject change requests assigned to their board.' },
    { id: 'role-4', name: 'Requester', usersCount: 42, desc: 'Can submit change requests and track status in My Requests.' }
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
      category: 'Approvals'
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

  const [activeTab, setActiveTab] = useState('audit');
  const [auditFilter, setAuditFilter] = useState('All activity');
  const [users, setUsers] = useState(defaultUsers);
  const [roles, setRoles] = useState(defaultRoles);
  const [auditLogs, setAuditLogs] = useState(defaultAuditLogs);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Invite User Modal Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    department: '',
    role: 'Admin',
    status: 'Enabled'
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/settings/users`);
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) setUsers(body.data);
        }
      } catch (err) {
        console.warn('Backend API offline, using default users list:', err);
      }
    };
    fetchUsers();
  }, []);

  const handleSaveInviteUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;

    const createdUser = {
      id: `usr-${users.length + 1}`,
      name: newUser.name,
      email: newUser.email,
      empId: `EMP-${10500 + users.length}`,
      dept: newUser.department || 'IT Operations',
      role: newUser.role,
      status: newUser.status
    };

    setUsers(prev => [createdUser, ...prev]);
    setIsInviteModalOpen(false);
    setNewUser({ name: '', email: '', department: '', role: 'Admin', status: 'Enabled' });

    try {
      await fetch('http://localhost:5001/api/dashboard/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createdUser)
      });
    } catch (err) {
      console.warn('Failed to post invited user to backend:', err);
    }
  };

  const auditFilters = ['All activity', 'Change requests', 'Approvals', 'Catalog & workflow', 'User & role changes'];

  const filteredLogs = auditFilter === 'All activity'
    ? auditLogs
    : auditLogs.filter(log => log.category === auditFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Settings
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Users, roles, and system-wide audit history
          </p>
        </div>

        {/* Right Header Actions */}
        {activeTab === 'users' && (
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
        {activeTab === 'roles' && (
          <button style={{ padding: '0.55rem 1.1rem', backgroundColor: '#0D9488', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} />
            <span>Add role</span>
          </button>
        )}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => alert('Exporting Audit Logs to Excel...')}
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
                gap: '0.4rem'
              }}
            >
              <Download size={15} />
              <span>Export Excel</span>
            </button>

            <button
              onClick={() => alert('Exporting Audit Logs to PDF...')}
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
                gap: '0.4rem'
              }}
            >
              <Download size={15} />
              <span>Export PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'users', label: 'Users' },
          { id: 'roles', label: 'Roles' },
          { id: 'audit', label: 'Audit Logs' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
                <th style={{ padding: '0.75rem 0.85rem' }}>DEPARTMENT</th>
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
                  <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-primary)' }}>{u.dept}</td>
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
                    <button style={{ background: 'none', border: 'none', color: '#0D9488', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Manage user</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: ROLES PERMISSIONS */}
      {activeTab === 'roles' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.25rem' }}>
          {roles.map(r => (
            <div
              key={r.id}
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.35rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>{r.name}</h3>
                  <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)', backgroundColor: 'var(--input-bg)', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                    {r.usersCount} assigned users
                  </span>
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '1rem' }}>
                  {r.desc}
                </p>
              </div>

              <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
                <button style={{ background: 'none', border: 'none', color: '#0D9488', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer' }}>Edit permissions →</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
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
                  <th style={{ padding: '0.75rem 1rem' }}>DETAILS</th>
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
                    <td style={{ padding: '0.85rem 1rem', fontSize: '0.835rem', color: 'var(--text-secondary)' }}>
                      {log.details}
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
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.5rem 1.75rem 1rem 1.75rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
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
            <form onSubmit={handleSaveInviteUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem 1.75rem' }}>
              
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

              {/* Department & Role 2-Col Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. IT Operations"
                    value={newUser.department}
                    onChange={(e) => setNewUser(prev => ({ ...prev, department: e.target.value }))}
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
                    <option value="Admin">Admin</option>
                    <option value="Change Manager">Change Manager</option>
                    <option value="CAB Approver">CAB Approver</option>
                    <option value="Requester">Requester</option>
                  </select>
                </div>
              </div>

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

    </div>
  );
}
