const express = require('express');
const router = express.Router();
const ChatRoom = require('../models/ChatRoom');
const ChatMessage = require('../models/ChatMessage');
const ChatRoomMember = require('../models/ChatRoomMember');
const ApplicantProfile = require('../models/ApplicantProfile');
const { Op } = require('sequelize');
const SlashCommandService = require('../services/SlashCommandService');
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

    // Tüm applicant_id'leri topla
    const applicantIds = rooms
      .map(room => room.applicant_id)
      .filter(id => id != null);

    // ApplicantProfile'ları tek sorguda getir
    const profiles = applicantIds.length > 0
      ? await ApplicantProfile.findAll({
        where: { id: { [Op.in]: applicantIds } },
        attributes: [
          'id', 'first_name', 'last_name', 'email', 'phone',
          'profile_created_ip', 'profile_created_location',
          'device_info', 'is_vpn', 'vpn_score',
          'profile_created_at', 'invitation_link_id', 'site_code'
        ]
      })
      : [];

    // Profile'ları ID'ye göre map'le
    const profileMap = new Map(profiles.map(p => [p.id, p.toJSON()]));

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

        // Applicant profil bilgisini ekle
        const applicantProfile = room.applicant_id ? profileMap.get(room.applicant_id) : null;

        return {
          ...room.toJSON(),
          room_id: roomId, // Add virtual room_id field
          unread_count: unreadCount,
          last_message: lastMessage,
          // Profil bilgileri
          applicant_profile: applicantProfile,
          // Geriye uyumluluk için düz alanlar
          phone: applicantProfile?.phone || null,
          profile_created_at: applicantProfile?.profile_created_at || room.created_at,
          profile_created_ip: applicantProfile?.profile_created_ip || null,
          profile_created_location: applicantProfile?.profile_created_location || null,
          device_info: applicantProfile?.device_info || null,
          is_vpn: applicantProfile?.is_vpn || false,
          vpn_score: applicantProfile?.vpn_score || 0
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
    const { applicant_id, applicant_email, applicant_name, site_code } = req.body;
    const headerSiteCode = getSiteCode(req);

    if (!applicant_id) {
      return res.status(400).json({ error: 'applicant_id is required' });
    }

    const parsedApplicantId = parseInt(applicant_id);

    // Find or create room
    let room = await ChatRoom.findOne({
      where: {
        room_type: 'applicant',
        applicant_id: parsedApplicantId
      }
    });

    if (!room) {
      // Applicant profil bilgilerini al
      let profileInfo = { email: applicant_email, name: applicant_name, site_code: site_code || headerSiteCode };

      if (!applicant_email || !applicant_name) {
        const profile = await ApplicantProfile.findByPk(parsedApplicantId);
        if (profile) {
          profileInfo.email = applicant_email || profile.email;
          profileInfo.name = applicant_name || `${profile.first_name} ${profile.last_name}`.trim();
          profileInfo.site_code = site_code || headerSiteCode || profile.site_code;
        }
      }

      const finalName = profileInfo.name || `Başvuran ${parsedApplicantId}`;

      room = await ChatRoom.create({
        site_code: profileInfo.site_code || null,
        room_type: 'applicant',
        channel_type: 'EXTERNAL',
        applicant_id: parsedApplicantId,
        applicant_email: profileInfo.email || `applicant_${parsedApplicantId}@temp.com`,
        applicant_name: finalName,
        room_name: finalName,
        is_active: true
      });
      console.log(`✅ Created new chat room for applicant ${parsedApplicantId} (${room.applicant_name})`);
    } else {
      // Mevcut odayı güncelle (eksik alanlar varsa)
      const updates = {};
      if (!room.channel_type) updates.channel_type = 'EXTERNAL';
      if (!room.site_code && (site_code || headerSiteCode)) updates.site_code = site_code || headerSiteCode;
      if (applicant_name && room.applicant_name !== applicant_name) {
        updates.applicant_name = applicant_name;
        updates.room_name = applicant_name;
      }
      if (applicant_email && room.applicant_email !== applicant_email) {
        updates.applicant_email = applicant_email;
      }

      if (Object.keys(updates).length > 0) {
        await room.update(updates);
        console.log(`✅ Updated chat room for applicant ${parsedApplicantId}:`, updates);
      }
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
    const chatWebSocketService = require('../services/ChatWebSocketService');
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

    console.log(`📨 GET /rooms/${roomId}/messages/ - Fetching messages`);

    // Resolve room ID - could be integer PK or string identifier like "applicant_123" or "group_4"
    let dbRoomId = parseInt(roomId);
    if (isNaN(dbRoomId)) {
      // String identifier - look up the room
      const parts = roomId.split('_');

      if (parts[0] === 'group' && parts[1]) {
        // Group room - just use the ID directly
        dbRoomId = parseInt(parts[1]);
        const room = await ChatRoom.findOne({
          where: { id: dbRoomId, room_type: 'group', is_active: true }
        });
        if (!room) {
          console.log(`❌ Group room not found: ${roomId}`);
          return res.status(404).json({ error: 'Group not found' });
        }
      } else if (parts[0] === 'applicant' && parts[1]) {
        const applicantId = parseInt(parts[1]);

        if (isNaN(applicantId)) {
          console.log(`❌ Invalid applicant ID in room identifier: ${roomId}`);
          return res.status(400).json({ error: 'Invalid applicant ID' });
        }

        let room = await ChatRoom.findOne({ where: { room_type: 'applicant', applicant_id: applicantId } });

        // Room yoksa otomatik oluştur
        if (!room) {
          console.log(`🔧 Chat room not found for applicant ${applicantId}, creating automatically...`);
          try {
            // Applicant bilgilerini al
            const ApplicantProfile = require('../models/ApplicantProfile');
            const profile = await ApplicantProfile.findByPk(applicantId);

            if (!profile) {
              console.log(`⚠️ ApplicantProfile not found for ID ${applicantId}, creating room with default values`);
            }

            room = await ChatRoom.create({
              room_type: 'applicant',
              channel_type: 'EXTERNAL',
              applicant_id: applicantId,
              applicant_email: profile?.email || `applicant_${applicantId}@temp.com`,
              applicant_name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : `Başvuran ${applicantId}`,
              room_name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : `Başvuran ${applicantId}`,
              site_code: profile?.site_code || null,
              is_active: true
            });
            console.log(`✅ Chat room created automatically: ID=${room.id} for applicant=${applicantId}`);
          } catch (createError) {
            console.error(`❌ Failed to create chat room for applicant ${applicantId}:`, createError.message);
            return res.status(500).json({
              error: 'Chat room could not be created',
              details: process.env.NODE_ENV === 'development' ? createError.message : undefined
            });
          }
        } else {
          console.log(`✅ Found existing chat room: ID=${room.id} for applicant=${applicantId}`);
        }
        dbRoomId = room.id;
      } else {
        console.log(`❌ Invalid room identifier format: ${roomId}`);
        return res.status(400).json({ error: 'Invalid room identifier format. Expected: applicant_ID or group_ID' });
      }
    }

    const offset = (page - 1) * page_size;

    // Cursor-based pagination support (infinite scroll)
    const { before, after } = req.query;
    const where = { room_id: dbRoomId };

    if (before) {
      where.id = { [Op.lt]: parseInt(before) };
    } else if (after) {
      where.id = { [Op.gt]: parseInt(after) };
    }

    const { count, rows: messages } = await ChatMessage.findAndCountAll({
      where,
      order: [['created_at', before ? 'DESC' : 'ASC']],
      limit: parseInt(page_size),
      offset: (!before && !after) ? offset : 0
    });

    // Reverse if fetched in DESC order (before cursor)
    if (before) messages.reverse();

    res.json({
      count,
      messages,
      page: parseInt(page),
      page_size: parseInt(page_size),
      total_pages: Math.ceil(count / page_size),
      has_more: messages.length === parseInt(page_size),
      next_cursor: messages.length > 0 ? messages[messages.length - 1].id : null,
      prev_cursor: messages.length > 0 ? messages[0].id : null
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

    // SLASH COMMAND CHECK (REST API Fallback)
    if (content.startsWith('/')) {
      const context = {
        userId: sender_id, // sender_id from body
        userName: sender_name,
        userType: sender_type,
        roomId: room,
        channelId: room,
        siteCode: null
      };

      const result = await SlashCommandService.execute(content, context);

      if (result) {
        // Slash komutu çalıştı, normal mesaj olarak kaydetme
        return res.json({
          success: true,
          type: 'slash_command_result',
          data: result
        });
      }
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

// Search messages
router.get('/messages/search/', async (req, res) => {
  try {
    const { q, room_id, page = 1, page_size = 20 } = req.query;
    const siteCode = getSiteCode(req);

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchTerm = q.trim().toLowerCase();
    const offset = (parseInt(page) - 1) * parseInt(page_size);

    // Build where clause
    const where = {
      content: {
        [Op.iLike]: `%${searchTerm}%`
      }
    };

    // If room_id provided, resolve it
    if (room_id) {
      let resolvedRoomId = parseInt(room_id);
      if (isNaN(resolvedRoomId)) {
        const parts = room_id.split('_');
        if (parts[0] === 'applicant' && parts[1]) {
          const applicantId = parseInt(parts[1]);
          const room = await ChatRoom.findOne({
            where: { room_type: 'applicant', applicant_id: applicantId }
          });
          if (room) {
            resolvedRoomId = room.id;
          }
        }
      }
      if (!isNaN(resolvedRoomId)) {
        where.room_id = resolvedRoomId;
      }
    }

    // Get messages with room info
    const { count, rows: messages } = await ChatMessage.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(page_size),
      offset: offset,
      include: [{
        model: ChatRoom,
        as: 'room',
        attributes: ['id', 'room_name', 'applicant_name', 'applicant_id', 'room_type']
      }]
    });

    // Format results with highlighted content
    const results = messages.map(msg => {
      const plainMsg = msg.toJSON();
      // Create highlighted snippet
      const contentLower = plainMsg.content.toLowerCase();
      const matchIndex = contentLower.indexOf(searchTerm);
      let snippet = plainMsg.content;

      if (matchIndex !== -1) {
        const start = Math.max(0, matchIndex - 30);
        const end = Math.min(plainMsg.content.length, matchIndex + searchTerm.length + 30);
        snippet = (start > 0 ? '...' : '') +
          plainMsg.content.substring(start, end) +
          (end < plainMsg.content.length ? '...' : '');
      }

      return {
        ...plainMsg,
        snippet,
        room_info: plainMsg.room ? {
          id: plainMsg.room.id,
          name: plainMsg.room.room_name || plainMsg.room.applicant_name,
          applicant_id: plainMsg.room.applicant_id,
          room_type: plainMsg.room.room_type
        } : null
      };
    });

    res.json({
      count,
      results,
      query: q,
      page: parseInt(page),
      page_size: parseInt(page_size),
      total_pages: Math.ceil(count / parseInt(page_size))
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ error: 'Failed to search messages' });
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
      // room_id "applicant_4" gibi string olabilir, integer'a cevir
      let roomIdInt = room_id;
      if (typeof room_id === 'string' && room_id.startsWith('applicant_')) {
        const applicantId = parseInt(room_id.split('_')[1]);
        const room = await ChatRoom.findOne({
          where: { room_type: 'applicant', applicant_id: applicantId }
        });
        if (room) {
          roomIdInt = room.id;
        } else {
          return res.json({ success: true }); // Room yok, sessizce gec
        }
      }

      // Mark all messages in room as read
      await ChatMessage.update(
        { status: 'read', read_at: new Date() },
        { where: { room_id: roomIdInt, status: { [Op.ne]: 'read' } } }
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

// ==================== GROUP CHAT ENDPOINTS ====================

// Create a group chat
router.post('/groups/', async (req, res) => {
  try {
    const { group_name, description, creator_id, creator_name, creator_type = 'admin', members = [] } = req.body;
    const siteCode = getSiteCode(req);

    if (!group_name || !creator_name) {
      return res.status(400).json({ error: 'group_name and creator_name are required' });
    }

    // Create the group room
    const room = await ChatRoom.create({
      room_type: 'group',
      room_name: group_name,
      description: description || null,
      site_code: siteCode,
      is_active: true
    });

    // Add creator as owner
    await ChatRoomMember.create({
      room_id: room.id,
      member_type: creator_type,
      member_id: creator_id || null,
      member_name: creator_name,
      role: 'owner',
      is_active: true,
      joined_at: new Date()
    });

    // Add other members
    for (const member of members) {
      await ChatRoomMember.create({
        room_id: room.id,
        member_type: member.type || 'admin',
        member_id: member.id || null,
        member_name: member.name,
        member_email: member.email || null,
        role: member.role || 'member',
        is_active: true,
        joined_at: new Date()
      });
    }

    // Get all members for response
    const allMembers = await ChatRoomMember.findAll({
      where: { room_id: room.id, is_active: true }
    });

    res.status(201).json({
      room: {
        ...room.toJSON(),
        room_id: `group_${room.id}`,
        members: allMembers
      }
    });
  } catch (error) {
    console.error('Error creating group chat:', error);
    res.status(500).json({ error: 'Failed to create group chat' });
  }
});

// Get all group chats (admin can see all, applicant sees only their groups)
router.get('/groups/', async (req, res) => {
  try {
    const { member_type, member_id } = req.query;
    const siteCode = getSiteCode(req);

    console.log('📥 GET /groups/ - member_type:', member_type, 'member_id:', member_id);

    let groups;

    if (member_type && member_id) {
      // Get groups where user is a member
      console.log('🔍 Searching ChatRoomMember for:', { member_type, member_id: parseInt(member_id) });

      const memberships = await ChatRoomMember.findAll({
        where: {
          member_type,
          member_id: parseInt(member_id),
          is_active: true
        },
        include: [{
          model: ChatRoom,
          as: 'room',
          where: { room_type: 'group', is_active: true }
        }]
      });

      console.log('📋 Found memberships:', memberships.length);

      groups = memberships.map(m => ({
        ...m.room.toJSON(),
        room_id: `group_${m.room.id}`,
        my_role: m.role
      }));
    } else {
      // Admin: get all groups
      const where = { room_type: 'group', is_active: true };
      if (siteCode) where.site_code = siteCode;

      const rooms = await ChatRoom.findAll({
        where,
        order: [['last_message_at', 'DESC NULLS LAST'], ['created_at', 'DESC']],
        include: [{
          model: ChatRoomMember,
          as: 'members',
          where: { is_active: true },
          required: false
        }]
      });

      groups = rooms.map(room => ({
        ...room.toJSON(),
        room_id: `group_${room.id}`,
        member_count: room.members ? room.members.length : 0
      }));
    }

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// Get group details with members
router.get('/groups/:groupId/', async (req, res) => {
  try {
    const { groupId } = req.params;

    // Parse group ID
    let dbRoomId = parseInt(groupId);
    if (isNaN(dbRoomId) && groupId.startsWith('group_')) {
      dbRoomId = parseInt(groupId.replace('group_', ''));
    }

    const room = await ChatRoom.findOne({
      where: { id: dbRoomId, room_type: 'group' },
      include: [{
        model: ChatRoomMember,
        as: 'members',
        where: { is_active: true },
        required: false
      }]
    });

    if (!room) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({
      ...room.toJSON(),
      room_id: `group_${room.id}`
    });
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// Update group (name, description)
router.patch('/groups/:groupId/', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { group_name, description } = req.body;

    let dbRoomId = parseInt(groupId);
    if (isNaN(dbRoomId) && groupId.startsWith('group_')) {
      dbRoomId = parseInt(groupId.replace('group_', ''));
    }

    const room = await ChatRoom.findOne({
      where: { id: dbRoomId, room_type: 'group' }
    });

    if (!room) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group_name) room.room_name = group_name;
    if (description !== undefined) room.description = description;
    await room.save();

    res.json({
      ...room.toJSON(),
      room_id: `group_${room.id}`
    });
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Failed to update group' });
  }
});

// Get group members
router.get('/groups/:groupId/members/', async (req, res) => {
  try {
    const { groupId } = req.params;

    let dbRoomId = parseInt(groupId);
    if (isNaN(dbRoomId) && groupId.startsWith('group_')) {
      dbRoomId = parseInt(groupId.replace('group_', ''));
    }

    const members = await ChatRoomMember.findAll({
      where: { room_id: dbRoomId, is_active: true },
      order: [
        ['role', 'ASC'], // owner first, then admin, then member
        ['joined_at', 'ASC']
      ]
    });

    res.json(members);
  } catch (error) {
    console.error('Error fetching group members:', error);
    res.status(500).json({ error: 'Failed to fetch group members' });
  }
});

// Add member to group
router.post('/groups/:groupId/members/', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { member_type, member_id, member_name, member_email, role = 'member' } = req.body;

    let dbRoomId = parseInt(groupId);
    if (isNaN(dbRoomId) && groupId.startsWith('group_')) {
      dbRoomId = parseInt(groupId.replace('group_', ''));
    }

    // Check if room exists
    const room = await ChatRoom.findOne({
      where: { id: dbRoomId, room_type: 'group' }
    });

    if (!room) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if already a member
    const existingMember = await ChatRoomMember.findOne({
      where: {
        room_id: dbRoomId,
        member_type,
        member_id: member_id || null
      }
    });

    if (existingMember) {
      if (existingMember.is_active) {
        return res.status(400).json({ error: 'Member already exists in this group' });
      }
      // Re-activate member
      existingMember.is_active = true;
      existingMember.left_at = null;
      existingMember.joined_at = new Date();
      existingMember.role = role;
      await existingMember.save();
      return res.json(existingMember);
    }

    // Add new member
    const newMember = await ChatRoomMember.create({
      room_id: dbRoomId,
      member_type,
      member_id: member_id || null,
      member_name,
      member_email: member_email || null,
      role,
      is_active: true,
      joined_at: new Date()
    });

    res.status(201).json(newMember);
  } catch (error) {
    console.error('Error adding group member:', error);
    res.status(500).json({ error: 'Failed to add group member' });
  }
});

// Remove member from group
router.delete('/groups/:groupId/members/:memberId/', async (req, res) => {
  try {
    const { groupId, memberId } = req.params;

    let dbRoomId = parseInt(groupId);
    if (isNaN(dbRoomId) && groupId.startsWith('group_')) {
      dbRoomId = parseInt(groupId.replace('group_', ''));
    }

    const member = await ChatRoomMember.findOne({
      where: {
        id: parseInt(memberId),
        room_id: dbRoomId
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    // Soft delete - mark as inactive
    member.is_active = false;
    member.left_at = new Date();
    await member.save();

    res.json({ success: true, message: 'Member removed from group' });
  } catch (error) {
    console.error('Error removing group member:', error);
    res.status(500).json({ error: 'Failed to remove group member' });
  }
});

// Update member role
router.patch('/groups/:groupId/members/:memberId/', async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { role } = req.body;

    let dbRoomId = parseInt(groupId);
    if (isNaN(dbRoomId) && groupId.startsWith('group_')) {
      dbRoomId = parseInt(groupId.replace('group_', ''));
    }

    if (!['owner', 'admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be owner, admin, or member' });
    }

    const member = await ChatRoomMember.findOne({
      where: {
        id: parseInt(memberId),
        room_id: dbRoomId,
        is_active: true
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    member.role = role;
    await member.save();

    res.json(member);
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

// Leave group (self-remove)
router.post('/groups/:groupId/leave/', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { member_type, member_id } = req.body;

    let dbRoomId = parseInt(groupId);
    if (isNaN(dbRoomId) && groupId.startsWith('group_')) {
      dbRoomId = parseInt(groupId.replace('group_', ''));
    }

    const member = await ChatRoomMember.findOne({
      where: {
        room_id: dbRoomId,
        member_type,
        member_id: member_id || null,
        is_active: true
      }
    });

    if (!member) {
      return res.status(404).json({ error: 'You are not a member of this group' });
    }

    // Check if owner is trying to leave
    if (member.role === 'owner') {
      // Check if there are other members
      const otherMembers = await ChatRoomMember.count({
        where: {
          room_id: dbRoomId,
          is_active: true,
          id: { [Op.ne]: member.id }
        }
      });

      if (otherMembers > 0) {
        return res.status(400).json({
          error: 'Owner cannot leave the group. Transfer ownership first or delete the group.'
        });
      }
    }

    member.is_active = false;
    member.left_at = new Date();
    await member.save();

    res.json({ success: true, message: 'You have left the group' });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ error: 'Failed to leave group' });
  }
});

// Delete group (owner only)
router.delete('/groups/:groupId/', async (req, res) => {
  try {
    const { groupId } = req.params;

    let dbRoomId = parseInt(groupId);
    if (isNaN(dbRoomId) && groupId.startsWith('group_')) {
      dbRoomId = parseInt(groupId.replace('group_', ''));
    }

    const room = await ChatRoom.findOne({
      where: { id: dbRoomId, room_type: 'group' }
    });

    if (!room) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Soft delete the room
    room.is_active = false;
    await room.save();

    // Deactivate all members
    await ChatRoomMember.update(
      { is_active: false, left_at: new Date() },
      { where: { room_id: dbRoomId } }
    );

    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

module.exports = router;
