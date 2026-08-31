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
    email: { type: DataTypes.STRING, unique: true },
    status: { type: DataTypes.STRING, defaultValue: 'Active' },
    passwordHash: { type: DataTypes.STRING, allowNull: true }, // null for SSO-only accounts
    authProvider: { type: DataTypes.STRING, defaultValue: 'local' }, // 'local' | 'microsoft'
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
    startDate: { type: DataTypes.DATE, allowNull: true },
    endDate: { type: DataTypes.DATE, allowNull: true },
    risk: { type: DataTypes.STRING, defaultValue: 'Medium' },
    activeStep: { type: DataTypes.INTEGER, defaultValue: 1 },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' },
    isDraft: { type: DataTypes.BOOLEAN, defaultValue: false },
    submittedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    closedAt: { type: DataTypes.DATE, allowNull: true },
    requesterId: { type: DataTypes.STRING }, // FK -> users.id
    approverId: { type: DataTypes.STRING, allowNull: true }, // FK -> users.id
    workflowId: { type: DataTypes.STRING, allowNull: true }, // FK -> workflows.id
    rejectionReason: { type: DataTypes.TEXT, allowNull: true },
    customFieldValues: { type: DataTypes.JSONB, defaultValue: {} }
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
  {
    tableName: 'audit_logs',
    timestamps: true,
    hooks: {
      beforeUpdate: () => {
        throw new Error('Audit logs are immutable and cannot be updated.');
      },
      beforeDestroy: () => {
        throw new Error('Audit logs are immutable and cannot be deleted.');
      }
    }
  }
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

// ---------- Notifications -------------------------------
export const Notification = sequelize.define(
  'Notification',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.STRING, allowNull: false }, // FK -> users.id
    changeRequestId: { type: DataTypes.STRING, allowNull: true }, // FK -> change_requests.id
    type: { type: DataTypes.STRING, allowNull: false }, // CR_SUBMITTED, CR_APPROVED, CR_REJECTED, CR_SENT_BACK
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
    isStale: { type: DataTypes.BOOLEAN, defaultValue: false },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  },
  { tableName: 'notifications', timestamps: true }
);

// ---------- Associations ------------------------------
Role.hasMany(User, { as: 'users', foreignKey: 'roleId' });
User.belongsTo(Role, { as: 'role', foreignKey: 'roleId', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

User.hasMany(ChangeRequest, { as: 'requestedChanges', foreignKey: 'requesterId' });
ChangeRequest.belongsTo(User, { as: 'requester', foreignKey: 'requesterId', onDelete: 'SET NULL', onUpdate: 'CASCADE' });
ChangeRequest.belongsTo(User, { as: 'approver', foreignKey: 'approverId', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

Workflow.hasMany(ChangeRequest, { as: 'changeRequests', foreignKey: 'workflowId' });
ChangeRequest.belongsTo(Workflow, { as: 'workflow', foreignKey: 'workflowId', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

User.hasMany(AuditLog, { as: 'actorLogs', foreignKey: 'actorId' });
AuditLog.belongsTo(User, { as: 'actor', foreignKey: 'actorId', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

User.hasMany(Notification, { as: 'notifications', foreignKey: 'userId' });
Notification.belongsTo(User, { as: 'recipient', foreignKey: 'userId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

import { ChangeRequestApproval } from './ChangeRequestApproval.js';
import { CatalogCategory } from './CatalogCategory.js';
import { CatalogSubcategory } from './CatalogSubcategory.js';
import { CatalogSubcategoryField } from './CatalogSubcategoryField.js';

export { ChangeRequestApproval, CatalogCategory, CatalogSubcategory, CatalogSubcategoryField };

ChangeRequestApproval.belongsTo(ChangeRequest, { foreignKey: 'changeRequestId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
ChangeRequestApproval.belongsTo(User, { as: 'approver', foreignKey: 'approverId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
ChangeRequest.hasMany(ChangeRequestApproval, { as: 'approvals', foreignKey: 'changeRequestId' });

CatalogCategory.hasMany(CatalogSubcategory, { as: 'subcategories', foreignKey: 'categoryId' });
CatalogSubcategory.belongsTo(CatalogCategory, { as: 'category', foreignKey: 'categoryId' });
CatalogSubcategory.hasMany(CatalogSubcategoryField, { as: 'fields', foreignKey: 'subcategoryId' });
CatalogSubcategoryField.belongsTo(CatalogSubcategory, { as: 'subcategory', foreignKey: 'subcategoryId' });
CatalogSubcategory.belongsTo(Workflow, { as: 'workflow', foreignKey: 'workflowId' });

export const models = {
  Role,
  User,
  Workflow,
  CatalogCategory,
  CatalogSubcategory,
  CatalogSubcategoryField,
  ChangeRequest,
  ChangeRequestApproval,
  AuditLog,
  Notification,
  AppConfig
};

export { sequelize };
