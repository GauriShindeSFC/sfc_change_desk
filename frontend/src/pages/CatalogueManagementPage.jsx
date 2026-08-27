import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

export default function CatalogueManagementPage() {
  const defaultItems = [
    { id: 'cat-1', title: 'Software Deployment', category: 'Software', sla: '3 business days', risk: 'Medium', riskColor: '#D97706', riskBars: 2, workflow: 'Standard Change Workflow', status: 'Active', description: 'Deploy software updates and hotfixes.' },
    { id: 'cat-2', title: 'Server Patching', category: 'Infrastructure', sla: '5 business days', risk: 'High', riskColor: '#DC2626', riskBars: 3, workflow: 'Infrastructure Patching Workflow', status: 'Active', description: 'Apply OS and security patches.' },
    { id: 'cat-3', title: 'Network Change', category: 'Network', sla: '5 business days', risk: 'Medium', riskColor: '#D97706', riskBars: 2, workflow: 'Network Operations Workflow', status: 'Active', description: 'Firewall rules and routing updates.' },
    { id: 'cat-4', title: 'Access & Permissions', category: 'Access', sla: '1 business day', risk: 'Low', riskColor: '#059669', riskBars: 1, workflow: 'Auto-Approval Workflow', status: 'Active', description: 'Grant system and user access.' },
    { id: 'cat-5', title: 'Hardware Change', category: 'Infrastructure', sla: '7 business days', risk: 'Low', riskColor: '#059669', riskBars: 1, workflow: 'Hardware Replacements', status: 'Active', description: 'Physical hardware installation.' },
    { id: 'cat-6', title: 'Emergency Change', category: 'Emergency', sla: '4 hours', risk: 'High', riskColor: '#DC2626', riskBars: 3, workflow: 'Emergency Expedited CAB', status: 'Active', description: 'Urgent outage response.' }
  ];

  const defaultWorkflows = [
    {
      id: 'wf-1',
      name: 'Standard Change Workflow',
      steps: 'Draft → Submitted → CAB Review → Approved → Scheduled → Implemented → Closed',
      usedBy: 'Software Deployment, Network Change, Hardware Change'
    },
    {
      id: 'wf-2',
      name: 'Expedited Workflow',
      steps: 'Draft → Submitted → CAB Review (4hr SLA) → Approved → Implemented → Closed',
      usedBy: 'Emergency Change'
    },
    {
      id: 'wf-3',
      name: 'Lightweight Access Workflow',
      steps: 'Draft → Submitted → Manager Approval → Implemented → Closed',
      usedBy: 'Access & Permissions'
    }
  ];

  const [activeTab, setActiveTab] = useState('templates');
  const [items, setItems] = useState(defaultItems);
  const [workflows, setWorkflows] = useState(defaultWorkflows);
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
    const fetchCatalogue = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/catalogue-management`);
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) setItems(body.data);
          if (body.workflows && Array.isArray(body.workflows) && body.workflows.length > 0) setWorkflows(body.workflows);
        }
      } catch (err) {
        console.warn('Backend API offline, using default catalogue list:', err);
      }
    };
    fetchCatalogue();
  }, []);

  const handleSaveCatalogItem = async (e) => {
    e.preventDefault();
    if (!newItem.title) return;

    const riskColorMap = { Low: '#059669', Medium: '#D97706', High: '#DC2626' };
    const riskBarsMap = { Low: 1, Medium: 2, High: 3 };

    const createdItem = {
      id: `cat-${items.length + 1}`,
      title: newItem.title,
      category: newItem.category,
      sla: newItem.sla || '3 business days',
      risk: newItem.risk,
      riskColor: riskColorMap[newItem.risk] || '#059669',
      riskBars: riskBarsMap[newItem.risk] || 1,
      workflow: newItem.workflow,
      status: 'Active',
      description: newItem.description || 'Custom catalog item template.'
    };

    setItems(prev => [createdItem, ...prev]);
    setIsModalOpen(false);
    setNewItem({ title: '', category: 'Software', sla: '', description: '', risk: 'Low', workflow: 'Standard Change Workflow' });

    try {
      await fetch('http://localhost:5001/api/dashboard/catalogue-management/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
            Catalogue & Workflow Management
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Configure change templates, SLAs, and approval assignment rules
          </p>
        </div>

        <button
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
          <span>{activeTab === 'templates' ? 'New Template' : 'New Workflow'}</span>
        </button>
      </div>

      {/* Main Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'templates', label: 'Catalog Templates' },
          { id: 'workflows', label: 'Approval Workflows' }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.5rem 1.1rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? '#0D9488' : 'transparent',
                color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: TEMPLATES */}
      {activeTab === 'templates' && (
        <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--input-bg)', color: 'var(--text-secondary)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.75rem 0.85rem' }}>TEMPLATE TITLE</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>CATEGORY</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>SLA</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>RISK</th>
                <th style={{ padding: '0.75rem 0.85rem' }}>ASSIGNED WORKFLOW</th>
                <th style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={{ borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                  <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.title}</td>
                  <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-primary)' }}>{item.category}</td>
                  <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{item.sla}</td>
                  <td style={{ padding: '0.75rem 0.85rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                        {[1, 2, 3].map(bar => (
                          <div key={bar} style={{ width: '3.5px', height: '12px', borderRadius: '1.5px', backgroundColor: bar <= (item.riskBars || 2) ? (item.riskColor || '#D97706') : 'var(--border-color)' }} />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.775rem', fontWeight: 700, color: item.riskColor || '#D97706' }}>{item.risk || 'Medium'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 0.85rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>{item.workflow}</td>
                  <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', color: '#0D9488', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Edit template</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: APPROVAL WORKFLOWS */}
      {activeTab === 'workflows' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Workflows Sub-Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Approval Workflows
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Applied across catalog items
            </span>
          </div>

          {/* Workflow Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {workflows.map(wf => (
              <div
                key={wf.id}
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                  boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {wf.name}
                  </h3>
                  <button style={{ background: 'none', border: 'none', color: '#0D9488', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                    Modify workflow
                  </button>
                </div>

                {/* Steps Arrows Pipeline */}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {wf.steps}
                </div>

                {/* Used by Line */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>
                  Used by: <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{wf.usedBy}</strong>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

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
