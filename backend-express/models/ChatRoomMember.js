const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * ChatRoomMember - Tracks membership for chat rooms
 * Links users (employees and applicants) to chat rooms
 */
const ChatRoomMember = sequelize.define('ChatRoomMember', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Reference to chat_rooms table'
  },
  member_type: {
    type: DataTypes.ENUM('employee', 'applicant', 'admin'),
    allowNull: false,
    comment: 'Type of member: employee, applicant, or admin (legacy)'
  },
  member_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the member (employee_id or applicant_id)'
  },
  member_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Display name of the member'
  },
  member_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Email of the member'
  },
  role: {
    type: DataTypes.ENUM('owner', 'admin', 'member'),
    allowNull: false,
    defaultValue: 'member',
    comment: 'Role in the group: owner, admin, or member'
  },
  nickname: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Custom nickname for this room'
  },
  muted_until: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Muted until this timestamp (null = not muted)'
  },
  is_pinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this room is pinned for the member'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether the member is active in the group'
  },
  joined_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'When the member joined the group'
  },
  left_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the member left the group (null if still active)'
  },
  last_read_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time the member read messages in this room'
  },
  last_read_message_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the last message the member has read'
  },
  notifications_enabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether notifications are enabled for this member'
  }
}, {
  tableName: 'chat_room_members',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['room_id']
    },
    {
      fields: ['member_type', 'member_id']
    },
    {
      fields: ['room_id', 'member_type', 'member_id'],
      unique: true
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = ChatRoomMember;
