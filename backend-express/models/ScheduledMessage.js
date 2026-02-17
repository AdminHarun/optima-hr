/**
 * ScheduledMessage Model
 * Task 2.4: Message Scheduling
 *
 * Stores scheduled messages that will be sent at a future time.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ScheduledMessage = sequelize.define('ScheduledMessage', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  // Sender info
  sender_type: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  sender_name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },

  // Target info
  channel_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'For channel messages'
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'For DM/room messages'
  },
  thread_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'For thread replies'
  },

  // Message content
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  message_type: {
    type: DataTypes.STRING(20),
    defaultValue: 'text',
    comment: 'text, file, voice, etc.'
  },

  // File attachment (if any)
  file_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  file_mime_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  // Scheduling
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'When the message should be sent'
  },
  timezone: {
    type: DataTypes.STRING(50),
    defaultValue: 'Europe/Istanbul'
  },

  // Status
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed', 'cancelled'),
    defaultValue: 'pending'
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  sent_message_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'The message_id after sending'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  retry_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },

  // Recurrence (optional)
  is_recurring: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  recurrence_pattern: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'daily, weekly, monthly, or cron expression'
  },
  recurrence_end_at: {
    type: DataTypes.DATE,
    allowNull: true
  },

  // Site isolation
  site_code: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'scheduled_messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_scheduled_pending',
      fields: ['status', 'scheduled_at']
    },
    {
      name: 'idx_scheduled_sender',
      fields: ['sender_type', 'sender_id', 'status']
    }
  ]
});

// Static methods

/**
 * Get pending messages that are due for sending
 */
ScheduledMessage.getPendingMessages = async function(limit = 50) {
  const { Op } = require('sequelize');

  return await this.findAll({
    where: {
      status: 'pending',
      scheduled_at: {
        [Op.lte]: new Date()
      }
    },
    order: [['scheduled_at', 'ASC']],
    limit
  });
};

/**
 * Get scheduled messages for a user
 */
ScheduledMessage.getUserScheduledMessages = async function(senderType, senderId, includeCompleted = false) {
  const { Op } = require('sequelize');

  const where = {
    sender_type: senderType,
    sender_id: senderId
  };

  if (!includeCompleted) {
    where.status = { [Op.in]: ['pending'] };
  }

  return await this.findAll({
    where,
    order: [['scheduled_at', 'ASC']]
  });
};

/**
 * Cancel a scheduled message
 */
ScheduledMessage.cancelMessage = async function(id, senderId) {
  const [count] = await this.update(
    { status: 'cancelled' },
    {
      where: {
        id,
        sender_id: senderId,
        status: 'pending'
      }
    }
  );

  return count > 0;
};

/**
 * Mark message as sent
 */
ScheduledMessage.markAsSent = async function(id, sentMessageId) {
  return await this.update(
    {
      status: 'sent',
      sent_at: new Date(),
      sent_message_id: sentMessageId
    },
    { where: { id } }
  );
};

/**
 * Mark message as failed
 */
ScheduledMessage.markAsFailed = async function(id, errorMessage) {
  const message = await this.findByPk(id);
  if (!message) return false;

  const newRetryCount = message.retry_count + 1;
  const maxRetries = 3;

  await message.update({
    status: newRetryCount >= maxRetries ? 'failed' : 'pending',
    error_message: errorMessage,
    retry_count: newRetryCount
  });

  return true;
};

module.exports = ScheduledMessage;
