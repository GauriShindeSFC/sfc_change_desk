import React, { useState } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../lib/apiFetch';

export default function ChangeRequestFormPage({ onNavigate }) {
  const [formData, setFormData] = useState({
    title: '',
    category: 'Network Change',
    subCategory: '',
    startDate: '',
    endDate: '',
    justification: '',
    employeeName: 'Aashini Shah',
    employeeEmail: '',
    department: '',
    contactNumber: '',
    hostname: '',
    location: 'Ahmedabad — HQ',
    environment: 'Production',
    managerEmail: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const categories = [
    'Software Deployment',
    'Server / Patching',
    'Network Change',
    'Access & Permissions',
    'Hardware Change',
    'Emergency Change'
  ];

  const workflowCategoryMap = {
    'Software Deployment': {
      name: 'Standard Change Workflow',
      board: 'CAB — Infrastructure Board',
      steps: 'Draft → Submitted → CAB Review → Approved → Scheduled → Implemented → Closed'
    },
    'Emergency Change': {
      name: 'Expedited Workflow',
      board: 'Incident Commander (4hr SLA)',
      steps: 'Draft → Submitted → CAB Review (4hr SLA) → Approved → Implemented → Closed'
    },
    'Access & Permissions': {
      name: 'Lightweight Access Workflow',
      board: 'Line Manager Approval',
      steps: 'Draft → Submitted → Manager Approval → Implemented → Closed'
    },
    'Server / Patching': {
      name: 'Infrastructure Patching Workflow',
      board: 'Infrastructure Team Lead',
      steps: 'Draft → Submitted → CAB Review → Approved → Scheduled → Implemented → Closed'
    },
    'Network Change': {
      name: 'Standard Change Workflow',
      board: 'CAB — Infrastructure Board',
      steps: 'Draft → Submitted → CAB Review → Approved → Scheduled → Implemented → Closed'
    },
    'Hardware Change': {
      name: 'Standard Change Workflow',
      board: 'CAB — Infrastructure Board',
      steps: 'Draft → Submitted → CAB Review → Approved → Scheduled → Implemented → Closed'
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e, isDraft = false) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      await apiFetch('/change-requests', {
        method: 'POST',
        body: JSON.stringify({ ...formData, isDraft })
      });
    } catch (err) {
      console.warn('Backend API request failed:', err);
    }

    setIsSubmitting(false);
    setSubmitSuccess(true);
  };

  if (submitSuccess) {
    return (
      <div style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '3rem 2rem',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#D1FAE5',
          color: '#059669',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          fontSize: '1.25rem',
          fontWeight: 700
        }}>
          ✓
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Change Request Submitted Successfully!
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Your change request has been routed to the assigned CAB approver. You can track its progress under <strong>My Requests</strong>.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={() => onNavigate && onNavigate('My Requests')}
            style={{
              padding: '0.55rem 1.25rem',
              backgroundColor: '#0D9488',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Go to My Requests
          </button>
          <button
            onClick={() => { setSubmitSuccess(false); setFormData({ title: '', category: 'Network Change', subCategory: '', startDate: '', endDate: '', justification: '', employeeName: 'Aashini Shah', employeeEmail: '', department: '', contactNumber: '', hostname: '', location: 'Ahmedabad — HQ', environment: 'Production', managerEmail: '' }); }}
            style={{
              padding: '0.55rem 1.25rem',
              backgroundColor: 'var(--input-bg)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  const currentWorkflow = formData.category ? workflowCategoryMap[formData.category] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          New Change Request
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Fill in the details below — this will route to CAB for review once submitted
        </p>
      </div>

      {/* Main Form */}
      <form onSubmit={(e) => handleSubmit(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Top 2-Column Grid: Section 1 & Section 2 Cards Side-by-Side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
          
          {/* Section 1 Card: Change Details */}
          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Change Details
              </h3>
              <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Section 1 of 3
              </span>
            </div>

            {/* Change Title */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Change title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Upgrade payment-gateway API to v4"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
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

            {/* Category & Sub-category 2-Col Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
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
                  <option value="">Select category...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Sub-category
                </label>
                <select
                  value={formData.subCategory}
                  onChange={(e) => handleInputChange('subCategory', e.target.value)}
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
                  <option value="">Select sub-category...</option>
                  <option value="Version upgrade">Version upgrade</option>
                  <option value="Hotfix">Hotfix</option>
                  <option value="Rule update">Rule update</option>
                  <option value="Access grant">Access grant</option>
                </select>
              </div>
            </div>

            {/* Start Date & End Date 2-Col Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Start date
                  </label>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>planned change window</span>
                </div>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
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

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  End date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
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

            {/* Business Justification */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Business justification
                </label>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>why this change is needed, expected impact if not done</span>
              </div>
              <textarea
                rows={3}
                placeholder="Describe the business need, systems affected, and rollback plan..."
                value={formData.justification}
                onChange={(e) => handleInputChange('justification', e.target.value)}
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

            {/* Assigned Workflow Box */}
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Assigned workflow
                </label>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>auto-determined by category — routes to the correct approver automatically</span>
              </div>
              {currentWorkflow ? (
                <div style={{
                  padding: '0.9rem 1rem',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {currentWorkflow.name} <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>— routes to {currentWorkflow.board}</span>
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                    {currentWorkflow.steps}
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '0.9rem 1rem',
                  backgroundColor: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  color: 'var(--text-secondary)'
                }}>
                  Select a category above to see the workflow and approver that will be assigned automatically.
                </div>
              )}
            </div>

          </div>

          {/* Section 2 Card: Employee Details */}
          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Employee Details
              </h3>
              <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Section 2 of 3
              </span>
            </div>

            {/* Employee Name & Employee ID 2-Col Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Employee name
                </label>
                <input
                  type="text"
                  placeholder="Aashini Shah"
                  value={formData.employeeName}
                  onChange={(e) => handleInputChange('employeeName', e.target.value)}
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

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Employee Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. aashini.shah@stfox.com"
                  value={formData.employeeEmail || ''}
                  onChange={(e) => handleInputChange('employeeEmail', e.target.value)}
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

            {/* Department & Contact Number 2-Col Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. IT Operations"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
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

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Contact number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.contactNumber}
                  onChange={(e) => handleInputChange('contactNumber', e.target.value)}
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

            {/* Hostname & Location 2-Col Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Hostname / Asset ID
                  </label>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>system being changed</span>
                </div>
                <input
                  type="text"
                  placeholder="e.g. PROD-DB-CLSTR-02"
                  value={formData.hostname}
                  onChange={(e) => handleInputChange('hostname', e.target.value)}
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

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Location
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
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
                  <option value="Ahmedabad — HQ">Ahmedabad — HQ</option>
                  <option value="Mumbai Data Center">Mumbai Data Center</option>
                  <option value="Bengaluru Office">Bengaluru Office</option>
                  <option value="Remote / Cloud">Remote / Cloud</option>
                </select>
              </div>
            </div>

            {/* Environment & Manager Email 2-Col Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Environment
                </label>
                <select
                  value={formData.environment}
                  onChange={(e) => handleInputChange('environment', e.target.value)}
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
                  <option value="Production">Production</option>
                  <option value="Staging">Staging</option>
                  <option value="Development">Development</option>
                  <option value="DR Site">DR Site</option>
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Manager email
                  </label>
                  <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>for CC on approvals</span>
                </div>
                <input
                  type="email"
                  placeholder="manager@company.com"
                  value={formData.managerEmail}
                  onChange={(e) => handleInputChange('managerEmail', e.target.value)}
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

          </div>

        </div>

        {/* Section 3 Card: Review & Submit (Full Width) */}
        <div style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Review & Submit
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '520px', lineHeight: 1.45 }}>
              By submitting, a workflow and approver will be assigned automatically based on the category you selected, and this request will appear under My Requests with status Pending.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Section 3 of 3
            </span>

            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={isSubmitting}
              style={{
                padding: '0.6rem 1.25rem',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Save as draft
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.6rem 1.4rem',
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
              Submit for approval
            </button>
          </div>
        </div>

      </form>

    </div>
  );
}
