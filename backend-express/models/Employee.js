const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Employee = sequelize.define('Employee', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  // Site izolasyonu
  site_code: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Bu calisanin ait oldugu site kodu (FXB, MTD, vb.)'
  },

  // Temel bilgiler
  employee_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },

  // Kişisel bilgiler
  tc_no: {
    type: DataTypes.STRING(11),
    allowNull: true,
  },
  birth_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  birth_place: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  blood_type: {
    type: DataTypes.STRING(5),
    allowNull: true,
  },

  // Adres bilgileri
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  district: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  // İş bilgileri
  department: {
    type: DataTypes.ENUM(
      'CHAT', 'FOLLOW_UP', 'WITHDRAWAL', 'SUPPORT', 'SALES',
      'ACCOUNTING', 'HR', 'IT', 'MARKETING', 'FINANCE',
      'OPERATIONS', 'ADMIN'
    ),
    allowNull: false,
  },
  position: {
    type: DataTypes.ENUM(
      'OPERATOR', 'X_OPERATOR', 'SENIOR_OPERATOR', 'EXPERT_OPERATOR',
      'CONSULTANT', 'ASSISTANT_MANAGER', 'MANAGER', 'DIRECTOR',
      'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'C_LEVEL'
    ),
    allowNull: false,
  },
  job_title: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  hire_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  job_description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  // Eğitim bilgileri
  school: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  graduation_year: {
    type: DataTypes.STRING(4),
    allowNull: true,
  },
  languages: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },

  // Acil durum bilgileri
  emergency_contact: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  emergency_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  emergency_relation: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },

  // Finansal bilgiler
  gross_salary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  net_salary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  salary: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  payment_day: {
    type: DataTypes.INTEGER,
    defaultValue: 15,
  },

  // Banka bilgileri
  bank_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  iban: {
    type: DataTypes.STRING(34),
    allowNull: true,
  },

  // Kripto cüzdan adresleri
  crypto_addresses: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  usdt_address: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },

  // Sigorta bilgileri
  sgk_no: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  insurance_start: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },

  // Araç bilgileri
  license_class: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  vehicle_plate: {
    type: DataTypes.STRING(15),
    allowNull: true,
  },

  // Sistem alanları
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  profile_picture: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  avatar_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  deactivated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  restored_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },

  // Status System (Task 1.5)
  status: {
    type: DataTypes.ENUM('online', 'away', 'busy', 'offline'),
    defaultValue: 'offline',
    allowNull: false,
  },
  custom_status: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Custom status message (e.g., "In a meeting")'
  },
  custom_status_emoji: {
    type: DataTypes.STRING(10),
    allowNull: true,
    comment: 'Emoji for custom status'
  },
  last_seen_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last activity timestamp'
  },

  // Push Notifications (Task 1.6)
  push_token: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'FCM or APNS push notification token'
  },
}, {
  tableName: 'employees_employee',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: false,
});

// Virtual properties
Employee.prototype.getFullName = function() {
  return `${this.first_name} ${this.last_name}`;
};

Employee.prototype.getCryptoAddress = function(cryptoType) {
  return this.crypto_addresses && this.crypto_addresses[cryptoType] ?
    this.crypto_addresses[cryptoType] : null;
};

module.exports = Employee;