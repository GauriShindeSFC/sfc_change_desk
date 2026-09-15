import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import FilterBar from '../components/ui/FilterBar';
import { apiFetch } from '../lib/apiFetch';

function ChangeCatalogPage({ onNavigate, searchQuery = '', initialData }) {
  const defaultItems = [
    // 1. Server & Infra
    { id: 'subcat-srv-lc', title: 'Server Lifecycle', category: 'Server & Infra', description: 'Create, modify, migrate, or decommission server instances.', sla: '3 business days', risk: 'Medium', riskColor: '#D97706', riskBars: 2, iconBg: '#EBF5FF', iconColor: '#2563EB' },
    { id: 'subcat-srv-patch', title: 'OS / Patching', category: 'Server & Infra', description: 'Upgrade operating system version or apply security kernel patches.', sla: '5 business days', risk: 'High', riskColor: '#DC2626', riskBars: 3, iconBg: '#D1FAE5', iconColor: '#059669' },
    { id: 'subcat-srv-oth', title: 'Other Server Changes', category: 'Server & Infra', description: 'Any other changes related to server infrastructure.', sla: '3 business days', risk: 'Medium', riskColor: '#D97706', riskBars: 2, iconBg: '#EBF5FF', iconColor: '#2563EB' },

    // 2. Network & Connectivity
    { id: 'subcat-net-fw', title: 'Firewall / Port', category: 'Network & Connectivity', description: 'Open ports, modify rules, or close firewall traffic rules.', sla: '2 business days', risk: 'Medium', riskColor: '#D97706', riskBars: 2, iconBg: '#F3E8FF', iconColor: '#7C3AED' },
    { id: 'subcat-net-proxy', title: 'Proxy / URL Access', category: 'Network & Connectivity', description: 'Allow or block website URLs and web gateway categories.', sla: '1 business day', risk: 'Low', riskColor: '#059669', riskBars: 1, iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'subcat-net-vpn', title: 'VPN', category: 'Network & Connectivity', description: 'Request, modify, or revoke SSL user VPN or IPsec tunnel access.', sla: '2 business days', risk: 'Medium', riskColor: '#D97706', riskBars: 2, iconBg: '#F3E8FF', iconColor: '#7C3AED' },
    { id: 'subcat-net-oth', title: 'Other Network Changes', category: 'Network & Connectivity', description: 'Other network & routing related change requests.', sla: '3 business days', risk: 'Medium', riskColor: '#D97706', riskBars: 2, iconBg: '#F3E8FF', iconColor: '#7C3AED' },

    // 3. Access & Security
    { id: 'subcat-acc-app', title: 'Application Access', category: 'Access & Security', description: 'Request, modify, or revoke application role access entitlements.', sla: '1 business day', risk: 'Low', riskColor: '#059669', riskBars: 1, iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'subcat-acc-phys', title: 'Physical Access', category: 'Access & Security', description: 'Request, modify, or revoke facility and server room access.', sla: '1 business day', risk: 'Low', riskColor: '#059669', riskBars: 1, iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'subcat-acc-oth', title: 'Other Access Requests', category: 'Access & Security', description: 'Other access & security entitlement change requests.', sla: '2 business days', risk: 'Medium', riskColor: '#D97706', riskBars: 2, iconBg: '#FEF3C7', iconColor: '#D97706' },

    // 4. IT Asset
    { id: 'subcat-asset-dev', title: 'Laptop / Desktop', category: 'IT Asset', description: 'Procure, replace, repair, or dispose laptops & workstations.', sla: '5 business days', risk: 'Low', riskColor: '#059669', riskBars: 1, iconBg: '#F1F5F9', iconColor: '#475569' },
    { id: 'subcat-asset-hw', title: 'Other IT Hardware', category: 'IT Asset', description: 'Procure, allot, return, repair, or dispose IT hardware accessories.', sla: '5 business days', risk: 'Low', riskColor: '#059669', riskBars: 1, iconBg: '#F1F5F9', iconColor: '#475569' },
    { id: 'subcat-asset-sw', title: 'Software', category: 'IT Asset', description: 'Install or upgrade licensed desktop & server software applications.', sla: '3 business days', risk: 'Medium', riskColor: '#D97706', riskBars: 2, iconBg: '#EBF5FF', iconColor: '#2563EB' },
    { id: 'subcat-asset-lic', title: 'License', category: 'IT Asset', description: 'Procure or renew software vendor licenses & subscriptions.', sla: '2 business days', risk: 'Low', riskColor: '#059669', riskBars: 1, iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'subcat-asset-oth', title: 'Other IT Asset Requests', category: 'IT Asset', description: 'Other IT asset procurement & inventory change requests.', sla: '3 business days', risk: 'Low', riskColor: '#059669', riskBars: 1, iconBg: '#F1F5F9', iconColor: '#475569' },

    // 5. Office 365 & Collaboration
    { id: 'subcat-o365-mb', title: 'Mailbox', category: 'Office 365 & Collaboration', description: 'Create email ID, add alias, or disable/revoke Exchange mailbox.', sla: '1 business day', risk: 'Low', riskColor: '#059669', riskBars: 1, iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'subcat-o365-lic', title: 'M365 License', category: 'Office 365 & Collaboration', description: 'Request, upgrade/downgrade, or remove Microsoft 365 licenses.', sla: '1 business day', risk: 'Low', riskColor: '#059669', riskBars: 1, iconBg: '#FEF3C7', iconColor: '#D97706' },
    { id: 'subcat-o365-oth', title: 'Other Email / M365 Requests', category: 'Office 365 & Collaboration', description: 'Other email, Teams, & Microsoft 365 related change requests.', sla: '2 business days', risk: 'Low', riskColor: '#059669', riskBars: 1, iconBg: '#FEF3C7', iconColor: '#D97706' },

    // 6. Security Tools & Policies
    { id: 'subcat-sec-ep', title: 'Endpoint Agent', category: 'Security Tools & Policies', description: 'Remove security agent, modify EDR policy, or request exceptions.', sla: '2 business days', risk: 'High', riskColor: '#DC2626', riskBars: 3, iconBg: '#FEE2E2', iconColor: '#DC2626' },
    { id: 'subcat-sec-oth', title: 'Other Security Changes', category: 'Security Tools & Policies', description: 'Other security policy, DLP, & SIEM rule change requests.', sla: '3 business days', risk: 'High', riskColor: '#DC2626', riskBars: 3, iconBg: '#FEE2E2', iconColor: '#DC2626' }
  ];

  const DEFAULT_CATEGORIES = [
    { id: 'cat-srv', name: 'Server & Infra' },
    { id: 'cat-net', name: 'Network & Connectivity' },
    { id: 'cat-acc', name: 'Access & Security' },
    { id: 'cat-asset', name: 'IT Asset' },
    { id: 'cat-o365', name: 'Office 365 & Collaboration' },
    { id: 'cat-sec', name: 'Security Tools & Policies' }
  ];

  const [items, setItems] = useState(defaultItems);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState(initialData?.activeCategory || initialData?.category || 'Server & Infra');
  const [loadFailed, setLoadFailed] = useState(false);
  const [hoveredCardId, setHoveredCardId] = useState(null);

  useEffect(() => {
    if (initialData?.activeCategory) {
      setActiveCategory(initialData.activeCategory);
    } else if (initialData?.category) {
      setActiveCategory(initialData.category);
    }
  }, [initialData]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await apiFetch('/catalog/categories');
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) {
            const flattened = [];
            body.data.forEach(cat => {
              if (cat.subcategories && Array.isArray(cat.subcategories)) {
                cat.subcategories.forEach(sub => {
                  const riskColorMap = { Low: '#059669', Medium: '#D97706', High: '#DC2626' };
                  const riskBarsMap = { Low: 1, Medium: 2, High: 3 };

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
                    risk: sub.risk || 'Medium',
                    riskColor: riskColorMap[sub.risk] || '#D97706',
                    riskBars: riskBarsMap[sub.risk] || 2,
                    iconBg: cat.name.includes('Server') ? '#EBF5FF' : cat.name.includes('Network') ? '#F3E8FF' : cat.name.includes('Security') ? '#FEE2E2' : '#D1FAE5',
                    iconColor: cat.name.includes('Server') ? '#2563EB' : cat.name.includes('Network') ? '#7C3AED' : cat.name.includes('Security') ? '#DC2626' : '#059669'
                  });
                });
              }
            });
            if (flattened.length > 0) {
              setItems(flattened);
              setLoadFailed(false);
            }
            const catList = body.data.map(cat => ({ id: cat.id, name: cat.name }));
            if (catList.length > 0) {
              setCategories(catList);
              if (!initialData?.activeCategory && !initialData?.category) {
                setActiveCategory(catList[0].name);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Catalog fetch notice:', err);
      }
    };
    fetchCatalog();
  }, []);

  const filteredItems = items.filter(item => {
    const matchesCat = !activeCategory || activeCategory === 'All items' || (item.category && item.category.trim().toLowerCase() === (activeCategory || '').trim().toLowerCase());
    const q = (searchQuery || '').trim().toLowerCase();
    const matchesQuery = !q ||
      (item.title || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
            Change Request
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Select a category to start your request
          </p>
        </div>
      </div>

      {/* Load Failure Warning Banner */}
      {loadFailed && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          color: '#991B1B',
          borderRadius: '10px',
          padding: '0.85rem 1.15rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem'
        }}>
          <span>
            Could not load the latest live catalog from the database. Showing fallback items — values may be outdated.
          </span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              fontSize: '0.775rem',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Refresh to retry
          </button>
        </div>
      )}

      {/* Filter Category Pills */}
      <FilterBar
        variant="inline"
        tabs={categories.map((cat) => ({ id: cat.name, label: cat.name }))}
        activeTab={activeCategory}
        onTabChange={setActiveCategory}
      />

      {/* Catalog Cards Responsive Grid */}
      <div className="cd-responsive-3col">
        {filteredItems.map(item => {
          const handleCardClick = () => {
            if (onNavigate) {
              onNavigate('Change Request', {
                category: item.category,
                subCategory: item.title,
                subcategoryId: item.id,
                fromCategory: activeCategory,
                activeCategory
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
              style={{
                backgroundColor: 'var(--card-bg)',
                border: isHovered ? '1.5px solid #2563EB' : '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '1.35rem 1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isHovered
                  ? '0 12px 24px -4px rgba(37, 99, 235, 0.16), 0 4px 12px -2px rgba(0, 0, 0, 0.08)'
                  : '0 1px 3px rgba(16, 21, 30, 0.04)',
                minHeight: '200px',
                cursor: 'pointer',
                transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
                transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              <div>
                {/* Light Blue Icon Square Box with Plus Sign (Clickable Button) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick();
                  }}
                  title={`Start request for ${item.title}`}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: item.iconBg || '#EBF5FF',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, opacity 0.15s ease, box-shadow 0.15s ease',
                    outline: 'none',
                    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.08)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.08)';
                  }}
                >
                  <Plus size={22} color={item.iconColor || '#2563EB'} strokeWidth={2.5} />
                </button>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.45rem', lineHeight: 1.3 }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '1.25rem' }}>
                  {item.description}
                </p>
              </div>

              {/* Bottom Action: Visible only on hover */}
              <div style={{ minHeight: '26px', display: 'flex', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick();
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563EB',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: 0,
                    textAlign: 'left',
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? 'translateX(0)' : 'translateX(-4px)',
                    pointerEvents: isHovered ? 'auto' : 'none',
                    transition: 'opacity 0.2s ease, transform 0.2s ease, color 0.15s ease'
                  }}
                >
                  <span>Start request →</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

export default React.memo(ChangeCatalogPage);
