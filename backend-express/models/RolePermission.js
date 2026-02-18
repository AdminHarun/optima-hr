const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RolePermission = sequelize.define('RolePermission', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Rol ID'
    },
    permission_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'İzin ID'
    }
}, {
    tableName: 'role_permissions',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['role_id', 'permission_id']
        }
    ]
});

module.exports = RolePermission;
