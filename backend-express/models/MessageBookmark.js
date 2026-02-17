/**
 * MessageBookmark Model
 * Task 2.6: Message Pinning & Bookmarks
 *
 * Stores user bookmarks for messages (personal saves).
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MessageBookmark = sequelize.define('MessageBookmark', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  // User who bookmarked
  user_type: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'employee'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },

  // Message reference
  message_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Reference to ChatMessage.id'
  },

  // Optional note/label
  note: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'User note about why they bookmarked this'
  },

  // Category/folder
  folder: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'default',
    comment: 'Organize bookmarks into folders'
  },

  // Site isolation
  site_code: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'message_bookmarks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_bookmark_user',
      fields: ['user_type', 'user_id']
    },
    {
      name: 'idx_bookmark_message',
      fields: ['message_id']
    },
    {
      unique: true,
      name: 'idx_bookmark_unique',
      fields: ['user_type', 'user_id', 'message_id']
    }
  ]
});

// Static methods

/**
 * Add bookmark
 */
MessageBookmark.addBookmark = async function(userType, userId, messageId, options = {}) {
  const { note, folder, siteCode } = options;

  // Check if already bookmarked
  const existing = await this.findOne({
    where: {
      user_type: userType,
      user_id: userId,
      message_id: messageId
    }
  });

  if (existing) {
    // Update existing bookmark
    await existing.update({ note, folder });
    return { bookmark: existing, created: false };
  }

  // Create new bookmark
  const bookmark = await this.create({
    user_type: userType,
    user_id: userId,
    message_id: messageId,
    note,
    folder,
    site_code: siteCode
  });

  return { bookmark, created: true };
};

/**
 * Remove bookmark
 */
MessageBookmark.removeBookmark = async function(userType, userId, messageId) {
  const deleted = await this.destroy({
    where: {
      user_type: userType,
      user_id: userId,
      message_id: messageId
    }
  });

  return deleted > 0;
};

/**
 * Get user's bookmarks
 */
MessageBookmark.getUserBookmarks = async function(userType, userId, options = {}) {
  const { folder, limit = 50, offset = 0 } = options;
  const ChatMessage = require('./ChatMessage');

  const where = {
    user_type: userType,
    user_id: userId
  };

  if (folder) {
    where.folder = folder;
  }

  return await this.findAll({
    where,
    include: [{
      model: ChatMessage,
      as: 'message',
      required: true,
      where: { is_deleted: false }
    }],
    order: [['created_at', 'DESC']],
    limit,
    offset
  });
};

/**
 * Check if message is bookmarked
 */
MessageBookmark.isBookmarked = async function(userType, userId, messageId) {
  const count = await this.count({
    where: {
      user_type: userType,
      user_id: userId,
      message_id: messageId
    }
  });

  return count > 0;
};

/**
 * Get bookmark folders for user
 */
MessageBookmark.getUserFolders = async function(userType, userId) {
  const folders = await this.findAll({
    where: {
      user_type: userType,
      user_id: userId
    },
    attributes: [
      'folder',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['folder'],
    raw: true
  });

  return folders;
};

module.exports = MessageBookmark;
