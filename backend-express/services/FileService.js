/**
 * FileService
 * Task 2.1: File Preview & Media Gallery
 *
 * Handles:
 * - File upload with validation
 * - Thumbnail generation for images/videos
 * - File metadata extraction
 * - Media gallery queries
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { promisify } = require('util');

const mkdir = promisify(fs.mkdir);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);

// File type configurations
const FILE_TYPES = {
  image: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'],
    maxSize: 10 * 1024 * 1024, // 10MB
    generateThumbnail: true
  },
  video: {
    extensions: ['.mp4', '.webm', '.mov', '.avi', '.mkv'],
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
    maxSize: 100 * 1024 * 1024, // 100MB
    generateThumbnail: true
  },
  audio: {
    extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.webm'],
    mimeTypes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/webm'],
    maxSize: 50 * 1024 * 1024, // 50MB
    generateThumbnail: false
  },
  document: {
    extensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/rtf'
    ],
    maxSize: 25 * 1024 * 1024, // 25MB
    generateThumbnail: false
  },
  archive: {
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    mimeTypes: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 'application/x-tar', 'application/gzip'],
    maxSize: 50 * 1024 * 1024, // 50MB
    generateThumbnail: false
  }
};

// Thumbnail sizes
const THUMBNAIL_SIZES = {
  small: { width: 100, height: 100 },
  medium: { width: 300, height: 300 },
  large: { width: 800, height: 800 }
};

class FileService {
  constructor() {
    this.uploadDir = path.join(__dirname, '..', 'uploads');
    this.thumbnailDir = path.join(this.uploadDir, 'thumbnails');
    this.tempDir = path.join(this.uploadDir, 'temp');

    this._ensureDirectories();
  }

  /**
   * Ensure upload directories exist
   */
  async _ensureDirectories() {
    const dirs = [
      this.uploadDir,
      this.thumbnailDir,
      this.tempDir,
      path.join(this.uploadDir, 'images'),
      path.join(this.uploadDir, 'videos'),
      path.join(this.uploadDir, 'audio'),
      path.join(this.uploadDir, 'documents'),
      path.join(this.uploadDir, 'archives'),
      path.join(this.uploadDir, 'voice')
    ];

    for (const dir of dirs) {
      try {
        await mkdir(dir, { recursive: true });
      } catch (err) {
        if (err.code !== 'EEXIST') {
          console.error(`Error creating directory ${dir}:`, err);
        }
      }
    }
  }

  /**
   * Determine file type from extension and mime type
   */
  getFileType(filename, mimeType) {
    const ext = path.extname(filename).toLowerCase();

    for (const [type, config] of Object.entries(FILE_TYPES)) {
      if (config.extensions.includes(ext) || config.mimeTypes.includes(mimeType)) {
        return type;
      }
    }

    return 'other';
  }

  /**
   * Validate file
   */
  validateFile(filename, mimeType, size) {
    const fileType = this.getFileType(filename, mimeType);
    const config = FILE_TYPES[fileType];

    if (!config) {
      return { valid: true, type: 'other', maxSize: 10 * 1024 * 1024 };
    }

    if (size > config.maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum allowed (${Math.round(config.maxSize / 1024 / 1024)}MB)`,
        type: fileType
      };
    }

    return { valid: true, type: fileType, maxSize: config.maxSize };
  }

  /**
   * Generate unique filename
   */
  generateFilename(originalName) {
    const ext = path.extname(originalName);
    const hash = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    return `${timestamp}_${hash}${ext}`;
  }

  /**
   * Get upload path for file type
   */
  getUploadPath(fileType) {
    const typeDir = {
      image: 'images',
      video: 'videos',
      audio: 'audio',
      document: 'documents',
      archive: 'archives',
      voice: 'voice'
    };

    return path.join(this.uploadDir, typeDir[fileType] || 'other');
  }

  /**
   * Save uploaded file
   */
  async saveFile(buffer, originalName, mimeType) {
    const validation = this.validateFile(originalName, mimeType, buffer.length);

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const filename = this.generateFilename(originalName);
    const uploadPath = this.getUploadPath(validation.type);
    const filePath = path.join(uploadPath, filename);

    // Ensure directory exists
    await mkdir(uploadPath, { recursive: true });

    // Write file
    await fs.promises.writeFile(filePath, buffer);

    // Get file stats
    const stats = await stat(filePath);

    // Generate thumbnail if applicable
    let thumbnails = null;
    if (FILE_TYPES[validation.type]?.generateThumbnail && validation.type === 'image') {
      thumbnails = await this.generateImageThumbnails(filePath, filename);
    }

    // Extract metadata
    const metadata = await this.extractMetadata(filePath, validation.type, mimeType);

    return {
      filename,
      originalName,
      mimeType,
      size: stats.size,
      type: validation.type,
      path: filePath,
      url: `/uploads/${validation.type === 'image' ? 'images' : validation.type + 's'}/${filename}`,
      thumbnails,
      metadata,
      createdAt: new Date()
    };
  }

  /**
   * Generate image thumbnails
   */
  async generateImageThumbnails(filePath, filename) {
    const thumbnails = {};
    const baseName = path.parse(filename).name;
    const ext = '.webp'; // Use WebP for thumbnails (better compression)

    try {
      for (const [size, dimensions] of Object.entries(THUMBNAIL_SIZES)) {
        const thumbFilename = `${baseName}_${size}${ext}`;
        const thumbPath = path.join(this.thumbnailDir, thumbFilename);

        await sharp(filePath)
          .resize(dimensions.width, dimensions.height, {
            fit: 'cover',
            position: 'center'
          })
          .webp({ quality: 80 })
          .toFile(thumbPath);

        thumbnails[size] = {
          filename: thumbFilename,
          url: `/uploads/thumbnails/${thumbFilename}`,
          width: dimensions.width,
          height: dimensions.height
        };
      }

      return thumbnails;
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      return null;
    }
  }

  /**
   * Extract file metadata
   */
  async extractMetadata(filePath, fileType, mimeType) {
    const metadata = {
      mimeType
    };

    try {
      if (fileType === 'image') {
        const imageInfo = await sharp(filePath).metadata();
        metadata.width = imageInfo.width;
        metadata.height = imageInfo.height;
        metadata.format = imageInfo.format;
        metadata.hasAlpha = imageInfo.hasAlpha;
        metadata.orientation = imageInfo.orientation;
      }
      // Video and audio metadata extraction would require ffprobe
      // Can be added later with fluent-ffmpeg package
    } catch (error) {
      console.error('Error extracting metadata:', error);
    }

    return metadata;
  }

  /**
   * Delete file and its thumbnails
   */
  async deleteFile(filename, fileType) {
    try {
      // Delete main file
      const filePath = path.join(this.getUploadPath(fileType), filename);
      await unlink(filePath);

      // Delete thumbnails if image
      if (fileType === 'image') {
        const baseName = path.parse(filename).name;
        for (const size of Object.keys(THUMBNAIL_SIZES)) {
          const thumbPath = path.join(this.thumbnailDir, `${baseName}_${size}.webp`);
          try {
            await unlink(thumbPath);
          } catch (e) {
            // Thumbnail might not exist
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      return false;
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(filename, fileType) {
    try {
      const filePath = path.join(this.getUploadPath(fileType), filename);
      const stats = await stat(filePath);

      return {
        filename,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get media gallery for a channel/room
   */
  async getMediaGallery(channelId, roomId, options = {}) {
    const { type = 'all', limit = 50, offset = 0 } = options;
    const ChatMessage = require('../models/ChatMessage');
    const { Op } = require('sequelize');

    const where = {
      file_url: { [Op.ne]: null },
      is_deleted: false
    };

    if (channelId) {
      where.channel_id = channelId;
    } else if (roomId) {
      where.room_id = roomId;
    }

    // Filter by type
    if (type !== 'all') {
      const typeConfig = FILE_TYPES[type];
      if (typeConfig) {
        where.file_mime_type = { [Op.in]: typeConfig.mimeTypes };
      }
    }

    const messages = await ChatMessage.findAll({
      where,
      attributes: ['id', 'message_id', 'file_url', 'file_name', 'file_size', 'file_mime_type', 'sender_name', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return messages.map(m => ({
      id: m.id,
      messageId: m.message_id,
      url: m.file_url,
      name: m.file_name,
      size: m.file_size,
      mimeType: m.file_mime_type,
      type: this.getFileType(m.file_name, m.file_mime_type),
      senderName: m.sender_name,
      createdAt: m.created_at
    }));
  }

  /**
   * Get media count by type
   */
  async getMediaCounts(channelId, roomId) {
    const ChatMessage = require('../models/ChatMessage');
    const { Op, fn, col, literal } = require('sequelize');

    const where = {
      file_url: { [Op.ne]: null },
      is_deleted: false
    };

    if (channelId) {
      where.channel_id = channelId;
    } else if (roomId) {
      where.room_id = roomId;
    }

    const counts = {
      images: 0,
      videos: 0,
      audio: 0,
      documents: 0,
      other: 0,
      total: 0
    };

    // Get all files and count by type
    const files = await ChatMessage.findAll({
      where,
      attributes: ['file_name', 'file_mime_type']
    });

    for (const file of files) {
      const type = this.getFileType(file.file_name, file.file_mime_type);
      if (counts[type + 's'] !== undefined) {
        counts[type + 's']++;
      } else if (counts[type] !== undefined) {
        counts[type]++;
      } else {
        counts.other++;
      }
      counts.total++;
    }

    return counts;
  }
}

// Create singleton instance
const fileService = new FileService();

module.exports = fileService;
