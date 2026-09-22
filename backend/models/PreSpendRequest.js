import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const PreSpendRequest = sequelize.define(
  'PreSpendRequest',
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    requestCode: {
      type: DataTypes.STRING(32),
      allowNull: true,
      unique: true,
      field: 'request_code'
    },
    requesterId: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'requester_id'
    },
    requesterName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'requester_name'
    },
    requesterEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'requester_email'
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    subcategory: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    itemDescription: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'item_description'
    },
    estimatedAmount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      field: 'estimated_amount'
    },
    neededByDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'needed_by_date'
    },
    costCentre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'cost_centre'
    },
    budgetLine: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'budget_line'
    },
    businessJustification: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'business_justification'
    },
    isUrgent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_urgent'
    },
    urgentReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'urgent_reason'
    },
    vendors: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    selectedVendor: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'selected_vendor'
    },
    commercialException: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'commercial_exception'
    },
    commercialReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'commercial_reason'
    },
    commercialJustification: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'commercial_justification'
    },
    status: {
      type: DataTypes.STRING(50),
      defaultValue: 'Pending Approval'
    },
    policyCertified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'policy_certified'
    },
    approvalHistory: {
      type: DataTypes.JSONB,
      defaultValue: [],
      field: 'approval_history'
    }
  },
  {
    tableName: 'pre_spend_requests',
    timestamps: true,
    underscored: true
  }
);
