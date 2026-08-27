// Model registry – tables + their relationships.
//
//   roles  ◄─ role_id ── users
//   users  ◄─ requester_id / approver_id / actor_id ── change_requests, audit_logs
//   workflows ◄─ workflow_id ── change_requests, catalog_items
//
// Derived (not stored): roles.usersCount, workflows.usedBy, the CAB worklist
// (= change_requests where status='Pending'), and every "*Date" display string.
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

// ---------- Roles -------------------------------------------
export const Role = sequelize.define(
  'Role',
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    permissions: { type: DataTypes.JSONB, defaultValue: [] }
  },
  { tableName: 'roles', timestamps: false }
);

// ---------- Users ------------------------------------------
export const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    employeeId: { type: DataTypes.STRING },
    department: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, defaultValue: 'Active' },
    roleId: { type: DataTypes.STRING } // FK -> roles.id
  },
  { tableName: 'users', timestamps: false }
);

// ---------- Workflows ------------------------------------
export const Workflow = sequelize.define(
  'Workflow',
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    steps: { type: DataTypes.TEXT }
  },
  { tableName: 'workflows', timestamps: false }
);

// ---------- Catalog items (browse + admin, one table) ----
export const CatalogItem = sequelize.define(
  'CatalogItem',
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING },
    description: { type: DataTypes.TEXT },
    sla: { type: DataTypes.STRING },
    risk: { type: DataTypes.STRING, defaultValue: 'Medium' },
    iconBg: { type: DataTypes.STRING },
    iconColor: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, defaultValue: 'Active' },
    workflowId: { type: DataTypes.STRING } // FK -> workflows.id
  },
  { tableName: 'catalog_items', timestamps: false }
);

// ---------- Change requests -----------------------------
export const ChangeRequest = sequelize.define(
  'ChangeRequest',
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    subCategory: { type: DataTypes.STRING, defaultValue: '' },
    department: { type: DataTypes.STRING, defaultValue: '' },
    contactNumber: { type: DataTypes.STRING, defaultValue: '' },
    managerEmail: { type: DataTypes.STRING, defaultValue: '' },
    hostname: { type: DataTypes.STRING, defaultValue: '' },
    location: { type: DataTypes.STRING, defaultValue: '' },
    environment: { type: DataTypes.STRING, defaultValue: '' },
    justification: { type: DataTypes.TEXT, defaultValue: '' },
    startDate: { type: DataTypes.STRING, defaultValue: '' },
    endDate: { type: DataTypes.STRING, defaultValue: '' },
    risk: { type: DataTypes.STRING, defaultValue: 'Medium' },
    activeStep: { type: DataTypes.INTEGER, defaultValue: 1 },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' },
    isDraft: { type: DataTypes.BOOLEAN, defaultValue: false },
    submittedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    closedAt: { type: DataTypes.DATE, allowNull: true },
    requesterId: { type: DataTypes.STRING }, // FK -> users.id
    approverId: { type: DataTypes.STRING, allowNull: true }, // FK -> users.id
    workflowId: { type: DataTypes.STRING, allowNull: true } // FK -> workflows.id
  },
  { tableName: 'change_requests', timestamps: true }
);

// ---------- Audit logs ---------------------------------
export const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    timestamp: { type: DataTypes.STRING },
    action: { type: DataTypes.STRING },
    ref: { type: DataTypes.STRING, defaultValue: '—' },
    detail: { type: DataTypes.TEXT },
    actorId: { type: DataTypes.STRING, allowNull: true } // FK -> users.id
  },
  { tableName: 'audit_logs', timestamps: true }
);

// ---------- Standalone analytics / reporting data ------
export const CategoryBreakdown = sequelize.define(
  'CategoryBreakdown',
  {
    label: { type: DataTypes.STRING, primaryKey: true },
    count: { type: DataTypes.INTEGER, defaultValue: 0 },
    max: { type: DataTypes.INTEGER, defaultValue: 40 },
    color: { type: DataTypes.STRING }
  },
  { tableName: 'category_breakdown', timestamps: false }
);

export const StatusBreakdown = sequelize.define(
  'StatusBreakdown',
  {
    label: { type: DataTypes.STRING, primaryKey: true },
    count: { type: DataTypes.INTEGER, defaultValue: 0 },
    color: { type: DataTypes.STRING }
  },
  { tableName: 'status_breakdown', timestamps: false }
);

export const MonthlyVolume = sequelize.define(
  'MonthlyVolume',
  {
    month: { type: DataTypes.STRING, primaryKey: true },
    count: { type: DataTypes.INTEGER, defaultValue: 0 },
    barHeight: { type: DataTypes.STRING },
    sortIndex: { type: DataTypes.INTEGER, defaultValue: 0 }
  },
  { tableName: 'monthly_volume', timestamps: false }
);

export const DepartmentVolume = sequelize.define(
  'DepartmentVolume',
  {
    name: { type: DataTypes.STRING, primaryKey: true },
    count: { type: DataTypes.INTEGER, defaultValue: 0 },
    percentage: { type: DataTypes.INTEGER, defaultValue: 0 },
    color: { type: DataTypes.STRING },
    sortIndex: { type: DataTypes.INTEGER, defaultValue: 0 }
  },
  { tableName: 'department_volume', timestamps: false }
);

// Key/value singletons: dashboard_stats, worklist_metrics, report_metrics
export const AppConfig = sequelize.define(
  'AppConfig',
  {
    key: { type: DataTypes.STRING, primaryKey: true },
    value: { type: DataTypes.JSONB, allowNull: false }
  },
  { tableName: 'app_config', timestamps: false }
);

// ---------- Associations ------------------------------
Role.hasMany(User, { as: 'users', foreignKey: 'roleId' });
User.belongsTo(Role, { as: 'role', foreignKey: 'roleId' });

User.hasMany(ChangeRequest, { as: 'requestedChanges', foreignKey: 'requesterId' });
ChangeRequest.belongsTo(User, { as: 'requester', foreignKey: 'requesterId' });
ChangeRequest.belongsTo(User, { as: 'approver', foreignKey: 'approverId' });

Workflow.hasMany(ChangeRequest, { as: 'changeRequests', foreignKey: 'workflowId' });
ChangeRequest.belongsTo(Workflow, { as: 'workflow', foreignKey: 'workflowId' });

Workflow.hasMany(CatalogItem, { as: 'catalogItems', foreignKey: 'workflowId' });
CatalogItem.belongsTo(Workflow, { as: 'workflow', foreignKey: 'workflowId' });

User.hasMany(AuditLog, { as: 'auditLogs', foreignKey: 'actorId' });
AuditLog.belongsTo(User, { as: 'actor', foreignKey: 'actorId' });

export const models = {
  Role,
  User,
  Workflow,
  CatalogItem,
  ChangeRequest,
  AuditLog,
  CategoryBreakdown,
  StatusBreakdown,
  MonthlyVolume,
  DepartmentVolume,
  AppConfig
};

export { sequelize };
