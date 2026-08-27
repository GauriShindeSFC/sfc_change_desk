// ────────────────────────────────────────────────────────────────
//  Seed data + seeding routine.
//
//  Records are stored raw (no presentation fields); serializers add
//  riskColor / statusBg / etc. Relationship columns use *_id.
//  Tables are filled parent-first so foreign keys resolve.
// ────────────────────────────────────────────────────────────────
import { models } from '../models/index.js';

const NOW = Date.now();
const daysAgo = (n) => new Date(NOW - n * 86_400_000);
const hoursAgo = (n) => new Date(NOW - n * 3_600_000);

// ---------- roles ------------------------------------------
export const roles = [
  { id: 'role-1', name: 'Admin', description: 'Full system administration access across all modules, catalog management, user management, and settings.', permissions: ['Manage users', 'Configure workflows', 'Override approvals', 'System audit access'] },
  { id: 'role-2', name: 'Change Manager', description: 'Oversees the end to end change management lifecycle, reviews pending CRs, schedules deployment windows.', permissions: ['Create & edit CRs', 'Approve/reject CRs', 'Manage catalog templates', 'View all reports'] },
  { id: 'role-3', name: 'CAB Approver', description: 'Member of Change Advisory Board with authority to review, approve, reject, or request information on CRs.', permissions: ['Review assigned CRs', 'Approve/reject CRs', 'Request info (send back)', 'View reports'] },
  { id: 'role-4', name: 'Requester', description: 'Standard employee permission to raise change requests, track progress, and update own draft submissions.', permissions: ['Create change requests', 'View own requests', 'Save draft CRs'] }
];

// ---------- users (roleId -> roles.id) --------------------
export const users = [
  { id: 'usr-1', name: 'Gauri Shinde', employeeId: 'EMP-10432', department: 'IT Operations', email: 'gauri.shinde@company.com', status: 'Active', roleId: 'role-2' },
  { id: 'usr-2', name: 'Priya Nair', employeeId: 'EMP-10433', department: 'Software Engineering', email: 'priya.nair@company.com', status: 'Active', roleId: 'role-4' },
  { id: 'usr-3', name: 'Arjun Mehta', employeeId: 'EMP-10434', department: 'Cloud Infrastructure', email: 'arjun.mehta@company.com', status: 'Active', roleId: 'role-3' },
  { id: 'usr-4', name: 'Sana Iqbal', employeeId: 'EMP-10435', department: 'Cybersecurity', email: 'sana.iqbal@company.com', status: 'Active', roleId: 'role-1' },
  { id: 'usr-5', name: 'Rahul Verma', employeeId: 'EMP-10436', department: 'Human Resources', email: 'rahul.verma@company.com', status: 'Inactive', roleId: 'role-4' }
];

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
// The CAB worklist is just the rows here with status 'Pending'.
export const changeRequests = [
  {
    id: 'CR-2038',
    title: 'Replace failing switch in Rack B12',
    category: 'Hardware Change',
    subCategory: 'Component replacement',
    requesterId: 'usr-1',
    approverId: null,
    workflowId: 'wf-1',
    risk: 'Low',
    activeStep: 4,
    status: 'In progress',
    submittedAt: daysAgo(17),
    closedAt: null,
    justification: 'Switch is logging port errors; replace before it fails hard and drops the rack.',
    hostname: 'RACK-B12-TOR-SW',
    location: 'Mumbai Data Center',
    environment: 'Production'
  },
  {
    id: 'CR-2041',
    title: 'Grant elevated access for Finance reporting tool',
    category: 'Access & Permissions',
    subCategory: 'Elevated entitlement',
    requesterId: 'usr-1',
    approverId: 'usr-4',
    workflowId: 'wf-3',
    risk: 'Low',
    activeStep: 6,
    status: 'Closed',
    submittedAt: daysAgo(12),
    closedAt: daysAgo(11),
    justification: 'Month-end close requires read/write access to the consolidated reporting schema.',
    hostname: 'FIN-RPT-APP-01',
    location: 'Remote / Cloud',
    environment: 'Production'
  },
  {
    id: 'CR-2044',
    title: 'Add VLAN for new Ahmedabad office floor',
    category: 'Network Change',
    subCategory: 'VLAN configuration',
    requesterId: 'usr-1',
    approverId: 'usr-4',
    workflowId: 'wf-1',
    risk: 'Medium',
    activeStep: 3,
    status: 'Approved',
    submittedAt: daysAgo(9),
    closedAt: null,
    justification: 'The 4th-floor expansion needs an isolated network segment before staff move in.',
    hostname: 'CORE-SW-AHM-03',
    location: 'Ahmedabad HQ',
    environment: 'Production'
  },
  {
    id: 'CR-2048',
    title: 'Apply Q3 security patch for prod DB cluster',
    category: 'Server / Patching',
    subCategory: 'Security patch',
    requesterId: 'usr-1',
    approverId: 'usr-3',
    workflowId: 'wf-2',
    risk: 'High',
    activeStep: 3,
    status: 'Approved',
    submittedAt: daysAgo(5),
    closedAt: null,
    justification: 'Mandatory quarterly CVE remediation for the production database tier.',
    hostname: 'PROD-DB-CLSTR-02',
    location: 'Mumbai Data Center',
    environment: 'Production'
  },
  {
    id: 'CR-2049',
    title: 'Upgrade payment-gateway API to v4',
    category: 'Software Deployment',
    subCategory: 'Version upgrade',
    requesterId: 'usr-2',
    approverId: null,
    workflowId: 'wf-1',
    risk: 'Medium',
    activeStep: 2,
    status: 'Pending',
    submittedAt: daysAgo(2),
    closedAt: null,
    justification:
      'Current v3 API will be deprecated by the vendor on 15 Sep; upgrading avoids a hard cutover and adds webhook support required by Finance.',
    hostname: 'PROD-API-GW-01',
    location: 'Ahmedabad HQ',
    environment: 'Production'
  },
  {
    id: 'CR-2050',
    title: 'Onboard 12 new hires with standard access bundle',
    category: 'Access & Permissions',
    subCategory: 'Bulk onboarding',
    requesterId: 'usr-5',
    approverId: null,
    workflowId: 'wf-3',
    risk: 'Low',
    activeStep: 1,
    status: 'Pending',
    submittedAt: daysAgo(3),
    closedAt: null,
    justification: 'Q3 intake starts Monday; the cohort needs the baseline app + VPN bundle provisioned.',
    hostname: 'IDP-OKTA-PROD',
    location: 'Ahmedabad HQ',
    environment: 'Production'
  },
  {
    id: 'CR-2051',
    title: 'Open port 8443 for partner API gateway',
    category: 'Network Change',
    subCategory: 'Firewall rule',
    requesterId: 'usr-4',
    approverId: null,
    workflowId: 'wf-1',
    risk: 'Medium',
    activeStep: 1,
    status: 'Pending',
    submittedAt: daysAgo(1),
    closedAt: null,
    justification: 'New settlement partner integration terminates TLS on 8443; currently blocked at the edge.',
    hostname: 'EDGE-FW-01',
    location: 'Mumbai Data Center',
    environment: 'Production'
  },
  {
    id: 'CR-2052',
    title: 'Rotate SSH keys for all bastion hosts',
    category: 'Server / Patching',
    subCategory: 'Credential rotation',
    requesterId: 'usr-3',
    approverId: null,
    workflowId: 'wf-2',
    risk: 'High',
    activeStep: 1,
    status: 'Pending',
    submittedAt: hoursAgo(6),
    closedAt: null,
    justification: 'Quarterly key rotation per the access-control policy; two keys are past their 90-day age.',
    hostname: 'BASTION-POOL',
    location: 'Remote / Cloud',
    environment: 'Production'
  }
];

// ---------- audit logs (actorId -> users.id) ------------
// Oldest -> newest so autoincrement id ascends with time.
export const auditLogs = [
  { timestamp: '21 Aug 2026 18:10:05', actorId: 'usr-5', action: 'CR Sent Back', ref: 'CR-2042', detail: 'Requested additional information on network change justification.' },
  { timestamp: '22 Aug 2026 09:20:14', actorId: 'usr-1', action: 'Catalog Template Created', ref: 'CAT-09', detail: 'Added new template CAT-09 New Vendor Integration to Change Catalog.' },
  { timestamp: '23 Aug 2026 16:45:22', actorId: 'usr-3', action: 'CR Approved', ref: 'CR-2048', detail: 'Approved CR-2048 Apply Q3 security patch for prod DB cluster.' },
  { timestamp: '24 Aug 2026 11:15:00', actorId: 'usr-4', action: 'User Permission Updated', ref: 'EMP-10435', detail: 'Assigned Admin role permissions to Sana Iqbal.' },
  { timestamp: '24 Aug 2026 14:32:10', actorId: 'usr-2', action: 'Created Change Request', ref: 'CR-2049', detail: 'Submitted CR-2049 Upgrade payment-gateway API to v4 for CAB review.' }
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
export async function seedDatabase({ force = false } = {}) {
  const {
    Role, User, Workflow, CatalogItem, ChangeRequest, AuditLog,
    CategoryBreakdown, StatusBreakdown, MonthlyVolume, DepartmentVolume, AppConfig
  } = models;

  const fill = async (Model, rows) => {
    if (!force && (await Model.count()) > 0) return { table: Model.tableName, skipped: true };
    await Model.bulkCreate(rows);
    return { table: Model.tableName, inserted: rows.length };
  };

  const results = [];
  results.push(await fill(Role, roles));
  results.push(await fill(User, users));
  results.push(await fill(Workflow, workflows));
  results.push(await fill(CatalogItem, catalogItems));
  results.push(await fill(ChangeRequest, changeRequests));
  results.push(await fill(AuditLog, auditLogs));
  results.push(await fill(CategoryBreakdown, categoryBreakdown));
  results.push(await fill(StatusBreakdown, statusBreakdown));
  results.push(await fill(MonthlyVolume, monthlyVolume));
  results.push(await fill(DepartmentVolume, departmentVolume));
  results.push(await fill(AppConfig, appConfig));
  return results;
}
