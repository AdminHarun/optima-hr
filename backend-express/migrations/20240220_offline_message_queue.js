/**
 * Offline Message Queue Migration
 * Task 1.6: Offline Messaging
 *
 * Creates offline_message_queue table for storing messages
 * that need to be delivered when recipients come online.
 */

const { sequelize } = require('../config/database');

const up = async () => {
  console.log('🔄 Running offline message queue migration...');

  try {
    // Create message_type enum
    try {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE offline_message_type AS ENUM ('direct', 'channel', 'thread', 'mention');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('  ✅ Created offline_message_type enum');
    } catch (e) {
      console.log('  ℹ️ offline_message_type enum:', e.message);
    }

    // Create status enum
    try {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE offline_queue_status AS ENUM ('pending', 'delivered', 'failed', 'expired');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('  ✅ Created offline_queue_status enum');
    } catch (e) {
      console.log('  ℹ️ offline_queue_status enum:', e.message);
    }

    // Create table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS offline_message_queue (
        id SERIAL PRIMARY KEY,

        -- Recipient info
        recipient_type VARCHAR(20) NOT NULL,
        recipient_id INTEGER NOT NULL,

        -- Message info
        message_id VARCHAR(100) NOT NULL,
        channel_id INTEGER,
        room_id INTEGER,

        -- Sender info
        sender_type VARCHAR(20) NOT NULL,
        sender_id INTEGER,
        sender_name VARCHAR(200) NOT NULL,

        -- Content preview
        content_preview VARCHAR(200),

        -- Message type
        message_type VARCHAR(20) DEFAULT 'direct',

        -- Priority
        priority INTEGER DEFAULT 0,

        -- Delivery status
        status VARCHAR(20) DEFAULT 'pending',
        delivered_at TIMESTAMP,
        delivery_attempts INTEGER DEFAULT 0,
        last_attempt_at TIMESTAMP,

        -- Push notification
        push_sent BOOLEAN DEFAULT false,
        push_sent_at TIMESTAMP,
        push_token VARCHAR(500),

        -- Expiration
        expires_at TIMESTAMP,

        -- Site isolation
        site_code VARCHAR(50),

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ Created offline_message_queue table');

    // Create indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_offline_queue_recipient
      ON offline_message_queue (recipient_type, recipient_id, status)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_offline_queue_status
      ON offline_message_queue (status, created_at)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_offline_queue_expires
      ON offline_message_queue (expires_at)
      WHERE status = 'pending'
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_offline_queue_message
      ON offline_message_queue (message_id)
    `);

    console.log('  ✅ Created indexes');

    // Add push_token column to employees_employee if not exists
    try {
      await sequelize.query(`
        ALTER TABLE employees_employee
        ADD COLUMN IF NOT EXISTS push_token VARCHAR(500)
      `);
      console.log('  ✅ Added push_token to employees_employee');
    } catch (e) {
      console.log('  ℹ️ push_token column:', e.message);
    }

    console.log('✅ Offline message queue migration completed');
    return true;
  } catch (error) {
    console.error('❌ Offline message queue migration failed:', error);
    throw error;
  }
};

const down = async () => {
  console.log('🔄 Rolling back offline message queue migration...');

  try {
    // Drop indexes
    await sequelize.query('DROP INDEX IF EXISTS idx_offline_queue_recipient');
    await sequelize.query('DROP INDEX IF EXISTS idx_offline_queue_status');
    await sequelize.query('DROP INDEX IF EXISTS idx_offline_queue_expires');
    await sequelize.query('DROP INDEX IF EXISTS idx_offline_queue_message');

    // Drop table
    await sequelize.query('DROP TABLE IF EXISTS offline_message_queue');

    // Drop enums
    await sequelize.query('DROP TYPE IF EXISTS offline_message_type');
    await sequelize.query('DROP TYPE IF EXISTS offline_queue_status');

    // Remove push_token column
    await sequelize.query('ALTER TABLE employees_employee DROP COLUMN IF EXISTS push_token');

    console.log('✅ Offline message queue rollback completed');
    return true;
  } catch (error) {
    console.error('❌ Offline message queue rollback failed:', error);
    throw error;
  }
};

module.exports = { up, down };
