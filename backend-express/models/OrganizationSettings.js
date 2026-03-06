const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrganizationSettings = sequelize.define('OrganizationSettings', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  value: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'general',
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'organization_settings',
  timestamps: true,
  underscored: true,
});

module.exports = OrganizationSettings;
