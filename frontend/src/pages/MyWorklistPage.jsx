import React, { useState, useEffect } from 'react';
import { Clock, Check, X, ChevronLeft } from 'lucide-react';
import ChangeRequestModal from '../components/ui/ChangeRequestModal';
import { API_BASE_URL } from '../lib/config';

export default function MyWorklistPage({ onNavigate }) {
  const defaultItems = [
    {
      id: 'CR-2049',
      title: 'Upgrade payment-gateway API to v4',
      category: 'Software Deployment',
      requester: 'Priya Nair',
      submittedTime: 'submitted 2 days ago',
      risk: 'Medium',
      riskColor: '#D97706',
      riskBars: 2
    },
    {
      id: 'CR-2052',
      title: 'Rotate SSH keys for all bastion hosts',
      category: 'Server / Patching',
      requester: 'Arjun Mehta',
      submittedTime: 'submitted 6 hours ago',
      risk: 'High',
      riskColor: '#DC2626',
      riskBars: 3
    },
    {
      id: 'CR-2051',
      title: 'Open port 8443 for partner API gateway',
      category: 'Network Change',
      requester: 'Sana Iqbal',
      submittedTime: 'submitted 1 day ago',
      risk: 'Medium',
      riskColor: '#D97706',
      riskBars: 2
    },
    {
      id: 'CR-2050',
      title: 'Onboard 12 new hires with standard access bundle',
      category: 'Access & Permissions',
      requester: 'Rahul Verma',
      submittedTime: 'submitted 3 days ago',
      risk: 'Low',
      riskColor: '#059669',
      riskBars: 1
    }
  ];

  const [items, setItems] = useState(defaultItems);
  const [selectedCr, setSelectedCr] = useState(null);
  const [metrics, setMetrics] = useState({
    pending: 4,
    approved: 32,
    rejected: 6,
    sentBack: 3
  });

  useEffect(() => {
    const fetchWorklist = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/worklist`);
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) setItems(body.data);
          if (body.metrics) setMetrics(body.metrics);
        }
      } catch (err) {
        console.warn('Backend API offline, using default worklist data:', err);
      }
    };
    fetchWorklist();
  }, []);

  const handleAction = async (id, action) => {
    try {
      await fetch(`${API_BASE_URL}/worklist/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });
    } catch (err) {
      console.warn('Backend action request failed:', err);
    }

    setItems(prev => prev.filter(item => item.id !== id));
    setMetrics(prev => ({
      ...prev,
      pending: Math.max(0, prev.pending - 1),
      approved: action === 'approve' ? prev.approved + 1 : prev.approved,
      rejected: action === 'reject' ? prev.rejected + 1 : prev.rejected,
      sentBack: action === 'sendback' ? prev.sentBack + 1 : prev.sentBack
    }));
  };

  const metricCards = [
    { id: 'pending', title: 'Pending my review', count: metrics.pending, subtext: 'In your queue right now', subtextColor: 'var(--text-secondary)', icon: Clock, iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'approved', title: 'Approved by you', count: metrics.approved, subtext: 'Last 30 days', subtextColor: '#059669', icon: Check, iconBg: '#D1FAE5', iconColor: '#059669' },
    { id: 'rejected', title: 'Rejected by you', count: metrics.rejected, subtext: 'Last 30 days', subtextColor: 'var(--text-secondary)', icon: X, iconBg: '#FEE2E2', iconColor: '#DC2626' },
    { id: 'sentback', title: 'Sent back for info', count: metrics.sentBack, subtext: 'Last 30 days', subtextColor: 'var(--text-secondary)', icon: ChevronLeft, iconBg: '#F3E8FF', iconColor: '#7C3AED' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            My Worklist
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Change requests awaiting your sign-off as CAB approver
          </p>
        </div>

        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {items.length} awaiting your review
        </span>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem' }}>
        {metricCards.map(card => {
          const IconComp = card.icon;
          return (
            <div
              key={card.id}
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.1rem 1.25rem',
                boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{card.title}</span>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: card.iconBg, color: card.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconComp size={16} strokeWidth={2.5} />
                </div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, marginBottom: '0.35rem' }}>{card.count}</div>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: card.subtextColor }}>{card.subtext}</span>
            </div>
          );
        })}
      </div>

      {/* Approval Worklist Queue Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {items.length > 0 ? (
          items.map(item => (
            <div
              key={item.id}
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{item.id}</span>
                  <strong style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{item.title}</strong>
                  
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.2rem' }}>
                    <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                      {[1, 2, 3].map(bar => (
                        <div key={bar} style={{ width: '3.5px', height: '12px', borderRadius: '1.5px', backgroundColor: bar <= (item.riskBars || 2) ? (item.riskColor || '#D97706') : 'var(--border-color)' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.775rem', fontWeight: 700, color: item.riskColor || '#D97706' }}>{item.risk || 'Medium'}</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {item.category} · requested by <strong>{item.requester}</strong> · {item.submittedTime || 'submitted recently'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button type="button" onClick={() => setSelectedCr(item)} style={{ padding: '0.45rem 0.9rem', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 600, cursor: 'pointer' }}>View</button>
                <button type="button" onClick={() => handleAction(item.id, 'sendback')} style={{ padding: '0.45rem 0.9rem', backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FCD34D', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer' }}>Send back</button>
                <button type="button" onClick={() => handleAction(item.id, 'reject')} style={{ padding: '0.45rem 0.9rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                <button type="button" onClick={() => handleAction(item.id, 'approve')} style={{ padding: '0.45rem 1.1rem', backgroundColor: '#0D9488', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.825rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 2px rgba(13, 148, 136, 0.2)' }}>Approve</button>
              </div>

            </div>
          ))
        ) : (
          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            🎉 All change requests in your queue have been reviewed!
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedCr && (
        <ChangeRequestModal
          cr={selectedCr}
          onClose={() => setSelectedCr(null)}
          onApprove={(id) => handleAction(id, 'approve')}
          onReject={(id) => handleAction(id, 'reject')}
          onSendBack={(id) => handleAction(id, 'sendback')}
        />
      )}

    </div>
  );
}
