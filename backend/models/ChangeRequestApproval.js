import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ChangeRequestApproval = sequelize.define(
  'ChangeRequestApproval',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    changeRequestId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    approverId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    decision: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
      defaultValue: 'Pending',
      allowNull: false
    },
    decidedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    tableName: 'change_request_approvals',
    timestamps: true
  }
);
