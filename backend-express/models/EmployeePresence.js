// backend-express/models/EmployeePresence.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EmployeePresence = sequelize.define('EmployeePresence', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    employee_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        comment: 'Çalışan ID'
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'offline',
        comment: 'online, offline, away, busy, dnd'
    },
    last_seen_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Son görülme zamanı'
    },
    current_device: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Aktif cihaz (web, mobile, desktop)'
    },
    socket_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Aktif socket bağlantı sayısı'
    },
    custom_status: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Özel durum mesajı'
    },
    status_emoji: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'Durum emojisi'
    },
    status_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Durum suresi dolum zamani'
    },
    last_activity_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Son aktivite zamani (auto-away icin)'
    },
    auto_away: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Otomatik uzakta durumu mu?'
    }
}, {
    tableName: 'employee_presence',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

/**
 * Çalışanın durumunu güncelle
 * @param {number} employeeId - Çalışan ID
 * @param {string} status - online, offline, away, busy, dnd
 * @param {string} device - web, mobile, desktop
 */
EmployeePresence.updateStatus = async function (employeeId, status, device) {
    try {
        const [presence, created] = await this.upsert({
            employee_id: employeeId,
            status: status,
            current_device: device || 'web',
            last_seen_at: new Date(),
            socket_count: status === 'online' ? 1 : 0
        });
        return presence;
    } catch (error) {
        console.error('[EmployeePresence] updateStatus error:', error.message);
        return null;
    }
};

/**
 * Socket bağlantı sayısını azalt, 0 olursa offline yap
 * @param {number} employeeId - Çalışan ID
 */
EmployeePresence.decrementSocket = async function (employeeId) {
    try {
        const presence = await this.findOne({ where: { employee_id: employeeId } });
        if (!presence) return;

        const newCount = Math.max(0, (presence.socket_count || 1) - 1);

        await presence.update({
            socket_count: newCount,
            status: newCount === 0 ? 'offline' : presence.status,
            last_seen_at: new Date()
        });

        return presence;
    } catch (error) {
        console.error('[EmployeePresence] decrementSocket error:', error.message);
        return null;
    }
};

module.exports = EmployeePresence;
