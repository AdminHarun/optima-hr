/**
 * Scheduled Messages Routes
 * Task 2.4: Message Scheduling
 *
 * Endpoints:
 * - POST /api/scheduled - Create scheduled message
 * - GET /api/scheduled - Get user's scheduled messages
 * - PUT /api/scheduled/:id - Update scheduled message
 * - DELETE /api/scheduled/:id - Cancel scheduled message
 */

const express = require('express');
const router = express.Router();
const scheduledMessageService = require('../services/ScheduledMessageService');
const { Employee } = require('../models/associations');

// Site code helper
const getSiteCode = (req) => req.headers['x-site-id'] || 'FXB';

// Employee ID helper
const getEmployeeId = (req) => {
  return req.session?.employeeId || req.headers['x-employee-id'] || 1;
};

/**
 * POST /api/scheduled
 * Create a scheduled message
 */
router.post('/', async (req, res) => {
  try {
    const {
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
      timezone,
      isRecurring,
      recurrencePattern,
      recurrenceEndAt
    } = req.body;

    const employeeId = getEmployeeId(req);
    const siteCode = getSiteCode(req);

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (!scheduledAt) {
      return res.status(400).json({ error: 'scheduledAt is required' });
    }

    if (!channelId && !roomId) {
      return res.status(400).json({ error: 'channelId or roomId is required' });
    }

    // Get sender info
    const employee = await Employee.findByPk(employeeId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const senderName = `${employee.first_name} ${employee.last_name}`;

    // Create scheduled message
    const scheduled = await scheduledMessageService.scheduleMessage({
      senderType: 'employee',
      senderId: employeeId,
      senderName,
      channelId: channelId ? parseInt(channelId) : null,
      roomId: roomId ? parseInt(roomId) : null,
      threadId: threadId ? parseInt(threadId) : null,
      content: content.trim(),
      messageType,
      fileUrl,
      fileName,
      fileSize,
      fileMimeType,
      scheduledAt,
      timezone,
      isRecurring,
      recurrencePattern,
      recurrenceEndAt,
      siteCode
    });

    res.status(201).json({
      success: true,
      scheduled: {
        id: scheduled.id,
        content: scheduled.content,
        channelId: scheduled.channel_id,
        roomId: scheduled.room_id,
        scheduledAt: scheduled.scheduled_at,
        timezone: scheduled.timezone,
        isRecurring: scheduled.is_recurring,
        recurrencePattern: scheduled.recurrence_pattern,
        status: scheduled.status,
        createdAt: scheduled.created_at
      }
    });
  } catch (error) {
    console.error('Error creating scheduled message:', error);
    res.status(500).json({ error: error.message || 'Failed to create scheduled message' });
  }
});

/**
 * GET /api/scheduled
 * Get user's scheduled messages
 */
router.get('/', async (req, res) => {
  try {
    const employeeId = getEmployeeId(req);
    const { includeCompleted } = req.query;

    const messages = await scheduledMessageService.getUserScheduledMessages(
      'employee',
      employeeId
    );

    res.json({
      scheduledMessages: messages.map(m => ({
        id: m.id,
        content: m.content,
        messageType: m.message_type,
        channelId: m.channel_id,
        roomId: m.room_id,
        threadId: m.thread_id,
        scheduledAt: m.scheduled_at,
        timezone: m.timezone,
        isRecurring: m.is_recurring,
        recurrencePattern: m.recurrence_pattern,
        recurrenceEndAt: m.recurrence_end_at,
        status: m.status,
        sentAt: m.sent_at,
        createdAt: m.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching scheduled messages:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled messages' });
  }
});

/**
 * GET /api/scheduled/:id
 * Get a specific scheduled message
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = getEmployeeId(req);
    const ScheduledMessage = require('../models/ScheduledMessage');

    const message = await ScheduledMessage.findOne({
      where: {
        id: parseInt(id),
        sender_id: employeeId
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Scheduled message not found' });
    }

    res.json({
      id: message.id,
      content: message.content,
      messageType: message.message_type,
      channelId: message.channel_id,
      roomId: message.room_id,
      threadId: message.thread_id,
      fileUrl: message.file_url,
      fileName: message.file_name,
      scheduledAt: message.scheduled_at,
      timezone: message.timezone,
      isRecurring: message.is_recurring,
      recurrencePattern: message.recurrence_pattern,
      recurrenceEndAt: message.recurrence_end_at,
      status: message.status,
      sentAt: message.sent_at,
      sentMessageId: message.sent_message_id,
      errorMessage: message.error_message,
      createdAt: message.created_at
    });
  } catch (error) {
    console.error('Error fetching scheduled message:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled message' });
  }
});

/**
 * PUT /api/scheduled/:id
 * Update a scheduled message
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      content,
      scheduledAt,
      isRecurring,
      recurrencePattern,
      recurrenceEndAt
    } = req.body;

    const employeeId = getEmployeeId(req);

    const updated = await scheduledMessageService.updateScheduledMessage(
      parseInt(id),
      employeeId,
      {
        content,
        scheduled_at: scheduledAt,
        is_recurring: isRecurring,
        recurrence_pattern: recurrencePattern,
        recurrence_end_at: recurrenceEndAt
      }
    );

    res.json({
      success: true,
      scheduled: {
        id: updated.id,
        content: updated.content,
        scheduledAt: updated.scheduled_at,
        isRecurring: updated.is_recurring,
        recurrencePattern: updated.recurrence_pattern,
        status: updated.status
      }
    });
  } catch (error) {
    console.error('Error updating scheduled message:', error);
    res.status(500).json({ error: error.message || 'Failed to update scheduled message' });
  }
});

/**
 * DELETE /api/scheduled/:id
 * Cancel a scheduled message
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = getEmployeeId(req);

    const cancelled = await scheduledMessageService.cancelScheduledMessage(
      parseInt(id),
      employeeId
    );

    if (!cancelled) {
      return res.status(404).json({ error: 'Scheduled message not found or already sent' });
    }

    res.json({ success: true, message: 'Scheduled message cancelled' });
  } catch (error) {
    console.error('Error cancelling scheduled message:', error);
    res.status(500).json({ error: 'Failed to cancel scheduled message' });
  }
});

module.exports = router;
