import React, { useState, useEffect } from 'react';
import { Download, Plus, Upload, Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/apiFetch';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState({
    successRate: '91.4%',
    successChange: '▲ 2.1% vs last quarter',
    avgApprovalTime: '1.8 days',
    approvalChange: '▼ 0.4 days faster',
    emergencyCount: 7,
    emergencyVolume: '5.5% of total volume',
    incidentCount: 3,
    incidentChange: '▼ 2 fewer than last month'
  });

  const [monthlyData, setMonthlyData] = useState([
    { month: 'Mar', count: 16, height: 40, color: '#2563EB' },
    { month: 'Apr', count: 22, height: 55, color: '#2563EB' },
    { month: 'May', count: 18, height: 45, color: '#2563EB' },
    { month: 'Jun', count: 28, height: 70, color: '#0D9488' },
    { month: 'Jul', count: 34, height: 85, color: '#0D9488' },
    { month: 'Aug', count: 38, height: 95, color: '#0D9488' }
  ]);

  const [departmentData, setDepartmentData] = useState([
    { name: 'IT Operations', count: 41, color: '#2563EB', percentage: 80 },
    { name: 'Engineering', count: 33, color: '#0D9488', percentage: 65 },
    { name: 'Finance', count: 19, color: '#7C3AED', percentage: 38 },
    { name: 'HR', count: 11, color: '#D97706', percentage: 22 },
    { name: 'Sales', count: 7, color: '#475569', percentage: 14 }
  ]);

  const [scheduledReports, setScheduledReports] = useState([
    {
      id: 'sch-1',
      report: 'Change Success Rate Summary',
      category: 'All Categories',
      frequency: 'Weekly — Mon 9:00 AM',
      recipients: 'aashini.shah@company.com, cab-board@company.com',
      format: 'PDF',
      nextRun: '01 Sep, 9:00 AM',
      status: 'Approved',
      statusBg: '#D1FAE5',
      statusColor: '#059669'
    },
    {
      id: 'sch-2',
      report: 'Category-wise Ticket Volume',
      category: 'All Categories',
      frequency: 'Monthly — 1st',
      recipients: 'it-ops-leads@company.com',
      format: 'Excel (.xlsx)',
      nextRun: '01 Sep, 8:00 AM',
      status: 'Approved',
      statusBg: '#D1FAE5',
      statusColor: '#059669'
    },
    {
      id: 'sch-3',
      report: 'Emergency Change Log',
      category: 'Emergency Change',
      frequency: 'Daily — 6:00 PM',
      recipients: 'security-oncall@company.com',
      format: 'CSV',
      nextRun: '26 Aug, 6:00 PM',
      status: 'Pending',
      statusBg: '#FEF3C7',
      statusColor: '#D97706'
    }
  ]);

  const [uploadedLogo, setUploadedLogo] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await apiFetch('/reports/metrics');
        if (res.ok) {
          const body = await res.json();
          if (body.metrics) setMetrics(body.metrics);
          if (body.monthly && Array.isArray(body.monthly)) setMonthlyData(body.monthly);
          if (body.departments && Array.isArray(body.departments)) setDepartmentData(body.departments);
        }
      } catch (err) {
        console.warn('Backend API offline, using default reports data:', err);
      }
    };
    fetchReports();
  }, []);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveSchedule = (id) => {
    setScheduledReports(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Reports
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Change management performance across the organisation
          </p>
        </div>

        {/* Export Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => alert('Exporting Reports to Excel...')}
            style={{
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
            }}
          >
            <Download size={15} />
            <span>Export Excel</span>
          </button>

          <button
            onClick={() => alert('Exporting Reports to PDF...')}
            style={{
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
            }}
          >
            <Download size={15} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Main Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'schedule', label: 'Schedule Reports' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.45rem 1.1rem',
                borderRadius: '99px',
                border: 'none',
                backgroundColor: isActive ? '#10172A' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Top 4 KPI Metric Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem' }}>
            
            {/* Card 1: Change Success Rate */}
            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem 1.35rem', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.6rem' }}>
                Change Success Rate
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '0.4rem' }}>
                {metrics.successRate}
              </div>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#059669' }}>
                {metrics.successChange}
              </span>
            </div>

            {/* Card 2: Avg. Approval Time */}
            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem 1.35rem', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.6rem' }}>
                Avg. Approval Time
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '0.4rem' }}>
                {metrics.avgApprovalTime}
              </div>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#DC2626' }}>
                {metrics.approvalChange}
              </span>
            </div>

            {/* Card 3: Emergency Changes */}
            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem 1.35rem', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.6rem' }}>
                Emergency Changes
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '0.4rem' }}>
                {metrics.emergencyCount}
              </div>
              <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {metrics.emergencyVolume}
              </span>
            </div>

            {/* Card 4: Change-Related Incidents */}
            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem 1.35rem', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.6rem' }}>
                Change-Related Incidents
              </span>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1, marginBottom: '0.4rem' }}>
                {metrics.incidentCount}
              </div>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#DC2626' }}>
                {metrics.incidentChange}
              </span>
            </div>

          </div>

          {/* Middle Row: Changes Raised by Month & Top Requesting Departments Side-by-Side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'stretch' }}>
            
            {/* Card 1: Changes Raised by Month (Vertical Bar Chart) */}
            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.35rem 1.5rem', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Changes Raised by Month
                  </h3>
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    Last 6 months
                  </span>
                </div>

                {/* Vertical Bar Chart Container */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', padding: '0 0.5rem 0.5rem 0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  {monthlyData.map(m => (
                    <div key={m.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '48px', height: '100%', justifyContent: 'flex-end' }}>
                      <div style={{
                        width: '38px',
                        height: `${m.height}%`,
                        backgroundColor: m.color || '#0D9488',
                        borderRadius: '6px 6px 0 0'
                      }} />
                    </div>
                  ))}
                </div>

                {/* Month Labels below bars */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.5rem 0 0.5rem' }}>
                  {monthlyData.map(m => (
                    <span key={m.month} style={{ width: '48px', textAlign: 'center', fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {m.month}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Top Requesting Departments */}
            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.35rem 1.5rem', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Top Requesting Departments
                  </h3>
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    By volume
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {departmentData.map(dept => (
                    <div key={dept.name} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 30px', alignItems: 'center', gap: '0.85rem' }}>
                      <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {dept.name}
                      </span>
                      
                      <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--input-bg)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${dept.percentage}%`,
                          backgroundColor: dept.color || '#2563EB',
                          borderRadius: '99px'
                        }} />
                      </div>

                      <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>
                        {dept.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Card: Company Logo */}
          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.35rem 1.5rem', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Company Logo
              </h3>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Appears on exported reports
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              
              {/* Logo Preview Box */}
              <div style={{
                width: '180px',
                height: '70px',
                borderRadius: '8px',
                border: '1px dashed var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {uploadedLogo ? (
                  <img src={uploadedLogo} alt="Uploaded logo" style={{ maxHeight: '50px', maxWidth: '160px', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    No logo uploaded
                  </span>
                )}
              </div>

              {/* Upload Action & Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{
                  padding: '0.55rem 1.1rem',
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  width: 'fit-content'
                }}>
                  <Upload size={15} />
                  <span>Upload logo</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                </label>

                <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0 }}>
                  PNG or JPG, recommended 240×80px. This logo is included on the header of every exported PDF/Excel report.
                </p>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB 2: SCHEDULE REPORTS */}
      {activeTab === 'schedule' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Subheader Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Automate recurring change management reports to your inbox
            </p>

            <button
              onClick={() => alert('Creating new report schedule...')}
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
              <span>New schedule</span>
            </button>
          </div>

          {/* Active Schedules Table Card */}
          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Active Schedules
              </h3>
              <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {scheduledReports.length} running
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem 0.85rem' }}>REPORT</th>
                  <th style={{ padding: '0.75rem 0.85rem' }}>CATEGORY</th>
                  <th style={{ padding: '0.75rem 0.85rem' }}>FREQUENCY</th>
                  <th style={{ padding: '0.75rem 0.85rem' }}>RECIPIENTS</th>
                  <th style={{ padding: '0.75rem 0.85rem' }}>FORMAT</th>
                  <th style={{ padding: '0.75rem 0.85rem' }}>NEXT RUN</th>
                  <th style={{ padding: '0.75rem 0.85rem' }}>STATUS</th>
                  <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {scheduledReports.map((sch, idx) => (
                  <tr key={sch.id} style={{ borderBottom: idx === scheduledReports.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 0.85rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {sch.report}
                    </td>
                    <td style={{ padding: '0.85rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                      {sch.category}
                    </td>
                    <td style={{ padding: '0.85rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {sch.frequency}
                    </td>
                    <td style={{ padding: '0.85rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {sch.recipients}
                    </td>
                    <td style={{ padding: '0.85rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {sch.format}
                    </td>
                    <td style={{ padding: '0.85rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {sch.nextRun}
                    </td>
                    <td style={{ padding: '0.85rem 0.85rem' }}>
                      <span style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '99px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: sch.statusBg,
                        color: sch.statusColor
                      }}>
                        ● {sch.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.85rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleRemoveSchedule(sch.id)}
                        style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}
