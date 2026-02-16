const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * MessageReadReceipt - Mesaj okunma bilgisini takip eder
 * WhatsApp tarzı çift tik (okundu) özelliği için kullanılır
 */
const MessageReadReceipt = sequelize.define('MessageReadReceipt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  message_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'chat_messages tablosuna referans'
  },
  reader_type: {
    type: DataTypes.ENUM('admin', 'applicant', 'employee'),
    allowNull: false,
    comment: 'Okuyan kişinin tipi: admin, aday veya çalışan'
  },
  reader_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Okuyan kişinin ID\'si'
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Okunma zamanı'
  }
}, {
  tableName: 'message_read_receipts',
  timestamps: false,
  indexes: [
    {
      fields: ['message_id']
    },
    {
      fields: ['reader_type', 'reader_id']
    },
    {
      fields: ['message_id', 'reader_type', 'reader_id'],
      unique: true
    }
  ]
});

/**
 * Statik Metodlar
 */

// Mesajı okundu olarak işaretle
MessageReadReceipt.markAsRead = async function(messageId, readerType, readerId) {
  try {
    const [receipt, created] = await this.findOrCreate({
      where: {
        message_id: messageId,
        reader_type: readerType,
        reader_id: readerId
      },
      defaults: {
        read_at: new Date()
      }
    });
    return { receipt, created };
  } catch (error) {
    // Unique constraint hatası (zaten okunmuş)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return { receipt: null, created: false };
    }
    throw error;
  }
};

// Birden fazla mesajı okundu olarak işaretle
MessageReadReceipt.markMultipleAsRead = async function(messageIds, readerType, readerId) {
  const now = new Date();
  const records = messageIds.map(messageId => ({
    message_id: messageId,
    reader_type: readerType,
    reader_id: readerId,
    read_at: now
  }));

  return this.bulkCreate(records, {
    ignoreDuplicates: true,
    returning: true
  });
};

// Bir mesajı kimlerin okuduğunu getir
MessageReadReceipt.getReadersForMessage = async function(messageId) {
  return this.findAll({
    where: { message_id: messageId },
    attributes: ['reader_type', 'reader_id', 'read_at'],
    order: [['read_at', 'ASC']]
  });
};

// Bir odadaki belirli bir kullanıcının okumadığı mesaj sayısı
MessageReadReceipt.getUnreadCount = async function(roomId, readerType, readerId) {
  const ChatMessage = require('./ChatMessage');

  // Odadaki tüm mesajlar
  const totalMessages = await ChatMessage.count({
    where: {
      room_id: roomId,
      is_deleted: false,
      // Kendi mesajlarını sayma
      [Op.not]: {
        sender_type: readerType,
        sender_id: readerId
      }
    }
  });

  // Okunan mesajlar
  const readMessages = await this.count({
    where: {
      reader_type: readerType,
      reader_id: readerId
    },
    include: [{
      model: ChatMessage,
      as: 'message',
      where: { room_id: roomId },
      required: true
    }]
  });

  return totalMessages - readMessages;
};

// Odadaki tüm mesajları okundu olarak işaretle
MessageReadReceipt.markRoomAsRead = async function(roomId, readerType, readerId) {
  const ChatMessage = require('./ChatMessage');

  // Odadaki okunmamış mesajları bul
  const unreadMessages = await ChatMessage.findAll({
    where: {
      room_id: roomId,
      is_deleted: false
    },
    attributes: ['id'],
    raw: true
  });

  // Zaten okunmuş mesajları bul
  const alreadyRead = await this.findAll({
    where: {
      message_id: unreadMessages.map(m => m.id),
      reader_type: readerType,
      reader_id: readerId
    },
    attributes: ['message_id'],
    raw: true
  });

  const alreadyReadIds = new Set(alreadyRead.map(r => r.message_id));

  // Sadece okunmamış olanları işaretle
  const toMark = unreadMessages
    .filter(m => !alreadyReadIds.has(m.id))
    .map(m => m.id);

  if (toMark.length > 0) {
    return this.markMultipleAsRead(toMark, readerType, readerId);
  }

  return [];
};

// Mesajın okunma durumunu kontrol et (herkesçe okundu mu?)
MessageReadReceipt.checkAllRead = async function(messageId, roomId) {
  const ChatRoomMember = require('./ChatRoomMember');
  const ChatMessage = require('./ChatMessage');

  // Mesajı göndereni bul
  const message = await ChatMessage.findByPk(messageId);
  if (!message) return false;

  // Odadaki aktif üyeleri bul (gönderen hariç)
  const members = await ChatRoomMember.findAll({
    where: {
      room_id: roomId,
      is_active: true,
      [Op.not]: {
        member_type: message.sender_type,
        member_id: message.sender_id
      }
    },
    attributes: ['member_type', 'member_id']
  });

  if (members.length === 0) return true;

  // Okuma kayıtlarını kontrol et
  const readCount = await this.count({
    where: {
      message_id: messageId,
      [Op.or]: members.map(m => ({
        reader_type: m.member_type,
        reader_id: m.member_id
      }))
    }
  });

  return readCount >= members.length;
};

// Son okunma zamanını getir
MessageReadReceipt.getLastReadTime = async function(roomId, readerType, readerId) {
  const ChatMessage = require('./ChatMessage');

  const lastRead = await this.findOne({
    include: [{
      model: ChatMessage,
      as: 'message',
      where: { room_id: roomId },
      required: true
    }],
    where: {
      reader_type: readerType,
      reader_id: readerId
    },
    order: [['read_at', 'DESC']]
  });

  return lastRead ? lastRead.read_at : null;
};

module.exports = MessageReadReceipt;
