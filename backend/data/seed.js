// ────────────────────────────────────────────────────────────────
//  Seed data + seeding routine.
//
//  Records are stored raw (no presentation fields); serializers add
//  riskColor / statusBg / etc. Relationship columns use *_id.
//  Tables are filled parent-first so foreign keys resolve.
// ────────────────────────────────────────────────────────────────
import bcrypt from 'bcryptjs';
import { models } from '../models/index.js';

// Every seeded user gets the same dev password (overridable via env).
// Swap this out for Microsoft Entra ID SSO later — see KT_Guide.md.
const DEV_PASSWORD = process.env.SEED_USER_PASSWORD || 'changedesk123';
const DEV_PASSWORD_HASH = bcrypt.hashSync(DEV_PASSWORD, 10);

const NOW = Date.now();
const daysAgo = (n) => new Date(NOW - n * 86_400_000);
const hoursAgo = (n) => new Date(NOW - n * 3_600_000);

// ---------- roles ------------------------------------------
export const roles = [
  { id: 'role-1', name: 'Super Admin', description: 'Ultimate system control across all modules, role & permission management, system audit, database & user management.', permissions: ['Full System Control', 'Manage Roles & Permissions', 'Manage Users', 'View System Audit Logs', 'Override Approvals'] },
  { id: 'role-2', name: 'Admin', description: 'System administration, workflow configuration, catalog management, and change lifecycle oversight.', permissions: ['Manage users', 'Configure workflows', 'Manage Catalogue', 'View all reports'] },
  { id: 'role-3', name: 'CAB Approver', description: 'Member of Change Advisory Board with authority to review, approve, reject, or request information on CRs.', permissions: ['Review assigned CRs', 'Approve/reject CRs', 'Request info (send back)', 'View reports'] },
  { id: 'role-4', name: 'Requester', description: 'Standard employee permission to raise change requests, track progress, and update own draft submissions.', permissions: ['Create change requests', 'View own requests', 'Save draft CRs'] }
];

// ---------- users (roleId -> roles.id) --------------------
export const users = [
  { id: 'usr-0', name: 'Ashish', employeeId: 'EMP-10001', department: 'Executive Management', email: 'ashish.sfc@company.com', status: 'Active', roleId: 'role-1' },
  { id: 'usr-1', name: 'Gauri Shinde', employeeId: 'EMP-10432', department: 'IT Operations', email: 'gauri.shinde@company.com', status: 'Active', roleId: 'role-2' },
  { id: 'usr-2', name: 'Priya Nair', employeeId: 'EMP-10433', department: 'Software Engineering', email: 'priya.nair@company.com', status: 'Active', roleId: 'role-4' },
  { id: 'usr-3', name: 'Arjun Mehta', employeeId: 'EMP-10434', department: 'Cloud Infrastructure', email: 'arjun.mehta@company.com', status: 'Active', roleId: 'role-3' },
  { id: 'usr-4', name: 'Sana Iqbal', employeeId: 'EMP-10435', department: 'Cybersecurity', email: 'sana.iqbal@company.com', status: 'Active', roleId: 'role-2' },
  { id: 'usr-5', name: 'Rahul Verma', employeeId: 'EMP-10436', department: 'Human Resources', email: 'rahul.verma@company.com', status: 'Inactive', roleId: 'role-4' }
].map((u) => ({ ...u, authProvider: 'local', passwordHash: DEV_PASSWORD_HASH }));

// ---------- workflows ------------------------------------
export const workflows = [
  { id: 'wf-1', name: 'Standard Change Workflow', steps: 'Draft → Submitted → CAB Review → Approved → Scheduled → Implemented → Closed' },
  { id: 'wf-2', name: 'Expedited Workflow', steps: 'Draft → Submitted → CAB Review (4hr SLA) → Approved → Implemented → Closed' },
  { id: 'wf-3', name: 'Lightweight Access Workflow', steps: 'Draft → Submitted → Manager Approval → Implemented → Closed' }
];

// ---------- catalog items (workflowId -> workflows.id) --
export const catalogItems = [
  { id: 'CAT-01', title: 'Software Deployment', category: 'Software', description: 'Deploy new releases, hotfixes, or config updates to an existing application or service.', sla: '3 business days', risk: 'Medium', iconBg: '#EBF5FF', iconColor: '#2563EB', status: 'Active', workflowId: 'wf-1' },
  { id: 'CAT-02', title: 'Server Patching', category: 'Infrastructure', description: 'Apply OS-level or security patches to production, staging, or DR servers.', sla: '5 business days', risk: 'High', iconBg: '#D1FAE5', iconColor: '#059669', status: 'Active', workflowId: 'wf-2' },
  { id: 'CAT-03', title: 'Network Change', category: 'Network', description: 'Firewall rules, VLAN, routing, or load-balancer configuration changes.', sla: '5 business days', risk: 'Medium', iconBg: '#F3E8FF', iconColor: '#7C3AED', status: 'Active', workflowId: 'wf-1' },
  { id: 'CAT-04', title: 'Access & Permissions', category: 'Access', description: 'Grant, modify, or revoke system, application, or data access for a user or team.', sla: '1 business day', risk: 'Low', iconBg: '#FEF3C7', iconColor: '#D97706', status: 'Active', workflowId: 'wf-3' },
  { id: 'CAT-05', title: 'Hardware Change', category: 'Infrastructure', description: 'Physical hardware install, replacement, or decommission in a managed data center.', sla: '7 business days', risk: 'Low', iconBg: '#F1F5F9', iconColor: '#475569', status: 'Active', workflowId: 'wf-1' },
  { id: 'CAT-06', title: 'Emergency Change', category: 'Emergency', description: 'Urgent, unplanned change to restore service or prevent imminent outage. Expedited CAB review.', sla: '4 hours', risk: 'High', iconBg: '#FEE2E2', iconColor: '#DC2626', status: 'Active', workflowId: 'wf-2' },
  { id: 'CAT-07', title: 'Database Schema Change', category: 'Software', description: 'Execute DDL migrations, index rebuilds, or column additions against a managed database.', sla: '5 business days', risk: 'High', iconBg: '#EBF5FF', iconColor: '#2563EB', status: 'Active', workflowId: 'wf-1' },
  { id: 'CAT-08', title: 'SSL Certificate Renewal', category: 'Infrastructure', description: 'Renew or rotate production SSL/TLS certificates before expiry.', sla: '2 business days', risk: 'Low', iconBg: '#D1FAE5', iconColor: '#059669', status: 'Active', workflowId: 'wf-1' },
  { id: 'CAT-09', title: 'New Vendor Integration', category: 'Software', description: 'Onboard new third-party webhooks or API connections into the platform.', sla: '10 business days', risk: 'Medium', iconBg: '#EBF5FF', iconColor: '#2563EB', status: 'Active', workflowId: 'wf-1' }
];

// ---------- change requests -----------------------------
export const changeRequests = [
  {
    id: 'CR-2051',
    title: '[Create a New Server] - Server Lifecycle',
    category: 'Server & Infra',
    subCategory: 'Server Lifecycle',
    hostname: 'srv-db-prod-01',
    location: 'Ahmedabad HQ',
    environment: 'Production',
    justification: 'Provision new database server for core trading microservices.',
    contactNumber: '+91 98765 43210',
    managerEmail: 'rahul.verma@company.com',
    startDate: hoursAgo(48),
    endDate: hoursAgo(24),
    risk: 'High',
    status: 'Approved',
    isDraft: false,
    submittedAt: daysAgo(2),
    closedAt: daysAgo(1),
    requesterId: 'usr-2',
    approverId: 'usr-1',
    workflowId: 'wf-1',
    customFieldValues: {
      actionRequired: 'Create a New Server',
      purpose: 'Provision new database server',
      hostingType: 'On-Premise DC',
      operatingSystem: 'Ubuntu 22.04 LTS',
      cpu: '16 Cores',
      ram: '64 GB',
      storage: '1 TB NVMe',
      vlanRequirement: 'Yes',
      backupRequired: 'Yes',
      employeeEmail: 'priya.nair@company.com'
    }
  },
  {
    id: 'CR-2052',
    title: '[Open a Firewall Port] - Firewall / Port',
    category: 'Network & Connectivity',
    subCategory: 'Firewall / Port',
    hostname: 'fw-edge-01',
    location: 'Mumbai DC',
    environment: 'Production',
    justification: 'Open port 8443 for partner API gateway communication.',
    contactNumber: '+91 98765 43211',
    managerEmail: 'rahul.verma@company.com',
    startDate: hoursAgo(12),
    endDate: hoursAgo(2),
    risk: 'Medium',
    status: 'Approved',
    isDraft: false,
    submittedAt: daysAgo(1),
    closedAt: hoursAgo(2),
    requesterId: 'usr-2',
    approverId: 'usr-1',
    workflowId: 'wf-1',
    customFieldValues: {
      actionRequired: 'Open a Firewall Port / Allow Traffic',
      sourceIpSubnet: '10.200.1.0/24',
      destinationIpSubnet: '10.200.5.10/32',
      protocol: 'TCP',
      port: '8443',
      direction: 'Inbound',
      applicationService: 'Partner API Gateway',
      internetFacing: 'Yes',
      purposeReason: 'Partner API Integration',
      employeeEmail: 'priya.nair@company.com'
    }
  },
  {
    id: 'CR-2053',
    title: '[Request Application Access] - Application Access',
    category: 'Access & Security',
    subCategory: 'Application Access',
    hostname: 'app-sso-01',
    location: 'Ahmedabad HQ',
    environment: 'Production',
    justification: 'Grant senior engineer access to staging deployment dashboard.',
    contactNumber: '+91 98765 43212',
    managerEmail: 'rahul.verma@company.com',
    startDate: hoursAgo(6),
    endDate: hoursAgo(1),
    risk: 'Low',
    status: 'Approved',
    isDraft: false,
    submittedAt: hoursAgo(8),
    closedAt: hoursAgo(1),
    requesterId: 'usr-2',
    approverId: 'usr-1',
    workflowId: 'wf-3',
    customFieldValues: {
      actionRequired: 'Request Application Access',
      application: 'Deployment Portal',
      requestedRole: 'Lead Engineer',
      purposeReason: 'Project Onboarding',
      employeeEmail: 'priya.nair@company.com'
    }
  },
  {
    id: 'CR-2054',
    title: '[Upgrade / Patch Server OS] - OS / Patching',
    category: 'Server & Infra',
    subCategory: 'OS / Patching',
    hostname: 'srv-app-prod-03',
    location: 'Ahmedabad HQ',
    environment: 'Production',
    justification: 'Apply Q3 OS kernel security patches.',
    contactNumber: '+91 98765 43213',
    managerEmail: 'rahul.verma@company.com',
    startDate: hoursAgo(3),
    endDate: hoursAgo(1),
    risk: 'High',
    status: 'Rejected',
    isDraft: false,
    rejectionReason: 'Maintenance window conflicts with month-end financial processing.',
    submittedAt: hoursAgo(5),
    closedAt: hoursAgo(1),
    requesterId: 'usr-2',
    approverId: 'usr-1',
    workflowId: 'wf-2',
    customFieldValues: {
      actionRequired: 'Upgrade / Patch Server OS',
      serverName: 'srv-app-prod-03',
      ipAddress: '10.100.2.15',
      currentOsVersion: 'RHEL 8.4',
      targetVersionPatch: 'RHEL 8.8 (KB-2026-99)',
      rebootRequired: 'Yes',
      purposeReason: 'Quarterly OS Patching',
      employeeEmail: 'priya.nair@company.com'
    }
  },
  {
    id: 'CR-2055',
    title: '[Request VPN Access] - VPN',
    category: 'Network & Connectivity',
    subCategory: 'VPN',
    hostname: 'vpn-gw-01',
    location: 'Remote',
    environment: 'Production',
    justification: 'Provision remote SSL VPN access for on-call engineer.',
    contactNumber: '+91 98765 43214',
    managerEmail: 'rahul.verma@company.com',
    startDate: hoursAgo(2),
    endDate: hoursAgo(1),
    risk: 'Medium',
    status: 'Pending',
    isDraft: false,
    submittedAt: hoursAgo(2),
    requesterId: 'usr-2',
    workflowId: 'wf-1',
    customFieldValues: {
      actionRequired: 'Request VPN Access',
      vpnType: 'User VPN (SSL)',
      sourceNetwork: '192.168.1.0/24',
      destinationNetworkApp: '10.100.0.0/16 Internal Subnet',
      employeeEmail: 'priya.nair@company.com'
    }
  }
];

// ---------- audit logs (actorId -> users.id) ------------
// Oldest -> newest so autoincrement id ascends with time.
export const auditLogs = [
  { timestamp: '21 Aug 2026 18:10:05', actorId: 'usr-5', action: 'CR Sent Back', ref: 'CR-2042', detail: 'Requested additional information on network change justification.' },
  { timestamp: '22 Aug 2026 09:20:14', actorId: 'usr-1', action: 'Catalog Template Created', ref: 'CAT-09', detail: 'Added new template CAT-09 New Vendor Integration to Change Catalog.' },
  { timestamp: '23 Aug 2026 16:45:22', actorId: 'usr-3', action: 'CR Approved', ref: 'CR-2048', detail: 'Approved CR-2048 Apply Q3 security patch for prod DB cluster.' },
  { timestamp: '24 Aug 2026 09:15:00', actorId: 'usr-4', action: 'CR Approved', ref: 'CR-2052', detail: 'Approved CR-2052 Rotate SSH keys all bastion hosts.' },
  { timestamp: '24 Aug 2026 11:15:00', actorId: 'usr-4', action: 'User Permission Updated', ref: 'EMP-10435', detail: 'Assigned Admin role permissions to Sana Iqbal.' },
  { timestamp: '24 Aug 2026 14:32:10', actorId: 'usr-2', action: 'Created Change Request', ref: 'CR-2049', detail: 'Submitted CR-2049 Upgrade payment-gateway API to v4 for CAB review.' },
  { timestamp: '25 Aug 2026 14:47:00', actorId: 'usr-3', action: 'CR Rejected', ref: 'CR-2035', detail: 'Rejected CR-2035 Emergency rollback checkout service v2.3 due to incomplete test plan.' },
  { timestamp: '26 Aug 2026 10:20:00', actorId: 'usr-4', action: 'CR Rejected', ref: 'CR-2039', detail: 'Rejected CR-2039 Firewall port unblock request due to security policy.' }
];

// ---------- standalone analytics data ------------------
export const categoryBreakdown = [
  { label: 'Software Deployment', count: 34, max: 40, color: '#2563EB' },
  { label: 'Server / Patching', count: 28, max: 40, color: '#0D9488' },
  { label: 'Network Change', count: 21, max: 40, color: '#7C3AED' },
  { label: 'Access & Permissions', count: 18, max: 40, color: '#B45309' },
  { label: 'Hardware Change', count: 13, max: 40, color: '#475569' },
  { label: 'Emergency Change', count: 7, max: 40, color: '#DC2626' }
];

export const statusBreakdown = [
  { label: 'Approved', count: 76, color: '#0D9488' },
  { label: 'Pending', count: 17, color: '#D97706' },
  { label: 'In progress', count: 21, color: '#7C3AED' },
  { label: 'Rejected', count: 14, color: '#DC2626' }
];

export const monthlyVolume = [
  { month: 'Jan', count: 42, barHeight: '55%' },
  { month: 'Feb', count: 58, barHeight: '72%' },
  { month: 'Mar', count: 64, barHeight: '80%' },
  { month: 'Apr', count: 51, barHeight: '65%' },
  { month: 'May', count: 72, barHeight: '90%' },
  { month: 'Jun', count: 68, barHeight: '85%' },
  { month: 'Jul', count: 80, barHeight: '100%' },
  { month: 'Aug', count: 76, barHeight: '95%' }
].map((row, i) => ({ ...row, sortIndex: i }));

export const departmentVolume = [
  { name: 'Software Engineering', count: 48, percentage: 38, color: '#2563EB' },
  { name: 'Cloud Infrastructure', count: 32, percentage: 25, color: '#0D9488' },
  { name: 'Network Operations', count: 22, percentage: 17, color: '#7C3AED' },
  { name: 'Human Resources & Security', count: 15, percentage: 12, color: '#B45309' },
  { name: 'Finance & Analytics', count: 11, percentage: 8, color: '#475569' }
].map((row, i) => ({ ...row, sortIndex: i }));

export const appConfig = [
  { key: 'dashboard_stats', value: { total: 128, pending: 17, approved: 76, inProgress: 21, rejected: 14 } },
  { key: 'worklist_metrics', value: { pending: 4, approved: 32, rejected: 6, sentBack: 3 } },
  {
    key: 'report_metrics',
    value: { approvalRate: '94.2%', avgLeadTime: '2.4 days', emergencyCount: 4, complianceScore: '99.1%' }
  }
];

/**
 * Populate every table, parent-first. Safe to re-run: with `force` the
 * caller has already dropped + recreated tables; otherwise each table is
 * only filled when empty.
 */
export const catalogCategories = [
  { id: 'cat-srv', name: 'Server & Infra', description: 'Server lifecycle, OS patching, and compute infrastructure changes', sortOrder: 1 },
  { id: 'cat-net', name: 'Network & Connectivity', description: 'Firewall rules, Proxy/URL access, VPN, and network changes', sortOrder: 2 },
  { id: 'cat-acc', name: 'Access & Security', description: 'Application access, physical access, and security entitlements', sortOrder: 3 },
  { id: 'cat-asset', name: 'IT Asset', description: 'Laptops, desktops, hardware accessories, software, and licenses', sortOrder: 4 },
  { id: 'cat-o365', name: 'Office 365 & Collaboration', description: 'Exchange mailboxes, email aliases, and M365 license management', sortOrder: 5 },
  { id: 'cat-sec', name: 'Security Tools & Policies', description: 'Endpoint security agents, policies, and exemption requests', sortOrder: 6 }
];

export const catalogSubcategories = [
  // 1. Server & Infra
  { id: 'subcat-srv-lc', categoryId: 'cat-srv', name: 'Server Lifecycle', sla: '3 business days', risk: 'Medium', workflowId: 'wf-1', status: 'Active' },
  { id: 'subcat-srv-patch', categoryId: 'cat-srv', name: 'OS / Patching', sla: '5 business days', risk: 'High', workflowId: 'wf-2', status: 'Active' },
  { id: 'subcat-srv-oth', categoryId: 'cat-srv', name: 'Other', sla: '3 business days', risk: 'Medium', workflowId: 'wf-1', status: 'Active' },

  // 2. Network & Connectivity
  { id: 'subcat-net-fw', categoryId: 'cat-net', name: 'Firewall / Port', sla: '2 business days', risk: 'Medium', workflowId: 'wf-1', status: 'Active' },
  { id: 'subcat-net-proxy', categoryId: 'cat-net', name: 'Proxy / URL Access', sla: '1 business day', risk: 'Low', workflowId: 'wf-3', status: 'Active' },
  { id: 'subcat-net-vpn', categoryId: 'cat-net', name: 'VPN', sla: '2 business days', risk: 'Medium', workflowId: 'wf-1', status: 'Active' },
  { id: 'subcat-net-oth', categoryId: 'cat-net', name: 'Other', sla: '3 business days', risk: 'Medium', workflowId: 'wf-1', status: 'Active' },

  // 3. Access & Security
  { id: 'subcat-acc-app', categoryId: 'cat-acc', name: 'Application Access', sla: '1 business day', risk: 'Low', workflowId: 'wf-3', status: 'Active' },
  { id: 'subcat-acc-phys', categoryId: 'cat-acc', name: 'Physical Access', sla: '1 business day', risk: 'Low', workflowId: 'wf-3', status: 'Active' },
  { id: 'subcat-acc-oth', categoryId: 'cat-acc', name: 'Other', sla: '2 business days', risk: 'Medium', workflowId: 'wf-1', status: 'Active' },

  // 4. IT Asset
  { id: 'subcat-asset-dev', categoryId: 'cat-asset', name: 'Laptop / Desktop', sla: '5 business days', risk: 'Low', workflowId: 'wf-1', status: 'Active' },
  { id: 'subcat-asset-hw', categoryId: 'cat-asset', name: 'Other IT Hardware', sla: '5 business days', risk: 'Low', workflowId: 'wf-1', status: 'Active' },
  { id: 'subcat-asset-sw', categoryId: 'cat-asset', name: 'Software', sla: '3 business days', risk: 'Medium', workflowId: 'wf-1', status: 'Active' },
  { id: 'subcat-asset-lic', categoryId: 'cat-asset', name: 'License', sla: '2 business days', risk: 'Low', workflowId: 'wf-3', status: 'Active' },
  { id: 'subcat-asset-oth', categoryId: 'cat-asset', name: 'Other', sla: '3 business days', risk: 'Low', workflowId: 'wf-1', status: 'Active' },

  // 5. Office 365 & Collaboration
  { id: 'subcat-o365-mb', categoryId: 'cat-o365', name: 'Mailbox', sla: '1 business day', risk: 'Low', workflowId: 'wf-3', status: 'Active' },
  { id: 'subcat-o365-lic', categoryId: 'cat-o365', name: 'M365 License', sla: '1 business day', risk: 'Low', workflowId: 'wf-3', status: 'Active' },
  { id: 'subcat-o365-oth', categoryId: 'cat-o365', name: 'Other', sla: '2 business days', risk: 'Low', workflowId: 'wf-3', status: 'Active' },

  // 6. Security Tools & Policies
  { id: 'subcat-sec-ep', categoryId: 'cat-sec', name: 'End Point Agent', sla: '2 business days', risk: 'High', workflowId: 'wf-2', status: 'Active' },
  { id: 'subcat-sec-oth', categoryId: 'cat-sec', name: 'Other', sla: '3 business days', risk: 'High', workflowId: 'wf-2', status: 'Active' }
];

export const catalogSubcategoryFields = [
  // ── 1. Server Lifecycle ──
  { id: 'f-srv-act', subcategoryId: 'subcat-srv-lc', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Create a New Server', 'Change / Modify an Existing Server', 'Migrate a Server', 'Decommission a Server', 'Other'] },
  { id: 'f-srv-purpose', subcategoryId: 'subcat-srv-lc', fieldKey: 'purpose', fieldLabel: 'Purpose', fieldType: 'text', isRequired: true, sortOrder: 1, appliesToActions: ['Create a New Server'], options: null },
  { id: 'f-srv-hosting', subcategoryId: 'subcat-srv-lc', fieldKey: 'hostingType', fieldLabel: 'Hosting Type', fieldType: 'dropdown', isRequired: true, sortOrder: 2, appliesToActions: ['Create a New Server', 'Change / Modify an Existing Server', 'Migrate a Server'], options: ['On-Premise DC', 'AWS Cloud', 'Azure Cloud', 'Private Cloud'] },
  { id: 'f-srv-os', subcategoryId: 'subcat-srv-lc', fieldKey: 'operatingSystem', fieldLabel: 'OS', fieldType: 'text', isRequired: true, sortOrder: 3, appliesToActions: ['Create a New Server', 'Change / Modify an Existing Server'], options: null },
  { id: 'f-srv-cpu', subcategoryId: 'subcat-srv-lc', fieldKey: 'cpu', fieldLabel: 'CPU', fieldType: 'text', isRequired: true, sortOrder: 4, appliesToActions: ['Create a New Server', 'Change / Modify an Existing Server'], options: null },
  { id: 'f-srv-ram', subcategoryId: 'subcat-srv-lc', fieldKey: 'ram', fieldLabel: 'RAM', fieldType: 'text', isRequired: true, sortOrder: 5, appliesToActions: ['Create a New Server', 'Change / Modify an Existing Server'], options: null },
  { id: 'f-srv-storage', subcategoryId: 'subcat-srv-lc', fieldKey: 'storage', fieldLabel: 'Storage', fieldType: 'text', isRequired: true, sortOrder: 6, appliesToActions: ['Create a New Server', 'Change / Modify an Existing Server'], options: null },
  { id: 'f-srv-vlan', subcategoryId: 'subcat-srv-lc', fieldKey: 'vlanRequirement', fieldLabel: 'IP/VLAN Requirement?', fieldType: 'dropdown', isRequired: true, sortOrder: 7, appliesToActions: ['Create a New Server', 'Change / Modify an Existing Server'], options: ['Yes', 'No'] },
  { id: 'f-srv-backup', subcategoryId: 'subcat-srv-lc', fieldKey: 'backupRequired', fieldLabel: 'Backup Required?', fieldType: 'dropdown', isRequired: true, sortOrder: 8, appliesToActions: ['Create a New Server', 'Change / Modify an Existing Server'], options: ['Yes', 'No'] },
  { id: 'f-srv-name', subcategoryId: 'subcat-srv-lc', fieldKey: 'serverName', fieldLabel: 'Server Name', fieldType: 'text', isRequired: true, sortOrder: 9, appliesToActions: ['Change / Modify an Existing Server', 'Migrate a Server', 'Decommission a Server'], options: null },
  { id: 'f-srv-ip', subcategoryId: 'subcat-srv-lc', fieldKey: 'ipAddress', fieldLabel: 'IP Address', fieldType: 'text', isRequired: true, sortOrder: 10, appliesToActions: ['Change / Modify an Existing Server', 'Migrate a Server', 'Decommission a Server'], options: null },
  { id: 'f-srv-reason', subcategoryId: 'subcat-srv-lc', fieldKey: 'purposeReason', fieldLabel: 'Purpose/Reason', fieldType: 'text', isRequired: true, sortOrder: 11, appliesToActions: ['Change / Modify an Existing Server', 'Migrate a Server', 'Decommission a Server'], options: null },

  // ── 2. OS / Patching ──
  { id: 'f-patch-act', subcategoryId: 'subcat-srv-patch', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Upgrade / Patch Server OS', 'Other'] },
  { id: 'f-patch-srvname', subcategoryId: 'subcat-srv-patch', fieldKey: 'serverName', fieldLabel: 'Server Name', fieldType: 'text', isRequired: true, sortOrder: 1, appliesToActions: ['Upgrade / Patch Server OS'], options: null },
  { id: 'f-patch-ip', subcategoryId: 'subcat-srv-patch', fieldKey: 'ipAddress', fieldLabel: 'IP Address', fieldType: 'text', isRequired: true, sortOrder: 2, appliesToActions: ['Upgrade / Patch Server OS'], options: null },
  { id: 'f-patch-curos', subcategoryId: 'subcat-srv-patch', fieldKey: 'currentOsVersion', fieldLabel: 'Current OS/Version', fieldType: 'text', isRequired: true, sortOrder: 3, appliesToActions: ['Upgrade / Patch Server OS'], options: null },
  { id: 'f-patch-tgtos', subcategoryId: 'subcat-srv-patch', fieldKey: 'targetVersionPatch', fieldLabel: 'Target Version/Patch', fieldType: 'text', isRequired: true, sortOrder: 4, appliesToActions: ['Upgrade / Patch Server OS'], options: null },
  { id: 'f-patch-cve', subcategoryId: 'subcat-srv-patch', fieldKey: 'kbCve', fieldLabel: 'KB/CVE (If Applicable)', fieldType: 'text', isRequired: false, sortOrder: 5, appliesToActions: ['Upgrade / Patch Server OS'], options: null },
  { id: 'f-patch-reboot', subcategoryId: 'subcat-srv-patch', fieldKey: 'rebootRequired', fieldLabel: 'Reboot Required?', fieldType: 'dropdown', isRequired: true, sortOrder: 6, appliesToActions: ['Upgrade / Patch Server OS'], options: ['Yes', 'No'] },
  { id: 'f-patch-reason', subcategoryId: 'subcat-srv-patch', fieldKey: 'purposeReason', fieldLabel: 'Purpose/Reason', fieldType: 'text', isRequired: true, sortOrder: 7, appliesToActions: ['Upgrade / Patch Server OS'], options: null },

  // ── 3. Server Other ──
  { id: 'f-srvoth-act', subcategoryId: 'subcat-srv-oth', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Any other changes related to server', 'Other'] },
  { id: 'f-srvoth-desc', subcategoryId: 'subcat-srv-oth', fieldKey: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: true, sortOrder: 1, appliesToActions: ['Any other changes related to server'], options: null },

  // ── 4. Firewall / Port ──
  { id: 'f-fw-act', subcategoryId: 'subcat-net-fw', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Open a Firewall Port / Allow Traffic', 'Modify existing Firewall Rule', 'Close Firewall Port / Remove Rule', 'Other'] },
  { id: 'f-fw-src', subcategoryId: 'subcat-net-fw', fieldKey: 'sourceIpSubnet', fieldLabel: 'Source IP/ Subnet', fieldType: 'text', isRequired: true, sortOrder: 1, appliesToActions: ['Open a Firewall Port / Allow Traffic', 'Modify existing Firewall Rule', 'Close Firewall Port / Remove Rule'], options: null },
  { id: 'f-fw-dst', subcategoryId: 'subcat-net-fw', fieldKey: 'destinationIpSubnet', fieldLabel: 'Destination IP / Subnet', fieldType: 'text', isRequired: true, sortOrder: 2, appliesToActions: ['Open a Firewall Port / Allow Traffic', 'Modify existing Firewall Rule', 'Close Firewall Port / Remove Rule'], options: null },
  { id: 'f-fw-proto', subcategoryId: 'subcat-net-fw', fieldKey: 'protocol', fieldLabel: 'Protocol', fieldType: 'dropdown', isRequired: true, sortOrder: 3, appliesToActions: ['Open a Firewall Port / Allow Traffic', 'Modify existing Firewall Rule'], options: ['TCP', 'UDP', 'ICMP', 'ANY'] },
  { id: 'f-fw-port', subcategoryId: 'subcat-net-fw', fieldKey: 'port', fieldLabel: 'Port', fieldType: 'text', isRequired: true, sortOrder: 4, appliesToActions: ['Open a Firewall Port / Allow Traffic', 'Modify existing Firewall Rule', 'Close Firewall Port / Remove Rule'], options: null },
  { id: 'f-fw-dir', subcategoryId: 'subcat-net-fw', fieldKey: 'direction', fieldLabel: 'Direction', fieldType: 'dropdown', isRequired: true, sortOrder: 5, appliesToActions: ['Open a Firewall Port / Allow Traffic', 'Modify existing Firewall Rule'], options: ['Inbound', 'Outbound', 'Bi-directional'] },
  { id: 'f-fw-app', subcategoryId: 'subcat-net-fw', fieldKey: 'applicationService', fieldLabel: 'Application / Service', fieldType: 'text', isRequired: true, sortOrder: 6, appliesToActions: ['Open a Firewall Port / Allow Traffic', 'Modify existing Firewall Rule'], options: null },
  { id: 'f-fw-internet', subcategoryId: 'subcat-net-fw', fieldKey: 'internetFacing', fieldLabel: 'Internet Facing (Y/N)', fieldType: 'dropdown', isRequired: true, sortOrder: 7, appliesToActions: ['Open a Firewall Port / Allow Traffic', 'Modify existing Firewall Rule'], options: ['Yes', 'No'] },
  { id: 'f-fw-reason', subcategoryId: 'subcat-net-fw', fieldKey: 'purposeReason', fieldLabel: 'Purpose / Reason', fieldType: 'text', isRequired: true, sortOrder: 8, appliesToActions: ['Open a Firewall Port / Allow Traffic', 'Modify existing Firewall Rule', 'Close Firewall Port / Remove Rule'], options: null },

  // ── 5. Proxy / URL Access ──
  { id: 'f-proxy-act', subcategoryId: 'subcat-net-proxy', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Allow Website / URL', 'Block Website / URL', 'Other'] },
  { id: 'f-proxy-cat', subcategoryId: 'subcat-net-proxy', fieldKey: 'category', fieldLabel: 'Category', fieldType: 'text', isRequired: true, sortOrder: 1, appliesToActions: ['Allow Website / URL', 'Block Website / URL'], options: null },
  { id: 'f-proxy-url', subcategoryId: 'subcat-net-proxy', fieldKey: 'url', fieldLabel: 'URL', fieldType: 'text', isRequired: true, sortOrder: 2, appliesToActions: ['Allow Website / URL', 'Block Website / URL'], options: null },
  { id: 'f-proxy-reason', subcategoryId: 'subcat-net-proxy', fieldKey: 'purposeReason', fieldLabel: 'Purpose / Reason', fieldType: 'text', isRequired: true, sortOrder: 3, appliesToActions: ['Allow Website / URL', 'Block Website / URL'], options: null },

  // ── 6. VPN ──
  { id: 'f-vpn-act', subcategoryId: 'subcat-net-vpn', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Request VPN Access', 'Modify / Revoke VPN Access', 'Other'] },
  { id: 'f-vpn-type', subcategoryId: 'subcat-net-vpn', fieldKey: 'vpnType', fieldLabel: 'VPN Type', fieldType: 'dropdown', isRequired: true, sortOrder: 1, appliesToActions: ['Request VPN Access', 'Modify / Revoke VPN Access'], options: ['User VPN (SSL)', 'Site-to-Site IPsec', 'IPsec Client'] },
  { id: 'f-vpn-src', subcategoryId: 'subcat-net-vpn', fieldKey: 'sourceNetwork', fieldLabel: 'Source Network', fieldType: 'text', isRequired: true, sortOrder: 2, appliesToActions: ['Request VPN Access', 'Modify / Revoke VPN Access'], options: null },
  { id: 'f-vpn-dst', subcategoryId: 'subcat-net-vpn', fieldKey: 'destinationNetworkApp', fieldLabel: 'Destination Network/Application', fieldType: 'text', isRequired: true, sortOrder: 3, appliesToActions: ['Request VPN Access', 'Modify / Revoke VPN Access'], options: null },

  // ── 7. Network Other ──
  { id: 'f-netoth-act', subcategoryId: 'subcat-net-oth', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Other Network related change', 'Other'] },
  { id: 'f-netoth-desc', subcategoryId: 'subcat-net-oth', fieldKey: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: true, sortOrder: 1, appliesToActions: ['Other Network related change'], options: null },

  // ── 8. Application Access ──
  { id: 'f-appacc-act', subcategoryId: 'subcat-acc-app', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Request Application Access', 'Change Existing Access', 'Revoke Application Access', 'Other'] },
  { id: 'f-appacc-app', subcategoryId: 'subcat-acc-app', fieldKey: 'application', fieldLabel: 'Application', fieldType: 'text', isRequired: true, sortOrder: 1, appliesToActions: ['Request Application Access', 'Change Existing Access', 'Revoke Application Access'], options: null },
  { id: 'f-appacc-currole', subcategoryId: 'subcat-acc-app', fieldKey: 'currentRole', fieldLabel: 'Current Role', fieldType: 'text', isRequired: true, sortOrder: 2, appliesToActions: ['Change Existing Access'], options: null },
  { id: 'f-appacc-reqrole', subcategoryId: 'subcat-acc-app', fieldKey: 'requestedRole', fieldLabel: 'Requested Role', fieldType: 'text', isRequired: true, sortOrder: 3, appliesToActions: ['Request Application Access', 'Change Existing Access'], options: null },
  { id: 'f-appacc-userIdentity', subcategoryId: 'subcat-acc-app', fieldKey: 'userIdentity', fieldLabel: 'User Identity', fieldType: 'text', isRequired: true, sortOrder: 4, appliesToActions: ['Revoke Application Access'], options: null },
  { id: 'f-appacc-reason', subcategoryId: 'subcat-acc-app', fieldKey: 'purposeReason', fieldLabel: 'Purpose / Reason', fieldType: 'text', isRequired: true, sortOrder: 5, appliesToActions: ['Request Application Access', 'Change Existing Access', 'Revoke Application Access'], options: null },

  // ── 9. Physical Access ──
  { id: 'f-physacc-act', subcategoryId: 'subcat-acc-phys', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Request Physical Access', 'Modify Physical Access', 'Revoke Physical Access', 'Other'] },
  { id: 'f-physacc-user', subcategoryId: 'subcat-acc-phys', fieldKey: 'userIdentity', fieldLabel: 'User Identity', fieldType: 'text', isRequired: true, sortOrder: 1, appliesToActions: ['Request Physical Access', 'Modify Physical Access', 'Revoke Physical Access'], options: null },
  { id: 'f-physacc-curacc', subcategoryId: 'subcat-acc-phys', fieldKey: 'currentAccess', fieldLabel: 'Current Access', fieldType: 'text', isRequired: true, sortOrder: 2, appliesToActions: ['Modify Physical Access'], options: null },
  { id: 'f-physacc-reqacc', subcategoryId: 'subcat-acc-phys', fieldKey: 'requestedAccess', fieldLabel: 'Requested Access', fieldType: 'text', isRequired: true, sortOrder: 3, appliesToActions: ['Request Physical Access', 'Modify Physical Access'], options: null },
  { id: 'f-physacc-rvkacc', subcategoryId: 'subcat-acc-phys', fieldKey: 'revokeAccess', fieldLabel: 'Revoke Access', fieldType: 'text', isRequired: true, sortOrder: 4, appliesToActions: ['Revoke Physical Access'], options: null },
  { id: 'f-physacc-reason', subcategoryId: 'subcat-acc-phys', fieldKey: 'purposeReason', fieldLabel: 'Purpose / Reason', fieldType: 'text', isRequired: true, sortOrder: 5, appliesToActions: ['Request Physical Access', 'Modify Physical Access', 'Revoke Physical Access'], options: null },

  // ── 10. Access Other ──
  { id: 'f-accoth-act', subcategoryId: 'subcat-acc-oth', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Other Access & Security related request', 'Other'] },
  { id: 'f-accoth-desc', subcategoryId: 'subcat-acc-oth', fieldKey: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: true, sortOrder: 1, appliesToActions: ['Other Access & Security related request'], options: null },

  // ── 11. Laptop / Desktop ──
  { id: 'f-dev-act', subcategoryId: 'subcat-asset-dev', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Request for Procurement of Laptop / Desktop', 'Replace Exisitng Laptop / Desktop', 'Repair Request', 'Dispose Request', 'Other'] },
  { id: 'f-dev-assettype', subcategoryId: 'subcat-asset-dev', fieldKey: 'assetType', fieldLabel: 'Asset Type', fieldType: 'dropdown', isRequired: true, sortOrder: 1, appliesToActions: ['Request for Procurement of Laptop / Desktop'], options: ['Laptop', 'Desktop', 'Workstation'] },
  { id: 'f-dev-reqcfg', subcategoryId: 'subcat-asset-dev', fieldKey: 'requestedConfiguration', fieldLabel: 'Requested Configuration', fieldType: 'text', isRequired: true, sortOrder: 2, appliesToActions: ['Request for Procurement of Laptop / Desktop', 'Replace Exisitng Laptop / Desktop'], options: null },
  { id: 'f-dev-qty', subcategoryId: 'subcat-asset-dev', fieldKey: 'qtyRequired', fieldLabel: 'Qty Required', fieldType: 'text', isRequired: true, sortOrder: 3, appliesToActions: ['Request for Procurement of Laptop / Desktop'], options: null },
  { id: 'f-dev-loc', subcategoryId: 'subcat-asset-dev', fieldKey: 'location', fieldLabel: 'Location', fieldType: 'text', isRequired: true, sortOrder: 4, appliesToActions: ['Request for Procurement of Laptop / Desktop'], options: null },
  { id: 'f-dev-stock', subcategoryId: 'subcat-asset-dev', fieldKey: 'currentQtyInStock', fieldLabel: 'Current Qty in Stock', fieldType: 'text', isRequired: true, sortOrder: 5, appliesToActions: ['Request for Procurement of Laptop / Desktop'], options: null },
  { id: 'f-dev-replreason', subcategoryId: 'subcat-asset-dev', fieldKey: 'replacementPurposeReason', fieldLabel: 'Replacement Purpose / Reason', fieldType: 'text', isRequired: true, sortOrder: 6, appliesToActions: ['Replace Exisitng Laptop / Desktop'], options: null },
  { id: 'f-dev-curcfg', subcategoryId: 'subcat-asset-dev', fieldKey: 'currentConfiguration', fieldLabel: 'Current Congfiguraiton', fieldType: 'text', isRequired: true, sortOrder: 7, appliesToActions: ['Replace Exisitng Laptop / Desktop'], options: null },
  { id: 'f-dev-assetid', subcategoryId: 'subcat-asset-dev', fieldKey: 'existingAssetId', fieldLabel: 'Existing Asset ID', fieldType: 'text', isRequired: true, sortOrder: 8, appliesToActions: ['Replace Exisitng Laptop / Desktop', 'Repair Request', 'Dispose Request'], options: null },
  { id: 'f-dev-repairreason', subcategoryId: 'subcat-asset-dev', fieldKey: 'purposeReason', fieldLabel: 'purpose / Reason', fieldType: 'text', isRequired: true, sortOrder: 9, appliesToActions: ['Repair Request'], options: null },
  { id: 'f-dev-purchdate', subcategoryId: 'subcat-asset-dev', fieldKey: 'dateOfPurchase', fieldLabel: 'Date of Purchase', fieldType: 'text', isRequired: true, sortOrder: 10, appliesToActions: ['Dispose Request'], options: null },
  { id: 'f-dev-dispreason', subcategoryId: 'subcat-asset-dev', fieldKey: 'disposalReason', fieldLabel: 'Disposal Reason', fieldType: 'text', isRequired: true, sortOrder: 11, appliesToActions: ['Dispose Request'], options: null },

  // ── 12. Other IT Hardware ──
  { id: 'f-hw-act', subcategoryId: 'subcat-asset-hw', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Request for procurement of IT Hardware / Accessories', 'Request for allotment of IT Hardware / Accessories', 'Return IT Asset', 'Repair Request', 'Dispose Request', 'Other'] },
  { id: 'f-hw-assettype', subcategoryId: 'subcat-asset-hw', fieldKey: 'assetType', fieldLabel: 'Asset Type', fieldType: 'text', isRequired: true, sortOrder: 1, appliesToActions: ['Request for procurement of IT Hardware / Accessories', 'Request for allotment of IT Hardware / Accessories', 'Return IT Asset'], options: null },
  { id: 'f-hw-reqcfg', subcategoryId: 'subcat-asset-hw', fieldKey: 'requestedConfiguration', fieldLabel: 'Requested Configuration', fieldType: 'text', isRequired: true, sortOrder: 2, appliesToActions: ['Request for procurement of IT Hardware / Accessories', 'Request for allotment of IT Hardware / Accessories'], options: null },
  { id: 'f-hw-qty', subcategoryId: 'subcat-asset-hw', fieldKey: 'qtyRequired', fieldLabel: 'Qty Required', fieldType: 'text', isRequired: true, sortOrder: 3, appliesToActions: ['Request for procurement of IT Hardware / Accessories'], options: null },
  { id: 'f-hw-loc', subcategoryId: 'subcat-asset-hw', fieldKey: 'location', fieldLabel: 'Location', fieldType: 'text', isRequired: true, sortOrder: 4, appliesToActions: ['Request for procurement of IT Hardware / Accessories'], options: null },
  { id: 'f-hw-stock', subcategoryId: 'subcat-asset-hw', fieldKey: 'currentQtyInStock', fieldLabel: 'Current Qty in Stock', fieldType: 'text', isRequired: true, sortOrder: 5, appliesToActions: ['Request for procurement of IT Hardware / Accessories'], options: null },
  { id: 'f-hw-reason', subcategoryId: 'subcat-asset-hw', fieldKey: 'purposeReason', fieldLabel: 'Purpose / Reason', fieldType: 'text', isRequired: true, sortOrder: 6, appliesToActions: ['Request for allotment of IT Hardware / Accessories', 'Return IT Asset', 'Repair Request'], options: null },
  { id: 'f-hw-returncfg', subcategoryId: 'subcat-asset-hw', fieldKey: 'returnAssetConfiguration', fieldLabel: 'Return Asset Configuration', fieldType: 'text', isRequired: true, sortOrder: 7, appliesToActions: ['Return IT Asset'], options: null },
  { id: 'f-hw-assetid', subcategoryId: 'subcat-asset-hw', fieldKey: 'assetId', fieldLabel: 'Asset ID', fieldType: 'text', isRequired: true, sortOrder: 8, appliesToActions: ['Repair Request', 'Dispose Request'], options: null },
  { id: 'f-hw-purchdate', subcategoryId: 'subcat-asset-hw', fieldKey: 'dateOfPurchase', fieldLabel: 'Date of Purchase', fieldType: 'text', isRequired: true, sortOrder: 9, appliesToActions: ['Dispose Request'], options: null },
  { id: 'f-hw-dispreason', subcategoryId: 'subcat-asset-hw', fieldKey: 'disposalReason', fieldLabel: 'Disposal Reason', fieldType: 'text', isRequired: true, sortOrder: 10, appliesToActions: ['Dispose Request'], options: null },

  // ── 13. Software ──
  { id: 'f-sw-act', subcategoryId: 'subcat-asset-sw', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Install / Upgrade a Software', 'Other'] },
  { id: 'f-sw-devid', subcategoryId: 'subcat-asset-sw', fieldKey: 'deviceId', fieldLabel: 'Device ID', fieldType: 'text', isRequired: true, sortOrder: 1, appliesToActions: ['Install / Upgrade a Software'], options: null },
  { id: 'f-sw-host', subcategoryId: 'subcat-asset-sw', fieldKey: 'hostName', fieldLabel: 'Host Name', fieldType: 'text', isRequired: true, sortOrder: 2, appliesToActions: ['Install / Upgrade a Software'], options: null },
  { id: 'f-sw-name', subcategoryId: 'subcat-asset-sw', fieldKey: 'softwareName', fieldLabel: 'Software Name', fieldType: 'text', isRequired: true, sortOrder: 3, appliesToActions: ['Install / Upgrade a Software'], options: null },
  { id: 'f-sw-reqver', subcategoryId: 'subcat-asset-sw', fieldKey: 'requestedVersion', fieldLabel: 'Requested Version', fieldType: 'text', isRequired: true, sortOrder: 4, appliesToActions: ['Install / Upgrade a Software'], options: null },
  { id: 'f-sw-curver', subcategoryId: 'subcat-asset-sw', fieldKey: 'currentVersion', fieldLabel: 'Current Version', fieldType: 'text', isRequired: false, sortOrder: 5, appliesToActions: ['Install / Upgrade a Software'], options: null },
  { id: 'f-sw-licensed', subcategoryId: 'subcat-asset-sw', fieldKey: 'licensedYn', fieldLabel: 'Licensed? (Y/N)', fieldType: 'dropdown', isRequired: true, sortOrder: 6, appliesToActions: ['Install / Upgrade a Software'], options: ['Yes', 'No'] },
  { id: 'f-sw-reason', subcategoryId: 'subcat-asset-sw', fieldKey: 'purposeReason', fieldLabel: 'Purpose / Reason', fieldType: 'text', isRequired: true, sortOrder: 7, appliesToActions: ['Install / Upgrade a Software'], options: null },

  // ── 14. License ──
  { id: 'f-lic-act', subcategoryId: 'subcat-asset-lic', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Procure / Renew Software License', 'Other'] },
  { id: 'f-lic-vendor', subcategoryId: 'subcat-asset-lic', fieldKey: 'vendor', fieldLabel: 'Vendor', fieldType: 'text', isRequired: true, sortOrder: 1, appliesToActions: ['Procure / Renew Software License'], options: null },
  { id: 'f-lic-type', subcategoryId: 'subcat-asset-lic', fieldKey: 'licenseType', fieldLabel: 'License Type', fieldType: 'text', isRequired: true, sortOrder: 2, appliesToActions: ['Procure / Renew Software License'], options: null },
  { id: 'f-lic-qty', subcategoryId: 'subcat-asset-lic', fieldKey: 'noOfLicense', fieldLabel: 'No. of License', fieldType: 'text', isRequired: true, sortOrder: 3, appliesToActions: ['Procure / Renew Software License'], options: null },
  { id: 'f-lic-reason', subcategoryId: 'subcat-asset-lic', fieldKey: 'purposeReason', fieldLabel: 'Purpose / Reason', fieldType: 'text', isRequired: true, sortOrder: 4, appliesToActions: ['Procure / Renew Software License'], options: null },

  // ── 15. IT Asset Other ──
  { id: 'f-assetoth-act', subcategoryId: 'subcat-asset-oth', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Other IT Asset related request', 'Other'] },
  { id: 'f-assetoth-desc', subcategoryId: 'subcat-asset-oth', fieldKey: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: true, sortOrder: 1, appliesToActions: ['Other IT Asset related request'], options: null },

  // ── 16. Mailbox ──
  { id: 'f-mb-act', subcategoryId: 'subcat-o365-mb', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Create an Email ID', 'Add Email Alias', 'Disable / Revoke Mailbox', 'Other'] },
  { id: 'f-mb-name', subcategoryId: 'subcat-o365-mb', fieldKey: 'name', fieldLabel: 'Name', fieldType: 'text', isRequired: true, sortOrder: 1, appliesToActions: ['Create an Email ID', 'Disable / Revoke Mailbox'], options: null },
  { id: 'f-mb-reqemail', subcategoryId: 'subcat-o365-mb', fieldKey: 'emailIdRequired', fieldLabel: 'Email ID Required', fieldType: 'text', isRequired: true, sortOrder: 2, appliesToActions: ['Create an Email ID'], options: null },
  { id: 'f-mb-email', subcategoryId: 'subcat-o365-mb', fieldKey: 'emailId', fieldLabel: 'Email ID', fieldType: 'text', isRequired: true, sortOrder: 3, appliesToActions: ['Add Email Alias', 'Disable / Revoke Mailbox'], options: null },
  { id: 'f-mb-alias', subcategoryId: 'subcat-o365-mb', fieldKey: 'alias', fieldLabel: 'Alias', fieldType: 'text', isRequired: true, sortOrder: 4, appliesToActions: ['Add Email Alias'], options: null },
  { id: 'f-mb-reason', subcategoryId: 'subcat-o365-mb', fieldKey: 'purposeReason', fieldLabel: 'Purpose / Reason', fieldType: 'text', isRequired: true, sortOrder: 5, appliesToActions: ['Create an Email ID', 'Add Email Alias', 'Disable / Revoke Mailbox'], options: null },

  // ── 17. M365 License ──
  { id: 'f-m365lic-act', subcategoryId: 'subcat-o365-lic', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Request M365 License', 'Upgrade / Downgrade M365 License', 'Remove M365 License', 'Other'] },
  { id: 'f-m365lic-email', subcategoryId: 'subcat-o365-lic', fieldKey: 'emailId', fieldLabel: 'Email ID', fieldType: 'text', isRequired: true, sortOrder: 1, appliesToActions: ['Request M365 License', 'Upgrade / Downgrade M365 License', 'Remove M365 License'], options: null },
  { id: 'f-m365lic-type', subcategoryId: 'subcat-o365-lic', fieldKey: 'licenseType', fieldLabel: 'License Type', fieldType: 'text', isRequired: true, sortOrder: 2, appliesToActions: ['Request M365 License'], options: null },
  { id: 'f-m365lic-curtype', subcategoryId: 'subcat-o365-lic', fieldKey: 'currentLicenseType', fieldLabel: 'Current License Type', fieldType: 'text', isRequired: true, sortOrder: 3, appliesToActions: ['Upgrade / Downgrade M365 License'], options: null },
  { id: 'f-m365lic-reqtype', subcategoryId: 'subcat-o365-lic', fieldKey: 'requestedLicenseType', fieldLabel: 'Requested License Type', fieldType: 'text', isRequired: true, sortOrder: 4, appliesToActions: ['Upgrade / Downgrade M365 License'], options: null },
  { id: 'f-m365lic-name', subcategoryId: 'subcat-o365-lic', fieldKey: 'name', fieldLabel: 'Name', fieldType: 'text', isRequired: true, sortOrder: 5, appliesToActions: ['Remove M365 License'], options: null },
  { id: 'f-m365lic-reason', subcategoryId: 'subcat-o365-lic', fieldKey: 'purposeReason', fieldLabel: 'Purpose / Reason', fieldType: 'text', isRequired: true, sortOrder: 6, appliesToActions: ['Request M365 License', 'Upgrade / Downgrade M365 License', 'Remove M365 License'], options: null },

  // ── 18. O365 Other ──
  { id: 'f-o365oth-act', subcategoryId: 'subcat-o365-oth', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Other Email/M365 related request', 'Other'] },
  { id: 'f-o365oth-desc', subcategoryId: 'subcat-o365-oth', fieldKey: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: true, sortOrder: 1, appliesToActions: ['Other Email/M365 related request'], options: null },

  // ── 19. End Point Agent ──
  { id: 'f-ep-act', subcategoryId: 'subcat-sec-ep', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Remove Security / Endpoint Agent', 'Modify Endpoint Security Policy', 'Request Exception in Security Policy', 'Other'] },
  { id: 'f-ep-tool', subcategoryId: 'subcat-sec-ep', fieldKey: 'toolName', fieldLabel: 'Tool Name', fieldType: 'text', isRequired: true, sortOrder: 1, appliesToActions: ['Remove Security / Endpoint Agent', 'Modify Endpoint Security Policy', 'Request Exception in Security Policy'], options: null },
  { id: 'f-ep-devid', subcategoryId: 'subcat-sec-ep', fieldKey: 'deviceId', fieldLabel: 'Device ID', fieldType: 'text', isRequired: true, sortOrder: 2, appliesToActions: ['Remove Security / Endpoint Agent', 'Modify Endpoint Security Policy', 'Request Exception in Security Policy'], options: null },
  { id: 'f-ep-hostid', subcategoryId: 'subcat-sec-ep', fieldKey: 'hostId', fieldLabel: 'Host ID', fieldType: 'text', isRequired: true, sortOrder: 3, appliesToActions: ['Remove Security / Endpoint Agent', 'Modify Endpoint Security Policy', 'Request Exception in Security Policy'], options: null },
  { id: 'f-ep-curgrp', subcategoryId: 'subcat-sec-ep', fieldKey: 'currentGroup', fieldLabel: 'Current Group', fieldType: 'text', isRequired: true, sortOrder: 4, appliesToActions: ['Modify Endpoint Security Policy'], options: null },
  { id: 'f-ep-reqgrp', subcategoryId: 'subcat-sec-ep', fieldKey: 'requestedGroup', fieldLabel: 'Requested Group', fieldType: 'text', isRequired: true, sortOrder: 5, appliesToActions: ['Modify Endpoint Security Policy'], options: null },
  { id: 'f-ep-hash', subcategoryId: 'subcat-sec-ep', fieldKey: 'fileProcessPathHash', fieldLabel: 'File/Proess/Path/Hash', fieldType: 'text', isRequired: true, sortOrder: 6, appliesToActions: ['Request Exception in Security Policy'], options: null },
  { id: 'f-ep-reason', subcategoryId: 'subcat-sec-ep', fieldKey: 'purposeReason', fieldLabel: 'Purpose / Reason', fieldType: 'text', isRequired: true, sortOrder: 7, appliesToActions: ['Remove Security / Endpoint Agent', 'Modify Endpoint Security Policy', 'Request Exception in Security Policy'], options: null },

  // ── 20. Security Other ──
  { id: 'f-secoth-act', subcategoryId: 'subcat-sec-oth', fieldKey: 'actionRequired', fieldLabel: 'Action Required', fieldType: 'dropdown', isRequired: true, sortOrder: 0, appliesToActions: null, options: ['Other Security Change', 'Other'] },
  { id: 'f-secoth-desc', subcategoryId: 'subcat-sec-oth', fieldKey: 'description', fieldLabel: 'Description', fieldType: 'textarea', isRequired: true, sortOrder: 1, appliesToActions: ['Other Security Change'], options: null }
];

export async function seedDatabase({ force = false } = {}) {
  const {
    Role, User, Workflow, CatalogCategory, CatalogSubcategory, CatalogSubcategoryField,
    ChangeRequest, ChangeRequestApproval, AuditLog, AppConfig
  } = models;

  const fill = async (Model, rows) => {
    try {
      const count = await Model.count().catch(() => 0);
      if (!force && count > 0) return { table: Model.tableName, skipped: true };
      
      try {
        if (force) {
          await Model.destroy({ where: {}, force: true }).catch(() => {});
        }
        await Model.bulkCreate(rows, { updateOnDuplicate: Object.keys(rows[0] || {}) });
      } catch (bulkErr) {
        for (const row of rows) {
          await Model.upsert(row).catch(() => {});
        }
      }
      return { table: Model.tableName, inserted: rows.length };
    } catch (err) {
      return { table: Model.tableName, error: err.message };
    }
  };

  const results = [];
  results.push(await fill(Role, roles));
  results.push(await fill(User, users));

  for (const u of users) {
    await User.update(
      { passwordHash: u.passwordHash, authProvider: u.authProvider },
      { where: { id: u.id } }
    );
  }

  results.push(await fill(Workflow, workflows));
  results.push(await fill(CatalogCategory, catalogCategories));
  results.push(await fill(CatalogSubcategory, catalogSubcategories));
  results.push(await fill(CatalogSubcategoryField, catalogSubcategoryFields));
  results.push(await fill(ChangeRequest, changeRequests));

  const sampleApprovals = [
    { id: 'appr-2051', changeRequestId: 'CR-2051', approverId: 'usr-1', decision: 'Approved', decidedAt: daysAgo(1) },
    { id: 'appr-2052', changeRequestId: 'CR-2052', approverId: 'usr-1', decision: 'Approved', decidedAt: hoursAgo(2) },
    { id: 'appr-2053', changeRequestId: 'CR-2053', approverId: 'usr-1', decision: 'Approved', decidedAt: hoursAgo(1) },
    { id: 'appr-2054', changeRequestId: 'CR-2054', approverId: 'usr-1', decision: 'Rejected', decidedAt: hoursAgo(1) },
    { id: 'appr-2055', changeRequestId: 'CR-2055', approverId: 'usr-1', decision: 'Pending' }
  ];
  results.push(await fill(ChangeRequestApproval, sampleApprovals));

  results.push(await fill(AuditLog, auditLogs));
  results.push(await fill(AppConfig, appConfig));
  return results;
}
