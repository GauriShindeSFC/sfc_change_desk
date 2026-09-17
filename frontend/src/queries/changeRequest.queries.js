import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiFetch.lib';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const res = await apiFetch('/me');
      if (!res.ok) throw new Error('Failed to fetch user');
      const body = await res.json();
      return body.user || body;
    },
  });
}

export function useSaveChangeRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ payload }) => {
      const res = await apiFetch('/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || 'Failed to submit change request');
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
