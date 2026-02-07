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
    allowNull: false,
    comment: 'Reference to chat_rooms table'
  },
  sender_type: {
    type: DataTypes.ENUM('admin', 'applicant', 'system'),
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
    }
  ]
});

module.exports = ChatMessage;