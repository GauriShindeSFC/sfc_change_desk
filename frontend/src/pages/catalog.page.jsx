import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import FilterBar from '../components/ui/filterBar.component';
import { apiFetch } from '../lib/apiFetch.lib';

function ChangeCatalogPage({ onNavigate, searchQuery = '', initialData }) {
  const defaultItems = [
    // 1. Server & Infra
    { id: 'subcat-srv-lc', title: 'Server Lifecycle', category: 'Server & Infra', description: 'Create, modify, migrate, or hosting server instances.', sla: '3 business days', iconBg: '#EBF5FF', iconColor: '#2563EB' },
    { id: 'subcat-srv-patch', title: 'OS / Patching', category: 'Server & Infra', description: 'Upgrade operating system version or apply security kernel patches.', sla: '5 business days', iconBg: '#D1FAE5', iconColor: '#059669' },
    { id: 'subcat-srv-oth', title: 'Other Server Changes', category: 'Server & Infra', description: 'Any other changes related to server infrastructure.', sla: '3 business days', iconBg: '#EBF5FF', iconColor: '#2563EB' },

    // 2. Network & Connectivity
    { id: 'subcat-net-fw', title: 'Firewall / Port', category: 'Network & Connectivity', description: 'Open ports, modify rules, or close firewall traffic rules.', sla: '2 business days', iconBg: '#F3E8FF', iconColor: '#7C3AED' },
    { id: 'subcat-net-proxy', title: 'Proxy / URL Access', category: 'Network & Connectivity', description: 'Allow or block website URLs and web gateway categories.', sla: '1 business day', iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'subcat-net-vpn', title: 'VPN', category: 'Network & Connectivity', description: 'Request, modify, or revoke SSL user VPN or IPsec tunnel access.', sla: '2 business days', iconBg: '#F3E8FF', iconColor: '#7C3AED' },
    { id: 'subcat-net-oth', title: 'Other Network Changes', category: 'Network & Connectivity', description: 'Other network & routing related change requests.', sla: '3 business days', iconBg: '#F3E8FF', iconColor: '#7C3AED' },

    // 3. Access & Security
    { id: 'subcat-acc-app', title: 'Application Access', category: 'Access & Security', description: 'Request, modify, or revoke application role access entitlements.', sla: '1 business day', iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'subcat-acc-phys', title: 'Physical Access', category: 'Access & Security', description: 'Request, modify, or revoke facility and server room access.', sla: '1 business day', iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'subcat-acc-oth', title: 'Other Access Requests', category: 'Access & Security', description: 'Other access & security entitlement change requests.', sla: '2 business days', iconBg: '#FEF3C7', iconColor: '#D97706' },

    // 4. IT Asset
    { id: 'subcat-asset-dev', title: 'Laptop / Desktop', category: 'IT Asset', description: 'Procure, replace, repair, or dispose laptops & workstations.', sla: '5 business days', iconBg: '#F1F5F9', iconColor: '#475569' },
    { id: 'subcat-asset-hw', title: 'Other IT Hardware', category: 'IT Asset', description: 'Procure, allot, return, repair, or dispose IT hardware accessories.', sla: '5 business days', iconBg: '#F1F5F9', iconColor: '#475569' },
    { id: 'subcat-asset-sw', title: 'Software', category: 'IT Asset', description: 'Install or upgrade licensed desktop & server software applications.', sla: '3 business days', iconBg: '#EBF5FF', iconColor: '#2563EB' },
    { id: 'subcat-asset-lic', title: 'License', category: 'IT Asset', description: 'Procure or renew software vendor licenses & subscriptions.', sla: '2 business days', iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'subcat-asset-oth', title: 'Other IT Asset Requests', category: 'IT Asset', description: 'Other IT asset procurement & inventory change requests.', sla: '3 business days', iconBg: '#F1F5F9', iconColor: '#475569' },

    // 5. Office 365 & Collaboration
    { id: 'subcat-o365-mb', title: 'Mailbox', category: 'Office 365 & Collaboration', description: 'Create email ID, add alias, or disable/revoke Exchange mailbox.', sla: '1 business day', iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'subcat-o365-lic', title: 'M365 License', category: 'Office 365 & Collaboration', description: 'Request, upgrade/downgrade, or remove Microsoft 365 licenses.', sla: '1 business day', iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'subcat-o365-oth', title: 'Other Email / M365 Requests', category: 'Office 365 & Collaboration', description: 'Other email, Teams, & Microsoft 365 related change requests.', sla: '2 business days', iconBg: '#FEF3C7', iconColor: '#D97706' },

    // 6. Security Tools & Policies
    { id: 'subcat-sec-ep', title: 'Endpoint Agent', category: 'Security Tools & Policies', description: 'Remove security agent, modify EDR policy, or request exceptions.', sla: '2 business days', iconBg: '#FEE2E2', iconColor: '#DC2626' },
    { id: 'subcat-sec-oth', title: 'Other Security Changes', category: 'Security Tools & Policies', description: 'Other security policy, DLP, & SIEM rule change requests.', sla: '3 business days', iconBg: '#FEE2E2', iconColor: '#DC2626' }
  ];

  const DEFAULT_CATEGORIES = [
    { id: 'cat-asset', name: 'IT Asset' },
    { id: 'cat-o365', name: 'Office 365 & Collaboration' },
    { id: 'cat-acc', name: 'Access & Security' },
    { id: 'cat-net', name: 'Network & Connectivity' },
    { id: 'cat-sec', name: 'Security Tools & Policies' },
    { id: 'cat-srv', name: 'Server & Infra' }
  ];

  const [activeCategory, setActiveCategory] = useState(() => {
    return initialData?.activeCategory || initialData?.category || sessionStorage.getItem('sfc_change_active_category') || 'IT Asset';
  });
  const [hoveredCardId, setHoveredCardId] = useState(null);

  useEffect(() => {
    if (initialData?.activeCategory) {
      setActiveCategory(initialData.activeCategory);
      sessionStorage.setItem('sfc_change_active_category', initialData.activeCategory);
    } else if (initialData?.category) {
      setActiveCategory(initialData.category);
      sessionStorage.setItem('sfc_change_active_category', initialData.category);
    }
  }, [initialData]);

  const handleTabChange = (catName) => {
    setActiveCategory(catName);
    sessionStorage.setItem('sfc_change_active_category', catName);
  };

  const { data: catalogResult, isError: loadFailed } = useQuery({
    queryKey: ['catalog-categories'],
    queryFn: async () => {
      const res = await apiFetch('/catalog/categories');
      if (!res.ok) throw new Error('Failed to fetch catalog categories');
      const body = await res.json();
      if (!body.data || !Array.isArray(body.data)) throw new Error('Invalid catalog response');

      const flattened = [];
      body.data.forEach(cat => {
        if (cat.subcategories && Array.isArray(cat.subcategories)) {
          cat.subcategories.forEach(sub => {
            const OTHER_NAME_MAP = {
              'cat-srv': 'Other Server Changes',
              'cat-net': 'Other Network Changes',
              'cat-acc': 'Other Access Requests',
              'cat-asset': 'Other IT Asset Requests',
              'cat-o365': 'Other Email / M365 Requests',
              'cat-sec': 'Other Security Changes',
              'subcat-srv-oth': 'Other Server Changes',
              'subcat-net-oth': 'Other Network Changes',
              'subcat-acc-oth': 'Other Access Requests',
              'subcat-asset-oth': 'Other IT Asset Requests',
              'subcat-o365-oth': 'Other Email / M365 Requests',
              'subcat-sec-oth': 'Other Security Changes'
            };

            let subTitle = sub.name;
            if (sub.id === 'subcat-sec-ep' || subTitle === 'End Point Agent') {
              subTitle = 'Endpoint Agent';
            }
            if (!subTitle || subTitle.trim().toLowerCase() === 'other') {
              subTitle = OTHER_NAME_MAP[sub.id] || OTHER_NAME_MAP[sub.categoryId] || OTHER_NAME_MAP[cat.id] || `Other ${cat.name} Changes`;
            }

            let subDesc = sub.description;
            if (!subDesc || subDesc.trim().toLowerCase() === 'other change request.') {
              subDesc = `Other ${cat.name} change request.`;
            }

            flattened.push({
              id: sub.id,
              title: subTitle,
              category: cat.name,
              description: subDesc,
              sla: sub.sla || '3 business days',
              iconBg: cat.name.includes('Server') ? '#EBF5FF' : cat.name.includes('Network') ? '#F3E8FF' : cat.name.includes('Security') ? '#FEE2E2' : '#D1FAE5',
              iconColor: cat.name.includes('Server') ? '#2563EB' : cat.name.includes('Network') ? '#7C3AED' : cat.name.includes('Security') ? '#DC2626' : '#059669'
            });
          });
        }
      });

      const catList = body.data.map(cat => ({ id: cat.id, name: cat.name }));
      return {
        items: flattened.length > 0 ? flattened : null,
        categories: catList.length > 0 ? catList : null,
      };
    },
  });

  const items = catalogResult?.items || defaultItems;
  const categories = catalogResult?.categories || DEFAULT_CATEGORIES;

  const isSearching = Boolean((searchQuery || '').trim());
  const q = (searchQuery || '').trim().toLowerCase();

  const filteredItems = items.filter(item => {
    const matchesQuery = !q ||
      (item.title || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q);

    // If actively searching, match globally across all categories
    if (isSearching) {
      return matchesQuery;
    }

    // When not searching, filter by active tab
    const matchesCat = !activeCategory || activeCategory === 'All items' || (item.category && item.category.trim().toLowerCase() === (activeCategory || '').trim().toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <div className="flex flex-col gap-5">

      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="m-0 text-[1.45rem] font-bold leading-[1.2] text-foreground">
            Change Request
          </h1>
          <p className="mt-[0.2rem] text-[0.85rem] text-muted-foreground">
            {isSearching ? `Showing search results for "${searchQuery}" across all categories` : 'Select a category to start your request'}
          </p>
        </div>
      </div>

      {/* Load Failure Warning Banner */}
      {loadFailed && (
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] px-[1.15rem] py-[0.85rem] text-[0.85rem] font-semibold text-[#991B1B]">
          <span>
            Could not load the latest live catalog from the database. Showing fallback items — values may be outdated.
          </span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cursor-pointer whitespace-nowrap rounded-md border-0 bg-[#DC2626] px-3 py-[0.35rem] text-[0.775rem] font-medium text-[#FFFFFF]"
          >
            Refresh to retry
          </button>
        </div>
      )}

      {/* Filter Category Pills */}
      {!isSearching && (
        <FilterBar
          variant="inline"
          tabs={categories.map((cat) => ({ id: cat.name, label: cat.name }))}
          activeTab={activeCategory}
          onTabChange={handleTabChange}
        />
      )}

      {/* Empty State when Search has no results */}
      {filteredItems.length === 0 && (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-muted-foreground">
          <p className="m-0 mb-2 text-base font-semibold text-foreground">
            No subcategories found matching "{searchQuery}"
          </p>
          <p className="m-0 text-[0.85rem]">
            Try searching with a different keyword or browse by category.
          </p>
        </div>
      )}

      {/* Catalog Cards Responsive Grid */}
      <div className="cd-responsive-4col">
        {filteredItems.map(item => {
          const handleCardClick = () => {
            if (onNavigate) {
              onNavigate('Change Request', {
                category: item.category,
                subCategory: item.title,
                subcategoryId: item.id,
                fromCategory: item.category || activeCategory,
                activeCategory: item.category || activeCategory
              });
            }
          };

          const isHovered = hoveredCardId === item.id;

          return (
            <div
              key={item.id}
              onClick={handleCardClick}
              onMouseEnter={() => setHoveredCardId(item.id)}
              onMouseLeave={() => setHoveredCardId(null)}
              className={`flex min-h-[130px] cursor-pointer flex-col justify-between rounded-xl bg-card p-5 [transition:transform_0.2s_ease,border-color_0.2s_ease,box-shadow_0.2s_ease,background-color_0.2s_ease] ${
                isHovered
                  ? 'border-[1.5px] border-[color:var(--brand-primary,_#173C4E)] shadow-[0_12px_24px_-4px_rgba(23,60,78,0.14),0_4px_12px_-2px_rgba(0,0,0,0.06)] -translate-y-[5px]'
                  : 'border border-border shadow-[0_1px_3px_rgba(16,21,30,0.04)] translate-y-0'
              }`}
            >
              <div>
                <div className="mb-[0.35rem] text-[0.95rem] font-semibold leading-[1.35] text-foreground">
                  {item.title}
                </div>
                <div className="m-0 text-[0.8rem] leading-[1.45] text-muted-foreground">
                  {item.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}

export default React.memo(ChangeCatalogPage);
