const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Task = sequelize.define('Task', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Görev başlığı'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Görev açıklaması'
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'todo',
        comment: 'todo, in_progress, review, done, cancelled'
    },
    priority: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'low, medium, high, urgent'
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Görevi oluşturan çalışan ID'
    },
    assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Görevin atandığı çalışan ID'
    },
    due_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Son teslim tarihi'
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Tamamlanma tarihi'
    },
    site_code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Site kodu (multi-tenant)'
    },
    tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Görev etiketleri'
    },
    project_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Proje ID (opsiyonel)'
    },
    channel_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Bagli kanal ID (opsiyonel)'
    },
    parent_task_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Ust gorev ID (subtask icin)'
    },
    watchers: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Izleyici calisanlarin ID listesi'
    },
    attachments: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Gorev ekleri [{name, url, size, type}]'
    }
}, {
    tableName: 'tasks',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Task;
