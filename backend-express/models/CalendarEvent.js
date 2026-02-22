// backend-express/models/CalendarEvent.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CalendarEvent = sequelize.define('CalendarEvent', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Etkinlik başlığı'
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'meeting',
        comment: 'meeting, interview, training, deadline, birthday, vacation, sickLeave, project, reminder'
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Etkinlik tarihi (YYYY-MM-DD)'
    },
    start_time: {
        type: DataTypes.STRING(5),
        allowNull: true,
        defaultValue: '09:00',
        comment: 'Başlangıç saati (HH:mm)'
    },
    end_time: {
        type: DataTypes.STRING(5),
        allowNull: true,
        defaultValue: '10:00',
        comment: 'Bitiş saati (HH:mm)'
    },
    location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Konum'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Açıklama'
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high'),
        defaultValue: 'medium',
        comment: 'Öncelik'
    },
    status: {
        type: DataTypes.ENUM('scheduled', 'confirmed', 'cancelled'),
        defaultValue: 'scheduled',
        comment: 'Durum'
    },
    attendees: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: 'Katılımcılar (email array)'
    },
    all_day: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Tüm gün etkinliği'
    },
    video_call_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Video görüşme linki'
    },
    recurrence_rule: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Tekrarlama kuralı (none, daily, weekly, monthly, yearly)'
    },
    recurrence_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Tekrarlama bitiş tarihi'
    },
    reminder_minutes: {
        type: DataTypes.INTEGER,
        defaultValue: 15,
        comment: 'Hatırlatma süresi (dakika)'
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
    }
}, {
    tableName: 'calendar_events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = CalendarEvent;
