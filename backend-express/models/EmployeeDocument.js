const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmployeeDocument = sequelize.define('EmployeeDocument', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'employees_employee',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },

  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },

  file: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'File path relative to uploads directory',
  },

  category: {
    type: DataTypes.ENUM(
      'CV', 'CERTIFICATE', 'DIPLOMA', 'ID',
      'CONTRACT', 'HEALTH', 'OTHER'
    ),
    defaultValue: 'OTHER',
  },

  size: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'File size in bytes',
  },

  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  uploaded_by_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'User ID who uploaded the document',
  },
}, {
  tableName: 'employees_employeedocument',
  timestamps: true,
  createdAt: 'upload_date',
  updatedAt: false,
  underscored: true,
});

module.exports = EmployeeDocument;