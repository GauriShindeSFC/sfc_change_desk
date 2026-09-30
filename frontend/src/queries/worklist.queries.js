import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiFetch.lib';

// Pending-action counts shown as dots next to the sidebar's worklist sub-items.
// One combined backend call (/worklist/counts) instead of three separate domain
// fetches. `apiFetch` already attaches the real Authorization/Bearer token to
// every request, so no manual identity header is needed here.
export function useWorklistActionableDots({ user, allowedModuleIds = [] }) {
  return useQuery({
    queryKey: ['worklist-actionable-dots', user?.id],
    queryFn: async () => {
      const res = await apiFetch('/worklist/counts');
      const body = res.ok ? await res.json().catch(() => null) : null;
      const counts = body?.data || {};

      return {
        change_request: Number(counts.change_request ?? 0),
        prespend: Number(counts.prespend ?? 0),
        travel: Number(counts.travel ?? 0)
      };
    },
    enabled: Boolean(user?.id) && allowedModuleIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 60 * 5 // 5 minutes periodic sync
  });
}
