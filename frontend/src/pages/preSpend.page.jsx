import React, { useId, useState, useEffect } from 'react';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  IndianRupee,
  CheckCircle2,
  Send,
  Paperclip,
  FileText,
  ExternalLink,
  History,
  Sparkles
} from 'lucide-react';
import {
  PRE_SPEND_CATEGORIES,
  SAMPLE_BUDGET_LINES,
  COMMERCIAL_REASONS,
  EXCEPTION_OPTIONS
} from '../lib/preSpend.config.js';
import { FormLabel } from '../components/ui/primitives.component';
import { apiFetch } from '../lib/apiFetch.lib';

const emptyVendor = () => ({ name: '', amount: '', date: '', file: null, fileName: '' });
const money = value => Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

const ACTIVE_FIELD_STYLE = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  backgroundColor: '#FFFFFF',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  color: 'var(--text-primary)',
  outline: 'none',
  boxSizing: 'border-box'
};

export default function PreSpendPage({ onNavigate, user, initialCostCentre = '', budgetLines = SAMPLE_BUDGET_LINES }) {
  const uid = useId();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const resolvedCostCentre = initialCostCentre || user?.costCenter || user?.department || user?.dept || '';
  const [details, setDetails] = useState({
    buying: '',
    amount: '',
    neededBy: '',
    costCentre: resolvedCostCentre,
    budgetLine: '',
    justification: '',
    urgent: false
  });
  const [vendors, setVendors] = useState([emptyVendor(), emptyVendor(), emptyVendor()]);
  const [commercial, setCommercial] = useState({ exception: 'Not applicable', exceptionReason: '', reason: '', justification: '' });
  const [certified, setCertified] = useState(false);
  const [notice, setNotice] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [createdCode, setCreatedCode] = useState('');
  
  // Past Vendor Look-up State
  const [pastVendor, setPastVendor] = useState(null);
  const [usePastVendor, setUsePastVendor] = useState(false);

  // Fetch previous preferred vendor whenever subcategory changes
  useEffect(() => {
    if (!subcategory) {
      setPastVendor(null);
      setUsePastVendor(false);
      return;
    }
    const fetchPastVendor = async () => {
      try {
        const res = await apiFetch(`/pre-spend/past-vendor?subcategory=${encodeURIComponent(subcategory)}&category=${encodeURIComponent(category)}`);
        if (res.ok) {
          const body = await res.json();
          if (body.data && body.data.vendorName) {
            setPastVendor(body.data);
          } else {
            setPastVendor(null);
            setUsePastVendor(false);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch past vendor for subcategory:', err);
      }
    };
    fetchPastVendor();
  }, [subcategory, category]);

  const changeDetails = (key, value) => {
    setDetails(old => ({ ...old, [key]: value }));
    setCertified(false);
    setNotice('');
  };

  const changeVendor = (index, key, value) => {
    setVendors(old => old.map((vendor, i) => i === index ? { ...vendor, [key]: value } : vendor));
    setCertified(false);
    setNotice('');
  };

  const changeCommercial = (key, value) => {
    setCommercial(old => ({ ...old, [key]: value }));
    setCertified(false);
    setNotice('');
  };

  const selectedCategory = PRE_SPEND_CATEGORIES.find(item => item.name === category);
  const id = key => `${uid}-${key}`;

  const todayStr = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileToBase64 = (file) => {
    return new Promise((resolve) => {
      if (!file || !(file instanceof Blob || file instanceof File)) {
        resolve(typeof file === 'string' ? file : null);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!certified) {
      setNotice('Please confirm the policy certification declaration before submitting.');
      return;
    }
    setIsSubmitting(true);
    setNotice('');
    try {
      const processedVendors = await Promise.all(
        vendors
          .filter(v => v.name || v.amount || v.fileName)
          .map(async (v) => {
            let fileData = v.fileData || null;
            if (v.file instanceof Blob || v.file instanceof File) {
              fileData = await fileToBase64(v.file);
            }
            return {
              name: v.name,
              amount: v.amount,
              date: v.date,
              fileName: v.fileName || (v.file ? v.file.name : ''),
              fileData: fileData
            };
          })
      );

      const payload = {
        category,
        subcategory,
        buying: details.buying,
        amount: details.amount,
        neededBy: details.neededBy,
        costCentre: details.costCentre,
        budgetLine: details.budgetLine,
        justification: details.justification,
        urgent: details.urgent,
        vendors: processedVendors,
        commercial,
        certified
      };
      const res = await apiFetch('/pre-spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit pre-spend request');
      }
      setCreatedCode(data.data?.requestCode || '');
      setSubmitted(true);
    } catch (err) {
      setNotice(err.message || 'Submission error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = ['Spend Category', 'Request Details', 'Vendors & Quotes', 'Review & Submit'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '1040px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Top Header */}
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
          New Pre-Spend Request
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', margin: 0 }}>
          Obtain financial approval before placing an order or committing to a vendor
        </p>
      </div>

      {/* Stepper */}
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
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontSize: '0.825rem',
                fontWeight: isActive || isDone ? 600 : 500,
                color: isActive ? 'var(--brand-primary)' : isDone ? '#059669' : 'var(--text-secondary)',
                whiteSpace: 'nowrap'
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

      {/* Success Banner */}
      {submitted && (
        <div style={{
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={28} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#065F46', margin: 0 }}>
            Pre-Spend Request Submitted Successfully
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#047857', maxWidth: '480px', margin: 0, lineHeight: 1.5 }}>
            Your pre-spend requisition <strong>{createdCode || ''}</strong> for <strong>{details.buying || category}</strong> ({money(details.amount)}) has been created and sent for approval.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setStep(1);
                setCategory('');
                setSubcategory('');
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

      {/* STEP 1: Category */}
      {!submitted && step === 1 && (
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
                1. Select Spend Category
              </h3>
              <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Step 1 of 4
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {PRE_SPEND_CATEGORIES.map(item => {
                const selected = category === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => {
                      setCategory(item.name);
                      setSubcategory('');
                    }}
                    style={{
                      padding: '1.1rem',
                      borderRadius: '10px',
                      textAlign: 'left',
                      border: selected ? '1.5px solid #2563EB' : '1px solid var(--border-color)',
                      backgroundColor: selected ? '#EFF6FF' : 'var(--card-bg)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>{item.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedCategory && (
            <div style={{ paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
              <FormLabel>
                2. Select Subcategory for {selectedCategory.name}
              </FormLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem', marginTop: '0.5rem' }}>
                {selectedCategory.subcategories.map(sub => {
                  const selected = subcategory === sub;
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSubcategory(sub)}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        fontSize: '0.825rem',
                        fontWeight: selected ? 600 : 500,
                        textAlign: 'left',
                        border: selected ? '1px solid #2563EB' : '1px solid var(--border-color)',
                        backgroundColor: selected ? '#2563EB' : 'var(--card-bg)',
                        color: selected ? '#FFFFFF' : 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              disabled={!category || !subcategory}
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
                cursor: (!category || !subcategory) ? 'not-allowed' : 'pointer',
                opacity: (!category || !subcategory) ? 0.5 : 1
              }}
            >
              <span>Next: Request Details</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Request Details */}
      {!submitted && step === 2 && (
        <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Request Details ({category} - {subcategory})
            </h3>
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Step 2 of 4
            </span>
          </div>

          <div className="cd-responsive-form-grid">
            <div style={{ gridColumn: '1 / -1' }}>
              <FormLabel required htmlFor={id('buying')}>What are you buying?</FormLabel>
              <input
                id={id('buying')}
                type="text"
                required
                value={details.buying}
                onChange={e => changeDetails('buying', e.target.value)}
                placeholder="Item / service description, quantity and brief spec"
                style={ACTIVE_FIELD_STYLE}
              />
            </div>

            <div>
              <FormLabel required htmlFor={id('amount')}>Estimated Value (INR)</FormLabel>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                  <IndianRupee size={14} />
                </div>
                <input
                  id={id('amount')}
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={details.amount}
                  onChange={e => changeDetails('amount', e.target.value)}
                  onWheel={e => e.target.blur()}
                  placeholder="0.00"
                  style={{ ...ACTIVE_FIELD_STYLE, paddingLeft: '2rem', fontFamily: 'var(--font-mono)' }}
                />
              </div>
            </div>

            <div>
              <FormLabel required htmlFor={id('neededBy')}>Needed By Date</FormLabel>
              <input
                id={id('neededBy')}
                type="date"
                required
                min={todayStr}
                value={details.neededBy}
                onChange={e => changeDetails('neededBy', e.target.value)}
                style={ACTIVE_FIELD_STYLE}
              />
            </div>

            <div>
              <FormLabel required htmlFor={id('costCentre')}>Cost Centre / Department</FormLabel>
              <input
                id={id('costCentre')}
                type="text"
                required
                value={details.costCentre}
                onChange={e => changeDetails('costCentre', e.target.value)}
                placeholder="e.g. Technology / Corporate"
                style={ACTIVE_FIELD_STYLE}
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <FormLabel required htmlFor={id('budgetLine')}>Budget Line</FormLabel>
              <select
                id={id('budgetLine')}
                required
                value={details.budgetLine}
                onChange={e => changeDetails('budgetLine', e.target.value)}
                style={{
                  ...ACTIVE_FIELD_STYLE,
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}
              >
                <option value="">Select budget line</option>
                {budgetLines.map(line => (
                  <option key={line.value} value={line.value} title={line.label}>{line.label}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <FormLabel required htmlFor={id('justification')}>Business Justification</FormLabel>
              <textarea
                id={id('justification')}
                rows={3}
                required
                value={details.justification}
                onChange={e => changeDetails('justification', e.target.value)}
                placeholder="Why is this purchase required? What is the business impact if delayed?"
                style={{ ...ACTIVE_FIELD_STYLE, resize: 'vertical' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.5rem' }}>
              <input
                id={id('urgent')}
                type="checkbox"
                checked={details.urgent}
                onChange={e => changeDetails('urgent', e.target.checked)}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label htmlFor={id('urgent')} style={{ fontSize: '0.825rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}>
                Mark as urgent requirement
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setStep(1)}
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
              <span>Next: Vendors & Quotes</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Vendors & Quotes */}
      {!submitted && step === 3 && (
        <form onSubmit={(e) => { e.preventDefault(); setStep(4); }} style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem',
          boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Vendors & Quotes
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0.25rem 0 0 0' }}>
              Compare your preferred vendor with available alternatives.
            </p>
          </div>

          {/* Previous Approved Vendor Reference Banner (If available for this Subcategory) */}
          {pastVendor && (
            <div style={{
              backgroundColor: usePastVendor ? '#F0FDF4' : '#F8FAFC',
              border: `1.5px solid ${usePastVendor ? '#10B981' : '#CBD5E1'}`,
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    backgroundColor: usePastVendor ? '#DCFCE7' : '#E2E8F0',
                    color: usePastVendor ? '#15803D' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <History size={15} />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      Previously Selected Vendor for <span style={{ color: '#2563EB' }}>{pastVendor.subcategory || subcategory}</span>
                      <span style={{ fontSize: '0.65rem', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>History</span>
                    </span>
                  </div>
                </div>

                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  backgroundColor: usePastVendor ? '#10B981' : '#FFFFFF',
                  color: usePastVendor ? '#FFFFFF' : '#0F172A',
                  border: `1px solid ${usePastVendor ? '#059669' : '#CBD5E1'}`,
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    checked={usePastVendor}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setUsePastVendor(checked);
                      if (checked) {
                        setVendors([
                          {
                            name: pastVendor.vendorName || '',
                            amount: pastVendor.vendorAmount || details.amount || '',
                            date: pastVendor.quoteDate || todayStr,
                            file: null,
                            fileName: 'Previously Approved Vendor'
                          },
                          emptyVendor(),
                          emptyVendor()
                        ]);
                      }
                    }}
                    style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                  />
                  <span>{usePastVendor ? 'Past Vendor Selected' : 'Select this past vendor'}</span>
                </label>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                backgroundColor: usePastVendor ? '#FFFFFF' : '#F1F5F9',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                fontSize: '0.8rem'
              }}>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Vendor Name</span>
                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.875rem' }}>{pastVendor.vendorName}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Subcategory</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{pastVendor.subcategory || subcategory}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Historical Cost</span>
                  <span style={{ fontWeight: 700, color: '#059669', fontFamily: 'var(--font-mono)' }}>{pastVendor.vendorAmount ? money(pastVendor.vendorAmount) : '—'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>Quote Date</span>
                  <span style={{ fontWeight: 600, color: '#0F172A', fontFamily: 'var(--font-mono)' }}>{pastVendor.quoteDate || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* 2x2 Grid for Vendor Cards and Quote Exception */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1.25rem'
          }}>
            {/* 1. Preferred Vendor */}
            <div style={{
              padding: '1.5rem',
              borderRadius: '14px',
              border: '1.5px solid #10B981',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                  Preferred Vendor
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  backgroundColor: '#E6F4EA',
                  color: '#137333',
                  fontWeight: 700,
                  padding: '0.2rem 0.65rem',
                  borderRadius: '12px'
                }}>
                  Preferred
                </span>
              </div>

              <div>
                <FormLabel required={!usePastVendor} htmlFor="vendor-0-name">Vendor name</FormLabel>
                <input
                  id="vendor-0-name"
                  type="text"
                  required={!usePastVendor && (!commercial.exception || commercial.exception === 'Not applicable')}
                  value={vendors[0]?.name || ''}
                  onChange={e => changeVendor(0, 'name', e.target.value)}
                  placeholder="Search or enter vendor"
                  style={ACTIVE_FIELD_STYLE}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <FormLabel required={!usePastVendor} htmlFor="vendor-0-amount">Quoted amount (₹)</FormLabel>
                  <input
                    id="vendor-0-amount"
                    type="number"
                    step="any"
                    required={!usePastVendor && (!commercial.exception || commercial.exception === 'Not applicable')}
                    value={vendors[0]?.amount || ''}
                    onChange={e => changeVendor(0, 'amount', e.target.value)}
                    onWheel={e => e.target.blur()}
                    placeholder="0"
                    style={ACTIVE_FIELD_STYLE}
                  />
                </div>
                <div>
                  <FormLabel required={!usePastVendor} htmlFor="vendor-0-date">Quote date</FormLabel>
                  <input
                    id="vendor-0-date"
                    type="date"
                    required={!usePastVendor && (!commercial.exception || commercial.exception === 'Not applicable')}
                    value={vendors[0]?.date || ''}
                    onChange={e => changeVendor(0, 'date', e.target.value)}
                    style={ACTIVE_FIELD_STYLE}
                  />
                </div>
              </div>

              <div>
                <FormLabel required={!usePastVendor} htmlFor="vendor-0-file">Upload quotation</FormLabel>
                <input
                  id="vendor-0-file"
                  type="file"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      changeVendor(0, 'file', f);
                      changeVendor(0, 'fileName', f.name);
                    }
                  }}
                />
                <label
                  htmlFor="vendor-0-file"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '42px',
                    border: '1px dashed #94A3B8',
                    borderRadius: '8px',
                    backgroundColor: '#F8FAFC',
                    color: vendors[0]?.fileName ? '#0F172A' : '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'center',
                    padding: '0 1rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {vendors[0]?.fileName ? vendors[0].fileName : 'Choose PDF, image or email quotation'}
                </label>
              </div>
            </div>

            {/* 2. Alternative Vendor 1 */}
            <div style={{
              padding: '1.5rem',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                  Alternative Vendor 1
                </span>
              </div>

              <div>
                <FormLabel htmlFor="vendor-1-name">Vendor name</FormLabel>
                <input
                  id="vendor-1-name"
                  type="text"
                  value={vendors[1]?.name || ''}
                  onChange={e => changeVendor(1, 'name', e.target.value)}
                  placeholder="Enter vendor"
                  style={ACTIVE_FIELD_STYLE}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <FormLabel htmlFor="vendor-1-amount">Quoted amount (₹)</FormLabel>
                  <input
                    id="vendor-1-amount"
                    type="number"
                    step="any"
                    value={vendors[1]?.amount || ''}
                    onChange={e => changeVendor(1, 'amount', e.target.value)}
                    onWheel={e => e.target.blur()}
                    placeholder="0"
                    style={ACTIVE_FIELD_STYLE}
                  />
                </div>
                <div>
                  <FormLabel htmlFor="vendor-1-date">Quote date</FormLabel>
                  <input
                    id="vendor-1-date"
                    type="date"
                    value={vendors[1]?.date || ''}
                    onChange={e => changeVendor(1, 'date', e.target.value)}
                    style={ACTIVE_FIELD_STYLE}
                  />
                </div>
              </div>

              <div>
                <FormLabel htmlFor="vendor-1-file">Upload quotation</FormLabel>
                <input
                  id="vendor-1-file"
                  type="file"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      changeVendor(1, 'file', f);
                      changeVendor(1, 'fileName', f.name);
                    }
                  }}
                />
                <label
                  htmlFor="vendor-1-file"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '42px',
                    border: '1px dashed #CBD5E1',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    color: vendors[1]?.fileName ? '#0F172A' : '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'center',
                    padding: '0 1rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {vendors[1]?.fileName ? vendors[1].fileName : 'Choose quotation file'}
                </label>
              </div>
            </div>

            {/* 3. Alternative Vendor 2 */}
            <div style={{
              padding: '1.5rem',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                  Alternative Vendor 2
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>
                  Optional
                </span>
              </div>

              <div>
                <FormLabel htmlFor="vendor-2-name">Vendor name</FormLabel>
                <input
                  id="vendor-2-name"
                  type="text"
                  value={vendors[2]?.name || ''}
                  onChange={e => changeVendor(2, 'name', e.target.value)}
                  placeholder="Enter vendor"
                  style={ACTIVE_FIELD_STYLE}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <FormLabel htmlFor="vendor-2-amount">Quoted amount (₹)</FormLabel>
                  <input
                    id="vendor-2-amount"
                    type="number"
                    step="any"
                    value={vendors[2]?.amount || ''}
                    onChange={e => changeVendor(2, 'amount', e.target.value)}
                    onWheel={e => e.target.blur()}
                    placeholder="0"
                    style={ACTIVE_FIELD_STYLE}
                  />
                </div>
                <div>
                  <FormLabel htmlFor="vendor-2-date">Quote date</FormLabel>
                  <input
                    id="vendor-2-date"
                    type="date"
                    value={vendors[2]?.date || ''}
                    onChange={e => changeVendor(2, 'date', e.target.value)}
                    style={ACTIVE_FIELD_STYLE}
                  />
                </div>
              </div>

              <div>
                <FormLabel htmlFor="vendor-2-file">Upload quotation</FormLabel>
                <input
                  id="vendor-2-file"
                  type="file"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      changeVendor(2, 'file', f);
                      changeVendor(2, 'fileName', f.name);
                    }
                  }}
                />
                <label
                  htmlFor="vendor-2-file"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '42px',
                    border: '1px dashed #CBD5E1',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    color: vendors[2]?.fileName ? '#0F172A' : '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'center',
                    padding: '0 1rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {vendors[2]?.fileName ? vendors[2].fileName : 'Choose quotation file'}
                </label>
              </div>
            </div>

            {/* 4. Quote Exception Card */}
            <div style={{
              padding: '1.5rem',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                  Quote Exception
                </span>
              </div>

              <div>
                <FormLabel htmlFor="commercial-exception">If alternative quotes are unavailable</FormLabel>
                <select
                  id="commercial-exception"
                  value={commercial.exception}
                  onChange={e => changeCommercial('exception', e.target.value)}
                  style={ACTIVE_FIELD_STYLE}
                >
                  {EXCEPTION_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <FormLabel htmlFor="exception-justification">Exception justification</FormLabel>
                <textarea
                  id="exception-justification"
                  rows={3}
                  value={commercial.exceptionReason}
                  onChange={e => changeCommercial('exceptionReason', e.target.value)}
                  placeholder="Explain why comparison quotes are not available"
                  style={{ ...ACTIVE_FIELD_STYLE, flex: 1, minHeight: '74px', resize: 'vertical' }}
                />
              </div>
            </div>
          </div>

          {/* Selection Reason and Commercial Justification Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <FormLabel required htmlFor="commercial-reason">Why have you selected this vendor?</FormLabel>
              <select
                id="commercial-reason"
                required
                value={commercial.reason}
                onChange={e => changeCommercial('reason', e.target.value)}
                style={ACTIVE_FIELD_STYLE}
              >
                <option value="">Select primary reason</option>
                {COMMERCIAL_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <FormLabel required htmlFor="vendor-selection-justification">Vendor selection justification</FormLabel>
              <textarea
                id="vendor-selection-justification"
                rows={3}
                required
                value={commercial.justification}
                onChange={e => changeCommercial('justification', e.target.value)}
                placeholder="Explain the commercial and operational reason for selecting this vendor"
                style={{ ...ACTIVE_FIELD_STYLE, resize: 'vertical', minHeight: '80px' }}
              />
            </div>
          </div>

          {/* Navigation Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
            <button
              type="button"
              onClick={() => setStep(2)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.35rem',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span>Back</span>
            </button>
            <button
              type="submit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.6rem',
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span>Review Request</span>
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: Review & Submit */}
      {!submitted && step === 4 && (
        <form onSubmit={handleSubmit} style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem',
          boxShadow: '0 1px 3px rgba(16, 21, 30, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Review Pre-Spend Request
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0.25rem 0 0 0' }}>
                Verify all spend information, vendor quotes, and attachments before submitting for approval
              </p>
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', backgroundColor: '#F1F5F9', padding: '0.3rem 0.65rem', borderRadius: '6px' }}>
              Step 4 of 4
            </span>
          </div>

          {/* Section 1: Request Details */}
          <div style={{ borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1.25rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
              1. Request & Budget Details
            </div>
            <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Category / Subcategory</span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{category} — {subcategory}</span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Estimated Value</span>
                <span style={{ color: '#2563EB', fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>{money(details.amount)}</span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Request Date</span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Needed By Date</span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{details.neededBy || '—'}</span>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Cost Centre</span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{details.costCentre || '—'}</span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Budget Line</span>
                <span style={{ color: '#0F172A', fontWeight: 600 }}>{budgetLines.find(b => b.value === details.budgetLine)?.label || details.budgetLine || '—'}</span>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>What are you buying? (Scope & Spec)</span>
                <p style={{ color: '#0F172A', margin: '0.25rem 0 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{details.buying}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Business Justification</span>
                <p style={{ color: '#334155', margin: '0.25rem 0 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{details.justification}</p>
              </div>
              {details.urgent && (
                <div style={{ gridColumn: '1 / -1', padding: '0.75rem 1rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px' }}>
                  <span style={{ color: '#DC2626', fontWeight: 700, display: 'block', fontSize: '0.8rem' }}>URGENT REQUIREMENT</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Vendors & Quotations Comparison */}
          <div style={{ borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1.25rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
              2. Vendor Quotations & Comparison
            </div>
            <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {vendors.filter(v => v.name?.trim() || v.amount || v.fileName).map((v, i) => (
                <div key={i} style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  border: i === 0 ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                  backgroundColor: i === 0 ? '#F0FDF4' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }}>
                      {i === 0 ? 'Preferred Vendor' : `Alternative Vendor ${i}`}
                    </span>
                    {i === 0 && (
                      <span style={{
                        fontSize: '0.7rem',
                        backgroundColor: usePastVendor ? '#EFF6FF' : '#E6F4EA',
                        color: usePastVendor ? '#1D4ED8' : '#137333',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '10px'
                      }}>
                        {usePastVendor ? '✓ Past Selected Vendor' : 'Selected'}
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.825rem' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Vendor Name</span>
                    <strong style={{ color: '#0F172A' }}>{v.name || '—'}</strong>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.825rem' }}>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Quoted Amount</span>
                      <strong style={{ color: '#0F172A', fontFamily: 'var(--font-mono)' }}>{v.amount ? money(v.amount) : '₹0'}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem' }}>Quote Date</span>
                      <strong style={{ color: '#0F172A' }}>{v.date || '—'}</strong>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.825rem', paddingTop: '0.35rem', borderTop: '1px dashed #CBD5E1' }}>
                    <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Attached Quotation</span>
                    {v.file || v.fileName ? (
                      <button
                        type="button"
                        title="Click to preview attached quotation file"
                        onClick={(e) => {
                          e.preventDefault();
                          if (v.file instanceof Blob || v.file instanceof File) {
                            const fileUrl = URL.createObjectURL(v.file);
                            window.open(fileUrl, '_blank');
                          } else if (typeof v.file === 'string' && v.file.startsWith('http')) {
                            window.open(v.file, '_blank');
                          } else {
                            alert(`Quotation file: ${v.fileName || 'Document attached'}`);
                          }
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                          padding: '0.35rem 0.65rem',
                          backgroundColor: '#EFF6FF',
                          color: '#1D4ED8',
                          border: '1px solid #BFDBFE',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <FileText size={14} />
                        <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v.fileName || 'View Quotation'}
                        </span>
                        <ExternalLink size={12} style={{ opacity: 0.7 }} />
                      </button>
                    ) : (
                      <span style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: '0.8rem' }}>No quotation file uploaded</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Commercial Evaluation & Justification */}
          <div style={{ borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1.25rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>
              3. Commercial Evaluation & Justification
            </div>
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Reason for Vendor Selection</span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>{commercial.reason || '—'}</span>
                </div>
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Quote Exception Rule</span>
                  <span style={{ color: '#0F172A', fontWeight: 600 }}>{commercial.exception || 'Not applicable'}</span>
                </div>
              </div>

              {commercial.exception && commercial.exception !== 'Not applicable' && commercial.exceptionReason && (
                <div>
                  <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Exception Justification</span>
                  <p style={{ color: '#334155', margin: '0.2rem 0 0 0', lineHeight: 1.5 }}>{commercial.exceptionReason}</p>
                </div>
              )}

              <div>
                <span style={{ color: '#64748B', display: 'block', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Vendor Selection Justification</span>
                <p style={{ color: '#334155', margin: '0.2rem 0 0 0', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{commercial.justification || '—'}</p>
              </div>
            </div>
          </div>

          {/* Section 4: Confirmation Checkbox */}
          <div style={{ padding: '1rem 0', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                id="certify"
                type="checkbox"
                required
                checked={certified}
                onChange={e => {
                  setCertified(e.target.checked);
                  setNotice('');
                }}
                style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: '#2563EB' }}
              />
              <label htmlFor="certify" style={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: 500, cursor: 'pointer', lineHeight: 1.45 }}>
                I confirm that no order, payment or vendor commitment has been made and the information provided is correct.
              </label>
            </div>
            {notice && <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#DC2626', paddingLeft: '2.1rem' }}>{notice}</div>}
          </div>

          {/* Navigation & Submit Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setStep(3)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1.35rem',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer'
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
                backgroundColor: '#0F172A',
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
              <span>{isSubmitting ? 'Submitting...' : 'Submit Pre-Spend Request'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
