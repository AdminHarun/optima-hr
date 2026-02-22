const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Role = sequelize.define('Role', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Sistem adı (ör: super_admin, admin, manager)'
    },
    display_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Görünen ad (ör: Süper Admin, Yönetici)'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Rol açıklaması'
    },
    is_system: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Sistem rolü ise silinemez'
    },
    site_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'null = tüm siteler için geçerli'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'roles',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['name']
        }
    ]
});

module.exports = Role;
