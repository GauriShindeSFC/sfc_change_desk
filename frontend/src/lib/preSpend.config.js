export const PRE_SPEND_CATEGORIES = [
  {
    name: 'IT Hardware',
    description: 'Devices, peripherals and infrastructure',
    subcategories: [
      'Laptop / Desktop',
      'Monitor / Display',
      'Mobile / Tablet',
      'Network Equipment',
      'Server / Storage',
      'Printer / Scanner',
      'Accessories / Peripherals',
      'Audio Visual / Conference Room'
    ]
  },
  {
    name: 'Software & SaaS',
    description: 'Licences, subscriptions and cloud tools',
    subcategories: [
      'Productivity & Collaboration',
      'Cybersecurity Tool',
      'Cloud / Hosting',
      'Development Tool',
      'CRM / ERP / Business App',
      'Design / Creative Tool',
      'AI Tool / Platform',
      'Domain / SSL / Digital Asset'
    ]
  },
  {
    name: 'Professional Services',
    description: 'Consultants, agencies and specialists',
    subcategories: [
      'Legal & Compliance',
      'Audit & Certification',
      'Business / Technical Consulting',
      'Recruitment Services',
      'Training & Facilitation',
      'Outsourced Manpower',
      'Research & Advisory',
      'Design / Creative Agency'
    ]
  },
  {
    name: 'Marketing & Event',
    description: 'Campaigns, events and brand activities',
    subcategories: [
      'Digital Advertising',
      'Event / Conference',
      'Sponsorship',
      'Printing & Collateral',
      'Merchandise / Gifts',
      'PR & Media',
      'Content Production',
      'Photography / Videography'
    ]
  },
  {
    name: 'Facilities & Housekeeping',
    description: 'Office, maintenance and facility needs',
    subcategories: [
      'Repairs & Maintenance',
      'Furniture & Fixtures',
      'Electrical / UPS',
      'HVAC / Air Conditioning',
      'Housekeeping Supplies',
      'Pest Control',
      'Pantry Supplies / Equipment',
      'Security / Access Control'
    ]
  },
  {
    name: 'Employee Welfare',
    description: 'Engagement, wellbeing and recognition',
    subcategories: [
      'Team Meal / Outing',
      'Celebration / Milestone',
      'Rewards & Recognition',
      'Health & Wellness',
      'Employee Engagement Activity',
      'Joining Kit',
      'Festival Gift',
      'Emergency Employee Support'
    ]
  },
  {
    name: 'Travel & Hospitality',
    description: 'Reimbursable business travel expenses',
    subcategories: [
      'Flight Reimbursement',
      'Cab / Local Conveyance',
      'Train Reimbursement',
      'Bus Reimbursement',
      'Hotel Reimbursement',
      'Business Meals',
      'Visa / Travel Documentation',
      'Other Travel Expense'
    ]
  },
  {
    name: 'Other Emergency Expenses',
    description: 'Urgent, exceptional business-critical spend',
    subcategories: [
      'IT / Security Outage',
      'Facility Safety Issue',
      'Medical Emergency',
      'Urgent Customer Requirement',
      'Compliance / Statutory Deadline',
      'Business Continuity',
      'Critical Replacement',
      'Other Exceptional Expense'
    ]
  }
];

export const SAMPLE_BUDGET_LINES = [
  { value: 'plant-capex-manufacturing', label: 'Plant Capex — Manufacturing (₹2Cr free)' },
  { value: 'consumables-spares-manufacturing', label: 'Consumables & Spares — Manufacturing (₹54L free)' },
  { value: 'it-hardware-refresh', label: 'IT Hardware Refresh — IT (₹9L free)' },
  { value: 'saas-licences-it', label: 'SaaS & Licences — IT (₹32L free)' },
  { value: 'brand-events-marketing', label: 'Brand & Events — Marketing (₹29L free)' },
  { value: 'facilities-opex-admin', label: 'Facilities Opex — Admin (₹22L free)' },
  { value: 'professional-fees-finance', label: 'Professional Fees — Finance (₹17L free)' }
];

export const COMMERCIAL_REASONS = [
  'Lowest total cost',
  'Better specification / scope',
  'Faster delivery',
  'Better warranty / support',
  'Prior performance',
  'Compatibility / continuity',
  'Sole-source provider'
];

export const EXCEPTION_OPTIONS = [
  'Not applicable',
  'Sole-source / OEM vendor',
  'Existing renewal',
  'Emergency spend',
  'Rate-contract vendor',
  'Compatibility requirement',
  'Low-value spend'
];
