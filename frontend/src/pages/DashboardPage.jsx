import React, { useState, useEffect } from 'react';
import { FileText, Clock, Check, Loader2, X } from 'lucide-react';
import RecentChangeRequests from '../components/ui/RecentChangeRequests';
import { API_BASE_URL } from '../lib/config';

export default function DashboardPage({ onNavigate }) {
  const iconMap = {
    total: FileText,
    pending: Clock,
    approved: Check,
    'in-progress': Loader2,
    rejected: X
  };

  const defaultMetrics = [
    { id: 'total', title: 'Total Change Requests', count: '128', subtext: '▲ 12 this month', subtextColor: '#10B981', iconBg: '#EBF5FF', iconColor: '#00A4EF' },
    { id: 'pending', title: 'Pending Approval', count: '17', subtext: 'CAB review pending', subtextColor: 'var(--text-secondary)', iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'approved', title: 'Approved', count: '76', subtext: '▲ 59% of total', subtextColor: '#10B981', iconBg: '#D1FAE5', iconColor: '#059669' },
    { id: 'in-progress', title: 'In Progress', count: '21', subtext: 'Scheduled this week: 6', subtextColor: 'var(--text-secondary)', iconBg: '#F3E8FF', iconColor: '#7C3AED' },
    { id: 'rejected', title: 'Rejected', count: '14', subtext: '▼ 3 this month', subtextColor: '#DC2626', iconBg: '#FEE2E2', iconColor: '#DC2626' }
  ];

  const defaultCategories = [
    { label: 'Software Deployment', count: 34, max: 40, color: '#2563EB' },
    { label: 'Server / Patching', count: 28, max: 40, color: '#0D9488' },
    { label: 'Network Change', count: 21, max: 40, color: '#7C3AED' },
    { label: 'Access & Permissions', count: 18, max: 40, color: '#B45309' },
    { label: 'Hardware Change', count: 13, max: 40, color: '#475569' },
    { label: 'Emergency Change', count: 7, max: 40, color: '#DC2626' }
  ];

  const defaultStatuses = [
    { label: 'Approved', count: 76, color: '#0D9488' },
    { label: 'Pending', count: 17, color: '#D97706' },
    { label: 'In progress', count: 21, color: '#7C3AED' },
    { label: 'Rejected', count: 14, color: '#DC2626' }
  ];

  const [metrics, setMetrics] = useState(defaultMetrics);
  const [categoryData, setCategoryData] = useState(defaultCategories);
  const [statusData, setStatusData] = useState(defaultStatuses);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [mRes, cRes, sRes] = await Promise.all([
          fetch(`${API_BASE_URL}/metrics`),
          fetch(`${API_BASE_URL}/categories`),
          fetch(`${API_BASE_URL}/status-breakdown`)
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
          if (sData.data && Array.isArray(sData.data)) setStatusData(sData.data);
        }
      } catch (err) {
        console.warn('Backend API connection offline, using fallback dashboard state:', err);
      }
    };
    fetchDashboardData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Section Header */}
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          Change Overview
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Track and review every change request · updated just now
        </p>
      </div>

      {/* 5 Metric Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
        gap: '0.65rem'
      }}>
        {Array.isArray(metrics) && metrics.map(card => {
          const Icon = iconMap[card.id] || card.icon || FileText;
          return (
            <div
              key={card.id}
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '0.85rem 0.75rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', lineHeight: '1.2' }}>
                  {card.title}
                </span>
                <div style={{ width: '26px', height: '26px', borderRadius: '6px', backgroundColor: card.iconBg || '#EBF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={13} color={card.iconColor || '#2563EB'} />
                </div>
              </div>

              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.55rem 0 0.25rem 0', lineHeight: 1 }}>
                {card.count}
              </div>

              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: card.subtextColor || 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {card.subtext}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Change Requests Component */}
      <RecentChangeRequests onNavigate={onNavigate} />

    </div>
  );
}
