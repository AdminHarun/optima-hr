const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ChannelMember = sequelize.define('ChannelMember', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  channel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'channels',
      key: 'id'
    },
    onDelete: 'CASCADE',
    comment: 'Kanal ID'
  },
  employee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Çalışan ID'
  },
  role: {
    type: DataTypes.ENUM('owner', 'admin', 'member'),
    defaultValue: 'member',
    comment: 'owner: Kanal sahibi, admin: Yönetici, member: Üye'
  },
  joined_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Katılım tarihi'
  },
  invited_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Davet eden çalışan ID (private kanallar için)'
  },
  muted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Bildirimler kapalı mı?'
  },
  muted_until: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Geçici sessiz - ne zamana kadar'
  },
  last_read_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Son okunma zamanı'
  },
  last_read_message_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Son okunan mesaj ID'
  },
  unread_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Okunmamış mesaj sayısı (cache)'
  },
  notification_preference: {
    type: DataTypes.ENUM('all', 'mentions', 'none'),
    defaultValue: 'all',
    comment: 'Bildirim tercihi'
  },
  starred: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Yıldızlı/favorilere eklendi mi?'
  }
}, {
  tableName: 'channel_members',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['channel_id', 'employee_id'],
      name: 'idx_channel_members_unique'
    },
    {
      fields: ['employee_id'],
      name: 'idx_channel_members_employee'
    },
    {
      fields: ['channel_id'],
      name: 'idx_channel_members_channel'
    },
    {
      fields: ['role'],
      name: 'idx_channel_members_role'
    },
    {
      fields: ['starred'],
      name: 'idx_channel_members_starred'
    }
  ]
});

/**
 * Statik Metodlar
 */

// Kullanıcıyı kanala ekle
ChannelMember.addMember = async function(channelId, employeeId, role = 'member', invitedBy = null) {
  const Channel = require('./Channel');

  const [member, created] = await this.findOrCreate({
    where: { channel_id: channelId, employee_id: employeeId },
    defaults: {
      role,
      invited_by: invitedBy,
      joined_at: new Date()
    }
  });

  if (created) {
    // Üye sayısını güncelle
    await Channel.updateMemberCount(channelId);
  }

  return { member, created };
};

// Kullanıcıyı kanaldan çıkar
ChannelMember.removeMember = async function(channelId, employeeId) {
  const Channel = require('./Channel');

  const deleted = await this.destroy({
    where: { channel_id: channelId, employee_id: employeeId }
  });

  if (deleted > 0) {
    // Üye sayısını güncelle
    await Channel.updateMemberCount(channelId);
  }

  return deleted > 0;
};

// Üyelik kontrolü
ChannelMember.isMember = async function(channelId, employeeId) {
  const member = await this.findOne({
    where: { channel_id: channelId, employee_id: employeeId }
  });
  return !!member;
};

// Rol kontrolü
ChannelMember.hasRole = async function(channelId, employeeId, roles) {
  if (!Array.isArray(roles)) roles = [roles];

  const member = await this.findOne({
    where: { channel_id: channelId, employee_id: employeeId }
  });

  return member && roles.includes(member.role);
};

// Okunmamış mesaj sayısını güncelle
ChannelMember.updateUnreadCount = async function(channelId, employeeId, count) {
  await this.update(
    { unread_count: count },
    { where: { channel_id: channelId, employee_id: employeeId } }
  );
};

// Tüm üyelerin unread_count'unu artır (yeni mesaj geldiğinde)
ChannelMember.incrementUnreadForAll = async function(channelId, excludeEmployeeId = null) {
  const where = { channel_id: channelId };
  if (excludeEmployeeId) {
    where.employee_id = { [require('sequelize').Op.ne]: excludeEmployeeId };
  }

  await this.increment('unread_count', { where });
};

// Kanalı okundu olarak işaretle
ChannelMember.markAsRead = async function(channelId, employeeId, lastMessageId = null) {
  await this.update(
    {
      unread_count: 0,
      last_read_at: new Date(),
      last_read_message_id: lastMessageId
    },
    { where: { channel_id: channelId, employee_id: employeeId } }
  );
};

// Kanal üyelerini getir
ChannelMember.getMembers = async function(channelId) {
  const Employee = require('./Employee');

  return this.findAll({
    where: { channel_id: channelId },
    include: [{
      model: Employee,
      as: 'employee',
      attributes: ['employee_id', 'first_name', 'last_name', 'email', 'profile_picture', 'department']
    }],
    order: [
      ['role', 'ASC'], // owner, admin, member sırası
      ['joined_at', 'ASC']
    ]
  });
};

module.exports = ChannelMember;
