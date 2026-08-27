import React from 'react';
import { X } from 'lucide-react';

export default function ChangeRequestModal({ cr, onClose, onApprove, onReject, onSendBack }) {
  if (!cr) return null;

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
              {cr.id} {cr.title}
            </h2>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
              {cr.category} · New release / version upgrade
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
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.75rem', borderRadius: '99px', backgroundColor: '#FEF3C7', color: '#D97706', fontSize: '0.8rem', fontWeight: 700 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#D97706' }} />
              <span>Pending</span>
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

        {/* Lifecycle Visualizer */}
        <div style={{ padding: '1.25rem 1.75rem 1.5rem 1.75rem' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Lifecycle</div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'absolute', top: '10px', left: '20px', right: '20px', height: '2px', backgroundColor: 'var(--border-color)', zIndex: 1 }} />
            <div style={{ position: 'absolute', top: '10px', left: '20px', width: '33%', height: '2px', backgroundColor: '#0D9488', zIndex: 2 }} />

            {['Draft', 'Submitted', 'CAB Review', 'Approved', 'Scheduled', 'Implemented', 'Closed'].map((step, idx) => {
              const isCompleted = idx < 2;
              const isCurrent = idx === 2;
              return (
                <div key={step} style={{ position: 'relative', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: isCurrent ? 'var(--card-bg)' : isCompleted ? '#0D9488' : 'var(--card-bg)',
                    border: isCurrent ? '3px solid #0D9488' : isCompleted ? '2px solid #0D9488' : '2px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {isCompleted && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0D9488' }} />}
                  </div>
                  <span style={{ fontSize: '0.725rem', fontWeight: isCurrent ? 800 : 500, color: isCurrent ? '#0D9488' : 'var(--text-secondary)' }}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dates Grid */}
        <div style={{ padding: '0 1.75rem 1.25rem 1.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Raised date</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>24 Aug 2026</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Closed date</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Open</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Start date</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>29 Aug 2026</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>End date</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>29 Aug 2026</div>
          </div>
        </div>

        {/* Business Justification & Workflow */}
        <div style={{ padding: '0 1.75rem 1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Business justification</div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
              Current v3 API will be deprecated by the vendor on 15 Sep; upgrading avoids a hard cutover and adds webhook support required by Finance.
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Assigned workflow</div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
              Standard Change Workflow
            </div>
          </div>
        </div>

        {/* Employee Details */}
        <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Employee Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Employee</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cr.requester || 'Priya Nair'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Employee ID</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>EMP-10432</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Hostname / Asset</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>PROD-API-GW-01</div>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Location</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ahmedabad HQ</div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '1rem 1.75rem 1.5rem 1.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', backgroundColor: 'var(--card-bg)', position: 'sticky', bottom: 0 }}>
          <button onClick={onClose} style={{ padding: '0.55rem 1.1rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>Close</button>
          <button onClick={() => { if (onReject) onReject(cr.id); onClose(); }} style={{ padding: '0.55rem 1.1rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer' }}>Reject</button>
          <button onClick={() => { if (onApprove) onApprove(cr.id); onClose(); }} style={{ padding: '0.55rem 1.25rem', backgroundColor: '#0D9488', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 3px rgba(13, 148, 136, 0.2)' }}>Approve</button>
        </div>

      </div>
    </div>
  );
}
