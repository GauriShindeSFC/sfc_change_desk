import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Clock, RotateCw, XCircle, Layers, PieChart,
  TrendingUp, TrendingDown, Minus, Sunrise, Sun, Moon, Plus,
  Check, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import FilterBar, { initCustomDateRange } from '../components/ui/filterBar.component';
import ChangeRequestModal from '../components/ui/changeRequestModal.component';
import PreSpendDetailsModal from '../components/ui/PreSpendDetailsModal.component';
import TravelDetailsModal from '../components/ui/TravelDetailsModal.component';
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
  // Expanded module: null means all collapsed; 'prespend' | 'change_request' | 'travel'
  const [expandedModule, setExpandedModule] = useState(null);
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
  }, [expandedModule, activeFilter, dateFilter, startDate, endDate, searchQuery]);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const headers = user?.id ? { 'x-user-id': user.id } : {};
  const isCustomDateIncomplete = dateFilter === 'custom' && (!startDate || !endDate);
  const scopeParam = isOrgDashboard ? 'scope=org' : 'scope=my';

  // 1. Fetch summary metrics for all 3 cards simultaneously
  const { data: prespendSummary } = useQuery({
    queryKey: ['prespend-summary-card', isOrgDashboard, user?.id],
    queryFn: async () => {
      try {
        const res = await apiFetch(`/pre-spend?${scopeParam}`, { headers });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
    refetchInterval: 30000
  });

  const { data: crSummary } = useQuery({
    queryKey: ['cr-summary-card', isOrgDashboard, user?.id],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          ...(isOrgDashboard && { scope: 'organization' })
        }).toString();
        const [mRes, rRes] = await Promise.all([
          apiFetch(`/metrics?${params}`, { headers }),
          apiFetch(`/my-requests?${params}`, { headers })
        ]);
        const mData = mRes.ok ? await mRes.json() : {};
        const rData = rRes.ok ? await rRes.json() : {};
        return {
          metrics: mData.data && Array.isArray(mData.data) ? mData.data : [],
          statusCounts: rData.statusCounts || {}
        };
      } catch {
        return null;
      }
    },
    refetchInterval: 30000
  });

  const { data: travelSummary } = useQuery({
    queryKey: ['travel-summary-card', isOrgDashboard, user?.id],
    queryFn: async () => {
      try {
        const res = await apiFetch(`/travel-desk?${scopeParam}`, { headers });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
    refetchInterval: 30000
  });

  // 2. Fetch full detailed charts + requests only when a card is expanded
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

  const metricsParams = new URLSearchParams({
    ...(isOrgDashboard && { scope: 'organization' }),
    ...(activeFilter !== 'All' && { status: activeFilter }),
    ...(dateFilter !== 'overall' && { dateFilter }),
    ...(dateFilter === 'custom' && startDate && { startDate }),
    ...(dateFilter === 'custom' && endDate && { endDate }),
    ...(searchQuery && { search: searchQuery })
  }).toString();

  const { data: expandedDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['dashboard-expanded', isOrgDashboard, expandedModule, activeFilter, dateFilter, startDate, endDate, searchQuery, user?.id],
    queryFn: async () => {
      if (!expandedModule) return null;

      if (expandedModule === 'prespend') {
        const [psSummaryRes, psReqRes] = await Promise.all([
          apiFetch(`/pre-spend?${commonParams}`, { headers }),
          activeFilter === 'All' ? null : apiFetch(`/pre-spend?${requestParams}`, { headers })
        ]);
        const psSummaryData = psSummaryRes.ok ? await psSummaryRes.json() : {};
        const psReqData = psReqRes && psReqRes.ok ? await psReqRes.json() : psSummaryData;

        return {
          categories: Array.isArray(psSummaryData.categories) && psSummaryData.categories.length > 0 ? psSummaryData.categories : PRESPEND_CANONICAL_CATEGORIES,
          statusBreakdown: Array.isArray(psSummaryData.statusBreakdown) && psSummaryData.statusBreakdown.length > 0 ? psSummaryData.statusBreakdown : [],
          requests: psReqData.data && Array.isArray(psReqData.data) ? psReqData.data : [],
          statusCounts: psSummaryData.statusCounts || { All: 0, Pending: 0, Approved: 0, Implemented: 0, Rejected: 0 }
        };
      }

      if (expandedModule === 'travel') {
        const [trSummaryRes, trReqRes] = await Promise.all([
          apiFetch(`/travel-desk?${commonParams}`, { headers }),
          activeFilter === 'All' ? null : apiFetch(`/travel-desk?${requestParams}`, { headers })
        ]);
        const trSummaryData = trSummaryRes.ok ? await trSummaryRes.json() : {};
        const trReqData = trReqRes && trReqRes.ok ? await trReqRes.json() : trSummaryData;

        return {
          categories: Array.isArray(trSummaryData.categories) && trSummaryData.categories.length > 0 ? trSummaryData.categories : TRAVEL_CANONICAL_CATEGORIES,
          statusBreakdown: Array.isArray(trSummaryData.statusBreakdown) && trSummaryData.statusBreakdown.length > 0 ? trSummaryData.statusBreakdown : [],
          requests: trReqData.data && Array.isArray(trReqData.data) ? trReqData.data : [],
          statusCounts: trSummaryData.statusCounts || { All: 0, Pending: 0, Approved: 0, Implemented: 0, Rejected: 0 }
        };
      }

      // change_request
      const [cRes, sRes, rRes] = await Promise.all([
        apiFetch(`/categories?${commonParams}`, { headers }),
        apiFetch(`/status-breakdown?${commonParams}`, { headers }),
        apiFetch(`/my-requests?${requestParams}`, { headers })
      ]);
      const cData = cRes.ok ? await cRes.json() : {};
      const sData = sRes.ok ? await sRes.json() : {};
      const rData = rRes.ok ? await rRes.json() : {};

      return {
        categories: cData.data && Array.isArray(cData.data) ? cData.data : [],
        statusBreakdown: sData.data && Array.isArray(sData.data) ? sData.data : [],
        requests: rData.data && Array.isArray(rData.data) ? rData.data : [],
        statusCounts: rData.statusCounts ? {
          All: rData.statusCounts.All || 0,
          Pending: rData.statusCounts.Pending || 0,
          InProcess: rData.statusCounts.InProcess ?? rData.statusCounts.Approved ?? 0,
          Implemented: rData.statusCounts.Implemented || 0,
          Rejected: rData.statusCounts.Rejected || 0
        } : { All: 0, Pending: 0, InProcess: 0, Implemented: 0, Rejected: 0 }
      };
    },
    enabled: Boolean(expandedModule) && !isCustomDateIncomplete,
    refetchInterval: 30000
  });

  const handleToggleExpand = (modKey) => {
    if (expandedModule === modKey) {
      setExpandedModule(null);
    } else {
      setExpandedModule(modKey);
      setActiveFilter('All');
    }
  };

  const handleExport = async (format) => {
    if (isExporting || !expandedModule) return;
    setIsExporting(true);
    try {
      const exportParams = new URLSearchParams({
        scope: 'organization',
        module: expandedModule,
        format,
        ...(activeFilter !== 'All' && { status: activeFilter }),
        ...(dateFilter !== 'overall' && { dateFilter }),
        ...(dateFilter === 'custom' && startDate && { startDate }),
        ...(dateFilter === 'custom' && endDate && { endDate }),
        ...(searchQuery && { search: searchQuery })
      });

      const res = await apiFetch(`/export?${exportParams}`, { headers });
      if (!res.ok) {
        throw new Error(`Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      const prefix = expandedModule === 'prespend' ? 'prespend' : expandedModule === 'travel' ? 'travel_desk' : 'change_desk';
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

  // Build metric definitions for the 3 summary cards
  const psM = prespendSummary?.metrics || {};
  const psStatusCounts = prespendSummary?.statusCounts || {};
  const prespendCardMetrics = [
    { id: 'total', title: 'Total', count: psM.total ?? psStatusCounts.All ?? 0, isTotal: true },
    { id: 'pending', title: 'Pending', count: psM.pending ?? psStatusCounts.Pending ?? 0, isPending: true },
    { id: 'approved', title: 'Approved', count: psM.approved ?? psStatusCounts.Approved ?? 0, isApproved: true },
    { id: 'rejected', title: 'Rejected', count: psM.rejected ?? psStatusCounts.Rejected ?? 0, isRejected: true }
  ];

  const crM = crSummary?.metrics || [];
  const crStatusCounts = crSummary?.statusCounts || {};
  const crTotal = crM.find(m => m.id === 'total')?.value ?? crStatusCounts.All ?? 0;
  const crPending = crM.find(m => m.id === 'pending')?.value ?? crStatusCounts.Pending ?? 0;
  const crInProcess = crM.find(m => m.id === 'in_process' || m.id === 'approved')?.value ?? crStatusCounts.InProcess ?? crStatusCounts.Approved ?? 0;
  const crImplemented = crM.find(m => m.id === 'implemented')?.value ?? crStatusCounts.Implemented ?? 0;
  const crRejected = crM.find(m => m.id === 'rejected')?.value ?? crStatusCounts.Rejected ?? 0;
  const changeRequestCardMetrics = [
    { id: 'total', title: 'Total', count: crTotal, isTotal: true },
    { id: 'pending', title: 'Pending', count: crPending, isPending: true },
    { id: 'in_process', title: 'In Process', count: crInProcess, isApproved: true },
    { id: 'implemented', title: 'Implemented', count: crImplemented, isImplemented: true },
    { id: 'rejected', title: 'Rejected', count: crRejected, isRejected: true }
  ];

  const trM = travelSummary?.metrics || {};
  const trStatusCounts = travelSummary?.statusCounts || {};
  const travelCardMetrics = [
    { id: 'total', title: 'Total', count: trM.total ?? trStatusCounts.All ?? 0, isTotal: true },
    { id: 'pending', title: 'Pending', count: trM.pending ?? trStatusCounts.Pending ?? 0, isPending: true },
    { id: 'approved', title: 'Approved', count: trM.approved ?? trStatusCounts.Approved ?? 0, isApproved: true },
    { id: 'rejected', title: 'Rejected', count: trM.rejected ?? trStatusCounts.Rejected ?? 0, isRejected: true }
  ];

  const { text: greetingText } = getGreeting();
  const firstName = (user?.name || '').split(' ')[0] || '';

  // Data helpers for expanded section
  const categoryData = expandedDetails?.categories || [];
  const statusBreakdown = expandedDetails?.statusBreakdown || [];
  const requests = expandedDetails?.requests || [];
  const statusCounts = expandedDetails?.statusCounts || { All: 0, Pending: 0, InProcess: 0, Implemented: 0, Rejected: 0 };

  const canonicalCategoriesList = expandedModule === 'prespend'
    ? PRESPEND_CANONICAL_CATEGORIES
    : expandedModule === 'travel'
    ? TRAVEL_CANONICAL_CATEGORIES
    : CANONICAL_CATEGORIES;

  const displayCategories = canonicalCategoriesList.map((def) => {
    const found = categoryData.find(
      (c) => (c.name || c.category || c.label || '').trim().toLowerCase() === def.category.toLowerCase()
    );
    return found ? { ...def, count: found.count || 0 } : def;
  });
  const totalCategoryCount = displayCategories.reduce((sum, c) => sum + (c.count || 0), 0);

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

  const filterTabs = [
    { id: 'All', label: 'All', count: statusCounts.All || 0 },
    { id: 'Pending', label: 'Pending Approvals', count: statusCounts.Pending || 0 },
    { id: 'Approved', label: 'Approved', count: statusCounts.Approved ?? statusCounts.InProcess ?? 0 },
    { id: 'Implemented', label: expandedModule === 'travel' ? 'Completed' : expandedModule === 'prespend' ? 'Processed' : 'Implemented', count: statusCounts.Implemented || 0 },
    { id: 'Rejected', label: 'Rejected', count: statusCounts.Rejected || 0 }
  ];

  // Definition of the 3 cards in vertical order: Change Request, Pre-Spend Request, Travel Desk
  const moduleCards = [
    {
      key: 'change_request',
      title: 'Change Request',
      newButtonLabel: 'New Change Request',
      newButtonNav: 'Change Catalog',
      metrics: changeRequestCardMetrics
    },
    {
      key: 'prespend',
      title: 'Pre-Spend Request',
      newButtonLabel: 'New Pre-Spend Request',
      newButtonNav: 'Pre-Spend Request',
      metrics: prespendCardMetrics
    },
    {
      key: 'travel',
      title: 'Travel Desk',
      newButtonLabel: 'Book Travel / Stay',
      newButtonNav: 'Travel Desk',
      metrics: travelCardMetrics
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>

      {/* Top Header */}
      <div style={{ width: '100%' }}>
        <h1 style={{ fontSize: '1.55rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
          {isOrgDashboard ? 'Organization Dashboard' : `${greetingText}${firstName ? `, ${firstName}` : ''}`}
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', marginBottom: 0 }}>
          {isOrgDashboard ? 'Company-wide requests and analytics across all modules' : 'Your requests across all modules'}
        </p>
      </div>

      {/* 3 Vertically Stacked Module Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
        {moduleCards.map((card) => {
          const isExpanded = expandedModule === card.key;

          return (
            <div
              key={card.key}
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem 1.5rem',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                transition: 'all 0.2s ease'
              }}
            >
              {/* Card Header: Title on Left, Action Button (optional) on Right */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {card.title}
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {!isOrgDashboard && (
                    <button
                      type="button"
                      onClick={() => onNavigate?.(card.newButtonNav)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.85rem',
                        backgroundColor: 'var(--brand-primary)',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} />
                      <span>{card.newButtonLabel}</span>
                    </button>
                  )}

                  {isOrgDashboard && isExpanded && (
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

              {/* Horizontal Metric Badges */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${card.metrics.length}, minmax(0, 1fr))`,
                gap: '0.85rem'
              }}>
                {card.metrics.map((m, idx) => {
                  const style = getMetricStyle(m);
                  const Icon = style.icon;

                  return (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.85rem',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)'
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: style.tint,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={18} color={style.color} />
                      </div>

                      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.2 }}>
                          {m.title}
                        </span>
                        <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, marginTop: '0.15rem' }}>
                          {m.count ?? 0}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* View / Hide Details Toggle Button at Bottom Right */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: isExpanded ? '0' : '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => handleToggleExpand(card.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.4rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--brand-primary)',
                    backgroundColor: isExpanded ? 'rgba(37, 99, 235, 0.06)' : '#FFFFFF',
                    color: 'var(--brand-primary)',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{isExpanded ? 'Hide details' : 'View details'}</span>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* EXPANDED CONTENT: FilterBar, Charts, and Table */}
              {isExpanded && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>

                  {/* Filter Bar */}
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

                  {/* Side-by-Side Charts */}
                  <div className="cd-responsive-2col" style={{ alignItems: 'stretch' }}>

                    {/* Chart 1: Tickets/Spend/Travel by Category */}
                    <div style={{
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
                              {expandedModule === 'prespend' ? 'Spend by Category' : expandedModule === 'travel' ? 'Travel by Mode' : 'Tickets by Category'}
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

                    {/* Chart 2: Status Breakdown */}
                    <div style={{
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

                        {/* Donut Chart and Legend */}
                        <div className="cd-responsive-breakdown" style={{ marginTop: '0.85rem' }}>
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
                                {expandedModule === 'travel' ? 'Total Trips' : expandedModule === 'prespend' ? 'Total Reqs' : 'Total CRs'}
                              </div>
                            </div>
                          </div>

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

                  {/* Requests Table */}
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
                          {expandedModule === 'prespend'
                            ? (isOrgDashboard ? 'Organization Pre-Spend Requests' : 'My Pre-Spend Requests')
                            : expandedModule === 'travel'
                            ? (isOrgDashboard ? 'Organization Travel Bookings' : 'My Travel Bookings')
                            : (isOrgDashboard ? 'Organization Change Requests' : 'My Change Requests')}
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                          Showing {requests.length} {expandedModule === 'travel' ? 'booking' : 'request'}{requests.length === 1 ? '' : 's'} matching current filters
                        </p>
                      </div>
                    </div>

                    <div style={{ overflowX: 'auto', width: '100%' }}>
                      <table style={{ width: '100%', minWidth: isOrgDashboard ? '1060px' : '920px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--input-bg)', borderBottom: '1px solid var(--border-color)' }}>
                            <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', width: '90px', minWidth: '90px', whiteSpace: 'nowrap' }}>
                              {expandedModule === 'travel' ? 'TR ID' : expandedModule === 'prespend' ? 'PS ID' : 'CR ID'}
                            </th>
                            <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', minWidth: '220px' }}>
                              {expandedModule === 'travel' ? 'Route / Location' : expandedModule === 'prespend' ? 'Item / Description' : 'Title'}
                            </th>
                            <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', minWidth: '140px', width: '160px' }}>
                              {expandedModule === 'travel' ? 'Mode' : 'Category'}
                            </th>
                            {isOrgDashboard && (
                              <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', minWidth: '160px', width: '180px' }}>Requester Details</th>
                            )}
                            <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', letterSpacing: '0.05em', width: '110px', minWidth: '110px', whiteSpace: 'nowrap' }}>
                              Requested On
                            </th>
                            {expandedModule === 'travel' && (
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

                              const isUrgentPreSpend = expandedModule === 'prespend' && (cr.isUrgent || cr.urgent);
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
                                  {expandedModule === 'travel' && (
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
                          ) : isLoadingDetails ? (
                            <tr>
                              <td colSpan={isOrgDashboard ? 8 : 7} style={{ padding: '3rem', textAlign: 'center' }}>
                                <LoadingSpinner size="md" message="Loading..." />
                              </td>
                            </tr>
                          ) : (
                            <tr>
                              <td colSpan={isOrgDashboard ? 8 : 7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <span style={{ fontSize: '0.875rem' }}>
                                  {expandedModule === 'prespend'
                                    ? 'No pre-spend requests found.'
                                    : expandedModule === 'travel'
                                    ? 'No travel bookings found.'
                                    : 'No change requests found.'}
                                </span>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
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

                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Domain-Specific Details Modals */}
      {selectedRequest && expandedModule === 'prespend' && (
        <PreSpendDetailsModal
          item={selectedRequest}
          user={user}
          onClose={() => setSelectedRequest(null)}
        />
      )}

      {selectedRequest && expandedModule === 'travel' && (
        <TravelDetailsModal
          item={selectedRequest}
          user={user}
          onClose={() => setSelectedRequest(null)}
        />
      )}

      {selectedRequest && expandedModule === 'change_request' && (
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

