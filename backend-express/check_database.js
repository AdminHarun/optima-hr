const { Client } = require('pg');

// PostgreSQL bağlantı testi ve veritabanı oluşturma
async function setupDatabase() {
  // Önce postgres veritabanına bağlan
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345',
    database: 'postgres' // Default database
  });

  try {
    console.log('🔄 PostgreSQL bağlantısı test ediliyor...');
    await client.connect();
    console.log('✅ PostgreSQL bağlantısı başarılı!');

    // Mevcut veritabanlarını listele
    const result = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
    console.log('📋 Mevcut veritabanları:');
    result.rows.forEach(row => console.log(`  - ${row.datname}`));

    // optima_hr veritabanının varlığını kontrol et
    const dbExists = result.rows.some(row => row.datname === 'optima_hr');

    if (!dbExists) {
      console.log('🔄 optima_hr veritabanı oluşturuluyor...');
      await client.query('CREATE DATABASE optima_hr;');
      console.log('✅ optima_hr veritabanı oluşturuldu!');
    } else {
      console.log('✅ optima_hr veritabanı zaten mevcut!');
    }

    await client.end();

    // Şimdi optima_hr veritabanına bağlan ve test et
    console.log('🔄 optima_hr veritabanına bağlanıyor...');
    const optima_client = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: '12345',
      database: 'optima_hr'
    });

    await optima_client.connect();
    console.log('✅ optima_hr veritabanına başarıyla bağlanıldı!');
    await optima_client.end();

    console.log('🎉 PostgreSQL kurulumu tamamlandı! Express uygulamasını başlatabilirsiniz.');

  } catch (error) {
    console.error('❌ PostgreSQL bağlantı hatası:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('💡 PostgreSQL servisi çalışmıyor olabilir. Kontrol edin:');
      console.log('   - Windows Services\'de postgresql-x64-18 servisinin durumu');
      console.log('   - PostgreSQL\'in port 5432\'de çalışıp çalışmadığı');
    } else if (error.code === '28P01') {
      console.log('💡 Şifre hatası! PostgreSQL şifresini kontrol edin.');
      console.log('   .env dosyasındaki DB_PASSWORD değerini güncelleyin.');
    }
  }
}

setupDatabase();