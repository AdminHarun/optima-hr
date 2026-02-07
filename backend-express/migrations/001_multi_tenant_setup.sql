-- ================================================
-- OPTIMA HR - MULTI-TENANT MIGRATION
-- Mevcut sistemi multi-site yapıya geçiriyoruz
-- ================================================

-- 1. SITES TABLOSU OLUŞTUR
CREATE TABLE IF NOT EXISTS sites (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    domain VARCHAR(100),
    logo_url VARCHAR(255),
    brand_color VARCHAR(7) DEFAULT '#1C61AB',
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Varsayılan siteleri ekle
INSERT INTO sites (code, name, is_active) VALUES 
    ('FXB', 'FIXBET', TRUE),
    ('MTD', 'MATADORBET', TRUE),
    ('ZBH', 'ZBahis', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 2. PERMISSIONS TABLOSU (Global)
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    is_critical BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Temel permission'ları ekle
INSERT INTO permissions (key, module, action, display_name, is_critical, display_order) VALUES
    -- Başvurular
    ('applications:view_all', 'applications', 'view_all', 'Tüm başvuruları görebilir', FALSE, 1),
    ('applications:view_assigned', 'applications', 'view_assigned', 'Atanan başvuruları görebilir', FALSE, 2),
    ('applications:update', 'applications', 'update', 'Başvuru durumunu değiştirebilir', FALSE, 3),
    ('applications:hire', 'applications', 'hire', 'İşe alabilir', TRUE, 4),
    ('applications:delete', 'applications', 'delete', 'Başvuru silebilir', TRUE, 5),
    ('applications:export', 'applications', 'export', 'Excel''e aktarabilir', FALSE, 6),
    
    -- Chat
    ('chat:view', 'chat', 'view', 'Chat görebilir', FALSE, 10),
    ('chat:create', 'chat', 'create', 'Yeni sohbet başlatabilir', FALSE, 11),
    ('chat:send', 'chat', 'send', 'Mesaj gönderebilir', FALSE, 12),
    ('chat:moderate', 'chat', 'moderate', 'Tüm mesajları görebilir (Moderasyon)', TRUE, 13),
    ('chat:delete', 'chat', 'delete', 'Mesaj silebilir', TRUE, 14),
    
    -- Video
    ('video:initiate', 'video', 'initiate', 'Görüşme başlatabilir', FALSE, 20),
    ('video:record', 'video', 'record', 'Kayıt başlatabilir', TRUE, 21),
    ('video:view_recordings', 'video', 'view_recordings', 'Kayıtları görebilir', FALSE, 22),
    ('video:delete_recordings', 'video', 'delete_recordings', 'Kayıtları silebilir', TRUE, 23),
    ('video:view_participant_info', 'video', 'view_participant_info', 'IP/VPN bilgilerini görebilir', FALSE, 24),
    
    -- Gruplar
    ('groups:view', 'groups', 'view', 'Grupları görebilir', FALSE, 30),
    ('groups:create', 'groups', 'create', 'Grup oluşturabilir', FALSE, 31),
    ('groups:delete', 'groups', 'delete', 'Grup silebilir', TRUE, 32),
    ('groups:manage_members', 'groups', 'manage_members', 'Üye ekleyip çıkarabilir', FALSE, 33),
    
    -- Raporlar
    ('reports:view_own', 'reports', 'view_own', 'Kendi raporlarını görebilir', FALSE, 40),
    ('reports:view_site', 'reports', 'view_site', 'Tüm site raporlarını görebilir', FALSE, 41),
    ('reports:export', 'reports', 'export', 'Rapor indirebilir', FALSE, 42),
    
    -- Kullanıcı Yönetimi
    ('users:view', 'users', 'view', 'Kullanıcıları görebilir', FALSE, 50),
    ('users:create', 'users', 'create', 'Kullanıcı ekleyebilir', TRUE, 51),
    ('users:update', 'users', 'update', 'Kullanıcı düzenleyebilir', FALSE, 52),
    ('users:delete', 'users', 'delete', 'Kullanıcı silebilir', TRUE, 53),
    ('users:assign_permissions', 'users', 'assign_permissions', 'Yetki atayabilir', TRUE, 54),
    
    -- Site Yönetimi (Sadece Süper Admin)
    ('sites:view_all', 'sites', 'view_all', 'Tüm siteleri görebilir', FALSE, 60),
    ('sites:create', 'sites', 'create', 'Yeni site oluşturabilir', TRUE, 61),
    ('sites:update', 'sites', 'update', 'Site ayarlarını değiştirebilir', FALSE, 62),
    ('sites:toggle_active', 'sites', 'toggle_active', 'Site aktif/pasif yapabilir', TRUE, 63)
ON CONFLICT (key) DO NOTHING;

-- 3. USER_PERMISSIONS TABLOSU
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,  -- Şimdilik email ile, sonra user_id olacak
    site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
    permission_key VARCHAR(100) REFERENCES permissions(key) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT TRUE,
    granted_by VARCHAR(255),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, site_id, permission_key)
);

-- 4. MEVCUT TABLOLARA site_id EKLE

-- applicant_profiles
ALTER TABLE applicant_profiles 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);

-- job_applications
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);

-- chat_rooms
ALTER TABLE chat_rooms 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);

-- chat_messages
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);

-- invitation_links
ALTER TABLE invitation_links 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);

-- employees_employee
ALTER TABLE employees_employee 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);

-- employees_employeedocument
ALTER TABLE employees_employeedocument 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);

-- 5. MEVCUT VERİLERİ FIXBET'E ATA
UPDATE applicant_profiles SET site_id = 1 WHERE site_id IS NULL;
UPDATE job_applications SET site_id = 1 WHERE site_id IS NULL;
UPDATE chat_rooms SET site_id = 1 WHERE site_id IS NULL;
UPDATE chat_messages SET site_id = 1 WHERE site_id IS NULL;
UPDATE invitation_links SET site_id = 1 WHERE site_id IS NULL;
UPDATE employees_employee SET site_id = 1 WHERE site_id IS NULL;
UPDATE employees_employeedocument SET site_id = 1 WHERE site_id IS NULL;

-- 6. site_id'yi NOT NULL YAP
ALTER TABLE applicant_profiles ALTER COLUMN site_id SET NOT NULL;
ALTER TABLE job_applications ALTER COLUMN site_id SET NOT NULL;
ALTER TABLE chat_rooms ALTER COLUMN site_id SET NOT NULL;
ALTER TABLE chat_messages ALTER COLUMN site_id SET NOT NULL;
ALTER TABLE invitation_links ALTER COLUMN site_id SET NOT NULL;
ALTER TABLE employees_employee ALTER COLUMN site_id SET NOT NULL;
ALTER TABLE employees_employeedocument ALTER COLUMN site_id SET NOT NULL;

-- 7. INDEX'LER EKLE (Performans için)
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_site ON applicant_profiles(site_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_site ON job_applications(site_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_site ON chat_rooms(site_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_site ON chat_messages(site_id);
CREATE INDEX IF NOT EXISTS idx_invitation_links_site ON invitation_links(site_id);
CREATE INDEX IF NOT EXISTS idx_employees_site ON employees_employee(site_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_site ON user_permissions(site_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_email ON user_permissions(user_email);

-- 8. AUDIT LOG TABLOSU (İz kaydı)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES sites(id),
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INTEGER,
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_site ON audit_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- 9. UPDATE TRIGGER (updated_at otomatik güncelle)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- MIGRATION TAMAMLANDI!
-- Şimdi kontrol et:
SELECT 'Migration completed!' as status;
SELECT code, name, is_active FROM sites;
SELECT COUNT(*) as total_permissions FROM permissions;
