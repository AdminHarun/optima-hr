-- Optima HR - Complete Database Schema
-- Tüm eksik tabloları kontrol edip oluşturur

-- 1. INVITATION LINKS TABLE (Davet Linkleri)
CREATE TABLE IF NOT EXISTS invitation_links (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(32) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'clicked', 'used', 'expired'
    created_by INTEGER,

    -- Link tıklama bilgileri
    first_clicked_at TIMESTAMP,
    first_clicked_ip VARCHAR(45),
    click_count INTEGER DEFAULT 0,

    -- Form tamamlama bilgileri
    form_completed_at TIMESTAMP,
    form_completed_ip VARCHAR(45),
    applicant_name VARCHAR(200),
    applicant_phone VARCHAR(20),

    -- LocalStorage uyumluluğu için
    "clickedAt" TIMESTAMP,
    "usedAt" TIMESTAMP,
    "ipAddress" VARCHAR(45),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. APPLICANT PROFILES TABLE (Başvuran Profilleri)
CREATE TABLE IF NOT EXISTS applicant_profiles (
    id SERIAL PRIMARY KEY,
    invitation_link_id INTEGER,

    -- Temel profil bilgileri
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,

    -- Session yönetimi
    session_token VARCHAR(64),
    chat_token VARCHAR(64),

    -- Tracking
    profile_created_ip VARCHAR(45),
    profile_created_location VARCHAR(255),
    token VARCHAR(64),
    profile_created_at TIMESTAMP,

    -- Timestamps
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. JOB APPLICATIONS TABLE (İş Başvuruları)
CREATE TABLE IF NOT EXISTS job_applications (
    id SERIAL PRIMARY KEY,
    applicant_profile_id INTEGER,
    invitation_link_id INTEGER,

    -- Kişisel Bilgiler
    tc_number VARCHAR(11),
    birth_date DATE,

    -- Adres Bilgileri
    address TEXT,
    city VARCHAR(100),
    district VARCHAR(100),
    postal_code VARCHAR(10),

    -- Eğitim Bilgileri
    education_level VARCHAR(50),
    university VARCHAR(200),
    department VARCHAR(200),
    graduation_year INTEGER,
    gpa DECIMAL(5, 2),

    -- Deneyim Bilgileri
    has_sector_experience BOOLEAN DEFAULT FALSE,
    experience_level VARCHAR(50),
    last_company VARCHAR(200),
    last_position VARCHAR(200),

    -- Teknik Bilgiler
    internet_download INTEGER,
    internet_upload INTEGER,
    typing_speed INTEGER,
    processor VARCHAR(100),
    ram VARCHAR(50),
    os VARCHAR(100),

    -- Diğer Bilgiler
    source VARCHAR(100),
    has_reference BOOLEAN DEFAULT FALSE,
    reference_name VARCHAR(200),
    kvkk_approved BOOLEAN DEFAULT FALSE,

    -- Sistem Bilgileri
    status VARCHAR(50) DEFAULT 'submitted',
    submitted_ip INET,
    submitted_location JSONB,

    -- Dosya Yolları (Directly stored in job_applications)
    cv_file_path VARCHAR(500),
    cv_file_name VARCHAR(255),
    internet_test_file_path VARCHAR(500),
    internet_test_file_name VARCHAR(255),
    typing_test_file_path VARCHAR(500),
    typing_test_file_name VARCHAR(255),

    -- LocalStorage uyumluluğu
    token VARCHAR(32),
    "profileId" INTEGER,

    -- Timestamps
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. APPLICATION DOCUMENTS TABLE (Başvuru Belgeleri)
-- REMOVED: Files are now stored directly in job_applications table
-- File paths are stored as cv_file_path, internet_test_file_path, typing_test_file_path
/*
CREATE TABLE IF NOT EXISTS application_documents (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL,

    -- Document Info
    document_type VARCHAR(50) NOT NULL, -- 'cv', 'cover_letter', 'certificate', 'diploma', 'reference', 'portfolio', 'other'
    file_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),

    -- Metadata
    uploaded_by VARCHAR(255),
    verified BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(255),
    verified_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/

-- 5. EMPLOYEES TABLE (Çalışanlar - Already exists from Django migration)
-- Checking if exists, if not create
CREATE TABLE IF NOT EXISTS employees_employee (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,

    -- Personal Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(254) UNIQUE NOT NULL,
    phone VARCHAR(20),

    -- Position
    department VARCHAR(50) NOT NULL,
    position VARCHAR(50) NOT NULL,
    hire_date DATE NOT NULL,

    -- Employment
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. EMPLOYEE DOCUMENTS TABLE (Çalışan Belgeleri - Already exists)
CREATE TABLE IF NOT EXISTS employees_employeedocument (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,

    -- Document Info
    category VARCHAR(50) NOT NULL, -- 'contract', 'id', 'tax', 'insurance', 'other'
    title VARCHAR(200) NOT NULL,
    file VARCHAR(100) NOT NULL,
    description TEXT,

    -- Timestamps
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. CHAT ROOMS TABLE (New schema with applicant_id)
CREATE TABLE IF NOT EXISTS chat_rooms (
    id SERIAL PRIMARY KEY,
    room_type VARCHAR(50) DEFAULT 'applicant',
    applicant_id BIGINT,
    applicant_email VARCHAR(255),
    applicant_name VARCHAR(255),
    room_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_message_id INTEGER,
    last_message_at TIMESTAMP,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. CHAT MESSAGES TABLE (Already created)
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    room_id VARCHAR(255) NOT NULL,

    -- Message Content
    content TEXT,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'file', 'image', 'system'

    -- Sender
    sender_id VARCHAR(255),
    sender_type VARCHAR(50), -- 'admin', 'applicant', 'employee'
    sender_name VARCHAR(255),

    -- File Attachment
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size BIGINT,
    file_mime_type VARCHAR(100),

    -- Message Metadata
    metadata JSONB,

    -- Status
    status VARCHAR(50) DEFAULT 'sent', -- 'sending', 'sent', 'delivered', 'read', 'failed'
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Reactions
    reactions JSONB,

    -- Reply
    reply_to_id VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP,
    read_at TIMESTAMP
);

-- 9. VIDEO CALLS TABLE (Already created by videoCallService)
CREATE TABLE IF NOT EXISTS video_calls (
    id SERIAL PRIMARY KEY,
    call_id VARCHAR(255) UNIQUE NOT NULL,
    room_id VARCHAR(255) NOT NULL,
    room_name VARCHAR(255),

    -- Initiator info
    initiator_id VARCHAR(255) NOT NULL,
    initiator_name VARCHAR(255),
    initiator_email VARCHAR(255),

    -- Participant info
    participant_id VARCHAR(255) NOT NULL,
    participant_name VARCHAR(255),
    participant_email VARCHAR(255),

    -- Call details (Daily.co)
    daily_room_name VARCHAR(255),
    daily_room_url VARCHAR(500),
    moderator_id VARCHAR(255),

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'ended', 'missed'

    -- Timestamps
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. VIDEO CALL PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS video_call_participants (
    id SERIAL PRIMARY KEY,
    call_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    duration_seconds INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. SECURITY TRACKING TABLE (IP, MAC, Fingerprint için)
CREATE TABLE IF NOT EXISTS security_tracking (
    id SERIAL PRIMARY KEY,

    -- User Info
    user_id VARCHAR(255) NOT NULL,
    user_type VARCHAR(50) NOT NULL, -- 'applicant', 'employee', 'admin'

    -- Security Data
    ip_address VARCHAR(50),
    mac_address VARCHAR(50),
    browser_fingerprint TEXT,
    user_agent TEXT,

    -- Geolocation
    country VARCHAR(100),
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Device Info
    device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
    os VARCHAR(100),
    browser VARCHAR(100),

    -- Action Tracking
    action_type VARCHAR(100), -- 'login', 'profile_created', 'application_submitted', etc.
    action_details JSONB,

    -- Risk Analysis
    risk_score INTEGER, -- 0-100
    is_suspicious BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. AUDIT LOG TABLE (Tüm sistem aktivitelerini loglar)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,

    -- Actor
    user_id VARCHAR(255),
    user_type VARCHAR(50), -- 'admin', 'employee', 'applicant', 'system'
    user_email VARCHAR(255),

    -- Action
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'view', 'export', etc.
    entity_type VARCHAR(100) NOT NULL, -- 'application', 'profile', 'employee', 'document', etc.
    entity_id VARCHAR(255),

    -- Details
    changes JSONB, -- Before/after values
    description TEXT,

    -- Security
    ip_address VARCHAR(50),
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. APPLICATION TIMELINE TABLE (Başvuru süreci timeline)
CREATE TABLE IF NOT EXISTS application_timeline (
    id SERIAL PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL,

    -- Event
    event_type VARCHAR(100) NOT NULL, -- 'submitted', 'reviewed', 'interview_scheduled', 'offer_made', etc.
    event_title VARCHAR(255) NOT NULL,
    event_description TEXT,

    -- Actor
    actor_id VARCHAR(255),
    actor_name VARCHAR(255),
    actor_type VARCHAR(50), -- 'applicant', 'recruiter', 'system'

    -- Data
    event_data JSONB,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes and constraints
-- Invitation Links indexes
CREATE INDEX IF NOT EXISTS idx_invitation_links_token ON invitation_links(token);
CREATE INDEX IF NOT EXISTS idx_invitation_links_email ON invitation_links(email);
CREATE INDEX IF NOT EXISTS idx_invitation_links_status ON invitation_links(status);

-- Applicant Profiles indexes
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_email ON applicant_profiles(email);
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_invitation_link_id ON applicant_profiles(invitation_link_id);

-- Job Applications indexes
CREATE INDEX IF NOT EXISTS idx_job_applications_applicant_profile_id ON job_applications(applicant_profile_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_invitation_link_id ON job_applications(invitation_link_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_submitted_at ON job_applications(submitted_at);
CREATE INDEX IF NOT EXISTS idx_job_applications_tc_number ON job_applications(tc_number);

-- Application Documents indexes
-- REMOVED: application_documents table no longer exists
-- CREATE INDEX IF NOT EXISTS idx_application_documents_application_id ON application_documents(application_id);
-- CREATE INDEX IF NOT EXISTS idx_application_documents_type ON application_documents(document_type);

-- Security Tracking indexes
CREATE INDEX IF NOT EXISTS idx_security_tracking_user ON security_tracking(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_security_tracking_ip ON security_tracking(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_tracking_action ON security_tracking(action_type);
CREATE INDEX IF NOT EXISTS idx_security_tracking_suspicious ON security_tracking(is_suspicious);

-- Audit Logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Application Timeline indexes
CREATE INDEX IF NOT EXISTS idx_application_timeline_app ON application_timeline(application_id);
CREATE INDEX IF NOT EXISTS idx_application_timeline_type ON application_timeline(event_type);

-- Chat and Video Call indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id, sender_type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_applicant ON chat_rooms(applicant_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_video_calls_room ON video_calls(room_id);
CREATE INDEX IF NOT EXISTS idx_video_calls_status ON video_calls(status);

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'All tables checked and created successfully!';
END $$;
