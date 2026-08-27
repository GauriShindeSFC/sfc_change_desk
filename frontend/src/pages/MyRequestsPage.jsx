import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import ChangeRequestModal from '../components/ui/ChangeRequestModal';
import { API_BASE_URL } from '../lib/config';

export default function MyRequestsPage({ onNavigate }) {
  const defaultRequests = [
    {
      id: 'CR-2049',
      title: 'Upgrade payment-gateway API to v4',
      category: 'Software Deployment',
      requester: 'Gauri Shinde',
      risk: 'Medium',
      riskColor: '#D97706',
      riskBars: 2,
      raisedDate: '24 Aug 2026',
      closedDate: 'Open',
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
      raisedDate: '22 Aug 2026',
      closedDate: 'Open',
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
      raisedDate: '18 Aug 2026',
      closedDate: 'Open',
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
      raisedDate: '15 Aug 2026',
      closedDate: '16 Aug 2026',
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
      raisedDate: '10 Aug 2026',
      closedDate: 'Open',
      status: 'In progress',
      statusBg: '#F3E8FF',
      statusColor: '#7C3AED',
      statusDot: '#7C3AED'
    }
  ];

  const [requests, setRequests] = useState(defaultRequests);
  const [selectedCr, setSelectedCr] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const fetchMyRequests = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/my-requests`);
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) setRequests(body.data);
        }
      } catch (err) {
        console.warn('Backend API offline, using default my-requests list:', err);
      }
    };
    fetchMyRequests();
  }, []);

  // Filter calculation with safe optional chaining so missing status fields never crash
  const filterCounts = {
    All: Array.isArray(requests) ? requests.length : 0,
    Pending: Array.isArray(requests) ? requests.filter(r => (r.status || '').toLowerCase() === 'pending').length : 0,
    Approved: Array.isArray(requests) ? requests.filter(r => (r.status || '').toLowerCase() === 'approved').length : 0,
    'In progress': Array.isArray(requests) ? requests.filter(r => (r.status || '').toLowerCase() === 'in progress').length : 0,
    Rejected: Array.isArray(requests) ? requests.filter(r => (r.status || '').toLowerCase() === 'rejected').length : 0
  };

  const filteredRequests = activeFilter === 'All'
    ? requests
    : requests.filter(r => (r.status || '').toLowerCase() === activeFilter.toLowerCase());

  const filterTabs = [
    { id: 'All', label: `All (${filterCounts.All})` },
    { id: 'Pending', label: `Pending (${filterCounts.Pending})` },
    { id: 'Approved', label: `Approved (${filterCounts.Approved})` },
    { id: 'In progress', label: `In progress (${filterCounts['In progress']})` },
    { id: 'Rejected', label: `Rejected (${filterCounts.Rejected})` }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            My Requests
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            All change requests created by you or your team
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('Change Request')}
          style={{
            padding: '0.55rem 1.1rem',
            backgroundColor: '#0D9488',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 1px 3px rgba(13, 148, 136, 0.2)'
          }}
        >
          <Plus size={16} />
          <span>+ New Change Request</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {filterTabs.map(tab => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '99px',
                border: '1px solid var(--border-color)',
                backgroundColor: isActive ? '#0D9488' : 'var(--card-bg)',
                color: isActive ? '#FFFFFF' : 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Requests Table */}
      <div style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                <th style={{ padding: '0.75rem 0.85rem' }}>CATEGORY</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>RISK</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>RAISED DATE</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>CLOSED DATE</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>STATUS</th>
                <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map((cr, idx) => (
                  <tr
                    key={cr.id || idx}
                    style={{
                      borderBottom: idx === filteredRequests.length - 1 ? 'none' : '1px solid var(--border-color)'
                    }}
                  >
                    <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.825rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {cr.id}
                    </td>

                    <td style={{ padding: '0.75rem 0.85rem', maxWidth: '320px' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {cr.title}
                      </div>
                    </td>

                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {cr.category}
                      </span>
                    </td>

                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                          {[1, 2, 3].map(bar => (
                            <div
                              key={bar}
                              style={{
                                width: '3.5px',
                                height: '12px',
                                borderRadius: '1.5px',
                                backgroundColor: bar <= (cr.riskBars || 2) ? (cr.riskColor || '#D97706') : 'var(--border-color)'
                              }}
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: cr.riskColor || '#D97706' }}>
                          {cr.risk || 'Medium'}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {cr.raisedDate || '24 Aug 2026'}
                      </span>
                    </td>

                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {cr.closedDate || 'Open'}
                      </span>
                    </td>

                    <td style={{ padding: '0.75rem 0.85rem' }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.2rem 0.65rem',
                        borderRadius: '99px',
                        backgroundColor: cr.statusBg || '#FEF3C7',
                        color: cr.statusColor || '#D97706',
                        fontSize: '0.75rem',
                        fontWeight: 700
                      }}>
                        <span style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          backgroundColor: cr.statusDot || '#D97706'
                        }} />
                        <span>{cr.status || 'Pending'}</span>
                      </div>
                    </td>

                    <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedCr(cr)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#0D9488',
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Details
                      </button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No change requests found for status "{activeFilter}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
