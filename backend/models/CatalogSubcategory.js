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
