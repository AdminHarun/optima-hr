/**
 * TypingIndicatorService
 * Task 2.5: Enhanced Read Receipts & Typing Indicators
 *
 * Provides enhanced typing indicator functionality:
 * - Multi-user typing tracking ("User A, User B are typing...")
 * - Typing state persistence for reconnection
 * - Throttling to reduce WebSocket load
 * - Auto-timeout for stale typing states
 */

const TYPING_TIMEOUT_MS = 5000; // Auto-clear typing after 5 seconds of inactivity
const THROTTLE_MS = 1000; // Minimum interval between typing broadcasts

class TypingIndicatorService {
  constructor() {
    // Map<roomId, Map<`${userType}:${userId}`, { name, avatar, lastUpdate, timeoutId }>>
    this.typingStates = new Map();
    // Map<`${roomId}:${userType}:${userId}`, lastBroadcastTime>
    this.broadcastThrottle = new Map();
    this.wsService = null;
  }

  /**
   * Set WebSocket service reference
   */
  setWebSocketService(wsService) {
    this.wsService = wsService;
  }

  /**
   * User started typing
   */
  startTyping(roomId, userType, userId, userName, userAvatar = null) {
    const userKey = `${userType}:${userId}`;
    const throttleKey = `${roomId}:${userKey}`;

    // Check throttle
    const lastBroadcast = this.broadcastThrottle.get(throttleKey) || 0;
    const now = Date.now();

    if (now - lastBroadcast < THROTTLE_MS) {
      // Just update the state without broadcasting
      this._updateTypingState(roomId, userKey, userName, userAvatar);
      return;
    }

    // Update state
    this._updateTypingState(roomId, userKey, userName, userAvatar);

    // Broadcast
    this._broadcastTypingState(roomId);

    // Update throttle
    this.broadcastThrottle.set(throttleKey, now);
  }

  /**
   * User stopped typing
   */
  stopTyping(roomId, userType, userId) {
    const userKey = `${userType}:${userId}`;

    // Remove from state
    const roomTypers = this.typingStates.get(roomId);
    if (roomTypers) {
      const typer = roomTypers.get(userKey);
      if (typer && typer.timeoutId) {
        clearTimeout(typer.timeoutId);
      }
      roomTypers.delete(userKey);

      if (roomTypers.size === 0) {
        this.typingStates.delete(roomId);
      }
    }

    // Clear throttle
    const throttleKey = `${roomId}:${userKey}`;
    this.broadcastThrottle.delete(throttleKey);

    // Broadcast update
    this._broadcastTypingState(roomId);
  }

  /**
   * Get current typing users in a room
   */
  getTypingUsers(roomId) {
    const roomTypers = this.typingStates.get(roomId);
    if (!roomTypers || roomTypers.size === 0) {
      return [];
    }

    const users = [];
    for (const [userKey, state] of roomTypers.entries()) {
      const [userType, userId] = userKey.split(':');
      users.push({
        userType,
        userId: parseInt(userId),
        userName: state.name,
        userAvatar: state.avatar
      });
    }

    return users;
  }

  /**
   * Format typing indicator text
   * "John is typing..."
   * "John and Jane are typing..."
   * "John, Jane, and 2 others are typing..."
   */
  formatTypingText(users) {
    if (users.length === 0) return null;
    if (users.length === 1) return `${users[0].userName} is typing...`;
    if (users.length === 2) return `${users[0].userName} and ${users[1].userName} are typing...`;
    if (users.length === 3) return `${users[0].userName}, ${users[1].userName}, and ${users[2].userName} are typing...`;

    const othersCount = users.length - 2;
    return `${users[0].userName}, ${users[1].userName}, and ${othersCount} others are typing...`;
  }

  /**
   * Handle user disconnect - clear their typing state
   */
  handleUserDisconnect(userType, userId) {
    const userKey = `${userType}:${userId}`;

    // Check all rooms
    for (const [roomId, roomTypers] of this.typingStates.entries()) {
      if (roomTypers.has(userKey)) {
        const typer = roomTypers.get(userKey);
        if (typer.timeoutId) {
          clearTimeout(typer.timeoutId);
        }
        roomTypers.delete(userKey);

        if (roomTypers.size === 0) {
          this.typingStates.delete(roomId);
        } else {
          this._broadcastTypingState(roomId);
        }
      }
    }
  }

  /**
   * Update typing state for a user
   */
  _updateTypingState(roomId, userKey, userName, userAvatar) {
    if (!this.typingStates.has(roomId)) {
      this.typingStates.set(roomId, new Map());
    }

    const roomTypers = this.typingStates.get(roomId);

    // Clear existing timeout
    const existing = roomTypers.get(userKey);
    if (existing && existing.timeoutId) {
      clearTimeout(existing.timeoutId);
    }

    // Set new state with auto-timeout
    const timeoutId = setTimeout(() => {
      this._autoStopTyping(roomId, userKey);
    }, TYPING_TIMEOUT_MS);

    roomTypers.set(userKey, {
      name: userName,
      avatar: userAvatar,
      lastUpdate: Date.now(),
      timeoutId
    });
  }

  /**
   * Auto-stop typing after timeout
   */
  _autoStopTyping(roomId, userKey) {
    const roomTypers = this.typingStates.get(roomId);
    if (roomTypers) {
      roomTypers.delete(userKey);

      if (roomTypers.size === 0) {
        this.typingStates.delete(roomId);
      }

      // Broadcast update
      this._broadcastTypingState(roomId);
    }
  }

  /**
   * Broadcast current typing state to room
   */
  _broadcastTypingState(roomId) {
    if (!this.wsService) return;

    const users = this.getTypingUsers(roomId);
    const text = this.formatTypingText(users);

    const event = {
      type: 'typing:state',
      data: {
        roomId,
        users,
        text,
        timestamp: new Date().toISOString()
      }
    };

    // Determine if this is a channel or room
    if (roomId.startsWith('channel_')) {
      const channelId = parseInt(roomId.replace('channel_', ''));
      this.wsService.broadcastToChannel(channelId, event);
    } else {
      this.wsService.broadcastToRoom(roomId, event);
    }
  }

  /**
   * Get typing state for reconnected client
   */
  getTypingStateForRoom(roomId) {
    const users = this.getTypingUsers(roomId);
    return {
      users,
      text: this.formatTypingText(users)
    };
  }

  /**
   * Handle typing preview (Comm100 style real-time typing)
   */
  handleTypingPreview(roomId, userType, userId, userName, content) {
    if (!this.wsService) return;

    const event = {
      type: 'typing:preview',
      data: {
        roomId,
        user: {
          type: userType,
          id: userId,
          name: userName
        },
        content,
        timestamp: new Date().toISOString()
      }
    };

    if (roomId.startsWith('channel_')) {
      const channelId = parseInt(roomId.replace('channel_', ''));
      this.wsService.broadcastToChannel(channelId, event);
    } else {
      this.wsService.broadcastToRoom(roomId, event);
    }
  }
}

module.exports = new TypingIndicatorService();
