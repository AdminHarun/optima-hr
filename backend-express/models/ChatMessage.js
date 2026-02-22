const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatMessage = sequelize.define('ChatMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  message_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique message identifier for WebSocket deduplication'
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reference to chat_rooms table (DM veya eski grup chatler için)'
  },
  channel_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Reference to channels table (kanal mesajları için)'
  },
  thread_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Parent message ID for threaded replies'
  },
  sender_type: {
    type: DataTypes.ENUM('admin', 'applicant', 'system', 'employee'),
    allowNull: false,
    comment: 'Type of message sender'
  },
  sender_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Display name of the sender'
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the sender (admin_id, applicant_id, etc.)'
  },
  message_type: {
    type: DataTypes.ENUM('text', 'file', 'image', 'system'),
    allowNull: false,
    defaultValue: 'text',
    comment: 'Type of message content'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Message content text'
  },
  file_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'URL of attached file if message_type is file/image'
  },
  file_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Original filename of attached file'
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'File size in bytes'
  },
  file_mime_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'MIME type of attached file'
  },
  reply_to_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of message this is replying to'
  },
  reply_to_message_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Message ID of the replied message (for WebSocket compatibility)'
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'read', 'failed'),
    allowNull: false,
    defaultValue: 'sent',
    comment: 'Message delivery status'
  },
  reactions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of reactions (emoji, user, timestamp)'
  },
  mentions: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
    comment: 'Parsed mentions: {users: [], channels: [], special: []}'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional message metadata'
  },
  is_edited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether message has been edited'
  },
  edited_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of last edit'
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether message has been deleted'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of deletion'
  },
  delivery_status: {
    type: DataTypes.ENUM('pending', 'sent', 'delivered', 'read', 'failed'),
    allowNull: false,
    defaultValue: 'sent',
    comment: 'Mesaj iletim durumu: beklemede, gonderildi, iletildi, okundu, basarisiz'
  },
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Mesajin aliciya ulastigi zaman'
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Mesajin okundugu zaman'
  },

  // Task 2.6: Pin System
  is_pinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether message is pinned in channel/room'
  },
  pinned_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the message was pinned'
  },
  pinned_by_type: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Type of user who pinned (employee, admin)'
  },
  pinned_by_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of user who pinned'
  }
}, {
  tableName: 'chat_messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['message_id']
    },
    {
      fields: ['room_id']
    },
    {
      fields: ['channel_id']
    },
    {
      fields: ['thread_id']
    },
    {
      fields: ['sender_type']
    },
    {
      fields: ['message_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['is_deleted']
    },
    {
      fields: ['reply_to_id']
    },
    {
      fields: ['reply_to_message_id']
    },
    {
      fields: ['delivery_status']
    },
    {
      fields: ['is_pinned']
    }
  ]
});

/**
 * Statik Metodlar
 */

// Mesaji iletildi olarak isaretle
ChatMessage.markAsDelivered = async function(messageId) {
  return this.update(
    {
      delivery_status: 'delivered',
      delivered_at: new Date()
    },
    {
      where: {
        id: messageId,
        delivery_status: 'sent'
      }
    }
  );
};

// Mesaji okundu olarak isaretle
ChatMessage.markAsRead = async function(messageId) {
  return this.update(
    {
      delivery_status: 'read',
      read_at: new Date()
    },
    {
      where: {
        id: messageId,
        delivery_status: { [require('sequelize').Op.in]: ['sent', 'delivered'] }
      }
    }
  );
};

// Odadaki tum mesajlari okundu olarak isaretle
ChatMessage.markRoomMessagesAsRead = async function(roomId, readerType, readerId) {
  const { Op } = require('sequelize');

  return this.update(
    {
      delivery_status: 'read',
      read_at: new Date()
    },
    {
      where: {
        room_id: roomId,
        delivery_status: { [Op.in]: ['sent', 'delivered'] },
        // Kendi mesajlarini guncelleme
        [Op.not]: {
          sender_type: readerType,
          sender_id: readerId
        }
      }
    }
  );
};

// Sistemsel mesaj olustur
ChatMessage.createSystemMessage = async function(roomId, content, metadata = null) {
  const messageId = `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return this.create({
    message_id: messageId,
    room_id: roomId,
    sender_type: 'system',
    sender_name: 'Sistem',
    sender_id: null,
    message_type: 'system',
    content,
    delivery_status: 'sent',
    metadata
  });
};

// Task 2.6: Pin a message
ChatMessage.pinMessage = async function(messageId, pinnedByType, pinnedById) {
  const message = await this.findByPk(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  await message.update({
    is_pinned: true,
    pinned_at: new Date(),
    pinned_by_type: pinnedByType,
    pinned_by_id: pinnedById
  });

  return message;
};

// Task 2.6: Unpin a message
ChatMessage.unpinMessage = async function(messageId) {
  const message = await this.findByPk(messageId);
  if (!message) {
    throw new Error('Message not found');
  }

  await message.update({
    is_pinned: false,
    pinned_at: null,
    pinned_by_type: null,
    pinned_by_id: null
  });

  return message;
};

// Task 2.6: Get pinned messages for a channel
ChatMessage.getPinnedMessages = async function(channelId, roomId, limit = 50) {
  const where = {
    is_pinned: true,
    is_deleted: false
  };

  if (channelId) {
    where.channel_id = channelId;
  } else if (roomId) {
    where.room_id = roomId;
  }

  return this.findAll({
    where,
    order: [['pinned_at', 'DESC']],
    limit
  });
};

module.exports = ChatMessage;