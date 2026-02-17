/**
 * Mention Parser Utility
 * Parses @mentions and #channel references from message content
 */

// Parse mentions from message content
const parseMentions = (content) => {
  const mentions = {
    users: [],      // @username mentions
    channels: [],   // #channel mentions
    special: []     // @here, @channel, @everyone
  };

  if (!content) return mentions;

  // User mentions: @username (word characters)
  const userMentionRegex = /@(\w+)/g;
  let match;

  while ((match = userMentionRegex.exec(content)) !== null) {
    const mentionName = match[1].toLowerCase();

    // Check for special mentions
    if (['here', 'channel', 'kanal', 'everyone', 'herkes'].includes(mentionName)) {
      if (!mentions.special.includes(mentionName)) {
        mentions.special.push(mentionName);
      }
    } else {
      if (!mentions.users.includes(match[1])) {
        mentions.users.push(match[1]);
      }
    }
  }

  // Channel mentions: #channel-name
  const channelMentionRegex = /#([\w-]+)/g;
  while ((match = channelMentionRegex.exec(content)) !== null) {
    if (!mentions.channels.includes(match[1])) {
      mentions.channels.push(match[1]);
    }
  }

  return mentions;
};

// Resolve user mentions to employee IDs
const resolveUserMentions = async (userMentions, siteCode) => {
  if (!userMentions || userMentions.length === 0) return [];

  const Employee = require('../models/Employee');
  const { Op } = require('sequelize');

  const employees = await Employee.findAll({
    where: {
      site_code: siteCode,
      [Op.or]: userMentions.map(name => ({
        [Op.or]: [
          { first_name: { [Op.iLike]: name } },
          { last_name: { [Op.iLike]: name } },
          require('sequelize').where(
            require('sequelize').fn('concat', require('sequelize').col('first_name'), ' ', require('sequelize').col('last_name')),
            { [Op.iLike]: `%${name}%` }
          )
        ]
      }))
    },
    attributes: ['id', 'employee_id', 'first_name', 'last_name', 'email']
  });

  return employees;
};

// Get employees to notify based on special mentions
const getSpecialMentionTargets = async (specialMentions, channelId, siteCode) => {
  const ChannelMember = require('../models/ChannelMember');
  const Employee = require('../models/Employee');
  const EmployeePresence = require('../models/EmployeePresence');
  const { Op } = require('sequelize');

  const targets = [];

  for (const special of specialMentions) {
    switch (special) {
      case 'here':
        // Online users in channel
        const onlineMembers = await ChannelMember.findAll({
          where: { channel_id: channelId },
          include: [{
            model: Employee,
            as: 'employee',
            include: [{
              model: EmployeePresence,
              as: 'presence',
              where: { status: 'online' },
              required: true
            }]
          }]
        });
        onlineMembers.forEach(m => {
          if (m.employee && !targets.find(t => t.id === m.employee.id)) {
            targets.push(m.employee);
          }
        });
        break;

      case 'channel':
      case 'kanal':
        // All channel members
        const channelMembers = await ChannelMember.findAll({
          where: { channel_id: channelId, muted: false },
          include: [{
            model: Employee,
            as: 'employee',
            attributes: ['id', 'employee_id', 'first_name', 'last_name', 'email']
          }]
        });
        channelMembers.forEach(m => {
          if (m.employee && !targets.find(t => t.id === m.employee.id)) {
            targets.push(m.employee);
          }
        });
        break;

      case 'everyone':
      case 'herkes':
        // All employees in site (use with caution)
        const allEmployees = await Employee.findAll({
          where: { site_code: siteCode, is_active: true },
          attributes: ['id', 'employee_id', 'first_name', 'last_name', 'email'],
          limit: 100 // Safety limit
        });
        allEmployees.forEach(e => {
          if (!targets.find(t => t.id === e.id)) {
            targets.push(e);
          }
        });
        break;
    }
  }

  return targets;
};

// Format mentions in content (for display)
const formatMentions = (content) => {
  if (!content) return content;

  // Highlight user mentions
  let formatted = content.replace(/@(\w+)/g, '<span class="mention user-mention">@$1</span>');

  // Highlight channel mentions
  formatted = formatted.replace(/#([\w-]+)/g, '<span class="mention channel-mention">#$1</span>');

  return formatted;
};

// Extract plain text mentions for notifications
const extractMentionNotificationText = (content, senderName) => {
  const mentions = parseMentions(content);
  const parts = [];

  if (mentions.special.length > 0) {
    parts.push(`@${mentions.special.join(', @')}`);
  }
  if (mentions.users.length > 0) {
    parts.push(`@${mentions.users.join(', @')}`);
  }

  if (parts.length > 0) {
    return `${senderName} sizi etiketledi: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`;
  }

  return null;
};

module.exports = {
  parseMentions,
  resolveUserMentions,
  getSpecialMentionTargets,
  formatMentions,
  extractMentionNotificationText
};
