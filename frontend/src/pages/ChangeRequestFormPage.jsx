import React, { useState, useEffect } from 'react';
import { Send, ArrowLeft, Check } from 'lucide-react';
import { apiFetch } from '../lib/apiFetch';
import { getSession } from '../lib/auth';

export const RESTRICTED_ACTIONS = [
  'create an email id',
  'disable / revoke mailbox',
  'request m365 license',
  'remove m365 license',
  'request for procurement of laptop / desktop',
  'repair request',
  'dispose request',
  'request for procurement of it hardware / accessories',
  'request physical access',
  'revoke physical access'
];

export const getFieldOptions = (field, currentUser) => {
  if (field?.fieldKey === 'hostingType') {
    return ['AWS Cloud', 'Azure Cloud', 'GCP', 'Other Private Cloud', 'On Premise'];
  }
  let opts = field?.options ? [...field.options] : [];
  if (field?.fieldKey === 'actionRequired' && !opts.includes('Other')) {
    opts.push('Other');
  }
  if (field?.fieldKey === 'actionRequired' && currentUser && currentUser.isInUserTable === false) {
    opts = opts.filter(opt => !RESTRICTED_ACTIONS.includes(String(opt).trim().toLowerCase()));
  }
  return opts;
};

const READONLY_FIELD_STYLE = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  backgroundColor: '#F1F5F9',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  fontSize: '0.85rem',
  color: '#64748B',
  outline: 'none',
  cursor: 'not-allowed',
  boxSizing: 'border-box'
};

const ACTIVE_FIELD_STYLE = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  backgroundColor: '#FFFFFF',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  fontSize: '0.85rem',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box'
};

function ChangeRequestFormPage({ onNavigate, initialData, user }) {
  const defaultCategories = [
    {
      id: 'cat-srv',
      name: 'Server & Infra',
      description: 'Server lifecycle, OS patching, and compute infrastructure changes',
      subcategories: [
        { id: 'subcat-srv-lc', name: 'Server Lifecycle', sla: '3 business days', risk: 'Medium' },
        { id: 'subcat-srv-patch', name: 'OS / Patching', sla: '5 business days', risk: 'High' },
        { id: 'subcat-srv-oth', name: 'Other Server Changes', sla: '3 business days', risk: 'Medium' }
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
        { id: 'subcat-net-oth', name: 'Other Network Changes', sla: '3 business days', risk: 'Medium' }
      ]
    },
    {
      id: 'cat-acc',
      name: 'Access & Security',
      description: 'Application access, physical access, and security entitlements',
      subcategories: [
        { id: 'subcat-acc-app', name: 'Application Access', sla: '1 business day', risk: 'Low' },
        { id: 'subcat-acc-phys', name: 'Physical Access', sla: '1 business day', risk: 'Low' },
        { id: 'subcat-acc-oth', name: 'Other Access Requests', sla: '2 business days', risk: 'Medium' }
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
        { id: 'subcat-asset-oth', name: 'Other IT Asset Requests', sla: '3 business days', risk: 'Low' }
      ]
    },
    {
      id: 'cat-o365',
      name: 'Office 365 & Collaboration',
      description: 'Exchange mailboxes, email aliases, and M365 license management',
      subcategories: [
        { id: 'subcat-o365-mb', name: 'Mailbox', sla: '1 business day', risk: 'Low' },
        { id: 'subcat-o365-lic', name: 'M365 License', sla: '1 business day', risk: 'Low' },
        { id: 'subcat-o365-oth', name: 'Other Email / M365 Requests', sla: '2 business days', risk: 'Low' }
      ]
    },
    {
      id: 'cat-sec',
      name: 'Security Tools & Policies',
      description: 'Endpoint security agents, policies, and exemption requests',
      subcategories: [
        { id: 'subcat-sec-ep', name: 'Endpoint Agent', sla: '2 business days', risk: 'High' },
        { id: 'subcat-sec-oth', name: 'Other Security Changes', sla: '3 business days', risk: 'High' }
      ]
    }
  ];

  const [categories, setCategories] = useState(defaultCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState(defaultCategories[0].id);
  const [subcategories, setSubcategories] = useState(defaultCategories[0].subcategories);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(defaultCategories[0].subcategories[0].id);
  const [selectedSubcategory, setSelectedSubcategory] = useState(defaultCategories[0].subcategories[0]);
  const [fields, setFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState({});

  const isEditingDraft = Boolean(initialData?.id && initialData?.isDraft);

  const [currentSessionUser, setCurrentSessionUser] = useState(() => user || getSession()?.user);
  const activeSessionUser = currentSessionUser || user || getSession()?.user;

  const resolveEmpBusinessId = (u, initialVal) => {
    if (initialVal && typeof initialVal === 'string' && !initialVal.startsWith('S8-') && !initialVal.startsWith('EMP-')) return initialVal;
    if (u?.employee?.empId) return u.employee.empId;
    if (u?.employee?.employeeBusinessId) return u.employee.employeeBusinessId;
    if (u?.employeeBusinessId) return u.employeeBusinessId;
    if (u?.employeeId && typeof u.employeeId === 'string' && !u.employeeId.startsWith('S8-') && !u.employeeId.startsWith('EMP-')) return u.employeeId;
    if (u?.empId && typeof u.empId === 'string' && !u.empId.startsWith('S8-') && !u.empId.startsWith('EMP-')) return u.empId;
    return '';
  };

  const resolveEmpLocation = (u, initialVal) => {
    if (initialVal && typeof initialVal === 'string' && !initialVal.includes('Auto-fetched') && !initialVal.includes('Not specified')) return initialVal;
    if (u?.employee?.location) return u.employee.location;
    if (u?.location) return u.location;
    return '';
  };

  const [formData, setFormData] = useState(() => ({
    title: initialData?.title || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
    justification: initialData?.justification || initialData?.description || '',
    employeeName: initialData?.employeeName || activeSessionUser?.employee?.name || activeSessionUser?.name || '',
    employeeEmail: initialData?.employeeEmail || activeSessionUser?.employee?.email || activeSessionUser?.email || '',
    employeeId: resolveEmpBusinessId(activeSessionUser, initialData?.employeeId),
    location: resolveEmpLocation(activeSessionUser, initialData?.location),
    managerEmail: initialData?.managerEmail || '',
    risk: initialData?.risk || 'Medium'
  }));

  // Sync logged in user details if loaded async or refetched
  useEffect(() => {
    const syncUser = async () => {
      let currentUser = user || getSession()?.user;
      try {
        const res = await apiFetch('/me');
        if (res.ok) {
          const body = await res.json();
          if (body.data || body.user) currentUser = body.data || body.user;
        }
      } catch (err) {
        /* fallback to current session */
      }
      if (currentUser) {
        setCurrentSessionUser(currentUser);
        setFormData((prev) => ({
          ...prev,
          employeeName: prev.employeeName || currentUser.employee?.name || currentUser.name || '',
          employeeEmail: prev.employeeEmail || currentUser.employee?.email || currentUser.email || '',
          employeeId: resolveEmpBusinessId(currentUser, prev.employeeId),
          location: resolveEmpLocation(currentUser, prev.location)
        }));
      }
    };
    syncUser();
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
            body.data.forEach(c => {
              if (c.subcategories && Array.isArray(c.subcategories)) {
                c.subcategories.forEach(s => {
                  if (s.id === 'subcat-sec-ep' || s.name === 'End Point Agent') {
                    s.name = 'Endpoint Agent';
                  }
                });
              }
            });
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
    setCustomFieldValues({});
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
      setFieldsLoading(true);
      try {
        const res = await apiFetch(`/catalog/subcategories/${selectedSubcategoryId}/fields`);
        if (res.ok) {
          const body = await res.json();
          if (body.data && Array.isArray(body.data)) {
            const sanitizedFields = body.data.map(f => ({
              ...f,
              fieldLabel: f.fieldLabel && f.fieldLabel.toLowerCase() === 'current configuration'
                ? 'Current Configuration'
                : f.fieldLabel
                  ? f.fieldLabel.replace(/congfig/gi, 'Config').replace(/figuraiton/gi, 'figuration').replace('Proess', 'Process')
                  : f.fieldLabel,
              options: Array.isArray(f.options)
                ? f.options.map(opt => (typeof opt === 'string' ? opt.replace(/Exisitng/g, 'Existing') : opt))
                : f.options,
              appliesToActions: Array.isArray(f.appliesToActions)
                ? f.appliesToActions.map(act => (typeof act === 'string' ? act.replace(/Exisitng/g, 'Existing') : act))
                : f.appliesToActions
            }));
            setFields(sanitizedFields);
            const initialVals = { ...(initialData?.customFieldValues || {}) };
            const isOtherSubcat = selectedSubcategory?.name?.toLowerCase() === 'other' || selectedSubcategoryId?.endsWith('-oth');
            
            setCustomFieldValues(prev => {
              const newCustomVals = { ...prev };
              const currentAction = prev.actionRequired || initialVals.actionRequired || (isOtherSubcat ? 'Other' : '');

              sanitizedFields.forEach((f) => {
                let defaultVal = '';
                if (f.fieldType === 'dropdown') {
                  const opts = getFieldOptions(f, activeSessionUser);
                  defaultVal = isOtherSubcat && f.fieldKey === 'actionRequired' ? 'Other' : (opts[0] || '');
                } else if (f.fieldType === 'boolean') {
                  defaultVal = false;
                }

                // Check in prev, then fallback to initialData
                const existingVal = prev[f.fieldKey] !== undefined ? prev[f.fieldKey] : initialVals[f.fieldKey];

                if (existingVal !== undefined && existingVal !== null && existingVal !== '') {
                  if (f.fieldType === 'dropdown') {
                    const opts = getFieldOptions(f, activeSessionUser);
                    const isValid = opts.includes(existingVal);
                    newCustomVals[f.fieldKey] = isValid ? existingVal : defaultVal;
                  } else {
                    newCustomVals[f.fieldKey] = existingVal;
                  }
                } else {
                  if (newCustomVals[f.fieldKey] === undefined) {
                    newCustomVals[f.fieldKey] = defaultVal;
                  }
                }
              });

              if (isOtherSubcat) {
                newCustomVals.actionRequired = 'Other';
              }

              if (initialVals.otherAction && !newCustomVals.otherAction) {
                newCustomVals.otherAction = initialVals.otherAction;
              }

              return newCustomVals;
            });
          }
        }
      } catch (err) {
        console.warn('Failed to fetch subcategory fields:', err);
      } finally {
        setFieldsLoading(false);
      }
    };
    fetchFields();
  }, [selectedSubcategoryId, initialData, activeSessionUser?.isInUserTable]);

  const handleSubcategoryChange = (subId) => {
    setSelectedSubcategoryId(subId);
    const sub = subcategories.find((s) => s.id === subId);
    setSelectedSubcategory(sub || null);
    setCustomFieldValues({});
  };

  // Auto-generate title based on Action Required & Subcategory
  useEffect(() => {
    const actionRequiredVal = customFieldValues.actionRequired || '';
    if (!actionRequiredVal && !selectedSubcategory) return;

    const actionText = actionRequiredVal === 'Other'
      ? (customFieldValues.otherAction?.trim() || 'Other Action')
      : actionRequiredVal;

    let subName = selectedSubcategory?.name || '';
    if (subName === 'End Point Agent' || selectedSubcategory?.id === 'subcat-sec-ep') {
      subName = 'Endpoint Agent';
    }

    if (actionText && subName) {
      setFormData((prev) => ({
        ...prev,
        title: `${actionText} - ${subName}`
      }));
    } else if (subName) {
      setFormData((prev) => ({
        ...prev,
        title: `Change Request - ${subName}`
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
    const currentAction = finalCustomValues.actionRequired || '';
    const otherAllowedKeys = ['actionRequired', 'description', 'purposeReason', 'purpose'];

    fields.forEach((f) => {
      const applies = currentAction === 'Other'
        ? otherAllowedKeys.includes(f.fieldKey)
        : (!f.appliesToActions || !Array.isArray(f.appliesToActions) || f.appliesToActions.includes(currentAction));
      if (applies && f.fieldType === 'dropdown') {
        const opts = getFieldOptions(f, activeSessionUser);
        if (!finalCustomValues[f.fieldKey] || !opts.includes(finalCustomValues[f.fieldKey])) {
          finalCustomValues[f.fieldKey] = opts[0] || '';
        }
      }
    });

    // Whitelist only valid fields belonging to the current subcategory & action
    const allowedFieldKeys = new Set(
      fields
        .filter((f) => {
          if (currentAction === 'Other') {
            return otherAllowedKeys.includes(f.fieldKey);
          }
          return !f.appliesToActions || !Array.isArray(f.appliesToActions) || f.appliesToActions.includes(currentAction);
        })
        .map((f) => f.fieldKey)
    );
    allowedFieldKeys.add('actionRequired');
    allowedFieldKeys.add('otherAction');

    const sanitizedCustomValues = {};
    for (const [k, v] of Object.entries(finalCustomValues)) {
      if (allowedFieldKeys.has(k)) {
        if (v !== '' && v !== null && v !== undefined) {
          sanitizedCustomValues[k] = v;
        }
      }
    }

    const selectedCat = categories.find((c) => c.id === selectedCategoryId);
    const todayStr = new Date().toISOString().split('T')[0];

    const payload = {
      ...formData,
      startDate: formData.startDate || todayStr,
      category: selectedCat?.name || formData.category || 'Software Deployment',
      subCategory: selectedSubcategory?.name || formData.subCategory || '',
      subcategoryId: selectedSubcategoryId,
      actionRequired: finalCustomValues.actionRequired || '',
      customFieldValues: sanitizedCustomValues,
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
          fontWeight: 500
        }}>
          <Check size={28} />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          {isDraftSubmission ? 'Change Request Saved as Draft!' : 'Change Request Submitted Successfully!'}
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 1.75rem auto' }}>
          {isDraftSubmission
            ? 'Your request has been saved in your drafts. You can review and submit it anytime from My Requests.'
            : 'Your change request has been routed to Change Managers for review.'}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => onNavigate('My Requests', { filter: isDraftSubmission ? 'Draft' : 'Pending' })}
            style={{
              padding: '0.65rem 1.35rem',
              backgroundColor: 'var(--brand-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
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
  const OTHER_ACTION_ALLOWED_KEYS = ['actionRequired', 'description', 'purposeReason', 'purpose'];
  const visibleFields = fields.filter((f) => {
    if (actionRequiredValue === 'Other') {
      return OTHER_ACTION_ALLOWED_KEYS.includes(f.fieldKey);
    }
    if (!f.appliesToActions || !Array.isArray(f.appliesToActions)) return true;
    return f.appliesToActions.includes(actionRequiredValue);
  });

  const handleGoBack = () => {
    if (onNavigate) {
      const targetCategory = initialData?.fromCategory || initialData?.activeCategory || initialData?.category || 'Server & Infra';
      onNavigate('Change Catalog', { activeCategory: targetCategory });
    }
  };

  return (
    <form onSubmit={(e) => handleSubmit(e, false)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Header with Change Category Button on the Top Right */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
            {isEditingDraft ? 'Edit Draft Change Request' : 'Create Change Request'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', margin: 0 }}>
            Fill in employee and change details, then submit for Change Manager approval
          </p>
        </div>

        <button
          type="button"
          onClick={handleGoBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            backgroundColor: 'var(--card-bg)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: '0.825rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--input-bg)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--card-bg)'}
        >
          <span>Change Category</span>
        </button>
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

      {/* Single Main Card wrapping both sections */}
      <div style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '1.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
      }}>
        
        {/* Section 1: Requester Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
              Requester Details
            </h3>
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Section 1 of 2
            </span>
          </div>

          <div className="cd-responsive-form-grid">
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Requester Name
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={formData.employeeName}
                style={READONLY_FIELD_STYLE}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Employee Email
              </label>
              <input
                type="email"
                readOnly
                disabled
                placeholder="e.g. employee@company.com"
                value={formData.employeeEmail}
                style={READONLY_FIELD_STYLE}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Employee ID
              </label>
              <input
                type="text"
                readOnly
                disabled
                placeholder="e.g. SFC-0083"
                value={formData.employeeId}
                style={READONLY_FIELD_STYLE}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Location
              </label>
              <input
                type="text"
                readOnly
                disabled
                placeholder="e.g. Mumbai DC, Ahmedabad HQ, Remote"
                value={formData.location || resolveEmpLocation(activeSessionUser) || ''}
                style={READONLY_FIELD_STYLE}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Manager Email *
              </label>
              <input
                type="email"
                required
                placeholder="e.g. manager@company.com"
                value={formData.managerEmail}
                onChange={(e) => handleInputChange('managerEmail', e.target.value)}
                style={ACTIVE_FIELD_STYLE}
              />
            </div>
          </div>
        </div>

        {/* Section Divider Line */}
        <div style={{ borderTop: '1px solid var(--border-color)', width: '100%' }} />

        {/* Section 2: Change Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
              Change Details
            </h3>
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Section 2 of 2
            </span>
          </div>

          <div className="cd-responsive-form-grid">
            {/* Change Title */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Change Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Create a New Server - Server Lifecycle"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                style={ACTIVE_FIELD_STYLE}
              />
            </div>

            {/* Category (Locked to Catalog Selection) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Category
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={categories.find((c) => c.id === selectedCategoryId)?.name || initialData?.category || 'Server & Infra'}
                style={READONLY_FIELD_STYLE}
              />
            </div>

            {/* Sub-category (Locked to Catalog Selection) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Sub-category
              </label>
              <input
                type="text"
                readOnly
                disabled
                value={selectedSubcategory?.name || initialData?.subCategory || 'Server Lifecycle'}
                style={READONLY_FIELD_STYLE}
              />
            </div>

            {/* Start Date */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Start Date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                style={ACTIVE_FIELD_STYLE}
              />
            </div>

            {/* Dynamic Fields Renderer */}
            {visibleFields.length > 0 && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: 'var(--card-bg, #FFFFFF)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div className="cd-responsive-form-grid" style={{ gap: '1rem' }}>
                  {visibleFields.map((field) => {
                    const isActionRequiredOther = field.fieldKey === 'actionRequired' && customFieldValues.actionRequired === 'Other';
                    const isOtherSubcat = selectedSubcategory?.name?.toLowerCase() === 'other' || selectedSubcategoryId?.endsWith('-oth');

                    if (isOtherSubcat && field.fieldKey === 'actionRequired') {
                      return (
                        <div key={field.id || field.fieldKey} className="cd-form-span-2 cd-responsive-inner-grid">
                          <div>
                            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                              Action Required *
                            </label>
                            <input
                              type="text"
                              disabled
                              value="Other"
                              style={READONLY_FIELD_STYLE}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                              Specify Other Action *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Enter custom action......"
                              value={customFieldValues.otherAction || ''}
                              onChange={(e) => handleCustomFieldChange('otherAction', e.target.value)}
                              style={ACTIVE_FIELD_STYLE}
                            />
                          </div>
                        </div>
                      );
                    }

                    if (field.fieldType === 'dropdown' && isActionRequiredOther) {
                      const isDisabled = fieldsLoading && field.fieldKey === 'actionRequired';
                      return (
                        <div key={field.id || field.fieldKey} className="cd-form-span-2 cd-responsive-inner-grid">
                          <div>
                            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                              {field.fieldLabel} {field.isRequired ? '*' : ''}
                            </label>
                            <select
                              disabled={isDisabled}
                              value={customFieldValues[field.fieldKey] || ''}
                              onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                              style={isDisabled ? READONLY_FIELD_STYLE : ACTIVE_FIELD_STYLE}
                            >
                              {isDisabled ? (
                                <option value="">Loading options...</option>
                              ) : (
                                getFieldOptions(field, activeSessionUser).map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))
                              )}
                            </select>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                              Specify Other Action *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Enter custom action......"
                              value={customFieldValues.otherAction || ''}
                              onChange={(e) => handleCustomFieldChange('otherAction', e.target.value)}
                              style={ACTIVE_FIELD_STYLE}
                            />
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={field.id || field.fieldKey}>
                        <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                          {field.fieldLabel} {field.isRequired ? '*' : ''}
                        </label>
                        {(() => {
                          if (field.fieldType === 'dropdown') {
                            const isDisabled = fieldsLoading && field.fieldKey === 'actionRequired';
                            return (
                              <select
                                disabled={isDisabled}
                                value={customFieldValues[field.fieldKey] || ''}
                                onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                                style={isDisabled ? READONLY_FIELD_STYLE : ACTIVE_FIELD_STYLE}
                              >
                                {isDisabled ? (
                                  <option value="">Loading options...</option>
                                ) : (
                                  getFieldOptions(field, activeSessionUser).map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))
                                )}
                              </select>
                            );
                          }

                          if (field.fieldType === 'boolean') {
                            return (
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(customFieldValues[field.fieldKey])}
                                  onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.checked)}
                                />
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Enable / Yes</span>
                              </label>
                            );
                          }

                          if (field.fieldType === 'date') {
                            return (
                              <input
                                type="date"
                                value={customFieldValues[field.fieldKey] || ''}
                                onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                                style={ACTIVE_FIELD_STYLE}
                              />
                            );
                          }

                          if (field.fieldType === 'textarea') {
                            return (
                              <textarea
                                rows={3}
                                placeholder={`Enter ${field.fieldLabel}`}
                                value={customFieldValues[field.fieldKey] || ''}
                                onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                                style={{
                                  ...ACTIVE_FIELD_STYLE,
                                  resize: 'vertical'
                                }}
                              />
                            );
                          }

                          const cleanLabel = field.fieldLabel || '';
                          const placeholderText = cleanLabel.toLowerCase().includes('cve')
                            ? 'Enter KB/CVE (if applicable)'
                            : cleanLabel.toLowerCase().includes('current os')
                            ? 'Enter current OS/Version'
                            : cleanLabel.toLowerCase().includes('target version')
                            ? 'Enter target Version/Patch'
                            : cleanLabel.toLowerCase().includes('ip address')
                            ? 'Enter IP address'
                            : `Enter ${cleanLabel}`;

                          return (
                            <input
                              type="text"
                              placeholder={placeholderText}
                              value={customFieldValues[field.fieldKey] || ''}
                              onChange={(e) => handleCustomFieldChange(field.fieldKey, e.target.value)}
                              style={ACTIVE_FIELD_STYLE}
                            />
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Business justification */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                Business Justification *
              </label>
              <textarea
                rows={4}
                required
                placeholder="Explain why this change is required and the business impact of not implementing it..."
                value={formData.justification}
                onChange={(e) => handleInputChange('justification', e.target.value)}
                style={{
                  ...ACTIVE_FIELD_STYLE,
                  resize: 'vertical'
                }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Action Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
        <button
          type="button"
          onClick={handleGoBack}
          disabled={isSubmitting}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.6rem 1.15rem',
            backgroundColor: 'var(--card-bg)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = 'var(--input-bg)')}
          onMouseLeave={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = 'var(--card-bg)')}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={handleGoBack}
            disabled={isSubmitting}
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '0.6rem 1.35rem',
              backgroundColor: isSubmitting ? 'var(--border-color)' : 'var(--brand-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
              opacity: isSubmitting ? 0.7 : 1
            }}
          >
            <Send size={16} />
            <span>{isSubmitting ? 'Submitting...' : 'Submit for approval'}</span>
          </button>
        </div>
      </div>

    </form>
  );
}

export default React.memo(ChangeRequestFormPage);
