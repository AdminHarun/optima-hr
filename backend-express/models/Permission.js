const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Permission = sequelize.define('Permission', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'İzin adı (ör: tasks.create, users.manage)'
    },
    resource: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Kaynak türü (ör: tasks, users, files, channels, calendar)'
    },
    action: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'İşlem (ör: create, read, update, delete, manage)'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'İzin açıklaması'
    }
}, {
    tableName: 'permissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = Permission;
