// Server State Fetching Queries Hook
import { apiClient } from '../lib/apiClient';

export const fetchDashboardMetrics = async () => apiClient.get('/metrics');
export const fetchCategoryMetrics = async () => apiClient.get('/categories');
export const fetchStatusBreakdown = async () => apiClient.get('/status-breakdown');
export const fetchRecentRequests = async () => apiClient.get('/change-requests/recent');
export const fetchMyRequests = async (category = 'all') => apiClient.get(`/my-requests?category=${category}`);
export const fetchWorklist = async () => apiClient.get('/worklist');
export const fetchSettingsUsers = async () => apiClient.get('/settings/users');
export const fetchSettingsRoles = async () => apiClient.get('/settings/roles');
export const fetchSettingsAuditLogs = async (filter = 'All activity') => apiClient.get(`/settings/audit-logs?filter=${encodeURIComponent(filter)}`);
export const fetchCatalogueManagement = async () => apiClient.get('/catalogue-management');
export const fetchReportsMetrics = async () => apiClient.get('/reports/metrics');
