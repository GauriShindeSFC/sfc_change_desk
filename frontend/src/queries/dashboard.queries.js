import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiFetch.lib';

export function useDashboardData({ metricsParams, commonParams, requestParams, headers = {} }) {
  return useQuery({
    queryKey: ['dashboard-data', metricsParams, commonParams, requestParams, headers],
    queryFn: async () => {
      const [mRes, cRes, sRes, rRes] = await Promise.all([
        apiFetch(`/metrics?${metricsParams}`, { headers }),
        apiFetch(`/categories?${commonParams}`, { headers }),
        apiFetch(`/status-breakdown?${commonParams}`, { headers }),
        apiFetch(`/my-requests?${requestParams}`, { headers }),
      ]);

      const [metricsData, categoriesData, statusData, requestsData] = await Promise.all([
        mRes.ok ? mRes.json() : [],
        cRes.ok ? cRes.json() : [],
        sRes.ok ? sRes.json() : [],
        rRes.ok ? rRes.json() : { requests: [], counts: {} },
      ]);

      return {
        metrics: Array.isArray(metricsData) ? metricsData : [],
        categories: Array.isArray(categoriesData) ? categoriesData : [],
        statusBreakdown: Array.isArray(statusData) ? statusData : [],
        requests: requestsData.requests || (Array.isArray(requestsData) ? requestsData : []),
        statusCounts: requestsData.counts || {},
      };
    },
  });
}

export function useSubmitChangeRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (crId) => {
      const res = await apiFetch(`/change-requests/${crId}/submit`, { method: 'PATCH' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to submit change request');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['worklist'] });
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
    },
  });
}
