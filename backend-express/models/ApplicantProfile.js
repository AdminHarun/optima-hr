const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ApplicantProfile = sequelize.define('ApplicantProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  site_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Bu profilin ait oldugu site kodu (FXB, MTD, vb.)'
  },
  invitation_link_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'invitation_links',
      key: 'id'
    },
    comment: 'Hangi davet linki ile oluşturuldu'
  },

  // Temel profil bilgileri
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Başvuran adı'
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Başvuran soyadı'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Başvuran e-posta adresi'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Başvuran telefon numarası'
  },

  // Session yönetimi
  session_token: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'Session için benzersiz token'
  },
  chat_token: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'Chat sistemi için token'
  },

  // IP ve lokasyon bilgileri
  profile_created_ip: {
    type: DataTypes.INET,
    allowNull: true,
    comment: 'Profil oluşturulurken kullanılan IP'
  },
  profile_created_location: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'IP lokasyon bilgileri (şehir, ülke vb.)'
  },

  // Cihaz ve tarayici bilgileri
  device_info: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Cihaz parmak izi bilgileri (userAgent, platform, screen, fingerprints vb.)'
  },
  vpn_score: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: 'VPN kullanim skoru (0-100)'
  },
  is_vpn: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    comment: 'VPN tespit edildi mi'
  },

  // Guvenlik bilgileri (sifre ve guvenlik sorusu)
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'bcrypt ile hashlenmiş şifre'
  },
  security_question: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Güvenlik sorusu metni'
  },
  security_answer_hash: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'bcrypt ile hashlenmiş güvenlik sorusu cevabı'
  },

  // LocalStorage uyumluluğu
  token: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: 'LocalStorage uyumluluğu için invitation token'
  }
}, {
  tableName: 'applicant_profiles',
  timestamps: true,
  createdAt: 'profile_created_at',
  updatedAt: 'updated_at',

  indexes: [
    {
      fields: ['email']
    },
    {
      fields: ['session_token'],
      unique: true
    },
    {
      fields: ['invitation_link_id']
    },
    {
      fields: ['phone']
    }
  ]
});

module.exports = ApplicantProfile;