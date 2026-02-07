const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InvitationLink = sequelize.define('InvitationLink', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  site_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Bu davet linkinin ait oldugu site kodu (FXB, MTD, vb.)'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Davet linki verilen e-posta adresi'
  },
  token: {
    type: DataTypes.STRING(32),
    allowNull: false,
    comment: 'Benzersiz davet token\'ı'
  },
  status: {
    type: DataTypes.ENUM('active', 'clicked', 'used', 'expired'),
    defaultValue: 'active',
    comment: 'Link durumu'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Linki oluşturan admin ID (employees_employee tablosuna referans)'
  },

  // Link tıklama bilgileri
  first_clicked_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'İlk tıklama zamanı'
  },
  first_clicked_ip: {
    type: DataTypes.INET,
    allowNull: true,
    comment: 'İlk tıklama IP adresi'
  },
  click_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Toplam tıklanma sayısı'
  },

  // Form tamamlama bilgileri
  form_completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Form tamamlanma zamanı'
  },
  form_completed_ip: {
    type: DataTypes.INET,
    allowNull: true,
    comment: 'Form gönderilirken kullanılan IP'
  },
  applicant_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Başvuran adı soyadı'
  },
  applicant_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Başvuran telefon numarası'
  },

  // Eski LocalStorage uyumluluğu için
  clickedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'LocalStorage uyumluluğu (first_clicked_at ile aynı)'
  },
  usedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'LocalStorage uyumluluğu (form_completed_at ile aynı)'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: 'LocalStorage uyumluluğu (first_clicked_ip ile aynı)'
  }
}, {
  tableName: 'invitation_links',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',

  indexes: [
    {
      fields: ['token'],
      unique: true
    },
    {
      fields: ['email']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['site_code']
    }
  ],

  hooks: {
    // Form tamamlandığında status'u otomatik güncelle
    beforeUpdate: (invitation, options) => {
      if (invitation.form_completed_at && invitation.status !== 'used') {
        invitation.status = 'used';
      }
      if (invitation.first_clicked_at && invitation.status === 'active') {
        invitation.status = 'clicked';
      }

      // LocalStorage uyumluluğu için sync
      if (invitation.first_clicked_at) {
        invitation.clickedAt = invitation.first_clicked_at;
        invitation.ipAddress = invitation.first_clicked_ip;
      }
      if (invitation.form_completed_at) {
        invitation.usedAt = invitation.form_completed_at;
      }
    }
  }
});

module.exports = InvitationLink;