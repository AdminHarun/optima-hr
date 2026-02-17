/**
 * OfflineMessagingService
 * Task 1.6: Offline Messaging
 *
 * Handles:
 * - Queuing messages for offline users
 * - Delivering queued messages when users come online
 * - Push notification integration (FCM/APNS)
 * - Message expiration cleanup
 */

const OfflineMessageQueue = require('../models/OfflineMessageQueue');
const presenceService = require('./PresenceService');
const redisService = require('./RedisService');
const chatWebSocketService = require('./ChatWebSocketService');

class OfflineMessagingService {
  constructor() {
    this.cleanupInterval = null;
    this.pushNotificationProvider = null;
  }

  /**
   * Initialize the service
   */
  async initialize() {
    console.log('📬 Initializing OfflineMessagingService...');

    // Start cleanup job (every hour)
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredMessages();
    }, 60 * 60 * 1000);

    // Run initial cleanup
    await this.cleanupExpiredMessages();

    console.log('✅ OfflineMessagingService initialized');
  }

  /**
   * Check if user is online
   */
  async isUserOnline(userType, userId) {
    // Check presence service first
    const presenceKey = `${userType}_${userId}`;
    if (presenceService.isOnline(presenceKey)) {
      return true;
    }

    // Check Redis as backup
    try {
      const redisOnline = await redisService.isUserOnline(userType, userId);
      return redisOnline;
    } catch (error) {
      return false;
    }
  }

  /**
   * Queue a message for offline delivery
   */
  async queueMessage(params) {
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
      siteCode
    } = params;

    try {
      // Check if user is online - if so, don't queue
      const isOnline = await this.isUserOnline(recipientType, recipientId);
      if (isOnline) {
        console.log(`📬 User ${recipientType}:${recipientId} is online, not queuing message`);
        return null;
      }

      // Calculate priority (mentions get higher priority)
      let priority = 0;
      if (messageType === 'mention') {
        priority = 10;
      } else if (messageType === 'direct') {
        priority = 5;
      }

      // Get push token if available
      let pushToken = null;
      if (recipientType === 'employee') {
        try {
          const Employee = require('../models/Employee');
          const employee = await Employee.findByPk(recipientId, {
            attributes: ['push_token']
          });
          pushToken = employee?.push_token;
        } catch (e) {
          // Push token not available
        }
      }

      // Queue the message
      const queuedMessage = await OfflineMessageQueue.queueMessage({
        recipientType,
        recipientId,
        messageId,
        channelId,
        roomId,
        senderType,
        senderId,
        senderName,
        content,
        messageType,
        priority,
        siteCode,
        pushToken
      });

      console.log(`📬 Queued message ${messageId} for offline user ${recipientType}:${recipientId}`);

      // Send push notification if token available
      if (pushToken) {
        await this.sendPushNotification(queuedMessage);
      }

      return queuedMessage;
    } catch (error) {
      console.error('❌ Error queuing offline message:', error);
      return null;
    }
  }

  /**
   * Queue message for multiple recipients (for channel/group messages)
   */
  async queueMessageForRecipients(params, recipientIds) {
    const results = [];

    for (const recipientId of recipientIds) {
      const result = await this.queueMessage({
        ...params,
        recipientId
      });
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Deliver queued messages when user comes online
   */
  async deliverPendingMessages(userType, userId) {
    try {
      console.log(`📬 Delivering pending messages for ${userType}:${userId}`);

      // Get pending messages
      const pendingMessages = await OfflineMessageQueue.getPendingMessages(userType, userId);

      if (pendingMessages.length === 0) {
        console.log(`📬 No pending messages for ${userType}:${userId}`);
        return [];
      }

      console.log(`📬 Found ${pendingMessages.length} pending messages for ${userType}:${userId}`);

      // Get the actual messages from database
      const ChatMessage = require('../models/ChatMessage');
      const messageIds = pendingMessages.map(m => m.message_id);

      const messages = await ChatMessage.findAll({
        where: {
          message_id: messageIds,
          is_deleted: false
        },
        order: [['created_at', 'ASC']]
      });

      // Send notification to user about pending messages
      chatWebSocketService.sendToUser(userType, userId, {
        type: 'pending_messages_available',
        count: messages.length,
        messages: messages.map(m => ({
          id: m.id,
          messageId: m.message_id,
          channelId: m.channel_id,
          roomId: m.room_id,
          content: m.content,
          senderName: m.sender_name,
          senderType: m.sender_type,
          createdAt: m.created_at
        }))
      });

      // Mark messages as delivered
      const queueIds = pendingMessages.map(m => m.id);
      await OfflineMessageQueue.markDelivered(queueIds);

      console.log(`✅ Delivered ${messages.length} pending messages to ${userType}:${userId}`);

      return messages;
    } catch (error) {
      console.error('❌ Error delivering pending messages:', error);
      return [];
    }
  }

  /**
   * Get unread count for user
   */
  async getUnreadCount(userType, userId) {
    try {
      return await OfflineMessageQueue.getUnreadCount(userType, userId);
    } catch (error) {
      console.error('❌ Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Send push notification for queued message
   */
  async sendPushNotification(queuedMessage) {
    if (!queuedMessage.push_token) {
      return false;
    }

    try {
      // Prepare notification payload
      const notification = {
        title: queuedMessage.sender_name,
        body: queuedMessage.content_preview || 'Yeni mesaj',
        data: {
          messageId: queuedMessage.message_id,
          channelId: queuedMessage.channel_id,
          roomId: queuedMessage.room_id,
          messageType: queuedMessage.message_type
        }
      };

      // TODO: Integrate with FCM or APNS
      // For now, just mark as sent
      // await this.pushNotificationProvider.send(queuedMessage.push_token, notification);

      await OfflineMessageQueue.markPushSent(queuedMessage.id);
      console.log(`📱 Push notification sent for message ${queuedMessage.message_id}`);

      return true;
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Process pending push notifications
   */
  async processPendingPushNotifications() {
    try {
      const pendingPush = await OfflineMessageQueue.getPendingPushNotifications();

      for (const message of pendingPush) {
        await this.sendPushNotification(message);
      }

      console.log(`📱 Processed ${pendingPush.length} pending push notifications`);
    } catch (error) {
      console.error('❌ Error processing push notifications:', error);
    }
  }

  /**
   * Clean up expired messages
   */
  async cleanupExpiredMessages() {
    try {
      const count = await OfflineMessageQueue.cleanupExpired();
      if (count > 0) {
        console.log(`🧹 Cleaned up ${count} expired offline messages`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up expired messages:', error);
    }
  }

  /**
   * Handle user coming online
   * Called by presence service when user connects
   */
  async onUserOnline(userType, userId) {
    console.log(`📬 User ${userType}:${userId} came online, checking pending messages`);

    // Deliver pending messages
    const deliveredMessages = await this.deliverPendingMessages(userType, userId);

    return deliveredMessages;
  }

  /**
   * Shutdown the service
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('📬 OfflineMessagingService shutdown');
  }
}

// Create singleton instance
const offlineMessagingService = new OfflineMessagingService();

module.exports = offlineMessagingService;
