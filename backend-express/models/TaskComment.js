const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TaskComment = sequelize.define('TaskComment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    task_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'İlgili görev ID'
    },
    employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Yorumu yazan çalışan ID'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Yorum içeriği'
    }
}, {
    tableName: 'task_comments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = TaskComment;
