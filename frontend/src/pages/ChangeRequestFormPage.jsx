import React, { useState, useEffect } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../lib/apiFetch';
import { getSession } from '../lib/auth';

export default function ChangeRequestFormPage({ onNavigate, initialData, user }) {
  const defaultCategories = [
    {
      id: 'cat-srv',
      name: 'Server & Infra',
      description: 'Server lifecycle, OS patching, and compute infrastructure changes',
      subcategories: [
        { id: 'subcat-srv-lc', name: 'Server Lifecycle', sla: '3 business days', risk: 'Medium' },
        { id: 'subcat-srv-patch', name: 'OS / Patching', sla: '5 business days', risk: 'High' },
        { id: 'subcat-srv-oth', name: 'Other', sla: '3 business days', risk: 'Medium' }
      ]
    },
    {
      id: 'cat-net',
      name: 'Network & Connectivity',
      description: 'Firewall rules, Proxy/URL access, VPN, and network changes',
      subcategories: [
        { id: 'subcat-net-fw', name: 'Firewall / Port', sla: '2 business days', risk: 'Medium' },
        { id: 'subcat-net-proxy', name: 'Proxy / URL Access', sla: '1 business day', risk: 'Low' },
        { id: 'subcat-net-vpn', name: 'VPN', sla: '2 business days', risk: 'Medium' },
        { id: 'subcat-net-oth', name: 'Other', sla: '3 business days', risk: 'Medium' }
      ]
    },
    {
      id: 'cat-acc',
      name: 'Access & Security',
      description: 'Application access, physical access, and security entitlements',
      subcategories: [
        { id: 'subcat-acc-app', name: 'Application Access', sla: '1 business day', risk: 'Low' },
        { id: 'subcat-acc-phys', name: 'Physical Access', sla: '1 business day', risk: 'Low' },
        { id: 'subcat-acc-oth', name: 'Other', sla: '2 business days', risk: 'Medium' }
      ]
    },
    {
      id: 'cat-asset',
      name: 'IT Asset',
      description: 'Laptops, desktops, hardware accessories, software, and licenses',
      subcategories: [
        { id: 'subcat-asset-dev', name: 'Laptop / Desktop', sla: '5 business days', risk: 'Low' },
        { id: 'subcat-asset-hw', name: 'Other IT Hardware', sla: '5 business days', risk: 'Low' },
        { id: 'subcat-asset-sw', name: 'Software', sla: '3 business days', risk: 'Medium' },
        { id: 'subcat-asset-lic', name: 'License', sla: '2 business days', risk: 'Low' },
        { id: 'subcat-asset-oth', name: 'Other', sla: '3 business days', risk: 'Low' }
      ]
    },
    {
      id: 'cat-o365',
      name: 'Office 365 & Collaboration',
      description: 'Exchange mailboxes, email aliases, and M365 license management',
      subcategories: [
        { id: 'subcat-o365-mb', name: 'Mailbox', sla: '1 business day', risk: 'Low' },
        { id: 'subcat-o365-lic', name: 'M365 License', sla: '1 business day', risk: 'Low' },
        { id: 'subcat-o365-oth', name: 'Other', sla: '2 business days', risk: 'Low' }
      ]
    },
    {
      id: 'cat-sec',
      name: 'Security Tools & Policies',
      description: 'Endpoint security agents, policies, and exemption requests',
      subcategories: [
        { id: 'subcat-sec-ep', name: 'End Point Agent', sla: '2 business days', risk: 'High' },
        { id: 'subcat-sec-oth', name: 'Other', sla: '3 business days', risk: 'High' }
      ]
    }
  ];

  const [categories, setCategories] = useState(defaultCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState(defaultCategories[0].id);
  const [subcategories, setSubcategories] = useState(defaultCategories[0].subcategories);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(defaultCategories[0].subcategories[0].id);
  const [selectedSubcategory, setSelectedSubcategory] = useState(defaultCategories[0].subcategories[0]);
  const [fields, setFields] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState({});

  const isEditingDraft = Boolean(initialData?.id && initialData?.isDraft);

  const activeSessionUser = user || getSession()?.user;

  const [formData, setFormData] = useState(() => ({
    title: initialData?.title || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    justification: initialData?.justification || initialData?.description || '',
    employeeName: initialData?.employeeName || activeSessionUser?.name || '',
    employeeEmail: initialData?.employeeEmail || activeSessionUser?.email || '',
    location: initialData?.location || 'Ahmedabad HQ',
    department: initialData?.department || 'IT Operations',
    managerEmail: initialData?.managerEmail || '',
    risk: initialData?.risk || 'Medium'
  }));

  // Sync logged in user details if loaded async
  useEffect(() => {
    const currentUser = user || getSession()?.user;
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        employeeName: prev.employeeName || currentUser.name || '',
        employeeEmail: prev.employeeEmail || currentUser.email || ''
      }));
    }
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isDraftSubmission, setIsDraftSubmission] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Load Categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await apiFetch('/catalog/categories');
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) {
            setCategories(body.data);
            
            // Match category from initialData
            const reqCatName = (initialData?.category || '').trim().toLowerCase();
            const targetCat = reqCatName
              ? body.data.find(c => c.name.trim().toLowerCase() === reqCatName || reqCatName.includes(c.name.trim().toLowerCase())) || body.data[0]
              : body.data[0];

            if (targetCat) {
              setSelectedCategoryId(targetCat.id);
              if (targetCat.subcategories && targetCat.subcategories.length > 0) {
                setSubcategories(targetCat.subcategories);
                const reqSubName = (initialData?.subCategory || initialData?.title || initialData?.name || '').trim().toLowerCase();
                const targetSub = targetCat.subcategories.find(s =>
                  (initialData?.subcategoryId && s.id === initialData.subcategoryId) ||
                  (initialData?.id && s.id === initialData.id) ||
                  (reqSubName && s.name.trim().toLowerCase() === reqSubName) ||
                  (reqSubName && reqSubName.includes(s.name.trim().toLowerCase()))
                ) || targetCat.subcategories[0];
                
                setSelectedSubcategoryId(targetSub.id);
                setSelectedSubcategory(targetSub);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load catalog categories:', err);
      }
    };
    fetchCategories();
  }, [initialData]);

  // 2. Handle Category selection change
  const handleCategoryChange = (catId) => {
    setSelectedCategoryId(catId);
    const cat = categories.find((c) => c.id === catId);
    if (cat && cat.subcategories && cat.subcategories.length > 0) {
      setSubcategories(cat.subcategories);
      const firstSub = cat.subcategories[0];
      setSelectedSubcategoryId(firstSub.id);
      setSelectedSubcategory(firstSub);
    } else {
      setSubcategories([]);
      setSelectedSubcategoryId('');
      setSelectedSubcategory(null);
      setFields([]);
    }
  };

  // 3. Handle Subcategory selection change & load fields
  useEffect(() => {
    if (!selectedSubcategoryId) return;
    const fetchFields = async () => {
      try {
        const res = await apiFetch(`/catalog/subcategories/${selectedSubcategoryId}/fields`);
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) {
            setFields(body.data);
            const initialVals = { ...(initialData?.customFieldValues || {}) };
            body.data.forEach((f) => {
              if (initialVals[f.fieldKey] === undefined || initialVals[f.fieldKey] === '') {
                if (f.fieldType === 'dropdown' && f.options && f.options.length > 0) {
                  initialVals[f.fieldKey] = f.options[0];
                } else if (f.fieldType === 'boolean') {
                  initialVals[f.fieldKey] = false;
                } else {
                  initialVals[f.fieldKey] = '';
                }
              }
            });
            setCustomFieldValues(initialVals);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch subcategory fields:', err);
      }
    };
    fetchFields();
  }, [selectedSubcategoryId, initialData]);

  const handleSubcategoryChange = (subId) => {
    setSelectedSubcategoryId(subId);
    const sub = subcategories.find((s) => s.id === subId);
    setSelectedSubcategory(sub || null);
  };

  // Auto-generate title based on Action Required & Subcategory
  useEffect(() => {
    const actionRequiredVal = customFieldValues.actionRequired || '';
    if (!actionRequiredVal && !selectedSubcategory) return;

    const actionText = actionRequiredVal === 'Other'
      ? (customFieldValues.otherAction?.trim() || 'Other Action')
      : actionRequiredVal;

    const subName = selectedSubcategory?.name || '';

    if (actionText && subName) {
      setFormData((prev) => ({
        ...prev,
        title: `[${actionText}] - ${subName}`
      }));
    } else if (subName) {
      setFormData((prev) => ({
        ...prev,
        title: `[Change Request] - ${subName}`
      }));
    }
  }, [selectedSubcategory, customFieldValues.actionRequired, customFieldValues.otherAction]);

  const handleCustomFieldChange = (key, value) => {
    setCustomFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e, isDraft = false) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setIsDraftSubmission(isDraft);
    setErrorMessage('');

    if (!isDraft && customFieldValues.actionRequired === 'Other' && !customFieldValues.otherAction?.trim()) {
      setErrorMessage('Please specify the details for the Other action option.');
      setIsSubmitting(false);
      return;
    }

    const finalCustomValues = { ...customFieldValues };
    fields.forEach((f) => {
      if (f.fieldType === 'dropdown' && f.options && f.options.length > 0) {
        if (!finalCustomValues[f.fieldKey] || finalCustomValues[f.fieldKey] === '') {
          finalCustomValues[f.fieldKey] = f.options[0];
        }
      }
    });

    const selectedCat = categories.find((c) => c.id === selectedCategoryId);

    const payload = {
      ...formData,
      category: selectedCat?.name || formData.category || 'Software Deployment',
      subCategory: selectedSubcategory?.name || formData.subCategory || '',
      subcategoryId: selectedSubcategoryId,
      customFieldValues: finalCustomValues,
      isDraft,
      risk: selectedSubcategory?.risk || formData.risk
    };

    try {
      const endpoint = isEditingDraft ? `/change-requests/${initialData.id}` : '/change-requests';
      const method = isEditingDraft ? 'PATCH' : 'POST';

      const res = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        if (isEditingDraft && !isDraft) {
          await apiFetch(`/change-requests/${initialData.id}/submit`, { method: 'PATCH' });
        }
        setSubmitSuccess(true);
      } else {
        const errBody = await res.json();
        setErrorMessage(errBody.message || 'Failed to submit change request');
      }
    } catch (err) {
      console.warn('Backend API request failed:', err);
      setErrorMessage(err.message || 'Network error submitting change request');
    } finally {
      setIsSubmitting(false);
    }
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
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#D1FAE5',
          color: '#059669',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto',
          fontSize: '1.75rem',
          fontWeight: 800
        }}>
          ✓
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          {isDraftSubmission ? 'Change Request Saved as Draft!' : 'Change Request Submitted Successfully!'}
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 1.75rem auto' }}>
          {isDraftSubmission
            ? 'Your request has been saved in your drafts. You can review and submit it anytime from My Requests.'
            : 'Your change request has been routed to active CAB Approvers for quorum review.'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => onNavigate('My Requests', { filter: isDraftSubmission ? 'Draft' : 'Pending' })}
            style={{
              padding: '0.65rem 1.35rem',
              backgroundColor: '#0D9488',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {isDraftSubmission ? 'Go to My Drafts' : 'View My Requests'}
          </button>
        </div>
      </div>
    );
  }

  const actionRequiredValue = customFieldValues.actionRequired || '';
  const visibleFields = fields.filter((f) => {
    if (!f.appliesToActions || !Array.isArray(f.appliesToActions)) return true;
    return f.appliesToActions.includes(actionRequiredValue);
  });

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => onNavigate('Change Catalog')}
            style={{
              background: 'none',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.45rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              Create Change Request
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
              Fill in the change details and submit for CAB quorum approval
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
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
              padding: '0.6rem 1.35rem',
              backgroundColor: '#0D9488',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 1px 3px rgba(13, 148, 136, 0.2)'
            }}
          >
            <Send size={16} />
            <span>{isSubmitting ? 'Submitting...' : 'Submit for approval'}</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{
          backgroundColor: '#FEE2E2',
          border: '1px solid #FCA5A5',
          color: '#DC2626',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          {errorMessage}
        </div>
      )}

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
              Section 1 of 2
            </span>
          </div>

          {/* Change Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Change title *
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

          {/* Category & Sub-category Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Category *
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
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
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Sub-category *
              </label>
              <select
                value={selectedSubcategoryId}
                onChange={(e) => handleSubcategoryChange(e.target.value)}
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
                {subcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Fields Renderer */}
          {visibleFields.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: 'var(--input-bg)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sub-category Dynamic Attributes
              </span>
              {visibleFields.map((field) => (
                <div key={field.id || field.fieldKey}>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    {field.fieldLabel} {field.isRequired ? '*' : ''}
                  </label>
                  {field.fieldType === 'dropdown' ? (
                    <div>
                      <select
                        value={customFieldValues[field.fieldKey] || ''}
                        onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.65rem 0.85rem',
                          backgroundColor: 'var(--card-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary)',
                          outline: 'none'
                        }}
                      >
                        {(() => {
                          const opts = field.options ? [...field.options] : [];
                          if (field.fieldKey === 'actionRequired' && !opts.includes('Other')) {
                            opts.push('Other');
                          }
                          return opts.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ));
                        })()}
                      </select>

                      {field.fieldKey === 'actionRequired' && customFieldValues.actionRequired === 'Other' && (
                        <div style={{ marginTop: '0.65rem' }}>
                          <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                            Specify Other Action *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Enter custom action title / details..."
                            value={customFieldValues.otherAction || ''}
                            onChange={(e) => handleCustomFieldChange('otherAction', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.65rem 0.85rem',
                              backgroundColor: 'var(--card-bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              color: 'var(--text-primary)',
                              outline: 'none'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ) : field.fieldType === 'boolean' ? (
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(customFieldValues[field.fieldKey])}
                        onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.checked)}
                      />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Enable / Yes</span>
                    </label>
                  ) : field.fieldType === 'date' ? (
                    <input
                      type="date"
                      value={customFieldValues[field.fieldKey] || ''}
                      onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
                      value={customFieldValues[field.fieldKey] || ''}
                      onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        backgroundColor: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: 'var(--text-primary)',
                        outline: 'none'
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Preferred Change Date & Justification */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Preferred Change Date (Start Date)
            </label>
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
              Business justification *
            </label>
            <textarea
              rows={4}
              required
              placeholder="Explain why this change is required and the business impact of not implementing it..."
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

          {/* Read-only Workflow Box */}
          {selectedSubcategory && (
            <div style={{
              padding: '1rem',
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Auto-Assigned Workflow (Read-Only)
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0D9488', marginTop: '0.2rem' }}>
                {selectedSubcategory.workflow?.name || 'Standard Change Workflow'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                {selectedSubcategory.workflow?.steps || 'Draft → Submitted → CAB Review → Approved → Closed'}
              </div>
            </div>
          )}

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
              Section 2 of 2
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Employee name
              </label>
              <input
                type="text"
                value={formData.employeeName}
                onChange={(e) => handleInputChange('employeeName', e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Employee email
              </label>
              <input
                type="email"
                placeholder="e.g. employee@company.com"
                value={formData.employeeEmail}
                onChange={(e) => handleInputChange('employeeEmail', e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Department *
              </label>
              <select
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="IT Operations">IT Operations</option>
                <option value="DevOps & Infrastructure">DevOps & Infrastructure</option>
                <option value="Cybersecurity">Cybersecurity</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Enterprise Systems">Enterprise Systems</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Finance & Accounts">Finance & Accounts</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Location *
              </label>
              <select
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.85rem', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none' }}
              >
                <option value="Ahmedabad HQ">Ahmedabad HQ</option>
                <option value="Mumbai DC">Mumbai DC</option>
                <option value="Bangalore Office">Bangalore Office</option>
                <option value="Delhi Regional">Delhi Regional</option>
                <option value="Remote">Remote</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
              Manager Email *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. manager@company.com"
              value={formData.managerEmail}
              onChange={(e) => handleInputChange('managerEmail', e.target.value)}
              style={{ width: '100%', padding: '0.65rem 0.85rem', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>

        </div>

      </div>

    </form>
  );
}
