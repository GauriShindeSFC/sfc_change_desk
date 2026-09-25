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
  AlertTriangle,
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin
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

const PREFERRED_TIME_OPTIONS = [
  { value: '', label: 'Select time' },
  { value: 'Early morning (05:00–08:00)', label: 'Early morning (05:00–08:00)' },
  { value: 'Morning (08:00–12:00)', label: 'Morning (08:00–12:00)' },
  { value: 'Afternoon (12:00–17:00)', label: 'Afternoon (12:00–17:00)' },
  { value: 'Evening (17:00–21:00)', label: 'Evening (17:00–21:00)' },
  { value: 'Night (after 21:00)', label: 'Night (after 21:00)' },
  { value: 'Flexible', label: 'Flexible' }
];

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

// Builds a clean route string across legs e.g. "Mumbai → Delhi → Bengaluru" or disconnected legs "Mumbai → Delhi | Goa → Bengaluru"
const buildJourneySummary = (legs) => {
  if (!Array.isArray(legs) || legs.length === 0) return '';
  const validLegs = legs.filter(l => (l.from && l.from.trim()) || (l.to && l.to.trim()));
  if (validLegs.length === 0) return '';

  const segments = [];
  let currentChain = [];

  validLegs.forEach((leg, idx) => {
    const from = (leg.from || '').trim();
    const to = (leg.to || '').trim();

    if (idx === 0) {
      if (from) currentChain.push(from);
      if (to) currentChain.push(to);
    } else {
      const prevTo = (validLegs[idx - 1].to || '').trim();
      if (from && prevTo && from.toLowerCase() === prevTo.toLowerCase()) {
        if (to) currentChain.push(to);
      } else {
        if (currentChain.length > 0) {
          segments.push(currentChain.join(' → '));
        }
        currentChain = [];
        if (from) currentChain.push(from);
        if (to) currentChain.push(to);
      }
    }
  });

  if (currentChain.length > 0) {
    segments.push(currentChain.join(' → '));
  }

  return segments.join(' | ');
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
  const [stepErrors, setStepErrors] = useState({});

  // Multi-city state
  const [multiCityLegs, setMultiCityLegs] = useState([
    { id: 'leg-1', travelDate: '', preferredTime: '', from: '', to: '' }
  ]);

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
  const valueOf = field => values[field.name] ?? (field.name === 'Traveller' ? effectiveTraveller : field.default);

  const update = (field, value) => {
    setDrafts(previous => ({
      ...previous,
      [category]: { ...previous[category], [field.name]: value }
    }));
    setCertified(false);
    setMessage('');
    setStepErrors(prev => ({ ...prev, [field.name]: undefined, general: undefined }));
  };

  const isFlight = category?.toLowerCase() === 'flight' || category?.toLowerCase() === 'flights';
  const isCab = category?.toLowerCase() === 'cab' || category?.toLowerCase() === 'cabs';
  const isMultiCityFlight = isFlight && values['Trip type'] === 'Multi-city / Onward';

  const multiCityExcludedFieldNames = new Set([
    'Date of travel',
    'Preferred departure time',
    'From',
    'To',
    'Return / onward date',
    'Return / onward time',
    'Onward destination'
  ]);

  const visibleFields = (TRAVEL_DESK_FIELDS[category] || []).filter(field => {
    if (isMultiCityFlight && multiCityExcludedFieldNames.has(field.name)) {
      return false;
    }
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

  // Multi-city Leg Handlers
  const handleAddLeg = () => {
    const prevLeg = multiCityLegs[multiCityLegs.length - 1];
    const defaultFrom = prevLeg ? (prevLeg.to || '') : '';
    const newLeg = {
      id: `leg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      travelDate: '',
      preferredTime: '',
      from: defaultFrom,
      to: ''
    };
    setMultiCityLegs(prev => [...prev, newLeg]);
    setStepErrors({});
    setMessage('');
  };

  const handleRemoveLeg = (idToRemove) => {
    if (multiCityLegs.length <= 1) return;
    setMultiCityLegs(prev => prev.filter(leg => leg.id !== idToRemove));
    setStepErrors({});
    setMessage('');
  };

  const handleUpdateLeg = (id, key, val) => {
    setMultiCityLegs(prev => prev.map(leg => {
      if (leg.id === id) {
        return { ...leg, [key]: val };
      }
      return leg;
    }));
    setStepErrors({});
    setMessage('');
    setCertified(false);
  };

  const validateMultiCityForm = () => {
    const errors = {};
    let firstLegDate = '';
    let lastLegDate = '';

    multiCityLegs.forEach((leg, index) => {
      const legNum = index + 1;
      const legErrors = {};

      if (!leg.travelDate) {
        legErrors.travelDate = 'Travel date is required';
      }
      if (!leg.preferredTime) {
        legErrors.preferredTime = 'Preferred time slot is required';
      }
      if (!leg.from || !leg.from.trim()) {
        legErrors.from = 'From location is required';
      }
      if (!leg.to || !leg.to.trim()) {
        legErrors.to = 'To location is required';
      }

      if (leg.from && leg.to && leg.from.trim().toLowerCase() === leg.to.trim().toLowerCase()) {
        legErrors.to = 'Departure and arrival destinations cannot be identical';
      }

      if (leg.travelDate) {
        if (index === 0) {
          firstLegDate = leg.travelDate;
        } else {
          const prevLeg = multiCityLegs[index - 1];
          if (prevLeg.travelDate && leg.travelDate < prevLeg.travelDate) {
            legErrors.travelDate = `Flight ${legNum} date cannot be earlier than Flight ${index} date (${formatDateDisplay(prevLeg.travelDate)})`;
          }
        }
        lastLegDate = leg.travelDate;
      }

      if (Object.keys(legErrors).length > 0) {
        errors[leg.id] = legErrors;
      }
    });

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const handleProceedToReview = (e) => {
    e.preventDefault();
    if (!requesterDetails.managerName || !requesterDetails.managerEmail) {
      setMessage('Please select a reporting manager from the list.');
      return;
    }

    if (isMultiCityFlight) {
      const { isValid, errors } = validateMultiCityForm();
      if (!isValid) {
        setStepErrors(errors);
        setMessage('Please correct the highlighted errors in your multi-city flight itinerary.');
        return;
      }
    }

    setStepErrors({});
    setMessage('');
    setStep(3);
  };

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

      const travelDateStr = isMultiCityFlight
        ? (multiCityLegs[0]?.travelDate || '')
        : (values['Date of travel'] || values['Date of journey'] || values['Check-in date']);

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
      const departureDate = isMultiCityFlight
        ? (multiCityLegs[0]?.travelDate || '')
        : (values['Date of travel'] || values['Date of journey'] || values['Check-in date'] || '');

      const returnDate = isMultiCityFlight
        ? null
        : (values['Return / onward date'] || values['Return date'] || values['Check-out date'] || null);

      const fromLocation = isMultiCityFlight
        ? (multiCityLegs[0]?.from || '')
        : (valueOf({ name: 'From' }) || valueOf({ name: 'From station' }) || valueOf({ name: 'Pickup location' }) || '');

      const toLocation = isMultiCityFlight
        ? (multiCityLegs[multiCityLegs.length - 1]?.to || '')
        : (valueOf({ name: 'To' }) || valueOf({ name: 'To station' }) || valueOf({ name: 'Final drop location' }) || valueOf({ name: 'City / Location' }) || '');

      const preferredTimeSlot = isMultiCityFlight
        ? (multiCityLegs[0]?.preferredTime || '')
        : (values['Preferred departure time'] || values['Preferred time slot'] || values['Pickup time'] || '');

      // Build consolidated bookingDetails
      const finalBookingDetails = {
        ...values
      };

      if (isMultiCityFlight) {
        finalBookingDetails.legs = multiCityLegs;
        delete finalBookingDetails.returnFlightRequired;
        delete finalBookingDetails.returnLeg;
        delete finalBookingDetails.returnDate;
        delete finalBookingDetails.returnPreferredTime;
        delete finalBookingDetails.returnFrom;
        delete finalBookingDetails.returnTo;
        delete finalBookingDetails['Date of travel'];
        delete finalBookingDetails['Preferred departure time'];
        delete finalBookingDetails['From'];
        delete finalBookingDetails['To'];
        delete finalBookingDetails['Return / onward date'];
        delete finalBookingDetails['Return / onward time'];
        delete finalBookingDetails['Onward destination'];
      }

      const payload = {
        category,
        travelMode: category,
        travellerName: requesterDetails.employeeName || valueOf({ name: 'Traveller' }),
        employeeEmail: requesterDetails.employeeEmail || '',
        employeeId: requesterDetails.employeeId || '',
        location: requesterDetails.location || '',
        managerName: requesterDetails.managerName || '',
        managerEmail: requesterDetails.managerEmail || '',
        department: department || user?.department || '',
        purpose: valueOf({ name: 'Purpose of visit' }),
        tripType: valueOf({ name: 'Trip type' }) || valueOf({ name: 'Journey type' }) || '',
        travelClass: valueOf({ name: 'Travel class' }) || valueOf({ name: 'Bus type' }) || valueOf({ name: 'Room type' }) || '',
        fromLocation,
        toLocation,
        departureDate,
        returnDate,
        preferredTimeSlot,
        isShortNotice,
        bookingDetails: finalBookingDetails,
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
  const journeySummary = isMultiCityFlight ? buildJourneySummary(multiCityLegs) : '';

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
                setMultiCityLegs([{ id: 'leg-1', travelDate: '', preferredTime: '', from: '', to: '' }]);
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
        <form onSubmit={handleProceedToReview} style={{
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
          </div>

          {/* MULTI-CITY FLIGHT SECTION (Stacked Flight Cards & Journey Summary) */}
          {isMultiCityFlight && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.25rem' }}>
              
              {/* 1. Journey Summary Banner */}
              <div style={{
                padding: '0.85rem 1.25rem',
                backgroundColor: 'var(--input-bg, #F8FAFC)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(23, 60, 78, 0.08)',
                    color: 'var(--brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Plane size={17} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Multi-City Journey Route
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.1rem' }}>
                      {journeySummary || 'Enter your flight origins and destinations below'}
                    </div>
                  </div>
                </div>

                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--brand-primary)',
                  backgroundColor: '#FFFFFF',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)'
                }}>
                  {multiCityLegs.length} {multiCityLegs.length === 1 ? 'Flight Leg' : 'Flight Legs'}
                </div>
              </div>

              {/* 2. Stacked Flight Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {multiCityLegs.map((leg, index) => {
                  const legNum = index + 1;
                  const prevLeg = index > 0 ? multiCityLegs[index - 1] : null;
                  const minDateForLeg = (prevLeg && prevLeg.travelDate) ? prevLeg.travelDate : todayStr;
                  const legError = stepErrors[leg.id] || {};

                  return (
                    <div
                      key={leg.id}
                      style={{
                        backgroundColor: 'var(--card-bg, #FFFFFF)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '1.25rem 1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        boxShadow: '0 1px 2px rgba(16, 21, 30, 0.03)',
                        position: 'relative'
                      }}
                    >
                      {/* Card Top Bar */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: 'var(--brand-primary)',
                            color: '#FFFFFF',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {legNum}
                          </span>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                            Flight {legNum}
                          </h4>
                        </div>

                        {multiCityLegs.length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove Flight ${legNum}`}
                            onClick={() => handleRemoveLeg(leg.id)}
                            style={{
                              background: 'none',
                              border: '1px solid #FECACA',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              borderRadius: '6px',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.775rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      {/* 2-Column Desktop / 1-Column Mobile Layout */}
                      <div className="cd-responsive-form-grid" style={{ gap: '0.85rem' }}>
                        
                        {/* Travel Date */}
                        <div>
                          <FormLabel required htmlFor={`leg-date-${leg.id}`}>Travel date</FormLabel>
                          <input
                            id={`leg-date-${leg.id}`}
                            type="date"
                            min={minDateForLeg}
                            required
                            value={leg.travelDate}
                            onChange={(e) => handleUpdateLeg(leg.id, 'travelDate', e.target.value)}
                            style={{
                              ...ACTIVE_FIELD_STYLE,
                              borderColor: legError.travelDate ? '#DC2626' : 'var(--border-color)'
                            }}
                          />
                          {legError.travelDate && (
                            <div style={{ fontSize: '0.725rem', color: '#DC2626', marginTop: '0.25rem', fontWeight: 500 }}>
                              {legError.travelDate}
                            </div>
                          )}
                        </div>

                        {/* Preferred Time Slot */}
                        <div>
                          <FormLabel required htmlFor={`leg-time-${leg.id}`}>Preferred time slot</FormLabel>
                          <select
                            id={`leg-time-${leg.id}`}
                            required
                            value={leg.preferredTime}
                            onChange={(e) => handleUpdateLeg(leg.id, 'preferredTime', e.target.value)}
                            style={{
                              ...ACTIVE_FIELD_STYLE,
                              borderColor: legError.preferredTime ? '#DC2626' : 'var(--border-color)'
                            }}
                          >
                            {PREFERRED_TIME_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          {legError.preferredTime && (
                            <div style={{ fontSize: '0.725rem', color: '#DC2626', marginTop: '0.25rem', fontWeight: 500 }}>
                              {legError.preferredTime}
                            </div>
                          )}
                        </div>

                        {/* From */}
                        <div>
                          <FormLabel required htmlFor={`leg-from-${leg.id}`}>From</FormLabel>
                          <input
                            id={`leg-from-${leg.id}`}
                            type="text"
                            required
                            placeholder="City or airport"
                            value={leg.from}
                            onChange={(e) => handleUpdateLeg(leg.id, 'from', e.target.value)}
                            style={{
                              ...ACTIVE_FIELD_STYLE,
                              borderColor: legError.from ? '#DC2626' : 'var(--border-color)'
                            }}
                          />
                          {legError.from && (
                            <div style={{ fontSize: '0.725rem', color: '#DC2626', marginTop: '0.25rem', fontWeight: 500 }}>
                              {legError.from}
                            </div>
                          )}
                        </div>

                        {/* To */}
                        <div>
                          <FormLabel required htmlFor={`leg-to-${leg.id}`}>To</FormLabel>
                          <input
                            id={`leg-to-${leg.id}`}
                            type="text"
                            required
                            placeholder="City or airport"
                            value={leg.to}
                            onChange={(e) => handleUpdateLeg(leg.id, 'to', e.target.value)}
                            style={{
                              ...ACTIVE_FIELD_STYLE,
                              borderColor: legError.to ? '#DC2626' : 'var(--border-color)'
                            }}
                          />
                          {legError.to && (
                            <div style={{ fontSize: '0.725rem', color: '#DC2626', marginTop: '0.25rem', fontWeight: 500 }}>
                              {legError.to}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 3. "+ Add destination" Button */}
              <div>
                <button
                  type="button"
                  onClick={handleAddLeg}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.6rem 1.1rem',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px dashed var(--brand-primary)',
                    borderRadius: '8px',
                    color: 'var(--brand-primary)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(23, 60, 78, 0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <Plus size={16} />
                  <span>Add destination</span>
                </button>
              </div>

            </div>
          )}

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

          {message && (
            <div style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              fontSize: '0.825rem',
              color: '#DC2626',
              fontWeight: 600
            }}>
              {message}
            </div>
          )}

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
                  {boardApprovalInfo.reason || 'This booking requires additional Board member sign-off per corporate travel policy.'}
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
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

              {/* Purpose */}
              {valueOf({ name: 'Purpose of visit' }) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', alignItems: 'baseline', gap: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Purpose of visit</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600, wordBreak: 'break-word' }}>
                    {valueOf({ name: 'Purpose of visit' })}
                  </span>
                </div>
              )}

              {/* Trip Type */}
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', alignItems: 'baseline', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Trip type</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {valueOf({ name: 'Trip type' }) || '—'}
                </span>
              </div>

              {/* Travel Class */}
              {valueOf({ name: 'Travel class' }) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 240px) 1fr', alignItems: 'baseline', gap: '1rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Travel class</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    {valueOf({ name: 'Travel class' })}
                  </span>
                </div>
              )}

              {/* Multi-City Itinerary Leg List */}
              {isMultiCityFlight ? (
                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Multi-City Flight Itinerary ({journeySummary})
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {multiCityLegs.map((leg, idx) => (
                      <div
                        key={leg.id}
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: 'var(--input-bg, #F8FAFC)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: 'var(--brand-primary)',
                            color: '#FFFFFF',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {idx + 1}
                          </span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {leg.from} → {leg.to}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={13} />
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDateDisplay(leg.travelDate)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock size={13} />
                            <span>{leg.preferredTime}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Non-multi-city Dynamic Fields */
                visibleFields
                  .filter(f => f.name !== 'Traveller' && f.name !== 'Purpose of visit' && f.name !== 'Trip type' && f.name !== 'Travel class')
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
                  })
              )}
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
              disabled={!certified || isSubmitting}
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
                cursor: (!certified || isSubmitting) ? 'not-allowed' : 'pointer',
                opacity: (!certified || isSubmitting) ? 0.5 : 1
              }}
            >
              <Send size={14} />
              <span>{isSubmitting ? 'Submitting...' : 'Submit Travel Booking Request'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

