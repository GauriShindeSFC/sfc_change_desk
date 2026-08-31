import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ScheduledReport = sequelize.define(
  'ScheduledReport',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    reportType: {
      type: DataTypes.ENUM('success_rate', 'category_volume', 'turnaround_time', 'emergency_log', 'audit_trail'),
      allowNull: false
    },
    categoryId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    subcategoryId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    dateRangeMode: {
      type: DataTypes.ENUM('rolling', 'custom'),
      defaultValue: 'rolling',
      allowNull: false
    },
    frequency: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'one_time'),
      allowNull: false
    },
    customFromDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    customToDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    recipients: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    format: {
      type: DataTypes.ENUM('pdf', 'csv', 'excel'),
      defaultValue: 'pdf',
      allowNull: false
    },
    lastRunAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    nextRunAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    createdBy: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    }
  },
  {
    tableName: 'scheduled_reports',
    timestamps: true
  }
);
