-- Migration: Multi-Tenant System
-- Date: 2026-01-21
-- Description: Adds sites table and site_id to all tables

-- ============================================
-- 1. CREATE SITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sites (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    domain VARCHAR(100),
    logo_url VARCHAR(255),
    brand_color VARCHAR(20) DEFAULT '#1C61AB',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default sites
INSERT INTO sites (code, name, is_active) VALUES 
    ('FXB', 'FIXBET', true),
    ('MTD', 'MATADORBET', true),
    ('ZBH', 'ZBahis', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 2. ADD SITE_ID TO EXISTING TABLES
-- ============================================

-- Applicant Profiles
ALTER TABLE applicant_profiles 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);

-- Update existing records to FIXBET (id=1)
UPDATE applicant_profiles SET site_id = 1 WHERE site_id IS NULL;

-- Make it required
ALTER TABLE applicant_profiles 
ALTER COLUMN site_id SET NOT NULL;

-- Job Applications
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);

UPDATE job_applications SET site_id = 1 WHERE site_id IS NULL;

ALTER TABLE job_applications 
ALTER COLUMN site_id SET NOT NULL;

-- Invitation Links
ALTER TABLE invitation_links 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);

UPDATE invitation_links SET site_id = 1 WHERE site_id IS NULL;

ALTER TABLE invitation_links 
ALTER COLUMN site_id SET NOT NULL;

-- Chat Rooms
ALTER TABLE chat_rooms 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);

UPDATE chat_rooms SET site_id = 1 WHERE site_id IS NULL;

ALTER TABLE chat_rooms 
ALTER COLUMN site_id SET NOT NULL;

-- Chat Messages
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);

UPDATE chat_messages SET site_id = 1 WHERE site_id IS NULL;

ALTER TABLE chat_messages 
ALTER COLUMN site_id SET NOT NULL;

-- Employees
ALTER TABLE employees_employee 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);

UPDATE employees_employee SET site_id = 1 WHERE site_id IS NULL;

ALTER TABLE employees_employee 
ALTER COLUMN site_id SET NOT NULL;

-- Employee Documents
ALTER TABLE employees_employeedocument 
ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES sites(id);

UPDATE employees_employeedocument SET site_id = 1 WHERE site_id IS NULL;

-- ============================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_site ON applicant_profiles(site_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_site ON job_applications(site_id);
CREATE INDEX IF NOT EXISTS idx_invitation_links_site ON invitation_links(site_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_site ON chat_rooms(site_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_site ON chat_messages(site_id);
CREATE INDEX IF NOT EXISTS idx_employees_site ON employees_employee(site_id);

-- ============================================
-- 4. PERMISSIONS SYSTEM
-- ============================================

-- Permissions table (global - all modules and actions)
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    is_critical BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Permissions (user-specific permissions per site)
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    site_id INTEGER REFERENCES sites(id),
    permission_key VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    granted_by VARCHAR(255),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_email, site_id, permission_key)
);

-- Insert default permissions
INSERT INTO permissions (key, module, action, display_name, is_critical, display_order) VALUES
    -- Applications Module
    ('applications:view_all', 'applications', 'view_all', 'Tüm başvuruları görebilir', false, 1),
    ('applications:view_assigned', 'applications', 'view_assigned', 'Atanan başvuruları görebilir', false, 2),
    ('applications:update', 'applications', 'update', 'Başvuru durumunu değiştirebilir', false, 3),
    ('applications:hire', 'applications', 'hire', 'İşe alabilir', true, 4),
    ('applications:reject', 'applications', 'reject', 'Reddedebilir', false, 5),
    ('applications:delete', 'applications', 'delete', 'Başvuru silebilir', true, 6),
    ('applications:comment', 'applications', 'comment', 'Not ekleyebilir', false, 7),
    ('applications:export', 'applications', 'export', 'Excel\'e aktarabilir', false, 8),
    
    -- Chat Module
    ('chat:view', 'chat', 'view', 'Chat görebilir', false, 10),
    ('chat:create', 'chat', 'create', 'Yeni sohbet başlatabilir', false, 11),
    ('chat:send', 'chat', 'send', 'Mesaj gönderebilir', false, 12),
    ('chat:moderate', 'chat', 'moderate', 'Tüm mesajları görebilir (Moderasyon)', true, 13),
    ('chat:delete_own', 'chat', 'delete_own', 'Kendi mesajını silebilir', false, 14),
    ('chat:delete_any', 'chat', 'delete_any', 'Herkesin mesajını silebilir', true, 15),
    ('chat:block_user', 'chat', 'block_user', 'Kullanıcı engelleyebilir', true, 16),
    ('chat:export', 'chat', 'export', 'Chat geçmişini indirebilir', false, 17),
    
    -- Video Call Module
    ('video:initiate', 'video', 'initiate', 'Görüşme başlatabilir', false, 20),
    ('video:join', 'video', 'join', 'Görüşmeye katılabilir', false, 21),
    ('video:record', 'video', 'record', 'Kayıt başlatabilir', true, 22),
    ('video:view_recordings', 'video', 'view_recordings', 'Kayıtları görebilir', false, 23),
    ('video:download_recordings', 'video', 'download_recordings', 'Kayıtları indirebilir', false, 24),
    ('video:delete_recordings', 'video', 'delete_recordings', 'Kayıtları silebilir', true, 25),
    ('video:view_participant_info', 'video', 'view_participant_info', 'IP/cihaz bilgilerini görebilir', false, 26),
    ('video:screen_share', 'video', 'screen_share', 'Ekran paylaşabilir', false, 27),
    
    -- Groups Module
    ('groups:view', 'groups', 'view', 'Grupları görebilir', false, 30),
    ('groups:create', 'groups', 'create', 'Grup oluşturabilir', false, 31),
    ('groups:delete', 'groups', 'delete', 'Grup silebilir', true, 32),
    ('groups:add_member', 'groups', 'add_member', 'Üye ekleyebilir', false, 33),
    ('groups:remove_member', 'groups', 'remove_member', 'Üye çıkarabilir', false, 34),
    ('groups:start_training', 'groups', 'start_training', 'Eğitim başlatabilir', false, 35),
    
    -- Reports Module
    ('reports:view_own', 'reports', 'view_own', 'Kendi raporlarını görebilir', false, 40),
    ('reports:view_site', 'reports', 'view_site', 'Tüm site raporlarını görebilir', false, 41),
    ('reports:view_all_sites', 'reports', 'view_all_sites', 'Tüm sitelerin raporlarını görebilir', true, 42),
    ('reports:export', 'reports', 'export', 'Rapor indirebilir', false, 43),
    
    -- Users Module
    ('users:view', 'users', 'view', 'Kullanıcıları görebilir', false, 50),
    ('users:create', 'users', 'create', 'Kullanıcı ekleyebilir', true, 51),
    ('users:update', 'users', 'update', 'Kullanıcı bilgilerini değiştirebilir', false, 52),
    ('users:delete', 'users', 'delete', 'Kullanıcı silebilir', true, 53),
    ('users:assign_permissions', 'users', 'assign_permissions', 'Yetki atayabilir', true, 54),
    
    -- Sites Module (Super Admin only)
    ('sites:view_all', 'sites', 'view_all', 'Tüm siteleri görebilir', true, 60),
    ('sites:create', 'sites', 'create', 'Yeni site oluşturabilir', true, 61),
    ('sites:update', 'sites', 'update', 'Site ayarlarını değiştirebilir', true, 62),
    ('sites:deactivate', 'sites', 'deactivate', 'Site pasif yapabilir', true, 63)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 5. AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES sites(id),
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_site ON audit_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
