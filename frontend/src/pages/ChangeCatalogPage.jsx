import React, { useState, useEffect } from 'react';
import { Plus, X, ArrowRight } from 'lucide-react';
import { apiFetch } from '../lib/apiFetch';

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
      iconColor: '#2563EB'
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
      iconColor: '#059669'
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
      iconColor: '#7C3AED'
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
      iconColor: '#D97706'
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
      iconColor: '#475569'
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
      iconColor: '#DC2626'
    }
  ];

  const [items, setItems] = useState(defaultItems);
  const [activeCategory, setActiveCategory] = useState('All items');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Catalog Item Modal Form State
  const [newItem, setNewItem] = useState({
    title: '',
    category: 'Software',
    sla: '',
    description: '',
    risk: 'Low',
    workflow: 'Standard Change Workflow'
  });

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await apiFetch('/catalog');
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) {
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

  const handleSaveCatalogItem = async (e) => {
    e.preventDefault();
    if (!newItem.title) return;

    const riskColorMap = { Low: '#059669', Medium: '#D97706', High: '#DC2626' };
    const riskBarsMap = { Low: 1, Medium: 2, High: 3 };

    const createdItem = {
      id: `CAT-0${items.length + 1}`,
      title: newItem.title,
      category: newItem.category,
      description: newItem.description || 'Custom catalog change item.',
      sla: newItem.sla || '3 business days',
      risk: newItem.risk,
      riskColor: riskColorMap[newItem.risk] || '#059669',
      riskBars: riskBarsMap[newItem.risk] || 1,
      iconBg: '#EBF5FF',
      iconColor: '#2563EB'
    };

    setItems(prev => [createdItem, ...prev]);
    setIsModalOpen(false);
    setNewItem({ title: '', category: 'Software', sla: '', description: '', risk: 'Low', workflow: 'Standard Change Workflow' });

    try {
      await apiFetch('/catalogue-management/item', {
        method: 'POST',
        body: JSON.stringify(createdItem)
      });
    } catch (err) {
      console.warn('Failed to post catalog item to backend:', err);
    }
  };

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
          onClick={() => setIsModalOpen(true)}
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
          <span>Add Catalog Item</span>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '1.25rem' }}>
        {filteredItems.map(item => (
          <div
            key={item.id}
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.35rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)',
              minHeight: '220px'
            }}
          >
            <div>
              {/* Light Blue Icon Square Box with Plus Sign */}
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: item.iconBg || '#EBF5FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem'
              }}>
                <Plus size={22} color={item.iconColor || '#2563EB'} strokeWidth={2.2} />
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.45rem', lineHeight: 1.3 }}>
                {item.title}
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.45, marginBottom: '1.25rem' }}>
                {item.description}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  SLA <strong style={{ color: 'var(--text-primary)', fontWeight: 700, marginLeft: '0.2rem' }}>{item.sla}</strong>
                </span>

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

              {/* Bottom Teal Start Request Link */}
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('Change Request')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0D9488',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: 0,
                  textAlign: 'left'
                }}
              >
                <span>Start request →</span>
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* Add Catalog Item Modal Dialog */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.5rem 1.75rem 1rem 1.75rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>
                  Add Catalog Item
                </h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, marginTop: '0.25rem' }}>
                  This item will appear in the Change Catalog for requesters to select
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveCatalogItem} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem 1.75rem' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Item name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database Schema Change"
                  value={newItem.title}
                  onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Category
                  </label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  >
                    <option value="Software">Software</option>
                    <option value="Infrastructure">Infrastructure</option>
                    <option value="Network">Network</option>
                    <option value="Access">Access</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    SLA
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5 business days"
                    value={newItem.sla}
                    onChange={(e) => setNewItem(prev => ({ ...prev, sla: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'var(--input-bg)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="What this catalog item covers..."
                  value={newItem.description}
                  onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Risk Level Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Risk level
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  {['Low', 'Medium', 'High'].map(riskLevel => {
                    const isSelected = newItem.risk === riskLevel;
                    return (
                      <button
                        key={riskLevel}
                        type="button"
                        onClick={() => setNewItem(prev => ({ ...prev, risk: riskLevel }))}
                        style={{
                          padding: '0.6rem',
                          borderRadius: '8px',
                          border: isSelected ? '1px solid #0D9488' : '1px solid var(--border-color)',
                          backgroundColor: isSelected ? '#E6F4F1' : 'var(--card-bg)',
                          color: isSelected ? '#0D9488' : 'var(--text-primary)',
                          fontSize: '0.85rem',
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer'
                        }}
                      >
                        {riskLevel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Approval Workflow Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Approval workflow
                </label>
                <select
                  value={newItem.workflow}
                  onChange={(e) => setNewItem(prev => ({ ...prev, workflow: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                >
                  <option value="Standard Change Workflow">Standard Change Workflow</option>
                  <option value="Expedited Workflow">Expedited Workflow</option>
                  <option value="Lightweight Access Workflow">Lightweight Access Workflow</option>
                </select>
              </div>

              {/* Modal Footer Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '0.65rem 1.25rem',
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    padding: '0.65rem 1.35rem',
                    backgroundColor: '#0D9488',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(13, 148, 136, 0.2)'
                  }}
                >
                  Save catalog item
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
