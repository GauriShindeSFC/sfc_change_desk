import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Employee = sequelize.define(
  'Employee',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    empId: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'emp_id'
    },
    leftAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'left_at'
    },
    leftReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'left_reason'
    },
    leftBy: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'left_by'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  },
  {
    tableName: 'employees',
    timestamps: true
  }
);
