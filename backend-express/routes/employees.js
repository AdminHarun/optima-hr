const express = require('express');
const { Op } = require('sequelize');
const { Employee, EmployeeDocument } = require('../models');
const ChatRoom = require('../models/ChatRoom');
const ChatRoomMember = require('../models/ChatRoomMember');
const presenceService = require('../services/PresenceService');
const router = express.Router();

// Site code helper
const getSiteCode = (req) => req.headers['x-site-id'] || null;
const addSiteFilter = (where, siteCode) => {
  if (siteCode) where.site_code = siteCode;
  return where;
};

// GET /api/employees/ - Tüm çalışanları listele
router.get('/', async (req, res) => {
  try {
    const siteCode = getSiteCode(req);
    const where = {};
    addSiteFilter(where, siteCode);

    let employees = [];

    // Önce association ile dene, başarısız olursa basit sorgu yap
    try {
      employees = await Employee.findAll({
        where,
        include: [{
          model: EmployeeDocument,
          as: 'documents',
          required: false,
        }],
        order: [['created_at', 'DESC']],
      });
    } catch (includeError) {
      console.warn('⚠️ Employee association query failed, trying simple query:', includeError.message);
      employees = await Employee.findAll({
        where,
        order: [['created_at', 'DESC']],
      });
    }

    res.json(employees);
  } catch (error) {
    console.error('Employee list error:', error);
    res.status(500).json({ error: 'Çalışan listesi yüklenirken hata oluştu', details: error.message });
  }
});

// GET /api/employees/active/ - Aktif çalışanları listele
router.get('/active/', async (req, res) => {
  try {
    const siteCode = getSiteCode(req);
    const where = { is_active: true };
    addSiteFilter(where, siteCode);

    const employees = await Employee.findAll({
      where,
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
      order: [['created_at', 'DESC']],
    });

    res.json(employees);
  } catch (error) {
    console.error('Active employees error:', error);
    res.status(500).json({ error: 'Aktif çalışanlar yüklenirken hata oluştu' });
  }
});

// GET /api/employees/inactive/ - Pasif çalışanları listele
router.get('/inactive/', async (req, res) => {
  try {
    const siteCode = getSiteCode(req);
    const where = { is_active: false };
    addSiteFilter(where, siteCode);

    const employees = await Employee.findAll({
      where,
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
      order: [['created_at', 'DESC']],
    });

    res.json(employees);
  } catch (error) {
    console.error('Inactive employees error:', error);
    res.status(500).json({ error: 'Pasif çalışanlar yüklenirken hata oluştu' });
  }
});

// GET /api/employees/by_department/ - Departmana göre çalışanları listele
router.get('/by_department/', async (req, res) => {
  try {
    const { department } = req.query;
    const siteCode = getSiteCode(req);

    if (!department) {
      return res.status(400).json({ error: 'Departman parametresi gerekli' });
    }

    const where = { department: department, is_active: true };
    addSiteFilter(where, siteCode);

    const employees = await Employee.findAll({
      where,
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
      order: [['created_at', 'DESC']],
    });

    res.json(employees);
  } catch (error) {
    console.error('Department employees error:', error);
    res.status(500).json({ error: 'Departman çalışanları yüklenirken hata oluştu' });
  }
});

// GET /api/employees/search/ - Çalışan arama
router.get('/search/', async (req, res) => {
  try {
    const { q, department, position, is_active } = req.query;
    const siteCode = getSiteCode(req);
    const where = {};
    addSiteFilter(where, siteCode);

    if (q) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { first_name: { [Op.like]: `%${q}%` } },
        { last_name: { [Op.like]: `%${q}%` } },
        { employee_id: { [Op.like]: `%${q}%` } },
        { email: { [Op.like]: `%${q}%` } },
      ];
    }

    if (department) where.department = department;
    if (position) where.position = position;
    if (is_active !== undefined) where.is_active = is_active === 'true';

    const employees = await Employee.findAll({
      where,
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
      order: [['created_at', 'DESC']],
    });

    res.json(employees);
  } catch (error) {
    console.error('Search employees error:', error);
    res.status(500).json({ error: 'Çalışan arama sırasında hata oluştu' });
  }
});

// GET /api/employees/dashboard/ - Dashboard istatistikleri
router.get('/dashboard/', async (req, res) => {
  try {
    const { Op } = require('sequelize');
    const siteCode = getSiteCode(req);
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const siteWhere = {};
    addSiteFilter(siteWhere, siteCode);

    const totalEmployees = await Employee.count({ where: siteWhere });
    const activeEmployees = await Employee.count({ where: { ...siteWhere, is_active: true } });
    const inactiveEmployees = totalEmployees - activeEmployees;

    // Departman istatistikleri
    const departmentStats = await Employee.findAll({
      attributes: [
        'department',
        [Employee.sequelize.fn('COUNT', Employee.sequelize.col('id')), 'count']
      ],
      where: { ...siteWhere, is_active: true },
      group: ['department'],
    });

    // Pozisyon istatistikleri
    const positionStats = await Employee.findAll({
      attributes: [
        'position',
        [Employee.sequelize.fn('COUNT', Employee.sequelize.col('id')), 'count']
      ],
      where: { ...siteWhere, is_active: true },
      group: ['position'],
    });

    // Bu ay işe başlayanlar
    const newHiresThisMonth = await Employee.count({
      where: {
        hire_date: {
          [Op.and]: [
            Employee.sequelize.where(
              Employee.sequelize.fn('MONTH', Employee.sequelize.col('hire_date')),
              currentMonth
            ),
            Employee.sequelize.where(
              Employee.sequelize.fn('YEAR', Employee.sequelize.col('hire_date')),
              currentYear
            )
          ]
        }
      }
    });

    const departments = {};
    departmentStats.forEach(stat => {
      departments[stat.department] = stat.dataValues.count;
    });

    const positions = {};
    positionStats.forEach(stat => {
      positions[stat.position] = stat.dataValues.count;
    });

    res.json({
      total_employees: totalEmployees,
      active_employees: activeEmployees,
      inactive_employees: inactiveEmployees,
      departments,
      positions,
      new_hires_this_month: newHiresThisMonth,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Dashboard istatistikleri yüklenirken hata oluştu' });
  }
});

// GET /api/employees/:id/ - Tek çalışan detayı
router.get('/:id/', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id, {
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
    });

    if (!employee) {
      return res.status(404).json({ error: 'Çalışan bulunamadı' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Employee detail error:', error);
    res.status(500).json({ error: 'Çalışan detayı yüklenirken hata oluştu' });
  }
});

// POST /api/employees/ - Yeni çalışan oluştur
router.post('/', async (req, res) => {
  try {
    const siteCode = getSiteCode(req);
    const employee = await Employee.create({ ...req.body, site_code: siteCode });
    res.status(201).json(employee);
  } catch (error) {
    console.error('Employee create error:', error);
    res.status(400).json({ error: 'Çalışan oluşturulurken hata oluştu', details: error.message });
  }
});

// POST /api/employees/create-user/ - Çalışan ve kullanıcı oluştur (Django uyumluluğu)
router.post('/create-user/', async (req, res) => {
  try {
    const siteCode = getSiteCode(req);
    const employee = await Employee.create({ ...req.body, site_code: siteCode });
    res.status(201).json(employee);
  } catch (error) {
    console.error('Employee create-user error:', error);
    res.status(400).json({ error: 'Çalışan oluşturulurken hata oluştu', details: error.message });
  }
});

// PUT /api/employees/:id/ - Çalışan güncelle (tam güncelleme)
router.put('/:id/', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Çalışan bulunamadı' });
    }

    await employee.update(req.body);

    // Güncellenmiş veriyi geri döndür
    const updatedEmployee = await Employee.findByPk(req.params.id, {
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
    });

    res.json(updatedEmployee);
  } catch (error) {
    console.error('Employee update error:', error);
    res.status(400).json({ error: 'Çalışan güncellenirken hata oluştu', details: error.message });
  }
});

// PATCH /api/employees/:id/ - Çalışan güncelle (kısmi güncelleme)
router.patch('/:id/', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Çalışan bulunamadı' });
    }

    await employee.update(req.body);

    // Güncellenmiş veriyi geri döndür
    const updatedEmployee = await Employee.findByPk(req.params.id, {
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
    });

    res.json(updatedEmployee);
  } catch (error) {
    console.error('Employee patch error:', error);
    res.status(400).json({ error: 'Çalışan güncellenirken hata oluştu', details: error.message });
  }
});

// DELETE /api/employees/:id/ - Çalışan sil
router.delete('/:id/', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Çalışan bulunamadı' });
    }

    await employee.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Employee delete error:', error);
    res.status(500).json({ error: 'Çalışan silinirken hata oluştu' });
  }
});

// POST /api/employees/:id/activate/ - Çalışanı aktif yap
router.post('/:id/activate/', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Çalışan bulunamadı' });
    }

    await employee.update({
      is_active: true,
      restored_at: new Date(),
      deactivated_at: null,
    });

    const updatedEmployee = await Employee.findByPk(req.params.id, {
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
    });

    res.json(updatedEmployee);
  } catch (error) {
    console.error('Employee activate error:', error);
    res.status(500).json({ error: 'Çalışan aktifleştirilirken hata oluştu' });
  }
});

// POST /api/employees/:id/deactivate/ - Çalışanı pasif yap
router.post('/:id/deactivate/', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Çalışan bulunamadı' });
    }

    await employee.update({
      is_active: false,
      deactivated_at: new Date(),
    });

    const updatedEmployee = await Employee.findByPk(req.params.id, {
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
    });

    res.json(updatedEmployee);
  } catch (error) {
    console.error('Employee deactivate error:', error);
    res.status(500).json({ error: 'Çalışan pasifleştirilirken hata oluştu' });
  }
});

// PATCH /api/employees/:id/update_crypto/ - Kripto adreslerini güncelle
router.patch('/:id/update_crypto/', async (req, res) => {
  try {
    const employee = await Employee.findByPk(req.params.id);

    if (!employee) {
      return res.status(404).json({ error: 'Çalışan bulunamadı' });
    }

    const { crypto_addresses } = req.body;

    if (!crypto_addresses || typeof crypto_addresses !== 'object') {
      return res.status(400).json({ error: 'crypto_addresses must be a dictionary' });
    }

    const updateData = { crypto_addresses };

    // USDT backward compatibility
    if (crypto_addresses.usdt) {
      updateData.usdt_address = crypto_addresses.usdt;
    }

    await employee.update(updateData);

    const updatedEmployee = await Employee.findByPk(req.params.id, {
      include: [{
        model: EmployeeDocument,
        as: 'documents',
      }],
    });

    res.json(updatedEmployee);
  } catch (error) {
    console.error('Employee update crypto error:', error);
    res.status(500).json({ error: 'Kripto adresleri güncellenirken hata oluştu' });
  }
});

// ==================== INTERNAL CHAT ENDPOINTS (FAZ 3) ====================

// GET /api/employees/directory - Employee directory for internal chat
router.get('/directory', async (req, res) => {
  try {
    const { department, search } = req.query;
    const siteCode = getSiteCode(req);

    const where = { is_active: true };
    addSiteFilter(where, siteCode);

    if (department && department !== 'all') {
      where.department = department;
    }

    if (search) {
      where[Op.or] = [
        { first_name: { [Op.iLike]: `%${search}%` } },
        { last_name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { position: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const employees = await Employee.findAll({
      where,
      attributes: ['id', 'first_name', 'last_name', 'email', 'department',
                   'position', 'avatar_url', 'phone'],
      order: [['department', 'ASC'], ['first_name', 'ASC']]
    });

    // Add presence information
    const withPresence = employees.map(emp => {
      const empJson = emp.toJSON();
      return {
        ...empJson,
        isOnline: presenceService.isOnline(`employee_${emp.id}`)
      };
    });

    res.json({ employees: withPresence });
  } catch (error) {
    console.error('Employee directory error:', error);
    res.status(500).json({ error: 'Calisan rehberi yuklenirken hata olustu' });
  }
});

// POST /api/employees/dm - Start direct message with another employee
router.post('/dm', async (req, res) => {
  try {
    const { targetEmployeeId } = req.body;
    const currentUserId = req.auth?.userId || req.user?.id;
    const siteCode = getSiteCode(req);

    if (!targetEmployeeId) {
      return res.status(400).json({ error: 'Target employee ID required' });
    }

    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify target employee exists
    const targetEmployee = await Employee.findByPk(targetEmployeeId);
    if (!targetEmployee) {
      return res.status(404).json({ error: 'Target employee not found' });
    }

    // Get current employee info
    const currentEmployee = await Employee.findByPk(currentUserId);
    if (!currentEmployee) {
      return res.status(404).json({ error: 'Current employee not found' });
    }

    // Check if DM room already exists between these two users
    const existingMembers = await ChatRoomMember.findAll({
      where: {
        member_type: 'employee',
        member_id: [currentUserId, targetEmployeeId],
        is_active: true
      },
      attributes: ['room_id'],
      raw: true
    });

    // Group by room_id and find rooms that have both users
    const roomCounts = {};
    existingMembers.forEach(m => {
      roomCounts[m.room_id] = (roomCounts[m.room_id] || 0) + 1;
    });

    let room = null;
    for (const [roomId, count] of Object.entries(roomCounts)) {
      if (count === 2) {
        // Found a room with both users, verify it's a DM (2 members only)
        const memberCount = await ChatRoomMember.count({
          where: { room_id: roomId, is_active: true }
        });

        if (memberCount === 2) {
          room = await ChatRoom.findOne({
            where: {
              id: roomId,
              room_type: 'internal',
              channel_type: 'INTERNAL',
              is_active: true
            }
          });
          if (room) break;
        }
      }
    }

    if (!room) {
      // Create new DM room
      room = await ChatRoom.create({
        site_code: siteCode,
        room_type: 'internal',
        channel_type: 'INTERNAL',
        room_name: null, // DMs don't have names, use participant names
        created_by: currentUserId,
        is_active: true
      });

      // Add both users as members
      await ChatRoomMember.bulkCreate([
        {
          room_id: room.id,
          member_type: 'employee',
          member_id: currentUserId,
          member_name: `${currentEmployee.first_name} ${currentEmployee.last_name}`,
          member_email: currentEmployee.email,
          role: 'member'
        },
        {
          room_id: room.id,
          member_type: 'employee',
          member_id: targetEmployeeId,
          member_name: `${targetEmployee.first_name} ${targetEmployee.last_name}`,
          member_email: targetEmployee.email,
          role: 'member'
        }
      ]);

      console.log(`Created new DM room ${room.id} between employees ${currentUserId} and ${targetEmployeeId}`);
    }

    // Get room with members
    const members = await ChatRoomMember.findAll({
      where: { room_id: room.id, is_active: true }
    });

    res.json({
      room: {
        ...room.toJSON(),
        members: members.map(m => m.toJSON())
      }
    });
  } catch (error) {
    console.error('Start DM error:', error);
    res.status(500).json({ error: 'DM olusturulurken hata olustu' });
  }
});

// GET /api/employees/internal-rooms - Get internal chat rooms for current user
router.get('/internal-rooms', async (req, res) => {
  try {
    const currentUserId = req.auth?.userId || req.user?.id;
    const siteCode = getSiteCode(req);

    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get all rooms where user is a member
    const memberships = await ChatRoomMember.findAll({
      where: {
        member_type: 'employee',
        member_id: currentUserId,
        is_active: true
      }
    });

    const roomIds = memberships.map(m => m.room_id);

    if (roomIds.length === 0) {
      return res.json({ rooms: [] });
    }

    // Get rooms with their members
    const rooms = await ChatRoom.findAll({
      where: {
        id: roomIds,
        channel_type: 'INTERNAL',
        is_active: true
      },
      order: [['last_message_at', 'DESC']]
    });

    // Get all members for these rooms
    const allMembers = await ChatRoomMember.findAll({
      where: {
        room_id: roomIds,
        is_active: true
      }
    });

    // Group members by room
    const membersByRoom = {};
    allMembers.forEach(m => {
      if (!membersByRoom[m.room_id]) {
        membersByRoom[m.room_id] = [];
      }
      membersByRoom[m.room_id].push(m.toJSON());
    });

    // Combine rooms with members and add online status
    const roomsWithMembers = rooms.map(room => {
      const roomJson = room.toJSON();
      const members = membersByRoom[room.id] || [];

      // For DM rooms, get the other person's info
      if (room.room_type === 'internal' && members.length === 2) {
        const otherMember = members.find(m => m.member_id !== currentUserId);
        if (otherMember) {
          roomJson.dm_partner = {
            id: otherMember.member_id,
            name: otherMember.member_name,
            email: otherMember.member_email,
            isOnline: presenceService.isOnline(`employee_${otherMember.member_id}`)
          };
        }
      }

      return {
        ...roomJson,
        members,
        is_dm: room.room_type === 'internal' && members.length === 2
      };
    });

    res.json({ rooms: roomsWithMembers });
  } catch (error) {
    console.error('Get internal rooms error:', error);
    res.status(500).json({ error: 'Ic iletisim odalari yuklenirken hata olustu' });
  }
});

// ==================== STATUS SYSTEM ENDPOINTS (Task 1.5) ====================

// GET /api/employees/me - Get current user info
router.get('/me', async (req, res) => {
  try {
    const currentUserId = req.session?.employeeId || req.headers['x-employee-id'];

    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const employee = await Employee.findByPk(currentUserId, {
      attributes: [
        'id', 'employee_id', 'first_name', 'last_name', 'email',
        'department', 'position', 'profile_picture', 'avatar_url',
        'status', 'custom_status', 'custom_status_emoji', 'last_seen_at'
      ]
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Add online status from presence service
    const isOnline = presenceService.isOnline(`employee_${currentUserId}`);

    res.json({
      ...employee.toJSON(),
      isOnline,
      name: `${employee.first_name} ${employee.last_name}`
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Kullanici bilgisi yuklenirken hata olustu' });
  }
});

// PUT /api/employees/me/status - Update current user's status
router.put('/me/status', async (req, res) => {
  try {
    const currentUserId = req.session?.employeeId || req.headers['x-employee-id'];

    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { status, customStatus, customEmoji } = req.body;

    const employee = await Employee.findByPk(currentUserId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Build update object
    const updateData = {};

    // Update presence status (online, away, busy, offline)
    if (status) {
      const validStatuses = ['online', 'away', 'busy', 'offline'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status. Must be one of: online, away, busy, offline' });
      }
      updateData.status = status;
    }

    // Update custom status text and emoji
    if (customStatus !== undefined) {
      updateData.custom_status = customStatus;
    }
    if (customEmoji !== undefined) {
      updateData.custom_status_emoji = customEmoji;
    }

    // Update last_seen_at
    updateData.last_seen_at = new Date();

    await employee.update(updateData);

    // Broadcast status change via WebSocket
    const chatWebSocketService = require('../services/ChatWebSocketService');
    chatWebSocketService.broadcastToSite(employee.site_code || 'FXB', 'user_status_change', {
      userId: currentUserId,
      status: employee.status,
      customStatus: employee.custom_status,
      customEmoji: employee.custom_status_emoji,
      lastSeenAt: employee.last_seen_at
    });

    res.json({
      success: true,
      status: employee.status,
      customStatus: employee.custom_status,
      customEmoji: employee.custom_status_emoji,
      lastSeenAt: employee.last_seen_at
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Durum guncellenirken hata olustu' });
  }
});

// GET /api/employees/:id/status - Get specific user's status
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await Employee.findByPk(id, {
      attributes: ['id', 'first_name', 'last_name', 'status', 'custom_status', 'custom_status_emoji', 'last_seen_at']
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Add online status from presence service
    const isOnline = presenceService.isOnline(`employee_${id}`);

    res.json({
      id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`,
      status: employee.status || 'offline',
      customStatus: employee.custom_status,
      customEmoji: employee.custom_status_emoji,
      lastSeenAt: employee.last_seen_at,
      isOnline
    });
  } catch (error) {
    console.error('Get user status error:', error);
    res.status(500).json({ error: 'Kullanici durumu yuklenirken hata olustu' });
  }
});

// GET /api/employees/statuses - Get all online/active users with their statuses
router.get('/statuses', async (req, res) => {
  try {
    const siteCode = getSiteCode(req);
    const where = { is_active: true };
    addSiteFilter(where, siteCode);

    const employees = await Employee.findAll({
      where,
      attributes: ['id', 'first_name', 'last_name', 'status', 'custom_status', 'custom_status_emoji', 'last_seen_at', 'profile_picture']
    });

    // Add online status from presence service
    const statuses = employees.map(emp => ({
      id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      avatar: emp.profile_picture,
      status: emp.status || 'offline',
      customStatus: emp.custom_status,
      customEmoji: emp.custom_status_emoji,
      lastSeenAt: emp.last_seen_at,
      isOnline: presenceService.isOnline(`employee_${emp.id}`)
    }));

    // Sort: online first, then by status, then by name
    const statusOrder = { online: 0, away: 1, busy: 2, offline: 3 };
    statuses.sort((a, b) => {
      // Online users first
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      // Then by status
      const statusDiff = (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
      if (statusDiff !== 0) return statusDiff;
      // Then by name
      return a.name.localeCompare(b.name, 'tr');
    });

    res.json({ statuses });
  } catch (error) {
    console.error('Get all statuses error:', error);
    res.status(500).json({ error: 'Kullanici durumlari yuklenirken hata olustu' });
  }
});

// ==================== OFFLINE MESSAGING ENDPOINTS (Task 1.6) ====================

// GET /api/employees/me/pending-messages - Get pending offline messages count
router.get('/me/pending-messages/count', async (req, res) => {
  try {
    const currentUserId = req.session?.employeeId || req.headers['x-employee-id'];

    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const offlineMessagingService = require('../services/OfflineMessagingService');
    const count = await offlineMessagingService.getUnreadCount('employee', currentUserId);

    res.json({ count });
  } catch (error) {
    console.error('Get pending messages count error:', error);
    res.status(500).json({ error: 'Failed to get pending messages count' });
  }
});

// GET /api/employees/me/pending-messages - Get pending offline messages
router.get('/me/pending-messages', async (req, res) => {
  try {
    const currentUserId = req.session?.employeeId || req.headers['x-employee-id'];
    const { limit = 100 } = req.query;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const offlineMessagingService = require('../services/OfflineMessagingService');
    const messages = await offlineMessagingService.deliverPendingMessages('employee', currentUserId);

    res.json({
      messages: messages.map(m => ({
        id: m.id,
        messageId: m.message_id,
        channelId: m.channel_id,
        roomId: m.room_id,
        content: m.content,
        senderName: m.sender_name,
        senderType: m.sender_type,
        createdAt: m.created_at
      })),
      count: messages.length
    });
  } catch (error) {
    console.error('Get pending messages error:', error);
    res.status(500).json({ error: 'Failed to get pending messages' });
  }
});

// POST /api/employees/me/push-token - Register push notification token
router.post('/me/push-token', async (req, res) => {
  try {
    const currentUserId = req.session?.employeeId || req.headers['x-employee-id'];
    const { token, platform } = req.body;

    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const employee = await Employee.findByPk(currentUserId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await employee.update({
      push_token: token
    });

    console.log(`📱 Push token registered for employee ${currentUserId} (${platform || 'unknown'})`);

    res.json({ success: true });
  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

// DELETE /api/employees/me/push-token - Unregister push notification token
router.delete('/me/push-token', async (req, res) => {
  try {
    const currentUserId = req.session?.employeeId || req.headers['x-employee-id'];

    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const employee = await Employee.findByPk(currentUserId);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    await employee.update({
      push_token: null
    });

    console.log(`📱 Push token unregistered for employee ${currentUserId}`);

    res.json({ success: true });
  } catch (error) {
    console.error('Unregister push token error:', error);
    res.status(500).json({ error: 'Failed to unregister push token' });
  }
});

// POST /api/employees/group - Create internal group chat
router.post('/group', async (req, res) => {
  try {
    const { name, description, memberIds, avatar_url } = req.body;
    const currentUserId = req.auth?.userId || req.user?.id;
    const siteCode = getSiteCode(req);

    if (!currentUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Group name required' });
    }

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length < 1) {
      return res.status(400).json({ error: 'At least one member required' });
    }

    // Get current employee info
    const currentEmployee = await Employee.findByPk(currentUserId);
    if (!currentEmployee) {
      return res.status(404).json({ error: 'Current employee not found' });
    }

    // Verify all members exist
    const allMemberIds = [...new Set([currentUserId, ...memberIds])];
    const employees = await Employee.findAll({
      where: { id: allMemberIds, is_active: true }
    });

    if (employees.length !== allMemberIds.length) {
      return res.status(400).json({ error: 'Some members not found or inactive' });
    }

    // Create group room
    const room = await ChatRoom.create({
      site_code: siteCode,
      room_type: 'group',
      channel_type: 'INTERNAL',
      room_name: name,
      description: description || null,
      avatar_url: avatar_url || null,
      created_by: currentUserId,
      is_active: true
    });

    // Add all members
    const memberRecords = employees.map(emp => ({
      room_id: room.id,
      member_type: 'employee',
      member_id: emp.id,
      member_name: `${emp.first_name} ${emp.last_name}`,
      member_email: emp.email,
      role: emp.id === currentUserId ? 'owner' : 'member'
    }));

    await ChatRoomMember.bulkCreate(memberRecords);

    console.log(`Created group chat ${room.id} with ${memberRecords.length} members`);

    // Get room with members
    const members = await ChatRoomMember.findAll({
      where: { room_id: room.id }
    });

    res.status(201).json({
      room: {
        ...room.toJSON(),
        members: members.map(m => m.toJSON())
      }
    });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Grup olusturulurken hata olustu' });
  }
});

module.exports = router;