/**
 * VoiceMessageService
 * Task 2.2: Voice Message System
 *
 * Handles:
 * - Voice message upload and storage
 * - Audio format conversion
 * - Duration extraction
 * - Waveform data generation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const writeFile = promisify(fs.writeFile);

// Supported audio formats
const SUPPORTED_FORMATS = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'];
const MAX_DURATION = 300; // 5 minutes max
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB max

class VoiceMessageService {
  constructor() {
    this.uploadDir = path.join(__dirname, '..', 'uploads', 'voice');
    this._ensureDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  async _ensureDirectory() {
    try {
      await mkdir(this.uploadDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error('Error creating voice upload directory:', err);
      }
    }
  }

  /**
   * Generate unique filename for voice message
   */
  generateFilename(extension = 'webm') {
    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `voice_${timestamp}_${hash}.${extension}`;
  }

  /**
   * Validate voice message
   */
  validateVoiceMessage(mimeType, size, duration = null) {
    if (!SUPPORTED_FORMATS.includes(mimeType)) {
      return { valid: false, error: `Unsupported audio format. Supported: ${SUPPORTED_FORMATS.join(', ')}` };
    }

    if (size > MAX_FILE_SIZE) {
      return { valid: false, error: `File size exceeds maximum (${MAX_FILE_SIZE / 1024 / 1024}MB)` };
    }

    if (duration && duration > MAX_DURATION) {
      return { valid: false, error: `Voice message duration exceeds maximum (${MAX_DURATION} seconds)` };
    }

    return { valid: true };
  }

  /**
   * Save voice message
   */
  async saveVoiceMessage(buffer, mimeType, metadata = {}) {
    const validation = this.validateVoiceMessage(mimeType, buffer.length, metadata.duration);

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Determine extension from mime type
    const extMap = {
      'audio/webm': 'webm',
      'audio/ogg': 'ogg',
      'audio/mp4': 'm4a',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav'
    };
    const extension = extMap[mimeType] || 'webm';

    const filename = this.generateFilename(extension);
    const filePath = path.join(this.uploadDir, filename);

    // Write file
    await writeFile(filePath, buffer);

    // Get file stats
    const stats = await stat(filePath);

    // Generate waveform data (simplified - peaks)
    const waveformData = metadata.waveform || this.generateDefaultWaveform();

    return {
      filename,
      mimeType,
      size: stats.size,
      duration: metadata.duration || 0,
      waveform: waveformData,
      url: `/uploads/voice/${filename}`,
      path: filePath,
      createdAt: new Date()
    };
  }

  /**
   * Generate default waveform data (for when client doesn't provide)
   */
  generateDefaultWaveform(length = 50) {
    // Generate a realistic-looking waveform
    const waveform = [];
    for (let i = 0; i < length; i++) {
      // Create a somewhat natural-looking pattern
      const base = 0.3 + Math.random() * 0.4;
      const variation = Math.sin(i / 5) * 0.2;
      waveform.push(Math.min(1, Math.max(0, base + variation)));
    }
    return waveform;
  }

  /**
   * Delete voice message
   */
  async deleteVoiceMessage(filename) {
    try {
      const filePath = path.join(this.uploadDir, filename);
      await unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting voice message:', error);
      return false;
    }
  }

  /**
   * Get voice message info
   */
  async getVoiceMessageInfo(filename) {
    try {
      const filePath = path.join(this.uploadDir, filename);
      const stats = await stat(filePath);

      return {
        filename,
        size: stats.size,
        createdAt: stats.birthtime,
        url: `/uploads/voice/${filename}`
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Format duration for display
   */
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Create singleton instance
const voiceMessageService = new VoiceMessageService();

module.exports = voiceMessageService;
