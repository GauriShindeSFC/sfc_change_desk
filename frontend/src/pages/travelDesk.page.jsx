import React, { useId, useState, useEffect, useRef } from 'react';
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
  Luggage,
  ChevronDown,
  Search,
  AlertTriangle
} from 'lucide-react';
import { TRAVEL_MODES, TRAVEL_DESK_FIELDS } from '../lib/travelDesk.config.js';
import { FormLabel } from '../components/ui/primitives.component';
import { apiFetch } from '../lib/apiFetch.lib';

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

const READONLY_FIELD_STYLE = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  backgroundColor: 'var(--input-bg, #F8FAFC)',
  border: '1px solid var(--border-color, #E2E8F0)',
  borderRadius: '8px',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  color: 'var(--text-secondary, #64748B)',
  cursor: 'not-allowed',
  boxSizing: 'border-box'
};

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
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [step, setStepState] = useState(1);
  const [drafts, setDrafts] = useState({});
  const [certified, setCertified] = useState(false);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Synchronize internal steps with browser history for touchpad / back gesture support
  const setStep = (nextStep, replace = false) => {
    setStepState(nextStep);
    if (typeof window !== 'undefined') {
      const stateObj = { travelStep: nextStep, travelCategory: category };
      if (replace) {
        window.history.replaceState(stateObj, '');
      } else {
        window.history.pushState(stateObj, '');
      }
    }
  };

  useEffect(() => {
    // Initialize history state on mount
    if (typeof window !== 'undefined') {
      window.history.replaceState({ travelStep: 1, travelCategory: '' }, '');
    }

    const handlePopState = (event) => {
      if (event.state && typeof event.state.travelStep === 'number') {
        setStepState(event.state.travelStep);
        if (event.state.travelCategory !== undefined) {
          setCategory(event.state.travelCategory);
        }
      } else {
        setStepState(1);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [currentSessionUser, setCurrentSessionUser] = useState(() => user || JSON.parse(localStorage.getItem('sfc_user') || '{}'));
  const activeSessionUser = currentSessionUser || user || JSON.parse(localStorage.getItem('sfc_user') || '{}');

  const [requesterDetails, setRequesterDetails] = useState(() => ({
    employeeName: travellerName || activeSessionUser?.employee?.name || activeSessionUser?.name || '',
    employeeEmail: activeSessionUser?.employee?.email || activeSessionUser?.email || '',
    employeeId: resolveEmpBusinessId(activeSessionUser),
    location: resolveEmpLocation(activeSessionUser) || '',
    managerName: '',
    managerEmail: ''
  }));

  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);
  const [managerSearchTerm, setManagerSearchTerm] = useState('');
  const managerDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (managerDropdownRef.current && !managerDropdownRef.current.contains(e.target)) {
        setManagerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await apiFetch('/users');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.data)) {
            const list = data.data.map(u => ({
              id: u.id,
              name: u.name || u.employee?.name || (u.email ? u.email.split('@')[0] : 'User'),
              email: u.email || u.employee?.email || '',
              department: u.department || u.employee?.department || '',
              location: u.location || u.employee?.location || ''
            })).filter(u => u.name && u.email);
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

  useEffect(() => {
    const currentUser = user || JSON.parse(localStorage.getItem('sfc_user') || '{}');
    if (currentUser) {
      setCurrentSessionUser(currentUser);
      setRequesterDetails(prev => ({
        ...prev,
        employeeName: prev.employeeName || currentUser.employee?.name || currentUser.name || '',
        employeeEmail: prev.employeeEmail || currentUser.employee?.email || currentUser.email || '',
        employeeId: resolveEmpBusinessId(currentUser, prev.employeeId),
        location: resolveEmpLocation(currentUser, prev.location)
      }));
    }
  }, [user]);

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

  const visibleFields = (TRAVEL_DESK_FIELDS[category] || []).filter(field => {
    if (field.conditional) {
      const expectedVal = field.conditionalValue || 'Yes';
      if (values[field.conditional] !== expectedVal) return false;
    }
    if (field.group && (values['Trip type'] || 'Return') === 'One-way') {
      return false;
    }
    return true;
  });

  const todayStr = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const isFlight = category?.toLowerCase() === 'flight' || category?.toLowerCase() === 'flights';
  const isCab = category?.toLowerCase() === 'cab' || category?.toLowerCase() === 'cabs';

  const checkBoardApprovalRequired = () => {
    // 1. Flight Board Approval Rules: Premium Economy / Business OR < 7 days notice
    if (isFlight) {
      const travelClass = String(values['Travel class'] || 'Economy').toLowerCase();
      if (travelClass.includes('premium') || travelClass.includes('business')) {
        return {
          required: true,
          reason: `${values['Travel class'] || 'Premium/Business'} class flight booking selected. The request will be routed for additional Board approval.`
        };
      }

      const travelDateStr = values['Date of travel'] || values['Date of journey'] || values['Check-in date'];
      if (!travelDateStr) return { required: false, reason: '' };

      const parts = travelDateStr.split('-');
      if (parts.length !== 3) return { required: false, reason: '' };
      const travelDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (isNaN(travelDate.getTime())) return { required: false, reason: '' };

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      travelDate.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((travelDate - today) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        return {
          required: true,
          reason: 'This travel date is less than 7 days from today. The request will be routed for additional Board approval.'
        };
      }
    }

    // 2. Cab Board Approval Rules
    if (isCab) {
      const passengers = parseInt(values['Number of passengers'] || '1', 10) || 1;
      const cabTypeStr = String(values['Cab type'] || 'Hatchback').toLowerCase();

      // Rule 2: Premium (Innova, etc.) always requires board approval
      if (cabTypeStr.includes('premium') || cabTypeStr.includes('innova')) {
        return {
          required: true,
          reason: 'Premium cab booking selected. The request will be routed for additional Board approval.'
        };
      }

      // Rule 1: SUV with < 3 passengers requires board approval
      if (cabTypeStr.includes('suv') || cabTypeStr.includes('ertiga')) {
        if (passengers < 3) {
          return {
            required: true,
            reason: `SUV requested for ${passengers} passenger${passengers > 1 ? 's' : ''} (less than 3 passengers). The request will be routed for additional Board approval.`
          };
        }
      }

      // Rule 3: Sedan with < 2 passengers (single passenger) requires board approval
      if (cabTypeStr.includes('sedan') || cabTypeStr.includes('dzire') || cabTypeStr.includes('aura')) {
        if (passengers < 2) {
          return {
            required: true,
            reason: 'Sedan requested for a single passenger. The request will be routed for additional Board approval.'
          };
        }
      }
    }

    return { required: false, reason: '' };
  };

  const boardApprovalInfo = checkBoardApprovalRequired();
  const isShortNotice = boardApprovalInfo.required;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCode, setCreatedCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!certified) {
      setMessage('Please confirm compliance with company travel policies.');
      return;
    }
    setIsSubmitting(true);
    setMessage('');
    try {
      const payload = {
        category,
        travelMode: category,
        travellerName: requesterDetails.employeeName || valueOf({ name: 'Traveller' }),
        employeeEmail: requesterDetails.employeeEmail || '',
        employeeId: requesterDetails.employeeId || '',
        location: requesterDetails.location || '',
        managerName: requesterDetails.managerName || '',
        managerEmail: requesterDetails.managerEmail || '',
        department: valueOf({ name: 'Department / Cost Centre' }),
        purpose: valueOf({ name: 'Purpose of visit' }),
        tripType: valueOf({ name: 'Trip type' }) || valueOf({ name: 'Journey type' }) || '',
        travelClass: valueOf({ name: 'Travel class' }) || valueOf({ name: 'Bus type' }) || valueOf({ name: 'Room type' }) || '',
        fromLocation: valueOf({ name: 'From' }) || valueOf({ name: 'From station' }) || valueOf({ name: 'Pickup location' }) || '',
        toLocation: valueOf({ name: 'To' }) || valueOf({ name: 'To station' }) || valueOf({ name: 'Final drop location' }) || valueOf({ name: 'City / Location' }) || '',
        departureDate: values['Date of travel'] || values['Date of journey'] || values['Check-in date'] || '',
        returnDate: values['Return / onward date'] || values['Return date'] || values['Check-out date'] || '',
        preferredTimeSlot: values['Preferred departure time'] || values['Preferred time slot'] || values['Pickup time'] || '',
        isShortNotice,
        bookingDetails: values,
        certified
      };
      const res = await apiFetch('/travel-desk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to submit travel request');
      }
      setCreatedCode(data.data?.requestCode || '');
      setSubmitted(true);
    } catch (err) {
      setMessage(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = ['Travel Mode', 'Travel Details', 'Review & Submit'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '1040px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Top Header */}
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2, margin: 0 }}>
          Travel &amp; Stay Desk
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
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
            Travel Request Submitted Successfully
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#047857', maxWidth: '480px', margin: 0, lineHeight: 1.5 }}>
            Your <strong>{category}</strong> reservation request <strong>{createdCode || ''}</strong> for <strong>{valueOf({ name: 'Traveller' })}</strong> has been submitted and sent for approval.
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
                const isHovered = hoveredCategory === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setCategory(mode.id)}
                    onMouseEnter={() => setHoveredCategory(mode.id)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    style={{
                      padding: '1.25rem',
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
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease'
                    }}
                  >
                    <div
                      style={{
                        padding: '0.65rem',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: selected
                          ? 'var(--brand-primary, #173C4E)'
                          : isHovered
                          ? 'rgba(23, 60, 78, 0.08)'
                          : 'var(--input-bg)',
                        color: selected ? '#FFFFFF' : 'var(--brand-primary, #173C4E)',
                        flexShrink: 0,
                        transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                        transition: 'transform 0.2s ease, background-color 0.2s ease, color 0.2s ease'
                      }}
                    >
                      <IconComponent size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{mode.label}</div>
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
                  value={requesterDetails.employeeName}
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
                  value={requesterDetails.employeeEmail}
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
                  value={requesterDetails.employeeId}
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
                  value={requesterDetails.location || resolveEmpLocation(activeSessionUser) || ''}
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
                  <span style={{ color: requesterDetails.managerName ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {requesterDetails.managerName || (loadingUsers ? 'Loading employees...' : 'Select Reporting Manager...')}
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

                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {availableUsers
                        .filter(u => {
                          if (!managerSearchTerm.trim()) return true;
                          const term = managerSearchTerm.toLowerCase();
                          return (u.name && u.name.toLowerCase().includes(term)) || (u.email && u.email.toLowerCase().includes(term));
                        })
                        .map(u => (
                          <div
                            key={u.id || u.email}
                            onClick={() => {
                              setRequesterDetails(prev => ({
                                ...prev,
                                managerName: u.name,
                                managerEmail: u.email
                              }));
                              setManagerDropdownOpen(false);
                              setManagerSearchTerm('');
                            }}
                            style={{
                              padding: '0.6rem 0.85rem',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.15rem',
                              borderBottom: '1px solid var(--border-color)',
                              backgroundColor: requesterDetails.managerEmail === u.email ? '#EFF6FF' : 'transparent',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => {
                              if (requesterDetails.managerEmail !== u.email) e.currentTarget.style.backgroundColor = '#F8FAFC';
                            }}
                            onMouseLeave={(e) => {
                              if (requesterDetails.managerEmail !== u.email) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                            <span style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>{u.email}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <FormLabel>Manager Email</FormLabel>
                <input
                  type="email"
                  readOnly
                  disabled
                  placeholder="Selected manager's email"
                  value={requesterDetails.managerEmail}
                  style={READONLY_FIELD_STYLE}
                />
              </div>
            </div>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--border-color)' }} />

          {/* Section 2: Reservation Details */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {category} Reservation Details
            </h3>
            <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Section 2 of 2
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
                <div style={{ color: '#854D0E', flexShrink: 0, marginTop: '2px' }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <div style={{ color: '#854D0E', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.3 }}>
                    Board approval will be required
                  </div>
                  <p style={{ color: '#713F12', fontSize: '0.8rem', marginTop: '0.2rem', lineHeight: 1.45, margin: 0 }}>
                    {boardApprovalInfo.reason || 'This booking requires additional Board member sign-off per corporate travel policy.'}
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Review &amp; Submit
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>
                Confirm the details before submitting.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand-primary)',
                fontSize: '0.875rem',
                fontWeight: 600,
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
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Travel request summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* Category */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', alignItems: 'baseline', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Category</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{category}</span>
              </div>

              {/* Traveller */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', alignItems: 'baseline', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Traveller</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {valueOf({ name: 'Traveller' }) || effectiveTraveller || '—'}
                </span>
              </div>

              {/* Department */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', alignItems: 'baseline', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Department / Cost Centre</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
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
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, wordBreak: 'break-word' }}>
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
