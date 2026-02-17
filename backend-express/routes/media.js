/**
 * Media Routes
 * Task 2.1: File Preview & Media Gallery
 *
 * Endpoints:
 * - POST /api/media/upload - Upload file
 * - GET /api/media/gallery - Get media gallery
 * - GET /api/media/counts - Get media counts by type
 * - DELETE /api/media/:id - Delete media file
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fileService = require('../services/FileService');
const { ChatMessage } = require('../models/associations');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

// Site code helper
const getSiteCode = (req) => req.headers['x-site-id'] || 'FXB';

// Employee ID helper
const getEmployeeId = (req) => {
  return req.session?.employeeId || req.headers['x-employee-id'] || 1;
};

/**
 * POST /api/media/upload
 * Upload a file
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { channelId, roomId, messageContext } = req.body;
    const employeeId = getEmployeeId(req);

    // Save file
    const fileInfo = await fileService.saveFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    console.log(`📁 File uploaded: ${fileInfo.filename} (${fileInfo.type})`);

    res.status(201).json({
      success: true,
      file: {
        filename: fileInfo.filename,
        originalName: fileInfo.originalName,
        url: fileInfo.url,
        size: fileInfo.size,
        type: fileInfo.type,
        mimeType: fileInfo.mimeType,
        thumbnails: fileInfo.thumbnails,
        metadata: fileInfo.metadata
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

/**
 * POST /api/media/upload-multiple
 * Upload multiple files
 */
router.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const results = [];
    const errors = [];

    for (const file of req.files) {
      try {
        const fileInfo = await fileService.saveFile(
          file.buffer,
          file.originalname,
          file.mimetype
        );

        results.push({
          filename: fileInfo.filename,
          originalName: fileInfo.originalName,
          url: fileInfo.url,
          size: fileInfo.size,
          type: fileInfo.type,
          mimeType: fileInfo.mimeType,
          thumbnails: fileInfo.thumbnails
        });
      } catch (fileError) {
        errors.push({
          filename: file.originalname,
          error: fileError.message
        });
      }
    }

    console.log(`📁 Multiple files uploaded: ${results.length} success, ${errors.length} failed`);

    res.status(201).json({
      success: true,
      files: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

/**
 * GET /api/media/gallery
 * Get media gallery for channel or room
 */
router.get('/gallery', async (req, res) => {
  try {
    const { channelId, roomId, type = 'all', limit = 50, offset = 0 } = req.query;

    if (!channelId && !roomId) {
      return res.status(400).json({ error: 'channelId or roomId is required' });
    }

    const media = await fileService.getMediaGallery(
      channelId ? parseInt(channelId) : null,
      roomId ? parseInt(roomId) : null,
      { type, limit, offset }
    );

    res.json({
      media,
      count: media.length,
      hasMore: media.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching media gallery:', error);
    res.status(500).json({ error: 'Failed to fetch media gallery' });
  }
});

/**
 * GET /api/media/counts
 * Get media counts by type for channel or room
 */
router.get('/counts', async (req, res) => {
  try {
    const { channelId, roomId } = req.query;

    if (!channelId && !roomId) {
      return res.status(400).json({ error: 'channelId or roomId is required' });
    }

    const counts = await fileService.getMediaCounts(
      channelId ? parseInt(channelId) : null,
      roomId ? parseInt(roomId) : null
    );

    res.json(counts);
  } catch (error) {
    console.error('Error fetching media counts:', error);
    res.status(500).json({ error: 'Failed to fetch media counts' });
  }
});

/**
 * GET /api/media/:messageId
 * Get media info for a message
 */
router.get('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await ChatMessage.findOne({
      where: { message_id: messageId },
      attributes: ['id', 'message_id', 'file_url', 'file_name', 'file_size', 'file_mime_type', 'sender_name', 'created_at']
    });

    if (!message || !message.file_url) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const fileType = fileService.getFileType(message.file_name, message.file_mime_type);

    res.json({
      id: message.id,
      messageId: message.message_id,
      url: message.file_url,
      name: message.file_name,
      size: message.file_size,
      mimeType: message.file_mime_type,
      type: fileType,
      senderName: message.sender_name,
      createdAt: message.created_at
    });
  } catch (error) {
    console.error('Error fetching media info:', error);
    res.status(500).json({ error: 'Failed to fetch media info' });
  }
});

/**
 * DELETE /api/media/:messageId
 * Delete media from a message (soft delete)
 */
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const employeeId = getEmployeeId(req);

    const message = await ChatMessage.findOne({
      where: { message_id: messageId }
    });

    if (!message || !message.file_url) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Check if user is the sender
    if (message.sender_id !== employeeId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Delete physical file
    const fileType = fileService.getFileType(message.file_name, message.file_mime_type);
    const filename = path.basename(message.file_url);
    await fileService.deleteFile(filename, fileType);

    // Update message to remove file reference
    await message.update({
      file_url: null,
      file_name: null,
      file_size: null,
      file_mime_type: null
    });

    console.log(`🗑️ Media deleted from message ${messageId}`);

    res.json({ success: true, message: 'Media deleted' });
  } catch (error) {
    console.error('Error deleting media:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

/**
 * GET /api/media/shared/:channelId
 * Get all shared files in a channel (with pagination and filters)
 */
router.get('/shared/:channelId', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { type, search, sortBy = 'date', sortOrder = 'desc', limit = 20, offset = 0 } = req.query;
    const { Op } = require('sequelize');

    const where = {
      channel_id: parseInt(channelId),
      file_url: { [Op.ne]: null },
      is_deleted: false
    };

    // Filter by file type
    if (type && type !== 'all') {
      const typeConfig = {
        images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        videos: ['video/mp4', 'video/webm', 'video/quicktime'],
        audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
        documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      };

      if (typeConfig[type]) {
        where.file_mime_type = { [Op.in]: typeConfig[type] };
      }
    }

    // Search by filename
    if (search) {
      where.file_name = { [Op.iLike]: `%${search}%` };
    }

    // Sort options
    const orderOptions = {
      date: ['created_at', sortOrder.toUpperCase()],
      name: ['file_name', sortOrder.toUpperCase()],
      size: ['file_size', sortOrder.toUpperCase()]
    };

    const messages = await ChatMessage.findAndCountAll({
      where,
      attributes: ['id', 'message_id', 'file_url', 'file_name', 'file_size', 'file_mime_type', 'sender_name', 'sender_id', 'created_at'],
      order: [orderOptions[sortBy] || orderOptions.date],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      files: messages.rows.map(m => ({
        id: m.id,
        messageId: m.message_id,
        url: m.file_url,
        name: m.file_name,
        size: m.file_size,
        mimeType: m.file_mime_type,
        type: fileService.getFileType(m.file_name, m.file_mime_type),
        senderName: m.sender_name,
        senderId: m.sender_id,
        createdAt: m.created_at
      })),
      total: messages.count,
      hasMore: messages.count > parseInt(offset) + parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching shared files:', error);
    res.status(500).json({ error: 'Failed to fetch shared files' });
  }
});

module.exports = router;
