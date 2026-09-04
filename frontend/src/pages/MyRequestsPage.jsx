import React, { useState, useEffect } from 'react';
import { Plus, Calendar } from 'lucide-react';
import ChangeRequestModal from '../components/ui/ChangeRequestModal';
import { apiFetch } from '../lib/apiFetch';

function MyRequestsPage({ onNavigate, searchQuery = '', initialData, user }) {
  const [requests, setRequests] = useState([]);
  const [dateFilter, setDateFilter] = useState('overall');
  const [isLoading, setIsLoading] = useState(false);

  const [statusCounts, setStatusCounts] = useState({
    All: 0,
    Pending: 0,
    Approved: 0,
    'In progress': 0,
    Rejected: 0,
    Draft: 0
  });

  const [activeFilter, setActiveFilter] = useState(() => {
    if (initialData?.filter) return initialData.filter;
    if (typeof initialData === 'string') return initialData;
    return 'All';
  });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (initialData?.filter) {
      setActiveFilter(initialData.filter);
    } else if (typeof initialData === 'string') {
      setActiveFilter(initialData);
    }
  }, [initialData]);

  // Server-Side Database Query Fetch
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          ...(activeFilter !== 'All' && { status: activeFilter }),
          ...(dateFilter !== 'overall' && { dateFilter }),
          ...(searchQuery && { search: searchQuery })
        });
        const res = await apiFetch(`/my-requests?${params}`);
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) setRequests(body.data);
          if (body.statusCounts) setStatusCounts(body.statusCounts);
        }
      } catch (err) {
        console.warn('Backend API offline, using default requests:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeFilter, dateFilter, searchQuery, user?.id]);

  const filterTabs = [
    { id: 'All', label: `All (${statusCounts.All || 0})` },
    { id: 'Pending', label: `Pending (${statusCounts.Pending || 0})` },
    { id: 'Approved', label: `Approved (${statusCounts.Approved || 0})` },
    { id: 'In progress', label: `In progress (${statusCounts['In progress'] || 0})` },
    { id: 'Rejected', label: `Rejected (${statusCounts.Rejected || 0})` },
    { id: 'Draft', label: `Draft (${statusCounts.Draft || 0})` }
  ];

  const handleSubmitDraft = async (crId) => {
    try {
      const res = await apiFetch(`/change-requests/${crId}/submit`, {
        method: 'PATCH'
      });
      if (res.ok) {
        setRequests(prev => prev.map(r => r.id === crId ? { ...r, status: 'Pending', isDraft: false, statusBg: '#FEF3C7', statusColor: '#D97706', statusDot: '#D97706' } : r));
        setSelectedRequest(null);
        setActiveFilter('Pending');
      }
    } catch (err) {
      console.warn('Failed to submit draft on server:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            My Requests
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            All change requests created by you or your team
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('Change Request')}
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
          <span>New Change Request</span>
        </button>
      </div>

      {/* Main Sub-Tabs / Status & Date Filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              style={{
                padding: '0.45rem 0.95rem',
                backgroundColor: activeFilter === tab.id ? '#0D9488' : 'transparent',
                color: activeFilter === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
                border: activeFilter === tab.id ? 'none' : '1px solid var(--border-color)',
                borderRadius: '99px',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Time Range Filter Dropdown */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.25rem 0.65rem' }}>
          <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setPage(1);
            }}
            style={{
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              padding: '0.2rem'
            }}
          >
            <option value="overall" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>Overall Time</option>
            <option value="last_7_days" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>Last 7 Days</option>
            <option value="this_month" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>This Month</option>
            <option value="last_month" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>Last Month</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--input-bg)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>CR ID</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Title</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Category</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Risk</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Raised Date</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Closed Date</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length > 0 ? (
                requests.map(cr => (
                  <tr key={cr.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{cr.id}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-primary)', maxWidth: '280px', wordBreak: 'break-word' }}>{cr.title}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{cr.category}</td>
                    <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                          {[1, 2, 3].map(bar => (
                            <div key={bar} style={{ width: '3px', height: '12px', borderRadius: '1px', backgroundColor: bar <= (cr.riskBars || 2) ? (cr.riskColor || '#D97706') : 'var(--border-color)' }} />
                          ))}
                        </div>
                        <span style={{ fontWeight: 700, color: cr.riskColor || '#D97706', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{cr.risk || 'Medium'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{cr.raisedDate}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{cr.closedDate}</td>
                    <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '99px',
                        backgroundColor: cr.statusBg || ((cr.status || '').toLowerCase() === 'draft' ? 'var(--input-bg)' : '#FEF3C7'),
                        color: cr.statusColor || ((cr.status || '').toLowerCase() === 'draft' ? 'var(--text-secondary)' : '#D97706'),
                        fontSize: '0.775rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cr.statusDot || ((cr.status || '').toLowerCase() === 'draft' ? '#94A0B0' : '#D97706') }} />
                        <span style={{ whiteSpace: 'nowrap' }}>{cr.status}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.6rem' }}>
                        {(cr.status || '').toLowerCase() === 'draft' && (
                          <button
                            type="button"
                            onClick={() => onNavigate && onNavigate('Change Request', cr)}
                            style={{
                              padding: '0.3rem 0.65rem',
                              backgroundColor: '#E6F4F1',
                              color: '#0D9488',
                              border: '1px solid #A7F3D0',
                              borderRadius: '6px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontSize: '0.775rem'
                            }}
                          >
                            Edit Draft
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(cr)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#0D9488',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.825rem'
                          }}
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                      <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid var(--border-color)', borderTopColor: '#0D9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <span>Loading change requests...</span>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No change requests found for status "{activeFilter}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Request Details Modal */}
      {selectedRequest && (() => {
        const roleName = (user?.role || '').toLowerCase();
        const isApprover = (user?.roleId && ['role-1', 'role-2', 'role-3'].includes(user.roleId)) || roleName.includes('manager') || roleName.includes('admin');
        return (
          <ChangeRequestModal
            cr={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onApprove={isApprover ? () => setSelectedRequest(null) : null}
            onReject={isApprover ? () => setSelectedRequest(null) : null}
            onSendBack={isApprover ? () => setSelectedRequest(null) : null}
            onSubmitForApproval={handleSubmitDraft}
          />
        );
      })()}

    </div>
  );
}

export default React.memo(MyRequestsPage);
