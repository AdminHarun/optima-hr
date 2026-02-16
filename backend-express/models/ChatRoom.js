const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const ChatRoom = sequelize.define('ChatRoom', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  site_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Bu chat odasinin ait oldugu site kodu (FXB, MTD, vb.)'
  },
  room_type: {
    type: DataTypes.ENUM('applicant', 'admin', 'group', 'PRIVATE_DM', 'APPLICATION_CHANNEL', 'DEPARTMENT_GROUP', 'ANNOUNCEMENT'),
    allowNull: false,
    defaultValue: 'applicant'
  },
  channel_type: {
    type: DataTypes.ENUM('EXTERNAL', 'INTERNAL'),
    allowNull: false,
    defaultValue: 'EXTERNAL',
    comment: 'EXTERNAL: Aday-IK iletisimi, INTERNAL: Calisanlar arasi iletisim'
  },
  department: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Departman grubu icin departman kodu'
  },
  is_announcement: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Duyuru kanali mi?'
  },
  announcement_only: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Sadece adminler mesaj atabilir mi?'
  },
  pinned_message_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Sabitlenmis mesaj ID\'si'
  },
  avatar_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Grup/kanal avatar URL\'i'
  },
  applicant_id: {
    type: DataTypes.BIGINT,
    allowNull: true, // null for group chats
    comment: 'ID of the job applicant for applicant rooms (using timestamp as ID)'
  },
  applicant_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Email of the applicant for quick reference'
  },
  applicant_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Full name of the applicant'
  },
  room_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Custom room name for group chats'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description for group chats'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether the chat room is active'
  },
  last_message_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'ID of the last message in this room'
  },
  last_message_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp of the last message'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional room metadata (settings, preferences, etc.)'
  }
}, {
  tableName: 'chat_rooms',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

/**
 * Statik Metodlar
 */

// DM odasi bul veya olustur
ChatRoom.findOrCreateDM = async function(employee1Id, employee2Id, siteCode = null) {
  const ChatRoomMember = require('./ChatRoomMember');
  const Employee = require('./Employee');

  // Mevcut DM odasini ara
  const existingRoom = await sequelize.query(`
    SELECT cr.id FROM chat_rooms cr
    INNER JOIN chat_room_members m1 ON cr.id = m1.room_id
    INNER JOIN chat_room_members m2 ON cr.id = m2.room_id
    WHERE cr.room_type = 'PRIVATE_DM'
      AND cr.channel_type = 'INTERNAL'
      AND m1.member_type = 'employee' AND m1.member_id = :emp1
      AND m2.member_type = 'employee' AND m2.member_id = :emp2
      AND m1.is_active = true AND m2.is_active = true
    LIMIT 1
  `, {
    replacements: { emp1: employee1Id, emp2: employee2Id },
    type: sequelize.QueryTypes.SELECT
  });

  if (existingRoom.length > 0) {
    return this.findByPk(existingRoom[0].id, {
      include: [{ model: ChatRoomMember, as: 'members' }]
    });
  }

  // Yeni DM odasi olustur
  const [emp1, emp2] = await Promise.all([
    Employee.findByPk(employee1Id),
    Employee.findByPk(employee2Id)
  ]);

  const room = await this.create({
    room_type: 'PRIVATE_DM',
    channel_type: 'INTERNAL',
    site_code: siteCode,
    room_name: `${emp1.first_name} & ${emp2.first_name}`,
    is_active: true
  });

  // Uyeleri ekle
  await ChatRoomMember.bulkCreate([
    {
      room_id: room.id,
      member_type: 'employee',
      member_id: employee1Id,
      member_name: `${emp1.first_name} ${emp1.last_name}`,
      member_email: emp1.email,
      role: 'member',
      is_active: true
    },
    {
      room_id: room.id,
      member_type: 'employee',
      member_id: employee2Id,
      member_name: `${emp2.first_name} ${emp2.last_name}`,
      member_email: emp2.email,
      role: 'member',
      is_active: true
    }
  ]);

  return this.findByPk(room.id, {
    include: [{ model: ChatRoomMember, as: 'members' }]
  });
};

// Departman grubu olustur
ChatRoom.createDepartmentGroup = async function(department, siteCode, creatorId) {
  const ChatRoomMember = require('./ChatRoomMember');
  const Employee = require('./Employee');

  // Departmandaki calisanlari bul
  const employees = await Employee.findAll({
    where: {
      department,
      site_code: siteCode,
      is_active: true
    }
  });

  const room = await this.create({
    room_type: 'DEPARTMENT_GROUP',
    channel_type: 'INTERNAL',
    site_code: siteCode,
    department,
    room_name: `${department} Grubu`,
    is_active: true
  });

  // Tum departman calisanlarini ekle
  const members = employees.map(emp => ({
    room_id: room.id,
    member_type: 'employee',
    member_id: emp.id,
    member_name: `${emp.first_name} ${emp.last_name}`,
    member_email: emp.email,
    role: emp.id === creatorId ? 'owner' : 'member',
    is_active: true
  }));

  await ChatRoomMember.bulkCreate(members);

  return room;
};

// Duyuru kanali olustur
ChatRoom.createAnnouncementChannel = async function(name, siteCode, creatorId) {
  const ChatRoomMember = require('./ChatRoomMember');
  const AdminUser = require('./AdminUser');

  const creator = await AdminUser.findByPk(creatorId);

  const room = await this.create({
    room_type: 'ANNOUNCEMENT',
    channel_type: 'INTERNAL',
    site_code: siteCode,
    room_name: name,
    is_announcement: true,
    announcement_only: true,
    is_active: true
  });

  // Olusturani ekle
  await ChatRoomMember.create({
    room_id: room.id,
    member_type: 'admin',
    member_id: creatorId,
    member_name: `${creator.first_name} ${creator.last_name}`,
    member_email: creator.email,
    role: 'owner',
    is_active: true
  });

  return room;
};

// Kullanicinin odalarini getir (kanal tipine gore)
ChatRoom.getUserRooms = async function(userType, userId, channelType = null) {
  const ChatRoomMember = require('./ChatRoomMember');

  const where = {};
  if (channelType) {
    where.channel_type = channelType;
  }

  return this.findAll({
    where: {
      ...where,
      is_active: true
    },
    include: [{
      model: ChatRoomMember,
      as: 'members',
      where: {
        member_type: userType,
        member_id: userId,
        is_active: true
      },
      required: true
    }],
    order: [['last_message_at', 'DESC']]
  });
};

// Erisim kontrolu
ChatRoom.validateAccess = async function(userId, userType, roomId) {
  const room = await this.findByPk(roomId);
  if (!room) return { allowed: false, reason: 'Oda bulunamadi' };

  // Aday INTERNAL kanallara erisemez
  if (userType === 'applicant' && room.channel_type === 'INTERNAL') {
    return { allowed: false, reason: 'Bu kanala erisim izniniz yok' };
  }

  // Aday sadece kendi APPLICATION_CHANNEL'ina erisebilir
  if (userType === 'applicant') {
    if (room.room_type !== 'applicant' && room.room_type !== 'APPLICATION_CHANNEL') {
      return { allowed: false, reason: 'Bu odaya erisim izniniz yok' };
    }
    // Aday ID kontrolu
    if (room.applicant_id && room.applicant_id !== userId) {
      return { allowed: false, reason: 'Bu odaya erisim izniniz yok' };
    }
  }

  // Grup/DM icin uyelik kontrolu
  if (['PRIVATE_DM', 'DEPARTMENT_GROUP', 'group'].includes(room.room_type)) {
    const ChatRoomMember = require('./ChatRoomMember');
    const membership = await ChatRoomMember.findOne({
      where: {
        room_id: roomId,
        member_type: userType,
        member_id: userId,
        is_active: true
      }
    });

    if (!membership) {
      return { allowed: false, reason: 'Bu grubun uyesi degilsiniz' };
    }
  }

  return { allowed: true };
};

module.exports = ChatRoom;