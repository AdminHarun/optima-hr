const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * EmployeePresence - Tracks employee online/offline status
 * Used for real-time presence indicators in chat
 */
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
    comment: 'Reference to employees_employee table'
  },
  status: {
    type: DataTypes.ENUM('online', 'offline', 'away', 'busy', 'dnd'),
    allowNull: false,
    defaultValue: 'offline',
    comment: 'Current presence status: online, offline, away, busy, do not disturb'
  },
  last_seen_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last activity timestamp'
  },
  current_device: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Device type: desktop, mobile, web'
  },
  socket_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of active WebSocket connections'
  },
  custom_status: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Custom status message set by employee'
  },
  status_emoji: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Emoji for custom status'
  },
  auto_away_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When user was automatically set to away'
  }
}, {
  tableName: 'employee_presence',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['employee_id'], unique: true },
    { fields: ['status'] },
    { fields: ['last_seen_at'] }
  ]
});

/**
 * Static Methods
 */

// Update presence status
EmployeePresence.updateStatus = async function(employeeId, status, device = null) {
  const [presence, created] = await this.findOrCreate({
    where: { employee_id: employeeId },
    defaults: {
      status,
      current_device: device,
      last_seen_at: new Date(),
      socket_count: status === 'online' ? 1 : 0
    }
  });

  if (!created) {
    const updateData = {
      status,
      last_seen_at: new Date()
    };

    if (device) {
      updateData.current_device = device;
    }

    if (status === 'online') {
      updateData.socket_count = sequelize.literal('socket_count + 1');
    }

    await presence.update(updateData);
    await presence.reload();
  }

  return presence;
};

// Mark user as offline (decrement socket count)
EmployeePresence.decrementSocket = async function(employeeId) {
  const presence = await this.findOne({ where: { employee_id: employeeId } });

  if (presence) {
    const newCount = Math.max(0, presence.socket_count - 1);
    await presence.update({
      socket_count: newCount,
      status: newCount === 0 ? 'offline' : presence.status,
      last_seen_at: new Date()
    });
    return presence.reload();
  }

  return null;
};

// Get online employees
EmployeePresence.getOnlineEmployees = async function(siteCode = null) {
  const Employee = require('./Employee');

  const where = { status: ['online', 'away', 'busy'] };

  const include = [{
    model: Employee,
    as: 'employee',
    attributes: ['id', 'employee_id', 'first_name', 'last_name', 'email', 'department', 'position', 'profile_picture'],
    required: true
  }];

  if (siteCode) {
    include[0].where = { site_code: siteCode };
  }

  return this.findAll({
    where,
    include,
    order: [['last_seen_at', 'DESC']]
  });
};

// Bulk query presence for multiple employees
EmployeePresence.bulkQuery = async function(employeeIds) {
  return this.findAll({
    where: {
      employee_id: employeeIds
    },
    attributes: ['employee_id', 'status', 'last_seen_at', 'custom_status', 'status_emoji']
  });
};

// Set custom status
EmployeePresence.setCustomStatus = async function(employeeId, message, emoji = null) {
  const [presence] = await this.upsert({
    employee_id: employeeId,
    custom_status: message,
    status_emoji: emoji
  });
  return presence;
};

// Clear expired away statuses (for cron job)
EmployeePresence.clearStalePresence = async function(minutesThreshold = 5) {
  const threshold = new Date(Date.now() - minutesThreshold * 60 * 1000);

  return this.update(
    { status: 'offline', socket_count: 0 },
    {
      where: {
        status: ['online', 'away'],
        last_seen_at: { [require('sequelize').Op.lt]: threshold },
        socket_count: 0
      }
    }
  );
};

module.exports = EmployeePresence;
