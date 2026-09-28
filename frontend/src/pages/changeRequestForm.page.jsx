import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Send, ArrowLeft, ArrowRight, Check, CheckCircle2, Search, ChevronDown, Edit3 } from 'lucide-react';
import { apiFetch } from '../lib/apiFetch.lib';
import { getSession } from '../lib/auth.lib';
import { FormLabel } from '../components/ui/primitives.component';

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
  const isSuperAdmin = Boolean(
    currentUser?.isSuperAdmin ||
    currentUser?.roleId === 'role-1' ||
    currentUser?.role === 'Super Admin' ||
    currentUser?.role === 'ChangeDesk Super Admin' ||
    currentUser?.roleName === 'Super Admin' ||
    currentUser?.roleName === 'ChangeDesk Super Admin'
  );
  const hasRestrictedAccess = isSuperAdmin || currentUser?.isInUserTable === true;
  if (field?.fieldKey === 'actionRequired' && currentUser && !hasRestrictedAccess) {
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

function ChangeRequestFormPage({ onNavigate, user, initialData, searchQuery = '' }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(() => (initialData?.category || initialData?.subCategory ? 2 : 1));
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [subcategories, setSubcategories] = useState([]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [fields, setFields] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState({});
  const [hoveredCatId, setHoveredCatId] = useState(null);
  const [hoveredSubId, setHoveredSubId] = useState(null);
  const [certified, setCertified] = useState(false);
  const [createdCode, setCreatedCode] = useState('');

  const [currentSessionUser, setCurrentSessionUser] = useState(() => user || getSession()?.user);
  const activeSessionUser = currentSessionUser || user || getSession()?.user;
  const [errorMessage, setErrorMessage] = useState('');

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

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState(() => ({
    title: initialData?.title || '',
    startDate: initialData?.startDate || getTodayDateString(),
    endDate: initialData?.endDate || '',
    justification: initialData?.justification || initialData?.description || '',
    employeeName: initialData?.employeeName || activeSessionUser?.employee?.name || activeSessionUser?.name || '',
    employeeEmail: initialData?.employeeEmail || activeSessionUser?.employee?.email || activeSessionUser?.email || '',
    employeeId: resolveEmpBusinessId(activeSessionUser, initialData?.employeeId),
    location: resolveEmpLocation(activeSessionUser, initialData?.location),
    managerName: initialData?.managerName || initialData?.customFieldValues?.managerName || '',
    managerEmail: initialData?.managerEmail || ''
  }));

  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const managerDropdownRef = useRef(null);

  // Close manager dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (managerDropdownRef.current && !managerDropdownRef.current.contains(e.target)) {
        setManagerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch active employees for Manager dropdown from employees table
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await apiFetch('/users');
        if (res.ok) {
          const body = await res.json();
          const list = body.data || body.users || [];
          if (Array.isArray(list)) {
            setAvailableUsers(list);
          }
        }
      } catch (err) {
        console.warn('Failed to load active employees for manager dropdown:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  // Sync logged in user details if loaded async or refetched
  useEffect(() => {
    const currentUser = user || getSession()?.user;
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
  }, [user]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

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
            
            if (reqCatName) {
              const targetCat = body.data.find(c => c.name.trim().toLowerCase() === reqCatName || reqCatName.includes(c.name.trim().toLowerCase()));
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
                  );
                  if (targetSub) {
                    setSelectedSubcategoryId(targetSub.id);
                    setSelectedSubcategory(targetSub);
                  }
                }
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
    setSelectedSubcategoryId('');
    setSelectedSubcategory(null);
    setCustomFieldValues({});
    const cat = categories.find((c) => c.id === catId);
    if (cat && cat.subcategories && cat.subcategories.length > 0) {
      setSubcategories(cat.subcategories);
    } else {
      setSubcategories([]);
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
          if (body.data) {
            let fetchedFields = Array.isArray(body.data) ? body.data : (body.data.fields || []);

            const isOtherSubcat =
              selectedSubcategoryId === 'subcat-srv-oth' ||
              selectedSubcategoryId === 'subcat-net-oth' ||
              selectedSubcategoryId === 'subcat-acc-oth' ||
              selectedSubcategoryId === 'subcat-asset-oth' ||
              selectedSubcategoryId === 'subcat-o365-oth' ||
              selectedSubcategoryId === 'subcat-sec-oth';

            const hasActionRequired = fetchedFields.some((f) => f.fieldKey === 'actionRequired');

            if (isOtherSubcat) {
              fetchedFields = fetchedFields.filter(f => f.fieldKey !== 'actionRequired');
              fetchedFields.unshift({
                id: 'field-auto-action-req-other',
                fieldKey: 'actionRequired',
                fieldLabel: 'Action Required',
                fieldType: 'text',
                isRequired: true,
                defaultValue: 'Other',
                options: ['Other'],
                appliesToActions: ['Other']
              });
            } else if (!hasActionRequired) {
              let defaultActionOptions = ['Provision / Setup', 'Modify / Update', 'Decommission / Revoke', 'Other'];
              const subNameLower = (selectedSubcategory?.name || body.data.name || '').toLowerCase();
              const catNameLower = (body.data.category?.name || categories.find(c => c.id === selectedCategoryId)?.name || '').toLowerCase();

              if (catNameLower.includes('it asset') || subNameLower.includes('laptop') || subNameLower.includes('desktop') || subNameLower.includes('hardware')) {
                defaultActionOptions = [
                  'Procure New Asset',
                  'Replace Damaged / Faulty Asset',
                  'Temporary Standby Allocation',
                  'Upgrade RAM / SSD Storage',
                  'Return / Offboarding Handover',
                  'Dispose / E-Waste Scrap',
                  'Other'
                ];
              } else if (catNameLower.includes('security') || catNameLower.includes('access') || subNameLower.includes('firewall') || subNameLower.includes('vpn') || subNameLower.includes('proxy') || subNameLower.includes('access')) {
                defaultActionOptions = [
                  'Request Access',
                  'Modify Permissions / Rules',
                  'Revoke Access / Disable Rule',
                  'Other'
                ];
              }

              fetchedFields.unshift({
                id: 'field-auto-action-req',
                fieldKey: 'actionRequired',
                fieldLabel: 'Action Required',
                fieldType: 'dropdown',
                isRequired: true,
                options: defaultActionOptions,
                appliesToActions: defaultActionOptions
              });
            }

            setFields(fetchedFields);

            setCustomFieldValues((prevCustomVals) => {
              const initialVals = initialData?.customFieldValues || {};
              const newCustomVals = { ...prevCustomVals };

              fetchedFields.forEach((f) => {
                let defaultVal = f.defaultValue;
                if (defaultVal === undefined || defaultVal === null || defaultVal === '') {
                  if (f.fieldType === 'dropdown') {
                    const opts = getFieldOptions(f, activeSessionUser);
                    defaultVal = opts.length > 0 ? opts[0] : '';
                  } else if (f.fieldType === 'boolean') {
                    defaultVal = false;
                  } else {
                    defaultVal = '';
                  }
                }

                if (initialVals[f.fieldKey] !== undefined) {
                  const existingVal = initialVals[f.fieldKey];
                  if (f.fieldType === 'dropdown') {
                    const opts = getFieldOptions(f, activeSessionUser);
                    const isValid = opts.includes(existingVal);
                    newCustomVals[f.fieldKey] = isValid ? existingVal : defaultVal;
                  } else {
                    newCustomVals[f.fieldKey] = existingVal;
                  }
                } else {
                  if (newCustomVals[f.fieldKey] === undefined || newCustomVals[f.fieldKey] === '') {
                    newCustomVals[f.fieldKey] = defaultVal;
                  }
                }
              });

              if (isOtherSubcat) {
                newCustomVals.actionRequired = 'Other';
              } else if (!newCustomVals.actionRequired) {
                const actionField = fetchedFields.find(f => f.fieldKey === 'actionRequired');
                if (actionField) {
                  const opts = getFieldOptions(actionField, activeSessionUser);
                  newCustomVals.actionRequired = opts[0] || 'Provision / Setup';
                }
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
  }, [selectedSubcategoryId, selectedSubcategory, initialData, activeSessionUser?.isInUserTable]);

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

  const handleDetailsSubmit = (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    if (!formData.managerName) {
      setErrorMessage('Please select a Reporting Manager.');
      return;
    }
    if (!formData.startDate) {
      setErrorMessage('Start Date is compulsory. Please select a start date.');
      return;
    }
    if (customFieldValues.actionRequired === 'Other' && !customFieldValues.otherAction?.trim()) {
      setErrorMessage('Please specify the details for the Other action option.');
      return;
    }
    if (!formData.justification?.trim()) {
      setErrorMessage('Please enter a Business Justification.');
      return;
    }

    setStep(3);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

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

    if (formData.managerName) {
      sanitizedCustomValues.managerName = formData.managerName;
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
      isDraft: false
    };

    try {
      const res = await apiFetch('/change-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['worklist'] });
        setCreatedCode(data.data?.requestCode || data.data?.id || '');
        setSubmitSuccess(true);
      } else {
        setErrorMessage(data.message || 'Failed to submit change request');
      }
    } catch (err) {
      console.warn('Backend API request failed:', err);
      setErrorMessage(err.message || 'Network error submitting change request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = ['Change Category', 'Request Details', 'Review & Submit'];

  const selectedCategoryObj = categories.find((c) => c.id === selectedCategoryId);

  const actionRequiredValue = (customFieldValues.actionRequired || '').trim().toLowerCase();
  const OTHER_ACTION_ALLOWED_KEYS = ['actionrequired', 'description', 'purposereason', 'purpose'];
  const DUPLICATE_EXCLUDED_KEYS = ['replacementpurposereason', 'purposereason'];
  const visibleFields = fields.filter((f) => {
    const key = (f.fieldKey || '').toLowerCase();
    const label = (f.fieldLabel || '').toLowerCase();
    if (DUPLICATE_EXCLUDED_KEYS.includes(key) || label.includes('replacement purpose') || label === 'purpose / reason') {
      return false;
    }
    // Action Required field must ALWAYS be visible
    if (f.fieldKey === 'actionRequired' || key === 'actionrequired') {
      return true;
    }
    if (actionRequiredValue === 'other') {
      return OTHER_ACTION_ALLOWED_KEYS.includes(key);
    }
    if (!f.appliesToActions || !Array.isArray(f.appliesToActions) || f.appliesToActions.length === 0) return true;
    return f.appliesToActions.some(act => String(act).trim().toLowerCase() === actionRequiredValue);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '1040px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Top Header */}
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
          New Change Request
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
          Submit and track IT infrastructure, system, access, and asset change requests
        </p>
      </div>

      {/* Stepper Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 1.25rem',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        overflowX: 'auto',
        gap: '0.75rem'
      }}>
        {stepsList.map((label, index) => {
          const stepNum = index + 1;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <div
              key={label}
              onClick={() => {
                if (isDone) setStep(stepNum);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontSize: '0.825rem',
                fontWeight: isActive || isDone ? 600 : 500,
                color: isActive ? 'var(--brand-primary)' : isDone ? '#059669' : 'var(--text-secondary)',
                whiteSpace: 'nowrap',
                cursor: isDone ? 'pointer' : 'default'
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: isActive ? 'var(--brand-primary)' : isDone ? '#059669' : 'var(--input-bg)',
                  color: isActive || isDone ? '#FFFFFF' : 'var(--text-secondary)',
                  border: isActive || isDone ? 'none' : '1px solid var(--border-color)'
                }}
              >
                {isDone ? <Check size={13} strokeWidth={3} /> : stepNum}
              </div>
              <span>{label}</span>
              {index < stepsList.length - 1 && (
                <span style={{ color: 'var(--border-color)', marginLeft: '0.5rem' }}>/</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Error Message Banner */}
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

      {/* Success Banner */}
      {submitSuccess && (
        <div style={{
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: '12px',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
          boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#065F46', margin: 0 }}>
            Change Request Submitted Successfully!
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#047857', maxWidth: '480px', margin: 0, lineHeight: 1.5 }}>
            Your change request <strong>{createdCode || ''}</strong> has been routed to Change Managers for review and authorization.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setSubmitSuccess(false);
                setStep(1);
                setCertified(false);
              }}
              style={{
                padding: '0.65rem 1.35rem',
                backgroundColor: '#047857',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Create Another Request
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('Dashboard')}
              style={{
                padding: '0.65rem 1.35rem',
                backgroundColor: 'transparent',
                color: '#065F46',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* STEP 1: Select Change Category & Subcategory */}
      {!submitSuccess && step === 1 && (
        <div style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                1. Select Change Category
              </h3>
              <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Step 1 of 3
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {categories.map(cat => {
                const selected = selectedCategoryId === cat.id;
                const isHovered = hoveredCatId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    onMouseEnter={() => setHoveredCatId(cat.id)}
                    onMouseLeave={() => setHoveredCatId(null)}
                    style={{
                      padding: '1.1rem',
                      borderRadius: '12px',
                      textAlign: 'left',
                      border: selected
                        ? '2px solid var(--brand-primary, #173C4E)'
                        : isHovered
                        ? '1.5px solid var(--brand-primary, #173C4E)'
                        : '1px solid var(--border-color)',
                      backgroundColor: selected ? 'var(--input-bg, #F4F5F7)' : 'var(--card-bg)',
                      boxShadow: selected
                        ? '0 0 0 3px rgba(23, 60, 78, 0.12)'
                        : isHovered
                        ? '0 12px 24px -4px rgba(23, 60, 78, 0.14), 0 4px 12px -2px rgba(0, 0, 0, 0.06)'
                        : '0 1px 3px rgba(16, 21, 30, 0.04)',
                      transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{cat.name}</div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                      {cat.subcategories?.length || 0} subcategories available
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedCategoryObj && (
            <div style={{ paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.75rem 0' }}>
                2. Select Subcategory for {selectedCategoryObj.name}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem' }}>
                {subcategories.map(sub => {
                  const selected = selectedSubcategoryId === sub.id;
                  const isHovered = hoveredSubId === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSubcategoryChange(sub.id)}
                      onMouseEnter={() => setHoveredSubId(sub.id)}
                      onMouseLeave={() => setHoveredSubId(null)}
                      style={{
                        padding: '0.75rem 0.95rem',
                        borderRadius: '8px',
                        fontSize: '0.825rem',
                        fontWeight: selected ? 600 : 500,
                        textAlign: 'left',
                        border: selected
                          ? '2px solid var(--brand-primary, #173C4E)'
                          : isHovered
                          ? '1.5px solid var(--brand-primary, #173C4E)'
                          : '1px solid var(--border-color)',
                        backgroundColor: 'transparent',
                        color: 'var(--text-primary)',
                        boxShadow: selected
                          ? '0 0 0 3px rgba(23, 60, 78, 0.12)'
                          : isHovered
                          ? '0 6px 14px -2px rgba(23, 60, 78, 0.12)'
                          : 'none',
                        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
                        cursor: 'pointer',
                        transition: 'transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease'
                      }}
                    >
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              disabled={!selectedCategoryId || !selectedSubcategoryId}
              onClick={() => setStep(2)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.35rem',
                backgroundColor: 'var(--brand-primary)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: (!selectedCategoryId || !selectedSubcategoryId) ? 'not-allowed' : 'pointer',
                opacity: (!selectedCategoryId || !selectedSubcategoryId) ? 0.5 : 1
              }}
            >
              <span>Next: Request Details</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Fill in Request Details */}
      {!submitSuccess && step === 2 && (
        <form onSubmit={handleDetailsSubmit} style={{
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
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Requester Details
              </h3>
              <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Section 1 of 2
              </span>
            </div>

            <div className="cd-responsive-form-grid">
              <div>
                <FormLabel>Requester Name</FormLabel>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={formData.employeeName}
                  style={READONLY_FIELD_STYLE}
                />
              </div>
              <div>
                <FormLabel>Employee Email</FormLabel>
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
                <FormLabel>Employee ID</FormLabel>
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
                <FormLabel>Location</FormLabel>
                <input
                  type="text"
                  readOnly
                  disabled
                  placeholder="e.g. Mumbai DC, Ahmedabad HQ, Remote"
                  value={formData.location || resolveEmpLocation(activeSessionUser) || ''}
                  style={READONLY_FIELD_STYLE}
                />
              </div>
              {/* Searchable Manager Combobox Dropdown */}
              <div ref={managerDropdownRef} style={{ position: 'relative' }}>
                <FormLabel required>Manager Name</FormLabel>
                <div
                  tabIndex={0}
                  onClick={() => setManagerDropdownOpen(prev => !prev)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setManagerDropdownOpen(prev => !prev);
                    }
                  }}
                  style={{
                    ...ACTIVE_FIELD_STYLE,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#FFFFFF',
                    userSelect: 'none'
                  }}
                >
                  <span style={{ color: formData.managerName ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {formData.managerName || (loadingUsers ? 'Loading employees...' : 'Select Reporting Manager...')}
                  </span>
                  <ChevronDown size={16} style={{ color: 'var(--text-secondary)', transition: 'transform 0.2s', transform: managerDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                </div>

                {managerDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    marginTop: '0.35rem',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                    <div style={{ padding: '0.65rem', borderBottom: '1px solid var(--border-color)', backgroundColor: '#F8FAFC' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={14} style={{ position: 'absolute', left: '0.65rem', color: '#94A3B8' }} />
                        <input
                          type="text"
                          autoFocus
                          value={managerSearchTerm}
                          onChange={(e) => setManagerSearchTerm(e.target.value)}
                          placeholder="Search manager by name or email..."
                          style={{
                            width: '100%',
                            padding: '0.45rem 0.65rem 0.45rem 2rem',
                            fontSize: '0.8rem',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            outline: 'none',
                            backgroundColor: '#FFFFFF',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '0.25rem 0' }}>
                      {availableUsers
                        .filter((u) => {
                          if (!managerSearchTerm.trim()) return true;
                          const term = managerSearchTerm.toLowerCase().trim();
                          const nameMatch = (u.name || '').toLowerCase().includes(term);
                          const emailMatch = (u.email || '').toLowerCase().includes(term);
                          const empIdMatch = (u.empId || '').toLowerCase().includes(term);
                          return nameMatch || emailMatch || empIdMatch;
                        })
                        .map((u) => {
                          const isSelected = formData.managerName === u.name;
                          return (
                            <div
                              key={u.id || u.email}
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  managerName: u.name,
                                  managerEmail: u.email || ''
                                }));
                                setManagerDropdownOpen(false);
                                setManagerSearchTerm('');
                              }}
                              style={{
                                padding: '0.55rem 0.85rem',
                                fontSize: '0.825rem',
                                cursor: 'pointer',
                                backgroundColor: isSelected ? '#EFF6FF' : 'transparent',
                                color: isSelected ? '#1D4ED8' : 'var(--text-primary)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.1rem',
                                transition: 'background-color 0.15s'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = '#F8FAFC';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <div style={{ fontWeight: isSelected ? 700 : 500 }}>
                                {u.name}
                              </div>
                              <div style={{ fontSize: '0.725rem', color: '#64748B', fontFamily: 'var(--font-mono)' }}>
                                {u.email} {u.empId ? `• ${u.empId}` : ''}
                              </div>
                            </div>
                          );
                        })}
                      {availableUsers.filter((u) => {
                        if (!managerSearchTerm.trim()) return true;
                        const term = managerSearchTerm.toLowerCase().trim();
                        return (u.name || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term);
                      }).length === 0 && (
                        <div style={{ padding: '0.85rem', textAlign: 'center', fontSize: '0.8rem', color: '#94A3B8' }}>
                          No employees found matching "{managerSearchTerm}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Manager Email */}
              <div>
                <FormLabel>Manager Email</FormLabel>
                <input
                  type="email"
                  readOnly
                  disabled
                  value={formData.managerEmail || ''}
                  style={READONLY_FIELD_STYLE}
                />
              </div>
            </div>
          </div>

          {/* Section Divider Line */}
          <div style={{ borderTop: '1px solid var(--border-color)', width: '100%' }} />

          {/* Section 2: Change Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Change Details
              </h3>
              <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Section 2 of 2
              </span>
            </div>

            <div className="cd-responsive-form-grid">
              {/* Change Title */}
              <div>
                <FormLabel>Change Title</FormLabel>
                <input
                  type="text"
                  readOnly
                  disabled
                  placeholder="Auto-generated from action and sub-category"
                  value={formData.title}
                  style={READONLY_FIELD_STYLE}
                />
              </div>

              {/* Category */}
              <div>
                <FormLabel>Category</FormLabel>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={selectedCategoryObj?.name || formData.category || 'Server & Infra'}
                  style={READONLY_FIELD_STYLE}
                />
              </div>

              {/* Sub-category */}
              <div>
                <FormLabel>Sub-category</FormLabel>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={selectedSubcategory?.name || formData.subCategory || 'Server Lifecycle'}
                  style={READONLY_FIELD_STYLE}
                />
              </div>

              {/* Start Date */}
              <div>
                <FormLabel required>Start Date</FormLabel>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  style={ACTIVE_FIELD_STYLE}
                />
              </div>

              {/* Dynamic Fields */}
              {visibleFields.length > 0 && (
                <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', backgroundColor: 'var(--card-bg, #FFFFFF)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  <div className="cd-responsive-form-grid" style={{ gap: '1rem' }}>
                    {visibleFields.map((field) => {
                      const isOtherSubcat =
                        selectedSubcategoryId === 'subcat-srv-oth' ||
                        selectedSubcategoryId === 'subcat-net-oth' ||
                        selectedSubcategoryId === 'subcat-acc-oth' ||
                        selectedSubcategoryId === 'subcat-asset-oth' ||
                        selectedSubcategoryId === 'subcat-o365-oth' ||
                        selectedSubcategoryId === 'subcat-sec-oth';
                      const isActionRequiredOther = field.fieldKey === 'actionRequired' && (isOtherSubcat || customFieldValues.actionRequired === 'Other');

                      if (isActionRequiredOther) {
                        const isDisabled = fieldsLoading && field.fieldKey === 'actionRequired';
                        return (
                          <div key={field.id || field.fieldKey} className="cd-form-span-2 cd-responsive-inner-grid">
                            <div>
                              <FormLabel required={Boolean(field.isRequired) || isOtherSubcat}>
                                {field.fieldLabel || 'Action Required'}
                              </FormLabel>
                              {isOtherSubcat ? (
                                <input
                                  type="text"
                                  disabled
                                  value="Other"
                                  style={READONLY_FIELD_STYLE}
                                />
                              ) : (
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
                              )}
                            </div>

                            <div>
                              <FormLabel required>Specify Other Action</FormLabel>
                              <input
                                type="text"
                                required
                                placeholder="Enter custom action..."
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
                          <FormLabel required={Boolean(field.isRequired)}>
                            {field.fieldLabel}
                          </FormLabel>
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
                <FormLabel required>Business Justification</FormLabel>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter business justification..."
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

          {/* Step 2 Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.35rem',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.35rem',
                backgroundColor: 'var(--brand-primary)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span>Next: Review &amp; Submit</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Review & Submit */}
      {!submitSuccess && step === 3 && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
        }}>
          {/* Header Row with Edit details Action */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Review &amp; Submit Change Request
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
                Confirm the details before submitting for approval.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'none',
                border: 'none',
                color: 'var(--brand-primary)',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Edit3 size={14} />
              <span>Edit Details</span>
            </button>
          </div>

          {/* Section 1: Requester Profile */}
          <div style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              1. Requester Profile &amp; Approver
            </div>
            <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Requester</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formData.employeeName || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Email</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formData.employeeEmail || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Employee ID</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formData.employeeId || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Location</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formData.location || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Reporting Manager</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formData.managerName || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Manager Email</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formData.managerEmail || '—'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Change Specifications */}
          <div style={{ borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              2. Change Details &amp; Justification
            </div>
            <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Change Title</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem' }}>{formData.title || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Category</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedCategoryObj?.name || formData.category || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Sub-category</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedSubcategory?.name || formData.subCategory || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Target Start Date</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formData.startDate || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Action Required</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {customFieldValues.actionRequired === 'Other' ? (customFieldValues.otherAction || 'Other') : (customFieldValues.actionRequired || '—')}
                </span>
              </div>

              {/* Dynamic field items summary */}
              {visibleFields.filter(f => f.fieldKey !== 'actionRequired').map(field => {
                const val = customFieldValues[field.fieldKey];
                if (val === undefined || val === null || val === '') return null;
                const displayVal = typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val);
                return (
                  <div key={field.fieldKey}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{field.fieldLabel}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{displayVal}</span>
                  </div>
                );
              })}

              <div style={{ gridColumn: '1 / -1', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Business Justification</span>
                <p style={{ color: 'var(--text-primary)', margin: '0.25rem 0 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{formData.justification || '—'}</p>
              </div>
            </div>
          </div>

          {/* Compliance Checkbox */}
          <div style={{ padding: '1rem 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                id="certify-change"
                type="checkbox"
                required
                checked={certified}
                onChange={e => setCertified(e.target.checked)}
                style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--brand-primary)' }}
              />
              <label htmlFor="certify-change" style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500, cursor: 'pointer', lineHeight: 1.45 }}>
                I confirm that the change information provided is accurate and complies with the IT change management governance policy.
              </label>
            </div>
          </div>

          {/* Submit Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.35rem',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer'
              }}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
            <button
              type="submit"
              disabled={!certified || isSubmitting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.75rem',
                backgroundColor: 'var(--brand-primary)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: (!certified || isSubmitting) ? 'not-allowed' : 'pointer',
                opacity: (!certified || isSubmitting) ? 0.5 : 1
              }}
            >
              <Send size={15} />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Change Request'}</span>
            </button>
          </div>
        </form>
      )}

    </div>
  );
}

export default React.memo(ChangeRequestFormPage);
