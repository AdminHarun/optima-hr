const WebSocket = require('ws');
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const url = require('url');

class ChatWebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map<clientId, {ws, roomId, userType, userId}>
    this.rooms = new Map(); // Map<roomId, Set<clientId>>
    this.callTimeouts = new Map(); // Map<call_id, timeout> for 30-second expiry
    console.log('🔧 ChatWebSocketService initialized');
  }

  initialize(server) {
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

    console.log('✅ WebSocket server initialized on /ws');
  }

  handleConnection(ws, req) {
    const pathname = url.parse(req.url).pathname;
    console.log('🔌 New WebSocket connection:', pathname);

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

    const connectionType = pathParts[1]; // admin-chat or applicant-chat
    const roomIdentifier = pathParts[2]; // applicant_123

    let userType, roomId;

    if (connectionType === 'admin-chat') {
      userType = 'admin';
      roomId = roomIdentifier;
    } else if (connectionType === 'applicant-chat') {
      userType = 'applicant';
      roomId = roomIdentifier;
    } else {
      console.error('❌ Unknown connection type:', connectionType);
      ws.close(4000, 'Unknown connection type');
      return;
    }

    const clientId = `${userType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store client info
    this.clients.set(clientId, {
      ws,
      roomId,
      userType,
      userId: null, // Will be set on authentication
      lastActivity: new Date()
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

    // Broadcast typing indicator to other clients in room (not sender)
    this.broadcastToRoom(client.roomId, {
      type: 'typing_indicator',
      clientId,
      user_type: client.userType,
      is_typing: message.is_typing,
      timestamp: new Date().toISOString()
    }, clientId);
  }

  // Handle live typing preview (Comm100 style)
  handleTypingPreview(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Broadcast typing preview content to other clients in room (not sender)
    // Only admins should see applicant's typing preview
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
    // Parse room identifier (e.g., "applicant_123")
    const [roomType, applicantId] = roomIdentifier.split('_');

    if (roomType !== 'applicant') {
      throw new Error(`Unsupported room type: ${roomType}`);
    }

    // Find or create room
    let room = await ChatRoom.findOne({
      where: {
        room_type: 'applicant',
        applicant_id: parseInt(applicantId)
      }
    });

    if (!room) {
      // Get applicant profile information
      const ApplicantProfile = require('../models/ApplicantProfile');
      const profile = await ApplicantProfile.findByPk(parseInt(applicantId));

      room = await ChatRoom.create({
        room_type: 'applicant',
        applicant_id: parseInt(applicantId),
        applicant_email: profile?.email || `applicant_${applicantId}@temp.com`,
        applicant_name: profile ? `${profile.first_name} ${profile.last_name}` : `Applicant ${applicantId}`,
        is_active: true
      });
      console.log(`✅ Created new chat room for applicant ${applicantId} (${room.applicant_name})`);
    }

    return room;
  }

  handleDisconnection(clientId, code, reason) {
    const client = this.clients.get(clientId);
    if (!client) return;

    console.log(`🔌 Client ${clientId} disconnected:`, code, reason);

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
      roomId: client.roomId, // Add room ID so clients know which room this update is for
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
        jitsiRoomName: null, // Will be set when accepted
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

      // Set 30-second timeout for call expiry (Rocket.Chat style)
      const timeout = setTimeout(async () => {
        try {
          console.log(`⏰ Call ${call_id} expired after 30 seconds`);
          await videoCallService.expireCall(call_id);

          // Notify all participants that call expired
          const roomClients = this.rooms.get(room_id);
          if (roomClients) {
            for (const targetClientId of roomClients) {
              this.sendToClient(targetClientId, {
                type: 'video_call_expired',
                call_id,
                timestamp: new Date().toISOString()
              });
            }
          }
        } catch (error) {
          console.error('❌ Error expiring call:', error);
        } finally {
          this.callTimeouts.delete(call_id);
        }
      }, 30000); // 30 seconds

      this.callTimeouts.set(call_id, timeout);
      console.log(`⏰ Call ${call_id} will expire in 30 seconds`);

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

      // Cancel timeout if exists (call was answered before expiry)
      if (this.callTimeouts.has(call_id)) {
        clearTimeout(this.callTimeouts.get(call_id));
        this.callTimeouts.delete(call_id);
        console.log(`✅ Cancelled timeout for call ${call_id}`);
      }

      if (action === 'accept') {
        // Mark call as accepted (calling -> active)
        await videoCallService.acceptCall(call_id);

        // Generate Jitsi room
        const jitsiRoomName = `optima-call-${call_id}`;
        const jitsiUrl = `https://meet.jit.si/${jitsiRoomName}`;

        // Update video call with Jitsi room name
        const { Pool } = require('pg');
        const pool = new Pool({
          host: process.env.DB_HOST || '172.22.207.103',
          port: process.env.DB_PORT || 5432,
          database: process.env.DB_NAME || 'optima_hr',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '12345'
        });

        await pool.query(
          `UPDATE video_calls SET jitsi_room_name = $1 WHERE call_id = $2`,
          [jitsiRoomName, call_id]
        );

        // Send to initiator (the one who called)
        if (roomClients) {
          for (const targetClientId of roomClients) {
            const targetClient = this.clients.get(targetClientId);
            if (targetClient) {
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

              // Send Jitsi URL to BOTH participants
              this.sendToClient(targetClientId, {
                type: 'video_call_ready',
                call_id,
                jitsi_url: jitsiUrl,
                room_name: jitsiRoomName,
                timestamp: new Date().toISOString()
              });
              console.log(`✅ Jitsi URL sent to ${targetClient.userType}: ${jitsiUrl}`);
            }
          }
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
}

// Create singleton instance
const chatWebSocketService = new ChatWebSocketService();

module.exports = chatWebSocketService;