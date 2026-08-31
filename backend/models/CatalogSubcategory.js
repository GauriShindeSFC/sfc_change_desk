import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const CatalogSubcategory = sequelize.define(
  'CatalogSubcategory',
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    categoryId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sla: {
      type: DataTypes.STRING,
      defaultValue: '3 business days'
    },
    risk: {
      type: DataTypes.ENUM('Low', 'Medium', 'High'),
      defaultValue: 'Medium'
    },
    workflowId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('Active', 'Inactive'),
      defaultValue: 'Active'
    }
  },
  {
    tableName: 'catalog_subcategories',
    timestamps: false
  }
);
