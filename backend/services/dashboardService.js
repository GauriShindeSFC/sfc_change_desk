export const getMetricsService = () => [
  { id: 'total', title: 'Total Change Requests', count: '128', subtext: '▲ 12 this month', subtextColor: '#10B981', iconBg: '#EBF5FF', iconColor: '#00A4EF' },
  { id: 'pending', title: 'Pending Approval', count: '17', subtext: 'CAB review pending', subtextColor: 'var(--text-secondary)', iconBg: '#FEF3C7', iconColor: '#D97706' },
  { id: 'approved', title: 'Approved', count: '76', subtext: '▲ 59% of total', subtextColor: '#10B981', iconBg: '#D1FAE5', iconColor: '#059669' },
  { id: 'in-progress', title: 'In Progress', count: '21', subtext: 'Scheduled this week: 6', subtextColor: 'var(--text-secondary)', iconBg: '#F3E8FF', iconColor: '#7C3AED' },
  { id: 'rejected', title: 'Rejected', count: '14', subtext: '▼ 3 this month', subtextColor: '#DC2626', iconBg: '#FEE2E2', iconColor: '#DC2626' }
];

export const getCategoryMetricsService = () => [
  { label: 'Software Deployment', count: 18, percentage: 38, color: '#2563EB' },
  { label: 'Server Patching', count: 12, percentage: 25, color: '#0D9488' },
  { label: 'Network Change', count: 8, percentage: 17, color: '#7C3AED' },
  { label: 'Access & Permissions', count: 6, percentage: 12, color: '#D97706' },
  { label: 'Hardware Change', count: 4, percentage: 8, color: '#DC2626' }
];

export const getStatusBreakdownService = () => [
  { status: 'Approved', count: 28, color: '#059669', percentage: 58 },
  { status: 'Pending', count: 12, color: '#D97706', percentage: 25 },
  { status: 'In Progress', count: 5, color: '#7C3AED', percentage: 10 },
  { status: 'Rejected', count: 3, color: '#DC2626', percentage: 7 }
];

export const getRecentRequestsService = () => [
  {
    id: 'CR-2049',
    title: 'Upgrade payment-gateway API to v4',
    category: 'Software Deployment',
    requester: 'Gauri Shinde',
    risk: 'Medium',
    riskColor: '#D97706',
    riskBars: 2,
    raisedDate: '24 Aug 2026',
    closedDate: 'Open',
    activeStep: 2,
    status: 'Pending',
    statusBg: '#FEF3C7',
    statusColor: '#D97706',
    statusDot: '#D97706'
  },
  {
    id: 'CR-2048',
    title: 'Apply Q3 security patch for prod DB cluster',
    category: 'Server / Patching',
    requester: 'Gauri Shinde',
    risk: 'High',
    riskColor: '#DC2626',
    riskBars: 3,
    raisedDate: '22 Aug 2026',
    closedDate: 'Open',
    activeStep: 3,
    status: 'Approved',
    statusBg: '#D1FAE5',
    statusColor: '#059669',
    statusDot: '#059669'
  },
  {
    id: 'CR-2044',
    title: 'Add VLAN for new Ahmedabad office floor',
    category: 'Network Change',
    requester: 'Gauri Shinde',
    risk: 'Medium',
    riskColor: '#D97706',
    riskBars: 2,
    raisedDate: '18 Aug 2026',
    closedDate: 'Open',
    activeStep: 3,
    status: 'Approved',
    statusBg: '#D1FAE5',
    statusColor: '#059669',
    statusDot: '#059669'
  },
  {
    id: 'CR-2041',
    title: 'Grant elevated access for Finance reporting tool',
    category: 'Access & Permissions',
    requester: 'Gauri Shinde',
    risk: 'Low',
    riskColor: '#059669',
    riskBars: 1,
    raisedDate: '15 Aug 2026',
    closedDate: '16 Aug 2026',
    activeStep: 6,
    status: 'Closed',
    statusBg: 'var(--input-bg)',
    statusColor: 'var(--text-secondary)',
    statusDot: '#94A0B0'
  },
  {
    id: 'CR-2038',
    title: 'Replace failing switch in Rack B12',
    category: 'Hardware Change',
    requester: 'Gauri Shinde',
    risk: 'Low',
    riskColor: '#059669',
    riskBars: 1,
    raisedDate: '10 Aug 2026',
    closedDate: 'Open',
    activeStep: 4,
    status: 'In Progress',
    statusBg: '#F3E8FF',
    statusColor: '#7C3AED',
    statusDot: '#7C3AED'
  }
];

export const getWorklistService = () => ({
  metrics: {
    pending: 4,
    approved: 32,
    rejected: 6,
    sentBack: 3
  },
  data: [
    {
      id: 'CR-2049',
      title: 'Upgrade payment-gateway API to v4',
      category: 'Software Deployment',
      requester: 'Priya Nair',
      submittedTime: 'submitted 2 days ago',
      risk: 'Medium',
      riskColor: '#D97706',
      riskBars: 2
    },
    {
      id: 'CR-2052',
      title: 'Rotate SSH keys for all bastion hosts',
      category: 'Server / Patching',
      requester: 'Arjun Mehta',
      submittedTime: 'submitted 6 hours ago',
      risk: 'High',
      riskColor: '#DC2626',
      riskBars: 3
    },
    {
      id: 'CR-2051',
      title: 'Open port 8443 for partner API gateway',
      category: 'Network Change',
      requester: 'Sana Iqbal',
      submittedTime: 'submitted 1 day ago',
      risk: 'Medium',
      riskColor: '#D97706',
      riskBars: 2
    },
    {
      id: 'CR-2050',
      title: 'Onboard 12 new hires with standard access bundle',
      category: 'Access & Permissions',
      requester: 'Rahul Verma',
      submittedTime: 'submitted 3 days ago',
      risk: 'Low',
      riskColor: '#059669',
      riskBars: 1
    }
  ]
});

export const getSettingsUsersService = () => [
  { id: 'usr-10432', name: 'Gauri Shinde', employeeId: 'EMP-10432', department: 'IT Operations', role: 'Change Manager', status: 'Approved', statusBg: '#D1FAE5', statusColor: '#059669', statusDot: '#059669' },
  { id: 'usr-10218', name: 'Priya Nair', employeeId: 'EMP-10218', department: 'IT Operations', role: 'Requester', status: 'Approved', statusBg: '#D1FAE5', statusColor: '#059669', statusDot: '#059669' },
  { id: 'usr-10391', name: 'Arjun Mehta', employeeId: 'EMP-10391', department: 'Infrastructure', role: 'CAB Approver', status: 'Approved', statusBg: '#D1FAE5', statusColor: '#059669', statusDot: '#059669' },
  { id: 'usr-10276', name: 'Sana Iqbal', employeeId: 'EMP-10276', department: 'Networking', role: 'CAB Approver', status: 'Approved', statusBg: '#D1FAE5', statusColor: '#059669', statusDot: '#059669' },
  { id: 'usr-10305', name: 'Rahul Verma', employeeId: 'EMP-10305', department: 'HR', role: 'Requester', status: 'Approved', statusBg: '#D1FAE5', statusColor: '#059669', statusDot: '#059669' },
  { id: 'usr-10119', name: 'Devika Rao', employeeId: 'EMP-10119', department: 'IT Operations', role: 'Admin', status: 'Approved', statusBg: '#D1FAE5', statusColor: '#059669', statusDot: '#059669' },
  { id: 'usr-10088', name: 'Karan Bhatt', employeeId: 'EMP-10088', department: 'Engineering', role: 'Requester', status: 'Closed', statusBg: 'var(--input-bg)', statusColor: 'var(--text-secondary)', statusDot: '#94A0B0' }
];

export const getSettingsRolesService = () => [
  { id: 'role-1', name: 'Admin', description: 'Full system access, manage catalog, workflows, users, and settings.', permissions: 'Dashboard, Change Catalog, Change Request, My Requests, My Worklist, Catalogue Management, Reports, Settings', status: 'Approved' },
  { id: 'role-2', name: 'Change Manager', description: 'Oversees the full change lifecycle and can override CAB decisions.', permissions: 'Dashboard, Change Request, My Requests, My Worklist, Reports, Catalogue Management', status: 'Approved' },
  { id: 'role-3', name: 'CAB Approver', description: 'Reviews and approves, rejects, or sends back change requests routed to their board.', permissions: 'Dashboard, My Worklist, Reports', status: 'Approved' },
  { id: 'role-4', name: 'Requester', description: 'Can raise change requests and track their own submissions.', permissions: 'Dashboard, Change Catalog, Change Request, My Requests', status: 'Approved' }
];

export const getSettingsAuditLogsService = () => [
  { id: 'log-1', timestamp: '26 Aug 2026, 10:42 AM', actor: 'Gauri Shinde', action: 'Submitted change request', reference: 'CR-2049', details: 'Software Deployment auto-routed to CAB Application Board', type: 'Change requests' },
  { id: 'log-2', timestamp: '26 Aug 2026, 09:15 AM', actor: 'Arjun Mehta', action: 'Approved change request', reference: 'CR-2052', details: 'Rotate SSH keys for all bastion hosts', type: 'Approvals' },
  { id: 'log-3', timestamp: '25 Aug 2026, 05:03 PM', actor: 'Devika Rao', action: 'Modified catalog item', reference: 'Server Patching', details: 'Updated SLA from 7 to 5 business days', type: 'Catalog & workflow' },
  { id: 'log-4', timestamp: '25 Aug 2026, 02:47 PM', actor: 'Sana Iqbal', action: 'Rejected change request', reference: 'CR-2035', details: 'Emergency rollback checkout service v2.3', type: 'Approvals' },
  { id: 'log-5', timestamp: '24 Aug 2026, 11:20 AM', actor: 'Devika Rao', action: 'Updated user status', reference: 'Karan Bhatt', details: 'Status changed to Disabled', type: 'User & role changes' },
  { id: 'log-6', timestamp: '23 Aug 2026, 04:08 PM', actor: 'Gauri Shinde', action: 'Created workflow', reference: 'Expedited Workflow', details: 'Applied to Emergency Change category', type: 'Catalog & workflow' }
];

export const getCatalogueManagementService = () => ({
  data: [
    { id: 'cat-1', title: 'Software Deployment', category: 'Software', sla: '3 business days', risk: 'Medium', riskColor: '#D97706', riskBars: 2, workflow: 'Standard Change Workflow', status: 'Approved', description: 'Deploy new application builds or features to production' },
    { id: 'cat-2', title: 'Server Patching', category: 'Infrastructure', sla: '5 business days', risk: 'High', riskColor: '#DC2626', riskBars: 3, workflow: 'Expedited Workflow', status: 'Approved', description: 'Apply security patches or OS upgrades to server clusters' },
    { id: 'cat-3', title: 'Network Change', category: 'Network', sla: '5 business days', risk: 'Medium', riskColor: '#D97706', riskBars: 2, workflow: 'Standard Change Workflow', status: 'Approved', description: 'Modify firewall rules, VLAN configurations, or routing' },
    { id: 'cat-4', title: 'Access & Permissions', category: 'Access', sla: '1 business day', risk: 'Low', riskColor: '#059669', riskBars: 1, workflow: 'Lightweight Access Workflow', status: 'Approved', description: 'Grant role-based system access or elevated entitlements' },
    { id: 'cat-5', title: 'Hardware Change', category: 'Infrastructure', sla: '7 business days', risk: 'Low', riskColor: '#059669', riskBars: 1, workflow: 'Standard Change Workflow', status: 'Approved', description: 'Replace physical server components or network switches' },
    { id: 'cat-6', title: 'Emergency Change', category: 'Emergency', sla: '4 hours', risk: 'High', riskColor: '#DC2626', riskBars: 3, workflow: 'Expedited Workflow', status: 'Approved', description: 'Urgent hotfixes or incident remediation changes' },
    { id: 'cat-7', title: 'Database Schema Change', category: 'Software', sla: '5 business days', risk: 'High', riskColor: '#DC2626', riskBars: 3, workflow: 'Expedited Workflow', status: 'Approved', description: 'Execute DDL migrations or column additions' },
    { id: 'cat-8', title: 'SSL Certificate Renewal', category: 'Infrastructure', sla: '2 business days', risk: 'Low', riskColor: '#059669', riskBars: 1, workflow: 'Standard Change Workflow', status: 'Approved', description: 'Renew or rotate production SSL/TLS certificates' },
    { id: 'cat-9', title: 'New Vendor Integration', category: 'Software', sla: '10 business days', risk: 'Medium', riskColor: '#D97706', riskBars: 2, workflow: 'Standard Change Workflow', status: 'Approved', description: 'Onboard new third-party webhooks or API connections' }
  ],
  workflows: [
    { id: 'wf-1', name: 'Standard Change Workflow', steps: 'Draft → Submitted → CAB Review → Approved → Scheduled → Implemented → Closed', usedBy: 'Software Deployment, Network Change, Hardware Change' },
    { id: 'wf-2', name: 'Expedited Workflow', steps: 'Draft → Submitted → CAB Review (4hr SLA) → Approved → Implemented → Closed', usedBy: 'Emergency Change' },
    { id: 'wf-3', name: 'Lightweight Access Workflow', steps: 'Draft → Submitted → Manager Approval → Implemented → Closed', usedBy: 'Access & Permissions' }
  ]
});

export const getReportsMetricsService = () => ({
  metrics: {
    successRate: '91.4%',
    successRateTrend: '▲ 2.1% vs last quarter',
    avgApprovalTime: '1.8',
    avgApprovalUnit: 'days',
    avgApprovalTrend: '▼ 0.4 days faster',
    emergencyChanges: 7,
    emergencySubtext: '5.5% of total volume',
    relatedIncidents: 3,
    incidentTrend: '▼ 2 fewer than last month'
  },
  monthlyData: [
    { month: 'Mar', count: 18, color: '#2563EB' },
    { month: 'Apr', count: 24, color: '#2563EB' },
    { month: 'May', count: 21, color: '#2563EB' },
    { month: 'Jun', count: 32, color: '#0D9488' },
    { month: 'Jul', count: 38, color: '#0D9488' },
    { month: 'Aug', count: 42, color: '#0D9488' }
  ],
  departmentData: [
    { department: 'IT Operations', count: 41, max: 50, color: '#2563EB' },
    { department: 'Engineering', count: 33, max: 50, color: '#0D9488' },
    { department: 'Finance', count: 19, max: 50, color: '#7C3AED' },
    { department: 'HR', count: 11, max: 50, color: '#D97706' },
    { department: 'Sales', count: 7, max: 50, color: '#475569' }
  ]
});
