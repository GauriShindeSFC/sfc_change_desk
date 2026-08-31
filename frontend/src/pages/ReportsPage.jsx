import React, { useState, useEffect } from 'react';
import { Download, Plus, Upload, Trash2, X } from 'lucide-react';
import { apiFetch } from '../lib/apiFetch';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState(() => {
    const hash = (window.location.hash || '').replace('#', '').toLowerCase();
    return ['overview', 'schedule', 'schedules'].includes(hash) ? (hash === 'schedules' ? 'schedule' : hash) : 'overview';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = (window.location.hash || '').replace('#', '').toLowerCase();
      if (['overview', 'schedule', 'schedules'].includes(hash)) {
        setActiveTab(hash === 'schedules' ? 'schedule' : hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    window.location.hash = tabId;
  };
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

  const [monthlyData, setMonthlyData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [scheduledReports, setScheduledReports] = useState([]);
  const [dbCategories, setDbCategories] = useState([]);
  const [uploadedLogo, setUploadedLogo] = useState(null);

  // Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    reportType: 'success_rate',
    categoryId: '',
    dateRangeMode: 'rolling',
    frequency: 'weekly',
    customFromDate: '',
    customToDate: '',
    recipients: '',
    format: 'pdf',
    emailError: ''
  });

  const handleExportCSV = async () => {
    try {
      const res = await apiFetch('/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'csv' })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'change_requests_report.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const handleExportPDF = async () => {
    try {
      const res = await apiFetch('/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'pdf',
          logoImage: uploadedLogo,
          monthlyData,
          departmentData
        })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'change_requests_report.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
    }
  };

  const fetchSchedules = async () => {
    try {
      const res = await apiFetch('/reports/schedules');
      if (res.ok) {
        const body = await res.json();
        if (body.data && Array.isArray(body.data)) setScheduledReports(body.data);
      }
    } catch (err) {
      console.warn('Failed to fetch scheduled reports:', err);
    }
  };

  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        const [repRes, catRes] = await Promise.all([
          apiFetch('/reports/metrics'),
          apiFetch('/catalog/categories')
        ]);

        if (repRes.ok) {
          const body = await repRes.json();
          if (body.metrics) setMetrics(body.metrics);
          
          if (body.monthlyData && Array.isArray(body.monthlyData)) {
            const allMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const currentMonthIdx = new Date().getMonth();
            const dynamicMonths = allMonthNames.slice(0, currentMonthIdx + 1);

            const liveMap = new Map(body.monthlyData.map(m => [m.month, Number(m.count) || 0]));
            const mergedList = dynamicMonths.map(monthName => ({
              month: monthName,
              count: liveMap.has(monthName) ? liveMap.get(monthName) : 0
            }));

            const maxVal = Math.max(...mergedList.map(m => m.count), 1);
            const palette = ['#2563EB', '#2563EB', '#2563EB', '#2563EB', '#0D9488', '#0D9488', '#0D9488', '#0D9488', '#7C3AED', '#7C3AED', '#D97706', '#D97706'];
            const formattedMonthly = mergedList.map((m, idx) => ({
              month: m.month,
              count: m.count,
              height: m.count > 0 ? Math.max(10, Math.round((m.count / maxVal) * 100)) : 0,
              color: palette[idx % palette.length]
            }));
            setMonthlyData(formattedMonthly);
          }
          
          if (body.departmentData && Array.isArray(body.departmentData)) {
            const palette = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#475569', '#DC2626'];
            const maxDeptCount = Math.max(...body.departmentData.map(d => Number(d.count) || 0), 1);
            const formattedDept = body.departmentData.map((d, idx) => {
              const countVal = Number(d.count) || 0;
              const calcPct = Math.round((countVal / maxDeptCount) * 100);
              return {
                name: d.name,
                count: countVal,
                percentage: Math.min(100, Math.max(10, calcPct)),
                color: palette[idx % palette.length]
              };
            });
            setDepartmentData(formattedDept);
          }
        }

        if (catRes.ok) {
          const catBody = await catRes.json();
          if (catBody.data && Array.isArray(catBody.data)) setDbCategories(catBody.data);
        }
      } catch (err) {
        console.warn('Failed to load reports data:', err);
      }
    };
    fetchReportsData();
    fetchSchedules();
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

  const handleFrequencyChange = (freq) => {
    if (freq === 'one_time') {
      setNewSchedule(prev => ({
        ...prev,
        frequency: freq,
        dateRangeMode: 'custom' // Force dateRangeMode to custom when one_time
      }));
    } else {
      setNewSchedule(prev => ({ ...prev, frequency: freq }));
    }
  };

  const handleReportTypeChange = (type) => {
    setNewSchedule(prev => ({
      ...prev,
      reportType: type,
      // If emergency_log or audit_trail, clear category selection
      categoryId: (type === 'emergency_log' || type === 'audit_trail') ? '' : prev.categoryId
    }));
  };

  const validateEmails = (emailsString) => {
    if (!emailsString || !emailsString.trim()) return false;
    const emailList = emailsString.split(',').map(e => e.trim()).filter(Boolean);
    if (emailList.length === 0) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailList.every(email => emailRegex.test(email));
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();

    // Validate email addresses
    if (!validateEmails(newSchedule.recipients)) {
      setNewSchedule(prev => ({
        ...prev,
        emailError: 'Please enter valid comma-separated email addresses (e.g. user@company.com, admin@company.com)'
      }));
      return;
    }

    try {
      const dateRangeMode = (newSchedule.customFromDate || newSchedule.customToDate) ? 'custom' : 'rolling';
      const payload = {
        reportType: newSchedule.reportType,
        categoryId: newSchedule.categoryId || null,
        dateRangeMode,
        frequency: newSchedule.frequency || (dateRangeMode === 'custom' ? 'one_time' : 'weekly'),
        customFromDate: newSchedule.customFromDate || null,
        customToDate: newSchedule.customToDate || null,
        recipients: newSchedule.recipients.trim(),
        format: newSchedule.format
      };

      const res = await apiFetch('/reports/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        await fetchSchedules();
        setIsScheduleModalOpen(false);
        setNewSchedule({
          reportType: 'success_rate',
          categoryId: '',
          dateRangeMode: 'rolling',
          frequency: 'weekly',
          customFromDate: '',
          customToDate: '',
          recipients: '',
          format: 'pdf',
          emailError: ''
        });
      }
    } catch (err) {
      console.error('Failed to create scheduled report:', err);
    }
  };

  const handleRemoveSchedule = async (id) => {
    try {
      await apiFetch(`/reports/schedules/${id}`, { method: 'DELETE' });
      setScheduledReports(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete scheduled report:', err);
    }
  };

  const reportTypeLabels = {
    success_rate: 'Change Success Rate Summary',
    category_volume: 'Category-wise Ticket Volume',
    turnaround_time: 'Approval Turnaround Time',
    emergency_log: 'Emergency Change Log',
    audit_trail: 'Audit Trail Export'
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', rowGap: '0.5rem' }}>
          <button
            onClick={handleExportCSV}
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
              gap: '0.4rem',
              whiteSpace: 'nowrap'
            }}
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
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
              gap: '0.4rem',
              whiteSpace: 'nowrap'
            }}
          >
            <Download size={15} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'overview', label: 'Executive Overview' },
          { id: 'schedule', label: 'Schedule Reports' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              backgroundColor: activeTab === tab.id ? 'var(--input-bg)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.875rem',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* 4 Performance Metric Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem' }}>
            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Change Success Rate
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
                {metrics.successRate}
              </div>
              <div style={{ fontSize: '0.775rem', color: '#10B981', fontWeight: 600, marginTop: '0.3rem' }}>
                {metrics.successChange}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Avg Approval Lead Time
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
                {metrics.avgApprovalTime}
              </div>
              <div style={{ fontSize: '0.775rem', color: '#10B981', fontWeight: 600, marginTop: '0.3rem' }}>
                {metrics.approvalChange}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Emergency Changes
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
                {metrics.emergencyCount}
              </div>
              <div style={{ fontSize: '0.775rem', color: '#DC2626', fontWeight: 600, marginTop: '0.3rem' }}>
                {metrics.emergencyVolume}
              </div>
            </div>

            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Failed Change Incidents
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem' }}>
                {metrics.incidentCount}
              </div>
              <div style={{ fontSize: '0.775rem', color: '#10B981', fontWeight: 600, marginTop: '0.3rem' }}>
                {metrics.incidentChange}
              </div>
            </div>
          </div>

          {/* Charts Row: Monthly Volume & Department Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            
            {/* Chart 1: Monthly Volume (Vertical Bars) */}
            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.35rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Changes Raised by Month
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Jan – {new Date().toLocaleString('en-US', { month: 'short' })} {new Date().getFullYear()}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', paddingTop: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                {monthlyData.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                      {item.count}
                    </span>
                    <div style={{ width: '100%', height: '110px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{
                        width: '28px',
                        height: `${Math.max(item.height || 10, 10)}%`,
                        backgroundColor: item.color || '#2563EB',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease',
                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.15)'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                      {item.month}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 2: Department Volume (Horizontal Bars) */}
            <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.35rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Top Requesting Departments
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  YTD Volume
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {departmentData.map((dept, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 35px', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dept.name}
                    </span>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${dept.percentage}%`,
                        backgroundColor: dept.color,
                        borderRadius: '99px'
                      }} />
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                      {dept.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Export Settings Card */}
          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.35rem 1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, marginBottom: '1rem' }}>
              PDF Branding & Export Settings
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              {/* Logo Preview */}
              <div style={{
                width: '180px',
                height: '60px',
                border: '2px dashed var(--border-color)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--input-bg)'
              }}>
                {uploadedLogo ? (
                  <img src={uploadedLogo} alt="Uploaded Company Logo" style={{ maxHeight: '45px', maxWidth: '160px', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    Default STFOX Logo
                  </span>
                )}
              </div>

              {/* Upload Action */}
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
                  PNG or JPG, recommended 240×80px. Logo is included on exported reports.
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
              onClick={() => setIsScheduleModalOpen(true)}
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
                {scheduledReports.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      No active scheduled reports configured. Click <strong>New schedule</strong> to create one.
                    </td>
                  </tr>
                ) : (
                  scheduledReports.map((sch, idx) => (
                    <tr key={sch.id} style={{ borderBottom: idx === scheduledReports.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 0.85rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {reportTypeLabels[sch.reportType] || sch.reportType || sch.report}
                      </td>
                      <td style={{ padding: '0.85rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                        {sch.categoryId || sch.category || 'All Categories'}
                      </td>
                      <td style={{ padding: '0.85rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>
                        {sch.frequency}
                      </td>
                      <td style={{ padding: '0.85rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {sch.recipients}
                      </td>
                      <td style={{ padding: '0.85rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-primary)', fontWeight: 600, textTransform: 'uppercase' }}>
                        {sch.format}
                      </td>
                      <td style={{ padding: '0.85rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                        {sch.nextRunAt ? new Date(sch.nextRunAt).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : (sch.nextRun || 'Pending')}
                      </td>
                      <td style={{ padding: '0.85rem 0.85rem', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '99px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: sch.isActive !== false ? '#D1FAE5' : '#F1F5F9',
                          color: sch.isActive !== false ? '#059669' : '#64748B',
                          whiteSpace: 'nowrap',
                          lineHeight: 1
                        }}>
                          <span style={{ fontSize: '0.55rem', lineHeight: 1 }}>●</span>
                          <span>{sch.isActive !== false ? 'Active' : 'Inactive'}</span>
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
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* NEW SCHEDULE REPORT MODAL */}
      {isScheduleModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '560px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  New Schedule Report
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                  Configure automated delivery parameters and recurring rules
                </p>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveSchedule} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', overflowY: 'auto', maxHeight: '75vh' }}>
              
              {/* Field 1: Report (Full Width) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Report
                </label>
                <select
                  value={newSchedule.reportType}
                  onChange={(e) => handleReportTypeChange(e.target.value)}
                  style={{
                    padding: '0.6rem 0.8rem',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}
                >
                  <option value="success_rate">Change Success Rate Summary</option>
                  <option value="category_volume">Category-wise Ticket Volume</option>
                  <option value="turnaround_time">Approval Turnaround Time</option>
                  <option value="emergency_log">Emergency Change Log</option>
                  <option value="audit_trail">Audit Trail Export</option>
                </select>
              </div>

              {/* Row 2: Category & Frequency (2 Columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                
                {/* Category */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', minHeight: '22px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Category
                    </label>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                      filter report to one category
                    </span>
                  </div>
                  <select
                    value={newSchedule.categoryId}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, categoryId: e.target.value }))}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0.55rem 0.8rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="">All Categories</option>
                    {dbCategories.map(cat => (
                      <optgroup key={cat.id} label={cat.name}>
                        <option value={`cat:${cat.id}`}>{cat.name} (All)</option>
                        {Array.isArray(cat.subcategories) && cat.subcategories.map(sub => (
                          <option key={sub.id} value={`sub:${sub.id}`}>
                            {sub.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Frequency */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', minHeight: '22px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Frequency
                    </label>
                  </div>
                  <select
                    value={newSchedule.frequency}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, frequency: e.target.value }))}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0.55rem 0.8rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="weekly">Weekly — Monday 9:00 AM</option>
                    <option value="daily">Daily — 9:00 AM</option>
                    <option value="monthly">Monthly — 1st of month 9:00 AM</option>
                    <option value="one_time">One-time</option>
                  </select>
                </div>

              </div>

              {/* Row 3: From date & To date (2 Columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                
                {/* From Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', minHeight: '22px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      From date
                    </label>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                      report data start
                    </span>
                  </div>
                  <input
                    type="date"
                    value={newSchedule.customFromDate}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, customFromDate: e.target.value }))}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0.55rem 0.75rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* To Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', minHeight: '22px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      To date
                    </label>
                  </div>
                  <input
                    type="date"
                    value={newSchedule.customToDate}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, customToDate: e.target.value }))}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0.55rem 0.75rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

              </div>

              {/* Row 4: Recipients & Format (2 Columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                
                {/* Recipients */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', minHeight: '22px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Recipients
                    </label>
                    <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                      comma separated emails
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="aashini.shah@company.com"
                    value={newSchedule.recipients}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, recipients: e.target.value, emailError: '' }))}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0.55rem 0.75rem',
                      backgroundColor: 'var(--input-bg)',
                      border: newSchedule.emailError ? '1px solid #DC2626' : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  {newSchedule.emailError && (
                    <span style={{ fontSize: '0.725rem', color: '#DC2626', fontWeight: 600 }}>
                      {newSchedule.emailError}
                    </span>
                  )}
                </div>

                {/* Format */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', minHeight: '22px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Format
                    </label>
                  </div>
                  <select
                    value={newSchedule.format}
                    onChange={(e) => setNewSchedule(prev => ({ ...prev, format: e.target.value }))}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0.55rem 0.8rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV</option>
                    <option value="excel">Excel (.xlsx)</option>
                  </select>
                </div>

              </div>

              {/* Modal Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  style={{
                    padding: '0.6rem 1.2rem',
                    backgroundColor: 'var(--card-bg)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.6rem 1.2rem',
                    backgroundColor: '#0D9488',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(13, 148, 136, 0.2)'
                  }}
                >
                  Save schedule
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
