const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatRoom = sequelize.define('ChatRoom', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  site_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Bu chat odasinin ait oldugu site kodu (FXB, MTD, vb.)'
  },
  room_type: {
    type: DataTypes.ENUM('applicant', 'admin', 'group'),
    allowNull: false,
    defaultValue: 'applicant'
  },
  applicant_id: {
    type: DataTypes.BIGINT,
    allowNull: true, // null for group chats
    comment: 'ID of the job applicant for applicant rooms (using timestamp as ID)'
  },
  applicant_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Email of the applicant for quick reference'
  },
  applicant_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Full name of the applicant'
  },
  room_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Custom room name for group chats'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether the chat room is active'
  },
  last_message_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the last message in this room'
  },
  last_message_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of the last message'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional room metadata (settings, preferences, etc.)'
  }
}, {
  tableName: 'chat_rooms',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  // Indexes are managed by SQL migrations, not Sequelize
  // indexes: [
  //   {
  //     fields: ['applicant_id']
  //   },
  //   {
  //     fields: ['applicant_email']
  //   },
  //   {
  //     fields: ['room_type']
  //   },
  //   {
  //     fields: ['is_active']
  //   },
  //   {
  //     fields: ['last_message_at']
  //   }
  // ]
});

module.exports = ChatRoom;