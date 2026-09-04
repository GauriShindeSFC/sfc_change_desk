import React, { useState, useEffect } from 'react';
import { Clock, Check, X, ChevronLeft, Calendar } from 'lucide-react';
import ChangeRequestModal from '../components/ui/ChangeRequestModal';
import { apiFetch } from '../lib/apiFetch';

function MyWorklistPage({ onNavigate, searchQuery = '', user }) {
  const roleName = (user?.role || '').toLowerCase();
  const isApprover = (user?.roleId && ['role-1', 'role-2', 'role-3'].includes(user.roleId)) || roleName.includes('manager') || roleName.includes('admin');
  const isRequester = !isApprover;

  const [items, setItems] = useState([]);
  const [selectedCr, setSelectedCr] = useState(null);
  const [dateFilter, setDateFilter] = useState('overall');
  const [isLoading, setIsLoading] = useState(false);

  const [metrics, setMetrics] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    sentBack: 0
  });

  const handleAction = async (id, action, rejectionReason = '') => {
    try {
      const res = await apiFetch('/worklist/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, rejectionReason })
      });
      if (res.ok) {
        const decision = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Draft';
        const newStatus = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Pending';

        setItems(prev => prev.map(item => {
          if (item.id === id) {
            return {
              ...item,
              status: newStatus,
              myDecision: decision,
              decidedBy: user?.name || 'Gauri Shinde',
              rejectionReason: action === 'reject' ? rejectionReason : item.rejectionReason,
              canAct: false
            };
          }
          return item;
        }));

        setSelectedCr(prev => {
          if (prev && prev.id === id) {
            return {
              ...prev,
              status: newStatus,
              myDecision: decision,
              decidedBy: user?.name || 'Gauri Shinde',
              rejectionReason: action === 'reject' ? rejectionReason : prev.rejectionReason,
              canAct: false
            };
          }
          return prev;
        });

        setMetrics(prev => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          approved: action === 'approve' ? prev.approved + 1 : prev.approved,
          rejected: action === 'reject' ? prev.rejected + 1 : prev.rejected,
          sentBack: action === 'sendback' ? prev.sentBack + 1 : prev.sentBack
        }));
      }
    } catch (err) {
      console.warn('Backend action request failed:', err);
    }
  };

  const [activeFilter, setActiveFilter] = useState('All');
  const [statusCounts, setStatusCounts] = useState({
    All: 0,
    Pending: 0,
    Approved: 0,
    'In progress': 0,
    Rejected: 0
  });

  // Server-Side Database Query Fetch with date & search filter support
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          ...(activeFilter !== 'All' && { status: activeFilter }),
          ...(dateFilter !== 'overall' && { dateFilter }),
          ...(searchQuery && { search: searchQuery })
        });
        const res = await apiFetch(`/worklist?${params}`);
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) setItems(body.data);
          if (body.statusCounts) setStatusCounts(body.statusCounts);
          if (body.metrics) setMetrics(body.metrics);
        }
      } catch (err) {
        console.warn('Backend API offline, using default worklist data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeFilter, dateFilter, searchQuery, user?.id]);

  const getStatus = (r) => (r.status || 'Pending').toLowerCase();

  const filterTabs = [
    { id: 'All', label: `All (${statusCounts.All || 0})` },
    { id: 'Pending', label: `Pending (${statusCounts.Pending || 0})` },
    { id: 'Approved', label: `Approved (${statusCounts.Approved || 0})` },
    { id: 'In progress', label: `In progress (${statusCounts['In progress'] || 0})` },
    { id: 'Rejected', label: `Rejected (${statusCounts.Rejected || 0})` }
  ];

  const metricCards = [
    { id: 'pending', title: 'Pending review', count: metrics?.pending ?? statusCounts.Pending ?? 0, subtext: 'In queue right now', subtextColor: 'var(--text-secondary)', icon: Clock, iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'approved', title: 'Approved', count: metrics?.approved ?? statusCounts.Approved ?? 0, subtext: 'Last 30 days', subtextColor: '#059669', icon: Check, iconBg: '#D1FAE5', iconColor: '#059669' },
    { id: 'rejected', title: 'Rejected', count: metrics?.rejected ?? statusCounts.Rejected ?? 0, subtext: 'Last 30 days', subtextColor: 'var(--text-secondary)', icon: X, iconBg: '#FEE2E2', iconColor: '#DC2626' },
    { id: 'sentback', title: 'Sent back', count: metrics?.sentBack ?? statusCounts.Draft ?? 0, subtext: 'Last 30 days', subtextColor: 'var(--text-secondary)', icon: ChevronLeft, iconBg: '#F3E8FF', iconColor: '#7C3AED' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Organization worklist
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {isApprover ? 'Change requests awaiting CAB & manager sign-off' : 'All change requests across the organization'}
          </p>
        </div>

        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {items.length} total request{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
        {metricCards.map(card => {
          const IconComp = card.icon;
          return (
            <div
              key={card.id}
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: card.iconBg, color: card.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconComp size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>{card.count}</div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontWeight: 600 }}>{card.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status & Date Filter Pills (Under Metrics) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem', gap: '0.75rem' }}>
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
                cursor: 'pointer',
                transition: 'all 0.15s ease'
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

      {/* Worklist Table */}
      <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--input-bg)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '100px', whiteSpace: 'nowrap' }}>CR ID</th>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '280px' }}>Title</th>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '180px' }}>Category</th>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '180px', whiteSpace: 'nowrap' }}>Employee Email</th>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '120px', whiteSpace: 'nowrap' }}>Raised Date</th>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '120px', whiteSpace: 'nowrap' }}>Closed Date</th>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '130px', whiteSpace: 'nowrap' }}>Approved By</th>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '160px', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map(item => {
                  const status = getStatus(item);
                  const isItemApproved = status === 'approved' || item.myDecision === 'Approved';
                  const isItemRejected = status === 'rejected' || item.myDecision === 'Rejected';

                  const isSelfRequest = (item.requesterId && user?.id && String(item.requesterId) === String(user.id)) ||
                    (item.employeeEmail && user?.email && item.employeeEmail.toLowerCase() === user.email.toLowerCase());

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}>
                      <td style={{ padding: '1rem 1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {item.id}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: '280px' }}>
                        <span style={{ lineHeight: 1.4, color: 'var(--text-primary)', display: 'block' }}>{item.title}</span>
                      </td>
                      <td style={{ padding: '1rem 1.1rem', color: 'var(--text-secondary)', minWidth: '180px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.category}</div>
                        {item.subCategory && <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>{item.subCategory}</div>}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {item.employeeEmail || item.managerEmail || item.requesterEmail || '—'}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {item.raisedDate || '27 Aug'}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {item.closedDate || (isItemApproved || isItemRejected ? '28 Aug' : 'Open')}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {item.decidedBy || (isItemApproved || isItemRejected ? (user?.name || 'Gauri Shinde') : '—')}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedCr(item)}
                            style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            View
                          </button>
                          {!isRequester && !isSelfRequest && item.canAct !== false && status === 'pending' && item.myDecision === 'Pending' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setSelectedCr(item)}
                                style={{ padding: '0.4rem 0.8rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAction(item.id, 'approve')}
                                style={{ padding: '0.4rem 0.95rem', backgroundColor: '#0D9488', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 2px rgba(13, 148, 136, 0.2)' }}
                              >
                                Approve
                              </button>
                            </>
                          ) : (
                            <span style={{
                              padding: '0.3rem 0.65rem',
                              borderRadius: '99px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: isItemApproved ? '#D1FAE5' : isItemRejected ? '#FEE2E2' : '#FEF3C7',
                              color: isItemApproved ? '#059669' : isItemRejected ? '#DC2626' : '#D97706'
                            }}>
                              {isItemApproved ? 'Approved' : isItemRejected ? 'Rejected' : 'Pending'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                      <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid var(--border-color)', borderTopColor: '#0D9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <span>Loading worklist change requests...</span>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    🎉 No change requests found matching the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedCr && (
        <ChangeRequestModal
          cr={selectedCr}
          onClose={() => setSelectedCr(null)}
          onApprove={isRequester ? null : (id) => handleAction(id, 'approve')}
          onReject={isRequester ? null : (id, reason) => handleAction(id, 'reject', reason)}
          onSendBack={isRequester ? null : (id) => handleAction(id, 'sendback')}
        />
      )}

    </div>
  );
}

export default React.memo(MyWorklistPage);
