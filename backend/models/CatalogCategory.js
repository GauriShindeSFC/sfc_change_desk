import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const CatalogCategory = sequelize.define(
  'CatalogCategory',
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  },
  {
    tableName: 'catalog_categories',
    timestamps: false
  }
);
