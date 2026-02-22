const express = require('express');
const router = express.Router();
const { Channel, ChannelMember, Employee, ChatMessage } = require('../models/associations');
const { Op } = require('sequelize');
const chatWebSocketService = require('../services/ChatWebSocketService');
const offlineMessagingService = require('../services/OfflineMessagingService');
const cacheService = require('../services/CacheService');
const { parseMentions, resolveUserMentions, getSpecialMentionTargets, extractMentionNotificationText } = require('../utils/mentionParser');

// Site code helper
const getSiteCode = (req) => req.headers['x-site-id'] || 'FXB';

// Employee ID helper (from session or token)
const getEmployeeId = (req) => {
  // TODO: Gerçek auth sisteminden al
  return req.session?.employeeId || req.headers['x-employee-id'] || 1;
};

/**
 * GET /api/channels
 * Tüm kanalları listele (public + üye olunan private)
 */
router.get('/', async (req, res) => {
  try {
    const siteCode = getSiteCode(req);
    const employeeId = getEmployeeId(req);

    // Cache key: employee-specific because private channels differ per user
    const cacheKey = `channels:list:${siteCode}:${employeeId}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Public kanallar + üye olunan private kanallar
    const channels = await Channel.findAll({
      where: {
        site_code: siteCode,
        is_archived: false,
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
      include: [
        {
          model: Employee,
          as: 'creator',
          attributes: ['employee_id', 'first_name', 'last_name', 'profile_picture']
        },
        {
          model: ChannelMember,
          as: 'members',
          required: false,
          where: { employee_id: employeeId },
          attributes: ['id', 'role', 'muted', 'unread_count', 'starred', 'notification_preference']
        }
      ],
      order: [
        ['is_default', 'DESC'],
        ['last_message_at', 'DESC NULLS LAST'],
        ['display_name', 'ASC']
      ]
    });

    // Format response
    const formattedChannels = channels.map(channel => ({
      id: channel.id,
      name: channel.name,
      displayName: channel.display_name,
      description: channel.description,
      type: channel.type,
      icon: channel.icon,
      color: channel.color,
      topic: channel.topic,
      isDefault: channel.is_default,
      isArchived: channel.is_archived,
      memberCount: channel.member_count,
      messageCount: channel.message_count,
      lastMessageAt: channel.last_message_at,
      lastMessagePreview: channel.last_message_preview,
      createdAt: channel.created_at,
      creator: channel.creator ? {
        id: channel.creator.employee_id,
        name: `${channel.creator.first_name} ${channel.creator.last_name}`,
        avatar: channel.creator.profile_picture
      } : null,
      // Kullanıcı bilgileri
      membership: channel.members?.[0] ? {
        role: channel.members[0].role,
        muted: channel.members[0].muted,
        unreadCount: channel.members[0].unread_count,
        starred: channel.members[0].starred,
        notificationPreference: channel.members[0].notification_preference
      } : null,
      isMember: !!channel.members?.[0]
    }));

    // Cache for 2 minutes (channels change less frequently)
    await cacheService.set(cacheKey, formattedChannels, 120);

    res.json(formattedChannels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

/**
 * GET /api/channels/:id
 * Kanal detayı
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = getEmployeeId(req);

    const channel = await Channel.findByPk(id, {
      include: [
        {
          model: Employee,
          as: 'creator',
          attributes: ['employee_id', 'first_name', 'last_name', 'profile_picture']
        },
        {
          model: ChannelMember,
          as: 'members',
          include: [{
            model: Employee,
            as: 'employee',
            attributes: ['employee_id', 'first_name', 'last_name', 'email', 'profile_picture', 'department']
          }]
        }
      ]
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Private kanal ve üye değilse erişim yok
    if (channel.type === 'private') {
      const isMember = channel.members.some(m => m.employee_id === employeeId);
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied to private channel' });
      }
    }

    res.json({
      id: channel.id,
      name: channel.name,
      displayName: channel.display_name,
      description: channel.description,
      type: channel.type,
      icon: channel.icon,
      color: channel.color,
      topic: channel.topic,
      isDefault: channel.is_default,
      memberCount: channel.member_count,
      messageCount: channel.message_count,
      createdAt: channel.created_at,
      creator: channel.creator ? {
        id: channel.creator.employee_id,
        name: `${channel.creator.first_name} ${channel.creator.last_name}`,
        avatar: channel.creator.profile_picture
      } : null,
      members: channel.members.map(m => ({
        id: m.employee_id,
        role: m.role,
        joinedAt: m.joined_at,
        name: m.employee ? `${m.employee.first_name} ${m.employee.last_name}` : 'Unknown',
        email: m.employee?.email,
        avatar: m.employee?.profile_picture,
        department: m.employee?.department
      }))
    });
  } catch (error) {
    console.error('Error fetching channel:', error);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

/**
 * POST /api/channels
 * Kanal oluştur
 */
router.post('/', async (req, res) => {
  try {
    const { name, displayName, description, type, icon, color } = req.body;
    const siteCode = getSiteCode(req);
    const employeeId = getEmployeeId(req);

    if (!name || !displayName) {
      return res.status(400).json({ error: 'Name and displayName are required' });
    }

    // Name validation (küçük harf + tire/alt çizgi)
    const cleanName = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');

    // Aynı isimde kanal var mı?
    const existing = await Channel.findOne({
      where: { name: cleanName, site_code: siteCode }
    });

    if (existing) {
      return res.status(409).json({ error: 'Channel with this name already exists' });
    }

    const channel = await Channel.create({
      name: cleanName,
      display_name: displayName,
      description,
      type: type || 'public',
      icon: icon || 'tag',
      color,
      site_code: siteCode,
      created_by: employeeId,
      member_count: 1
    });

    // Oluşturan kişiyi otomatik owner yap
    await ChannelMember.create({
      channel_id: channel.id,
      employee_id: employeeId,
      role: 'owner'
    });

    // Invalidate channels cache for this site
    await cacheService.deletePattern(`channels:list:${siteCode}:*`);

    console.log(`✅ Channel created: ${channel.name} (${channel.type}) by employee ${employeeId}`);

    res.status(201).json({
      id: channel.id,
      name: channel.name,
      displayName: channel.display_name,
      description: channel.description,
      type: channel.type,
      icon: channel.icon,
      color: channel.color,
      createdAt: channel.created_at,
      isMember: true,
      membership: { role: 'owner', muted: false, unreadCount: 0 }
    });
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

/**
 * PUT /api/channels/:id
 * Kanal güncelle
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { displayName, description, topic, icon, color } = req.body;
    const employeeId = getEmployeeId(req);

    const channel = await Channel.findByPk(id);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Yetki kontrolü (owner veya admin)
    const hasPermission = await ChannelMember.hasRole(id, employeeId, ['owner', 'admin']);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await channel.update({
      display_name: displayName || channel.display_name,
      description: description !== undefined ? description : channel.description,
      topic: topic !== undefined ? topic : channel.topic,
      icon: icon || channel.icon,
      color: color !== undefined ? color : channel.color
    });

    res.json({ message: 'Channel updated', channel });
  } catch (error) {
    console.error('Error updating channel:', error);
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

/**
 * DELETE /api/channels/:id
 * Kanalı arşivle
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = getEmployeeId(req);

    const channel = await Channel.findByPk(id);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Sadece owner arşivleyebilir
    const isOwner = await ChannelMember.hasRole(id, employeeId, ['owner']);
    if (!isOwner) {
      return res.status(403).json({ error: 'Only owner can archive channel' });
    }

    await channel.update({ is_archived: true });

    res.json({ message: 'Channel archived' });
  } catch (error) {
    console.error('Error archiving channel:', error);
    res.status(500).json({ error: 'Failed to archive channel' });
  }
});

/**
 * POST /api/channels/:id/join
 * Kanala katıl (public kanallar için)
 */
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = getEmployeeId(req);

    const channel = await Channel.findByPk(id);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (channel.type === 'private') {
      return res.status(403).json({ error: 'Cannot join private channel without invitation' });
    }

    const { member, created } = await ChannelMember.addMember(id, employeeId, 'member');

    if (created) {
      console.log(`✅ Employee ${employeeId} joined channel ${channel.name}`);
    }

    res.json({
      message: created ? 'Joined channel' : 'Already a member',
      membership: {
        role: member.role,
        joinedAt: member.joined_at
      }
    });
  } catch (error) {
    console.error('Error joining channel:', error);
    res.status(500).json({ error: 'Failed to join channel' });
  }
});

/**
 * POST /api/channels/:id/leave
 * Kanaldan ayrıl
 */
router.post('/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = getEmployeeId(req);

    const channel = await Channel.findByPk(id);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Owner ayrılamaz (önce devretmeli)
    const isOwner = await ChannelMember.hasRole(id, employeeId, ['owner']);
    if (isOwner) {
      return res.status(403).json({ error: 'Owner cannot leave. Transfer ownership first.' });
    }

    const removed = await ChannelMember.removeMember(id, employeeId);

    if (removed) {
      console.log(`✅ Employee ${employeeId} left channel ${channel.name}`);
    }

    res.json({ message: removed ? 'Left channel' : 'Not a member' });
  } catch (error) {
    console.error('Error leaving channel:', error);
    res.status(500).json({ error: 'Failed to leave channel' });
  }
});

/**
 * POST /api/channels/:id/invite
 * Kanala kullanıcı davet et (private kanallar için)
 */
router.post('/:id/invite', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeIds } = req.body;
    const inviterId = getEmployeeId(req);

    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({ error: 'employeeIds array is required' });
    }

    const channel = await Channel.findByPk(id);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Yetki kontrolü
    const hasPermission = await ChannelMember.hasRole(id, inviterId, ['owner', 'admin']);
    if (!hasPermission && channel.type === 'private') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const added = [];
    for (const empId of employeeIds) {
      const { member, created } = await ChannelMember.addMember(id, empId, 'member', inviterId);
      if (created) {
        added.push(empId);
      }
    }

    console.log(`✅ ${added.length} members invited to channel ${channel.name}`);

    res.json({
      message: `${added.length} members added`,
      addedEmployeeIds: added
    });
  } catch (error) {
    console.error('Error inviting to channel:', error);
    res.status(500).json({ error: 'Failed to invite members' });
  }
});

/**
 * GET /api/channels/:id/members
 * Kanal üyelerini listele
 */
router.get('/:id/members', async (req, res) => {
  try {
    const { id } = req.params;

    const members = await ChannelMember.getMembers(id);

    res.json(members.map(m => ({
      id: m.employee_id,
      role: m.role,
      joinedAt: m.joined_at,
      muted: m.muted,
      name: m.employee ? `${m.employee.first_name} ${m.employee.last_name}` : 'Unknown',
      email: m.employee?.email,
      avatar: m.employee?.profile_picture,
      department: m.employee?.department
    })));
  } catch (error) {
    console.error('Error fetching channel members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

/**
 * GET /api/channels/:id/messages
 * Kanal mesajlarını getir
 */
router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, before, after } = req.query;
    const employeeId = getEmployeeId(req);

    const channel = await Channel.findByPk(id);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Private kanal ve üye değilse erişim yok
    if (channel.type === 'private') {
      const isMember = await ChannelMember.isMember(id, employeeId);
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const whereClause = { channel_id: id };

    if (before) {
      whereClause.created_at = { [Op.lt]: new Date(before) };
    } else if (after) {
      whereClause.created_at = { [Op.gt]: new Date(after) };
    }

    // Thread olmayan (ana) mesajları getir
    whereClause.thread_id = null;

    const messages = await ChatMessage.findAll({
      where: whereClause,
      include: [{
        model: Employee,
        as: 'sender_employee',
        attributes: ['employee_id', 'first_name', 'last_name', 'profile_picture'],
        required: false
      }],
      order: [['created_at', before ? 'DESC' : 'ASC']],
      limit: parseInt(limit)
    });

    // Her mesaj için reply count hesapla
    const messageIds = messages.map(m => m.id);
    const replyCounts = await ChatMessage.findAll({
      attributes: [
        'thread_id',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: { thread_id: messageIds },
      group: ['thread_id'],
      raw: true
    });

    // Reply count map oluştur
    const replyCountMap = {};
    replyCounts.forEach(r => {
      replyCountMap[r.thread_id] = parseInt(r.count);
    });

    // Eski mesajlar için reverse
    const orderedMessages = before ? messages.reverse() : messages;

    res.json({
      messages: orderedMessages.map(m => ({
        id: m.id,
        messageId: m.message_id,
        content: m.content,
        senderType: m.sender_type,
        senderName: m.sender_name,
        senderId: m.sender_id,
        senderAvatar: m.sender_employee?.profile_picture,
        messageType: m.message_type,
        fileUrl: m.file_url,
        fileName: m.file_name,
        fileSize: m.file_size,
        fileMimeType: m.file_mime_type,
        threadId: m.thread_id,
        replyCount: replyCountMap[m.id] || 0,
        reactions: m.reactions || [],
        isEdited: m.is_edited,
        isDeleted: m.is_deleted,
        createdAt: m.created_at,
        editedAt: m.edited_at
      })),
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching channel messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/channels/:id/messages
 * Kanala mesaj gönder (HTTP fallback - WebSocket tercih edilmeli)
 */
router.post('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, messageType = 'text', threadId } = req.body;
    const employeeId = getEmployeeId(req);

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const channel = await Channel.findByPk(id);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Üyelik kontrolü
    const isMember = await ChannelMember.isMember(id, employeeId);
    if (!isMember) {
      // Public kanala otomatik katıl
      if (channel.type === 'public') {
        await ChannelMember.addMember(id, employeeId);
      } else {
        return res.status(403).json({ error: 'Not a member of this channel' });
      }
    }

    // Sender bilgisi
    const employee = await Employee.findByPk(employeeId);
    const senderName = employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';

    // Mesaj oluştur
    const messageId = `ch_${id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const message = await ChatMessage.create({
      message_id: messageId,
      channel_id: id,
      room_id: null,
      sender_type: 'employee',
      sender_name: senderName,
      sender_id: employeeId,
      content: content.trim(),
      message_type: messageType,
      thread_id: threadId || null,
      status: 'sent'
    });

    // Kanal last_message güncelle
    await channel.update({
      last_message_at: new Date(),
      last_message_preview: content.substring(0, 100),
      message_count: channel.message_count + 1
    });

    // Diğer üyelerin unread_count'unu artır
    await ChannelMember.incrementUnreadForAll(id, employeeId);

    // WebSocket üzerinden kanal üyelerine broadcast
    const broadcastMessage = {
      type: 'channel_message',
      channelId: parseInt(id),
      message: {
        id: message.id,
        messageId: message.message_id,
        content: message.content,
        senderType: message.sender_type,
        senderName: message.sender_name,
        senderId: message.sender_id,
        senderAvatar: employee?.profile_picture || null,
        messageType: message.message_type,
        threadId: message.thread_id,
        createdAt: message.created_at
      }
    };

    // Kanal üyelerine broadcast (channel_X room'u kullan)
    chatWebSocketService.broadcastToRoom(`channel_${id}`, broadcastMessage);
    console.log(`📡 Channel message broadcasted to channel_${id}`);

    // Mention bildirimleri (async - response'u bekletme)
    (async () => {
      try {
        const mentions = parseMentions(content);
        const siteCode = getSiteCode(req);
        const notificationTargets = new Set();

        // Special mentions (@here, @channel, @everyone)
        if (mentions.special.length > 0) {
          const specialTargets = await getSpecialMentionTargets(mentions.special, id, siteCode);
          specialTargets.forEach(t => notificationTargets.add(t.id));
        }

        // User mentions
        if (mentions.users.length > 0) {
          const userTargets = await resolveUserMentions(mentions.users, siteCode);
          userTargets.forEach(t => notificationTargets.add(t.id));
        }

        // Send mention notifications via WebSocket
        if (notificationTargets.size > 0) {
          const notificationText = extractMentionNotificationText(content, senderName);
          notificationTargets.forEach(targetId => {
            if (targetId !== employeeId) { // Don't notify sender
              chatWebSocketService.sendToUser('employee', targetId, {
                type: 'mention_notification',
                channelId: parseInt(id),
                channelName: channel.display_name,
                messageId: message.id,
                senderName,
                content: notificationText || content.substring(0, 100),
                timestamp: new Date().toISOString()
              });
            }
          });
          console.log(`📬 Mention notifications sent to ${notificationTargets.size} users`);
        }

        // Queue messages for offline users (Task 1.6)
        const allMembers = await ChannelMember.getMembers(id);
        const offlineMemberIds = [];

        for (const member of allMembers) {
          if (member.employee_id !== employeeId) {
            // Check if user is offline
            const isOnline = await offlineMessagingService.isUserOnline('employee', member.employee_id);
            if (!isOnline) {
              offlineMemberIds.push(member.employee_id);
            }
          }
        }

        if (offlineMemberIds.length > 0) {
          // Determine message type for offline queue
          let msgType = 'channel';
          if (notificationTargets.has(offlineMemberIds[0])) {
            msgType = 'mention';
          }

          // Queue for offline members
          await offlineMessagingService.queueMessageForRecipients({
            recipientType: 'employee',
            messageId: message.message_id,
            channelId: parseInt(id),
            senderType: 'employee',
            senderId: employeeId,
            senderName,
            content: content.substring(0, 200),
            messageType: msgType,
            siteCode
          }, offlineMemberIds);

          console.log(`📬 Queued message for ${offlineMemberIds.length} offline channel members`);
        }
      } catch (mentionErr) {
        console.error('Error processing mentions:', mentionErr);
      }
    })();

    res.status(201).json({
      id: message.id,
      messageId: message.message_id,
      content: message.content,
      senderType: message.sender_type,
      senderName: message.sender_name,
      senderId: message.sender_id,
      senderAvatar: employee?.profile_picture || null,
      messageType: message.message_type,
      threadId: message.thread_id,
      createdAt: message.created_at
    });
  } catch (error) {
    console.error('Error sending channel message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * POST /api/channels/:id/read
 * Kanalı okundu olarak işaretle
 */
router.post('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { lastMessageId } = req.body;
    const employeeId = getEmployeeId(req);

    await ChannelMember.markAsRead(id, employeeId, lastMessageId);

    res.json({ message: 'Marked as read' });
  } catch (error) {
    console.error('Error marking channel as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

/**
 * PUT /api/channels/:id/settings
 * Kanal kullanıcı ayarlarını güncelle (mute, notification, starred)
 */
router.put('/:id/settings', async (req, res) => {
  try {
    const { id } = req.params;
    const { muted, notificationPreference, starred } = req.body;
    const employeeId = getEmployeeId(req);

    const member = await ChannelMember.findOne({
      where: { channel_id: id, employee_id: employeeId }
    });

    if (!member) {
      return res.status(404).json({ error: 'Not a member of this channel' });
    }

    const updates = {};
    if (muted !== undefined) updates.muted = muted;
    if (notificationPreference !== undefined) updates.notification_preference = notificationPreference;
    if (starred !== undefined) updates.starred = starred;

    await member.update(updates);

    res.json({ message: 'Settings updated', ...updates });
  } catch (error) {
    console.error('Error updating channel settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ==================== THREAD (KONU) SİSTEMİ ====================

/**
 * GET /api/channels/:channelId/messages/:messageId/thread
 * Thread mesajlarını getir
 */
router.get('/:channelId/messages/:messageId/thread', async (req, res) => {
  try {
    const { channelId, messageId } = req.params;
    const { limit = 50 } = req.query;
    const employeeId = getEmployeeId(req);

    // Ana mesajı bul
    const parentMessage = await ChatMessage.findByPk(messageId, {
      include: [{
        model: Employee,
        as: 'sender_employee',
        attributes: ['employee_id', 'first_name', 'last_name', 'profile_picture'],
        required: false
      }]
    });

    if (!parentMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Thread yanıtlarını getir
    const replies = await ChatMessage.findAll({
      where: { thread_id: messageId },
      include: [{
        model: Employee,
        as: 'sender_employee',
        attributes: ['employee_id', 'first_name', 'last_name', 'profile_picture'],
        required: false
      }],
      order: [['created_at', 'ASC']],
      limit: parseInt(limit)
    });

    // Reply count güncelle (cache)
    const replyCount = await ChatMessage.count({ where: { thread_id: messageId } });

    res.json({
      parentMessage: {
        id: parentMessage.id,
        messageId: parentMessage.message_id,
        content: parentMessage.content,
        senderType: parentMessage.sender_type,
        senderName: parentMessage.sender_name,
        senderId: parentMessage.sender_id,
        senderAvatar: parentMessage.sender_employee?.profile_picture,
        createdAt: parentMessage.created_at,
        replyCount
      },
      replies: replies.map(r => ({
        id: r.id,
        messageId: r.message_id,
        content: r.content,
        senderType: r.sender_type,
        senderName: r.sender_name,
        senderId: r.sender_id,
        senderAvatar: r.sender_employee?.profile_picture,
        threadId: r.thread_id,
        createdAt: r.created_at,
        isEdited: r.is_edited
      })),
      totalReplies: replyCount
    });
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

/**
 * POST /api/channels/:channelId/messages/:messageId/thread
 * Thread'e yanıt gönder
 */
router.post('/:channelId/messages/:messageId/thread', async (req, res) => {
  try {
    const { channelId, messageId } = req.params;
    const { content } = req.body;
    const employeeId = getEmployeeId(req);

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Ana mesajı kontrol et
    const parentMessage = await ChatMessage.findByPk(messageId);
    if (!parentMessage) {
      return res.status(404).json({ error: 'Parent message not found' });
    }

    // Sender bilgisi
    const employee = await Employee.findByPk(employeeId);
    const senderName = employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';

    // Thread yanıtı oluştur
    const replyMessageId = `thr_${messageId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const reply = await ChatMessage.create({
      message_id: replyMessageId,
      channel_id: channelId,
      thread_id: messageId, // Ana mesaja bağla
      sender_type: 'employee',
      sender_name: senderName,
      sender_id: employeeId,
      content: content.trim(),
      message_type: 'text',
      status: 'sent'
    });

    // Reply count güncelle
    const replyCount = await ChatMessage.count({ where: { thread_id: messageId } });

    // WebSocket ile thread'e abone olanlara bildir
    const broadcastMessage = {
      type: 'thread_reply',
      channelId: parseInt(channelId),
      parentMessageId: parseInt(messageId),
      message: {
        id: reply.id,
        messageId: reply.message_id,
        content: reply.content,
        senderType: reply.sender_type,
        senderName: reply.sender_name,
        senderId: reply.sender_id,
        senderAvatar: employee?.profile_picture || null,
        threadId: reply.thread_id,
        createdAt: reply.created_at
      },
      replyCount
    };

    // Thread room'una broadcast
    chatWebSocketService.broadcastToRoom(`thread_${messageId}`, broadcastMessage);
    // Ana kanal'a da bildir (thread count güncellemesi için)
    chatWebSocketService.broadcastToRoom(`channel_${channelId}`, {
      type: 'thread_update',
      channelId: parseInt(channelId),
      messageId: parseInt(messageId),
      replyCount,
      lastReply: {
        senderName: reply.sender_name,
        content: reply.content.substring(0, 50),
        createdAt: reply.created_at
      }
    });

    console.log(`📡 Thread reply broadcasted to thread_${messageId}`);

    res.status(201).json({
      id: reply.id,
      messageId: reply.message_id,
      content: reply.content,
      senderType: reply.sender_type,
      senderName: reply.sender_name,
      senderId: reply.sender_id,
      senderAvatar: employee?.profile_picture || null,
      threadId: reply.thread_id,
      createdAt: reply.created_at,
      parentReplyCount: replyCount
    });
  } catch (error) {
    console.error('Error sending thread reply:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

/**
 * GET /api/channels/defaults/create
 * Varsayılan kanalları oluştur (site kurulumu için)
 */
router.post('/defaults/create', async (req, res) => {
  try {
    const siteCode = getSiteCode(req);
    const employeeId = getEmployeeId(req);

    const channels = await Channel.createDefaultChannels(siteCode, employeeId);

    res.json({
      message: `${channels.length} default channels created/verified`,
      channels: channels.map(c => ({ id: c.id, name: c.name, displayName: c.display_name }))
    });
  } catch (error) {
    console.error('Error creating default channels:', error);
    res.status(500).json({ error: 'Failed to create default channels' });
  }
});

module.exports = router;
