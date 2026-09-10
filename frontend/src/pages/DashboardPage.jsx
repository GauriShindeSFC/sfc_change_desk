import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Clock, CheckCircle2, RotateCw, XCircle, Layers, PieChart,
  TrendingUp, TrendingDown, Minus, Sunrise, Sun, Moon
} from 'lucide-react';
import { apiFetch } from '../lib/apiFetch';

const METRIC_STYLES = [
  { match: (m) => m.isTotal || m.title.includes('Total'), icon: FileText, color: '#2563EB', tint: '#EFF6FF' },
  { match: (m) => m.isPending || m.title.includes('Pending'), icon: Clock, color: '#D97706', tint: '#FFFBEB' },
  { match: (m) => m.isApproved || m.title.includes('Approved'), icon: CheckCircle2, color: '#059669', tint: '#ECFDF5' },
  { match: (m) => m.isInProgress || m.isImplemented || m.title.includes('Progress') || m.title.includes('Implemented'), icon: RotateCw, color: '#7C3AED', tint: '#F5F3FF' },
  { match: () => true, icon: XCircle, color: '#DC2626', tint: '#FEF2F2' }
];
const getMetricStyle = (m) => METRIC_STYLES.find((s) => s.match(m)) || METRIC_STYLES[METRIC_STYLES.length - 1];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning', Icon: Sunrise };
  if (h < 17) return { text: 'Good Afternoon', Icon: Sun };
  return { text: 'Good Evening', Icon: Moon };
};

function DashboardPage({ onNavigate, user, isOrgDashboard }) {
  const [metrics, setMetrics] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [hoveredStatus, setHoveredStatus] = useState(null);
  const dashboardRequestInFlight = useRef(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (document.hidden || dashboardRequestInFlight.current) return;
      dashboardRequestInFlight.current = true;
      try {
        const query = isOrgDashboard ? '?scope=organization' : '';
        const [mRes, cRes, sRes] = await Promise.all([
          apiFetch(`/metrics${query}`),
          apiFetch(`/categories${query}`),
          apiFetch(`/status-breakdown${query}`)
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
      } finally {
        dashboardRequestInFlight.current = false;
      }
    };
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    window.addEventListener('focus', fetchDashboardData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchDashboardData);
    };
  }, [isOrgDashboard]);

  const DEFAULT_CATEGORIES = [
    { category: 'Server & Infra', label: 'Server & Infra', count: 0, color: '#2563EB', percentage: 0 },
    { category: 'Network & Connectivity', label: 'Network & Connectivity', count: 0, color: '#0D9488', percentage: 0 },
    { category: 'Access & Security', label: 'Access & Security', count: 0, color: '#7C3AED', percentage: 0 },
    { category: 'IT Asset', label: 'IT Asset', count: 0, color: '#D97706', percentage: 0 },
    { category: 'Office 365 & Collaboration', label: 'Office 365 & Collaboration', count: 0, color: '#475569', percentage: 0 },
    { category: 'Security Tools & Policies', label: 'Security Tools & Policies', count: 0, color: '#DC2626', percentage: 0 }
  ];

  const DEFAULT_STATUSES = [
    { status: 'Approved', label: 'Approved', count: 0, color: '#059669' },
    { status: 'Pending', label: 'Pending', count: 0, color: '#D97706' },
    { status: 'Implemented', label: 'Implemented', count: 0, color: '#7C3AED' },
    { status: 'Rejected', label: 'Rejected', count: 0, color: '#DC2626' },
    { status: 'Draft', label: 'Draft', count: 0, color: '#64748B' }
  ];

  // Align categories strictly with the 6 canonical categories in exact order
  const displayCategories = DEFAULT_CATEGORIES.map((def) => {
    const found = categoryData.find(
      (c) => (c.name || c.category || c.label || '').trim().toLowerCase() === def.category.toLowerCase()
    );
    return found ? { ...def, ...found } : def;
  });

  const displayStatuses = statusBreakdown.length > 0 ? statusBreakdown : DEFAULT_STATUSES;
  const totalCRs = statusBreakdown.reduce((sum, item) => sum + (item.count || 0), 0);
  const totalCategoryCount = displayCategories.reduce((sum, c) => sum + (c.count || 0), 0);

  const { text: greetingText, Icon: GreetingIcon } = getGreeting();
  const firstName = (user?.name || '').split(' ')[0] || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
          {isOrgDashboard ? 'Organization Dashboard' : `${greetingText}${firstName ? `, ${firstName}` : ''}`}
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
          {isOrgDashboard
            ? 'Overall company-wide change request metrics and analytics · updated just now'
            : 'Snapshot across your submitted change requests · updated just now'}
        </p>
      </div>

      {/* KPI Metric Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {metrics.map((m, idx) => {
          const filterMap = {
            'Total Change Requests': 'All',
            'Pending Approval': 'Pending',
            'Approved': 'Approved',
            'In Progress': 'Implemented',
            'Implemented': 'Implemented',
            'Rejected': 'Rejected',
            'Drafts': 'Draft'
          };
          const targetFilter = filterMap[m.title] || 'All';
          const style = getMetricStyle(m);
          const Icon = style.icon;
          const changeStr = m.change || '';
          const isUp = changeStr.includes('▲');
          const isDown = changeStr.includes('▼');
          const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
          const trendColor = isUp ? '#059669' : isDown ? '#DC2626' : 'var(--text-secondary)';
          const trendText = changeStr.replace('▲', '').replace('▼', '').trim();

          return (
            <div
              key={idx}
              className="cd-card-hover"
              onClick={() => onNavigate && onNavigate(isOrgDashboard ? 'Organization worklist' : 'My Requests', { filter: targetFilter })}
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderTop: `3px solid ${style.color}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1.1rem 1.15rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-card)',
                minHeight: '125px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.25, maxWidth: '100%' }}>
                  {m.title}
                </span>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: m.iconBg || style.tint,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={18} color={style.color} />
                </div>
              </div>

              <div style={{ marginTop: '0.6rem' }}>
                <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  {(m.value !== undefined && m.value !== null) ? m.value : (m.count ?? m.val ?? 0)}
                </div>
                {trendText && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    marginTop: '0.5rem',
                    padding: '0.15rem 0.5rem 0.15rem 0.35rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: isUp ? 'rgba(5, 150, 105, 0.1)' : isDown ? 'rgba(220, 38, 38, 0.1)' : 'var(--input-bg)'
                  }}>
                    <TrendIcon size={12} style={{ color: trendColor, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: trendColor }}>{trendText}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Row: Tickets by Category & Status Breakdown Side-by-Side (Always Displayed) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.25rem',
        alignItems: 'stretch'
      }}>

        {/* Card 1: Tickets by Category */}
        <div className="cd-card-hover" style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.35rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Layers size={15} style={{ color: 'var(--text-primary)' }} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                  Tickets by Category
                </h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Last 30 days
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {displayCategories.map((cat, catIdx) => {
                const labelText = cat.category || cat.label || cat.name || cat.title || `Category ${catIdx + 1}`;
                const count = cat.count || 0;
                const pct = (count > 0 && totalCategoryCount > 0)
                  ? Math.round((count / totalCategoryCount) * 100)
                  : 0;
                const barWidth = count > 0 ? Math.max(pct, 5) : 0;
                return (
                  <div key={labelText} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 80px', alignItems: 'center', gap: '1rem' }}>
                    <span
                      title={labelText}
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {labelText}
                    </span>

                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${barWidth}%`,
                        backgroundColor: cat.color || '#2563EB',
                        borderRadius: '99px',
                        transition: 'width 0.5s ease'
                      }} />
                    </div>

                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {count} <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.8rem' }}>({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 2: Status Breakdown */}
        <div className="cd-card-hover" style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.35rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--input-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <PieChart size={15} style={{ color: 'var(--text-primary)' }} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                  Status Breakdown
                </h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {totalCRs} Total
              </span>
            </div>

            {/* SVG Donut Ring Chart with Center Text */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0.85rem 0' }}>
              <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="150" height="150" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--border-color)" strokeWidth="4.5" />
                  {(() => {
                    let accumPercent = 0;
                    return displayStatuses.map((sb) => {
                      const statusKey = sb.status || sb.label;
                      const pct = totalCRs > 0 ? (sb.count / totalCRs) * 100 : 0;
                      if (pct === 0) return null;
                      const offset = 100 - accumPercent + 25;
                      accumPercent += pct;
                      const isHovered = hoveredStatus === statusKey;
                      const isDimmed = hoveredStatus && !isHovered;
                      return (
                        <circle
                          key={statusKey}
                          cx="21"
                          cy="21"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke={sb.color || 'var(--brand-primary)'}
                          strokeDasharray={`${pct} ${100 - pct}`}
                          strokeDashoffset={offset}
                          style={{
                            strokeWidth: isHovered ? 6.5 : 4.5,
                            opacity: isDimmed ? 0.35 : 1,
                            transition: 'stroke-width 0.15s ease, opacity 0.15s ease'
                          }}
                        />
                      );
                    });
                  })()}
                </svg>

                <div style={{ position: 'absolute', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{totalCRs}</div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-primary)', fontWeight: 500 }}>Total CRs</div>
                </div>
              </div>
            </div>

            {/* Status Breakdown Legend List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
              {displayStatuses.map((sb, sbIdx) => {
                const statusText = sb.status || sb.label || sb.name || `Status ${sbIdx + 1}`;
                const pct = totalCRs > 0 ? Math.round((sb.count / totalCRs) * 100) : 0;
                return (
                  <div
                    key={statusText}
                    onMouseEnter={() => setHoveredStatus(sb.status || sb.label)}
                    onMouseLeave={() => setHoveredStatus(null)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '16px 1fr 80px',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.25rem 0.45rem',
                      margin: '0 -0.45rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: hoveredStatus === (sb.status || sb.label) ? 'var(--input-bg)' : 'transparent',
                      transition: 'background-color 0.15s ease',
                      cursor: 'default'
                    }}
                  >
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: sb.color || 'var(--brand-primary)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {statusText}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {sb.count} <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.8rem' }}>({pct}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default React.memo(DashboardPage);
