import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const CatalogSubcategoryField = sequelize.define(
  'CatalogSubcategoryField',
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    subcategoryId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fieldKey: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fieldLabel: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fieldType: {
      type: DataTypes.ENUM('text', 'dropdown', 'boolean', 'date'),
      defaultValue: 'text'
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    appliesToActions: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    options: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  },
  {
    tableName: 'catalog_subcategory_fields',
    timestamps: false
  }
);
