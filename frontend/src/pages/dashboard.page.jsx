import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Clock, RotateCw, XCircle, Layers, PieChart,
  TrendingUp, TrendingDown, Minus, Sunrise, Sun, Moon, Plus,
  Download, FileSpreadsheet, Check, IndianRupee, Plane, Car, Building2, Train, Bus, AlertTriangle
} from 'lucide-react';
import FilterBar, { initCustomDateRange } from '../components/ui/filterBar.component';
import ChangeRequestModal from '../components/ui/changeRequestModal.component';
import PreSpendDetailsModal from '../components/ui/PreSpendDetailsModal.component';
import TravelDetailsModal from '../components/ui/TravelDetailsModal.component';
import ModuleSwitcher from '../components/ui/moduleSwitcher.component';
import { Pagination, ExportButtonGroup, LoadingSpinner } from '../components/ui/primitives.component';
import { apiFetch } from '../lib/apiFetch.lib';

const METRIC_STYLES = [
  { id: 'total', match: (m) => m?.isTotal || m?.title?.includes('Total'), icon: FileText, color: '#2563EB', tint: '#EFF6FF', filterKey: 'All' },
  { id: 'pending', match: (m) => m?.isPending || m?.title?.includes('Pending'), icon: Clock, color: '#D97706', tint: '#FFFBEB', filterKey: 'Pending' },
  { id: 'approved', match: (m) => m?.id === 'approved' || m?.isApproved || m?.title === 'Approved' || m?.title === 'In Process' || m?.title?.includes('Ticketed'), icon: Check, color: '#059669', tint: '#ECFDF5', filterKey: 'Approved' },
  { id: 'implemented', match: (m) => m?.isInProgress || m?.isImplemented || m?.title?.includes('Progress') || m?.title?.includes('Implemented') || m?.title?.includes('Processed') || m?.title?.includes('Board'), icon: RotateCw, color: '#7C3AED', tint: '#F5F3FF', filterKey: 'Implemented' },
  { id: 'rejected', match: () => true, icon: XCircle, color: '#DC2626', tint: '#FEF2F2', filterKey: 'Rejected' }
];
const getMetricStyle = (m) => METRIC_STYLES.find((s) => s.match(m)) || METRIC_STYLES[METRIC_STYLES.length - 1];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning', Icon: Sunrise };
  if (h < 17) return { text: 'Good Afternoon', Icon: Sun };
  return { text: 'Good Evening', Icon: Moon };
};

const PRESPEND_CANONICAL_CATEGORIES = [
  { category: 'IT Hardware', label: 'IT Hardware', count: 0, color: '#2563EB', percentage: 0 },
  { category: 'Software & SaaS', label: 'Software & SaaS', count: 0, color: '#7C3AED', percentage: 0 },
  { category: 'Professional Services', label: 'Professional Services', count: 0, color: '#0D9488', percentage: 0 },
  { category: 'Marketing & Event', label: 'Marketing & Event', count: 0, color: '#D97706', percentage: 0 },
  { category: 'Facilities & Housekeeping', label: 'Facilities & Housekeeping', count: 0, color: '#475569', percentage: 0 },
  { category: 'Employee Welfare', label: 'Employee Welfare', count: 0, color: '#DC2626', percentage: 0 }
];

const TRAVEL_CANONICAL_CATEGORIES = [
  { category: 'Flight', label: 'Flight', count: 0, color: '#2563EB', percentage: 0 },
  { category: 'Hotel', label: 'Hotel Room', count: 0, color: '#7C3AED', percentage: 0 },
  { category: 'Cab', label: 'Cab', count: 0, color: '#D97706', percentage: 0 },
  { category: 'Train', label: 'Train', count: 0, color: '#0D9488', percentage: 0 },
  { category: 'Bus', label: 'Bus', count: 0, color: '#475569', percentage: 0 }
];

const CANONICAL_METRICS = [
  { id: 'total', title: 'Total Change Requests', value: 0, count: 0, change: 'Total Requests', isTotal: true },
  { id: 'pending', title: 'Pending Approvals', value: 0, count: 0, change: 'Awaiting review', isPending: true },
  { id: 'approved', title: 'Approved', value: 0, count: 0, change: 'Approved', isApproved: true },
  { id: 'implemented', title: 'Implemented', value: 0, count: 0, change: 'Implemented', isImplemented: true, isInProgress: true },
  { id: 'rejected', title: 'Rejected', value: 0, count: 0, change: 'Rejected', isRejected: true }
];

const CANONICAL_CATEGORIES = [
  { category: 'IT Asset', label: 'IT Asset', count: 0, color: '#D97706', percentage: 0 },
  { category: 'Office 365 & Collaboration', label: 'Office 365 & Collaboration', count: 0, color: '#475569', percentage: 0 },
  { category: 'Access & Security', label: 'Access & Security', count: 0, color: '#7C3AED', percentage: 0 },
  { category: 'Network & Connectivity', label: 'Network & Connectivity', count: 0, color: '#0D9488', percentage: 0 },
  { category: 'Security Tools & Policies', label: 'Security Tools & Policies', count: 0, color: '#DC2626', percentage: 0 },
  { category: 'Server & Infra', label: 'Server & Infra', count: 0, color: '#2563EB', percentage: 0 }
];

const CANONICAL_STATUSES = [
  { status: 'Pending', label: 'Pending Approvals', count: 0, color: '#D97706' },
  { status: 'Approved', label: 'Approved', count: 0, color: '#059669' },
  { status: 'Implemented', label: 'Implemented', count: 0, color: '#7C3AED' },
  { status: 'Rejected', label: 'Rejected', count: 0, color: '#DC2626' }
];

function DashboardPage({ onNavigate, user, isOrgDashboard = false, searchQuery = '' }) {
  const queryClient = useQueryClient();
  const [activeModule, setActiveModule] = useState('change_request');
  const [hoveredStatus, setHoveredStatus] = useState(null);

  // Unified Filter State
  const [activeFilter, setActiveFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('last_7_days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset pagination when filters, module or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeModule, activeFilter, dateFilter, startDate, endDate, searchQuery]);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const metricsParams = new URLSearchParams({
    ...(isOrgDashboard && { scope: 'organization' }),
    ...(activeFilter !== 'All' && { status: activeFilter }),
    ...(dateFilter !== 'overall' && { dateFilter }),
    ...(dateFilter === 'custom' && startDate && { startDate }),
    ...(dateFilter === 'custom' && endDate && { endDate }),
    ...(searchQuery && { search: searchQuery })
  }).toString();

  const commonParams = new URLSearchParams({
    ...(isOrgDashboard && { scope: 'organization' }),
    ...(dateFilter !== 'overall' && { dateFilter }),
    ...(dateFilter === 'custom' && startDate && { startDate }),
    ...(dateFilter === 'custom' && endDate && { endDate }),
    ...(searchQuery && { search: searchQuery })
  }).toString();

  const requestParams = new URLSearchParams({
    ...(isOrgDashboard && { scope: 'organization' }),
    ...(activeFilter !== 'All' && { status: activeFilter }),
    ...(dateFilter !== 'overall' && { dateFilter }),
    ...(dateFilter === 'custom' && startDate && { startDate }),
    ...(dateFilter === 'custom' && endDate && { endDate }),
    ...(searchQuery && { search: searchQuery })
  }).toString();

  const headers = user?.id ? { 'x-user-id': user.id } : {};
  const isCustomDateIncomplete = dateFilter === 'custom' && (!startDate || !endDate);

  const { data: dashboardResult, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['dashboard', isOrgDashboard, activeModule, activeFilter, dateFilter, startDate, endDate, searchQuery, user?.id],
    queryFn: async () => {
      if (activeModule === 'prespend') {
        const psRes = await apiFetch(`/pre-spend?${requestParams}`, { headers });
        const psData = psRes.ok ? await psRes.json() : {};
        return {
          metrics: psData.metrics ? [
            { id: 'total', title: 'Total Pre-Spend Requests', value: psData.metrics.total || 0, count: psData.metrics.total || 0, change: 'All Spend Requests', isTotal: true },
            { id: 'pending', title: 'Pending Budget Review', value: psData.metrics.pending || 0, count: psData.metrics.pending || 0, change: 'Manager Review', isPending: true },
            { id: 'approved', title: 'Approved Spend', value: psData.metrics.approved || 0, count: psData.metrics.approved || 0, change: 'Approved by Manager', isApproved: true },
            { id: 'implemented', title: 'Total Spend (₹)', value: psData.metrics.totalAmount ? `₹${Number(psData.metrics.totalAmount).toLocaleString('en-IN')}` : '₹0', count: psData.metrics.totalAmount || 0, change: 'Total Requisition Value', isImplemented: true },
            { id: 'rejected', title: 'Rejected', value: psData.metrics.rejected || 0, count: psData.metrics.rejected || 0, change: 'Rejected', isRejected: true }
          ] : [],
          categories: Array.isArray(psData.categories) && psData.categories.length > 0 ? psData.categories : PRESPEND_CANONICAL_CATEGORIES,
          statusBreakdown: Array.isArray(psData.statusBreakdown) && psData.statusBreakdown.length > 0 ? psData.statusBreakdown : [],
          requests: psData.data && Array.isArray(psData.data) ? psData.data : [],
          statusCounts: psData.statusCounts || { All: 0, Pending: 0, Approved: 0, Rejected: 0 }
        };
      }

      if (activeModule === 'travel') {
        const trRes = await apiFetch(`/travel-desk?${requestParams}`, { headers });
        const trData = trRes.ok ? await trRes.json() : {};
        return {
          metrics: trData.metrics ? [
            { id: 'total', title: 'Total Travel Bookings', value: trData.metrics.total || 0, count: trData.metrics.total || 0, change: 'All Bookings', isTotal: true },
            { id: 'pending', title: 'Pending Approvals', value: trData.metrics.pending || 0, count: trData.metrics.pending || 0, change: 'Awaiting approval', isPending: true },
            { id: 'approved', title: 'Ticketed & Confirmed', value: trData.metrics.approved || 0, count: trData.metrics.approved || 0, change: 'Confirmed Bookings', isApproved: true },
            { id: 'implemented', title: 'Completed', value: 0, count: 0, change: 'Completed Journeys', isInProgress: true },
            { id: 'rejected', title: 'Rejected', value: trData.metrics.rejected || 0, count: trData.metrics.rejected || 0, change: 'Rejected', isRejected: true }
          ] : [],
          categories: Array.isArray(trData.categories) && trData.categories.length > 0 ? trData.categories : TRAVEL_CANONICAL_CATEGORIES,
          statusBreakdown: Array.isArray(trData.statusBreakdown) && trData.statusBreakdown.length > 0 ? trData.statusBreakdown : [],
          requests: trData.data && Array.isArray(trData.data) ? trData.data : [],
          statusCounts: trData.statusCounts || { All: 0, Pending: 0, Approved: 0, Rejected: 0 }
        };
      }

      const [mRes, cRes, sRes, rRes] = await Promise.all([
        apiFetch(`/metrics?${metricsParams}`, { headers }),
        apiFetch(`/categories?${commonParams}`, { headers }),
        apiFetch(`/status-breakdown?${commonParams}`, { headers }),
        apiFetch(`/my-requests?${requestParams}`, { headers })
      ]);
      const mData = mRes.ok ? await mRes.json() : {};
      const cData = cRes.ok ? await cRes.json() : {};
      const sData = sRes.ok ? await sRes.json() : {};
      const rData = rRes.ok ? await rRes.json() : {};

      return {
        metrics: mData.data && Array.isArray(mData.data) ? mData.data : [],
        categories: cData.data && Array.isArray(cData.data) ? cData.data : [],
        statusBreakdown: sData.data && Array.isArray(sData.data) ? sData.data : [],
        requests: rData.data && Array.isArray(rData.data) ? rData.data : [],
        statusCounts: rData.statusCounts ? {
          All: rData.statusCounts.All || 0,
          Pending: rData.statusCounts.Pending || 0,
          InProcess: rData.statusCounts.InProcess ?? rData.statusCounts.Approved ?? rData.metrics?.inProcess ?? 0,
          Implemented: rData.statusCounts.Implemented || 0,
          Rejected: rData.statusCounts.Rejected || 0
        } : { All: 0, Pending: 0, InProcess: 0, Implemented: 0, Rejected: 0 }
      };
    },
    enabled: !isCustomDateIncomplete,
    refetchInterval: 30000,
  });

  // Fetch Pending Counts across modules for dot indicators
  const { data: modulePendingCounts } = useQuery({
    queryKey: ['dashboard-pending-dots', isOrgDashboard, user?.id],
    queryFn: async () => {
      const headers = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      const params = isOrgDashboard ? 'scope=org' : 'scope=my';
      try {
        const [crRes, psRes, trRes] = await Promise.all([
          apiFetch(`/my-requests?${params}&status=Pending`, { headers }),
          apiFetch(`/pre-spend?${params}&status=Pending%20Approval`, { headers }),
          apiFetch(`/travel-desk?${params}&status=Pending%20Approval`, { headers })
        ]);
        const crData = crRes.ok ? await crRes.json() : {};
        const psData = psRes.ok ? await psRes.json() : {};
        const trData = trRes.ok ? await trRes.json() : {};

        return {
          change_request: crData.statusCounts?.Pending ?? crData.metrics?.pending ?? (Array.isArray(crData.data) ? crData.data.length : 0),
          prespend: psData.statusCounts?.Pending ?? psData.metrics?.pending ?? (Array.isArray(psData.data) ? psData.data.length : 0),
          travel: trData.statusCounts?.Pending ?? trData.metrics?.pending ?? (Array.isArray(trData.data) ? trData.data.length : 0)
        };
      } catch {
        return { change_request: 0, prespend: 0, travel: 0 };
      }
    },
    refetchInterval: 30000
  });

  const rawMetrics = dashboardResult?.metrics;
  const categoryData = dashboardResult?.categories || [];
  const statusBreakdown = dashboardResult?.statusBreakdown || [];
  const crRequests = dashboardResult?.requests || [];
  const statusCounts = dashboardResult?.statusCounts || { All: 0, Pending: 0, InProcess: 0, Implemented: 0, Rejected: 0 };

  // 1. Dynamic Domain Metrics
  const metrics = (Array.isArray(rawMetrics) && rawMetrics.length > 0)
    ? rawMetrics
    : [
        { id: 'total', title: activeModule === 'travel' ? 'Total Travel Bookings' : activeModule === 'prespend' ? 'Total Pre-Spend Requests' : 'Total Change Requests', value: statusCounts.All || 0, count: statusCounts.All || 0, change: 'Total Requests', isTotal: true },
        { id: 'pending', title: 'Pending Approvals', value: statusCounts.Pending || 0, count: statusCounts.Pending || 0, change: 'Awaiting review', isPending: true },
        { id: 'approved', title: 'Approved', value: statusCounts.Approved ?? statusCounts.InProcess ?? 0, count: statusCounts.Approved ?? statusCounts.InProcess ?? 0, change: 'Approved', isApproved: true },
        { id: 'implemented', title: activeModule === 'travel' ? 'Completed' : activeModule === 'prespend' ? 'Processed' : 'Implemented', value: statusCounts.Implemented || 0, count: statusCounts.Implemented || 0, change: 'Completed', isImplemented: true, isInProgress: true },
        { id: 'rejected', title: 'Rejected', value: statusCounts.Rejected || 0, count: statusCounts.Rejected || 0, change: 'Rejected', isRejected: true }
      ];

  // 2. Dynamic Categories (renders all valid domain categories with live counts merged in)
  const canonicalCategoriesList = activeModule === 'prespend'
    ? PRESPEND_CANONICAL_CATEGORIES
    : activeModule === 'travel'
    ? TRAVEL_CANONICAL_CATEGORIES
    : CANONICAL_CATEGORIES;

  const displayCategories = canonicalCategoriesList.map((def) => {
    const found = categoryData.find(
      (c) => (c.name || c.category || c.label || '').trim().toLowerCase() === def.category.toLowerCase()
    );
    return found ? { ...def, count: found.count || 0 } : def;
  });

  const totalCategoryCount = displayCategories.reduce((sum, c) => sum + (c.count || 0), 0);

  // 3. Dynamic Status Breakdown (renders all standard statuses with live counts merged in)
  const displayStatuses = CANONICAL_STATUSES.map((def) => {
    const found = statusBreakdown.find(
      (s) => (s.status || s.label || '').trim().toLowerCase() === def.status.toLowerCase()
    );
    const fallbackCount = def.status === 'Pending'
      ? statusCounts.Pending
      : def.status === 'Approved'
      ? (statusCounts.Approved ?? statusCounts.InProcess)
      : def.status === 'Implemented'
      ? statusCounts.Implemented
      : def.status === 'Rejected'
      ? statusCounts.Rejected
      : 0;

    return found ? { ...def, count: found.count ?? fallbackCount ?? 0 } : { ...def, count: fallbackCount ?? 0 };
  });

  const totalCRs = statusCounts.All || displayStatuses.reduce((sum, item) => sum + (item.count || 0), 0);
  const requests = dashboardResult?.requests || [];

  // Filter Tabs
  const filterTabs = [
    { id: 'All', label: 'All', count: statusCounts.All || 0 },
    { id: 'Pending', label: 'Pending Approvals', count: statusCounts.Pending || 0 },
    { id: 'Approved', label: 'Approved', count: statusCounts.Approved ?? statusCounts.InProcess ?? 0 },
    { id: 'Implemented', label: activeModule === 'travel' ? 'Completed' : activeModule === 'prespend' ? 'Processed' : 'Implemented', count: statusCounts.Implemented || 0 },
    { id: 'Rejected', label: 'Rejected', count: statusCounts.Rejected || 0 }
  ];

  const handleExport = async (format) => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const exportParams = new URLSearchParams({
        scope: 'organization',
        module: activeModule,
        format,
        ...(activeFilter !== 'All' && { status: activeFilter }),
        ...(dateFilter !== 'overall' && { dateFilter }),
        ...(dateFilter === 'custom' && startDate && { startDate }),
        ...(dateFilter === 'custom' && endDate && { endDate }),
        ...(searchQuery && { search: searchQuery })
      });

      const headers = user?.id ? { 'x-user-id': user.id } : {};
      const res = await apiFetch(`/export?${exportParams}`, { headers });
      if (!res.ok) {
        throw new Error(`Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      const prefix = activeModule === 'prespend' ? 'prespend' : activeModule === 'travel' ? 'travel_desk' : 'change_desk';
      link.download = `${prefix}_organization_dashboard_${dateStr}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export dashboard data. Please check network and permissions.');
    } finally {
      setIsExporting(false);
    }
  };

  const { text: greetingText } = getGreeting();
  const firstName = (user?.name || '').split(' ')[0] || '';

  const moduleSubtitles = {
    change_request: isOrgDashboard ? 'Overall company-wide change request metrics and analytics' : 'Your submitted and active change requests',
    prespend: isOrgDashboard ? 'Company-wide departmental pre-spend and capital budget overview' : 'Your submitted pre-spend and purchase authorization requests',
    travel: isOrgDashboard ? 'Company-wide flight, hotel, and travel reservations' : 'Your business travel, flights, and hotel bookings'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>

      {/* Top Title Row */}
      <div style={{ width: '100%' }}>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
          {isOrgDashboard ? 'Organization Dashboard' : `${greetingText}${firstName ? `, ${firstName}` : ''}`}
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
          {moduleSubtitles[activeModule]} · updated just now
        </p>
      </div>

      {/* Module Switcher Row: 3 Options on Left, Export / Action Buttons on Extreme Right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
        {/* 3-Way Domain Switcher */}
        <ModuleSwitcher
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          pendingCounts={modulePendingCounts}
        />

        {/* Extreme Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
          {activeModule === 'change_request' && !isOrgDashboard && (
            <button
              type="button"
              onClick={() => onNavigate?.('Change Catalog')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                backgroundColor: 'var(--brand-primary)',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '0.825rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Plus size={15} />
              <span>New Change Request</span>
            </button>
          )}

          {activeModule === 'prespend' && !isOrgDashboard && (
            <button
              type="button"
              onClick={() => onNavigate?.('Pre-Spend Request')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                backgroundColor: 'var(--brand-primary)',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '0.825rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Plus size={15} />
              <span>New Pre-Spend Request</span>
            </button>
          )}

          {activeModule === 'travel' && !isOrgDashboard && (
            <button
              type="button"
              onClick={() => onNavigate?.('Travel Desk')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                backgroundColor: 'var(--brand-primary)',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontSize: '0.825rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Plus size={15} />
              <span>Book Travel / Stay</span>
            </button>
          )}

          {/* Organization Dashboard Export Action Buttons */}
          {isOrgDashboard && (
            <ExportButtonGroup
              onExportCsv={() => handleExport('csv')}
              onExportPdf={() => handleExport('pdf')}
              isExporting={isExporting}
              csvLabel={isExporting ? 'Exporting...' : 'Export CSV'}
              pdfLabel={isExporting ? 'Exporting...' : 'Export PDF'}
            />
          )}
        </div>
      </div>

      {/* Single Unified Filter Bar (Above Metric Cards) */}
      <FilterBar
        tabs={filterTabs}
        activeTab={activeFilter}
        onTabChange={setActiveFilter}
        dateValue={dateFilter}
        onDateChange={(val) => {
          setDateFilter(val);
          if (val === 'custom') {
            initCustomDateRange({ startDate, endDate, setStartDate, setEndDate });
          } else {
            setStartDate('');
            setEndDate('');
          }
        }}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      {/* KPI Metric Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {metrics.map((m, idx) => {
          const style = getMetricStyle(m);
          const Icon = style.icon;
          const changeStr = m.change || '';
          const isUp = changeStr.includes('▲');
          const isDown = changeStr.includes('▼');
          const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
          const trendColor = isUp ? '#059669' : isDown ? '#DC2626' : 'var(--text-secondary)';
          const rawText = changeStr.replace('▲', '').replace('▼', '').trim();
          const trendText = rawText.replace(/^[\d\s\-_–—]+/, '').trim() || rawText;
          const isInformational = Boolean(style.isInformational);
          const isSelected = !isInformational && activeFilter === style.filterKey;

          return (
            <div
              key={idx}
              className={isInformational ? '' : 'cd-card-hover'}
              onClick={isInformational ? undefined : () => setActiveFilter(style.filterKey)}
              style={{
                backgroundColor: 'var(--card-bg)',
                border: isSelected ? `1.5px solid ${style.color}` : '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.1rem 1.15rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'var(--shadow-card)',
                minHeight: '125px',
                cursor: isInformational ? 'default' : 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Top Colored Accent Stripe for non-selected cards */}
              {!isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    backgroundColor: style.color,
                    borderTopLeftRadius: 'inherit',
                    borderTopRightRadius: 'inherit'
                  }}
                />
              )}

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: '0.2rem' }}>
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

      {/* Middle Row: Tickets by Category & Status Breakdown Side-by-Side */}
      <div className="cd-responsive-2col" style={{ alignItems: 'stretch' }}>

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
                  {activeModule === 'prespend' ? 'Spend by Category' : activeModule === 'travel' ? 'Travel by Mode' : 'Tickets by Category'}
                </h3>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {totalCategoryCount} Total
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

            {/* Donut Chart on Left, Legend Content on Right */}
            <div className="cd-responsive-breakdown" style={{ marginTop: '0.85rem' }}>
              {/* Left: SVG Donut Ring Chart with Center Text */}
              <div style={{ position: 'relative', width: '140px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="140" height="140" viewBox="0 0 42 42">
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
                  <div style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{totalCRs}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '0.15rem' }}>
                    {activeModule === 'travel' ? 'Total Trips' : activeModule === 'prespend' ? 'Total Reqs' : 'Total CRs'}
                  </div>
                </div>
              </div>

              {/* Right: Status Breakdown Legend List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                {displayStatuses.map((sb, sbIdx) => {
                  const statusText = sb.label || sb.status || sb.name || `Status ${sbIdx + 1}`;
                  const pct = totalCRs > 0 ? Math.round((sb.count / totalCRs) * 100) : 0;
                  return (
                    <div
                      key={statusText}
                      onMouseEnter={() => setHoveredStatus(sb.status || sb.label)}
                      onMouseLeave={() => setHoveredStatus(null)}
                      onClick={() => setActiveFilter(sb.status)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '14px 1fr auto',
                        alignItems: 'center',
                        gap: '0.65rem',
                        padding: '0.35rem 0.5rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: hoveredStatus === (sb.status || sb.label) ? 'var(--input-bg)' : 'transparent',
                        transition: 'background-color 0.15s ease',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: sb.color || 'var(--brand-primary)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {statusText}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {sb.count} <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.775rem' }}>({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Change Requests Table */}
      <div style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)'
      }}>
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {activeModule === 'prespend'
                ? (isOrgDashboard ? 'Organization Pre-Spend Requests' : 'My Pre-Spend Requests')
                : activeModule === 'travel'
                ? (isOrgDashboard ? 'Organization Travel Bookings' : 'My Travel Bookings')
                : (isOrgDashboard ? 'Organization Change Requests' : 'My Change Requests')}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
              Showing {requests.length} {activeModule === 'travel' ? 'booking' : 'request'}{requests.length === 1 ? '' : 's'} matching current filters
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', minWidth: isOrgDashboard ? '1060px' : '920px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--input-bg)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', width: '90px', minWidth: '90px', whiteSpace: 'nowrap' }}>
                  {activeModule === 'travel' ? 'TR ID' : activeModule === 'prespend' ? 'PS ID' : 'CR ID'}
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', minWidth: '220px' }}>
                  {activeModule === 'travel' ? 'Route / Location' : activeModule === 'prespend' ? 'Item / Description' : 'Title'}
                </th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', minWidth: '140px', width: '160px' }}>
                  {activeModule === 'travel' ? 'Mode' : 'Category'}
                </th>
                {isOrgDashboard && (
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', minWidth: '160px', width: '180px' }}>Requester Details</th>
                )}
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', width: '110px', minWidth: '110px', whiteSpace: 'nowrap' }}>
                  Requested On
                </th>
                {activeModule === 'travel' && (
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', width: '110px', minWidth: '110px', whiteSpace: 'nowrap' }}>
                    Travel Date
                  </th>
                )}
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', width: '110px', minWidth: '110px', whiteSpace: 'nowrap' }}>Closed Date</th>
                {isOrgDashboard && (
                  <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', minWidth: '140px', width: '150px' }}>Approved By</th>
                )}
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', width: '130px', minWidth: '130px', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', textAlign: 'right', width: '90px', minWidth: '90px', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length > 0 ? (
                requests.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(cr => {
                  const requesterEmail = cr.employeeEmail || cr.requesterEmail || cr.managerEmail || '';
                  const requesterName = cr.employeeName || cr.requester || cr.requesterName || (requesterEmail ? requesterEmail.split('@')[0].replace(/[\._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—');
                  const approverEmail = cr.status === 'Rejected'
                    ? (cr.rejectedByEmail || cr.decidedByEmail || cr.approvedByEmail || '')
                    : (cr.approvedByEmail || cr.decidedByEmail || '');
                  const approverDisplayName = cr.status === 'Rejected'
                    ? (cr.rejectedBy || cr.decidedBy || cr.approvedBy || '')
                    : (cr.approvedBy || cr.decidedBy || (['Approved', 'Implemented'].includes(cr.status) ? (approverEmail ? approverEmail.split('@')[0].replace(/[\._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Approver') : ''));

                  const isUrgentPreSpend = activeModule === 'prespend' && (cr.isUrgent || cr.urgent);
                  const requestedOnDate = cr.raisedDate || (cr.submittedAt ? new Date(cr.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (cr.createdAt ? new Date(cr.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'));

                  return (
                    <tr key={cr.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{cr.requestCode || cr.id}</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 500, color: 'var(--text-primary)', minWidth: '260px', lineHeight: 1.4 }}>{cr.title}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', minWidth: '160px' }}>{cr.category}</td>
                      {isOrgDashboard && (
                        <td style={{ padding: '0.85rem 1rem', minWidth: '180px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.825rem' }}>
                              {requesterName}
                            </span>
                            {requesterEmail && (
                              <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                                {requesterEmail}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{requestedOnDate}</td>
                      {activeModule === 'travel' && (
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {cr.departureDate ? new Date(cr.departureDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                      )}
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{cr.closedDate || '—'}</td>
                      {isOrgDashboard && (
                        <td style={{ padding: '0.85rem 1rem', minWidth: '140px' }}>
                          {approverDisplayName ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.825rem' }}>
                                {approverDisplayName}
                              </span>
                              {approverEmail && approverEmail !== approverDisplayName && (
                                <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                                  {approverEmail}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-secondary)' }}>—</span>
                          )}
                        </td>
                      )}
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.2rem 0.65rem',
                            borderRadius: 'var(--radius-lg)',
                            backgroundColor: cr.statusBg || '#FEF3C7',
                            color: cr.statusColor || '#D97706',
                            fontSize: '0.775rem',
                            fontWeight: 500,
                            whiteSpace: 'nowrap'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: cr.statusDot || '#D97706' }} />
                            <span style={{ whiteSpace: 'nowrap' }}>
                              {(cr.status || '').toLowerCase() === 'pending' ? 'Pending Approvals' : cr.status}
                            </span>
                          </div>
                          {isUrgentPreSpend && (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              whiteSpace: 'nowrap'
                            }}>
                              <AlertTriangle size={11} strokeWidth={2.5} />
                              <span>Urgent</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.6rem' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedRequest(cr)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--brand-primary)',
                              fontWeight: 500,
                              cursor: 'pointer',
                              fontSize: '0.825rem'
                            }}
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : isLoadingRequests ? (
                <tr>
                  <td colSpan={isOrgDashboard ? 8 : 7} style={{ padding: '3rem', textAlign: 'center' }}>
                    <LoadingSpinner size="md" message="Loading..." />
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={isOrgDashboard ? 8 : 7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: '0.875rem' }}>
                      {activeModule === 'prespend'
                        ? 'No pre-spend requests found.'
                        : activeModule === 'travel'
                        ? 'No travel bookings found.'
                        : 'No change requests found.'}
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Reusable Pagination */}
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={requests.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Domain-Specific Details Modals */}
      {selectedRequest && activeModule === 'prespend' && (
        <PreSpendDetailsModal
          item={selectedRequest}
          user={user}
          onClose={() => setSelectedRequest(null)}
        />
      )}

      {selectedRequest && activeModule === 'travel' && (
        <TravelDetailsModal
          item={selectedRequest}
          user={user}
          onClose={() => setSelectedRequest(null)}
        />
      )}

      {selectedRequest && activeModule === 'change_request' && (
        <ChangeRequestModal
          cr={selectedRequest}
          user={user}
          onClose={() => setSelectedRequest(null)}
          onApprove={null}
          onReject={null}
          onSendBack={null}
          onImplement={null}
        />
      )}

    </div>
  );
}

export default React.memo(DashboardPage);
