import React, { useState, useEffect } from 'react';
import { Download, Calendar } from 'lucide-react';
import { apiFetch } from '../lib/apiFetch';

function ReportsPage() {
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
  const [locationData, setLocationData] = useState([]);
  const [locationDateFilter, setLocationDateFilter] = useState('overall');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportCSV = async () => {
    if (isExportingCsv) return;
    setIsExportingCsv(true);
    try {
      const res = await apiFetch('/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'csv' })
      });
      if (res.ok) {
        const blob = await res.blob();
        const file = new Blob([blob], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(file);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `ChangeDesk_Report_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 1000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.message || `Failed to export CSV (${res.status} ${res.statusText})`);
      }
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert(`CSV Export Error: ${err.message || 'Network error'}`);
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportPDF = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const res = await apiFetch('/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'pdf', monthlyData, locationData })
      });
      if (res.ok) {
        const blob = await res.blob();
        const file = new Blob([blob], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(file);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `ChangeDesk_Report_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 1000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        alert(errJson.message || `Failed to export PDF (${res.status} ${res.statusText})`);
      }
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert(`PDF Export Error: ${err.message || 'Network error'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  useEffect(() => {
    const fetchReportsData = async () => {
      try {
        const params = new URLSearchParams({
          dateFilter: locationDateFilter,
          ...(startDate && { startDate }),
          ...(endDate && { endDate })
        });
        const repRes = await apiFetch(`/reports/metrics?${params}`);
        if (repRes.ok) {
          const body = await repRes.json();
          if (body.metrics) setMetrics(body.metrics);
          
          if (body.locationData && Array.isArray(body.locationData)) {
            setLocationData(body.locationData);
          }

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
        }
      } catch (err) {
        console.warn('Failed to load reports data:', err);
      }
    };
    fetchReportsData();
  }, [locationDateFilter, startDate, endDate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Reports & Analytics
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Comprehensive change performance, volume trends, and governance metrics
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            onClick={handleExportCSV}
            disabled={isExportingCsv}
            style={{
              padding: '0.5rem 0.9rem',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isExportingCsv ? 'not-allowed' : 'pointer',
              opacity: isExportingCsv ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Download size={15} />
            <span>{isExportingCsv ? 'Exporting...' : 'Export CSV'}</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            style={{
              padding: '0.5rem 0.9rem',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isExportingPdf ? 'not-allowed' : 'pointer',
              opacity: isExportingPdf ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <Download size={15} />
            <span>{isExportingPdf ? 'Exporting...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {/* EXECUTIVE OVERVIEW */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* 4 Performance Metric Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Change Success Rate
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
              {metrics.successRate}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, marginTop: '0.35rem' }}>
              {metrics.successChange}
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Avg Approval Turnaround
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
              {metrics.avgApprovalTime}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, marginTop: '0.35rem' }}>
              {metrics.approvalChange}
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Emergency Changes
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
              {metrics.emergencyCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '0.35rem' }}>
              {metrics.emergencyVolume}
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Post-Change Incidents
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
              {metrics.incidentCount ?? 0}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '0.35rem' }}>
              {metrics.incidentChange || '0 post-change incident(s)'}
            </div>
          </div>
        </div>

        {/* Charts Vertical Stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Monthly Change Volume Bar Chart */}
          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Monthly Change Request Volume
                </h3>
                <span style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>Year to date</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 1.25rem 0' }}>
                Total change requests raised per month across all categories
              </p>
            </div>

            {/* Custom Bar Chart Visual */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '0.75rem', height: '180px', padding: '0 0.5rem' }}>
              {monthlyData.map((d, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    {d.count}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '36px',
                      height: `${d.height}%`,
                      backgroundColor: d.color,
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease'
                    }}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontWeight: 600 }}>
                    {d.month}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Volume by Location / HQ Card */}
          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Volume by Location
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                  Distribution of change requests by target location
                </p>
              </div>

              {/* Time Range Filter Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.3rem 0.65rem' }}>
                  <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
                  <select
                    value={locationDateFilter}
                    onChange={(e) => setLocationDateFilter(e.target.value)}
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      border: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      outline: 'none',
                      padding: '0.1rem'
                    }}
                  >
                    <option value="overall" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>Overall Time</option>
                    <option value="last_7_days" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>Last 7 Days</option>
                    <option value="this_month" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>This Month</option>
                    <option value="last_month" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>Last Month</option>
                    <option value="custom" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}>Custom</option>
                  </select>
                </div>

                {locationDateFilter === 'custom' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.775rem',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{
                        backgroundColor: 'var(--input-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.775rem',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {locationData.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {locationData.map((loc, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', fontWeight: 600 }}>
                      <span style={{ color: 'var(--text-primary)' }}>{loc.location}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{loc.count} ({loc.percentage}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '7px', backgroundColor: 'var(--input-bg)', borderRadius: '99px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${loc.percentage}%`,
                          height: '100%',
                          backgroundColor: loc.color || '#0D9488',
                          borderRadius: '99px'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 600 }}>
                No change requests found for the selected date range.
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}

export default React.memo(ReportsPage);
