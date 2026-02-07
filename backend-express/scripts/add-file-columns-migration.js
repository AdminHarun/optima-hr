// Migration script to add file path columns to job_applications table
const { sequelize } = require('../config/database');

async function migrate() {
  try {
    console.log('🔧 Starting migration: Adding file path columns to job_applications...');

    // Add file path columns
    await sequelize.query(`
      ALTER TABLE job_applications
      ADD COLUMN IF NOT EXISTS cv_file_path VARCHAR(500),
      ADD COLUMN IF NOT EXISTS cv_file_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS internet_test_file_path VARCHAR(500),
      ADD COLUMN IF NOT EXISTS internet_test_file_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS typing_test_file_path VARCHAR(500),
      ADD COLUMN IF NOT EXISTS typing_test_file_name VARCHAR(255);
    `);

    console.log('✅ Migration completed successfully!');
    console.log('📝 Added columns: cv_file_path, cv_file_name, internet_test_file_path, internet_test_file_name, typing_test_file_path, typing_test_file_name');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
