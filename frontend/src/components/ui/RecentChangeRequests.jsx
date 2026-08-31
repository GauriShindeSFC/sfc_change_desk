import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import ChangeRequestModal from './ChangeRequestModal';
import { apiFetch } from '../../lib/apiFetch';

export default function RecentChangeRequests({ onNavigate, user }) {
  const [selectedCr, setSelectedCr] = useState(null);
  const [changeRequests, setChangeRequests] = useState([]);

  const roleName = (user?.role || '').toLowerCase();
  const roleId = user?.roleId || '';
  const isApprover = roleName.includes('cab') || roleName.includes('manager') || roleName.includes('admin') || ['role-1', 'role-2', 'role-3'].includes(roleId);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await apiFetch('/change-requests/recent?limit=5');
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) setChangeRequests(body.data);
        }
      } catch (err) {
        console.warn('Failed to fetch recent change requests:', err);
      }
    };
    fetchRecent();
  }, []);

  const pipelineSteps = ['Draft', 'Submitted', 'CAB Review', 'Approved', 'Scheduled', 'Implemented', 'Closed'];

  return (
    <div style={{
      backgroundColor: 'var(--card-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '1.25rem 1.5rem',
      boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)',
      width: '100%'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          Recent Change Requests
        </h3>

        <button
          onClick={() => onNavigate && onNavigate('Organization worklist')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#0D9488',
            fontSize: '0.825rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <span>View all</span>
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Table List */}
      <div className="cd-scroll-x">
        <table style={{ width: '100%', minWidth: '720px', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-secondary)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <th style={{ padding: '0.75rem 0.85rem' }}>CR ID</th>
              <th style={{ padding: '0.75rem 0.85rem' }}>TITLE</th>
              <th style={{ padding: '0.75rem 0.85rem' }}>REQUESTER</th>
              <th style={{ padding: '0.75rem 0.85rem' }}>CATEGORY</th>
              <th style={{ padding: '0.75rem 0.85rem' }}>RISK</th>
              <th style={{ padding: '0.75rem 0.85rem' }}>LIFECYCLE</th>
              <th style={{ padding: '0.75rem 0.85rem' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {changeRequests.map((cr, idx) => (
              <tr
                key={cr.id}
                onClick={() => setSelectedCr(cr)}
                style={{
                  borderBottom: idx === changeRequests.length - 1 ? 'none' : '1px solid var(--border-color)',
                  cursor: 'pointer'
                }}
              >
                <td style={{ padding: '0.85rem 0.85rem', fontSize: '0.825rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {cr.id}
                </td>

                <td style={{ padding: '0.85rem 0.85rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {cr.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                    {cr.category}
                  </div>
                </td>

                <td style={{ padding: '0.85rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {cr.requester}
                </td>

                <td style={{ padding: '0.85rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-primary)' }}>
                  {cr.category}
                </td>

                <td style={{ padding: '0.85rem 0.85rem' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                      {[1, 2, 3].map(bar => (
                        <div
                          key={bar}
                          style={{
                            width: '3.5px',
                            height: '12px',
                            borderRadius: '1.5px',
                            backgroundColor: bar <= cr.riskBars ? cr.riskColor : 'var(--border-color)'
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.775rem', fontWeight: 700, color: cr.riskColor }}>
                      {cr.risk}
                    </span>
                  </div>
                </td>

                {/* Clean Horizontal Lifecycle Pipeline Track */}
                <td style={{ padding: '0.85rem 0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {pipelineSteps.map((step, sIdx) => {
                      const isPast = sIdx < cr.activeStep;
                      const isCurrent = sIdx === cr.activeStep;
                      return (
                        <React.Fragment key={step}>
                          <div
                            title={step}
                            style={{
                              width: isCurrent ? '10px' : '7px',
                              height: isCurrent ? '10px' : '7px',
                              borderRadius: '50%',
                              backgroundColor: isPast || isCurrent ? '#0D9488' : 'var(--border-color)',
                              border: isCurrent ? '2px solid #0D9488' : 'none',
                              boxShadow: isCurrent ? '0 0 0 2px rgba(13, 148, 136, 0.2)' : 'none'
                            }}
                          />
                          {sIdx < pipelineSteps.length - 1 && (
                            <div
                              style={{
                                width: '10px',
                                height: '2px',
                                backgroundColor: isPast ? '#0D9488' : 'var(--border-color)'
                              }}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </td>

                <td style={{ padding: '0.85rem 0.85rem' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '99px',
                    backgroundColor: cr.statusBg,
                    color: cr.statusColor,
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: cr.statusDot
                    }} />
                    <span>{cr.status}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Change Request Details Modal */}
      {selectedCr && (
        <ChangeRequestModal
          cr={selectedCr}
          onClose={() => setSelectedCr(null)}
          onApprove={isApprover ? () => setSelectedCr(null) : null}
          onReject={isApprover ? () => setSelectedCr(null) : null}
          onSendBack={isApprover ? () => setSelectedCr(null) : null}
        />
      )}

    </div>
  );
}
