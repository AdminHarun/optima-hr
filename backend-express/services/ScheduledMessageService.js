/**
 * ScheduledMessageService
 * Task 2.4: Message Scheduling
 *
 * Handles:
 * - Creating scheduled messages
 * - Processing due messages
 * - Sending messages at scheduled time
 * - Recurring message support
 */

const ScheduledMessage = require('../models/ScheduledMessage');
const { ChatMessage, Channel, ChannelMember } = require('../models/associations');
const chatWebSocketService = require('./ChatWebSocketService');

class ScheduledMessageService {
  constructor() {
    this.processingInterval = null;
    this.isProcessing = false;
  }

  /**
   * Initialize the service - start the scheduler
   */
  async initialize() {
    console.log('📅 Initializing ScheduledMessageService...');

    // Process pending messages every minute
    this.processingInterval = setInterval(() => {
      this.processPendingMessages();
    }, 60 * 1000);

    // Process immediately on startup
    await this.processPendingMessages();

    console.log('✅ ScheduledMessageService initialized');
  }

  /**
   * Schedule a new message
   */
  async scheduleMessage(params) {
    const {
      senderType,
      senderId,
      senderName,
      channelId,
      roomId,
      threadId,
      content,
      messageType = 'text',
      fileUrl,
      fileName,
      fileSize,
      fileMimeType,
      scheduledAt,
      timezone = 'Europe/Istanbul',
      isRecurring = false,
      recurrencePattern,
      recurrenceEndAt,
      siteCode
    } = params;

    // Validate scheduled time is in the future
    const scheduledTime = new Date(scheduledAt);
    if (scheduledTime <= new Date()) {
      throw new Error('Scheduled time must be in the future');
    }

    // Create scheduled message
    const scheduled = await ScheduledMessage.create({
      sender_type: senderType,
      sender_id: senderId,
      sender_name: senderName,
      channel_id: channelId,
      room_id: roomId,
      thread_id: threadId,
      content,
      message_type: messageType,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      file_mime_type: fileMimeType,
      scheduled_at: scheduledTime,
      timezone,
      is_recurring: isRecurring,
      recurrence_pattern: recurrencePattern,
      recurrence_end_at: recurrenceEndAt,
      site_code: siteCode,
      status: 'pending'
    });

    console.log(`📅 Message scheduled for ${scheduledTime.toISOString()} by ${senderName}`);

    return scheduled;
  }

  /**
   * Process all pending messages that are due
   */
  async processPendingMessages() {
    if (this.isProcessing) {
      console.log('📅 Already processing scheduled messages, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      const pendingMessages = await ScheduledMessage.getPendingMessages();

      if (pendingMessages.length > 0) {
        console.log(`📅 Processing ${pendingMessages.length} scheduled messages...`);

        for (const scheduled of pendingMessages) {
          await this.sendScheduledMessage(scheduled);
        }
      }
    } catch (error) {
      console.error('❌ Error processing scheduled messages:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send a scheduled message
   */
  async sendScheduledMessage(scheduled) {
    try {
      // Generate message ID
      const messageId = `sched_${scheduled.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create the actual message
      const message = await ChatMessage.create({
        message_id: messageId,
        channel_id: scheduled.channel_id,
        room_id: scheduled.room_id,
        sender_type: scheduled.sender_type,
        sender_name: scheduled.sender_name,
        sender_id: scheduled.sender_id,
        content: scheduled.content,
        message_type: scheduled.message_type,
        file_url: scheduled.file_url,
        file_name: scheduled.file_name,
        file_size: scheduled.file_size,
        file_mime_type: scheduled.file_mime_type,
        thread_id: scheduled.thread_id,
        metadata: { scheduled: true, scheduled_id: scheduled.id },
        status: 'sent'
      });

      // Broadcast to channel/room via WebSocket
      if (scheduled.channel_id) {
        // Update channel last_message
        await Channel.update({
          last_message_at: new Date(),
          last_message_preview: scheduled.content.substring(0, 100),
          message_count: require('sequelize').literal('message_count + 1')
        }, {
          where: { id: scheduled.channel_id }
        });

        // Increment unread for other members
        await ChannelMember.incrementUnreadForAll(scheduled.channel_id, scheduled.sender_id);

        // Get sender avatar
        const Employee = require('../models/Employee');
        const employee = await Employee.findByPk(scheduled.sender_id);

        // Broadcast
        chatWebSocketService.broadcastToRoom(`channel_${scheduled.channel_id}`, {
          type: 'channel_message',
          channelId: scheduled.channel_id,
          message: {
            id: message.id,
            messageId: message.message_id,
            content: message.content,
            messageType: message.message_type,
            senderType: message.sender_type,
            senderName: message.sender_name,
            senderId: message.sender_id,
            senderAvatar: employee?.profile_picture || null,
            fileUrl: message.file_url,
            fileName: message.file_name,
            threadId: message.thread_id,
            metadata: message.metadata,
            createdAt: message.created_at
          }
        });
      } else if (scheduled.room_id) {
        // Broadcast to room
        chatWebSocketService.broadcastToRoom(scheduled.room_id.toString(), {
          type: 'chat_message',
          message: {
            id: message.id,
            message_id: message.message_id,
            content: message.content,
            message_type: message.message_type,
            sender_type: message.sender_type,
            sender_name: message.sender_name,
            sender_id: message.sender_id,
            file_url: message.file_url,
            file_name: message.file_name,
            metadata: message.metadata,
            created_at: message.created_at
          }
        });
      }

      // Mark scheduled message as sent
      await ScheduledMessage.markAsSent(scheduled.id, messageId);

      console.log(`✅ Scheduled message ${scheduled.id} sent successfully`);

      // Handle recurring messages
      if (scheduled.is_recurring && scheduled.recurrence_pattern) {
        await this.createNextRecurrence(scheduled);
      }

    } catch (error) {
      console.error(`❌ Error sending scheduled message ${scheduled.id}:`, error);
      await ScheduledMessage.markAsFailed(scheduled.id, error.message);
    }
  }

  /**
   * Create the next occurrence for a recurring message
   */
  async createNextRecurrence(scheduled) {
    const nextTime = this.calculateNextOccurrence(
      scheduled.scheduled_at,
      scheduled.recurrence_pattern
    );

    // Check if next occurrence is within the end date
    if (scheduled.recurrence_end_at && nextTime > new Date(scheduled.recurrence_end_at)) {
      console.log(`📅 Recurring message ${scheduled.id} has reached its end date`);
      return;
    }

    // Create new scheduled message
    await ScheduledMessage.create({
      sender_type: scheduled.sender_type,
      sender_id: scheduled.sender_id,
      sender_name: scheduled.sender_name,
      channel_id: scheduled.channel_id,
      room_id: scheduled.room_id,
      thread_id: scheduled.thread_id,
      content: scheduled.content,
      message_type: scheduled.message_type,
      file_url: scheduled.file_url,
      file_name: scheduled.file_name,
      file_size: scheduled.file_size,
      file_mime_type: scheduled.file_mime_type,
      scheduled_at: nextTime,
      timezone: scheduled.timezone,
      is_recurring: true,
      recurrence_pattern: scheduled.recurrence_pattern,
      recurrence_end_at: scheduled.recurrence_end_at,
      site_code: scheduled.site_code,
      status: 'pending'
    });

    console.log(`📅 Created next recurrence for message ${scheduled.id} at ${nextTime.toISOString()}`);
  }

  /**
   * Calculate next occurrence based on pattern
   */
  calculateNextOccurrence(currentTime, pattern) {
    const current = new Date(currentTime);
    const next = new Date(current);

    switch (pattern) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'biweekly':
        next.setDate(next.getDate() + 14);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'weekdays':
        do {
          next.setDate(next.getDate() + 1);
        } while (next.getDay() === 0 || next.getDay() === 6);
        break;
      default:
        // For cron expressions, would need a cron parser
        next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * Get user's scheduled messages
   */
  async getUserScheduledMessages(senderType, senderId) {
    return await ScheduledMessage.getUserScheduledMessages(senderType, senderId);
  }

  /**
   * Cancel a scheduled message
   */
  async cancelScheduledMessage(id, senderId) {
    return await ScheduledMessage.cancelMessage(id, senderId);
  }

  /**
   * Update a scheduled message
   */
  async updateScheduledMessage(id, senderId, updates) {
    const message = await ScheduledMessage.findOne({
      where: {
        id,
        sender_id: senderId,
        status: 'pending'
      }
    });

    if (!message) {
      throw new Error('Scheduled message not found or cannot be edited');
    }

    // Only allow updating certain fields
    const allowedUpdates = ['content', 'scheduled_at', 'is_recurring', 'recurrence_pattern', 'recurrence_end_at'];
    const filteredUpdates = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    // Validate new scheduled time if provided
    if (filteredUpdates.scheduled_at) {
      const newTime = new Date(filteredUpdates.scheduled_at);
      if (newTime <= new Date()) {
        throw new Error('Scheduled time must be in the future');
      }
    }

    await message.update(filteredUpdates);
    return message;
  }

  /**
   * Shutdown the service
   */
  shutdown() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    console.log('📅 ScheduledMessageService shutdown');
  }
}

// Create singleton instance
const scheduledMessageService = new ScheduledMessageService();

module.exports = scheduledMessageService;
