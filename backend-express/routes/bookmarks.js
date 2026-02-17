/**
 * Message Bookmarks Routes
 * Task 2.6: Message Pinning & Bookmarks
 *
 * Endpoints:
 * - POST /api/bookmarks - Add bookmark
 * - DELETE /api/bookmarks/:messageId - Remove bookmark
 * - GET /api/bookmarks - Get user's bookmarks
 * - GET /api/bookmarks/folders - Get user's bookmark folders
 * - PUT /api/bookmarks/:messageId - Update bookmark (note, folder)
 * - GET /api/bookmarks/check/:messageId - Check if message is bookmarked
 */

const express = require('express');
const router = express.Router();
const { MessageBookmark, ChatMessage } = require('../models/associations');

// Site code helper
const getSiteCode = (req) => req.headers['x-site-id'] || 'FXB';

// Employee ID helper
const getEmployeeId = (req) => {
  return req.session?.employeeId || req.headers['x-employee-id'] || 1;
};

/**
 * POST /api/bookmarks
 * Add a bookmark
 */
router.post('/', async (req, res) => {
  try {
    const { messageId, note, folder } = req.body;
    const employeeId = getEmployeeId(req);
    const siteCode = getSiteCode(req);

    if (!messageId) {
      return res.status(400).json({ error: 'messageId is required' });
    }

    // Verify message exists
    const message = await ChatMessage.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const { bookmark, created } = await MessageBookmark.addBookmark(
      'employee',
      employeeId,
      parseInt(messageId),
      { note, folder, siteCode }
    );

    res.status(created ? 201 : 200).json({
      success: true,
      created,
      bookmark: {
        id: bookmark.id,
        messageId: bookmark.message_id,
        note: bookmark.note,
        folder: bookmark.folder,
        createdAt: bookmark.created_at
      }
    });
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
});

/**
 * DELETE /api/bookmarks/:messageId
 * Remove a bookmark
 */
router.delete('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const employeeId = getEmployeeId(req);

    const removed = await MessageBookmark.removeBookmark(
      'employee',
      employeeId,
      parseInt(messageId)
    );

    if (!removed) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    res.json({ success: true, message: 'Bookmark removed' });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

/**
 * GET /api/bookmarks
 * Get user's bookmarks
 */
router.get('/', async (req, res) => {
  try {
    const employeeId = getEmployeeId(req);
    const { folder, limit = 50, offset = 0 } = req.query;

    const bookmarks = await MessageBookmark.getUserBookmarks(
      'employee',
      employeeId,
      { folder, limit: parseInt(limit), offset: parseInt(offset) }
    );

    res.json({
      bookmarks: bookmarks.map(b => ({
        id: b.id,
        messageId: b.message_id,
        note: b.note,
        folder: b.folder,
        createdAt: b.created_at,
        message: b.message ? {
          id: b.message.id,
          messageId: b.message.message_id,
          content: b.message.content,
          messageType: b.message.message_type,
          senderName: b.message.sender_name,
          senderType: b.message.sender_type,
          channelId: b.message.channel_id,
          roomId: b.message.room_id,
          createdAt: b.message.created_at,
          fileUrl: b.message.file_url,
          fileName: b.message.file_name
        } : null
      })),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: bookmarks.length
      }
    });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

/**
 * GET /api/bookmarks/folders
 * Get user's bookmark folders with counts
 */
router.get('/folders', async (req, res) => {
  try {
    const employeeId = getEmployeeId(req);

    const folders = await MessageBookmark.getUserFolders('employee', employeeId);

    res.json({
      folders: folders.map(f => ({
        name: f.folder || 'default',
        count: parseInt(f.count)
      }))
    });
  } catch (error) {
    console.error('Error fetching bookmark folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
});

/**
 * PUT /api/bookmarks/:messageId
 * Update bookmark note or folder
 */
router.put('/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { note, folder } = req.body;
    const employeeId = getEmployeeId(req);

    const bookmark = await MessageBookmark.findOne({
      where: {
        user_type: 'employee',
        user_id: employeeId,
        message_id: parseInt(messageId)
      }
    });

    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    const updates = {};
    if (note !== undefined) updates.note = note;
    if (folder !== undefined) updates.folder = folder;

    await bookmark.update(updates);

    res.json({
      success: true,
      bookmark: {
        id: bookmark.id,
        messageId: bookmark.message_id,
        note: bookmark.note,
        folder: bookmark.folder,
        updatedAt: bookmark.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating bookmark:', error);
    res.status(500).json({ error: 'Failed to update bookmark' });
  }
});

/**
 * GET /api/bookmarks/check/:messageId
 * Check if a message is bookmarked by current user
 */
router.get('/check/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const employeeId = getEmployeeId(req);

    const isBookmarked = await MessageBookmark.isBookmarked(
      'employee',
      employeeId,
      parseInt(messageId)
    );

    res.json({ isBookmarked });
  } catch (error) {
    console.error('Error checking bookmark:', error);
    res.status(500).json({ error: 'Failed to check bookmark' });
  }
});

/**
 * POST /api/bookmarks/check-bulk
 * Check multiple messages for bookmarks
 */
router.post('/check-bulk', async (req, res) => {
  try {
    const { messageIds } = req.body;
    const employeeId = getEmployeeId(req);

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ error: 'messageIds array is required' });
    }

    const bookmarks = await MessageBookmark.findAll({
      where: {
        user_type: 'employee',
        user_id: employeeId,
        message_id: messageIds.map(id => parseInt(id))
      },
      attributes: ['message_id']
    });

    const bookmarkedIds = bookmarks.map(b => b.message_id);

    res.json({
      bookmarkedMessageIds: bookmarkedIds
    });
  } catch (error) {
    console.error('Error checking bulk bookmarks:', error);
    res.status(500).json({ error: 'Failed to check bookmarks' });
  }
});

module.exports = router;
