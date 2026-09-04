import React, { useState } from 'react';
import { X } from 'lucide-react';

export default function ChangeRequestModal({ cr, onClose, onApprove, onReject, onSendBack, onSubmitForApproval }) {
  if (!cr) return null;

  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');

  const customFields = cr.customFieldValues && typeof cr.customFieldValues === 'object'
    ? Object.entries(cr.customFieldValues).filter(([_, val]) => val !== undefined && val !== null && val !== '')
    : [];

  const statusLower = (cr.status || '').toLowerCase();
  const decisionLower = (cr.myDecision || '').toLowerCase();

  const isRejected = statusLower === 'rejected' || decisionLower === 'rejected';
  const isApproved = statusLower === 'approved' || decisionLower === 'approved';
  const isDraft = statusLower === 'draft';

  const statusLabel = isRejected ? 'Rejected' : isApproved ? 'Approved' : isDraft ? 'Draft' : (cr.status || 'Pending');
  const statusBg = isRejected ? '#FEE2E2' : isApproved ? '#D1FAE5' : isDraft ? 'var(--input-bg)' : '#FEF3C7';
  const statusColor = isRejected ? '#DC2626' : isApproved ? '#059669' : isDraft ? 'var(--text-secondary)' : '#D97706';
  const statusDot = isRejected ? '#DC2626' : isApproved ? '#059669' : isDraft ? '#94A0B0' : '#D97706';

  const steps = isRejected
    ? ['Draft', 'CAB Review', 'Rejected']
    : ['Draft', 'CAB Review', 'Approved', 'Scheduled', 'Implemented', 'Closed'];

  const currentStepIdx = isRejected ? 2
    : isApproved ? 2
    : isDraft ? 0
    : statusLower === 'in progress' || statusLower === 'scheduled' ? 3
    : statusLower === 'implemented' ? 4
    : statusLower === 'closed' ? 5
    : 1;

  const progressPercent = Math.min(100, Math.max(0, (currentStepIdx / (steps.length - 1)) * 100));

  const activeColor = isRejected ? '#DC2626' : isDraft ? '#7C3AED' : '#0D9488';

  const canAct = cr.canAct !== false && !isApproved && !isRejected && !isDraft;

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
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cr.closedDate || 'Open'}</div>
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

        {/* Employee & Asset Details */}
        <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Employee Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Requester / Employee</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cr.employeeName || cr.requester || 'Requester'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {isRejected ? 'Rejected By' : isApproved ? 'Approved By' : 'Approver'}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isRejected ? '#DC2626' : isApproved ? '#059669' : 'var(--text-secondary)' }}>
                {cr.decidedBy || cr.approver || (isApproved || isRejected ? 'Gauri Shinde' : '—')}
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
            ) : (
              <span style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '99px',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: isRejected ? '#FEE2E2' : '#D1FAE5',
                color: isRejected ? '#DC2626' : '#059669'
              }}>
                {decisionLower === 'approved' ? '✓ You approved' : decisionLower === 'rejected' ? '✕ You rejected' : isApproved ? '✓ Approved' : '✕ Rejected'}
              </span>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
