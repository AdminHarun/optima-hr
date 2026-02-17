/**
 * Scheduled Messages Migration
 * Task 2.4: Message Scheduling
 */

const { sequelize } = require('../config/database');

const up = async () => {
  console.log('🔄 Running scheduled messages migration...');

  try {
    // Create scheduled message status enum
    try {
      await sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE scheduled_message_status AS ENUM ('pending', 'sent', 'failed', 'cancelled');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      console.log('  ✅ Created scheduled_message_status enum');
    } catch (e) {
      console.log('  ℹ️ scheduled_message_status enum:', e.message);
    }

    // Create scheduled_messages table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS scheduled_messages (
        id SERIAL PRIMARY KEY,

        -- Sender info
        sender_type VARCHAR(20) NOT NULL,
        sender_id INTEGER NOT NULL,
        sender_name VARCHAR(200) NOT NULL,

        -- Target info
        channel_id INTEGER,
        room_id INTEGER,
        thread_id INTEGER,

        -- Message content
        content TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text',

        -- File attachment
        file_url VARCHAR(500),
        file_name VARCHAR(255),
        file_size INTEGER,
        file_mime_type VARCHAR(100),

        -- Scheduling
        scheduled_at TIMESTAMP NOT NULL,
        timezone VARCHAR(50) DEFAULT 'Europe/Istanbul',

        -- Status
        status VARCHAR(20) DEFAULT 'pending',
        sent_at TIMESTAMP,
        sent_message_id VARCHAR(100),
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,

        -- Recurrence
        is_recurring BOOLEAN DEFAULT false,
        recurrence_pattern VARCHAR(50),
        recurrence_end_at TIMESTAMP,

        -- Site isolation
        site_code VARCHAR(50),

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ Created scheduled_messages table');

    // Create indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_pending
      ON scheduled_messages (status, scheduled_at)
      WHERE status = 'pending'
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_scheduled_sender
      ON scheduled_messages (sender_type, sender_id, status)
    `);

    console.log('  ✅ Created indexes');

    console.log('✅ Scheduled messages migration completed');
    return true;
  } catch (error) {
    console.error('❌ Scheduled messages migration failed:', error);
    throw error;
  }
};

const down = async () => {
  console.log('🔄 Rolling back scheduled messages migration...');

  try {
    await sequelize.query('DROP INDEX IF EXISTS idx_scheduled_pending');
    await sequelize.query('DROP INDEX IF EXISTS idx_scheduled_sender');
    await sequelize.query('DROP TABLE IF EXISTS scheduled_messages');
    await sequelize.query('DROP TYPE IF EXISTS scheduled_message_status');

    console.log('✅ Scheduled messages rollback completed');
    return true;
  } catch (error) {
    console.error('❌ Scheduled messages rollback failed:', error);
    throw error;
  }
};

module.exports = { up, down };
