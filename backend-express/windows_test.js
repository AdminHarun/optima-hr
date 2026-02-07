const { Client } = require('pg');

async function testWindowsConnection() {
  const configs = [
    {
      host: '172.22.207.103',
      port: 5432,
      user: 'postgres',
      password: '12345',
      database: 'optima_hr'
    },
    {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: '12345',
      database: 'optima_hr'
    },
    {
      host: '127.0.0.1',
      port: 5432,
      user: 'postgres',
      password: '12345',
      database: 'optima_hr'
    }
  ];

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const client = new Client(config);

    try {
      console.log(`\n🔄 Test ${i+1}: ${config.host} bağlantısı...`);
      await client.connect();

      const result = await client.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = \'public\'');
      console.log(`✅ Başarılı! ${result.rows[0].table_count} tablo bulundu`);

      const tables = await client.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' ORDER BY table_name');
      console.log('📋 Tablolar:');
      tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

      await client.end();

      console.log(`\n🎯 pgAdmin için kullan:`);
      console.log(`Host: ${config.host}`);
      console.log(`Port: ${config.port}`);
      console.log(`Database: postgres (ilk bağlantı için)`);
      console.log(`Username: ${config.user}`);
      console.log(`Password: ${config.password}`);

      break; // İlk başarılı bağlantıda dur

    } catch (error) {
      console.log(`❌ Başarısız: ${error.message}`);
      await client.end().catch(() => {});
    }
  }
}

testWindowsConnection();