const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Channel = sequelize.define('Channel', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      is: /^[a-z0-9-_]+$/i, // Sadece harf, rakam, tire ve alt çizgi
      len: [2, 80]
    },
    comment: 'URL-friendly kanal adı (örn: genel, pazarlama-ekibi)'
  },
  display_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Görünen kanal adı (örn: Genel, Pazarlama Ekibi)'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Kanal açıklaması'
  },
  type: {
    type: DataTypes.ENUM('public', 'private'),
    defaultValue: 'public',
    comment: 'public: Herkes görebilir/katılabilir, private: Sadece davet ile'
  },
  site_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Multi-tenant site kodu'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Oluşturan çalışan ID'
  },
  is_archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Arşivlenmiş mi?'
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Varsayılan kanal mı? (yeni çalışanlar otomatik katılır)'
  },
  topic: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Kanal konusu/başlığı'
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'tag',
    comment: 'Kanal ikonu (MUI icon name)'
  },
  color: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Kanal rengi (hex)'
  },
  last_message_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Son mesaj zamanı'
  },
  last_message_preview: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Son mesaj önizlemesi'
  },
  member_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Üye sayısı (cache)'
  },
  message_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Toplam mesaj sayısı (cache)'
  }
}, {
  tableName: 'channels',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['name', 'site_code'],
      name: 'idx_channels_name_site'
    },
    {
      fields: ['site_code'],
      name: 'idx_channels_site_code'
    },
    {
      fields: ['type'],
      name: 'idx_channels_type'
    },
    {
      fields: ['is_archived'],
      name: 'idx_channels_archived'
    },
    {
      fields: ['last_message_at'],
      name: 'idx_channels_last_message'
    }
  ]
});

/**
 * Statik Metodlar
 */

// Varsayılan kanalları oluştur
Channel.createDefaultChannels = async function(siteCode, creatorId) {
  const defaults = [
    { name: 'genel', display_name: 'Genel', description: 'Genel sohbet kanalı', is_default: true, icon: 'forum' },
    { name: 'duyurular', display_name: 'Duyurular', description: 'Şirket duyuruları', is_default: true, icon: 'campaign' },
    { name: 'random', display_name: 'Random', description: 'İş dışı sohbetler', is_default: false, icon: 'emoji_emotions' }
  ];

  const channels = [];
  for (const def of defaults) {
    const [channel, created] = await this.findOrCreate({
      where: { name: def.name, site_code: siteCode },
      defaults: {
        ...def,
        site_code: siteCode,
        created_by: creatorId,
        type: 'public'
      }
    });
    channels.push(channel);
  }

  return channels;
};

// Kullanıcının kanallarını getir
Channel.getUserChannels = async function(employeeId, siteCode) {
  const ChannelMember = require('./ChannelMember');
  const { Op } = require('sequelize');

  return this.findAll({
    where: {
      site_code: siteCode,
      is_archived: false,
      [Op.or]: [
        { type: 'public' },
        {
          type: 'private',
          '$members.employee_id$': employeeId
        }
      ]
    },
    include: [{
      model: ChannelMember,
      as: 'members',
      required: false,
      where: { employee_id: employeeId }
    }],
    order: [
      ['is_default', 'DESC'],
      ['last_message_at', 'DESC NULLS LAST'],
      ['created_at', 'ASC']
    ]
  });
};

// Üye sayısını güncelle
Channel.updateMemberCount = async function(channelId) {
  const ChannelMember = require('./ChannelMember');
  const count = await ChannelMember.count({ where: { channel_id: channelId } });
  await this.update({ member_count: count }, { where: { id: channelId } });
  return count;
};

module.exports = Channel;
