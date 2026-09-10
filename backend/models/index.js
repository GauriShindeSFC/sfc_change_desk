// Model registry – tables + their relationships.
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
    employeeId: { type: DataTypes.STRING, defaultValue: '' },
    managerEmail: { type: DataTypes.STRING, defaultValue: '' },
    location: { type: DataTypes.STRING, allowNull: true, defaultValue: null },
    justification: { type: DataTypes.TEXT, defaultValue: '' },
    startDate: { type: DataTypes.STRING, allowNull: true },
    endDate: { type: DataTypes.STRING, allowNull: true },
    risk: { type: DataTypes.STRING, defaultValue: 'Medium' },
    activeStep: { type: DataTypes.INTEGER, defaultValue: 1 },
    status: { type: DataTypes.STRING, defaultValue: 'Pending' },
    isDraft: { type: DataTypes.BOOLEAN, defaultValue: false },
    submittedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    closedAt: { type: DataTypes.DATE, allowNull: true },
    requesterId: { type: DataTypes.STRING, allowNull: false },
    approverId: { type: DataTypes.STRING, allowNull: true },
    workflowId: { type: DataTypes.STRING, allowNull: false },
    subcategoryId: { type: DataTypes.STRING, allowNull: true },
    employeeName: { type: DataTypes.STRING, allowNull: true },
    employeeEmail: { type: DataTypes.STRING, allowNull: true },
    rejectionReason: { type: DataTypes.TEXT, allowNull: true },
    customFieldValues: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} }
  },
  {
    tableName: 'change_requests',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['requester_id'] },
      { fields: ['status'] },
      { fields: ['category'] },
      { fields: ['submitted_at'] },
      { fields: ['requester_id', 'submitted_at'] }
    ]
  }
);

// ---------- Audit Logs -----------------------------------
export const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    actorId: { type: DataTypes.STRING, allowNull: false, field: 'actor_id' },
    action: { type: DataTypes.STRING, allowNull: false },
    ref: { type: DataTypes.STRING, allowNull: true },
    detail: { type: DataTypes.TEXT, allowNull: true },
    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  },
  {
    tableName: 'audit_logs',
    timestamps: true,
    underscored: true
  }
);

// ---------- App Config -----------------------------------
export const AppConfig = sequelize.define(
  'AppConfig',
  {
    key: { type: DataTypes.STRING, primaryKey: true },
    value: { type: DataTypes.JSONB, allowNull: false }
  },
  { tableName: 'app_config', timestamps: false }
);

// ---------- Associations ------------------------------
Workflow.hasMany(ChangeRequest, { as: 'changeRequests', foreignKey: 'workflowId' });
ChangeRequest.belongsTo(Workflow, { as: 'workflow', foreignKey: 'workflowId', onDelete: 'SET NULL', onUpdate: 'CASCADE' });

import { ChangeRequestApproval } from './ChangeRequestApproval.js';
import { CatalogCategory } from './CatalogCategory.js';
import { CatalogSubcategory } from './CatalogSubcategory.js';
import { CatalogSubcategoryField } from './CatalogSubcategoryField.js';
import { Employee } from './Employee.js';
import { UserS8 } from './UserS8.js';
import { UserAppRole } from './userAppRole.js';

export { ChangeRequestApproval, CatalogCategory, CatalogSubcategory, CatalogSubcategoryField, Employee, UserS8, UserAppRole };

Role.hasMany(UserAppRole, { foreignKey: 'roleId', as: 'appUserRoles' });
UserAppRole.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

ChangeRequestApproval.belongsTo(ChangeRequest, { foreignKey: 'changeRequestId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
ChangeRequest.hasMany(ChangeRequestApproval, { as: 'approvals', foreignKey: 'changeRequestId' });

CatalogCategory.hasMany(CatalogSubcategory, { as: 'subcategories', foreignKey: 'categoryId' });
CatalogSubcategory.belongsTo(CatalogCategory, { as: 'category', foreignKey: 'categoryId' });
CatalogSubcategory.hasMany(CatalogSubcategoryField, { as: 'fields', foreignKey: 'subcategoryId' });
CatalogSubcategoryField.belongsTo(CatalogSubcategory, { as: 'subcategory', foreignKey: 'subcategoryId' });
CatalogSubcategory.belongsTo(Workflow, { as: 'workflow', foreignKey: 'workflowId' });

export const ChangeManagerCategory = sequelize.define(
  'ChangeManagerCategory',
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    categoryId: { type: DataTypes.STRING, allowNull: false, references: { model: 'catalog_categories', key: 'id' }, onDelete: 'CASCADE' }
  },
  {
    tableName: 'change_manager_categories',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'categoryId']
      }
    ]
  }
);

import { ChangeImplementerCategory } from './ChangeImplementerCategory.js';
export { ChangeImplementerCategory };

CatalogCategory.hasMany(ChangeManagerCategory, { foreignKey: 'categoryId', as: 'assignedManagers' });
ChangeManagerCategory.belongsTo(CatalogCategory, { foreignKey: 'categoryId' });

CatalogCategory.hasMany(ChangeImplementerCategory, { foreignKey: 'categoryId', as: 'assignedImplementers' });
ChangeImplementerCategory.belongsTo(CatalogCategory, { foreignKey: 'categoryId' });

export const models = {
  Role,
  Workflow,
  CatalogCategory,
  CatalogSubcategory,
  CatalogSubcategoryField,
  ChangeRequest,
  ChangeRequestApproval,
  AuditLog,
  AppConfig,
  ChangeManagerCategory,
  ChangeImplementerCategory,
  Employee,
  UserS8,
  UserAppRole
};

export { sequelize };
