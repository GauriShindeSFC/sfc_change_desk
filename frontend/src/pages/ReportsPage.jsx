import React, { useState, useEffect } from 'react';
import { TrendingUp, FileText, CheckCircle2, Clock, Upload, Download } from 'lucide-react';

export default function ReportsPage() {
  const [metrics, setMetrics] = useState({
    approvalRate: '94.2%',
    avgLeadTime: '2.4 days',
    emergencyCount: 4,
    complianceScore: '99.1%'
  });

  const [monthlyData] = useState([
    { month: 'Jan', count: 42, barHeight: '55%' },
    { month: 'Feb', count: 58, barHeight: '72%' },
    { month: 'Mar', count: 64, barHeight: '80%' },
    { month: 'Apr', count: 51, barHeight: '65%' },
    { month: 'May', count: 72, barHeight: '90%' },
    { month: 'Jun', count: 68, barHeight: '85%' },
    { month: 'Jul', count: 80, barHeight: '100%' },
    { month: 'Aug', count: 76, barHeight: '95%' }
  ]);

  const [departmentData] = useState([
    { name: 'Software Engineering', count: 48, percentage: 38, color: '#2563EB' },
    { name: 'Cloud Infrastructure', count: 32, percentage: 25, color: '#0D9488' },
    { name: 'Network Operations', count: 22, percentage: 17, color: '#7C3AED' },
    { name: 'Human Resources & Security', count: 15, percentage: 12, color: '#B45309' },
    { name: 'Finance & Analytics', count: 11, percentage: 8, color: '#475569' }
  ]);

  const [companyLogo, setCompanyLogo] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/dashboard/reports/metrics');
        if (res.ok) {
          const body = await res.json();
          if (body.metrics) setMetrics(body.metrics);
        }
      } catch (err) {
        console.warn('Backend API offline, using default report metrics:', err);
      }
    };
    fetchReports();
  }, []);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => setCompanyLogo(uploadEvent.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Reports & Change Analytics
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Comprehensive reporting on change volume, CAB approval rates, and SLA compliance
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <label style={{
            padding: '0.55rem 1.1rem',
            backgroundColor: 'var(--card-bg)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <Upload size={15} />
            <span>Upload Logo</span>
            <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
          </label>

          <button style={{
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
          }}>
            <Download size={15} />
            <span>Export Executive PDF Report</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem' }}>
        {[
          { title: 'CAB Approval Rate', val: metrics.approvalRate, sub: '▲ 2.1% vs last quarter', color: '#059669', bg: '#D1FAE5', icon: CheckCircle2 },
          { title: 'Avg Lead Time', val: metrics.avgLeadTime, sub: '▼ 0.5 days faster', color: '#2563EB', bg: '#EBF5FF', icon: Clock },
          { title: 'Emergency CRs', val: metrics.emergencyCount, sub: '3% of total volume', color: '#DC2626', bg: '#FEE2E2', icon: TrendingUp },
          { title: 'SLA Audit Compliance', val: metrics.complianceScore, sub: 'Zero audit findings', color: '#059669', bg: '#D1FAE5', icon: FileText }
        ].map((card, idx) => {
          const IconComp = card.icon;
          return (
            <div key={idx} style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.1rem 1.25rem', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{card.title}</span>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', backgroundColor: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconComp size={16} strokeWidth={2.5} />
                </div>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, marginBottom: '0.35rem' }}>{card.val}</div>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: card.color }}>{card.sub}</span>
            </div>
          );
        })}
      </div>

      {/* 2-Col Analytics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        
        {/* Monthly Volume Bar Chart */}
        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
            Monthly Change Volume Trend
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '160px', padding: '0 0.5rem' }}>
            {monthlyData.map(d => (
              <div key={d.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{d.count}</span>
                <div style={{ width: '24px', height: d.barHeight, backgroundColor: '#0D9488', borderRadius: '4px 4px 0 0' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Department Volume Progress Bars */}
        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
            Volume Distribution by Department
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {departmentData.map(dept => (
              <div key={dept.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dept.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{dept.count} CRs ({dept.percentage}%)</span>
                </div>
                <div style={{ width: '100%', height: '8px', borderRadius: '99px', backgroundColor: 'var(--input-bg)', overflow: 'hidden' }}>
                  <div style={{ width: `${dept.percentage}%`, height: '100%', backgroundColor: dept.color, borderRadius: '99px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {companyLogo && (
        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Custom Brand Logo:</span>
          <img src={companyLogo} alt="Uploaded logo" style={{ maxHeight: '36px', objectFit: 'contain' }} />
        </div>
      )}

    </div>
  );
}
