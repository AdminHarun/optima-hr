const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ApplicationDocument = sequelize.define('ApplicationDocument', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  application_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'application_id',
    references: {
      model: 'job_applications',
      key: 'id'
    },
    comment: 'Başvuru ID'
  },
  document_type: {
    type: DataTypes.ENUM('cv', 'internet_test', 'typing_test', 'other'),
    allowNull: false,
    comment: 'Dosya türü'
  },
  original_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Orijinal dosya adı'
  },
  file_path: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Sunucudaki dosya yolu'
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Dosya boyutu (bytes)'
  },
  mime_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'MIME türü'
  },
  file_hash: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'Dosya hash\'i (tekrar yükleme kontrolü)'
  },
  upload_ip: {
    type: DataTypes.INET,
    allowNull: true,
    comment: 'Yükleme yapılan IP adresi'
  }
}, {
  tableName: 'application_documents',
  timestamps: true,
  createdAt: 'uploaded_at',
  updatedAt: 'updated_at',

  indexes: [
    {
      fields: ['application_id']
    },
    {
      fields: ['document_type']
    },
    {
      fields: ['uploaded_at']
    },
    {
      fields: ['file_hash']
    }
  ]
});

module.exports = ApplicationDocument;