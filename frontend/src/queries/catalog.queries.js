import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiFetch.lib';

export function useCatalogCategories() {
  return useQuery({
    queryKey: ['catalog-categories'],
    queryFn: async () => {
      const res = await apiFetch('/catalog/categories');
      if (!res.ok) {
        throw new Error('Failed to fetch catalog categories');
      }
      const body = await res.json();
      return body.data && Array.isArray(body.data) ? body.data : [];
    },
  });
}

export function useSubcategoryFields(subcategoryId) {
  return useQuery({
    queryKey: ['subcategory-fields', subcategoryId],
    queryFn: async () => {
      if (!subcategoryId) return [];
      const res = await apiFetch(`/catalog/subcategories/${subcategoryId}/fields`);
      if (!res.ok) {
        throw new Error('Failed to fetch subcategory fields');
      }
      const body = await res.json();
      return body.data && Array.isArray(body.data) ? body.data : [];
    },
    enabled: Boolean(subcategoryId),
  });
}
