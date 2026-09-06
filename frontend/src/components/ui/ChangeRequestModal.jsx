import React, { useState } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch';

export default function ChangeRequestModal({ cr, onClose, onApprove, onReject, onSendBack, onSubmitForApproval, onImplement, onAddComment, user }) {
  if (!cr) return null;

  const currentUser = user || JSON.parse(localStorage.getItem('sfc_user') || '{}');
  const userRoleName = (currentUser?.role || '').toLowerCase();
  const userRoleId = currentUser?.roleId || '';
  const isAdminOrSuperAdmin = ['role-1', 'role-2'].includes(userRoleId) || userRoleName.includes('admin') || userRoleName.includes('super');

  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');

  const initialComments = Array.isArray(cr.comments)
    ? cr.comments
    : Array.isArray(cr.customFieldValues?.comments)
    ? cr.customFieldValues.comments
    : [];
  const [commentsList, setCommentsList] = useState(initialComments);
  const [commentInput, setCommentInput] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  const handlePostComment = async () => {
    if (!commentInput.trim()) return;
    setIsPostingComment(true);
    setCommentError('');
    try {
      if (onAddComment) {
        await onAddComment(cr.id, commentInput.trim());
      } else {
        const res = await apiFetch('/worklist/comment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cr.id, text: commentInput.trim() })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to post comment');
        }
      }
      const newCommentObj = {
        id: `cmt-${Date.now()}`,
        authorName: currentUser.name || 'Admin User',
        authorRole: currentUser.role || 'Admin',
        text: commentInput.trim(),
        createdAt: new Date().toISOString()
      };
      setCommentsList(prev => [...prev, newCommentObj]);
      setCommentInput('');
    } catch (err) {
      setCommentError(err.message || 'Error posting comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  const customFields = cr.customFieldValues && typeof cr.customFieldValues === 'object'
    ? Object.entries(cr.customFieldValues).filter(([key, val]) => val !== undefined && val !== null && val !== '' && key !== 'comments')
    : [];

  const statusLower = (cr.status || '').toLowerCase();
  const decisionLower = (cr.myDecision || '').toLowerCase();

  const isImplemented = statusLower === 'implemented';
  const isRejected = statusLower === 'rejected' || decisionLower === 'rejected';
  const isApproved = (statusLower === 'approved' || decisionLower === 'approved') && !isImplemented;
  const isDraft = statusLower === 'draft';

  const statusLabel = isImplemented ? 'Implemented' : isRejected ? 'Rejected' : isApproved ? 'Approved' : isDraft ? 'Draft' : (cr.status || 'Pending');
  const statusBg = isImplemented ? '#E0F2FE' : isRejected ? '#FEE2E2' : isApproved ? '#D1FAE5' : isDraft ? 'var(--input-bg)' : '#FEF3C7';
  const statusColor = isImplemented ? '#0284C7' : isRejected ? '#DC2626' : isApproved ? '#059669' : isDraft ? 'var(--text-secondary)' : '#D97706';
  const statusDot = isImplemented ? '#0284C7' : isRejected ? '#DC2626' : isApproved ? '#059669' : isDraft ? '#94A0B0' : '#D97706';

  const steps = isRejected
    ? ['Draft', 'Change Manager Review', 'Rejected']
    : ['Draft', 'Change Manager Review', 'Approved', 'Implemented'];

  const currentStepIdx = isRejected ? 2
    : isImplemented ? 3
    : isApproved ? 2
    : isDraft ? 0
    : 1;

  const progressPercent = Math.min(100, Math.max(0, (currentStepIdx / (steps.length - 1)) * 100));

  const activeColor = isRejected ? '#DC2626' : isImplemented ? '#0284C7' : isDraft ? '#7C3AED' : '#0D9488';

  const canAct = cr.canAct !== false && !isApproved && !isRejected && !isDraft && !isImplemented;

  return (
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
        maxWidth: '680px',
        maxHeight: '88vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem 1.75rem 1rem 1.75rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
              {cr.id}: {cr.title}
            </h2>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
              {cr.category} {cr.subCategory ? `· ${cr.subCategory}` : ''}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}>
            <X size={20} />
          </button>
        </div>

        {/* Status & Risk */}
        <div style={{ padding: '1.25rem 1.75rem 0.5rem 1.75rem', display: 'flex', alignItems: 'center', gap: '3rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Status</div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '99px',
              backgroundColor: statusBg,
              color: statusColor,
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusDot }} />
              <span>{statusLabel}</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Risk</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                {[1, 2, 3].map(bar => (
                  <div key={bar} style={{ width: '4px', height: '14px', borderRadius: '1.5px', backgroundColor: bar <= (cr.riskBars || 2) ? (cr.riskColor || '#D97706') : 'var(--border-color)' }} />
                ))}
              </div>
              <span style={{ fontSize: '0.825rem', fontWeight: 700, color: cr.riskColor || '#D97706' }}>
                {cr.risk || 'Medium'}
              </span>
            </div>
          </div>
        </div>

        {/* Rejection Rationale Display Banner */}
        {(isRejected || cr.rejectionReason || cr.rejection_reason) && (
          <div style={{ padding: '0.5rem 1.75rem 0.5rem 1.75rem' }}>
            <div style={{
              padding: '1rem 1.25rem',
              backgroundColor: '#FEF2F2',
              borderRadius: '12px',
              border: '1px solid #FCA5A5',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#DC2626' }} />
                <span style={{ fontSize: '0.775rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Rejection Reason / Approver Comments
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#991B1B', margin: 0, lineHeight: 1.5 }}>
                {cr.rejectionReason || cr.rejection_reason || cr.customFieldValues?.rejectionReason || 'This change request was rejected during CAB review.'}
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Lifecycle Visualizer */}
        <div style={{ padding: '1.25rem 1.75rem 1.5rem 1.75rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Lifecycle</div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'absolute', top: '10px', left: '20px', right: '20px', height: '2px', backgroundColor: 'var(--border-color)', zIndex: 1 }} />
            <div style={{ position: 'absolute', top: '10px', left: '20px', width: `${progressPercent}%`, height: '2px', backgroundColor: activeColor, zIndex: 2, transition: 'width 0.3s ease' }} />

            {steps.map((step, idx) => {
              const isCurrent = idx === currentStepIdx;
              const isReached = idx <= currentStepIdx;
              const isStepRejected = isRejected && isCurrent;

              const circleBorder = isStepRejected ? '3px solid #DC2626' : isReached ? `2px solid ${activeColor}` : '2px solid var(--border-color)';
              const circleBg = isStepRejected ? '#DC2626' : isReached ? activeColor : 'var(--card-bg)';
              const textColor = isStepRejected ? '#DC2626' : isCurrent ? activeColor : isReached ? 'var(--text-primary)' : 'var(--text-secondary)';

              return (
                <div key={step} style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: circleBg,
                    border: circleBorder,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {isReached && !isStepRejected && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FFFFFF' }} />}
                  </div>
                  <span style={{ fontSize: '0.725rem', fontWeight: isCurrent ? 800 : 500, color: textColor }}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 1: Employee Details */}
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Section 1: Employee Details</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Requester / Employee</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cr.employeeName || cr.requester || 'Requester'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {isRejected ? 'Rejected By' : isApproved || isImplemented ? 'Approved By' : 'Approver'}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isRejected ? '#DC2626' : isApproved || isImplemented ? '#059669' : 'var(--text-secondary)' }}>
                {cr.decidedBy || cr.approver || (isApproved || isImplemented || isRejected ? 'Gauri Shinde' : '—')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Employee ID</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{cr.employeeId || cr.empId || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Employee Email</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cr.employeeEmail || cr.requesterEmail || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Location</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cr.location || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Manager Email</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cr.managerEmail || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Section 2: Change Details */}
        <div style={{ padding: '1.25rem 1.75rem 0.5rem 1.75rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 1rem 0' }}>Section 2: Change Details</h3>
        </div>

        {/* Dynamic Sub-category Attributes Block */}
        {customFields.length > 0 && (
          <div style={{ padding: '0 1.75rem 1.25rem 1.75rem' }}>
            <div style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--input-bg)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Filled Form Attributes
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                {customFields.map(([key, val]) => {
                  const formattedKey = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (str) => str.toUpperCase());
                  return (
                    <div key={key}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        {formattedKey}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                        {String(val)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Dates Grid */}
        <div style={{ padding: '0 1.75rem 1.25rem 1.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Raised date</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{cr.raisedDate || 'Recently'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Closed date</div>
            <div style={{ fontSize: '0.85rem', color: isImplemented ? '#0284C7' : 'var(--text-secondary)', fontWeight: isImplemented ? 700 : 400 }}>{cr.closedDate || (isImplemented ? 'Today' : 'Open')}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Start date</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{cr.startDate || 'Not specified'}</div>
          </div>
        </div>

        {/* Business Justification & Workflow */}
        <div style={{ padding: '0 1.75rem 1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Business justification</div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              {cr.justification || 'No business justification provided.'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Assigned workflow</div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              {cr.workflow || 'Standard Change Workflow'}
            </div>
          </div>
        </div>

        {/* Comments / Admin Notes Section */}
        <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <MessageSquare size={16} color="#0D9488" />
              <span>Comments & Admin Notes</span>
            </h3>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              {commentsList.length} {commentsList.length === 1 ? 'comment' : 'comments'}
            </span>
          </div>

          {/* Existing comments list */}
          {commentsList.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {commentsList.map((cmt, idx) => (
                <div key={cmt.id || idx} style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--input-bg)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: 800, color: 'var(--text-primary)' }}>{cmt.authorName || 'Admin'}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', backgroundColor: '#EDE9FE', color: '#6D28D9' }}>{cmt.authorRole || 'Admin'}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {cmt.createdAt ? new Date(cmt.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                    {cmt.text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              No comments posted yet.
            </div>
          )}

          {/* Composer */}
          {isAdminOrSuperAdmin ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
              <textarea
                rows={2}
                placeholder="Add an admin note or implementation comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />
              {commentError && <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#DC2626' }}>{commentError}</span>}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handlePostComment}
                  disabled={isPostingComment || !commentInput.trim()}
                  style={{
                    padding: '0.45rem 1rem',
                    backgroundColor: isPostingComment || !commentInput.trim() ? 'var(--border-color)' : '#0D9488',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: isPostingComment || !commentInput.trim() ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isPostingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '0.5rem', backgroundColor: 'var(--input-bg)', borderRadius: '6px' }}>
              🔒 Only Admins and Super Admins can add comments to this change request.
            </div>
          )}
        </div>

        {/* Rejection Prompt Form Overlay */}
        {showRejectPrompt && (
          <div style={{
            padding: '1.25rem 1.75rem',
            borderTop: '1px solid #FCA5A5',
            backgroundColor: '#FEF2F2',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#DC2626' }}>
              Provide Rejection Reason *
            </div>
            <textarea
              rows={3}
              placeholder="Please specify the mandatory rationale for rejecting this request..."
              value={rejectReasonInput}
              onChange={(e) => {
                setRejectReasonInput(e.target.value);
                if (rejectReasonError) setRejectReasonError('');
              }}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                backgroundColor: 'var(--card-bg)',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
            {rejectReasonError && (
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#DC2626' }}>
                {rejectReasonError}
              </span>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setShowRejectPrompt(false)}
                style={{ padding: '0.45rem 0.9rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rejectReasonInput.trim()) {
                    setRejectReasonError('Rejection reason is mandatory.');
                    return;
                  }
                  if (onReject) onReject(cr.id, rejectReasonInput.trim());
                  setShowRejectPrompt(false);
                  onClose();
                }}
                style={{ padding: '0.45rem 1rem', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!showRejectPrompt && (
          <div style={{ padding: '1rem 1.75rem 1.5rem 1.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', backgroundColor: 'var(--card-bg)', position: 'sticky', bottom: 0 }}>
            <button onClick={onClose} style={{ padding: '0.55rem 1.1rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>Close</button>
            
            {isDraft ? (
              <button
                onClick={() => {
                  if (onSubmitForApproval) onSubmitForApproval(cr.id);
                  onClose();
                }}
                style={{
                  padding: '0.55rem 1.25rem',
                  backgroundColor: '#0D9488',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(13, 148, 136, 0.2)'
                }}
              >
                Submit for Approval
              </button>
            ) : canAct ? (
              <>
                {onReject && (
                  <button onClick={() => setShowRejectPrompt(true)} style={{ padding: '0.55rem 1.1rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                )}
                {onApprove && (
                  <button onClick={() => { onApprove(cr.id); onClose(); }} style={{ padding: '0.55rem 1.25rem', backgroundColor: '#0D9488', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 3px rgba(13, 148, 136, 0.2)' }}>Approve</button>
                )}
              </>
            ) : isApproved && isAdminOrSuperAdmin ? (
              <button
                onClick={() => {
                  if (onImplement) onImplement(cr.id);
                  onClose();
                }}
                style={{
                  padding: '0.55rem 1.25rem',
                  backgroundColor: '#0284C7',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(2, 132, 199, 0.2)'
                }}
              >
                Mark as Implemented
              </button>
            ) : (
              <span style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '99px',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: isImplemented ? '#E0F2FE' : isRejected ? '#FEE2E2' : '#D1FAE5',
                color: isImplemented ? '#0284C7' : isRejected ? '#DC2626' : '#059669'
              }}>
                {isImplemented ? '✓ Implemented' : decisionLower === 'approved' ? '✓ You approved' : decisionLower === 'rejected' ? '✕ You rejected' : isApproved ? '✓ Approved' : '✕ Rejected'}
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
