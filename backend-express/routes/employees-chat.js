/**
 * Employee Chat Routes - Calisan Rehberi ve DM API'lari
 *
 * Endpoint'ler:
 * GET  /chat/api/employees/directory     - Calisan listesi (departman filtreli)
 * GET  /chat/api/employees/online        - Online calisanlar
 * GET  /chat/api/employees/:id/presence  - Tek calisan durumu
 * POST /chat/api/employees/dm/create     - DM odasi olustur/getir
 * GET  /chat/api/employees/departments   - Departman listesi
 */

const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const Employee = require('../models/Employee');
const EmployeePresence = require('../models/EmployeePresence');
const ChatRoom = require('../models/ChatRoom');
const ChatRoomMember = require('../models/ChatRoomMember');
const {
  authenticateToken,
  employeeOnly,
  validateChannelAccess
} = require('../middleware/chatAuth');
const redisService = require('../services/RedisService');

/**
 * GET /directory - Calisan rehberi
 * Query params: department, search, page, limit, onlineOnly
 */
router.get('/directory', authenticateToken, employeeOnly, async (req, res) => {
  try {
    const { department, search, page = 1, limit = 50, onlineOnly } = req.query;
    const { user } = req;

    const where = {
      is_active: true
    };

    // Site izolasyonu
    if (user.siteCode) {
      where.site_code = user.siteCode;
    }

    // Departman filtresi
    if (department) {
      where.department = department;
    }

    // Arama
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { job_title: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let employees = await Employee.findAndCountAll({
      where,
      attributes: [
        'id', 'employee_id', 'first_name', 'last_name', 'email',
        'phone', 'department', 'position', 'job_title', 'profile_picture'
      ],
      include: [{
        model: EmployeePresence,
        as: 'presence',
        attributes: ['status', 'last_seen_at', 'custom_status', 'status_emoji'],
        required: false
      }],
      order: [['first_name', 'ASC'], ['last_name', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    // Sadece online filtresi
    if (onlineOnly === 'true') {
      const onlineIds = await redisService.getOnlineUsers('employee');
      employees.rows = employees.rows.filter(emp =>
        onlineIds.includes(emp.id) ||
        (emp.presence && ['online', 'away', 'busy'].includes(emp.presence.status))
      );
      employees.count = employees.rows.length;
    }

    // Kendini listeden cikar
    employees.rows = employees.rows.filter(emp => emp.id !== user.employeeId);

    res.json({
      success: true,
      data: {
        employees: employees.rows.map(emp => ({
          id: emp.id,
          employeeId: emp.employee_id,
          firstName: emp.first_name,
          lastName: emp.last_name,
          fullName: `${emp.first_name} ${emp.last_name}`,
          email: emp.email,
          phone: emp.phone,
          department: emp.department,
          position: emp.position,
          jobTitle: emp.job_title,
          profilePicture: emp.profile_picture,
          presence: emp.presence ? {
            status: emp.presence.status,
            lastSeenAt: emp.presence.last_seen_at,
            customStatus: emp.presence.custom_status,
            statusEmoji: emp.presence.status_emoji
          } : { status: 'offline' }
        })),
        pagination: {
          total: employees.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(employees.count / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('[employees-chat] Directory hatasi:', error);
    res.status(500).json({
      success: false,
      error: 'Calisan listesi alinamadi'
    });
  }
});

/**
 * GET /online - Online calisanlar
 */
router.get('/online', authenticateToken, employeeOnly, async (req, res) => {
  try {
    const { user } = req;

    // Redis'ten online kullanicilari al
    const onlineIds = await redisService.getOnlineUsers('employee');

    if (onlineIds.length === 0) {
      return res.json({
        success: true,
        data: { employees: [], count: 0 }
      });
    }

    const where = {
      id: onlineIds,
      is_active: true
    };

    if (user.siteCode) {
      where.site_code = user.siteCode;
    }

    const employees = await Employee.findAll({
      where,
      attributes: [
        'id', 'employee_id', 'first_name', 'last_name',
        'department', 'position', 'profile_picture'
      ],
      include: [{
        model: EmployeePresence,
        as: 'presence',
        attributes: ['status', 'current_device', 'custom_status']
      }]
    });

    res.json({
      success: true,
      data: {
        employees: employees
          .filter(emp => emp.id !== user.employeeId)
          .map(emp => ({
            id: emp.id,
            employeeId: emp.employee_id,
            fullName: `${emp.first_name} ${emp.last_name}`,
            department: emp.department,
            position: emp.position,
            profilePicture: emp.profile_picture,
            presence: emp.presence ? {
              status: emp.presence.status,
              device: emp.presence.current_device,
              customStatus: emp.presence.custom_status
            } : { status: 'online' }
          })),
        count: employees.length
      }
    });
  } catch (error) {
    console.error('[employees-chat] Online liste hatasi:', error);
    res.status(500).json({
      success: false,
      error: 'Online calisanlar alinamadi'
    });
  }
});

/**
 * GET /:id/presence - Tek calisan durumu
 */
router.get('/:id/presence', authenticateToken, employeeOnly, async (req, res) => {
  try {
    const { id } = req.params;

    // Once Redis'e bak
    const redisPresence = await redisService.getUserPresence('employee', id);

    if (redisPresence.status !== 'offline') {
      return res.json({
        success: true,
        data: {
          employeeId: parseInt(id),
          ...redisPresence
        }
      });
    }

    // Redis'te yoksa DB'ye bak
    const presence = await EmployeePresence.findOne({
      where: { employee_id: id },
      include: [{
        model: Employee,
        as: 'employee',
        attributes: ['first_name', 'last_name']
      }]
    });

    res.json({
      success: true,
      data: presence ? {
        employeeId: parseInt(id),
        status: presence.status,
        lastSeenAt: presence.last_seen_at,
        customStatus: presence.custom_status,
        statusEmoji: presence.status_emoji
      } : {
        employeeId: parseInt(id),
        status: 'offline'
      }
    });
  } catch (error) {
    console.error('[employees-chat] Presence hatasi:', error);
    res.status(500).json({
      success: false,
      error: 'Durum bilgisi alinamadi'
    });
  }
});

/**
 * POST /presence/bulk - Toplu presence sorgulama
 */
router.post('/presence/bulk', authenticateToken, employeeOnly, async (req, res) => {
  try {
    const { employeeIds } = req.body;

    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'employeeIds dizisi gerekli'
      });
    }

    // Maksimum 100 kullanici
    const limitedIds = employeeIds.slice(0, 100);

    const presenceMap = await redisService.bulkGetPresence('employee', limitedIds);

    res.json({
      success: true,
      data: { presence: presenceMap }
    });
  } catch (error) {
    console.error('[employees-chat] Bulk presence hatasi:', error);
    res.status(500).json({
      success: false,
      error: 'Toplu durum bilgisi alinamadi'
    });
  }
});

/**
 * POST /dm/create - DM odasi olustur veya mevcut olanı getir
 */
router.post('/dm/create', authenticateToken, employeeOnly, async (req, res) => {
  try {
    const { targetEmployeeId } = req.body;
    const { user } = req;

    if (!targetEmployeeId) {
      return res.status(400).json({
        success: false,
        error: 'Hedef calisan ID\'si gerekli'
      });
    }

    // Kendisiyle DM oluşturulamaz
    if (targetEmployeeId === user.employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Kendinizle mesajlasma olusturulamaz'
      });
    }

    // Hedef calisanin varligini kontrol et
    const targetEmployee = await Employee.findByPk(targetEmployeeId);
    if (!targetEmployee || !targetEmployee.is_active) {
      return res.status(404).json({
        success: false,
        error: 'Calisan bulunamadi'
      });
    }

    // Site kontrolu
    if (user.siteCode && targetEmployee.site_code !== user.siteCode) {
      return res.status(403).json({
        success: false,
        error: 'Farkli sitelerdeki calisanlarla mesajlasamazsiniz'
      });
    }

    // DM odasi bul veya olustur
    const room = await ChatRoom.findOrCreateDM(
      user.employeeId,
      targetEmployeeId,
      user.siteCode
    );

    // Hedef calisanin presence bilgisini al
    const targetPresence = await redisService.getUserPresence('employee', targetEmployeeId);

    res.json({
      success: true,
      data: {
        room: {
          id: room.id,
          roomType: room.room_type,
          channelType: room.channel_type,
          roomName: room.room_name,
          isActive: room.is_active,
          lastMessageAt: room.last_message_at,
          createdAt: room.created_at
        },
        targetEmployee: {
          id: targetEmployee.id,
          fullName: `${targetEmployee.first_name} ${targetEmployee.last_name}`,
          department: targetEmployee.department,
          position: targetEmployee.position,
          profilePicture: targetEmployee.profile_picture,
          presence: targetPresence
        }
      }
    });
  } catch (error) {
    console.error('[employees-chat] DM olusturma hatasi:', error);
    res.status(500).json({
      success: false,
      error: 'Mesajlasma olusturulamadi'
    });
  }
});

/**
 * GET /departments - Departman listesi
 */
router.get('/departments', authenticateToken, employeeOnly, async (req, res) => {
  try {
    const { user } = req;

    const where = { is_active: true };
    if (user.siteCode) {
      where.site_code = user.siteCode;
    }

    // Benzersiz departmanlari ve calisan sayilarini getir
    const departments = await Employee.findAll({
      where,
      attributes: [
        'department',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'employeeCount']
      ],
      group: ['department'],
      order: [['department', 'ASC']],
      raw: true
    });

    // Her departman icin online sayisini al
    const departmentData = await Promise.all(
      departments.map(async (dept) => {
        const onlineIds = await redisService.getOnlineUsers('employee');
        const onlineInDept = await Employee.count({
          where: {
            department: dept.department,
            id: onlineIds,
            is_active: true,
            ...(user.siteCode && { site_code: user.siteCode })
          }
        });

        return {
          name: dept.department,
          employeeCount: parseInt(dept.employeeCount),
          onlineCount: onlineInDept
        };
      })
    );

    res.json({
      success: true,
      data: { departments: departmentData }
    });
  } catch (error) {
    console.error('[employees-chat] Departman listesi hatasi:', error);
    res.status(500).json({
      success: false,
      error: 'Departman listesi alinamadi'
    });
  }
});

/**
 * POST /status - Kendi durumunu guncelle
 */
router.post('/status', authenticateToken, employeeOnly, async (req, res) => {
  try {
    const { status, customStatus, statusEmoji } = req.body;
    const { user } = req;

    const validStatuses = ['online', 'away', 'busy', 'dnd'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Gecersiz durum. Gecerli degerler: online, away, busy, dnd'
      });
    }

    // DB'yi guncelle
    const [presence] = await EmployeePresence.upsert({
      employee_id: user.employeeId,
      status: status || 'online',
      custom_status: customStatus || null,
      status_emoji: statusEmoji || null,
      last_seen_at: new Date()
    });

    // Redis'i guncelle
    await redisService.setUserOnline('employee', user.employeeId);

    res.json({
      success: true,
      data: {
        status: presence.status,
        customStatus: presence.custom_status,
        statusEmoji: presence.status_emoji
      }
    });
  } catch (error) {
    console.error('[employees-chat] Durum guncelleme hatasi:', error);
    res.status(500).json({
      success: false,
      error: 'Durum guncellenemedi'
    });
  }
});

/**
 * GET /my-dms - Kullanicinin DM odalarini getir
 */
router.get('/my-dms', authenticateToken, employeeOnly, async (req, res) => {
  try {
    const { user } = req;

    const rooms = await ChatRoom.findAll({
      where: {
        room_type: 'PRIVATE_DM',
        channel_type: 'INTERNAL',
        is_active: true
      },
      include: [{
        model: ChatRoomMember,
        as: 'members',
        where: {
          member_type: 'employee',
          member_id: user.employeeId,
          is_active: true
        },
        required: true
      }],
      order: [['last_message_at', 'DESC']]
    });

    // Her oda icin diger kullaniciyi bul
    const roomsWithUsers = await Promise.all(
      rooms.map(async (room) => {
        // Diger uyeyi bul
        const otherMember = await ChatRoomMember.findOne({
          where: {
            room_id: room.id,
            member_type: 'employee',
            member_id: { [Op.ne]: user.employeeId },
            is_active: true
          }
        });

        let otherUser = null;
        if (otherMember) {
          const employee = await Employee.findByPk(otherMember.member_id, {
            attributes: ['id', 'first_name', 'last_name', 'department', 'profile_picture']
          });

          if (employee) {
            const presence = await redisService.getUserPresence('employee', employee.id);
            otherUser = {
              id: employee.id,
              fullName: `${employee.first_name} ${employee.last_name}`,
              department: employee.department,
              profilePicture: employee.profile_picture,
              presence
            };
          }
        }

        return {
          id: room.id,
          roomName: room.room_name,
          lastMessageAt: room.last_message_at,
          otherUser
        };
      })
    );

    res.json({
      success: true,
      data: { rooms: roomsWithUsers }
    });
  } catch (error) {
    console.error('[employees-chat] DM listesi hatasi:', error);
    res.status(500).json({
      success: false,
      error: 'DM listesi alinamadi'
    });
  }
});

module.exports = router;
