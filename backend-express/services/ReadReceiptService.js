/**
 * ReadReceiptService
 * Task 2.5: Enhanced Read Receipts & Typing Indicators
 *
 * Provides enhanced read receipt functionality:
 * - Delivery status tracking (sent -> delivered -> read)
 * - Batch status updates
 * - Read-by details for groups
 * - Real-time status broadcasting
 */

const { Op } = require('sequelize');
const MessageReadReceipt = require('../models/MessageReadReceipt');
const ChatMessage = require('../models/ChatMessage');
const ChannelMember = require('../models/ChannelMember');

class ReadReceiptService {
  constructor() {
    this.wsService = null;
  }

  /**
   * Set WebSocket service reference
   */
  setWebSocketService(wsService) {
    this.wsService = wsService;
  }

  /**
   * Mark message as delivered
   * Called when recipient's client receives the message
   */
  async markAsDelivered(messageId, recipientType, recipientId) {
    try {
      const message = await ChatMessage.findByPk(messageId);
      if (!message) return null;

      // Don't mark own messages
      if (message.sender_type === recipientType && message.sender_id === recipientId) {
        return message;
      }

      // Update delivery status if not already delivered/read
      if (['pending', 'sent'].includes(message.delivery_status)) {
        await message.update({
          delivery_status: 'delivered',
          delivered_at: new Date()
        });

        // Broadcast delivery status to sender
        this._broadcastDeliveryStatus(message, 'delivered', recipientType, recipientId);
      }

      return message;
    } catch (error) {
      console.error('Error marking message as delivered:', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId, readerType, readerId, readerName = null) {
    try {
      const message = await ChatMessage.findByPk(messageId);
      if (!message) return null;

      // Don't mark own messages
      if (message.sender_type === readerType && message.sender_id === readerId) {
        return { message, receipt: null, created: false };
      }

      // Create read receipt
      const { receipt, created } = await MessageReadReceipt.markAsRead(messageId, readerType, readerId);

      // Update message delivery status to 'read' if applicable
      if (message.delivery_status !== 'read') {
        await message.update({
          delivery_status: 'read',
          read_at: new Date()
        });
      }

      // Broadcast read status
      this._broadcastReadStatus(message, readerType, readerId, readerName);

      return { message, receipt, created };
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  /**
   * Mark multiple messages as read (batch)
   */
  async markMultipleAsRead(messageIds, readerType, readerId, readerName = null) {
    try {
      // Create receipts
      await MessageReadReceipt.markMultipleAsRead(messageIds, readerType, readerId);

      // Update messages
      await ChatMessage.update(
        {
          delivery_status: 'read',
          read_at: new Date()
        },
        {
          where: {
            id: messageIds,
            delivery_status: { [Op.in]: ['sent', 'delivered'] },
            // Don't update own messages
            [Op.not]: {
              sender_type: readerType,
              sender_id: readerId
            }
          }
        }
      );

      // Get updated messages for broadcasting
      const messages = await ChatMessage.findAll({
        where: { id: messageIds }
      });

      // Group by room/channel for efficient broadcasting
      const byRoom = {};
      const byChannel = {};

      for (const msg of messages) {
        if (msg.channel_id) {
          if (!byChannel[msg.channel_id]) byChannel[msg.channel_id] = [];
          byChannel[msg.channel_id].push(msg.id);
        } else if (msg.room_id) {
          if (!byRoom[msg.room_id]) byRoom[msg.room_id] = [];
          byRoom[msg.room_id].push(msg.id);
        }
      }

      // Broadcast batch updates
      for (const [roomId, msgIds] of Object.entries(byRoom)) {
        this._broadcastBatchReadStatus(roomId, null, msgIds, readerType, readerId, readerName);
      }

      for (const [channelId, msgIds] of Object.entries(byChannel)) {
        this._broadcastBatchReadStatus(null, channelId, msgIds, readerType, readerId, readerName);
      }

      return messages;
    } catch (error) {
      console.error('Error marking multiple messages as read:', error);
      throw error;
    }
  }

  /**
   * Get read receipts for a message with user details
   */
  async getReadReceipts(messageId) {
    try {
      const receipts = await MessageReadReceipt.getReadersForMessage(messageId);

      // Enrich with user names (you might want to cache this)
      const Employee = require('../models/Employee');
      const enrichedReceipts = [];

      for (const receipt of receipts) {
        let userName = 'Unknown';
        let userAvatar = null;

        if (receipt.reader_type === 'employee') {
          const employee = await Employee.findByPk(receipt.reader_id, {
            attributes: ['first_name', 'last_name', 'profile_photo']
          });
          if (employee) {
            userName = `${employee.first_name} ${employee.last_name}`;
            userAvatar = employee.profile_photo;
          }
        }

        enrichedReceipts.push({
          readerType: receipt.reader_type,
          readerId: receipt.reader_id,
          readerName: userName,
          readerAvatar: userAvatar,
          readAt: receipt.read_at
        });
      }

      return enrichedReceipts;
    } catch (error) {
      console.error('Error getting read receipts:', error);
      throw error;
    }
  }

  /**
   * Get message status with detailed read info
   */
  async getMessageStatus(messageId) {
    try {
      const message = await ChatMessage.findByPk(messageId);
      if (!message) return null;

      const receipts = await this.getReadReceipts(messageId);

      return {
        messageId: message.id,
        status: message.delivery_status,
        sentAt: message.created_at,
        deliveredAt: message.delivered_at,
        readAt: message.read_at,
        readBy: receipts,
        readCount: receipts.length
      };
    } catch (error) {
      console.error('Error getting message status:', error);
      throw error;
    }
  }

  /**
   * Get unread counts for multiple rooms/channels
   */
  async getUnreadCounts(userType, userId, roomIds = [], channelIds = []) {
    try {
      const counts = {};

      // Room unread counts
      for (const roomId of roomIds) {
        const count = await MessageReadReceipt.getUnreadCount(roomId, userType, userId);
        counts[`room_${roomId}`] = count;
      }

      // Channel unread counts
      for (const channelId of channelIds) {
        const count = await this._getChannelUnreadCount(channelId, userType, userId);
        counts[`channel_${channelId}`] = count;
      }

      return counts;
    } catch (error) {
      console.error('Error getting unread counts:', error);
      throw error;
    }
  }

  /**
   * Get unread count for a channel
   */
  async _getChannelUnreadCount(channelId, userType, userId) {
    try {
      const totalMessages = await ChatMessage.count({
        where: {
          channel_id: channelId,
          is_deleted: false,
          [Op.not]: {
            sender_type: userType,
            sender_id: userId
          }
        }
      });

      const readMessages = await MessageReadReceipt.count({
        where: {
          reader_type: userType,
          reader_id: userId
        },
        include: [{
          model: ChatMessage,
          as: 'message',
          where: { channel_id: channelId },
          required: true
        }]
      });

      return totalMessages - readMessages;
    } catch (error) {
      console.error('Error getting channel unread count:', error);
      return 0;
    }
  }

  /**
   * Mark all channel messages as read
   */
  async markChannelAsRead(channelId, readerType, readerId, readerName = null) {
    try {
      // Get unread messages
      const messages = await ChatMessage.findAll({
        where: {
          channel_id: channelId,
          is_deleted: false,
          [Op.not]: {
            sender_type: readerType,
            sender_id: readerId
          }
        },
        attributes: ['id']
      });

      if (messages.length === 0) return [];

      const messageIds = messages.map(m => m.id);
      return this.markMultipleAsRead(messageIds, readerType, readerId, readerName);
    } catch (error) {
      console.error('Error marking channel as read:', error);
      throw error;
    }
  }

  /**
   * Broadcast delivery status via WebSocket
   */
  _broadcastDeliveryStatus(message, status, recipientType, recipientId) {
    if (!this.wsService) return;

    const event = {
      type: 'message:delivery_status',
      data: {
        messageId: message.id,
        message_id: message.message_id,
        status,
        deliveredTo: {
          type: recipientType,
          id: recipientId
        },
        timestamp: new Date().toISOString()
      }
    };

    if (message.channel_id) {
      this.wsService.broadcastToChannel(message.channel_id, event);
    } else if (message.room_id) {
      this.wsService.broadcastToRoom(message.room_id, event);
    }
  }

  /**
   * Broadcast read status via WebSocket
   */
  _broadcastReadStatus(message, readerType, readerId, readerName) {
    if (!this.wsService) return;

    const event = {
      type: 'message:read',
      data: {
        messageId: message.id,
        message_id: message.message_id,
        readBy: {
          type: readerType,
          id: readerId,
          name: readerName
        },
        readAt: new Date().toISOString()
      }
    };

    if (message.channel_id) {
      this.wsService.broadcastToChannel(message.channel_id, event);
    } else if (message.room_id) {
      this.wsService.broadcastToRoom(message.room_id, event);
    }
  }

  /**
   * Broadcast batch read status via WebSocket
   */
  _broadcastBatchReadStatus(roomId, channelId, messageIds, readerType, readerId, readerName) {
    if (!this.wsService) return;

    const event = {
      type: 'messages:read_batch',
      data: {
        messageIds,
        roomId,
        channelId,
        readBy: {
          type: readerType,
          id: readerId,
          name: readerName
        },
        readAt: new Date().toISOString()
      }
    };

    if (channelId) {
      this.wsService.broadcastToChannel(channelId, event);
    } else if (roomId) {
      this.wsService.broadcastToRoom(roomId, event);
    }
  }
}

module.exports = new ReadReceiptService();
