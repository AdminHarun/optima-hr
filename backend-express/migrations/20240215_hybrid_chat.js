/**
 * Hybrid Chat System Migration
 *
 * This migration adds support for:
 * - Employee-to-employee direct messaging (DM)
 * - Department groups
 * - Announcement channels
 * - Message delivery/read receipts
 * - Employee presence (online/offline status)
 * - User onboarding flow
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function up() {
  const transaction = await sequelize.transaction();

  try {
    console.log('Starting Hybrid Chat System migration...');

    // =====================================================
    // 1. ChatRoom Table Updates
    // =====================================================
    console.log('Updating chat_rooms table...');

    // Check and add new enum values to room_type
    // Note: PostgreSQL requires explicit ALTER TYPE for enums
    const roomTypeEnumValues = await sequelize.query(
      `SELECT enumlabel FROM pg_enum
       WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_chat_rooms_room_type')`,
      { type: QueryTypes.SELECT, transaction }
    );
    const existingRoomTypes = roomTypeEnumValues.map(e => e.enumlabel);

    const newRoomTypes = ['PRIVATE_DM', 'APPLICATION_CHANNEL', 'DEPARTMENT_GROUP', 'ANNOUNCEMENT'];
    for (const roomType of newRoomTypes) {
      if (!existingRoomTypes.includes(roomType)) {
        await sequelize.query(
          `ALTER TYPE enum_chat_rooms_room_type ADD VALUE IF NOT EXISTS '${roomType}'`,
          { transaction }
        );
        console.log(`  Added room_type: ${roomType}`);
      }
    }

    // Add channel_type column for EXTERNAL/INTERNAL separation
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS channel_type VARCHAR(20) DEFAULT 'EXTERNAL';
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `, { transaction });

    // Add department column
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS department VARCHAR(50);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `, { transaction });

    // Add announcement flags
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS is_announcement BOOLEAN DEFAULT false;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `, { transaction });

    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS announcement_only BOOLEAN DEFAULT false;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `, { transaction });

    // Add pinned message reference
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS pinned_message_id INTEGER;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `, { transaction });

    // Add avatar URL for group chats
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `, { transaction });

    // Add indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_rooms_channel_type ON chat_rooms(channel_type);
      CREATE INDEX IF NOT EXISTS idx_chat_rooms_department ON chat_rooms(department);
    `, { transaction });

    console.log('  chat_rooms table updated successfully');

    // =====================================================
    // 2. ChatMessage Table Updates
    // =====================================================
    console.log('Updating chat_messages table...');

    // Check and add 'employee' to sender_type enum
    const senderTypeEnumValues = await sequelize.query(
      `SELECT enumlabel FROM pg_enum
       WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_chat_messages_sender_type')`,
      { type: QueryTypes.SELECT, transaction }
    );
    const existingSenderTypes = senderTypeEnumValues.map(e => e.enumlabel);

    if (!existingSenderTypes.includes('employee')) {
      await sequelize.query(
        `ALTER TYPE enum_chat_messages_sender_type ADD VALUE IF NOT EXISTS 'employee'`,
        { transaction }
      );
      console.log('  Added sender_type: employee');
    }

    // Add delivery_status column
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'sent';
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `, { transaction });

    // Add delivered_at timestamp
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `, { transaction });

    // Add read_at timestamp
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `, { transaction });

    // Add index for delivery status
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_delivery_status ON chat_messages(delivery_status);
    `, { transaction });

    console.log('  chat_messages table updated successfully');

    // =====================================================
    // 3. ChatRoomMember Table Updates
    // =====================================================
    console.log('Updating chat_room_members table...');

    // Check and add 'employee' to member_type enum
    const memberTypeEnumValues = await sequelize.query(
      `SELECT enumlabel FROM pg_enum
       WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_chat_room_members_member_type')`,
      { type: QueryTypes.SELECT, transaction }
    );
    const existingMemberTypes = memberTypeEnumValues.map(e => e.enumlabel);

    if (!existingMemberTypes.includes('employee')) {
      await sequelize.query(
        `ALTER TYPE enum_chat_room_members_member_type ADD VALUE IF NOT EXISTS 'employee'`,
        { transaction }
      );
      console.log('  Added member_type: employee');
    }

    // Add muted_until column for notification muting
    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE chat_room_members ADD COLUMN IF NOT EXISTS muted_until TIMESTAMP WITH TIME ZONE;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `, { transaction });

    console.log('  chat_room_members table updated successfully');

    // =====================================================
    // 4. AdminUser Table Updates (for Onboarding)
    // =====================================================
    console.log('Updating management_admin_users table...');

    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE management_admin_users ADD COLUMN IF NOT EXISTS first_login BOOLEAN DEFAULT true;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `, { transaction });

    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE management_admin_users ADD COLUMN IF NOT EXISTS employee_id INTEGER REFERENCES employees_employee(id);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `, { transaction });

    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE management_admin_users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `, { transaction });

    await sequelize.query(`
      DO $$ BEGIN
        ALTER TABLE management_admin_users ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `, { transaction });

    // Add index for employee lookup
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_users_employee_id ON management_admin_users(employee_id);
    `, { transaction });

    console.log('  management_admin_users table updated successfully');

    // =====================================================
    // 5. Create EmployeePresence Table
    // =====================================================
    console.log('Creating employee_presence table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS employee_presence (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL UNIQUE,
        status VARCHAR(20) DEFAULT 'offline',
        last_seen_at TIMESTAMP WITH TIME ZONE,
        current_device VARCHAR(50),
        socket_count INTEGER DEFAULT 0,
        custom_status VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_employee_presence_employee
          FOREIGN KEY (employee_id)
          REFERENCES employees_employee(id)
          ON DELETE CASCADE
      );
    `, { transaction });

    // Add indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_employee_presence_status ON employee_presence(status);
      CREATE INDEX IF NOT EXISTS idx_employee_presence_last_seen ON employee_presence(last_seen_at);
    `, { transaction });

    console.log('  employee_presence table created successfully');

    // =====================================================
    // 6. Create MessageReadReceipt Table
    // =====================================================
    console.log('Creating message_read_receipts table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS message_read_receipts (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL,
        reader_type VARCHAR(20) NOT NULL,
        reader_id INTEGER NOT NULL,
        read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(message_id, reader_type, reader_id),
        CONSTRAINT fk_read_receipt_message
          FOREIGN KEY (message_id)
          REFERENCES chat_messages(id)
          ON DELETE CASCADE
      );
    `, { transaction });

    // Add indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON message_read_receipts(message_id);
      CREATE INDEX IF NOT EXISTS idx_read_receipts_reader ON message_read_receipts(reader_type, reader_id);
    `, { transaction });

    console.log('  message_read_receipts table created successfully');

    // =====================================================
    // 7. Create Typing Indicators Table (optional, can use Redis)
    // =====================================================
    console.log('Creating typing_indicators table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS typing_indicators (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL,
        user_type VARCHAR(20) NOT NULL,
        user_id INTEGER NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '5 seconds',
        UNIQUE(room_id, user_type, user_id),
        CONSTRAINT fk_typing_room
          FOREIGN KEY (room_id)
          REFERENCES chat_rooms(id)
          ON DELETE CASCADE
      );
    `, { transaction });

    // Add index for cleanup queries
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_typing_expires ON typing_indicators(expires_at);
    `, { transaction });

    console.log('  typing_indicators table created successfully');

    // =====================================================
    // 8. Update existing rooms to set channel_type
    // =====================================================
    console.log('Setting channel_type for existing rooms...');

    // Mark existing applicant rooms as EXTERNAL
    await sequelize.query(`
      UPDATE chat_rooms
      SET channel_type = 'EXTERNAL'
      WHERE room_type IN ('applicant') AND channel_type IS NULL;
    `, { transaction });

    // Mark admin and group rooms as INTERNAL
    await sequelize.query(`
      UPDATE chat_rooms
      SET channel_type = 'INTERNAL'
      WHERE room_type IN ('admin', 'group') AND channel_type IS NULL;
    `, { transaction });

    console.log('  Existing rooms updated');

    await transaction.commit();
    console.log('\nHybrid Chat System migration completed successfully!');
    return true;

  } catch (error) {
    await transaction.rollback();
    console.error('Migration failed:', error);
    throw error;
  }
}

async function down() {
  const transaction = await sequelize.transaction();

  try {
    console.log('Rolling back Hybrid Chat System migration...');

    // Drop new tables
    await sequelize.query('DROP TABLE IF EXISTS typing_indicators CASCADE;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS message_read_receipts CASCADE;', { transaction });
    await sequelize.query('DROP TABLE IF EXISTS employee_presence CASCADE;', { transaction });

    // Remove added columns (optional - can be kept for safety)
    // Note: Removing enum values in PostgreSQL is complex, so we skip that

    await transaction.commit();
    console.log('Rollback completed.');
    return true;

  } catch (error) {
    await transaction.rollback();
    console.error('Rollback failed:', error);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'down') {
    down()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    up()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = { up, down };
