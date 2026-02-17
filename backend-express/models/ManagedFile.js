// backend-express/models/ManagedFile.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ManagedFile = sequelize.define('ManagedFile', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Görüntülenen dosya adı'
    },
    original_name: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Orijinal dosya adı'
    },
    storage_key: {
        type: DataTypes.STRING(1000),
        allowNull: false,
        comment: 'R2 key veya lokal path'
    },
    folder_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Üst klasör ID (null = root)'
    },
    size: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Dosya boyutu (byte)'
    },
    mime_type: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'MIME type'
    },
    storage_type: {
        type: DataTypes.ENUM('r2', 'local'),
        defaultValue: 'r2',
        comment: 'Depolama türü'
    },
    version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: 'Mevcut versiyon numarası'
    },
    uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Yükleyen çalışan ID'
    },
    site_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Site kodu (multi-tenant)'
    },
    tags: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Dosya etiketleri'
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Soft delete'
    }
}, {
    tableName: 'managed_files',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = ManagedFile;
