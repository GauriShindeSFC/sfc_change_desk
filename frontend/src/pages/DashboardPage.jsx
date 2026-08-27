import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle2, RotateCw, XCircle } from 'lucide-react';
import RecentChangeRequests from '../components/ui/RecentChangeRequests';
import { apiFetch } from '../lib/apiFetch';

export default function DashboardPage({ onNavigate }) {
  const [metrics, setMetrics] = useState([
    { title: 'Total Change Requests', value: 128, change: '▲ 12 this month', iconBg: '#EBF5FF', iconColor: '#2563EB', isTotal: true },
    { title: 'Pending Approval', value: 17, change: 'CAB review pending', iconBg: '#FEF3C7', iconColor: '#D97706', isPending: true },
    { title: 'Approved', value: 76, change: '▲ 59% of total', iconBg: '#D1FAE5', iconColor: '#059669', isApproved: true },
    { title: 'In Progress', value: 21, change: 'Scheduled this week: 6', iconBg: '#F3E8FF', iconColor: '#7C3AED', isInProgress: true },
    { title: 'Rejected', value: 14, change: '▼ 3 this month', iconBg: '#FEE2E2', iconColor: '#DC2626', isRejected: true }
  ]);

  const [categoryData, setCategoryData] = useState([
    { category: 'Software Deployment', count: 34, color: '#2563EB', percentage: 70 },
    { category: 'Server / Patching', count: 28, color: '#0D9488', percentage: 58 },
    { category: 'Network Change', count: 21, color: '#7C3AED', percentage: 44 },
    { category: 'Access & Permissions', count: 18, color: '#D97706', percentage: 38 },
    { category: 'Hardware Change', count: 13, color: '#475569', percentage: 28 },
    { category: 'Emergency Change', count: 7, color: '#DC2626', percentage: 15 }
  ]);

  const [statusBreakdown, setStatusBreakdown] = useState([
    { status: 'Approved', count: 76, color: '#0D9488' },
    { status: 'Pending', count: 17, color: '#D97706' },
    { status: 'In progress', count: 21, color: '#7C3AED' },
    { status: 'Rejected', count: 14, color: '#DC2626' }
  ]);

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
        {metrics.map((m, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.1rem 1.15rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)',
              minHeight: '115px'
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
                {m.value}
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
        ))}
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
              {categoryData.map(cat => (
                <div key={cat.category} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 35px', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {cat.category}
                  </span>

                  <div style={{ width: '100%', height: '9px', backgroundColor: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${cat.percentage || (cat.count * 2)}%`,
                      backgroundColor: cat.color || '#2563EB',
                      borderRadius: '99px'
                    }} />
                  </div>

                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'right' }}>
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Status Breakdown */}
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
                128 total
              </span>
            </div>

            {/* SVG Donut Ring Chart with Center Text */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0.85rem 0' }}>
              <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="150" height="150" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--border-color)" strokeWidth="4.5" />

                  {/* Approved segment (76 / 128 = 59%) */}
                  <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#0D9488" strokeWidth="4.5" strokeDasharray="59.3 40.7" strokeDashoffset="25" />
                  {/* Pending segment (17 / 128 = 13.3%) */}
                  <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#D97706" strokeWidth="4.5" strokeDasharray="13.3 86.7" strokeDashoffset="65.7" />
                  {/* In progress segment (21 / 128 = 16.4%) */}
                  <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#7C3AED" strokeWidth="4.5" strokeDasharray="16.4 83.6" strokeDashoffset="52.4" />
                  {/* Rejected segment (14 / 128 = 11%) */}
                  <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#DC2626" strokeWidth="4.5" strokeDasharray="11 89" strokeDashoffset="36" />
                </svg>

                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>128</div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-primary)', fontWeight: 700 }}>total CRs</div>
                </div>
              </div>
            </div>

            {/* Status Breakdown Legend List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
              {statusBreakdown.map(sb => (
                <div key={sb.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: sb.color }} />
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 700 }}>{sb.status}</span>
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-primary)' }}>{sb.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Table: Recent Change Requests */}
      <RecentChangeRequests onNavigate={onNavigate} />

    </div>
  );
}
