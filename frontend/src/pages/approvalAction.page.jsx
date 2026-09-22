import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Send, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { LoadingSpinner } from '../components/ui/primitives.component';

const formatFieldLabel = (key = '') => {
  return String(key)
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/\bIp\b/gi, 'IP')
    .replace(/\bOs\b/gi, 'OS')
    .replace(/\bCpu\b/gi, 'CPU')
    .replace(/\bRam\b/gi, 'RAM')
    .replace(/\bKb\b/gi, 'KB')
    .replace(/\bCve\b/gi, 'CVE')
    .replace(/\bVlan\b/gi, 'VLAN')
    .replace(/\bId\b/gi, 'ID')
    .trim();
};

const formatCleanTime = (d) => {
  try {
    const dt = d ? new Date(d) : new Date();
    return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase();
  } catch {
    return '12:00:00 pm';
  }
};

const formatCleanDate = (d) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = dt.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(d);
  }
};

const formatLongDate = (d) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(d);
  }
};

const IGNORED_KEYS = [
  'comments',
  'approvedComment',
  'approvedBy',
  'rejectedComment',
  'rejectedBy',
  'rejectionReason',
  'rejection_reason',
  'implementedComment',
  'implementedBy',
  'employeeName',
  'employeeEmail',
  'managerEmail',
  'employeeId'
];

const getCustomFields = (cr) => {
  if (!cr) return [];
  const fields = [];
  const raw = (cr.customFieldValues && typeof cr.customFieldValues === 'object') ? cr.customFieldValues : {};

  const actionReq = raw.actionRequired || cr.actionRequired || cr.action;
  if (actionReq && typeof actionReq === 'string' && actionReq.trim()) {
    fields.push(['actionRequired', actionReq.trim()]);
  }

  for (const [k, v] of Object.entries(raw)) {
    if (k === 'actionRequired') continue;
    if (IGNORED_KEYS.includes(k)) continue;
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (typeof v === 'object') continue;
    fields.push([k, String(v).trim()]);
  }
  return fields;
};

export default function ApprovalActionPage() {
  const [token, setToken] = useState('');
  const [action, setAction] = useState('approve'); // 'approve' | 'reject' | 'implement'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [crData, setCrData] = useState(null);

  // Form states
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const urlAction = params.get('action');

    if (urlAction && ['approve', 'reject', 'implement'].includes(urlAction.toLowerCase())) {
      setAction(urlAction.toLowerCase());
    }
    if (!urlToken) {
      setError('Missing authorization token. Please use the action link provided in your email.');
      setLoading(false);
      return;
    }

    setToken(urlToken);

    // Fetch Change Request details for confirmation
    const fetchCrDetails = async () => {
      try {
        const res = await fetch(`/api/public/change-request-action?token=${encodeURIComponent(urlToken)}`);
        const body = await res.json();
        if (!res.ok || !body.success) {
          throw new Error(body.message || 'Failed to verify action token.');
        }
        setCrData(body.data?.cr || null);
        if (body.data?.action && !urlAction) {
          setAction(body.data.action);
        }
      } catch (err) {
        setError(err.message || 'Unable to load change request details.');
      } finally {
        setLoading(false);
      }
    };

    fetchCrDetails();
  }, []);

  const handleSubmitDecision = async (e) => {
    e?.preventDefault();
    if (action === 'reject' && !comment.trim()) {
      setFormError('Please provide a reason for rejecting this change request.');
      return;
    }
    setFormError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/public/change-request-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action,
          comment: comment.trim()
        })
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.message || 'Failed to record your decision.');
      }

      setSuccessResult({
        action,
        message: body.message,
        crId: crData?.id
      });
    } catch (err) {
      setFormError(err.message || 'Something went wrong while submitting.');
    } finally {
      setSubmitting(false);
    }
  };

  const isApprove = action === 'approve';
  const isImplement = action === 'implement';
  const isReject = action === 'reject';

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8FAFC',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      fontFamily: 'var(--font-family, Montserrat, sans-serif)'
    }}>
      {/* Header Brand Bar */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
            <ShieldCheck size={18} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
            ChangeDesk
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '0.25rem' }}>
          {isImplement ? 'Change Implementation Portal' : 'Change Manager Authorization Portal'}
        </div>
      </div>

      {/* Main Container */}
      <div style={{
        width: '100%',
        maxWidth: '680px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden'
      }}>
        {/* Loading State */}
        {loading && (
          <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
            <LoadingSpinner size="lg" message="Verifying secure token and fetching request details..." />
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <AlertCircle size={28} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.5rem' }}>
              Action Link Unavailable
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748B', maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              {error}
            </p>
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.25rem',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Go to ChangeDesk Portal
            </a>
          </div>
        )}

        {/* Success State */}
        {!loading && successResult && (
          <div style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: successResult.action === 'implement' ? '#CCFBF1' : successResult.action === 'approve' ? '#D1FAE5' : '#FEE2E2',
              color: successResult.action === 'implement' ? '#0D9488' : successResult.action === 'approve' ? '#059669' : '#DC2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem'
            }}>
              {successResult.action === 'reject' ? <XCircle size={36} /> : <CheckCircle2 size={36} />}
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem' }}>
              {successResult.action === 'implement'
                ? 'Change Request Implemented & Closed'
                : successResult.action === 'approve'
                  ? 'Change Request Approved'
                  : 'Change Request Rejected'}
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#475569', maxWidth: '440px', margin: '0 auto 1.75rem', lineHeight: 1.55 }}>
              Change Request <strong>{successResult.crId}</strong> has been marked as <strong>{successResult.action === 'implement' ? 'Implemented' : successResult.action === 'approve' ? 'Approved' : 'Rejected'}</strong>. The database, audit logs, and ChangeDesk dashboards have been updated.
            </p>
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.7rem 1.5rem',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
              }}
            >
              <span>Go to ChangeDesk Dashboard</span>
              <ArrowRight size={16} />
            </a>
          </div>
        )}

        {/* Action Decision Form */}
        {!loading && !error && !successResult && crData && (
          <div>
            {/* Top Banner indicating current action */}
            <div style={{
              padding: '1.25rem 1.75rem',
              backgroundColor: isImplement ? '#F0FDFA' : isApprove ? '#F0FDF4' : '#FEF2F2',
              borderBottom: isImplement ? '1px solid #99F6E4' : isApprove ? '1px solid #BBF7D0' : '1px solid #FECACA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: isImplement ? '#CCFBF1' : isApprove ? '#DCFCE7' : '#FEE2E2',
                  color: isImplement ? '#0D9488' : isApprove ? '#059669' : '#DC2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isReject ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: isImplement ? '#115E59' : isApprove ? '#166534' : '#991B1B', margin: 0 }}>
                    {isImplement ? 'Mark Change Request as Implemented' : isApprove ? 'Approve Change Request' : 'Reject Change Request'}
                  </h3>
                  <span style={{ fontSize: '0.775rem', color: isImplement ? '#0F766E' : isApprove ? '#15803D' : '#B91C1C' }}>
                    {isImplement ? `Confirm completion and execution notes for ${crData.id}` : `Confirm your decision for ${crData.id}`}
                  </span>
                </div>
              </div>

              {/* Action Switcher Toggle (Only between approve/reject if not implement) */}
              {!isImplement && (
                <button
                  type="button"
                  onClick={() => {
                    setAction(isApprove ? 'reject' : 'approve');
                    setFormError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#475569',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    cursor: 'pointer'
                  }}
                >
                  Switch to {isApprove ? 'Reject' : 'Approve'}
                </button>
              )}
            </div>

            {/* Request Summary Card */}
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                    {crData.id}
                  </span>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', margin: '0.2rem 0 0.3rem', lineHeight: 1.3 }}>
                    {crData.title}
                  </h2>
                  <span style={{ fontSize: '0.825rem', color: '#64748B' }}>
                    {crData.category} {crData.subCategory ? `· ${crData.subCategory}` : ''}
                  </span>
                </div>
                <div style={{
                  padding: '0.35rem 0.8rem',
                  borderRadius: '99px',
                  backgroundColor: crData.status === 'Approved' ? '#ECFDF5' : crData.status === 'Implemented' ? '#F5F3FF' : '#FEF3C7',
                  color: crData.status === 'Approved' ? '#059669' : crData.status === 'Implemented' ? '#7C3AED' : '#D97706',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  {crData.status === 'Approved' ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                  <span>{crData.status === 'Approved' ? 'Approved (Ready to Implement)' : crData.status === 'Implemented' ? 'Implemented' : 'Pending Approval'}</span>
                </div>
              </div>

              {/* Section 1: Requester Details */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem', marginTop: '0.75rem' }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.65rem' }}>
                  Section 1: Requester Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>Requester / Employee</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', marginTop: '0.15rem' }}>{crData.employeeName || crData.requester || 'Requester'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>Approver</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', marginTop: '0.15rem' }}>{crData.decidedBy || crData.approver || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>Employee ID</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace', marginTop: '0.15rem' }}>{crData.employeeId || crData.empId || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>Employee Email</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', marginTop: '0.15rem' }}>{crData.employeeEmail || crData.requesterEmail || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>Location</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', marginTop: '0.15rem' }}>{crData.location || 'Not specified'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>Manager Email</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', marginTop: '0.15rem' }}>{crData.managerEmail || '—'}</div>
                  </div>
                </div>
              </div>

              {/* Section 2: Change Details */}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.65rem' }}>
                  Section 2: Change Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>Change Title</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', marginTop: '0.15rem' }}>{crData.title}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>Category</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', marginTop: '0.15rem' }}>{crData.category}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>Sub-category</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', marginTop: '0.15rem' }}>{crData.subCategory || 'Standard'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>Start Date</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', fontFamily: 'monospace', marginTop: '0.15rem' }}>{formatCleanDate(crData.startDate)}</div>
                  </div>
                </div>
              </div>

              {/* Dynamic Action & Specification Details Box */}
              {(() => {
                const customFields = getCustomFields(crData);
                if (!customFields.length) return null;
                return (
                  <div style={{
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '1rem 1.25rem',
                    margin: '1rem 0'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                      Action &amp; Specification Details
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                      {customFields.map(([k, v]) => (
                        <div key={k}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B' }}>{formatFieldLabel(k)}</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginTop: '0.15rem', wordBreak: 'break-word' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Raised Date & Justification */}
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.2rem' }}>Raised Date</div>
                  <div style={{ fontSize: '0.85rem', color: '#64748B' }}>{formatLongDate(crData.submittedAt || crData.createdAt) || crData.raisedDate || 'Today'}</div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.35rem' }}>
                    Business Justification
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#1E293B', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.75rem 1rem', borderRadius: '8px', lineHeight: 1.55 }}>
                    {crData.justification || 'No justification entered.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Decision Confirmation Form */}
            <form onSubmit={handleSubmitDecision} style={{ padding: '1.5rem 1.75rem' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.5rem' }}>
                  {isImplement
                    ? 'Implementation Remarks / Execution Notes (Optional)'
                    : isApprove
                      ? 'Approval Comments / Rationale (Optional)'
                      : 'Rejection Reason (Required) *'}
                </label>
                <textarea
                  rows={4}
                  required={isReject}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    isImplement
                      ? 'Add any execution notes, deployment logs, or verification comments...'
                      : isApprove
                        ? 'Add any comments, conditions, or instructions for implementation...'
                        : 'Please explain why this change request cannot be approved...'
                  }
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.95rem',
                    borderRadius: '8px',
                    border: formError ? '1.5px solid #DC2626' : '1px solid #CBD5E1',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    backgroundColor: '#F8FAFC',
                    boxSizing: 'border-box'
                  }}
                />
                {formError && (
                  <div style={{ color: '#DC2626', fontSize: '0.8rem', marginTop: '0.4rem', fontWeight: 600 }}>
                    {formError}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.85rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.75rem',
                    backgroundColor: isImplement ? '#0D9488' : isApprove ? '#059669' : '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                    boxShadow: isImplement ? '0 2px 6px rgba(13, 148, 136, 0.3)' : isApprove ? '0 2px 6px rgba(5, 150, 105, 0.3)' : '0 2px 6px rgba(220, 38, 38, 0.3)'
                  }}
                >
                  <Send size={16} />
                  <span>
                    {submitting
                      ? 'Submitting...'
                      : isImplement
                        ? 'Submit as Implemented'
                        : isApprove
                          ? 'Confirm Approval'
                          : 'Confirm Rejection'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
