import React, { useState } from 'react';
import {
  X,
  Plane,
  Car,
  Bus,
  Train,
  Building2,
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  User,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Check
} from 'lucide-react';

const MODE_ICONS = {
  Flight: Plane,
  Cab: Car,
  Bus: Bus,
  Train: Train,
  Hotel: Building2
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

const formatCleanTime = (d) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export default function TravelDetailsModal({ item, onClose, onApprove, onReject, user }) {
  if (!item) return null;

  const [actionPrompt, setActionPrompt] = useState(null); // 'approve' | 'reject'
  const [commentInput, setCommentInput] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [hoveredStepIdx, setHoveredStepIdx] = useState(null);

  const roleName = (user?.role || '').toLowerCase();
  const roleId = user?.roleId || '';
  const isSuperAdmin = roleId === 'role-1' || roleName.includes('super');
  const isBoardUser = roleId === 'role-board' || roleName.includes('board');
  const isTravelAdmin = roleId === 'role-2-travel' || (roleName.includes('admin') && roleName.includes('travel'));

  const status = item.status || 'Pending Approval';
  const isApproved = status.toLowerCase().includes('approved') || status.toLowerCase().includes('booked') || status.toLowerCase().includes('ticketed');
  const isRejected = status.toLowerCase().includes('rejected');
  const isPending = !isApproved && !isRejected;

  const steps = isRejected
    ? ['Requested', 'Rejected']
    : ['Requested', 'Approved'];

  const currentStepIdx = (isApproved || isRejected) ? 1 : 0;

  const getStepDate = (stepName) => {
    const todayFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (stepName === 'Requested') return item.raisedDate || (item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : todayFormatted));
    if (stepName === 'Approved') return isApproved ? (item.decidedAt ? new Date(item.decidedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : todayFormatted)) : '';
    if (stepName === 'Rejected') return isRejected ? (item.decidedAt ? new Date(item.decidedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : todayFormatted)) : '';
    return '';
  };

  const getStepTime = (stepName) => {
    if (stepName === 'Requested') return formatCleanTime(item.submittedAt || item.createdAt);
    if (stepName === 'Approved') return isApproved ? formatCleanTime(item.decidedAt || item.approvedAt || item.updatedAt) : '';
    if (stepName === 'Rejected') return isRejected ? formatCleanTime(item.decidedAt || item.closedAt || item.updatedAt) : '';
    return '';
  };

  const getStepTooltipInfo = (stepName) => {
    const sDate = getStepDate(stepName);
    if (stepName === 'Requested') {
      return {
        title: 'Submitted Travel Booking',
        author: item.employeeName || item.travellerName || item.requesterName || 'Requester',
        comment: item.purpose || item.tripReason || 'Travel reservation requested.',
        date: sDate
      };
    }
    if (stepName === 'Approved') {
      return {
        title: 'Travel Booking Approved',
        author: item.decidedBy || item.approvedBy || 'Approver',
        comment: item.approvedComment || item.approvalComment || item.comment || 'Travel booking approved.',
        date: sDate
      };
    }
    if (stepName === 'Rejected') {
      return {
        title: 'Travel Booking Rejected',
        author: item.decidedBy || item.approvedBy || 'Approver',
        comment: item.rejectedComment || item.rejectionReason || item.comment || 'Travel booking rejected.',
        date: sDate
      };
    }
    return null;
  };

  // Short notice flight rule: strictly ONLY Board members can approve/reject short notice flights
  const isShortNoticeFlight = Boolean(item.isShortNotice);
  const canActOnModal = isPending && (
    isShortNoticeFlight
      ? isBoardUser // Strictly Board only (disabled for Super Admin & Travel Admin)
      : (isTravelAdmin || isBoardUser || isSuperAdmin)
  );

  const statusColor = isApproved ? '#059669' : isRejected ? '#DC2626' : isShortNoticeFlight ? '#DC2626' : '#D97706';
  const statusBg = isApproved ? '#ECFDF5' : isRejected ? '#FEF2F2' : isShortNoticeFlight ? '#FEF2F2' : '#FFFBEB';
  const statusDot = isApproved ? '#10B981' : isRejected ? '#EF4444' : isShortNoticeFlight ? '#EF4444' : '#F59E0B';

  const mode = item.travelMode || item.category || 'Flight';
  const IconComponent = MODE_ICONS[mode] || Plane;
  const booking = item.bookingDetails || {};

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
      console.error('Error processing travel action:', err);
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
              <IconComponent size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary, #0F172A)', margin: 0 }}>
                  Travel Booking Details
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
                {mode} reservation and itinerary review
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
          
          {/* Section 1: Route Spotlight */}
          <div style={{
            padding: '1.25rem',
            backgroundColor: 'var(--input-bg, #F8FAFC)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #E2E8F0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {mode === 'Hotel' ? 'Location' : 'Origin'}
                </span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {item.fromLocation || item.toLocation || 'Not specified'}
                </div>
              </div>

              {mode !== 'Hotel' && item.toLocation && (
                <>
                  <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    <ArrowRight size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Destination
                    </span>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                      {item.toLocation}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.775rem', fontWeight: 600, backgroundColor: '#EFF6FF', color: '#2563EB', padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
                {mode} {item.tripType ? `• ${item.tripType}` : ''}
              </span>
              {item.travelClass && (
                <span style={{ fontSize: '0.775rem', fontWeight: 500, backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
                  {item.travelClass}
                </span>
              )}
              {item.isShortNotice && (
                <span style={{ fontSize: '0.775rem', fontWeight: 700, backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '0.25rem 0.65rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <AlertTriangle size={12} /> Short-Notice (&lt; 7d)
                </span>
              )}
            </div>
          </div>

          {/* Lifecycle Visualizer (Requested -> Approved / Rejected) */}
          <div style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'var(--input-bg, #F8FAFC)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #E2E8F0)'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Lifecycle
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', padding: '0 0.5rem' }}>
              {steps.map((step, idx) => {
                const isLast = idx === steps.length - 1;
                const isStepCompleted = idx <= currentStepIdx;
                const isStepRejected = isRejected && idx === currentStepIdx;

                const stepColor = isStepRejected ? '#DC2626' : isStepCompleted ? '#10B981' : 'var(--border-color)';
                const circleBg = isStepRejected ? '#DC2626' : isStepCompleted ? '#10B981' : 'var(--card-bg)';
                const circleBorder = isStepRejected ? '2px solid #DC2626' : isStepCompleted ? '2px solid #10B981' : '2px solid var(--border-color)';
                const textColor = isStepRejected ? '#DC2626' : isStepCompleted ? '#10B981' : 'var(--text-secondary)';

                const nextStepCompleted = (idx + 1) <= currentStepIdx;
                const nextStepRejected = isRejected && (idx + 1) === currentStepIdx;
                const connectorColor = nextStepRejected ? '#DC2626' : nextStepCompleted ? '#10B981' : 'var(--border-color)';

                const stepDate = getStepDate(step);
                const stepTime = getStepTime(step);
                const tooltipInfo = getStepTooltipInfo(step);

                return (
                  <React.Fragment key={step}>
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

                      <span style={{ fontSize: '0.825rem', fontWeight: 800, color: textColor, textAlign: 'center', marginTop: '0.5rem' }}>
                        {step}
                      </span>

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

          {/* Section 2: Traveller & Schedule Details */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.85rem 0' }}>
              Traveller &amp; Schedule
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>Traveller</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {item.employeeName || item.travellerName || item.requesterName || '—'}
                </div>
                {(item.employeeEmail || item.travellerEmail || item.requesterEmail) && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', marginTop: '0.1rem' }}>
                    {item.employeeEmail || item.travellerEmail || item.requesterEmail}
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
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>Requested On</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem', fontFamily: 'var(--font-mono)' }}>
                  {item.raisedDate || (item.submittedAt ? new Date(item.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>Department / Cost Centre</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                  {item.department || item.costCentre || '—'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>{mode === 'Hotel' ? 'Check-in Date' : 'Departure Date'}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem', fontFamily: 'var(--font-mono)' }}>
                  {formatCleanDate(item.departureDate)}
                </div>
                {item.preferredTimeSlot && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Slot: {item.preferredTimeSlot}
                  </div>
                )}
              </div>

              {item.returnDate && (
                <div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>{mode === 'Hotel' ? 'Check-out Date' : 'Return / Onward Date'}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.15rem', fontFamily: 'var(--font-mono)' }}>
                    {formatCleanDate(item.returnDate)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Purpose of Visit */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.5rem 0' }}>
              Purpose of Visit / Business Justification
            </h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', backgroundColor: 'var(--input-bg)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', lineHeight: 1.5 }}>
              {item.purpose || 'No business purpose provided.'}
            </div>
          </div>

          {/* Section 3: Multi-City Flight Legs or Extra Booking Specifications */}
          {Array.isArray(booking?.legs) && booking.legs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                Multi-City Flight Itinerary ({booking.legs.length} Legs)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {booking.legs.map((leg, idx) => (
                  <div
                    key={leg.id || idx}
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--input-bg, #F8FAFC)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: 'var(--brand-primary, #2563EB)',
                        color: '#FFFFFF',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {leg.from} → {leg.to}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={13} />
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCleanDate(leg.travelDate)}</span>
                      </div>
                      {leg.preferredTime && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={13} />
                          <span>{leg.preferredTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {Boolean(booking.returnFlightRequired) && (booking.returnLeg || booking.returnDate) && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: '#EFF6FF',
                      borderRadius: '8px',
                      border: '1px solid #BFDBFE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px'
                      }}>
                        Return Flight
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E3A8A' }}>
                        {booking.returnLeg?.from || booking.returnFrom || item.toLocation || ''} → {booking.returnLeg?.to || booking.returnTo || item.fromLocation || ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.8rem', color: '#1E40AF' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Calendar size={13} />
                        <span style={{ fontWeight: 600 }}>{formatCleanDate(booking.returnLeg?.travelDate || booking.returnDate || item.returnDate)}</span>
                      </div>
                      {(booking.returnLeg?.preferredTime || booking.returnPreferredTime) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={13} />
                          <span>{booking.returnLeg?.preferredTime || booking.returnPreferredTime}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : Object.keys(booking).length > 0 ? (
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.75rem 0' }}>
                Booking Specifications
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', backgroundColor: 'var(--input-bg)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                {Object.entries(booking).map(([key, val]) => {
                  if (!val || typeof val === 'object' || ['Traveller', 'Department / Cost Centre', 'Purpose of visit', 'Date of travel', 'Date of journey', 'Check-in date', 'From', 'To', 'From station', 'To station', 'Trip type', 'legs', 'returnFlightRequired'].includes(key)) return null;
                  return (
                    <div key={key}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{key}</div>
                      <div style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.1rem' }}>{String(val)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

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
                    {isApproved ? 'Approved & Confirmed' : isRejected ? 'Rejected Decision' : 'Review History'}
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

          {/* Short-notice Flight Board Approval Notice */}
          {isShortNoticeFlight && isPending && !isBoardUser && (
            <div style={{
              padding: '0.85rem 1.1rem',
              backgroundColor: '#FEF2F2',
              borderRadius: '8px',
              border: '1px solid #FECACA',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}>
              <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
              <div style={{ fontSize: '0.825rem', color: '#991B1B', lineHeight: 1.4 }}>
                <strong>Short-Notice Flight Notice (&lt; 7 days):</strong> This flight departure is within 7 days and requires direct authorization from the <strong>Board of Directors</strong>. Travel Admin actions are restricted.
              </div>
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
                {actionPrompt === 'approve' ? 'Approve Travel Request' : 'Reject Travel Request'}
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
                  Approve Travel
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
