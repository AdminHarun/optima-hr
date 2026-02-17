/**
 * Voice Message Routes
 * Task 2.2: Voice Message System
 *
 * Endpoints:
 * - POST /api/voice/upload - Upload voice message
 * - GET /api/voice/:filename - Get voice message info
 * - DELETE /api/voice/:filename - Delete voice message
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const voiceMessageService = require('../services/VoiceMessageService');
const { ChatMessage, Channel, ChannelMember } = require('../models/associations');
const chatWebSocketService = require('../services/ChatWebSocketService');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max
  }
});

// Site code helper
const getSiteCode = (req) => req.headers['x-site-id'] || 'FXB';

// Employee ID helper
const getEmployeeId = (req) => {
  return req.session?.employeeId || req.headers['x-employee-id'] || 1;
};

/**
 * POST /api/voice/upload
 * Upload a voice message
 */
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { channelId, roomId, duration, waveform } = req.body;
    const employeeId = getEmployeeId(req);
    const siteCode = getSiteCode(req);

    // Parse waveform if string
    let waveformData = null;
    if (waveform) {
      try {
        waveformData = typeof waveform === 'string' ? JSON.parse(waveform) : waveform;
      } catch (e) {
        // Ignore parse error
      }
    }

    // Save voice message
    const voiceInfo = await voiceMessageService.saveVoiceMessage(
      req.file.buffer,
      req.file.mimetype,
      {
        duration: parseFloat(duration) || 0,
        waveform: waveformData
      }
    );

    console.log(`🎤 Voice message uploaded: ${voiceInfo.filename} (${voiceInfo.duration}s)`);

    res.status(201).json({
      success: true,
      voice: {
        filename: voiceInfo.filename,
        url: voiceInfo.url,
        size: voiceInfo.size,
        duration: voiceInfo.duration,
        durationFormatted: voiceMessageService.formatDuration(voiceInfo.duration),
        waveform: voiceInfo.waveform,
        mimeType: voiceInfo.mimeType
      }
    });
  } catch (error) {
    console.error('Error uploading voice message:', error);
    res.status(500).json({ error: error.message || 'Failed to upload voice message' });
  }
});

/**
 * POST /api/voice/send
 * Upload and send voice message to a channel/room
 */
router.post('/send', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { channelId, roomId, duration, waveform, threadId } = req.body;
    const employeeId = getEmployeeId(req);
    const siteCode = getSiteCode(req);

    if (!channelId && !roomId) {
      return res.status(400).json({ error: 'channelId or roomId is required' });
    }

    // Parse waveform if string
    let waveformData = null;
    if (waveform) {
      try {
        waveformData = typeof waveform === 'string' ? JSON.parse(waveform) : waveform;
      } catch (e) {
        // Ignore parse error
      }
    }

    // Save voice message
    const voiceInfo = await voiceMessageService.saveVoiceMessage(
      req.file.buffer,
      req.file.mimetype,
      {
        duration: parseFloat(duration) || 0,
        waveform: waveformData
      }
    );

    // Get sender info
    const Employee = require('../models/Employee');
    const employee = await Employee.findByPk(employeeId);
    const senderName = employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';

    // Create message with voice attachment
    const messageId = `voice_${channelId || roomId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const message = await ChatMessage.create({
      message_id: messageId,
      channel_id: channelId ? parseInt(channelId) : null,
      room_id: roomId ? parseInt(roomId) : null,
      sender_type: 'employee',
      sender_name: senderName,
      sender_id: employeeId,
      content: `🎤 Sesli mesaj (${voiceMessageService.formatDuration(voiceInfo.duration)})`,
      message_type: 'voice',
      file_url: voiceInfo.url,
      file_name: voiceInfo.filename,
      file_size: voiceInfo.size,
      file_mime_type: voiceInfo.mimeType,
      thread_id: threadId || null,
      metadata: {
        voice: {
          duration: voiceInfo.duration,
          waveform: voiceInfo.waveform
        }
      },
      status: 'sent'
    });

    // Broadcast to channel/room via WebSocket
    if (channelId) {
      // Update channel last_message
      await Channel.update({
        last_message_at: new Date(),
        last_message_preview: `🎤 Sesli mesaj`,
        message_count: require('sequelize').literal('message_count + 1')
      }, {
        where: { id: parseInt(channelId) }
      });

      // Increment unread for other members
      await ChannelMember.incrementUnreadForAll(parseInt(channelId), employeeId);

      // Broadcast
      chatWebSocketService.broadcastToRoom(`channel_${channelId}`, {
        type: 'channel_message',
        channelId: parseInt(channelId),
        message: {
          id: message.id,
          messageId: message.message_id,
          content: message.content,
          messageType: 'voice',
          senderType: message.sender_type,
          senderName: message.sender_name,
          senderId: message.sender_id,
          senderAvatar: employee?.profile_picture || null,
          fileUrl: message.file_url,
          fileName: message.file_name,
          fileSize: message.file_size,
          fileMimeType: message.file_mime_type,
          threadId: message.thread_id,
          metadata: message.metadata,
          createdAt: message.created_at
        }
      });
    } else if (roomId) {
      // Broadcast to room
      chatWebSocketService.broadcastToRoom(roomId, {
        type: 'chat_message',
        message: {
          id: message.id,
          message_id: message.message_id,
          content: message.content,
          message_type: 'voice',
          sender_type: message.sender_type,
          sender_name: message.sender_name,
          sender_id: message.sender_id,
          file_url: message.file_url,
          file_name: message.file_name,
          file_size: message.file_size,
          file_mime_type: message.file_mime_type,
          metadata: message.metadata,
          created_at: message.created_at
        }
      });
    }

    console.log(`🎤 Voice message sent to ${channelId ? 'channel' : 'room'} ${channelId || roomId}`);

    res.status(201).json({
      success: true,
      message: {
        id: message.id,
        messageId: message.message_id,
        content: message.content,
        messageType: 'voice',
        senderName: message.sender_name,
        senderId: message.sender_id,
        fileUrl: message.file_url,
        duration: voiceInfo.duration,
        durationFormatted: voiceMessageService.formatDuration(voiceInfo.duration),
        waveform: voiceInfo.waveform,
        createdAt: message.created_at
      }
    });
  } catch (error) {
    console.error('Error sending voice message:', error);
    res.status(500).json({ error: error.message || 'Failed to send voice message' });
  }
});

/**
 * GET /api/voice/:filename
 * Get voice message info
 */
router.get('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;

    const info = await voiceMessageService.getVoiceMessageInfo(filename);

    if (!info) {
      return res.status(404).json({ error: 'Voice message not found' });
    }

    res.json(info);
  } catch (error) {
    console.error('Error fetching voice message info:', error);
    res.status(500).json({ error: 'Failed to fetch voice message info' });
  }
});

/**
 * DELETE /api/voice/:messageId
 * Delete voice message
 */
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const employeeId = getEmployeeId(req);

    // Find the message
    const message = await ChatMessage.findOne({
      where: { message_id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: 'Voice message not found' });
    }

    // Check if user is the sender
    if (message.sender_id !== employeeId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Delete physical file
    if (message.file_name) {
      await voiceMessageService.deleteVoiceMessage(message.file_name);
    }

    // Soft delete the message
    await message.update({
      is_deleted: true,
      deleted_at: new Date(),
      content: '',
      file_url: null,
      file_name: null
    });

    console.log(`🗑️ Voice message deleted: ${messageId}`);

    res.json({ success: true, message: 'Voice message deleted' });
  } catch (error) {
    console.error('Error deleting voice message:', error);
    res.status(500).json({ error: 'Failed to delete voice message' });
  }
});

module.exports = router;
