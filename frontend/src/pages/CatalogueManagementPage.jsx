import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { apiFetch } from '../lib/apiFetch';

function CatalogueManagementPage({ user }) {
  const roleName = (user?.role || '').toLowerCase();
  const roleId = user?.roleId || '';
  const canManageCatalog =
    roleId === 'role-1' || roleName === 'super admin' || roleName.includes('super admin');
  const defaultCategories = [
    {
      id: 'cat-srv',
      name: 'Server & Infra',
      description: 'Server lifecycle, OS patching, and compute infrastructure changes',
      subcategories: [
        { id: 'subcat-srv-lc', name: 'Server Lifecycle', sla: '3 business days', risk: 'Medium', workflow: { name: 'Standard Change Workflow' } },
        { id: 'subcat-srv-patch', name: 'OS / Patching', sla: '5 business days', risk: 'High', workflow: { name: 'Expedited Workflow' } },
        { id: 'subcat-srv-oth', name: 'Other', sla: '3 business days', risk: 'Medium', workflow: { name: 'Standard Change Workflow' } }
      ]
    },
    {
      id: 'cat-net',
      name: 'Network & Connectivity',
      description: 'Firewall rules, Proxy/URL access, VPN, and network changes',
      subcategories: [
        { id: 'subcat-net-fw', name: 'Firewall / Port', sla: '2 business days', risk: 'Medium', workflow: { name: 'Standard Change Workflow' } },
        { id: 'subcat-net-proxy', name: 'Proxy / URL Access', sla: '1 business day', risk: 'Low', workflow: { name: 'Lightweight Access Workflow' } },
        { id: 'subcat-net-vpn', name: 'VPN', sla: '2 business days', risk: 'Medium', workflow: { name: 'Standard Change Workflow' } },
        { id: 'subcat-net-oth', name: 'Other', sla: '3 business days', risk: 'Medium', workflow: { name: 'Standard Change Workflow' } }
      ]
    },
    {
      id: 'cat-acc',
      name: 'Access & Security',
      description: 'Application access, physical access, and security entitlements',
      subcategories: [
        { id: 'subcat-acc-app', name: 'Application Access', sla: '1 business day', risk: 'Low', workflow: { name: 'Lightweight Access Workflow' } },
        { id: 'subcat-acc-phys', name: 'Physical Access', sla: '1 business day', risk: 'Low', workflow: { name: 'Lightweight Access Workflow' } },
        { id: 'subcat-acc-oth', name: 'Other', sla: '2 business days', risk: 'Medium', workflow: { name: 'Standard Change Workflow' } }
      ]
    },
    {
      id: 'cat-asset',
      name: 'IT Asset',
      description: 'Laptops, desktops, hardware accessories, software, and licenses',
      subcategories: [
        { id: 'subcat-asset-dev', name: 'Laptop / Desktop', sla: '5 business days', risk: 'Low', workflow: { name: 'Standard Change Workflow' } },
        { id: 'subcat-asset-hw', name: 'Other IT Hardware', sla: '5 business days', risk: 'Low', workflow: { name: 'Standard Change Workflow' } },
        { id: 'subcat-asset-sw', name: 'Software', sla: '3 business days', risk: 'Medium', workflow: { name: 'Standard Change Workflow' } },
        { id: 'subcat-asset-lic', name: 'License', sla: '2 business days', risk: 'Low', workflow: { name: 'Lightweight Access Workflow' } },
        { id: 'subcat-asset-oth', name: 'Other', sla: '3 business days', risk: 'Low', workflow: { name: 'Standard Change Workflow' } }
      ]
    },
    {
      id: 'cat-o365',
      name: 'Office 365 & Collaboration',
      description: 'Exchange mailboxes, email aliases, and M365 license management',
      subcategories: [
        { id: 'subcat-o365-mb', name: 'Mailbox', sla: '1 business day', risk: 'Low', workflow: { name: 'Lightweight Access Workflow' } },
        { id: 'subcat-o365-lic', name: 'M365 License', sla: '1 business day', risk: 'Low', workflow: { name: 'Lightweight Access Workflow' } },
        { id: 'subcat-o365-oth', name: 'Other', sla: '2 business days', risk: 'Low', workflow: { name: 'Lightweight Access Workflow' } }
      ]
    },
    {
      id: 'cat-sec',
      name: 'Security Tools & Policies',
      description: 'Endpoint security agents, policies, and exemption requests',
      subcategories: [
        { id: 'subcat-sec-ep', name: 'End Point Agent', sla: '2 business days', risk: 'High', workflow: { name: 'Expedited Workflow' } },
        { id: 'subcat-sec-oth', name: 'Other', sla: '3 business days', risk: 'High', workflow: { name: 'Expedited Workflow' } }
      ]
    }
  ];

  const [activeTab, setActiveTab] = useState('templates');
  const [categories, setCategories] = useState(defaultCategories);
  const [workflows, setWorkflows] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWfModalOpen, setIsWfModalOpen] = useState(false);

  const [newSubcat, setNewSubcat] = useState({
    name: '',
    categoryId: 'cat-srv',
    sla: '3 business days',
    risk: 'Medium',
    workflowId: 'wf-1'
  });

  const [newWf, setNewWf] = useState({
    name: '',
    steps: 'Draft → Submitted → CAB Review → Approved → Closed'
  });

  const fetchHierarchy = async () => {
    try {
      const [catRes, wfRes] = await Promise.all([
        apiFetch('/catalog/categories'),
        apiFetch('/catalogue-management')
      ]);
      if (catRes.ok) {
        const body = await catRes.json();
        if (body.data && Array.isArray(body.data) && body.data.length > 0) setCategories(body.data);
      }
      if (wfRes.ok) {
        const wfBody = await wfRes.json();
        if (wfBody.workflows && Array.isArray(wfBody.workflows)) setWorkflows(wfBody.workflows);
      }
    } catch (err) {
      console.warn('Failed to load catalogue management data:', err);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const handleSaveSubcatTemplate = async (e) => {
    e.preventDefault();
    if (!newSubcat.name) return;

    try {
      const res = await apiFetch('/catalog/subcategories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: newSubcat.categoryId,
          name: newSubcat.name,
          sla: newSubcat.sla,
          risk: newSubcat.risk,
          workflowId: newSubcat.workflowId
        })
      });

      if (res.ok) {
        await fetchHierarchy();
        setIsModalOpen(false);
        setNewSubcat({ name: '', categoryId: 'cat-srv', sla: '3 business days', risk: 'Medium', workflowId: 'wf-1' });
      }
    } catch (err) {
      console.warn('Failed to save subcategory:', err);
    }
  };

  const handleSaveWorkflow = async (e) => {
    e.preventDefault();
    if (!newWf.name) return;

    try {
      const res = await apiFetch('/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWf)
      });
      if (res.ok) {
        await fetchHierarchy();
        setIsWfModalOpen(false);
        setNewWf({ name: '', steps: 'Draft → Submitted → CAB Review → Approved → Closed' });
      }
    } catch (err) {
      console.warn('Failed to save workflow:', err);
    }
  };

  const riskColorMap = { Low: '#059669', Medium: '#D97706', High: '#DC2626' };
  const riskBarsMap = { Low: 1, Medium: 2, High: 3 };

  if (!canManageCatalog) {
    return (
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Only Super Admin users can access Catalogue &amp; Workflow Management.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            Catalogue & Workflow Management
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Configure 2-level taxonomy categories, sub-categories, SLAs, and approval workflows
          </p>
        </div>

        {canManageCatalog && activeTab === 'workflows' && (
          <button
            onClick={() => setIsWfModalOpen(true)}
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
            <span>New Workflow</span>
          </button>
        )}
      </div>

      {/* Main Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        {[
          { id: 'templates', label: '2-Level Catalog Hierarchy' },
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

      {/* TAB 1: 2-LEVEL TAXONOMY HIERARCHY */}
      {activeTab === 'templates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {categories.map((cat) => (
            <div
              key={cat.id}
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
              }}
            >
              {/* Category Header */}
              <div style={{
                backgroundColor: 'var(--input-bg)',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {cat.name}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem', display: 'block' }}>
                    {cat.description}
                  </span>
                </div>
                <span style={{
                  padding: '0.2rem 0.6rem',
                  borderRadius: '99px',
                  backgroundColor: '#0D9488',
                  color: '#FFFFFF',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {cat.subcategories ? cat.subcategories.length : 0} Sub-categories
                </span>
              </div>

              {/* Sub-categories Table */}
              {cat.subcategories && cat.subcategories.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ color: 'var(--text-secondary)', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.75rem 1.25rem' }}>SUB-CATEGORY NAME</th>
                      <th style={{ padding: '0.75rem 1rem' }}>SLA</th>
                      <th style={{ padding: '0.75rem 1rem' }}>RISK</th>
                      <th style={{ padding: '0.75rem 1rem' }}>WORKFLOW</th>
                      <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const sortedSubcats = [...cat.subcategories].sort((a, b) => {
                        const aIsOther = (a.name || '').toLowerCase() === 'other' || (a.id || '').endsWith('-oth');
                        const bIsOther = (b.name || '').toLowerCase() === 'other' || (b.id || '').endsWith('-oth');
                        if (aIsOther && !bIsOther) return 1;
                        if (!aIsOther && bIsOther) return -1;
                        return 0;
                      });
                      return sortedSubcats.map((sub, idx) => (
                        <tr key={sub.id} style={{ borderBottom: idx === sortedSubcats.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {sub.name}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                          {sub.sla}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                              {[1, 2, 3].map(bar => (
                                <div key={bar} style={{ width: '3.5px', height: '12px', borderRadius: '1.5px', backgroundColor: bar <= (riskBarsMap[sub.risk] || 2) ? (riskColorMap[sub.risk] || '#D97706') : 'var(--border-color)' }} />
                              ))}
                            </div>
                            <span style={{ fontSize: '0.775rem', fontWeight: 700, color: riskColorMap[sub.risk] || '#D97706' }}>
                              {sub.risk}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                          {sub.workflow?.name || 'Standard Change Workflow'}
                        </td>
                        <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>
                          <button style={{ background: 'none', border: 'none', color: '#0D9488', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                            Configure Fields
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  No sub-categories configured for this category yet.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: APPROVAL WORKFLOWS */}
      {activeTab === 'workflows' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Approval Workflows
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Applied across catalog sub-categories
            </span>
          </div>

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
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {wf.steps}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Sub-category Template Modal */}
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
            maxWidth: '540px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '1.5rem 1.75rem 1rem 1.75rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  New Sub-category Template
                </h2>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, marginTop: '0.2rem' }}>
                  Add a sub-category under a taxonomy category
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSubcatTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem 1.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Sub-category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud VM Provisioning"
                  value={newSubcat.name}
                  onChange={(e) => setNewSubcat((prev) => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Parent Category
                  </label>
                  <select
                    value={newSubcat.categoryId}
                    onChange={(e) => setNewSubcat((prev) => ({ ...prev, categoryId: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    SLA Target
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 3 business days"
                    value={newSubcat.sla}
                    onChange={(e) => setNewSubcat((prev) => ({ ...prev, sla: e.target.value }))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Risk Level
                </label>
                <select
                  value={newSubcat.risk}
                  onChange={(e) => setNewSubcat((prev) => ({ ...prev, risk: e.target.value }))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Assigned Approval Workflow
                </label>
                <select
                  value={newSubcat.workflowId}
                  onChange={(e) => setNewSubcat((prev) => ({ ...prev, workflowId: e.target.value }))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none' }}
                >
                  {workflows.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '0.65rem 1.25rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '0.65rem 1.35rem', backgroundColor: '#0D9488', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                  Save Sub-category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Workflow Modal */}
      {isWfModalOpen && (
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
            maxWidth: '520px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ padding: '1.5rem 1.75rem 1rem 1.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Create Approval Workflow
              </h2>
            </div>
            <form onSubmit={handleSaveWorkflow} style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Workflow name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Executive Approval Workflow"
                  value={newWf.name}
                  onChange={(e) => setNewWf((prev) => ({ ...prev, name: e.target.value }))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Workflow steps sequence *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Draft → Submitted → Manager Approval → Approved → Closed"
                  value={newWf.steps}
                  onChange={(e) => setNewWf((prev) => ({ ...prev, steps: e.target.value }))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setIsWfModalOpen(false)} style={{ padding: '0.65rem 1.25rem', backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '0.65rem 1.35rem', backgroundColor: '#0D9488', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                  Save workflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default React.memo(CatalogueManagementPage);
