import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle2, RotateCw, XCircle } from 'lucide-react';
import RecentChangeRequests from '../components/ui/RecentChangeRequests';
import { apiFetch } from '../lib/apiFetch';

export default function DashboardPage({ onNavigate, user }) {
  const [metrics, setMetrics] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [mRes, cRes, sRes] = await Promise.all([
          apiFetch('/metrics'),
          apiFetch('/categories'),
          apiFetch('/status-breakdown')
        ]);
        if (mRes.ok) {
          const mData = await mRes.json();
          if (mData.data && Array.isArray(mData.data)) setMetrics(mData.data);
        }
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData.data && Array.isArray(cData.data)) setCategoryData(cData.data);
        }
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.data && Array.isArray(sData.data)) setStatusBreakdown(sData.data);
        }
      } catch (err) {
        console.warn('Backend API offline, using default dashboard data:', err);
      }
    };
    fetchDashboardData();
  }, []);

  const getMetricIcon = (m) => {
    if (m.isTotal || m.title.includes('Total')) return <FileText size={18} color="#2563EB" />;
    if (m.isPending || m.title.includes('Pending')) return <Clock size={18} color="#D97706" />;
    if (m.isApproved || m.title.includes('Approved')) return <CheckCircle2 size={18} color="#059669" />;
    if (m.isInProgress || m.title.includes('Progress')) return <RotateCw size={18} color="#7C3AED" />;
    return <XCircle size={18} color="#DC2626" />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          Change Overview
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Snapshot across all active and historical change requests · updated just now
        </p>
      </div>

      {/* 5 KPI Metric Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: '1rem'
      }}>
        {metrics.map((m, idx) => {
          const filterMap = {
            'Total Change Requests': 'All',
            'Pending Approval': 'Pending',
            'Approved': 'Approved',
            'In Progress': 'In progress',
            'Rejected': 'Rejected',
            'Drafts': 'Draft'
          };
          const targetFilter = filterMap[m.title] || 'All';
          return (
            <div
              key={idx}
              onClick={() => onNavigate && onNavigate('My Requests', { filter: targetFilter })}
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.1rem 1.15rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)',
                minHeight: '115px',
                cursor: 'pointer'
              }}
            >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25, maxWidth: '100px' }}>
                {m.title}
              </span>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: m.iconBg || '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {getMetricIcon(m)}
              </div>
            </div>

            <div style={{ marginTop: '0.6rem' }}>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {(m.value !== undefined && m.value !== null) ? m.value : (m.count ?? m.val ?? 0)}
              </div>
              <div style={{
                fontSize: '0.775rem',
                fontWeight: 700,
                marginTop: '0.35rem',
                color: (m.change || '').includes('▲') ? '#059669' : (m.change || '').includes('▼') ? '#DC2626' : 'var(--text-secondary)'
              }}>
                {m.change}
              </div>
            </div>
          </div>
        );
      })}
      </div>

      {/* Middle Row: Tickets by Category & Status Breakdown Side-by-Side */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.25rem',
        alignItems: 'stretch'
      }}>

        {/* Card 1: Tickets by Category */}
        <div style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.35rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Tickets by Category
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Last 30 days
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {categoryData.map((cat, catIdx) => {
                const labelText = cat.category || cat.label || cat.name || cat.title || `Category ${catIdx + 1}`;
                return (
                  <div key={labelText} style={{ display: 'grid', gridTemplateColumns: '175px 1fr 35px', alignItems: 'center', gap: '1rem' }}>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: 'var(--text-primary, #0F172A)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {labelText}
                    </span>

                    <div style={{ width: '100%', height: '9px', backgroundColor: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${cat.percentage || (cat.count * 2)}%`,
                        backgroundColor: cat.color || '#2563EB',
                        borderRadius: '99px'
                      }} />
                    </div>

                    <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary, #0F172A)', textAlign: 'right' }}>
                      {cat.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 2: Status Breakdown */}
        {(() => {
          const totalCRs = statusBreakdown.reduce((sum, item) => sum + (item.count || 0), 0);
          return (
            <div style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.35rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Status Breakdown
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {totalCRs} total
                  </span>
                </div>

                {/* SVG Donut Ring Chart with Center Text */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0.85rem 0' }}>
                  <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="150" height="150" viewBox="0 0 42 42">
                      <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--border-color)" strokeWidth="4.5" />
                      {(() => {
                        let accumPercent = 0;
                        return statusBreakdown.map((sb) => {
                          const pct = totalCRs > 0 ? (sb.count / totalCRs) * 100 : 0;
                          const offset = 100 - accumPercent + 25;
                          accumPercent += pct;
                          return (
                            <circle
                              key={sb.status || sb.label}
                              cx="21"
                              cy="21"
                              r="15.91549430918954"
                              fill="transparent"
                              stroke={sb.color || '#0D9488'}
                              strokeWidth="4.5"
                              strokeDasharray={`${pct} ${100 - pct}`}
                              strokeDashoffset={offset}
                            />
                          );
                        });
                      })()}
                    </svg>

                    <div style={{ position: 'absolute', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{totalCRs}</div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-primary)', fontWeight: 700 }}>total CRs</div>
                    </div>
                  </div>
                </div>

            {/* Status Breakdown Legend List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
              {statusBreakdown.map((sb, sbIdx) => {
                const statusText = sb.status || sb.label || sb.name || `Status ${sbIdx + 1}`;
                return (
                  <div key={statusText} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: sb.color || '#0D9488' }} />
                      <span style={{ color: 'var(--text-primary, #0F172A)', fontSize: '0.875rem', fontWeight: 700 }}>{statusText}</span>
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-primary, #0F172A)' }}>{sb.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    })()}

      </div>

      {/* Bottom Table: Recent Change Requests */}
      <RecentChangeRequests onNavigate={onNavigate} user={user} />

    </div>
  );
}
