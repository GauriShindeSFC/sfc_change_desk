import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import ChangeRequestModal from '../components/ui/ChangeRequestModal';
import FilterBar, { initCustomDateRange } from '../components/ui/FilterBar';
import { apiFetch } from '../lib/apiFetch';

function MyRequestsPage({ onNavigate, searchQuery = '', initialData, user }) {
  const [requests, setRequests] = useState([]);
  const [dateFilter, setDateFilter] = useState('last_7_days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [statusCounts, setStatusCounts] = useState({
    All: 0,
    Pending: 0,
    Approved: 0,
    'In progress': 0,
    Rejected: 0
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

  const fetchSeqRef = React.useRef(0);

  // Server-Side Database Query Fetch
  useEffect(() => {
    // Do not fetch custom date filter if dates are incomplete
    if (dateFilter === 'custom' && (!startDate || !endDate)) {
      return;
    }

    const currentSeq = ++fetchSeqRef.current;
    setIsLoading(true);

    const fetchData = async () => {
      try {
        const params = new URLSearchParams({
          ...(activeFilter !== 'All' && { status: activeFilter }),
          ...(dateFilter !== 'overall' && { dateFilter }),
          ...(dateFilter === 'custom' && startDate && { startDate }),
          ...(dateFilter === 'custom' && endDate && { endDate }),
          ...(searchQuery && { search: searchQuery })
        });
        const res = await apiFetch(`/my-requests?${params}`, {
          headers: {
            ...(user?.id ? { 'x-user-id': user.id } : {})
          }
        });
        if (currentSeq !== fetchSeqRef.current) return;
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) setRequests(body.data);
          if (body.statusCounts) setStatusCounts(body.statusCounts);
        }
      } catch (err) {
        console.warn('Backend API offline, using default requests:', err);
      } finally {
        if (currentSeq === fetchSeqRef.current) {
          setIsLoading(false);
        }
      }
    };
    fetchData();
  }, [activeFilter, dateFilter, startDate, endDate, searchQuery, user?.id]);

  const filterTabs = [
    { id: 'All', label: `All (${statusCounts.All || 0})` },
    { id: 'Pending', label: `Pending (${statusCounts.Pending || 0})` },
    { id: 'Approved', label: `Approved (${statusCounts.Approved || 0})` },
    { id: 'In progress', label: `In Progress (${statusCounts['In progress'] || statusCounts['In Progress'] || 0})` },
    { id: 'Rejected', label: `Rejected (${statusCounts.Rejected || 0})` }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            My Requests
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            All change requests created by you or your team
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('Change Catalog')}
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
          <span>New Change Request</span>
        </button>
      </div>

      {/* Main Sub-Tabs / Status & Date Filter */}
      <FilterBar
        tabs={filterTabs}
        activeTab={activeFilter}
        onTabChange={setActiveFilter}
        dateValue={dateFilter}
        onDateChange={(val) => {
          setDateFilter(val);
          if (val === 'custom') {
            initCustomDateRange({ startDate, endDate, setStartDate, setEndDate });
          } else {
            setStartDate('');
            setEndDate('');
          }
        }}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

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
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>CR ID</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Title</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em' }}>Category</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Raised Date</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Closed Date</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length > 0 ? (
                requests.map(cr => (
                  <tr key={cr.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{cr.id}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 500, color: 'var(--text-primary)', maxWidth: '280px', wordBreak: 'break-word' }}>{cr.title}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{cr.category}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{cr.raisedDate}</td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{cr.closedDate}</td>
                    <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.2rem 0.65rem',
                        borderRadius: 'var(--radius-lg)',
                        backgroundColor: cr.statusBg || '#FEF3C7',
                        color: cr.statusColor || '#D97706',
                        fontSize: '0.775rem',
                        fontWeight: 500,
                        whiteSpace: 'nowrap'
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cr.statusDot || '#D97706' }} />
                        <span style={{ whiteSpace: 'nowrap' }}>{cr.status}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.6rem' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(cr)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--brand-primary)',
                            fontWeight: 500,
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
                      <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid var(--border-color)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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
      {selectedRequest && (
        <ChangeRequestModal
          cr={selectedRequest}
          user={user}
          onClose={() => setSelectedRequest(null)}
          onApprove={null}
          onReject={null}
          onSendBack={null}
          onImplement={null}
        />
      )}

    </div>
  );
}

export default React.memo(MyRequestsPage);
