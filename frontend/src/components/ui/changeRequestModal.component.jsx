import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Check } from 'lucide-react';
import { apiFetch } from '../../lib/apiFetch.lib';

export default function ChangeRequestModal({ cr, onClose, onApprove, onReject, onSendBack, onSubmitForApproval, onImplement, onAddComment, user }) {
  if (!cr) return null;

  const currentUser = user || JSON.parse(localStorage.getItem('sfc_user') || '{}');
  const userRoleName = (currentUser?.role || '').toLowerCase();
  const userRoleId = currentUser?.roleId || '';
  const isAdminOrSuperAdmin = ['role-1', 'role-2'].includes(userRoleId) || userRoleName.includes('admin') || userRoleName.includes('super');
  const isChangeManager = userRoleId === 'role-3' || userRoleName.includes('manager');
  const isChangeImplementer = userRoleId === 'role-5' || userRoleName.includes('implementer');
  const userAssignedCats = currentUser?.ciCategories || currentUser?.categoryIds || currentUser?.cmCategories || [];
  const crCatName = (cr.category || '').toLowerCase().trim();
  const crCatId = cr.categoryId || '';
  const isImplementerAssigned = isChangeImplementer && (
    userAssignedCats.includes(crCatId) ||
    userAssignedCats.some(cid => crCatName.includes(cid.toLowerCase()) || cid.toLowerCase().includes(crCatName))
  );
  const canMarkImplemented = (isAdminOrSuperAdmin || isImplementerAssigned);
  const isRequester = !isAdminOrSuperAdmin && !isChangeManager && !isChangeImplementer;
  const isSelfRequest = Boolean(
    (cr.requesterId && currentUser?.id && (String(cr.requesterId) === String(currentUser.id) || String(cr.requesterId) === String(currentUser?.userKey))) ||
    (cr.employeeId && currentUser?.employeeId && String(cr.employeeId).trim().toLowerCase() === String(currentUser.employeeId).trim().toLowerCase()) ||
    (cr.employeeEmail && currentUser?.email && cr.employeeEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase()) ||
    (cr.requesterEmail && currentUser?.email && cr.requesterEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase()) ||
    (cr.customFieldValues?.employeeEmail && currentUser?.email && String(cr.customFieldValues.employeeEmail).trim().toLowerCase() === currentUser.email.trim().toLowerCase())
  );

  const [actionPrompt, setActionPrompt] = useState(null); // { action: 'approve'|'reject'|'implement', title: string, color: string }
  const [actionCommentInput, setActionCommentInput] = useState('');
  const [actionCommentError, setActionCommentError] = useState('');
  const [hoveredStepIdx, setHoveredStepIdx] = useState(null);

  const initialComments = Array.isArray(cr.comments)
    ? cr.comments
    : Array.isArray(cr.customFieldValues?.comments)
    ? cr.customFieldValues.comments
    : [];
  const [commentsList, setCommentsList] = useState(initialComments);

  useEffect(() => {
    const nextComments = Array.isArray(cr.comments)
      ? cr.comments
      : Array.isArray(cr.customFieldValues?.comments)
      ? cr.customFieldValues.comments
      : [];
    setCommentsList(nextComments);
  }, [cr.id, cr.comments, cr.customFieldValues?.comments]);
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

  const formatCleanDate = (d) => {
    if (!d) return 'Not specified';
    const str = String(d).trim();
    if (str.includes('T')) {
      const [datePart] = str.split('T');
      const parts = datePart.split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return str;
  };

  const formatCleanTime = (d) => {
    if (!d) return '';
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) {
      const hasTime = (typeof d === 'string' && (d.includes(':') || (d.includes('T') && !d.endsWith('T00:00:00.000Z')))) || typeof d === 'number' || d instanceof Date;
      if (hasTime) {
        return parsed.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      }
    }
    return '';
  };

  const ignoredKeys = [
    'comments',
    'employeeEmail',
    'employeeId',
    'employeeName',
    'managerEmail',
    'title',
    'category',
    'subCategory',
    'startDate',
    'justification',
    'workflow',
    'approvedBy',
    'approvedComment',
    'implementedComment',
    'rejectedComment',
    'rejectionReason'
  ];

  const categoryLower = (cr.category || '').toLowerCase();
  const isITAsset = categoryLower.includes('asset');
  const isServer = categoryLower.includes('server');
  const isNetwork = categoryLower.includes('network');

  const serverNetworkKeys = [
    'hostingType',
    'vlanRequirement',
    'backupRequired',
    'rebootRequired',
    'operatingSystem',
    'currentOsVersion',
    'targetVersionPatch',
    'kbCve',
    'serverName',
    'ipAddress',
    'cpu',
    'ram',
    'storage'
  ];

  const itAssetKeys = [
    'assetType',
    'assetId',
    'dateOfPurchase',
    'disposalReason',
    'currentQtyInStock',
    'qtyRequired',
    'returnAssetConfiguration'
  ];

  const customFields = cr.customFieldValues && typeof cr.customFieldValues === 'object'
    ? Object.entries(cr.customFieldValues).filter(([key, val]) => {
        if (ignoredKeys.includes(key)) return false;
        if (val === undefined || val === null) return false;
        if (typeof val === 'string' && val.trim() === '') return false;
        if (isITAsset && serverNetworkKeys.includes(key)) return false;
        if ((isServer || isNetwork) && itAssetKeys.includes(key)) return false;
        return true;
      })
    : [];

  // Ensure Action Required is always displayed if available on cr
  const hasActionInFields = customFields.some(([k]) => k === 'actionRequired' || k === 'action');
  const requestAction = cr.action || cr.actionRequired || cr.customFieldValues?.actionRequired;
  if (!hasActionInFields && requestAction && typeof requestAction === 'string' && requestAction.trim()) {
    customFields.unshift(['actionRequired', requestAction.trim()]);
  }

  const statusLower = (cr.status || '').toLowerCase();
  const decisionLower = (cr.myDecision || '').toLowerCase();

  const isImplemented = statusLower === 'implemented';
  const isRejected = statusLower === 'rejected' || decisionLower === 'rejected';
  const isApproved = (statusLower === 'approved' || decisionLower === 'approved') && !isImplemented;

  const statusLabel = isImplemented ? 'Implemented' : isRejected ? 'Rejected' : isApproved ? 'Approved' : (cr.status || 'Pending');
  const statusBg = isImplemented ? '#F3E8FF' : isRejected ? '#FEE2E2' : '#FEF3C7';
  const statusColor = isImplemented ? '#7C3AED' : isRejected ? '#DC2626' : '#D97706';
  const statusDot = isImplemented ? '#7C3AED' : isRejected ? '#DC2626' : '#D97706';

  const steps = isRejected
    ? ['Requested', 'Rejected']
    : ['Requested', 'Approved', 'Implemented'];

  const currentStepIdx = isRejected ? 1
    : isImplemented ? 2
    : isApproved ? 1
    : 0;

  const progressPercent = Math.min(100, Math.max(0, (currentStepIdx / (steps.length - 1)) * 100));

  const activeColor = isRejected ? '#DC2626' : isImplemented ? '#7C3AED' : isApproved ? '#D97706' : 'var(--brand-primary)';

  const canAct = cr.canAct !== false && !isApproved && !isRejected && !isImplemented && !isSelfRequest;

  const getStepDate = (stepName) => {
    const todayFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (stepName === 'Requested') return cr.raisedDate || (cr.submittedAt ? new Date(cr.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : todayFormatted);
    if (stepName === 'Approved') return (isApproved || isImplemented) ? (cr.approvedDate || (cr.decidedAt ? new Date(cr.decidedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (cr.updatedAt ? new Date(cr.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : cr.raisedDate || todayFormatted))) : '';
    if (stepName === 'Rejected') return isRejected ? (cr.closedDate || cr.rejectedDate || (cr.closedAt ? new Date(cr.closedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (cr.updatedAt ? new Date(cr.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : cr.raisedDate || todayFormatted))) : '';
    if (stepName === 'Implemented') return isImplemented ? (cr.closedDate || cr.implementedDate || (cr.closedAt ? new Date(cr.closedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (cr.updatedAt ? new Date(cr.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : cr.raisedDate || todayFormatted))) : '';
    return '';
  };

  const getStepTime = (stepName) => {
    if (stepName === 'Requested') return formatCleanTime(cr.submittedAt || cr.createdAt);
    if (stepName === 'Approved') return (isApproved || isImplemented) ? (formatCleanTime(cr.decidedAt || cr.approvedAt || cr.updatedAt)) : '';
    if (stepName === 'Rejected') return isRejected ? (formatCleanTime(cr.closedAt || cr.decidedAt || cr.updatedAt)) : '';
    if (stepName === 'Implemented') return isImplemented ? (formatCleanTime(cr.closedAt || cr.implementedAt || cr.updatedAt)) : '';
    return '';
  };

  const getStepTooltipInfo = (stepName) => {
    const sDate = getStepDate(stepName);
    const sTime = getStepTime(stepName);
    if (stepName === 'Requested') {
      return {
        title: 'Submitted Request',
        author: cr.employeeName || cr.requester || 'Requester',
        comment: cr.justification || 'Change request submitted for review.',
        date: sDate
      };
    }
    if (stepName === 'Approved') {
      const approvalComment =
        cr.approvedComment ||
        cr.approved_comment ||
        cr.approvalRationale ||
        cr.approval_rationale ||
        ([...commentsList].reverse().find(c => {
          const act = (c.action || c.type || c.decision || '').toLowerCase();
          return act === 'approved' || act === 'approve';
        })?.text) ||
        (Array.isArray(cr.approvals) ? cr.approvals.find(a => (a.decision || '').toLowerCase() === 'approved')?.rationale : null) ||
        'Change request approved during Change Manager review.';

      return {
        title: 'Change Manager Approval',
        author: cr.approvedBy || cr.decidedBy || 'Approver',
        comment: approvalComment,
        date: sDate
      };
    }
    if (stepName === 'Rejected') {
      const rejectionComment =
        cr.rejectedComment ||
        cr.rejected_comment ||
        cr.rejectionReason ||
        cr.rejection_reason ||
        cr.customFieldValues?.rejectionReason ||
        ([...commentsList].reverse().find(c => {
          const act = (c.action || c.type || c.decision || '').toLowerCase();
          return act === 'rejected' || act === 'reject';
        })?.text) ||
        (Array.isArray(cr.approvals) ? cr.approvals.find(a => (a.decision || '').toLowerCase() === 'rejected')?.rationale : null) ||
        'Change request rejected during Change Manager review.';

      return {
        title: 'Change Manager Rejection',
        author: cr.rejectedBy || cr.decidedBy || 'Approver',
        comment: rejectionComment,
        date: sDate
      };
    }
    if (stepName === 'Implemented') {
      const implComment =
        cr.implementedComment ||
        cr.implemented_comment ||
        cr.implementationComment ||
        ([...commentsList].reverse().find(c => {
          const act = (c.action || c.type || c.decision || '').toLowerCase();
          return act === 'implemented' || act === 'implement';
        })?.text) ||
        'Change implemented and verified.';

      return {
        title: 'Implementation Completed',
        author: cr.decidedBy || 'Admin',
        comment: implComment,
        date: sDate
      };
    }
    return null;
  };

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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
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

        {/* Status */}
        <div style={{ padding: '1.25rem 1.75rem 0.5rem 1.75rem', display: 'flex', alignItems: 'center', gap: '3rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Status</div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: statusBg,
              color: statusColor,
              fontSize: '0.8rem',
              fontWeight: 500
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusDot }} />
              <span>{statusLabel}</span>
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
                <span style={{ fontSize: '0.775rem', fontWeight: 600, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Rejection Reason / Approver Comments
                </span>
              </div>
              <p style={{ fontSize: '0.9rem', fontWeight: 500, color: '#991B1B', margin: 0, lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {cr.rejectionReason || cr.rejection_reason || cr.customFieldValues?.rejectionReason || 'This change request was rejected during Change Manager review.'}
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Lifecycle Visualizer with Hover Tooltips & Dates */}
        <div style={{ padding: '1.25rem 1.75rem 1.75rem 1.75rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Lifecycle</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', padding: '0 0.5rem' }}>
            {steps.map((step, idx) => {
              const isLast = idx === steps.length - 1;
              const isStepCompleted = idx <= currentStepIdx;
              const isStepRejected = isRejected && idx === currentStepIdx;

              const stepColor = isStepRejected ? '#DC2626' : isStepCompleted ? '#10B981' : 'var(--border-color)';
              const circleBg = isStepRejected ? '#DC2626' : isStepCompleted ? '#10B981' : 'var(--card-bg)';
              const circleBorder = isStepRejected ? '2px solid #DC2626' : isStepCompleted ? '2px solid #10B981' : '2px solid var(--border-color)';
              const textColor = isStepRejected ? '#DC2626' : isStepCompleted ? '#10B981' : 'var(--text-secondary)';

              // Connector line color to next step
              const nextStepCompleted = (idx + 1) <= currentStepIdx;
              const nextStepRejected = isRejected && (idx + 1) === currentStepIdx;
              const connectorColor = nextStepRejected ? '#DC2626' : nextStepCompleted ? '#10B981' : 'var(--border-color)';

              const stepDate = getStepDate(step);
              const stepTime = getStepTime(step);
              const tooltipInfo = getStepTooltipInfo(step);

              return (
                <React.Fragment key={step}>
                  {/* Step Node */}
                  <div
                    onMouseEnter={() => setHoveredStepIdx(idx)}
                    onMouseLeave={() => setHoveredStepIdx(null)}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      minWidth: '100px',
                      zIndex: 3,
                      cursor: isStepCompleted ? 'pointer' : 'default'
                    }}
                  >
                    {/* Circle Node */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: circleBg,
                      border: circleBorder,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform 0.15s ease',
                      transform: hoveredStepIdx === idx ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: isStepCompleted && !isStepRejected ? '0 0 12px rgba(16, 185, 129, 0.25)' : 'none'
                    }}>
                      {isStepRejected ? (
                        <X size={18} color="#FFFFFF" strokeWidth={3} />
                      ) : isStepCompleted ? (
                        <Check size={18} color="#FFFFFF" strokeWidth={3} />
                      ) : null}
                    </div>

                    {/* Step Title */}
                    <span style={{ fontSize: '0.825rem', fontWeight: 800, color: textColor, textAlign: 'center', marginTop: '0.5rem' }}>
                      {step}
                    </span>

                    {/* Step Date & Time */}
                    {stepDate && (
                      <span style={{ fontSize: '0.725rem', color: isStepCompleted ? '#10B981' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textAlign: 'center', marginTop: '0.2rem', fontWeight: 600 }}>
                        {stepDate}
                      </span>
                    )}
                    {stepTime && (
                      <span style={{ fontSize: '0.7rem', color: isStepCompleted ? '#059669' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', textAlign: 'center', marginTop: '0.1rem', fontWeight: 500 }}>
                        {stepTime}
                      </span>
                    )}

                    {/* Hover Tooltip Popover (Only comment shown) */}
                    {hoveredStepIdx === idx && tooltipInfo && isStepCompleted && (
                      <div style={{
                        position: 'absolute',
                        bottom: '115%',
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '0.65rem 0.85rem',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
                        zIndex: 300,
                        width: '220px',
                        pointerEvents: 'none',
                        ...(idx === 0
                          ? { left: '0px', transform: 'none' }
                          : isLast
                          ? { right: '0px', left: 'auto', transform: 'none' }
                          : { left: '50%', transform: 'translateX(-50%)' })
                      }}>
                        <div style={{ paddingBottom: '0.25rem', marginBottom: '0.3rem', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ fontSize: '0.725rem', fontWeight: 800, color: stepColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {tooltipInfo.title}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500, margin: 0, lineHeight: 1.45, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          "{tooltipInfo.comment}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Connector Line to Next Step (rendered ONLY if NOT the last step) */}
                  {!isLast && (
                    <div style={{
                      flex: 1,
                      height: '2.5px',
                      backgroundColor: connectorColor,
                      marginTop: '15px',
                      transition: 'background-color 0.3s ease'
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Section 1: Requester Details */}
        <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Section 1: Requester Details</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Requester / Employee</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cr.employeeName || cr.requester || 'Requester'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {isRejected ? 'Rejected By' : isApproved || isImplemented ? 'Approved By' : 'Approver'}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 500, color: isRejected ? '#DC2626' : isApproved || isImplemented ? '#059669' : 'var(--text-secondary)' }}>
                {cr.decidedBy || cr.approver || (isApproved || isImplemented || isRejected ? 'Gauri Shinde' : '—')}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Employee ID</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{cr.employeeId || cr.empId || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Employee Email</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cr.employeeEmail || cr.requesterEmail || 'N/A'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Location</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cr.location || 'Not specified'}</div>
            </div>
            {cr.customFieldValues?.managerName && (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Manager Name</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cr.customFieldValues.managerName}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Manager Email</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cr.managerEmail || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Section 2: Change Details */}
        <div style={{ padding: '1.25rem 1.75rem 0.75rem 1.75rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Section 2: Change Details</h3>
          </div>

          {/* Core Change Request Form Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Change Title</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{cr.title || 'Untitled Request'}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Category</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cr.category || 'Server & Infra'}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Sub-category</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cr.subCategory || 'Server Lifecycle'}</div>
            </div>

            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Start Date</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{formatCleanDate(cr.startDate)}</div>
            </div>
          </div>

          {/* Action-specific and Custom Form Fields */}
          {customFields.length > 0 && (
            <div style={{
              padding: '1.1rem 1.25rem',
              backgroundColor: 'var(--input-bg)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Action & Specification Details
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                {customFields.map(([key, val]) => {
                  const formattedKey = key
                    .replace(/([A-Z])/g, ' $1')
                    .replace(/^./, (str) => str.toUpperCase())
                    .replace(/Ip /g, 'IP ')
                    .replace(/Os/g, 'OS')
                    .replace(/Cpu/g, 'CPU')
                    .replace(/Ram/g, 'RAM')
                    .replace(/Kb /g, 'KB ')
                    .replace(/Cve/g, 'CVE')
                    .replace(/Vlan/g, 'VLAN');

                  return (
                    <div key={key}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {formattedKey}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem', wordBreak: 'break-word' }}>
                        {String(val)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Status-Aware Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Raised Date</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{getStepDate('Requested') || cr.raisedDate || 'Recently'}</div>
            </div>

            {isImplemented ? (
              <>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Approved Date</div>
                  <div style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getStepDate('Approved') || cr.approvedDate || 'Approved'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Implemented Date</div>
                  <div style={{ fontSize: '0.85rem', color: '#0284C7', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getStepDate('Implemented') || cr.implementedDate || cr.closedDate || 'Implemented'}</div>
                </div>
              </>
            ) : isApproved ? (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Approved Date</div>
                <div style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getStepDate('Approved') || cr.approvedDate || 'Approved'}</div>
              </div>
            ) : isRejected ? (
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Rejected Date</div>
                <div style={{ fontSize: '0.85rem', color: '#DC2626', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{getStepDate('Rejected') || cr.rejectedDate || cr.closedDate || 'Rejected'}</div>
              </div>
            ) : null}
          </div>

          {/* Business Justification */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Business Justification</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                {cr.justification || 'No business justification provided.'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Confirmation Modal Popup (Approve / Reject / Implement) */}
        {actionPrompt && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 400,
            padding: '1rem'
          }}>
            <div style={{
              backgroundColor: 'var(--card-bg)',
              border: `1px solid ${actionPrompt.color === '#DC2626' ? '#FCA5A5' : 'var(--border-color)'}`,
              borderRadius: '16px',
              width: '100%',
              maxWidth: '500px',
              padding: '1.5rem 1.75rem',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: actionPrompt.color, margin: 0 }}>
                    {actionPrompt.title}
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
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.35rem', margin: 0, lineHeight: 1.4 }}>
                  {actionPrompt.action === 'implement'
                    ? 'A comment explaining what has been done'
                    : actionPrompt.action === 'reject'
                    ? 'Please provide the reason for rejection.'
                    : 'A comment explaining what has been done'}
                </p>
              </div>

              <textarea
                rows={4}
                placeholder="Enter comment..."
                value={actionCommentInput}
                onChange={(e) => {
                  setActionCommentInput(e.target.value);
                  if (actionCommentError) setActionCommentError('');
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.95rem',
                  backgroundColor: 'var(--input-bg)',
                  border: `1px solid ${actionCommentError ? '#DC2626' : 'var(--border-color)'}`,
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  resize: 'vertical'
                }}
              />

              {actionCommentError && (
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#DC2626' }}>
                  {actionCommentError}
                </span>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setActionPrompt(null);
                    setActionCommentInput('');
                    setActionCommentError('');
                  }}
                  style={{ padding: '0.55rem 1.1rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!actionCommentInput.trim()) {
                      setActionCommentError('Please enter a comment.');
                      return;
                    }
                    const commentText = actionCommentInput.trim();
                    if (actionPrompt.action === 'approve' && onApprove) {
                      cr.approvedComment = commentText;
                      cr.approvedBy = currentUser.name || 'Approver';
                      onApprove(cr.id, commentText);
                    } else if (actionPrompt.action === 'reject' && onReject) {
                      cr.rejectedComment = commentText;
                      cr.rejectionReason = commentText;
                      cr.rejectedBy = currentUser.name || 'Approver';
                      onReject(cr.id, commentText);
                    } else if (actionPrompt.action === 'implement' && onImplement) {
                      cr.implementedComment = commentText;
                      onImplement(cr.id, commentText);
                    }
                    setActionPrompt(null);
                    setActionCommentInput('');
                    onClose();
                  }}
                  style={{ padding: '0.55rem 1.25rem', backgroundColor: actionPrompt.color, color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
                >
                  {actionPrompt.action === 'implement' ? 'Submit for Implement' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ padding: '1rem 1.75rem 1.5rem 1.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', backgroundColor: 'var(--card-bg)', position: 'sticky', bottom: 0 }}>
            <button onClick={onClose} style={{ padding: '0.55rem 1.1rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>Close</button>
            
            {canAct ? (
              <>
                {onReject && (
                  <button onClick={() => { setActionPrompt({ action: 'reject', title: 'Reject Change Request', color: '#DC2626' }); setActionCommentInput(''); }} style={{ padding: '0.55rem 1.1rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                )}
                {onApprove && (
                  <button onClick={() => { setActionPrompt({ action: 'approve', title: 'Approve Change Request', color: '#0D9488' }); setActionCommentInput(''); }} style={{ padding: '0.55rem 1.25rem', backgroundColor: '#0D9488', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 3px rgba(13, 148, 136, 0.2)' }}>Approve</button>
                )}
              </>
            ) : isApproved && canMarkImplemented && !isSelfRequest ? (
              <button
                onClick={() => {
                  setActionPrompt({ action: 'implement', title: 'Mark as Implemented', color: '#0D9488' });
                  setActionCommentInput('');
                }}
                style={{
                  padding: '0.55rem 1.25rem',
                  backgroundColor: 'var(--brand-primary)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                }}
              >
                Mark as Implemented
              </button>
            ) : (
              <span style={{
                padding: '0.45rem 0.95rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: (isApproved || isImplemented) ? '#D1FAE5' : isRejected ? '#FEE2E2' : '#FEF3C7',
                color: (isApproved || isImplemented) ? '#059669' : isRejected ? '#DC2626' : '#92400E',
                border: `1px solid ${(isApproved || isImplemented) ? '#A7F3D0' : isRejected ? '#FCA5A5' : '#FDE68A'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                {(isApproved || isImplemented)
                  ? 'Approved'
                  : isRejected
                  ? 'Rejected'
                  : 'Pending'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
