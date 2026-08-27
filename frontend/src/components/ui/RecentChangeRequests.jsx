import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import ChangeRequestModal from './ChangeRequestModal';

export default function RecentChangeRequests({ onNavigate }) {
  const [selectedCr, setSelectedCr] = useState(null);

  const changeRequests = [
    {
      id: 'CR-2049',
      title: 'Upgrade payment-gateway API to v4',
      category: 'Software Deployment',
      requester: 'Aashini Shah',
      risk: 'Medium',
      riskColor: '#D97706',
      riskBars: 2,
      activeStep: 2,
      stepName: 'CAB Review',
      status: 'Pending',
      statusBg: '#FEF3C7',
      statusColor: '#D97706',
      statusDot: '#D97706'
    },
    {
      id: 'CR-2048',
      title: 'Apply Q3 security patch — prod DB cluster',
      category: 'Server / Patching',
      requester: 'Aashini Shah',
      risk: 'High',
      riskColor: '#DC2626',
      riskBars: 3,
      activeStep: 3,
      stepName: 'Approved',
      status: 'Approved',
      statusBg: '#D1FAE5',
      statusColor: '#059669',
      statusDot: '#059669'
    },
    {
      id: 'CR-2044',
      title: 'Add VLAN for new Ahmedabad office floor',
      category: 'Network Change',
      requester: 'Aashini Shah',
      risk: 'Medium',
      riskColor: '#D97706',
      riskBars: 2,
      activeStep: 3,
      stepName: 'Approved',
      status: 'Approved',
      statusBg: '#D1FAE5',
      statusColor: '#059669',
      statusDot: '#059669'
    },
    {
      id: 'CR-2041',
      title: 'Grant elevated access — Finance reporting tool',
      category: 'Access & Permissions',
      requester: 'Aashini Shah',
      risk: 'Low',
      riskColor: '#059669',
      riskBars: 1,
      activeStep: 6,
      stepName: 'Closed',
      status: 'Closed',
      statusBg: 'var(--input-bg)',
      statusColor: 'var(--text-secondary)',
      statusDot: '#94A0B0'
    },
    {
      id: 'CR-2038',
      title: 'Replace failing switch — Rack B12',
      category: 'Hardware Change',
      requester: 'Aashini Shah',
      risk: 'Low',
      riskColor: '#059669',
      riskBars: 1,
      activeStep: 4,
      stepName: 'Implemented',
      status: 'In Progress',
      statusBg: '#F3E8FF',
      statusColor: '#7C3AED',
      statusDot: '#7C3AED'
    }
  ];

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
          onClick={() => onNavigate && onNavigate('My Requests')}
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
          onApprove={() => setSelectedCr(null)}
          onReject={() => setSelectedCr(null)}
          onSendBack={() => setSelectedCr(null)}
        />
      )}

    </div>
  );
}
