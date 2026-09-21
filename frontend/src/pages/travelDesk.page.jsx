import React, { useId, useState } from 'react';
import {
  Plane,
  Car,
  Bus,
  Train,
  Building2,
  Check,
  ArrowLeft,
  ArrowRight,
  Send,
  CheckCircle2,
  Luggage
} from 'lucide-react';
import { TRAVEL_MODES, TRAVEL_DESK_FIELDS } from '../lib/travelDesk.config.js';
import { FormLabel } from '../components/ui/primitives.component';

const ICON_MAP = {
  Flight: Plane,
  Cab: Car,
  Bus: Bus,
  Train: Train,
  Hotel: Building2
};

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

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
  return dateStr;
};

export default function TravelDeskPage({ onNavigate, user, travellerName = '', department = '' }) {
  const uid = useId();
  const [category, setCategory] = useState('');
  const [step, setStep] = useState(1);
  const [drafts, setDrafts] = useState({});
  const [certified, setCertified] = useState(false);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const values = drafts[category] || {};
  const effectiveTraveller = travellerName || user?.name || '';
  const effectiveDept = department || user?.department || user?.dept || '';

  const valueOf = field => values[field.name] ?? (field.name === 'Traveller' ? effectiveTraveller : field.name === 'Department / Cost Centre' && effectiveDept ? effectiveDept : field.default);

  const update = (field, value) => {
    setDrafts(previous => ({
      ...previous,
      [category]: { ...previous[category], [field.name]: value }
    }));
    setCertified(false);
    setMessage('');
  };

  const visibleFields = (TRAVEL_DESK_FIELDS[category] || []).filter(field =>
    (!field.conditional || values[field.conditional] === 'Yes') &&
    (!field.group || (values['Trip type'] || 'Return') !== 'One-way')
  );

  const todayStr = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const requiresBoardApproval = () => {
    const travelDateStr = values['Date of travel'] || values['Date of journey'] || values['Check-in date'];
    if (!travelDateStr) return false;

    const parts = travelDateStr.split('-');
    if (parts.length !== 3) return false;
    const travelDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    if (isNaN(travelDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    travelDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((travelDate - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays < 7;
  };

  const isShortNotice = requiresBoardApproval();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!certified) {
      setMessage('Please confirm compliance with company travel policies.');
      return;
    }
    setSubmitted(true);
  };

  const stepsList = ['Travel Mode', 'Travel Details', 'Review & Submit'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '1040px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Top Header */}
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
          Travel &amp; Stay Desk
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', margin: 0 }}>
          Book corporate flights, trains, cabs, buses, and hotel accommodations
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
            Travel Request Recorded (Preview)
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#047857', maxWidth: '480px', margin: 0, lineHeight: 1.5 }}>
            Your <strong>{category}</strong> reservation request for <strong>{valueOf({ name: 'Traveller' })}</strong> has been staged. Full backend fulfillment will be enabled when travel APIs are connected.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setStep(1);
                setCategory('');
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
              Book Another Trip
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

      {/* STEP 1: Select Travel Category */}
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
                1. Select Booking Type
              </h3>
              <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Step 1 of 3
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              {TRAVEL_MODES.map(mode => {
                const IconComponent = ICON_MAP[mode.id] || Luggage;
                const selected = category === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setCategory(mode.id)}
                    style={{
                      padding: '1.25rem',
                      borderRadius: '10px',
                      textAlign: 'left',
                      border: selected ? '1.5px solid #2563EB' : '1px solid var(--border-color)',
                      backgroundColor: selected ? '#EFF6FF' : 'var(--card-bg)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div
                      style={{
                        padding: '0.65rem',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected ? '#2563EB' : 'var(--input-bg)',
                        color: selected ? '#FFFFFF' : 'var(--text-primary)',
                        flexShrink: 0
                      }}
                    >
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{mode.label}</div>
                      <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: 1.4 }}>{mode.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              disabled={!category}
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
                cursor: !category ? 'not-allowed' : 'pointer',
                opacity: !category ? 0.5 : 1
              }}
            >
              <span>Next: Travel Details</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Travel Details Form */}
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
              {category} Reservation Details
            </h3>
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Step 2 of 3
            </span>
          </div>

          <div className="cd-responsive-form-grid">
            {visibleFields.map(field => {
              const fieldId = `${uid}-${category}-${field.name}`;
              let minVal = field.min;
              if (field.type === 'date') {
                if (field.name === 'Return / onward date' || field.name === 'Return date' || field.name === 'Check-out date') {
                  minVal = values['Date of travel'] || values['Date of journey'] || values['Check-in date'] || todayStr;
                } else {
                  minVal = field.min || todayStr;
                }
              }

              return (
                <div key={field.name} style={{ gridColumn: field.full ? '1 / -1' : undefined }}>
                  <FormLabel required={field.required} htmlFor={fieldId}>
                    {field.label}
                  </FormLabel>

                  {field.type === 'select' ? (
                    <select
                      id={fieldId}
                      required={field.required}
                      value={valueOf(field)}
                      onChange={e => update(field, e.target.value)}
                      style={ACTIVE_FIELD_STYLE}
                    >
                      {(field.options || []).map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      id={fieldId}
                      rows={3}
                      required={field.required}
                      value={valueOf(field)}
                      onChange={e => update(field, e.target.value)}
                      placeholder={field.placeholder}
                      style={{ ...ACTIVE_FIELD_STYLE, resize: 'vertical' }}
                    />
                  ) : (
                    <input
                      id={fieldId}
                      type={field.type === 'input' ? 'text' : field.type}
                      min={minVal}
                      required={field.required}
                      value={valueOf(field)}
                      onChange={e => update(field, e.target.value)}
                      placeholder={field.placeholder}
                      style={ACTIVE_FIELD_STYLE}
                    />
                  )}
                </div>
              );
            })}

            {isShortNotice && (
              <div
                role="alert"
                style={{
                  gridColumn: '1 / -1',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  backgroundColor: '#FEFCE8',
                  border: '1px solid #FDE047',
                  borderLeft: '5px solid #CA8A04'
                }}
              >
                <div style={{ color: '#854D0E', flexShrink: 0, marginTop: '2px', fontSize: '1rem' }}>
                  ⚠️
                </div>
                <div>
                  <div style={{ color: '#854D0E', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3 }}>
                    Board approval will be required
                  </div>
                  <p style={{ color: '#713F12', fontSize: '0.8rem', marginTop: '0.2rem', lineHeight: 1.45, margin: 0 }}>
                    This travel date is less than 7 days from today. The request will be routed for additional Board approval.
                  </p>
                </div>
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
              <span>Next: Review &amp; Submit</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Review & Submit */}
      {!submitted && step === 3 && (
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Review &amp; Submit
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
                Confirm the details before submitting.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
                borderRadius: '6px'
              }}
            >
              Edit details
            </button>
          </div>

          {isShortNotice && (
            <div
              role="alert"
              style={{
                borderRadius: '10px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                backgroundColor: '#FEFCE8',
                border: '1px solid #FDE047',
                borderLeft: '5px solid #CA8A04'
              }}
            >
              <div style={{ color: '#854D0E', flexShrink: 0, marginTop: '2px', fontSize: '1rem' }}>
                ⚠️
              </div>
              <div>
                <div style={{ color: '#854D0E', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3 }}>
                  Board approval will be required
                </div>
                <p style={{ color: '#713F12', fontSize: '0.8rem', marginTop: '0.2rem', lineHeight: 1.45, margin: 0 }}>
                  This travel date is less than 7 days from today. The request will be routed for additional Board approval.
                </p>
              </div>
            </div>
          )}

          {/* Travel Request Summary Card */}
          <div style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Travel request summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* Category */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', alignItems: 'baseline', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Category</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700 }}>{category}</span>
              </div>

              {/* Traveller */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', alignItems: 'baseline', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Traveller</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  {valueOf({ name: 'Traveller' }) || effectiveTraveller || '—'}
                </span>
              </div>

              {/* Department */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', alignItems: 'baseline', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Department / Cost Centre</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                  {valueOf({ name: 'Department / Cost Centre' }) || effectiveDept || '—'}
                </span>
              </div>

              {/* Dynamic Visible Fields */}
              {visibleFields
                .filter(f => f.name !== 'Traveller' && f.name !== 'Department / Cost Centre')
                .map(field => {
                  const val = valueOf(field);
                  if (val === undefined || val === null || val === '') return null;
                  const displayVal = field.type === 'date' ? formatDateDisplay(val) : String(val);

                  return (
                    <div key={field.name} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', alignItems: 'baseline', gap: '1rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {field.name || field.label}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, wordBreak: 'break-word' }}>
                        {displayVal}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Policy Compliance Checkbox */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <input
                id="certify-travel"
                type="checkbox"
                required
                checked={certified}
                onChange={e => {
                  setCertified(e.target.checked);
                  setMessage('');
                }}
                style={{ marginTop: '0.2rem', cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <label htmlFor="certify-travel" style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500, cursor: 'pointer', lineHeight: 1.45 }}>
                I confirm that the information is correct and no booking or financial commitment has been made for this request.
              </label>
            </div>
            {message && <div style={{ fontSize: '0.775rem', fontWeight: 600, color: '#DC2626', paddingLeft: '1.75rem' }}>{message}</div>}
          </div>

          {/* Bottom Actions */}
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
              <span>Submit Travel Booking Request</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
