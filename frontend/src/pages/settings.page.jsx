import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Download } from 'lucide-react';
import FilterBar from '../components/ui/filterBar.component';
import { ExportButtonGroup, LoadingSpinner, Pagination } from '../components/ui/primitives.component';
import { apiFetch } from '../lib/apiFetch.lib';
import { useToast } from '../context/ToastContext';

/** Cleanly format raw SQL/ISO timestamps into '21 Sep 2026, 12:48 PM' (showing date, hour, and minute only) */
const formatAuditTimestamp = (raw) => {
  if (!raw) return '—';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      // If it's already a formatted string like '26 Aug 2026, 10:42 AM', return as-is or strip milliseconds
      return String(raw).replace(/\.\d{3}\s*\+00:00/i, '').replace(/:\d{2}\.\d{3}/i, '');
    }
    const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day}, ${time}`;
  } catch {
    return String(raw);
  }
};

function SettingsPage({ user }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isSuperAdmin = user?.roleId === 'role-1' || (user?.role || '').toLowerCase() === 'super admin';
  const isRequester = !isSuperAdmin && (user?.roleId === 'role-4' || user?.role === 'Requester');

  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  const defaultUsers = [];

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
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Pagination states
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(10);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);

  useEffect(() => {
    setUsersPage(1);
  }, [activeTab]);

  useEffect(() => {
    setAuditPage(1);
  }, [auditFilter, activeTab]);

  const defaultCategoriesList = [
    { id: 'cat-srv', name: 'Server & Infra' },
    { id: 'cat-net', name: 'Network & Connectivity' },
    { id: 'cat-acc', name: 'Access & Security' },
    { id: 'cat-asset', name: 'IT Asset' }
  ];

  const [newUserCategories, setNewUserCategories] = useState([]);
  const [editingUserCategories, setEditingUserCategories] = useState([]);

  const { data: categoriesData } = useQuery({
    queryKey: ['settings-categories'],
    enabled: activeTab === 'users',
    queryFn: async () => {
      const res = await apiFetch('/catalog/categories');
      if (!res.ok) return null;
      const body = await res.json();
      return body.data && Array.isArray(body.data) ? body.data : null;
    }
  });
  const categories = categoriesData || defaultCategoriesList;

  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['settings-users'],
    enabled: activeTab === 'users',
    queryFn: async () => {
      const res = await apiFetch('/settings/users');
      if (!res.ok) return null;
      const body = await res.json();
      return body.data && Array.isArray(body.data) ? body.data : null;
    }
  });
  const users = usersData || defaultUsers;

  const { data: auditLogsData, isLoading: isLoadingAuditLogs } = useQuery({
    queryKey: ['settings-audit-logs', auditFilter],
    enabled: activeTab === 'audit',
    queryFn: async () => {
      const queryParam = auditFilter && auditFilter !== 'All activity' ? `?filter=${encodeURIComponent(auditFilter)}` : '';
      const res = await apiFetch(`/settings/audit-logs${queryParam}`);
      if (!res.ok) return [];
      const body = await res.json();
      return body.data && Array.isArray(body.data) ? body.data : [];
    }
  });
  const auditLogs = auditLogsData || [];
  const ROLE_TO_ID = {
    'Super Admin': 'role-1',
    'Change Desk Admin': 'role-2-change',
    'Pre-Spend Admin': 'role-2-prespend',
    'Travel Desk Admin': 'role-2-travel',
    'Change Manager': 'role-3',
    'Change Implementer': 'role-5',
    'Board Member': 'role-6'
  };

  const ALL_ASSIGNABLE_ROLES = [
    'Change Desk Admin',
    'Pre-Spend Admin',
    'Travel Desk Admin',
    'Change Manager',
    'Change Implementer',
    'Board Member',
    'Super Admin'
  ];

  const handleOpenManageUser = async (targetUser) => {
    if (isRequester) return;
    const initialCats = targetUser.categoryIds || [];
    
    // Extract existing roles
    const existingRoles = Array.isArray(targetUser.roles) && targetUser.roles.length > 0
      ? targetUser.roles.map(r => typeof r === 'string' ? r : r.roleName || r.name).filter(Boolean)
      : [targetUser.role || 'Change Desk Admin'];

    setEditingUser({
      id: targetUser.id,
      name: targetUser.name || '',
      empId: targetUser.empId || targetUser.employeeId || '',
      roles: existingRoles,
      selectedRoleToAdd: ALL_ASSIGNABLE_ROLES[0]
    });
    setEditingUserCategories(initialCats);
    setIsLoadingCategories(true);
    try {
      const hasCI = existingRoles.includes('Change Implementer');
      const endpoint = hasCI
        ? `/settings/change-implementer-categories/${targetUser.id}`
        : `/settings/change-manager-categories/${targetUser.id}`;
      const res = await apiFetch(endpoint);
      if (res.ok) {
        const body = await res.json();
        if (body.data && Array.isArray(body.data) && body.data.length > 0) {
          setEditingUserCategories(body.data.map(d => d.categoryId));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch user categories:', err);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleSaveManageUser = async (e) => {
    if (e) e.preventDefault();
    if (!editingUser || isSavingUser) return;

    const assignedRoles = editingUser.roles && editingUser.roles.length > 0
      ? editingUser.roles
      : ['Change Desk Admin'];

    setIsSavingUser(true);

    const primaryRoleName = assignedRoles[0];
    const roleId = ROLE_TO_ID[primaryRoleName] || 'role-2-change';
    const hasCM = assignedRoles.includes('Change Manager');
    const hasCI = assignedRoles.includes('Change Implementer');
    const categoryIds = (hasCM || hasCI) ? editingUserCategories : [];

    const updatedUserObj = {
      name: editingUser.name,
      empId: editingUser.empId,
      role: primaryRoleName,
      roleId,
      roles: assignedRoles,
      categoryIds
    };

    try {
      const res = await apiFetch(`/settings/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedUserObj)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Failed to update user (${res.status})`);
      }

      if (hasCM) {
        await apiFetch(`/settings/change-manager-categories/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({ categoryIds: editingUserCategories })
        }).catch(err => console.warn('Failed to update CM categories:', err));
      }
      if (hasCI) {
        await apiFetch(`/settings/change-implementer-categories/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({ categoryIds: editingUserCategories })
        }).catch(err => console.warn('Failed to update CI categories:', err));
      }

      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
      toast.success('User changes saved successfully');
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to update user via API:', err);
      toast.error(`Error updating user: ${err.message}`);
    } finally {
      setIsSavingUser(false);
    }
  };

  // Invite User Modal Form State
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    empId: '',
    roles: ['Change Desk Admin'],
    selectedRoleToAdd: ALL_ASSIGNABLE_ROLES[0]
  });

  const handleSaveInviteUser = async (e) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;

    const assignedRoles = newUser.roles && newUser.roles.length > 0
      ? newUser.roles
      : ['Change Desk Admin'];

    const primaryRoleName = assignedRoles[0];
    const roleId = ROLE_TO_ID[primaryRoleName] || 'role-2-change';
    const hasCM = assignedRoles.includes('Change Manager');
    const hasCI = assignedRoles.includes('Change Implementer');
    const categoryIds = (hasCM || hasCI) ? newUserCategories : [];

    const invitePayload = {
      name: newUser.name,
      email: newUser.email,
      empId: newUser.empId || undefined,
      employeeId: newUser.empId || undefined,
      role: primaryRoleName,
      roleId,
      roles: assignedRoles,
      categoryIds,
      status: newUser.status
    };

    try {
      const res = await apiFetch('/settings/users', {
        method: 'POST',
        body: JSON.stringify(invitePayload)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Failed to invite user (${res.status})`);
      }

      const body = await res.json();
      const savedUser = body.data;
      const savedUserId = savedUser?.id || savedUser?.userKey;

      if (hasCM && savedUserId && newUserCategories.length > 0) {
        await apiFetch(`/settings/change-manager-categories/${savedUserId}`, {
          method: 'PUT',
          body: JSON.stringify({ categoryIds: newUserCategories })
        }).catch(() => {});
      }
      if (hasCI && savedUserId && newUserCategories.length > 0) {
        await apiFetch(`/settings/change-implementer-categories/${savedUserId}`, {
          method: 'PUT',
          body: JSON.stringify({ categoryIds: newUserCategories })
        }).catch(() => {});
      }

      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
      toast.success('User invited successfully');
      setIsInviteModalOpen(false);
      setNewUser({
        name: '',
        email: '',
        empId: '',
        roles: ['Change Desk Admin'],
        selectedRoleToAdd: ALL_ASSIGNABLE_ROLES[0]
      });
      setNewUserCategories([]);
    } catch (err) {
      console.error('Failed to invite user via API:', err);
      toast.error(`Error inviting user: ${err.message}`);
    }
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

  const auditFilters = ['All activity', 'Change requests', 'Approvals', 'Rejected', 'User & role changes'];

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Access Restricted</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Settings and user management are accessible to Super Admin users only.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
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
              backgroundColor: 'var(--brand-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
            }}
          >
            <Plus size={16} />
            <span>Invite user</span>
          </button>
        )}
        {activeTab === 'audit' && (
          <ExportButtonGroup
            onExportCsv={handleExportAuditExcel}
            onExportPdf={handleExportAuditPDF}
            csvLabel="Export CSV"
            pdfLabel="Export PDF"
          />
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
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                backgroundColor: isActive ? '#10172A' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 500,
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>USER</th>
                    <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>EMAIL ID</th>
                    <th style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>ROLE</th>
                    <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right', whiteSpace: 'nowrap' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                        <LoadingSpinner size="md" message="Loading users..." />
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.slice((usersPage - 1) * usersPageSize, usersPage * usersPageSize).map((u, idx, arr) => (
                      <tr key={u.id} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{u.name}</td>
                        <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{u.email}</td>
                        <td style={{ padding: '0.75rem 0.85rem', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                            {(Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [{ roleName: u.role || 'Change Desk Admin' }]).map((r, rIdx) => {
                              const rName = typeof r === 'string' ? r : (r.roleName || r.name);
                              return (
                                <span
                                  key={rIdx}
                                  style={{
                                    padding: '0.2rem 0.55rem',
                                    borderRadius: '5px',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    backgroundColor: 'var(--input-bg)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)'
                                  }}
                                >
                                  {rName}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenManageUser(u)}
                            disabled={isRequester}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: isRequester ? 'var(--text-secondary)' : 'var(--brand-primary)',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: isRequester ? 'not-allowed' : 'pointer',
                              opacity: isRequester ? 0.4 : 1,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            Manage user
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Users Pagination */}
          {!isLoadingUsers && users.length > 0 && (
            <Pagination
              currentPage={usersPage}
              pageSize={usersPageSize}
              totalItems={users.length}
              onPageChange={setUsersPage}
              onPageSizeChange={(size) => {
                setUsersPageSize(size);
                setUsersPage(1);
              }}
            />
          )}
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Audit Sub-Filter Pills Bar */}
          <FilterBar
            variant="inline"
            tabs={auditFilters.map((af) => ({ id: af, label: af }))}
            activeTab={auditFilter}
            onTabChange={setAuditFilter}
          />

          {/* Audit Logs Table */}
          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>TIMESTAMP</th>
                    <th style={{ padding: '0.75rem 1rem' }}>ACTOR</th>
                    <th style={{ padding: '0.75rem 1rem' }}>ACTION</th>
                    <th style={{ padding: '0.75rem 1rem' }}>REFERENCE</th>
                    <th style={{ padding: '0.75rem 1rem' }}>EMPLOYEE EMAIL</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingAuditLogs ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                        <LoadingSpinner size="md" message={`Loading audit records for "${auditFilter}"...`} />
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        No audit records found for "{auditFilter}".
                      </td>
                    </tr>
                  ) : (
                    auditLogs.slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize).map((log, idx, arr) => (
                      <tr key={log.id} style={{ borderBottom: idx === arr.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.825rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {formatAuditTimestamp(log.timestamp)}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {log.actor}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.835rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {log.action}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.825rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {log.reference}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontSize: '0.825rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {log.employeeEmail || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs Pagination */}
          {!isLoadingAuditLogs && auditLogs.length > 0 && (
            <Pagination
              currentPage={auditPage}
              pageSize={auditPageSize}
              totalItems={auditLogs.length}
              onPageChange={setAuditPage}
              onPageSizeChange={(size) => {
                setAuditPageSize(size);
                setAuditPage(1);
              }}
            />
          )}

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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
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
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
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
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
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
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
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

              {/* Multi-Role Tag Builder */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    Assigned Roles *
                  </label>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>(Add one or more roles)</span>
                </div>

                {/* Role Selector + Add Role Button */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <select
                    value={newUser.selectedRoleToAdd || ALL_ASSIGNABLE_ROLES[0]}
                    onChange={(e) => setNewUser(prev => ({ ...prev, selectedRoleToAdd: e.target.value }))}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  >
                    {ALL_ASSIGNABLE_ROLES.map(r => (
                      <option key={r} value={r} disabled={newUser.roles?.includes(r)}>{r}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const roleToAdd = newUser.selectedRoleToAdd || ALL_ASSIGNABLE_ROLES[0];
                      if (roleToAdd && !newUser.roles?.includes(roleToAdd)) {
                        setNewUser(prev => ({
                          ...prev,
                          roles: [...(prev.roles || []), roleToAdd]
                        }));
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.65rem 1rem',
                      backgroundColor: 'var(--brand-primary)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Plus size={15} />
                    <span>Add Role</span>
                  </button>
                </div>

                {/* Active Role Tags with Cross Icon to Delete */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', minHeight: '34px', padding: '0.45rem', backgroundColor: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {newUser.roles && newUser.roles.length > 0 ? (
                    newUser.roles.map(rName => (
                      <span
                        key={rName}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.6rem',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <span>{rName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (newUser.roles.length <= 1) {
                              toast.error('User must have at least one assigned role.');
                              return;
                            }
                            setNewUser(prev => ({
                              ...prev,
                              roles: prev.roles.filter(r => r !== rName)
                            }));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: '0.1rem',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', alignSelf: 'center', padding: '0.2rem' }}>
                      No roles added yet. Please select a role above and click "+ Add Role".
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic Category Assignment Dropdown for Change Manager or Change Implementer */}
              {(newUser.roles?.includes('Change Manager') || newUser.roles?.includes('Change Implementer')) && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Appointed Categories (Change Manager / Implementer) *
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
                    backgroundColor: 'var(--brand-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
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
                <h2 style={{ fontSize: '1.35rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
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
              <div className="cd-responsive-inner-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
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
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
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

              {/* Multi-Role Tag Builder for Edit Modal */}
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    Assigned Roles *
                  </label>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>(Add one or more roles)</span>
                </div>

                {/* Role Selector + Add Role Button */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                  <select
                    value={editingUser.selectedRoleToAdd || ALL_ASSIGNABLE_ROLES[0]}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, selectedRoleToAdd: e.target.value }))}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  >
                    {ALL_ASSIGNABLE_ROLES.map(r => (
                      <option key={r} value={r} disabled={editingUser.roles?.includes(r)}>{r}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const roleToAdd = editingUser.selectedRoleToAdd || ALL_ASSIGNABLE_ROLES[0];
                      if (roleToAdd && !editingUser.roles?.includes(roleToAdd)) {
                        setEditingUser(prev => ({
                          ...prev,
                          roles: [...(prev.roles || []), roleToAdd]
                        }));
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.65rem 1rem',
                      backgroundColor: 'var(--brand-primary)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Plus size={15} />
                    <span>Add Role</span>
                  </button>
                </div>

                {/* Active Role Tags with Cross Icon to Delete */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', minHeight: '34px', padding: '0.45rem', backgroundColor: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {editingUser.roles && editingUser.roles.length > 0 ? (
                    editingUser.roles.map(rName => (
                      <span
                        key={rName}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.6rem',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}
                      >
                        <span>{rName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingUser.roles.length <= 1) {
                              toast.error('User must have at least one assigned role.');
                              return;
                            }
                            setEditingUser(prev => ({
                              ...prev,
                              roles: prev.roles.filter(r => r !== rName)
                            }));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: '0.1rem',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#DC2626'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
                        >
                          <X size={13} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', alignSelf: 'center', padding: '0.2rem' }}>
                      No roles added yet. Please select a role above and click "+ Add Role".
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic Category Assignment Dropdown for Change Manager or Change Implementer */}
              {(editingUser.roles?.includes('Change Manager') || editingUser.roles?.includes('Change Implementer')) && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Appointed Categories (Change Manager / Implementer) *
                  </label>
                  {isLoadingCategories ? (
                    <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center', backgroundColor: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <LoadingSpinner size="xs" message="Loading categories..." />
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', backgroundColor: 'var(--input-bg)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      {categories.map((cat) => {
                        const isChecked = editingUserCategories.includes(cat.id);
                        return (
                          <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isSavingUser}
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
                  )}
                </div>
              )}

              {/* Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={isSavingUser}
                  style={{
                    padding: '0.6rem 1.25rem',
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: isSavingUser ? 'not-allowed' : 'pointer',
                    opacity: isSavingUser ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  style={{
                    padding: '0.6rem 1.25rem',
                    backgroundColor: 'var(--brand-primary)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: isSavingUser ? 'not-allowed' : 'pointer',
                    opacity: isSavingUser ? 0.8 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isSavingUser ? (
                    <>
                      <LoadingSpinner size="xs" color="#FFFFFF" center={false} />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <span>Save user</span>
                  )}
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
