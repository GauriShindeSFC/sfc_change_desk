import React, { useState } from 'react';
import { ChevronRight, ArrowRight } from 'lucide-react';
import ChangeRequestModal from './ChangeRequestModal';

export default function RecentChangeRequests({ onNavigate }) {
  const [selectedCr, setSelectedCr] = useState(null);

  const changeRequests = [
    {
      id: 'CR-2049',
      title: 'Upgrade payment-gateway API to v4',
      category: 'Software Deployment',
      requester: 'Gauri Shinde',
      risk: 'Medium',
      riskColor: '#D97706',
      riskBars: 2,
      activeStep: 2,
      status: 'Pending',
      statusBg: '#FEF3C7',
      statusColor: '#D97706',
      statusDot: '#D97706'
    },
    {
      id: 'CR-2048',
      title: 'Apply Q3 security patch for prod DB cluster',
      category: 'Server / Patching',
      requester: 'Gauri Shinde',
      risk: 'High',
      riskColor: '#DC2626',
      riskBars: 3,
      activeStep: 3,
      status: 'Approved',
      statusBg: '#D1FAE5',
      statusColor: '#059669',
      statusDot: '#059669'
    },
    {
      id: 'CR-2044',
      title: 'Add VLAN for new Ahmedabad office floor',
      category: 'Network Change',
      requester: 'Gauri Shinde',
      risk: 'Medium',
      riskColor: '#D97706',
      riskBars: 2,
      activeStep: 3,
      status: 'Approved',
      statusBg: '#D1FAE5',
      statusColor: '#059669',
      statusDot: '#059669'
    },
    {
      id: 'CR-2041',
      title: 'Grant elevated access for Finance reporting tool',
      category: 'Access & Permissions',
      requester: 'Gauri Shinde',
      risk: 'Low',
      riskColor: '#059669',
      riskBars: 1,
      activeStep: 6,
      status: 'Closed',
      statusBg: 'var(--input-bg)',
      statusColor: 'var(--text-secondary)',
      statusDot: '#94A0B0'
    },
    {
      id: 'CR-2038',
      title: 'Replace failing switch in Rack B12',
      category: 'Hardware Change',
      requester: 'Gauri Shinde',
      risk: 'Low',
      riskColor: '#059669',
      riskBars: 1,
      activeStep: 4,
      status: 'In Progress',
      statusBg: '#F3E8FF',
      statusColor: '#7C3AED',
      statusDot: '#7C3AED'
    }
  ];

  return (
    <div style={{
      backgroundColor: 'var(--card-bg)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '1.15rem 1.25rem',
      boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)',
      width: '100%',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem'
      }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
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
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <span>View all</span>
          <ArrowRight size={13} />
        </button>
      </div>

      {/* Table List */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-secondary)',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              <th style={{ padding: '0.55rem 0.75rem', borderRadius: '6px 0 0 6px' }}>CR ID</th>
              <th style={{ padding: '0.55rem 0.75rem' }}>TITLE</th>
              <th style={{ padding: '0.55rem 0.75rem' }}>CATEGORY</th>
              <th style={{ padding: '0.55rem 0.75rem' }}>REQUESTER</th>
              <th style={{ padding: '0.55rem 0.75rem' }}>RISK</th>
              <th style={{ padding: '0.55rem 0.75rem' }}>STATUS</th>
              <th style={{ padding: '0.55rem 0.75rem', textAlign: 'right', borderRadius: '0 6px 6px 0' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {changeRequests.map((cr, idx) => (
              <tr
                key={cr.id}
                style={{
                  borderBottom: idx === changeRequests.length - 1 ? 'none' : '1px solid var(--border-color)'
                }}
              >
                <td style={{ padding: '0.75rem 0.75rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {cr.id}
                </td>
                <td style={{ padding: '0.75rem 0.75rem', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {cr.title}
                </td>
                <td style={{ padding: '0.75rem 0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {cr.category}
                </td>
                <td style={{ padding: '0.75rem 0.75rem', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                  {cr.requester}
                </td>
                <td style={{ padding: '0.75rem 0.75rem' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                      {[1, 2, 3].map(bar => (
                        <div
                          key={bar}
                          style={{
                            width: '3px',
                            height: '11px',
                            borderRadius: '1px',
                            backgroundColor: bar <= cr.riskBars ? cr.riskColor : 'var(--border-color)'
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: cr.riskColor }}>
                      {cr.risk}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '0.75rem 0.75rem' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '99px',
                    backgroundColor: cr.statusBg,
                    color: cr.statusColor,
                    fontSize: '0.725rem',
                    fontWeight: 700
                  }}>
                    <span style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      backgroundColor: cr.statusDot
                    }} />
                    <span>{cr.status}</span>
                  </div>
                </td>
                <td style={{ padding: '0.75rem 0.75rem', textAlign: 'right' }}>
                  <button
                    onClick={() => setSelectedCr(cr)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <span>Details</span>
                    <ChevronRight size={13} />
                  </button>
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
