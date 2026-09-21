import React, { useId, useState } from 'react';
import fields from './fields.json';
import './TravelDesk.css';

const categories = [
  ['Flight', '✈', 'Domestic or international air travel'],
  ['Cab', '⌖', 'Local, airport or inter-city travel'],
  ['Bus', '▤', 'Inter-city bus reservation'],
  ['Train', '⇆', 'Rail travel reservation'],
  ['Hotel', '⌂', 'Room accommodation'],
];
const title = category => category === 'Hotel' ? 'Hotel Room' : category;

export default function TravelDesk({ onNavigate, user, travellerName = '', department = '' }) {
  const uid = useId();
  const [category, setCategory] = useState('');
  const [step, setStep] = useState(1);
  const [drafts, setDrafts] = useState({});
  const [certified, setCertified] = useState(false);
  const [message, setMessage] = useState('');
  const values = drafts[category] || {};
  const effectiveTraveller = travellerName || user?.name || '';
  const effectiveDept = department || user?.department || user?.dept || '';
  const valueOf = field => values[field.name] ?? (field.name === 'Traveller' ? effectiveTraveller : field.name === 'Department / Cost Centre' && effectiveDept ? effectiveDept : field.default);
  const update = (field, value) => {
    setDrafts(previous => ({ ...previous, [category]: { ...previous[category], [field.name]: value } }));
    setCertified(false); setMessage('');
  };
  const visible = (fields[category] || []).filter(field =>
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

  const fieldControl = (field) => {
    const id = `${uid}-${category}-${field.name}`;
    const props = { id, name: field.name, value: valueOf(field), required: field.required, onChange: event => update(field, event.target.value) };

    let minVal = field.min;
    if (field.type === 'date') {
      if (field.name === 'Return / onward date') {
        minVal = values['Date of travel'] || todayStr;
      } else {
        minVal = field.min || todayStr;
      }
    }

    return <div className={`field ${field.full ? 'full' : ''}`} key={field.name}>
      <label htmlFor={id}>{field.label}{field.required && <span className="req"> *</span>}</label>
      {field.type === 'select' ? <select {...props}>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        : field.type === 'textarea' ? <textarea {...props} placeholder={field.placeholder} />
        : <input {...props} type={field.type === 'input' ? 'text' : field.type} min={minVal} placeholder={field.placeholder} />}
    </div>;
  };
  const requiresBoardApproval = () => {
    // Only departure / start dates trigger short-notice board approval (return date is excluded)
    const travelDateStr = values['Date of travel'] || values['Date of journey'] || values['Check-in date'];
    if (!travelDateStr) return false;

    // Parse YYYY-MM-DD in local time to avoid timezone offset shifts
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

  return <div className="travel-desk"><div className="content">
    <header className="head">
      <div>
        <h1>New travel request</h1>
        <p>Request travel and accommodation through the Travel Desk.</p>
      </div>
      <span className="draft">Draft</span>
    </header>
    <div className="stepper" aria-label="Request progress">{['Select Category', 'Request Details', 'Review & Submit'].map((label, index) => <div key={label} className={`step ${step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''}`} aria-current={step === index + 1 ? 'step' : undefined}><span className="dot">{step > index + 1 ? '✓' : index + 1}</span><span>{label}</span></div>)}</div>
    {step === 1 && <section className="panel"><div className="section-title"><div><h2>What would you like the Travel Desk to arrange?</h2><p>Select one category to continue.</p></div></div><div className="categories">{categories.map(([name, icon, description]) => <button type="button" key={name} aria-pressed={category === name} className={`category ${category === name ? 'selected' : ''}`} onClick={() => {setCategory(name); setCertified(false); setMessage('');}}><span className="cat-icon" aria-hidden="true">{icon}</span><strong>{title(name)}</strong><small>{description}</small></button>)}</div><div className="actions"><span /><button className="btn primary" disabled={!category} onClick={() => setStep(2)}>Continue to Request Details</button></div></section>}
    {step === 2 && <section className="panel"><div className="section-title"><div><h2>{title(category)} Request Details</h2><p>Fields marked <span className="req">*</span> are required.</p></div><button className="linkbtn" onClick={() => setStep(1)}>Change category</button></div>
      <form onSubmit={event => { event.preventDefault(); setStep(3); }}>
        <div className="form-grid">
          {visible.filter(field => !field.group).map(fieldControl)}
          {isShortNotice && (
            <div className="policy-warning" role="alert">
              <div className="policy-warning-title">
                <span aria-hidden="true">⚠</span> Board approval will be required
              </div>
              <p className="policy-warning-desc">
                This travel date is less than 7 days from today. The request will be routed for additional Board approval.
              </p>
            </div>
          )}
          {visible.some(field => field.group) && <div className="subcard"><h3>Return / Onward Flight</h3><div className="form-grid">{visible.filter(field => field.group).map(fieldControl)}</div></div>}
        </div>
        <div className="actions"><button type="button" className="btn" onClick={() => setStep(1)}>Back</button><button type="submit" className="btn primary">Review Request</button></div>
      </form></section>}
    {step === 3 && <section className="panel"><div className="section-title"><div><h2>Review & Submit</h2><p>Confirm your travel request details.</p></div><button className="linkbtn" onClick={() => setStep(2)}>Edit details</button></div>
      <div className="review-card"><h3>Travel request summary</h3><dl className="summary"><dt>Category</dt><dd>{title(category)}</dd>{visible.filter(field => String(valueOf(field)).trim()).map(field => <React.Fragment key={field.name}><dt>{field.label}</dt><dd>{valueOf(field)}</dd></React.Fragment>)}</dl></div>
      {isShortNotice && (
        <div className="policy-warning" style={{ marginTop: '16px' }} role="alert">
          <div className="policy-warning-title">
            <span aria-hidden="true">⚠</span> Board approval will be required
          </div>
          <p className="policy-warning-desc">
            This travel date is less than 7 days from today. The request will be routed for additional Board approval.
          </p>
        </div>
      )}
      <div className="cert"><label className="checkline"><input type="checkbox" checked={certified} onChange={event => setCertified(event.target.checked)} /><span>I confirm that the information is correct and no booking or financial commitment has been made for this request.</span></label></div><div className="actions"><button className="btn" onClick={() => setStep(2)}>Back</button><button className="btn primary" disabled={!certified} onClick={() => setMessage('Preview complete. This request has not been submitted.')}>Submit Travel Request</button></div>{message && <p role="status">{message}</p>}</section>}
  </div></div>;
}
