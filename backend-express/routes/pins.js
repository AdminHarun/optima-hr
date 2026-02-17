/**
 * Message Pins Routes
 * Task 2.6: Message Pinning & Bookmarks
 *
 * Endpoints:
 * - POST /api/pins - Pin a message
 * - DELETE /api/pins/:messageId - Unpin a message
 * - GET /api/pins/channel/:channelId - Get pinned messages in a channel
 * - GET /api/pins/room/:roomId - Get pinned messages in a room
 */

const express = require('express');
const router = express.Router();
const { ChatMessage, Channel, ChatRoom, ChannelMember, Employee } = require('../models/associations');
const chatWebSocketService = require('../services/ChatWebSocketService');

// Site code helper
const getSiteCode = (req) => req.headers['x-site-id'] || 'FXB';

// Employee ID helper
const getEmployeeId = (req) => {
  return req.session?.employeeId || req.headers['x-employee-id'] || 1;
};

/**
 * POST /api/pins
 * Pin a message (requires appropriate permissions)
 */
router.post('/', async (req, res) => {
  try {
    const { messageId } = req.body;
    const employeeId = getEmployeeId(req);
    const siteCode = getSiteCode(req);

    if (!messageId) {
      return res.status(400).json({ error: 'messageId is required' });
    }

    // Get the message
    const message = await ChatMessage.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if already pinned
    if (message.is_pinned) {
      return res.status(400).json({ error: 'Message is already pinned' });
    }

    // Verify user has permission to pin (channel admin/owner or room participant)
    if (message.channel_id) {
      const channel = await Channel.findByPk(message.channel_id);
      if (!channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      // Check if user is channel member with admin rights
      const membership = await ChannelMember.findOne({
        where: {
          channel_id: message.channel_id,
          employee_id: employeeId
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this channel' });
      }

      // Only admins and owners can pin
      if (!['admin', 'owner'].includes(membership.role)) {
        return res.status(403).json({ error: 'Only channel admins can pin messages' });
      }
    } else if (message.room_id) {
      // For DMs/rooms, any participant can pin
      const room = await ChatRoom.findByPk(message.room_id);
      if (!room) {
        return res.status(404).json({ error: 'Room not found' });
      }
    }

    // Pin the message
    await ChatMessage.pinMessage(messageId, 'employee', employeeId);

    // Get employee name for notification
    const employee = await Employee.findByPk(employeeId);
    const pinnedByName = employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';

    // Broadcast pin event via WebSocket
    const pinEvent = {
      type: 'message:pinned',
      data: {
        messageId: message.id,
        message_id: message.message_id,
        channelId: message.channel_id,
        roomId: message.room_id,
        pinnedBy: {
          type: 'employee',
          id: employeeId,
          name: pinnedByName
        },
        pinnedAt: new Date().toISOString()
      }
    };

    if (message.channel_id) {
      chatWebSocketService.broadcastToChannel(message.channel_id, pinEvent);
    } else if (message.room_id) {
      chatWebSocketService.broadcastToRoom(message.room_id, pinEvent);
    }

    res.json({
      success: true,
      message: 'Message pinned successfully',
      pinnedMessage: {
        id: message.id,
        messageId: message.message_id,
        content: message.content,
        senderName: message.sender_name,
        pinnedAt: new Date().toISOString(),
        pinnedBy: pinnedByName
      }
    });
  } catch (error) {
    console.error('Error pinning message:', error);
    res.status(500).json({ error: error.message || 'Failed to pin message' });
  }
});

/**
 * DELETE /api/pins/:messageId
 * Unpin a message
 */
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const employeeId = getEmployeeId(req);

    // Get the message
    const message = await ChatMessage.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if pinned
    if (!message.is_pinned) {
      return res.status(400).json({ error: 'Message is not pinned' });
    }

    // Verify user has permission to unpin
    if (message.channel_id) {
      const membership = await ChannelMember.findOne({
        where: {
          channel_id: message.channel_id,
          employee_id: employeeId
        }
      });

      if (!membership) {
        return res.status(403).json({ error: 'Not a member of this channel' });
      }

      // Only admins, owners, or the person who pinned can unpin
      const canUnpin = ['admin', 'owner'].includes(membership.role) ||
        (message.pinned_by_type === 'employee' && message.pinned_by_id === parseInt(employeeId));

      if (!canUnpin) {
        return res.status(403).json({ error: 'Not authorized to unpin this message' });
      }
    }

    // Unpin the message
    await ChatMessage.unpinMessage(messageId);

    // Broadcast unpin event via WebSocket
    const unpinEvent = {
      type: 'message:unpinned',
      data: {
        messageId: message.id,
        message_id: message.message_id,
        channelId: message.channel_id,
        roomId: message.room_id,
        unpinnedBy: {
          type: 'employee',
          id: employeeId
        }
      }
    };

    if (message.channel_id) {
      chatWebSocketService.broadcastToChannel(message.channel_id, unpinEvent);
    } else if (message.room_id) {
      chatWebSocketService.broadcastToRoom(message.room_id, unpinEvent);
    }

    res.json({
      success: true,
      message: 'Message unpinned successfully'
    });
  } catch (error) {
    console.error('Error unpinning message:', error);
    res.status(500).json({ error: 'Failed to unpin message' });
  }
});

/**
 * GET /api/pins/channel/:channelId
 * Get all pinned messages in a channel
 */
router.get('/channel/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const employeeId = getEmployeeId(req);
    const { limit = 50 } = req.query;

    // Verify user is channel member
    const membership = await ChannelMember.findOne({
      where: {
        channel_id: parseInt(channelId),
        employee_id: employeeId
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'Not a member of this channel' });
    }

    const pinnedMessages = await ChatMessage.getPinnedMessages(
      parseInt(channelId),
      null,
      parseInt(limit)
    );

    res.json({
      pinnedMessages: pinnedMessages.map(m => ({
        id: m.id,
        messageId: m.message_id,
        content: m.content,
        messageType: m.message_type,
        senderName: m.sender_name,
        senderType: m.sender_type,
        senderId: m.sender_id,
        fileUrl: m.file_url,
        fileName: m.file_name,
        pinnedAt: m.pinned_at,
        pinnedByType: m.pinned_by_type,
        pinnedById: m.pinned_by_id,
        createdAt: m.created_at
      })),
      count: pinnedMessages.length
    });
  } catch (error) {
    console.error('Error fetching pinned messages:', error);
    res.status(500).json({ error: 'Failed to fetch pinned messages' });
  }
});

/**
 * GET /api/pins/room/:roomId
 * Get all pinned messages in a room
 */
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50 } = req.query;

    const pinnedMessages = await ChatMessage.getPinnedMessages(
      null,
      parseInt(roomId),
      parseInt(limit)
    );

    res.json({
      pinnedMessages: pinnedMessages.map(m => ({
        id: m.id,
        messageId: m.message_id,
        content: m.content,
        messageType: m.message_type,
        senderName: m.sender_name,
        senderType: m.sender_type,
        senderId: m.sender_id,
        fileUrl: m.file_url,
        fileName: m.file_name,
        pinnedAt: m.pinned_at,
        pinnedByType: m.pinned_by_type,
        pinnedById: m.pinned_by_id,
        createdAt: m.created_at
      })),
      count: pinnedMessages.length
    });
  } catch (error) {
    console.error('Error fetching pinned messages:', error);
    res.status(500).json({ error: 'Failed to fetch pinned messages' });
  }
});

module.exports = router;
