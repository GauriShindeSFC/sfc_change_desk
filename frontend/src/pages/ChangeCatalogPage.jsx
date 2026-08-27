import React, { useState, useEffect } from 'react';
import { Plus, ArrowRight, Package, Server, Shield, Lock, HardDrive, AlertTriangle, Database, RefreshCw, Link } from 'lucide-react';

export default function ChangeCatalogPage({ onNavigate }) {
  const defaultItems = [
    {
      id: 'CAT-01',
      title: 'Software Deployment',
      category: 'Software',
      description: 'Deploy new releases, hotfixes, or config updates to an existing application or service.',
      sla: '3 business days',
      risk: 'Medium',
      riskColor: '#D97706',
      riskBars: 2,
      iconBg: '#EBF5FF',
      iconColor: '#2563EB',
      icon: Package
    },
    {
      id: 'CAT-02',
      title: 'Server Patching',
      category: 'Infrastructure',
      description: 'Apply OS-level or security patches to production, staging, or DR servers.',
      sla: '5 business days',
      risk: 'High',
      riskColor: '#DC2626',
      riskBars: 3,
      iconBg: '#D1FAE5',
      iconColor: '#059669',
      icon: Server
    },
    {
      id: 'CAT-03',
      title: 'Network Change',
      category: 'Network',
      description: 'Firewall rules, VLAN, routing, or load-balancer configuration changes.',
      sla: '5 business days',
      risk: 'Medium',
      riskColor: '#D97706',
      riskBars: 2,
      iconBg: '#F3E8FF',
      iconColor: '#7C3AED',
      icon: Shield
    },
    {
      id: 'CAT-04',
      title: 'Access & Permissions',
      category: 'Access',
      description: 'Grant, modify, or revoke system, application, or data access for a user or team.',
      sla: '1 business day',
      risk: 'Low',
      riskColor: '#059669',
      riskBars: 1,
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      icon: Lock
    },
    {
      id: 'CAT-05',
      title: 'Hardware Change',
      category: 'Infrastructure',
      description: 'Physical hardware install, replacement, or decommission in a managed data center.',
      sla: '7 business days',
      risk: 'Low',
      riskColor: '#059669',
      riskBars: 1,
      iconBg: '#F1F5F9',
      iconColor: '#475569',
      icon: HardDrive
    },
    {
      id: 'CAT-06',
      title: 'Emergency Change',
      category: 'Emergency',
      description: 'Urgent, unplanned change to restore service or prevent imminent outage. Expedited CAB review.',
      sla: '4 hours',
      risk: 'High',
      riskColor: '#DC2626',
      riskBars: 3,
      iconBg: '#FEE2E2',
      iconColor: '#DC2626',
      icon: AlertTriangle
    }
  ];

  const [items, setItems] = useState(defaultItems);
  const [activeCategory, setActiveCategory] = useState('All items');

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await fetch('http://localhost:5001/api/dashboard/catalog');
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) {
            // Guarantee iconBg & iconColor fallbacks so cards never render plain/blank
            const enriched = body.data.map((item, idx) => ({
              ...item,
              iconBg: item.iconBg || defaultItems[idx % defaultItems.length].iconBg,
              iconColor: item.iconColor || defaultItems[idx % defaultItems.length].iconColor
            }));
            setItems(enriched);
          }
        }
      } catch (err) {
        console.warn('Backend API offline, using default catalog items:', err);
      }
    };
    fetchCatalog();
  }, []);

  const categories = ['All items', 'Software', 'Infrastructure', 'Network', 'Access', 'Emergency'];

  const filteredItems = activeCategory === 'All items'
    ? items
    : items.filter(item => item.category && item.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Change Catalog
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Pre-approved templates for standardized changes · select a category to start your request
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate && onNavigate('Change Request')}
          style={{
            padding: '0.55rem 1.1rem',
            backgroundColor: '#0D9488',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 1px 3px rgba(13, 148, 136, 0.2)'
          }}
        >
          <Plus size={16} />
          <span>+ New Change Request</span>
        </button>
      </div>

      {/* Filter Category Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {categories.map(cat => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '99px',
                border: '1px solid var(--border-color)',
                backgroundColor: isActive ? '#0D9488' : 'var(--card-bg)',
                color: isActive ? '#FFFFFF' : 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Catalog Cards 3-Col Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1rem' }}>
        {filteredItems.map(item => (
          <div
            key={item.id}
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9px',
                  backgroundColor: item.iconBg || '#EBF5FF',
                  color: item.iconColor || '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}>
                  {item.id}
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    {[1, 2, 3].map(bar => (
                      <div
                        key={bar}
                        style={{
                          width: '3.5px',
                          height: '12px',
                          borderRadius: '1.5px',
                          backgroundColor: bar <= (item.riskBars || 2) ? (item.riskColor || '#D97706') : 'var(--border-color)'
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.775rem', fontWeight: 700, color: item.riskColor || '#D97706' }}>
                    {item.risk || 'Medium'}
                  </span>
                </div>
              </div>

              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '1rem' }}>
                {item.description}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                SLA: <strong>{item.sla}</strong>
              </span>

              <button
                type="button"
                onClick={() => onNavigate && onNavigate('Change Request')}
                style={{
                  padding: '0.4rem 0.75rem',
                  backgroundColor: 'var(--input-bg)',
                  color: '#0D9488',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <span>Use template</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
