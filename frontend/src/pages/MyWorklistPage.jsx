import React, { useState, useEffect } from 'react';
import { Clock, Check, X, RotateCw } from 'lucide-react';
import ChangeRequestModal from '../components/ui/ChangeRequestModal';
import FilterBar, { initCustomDateRange } from '../components/ui/FilterBar';
import { apiFetch } from '../lib/apiFetch';

function MyWorklistPage({ onNavigate, searchQuery = '', user, isOrgWorklist = false }) {
  const roleName = (user?.role || '').toLowerCase();
  const roleId = user?.roleId || '';
  const isSuperAdmin = roleId === 'role-1' || roleName.includes('super');
  const isAdmin = isSuperAdmin || roleId === 'role-2' || roleName.includes('admin');
  const isImplementer = roleId === 'role-5' || roleName.includes('implementer');
  const isApprover = (user?.roleId && ['role-1', 'role-2', 'role-3', 'role-5'].includes(user.roleId)) || roleName.includes('manager') || roleName.includes('admin') || roleName.includes('implementer');
  const isRequester = !isApprover;

  const [items, setItems] = useState([]);
  const [selectedCr, setSelectedCr] = useState(null);
  const [dateFilter, setDateFilter] = useState('last_7_days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [metrics, setMetrics] = useState({
    pending: 0,
    approved: 0,
    inProcess: 0,
    rejected: 0,
    implemented: 0
  });

  const [rowActionPrompt, setRowActionPrompt] = useState(null); // { item, action, title, color }
  const [rowActionCommentInput, setRowActionCommentInput] = useState('');
  const [rowActionCommentError, setRowActionCommentError] = useState('');

  const handleAction = async (id, action, rejectionReason = '') => {
    try {
      const res = await apiFetch('/worklist/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, rejectionReason, comment: rejectionReason })
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const decision = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : action === 'implement' ? 'Implemented' : 'Draft';
        const newStatus = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : action === 'implement' ? 'Implemented' : 'Pending';
        const closedDate = (action === 'implement' || action === 'reject') ? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;
        const approvedDate = (action === 'approve' || action === 'implement') ? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

        const actionCommentText = rejectionReason || data?.data?.approvedComment || data?.data?.comment || '';

        const newCommentObj = actionCommentText ? {
          id: `cmt-${Date.now()}`,
          authorName: user?.name || 'Approver',
          authorRole: user?.role || 'Approver',
          text: actionCommentText,
          action: decision,
          createdAt: new Date().toISOString()
        } : null;

        setItems(prev => prev.map(item => {
          if (item.id === id) {
            const updatedComments = newCommentObj ? [...(item.comments || []), newCommentObj] : (item.comments || []);
            return {
              ...item,
              status: newStatus,
              myDecision: decision,
              decidedBy: user?.name || 'Approver',
              approvedBy: action === 'approve' ? (user?.name || 'Approver') : item.approvedBy,
              approvedDate: approvedDate || item.approvedDate,
              approvedComment: action === 'approve' ? actionCommentText : item.approvedComment,
              rejectedComment: action === 'reject' ? actionCommentText : item.rejectedComment,
              rejectionReason: action === 'reject' ? actionCommentText : item.rejectionReason,
              implementedComment: action === 'implement' ? actionCommentText : item.implementedComment,
              comments: updatedComments,
              closedDate: closedDate || item.closedDate,
              canAct: false
            };
          }
          return item;
        }));

        setSelectedCr(prev => {
          if (prev && prev.id === id) {
            const updatedComments = newCommentObj ? [...(prev.comments || []), newCommentObj] : (prev.comments || []);
            return {
              ...prev,
              status: newStatus,
              myDecision: decision,
              decidedBy: user?.name || 'Approver',
              approvedBy: action === 'approve' ? (user?.name || 'Approver') : prev.approvedBy,
              approvedDate: approvedDate || prev.approvedDate,
              approvedComment: action === 'approve' ? actionCommentText : prev.approvedComment,
              rejectedComment: action === 'reject' ? actionCommentText : prev.rejectedComment,
              rejectionReason: action === 'reject' ? actionCommentText : prev.rejectionReason,
              implementedComment: action === 'implement' ? actionCommentText : prev.implementedComment,
              comments: updatedComments,
              closedDate: closedDate || prev.closedDate,
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
          implemented: action === 'implement' ? (prev.implemented || 0) + 1 : prev.implemented
        }));
      } else {
        const errData = await res.json().catch(() => ({}));
        console.warn('Backend action request failed:', errData.message || res.statusText);
        alert(errData.message || `Failed to perform ${action} action.`);
      }
    } catch (err) {
      console.warn('Backend action request failed:', err);
      alert(err.message || `Failed to perform ${action} action.`);
    }
  };

  const [activeFilter, setActiveFilter] = useState('All');
  const [statusCounts, setStatusCounts] = useState({
    All: 0,
    Pending: 0,
    Approved: 0,
    InProcess: 0,
    Implemented: 0,
    'In progress': 0,
    Rejected: 0
  });

  const fetchSeqRef = React.useRef(0);

  // Server-Side Database Query Fetch with date & search filter support
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
          ...(searchQuery && { search: searchQuery }),
          ...(isOrgWorklist && { scope: 'organization' })
        });
        const res = await apiFetch(`/worklist?${params}`, {
          headers: {
            ...(user?.id ? { 'x-user-id': user.id } : {})
          }
        });
        if (currentSeq !== fetchSeqRef.current) return;
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) setItems(body.data);
          if (body.statusCounts) setStatusCounts(body.statusCounts);
          if (body.metrics) setMetrics(body.metrics);
        }
      } catch (err) {
        console.warn('Backend API offline, using default worklist data:', err);
      } finally {
        if (currentSeq === fetchSeqRef.current) {
          setIsLoading(false);
        }
      }
    };
    fetchData();
  }, [activeFilter, dateFilter, startDate, endDate, searchQuery, user?.id, isOrgWorklist]);

  const getStatus = (r) => (r.status || 'Pending').toLowerCase();

  const inProcessCount = statusCounts.InProcess ?? metrics?.inProcess ?? statusCounts.Approved ?? 0;

  const filterTabs = [
    { id: 'All', label: `All (${statusCounts.All || 0})` },
    { id: 'Pending', label: `Pending (${statusCounts.Pending || 0})` },
    { id: 'In Process', label: `In Process (${inProcessCount})` },
    { id: 'Approved', label: `Approved (${statusCounts.Approved || 0})` },
    { id: 'Implemented', label: `Implemented (${statusCounts.Implemented || 0})` },
    { id: 'Rejected', label: `Rejected (${statusCounts.Rejected || 0})` }
  ];

  const metricCards = [
    { id: 'pending', title: 'Pending Review', count: metrics?.pending ?? statusCounts.Pending ?? 0, subtext: 'In Queue Right Now', subtextColor: 'var(--text-secondary)', icon: Clock, iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'in-process', title: 'In Process', count: inProcessCount, subtext: 'Awaiting Implementation', subtextColor: '#059669', icon: Clock, iconBg: '#ECFDF5', iconColor: '#059669' },
    { id: 'approved', title: 'Approved', count: metrics?.approved ?? statusCounts.Approved ?? 0, subtext: 'Last 30 Days', subtextColor: '#059669', icon: Check, iconBg: '#D1FAE5', iconColor: '#059669' },
    { id: 'rejected', title: 'Rejected', count: metrics?.rejected ?? statusCounts.Rejected ?? 0, subtext: 'Last 30 Days', subtextColor: 'var(--text-secondary)', icon: X, iconBg: '#FEE2E2', iconColor: '#DC2626' },
    { id: 'implemented', title: 'Implemented', count: metrics?.implemented ?? statusCounts.Implemented ?? 0, subtext: 'Last 30 Days', subtextColor: 'var(--text-secondary)', icon: RotateCw, iconBg: '#F3E8FF', iconColor: '#7C3AED' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
            {isOrgWorklist ? 'Organization worklist' : 'My Worklist'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {isOrgWorklist
              ? 'All change requests requiring Change Manager oversight across the organization'
              : 'Change requests awaiting your review'}
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
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>{card.count}</div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontWeight: 600 }}>{card.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status & Date Filter Pills (Under Metrics) */}
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

      {/* Worklist Table */}
      <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--input-bg)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '100px', whiteSpace: 'nowrap' }}>CR ID</th>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '280px' }}>Title</th>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '180px' }}>Category</th>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '180px', whiteSpace: 'nowrap' }}>Requester Details</th>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '120px', whiteSpace: 'nowrap' }}>Raised Date</th>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '120px', whiteSpace: 'nowrap' }}>Closed Date</th>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '130px', whiteSpace: 'nowrap' }}>Approved By</th>
                <th style={{ padding: '0.9rem 1.1rem', minWidth: '160px', textAlign: 'left', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map(item => {
                  const status = getStatus(item);
                  const isItemApproved = status === 'approved' || item.myDecision === 'Approved';
                  const isItemRejected = status === 'rejected' || item.myDecision === 'Rejected';

                  const isSelfRequest = Boolean(
                    (item.requesterId && (String(item.requesterId) === String(user?.id) || String(item.requesterId) === String(user?.userKey))) ||
                    (item.employeeId && user?.employeeId && String(item.employeeId).trim().toLowerCase() === String(user.employeeId).trim().toLowerCase()) ||
                    (item.employeeEmail && user?.email && item.employeeEmail.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
                    (item.requesterEmail && user?.email && item.requesterEmail.trim().toLowerCase() === user.email.trim().toLowerCase())
                  );

                  const emailVal = item.employeeEmail || item.managerEmail || item.requesterEmail || '';
                  const displayName = item.employeeName || item.requester || item.requesterName || (emailVal ? emailVal.split('@')[0].replace(/[\._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—');

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.15s ease' }}>
                      <td style={{ padding: '1rem 1.1rem', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {item.id}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', fontWeight: 500, color: 'var(--text-primary)', minWidth: '280px' }}>
                        <span style={{ lineHeight: 1.4, color: 'var(--text-primary)', display: 'block' }}>{item.title}</span>
                      </td>
                      <td style={{ padding: '1rem 1.1rem', color: 'var(--text-secondary)', minWidth: '180px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.category}</div>
                        {item.subCategory && <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>{item.subCategory}</div>}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {displayName}
                        </div>
                        {emailVal && (
                          <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '0.15rem' }}>
                            {emailVal}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {item.raisedDate || (item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                        {item.closedDate || (item.closedAt ? new Date(item.closedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (isItemApproved || isItemRejected ? 'Closed' : 'Open'))}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', color: 'var(--text-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {item.decidedBy || (isItemApproved || isItemRejected ? (user?.name || 'Approver') : '—')}
                      </td>
                      <td style={{ padding: '1rem 1.1rem', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-start' }}>
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
                                onClick={() => {
                                  setRowActionPrompt({ item, action: 'reject', title: 'Reject Change Request', color: '#DC2626' });
                                  setRowActionCommentInput('');
                                  setRowActionCommentError('');
                                }}
                                style={{ padding: '0.4rem 0.8rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRowActionPrompt({ item, action: 'approve', title: 'Approve Change Request', color: '#0D9488' });
                                  setRowActionCommentInput('');
                                  setRowActionCommentError('');
                                }}
                                style={{ padding: '0.4rem 0.95rem', backgroundColor: '#0D9488', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 2px rgba(13, 148, 136, 0.2)' }}
                              >
                                Approve
                              </button>
                            </>
                          ) : isItemApproved && status !== 'implemented' && (isAdmin || isImplementer) && !isSelfRequest ? (
                            <button
                              type="button"
                              onClick={() => {
                                setRowActionPrompt({ item, action: 'implement', title: 'Mark as Implemented', color: '#0D9488' });
                                setRowActionCommentInput('');
                                setRowActionCommentError('');
                              }}
                              style={{ padding: '0.4rem 0.95rem', backgroundColor: '#0D9488', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 2px rgba(13, 148, 136, 0.2)' }}
                            >
                              Implement
                            </button>
                          ) : (
                            <span style={{
                              padding: '0.3rem 0.65rem',
                              borderRadius: 'var(--radius-lg)',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              backgroundColor: status === 'implemented' ? '#F3E8FF' : isItemApproved ? '#FEF3C7' : isItemRejected ? '#FEE2E2' : '#FEF3C7',
                              color: status === 'implemented' ? '#7C3AED' : isItemApproved ? '#D97706' : isItemRejected ? '#DC2626' : '#D97706'
                            }}>
                              {status === 'implemented'
                                ? 'Implemented'
                                : item.myDecision === 'Moot'
                                ? (isItemApproved ? `Approved by ${item.decidedBy || 'Approver'}` : `Rejected by ${item.decidedBy || 'Approver'}`)
                                : isItemApproved
                                ? 'Approved'
                                : isItemRejected
                                ? 'Rejected'
                                : 'Pending'}
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
                      <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid var(--border-color)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <span>Loading worklist change requests...</span>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No change requests found matching the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Row Action Mandatory Comment Modal */}
      {rowActionPrompt && (
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
          zIndex: 250,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '520px',
            padding: '1.5rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: rowActionPrompt.color, margin: 0 }}>
                  {rowActionPrompt.title}
                </h3>
                <span style={{
                  fontSize: '0.725rem',
                  fontWeight: 600,
                  color: '#64748B',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '5px',
                  whiteSpace: 'nowrap'
                }}>
                  Visible to all
                </span>
              </div>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.35rem', margin: 0 }}>
                {rowActionPrompt.action === 'implement'
                  ? 'A comment explaining what has been done'
                  : rowActionPrompt.action === 'reject'
                  ? 'Please provide the reason for rejection.'
                  : 'A comment explaining what has been done'}
              </p>
            </div>

            <textarea
              rows={3}
              placeholder="Enter comment..."
              value={rowActionCommentInput}
              onChange={(e) => {
                setRowActionCommentInput(e.target.value);
                if (rowActionCommentError) setRowActionCommentError('');
              }}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                backgroundColor: 'var(--input-bg)',
                border: `1px solid ${rowActionCommentError ? '#DC2626' : 'var(--border-color)'}`,
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />

            {rowActionCommentError && (
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#DC2626' }}>
                {rowActionCommentError}
              </span>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => {
                  setRowActionPrompt(null);
                  setRowActionCommentInput('');
                  setRowActionCommentError('');
                }}
                style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rowActionCommentInput.trim()) {
                    setRowActionCommentError('Please enter a comment.');
                    return;
                  }
                  handleAction(rowActionPrompt.item.id, rowActionPrompt.action, rowActionCommentInput.trim());
                  setRowActionPrompt(null);
                  setRowActionCommentInput('');
                  setRowActionCommentError('');
                }}
                style={{ padding: '0.5rem 1.15rem', backgroundColor: rowActionPrompt.color, color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}
              >
                {rowActionPrompt.action === 'implement' ? 'Submit for Implement' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedCr && (() => {
        const isSelf = Boolean(
          (selectedCr.requesterId && (String(selectedCr.requesterId) === String(user?.id) || String(selectedCr.requesterId) === String(user?.userKey))) ||
          (selectedCr.employeeId && user?.employeeId && String(selectedCr.employeeId).trim().toLowerCase() === String(user.employeeId).trim().toLowerCase()) ||
          (selectedCr.employeeEmail && user?.email && selectedCr.employeeEmail.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
          (selectedCr.requesterEmail && user?.email && selectedCr.requesterEmail.trim().toLowerCase() === user.email.trim().toLowerCase())
        );
        return (
          <ChangeRequestModal
            cr={selectedCr}
            user={user}
            onClose={() => setSelectedCr(null)}
            onApprove={(isRequester || selectedCr.canAct === false || isSelf) ? null : (id, comment) => handleAction(id, 'approve', comment)}
            onReject={(isRequester || selectedCr.canAct === false || isSelf) ? null : (id, reason) => handleAction(id, 'reject', reason)}
            onSendBack={(isRequester || selectedCr.canAct === false || isSelf) ? null : (id) => handleAction(id, 'sendback')}
            onImplement={isSelf ? null : (id, comment) => handleAction(id, 'implement', comment)}
          />
        );
      })()}

    </div>
  );
}

export default React.memo(MyWorklistPage);
