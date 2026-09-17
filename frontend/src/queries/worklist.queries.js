import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiFetch.lib';

export function useWorklistData({ activeFilter, dateFilter, startDate, endDate, searchQuery, isOrgWorklist, userId }) {
  return useQuery({
    queryKey: ['worklist', { activeFilter, dateFilter, startDate, endDate, searchQuery, isOrgWorklist, userId }],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(activeFilter !== 'All' && { status: activeFilter }),
        ...(dateFilter !== 'overall' && { dateFilter }),
        ...(dateFilter === 'custom' && startDate && { startDate }),
        ...(dateFilter === 'custom' && endDate && { endDate }),
        ...(searchQuery && { search: searchQuery }),
        ...(isOrgWorklist && { scope: 'organization' }),
      });

      const res = await apiFetch(`/worklist?${params}`, {
        headers: {
          ...(userId ? { 'x-user-id': userId } : {}),
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch worklist data');
      }

      const body = await res.json();
      return {
        items: body.data && Array.isArray(body.data) ? body.data : [],
        statusCounts: body.statusCounts || {},
        metrics: body.metrics || null,
      };
    },
  });
}

export function useWorklistAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, rejectionReason = '' }) => {
      const res = await apiFetch('/worklist/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, rejectionReason, comment: rejectionReason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to submit action');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklist'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
    },
  });
}
