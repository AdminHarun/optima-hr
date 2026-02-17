/**
 * OfflineMessageQueue Model
 * Task 1.6: Offline Messaging
 *
 * Stores messages for offline users to be delivered when they come online.
 * - Queue messages when recipient is offline
 * - Track delivery status
 * - Support push notifications
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OfflineMessageQueue = sequelize.define('OfflineMessageQueue', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  // Recipient info
  recipient_type: {
    type: DataTypes.ENUM('employee', 'applicant'),
    allowNull: false
  },
  recipient_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Employee ID or Applicant ID'
  },

  // Message info
  message_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Reference to ChatMessage.message_id'
  },
  channel_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Channel ID for channel messages'
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Room ID for DM messages'
  },

  // Sender info
  sender_type: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  sender_name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },

  // Content preview (for notifications)
  content_preview: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Truncated message content for push notifications'
  },

  // Message type for categorization
  message_type: {
    type: DataTypes.ENUM('direct', 'channel', 'thread', 'mention'),
    defaultValue: 'direct',
    allowNull: false
  },

  // Priority for delivery order
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Higher = more important (mentions get higher priority)'
  },

  // Delivery status
  status: {
    type: DataTypes.ENUM('pending', 'delivered', 'failed', 'expired'),
    defaultValue: 'pending',
    allowNull: false
  },
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  delivery_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  last_attempt_at: {
    type: DataTypes.DATE,
    allowNull: true
  },

  // Push notification tracking
  push_sent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  push_sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  push_token: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'FCM or APNS token for push notification'
  },

  // Expiration
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When this queued message expires (default: 7 days)'
  },

  // Site isolation
  site_code: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'offline_message_queue',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_offline_queue_recipient',
      fields: ['recipient_type', 'recipient_id', 'status']
    },
    {
      name: 'idx_offline_queue_status',
      fields: ['status', 'created_at']
    },
    {
      name: 'idx_offline_queue_expires',
      fields: ['expires_at']
    }
  ]
});

// Static methods

/**
 * Queue a message for offline delivery
 */
OfflineMessageQueue.queueMessage = async function(params) {
  const {
    recipientType,
    recipientId,
    messageId,
    channelId,
    roomId,
    senderType,
    senderId,
    senderName,
    content,
    messageType = 'direct',
    priority = 0,
    siteCode,
    pushToken
  } = params;

  // Create content preview (max 200 chars)
  const contentPreview = content
    ? content.substring(0, 200) + (content.length > 200 ? '...' : '')
    : '';

  // Set expiration (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return await this.create({
    recipient_type: recipientType,
    recipient_id: recipientId,
    message_id: messageId,
    channel_id: channelId,
    room_id: roomId,
    sender_type: senderType,
    sender_id: senderId,
    sender_name: senderName,
    content_preview: contentPreview,
    message_type: messageType,
    priority,
    status: 'pending',
    push_token: pushToken,
    expires_at: expiresAt,
    site_code: siteCode
  });
};

/**
 * Get pending messages for a user
 */
OfflineMessageQueue.getPendingMessages = async function(recipientType, recipientId, limit = 100) {
  return await this.findAll({
    where: {
      recipient_type: recipientType,
      recipient_id: recipientId,
      status: 'pending',
      expires_at: {
        [require('sequelize').Op.gt]: new Date()
      }
    },
    order: [
      ['priority', 'DESC'],
      ['created_at', 'ASC']
    ],
    limit
  });
};

/**
 * Mark messages as delivered
 */
OfflineMessageQueue.markDelivered = async function(messageIds) {
  if (!Array.isArray(messageIds) || messageIds.length === 0) return 0;

  const [count] = await this.update(
    {
      status: 'delivered',
      delivered_at: new Date()
    },
    {
      where: {
        id: messageIds,
        status: 'pending'
      }
    }
  );

  return count;
};

/**
 * Mark single message as delivered by message_id
 */
OfflineMessageQueue.markDeliveredByMessageId = async function(messageId, recipientType, recipientId) {
  const [count] = await this.update(
    {
      status: 'delivered',
      delivered_at: new Date()
    },
    {
      where: {
        message_id: messageId,
        recipient_type: recipientType,
        recipient_id: recipientId,
        status: 'pending'
      }
    }
  );

  return count;
};

/**
 * Get unread count for a user
 */
OfflineMessageQueue.getUnreadCount = async function(recipientType, recipientId) {
  return await this.count({
    where: {
      recipient_type: recipientType,
      recipient_id: recipientId,
      status: 'pending',
      expires_at: {
        [require('sequelize').Op.gt]: new Date()
      }
    }
  });
};

/**
 * Clean up expired messages
 */
OfflineMessageQueue.cleanupExpired = async function() {
  const [count] = await this.update(
    { status: 'expired' },
    {
      where: {
        status: 'pending',
        expires_at: {
          [require('sequelize').Op.lt]: new Date()
        }
      }
    }
  );

  console.log(`🧹 Cleaned up ${count} expired offline messages`);
  return count;
};

/**
 * Get messages pending push notification
 */
OfflineMessageQueue.getPendingPushNotifications = async function(limit = 50) {
  return await this.findAll({
    where: {
      status: 'pending',
      push_sent: false,
      push_token: {
        [require('sequelize').Op.ne]: null
      },
      expires_at: {
        [require('sequelize').Op.gt]: new Date()
      }
    },
    order: [
      ['priority', 'DESC'],
      ['created_at', 'ASC']
    ],
    limit
  });
};

/**
 * Mark push notification as sent
 */
OfflineMessageQueue.markPushSent = async function(queueId) {
  return await this.update(
    {
      push_sent: true,
      push_sent_at: new Date()
    },
    {
      where: { id: queueId }
    }
  );
};

module.exports = OfflineMessageQueue;
