import React, { useState, useEffect } from 'react';
import { Clock, Check, X, ChevronLeft } from 'lucide-react';
import ChangeRequestModal from '../components/ui/ChangeRequestModal';
import { apiFetch } from '../lib/apiFetch';

export default function MyWorklistPage({ onNavigate, searchQuery = '', user }) {
  const roleName = (user?.role || '').toLowerCase();
  const roleId = user?.roleId || '';
  const isApprover = roleName.includes('cab') || roleName.includes('manager') || roleName.includes('admin') || ['role-1', 'role-2', 'role-3'].includes(roleId);
  const isRequester = !isApprover;

  const [items, setItems] = useState([]);
  const [selectedCr, setSelectedCr] = useState(null);
  const [metrics, setMetrics] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    sentBack: 0
  });

  useEffect(() => {
    const fetchWorklist = async () => {
      try {
        const res = await apiFetch('/worklist');
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) setItems(body.data);
          if (body.metrics) setMetrics(body.metrics);
        }
      } catch (err) {
        console.warn('Backend API offline, using default worklist data:', err);
      }
    };

    fetchWorklist();
    const interval = setInterval(fetchWorklist, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const getStatus = (r) => (r.status || r.myDecision || 'Pending').toLowerCase();

  const filterCounts = {
    All: items.length,
    Pending: items.filter(r => getStatus(r) === 'pending').length,
    Approved: items.filter(r => getStatus(r) === 'approved').length,
    'In progress': items.filter(r => getStatus(r) === 'in progress' || getStatus(r) === 'scheduled').length,
    Rejected: items.filter(r => getStatus(r) === 'rejected').length,
    Draft: items.filter(r => getStatus(r) === 'draft' || r.isDraft).length
  };

  const filterTabs = [
    { id: 'All', label: `All (${filterCounts.All})` },
    { id: 'Pending', label: `Pending (${filterCounts.Pending})` },
    { id: 'Approved', label: `Approved (${filterCounts.Approved})` },
    { id: 'In progress', label: `In progress (${filterCounts['In progress']})` },
    { id: 'Rejected', label: `Rejected (${filterCounts.Rejected})` },
    { id: 'Draft', label: `Draft (${filterCounts.Draft})` }
  ];

  const filteredItems = items.filter(item => {
    const status = getStatus(item);
    let matchesFilter = true;

    if (activeFilter === 'Pending') matchesFilter = status === 'pending';
    else if (activeFilter === 'Approved') matchesFilter = status === 'approved';
    else if (activeFilter === 'In progress') matchesFilter = status === 'in progress' || status === 'scheduled';
    else if (activeFilter === 'Rejected') matchesFilter = status === 'rejected';
    else if (activeFilter === 'Draft') matchesFilter = status === 'draft' || item.isDraft;

    const query = (searchQuery || '').toLowerCase().trim();
    const matchesSearch = !query || 
      (item.id || '').toLowerCase().includes(query) ||
      (item.title || '').toLowerCase().includes(query) ||
      (item.category || '').toLowerCase().includes(query) ||
      (item.requester || '').toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const numA = parseInt((a.id || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt((b.id || '').replace(/\D/g, ''), 10) || 0;
    if (numA !== numB) return numB - numA;
    const timeA = new Date(a.submittedAt || a.raisedDate || a.createdAt || 0).getTime();
    const timeB = new Date(b.submittedAt || b.raisedDate || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const metricCards = [
    { id: 'pending', title: 'Pending review', count: metrics.pending, subtext: 'In queue right now', subtextColor: 'var(--text-secondary)', icon: Clock, iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'approved', title: 'Approved', count: metrics.approved, subtext: 'Last 30 days', subtextColor: '#059669', icon: Check, iconBg: '#D1FAE5', iconColor: '#059669' },
    { id: 'rejected', title: 'Rejected', count: metrics.rejected, subtext: 'Last 30 days', subtextColor: 'var(--text-secondary)', icon: X, iconBg: '#FEE2E2', iconColor: '#DC2626' },
    { id: 'sentback', title: 'Sent back', count: metrics.sentBack, subtext: 'Last 30 days', subtextColor: 'var(--text-secondary)', icon: ChevronLeft, iconBg: '#F3E8FF', iconColor: '#7C3AED' }
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
          {filteredItems.length} total request{filteredItems.length !== 1 ? 's' : ''}
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

      {/* Status Filter Pills (Under Metrics) */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
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

      {/* Worklist Table */}
      <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--input-bg)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.9rem 1.1rem' }}>CR ID</th>
                <th style={{ padding: '0.9rem 1.1rem' }}>Title</th>
                <th style={{ padding: '0.9rem 1.1rem' }}>Category</th>
                <th style={{ padding: '0.9rem 1.1rem' }}>Employee Email</th>
                <th style={{ padding: '0.9rem 1.1rem' }}>Raised Date</th>
                <th style={{ padding: '0.9rem 1.1rem' }}>Closed Date</th>
                <th style={{ padding: '0.9rem 1.1rem' }}>Approved By</th>
                <th style={{ padding: '0.9rem 1.1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.length > 0 ? (
                sortedItems.map(item => {
                  const status = getStatus(item);
                  const isItemApproved = status === 'approved' || item.myDecision === 'Approved';
                  const isItemRejected = status === 'rejected' || item.myDecision === 'Rejected';

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}>
                      <td style={{ padding: '1rem 1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {item.id}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', fontWeight: 700, color: 'var(--text-primary)', maxWidth: '240px' }}>
                        <span style={{ lineHeight: 1.35 }}>{item.title}</span>
                      </td>
                      <td style={{ padding: '1rem 1.1rem', color: 'var(--text-secondary)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.category}</div>
                        {item.subCategory && <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>{item.subCategory}</div>}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {item.employeeEmail || item.managerEmail || 'priya.nair@sfc.com'}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {item.raisedDate || '27 Aug'}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {item.closedDate || (isItemApproved || isItemRejected ? '28 Aug' : 'Open')}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>
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
                          {!isRequester && item.canAct !== false && status === 'pending' && item.myDecision === 'Pending' ? (
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
