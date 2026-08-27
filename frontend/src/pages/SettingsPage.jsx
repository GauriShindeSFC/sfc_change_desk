import React, { useState, useEffect } from 'react';
import { Plus, Download } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('users');

  // Tab 1: Users Data
  const defaultUsers = [
    { id: 'usr-1', name: 'Gauri Shinde', employeeId: 'EMP-10432', department: 'IT Operations', role: 'Change Manager', email: 'gauri.shinde@company.com', status: 'Active', statusBg: '#D1FAE5', statusColor: '#059669', statusDot: '#059669' },
    { id: 'usr-2', name: 'Priya Nair', employeeId: 'EMP-10433', department: 'Software Engineering', role: 'Requester', email: 'priya.nair@company.com', status: 'Active', statusBg: '#D1FAE5', statusColor: '#059669', statusDot: '#059669' },
    { id: 'usr-3', name: 'Arjun Mehta', employeeId: 'EMP-10434', department: 'Cloud Infrastructure', role: 'CAB Approver', email: 'arjun.mehta@company.com', status: 'Active', statusBg: '#D1FAE5', statusColor: '#059669', statusDot: '#059669' },
    { id: 'usr-4', name: 'Sana Iqbal', employeeId: 'EMP-10435', department: 'Cybersecurity', role: 'Admin', email: 'sana.iqbal@company.com', status: 'Active', statusBg: '#D1FAE5', statusColor: '#059669', statusDot: '#059669' },
    { id: 'usr-5', name: 'Rahul Verma', employeeId: 'EMP-10436', department: 'Human Resources', role: 'Requester', email: 'rahul.verma@company.com', status: 'Inactive', statusBg: 'var(--input-bg)', statusColor: 'var(--text-secondary)', statusDot: '#94A0B0' }
  ];

  // Tab 2: Roles Data
  const defaultRoles = [
    { id: 'role-1', name: 'Admin', usersCount: 2, description: 'Full system administration access across all modules, catalog management, user management, and settings.', permissions: ['Manage users', 'Configure workflows', 'Override approvals', 'System audit access'] },
    { id: 'role-2', name: 'Change Manager', usersCount: 5, description: 'Oversees the end to end change management lifecycle, reviews pending CRs, schedules deployment windows.', permissions: ['Create & edit CRs', 'Approve/reject CRs', 'Manage catalog templates', 'View all reports'] },
    { id: 'role-3', name: 'CAB Approver', usersCount: 12, description: 'Member of Change Advisory Board with authority to review, approve, reject, or request information on CRs.', permissions: ['Review assigned CRs', 'Approve/reject CRs', 'Request info (send back)', 'View reports'] },
    { id: 'role-4', name: 'Requester', usersCount: 45, description: 'Standard employee permission to raise change requests, track progress, and update own draft submissions.', permissions: ['Create change requests', 'View own requests', 'Save draft CRs'] }
  ];

  // Tab 3: Audit Logs Data
  const defaultAuditLogs = [
    { id: 'log-1', timestamp: '24 Aug 2026 14:32:10', actor: 'Gauri Shinde', action: 'Created Change Request', ref: 'CR-2049', detail: 'Submitted CR-2049 Upgrade payment-gateway API to v4 for CAB review.' },
    { id: 'log-2', timestamp: '24 Aug 2026 11:15:00', actor: 'Sana Iqbal', action: 'User Permission Updated', ref: 'EMP-10435', detail: 'Assigned Admin role permissions to Sana Iqbal.' },
    { id: 'log-3', timestamp: '23 Aug 2026 16:45:22', actor: 'Arjun Mehta', action: 'CR Approved', ref: 'CR-2048', detail: 'Approved CR-2048 Apply Q3 security patch for prod DB cluster.' },
    { id: 'log-4', timestamp: '22 Aug 2026 09:20:14', actor: 'Gauri Shinde', action: 'Catalog Template Created', ref: 'CAT-09', detail: 'Added new template CAT-09 New Vendor Integration to Change Catalog.' },
    { id: 'log-5', timestamp: '21 Aug 2026 18:10:05', actor: 'Rahul Verma', action: 'CR Sent Back', ref: 'CR-2042', detail: 'Requested additional information on network change justification.' }
  ];

  const [users, setUsers] = useState(defaultUsers);
  const [roles] = useState(defaultRoles);
  const [auditLogs] = useState(defaultAuditLogs);
  const [auditFilter, setAuditFilter] = useState('All activity');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/dashboard/settings/users');
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

  const auditCategories = ['All activity', 'Change requests', 'Approvals', 'Catalog & workflow', 'User & role changes'];

  const filteredLogs = auditFilter === 'All activity'
    ? auditLogs
    : auditLogs.filter(log => {
        if (auditFilter === 'Change requests') return log.action.includes('Created') || log.action.includes('Draft');
        if (auditFilter === 'Approvals') return log.action.includes('Approved') || log.action.includes('Sent Back') || log.action.includes('Rejected');
        if (auditFilter === 'Catalog & workflow') return log.action.includes('Catalog') || log.action.includes('Workflow');
        if (auditFilter === 'User & role changes') return log.action.includes('User') || log.action.includes('Permission') || log.action.includes('Role');
        return true;
      });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Settings & Governance
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Manage users, role permissions, and system audit logs
          </p>
        </div>

        {activeTab === 'users' && (
          <button style={{ padding: '0.55rem 1.1rem', backgroundColor: '#0D9488', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} />
            <span>+ Add user</span>
          </button>
        )}
        {activeTab === 'roles' && (
          <button style={{ padding: '0.55rem 1.1rem', backgroundColor: '#0D9488', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Plus size={16} />
            <span>+ Add role</span>
          </button>
        )}
        {activeTab === 'audit' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={{ padding: '0.5rem 0.9rem', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Download size={14} />
              <span>Export Excel</span>
            </button>
            <button style={{ padding: '0.5rem 0.9rem', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Download size={14} />
              <span>Export PDF</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Settings Tabs */}
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
                padding: '0.5rem 1.1rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? '#0D9488' : 'transparent',
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

      {/* TAB 1: USERS */}
      {activeTab === 'users' && (
        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem 0.85rem' }}>NAME</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>EMPLOYEE ID</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>DEPARTMENT</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>ROLE</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>EMAIL</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>STATUS</th>
                <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.map((usr, idx) => (
                <tr key={usr.id} style={{ borderBottom: idx === users.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{usr.name}</td>
                  <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.825rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{usr.employeeId}</td>
                  <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-primary)' }}>{usr.department}</td>
                  <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: 600 }}>{usr.role}</td>
                  <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{usr.email}</td>
                  <td style={{ padding: '0.75rem 0.85rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.65rem', borderRadius: '99px', backgroundColor: usr.statusBg || '#D1FAE5', color: usr.statusColor || '#059669', fontSize: '0.75rem', fontWeight: 700 }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: usr.statusDot || '#059669' }} />
                      <span>{usr.status}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', color: '#0D9488', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: ROLES */}
      {activeTab === 'roles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {roles.map(role => (
            <div key={role.id} style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{role.name}</h3>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.65rem', borderRadius: '99px', backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {role.usersCount} users assigned
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button style={{ background: 'none', border: 'none', color: '#0D9488', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Edit permissions</button>
                </div>
              </div>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>{role.description}</p>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                {role.permissions.map(perm => (
                  <span key={perm} style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '6px', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontWeight: 500 }}>
                    ✓ {perm}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {auditCategories.map(cat => {
              const isActive = auditFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setAuditFilter(cat)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '99px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: isActive ? '#0D9488' : 'var(--card-bg)',
                    color: isActive ? '#FFFFFF' : 'var(--text-primary)',
                    fontSize: '0.775rem',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem 0.85rem' }}>TIMESTAMP</th>
                  <th style={{ padding: '0.75rem 0.85rem' }}>ACTOR</th>
                  <th style={{ padding: '0.75rem 0.85rem' }}>ACTION</th>
                  <th style={{ padding: '0.75rem 0.85rem' }}>REFERENCE</th>
                  <th style={{ padding: '0.75rem 0.85rem' }}>DETAIL</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => (
                  <tr key={log.id} style={{ borderBottom: idx === filteredLogs.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                    <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>{log.actor}</td>
                    <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.825rem', fontWeight: 600, color: '#0D9488' }}>{log.action}</td>
                    <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{log.ref}</td>
                    <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-primary)' }}>{log.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
