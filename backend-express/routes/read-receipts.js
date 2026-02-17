/**
 * Read Receipts Routes
 * Task 2.5: Enhanced Read Receipts & Typing Indicators
 *
 * Endpoints:
 * - POST /api/read-receipts/mark/:messageId - Mark single message as read
 * - POST /api/read-receipts/mark-batch - Mark multiple messages as read
 * - POST /api/read-receipts/mark-room/:roomId - Mark all messages in room as read
 * - POST /api/read-receipts/mark-channel/:channelId - Mark all messages in channel as read
 * - GET /api/read-receipts/message/:messageId - Get read receipts for a message
 * - GET /api/read-receipts/status/:messageId - Get message status with read details
 * - GET /api/read-receipts/unread-counts - Get unread counts for multiple rooms/channels
 */

const express = require('express');
const router = express.Router();
const readReceiptService = require('../services/ReadReceiptService');
const { Employee } = require('../models/associations');

// Site code helper
const getSiteCode = (req) => req.headers['x-site-id'] || 'FXB';

// Employee ID helper
const getEmployeeId = (req) => {
  return req.session?.employeeId || req.headers['x-employee-id'] || 1;
};

// Get employee name helper
const getEmployeeName = async (employeeId) => {
  try {
    const employee = await Employee.findByPk(employeeId, {
      attributes: ['first_name', 'last_name']
    });
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
};

/**
 * POST /api/read-receipts/mark/:messageId
 * Mark a single message as read
 */
router.post('/mark/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const employeeId = getEmployeeId(req);
    const employeeName = await getEmployeeName(employeeId);

    const result = await readReceiptService.markAsRead(
      parseInt(messageId),
      'employee',
      employeeId,
      employeeName
    );

    if (!result.message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({
      success: true,
      created: result.created,
      messageId: result.message.id,
      status: result.message.delivery_status
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

/**
 * POST /api/read-receipts/mark-batch
 * Mark multiple messages as read
 */
router.post('/mark-batch', async (req, res) => {
  try {
    const { messageIds } = req.body;
    const employeeId = getEmployeeId(req);

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds array is required' });
    }

    const employeeName = await getEmployeeName(employeeId);

    await readReceiptService.markMultipleAsRead(
      messageIds.map(id => parseInt(id)),
      'employee',
      employeeId,
      employeeName
    );

    res.json({
      success: true,
      markedCount: messageIds.length
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

/**
 * POST /api/read-receipts/mark-room/:roomId
 * Mark all messages in a room as read
 */
router.post('/mark-room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const employeeId = getEmployeeId(req);
    const MessageReadReceipt = require('../models/MessageReadReceipt');

    await MessageReadReceipt.markRoomAsRead(
      parseInt(roomId),
      'employee',
      employeeId
    );

    res.json({
      success: true,
      roomId: parseInt(roomId)
    });
  } catch (error) {
    console.error('Error marking room as read:', error);
    res.status(500).json({ error: 'Failed to mark room as read' });
  }
});

/**
 * POST /api/read-receipts/mark-channel/:channelId
 * Mark all messages in a channel as read
 */
router.post('/mark-channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const employeeId = getEmployeeId(req);
    const employeeName = await getEmployeeName(employeeId);

    await readReceiptService.markChannelAsRead(
      parseInt(channelId),
      'employee',
      employeeId,
      employeeName
    );

    res.json({
      success: true,
      channelId: parseInt(channelId)
    });
  } catch (error) {
    console.error('Error marking channel as read:', error);
    res.status(500).json({ error: 'Failed to mark channel as read' });
  }
});

/**
 * GET /api/read-receipts/message/:messageId
 * Get read receipts for a message
 */
router.get('/message/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const receipts = await readReceiptService.getReadReceipts(parseInt(messageId));

    res.json({
      messageId: parseInt(messageId),
      receipts,
      readCount: receipts.length
    });
  } catch (error) {
    console.error('Error getting read receipts:', error);
    res.status(500).json({ error: 'Failed to get read receipts' });
  }
});

/**
 * GET /api/read-receipts/status/:messageId
 * Get detailed message status
 */
router.get('/status/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const status = await readReceiptService.getMessageStatus(parseInt(messageId));

    if (!status) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(status);
  } catch (error) {
    console.error('Error getting message status:', error);
    res.status(500).json({ error: 'Failed to get message status' });
  }
});

/**
 * POST /api/read-receipts/unread-counts
 * Get unread counts for multiple rooms/channels
 */
router.post('/unread-counts', async (req, res) => {
  try {
    const { roomIds = [], channelIds = [] } = req.body;
    const employeeId = getEmployeeId(req);

    const counts = await readReceiptService.getUnreadCounts(
      'employee',
      employeeId,
      roomIds.map(id => parseInt(id)),
      channelIds.map(id => parseInt(id))
    );

    res.json({ counts });
  } catch (error) {
    console.error('Error getting unread counts:', error);
    res.status(500).json({ error: 'Failed to get unread counts' });
  }
});

/**
 * POST /api/read-receipts/delivered/:messageId
 * Mark message as delivered
 */
router.post('/delivered/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const employeeId = getEmployeeId(req);

    const message = await readReceiptService.markAsDelivered(
      parseInt(messageId),
      'employee',
      employeeId
    );

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({
      success: true,
      messageId: message.id,
      status: message.delivery_status
    });
  } catch (error) {
    console.error('Error marking message as delivered:', error);
    res.status(500).json({ error: 'Failed to mark message as delivered' });
  }
});

module.exports = router;
