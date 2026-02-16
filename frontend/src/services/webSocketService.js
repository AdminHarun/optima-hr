// Enhanced WebSocket service with auto-reconnect and heartbeat
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:9000';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.isAuthenticated = false;
    this.messageHandlers = [];
    this.connectionHandlers = [];
    this.presenceHandlers = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000; // Start with 1 second
    this.maxReconnectDelay = 30000; // Max 30 seconds
    this.heartbeatInterval = null;
    this.heartbeatTimeout = null;
    this.currentUrl = null;
    this.userType = null;
    this.userId = null;
    this.employeeId = null;
    this.authToken = null;
    this.currentRoomId = null;
    this.subscribedRooms = new Set();
    this.intentionalDisconnect = false;
    console.log('🔧 WebSocketService initialized with auto-reconnect');
  }

  // Admin chat connection
  connectAdminChat(chatRoom) {
    const wsUrl = `${WS_BASE_URL}/ws/admin-chat/${chatRoom}`;
    console.log(`🔌 connectAdminChat called with: ${chatRoom}`);
    this.connect(wsUrl, 'admin');
  }

  // Generic connection method
  connect(wsUrl, userType = 'unknown') {
    // Prevent duplicate connections
    if (this.isConnecting) {
      console.log('⏳ Connection already in progress...');
      return;
    }

    // If already connected to same URL, skip
    if (this.isConnected && this.currentUrl === wsUrl) {
      console.log('✅ Already connected to this URL');
      return;
    }

    // Close existing connection if different URL
    if (this.socket && this.currentUrl !== wsUrl) {
      this.intentionalDisconnect = true;
      this.socket.close(1000, 'Switching rooms');
    }

    this.isConnecting = true;
    this.currentUrl = wsUrl;
    this.userType = userType;
    this.intentionalDisconnect = false;

    console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('✅ WebSocket connection established');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;

        // Start heartbeat
        this.startHeartbeat();

        // Notify connection handlers
        this.connectionHandlers.forEach(handler => {
          handler({ type: 'connected', userType: this.userType });
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle pong response (heartbeat)
          if (data.type === 'pong') {
            this.handlePong();
            return;
          }

          // Handle authentication response
          if (data.type === 'authenticated') {
            this.isAuthenticated = true;
            console.log('✅ WebSocket authenticated');
          }

          // Handle authentication error
          if (data.type === 'auth_error') {
            this.isAuthenticated = false;
            console.error('❌ WebSocket authentication failed:', data.message);
          }

          // Handle presence updates
          if (data.type === 'presence_update' || data.type === 'presence_bulk') {
            this.presenceHandlers.forEach(handler => {
              handler(data);
            });
            return;
          }

          // Handle message delivered confirmation
          if (data.type === 'message_delivered_ack') {
            console.log('✓ Message delivered:', data.message_id);
          }

          // Handle other messages
          this.messageHandlers.forEach(handler => {
            handler(data);
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log('🔌 WebSocket closed:', event.code, event.reason);
        this.isConnected = false;
        this.isConnecting = false;
        this.stopHeartbeat();

        // Notify connection handlers
        this.connectionHandlers.forEach(handler => {
          handler({ type: 'disconnected', code: event.code, reason: event.reason });
        });

        // Auto-reconnect if not intentional disconnect
        if (!this.intentionalDisconnect && event.code !== 1000) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  // Heartbeat mechanism to keep connection alive
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing

    // Send ping every 25 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

          // Set timeout for pong response (10 seconds)
          this.heartbeatTimeout = setTimeout(() => {
            console.warn('⚠️ Heartbeat timeout - no pong received');
            // Force reconnect
            if (this.socket) {
              this.socket.close(4000, 'Heartbeat timeout');
            }
          }, 10000);

        } catch (error) {
          console.error('Failed to send heartbeat:', error);
        }
      }
    }, 25000);

    console.log('💓 Heartbeat started');
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  handlePong() {
    // Clear the timeout since we received pong
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout);
      this.heartbeatTimeout = null;
    }
  }

  // Auto-reconnect with exponential backoff
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnect attempts reached');
      this.connectionHandlers.forEach(handler => {
        handler({ type: 'failed', reason: 'Max reconnect attempts reached' });
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), this.maxReconnectDelay);

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    // Notify handlers about reconnecting state
    this.connectionHandlers.forEach(handler => {
      handler({
        type: 'reconnecting',
        attempt: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts,
        delay
      });
    });

    setTimeout(() => {
      if (!this.isConnected && !this.intentionalDisconnect && this.currentUrl) {
        this.connect(this.currentUrl, this.userType);
      }
    }, delay);
  }

  // Send message
  sendMessage(content, messageId = null, file = null, replyToMessageId = null) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send message: WebSocket not connected');
      return false;
    }

    const messageData = {
      type: 'message',
      id: messageId || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      sender: this.userType === 'admin' ? 'Admin' : 'Applicant',
      timestamp: new Date().toISOString(),
      file: file,
      reply_to_message_id: replyToMessageId
    };

    try {
      this.socket.send(JSON.stringify(messageData));
      console.log('📤 Message sent:', messageData.id);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  // Send typing indicator
  sendTyping(isTyping) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    try {
      this.socket.send(JSON.stringify({
        type: 'typing',
        is_typing: isTyping,
        sender: this.userType === 'admin' ? 'Admin' : 'Applicant',
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }

  // Send typing preview (live content)
  sendTypingPreview(content) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    try {
      this.socket.send(JSON.stringify({
        type: 'typing_preview',
        content: content,
        is_typing: content.length > 0,
        sender: this.userType === 'admin' ? 'Admin' : 'Applicant',
        sender_type: this.userType,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to send typing preview:', error);
    }
  }

  // Send reaction
  sendReaction(messageId, emoji, action = 'add') {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    try {
      this.socket.send(JSON.stringify({
        type: 'reaction',
        message_id: messageId,
        emoji: emoji,
        action: action,
        sender: this.userType === 'admin' ? 'Admin' : 'Applicant',
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to send reaction:', error);
    }
  }

  // Send message edit
  sendMessageEdit(messageId, newContent) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot edit message: WebSocket not connected');
      return false;
    }

    try {
      this.socket.send(JSON.stringify({
        type: 'message_edit',
        message_id: messageId,
        new_content: newContent,
        timestamp: new Date().toISOString()
      }));
      console.log('📝 Message edit sent');
      return true;
    } catch (error) {
      console.error('Failed to send message edit:', error);
      return false;
    }
  }

  // Send message delete
  sendMessageDelete(messageId) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot delete message: WebSocket not connected');
      return false;
    }

    try {
      this.socket.send(JSON.stringify({
        type: 'message_delete',
        message_id: messageId,
        timestamp: new Date().toISOString()
      }));
      console.log('🗑️ Message delete sent');
      return true;
    } catch (error) {
      console.error('Failed to send message delete:', error);
      return false;
    }
  }

  // Send read receipt
  sendReadReceipt(messageIds) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.socket.send(JSON.stringify({
        type: 'message_read',
        message_ids: messageIds,
        timestamp: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      console.error('Failed to send read receipt:', error);
      return false;
    }
  }

  // Event listener management
  onMessage(handler) {
    this.messageHandlers.push(handler);
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  onConnection(handler) {
    this.connectionHandlers.push(handler);
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  // Disconnect with cleanup
  disconnect() {
    console.log('🔌 Disconnecting WebSocket...');
    this.intentionalDisconnect = true;
    this.stopHeartbeat();

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.currentUrl = null;
    this.reconnectAttempts = 0;
    this.clearSubscriptions();
  }

  // Force reconnect (manual trigger)
  forceReconnect() {
    console.log('🔄 Force reconnecting...');
    this.reconnectAttempts = 0;
    this.intentionalDisconnect = false;

    if (this.socket) {
      this.socket.close(4001, 'Force reconnect');
    }

    if (this.currentUrl) {
      setTimeout(() => {
        this.connect(this.currentUrl, this.userType);
      }, 500);
    }
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      isAuthenticated: this.isAuthenticated,
      userType: this.userType,
      reconnectAttempts: this.reconnectAttempts,
      currentUrl: this.currentUrl,
      currentRoomId: this.currentRoomId
    };
  }

  // Get WebSocket connection (for video calls)
  getConnection() {
    return this.socket;
  }

  // ==================== YENİ METODLAR ====================

  // Generic send method
  send(data) {
    if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send data: WebSocket not connected');
      return false;
    }

    try {
      this.socket.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to send data:', error);
      return false;
    }
  }

  // Authenticate with token
  authenticate(token, userId, employeeId = null) {
    this.authToken = token;
    this.userId = userId;
    this.employeeId = employeeId;

    if (!this.isConnected) {
      console.warn('Cannot authenticate: WebSocket not connected');
      return false;
    }

    const success = this.send({
      type: 'authenticate',
      token: token,
      user_id: userId,
      employee_id: employeeId,
      timestamp: new Date().toISOString()
    });

    if (success) {
      this.isAuthenticated = true;
      console.log('🔐 Authentication sent');
    }

    return success;
  }

  // Subscribe to presence updates
  subscribePresence(employeeIds) {
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return false;
    }

    return this.send({
      type: 'presence_subscribe',
      employee_ids: employeeIds,
      timestamp: new Date().toISOString()
    });
  }

  // Bulk query presence
  queryPresenceBulk(employeeIds) {
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return false;
    }

    return this.send({
      type: 'presence_bulk_query',
      employee_ids: employeeIds,
      timestamp: new Date().toISOString()
    });
  }

  // Set user status
  setStatus(status, customMessage = null) {
    return this.send({
      type: 'set_status',
      status: status,
      custom_message: customMessage,
      timestamp: new Date().toISOString()
    });
  }

  // Join a chat room
  joinRoom(roomId) {
    if (this.subscribedRooms.has(roomId)) {
      console.log(`Already subscribed to room ${roomId}`);
      return true;
    }

    const success = this.send({
      type: 'join_room',
      room_id: roomId,
      timestamp: new Date().toISOString()
    });

    if (success) {
      this.subscribedRooms.add(roomId);
      this.currentRoomId = roomId;
      console.log(`📥 Joined room: ${roomId}`);
    }

    return success;
  }

  // Leave a chat room
  leaveRoom(roomId) {
    if (!this.subscribedRooms.has(roomId)) {
      return true;
    }

    const success = this.send({
      type: 'leave_room',
      room_id: roomId,
      timestamp: new Date().toISOString()
    });

    if (success) {
      this.subscribedRooms.delete(roomId);
      if (this.currentRoomId === roomId) {
        this.currentRoomId = null;
      }
      console.log(`📤 Left room: ${roomId}`);
    }

    return success;
  }

  // Mark room as read
  markRoomAsRead(roomId) {
    return this.send({
      type: 'mark_room_read',
      room_id: roomId,
      timestamp: new Date().toISOString()
    });
  }

  // Send message delivered confirmation
  sendDeliveredConfirmation(messageId) {
    return this.send({
      type: 'message_delivered',
      message_id: messageId,
      timestamp: new Date().toISOString()
    });
  }

  // Request desktop notification
  requestDesktopNotification(data) {
    return this.send({
      type: 'desktop_notification',
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Presence event listener
  onPresence(handler) {
    this.presenceHandlers.push(handler);
    return () => {
      const index = this.presenceHandlers.indexOf(handler);
      if (index > -1) {
        this.presenceHandlers.splice(index, 1);
      }
    };
  }

  // Alias methods for compatibility
  addMessageListener(handler) {
    return this.onMessage(handler);
  }

  addConnectionListener(handler) {
    return this.onConnection(handler);
  }

  addPresenceListener(handler) {
    return this.onPresence(handler);
  }

  // Get subscribed rooms
  getSubscribedRooms() {
    return Array.from(this.subscribedRooms);
  }

  // Clear all subscriptions on disconnect
  clearSubscriptions() {
    this.subscribedRooms.clear();
    this.currentRoomId = null;
    this.isAuthenticated = false;
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;
