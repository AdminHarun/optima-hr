/**
 * Employee Status System Migration
 * Task 1.5: Status System
 *
 * Adds status-related columns to employees_employee table:
 * - status: ENUM (online, away, busy, offline)
 * - custom_status: Custom status message text
 * - custom_status_emoji: Emoji for custom status
 * - last_seen_at: Last activity timestamp
 * - avatar_url: Avatar URL (if not using profile_picture)
 */

const { sequelize } = require('../config/database');

const up = async () => {
  const qi = sequelize.getQueryInterface();

  console.log('🔄 Running employee status migration...');

  try {
    // Create ENUM type for status if not exists
    try {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE employee_status_enum AS ENUM ('online', 'away', 'busy', 'offline');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('  ✅ Created employee_status_enum type');
    } catch (e) {
      console.log('  ℹ️ employee_status_enum type already exists or error:', e.message);
    }

    // Add status column
    try {
      await sequelize.query(`
        ALTER TABLE employees_employee
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline'
      `);
      console.log('  ✅ Added status column');
    } catch (e) {
      console.log('  ℹ️ status column:', e.message);
    }

    // Add custom_status column
    try {
      await sequelize.query(`
        ALTER TABLE employees_employee
        ADD COLUMN IF NOT EXISTS custom_status VARCHAR(255)
      `);
      console.log('  ✅ Added custom_status column');
    } catch (e) {
      console.log('  ℹ️ custom_status column:', e.message);
    }

    // Add custom_status_emoji column
    try {
      await sequelize.query(`
        ALTER TABLE employees_employee
        ADD COLUMN IF NOT EXISTS custom_status_emoji VARCHAR(10)
      `);
      console.log('  ✅ Added custom_status_emoji column');
    } catch (e) {
      console.log('  ℹ️ custom_status_emoji column:', e.message);
    }

    // Add last_seen_at column
    try {
      await sequelize.query(`
        ALTER TABLE employees_employee
        ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP
      `);
      console.log('  ✅ Added last_seen_at column');
    } catch (e) {
      console.log('  ℹ️ last_seen_at column:', e.message);
    }

    // Add avatar_url column
    try {
      await sequelize.query(`
        ALTER TABLE employees_employee
        ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)
      `);
      console.log('  ✅ Added avatar_url column');
    } catch (e) {
      console.log('  ℹ️ avatar_url column:', e.message);
    }

    // Create index for status queries
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_employee_status
        ON employees_employee (site_code, status, is_active)
      `);
      console.log('  ✅ Created status index');
    } catch (e) {
      console.log('  ℹ️ status index:', e.message);
    }

    // Create index for last_seen_at queries
    try {
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_employee_last_seen
        ON employees_employee (last_seen_at DESC NULLS LAST)
      `);
      console.log('  ✅ Created last_seen_at index');
    } catch (e) {
      console.log('  ℹ️ last_seen_at index:', e.message);
    }

    console.log('✅ Employee status migration completed');
    return true;
  } catch (error) {
    console.error('❌ Employee status migration failed:', error);
    throw error;
  }
};

const down = async () => {
  const qi = sequelize.getQueryInterface();

  console.log('🔄 Rolling back employee status migration...');

  try {
    // Drop indexes
    await sequelize.query('DROP INDEX IF EXISTS idx_employee_status');
    await sequelize.query('DROP INDEX IF EXISTS idx_employee_last_seen');

    // Drop columns
    await qi.removeColumn('employees_employee', 'status');
    await qi.removeColumn('employees_employee', 'custom_status');
    await qi.removeColumn('employees_employee', 'custom_status_emoji');
    await qi.removeColumn('employees_employee', 'last_seen_at');
    await qi.removeColumn('employees_employee', 'avatar_url');

    // Drop enum type
    await sequelize.query('DROP TYPE IF EXISTS employee_status_enum');

    console.log('✅ Employee status rollback completed');
    return true;
  } catch (error) {
    console.error('❌ Employee status rollback failed:', error);
    throw error;
  }
};

module.exports = { up, down };
