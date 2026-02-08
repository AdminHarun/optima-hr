const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const JobApplication = sequelize.define('JobApplication', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  site_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Bu basvurunun ait oldugu site kodu (FXB, MTD, vb.)'
  },
  applicant_profile_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'applicant_profiles',
      key: 'id'
    },
    comment: 'Başvuran profil ID'
  },
  invitation_link_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'invitation_links',
      key: 'id'
    },
    comment: 'Davet linki ID'
  },

  // Kişisel Bilgiler
  tc_number: {
    type: DataTypes.STRING(11),
    allowNull: true,
    comment: 'TC Kimlik Numarası'
  },
  birth_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Doğum tarihi'
  },

  // Adres Bilgileri
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Açık adres'
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'İl'
  },
  district: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'İlçe'
  },
  postal_code: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Posta kodu'
  },

  // Eğitim Bilgileri
  education_level: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Eğitim seviyesi'
  },
  university: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Üniversite adı'
  },
  department: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Bölüm adı'
  },
  graduation_year: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Mezuniyet yılı'
  },
  gpa: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Not ortalaması (100 üzerinden)'
  },

  // Deneyim Bilgileri
  has_sector_experience: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Sektör deneyimi var mı?'
  },
  experience_level: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Deneyim seviyesi'
  },
  last_company: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Son çalıştığı şirket'
  },
  last_position: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Son pozisyonu'
  },

  // Teknik Bilgiler
  internet_download: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'İnternet indirme hızı (Mbps)'
  },
  internet_upload: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'İnternet yükleme hızı (Mbps)'
  },
  typing_speed: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Klavye hızı (WPM)'
  },
  processor: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'İşlemci bilgisi'
  },
  ram: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'RAM bilgisi'
  },
  os: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'İşletim sistemi'
  },

  // Diğer Bilgiler
  source: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Bizi nereden buldu?'
  },
  has_reference: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Referansı var mı?'
  },
  reference_name: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Referans kişi adı'
  },
  kvkk_approved: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'KVKK onayı'
  },

  // Sistem Bilgileri
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'under_review', 'accepted', 'rejected', 'in_review', 'interview_scheduled', 'approved', 'hired'),
    defaultValue: 'submitted',
    comment: 'Başvuru durumu'
  },
  reject_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Red sebebi'
  },
  submitted_ip: {
    type: DataTypes.INET,
    allowNull: true,
    comment: 'Form gönderilirken kullanılan IP'
  },
  submitted_location: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Gönderim lokasyon bilgileri'
  },

  // Dosya Yolları
  cv_file_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'CV dosyasının yolu'
  },
  cv_file_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'CV dosyasının orijinal adı'
  },
  internet_test_file_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'İnternet hız testi dosyasının yolu'
  },
  internet_test_file_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'İnternet hız testi dosyasının orijinal adı'
  },
  typing_test_file_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Yazma hızı testi dosyasının yolu'
  },
  typing_test_file_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Yazma hızı testi dosyasının orijinal adı'
  },

  // LocalStorage uyumluluğu
  token: {
    type: DataTypes.STRING(32),
    allowNull: true,
    comment: 'LocalStorage uyumluluğu için invitation token'
  },
  profileId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'profile_id',
    comment: 'LocalStorage uyumluluğu için profile ID'
  }
}, {
  tableName: 'job_applications',
  timestamps: true,
  createdAt: 'submitted_at',
  updatedAt: 'updated_at',

  indexes: [
    {
      fields: ['applicant_profile_id']
    },
    {
      fields: ['invitation_link_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['submitted_at']
    },
    {
      fields: ['tc_number']
    }
  ]
});

module.exports = JobApplication;