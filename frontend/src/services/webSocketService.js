// Clean WebSocket service for real-time chat
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:9000';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.messageHandlers = [];
    this.connectionHandlers = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    console.log('🔧 WebSocketService constructor called');
  }

  // Admin chat connection
  connectAdminChat(chatRoom) {
    const wsUrl = `${WS_BASE_URL}/ws/admin-chat/${chatRoom}`;
    console.log(`🔌 connectAdminChat called with: ${chatRoom}`);
    this.connect(wsUrl, 'admin');
  }

  // Generic connection method
  connect(wsUrl, userType = 'unknown') {
    console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
    
    try {
      this.socket = new WebSocket(wsUrl);
      this.userType = userType;

      this.socket.onopen = (event) => {
        console.log('✅ WebSocket connection opened');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Notify connection handlers
        this.connectionHandlers.forEach(handler => {
          handler({ type: 'connected', userType: this.userType });
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', data);
          
          // Handle different message types
          this.messageHandlers.forEach(handler => {
            handler(data);
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.socket.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        this.isConnected = false;
        
        // Notify connection handlers
        this.connectionHandlers.forEach(handler => {
          handler({ type: 'disconnected', code: event.code, reason: event.reason });
        });
      };

      this.socket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }

  // Send message
  sendMessage(content, messageId = null, file = null, replyToMessageId = null) {
    if (!this.isConnected || !this.socket) {
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
      reply_to_message_id: replyToMessageId // Yanıtlanan mesaj ID'si
    };

    try {
      this.socket.send(JSON.stringify(messageData));
      console.log('📤 Message sent:', messageData);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  // Send typing indicator
  sendTyping(isTyping) {
    if (!this.isConnected || !this.socket) return;

    const typingData = {
      type: 'typing',
      is_typing: isTyping,
      sender: this.userType === 'admin' ? 'Admin' : 'Applicant',
      timestamp: new Date().toISOString()
    };

    try {
      this.socket.send(JSON.stringify(typingData));
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }

  // Send typing preview (live content)
  sendTypingPreview(content) {
    if (!this.isConnected || !this.socket) return;

    const previewData = {
      type: 'typing_preview',
      content: content,
      is_typing: content.length > 0,
      sender: this.userType === 'admin' ? 'Admin' : 'Applicant',
      sender_type: this.userType,
      timestamp: new Date().toISOString()
    };

    try {
      this.socket.send(JSON.stringify(previewData));
    } catch (error) {
      console.error('Failed to send typing preview:', error);
    }
  }

  // Send reaction
  sendReaction(messageId, emoji, action = 'add') {
    if (!this.isConnected || !this.socket) return;

    const reactionData = {
      type: 'reaction',
      message_id: messageId,
      emoji: emoji,
      action: action,
      sender: this.userType === 'admin' ? 'Admin' : 'Applicant',
      timestamp: new Date().toISOString()
    };

    try {
      this.socket.send(JSON.stringify(reactionData));
    } catch (error) {
      console.error('Failed to send reaction:', error);
    }
  }

  // Send message edit
  sendMessageEdit(messageId, newContent) {
    if (!this.isConnected || !this.socket) {
      console.warn('Cannot edit message: WebSocket not connected');
      return false;
    }

    const editData = {
      type: 'message_edit',
      message_id: messageId,
      new_content: newContent,
      timestamp: new Date().toISOString()
    };

    try {
      this.socket.send(JSON.stringify(editData));
      console.log('📝 Message edit sent:', editData);
      return true;
    } catch (error) {
      console.error('Failed to send message edit:', error);
      return false;
    }
  }

  // Send message delete
  sendMessageDelete(messageId) {
    if (!this.isConnected || !this.socket) {
      console.warn('Cannot delete message: WebSocket not connected');
      return false;
    }

    const deleteData = {
      type: 'message_delete',
      message_id: messageId,
      timestamp: new Date().toISOString()
    };

    try {
      this.socket.send(JSON.stringify(deleteData));
      console.log('🗑️ Message delete sent:', deleteData);
      return true;
    } catch (error) {
      console.error('Failed to send message delete:', error);
      return false;
    }
  }

  // Send read receipt
  sendReadReceipt(messageIds) {
    if (!this.isConnected || !this.socket) {
      console.warn('Cannot send read receipt: WebSocket not connected');
      return false;
    }

    const readData = {
      type: 'message_read',
      message_ids: messageIds,
      timestamp: new Date().toISOString()
    };

    try {
      this.socket.send(JSON.stringify(readData));
      console.log('✓✓ Read receipt sent:', messageIds.length, 'messages');
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

  // Connection management
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket...');
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
      this.isConnected = false;
    }
  }

  getConnectionState() {
    return {
      isConnected: this.isConnected,
      userType: this.userType,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Get WebSocket connection (for video calls)
  getConnection() {
    return this.socket;
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();
console.log('📦 WebSocketService instance created:', webSocketService);

// Export the instance
export default webSocketService;
