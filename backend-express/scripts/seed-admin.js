/**
 * Seed script - Production veritabanına demo admin kullanıcıları ekler
 * Kullanım: node scripts/seed-admin.js
 * NOT: Bu script bir kez çalıştırılmalıdır
 */
require('dotenv').config();
const { sequelize } = require('../config/database');
const AdminUser = require('../models/AdminUser');

async function seedAdmins() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    const admins = [
      {
        first_name: 'Super',
        last_name: 'Admin',
        email: 'admin@company.com',
        password_hash: 'admin123',
        role: 'SUPER_ADMIN',
        is_active: true,
      },
      {
        first_name: 'Furkan',
        last_name: 'Dağhan',
        email: 'furkan@optima.com',
        password_hash: 'furkan123',
        role: 'ADMIN',
        is_active: true,
      },
      {
        first_name: 'Harun',
        last_name: 'Yönetici',
        email: 'harun@optima.com',
        password_hash: 'harun123',
        role: 'HR',
        is_active: true,
      },
    ];

    for (const admin of admins) {
      const [user, created] = await AdminUser.findOrCreate({
        where: { email: admin.email },
        defaults: admin,
      });
      if (created) {
        console.log(`✅ Created: ${admin.email} (${admin.role})`);
      } else {
        console.log(`⏭️  Already exists: ${admin.email}`);
      }
    }

    console.log('\n🎉 Seed completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  }
}

seedAdmins();
