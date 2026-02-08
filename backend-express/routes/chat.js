const express = require('express');
const router = express.Router();
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const ApplicantProfile = require('../models/ApplicantProfile');
const { Op } = require('sequelize');
const multer = require('multer');
const r2Storage = require('../services/r2StorageService');

// Site code helper
const getSiteCode = (req) => req.headers['x-site-id'] || null;
const path = require('path');
const fs = require('fs');

// Multer konfigürasyonu - R2 aktifse memoryStorage, değilse diskStorage
const storage = r2Storage.isR2Enabled()
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/chat');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
        cb(null, `${baseName}_${uniqueSuffix}${ext}`);
      }
    });

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: function (req, file, cb) {
    // İzin verilen dosya tipleri
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  }
});

// Get all chat rooms (admin view)
router.get('/rooms/', async (req, res) => {
  try {
    const siteCode = getSiteCode(req);
    const where = {};
    if (siteCode) where.site_code = siteCode;

    const rooms = await ChatRoom.findAll({
      where,
      order: [['last_message_at', 'DESC NULLS LAST'], ['created_at', 'DESC']],
      limit: 100
    });

    res.json(rooms);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
});

// Get applicant rooms only
router.get('/rooms/applicant_rooms/', async (req, res) => {
  try {
    const siteCode = getSiteCode(req);
    const where = { room_type: 'applicant' };
    if (siteCode) where.site_code = siteCode;

    const rooms = await ChatRoom.findAll({
      where,
      order: [['last_message_at', 'DESC NULLS LAST'], ['created_at', 'DESC']],
      limit: 100
    });

    // Get unread count and format room data for each room
    const roomsWithCounts = await Promise.all(
      rooms.map(async (room) => {
        // Generate room_id for WebSocket connections
        const roomId = `applicant_${room.applicant_id}`;

        const unreadCount = await ChatMessage.count({
          where: {
            room_id: room.id,
            sender_type: 'applicant',
            status: { [Op.ne]: 'read' }
          }
        });

        // Get last message content
        let lastMessage = null;
        if (room.last_message_id) {
          const lastMsg = await ChatMessage.findByPk(room.last_message_id);
          if (lastMsg) {
            lastMessage = {
              content: lastMsg.content,
              created_at: lastMsg.created_at,
              sender_type: lastMsg.sender_type
            };
          }
        }

        return {
          ...room.toJSON(),
          room_id: roomId, // Add virtual room_id field
          unread_count: unreadCount,
          last_message: lastMessage
        };
      })
    );

    res.json(roomsWithCounts);
  } catch (error) {
    console.error('Error fetching applicant rooms:', error);
    res.status(500).json({ error: 'Failed to fetch applicant rooms' });
  }
});

// Get or create applicant room
router.post('/rooms/get_or_create_applicant_room/', async (req, res) => {
  try {
    const { applicant_id, applicant_email, applicant_name } = req.body;

    if (!applicant_id) {
      return res.status(400).json({ error: 'applicant_id is required' });
    }

    // Find or create room
    let room = await ChatRoom.findOne({
      where: {
        room_type: 'applicant',
        applicant_id: parseInt(applicant_id)
      }
    });

    if (!room) {
      room = await ChatRoom.create({
        room_type: 'applicant',
        applicant_id: parseInt(applicant_id),
        applicant_email: applicant_email || `applicant_${applicant_id}@temp.com`,
        applicant_name: applicant_name || `Applicant ${applicant_id}`,
        is_active: true
      });
      console.log(`✅ Created new chat room for applicant ${applicant_id}`);
    }

    res.json({ room });
  } catch (error) {
    console.error('Error getting/creating applicant room:', error);
    res.status(500).json({ error: 'Failed to get/create applicant room' });
  }
});

// Get online status for all rooms (MUST come before /:roomId route)
router.get('/rooms/online_status', async (req, res) => {
  try {
    const chatWebSocketService = require('../services/chatWebSocketService');
    const onlineStatus = chatWebSocketService.getRoomOnlineStatus();
    res.json(onlineStatus);
  } catch (error) {
    console.error('Error getting online status:', error);
    res.status(500).json({ error: 'Failed to get online status' });
  }
});

// Get specific chat room
router.get('/rooms/:roomId/', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await ChatRoom.findByPk(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    res.json(room);
  } catch (error) {
    console.error('Error fetching chat room:', error);
    res.status(500).json({ error: 'Failed to fetch chat room' });
  }
});

// Get messages for a specific room
router.get('/rooms/:roomId/messages/', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, page_size = 50 } = req.query;

    // Resolve room ID - could be integer PK or string identifier like "applicant_123"
    let dbRoomId = parseInt(roomId);
    if (isNaN(dbRoomId)) {
      // String identifier - look up the room
      const parts = roomId.split('_');
      if (parts[0] === 'applicant' && parts[1]) {
        const applicantId = parseInt(parts[1]);
        let room = await ChatRoom.findOne({ where: { room_type: 'applicant', applicant_id: applicantId } });

        // Room yoksa otomatik oluştur
        if (!room) {
          console.log('🔧 Chat room not found, creating automatically for applicant:', applicantId);
          try {
            // Applicant bilgilerini al
            const ApplicantProfile = require('../models/ApplicantProfile');
            const profile = await ApplicantProfile.findByPk(applicantId);

            room = await ChatRoom.create({
              room_type: 'applicant',
              applicant_id: applicantId,
              applicant_email: profile?.email || `applicant_${applicantId}@temp.com`,
              applicant_name: profile ? `${profile.first_name} ${profile.last_name}` : `Applicant ${applicantId}`,
              room_name: profile ? `${profile.first_name} ${profile.last_name}` : `Applicant ${applicantId}`,
              site_code: profile?.site_code || null,
              is_active: true
            });
            console.log('✅ Chat room created automatically:', room.id);
          } catch (createError) {
            console.error('❌ Failed to create chat room:', createError.message);
            return res.status(404).json({ error: 'Chat room not found and could not be created' });
          }
        }
        dbRoomId = room.id;
      } else {
        return res.status(400).json({ error: 'Invalid room identifier' });
      }
    }

    const offset = (page - 1) * page_size;

    const { count, rows: messages } = await ChatMessage.findAndCountAll({
      where: { room_id: dbRoomId },
      order: [['created_at', 'ASC']],
      limit: parseInt(page_size),
      offset: offset
    });

    res.json({
      count,
      messages,
      page: parseInt(page),
      page_size: parseInt(page_size),
      total_pages: Math.ceil(count / page_size)
    });
  } catch (error) {
    console.error('Error fetching room messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Get messages (with room filter)
router.get('/messages/', async (req, res) => {
  try {
    const { room, page = 1, page_size = 50 } = req.query;

    const where = {};
    if (room) {
      // Resolve room identifier - could be integer or string like "applicant_123"
      let resolvedRoomId = parseInt(room);
      if (isNaN(resolvedRoomId)) {
        const parts = room.split('_');
        if (parts[0] === 'applicant' && parts[1]) {
          const applicantId = parseInt(parts[1]);
          let foundRoom = await ChatRoom.findOne({ where: { room_type: 'applicant', applicant_id: applicantId } });

          // Room yoksa otomatik oluştur
          if (!foundRoom) {
            try {
              const ApplicantProfile = require('../models/ApplicantProfile');
              const profile = await ApplicantProfile.findByPk(applicantId);
              foundRoom = await ChatRoom.create({
                room_type: 'applicant',
                applicant_id: applicantId,
                applicant_email: profile?.email || `applicant_${applicantId}@temp.com`,
                applicant_name: profile ? `${profile.first_name} ${profile.last_name}` : `Applicant ${applicantId}`,
                room_name: profile ? `${profile.first_name} ${profile.last_name}` : `Applicant ${applicantId}`,
                site_code: profile?.site_code || null,
                is_active: true
              });
              console.log('✅ Chat room auto-created in messages endpoint:', foundRoom.id);
            } catch (e) {
              console.error('❌ Failed to auto-create room:', e.message);
            }
          }
          resolvedRoomId = foundRoom ? foundRoom.id : -1;
        }
      }
      where.room_id = resolvedRoomId;
    }

    const offset = (page - 1) * page_size;

    const { count, rows: messages } = await ChatMessage.findAndCountAll({
      where,
      order: [['created_at', 'ASC']],
      limit: parseInt(page_size),
      offset: offset
    });

    res.json({
      count,
      messages,
      page: parseInt(page),
      page_size: parseInt(page_size),
      total_pages: Math.ceil(count / page_size)
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message (REST API fallback)
router.post('/messages/', async (req, res) => {
  try {
    const {
      message_id,
      room,
      sender_type,
      sender_name,
      message_type = 'text',
      content,
      file_url,
      file_name,
      file_size,
      reply_to
    } = req.body;

    if (!room || !sender_type || !content) {
      return res.status(400).json({ error: 'room, sender_type, and content are required' });
    }

    const message = await ChatMessage.create({
      message_id: message_id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      room_id: room,
      sender_type,
      sender_name: sender_name || sender_type,
      message_type,
      content,
      file_url,
      file_name,
      file_size,
      reply_to_id: reply_to,
      status: 'sent'
    });

    // Update room's last message
    await ChatRoom.update({
      last_message_id: message.id,
      last_message_at: new Date()
    }, {
      where: { id: room }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.post('/messages/mark_read/', async (req, res) => {
  try {
    const { message_ids, room_id } = req.body;

    if (message_ids && message_ids.length > 0) {
      await ChatMessage.update(
        { status: 'read', read_at: new Date() },
        { where: { id: { [Op.in]: message_ids } } }
      );
    } else if (room_id) {
      // Mark all messages in room as read
      await ChatMessage.update(
        { status: 'read', read_at: new Date() },
        { where: { room_id, status: { [Op.ne]: 'read' } } }
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Upload file (single file) - R2 veya lokal
router.post('/upload/file/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const useR2 = r2Storage.isR2Enabled();
    let fileUrl, fileKey;

    if (useR2) {
      // R2'ye yükle
      const key = r2Storage.generateSafeKey(req.file.originalname, 'chat');
      await r2Storage.uploadFile(req.file.buffer, key, req.file.mimetype);
      fileKey = key;
      fileUrl = r2Storage.getPublicUrl(key) || `/chat/api/download/${encodeURIComponent(key)}`;
    } else {
      // Lokal dosya
      fileUrl = `/uploads/chat/${req.file.filename}`;
      fileKey = req.file.filename;
    }

    res.json({
      success: true,
      file: {
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        mime_type: req.file.mimetype,
        filename: fileKey,
        storage: useR2 ? 'r2' : 'local'
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Upload multiple files - R2 veya lokal
router.post('/upload/files/', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const useR2 = r2Storage.isR2Enabled();
    const files = [];

    for (const file of req.files) {
      let fileUrl, fileKey;

      if (useR2) {
        const key = r2Storage.generateSafeKey(file.originalname, 'chat');
        await r2Storage.uploadFile(file.buffer, key, file.mimetype);
        fileKey = key;
        fileUrl = r2Storage.getPublicUrl(key) || `/chat/api/download/${encodeURIComponent(key)}`;
      } else {
        fileUrl = `/uploads/chat/${file.filename}`;
        fileKey = file.filename;
      }

      files.push({
        url: fileUrl,
        name: file.originalname,
        size: file.size,
        mime_type: file.mimetype,
        filename: fileKey,
        storage: useR2 ? 'r2' : 'local'
      });
    }

    res.json({
      success: true,
      files: files
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Download file - R2 veya lokal
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const decodedFilename = decodeURIComponent(filename);

    // R2 key mi kontrol et (chat/ ile başlıyorsa)
    const isR2Key = decodedFilename.startsWith('chat/');

    if (isR2Key && r2Storage.isR2Enabled()) {
      // R2'den signed URL oluştur ve yönlendir
      const signedUrl = await r2Storage.getSignedDownloadUrl(decodedFilename, 3600);
      res.redirect(signedUrl);
    } else if (isR2Key) {
      return res.status(500).json({ error: 'R2 yapılandırması eksik' });
    } else {
      // Lokal dosya
      const filePath = path.join(__dirname, '../uploads/chat', decodedFilename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      res.download(filePath);
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

module.exports = router;
