// videoCallService.js - Rocket.Chat style video call session management
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || '172.22.207.103',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'optima_hr',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345'
});

/**
 * VideoCallService - Manages video call sessions
 * Similar to Rocket.Chat's video conference tracking
 */
class VideoCallService {
  /**
   * Initialize database tables for video calls
   */
  async initializeTables() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS video_calls (
        id SERIAL PRIMARY KEY,
        call_id VARCHAR(255) UNIQUE NOT NULL,
        room_id VARCHAR(255) NOT NULL,
        room_name VARCHAR(255),

        -- Initiator info
        initiator_id VARCHAR(255) NOT NULL,
        initiator_name VARCHAR(255),
        initiator_email VARCHAR(255),

        -- Participant info
        participant_id VARCHAR(255) NOT NULL,
        participant_name VARCHAR(255),
        participant_email VARCHAR(255),

        -- Call details
        jitsi_room_name VARCHAR(255),
        moderator_id VARCHAR(255),

        -- Recording info
        recording_enabled BOOLEAN DEFAULT true,
        recording_file_path VARCHAR(500),
        recording_file_name VARCHAR(255),
        recording_file_size BIGINT,
        recording_duration_seconds INTEGER,
        recording_status VARCHAR(50), -- recording, completed, failed

        -- Status (Rocket.Chat inspired lifecycle)
        status VARCHAR(50) DEFAULT 'calling', -- calling, active, ended, missed, declined, expired

        -- Timestamps
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        duration_seconds INTEGER,

        -- Metadata
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for faster queries
      CREATE INDEX IF NOT EXISTS idx_video_calls_room_id ON video_calls(room_id);
      CREATE INDEX IF NOT EXISTS idx_video_calls_status ON video_calls(status);
      CREATE INDEX IF NOT EXISTS idx_video_calls_started_at ON video_calls(started_at DESC);

      -- Call participants table (for group calls - future)
      CREATE TABLE IF NOT EXISTS video_call_participants (
        id SERIAL PRIMARY KEY,
        call_id VARCHAR(255) REFERENCES video_calls(call_id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        left_at TIMESTAMP,
        duration_seconds INTEGER,

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_call_participants_call_id ON video_call_participants(call_id);
    `;

    try {
      await pool.query(createTableQuery);
      console.log('✅ Video call tables initialized');
    } catch (error) {
      console.error('❌ Error initializing video call tables:', error);
      throw error;
    }
  }

  /**
   * Create a new video call session
   */
  async createCall({
    callId,
    roomId,
    roomName,
    initiatorId,
    initiatorName,
    initiatorEmail,
    participantId,
    participantName,
    participantEmail,
    jitsiRoomName,
    moderatorId
  }) {
    const query = `
      INSERT INTO video_calls (
        call_id, room_id, room_name,
        initiator_id, initiator_name, initiator_email,
        participant_id, participant_name, participant_email,
        jitsi_room_name, moderator_id, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'calling')
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [
        callId,
        roomId,
        roomName,
        initiatorId,
        initiatorName,
        initiatorEmail,
        participantId,
        participantName,
        participantEmail,
        jitsiRoomName,
        moderatorId
      ]);

      console.log('📞 Video call created:', callId);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating video call:', error);
      throw error;
    }
  }

  /**
   * End a video call
   */
  async endCall(callId) {
    const query = `
      UPDATE video_calls
      SET
        status = 'ended',
        ended_at = CURRENT_TIMESTAMP,
        duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER,
        updated_at = CURRENT_TIMESTAMP
      WHERE call_id = $1
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [callId]);

      if (result.rows.length > 0) {
        console.log('📞 Video call ended:', callId, '- Duration:', result.rows[0].duration_seconds, 'seconds');
        return result.rows[0];
      }

      return null;
    } catch (error) {
      console.error('❌ Error ending video call:', error);
      throw error;
    }
  }

  /**
   * Get active call for a room
   */
  async getActiveCallForRoom(roomId) {
    const query = `
      SELECT * FROM video_calls
      WHERE room_id = $1 AND status = 'active'
      ORDER BY started_at DESC
      LIMIT 1
    `;

    try {
      const result = await pool.query(query, [roomId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error getting active call:', error);
      throw error;
    }
  }

  /**
   * Get call history for a room
   */
  async getCallHistoryForRoom(roomId, limit = 20) {
    const query = `
      SELECT * FROM video_calls
      WHERE room_id = $1
      ORDER BY started_at DESC
      LIMIT $2
    `;

    try {
      const result = await pool.query(query, [roomId, limit]);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting call history:', error);
      throw error;
    }
  }

  /**
   * Add participant to call (for tracking)
   */
  async addParticipant(callId, userId, userName) {
    const query = `
      INSERT INTO video_call_participants (call_id, user_id, user_name)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [callId, userId, userName]);
      console.log('👤 Participant joined call:', userName);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error adding participant:', error);
      throw error;
    }
  }

  /**
   * Remove participant from call
   */
  async removeParticipant(callId, userId) {
    const query = `
      UPDATE video_call_participants
      SET
        left_at = CURRENT_TIMESTAMP,
        duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - joined_at))::INTEGER
      WHERE call_id = $1 AND user_id = $2 AND left_at IS NULL
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [callId, userId]);
      if (result.rows.length > 0) {
        console.log('👤 Participant left call:', userId);
      }
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error removing participant:', error);
      throw error;
    }
  }

  /**
   * Get call statistics
   */
  async getCallStatistics(roomId) {
    const query = `
      SELECT
        COUNT(*) as total_calls,
        COUNT(CASE WHEN status = 'ended' THEN 1 END) as completed_calls,
        COUNT(CASE WHEN status = 'missed' THEN 1 END) as missed_calls,
        AVG(duration_seconds) as avg_duration_seconds,
        SUM(duration_seconds) as total_duration_seconds
      FROM video_calls
      WHERE room_id = $1
    `;

    try {
      const result = await pool.query(query, [roomId]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error getting call statistics:', error);
      throw error;
    }
  }

  /**
   * Mark call as accepted and change status to active
   */
  async acceptCall(callId) {
    const query = `
      UPDATE video_calls
      SET
        status = 'active',
        updated_at = CURRENT_TIMESTAMP
      WHERE call_id = $1 AND status = 'calling'
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [callId]);
      if (result.rows.length > 0) {
        console.log('📞 Call accepted and activated:', callId);
        return result.rows[0];
      }
      return null;
    } catch (error) {
      console.error('❌ Error accepting call:', error);
      throw error;
    }
  }

  /**
   * Mark call as declined
   */
  async declineCall(callId) {
    const query = `
      UPDATE video_calls
      SET
        status = 'declined',
        ended_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE call_id = $1 AND status = 'calling'
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [callId]);
      if (result.rows.length > 0) {
        console.log('📞 Call declined:', callId);
        return result.rows[0];
      }
      return null;
    } catch (error) {
      console.error('❌ Error declining call:', error);
      throw error;
    }
  }

  /**
   * Mark call as expired (timeout after 30 seconds)
   */
  async expireCall(callId) {
    const query = `
      UPDATE video_calls
      SET
        status = 'expired',
        ended_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE call_id = $1 AND status = 'calling'
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [callId]);
      if (result.rows.length > 0) {
        console.log('📞 Call expired (timeout):', callId);
        return result.rows[0];
      }
      return null;
    } catch (error) {
      console.error('❌ Error expiring call:', error);
      throw error;
    }
  }

  /**
   * Mark call as missed
   */
  async markCallAsMissed(callId) {
    const query = `
      UPDATE video_calls
      SET
        status = 'missed',
        ended_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE call_id = $1
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [callId]);
      console.log('📞 Call marked as missed:', callId);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error marking call as missed:', error);
      throw error;
    }
  }

  /**
   * Save recording info to database
   */
  async saveRecording(callId, recordingData) {
    const query = `
      UPDATE video_calls
      SET
        recording_file_path = $2,
        recording_file_name = $3,
        recording_file_size = $4,
        recording_duration_seconds = $5,
        recording_status = 'completed',
        updated_at = CURRENT_TIMESTAMP
      WHERE call_id = $1
      RETURNING *
    `;

    try {
      const result = await pool.query(query, [
        callId,
        recordingData.filePath,
        recordingData.fileName,
        recordingData.fileSize,
        recordingData.duration
      ]);

      console.log('📹 Recording saved:', recordingData.fileName);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error saving recording:', error);
      throw error;
    }
  }

  /**
   * Get recordings with filters
   */
  async getRecordings(filters = {}) {
    let query = `
      SELECT
        id, call_id, room_id,
        initiator_name, participant_name,
        recording_file_name, recording_file_path,
        recording_file_size, recording_duration_seconds,
        started_at, ended_at, duration_seconds
      FROM video_calls
      WHERE recording_status = 'completed'
    `;

    const params = [];
    let paramIndex = 1;

    if (filters.participantName) {
      query += ` AND participant_name ILIKE $${paramIndex}`;
      params.push(`%${filters.participantName}%`);
      paramIndex++;
    }

    if (filters.startDate) {
      query += ` AND started_at >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND started_at <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    query += ' ORDER BY started_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
    }

    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting recordings:', error);
      throw error;
    }
  }

  /**
   * Clean up old ended calls (older than 90 days)
   */
  async cleanupOldCalls() {
    const query = `
      DELETE FROM video_calls
      WHERE status = 'ended'
      AND ended_at < CURRENT_TIMESTAMP - INTERVAL '90 days'
      RETURNING call_id
    `;

    try {
      const result = await pool.query(query);
      console.log(`🧹 Cleaned up ${result.rows.length} old video calls`);
      return result.rows.length;
    } catch (error) {
      console.error('❌ Error cleaning up old calls:', error);
      throw error;
    }
  }
}

module.exports = new VideoCallService();
