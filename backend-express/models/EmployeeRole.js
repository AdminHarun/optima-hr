const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmployeeRole = sequelize.define('EmployeeRole', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Çalışan ID (employees_employee.id)'
    },
    role_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Rol ID'
    },
    assigned_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Rolü atayan kullanıcı ID'
    },
    assigned_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Atama zamanı'
    }
}, {
    tableName: 'employee_roles',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['employee_id', 'role_id']
        }
    ]
});

module.exports = EmployeeRole;
