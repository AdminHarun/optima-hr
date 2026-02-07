const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Site = sequelize.define('Site', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  domain: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  logo_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  brand_color: {
    type: DataTypes.STRING(7),
    allowNull: true,
    defaultValue: '#1C61AB',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  settings: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  total_employees: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  total_applications: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
}, {
  tableName: 'sites',
  timestamps: true,
  underscored: true,
});

module.exports = Site;
