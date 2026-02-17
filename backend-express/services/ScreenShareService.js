/**
 * ScreenShareService
 * Task 2.3: Screen Share & Co-browsing
 *
 * Manages screen sharing sessions:
 * - WebRTC signaling for screen share
 * - Session tracking and permissions
 * - Viewer management
 */

const { sequelize } = require('../config/database');

class ScreenShareService {
  constructor() {
    this.wsService = null;
    // Active screen share sessions
    // Map<sessionId, { sharer, viewers[], startedAt, channelId/roomId }>
    this.activeSessions = new Map();
  }

  /**
   * Set WebSocket service reference
   */
  setWebSocketService(wsService) {
    this.wsService = wsService;
  }

  /**
   * Initialize database tables
   */
  async initializeTables() {
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS screen_share_sessions (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(100) UNIQUE NOT NULL,

          -- Sharer info
          sharer_type VARCHAR(20) NOT NULL,
          sharer_id INTEGER NOT NULL,
          sharer_name VARCHAR(200),

          -- Target (channel or room)
          channel_id INTEGER,
          room_id INTEGER,

          -- Session details
          status VARCHAR(20) DEFAULT 'active',
          share_type VARCHAR(20) DEFAULT 'screen',
          allow_control BOOLEAN DEFAULT false,

          -- Timestamps
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ended_at TIMESTAMP,
          duration_seconds INTEGER,

          -- Site isolation
          site_code VARCHAR(50),

          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS screen_share_viewers (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(100) NOT NULL,

          -- Viewer info
          viewer_type VARCHAR(20) NOT NULL,
          viewer_id INTEGER NOT NULL,
          viewer_name VARCHAR(200),

          -- Timestamps
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          left_at TIMESTAMP,

          FOREIGN KEY (session_id) REFERENCES screen_share_sessions(session_id) ON DELETE CASCADE
        )
      `);

      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_screen_share_session ON screen_share_sessions(session_id)
      `);

      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_screen_share_channel ON screen_share_sessions(channel_id) WHERE channel_id IS NOT NULL
      `);

      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_screen_share_room ON screen_share_sessions(room_id) WHERE room_id IS NOT NULL
      `);

      console.log('✅ Screen share tables initialized');
    } catch (error) {
      console.error('❌ Error initializing screen share tables:', error);
    }
  }

  /**
   * Start a screen share session
   */
  async startSession({
    sharerType,
    sharerId,
    sharerName,
    channelId = null,
    roomId = null,
    shareType = 'screen',
    allowControl = false,
    siteCode = null
  }) {
    const sessionId = `ss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Check for existing active session in this channel/room
      const existingSession = await this.getActiveSession(channelId, roomId);
      if (existingSession) {
        throw new Error('Screen share already active in this channel/room');
      }

      // Create database record
      await sequelize.query(`
        INSERT INTO screen_share_sessions (
          session_id, sharer_type, sharer_id, sharer_name,
          channel_id, room_id, share_type, allow_control, site_code
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, {
        bind: [sessionId, sharerType, sharerId, sharerName, channelId, roomId, shareType, allowControl, siteCode]
      });

      // Track in memory
      this.activeSessions.set(sessionId, {
        sharer: { type: sharerType, id: sharerId, name: sharerName },
        viewers: [],
        channelId,
        roomId,
        shareType,
        allowControl,
        startedAt: new Date()
      });

      // Broadcast to channel/room
      this._broadcastSessionEvent(channelId, roomId, {
        type: 'screen_share:started',
        data: {
          sessionId,
          sharer: { type: sharerType, id: sharerId, name: sharerName },
          shareType,
          allowControl,
          timestamp: new Date().toISOString()
        }
      });

      return {
        sessionId,
        sharer: { type: sharerType, id: sharerId, name: sharerName },
        shareType,
        allowControl
      };
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  /**
   * End a screen share session
   */
  async endSession(sessionId, endedBy = null) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        // Try to get from database
        const [rows] = await sequelize.query(
          'SELECT * FROM screen_share_sessions WHERE session_id = $1 AND status = $2',
          { bind: [sessionId, 'active'] }
        );
        if (rows.length === 0) {
          throw new Error('Session not found or already ended');
        }
      }

      // Update database
      await sequelize.query(`
        UPDATE screen_share_sessions
        SET
          status = 'ended',
          ended_at = CURRENT_TIMESTAMP,
          duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER,
          updated_at = CURRENT_TIMESTAMP
        WHERE session_id = $1
      `, { bind: [sessionId] });

      // Get session info for broadcast
      const channelId = session?.channelId;
      const roomId = session?.roomId;

      // Remove from memory
      this.activeSessions.delete(sessionId);

      // Broadcast end event
      this._broadcastSessionEvent(channelId, roomId, {
        type: 'screen_share:ended',
        data: {
          sessionId,
          endedBy,
          timestamp: new Date().toISOString()
        }
      });

      return true;
    } catch (error) {
      console.error('Error ending screen share:', error);
      throw error;
    }
  }

  /**
   * Add viewer to session
   */
  async addViewer(sessionId, viewerType, viewerId, viewerName) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Add to database
      await sequelize.query(`
        INSERT INTO screen_share_viewers (session_id, viewer_type, viewer_id, viewer_name)
        VALUES ($1, $2, $3, $4)
      `, { bind: [sessionId, viewerType, viewerId, viewerName] });

      // Add to memory
      session.viewers.push({ type: viewerType, id: viewerId, name: viewerName, joinedAt: new Date() });

      // Broadcast viewer joined
      this._broadcastSessionEvent(session.channelId, session.roomId, {
        type: 'screen_share:viewer_joined',
        data: {
          sessionId,
          viewer: { type: viewerType, id: viewerId, name: viewerName },
          viewerCount: session.viewers.length,
          timestamp: new Date().toISOString()
        }
      });

      return { viewerCount: session.viewers.length };
    } catch (error) {
      console.error('Error adding viewer:', error);
      throw error;
    }
  }

  /**
   * Remove viewer from session
   */
  async removeViewer(sessionId, viewerType, viewerId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) return;

      // Update database
      await sequelize.query(`
        UPDATE screen_share_viewers
        SET left_at = CURRENT_TIMESTAMP
        WHERE session_id = $1 AND viewer_type = $2 AND viewer_id = $3 AND left_at IS NULL
      `, { bind: [sessionId, viewerType, viewerId] });

      // Remove from memory
      session.viewers = session.viewers.filter(
        v => !(v.type === viewerType && v.id === viewerId)
      );

      // Broadcast viewer left
      this._broadcastSessionEvent(session.channelId, session.roomId, {
        type: 'screen_share:viewer_left',
        data: {
          sessionId,
          viewer: { type: viewerType, id: viewerId },
          viewerCount: session.viewers.length,
          timestamp: new Date().toISOString()
        }
      });

      return { viewerCount: session.viewers.length };
    } catch (error) {
      console.error('Error removing viewer:', error);
      throw error;
    }
  }

  /**
   * Get active session for channel/room
   */
  async getActiveSession(channelId, roomId) {
    const where = channelId
      ? 'channel_id = $1'
      : 'room_id = $1';
    const bindValue = channelId || roomId;

    const [rows] = await sequelize.query(`
      SELECT * FROM screen_share_sessions
      WHERE ${where} AND status = 'active'
      ORDER BY started_at DESC
      LIMIT 1
    `, { bind: [bindValue] });

    return rows[0] || null;
  }

  /**
   * Handle WebRTC signaling for screen share
   */
  handleSignaling(sessionId, fromUser, signalData) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    // Relay signal to appropriate participant
    this._broadcastSessionEvent(session.channelId, session.roomId, {
      type: 'screen_share:signal',
      data: {
        sessionId,
        from: fromUser,
        signal: signalData,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Request remote control (co-browsing)
   */
  async requestControl(sessionId, requesterType, requesterId, requesterName) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.allowControl) {
      throw new Error('Remote control not allowed for this session');
    }

    // Notify sharer of control request
    this._broadcastSessionEvent(session.channelId, session.roomId, {
      type: 'screen_share:control_requested',
      data: {
        sessionId,
        requester: { type: requesterType, id: requesterId, name: requesterName },
        timestamp: new Date().toISOString()
      }
    });

    return true;
  }

  /**
   * Grant remote control
   */
  grantControl(sessionId, toUserType, toUserId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    this._broadcastSessionEvent(session.channelId, session.roomId, {
      type: 'screen_share:control_granted',
      data: {
        sessionId,
        grantedTo: { type: toUserType, id: toUserId },
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Revoke remote control
   */
  revokeControl(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    this._broadcastSessionEvent(session.channelId, session.roomId, {
      type: 'screen_share:control_revoked',
      data: {
        sessionId,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Send remote input (mouse/keyboard)
   */
  sendRemoteInput(sessionId, inputData) {
    const session = this.activeSessions.get(sessionId);
    if (!session || !session.allowControl) return;

    this._broadcastSessionEvent(session.channelId, session.roomId, {
      type: 'screen_share:remote_input',
      data: {
        sessionId,
        input: inputData,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Broadcast event to channel/room
   */
  _broadcastSessionEvent(channelId, roomId, event) {
    if (!this.wsService) return;

    if (channelId) {
      this.wsService.broadcastToChannel(channelId, event);
    } else if (roomId) {
      this.wsService.broadcastToRoom(roomId, event);
    }
  }

  /**
   * Get session history
   */
  async getSessionHistory(channelId = null, roomId = null, limit = 20) {
    const where = channelId ? 'channel_id = $1' : 'room_id = $1';
    const bindValue = channelId || roomId;

    const [rows] = await sequelize.query(`
      SELECT * FROM screen_share_sessions
      WHERE ${where}
      ORDER BY started_at DESC
      LIMIT $2
    `, { bind: [bindValue, limit] });

    return rows;
  }

  /**
   * Clean up stale sessions (older than 24 hours and still marked active)
   */
  async cleanupStaleSessions() {
    try {
      const [rows] = await sequelize.query(`
        UPDATE screen_share_sessions
        SET
          status = 'ended',
          ended_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE status = 'active'
        AND started_at < CURRENT_TIMESTAMP - INTERVAL '24 hours'
        RETURNING session_id
      `);

      // Remove from memory
      for (const row of rows) {
        this.activeSessions.delete(row.session_id);
      }

      if (rows.length > 0) {
        console.log(`🧹 Cleaned up ${rows.length} stale screen share sessions`);
      }

      return rows.length;
    } catch (error) {
      console.error('Error cleaning up stale sessions:', error);
      return 0;
    }
  }
}

module.exports = new ScreenShareService();
