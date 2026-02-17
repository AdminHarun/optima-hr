const express = require('express');
const router = express.Router();
const { Channel, ChannelMember, Employee, ChatMessage } = require('../models/associations');
const { Op } = require('sequelize');

// Site code helper
const getSiteCode = (req) => req.headers['x-site-id'] || 'FXB';

// Employee ID helper
const getEmployeeId = (req) => {
  return req.session?.employeeId || req.headers['x-employee-id'] || 1;
};

/**
 * GET /api/search
 * Global search across messages, channels, and users
 */
router.get('/', async (req, res) => {
  try {
    const { q, type = 'all', channelId, limit = 20, offset = 0 } = req.query;
    const siteCode = getSiteCode(req);
    const employeeId = getEmployeeId(req);

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchQuery = q.trim().toLowerCase();
    const results = {
      messages: [],
      channels: [],
      users: [],
      total: 0
    };

    // Search Messages
    if (type === 'all' || type === 'messages') {
      const messageWhere = {
        content: { [Op.iLike]: `%${searchQuery}%` },
        is_deleted: false
      };

      // If channelId specified, search only in that channel
      if (channelId) {
        messageWhere.channel_id = channelId;
      } else {
        // Search in channels user has access to
        const userChannelIds = await ChannelMember.findAll({
          where: { employee_id: employeeId },
          attributes: ['channel_id'],
          raw: true
        });
        const channelIds = userChannelIds.map(c => c.channel_id);

        // Also include public channels
        const publicChannels = await Channel.findAll({
          where: { site_code: siteCode, type: 'public', is_archived: false },
          attributes: ['id'],
          raw: true
        });
        publicChannels.forEach(c => {
          if (!channelIds.includes(c.id)) channelIds.push(c.id);
        });

        if (channelIds.length > 0) {
          messageWhere.channel_id = { [Op.in]: channelIds };
        }
      }

      const messages = await ChatMessage.findAll({
        where: messageWhere,
        include: [
          {
            model: Employee,
            as: 'sender_employee',
            attributes: ['employee_id', 'first_name', 'last_name', 'profile_picture'],
            required: false
          },
          {
            model: Channel,
            as: 'channel',
            attributes: ['id', 'name', 'display_name', 'type'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      results.messages = messages.map(m => ({
        id: m.id,
        messageId: m.message_id,
        content: m.content,
        contentHighlight: highlightMatch(m.content, searchQuery),
        senderName: m.sender_name,
        senderAvatar: m.sender_employee?.profile_picture,
        channelId: m.channel_id,
        channelName: m.channel?.display_name || m.channel?.name,
        channelType: m.channel?.type,
        threadId: m.thread_id,
        createdAt: m.created_at
      }));
    }

    // Search Channels
    if (type === 'all' || type === 'channels') {
      const channels = await Channel.findAll({
        where: {
          site_code: siteCode,
          is_archived: false,
          [Op.or]: [
            { name: { [Op.iLike]: `%${searchQuery}%` } },
            { display_name: { [Op.iLike]: `%${searchQuery}%` } },
            { description: { [Op.iLike]: `%${searchQuery}%` } }
          ],
          // Only show accessible channels
          [Op.or]: [
            { type: 'public' },
            {
              type: 'private',
              id: {
                [Op.in]: require('sequelize').literal(`(
                  SELECT channel_id FROM channel_members
                  WHERE employee_id = ${employeeId}
                )`)
              }
            }
          ]
        },
        include: [{
          model: ChannelMember,
          as: 'members',
          required: false,
          where: { employee_id: employeeId },
          attributes: ['role', 'starred']
        }],
        order: [
          ['member_count', 'DESC'],
          ['last_message_at', 'DESC NULLS LAST']
        ],
        limit: parseInt(limit)
      });

      results.channels = channels.map(c => ({
        id: c.id,
        name: c.name,
        displayName: c.display_name,
        description: c.description,
        type: c.type,
        icon: c.icon,
        memberCount: c.member_count,
        isMember: c.members?.length > 0,
        isStarred: c.members?.[0]?.starred || false
      }));
    }

    // Search Users (Employees)
    if (type === 'all' || type === 'users') {
      const users = await Employee.findAll({
        where: {
          site_code: siteCode,
          is_active: true,
          [Op.or]: [
            { first_name: { [Op.iLike]: `%${searchQuery}%` } },
            { last_name: { [Op.iLike]: `%${searchQuery}%` } },
            { email: { [Op.iLike]: `%${searchQuery}%` } },
            { department: { [Op.iLike]: `%${searchQuery}%` } },
            { position: { [Op.iLike]: `%${searchQuery}%` } },
            require('sequelize').where(
              require('sequelize').fn('concat', require('sequelize').col('first_name'), ' ', require('sequelize').col('last_name')),
              { [Op.iLike]: `%${searchQuery}%` }
            )
          ]
        },
        attributes: ['id', 'employee_id', 'first_name', 'last_name', 'email', 'profile_picture', 'department', 'position'],
        order: [['first_name', 'ASC'], ['last_name', 'ASC']],
        limit: parseInt(limit)
      });

      results.users = users.map(u => ({
        id: u.id,
        employeeId: u.employee_id,
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        avatar: u.profile_picture,
        department: u.department,
        position: u.position
      }));
    }

    // Calculate totals
    results.total = results.messages.length + results.channels.length + results.users.length;

    res.json(results);
  } catch (error) {
    console.error('Error in global search:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /api/search/messages
 * Search messages with advanced filters
 */
router.get('/messages', async (req, res) => {
  try {
    const {
      q,
      channelId,
      userId,
      from,
      to,
      hasFile,
      limit = 50,
      offset = 0
    } = req.query;
    const siteCode = getSiteCode(req);
    const employeeId = getEmployeeId(req);

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const where = {
      content: { [Op.iLike]: `%${q}%` },
      is_deleted: false
    };

    // Channel filter
    if (channelId) {
      where.channel_id = channelId;
    }

    // User filter
    if (userId) {
      where.sender_id = userId;
    }

    // Date range filter
    if (from) {
      where.created_at = { ...where.created_at, [Op.gte]: new Date(from) };
    }
    if (to) {
      where.created_at = { ...where.created_at, [Op.lte]: new Date(to) };
    }

    // File filter
    if (hasFile === 'true') {
      where.file_url = { [Op.ne]: null };
    }

    const { count, rows: messages } = await ChatMessage.findAndCountAll({
      where,
      include: [
        {
          model: Employee,
          as: 'sender_employee',
          attributes: ['employee_id', 'first_name', 'last_name', 'profile_picture'],
          required: false
        },
        {
          model: Channel,
          as: 'channel',
          attributes: ['id', 'name', 'display_name'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      messages: messages.map(m => ({
        id: m.id,
        messageId: m.message_id,
        content: m.content,
        contentHighlight: highlightMatch(m.content, q),
        senderName: m.sender_name,
        senderAvatar: m.sender_employee?.profile_picture,
        channelId: m.channel_id,
        channelName: m.channel?.display_name,
        fileUrl: m.file_url,
        fileName: m.file_name,
        createdAt: m.created_at
      })),
      total: count,
      hasMore: count > parseInt(offset) + parseInt(limit)
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ error: 'Message search failed' });
  }
});

/**
 * GET /api/search/recent
 * Get recent searches for user
 */
router.get('/recent', async (req, res) => {
  try {
    // TODO: Implement recent searches storage in Redis or DB
    res.json({
      searches: []
    });
  } catch (error) {
    console.error('Error fetching recent searches:', error);
    res.status(500).json({ error: 'Failed to fetch recent searches' });
  }
});

// Helper: Highlight matching text
function highlightMatch(text, query) {
  if (!text || !query) return text;

  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

// Helper: Escape regex special characters
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = router;
