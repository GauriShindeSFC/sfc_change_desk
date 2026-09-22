import React, { useState } from 'react';
import { X, IndianRupee, FileText, CheckCircle2, Clock, XCircle, Building2, Calendar, AlertTriangle, ShieldCheck } from 'lucide-react';

const money = (value) => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

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

export default function PreSpendDetailsModal({ item, onClose, onApprove, onReject, user }) {
  if (!item) return null;

  const [actionPrompt, setActionPrompt] = useState(null); // 'approve' | 'reject'
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const roleName = (user?.role || '').toLowerCase();
  const roleId = user?.roleId || '';
  const isSuperAdmin = roleId === 'role-1' || roleName.includes('super');
  const isBoardUser = roleId === 'role-board' || roleName.includes('board');
  const isPreSpendAdmin = roleId === 'role-2-prespend' || (roleName.includes('admin') && (roleName.includes('spend') || roleName.includes('prespend')));

  const status = item.status || 'Pending Approval';
  const isApproved = status.toLowerCase().includes('approved') || status.toLowerCase().includes('procured');
  const isRejected = status.toLowerCase().includes('rejected');
  const isPending = !isApproved && !isRejected;

  const canActOnModal = isPending && (isPreSpendAdmin || isBoardUser || isSuperAdmin);

  const statusColor = isApproved ? '#059669' : isRejected ? '#DC2626' : '#D97706';
  const statusBg = isApproved ? '#ECFDF5' : isRejected ? '#FEF2F2' : '#FFFBEB';
  const statusDot = isApproved ? '#10B981' : isRejected ? '#EF4444' : '#F59E0B';

  const vendors = Array.isArray(item.vendors) ? item.vendors.filter(v => v && (v.name || v.amount)) : [];
  const commercial = item.commercial || {};

  const handleActionSubmit = async () => {
    if (!actionPrompt) return;
    setIsSubmittingAction(true);
    try {
      if (actionPrompt === 'approve' && onApprove) {
        await onApprove(item.id, 'approve', commentInput.trim());
      } else if (actionPrompt === 'reject' && onReject) {
        await onReject(item.id, 'reject', commentInput.trim());
      }
      onClose();
    } catch (err) {
      console.error('Error processing pre-spend action:', err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1.25rem',
      boxSizing: 'border-box'
    }}>
      <div style={{
        backgroundColor: 'var(--card-bg, #FFFFFF)',
        border: '1px solid var(--border-color, #E2E8F0)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '780px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid var(--border-color, #E2E8F0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--card-bg, #FFFFFF)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IndianRupee size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary, #0F172A)', margin: 0 }}>
                  Pre-Spend Requisition
                </h2>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: 'var(--brand-primary, #2563EB)',
                  backgroundColor: '#EFF6FF',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px'
                }}>
                  {item.requestCode || item.id}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748B)', margin: '0.2rem 0 0 0' }}>
                Financial purchase approval and quotation audit
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '99px',
              backgroundColor: statusBg,
              color: statusColor,
              fontSize: '0.775rem',
              fontWeight: 600
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: statusDot }} />
              <span>{status}</span>
            </div>

            <button
              onClick={onClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #E2E8F0)',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary, #64748B)',
                cursor: 'pointer'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Section 1: Item & Amount Spotlight */}
          <div style={{
            padding: '1.25rem',
            backgroundColor: 'var(--input-bg, #F8FAFC)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #E2E8F0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '1rem'
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Item / Buying Requirement
              </span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.3rem 0 0.5rem 0', lineHeight: 1.4 }}>
                {item.itemDescription || item.buying || item.title}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.775rem', fontWeight: 600, backgroundColor: '#E2E8F0', color: '#334155', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                  {item.category}
                </span>
                {item.subcategory && (
                  <span style={{ fontSize: '0.775rem', fontWeight: 500, backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                    {item.subcategory}
                  </span>
                )}
                {item.isUrgent && (
                  <span style={{ fontSize: '0.775rem', fontWeight: 700, backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '0.2rem 0.6rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <AlertTriangle size={12} /> Urgent Requisition
                  </span>
                )}
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Estimated Amount
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
                {money(item.estimatedAmount || item.amount)}
              </div>
            </div>
          </div>

          {/* Section 2: Requisition & Budget Details */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.85rem 0' }}>
              Requester &amp; Budget Details
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>Requester</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {item.employeeName || item.requesterName || item.requester || '—'}
                </div>
                {(item.employeeEmail || item.requesterEmail) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '0.1rem' }}>
                    {item.employeeEmail || item.requesterEmail}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                  {isRejected ? 'Rejected By' : isApproved ? 'Approved By' : 'Approver'}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: isRejected ? '#DC2626' : isApproved ? '#059669' : 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {item.decidedBy || item.approvedBy || (isApproved ? 'Approved' : isRejected ? 'Rejected' : '—')}
                </div>
                {(item.decidedByEmail || item.approvedByEmail) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '0.1rem' }}>
                    {item.decidedByEmail || item.approvedByEmail}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>Cost Centre</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {item.costCentre || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>Budget Line</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {item.budgetLine || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>Needed By Date</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem', fontFamily: 'var(--font-mono)' }}>
                  {formatCleanDate(item.neededByDate || item.neededBy)}
                </div>
              </div>
            </div>
          </div>

          {/* Business Justification */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.5rem 0' }}>
              Business Justification
            </h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', lineHeight: 1.5 }}>
              {item.justification || item.businessJustification || 'No justification provided.'}
            </div>
          </div>

          {/* Section 3: Vendors & Quotations */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.75rem 0' }}>
              Vendors &amp; Quotations ({vendors.length})
            </h4>
            {vendors.length > 0 ? (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--input-bg)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Vendor</th>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Quoted Amount</th>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Quote Date</th>
                      <th style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Quotation Document</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((v, i) => {
                      const docSrc = v.fileData || v.fileUrl || (typeof v.file === 'string' ? v.file : null);
                      const hasDoc = Boolean(docSrc || v.fileName);
                      return (
                        <tr key={i} style={{ borderBottom: i < vendors.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          <td style={{ padding: '0.65rem 0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{v.name || `Vendor ${i + 1}`}</span>
                              {i === 0 && (
                                <span style={{ fontSize: '0.65rem', backgroundColor: '#E6F4EA', color: '#137333', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                  Primary
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '0.65rem 0.85rem', color: '#059669', fontWeight: 600 }}>{v.amount ? money(v.amount) : '—'}</td>
                          <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{formatCleanDate(v.date)}</td>
                          <td style={{ padding: '0.65rem 0.85rem' }}>
                            {hasDoc ? (
                              <button
                                type="button"
                                title="View attached quotation"
                                onClick={() => {
                                  if (docSrc) {
                                    if (docSrc.startsWith('data:')) {
                                      try {
                                        const parts = docSrc.split(';base64,');
                                        const contentType = parts[0].replace('data:', '') || 'application/pdf';
                                        const raw = window.atob(parts[1]);
                                        const uInt8Array = new Uint8Array(raw.length);
                                        for (let j = 0; j < raw.length; ++j) {
                                          uInt8Array[j] = raw.charCodeAt(j);
                                        }
                                        const blob = new Blob([uInt8Array], { type: contentType });
                                        const blobUrl = URL.createObjectURL(blob);
                                        window.open(blobUrl, '_blank');
                                      } catch {
                                        window.open(docSrc, '_blank');
                                      }
                                    } else {
                                      window.open(docSrc, '_blank');
                                    }
                                  } else {
                                    alert(`Quotation document: ${v.fileName}`);
                                  }
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  padding: '0.25rem 0.6rem',
                                  backgroundColor: '#EFF6FF',
                                  color: '#1D4ED8',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                <FileText size={12} />
                                <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {v.fileName || 'View PDF'}
                                </span>
                              </button>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>None attached</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                No vendor quotes attached.
              </div>
            )}
          </div>

          {/* Section 4: Commercial Reason & Exceptions */}
          {(commercial.exception || commercial.reason || commercial.justification) && (
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.5rem 0' }}>
                Commercial Evaluation &amp; Exception
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', backgroundColor: 'var(--input-bg)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {commercial.exception && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Exception Type</div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>{commercial.exception}</div>
                  </div>
                )}
                {commercial.reason && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Commercial Reason</div>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>{commercial.reason}</div>
                  </div>
                )}
                {commercial.justification && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Commercial Justification</div>
                    <div style={{ fontSize: '0.825rem', color: 'var(--text-primary)', marginTop: '0.15rem' }}>{commercial.justification}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Decision / Approval History Section */}
          {(isApproved || isRejected || item.approvedComment || item.rejectedComment || item.rejectionReason || (Array.isArray(item.comments) && item.comments.length > 0) || (Array.isArray(item.approvalHistory) && item.approvalHistory.length > 0)) && (
            <div style={{
              backgroundColor: isApproved ? '#ECFDF5' : isRejected ? '#FEF2F2' : 'var(--input-bg)',
              border: `1px solid ${isApproved ? '#A7F3D0' : isRejected ? '#FECACA' : 'var(--border-color)'}`,
              borderRadius: '10px',
              padding: '1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={16} style={{ color: isApproved ? '#059669' : isRejected ? '#DC2626' : 'var(--brand-primary)' }} />
                  <span style={{ fontSize: '0.825rem', fontWeight: 700, color: isApproved ? '#065F46' : isRejected ? '#991B1B' : 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {isApproved ? 'Approved & Authorized' : isRejected ? 'Rejected Decision' : 'Review History'}
                  </span>
                </div>
                {(item.approvedDate || item.closedDate) && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                    {item.approvedDate || item.closedDate}
                  </span>
                )}
              </div>

              {(item.decidedBy || item.approvedBy) && (
                <div style={{ fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  Decision by: <span style={{ fontWeight: 700 }}>{item.decidedBy || item.approvedBy}</span>
                  {(item.decidedByEmail || item.approvedByEmail) && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.4rem', fontFamily: 'var(--font-mono)' }}>
                      ({item.decidedByEmail || item.approvedByEmail})
                    </span>
                  )}
                </div>
              )}

              {(item.approvedComment || item.rejectedComment || item.rejectionReason) && (
                <div style={{
                  fontSize: '0.825rem',
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--card-bg, #FFFFFF)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  lineHeight: 1.45,
                  wordBreak: 'break-word'
                }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase' }}>
                    Decision Comment / Reason:
                  </div>
                  {item.approvedComment || item.rejectedComment || item.rejectionReason}
                </div>
              )}

              {/* Audit Comments Log */}
              {Array.isArray(item.comments) && item.comments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {item.comments.map((c, i) => (
                    <div key={c.id || i} style={{ fontSize: '0.8rem', backgroundColor: 'var(--card-bg, #FFFFFF)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.authorName || 'Reviewer'} ({c.authorRole || 'Approver'})</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
                      </div>
                      <div style={{ color: 'var(--text-primary)' }}>{c.text || c.comment}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Prompt (Approve/Reject comment box) */}
          {actionPrompt && (
            <div style={{
              padding: '1rem 1.25rem',
              backgroundColor: actionPrompt === 'approve' ? '#ECFDF5' : '#FEF2F2',
              borderRadius: '10px',
              border: `1px solid ${actionPrompt === 'approve' ? '#A7F3D0' : '#FECACA'}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: actionPrompt === 'approve' ? '#065F46' : '#991B1B' }}>
                {actionPrompt === 'approve' ? 'Approve Pre-Spend Request' : 'Reject Pre-Spend Request'}
              </div>
              <textarea
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder={actionPrompt === 'approve' ? 'Add approval note (optional)...' : 'State reason for rejection...'}
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.825rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setActionPrompt(null)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleActionSubmit}
                  disabled={isSubmittingAction}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '6px',
                    backgroundColor: actionPrompt === 'approve' ? '#059669' : '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {isSubmittingAction ? 'Processing...' : actionPrompt === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.75rem',
          borderTop: '1px solid var(--border-color, #E2E8F0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--card-bg, #FFFFFF)'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #E2E8F0)',
              backgroundColor: 'transparent',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}
          >
            Close
          </button>

          {canActOnModal && (onApprove || onReject) && !actionPrompt && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {onReject && (
                <button
                  onClick={() => setActionPrompt('reject')}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #FECACA',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Reject
                </button>
              )}
              {onApprove && (
                <button
                  onClick={() => setActionPrompt('approve')}
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Approve Requisition
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
