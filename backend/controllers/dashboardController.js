// Backend Controller Layer
import {
  getMetricsService,
  getCategoryMetricsService,
  getStatusBreakdownService,
  getRecentRequestsService,
  getWorklistService,
  getSettingsUsersService,
  getSettingsRolesService,
  getSettingsAuditLogsService,
  getCatalogueManagementService,
  getReportsMetricsService
} from '../services/dashboardService.js';

export const getMetrics = (req, res) => {
  res.json({ success: true, data: getMetricsService() });
};

export const getCategories = (req, res) => {
  res.json({ success: true, data: getCategoryMetricsService() });
};

export const getStatusBreakdown = (req, res) => {
  res.json({ success: true, data: getStatusBreakdownService() });
};

export const getRecentRequests = (req, res) => {
  const requests = getRecentRequestsService();
  const limit = parseInt(req.query.limit, 10);
  if (limit && !isNaN(limit)) {
    return res.json({ success: true, count: requests.length, data: requests.slice(0, limit) });
  }
  res.json({ success: true, count: requests.length, data: requests });
};

export const getMyRequests = (req, res) => {
  const requests = getRecentRequestsService();
  const categoryFilter = req.query.category;
  if (categoryFilter && categoryFilter.toLowerCase() !== 'all') {
    const filtered = requests.filter(r => r.category.toLowerCase().includes(categoryFilter.toLowerCase()));
    return res.json({ success: true, count: filtered.length, data: filtered });
  }
  res.json({ success: true, count: requests.length, data: requests });
};

export const getWorklist = (req, res) => {
  res.json({ success: true, ...getWorklistService() });
};

export const handleWorklistAction = (req, res) => {
  const { id, action } = req.body || {};
  res.json({ success: true, message: `Action ${action} processed for request ${id}` });
};

export const getSettingsUsers = (req, res) => {
  res.json({ success: true, data: getSettingsUsersService() });
};

export const getSettingsRoles = (req, res) => {
  res.json({ success: true, data: getSettingsRolesService() });
};

export const getSettingsAuditLogs = (req, res) => {
  const filter = req.query.filter || 'All activity';
  const logs = getSettingsAuditLogsService();
  if (filter && filter.toLowerCase() !== 'all activity') {
    const filtered = logs.filter(l => l.type.toLowerCase() === filter.toLowerCase());
    return res.json({ success: true, count: filtered.length, data: filtered });
  }
  res.json({ success: true, count: logs.length, data: logs });
};

export const getCatalogueManagement = (req, res) => {
  res.json({ success: true, ...getCatalogueManagementService() });
};

export const createCatalogItem = (req, res) => {
  const newItem = req.body || {};
  res.json({ success: true, message: 'Catalog item added successfully', data: newItem });
};

export const getReportsMetrics = (req, res) => {
  res.json({ success: true, ...getReportsMetricsService() });
};

export const exportReport = (req, res) => {
  const { format } = req.body || {};
  res.json({ success: true, message: `Report exported successfully as ${format || 'PDF'}` });
};

export const createChangeRequest = (req, res) => {
  const newCrData = req.body || {};
  const newCr = {
    id: `CR-${Math.floor(2050 + Math.random() * 50)}`,
    title: newCrData.title || 'New Change Request',
    category: newCrData.category || 'Software Deployment',
    subCategory: newCrData.subCategory || '',
    requester: 'Gauri Shinde',
    employeeId: newCrData.employeeId || 'EMP-10432',
    department: newCrData.department || 'IT Operations',
    contactNumber: newCrData.contactNumber || '+91 98765 43210',
    startDate: newCrData.startDate || '26 Aug 2026',
    endDate: newCrData.endDate || '28 Aug 2026',
    hostname: newCrData.hostname || 'PROD-DB-CLSTR-02',
    location: newCrData.location || 'Ahmedabad HQ',
    environment: newCrData.environment || 'Production',
    managerEmail: newCrData.managerEmail || 'manager@company.com',
    justification: newCrData.justification || '',
    risk: newCrData.risk || 'Medium',
    riskColor: '#D97706',
    riskBars: 2,
    raisedDate: '26 Aug 2026',
    closedDate: 'Open',
    status: newCrData.isDraft ? 'Draft' : 'Pending',
    statusBg: newCrData.isDraft ? 'var(--input-bg)' : '#FEF3C7',
    statusColor: newCrData.isDraft ? 'var(--text-secondary)' : '#D97706',
    statusDot: newCrData.isDraft ? '#94A0B0' : '#D97706'
  };
  res.json({ success: true, message: 'Change Request created successfully', data: newCr });
};
