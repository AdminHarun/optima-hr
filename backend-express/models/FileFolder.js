// backend-express/models/FileFolder.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FileFolder = sequelize.define('FileFolder', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Klasör adı'
    },
    parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Üst klasör ID (null = root)'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Oluşturan çalışan ID'
    },
    site_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Site kodu (multi-tenant)'
    },
    color: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: '#1c61ab',
        comment: 'Klasör rengi (UI)'
    }
}, {
    tableName: 'file_folders',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = FileFolder;
