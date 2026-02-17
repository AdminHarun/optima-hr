/**
 * Message Bookmarks & Pins Migration
 * Task 2.6: Message Pinning & Bookmarks
 */

const { sequelize } = require('../config/database');

const up = async () => {
  console.log('🔄 Running message bookmarks & pins migration...');

  try {
    // Create message_bookmarks table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS message_bookmarks (
        id SERIAL PRIMARY KEY,

        -- User who bookmarked
        user_type VARCHAR(20) NOT NULL DEFAULT 'employee',
        user_id INTEGER NOT NULL,

        -- Message reference
        message_id INTEGER NOT NULL,

        -- Optional note/label
        note VARCHAR(500),

        -- Category/folder
        folder VARCHAR(100) DEFAULT 'default',

        -- Site isolation
        site_code VARCHAR(50),

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  ✅ Created message_bookmarks table');

    // Create indexes for bookmarks
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_bookmark_user
      ON message_bookmarks (user_type, user_id)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_bookmark_message
      ON message_bookmarks (message_id)
    `);

    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmark_unique
      ON message_bookmarks (user_type, user_id, message_id)
    `);
    console.log('  ✅ Created bookmark indexes');

    // Add pin columns to chat_messages
    const pinColumns = [
      ['is_pinned', 'BOOLEAN DEFAULT false'],
      ['pinned_at', 'TIMESTAMP'],
      ['pinned_by_type', 'VARCHAR(20)'],
      ['pinned_by_id', 'INTEGER']
    ];

    for (const [col, type] of pinColumns) {
      try {
        await sequelize.query(`
          ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS ${col} ${type}
        `);
      } catch (e) {
        // Column might already exist
      }
    }
    console.log('  ✅ Added pin columns to chat_messages');

    // Create index for pinned messages
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned
      ON chat_messages (is_pinned)
      WHERE is_pinned = true
    `);
    console.log('  ✅ Created pin index');

    console.log('✅ Message bookmarks & pins migration completed');
    return true;
  } catch (error) {
    console.error('❌ Message bookmarks & pins migration failed:', error);
    throw error;
  }
};

const down = async () => {
  console.log('🔄 Rolling back message bookmarks & pins migration...');

  try {
    // Drop indexes
    await sequelize.query('DROP INDEX IF EXISTS idx_bookmark_user');
    await sequelize.query('DROP INDEX IF EXISTS idx_bookmark_message');
    await sequelize.query('DROP INDEX IF EXISTS idx_bookmark_unique');
    await sequelize.query('DROP INDEX IF EXISTS idx_chat_messages_pinned');

    // Drop table
    await sequelize.query('DROP TABLE IF EXISTS message_bookmarks');

    // Remove pin columns (optional - not recommended for production)
    // await sequelize.query('ALTER TABLE chat_messages DROP COLUMN IF EXISTS is_pinned');
    // await sequelize.query('ALTER TABLE chat_messages DROP COLUMN IF EXISTS pinned_at');
    // await sequelize.query('ALTER TABLE chat_messages DROP COLUMN IF EXISTS pinned_by_type');
    // await sequelize.query('ALTER TABLE chat_messages DROP COLUMN IF EXISTS pinned_by_id');

    console.log('✅ Message bookmarks & pins rollback completed');
    return true;
  } catch (error) {
    console.error('❌ Message bookmarks & pins rollback failed:', error);
    throw error;
  }
};

module.exports = { up, down };
