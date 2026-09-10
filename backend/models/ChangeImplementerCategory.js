import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const ChangeImplementerCategory = sequelize.define(
  'ChangeImplementerCategory',
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    categoryId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: 'catalog_categories', key: 'id' },
      onDelete: 'CASCADE'
    }
  },
  {
    tableName: 'change_implementer_categories',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'categoryId']
      }
    ]
  }
);
