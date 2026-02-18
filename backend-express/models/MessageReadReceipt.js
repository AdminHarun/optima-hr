// backend-express/models/MessageReadReceipt.js
const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const MessageReadReceipt = sequelize.define('MessageReadReceipt', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    message_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Mesaj ID (chat_messages.id)'
    },
    reader_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: 'admin, applicant, employee'
    },
    reader_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Okuyan kullanıcı ID'
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
            unique: true,
            fields: ['message_id', 'reader_type', 'reader_id']
        },
        {
            fields: ['message_id']
        },
        {
            fields: ['reader_type', 'reader_id']
        }
    ]
});

/**
 * Mesajı okundu olarak işaretle
 */
MessageReadReceipt.markAsRead = async function (messageId, readerType, readerId) {
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
        console.error('[MessageReadReceipt] markAsRead error:', error.message);
        return { receipt: null, created: false };
    }
};

/**
 * Birden fazla mesajı okundu olarak işaretle
 */
MessageReadReceipt.markMultipleAsRead = async function (messageIds, readerType, readerId) {
    try {
        const records = messageIds.map(messageId => ({
            message_id: messageId,
            reader_type: readerType,
            reader_id: readerId,
            read_at: new Date()
        }));

        await this.bulkCreate(records, {
            ignoreDuplicates: true
        });
    } catch (error) {
        console.error('[MessageReadReceipt] markMultipleAsRead error:', error.message);
    }
};

/**
 * Mesajı okuyanları getir
 */
MessageReadReceipt.getReadersForMessage = async function (messageId) {
    try {
        return await this.findAll({
            where: { message_id: messageId },
            order: [['read_at', 'ASC']]
        });
    } catch (error) {
        console.error('[MessageReadReceipt] getReadersForMessage error:', error.message);
        return [];
    }
};

/**
 * Okunmamış mesaj sayısını getir
 */
MessageReadReceipt.getUnreadCount = async function (roomId, userType, userId) {
    try {
        const ChatMessage = require('./ChatMessage');

        const totalMessages = await ChatMessage.count({
            where: {
                room_id: roomId,
                is_deleted: false,
                [Op.not]: {
                    sender_type: userType,
                    sender_id: userId
                }
            }
        });

        const readMessages = await this.count({
            where: {
                reader_type: userType,
                reader_id: userId
            },
            include: [{
                model: ChatMessage,
                as: 'message',
                where: { room_id: roomId },
                required: true
            }]
        });

        return totalMessages - readMessages;
    } catch (error) {
        console.error('[MessageReadReceipt] getUnreadCount error:', error.message);
        return 0;
    }
};

/**
 * Odadaki tüm mesajları okundu olarak işaretle
 */
MessageReadReceipt.markRoomAsRead = async function (roomId, readerType, readerId) {
    try {
        const ChatMessage = require('./ChatMessage');

        // Odadaki okunmamış mesajları bul
        const unreadMessages = await ChatMessage.findAll({
            where: {
                room_id: roomId,
                is_deleted: false,
                [Op.not]: {
                    sender_type: readerType,
                    sender_id: readerId
                }
            },
            attributes: ['id']
        });

        if (unreadMessages.length === 0) return;

        const messageIds = unreadMessages.map(m => m.id);
        await this.markMultipleAsRead(messageIds, readerType, readerId);
    } catch (error) {
        console.error('[MessageReadReceipt] markRoomAsRead error:', error.message);
    }
};

module.exports = MessageReadReceipt;
