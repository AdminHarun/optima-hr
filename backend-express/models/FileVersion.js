// backend-express/models/FileVersion.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FileVersion = sequelize.define('FileVersion', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    file_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'İlgili dosya ID'
    },
    version_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Versiyon numarası'
    },
    storage_key: {
        type: DataTypes.STRING(1000),
        allowNull: false,
        comment: 'R2 key veya lokal path'
    },
    size: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Dosya boyutu (byte)'
    },
    uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Yükleyen çalışan ID'
    },
    comment: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Versiyon notu'
    }
}, {
    tableName: 'file_versions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = FileVersion;
