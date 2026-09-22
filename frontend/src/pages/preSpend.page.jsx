import React, { useId, useState } from 'react';
import {
  Check,
  ArrowLeft,
  ArrowRight,
  IndianRupee,
  CheckCircle2,
  Send
} from 'lucide-react';
import {
  PRE_SPEND_CATEGORIES,
  SAMPLE_BUDGET_LINES,
  COMMERCIAL_REASONS,
  EXCEPTION_OPTIONS
} from '../lib/preSpend.config.js';
import { FormLabel } from '../components/ui/primitives.component';
import { apiFetch } from '../lib/apiFetch.lib';

const emptyVendor = () => ({ name: '', amount: '', date: '', file: null });
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
    urgent: false,
    urgentReason: ''
  });
  const [vendors, setVendors] = useState([emptyVendor(), emptyVendor(), emptyVendor()]);
  const [commercial, setCommercial] = useState({ exception: '', exceptionReason: '', reason: '', justification: '' });
  const [certified, setCertified] = useState(false);
  const [notice, setNotice] = useState('');
  const [submitted, setSubmitted] = useState(false);

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
  const [createdCode, setCreatedCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!certified) {
      setNotice('Please confirm the policy certification declaration before submitting.');
      return;
    }
    setIsSubmitting(true);
    setNotice('');
    try {
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
        urgentReason: details.urgentReason,
        vendors: vendors.filter(v => v.name || v.amount),
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

            <div>
              <FormLabel required htmlFor={id('budgetLine')}>Budget Line</FormLabel>
              <select
                id={id('budgetLine')}
                required
                value={details.budgetLine}
                onChange={e => changeDetails('budgetLine', e.target.value)}
                style={ACTIVE_FIELD_STYLE}
              >
                <option value="">Select budget line</option>
                {budgetLines.map(line => (
                  <option key={line.value} value={line.value}>{line.label}</option>
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

            {details.urgent && (
              <div style={{ gridColumn: '1 / -1' }}>
                <FormLabel required htmlFor={id('urgentReason')} style={{ color: '#DC2626' }}>Urgency Reason</FormLabel>
                <input
                  id={id('urgentReason')}
                  type="text"
                  required={details.urgent}
                  value={details.urgentReason}
                  onChange={e => changeDetails('urgentReason', e.target.value)}
                  placeholder="Explain why expedited approval is necessary"
                  style={{ ...ACTIVE_FIELD_STYLE, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }}
                />
              </div>
            )}
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
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Vendor Quotes (3-Way Comparison)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Enter details for competing vendors or select a commercial exception below
              </p>
            </div>
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Step 3 of 4
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {vendors.map((vendor, idx) => (
              <div key={idx} style={{
                padding: '1.25rem',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--input-bg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Vendor {idx + 1} {idx === 0 ? '(Recommended)' : '(Comparison)'}
                  </span>
                  {idx === 0 && (
                    <span style={{ fontSize: '0.7rem', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      Primary
                    </span>
                  )}
                </div>

                <div>
                  <FormLabel htmlFor={`vendor-name-${idx}`}>Vendor Name</FormLabel>
                  <input
                    id={`vendor-name-${idx}`}
                    type="text"
                    required={idx === 0 && !commercial.exception}
                    value={vendor.name}
                    onChange={e => changeVendor(idx, 'name', e.target.value)}
                    placeholder="Company name"
                    style={ACTIVE_FIELD_STYLE}
                  />
                </div>

                <div>
                  <FormLabel htmlFor={`vendor-amount-${idx}`}>Quotation Amount (INR)</FormLabel>
                  <input
                    id={`vendor-amount-${idx}`}
                    type="number"
                    step="0.01"
                    required={idx === 0 && !commercial.exception}
                    value={vendor.amount}
                    onChange={e => changeVendor(idx, 'amount', e.target.value)}
                    placeholder="0.00"
                    style={{ ...ACTIVE_FIELD_STYLE, fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <FormLabel htmlFor={`vendor-date-${idx}`}>Quote Date</FormLabel>
                  <input
                    id={`vendor-date-${idx}`}
                    type="date"
                    value={vendor.date}
                    onChange={e => changeVendor(idx, 'date', e.target.value)}
                    style={ACTIVE_FIELD_STYLE}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Commercial Exception Section */}
          <div style={{ paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="cd-responsive-form-grid">
              <div>
                <FormLabel htmlFor="commercial-exception">Commercial Exception (Optional)</FormLabel>
                <select
                  id="commercial-exception"
                  value={commercial.exception}
                  onChange={e => changeCommercial('exception', e.target.value)}
                  style={ACTIVE_FIELD_STYLE}
                >
                  <option value="">None (Standard 3 quotes provided)</option>
                  {EXCEPTION_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <FormLabel htmlFor="commercial-reason">Reason for Selection</FormLabel>
                <select
                  id="commercial-reason"
                  value={commercial.reason}
                  onChange={e => changeCommercial('reason', e.target.value)}
                  style={ACTIVE_FIELD_STYLE}
                >
                  <option value="">Select reason</option>
                  {COMMERCIAL_REASONS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {commercial.exception && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <FormLabel required htmlFor="exception-justification" style={{ color: '#B45309' }}>
                    Exception Justification
                  </FormLabel>
                  <textarea
                    id="exception-justification"
                    rows={2}
                    required={Boolean(commercial.exception)}
                    value={commercial.exceptionReason}
                    onChange={e => changeCommercial('exceptionReason', e.target.value)}
                    placeholder="Explain why competitive quotes could not be obtained"
                    style={{ ...ACTIVE_FIELD_STYLE, borderColor: '#FDE68A', backgroundColor: '#FFFBEB', resize: 'vertical' }}
                  />
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setStep(2)}
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
              <span>Next: Review & Submit</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: Review & Submit */}
      {!submitted && step === 4 && (
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Review Pre-Spend Request
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Verify all spend information before submitting for management approval
              </p>
            </div>
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Step 4 of 4
            </span>
          </div>

          {/* Details Table */}
          <div style={{ borderRadius: '10px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div style={{ padding: '0.65rem 1rem', backgroundColor: 'var(--input-bg)', borderBottom: '1px solid var(--border-color)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Request Details Summary
            </div>
            <div className="cd-responsive-form-grid" style={{ padding: '1rem', gap: '0.75rem', fontSize: '0.825rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Category:</span> <strong style={{ color: 'var(--text-primary)' }}>{category}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Subcategory:</span> <strong style={{ color: 'var(--text-primary)' }}>{subcategory}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Item:</span> <strong style={{ color: 'var(--text-primary)' }}>{details.buying}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Estimated Value:</span> <strong style={{ color: '#2563EB', fontFamily: 'var(--font-mono)' }}>{money(details.amount)}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Needed By:</span> <strong style={{ color: 'var(--text-primary)' }}>{details.neededBy}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Cost Centre:</span> <strong style={{ color: 'var(--text-primary)' }}>{details.costCentre}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Urgent:</span> <strong style={{ color: details.urgent ? '#DC2626' : 'var(--text-primary)' }}>{details.urgent ? `Yes (${details.urgentReason})` : 'No'}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-secondary)' }}>Selected Vendor:</span> <strong style={{ color: 'var(--text-primary)' }}>{vendors[0]?.name || 'N/A'}</strong></div>
            </div>
          </div>

          {/* Justification Box */}
          <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--input-bg)', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.825rem' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Business Justification</div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{details.justification}</p>
          </div>

          {/* Policy Certification Checkbox */}
          <div style={{ padding: '1rem 1.25rem', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <input
                id="certify"
                type="checkbox"
                required
                checked={certified}
                onChange={e => {
                  setCertified(e.target.checked);
                  setNotice('');
                }}
                style={{ marginTop: '0.2rem', cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label htmlFor="certify" style={{ fontSize: '0.825rem', color: '#1E3A8A', fontWeight: 500, cursor: 'pointer', lineHeight: 1.45 }}>
                I hereby declare that this spend is necessary for authorized business purposes, complies with company procurement thresholds, and quotations provided are authentic.
              </label>
            </div>
            {notice && <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#DC2626', paddingLeft: '1.75rem' }}>{notice}</div>}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setStep(3)}
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
              disabled={!certified}
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
                cursor: !certified ? 'not-allowed' : 'pointer',
                opacity: !certified ? 0.5 : 1
              }}
            >
              <Send size={14} />
              <span>Submit Pre-Spend Request</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
