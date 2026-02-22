const WebSocket = require('ws');
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const ChatRoomMember = require('../models/ChatRoomMember');
const EmployeePresence = require('../models/EmployeePresence');
const MessageReadReceipt = require('../models/MessageReadReceipt');
const url = require('url');
const redisService = require('./RedisService');
const { authenticateWebSocket } = require('../middleware/chatAuth');

// Task 2.5: Enhanced services
const readReceiptService = require('./ReadReceiptService');
const typingIndicatorService = require('./TypingIndicatorService');
const SlashCommandService = require('./SlashCommandService');

class ChatWebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map<clientId, {ws, roomId, userType, userId, employeeId}>
    this.rooms = new Map(); // Map<roomId, Set<clientId>>
    this.userSockets = new Map(); // Map<"userType:userId", Set<clientId>> - Kullanici bazli socket takibi
    this.presenceSubscriptions = new Map(); // Map<clientId, Set<employeeId>> - Presence abonelikleri
    console.log('🔧 ChatWebSocketService initialized');
  }

  async initialize(server) {
    // Redis baglantisini kur
    try {
      await redisService.connect();
      this._setupRedisSubscriptions();
    } catch (error) {
      console.warn('[WebSocket] Redis baglantisi kurulamadi, yerel mod aktif:', error.message);
    }

    this.wss = new WebSocket.Server({
      server,
      verifyClient: (info) => {
        console.log('🔍 WebSocket connection attempt:', info.req.url);
        // Only allow WebSocket connections to /ws paths
        if (info.req.url.startsWith('/ws/')) {
          return true;
        }
        console.log('❌ Invalid WebSocket path:', info.req.url);
        return false;
      }
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    // Task 2.5: Initialize enhanced services
    readReceiptService.setWebSocketService(this);
    typingIndicatorService.setWebSocketService(this);

    // Server-side heartbeat: terminate dead connections every 30s
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (client.ws.isAlive === false) {
          console.log(`[Heartbeat] Terminating dead connection: ${clientId}`);
          client.ws.terminate();
          this._cleanupClient(clientId);
          return;
        }
        client.ws.isAlive = false;
        try { client.ws.ping(); } catch (e) { /* ignore */ }
      });
    }, 30000);

    console.log('WebSocket server initialized on /ws');
  }

  /**
   * Redis pub/sub aboneliklerini ayarla
   */
  _setupRedisSubscriptions() {
    // Presence degisiklikleri
    redisService.subscribe('presence:changes', (data) => {
      this._handlePresenceChange(data);
    });

    // Multi-instance mesaj dagitimi
    // Her instance kendi room'larina gelen mesajlari dinler
  }

  /**
   * Redis'ten gelen presence degisikligini isle
   */
  _handlePresenceChange(data) {
    const { userType, userId, status } = data;

    // Bu kullanicinin presence'ini takip eden tum client'lara bildir
    for (const [clientId, subscriptions] of this.presenceSubscriptions.entries()) {
      if (subscriptions.has(userId)) {
        this.sendToClient(clientId, {
          type: 'presence_update',
          userType,
          userId,
          status,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  handleConnection(ws, req) {
    const pathname = url.parse(req.url).pathname;
    console.log('🔌 New WebSocket connection:', pathname);

    // Set isAlive flag for heartbeat
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // Parse connection type and room from URL
    // Expected formats:
    // /ws/admin-chat/applicant_123/
    // /ws/applicant-chat/applicant_123/

    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length < 3 || pathParts[0] !== 'ws') {
      console.error('❌ Invalid WebSocket path:', pathname);
      ws.close(4000, 'Invalid path');
      return;
    }

    const connectionType = pathParts[1]; // admin-chat, applicant-chat, or channel
    const roomIdentifier = pathParts[2]; // applicant_123 or channel_id

    let userType, roomId;

    if (connectionType === 'admin-chat') {
      userType = 'admin';
      roomId = roomIdentifier;
    } else if (connectionType === 'applicant-chat') {
      userType = 'applicant';
      roomId = roomIdentifier;
    } else if (connectionType === 'channel') {
      // Kanal bağlantısı: /ws/channel/:channelId
      userType = 'employee'; // Kanal kullanıcıları employee
      roomId = `channel_${roomIdentifier}`;
      console.log(`📺 Channel WebSocket connection: ${roomId}`);
    } else {
      console.error('❌ Unknown connection type:', connectionType);
      ws.close(4000, 'Unknown connection type');
      return;
    }

    const clientId = `${userType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get client IP address
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.socket.remoteAddress ||
      'Unknown';

    // Store client info
    this.clients.set(clientId, {
      ws,
      roomId,
      userType,
      userId: null, // Will be set on authentication
      lastActivity: new Date(),
      ip: clientIp // Store IP for video call participant info
    });

    // Add client to room
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(clientId);

    console.log(`✅ Client ${clientId} connected to room ${roomId} as ${userType}`);

    // Send connection confirmation
    this.sendToClient(clientId, {
      type: 'connection_established',
      roomId,
      userType,
      clientId,
      timestamp: new Date().toISOString()
    });

    // Set up message handlers
    ws.on('message', (data) => {
      this.handleMessage(clientId, data);
    });

    ws.on('close', (code, reason) => {
      this.handleDisconnection(clientId, code, reason);
    });

    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for client ${clientId}:`, error);
    });

    // Send presence update to room
    this.broadcastToRoom(roomId, {
      type: 'presence_update',
      clientId,
      userType,
      roomId, // Add room ID so clients know which room this update is for
      action: 'joined',
      timestamp: new Date().toISOString()
    }, clientId);
  }

  async handleMessage(clientId, data) {
    try {
      const client = this.clients.get(clientId);
      if (!client) {
        console.error('❌ Message from unknown client:', clientId);
        return;
      }

      client.lastActivity = new Date();
      const message = JSON.parse(data.toString());
      console.log(`📨 Message from ${clientId}:`, message);

      switch (message.type) {
        case 'message':
          await this.handleChatMessage(clientId, message);
          break;
        case 'typing':
          this.handleTypingIndicator(clientId, message);
          break;
        case 'typing_preview':
          this.handleTypingPreview(clientId, message);
          break;
        case 'reaction':
          await this.handleReaction(clientId, message);
          break;
        case 'message_edit':
          await this.handleMessageEdit(clientId, message);
          break;
        case 'message_delete':
          await this.handleMessageDelete(clientId, message);
          break;
        case 'message_read':
          await this.handleMessageRead(clientId, message);
          break;
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
          break;
        // Presence Events
        case 'presence_subscribe':
          await this.handlePresenceSubscribe(clientId, message);
          break;
        case 'presence_bulk_query':
          await this.handlePresenceBulkQuery(clientId, message);
          break;
        case 'set_status':
          await this.handleSetStatus(clientId, message);
          break;
        // Message Status Events
        case 'message_delivered':
          await this.handleMessageDelivered(clientId, message);
          break;
        case 'mark_room_read':
          await this.handleMarkRoomRead(clientId, message);
          break;
        // Room Events
        case 'join_room':
          await this.handleJoinRoom(clientId, message);
          break;
        case 'leave_room':
          await this.handleLeaveRoom(clientId, message);
          break;
        // Desktop Notification
        case 'request_desktop_notification':
          this.handleDesktopNotificationRequest(clientId, message);
          break;
        // Authentication
        case 'authenticate':
          await this.handleAuthenticate(clientId, message);
          break;
        // Video Call Events
        case 'video_call_request':
          await this.handleVideoCallRequest(clientId, message);
          break;
        case 'video_call_response':
          await this.handleVideoCallResponse(clientId, message);
          break;
        case 'video_call_end':
          await this.handleVideoCallEnd(clientId, message);
          break;
        // Channel Events
        case 'subscribe_channels':
          await this.handleSubscribeChannels(clientId, message);
          break;
        case 'unsubscribe_channel':
          await this.handleUnsubscribeChannel(clientId, message);
          break;
        case 'channel_typing':
          this.handleChannelTyping(clientId, message);
          break;
        // Thread Events
        case 'subscribe_thread':
          await this.handleSubscribeThread(clientId, message);
          break;
        case 'unsubscribe_thread':
          await this.handleUnsubscribeThread(clientId, message);
          break;
        case 'thread_typing':
          this.handleThreadTyping(clientId, message);
          break;
        default:
          console.warn(`❓ Unknown message type from ${clientId}:`, message.type);
      }
    } catch (error) {
      console.error(`❌ Error handling message from ${clientId}:`, error);
    }
  }

  async handleChatMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      // Get or create chat room
      const roomData = await this.getOrCreateRoom(client.roomId);

      // SLASH COMMAND CHECK
      if (message.content && message.content.startsWith('/')) {
        const context = {
          userId: client.userId,
          userName: client.userType === 'admin' ? 'Admin' : 'Applicant',
          userType: client.userType,
          roomId: roomData.id,
          channelId: roomData.id,
          siteCode: null
        };

        const result = await SlashCommandService.execute(message.content, context);

        if (result) {
          if (result.type === 'ephemeral') {
            this.sendToClient(clientId, {
              type: 'chat_message',
              message: {
                id: `ephemeral_${Date.now()}`,
                sender_type: 'system',
                sender_name: 'System',
                content: result.message,
                created_at: new Date().toISOString(),
                is_ephemeral: true
              }
            });
            return;
          } else if (result.type === 'action') {
            if (result.message) {
              this.sendToClient(clientId, {
                type: 'chat_message',
                message: {
                  id: `action_${Date.now()}`,
                  sender_type: 'system',
                  sender_name: 'System',
                  content: result.message,
                  created_at: new Date().toISOString(),
                  is_ephemeral: true
                }
              });
            }
            return;
          } else if (result.type === 'rich_message') {
            this.sendToClient(clientId, {
              type: 'chat_message',
              message: {
                id: `rich_${Date.now()}`,
                sender_type: 'bot',
                sender_name: 'Bot',
                content: result.message,
                created_at: new Date().toISOString()
              }
            });
            return;
          }
        }
      }

      // Save message to database
      const savedMessage = await ChatMessage.create({
        message_id: message.id,
        room_id: roomData.id, // Use integer database PK
        sender_type: client.userType,
        sender_name: message.sender || (client.userType === 'admin' ? 'Admin' : 'Applicant'),
        sender_id: client.userId,
        content: message.content,
        file_url: message.file?.url || null,
        file_name: message.file?.name || null,
        file_size: message.file?.size || null,
        file_mime_type: message.file?.type || null,
        reply_to_message_id: message.reply_to_message_id || null, // Yanıtlanan mesaj ID'si
        status: 'sent'
      });

      // Yanıtlanan mesajı fetch et (eğer varsa)
      let repliedToMessage = null;
      if (message.reply_to_message_id) {
        repliedToMessage = await ChatMessage.findOne({
          where: { message_id: message.reply_to_message_id }
        });
      }

      // Update room's last message
      await ChatRoom.update({
        last_message_id: savedMessage.id,
        last_message_at: new Date()
      }, {
        where: { id: roomData.id }
      });

      // Broadcast message to all clients in room
      const broadcastMessage = {
        type: 'chat_message',
        message: {
          id: savedMessage.id,
          message_id: savedMessage.message_id,
          sender_type: savedMessage.sender_type,
          sender_name: savedMessage.sender_name,
          content: savedMessage.content,
          created_at: savedMessage.created_at,
          file_url: savedMessage.file_url,
          file_name: savedMessage.file_name,
          file_size: savedMessage.file_size,
          file_mime_type: savedMessage.file_mime_type, // ✅ MIME type eklendi
          status: savedMessage.status,
          reactions: savedMessage.reactions || [],
          reply_to_message_id: savedMessage.reply_to_message_id,
          replied_to_message: repliedToMessage ? {
            id: repliedToMessage.id,
            message_id: repliedToMessage.message_id,
            content: repliedToMessage.content,
            sender_name: repliedToMessage.sender_name,
            sender_type: repliedToMessage.sender_type,
            created_at: repliedToMessage.created_at
          } : null
        },
        timestamp: new Date().toISOString()
      };

      // Broadcast to ALL clients in room (including sender)
      this.broadcastToRoom(client.roomId, broadcastMessage, null);
      console.log(`✅ Message broadcasted to room ${client.roomId}`);

    } catch (error) {
      console.error('❌ Error saving chat message:', error);
      this.sendToClient(clientId, {
        type: 'message_error',
        error: 'Failed to save message',
        originalMessageId: message.id,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleTypingIndicator(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Task 2.5: Use enhanced typing indicator service
    if (message.is_typing) {
      typingIndicatorService.startTyping(
        client.roomId,
        client.userType,
        client.userId,
        client.userName || 'Unknown',
        client.userAvatar
      );
    } else {
      typingIndicatorService.stopTyping(
        client.roomId,
        client.userType,
        client.userId
      );
    }

    // Also broadcast legacy format for backwards compatibility
    this.broadcastToRoom(client.roomId, {
      type: 'typing_indicator',
      clientId,
      user_type: client.userType,
      user_name: client.userName,
      is_typing: message.is_typing,
      timestamp: new Date().toISOString()
    }, clientId);
  }

  // Handle live typing preview (Comm100 style)
  handleTypingPreview(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Task 2.5: Use enhanced typing preview
    typingIndicatorService.handleTypingPreview(
      client.roomId,
      client.userType,
      client.userId,
      client.userName || 'Unknown',
      message.content || ''
    );

    // Also broadcast legacy format for backwards compatibility
    this.broadcastToRoom(client.roomId, {
      type: 'typing_preview',
      clientId,
      user_type: client.userType,
      sender_type: message.sender_type || client.userType,
      content: message.content || '',
      is_typing: message.is_typing,
      timestamp: new Date().toISOString()
    }, clientId);
  }

  async handleReaction(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      // Find the message to react to
      const chatMessage = await ChatMessage.findOne({
        where: { message_id: message.message_id }
      });

      if (!chatMessage) {
        console.error('❌ Message not found for reaction:', message.message_id);
        return;
      }

      // Update reactions
      let reactions = chatMessage.reactions || [];
      const userReactionIndex = reactions.findIndex(r =>
        r.user_type === client.userType && r.emoji === message.emoji
      );

      if (message.action === 'add') {
        if (userReactionIndex === -1) {
          reactions.push({
            emoji: message.emoji,
            user_type: client.userType,
            user_name: message.sender || client.userType,
            timestamp: new Date().toISOString()
          });
        }
      } else if (message.action === 'remove') {
        if (userReactionIndex !== -1) {
          reactions.splice(userReactionIndex, 1);
        }
      }

      // Save updated reactions
      await ChatMessage.update(
        { reactions },
        { where: { id: chatMessage.id } }
      );

      // Broadcast reaction update
      this.broadcastToRoom(client.roomId, {
        type: 'message_reaction',
        message_id: message.message_id,
        emoji: message.emoji,
        action: message.action,
        user: client.userType,
        reactions,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error handling reaction:', error);
    }
  }

  async handleMessageEdit(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const { message_id, new_content } = message;

      // Find the message to edit
      const chatMessage = await ChatMessage.findOne({
        where: { message_id }
      });

      if (!chatMessage) {
        console.error('❌ Message not found for edit:', message_id);
        return;
      }

      // Update message content and mark as edited
      await ChatMessage.update(
        {
          content: new_content,
          is_edited: true,
          edited_at: new Date()
        },
        { where: { id: chatMessage.id } }
      );

      console.log(`✅ Message ${message_id} edited`);

      // Broadcast edit to all clients in room
      this.broadcastToRoom(client.roomId, {
        type: 'message_edited',
        message_id,
        new_content,
        edited_at: new Date().toISOString(),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error handling message edit:', error);
      this.sendToClient(clientId, {
        type: 'message_edit_error',
        error: 'Failed to edit message',
        message_id: message.message_id,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleMessageDelete(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const { message_id } = message;

      // Find the message to delete
      const chatMessage = await ChatMessage.findOne({
        where: { message_id }
      });

      if (!chatMessage) {
        console.error('❌ Message not found for delete:', message_id);
        return;
      }

      // Soft delete: mark as deleted instead of removing
      await ChatMessage.update(
        {
          is_deleted: true,
          deleted_at: new Date(),
          content: '' // Clear content for privacy
        },
        { where: { id: chatMessage.id } }
      );

      console.log(`✅ Message ${message_id} deleted`);

      // Broadcast delete to all clients in room
      this.broadcastToRoom(client.roomId, {
        type: 'message_deleted',
        message_id,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error handling message delete:', error);
      this.sendToClient(clientId, {
        type: 'message_delete_error',
        error: 'Failed to delete message',
        message_id: message.message_id,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleMessageRead(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const { message_ids } = message;

      if (!message_ids || !Array.isArray(message_ids)) {
        console.error('❌ Invalid message_ids for read receipt');
        return;
      }

      // Update all messages as read
      await ChatMessage.update(
        { status: 'read' },
        {
          where: {
            message_id: message_ids,
            sender_type: { [require('sequelize').Op.ne]: client.userType } // Only mark messages from other user as read
          }
        }
      );

      console.log(`✅ ${message_ids.length} messages marked as read`);

      // Broadcast read receipt to all clients in room
      this.broadcastToRoom(client.roomId, {
        type: 'messages_read',
        message_ids,
        reader_type: client.userType,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error handling message read:', error);
    }
  }

  async getOrCreateRoom(roomIdentifier) {
    // Parse room identifier (e.g., "applicant_123" or "group_4")
    const [roomType, id] = roomIdentifier.split('_');

    if (roomType === 'group') {
      // Group chat room - just find it, don't create
      const roomId = parseInt(id);
      let room = await ChatRoom.findOne({
        where: {
          id: roomId,
          room_type: 'group',
          is_active: true
        }
      });

      if (!room) {
        throw new Error(`Group room not found: ${roomId}`);
      }

      return room;
    } else if (roomType === 'applicant') {
      const applicantId = parseInt(id);

      // Find or create room
      let room = await ChatRoom.findOne({
        where: {
          room_type: 'applicant',
          applicant_id: applicantId
        }
      });

      if (!room) {
        // Get applicant profile information
        const ApplicantProfile = require('../models/ApplicantProfile');
        const profile = await ApplicantProfile.findByPk(applicantId);

        const applicantName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : `Başvuran ${applicantId}`;

        room = await ChatRoom.create({
          site_code: profile?.site_code || null,
          room_type: 'applicant',
          channel_type: 'EXTERNAL',
          applicant_id: applicantId,
          applicant_email: profile?.email || `applicant_${applicantId}@temp.com`,
          applicant_name: applicantName,
          room_name: applicantName,
          is_active: true
        });
        console.log(`✅ Created new chat room for applicant ${applicantId} (${room.applicant_name})`);
      }

      return room;
    } else {
      throw new Error(`Unsupported room type: ${roomType}`);
    }
  }

  async handleDisconnection(clientId, code, reason) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`🔌 Client ${clientId} disconnected:`, code, reason);

    // Task 2.5: Clear typing state on disconnect
    typingIndicatorService.handleUserDisconnect(client.userType, client.userId);

    // Cleanup (Redis, presence, etc.)
    await this.cleanupClient(clientId);

    // Remove from room
    if (this.rooms.has(client.roomId)) {
      this.rooms.get(client.roomId).delete(clientId);

      // Clean up empty rooms
      if (this.rooms.get(client.roomId).size === 0) {
        this.rooms.delete(client.roomId);
      }
    }

    // Remove client
    this.clients.delete(clientId);

    // Broadcast presence update
    this.broadcastToRoom(client.roomId, {
      type: 'presence_update',
      clientId,
      userType: client.userType,
      userId: client.userId,
      roomId: client.roomId,
      action: 'left',
      timestamp: new Date().toISOString()
    });
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ Error sending message to ${clientId}:`, error);
      }
    }
  }

  broadcastToRoom(roomId, message, excludeClientId = null) {
    const roomClients = this.rooms.get(roomId);
    if (!roomClients) {
      console.log(`⚠️  No clients in room ${roomId}`);
      return;
    }

    console.log(`📡 Broadcasting to room ${roomId}:`, {
      totalClients: roomClients.size,
      clientIds: Array.from(roomClients),
      excludeClientId,
      messageType: message.type
    });

    let sentCount = 0;
    for (const clientId of roomClients) {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
        sentCount++;
      }
    }
    console.log(`✅ Broadcast complete: ${sentCount} clients received message`);
  }

  // ==================== VIDEO CALL HANDLERS ====================

  async handleVideoCallRequest(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { call_id, room_id, caller_name } = message;
    console.log(`📞 Video call request from ${caller_name} in room ${room_id}`);

    try {
      // Save video call to database
      const videoCallService = require('./videoCallService');

      // Parse applicant ID from room_id (e.g., "applicant_123")
      const applicantId = room_id.split('_')[1];

      // Get room and applicant info
      const roomData = await this.getOrCreateRoom(room_id);

      await videoCallService.createCall({
        callId: call_id,
        roomId: room_id,
        roomName: roomData.applicant_name || `Applicant ${applicantId}`,
        initiatorId: client.userType === 'admin' ? 'admin' : applicantId,
        initiatorName: caller_name || 'Admin',
        initiatorEmail: client.userType === 'admin' ? 'admin@optima.com' : roomData.applicant_email,
        participantId: applicantId,
        participantName: roomData.applicant_name || `Applicant ${applicantId}`,
        participantEmail: roomData.applicant_email,
        dailyRoomName: null, // Will be set when accepted
        dailyRoomUrl: null,
        moderatorId: client.userType === 'admin' ? 'admin' : null
      });

      // Find recipient (applicant or admin in the room)
      const roomClients = this.rooms.get(room_id);
      if (roomClients) {
        for (const targetClientId of roomClients) {
          const targetClient = this.clients.get(targetClientId);
          // Send to the other user type (if admin calls, send to applicant and vice versa)
          if (targetClient && targetClient.userType !== client.userType) {
            this.sendToClient(targetClientId, {
              type: 'video_call_incoming',
              call_id,
              caller_name,
              caller_type: client.userType,
              room_id,
              timestamp: new Date().toISOString()
            });
            console.log(`✅ Video call notification sent to ${targetClient.userType}`);
          }
        }
      }

      // Note: 30-second timeout removed - was causing issues with call cancellation/restart
      console.log(`📞 Call ${call_id} initiated, waiting for response...`);

    } catch (error) {
      console.error('❌ Error handling video call request:', error);
      this.sendToClient(clientId, {
        type: 'video_call_error',
        error: 'Failed to initiate video call',
        call_id,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleVideoCallResponse(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { call_id, action, participant_name, preferences } = message;
    console.log(`📞 Video call ${action} by ${participant_name} for call ${call_id}`, preferences ? `with preferences: ${JSON.stringify(preferences)}` : '');

    try {
      const roomClients = this.rooms.get(client.roomId);
      const videoCallService = require('./videoCallService');

      if (action === 'accept') {
        // Mark call as accepted (calling -> active)
        await videoCallService.acceptCall(call_id);

        // Generate Daily.co room
        const dailycoService = require('./dailycoService');
        const roomName = `optima-call-${call_id}`;

        try {
          // Create Daily.co room
          const room = await dailycoService.createRoom(roomName);
          console.log(`✅ Daily.co room created: ${room.url}`);

          // Find admin and applicant clients to create tokens
          let adminClientId = null;
          let applicantClientId = null;
          let adminName = 'Admin';
          let applicantName = participant_name || 'Applicant';
          let applicantIp = 'Unknown';

          if (roomClients) {
            for (const targetClientId of roomClients) {
              const targetClient = this.clients.get(targetClientId);
              if (targetClient) {
                if (targetClient.userType === 'admin') {
                  adminClientId = targetClientId;
                } else if (targetClient.userType === 'applicant') {
                  applicantClientId = targetClientId;
                  applicantIp = targetClient.ip || 'Unknown';
                }
              }
            }
          }

          // Create tokens for both participants
          const adminToken = await dailycoService.createMeetingToken(roomName, adminName, true);
          const applicantToken = await dailycoService.createMeetingToken(roomName, applicantName, false);

          // Update video call with Daily.co room info using videoCallService
          await videoCallService.updateDailyRoomInfo(call_id, roomName, room.url);

          // Send to both participants with their respective tokens
          if (roomClients) {
            for (const targetClientId of roomClients) {
              const targetClient = this.clients.get(targetClientId);
              if (targetClient) {
                const isAdmin = targetClient.userType === 'admin';
                const token = isAdmin ? adminToken : applicantToken;
                const dailyUrl = `${room.url}?t=${token}`;

                if (targetClient.userType !== client.userType) {
                  // Send acceptance to caller
                  this.sendToClient(targetClientId, {
                    type: 'video_call_response',
                    call_id,
                    action: 'accept',
                    participant_name,
                    preferences, // Forward mic/cam preferences
                    timestamp: new Date().toISOString()
                  });
                }

                // Send Daily.co URL to participant
                const readyMessage = {
                  type: 'video_call_ready',
                  call_id,
                  daily_url: dailyUrl,
                  room_name: roomName,
                  timestamp: new Date().toISOString()
                };

                // Include applicant IP for admin
                if (isAdmin) {
                  readyMessage.participant_ip = applicantIp;
                }

                this.sendToClient(targetClientId, readyMessage);
                console.log(`✅ Daily.co URL sent to ${targetClient.userType}: ${dailyUrl}`);
              }
            }
          }

        } catch (dailyError) {
          console.error('❌ Daily.co room creation failed:', dailyError);
          throw dailyError;
        }

      } else if (action === 'reject') {
        // Mark call as declined (calling -> declined)
        await videoCallService.declineCall(call_id);

        // Notify caller of rejection
        if (roomClients) {
          for (const targetClientId of roomClients) {
            const targetClient = this.clients.get(targetClientId);
            if (targetClient && targetClient.userType !== client.userType) {
              this.sendToClient(targetClientId, {
                type: 'video_call_response',
                call_id,
                action: 'reject',
                participant_name,
                timestamp: new Date().toISOString()
              });
              console.log(`✅ Call decline notification sent to ${targetClient.userType}`);
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Error handling video call response:', error);
      this.sendToClient(clientId, {
        type: 'video_call_error',
        error: 'Failed to process video call response',
        call_id,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleVideoCallEnd(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { call_id, room_id } = message;
    console.log(`📞 Video call ended by ${client.userType} for call ${call_id}`);

    try {
      // End call in database
      const videoCallService = require('./videoCallService');
      await videoCallService.endCall(call_id);

      // Notify all participants
      const roomClients = this.rooms.get(room_id || client.roomId);
      if (roomClients) {
        for (const targetClientId of roomClients) {
          this.sendToClient(targetClientId, {
            type: 'video_call_ended',
            call_id,
            ended_by: client.userType,
            timestamp: new Date().toISOString()
          });
        }
        console.log(`✅ Call end notification sent to all participants`);
      }

    } catch (error) {
      console.error('❌ Error handling video call end:', error);
    }
  }

  // ==================== CHANNEL HANDLERS ====================

  /**
   * Birden fazla kanala abone ol
   */
  async handleSubscribeChannels(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channelIds } = message;
    if (!Array.isArray(channelIds)) return;

    const subscribedChannels = [];

    for (const channelId of channelIds) {
      const roomId = `channel_${channelId}`;

      // Odaya ekle
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Set());
      }
      this.rooms.get(roomId).add(clientId);
      subscribedChannels.push(channelId);
    }

    console.log(`📺 Client ${clientId} subscribed to ${subscribedChannels.length} channels`);

    this.sendToClient(clientId, {
      type: 'channels_subscribed',
      channelIds: subscribedChannels,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Kanaldan aboneliği kaldır
   */
  async handleUnsubscribeChannel(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channelId } = message;
    const roomId = `channel_${channelId}`;

    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(clientId);

      if (this.rooms.get(roomId).size === 0) {
        this.rooms.delete(roomId);
      }
    }

    console.log(`📺 Client ${clientId} unsubscribed from channel ${channelId}`);

    this.sendToClient(clientId, {
      type: 'channel_unsubscribed',
      channelId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Kanal typing indicator
   */
  handleChannelTyping(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { channelId, isTyping } = message;
    const roomId = `channel_${channelId}`;

    this.broadcastToRoom(roomId, {
      type: 'channel_typing_indicator',
      channelId,
      userId: client.userId,
      userName: client.userName,
      isTyping,
      timestamp: new Date().toISOString()
    }, clientId);
  }

  /**
   * Kanala mesaj broadcast et (external call için)
   */
  broadcastChannelMessage(channelId, message) {
    const roomId = `channel_${channelId}`;
    this.broadcastToRoom(roomId, {
      type: 'channel_message',
      channelId,
      message,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Kanala generic event broadcast et (Task 2.6: pins, vb.)
   */
  broadcastToChannel(channelId, event) {
    const roomId = `channel_${channelId}`;
    this.broadcastToRoom(roomId, event);
  }

  // ==================== THREAD HANDLERS ====================

  /**
   * Thread'e abone ol
   */
  async handleSubscribeThread(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { threadId } = message;
    const roomId = `thread_${threadId}`;

    // Thread room'una ekle
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(clientId);

    console.log(`📺 Client ${clientId} subscribed to thread ${threadId}`);

    this.sendToClient(clientId, {
      type: 'thread_subscribed',
      threadId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Thread aboneliğini kaldır
   */
  async handleUnsubscribeThread(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { threadId } = message;
    const roomId = `thread_${threadId}`;

    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(clientId);

      if (this.rooms.get(roomId).size === 0) {
        this.rooms.delete(roomId);
      }
    }

    console.log(`📺 Client ${clientId} unsubscribed from thread ${threadId}`);

    this.sendToClient(clientId, {
      type: 'thread_unsubscribed',
      threadId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Thread typing indicator
   */
  handleThreadTyping(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { threadId, isTyping } = message;
    const roomId = `thread_${threadId}`;

    this.broadcastToRoom(roomId, {
      type: 'thread_typing_indicator',
      threadId,
      userId: client.userId,
      userName: client.userName,
      isTyping,
      timestamp: new Date().toISOString()
    }, clientId);
  }

  // Get online status for all rooms (for admin)
  getRoomOnlineStatus() {
    const onlineStatus = {};

    // Iterate through all rooms
    this.rooms.forEach((clients, roomId) => {
      // Check if any applicant is online in this room
      let applicantOnline = false;

      for (const clientId of clients) {
        const client = this.clients.get(clientId);
        if (client && client.userType === 'applicant') {
          applicantOnline = true;
          break;
        }
      }

      onlineStatus[roomId] = applicantOnline;
    });

    return onlineStatus;
  }

  // Get room statistics
  getRoomStats() {
    const stats = {
      totalRooms: this.rooms.size,
      totalClients: this.clients.size,
      rooms: {}
    };

    for (const [roomId, clients] of this.rooms.entries()) {
      stats.rooms[roomId] = {
        clientCount: clients.size,
        clients: Array.from(clients).map(clientId => {
          const client = this.clients.get(clientId);
          return {
            clientId,
            userType: client?.userType,
            connected: client?.ws.readyState === WebSocket.OPEN
          };
        })
      };
    }

    return stats;
  }

  // ==================== YENİ PRESENCE & STATUS HANDLERS ====================

  /**
   * Kullanici kimlik dogrulama
   */
  async handleAuthenticate(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const { token } = message;
      const result = await authenticateWebSocket(token);

      if (!result.success) {
        this.sendToClient(clientId, {
          type: 'auth_error',
          error: result.error,
          timestamp: new Date().toISOString()
        });
        return;
      }

      const user = result.user;

      // Client bilgilerini guncelle
      client.userId = user.id;
      client.userType = user.type;
      client.employeeId = user.employeeId;
      client.userName = user.name;
      client.siteCode = user.siteCode;

      // Kullanici bazli socket takibine ekle
      const userKey = `${user.type}:${user.id}`;
      if (!this.userSockets.has(userKey)) {
        this.userSockets.set(userKey, new Set());
      }
      this.userSockets.get(userKey).add(clientId);

      // Redis'te online olarak isaretle
      if (user.employeeId) {
        await redisService.setUserOnline('employee', user.employeeId, 'web');
        await EmployeePresence.updateStatus(user.employeeId, 'online', 'web');

        // Deliver pending offline messages (Task 1.6)
        try {
          const offlineMessagingService = require('./OfflineMessagingService');
          await offlineMessagingService.onUserOnline('employee', user.employeeId);
        } catch (offlineErr) {
          console.error('Error delivering offline messages:', offlineErr);
        }
      }

      this.sendToClient(clientId, {
        type: 'auth_success',
        user: {
          id: user.id,
          type: user.type,
          name: user.name,
          employeeId: user.employeeId
        },
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Client ${clientId} authenticated as ${user.name} (${user.type})`);
    } catch (error) {
      console.error('❌ Authentication error:', error);
      this.sendToClient(clientId, {
        type: 'auth_error',
        error: 'Kimlik dogrulama hatasi',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Presence aboneligi
   */
  async handlePresenceSubscribe(clientId, message) {
    const { employeeIds } = message;
    if (!Array.isArray(employeeIds)) return;

    // Abone listesini guncelle
    if (!this.presenceSubscriptions.has(clientId)) {
      this.presenceSubscriptions.set(clientId, new Set());
    }
    const subscriptions = this.presenceSubscriptions.get(clientId);
    employeeIds.forEach(id => subscriptions.add(id));

    // Mevcut durumlari gonder
    const presenceMap = await redisService.bulkGetPresence('employee', employeeIds);

    this.sendToClient(clientId, {
      type: 'presence_bulk',
      presence: presenceMap,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Toplu presence sorgulama
   */
  async handlePresenceBulkQuery(clientId, message) {
    const { employeeIds } = message;
    if (!Array.isArray(employeeIds)) return;

    const presenceMap = await redisService.bulkGetPresence('employee', employeeIds);

    this.sendToClient(clientId, {
      type: 'presence_bulk',
      presence: presenceMap,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Durum guncelleme
   */
  async handleSetStatus(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || !client.employeeId) return;

    const { status, customStatus, statusEmoji } = message;

    // Redis'i guncelle
    await redisService.setUserOnline('employee', client.employeeId);

    // DB'yi guncelle
    await EmployeePresence.upsert({
      employee_id: client.employeeId,
      status: status || 'online',
      custom_status: customStatus,
      status_emoji: statusEmoji,
      last_seen_at: new Date()
    });

    // Presence degisikligini yayinla
    await redisService.publishPresenceChange('employee', client.employeeId, status);

    this.sendToClient(clientId, {
      type: 'status_updated',
      status,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Mesaj iletildi bildirimi
   */
  async handleMessageDelivered(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { messageIds, roomId } = message;
    if (!Array.isArray(messageIds)) return;

    // Mesajlari delivered olarak isaretle
    await ChatMessage.update(
      { delivery_status: 'delivered', delivered_at: new Date() },
      { where: { message_id: messageIds, delivery_status: 'sent' } }
    );

    // Odadaki diger kullanicilara bildir
    this.broadcastToRoom(roomId, {
      type: 'messages_delivered',
      messageIds,
      deliveredTo: {
        type: client.userType,
        id: client.userId,
        name: client.userName
      },
      timestamp: new Date().toISOString()
    }, clientId);
  }

  /**
   * Odayi okundu olarak isaretle
   */
  async handleMarkRoomRead(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { roomId } = message;

    // Tum mesajlari okundu olarak isaretle
    const updated = await ChatMessage.markRoomMessagesAsRead(
      roomId,
      client.userType,
      client.userId
    );

    // Read receipts olustur
    if (client.employeeId) {
      await MessageReadReceipt.markRoomAsRead(roomId, 'employee', client.employeeId);
    } else {
      await MessageReadReceipt.markRoomAsRead(roomId, client.userType, client.userId);
    }

    // Odadaki diger kullanicilara bildir
    this.broadcastToRoom(roomId, {
      type: 'room_read',
      roomId,
      readBy: {
        type: client.userType,
        id: client.userId,
        name: client.userName
      },
      timestamp: new Date().toISOString()
    }, clientId);

    // Redis uzerinden yayin
    await redisService.publishMessageStatus(roomId, null, 'room_read', {
      type: client.userType,
      id: client.userId
    });
  }

  /**
   * Odaya katilma (multi-room support)
   */
  async handleJoinRoom(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { roomId } = message;

    // Erisim kontrolu
    const accessResult = await ChatRoom.validateAccess(client.userId, client.userType, roomId);
    if (!accessResult.allowed) {
      this.sendToClient(clientId, {
        type: 'join_error',
        roomId,
        error: accessResult.reason,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Odaya ekle
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(clientId);

    // Odadaki digerlerne bildir
    this.broadcastToRoom(roomId, {
      type: 'room_member_joined',
      roomId,
      member: {
        type: client.userType,
        id: client.userId,
        name: client.userName
      },
      timestamp: new Date().toISOString()
    }, clientId);

    this.sendToClient(clientId, {
      type: 'room_joined',
      roomId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Odadan ayrilma
   */
  async handleLeaveRoom(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { roomId } = message;

    // Odadan cikar
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(clientId);

      // Bos odalari temizle
      if (this.rooms.get(roomId).size === 0) {
        this.rooms.delete(roomId);
      }
    }

    // Odadaki digerlerne bildir
    this.broadcastToRoom(roomId, {
      type: 'room_member_left',
      roomId,
      member: {
        type: client.userType,
        id: client.userId,
        name: client.userName
      },
      timestamp: new Date().toISOString()
    });

    this.sendToClient(clientId, {
      type: 'room_left',
      roomId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Desktop notification istegi
   */
  handleDesktopNotificationRequest(clientId, message) {
    // Client'a desktop notification gonder
    this.sendToClient(clientId, {
      type: 'desktop_notification',
      title: message.title,
      body: message.body,
      data: message.data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Kullaniciya mesaj gonder (userType:userId ile)
   */
  sendToUser(userType, userId, message) {
    const userKey = `${userType}:${userId}`;
    const sockets = this.userSockets.get(userKey);

    if (!sockets || sockets.size === 0) {
      return false;
    }

    for (const clientId of sockets) {
      this.sendToClient(clientId, message);
    }

    return true;
  }

  /**
   * Presence degisikligini yayinla
   */
  broadcastPresenceChange(userType, userId, status, userName = null) {
    // Bu kullanicinin presence'ini takip eden tum client'lara bildir
    for (const [clientId, subscriptions] of this.presenceSubscriptions.entries()) {
      if (subscriptions.has(userId)) {
        this.sendToClient(clientId, {
          type: 'presence_change',
          userType,
          userId,
          status,
          userName,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Site'deki tum kullanicilara mesaj yayinla
   */
  broadcastToSite(siteCode, eventType, data) {
    let sentCount = 0;

    for (const [clientId, client] of this.clients.entries()) {
      // Site kodu eslesen tum client'lara gonder
      // siteCode null ise veya client'in siteCode'u esliyorsa gonder
      if (!siteCode || client.siteCode === siteCode || !client.siteCode) {
        this.sendToClient(clientId, {
          type: eventType,
          ...data,
          timestamp: new Date().toISOString()
        });
        sentCount++;
      }
    }

    console.log(`📡 Broadcasted ${eventType} to ${sentCount} clients in site ${siteCode || 'all'}`);
  }

  /**
   * Belirli bir kullaniciya mention bildirimi gonder
   */
  sendMentionNotification(userId, notification) {
    const userKey = `employee:${userId}`;
    const sockets = this.userSockets.get(userKey);

    if (sockets && sockets.size > 0) {
      for (const clientId of sockets) {
        this.sendToClient(clientId, {
          type: 'mention_notification',
          ...notification,
          timestamp: new Date().toISOString()
        });
      }
      return true;
    }
    return false;
  }

  /**
   * Baglanti kapatildiginda temizlik
   */
  async cleanupClient(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Kullanici bazli socket takibinden cikar
    const userKey = `${client.userType}:${client.userId}`;
    if (this.userSockets.has(userKey)) {
      this.userSockets.get(userKey).delete(clientId);

      // Son socket ise offline yap
      if (this.userSockets.get(userKey).size === 0) {
        this.userSockets.delete(userKey);

        // Redis'te offline yap
        if (client.employeeId) {
          await redisService.setUserOffline('employee', client.employeeId);
          await EmployeePresence.decrementSocket(client.employeeId);
        }
      }
    }

    // Presence aboneliklerini temizle
    this.presenceSubscriptions.delete(clientId);

    // Typing indicator'i temizle
    if (client.roomId) {
      await redisService.clearTyping(client.roomId, client.userType, client.userId);
    }
  }
}

// Create singleton instance
const chatWebSocketService = new ChatWebSocketService();

module.exports = chatWebSocketService;