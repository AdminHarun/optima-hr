const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// PostgreSQL bağlantı bilgileri
const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '12345',
  database: 'optima_hr'
};

class SQLInjector {
  constructor() {
    this.client = null;
  }

  async connect() {
    this.client = new Client(dbConfig);
    await this.client.connect();
    console.log('✅ PostgreSQL bağlantısı kuruldu');
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      console.log('🔌 PostgreSQL bağlantısı kapatıldı');
    }
  }

  // SQL dosyasından komutları çalıştır
  async executeFromFile(filePath) {
    try {
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      await this.executeSQL(sqlContent);
      console.log(`✅ ${filePath} dosyası başarıyla çalıştırıldı`);
    } catch (error) {
      console.error(`❌ ${filePath} dosyası çalıştırılırken hata:`, error.message);
    }
  }

  // Direkt SQL komutu çalıştır
  async executeSQL(sql) {
    try {
      const result = await this.client.query(sql);
      console.log('✅ SQL komutu başarıyla çalıştırıldı');

      if (result.rows && result.rows.length > 0) {
        console.log('📊 Sonuç:');
        console.table(result.rows);
      }

      return result;
    } catch (error) {
      console.error('❌ SQL hatası:', error.message);
      throw error;
    }
  }

  // Mevcut tabloları listele
  async listTables() {
    const sql = `
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `;

    console.log('📋 Mevcut tablolar:');
    await this.executeSQL(sql);
  }

  // Tablo yapısını göster
  async describeTable(tableName) {
    const sql = `
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = '${tableName}'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    console.log(`📋 ${tableName} tablosu yapısı:`);
    await this.executeSQL(sql);
  }

  // Örnek tablo oluştur
  async createSampleTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS sample_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Trigger oluştur (otomatik updated_at güncelleme)
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_sample_users_updated_at ON sample_users;
      CREATE TRIGGER update_sample_users_updated_at
          BEFORE UPDATE ON sample_users
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      -- Index oluştur
      CREATE INDEX IF NOT EXISTS idx_sample_users_email ON sample_users(email);
      CREATE INDEX IF NOT EXISTS idx_sample_users_username ON sample_users(username);
      CREATE INDEX IF NOT EXISTS idx_sample_users_active ON sample_users(is_active);
    `;

    console.log('🔧 Örnek kullanıcı tablosu oluşturuluyor...');
    await this.executeSQL(sql);
  }

  // Örnek veri ekle
  async insertSampleData() {
    const sql = `
      INSERT INTO sample_users (username, email, password_hash, first_name, last_name, phone, role)
      VALUES
        ('admin', 'admin@optima.com', 'hashed_password_123', 'Admin', 'User', '+90 555 000 0001', 'admin'),
        ('furkan', 'furkan@optima.com', 'hashed_password_456', 'Furkan', 'Manager', '+90 555 000 0002', 'manager'),
        ('test_user', 'test@optima.com', 'hashed_password_789', 'Test', 'User', '+90 555 000 0003', 'user')
      ON CONFLICT (username) DO NOTHING;
    `;

    console.log('📝 Örnek veriler ekleniyor...');
    await this.executeSQL(sql);
  }

  // Kapsamlı HR tablolarını oluştur
  async createHRTables() {
    const sql = `
      -- Departmanlar tablosu
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        manager_id INTEGER,
        budget DECIMAL(15,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Pozisyonlar tablosu
      CREATE TABLE IF NOT EXISTS positions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
        min_salary DECIMAL(12,2),
        max_salary DECIMAL(12,2),
        requirements TEXT,
        responsibilities TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- İzin türleri tablosu
      CREATE TABLE IF NOT EXISTS leave_types (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        max_days_per_year INTEGER DEFAULT 30,
        is_paid BOOLEAN DEFAULT TRUE,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- İzin talepleri tablosu
      CREATE TABLE IF NOT EXISTS leave_requests (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees_employee(id) ON DELETE CASCADE,
        leave_type_id INTEGER REFERENCES leave_types(id),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        days_requested INTEGER NOT NULL,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
        approved_by INTEGER REFERENCES employees_employee(id),
        approved_at TIMESTAMP WITH TIME ZONE,
        comments TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Bordro tablosu
      CREATE TABLE IF NOT EXISTS payroll (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees_employee(id) ON DELETE CASCADE,
        pay_period_start DATE NOT NULL,
        pay_period_end DATE NOT NULL,
        basic_salary DECIMAL(12,2) NOT NULL,
        overtime_hours DECIMAL(5,2) DEFAULT 0,
        overtime_rate DECIMAL(8,2) DEFAULT 0,
        bonus DECIMAL(12,2) DEFAULT 0,
        deductions DECIMAL(12,2) DEFAULT 0,
        tax_deduction DECIMAL(12,2) DEFAULT 0,
        social_security DECIMAL(12,2) DEFAULT 0,
        gross_pay DECIMAL(12,2) NOT NULL,
        net_pay DECIMAL(12,2) NOT NULL,
        paid_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Performans değerlendirme tablosu
      CREATE TABLE IF NOT EXISTS performance_reviews (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees_employee(id) ON DELETE CASCADE,
        reviewer_id INTEGER REFERENCES employees_employee(id),
        review_period_start DATE NOT NULL,
        review_period_end DATE NOT NULL,
        overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
        goals_achievement INTEGER CHECK (goals_achievement BETWEEN 1 AND 5),
        communication_skills INTEGER CHECK (communication_skills BETWEEN 1 AND 5),
        teamwork INTEGER CHECK (teamwork BETWEEN 1 AND 5),
        technical_skills INTEGER CHECK (technical_skills BETWEEN 1 AND 5),
        strengths TEXT,
        areas_for_improvement TEXT,
        goals_next_period TEXT,
        comments TEXT,
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'final')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Eğitim kayıtları tablosu
      CREATE TABLE IF NOT EXISTS training_records (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER REFERENCES employees_employee(id) ON DELETE CASCADE,
        training_name VARCHAR(200) NOT NULL,
        training_type VARCHAR(50) NOT NULL,
        provider VARCHAR(100),
        start_date DATE,
        end_date DATE,
        duration_hours INTEGER,
        cost DECIMAL(10,2),
        status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
        certificate_url VARCHAR(500),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Indexler
      CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id);
      CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
      CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id);
      CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(pay_period_start, pay_period_end);
      CREATE INDEX IF NOT EXISTS idx_performance_employee ON performance_reviews(employee_id);
      CREATE INDEX IF NOT EXISTS idx_training_employee ON training_records(employee_id);
    `;

    console.log('🏢 Kapsamlı HR tabloları oluşturuluyor...');
    await this.executeSQL(sql);
  }

  // Örnek HR verilerini ekle
  async insertHRSampleData() {
    const sql = `
      -- Departmanlar
      INSERT INTO departments (name, description, budget) VALUES
        ('İnsan Kaynakları', 'İK işlemleri ve personel yönetimi', 500000.00),
        ('Bilgi İşlem', 'IT altyapı ve yazılım geliştirme', 1000000.00),
        ('Muhasebe', 'Mali işler ve finansal raporlama', 300000.00),
        ('Satış', 'Satış ve pazarlama faaliyetleri', 800000.00),
        ('Destek', 'Müşteri destek hizmetleri', 400000.00)
      ON CONFLICT (name) DO NOTHING;

      -- İzin türleri
      INSERT INTO leave_types (name, max_days_per_year, is_paid, description) VALUES
        ('Yıllık İzin', 30, true, 'Yıllık ücretli izin hakkı'),
        ('Hastalık İzni', 15, true, 'Sağlık raporu ile alınan izin'),
        ('Doğum İzni', 120, true, 'Doğum öncesi ve sonrası izin'),
        ('Babalık İzni', 10, true, 'Baba adayları için özel izin'),
        ('Mazeret İzni', 5, false, 'Özel durumlar için ücretsiz izin'),
        ('Eğitim İzni', 10, true, 'Mesleki gelişim için eğitim izni')
      ON CONFLICT (name) DO NOTHING;
    `;

    console.log('📝 HR örnek verileri ekleniyor...');
    await this.executeSQL(sql);
  }
}

// Ana fonksiyon
async function main() {
  const injector = new SQLInjector();

  try {
    await injector.connect();

    // Komut satırı argümanlarını kontrol et
    const args = process.argv.slice(2);
    const command = args[0];

    switch(command) {
      case 'list':
        await injector.listTables();
        break;

      case 'describe':
        const tableName = args[1];
        if (!tableName) {
          console.log('❌ Tablo adı belirtilmedi. Kullanım: node sql_injector.js describe <table_name>');
          break;
        }
        await injector.describeTable(tableName);
        break;

      case 'sample':
        await injector.createSampleTable();
        await injector.insertSampleData();
        break;

      case 'hr':
        await injector.createHRTables();
        await injector.insertHRSampleData();
        break;

      case 'file':
        const filePath = args[1];
        if (!filePath) {
          console.log('❌ Dosya yolu belirtilmedi. Kullanım: node sql_injector.js file <path>');
          break;
        }
        await injector.executeFromFile(filePath);
        break;

      case 'sql':
        const sqlCommand = args.slice(1).join(' ');
        if (!sqlCommand) {
          console.log('❌ SQL komutu belirtilmedi. Kullanım: node sql_injector.js sql "SELECT * FROM users"');
          break;
        }
        await injector.executeSQL(sqlCommand);
        break;

      default:
        console.log(`
🚀 SQL Injector - PostgreSQL Tablo Yöneticisi

Kullanım:
  node sql_injector.js list                    - Mevcut tabloları listele
  node sql_injector.js describe <table_name>   - Tablo yapısını göster
  node sql_injector.js sample                  - Örnek kullanıcı tablosu oluştur
  node sql_injector.js hr                      - Kapsamlı HR tabloları oluştur
  node sql_injector.js file <path>             - SQL dosyası çalıştır
  node sql_injector.js sql "SELECT..."         - Direkt SQL komutu çalıştır

Örnekler:
  node sql_injector.js list
  node sql_injector.js describe employees_employee
  node sql_injector.js sql "SELECT COUNT(*) FROM employees_employee"
  node sql_injector.js file ./custom_tables.sql
        `);
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
  } finally {
    await injector.disconnect();
  }
}

// Sadece direkt çalıştırıldığında main fonksiyonunu çağır
if (require.main === module) {
  main();
}

module.exports = SQLInjector;