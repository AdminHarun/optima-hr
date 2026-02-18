const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  site_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  module: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  target_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  target_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  target_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {},
  },
  details: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  old_values: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  new_values: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  user_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  user_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  request_method: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  request_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  response_status: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  duration_ms: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true,
  updatedAt: false,
});

module.exports = AuditLog;
