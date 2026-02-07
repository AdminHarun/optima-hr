// databaseMigrationService.js - Database Migration & Table Creation Service
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || '172.22.207.103',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'optima_hr',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '12345'
});

class DatabaseMigrationService {
  /**
   * Run all migrations and create missing tables
   */
  async runMigrations() {
    console.log('🔄 Starting database migrations...');

    try {
      // Only drop tables if FORCE_DROP_TABLES env is set
      if (process.env.FORCE_DROP_TABLES === 'true') {
        console.log('🗑️  FORCE_DROP_TABLES=true - Dropping existing recruitment tables...');
        const dropSqlFilePath = path.join(__dirname, '../scripts/drop-recruitment-tables.sql');
        const dropSqlContent = fs.readFileSync(dropSqlFilePath, 'utf8');
        await pool.query(dropSqlContent);
        console.log('✅ Existing tables dropped successfully');
      } else {
        console.log('ℹ️  FORCE_DROP_TABLES not set - Skipping table drop (safe mode)');
      }

      // Read and execute SQL file (CREATE TABLE IF NOT EXISTS)
      console.log('🔄 Creating missing tables...');
      const sqlFilePath = path.join(__dirname, '../scripts/check-and-create-tables.sql');
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

      await pool.query(sqlContent);

      console.log('✅ All database tables checked and created successfully!');

      // Verify tables
      await this.verifyTables();

      return true;
    } catch (error) {
      console.error('❌ Error running migrations:', error);
      throw error;
    }
  }

  /**
   * Verify all required tables exist
   */
  async verifyTables() {
    const requiredTables = [
      'invitation_links',
      'applicant_profiles',
      'job_applications',
      'application_documents',
      'employees_employee',
      'employees_employeedocument',
      'chat_rooms',
      'chat_messages',
      'video_calls',
      'video_call_participants',
      'security_tracking',
      'audit_logs',
      'application_timeline'
    ];

    try {
      const result = await pool.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      const existingTables = result.rows.map(row => row.table_name);

      console.log('\n📊 Database Tables Status:');
      console.log('='.repeat(50));

      requiredTables.forEach(table => {
        const exists = existingTables.includes(table);
        const status = exists ? '✅' : '❌';
        console.log(`${status} ${table}`);
      });

      const missingTables = requiredTables.filter(t => !existingTables.includes(t));

      if (missingTables.length > 0) {
        console.log('\n⚠️  Missing tables:', missingTables.join(', '));
      } else {
        console.log('\n✅ All required tables exist!');
      }

      console.log('='.repeat(50));

      return {
        all: existingTables,
        required: requiredTables,
        missing: missingTables
      };
    } catch (error) {
      console.error('❌ Error verifying tables:', error);
      throw error;
    }
  }

  /**
   * Get table counts
   */
  async getTableCounts() {
    try {
      const tables = [
        'invitation_links',
        'applicant_profiles',
        'job_applications',
        'application_documents',
        'employees_employee',
        'chat_rooms',
        'chat_messages',
        'video_calls',
        'security_tracking',
        'audit_logs'
      ];

      console.log('\n📈 Table Record Counts:');
      console.log('='.repeat(50));

      for (const table of tables) {
        try {
          const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
          const count = result.rows[0].count;
          console.log(`${table.padEnd(30)} : ${count} records`);
        } catch (err) {
          console.log(`${table.padEnd(30)} : Table not found`);
        }
      }

      console.log('='.repeat(50));
    } catch (error) {
      console.error('❌ Error getting table counts:', error);
    }
  }

  /**
   * Create audit log entry
   */
  async createAuditLog({ userId, userType, userEmail, action, entityType, entityId, changes, description, ipAddress }) {
    try {
      const query = `
        INSERT INTO audit_logs (
          user_id, user_type, user_email, action, entity_type, entity_id,
          changes, description, ip_address
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const result = await pool.query(query, [
        userId,
        userType,
        userEmail,
        action,
        entityType,
        entityId,
        JSON.stringify(changes),
        description,
        ipAddress
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating audit log:', error);
      // Don't throw - audit logs should not break the main flow
    }
  }

  /**
   * Track security event
   */
  async trackSecurity({ userId, userType, ipAddress, macAddress, browserFingerprint, userAgent, actionType, actionDetails }) {
    try {
      const query = `
        INSERT INTO security_tracking (
          user_id, user_type, ip_address, mac_address, browser_fingerprint,
          user_agent, action_type, action_details
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await pool.query(query, [
        userId,
        userType,
        ipAddress,
        macAddress,
        browserFingerprint,
        userAgent,
        actionType,
        JSON.stringify(actionDetails)
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error tracking security:', error);
    }
  }

  /**
   * Add timeline event for application
   */
  async addApplicationTimelineEvent({ applicationId, eventType, eventTitle, eventDescription, actorId, actorName, actorType, eventData }) {
    try {
      const query = `
        INSERT INTO application_timeline (
          application_id, event_type, event_title, event_description,
          actor_id, actor_name, actor_type, event_data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await pool.query(query, [
        applicationId,
        eventType,
        eventTitle,
        eventDescription,
        actorId,
        actorName,
        actorType,
        JSON.stringify(eventData)
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error adding timeline event:', error);
    }
  }
}

module.exports = new DatabaseMigrationService();
