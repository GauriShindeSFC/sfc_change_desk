import React, { useId, useState } from 'react';
import categories from './categories.json';
import './PreSpendRequest.css';

const sampleBudgetLines = [
  { value: 'demo-operating', label: 'Operating expenses (sample)' },
  { value: 'demo-capital', label: 'Capital expenditure (sample)' },
  { value: 'demo-project', label: 'Project expenses (sample)' },
];
const reasons = ['Lowest total cost', 'Better specification / scope', 'Faster delivery', 'Better warranty / support', 'Prior performance', 'Compatibility / continuity', 'Sole-source provider'];
const exceptions = ['Sole-source / OEM vendor', 'Existing renewal', 'Emergency spend', 'Rate-contract vendor', 'Compatibility requirement', 'Low-value spend'];
const emptyVendor = () => ({ name: '', amount: '', date: '', file: null });
const money = value => Number(value).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

export default function PreSpendRequest({ onNavigate, user, initialCostCentre = '', budgetLines = sampleBudgetLines }) {
  const uid = useId();
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const resolvedCostCentre = initialCostCentre || user?.costCenter || user?.department || user?.dept || '';
  const [details, setDetails] = useState({ buying: '', amount: '', neededBy: '', costCentre: resolvedCostCentre, budgetLine: '', justification: '', urgent: false, urgentReason: '' });
  const [vendors, setVendors] = useState([emptyVendor(), emptyVendor(), emptyVendor()]);
  const [commercial, setCommercial] = useState({ exception: '', exceptionReason: '', reason: '', justification: '' });
  const [certified, setCertified] = useState(false);
  const [notice, setNotice] = useState('');
  const changeDetails = (key, value) => { setDetails(old => ({ ...old, [key]: value })); setCertified(false); setNotice(''); };
  const changeVendor = (index, key, value) => { setVendors(old => old.map((vendor, i) => i === index ? { ...vendor, [key]: value } : vendor)); setCertified(false); setNotice(''); };
  const changeCommercial = (key, value) => { setCommercial(old => ({ ...old, [key]: value })); setCertified(false); setNotice(''); };
  const selected = categories.find(item => item.name === category);
  const id = key => `${uid}-${key}`;
  const todayStr = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  const detailField = (key, label, { type = 'text', placeholder = '', full = false } = {}) => <div className={`field ${full ? 'full' : ''}`}>
    <label htmlFor={id(key)}>{label}</label>
    {type === 'textarea' ? <textarea id={id(key)} required value={details[key]} onChange={e => changeDetails(key, e.target.value)} placeholder={placeholder} /> : <input id={id(key)} type={type} required value={details[key]} min={type === 'number' ? '0.01' : type === 'date' ? todayStr : undefined} step={type === 'number' ? '0.01' : undefined} onChange={e => changeDetails(key, e.target.value)} placeholder={placeholder} />}
  </div>;
  const next = (event, destination) => { event.preventDefault(); setStep(destination); };
  const nav = (back, label) => <div className="actions"><button className="btn" type="button" onClick={() => setStep(back)}>← Back</button><button className="btn primary" type="submit">{label} →</button></div>;
  const summary = [
    ['Spend category', category], ['Subcategory', subcategory], ['What are you buying?', details.buying],
    ['Estimated value', money(details.amount)], ['Needed by', details.neededBy], ['Cost centre', details.costCentre],
    ['Budget line', budgetLines.find(line => line.value === details.budgetLine)?.label || details.budgetLine],
    ['Business justification', details.justification], ['Urgent', details.urgent ? 'Yes' : 'No'],
    ...(details.urgent ? [['Urgency reason', details.urgentReason]] : []),
  ];
  return <div className="pre-spend-request"><div className="content">
    <header className="head">
      <div>
        <h1>New Pre-spend Request</h1>
        <p>Obtain approval before placing an order or committing to a vendor.</p>
      </div>
      <span className="draft">Draft</span>
    </header>
    <div className="stepper" aria-label="Pre-spend request progress">{['Category', 'Request Details', 'Vendors & Quotes', 'Review & Submit'].map((label, index) => <div key={label} className={`step ${step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''}`} aria-current={step === index + 1 ? 'step' : undefined}><span className="dot">{step > index + 1 ? '✓' : index + 1}</span><span>{label}</span></div>)}</div>
    {step === 1 && <form onSubmit={e => next(e, 2)}><section className="panel"><div className="section-title"><div><h2>What type of spend is this?</h2><p>Select a spend category and subcategory.</p></div></div><div className="categories">{categories.map((item, index) => <button key={item.name} className={`category ${category === item.name ? 'selected' : ''}`} type="button" aria-pressed={category === item.name} onClick={() => { if (category !== item.name) { setCategory(item.name); setSubcategory(''); setCertified(false); setNotice(''); } }}><span className="cat-icon" aria-hidden="true">{['▣', '◇', '◎', '☆', '⌂', '♡', '✈', '!'][index]}</span><strong>{item.name}</strong><small>{item.description}</small></button>)}</div>{selected && <div className="field subcategory"><label htmlFor={id('subcategory')}>Spend subcategory</label><select id={id('subcategory')} required value={subcategory} onChange={e => {setSubcategory(e.target.value);setCertified(false);setNotice('');}}><option value="">Select subcategory</option>{selected.subcategories.map(value => <option key={value}>{value}</option>)}</select></div>}</section><div className="actions outside"><span /><button className="btn primary" disabled={!category || !subcategory}>Continue to Request Details →</button></div></form>}
    {step === 2 && <form onSubmit={e => next(e, 3)}><section className="panel request-details"><div className="section-title"><h2>Request details</h2></div><div className="form-grid">
      {detailField('buying', 'What are you buying?', { full: true, placeholder: 'e.g. 12 MT polypropylene granules for September build' })}
      {detailField('amount', 'Estimated value (INR)', { type: 'number', placeholder: 'e.g. 1200000' })}
      {detailField('neededBy', 'Needed by', { type: 'date' })}
      {detailField('costCentre', 'Cost centre', { placeholder: 'e.g. MFG-PUN-02' })}
      <div className="field"><label htmlFor={id('budgetLine')}>Budget line (required)</label><select id={id('budgetLine')} required value={details.budgetLine} onChange={e => changeDetails('budgetLine', e.target.value)}><option value="">Select budget line</option>{budgetLines.map(line => <option value={line.value} key={line.value}>{line.label}</option>)}</select></div>
      {detailField('justification', 'Business justification', { type: 'textarea', full: true, placeholder: 'Why is this spend needed now, and what happens if it waits?' })}
      <div className="urgent-row"><div><label htmlFor={id('urgent')}>Mark as urgent</label><p id={id('urgent-hint')}>Provide a reason for prioritising this request.</p></div><button id={id('urgent')} type="button" role="switch" aria-checked={details.urgent} aria-describedby={id('urgent-hint')} className={`urgent-switch ${details.urgent ? 'on' : ''}`} aria-label="Mark as urgent" onClick={() => changeDetails('urgent', !details.urgent)}><span /></button></div>
      {details.urgent && detailField('urgentReason', 'Reason for urgency', { type: 'textarea', full: true, placeholder: 'Explain why this request needs urgent attention.' })}
    </div></section>{nav(1, 'Continue')}</form>}
    {step === 3 && <form onSubmit={e => next(e, 4)}><section className="panel"><div className="section-title"><div><h2>Vendors & Quotes</h2><p>Compare your preferred vendor with available alternatives.</p></div></div><div className="vendor-grid">{vendors.map((vendor, index) => { const required = index === 0 || Boolean(vendor.name || vendor.amount || vendor.date || vendor.file); return <section className={`vendor-card ${index === 0 ? 'preferred' : ''}`} key={index}><h3>{index === 0 ? 'Preferred Vendor' : `Alternative Vendor ${index}`}</h3><div className="form-grid">{[['name', 'Vendor name', 'text'], ['amount', 'Quoted amount (₹)', 'number'], ['date', 'Quote date', 'date']].map(([key, label, type]) => <div className={`field ${key === 'name' ? 'full' : ''}`} key={key}><label htmlFor={id(`vendor-${index}-${key}`)}>{label}{required && <span className="req"> *</span>}</label><input id={id(`vendor-${index}-${key}`)} type={type} required={required} value={vendor[key]} min={type === 'number' ? '0.01' : undefined} step={type === 'number' ? '0.01' : undefined} onChange={e => changeVendor(index, key, e.target.value)} /></div>)}<div className="field full"><label htmlFor={id(`file-${index}`)}>Quotation file</label><input id={id(`file-${index}`)} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.eml,.msg" onChange={e => changeVendor(index, 'file', e.target.files?.[0] || null)} />{vendor.file && <small>Selected: {vendor.file.name}</small>}</div></div></section>; })}<section className="vendor-card"><h3>Quote Exception</h3><div className="field"><label htmlFor={id('exception')}>If alternative quotes are unavailable</label><select id={id('exception')} value={commercial.exception} onChange={e => changeCommercial('exception', e.target.value)}><option value="">Not applicable</option>{exceptions.map(value => <option key={value}>{value}</option>)}</select></div><div className="field spaced"><label htmlFor={id('exceptionReason')}>Exception justification</label><textarea id={id('exceptionReason')} required={Boolean(commercial.exception)} value={commercial.exceptionReason} onChange={e => changeCommercial('exceptionReason', e.target.value)} placeholder="Explain why comparison quotes are not available" /></div></section></div><div className="field spaced"><label htmlFor={id('reason')}>Why have you selected this vendor? <span className="req">*</span></label><select id={id('reason')} required value={commercial.reason} onChange={e => changeCommercial('reason', e.target.value)}><option value="">Select primary reason</option>{reasons.map(value => <option key={value}>{value}</option>)}</select></div><div className="field spaced"><label htmlFor={id('vendorJustification')}>Vendor selection justification <span className="req">*</span></label><textarea id={id('vendorJustification')} required value={commercial.justification} onChange={e => changeCommercial('justification', e.target.value)} /></div></section>{nav(2, 'Review Request')}</form>}
    {step === 4 && <section className="panel"><div className="section-title"><div><h2>Review & Submit</h2><p>Confirm the request and vendor comparison.</p></div><button className="linkbtn" onClick={() => setStep(2)}>Edit request</button></div><h3>Pre-spend request summary</h3><dl className="summary">{summary.map(([label, value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{value}</dd></React.Fragment>)}</dl><div className="review-vendors">{vendors.filter(vendor => vendor.name).map((vendor, index) => <div className="vendor-card" key={index}><h3>{index === 0 ? 'Preferred vendor' : `Alternative vendor ${index}`}</h3><p>{vendor.name}</p><strong>{money(vendor.amount)}</strong><p>Quote date: {vendor.date}</p>{vendor.file && <p>Quotation: {vendor.file.name}</p>}</div>)}</div><dl className="summary"><dt>Selection reason</dt><dd>{commercial.reason}</dd><dt>Vendor justification</dt><dd>{commercial.justification}</dd>{commercial.exception && <><dt>Quote exception</dt><dd>{commercial.exception}</dd><dt>Exception justification</dt><dd>{commercial.exceptionReason}</dd></>}</dl><div className="cert"><label className="checkline"><input type="checkbox" checked={certified} onChange={e => setCertified(e.target.checked)} /><span>I confirm that no order, payment or vendor commitment has been made and the information provided is correct.</span></label></div><div className="actions"><button className="btn" onClick={() => setStep(3)}>← Back</button><button className="btn primary" disabled={!certified} onClick={() => setNotice('Preview complete. This pre-spend request has not been submitted.')}>Submit Pre-spend Request</button></div>{notice && <p role="status">{notice}</p>}</section>}
  </div></div>;
}
