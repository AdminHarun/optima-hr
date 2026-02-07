const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration...');
    
    const migrationPath = path.join(__dirname, '../migrations/001_add_multi_tenant.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Checking results...');
    
    // Check sites
    const sitesResult = await client.query('SELECT * FROM sites');
    console.log(`\n✅ Sites created: ${sitesResult.rows.length}`);
    sitesResult.rows.forEach(site => {
      console.log(`   - ${site.code}: ${site.name}`);
    });
    
    // Check permissions
    const permsResult = await client.query('SELECT COUNT(*) FROM permissions');
    console.log(`\n✅ Permissions created: ${permsResult.rows[0].count}`);
    
    console.log('\n✅ Multi-tenant system ready!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
