// recordingService.js - Video call recording manager
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

class RecordingService {
  constructor() {
    this.recordingsDir = path.join(__dirname, '../recordings');
    this.activeRecordings = new Map(); // callId -> recording process
  }

  /**
   * Initialize recordings directory
   */
  async initialize() {
    try {
      await fs.mkdir(this.recordingsDir, { recursive: true });
      console.log('✅ Recordings directory initialized:', this.recordingsDir);
    } catch (error) {
      console.error('❌ Error initializing recordings directory:', error);
    }
  }

  /**
   * Generate recording filename
   * Format: YYYY-MM-DD_HH-MM-SS_ParticipantName.webm
   */
  generateFileName(participantName, callDate) {
    const date = new Date(callDate || Date.now());
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const sanitizedName = participantName.replace(/[^a-zA-Z0-9]/g, '_');

    return `${dateStr}_${timeStr}_${sanitizedName}.webm`;
  }

  /**
   * Start recording for a call
   * Note: This requires server-side recording setup (not browser recording)
   */
  async startRecording(callId, callData) {
    console.log('📹 Starting recording for call:', callId);

    const fileName = this.generateFileName(
      callData.participantName,
      callData.startedAt
    );
    const filePath = path.join(this.recordingsDir, fileName);

    // Store recording info
    this.activeRecordings.set(callId, {
      fileName,
      filePath,
      startTime: Date.now(),
      callData
    });

    console.log('✅ Recording metadata saved:', fileName);

    return {
      fileName,
      filePath,
      status: 'recording'
    };
  }

  /**
   * Stop recording for a call
   */
  async stopRecording(callId) {
    const recording = this.activeRecordings.get(callId);

    if (!recording) {
      console.log('⚠️  No active recording found for call:', callId);
      return null;
    }

    const duration = Math.floor((Date.now() - recording.startTime) / 1000);

    console.log('📹 Stopping recording for call:', callId);
    console.log('📹 Recording duration:', duration, 'seconds');

    // Get file size (if file exists)
    let fileSize = 0;
    try {
      const stats = await fs.stat(recording.filePath);
      fileSize = stats.size;
    } catch (error) {
      // File might not exist yet, that's ok
      console.log('⚠️  Recording file not found (may be created by client)');
    }

    const result = {
      fileName: recording.fileName,
      filePath: recording.filePath,
      fileSize,
      duration,
      status: 'completed'
    };

    this.activeRecordings.delete(callId);

    return result;
  }

  /**
   * Get recording file
   */
  async getRecording(fileName) {
    const filePath = path.join(this.recordingsDir, fileName);

    try {
      const stats = await fs.stat(filePath);
      return {
        fileName,
        filePath,
        fileSize: stats.size,
        exists: true
      };
    } catch (error) {
      return {
        fileName,
        filePath,
        exists: false
      };
    }
  }

  /**
   * List all recordings
   */
  async listRecordings() {
    try {
      const files = await fs.readdir(this.recordingsDir);

      const recordings = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(this.recordingsDir, file);
          const stats = await fs.stat(filePath);

          return {
            fileName: file,
            filePath,
            fileSize: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          };
        })
      );

      return recordings.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('❌ Error listing recordings:', error);
      return [];
    }
  }

  /**
   * Delete old recordings (older than retention period)
   */
  async cleanupOldRecordings(retentionDays = 90) {
    try {
      const files = await fs.readdir(this.recordingsDir);
      const now = Date.now();
      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.recordingsDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.birthtimeMs;

        if (age > retentionMs) {
          await fs.unlink(filePath);
          deletedCount++;
          console.log('🗑️  Deleted old recording:', file);
        }
      }

      console.log(`🧹 Cleaned up ${deletedCount} old recordings`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Error cleaning up old recordings:', error);
      return 0;
    }
  }

  /**
   * Get recording storage statistics
   */
  async getStorageStats() {
    try {
      const files = await fs.readdir(this.recordingsDir);

      let totalSize = 0;
      let totalDuration = 0;

      for (const file of files) {
        const filePath = path.join(this.recordingsDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      }

      return {
        totalFiles: files.length,
        totalSizeBytes: totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024)),
        recordingsDir: this.recordingsDir
      };
    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      return null;
    }
  }
}

module.exports = new RecordingService();
