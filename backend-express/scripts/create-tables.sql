-- Create database if not exists
-- You may need to run this from postgres database first:
-- CREATE DATABASE optima_hr;

-- Connect to optima_hr database and run the following:

-- Drop tables if they exist (careful - this deletes all data!)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS application_documents CASCADE;
DROP TABLE IF EXISTS job_applications CASCADE;
DROP TABLE IF EXISTS applicant_profiles CASCADE;
DROP TABLE IF EXISTS employee_documents CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS invitation_links CASCADE;

-- Create employees table
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    department VARCHAR(100),
    position VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create employee_documents table
CREATE TABLE employee_documents (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create invitation_links table
CREATE TABLE invitation_links (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    job_title VARCHAR(200) NOT NULL,
    job_description TEXT,
    department VARCHAR(100),
    requirements TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP,
    max_uses INTEGER,
    use_count INTEGER DEFAULT 0,
    created_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create applicant_profiles table
CREATE TABLE applicant_profiles (
    id SERIAL PRIMARY KEY,
    invitation_code VARCHAR(50) REFERENCES invitation_links(code),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    education_level VARCHAR(100),
    work_experience TEXT,
    skills TEXT,
    languages TEXT,
    profile_photo VARCHAR(500),
    resume_path VARCHAR(500),
    cover_letter TEXT,
    linkedin_url VARCHAR(255),
    github_url VARCHAR(255),
    portfolio_url VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create job_applications table
CREATE TABLE job_applications (
    id SERIAL PRIMARY KEY,
    applicant_id INTEGER REFERENCES applicant_profiles(id) ON DELETE CASCADE,
    invitation_code VARCHAR(50) REFERENCES invitation_links(code),
    job_title VARCHAR(200) NOT NULL,
    department VARCHAR(100),
    application_status VARCHAR(50) DEFAULT 'submitted',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by VARCHAR(100),
    notes TEXT,
    score INTEGER,
    interview_date TIMESTAMP,
    interview_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create application_documents table
CREATE TABLE application_documents (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chat_rooms table
CREATE TABLE chat_rooms (
    id SERIAL PRIMARY KEY,
    application_id INTEGER UNIQUE REFERENCES job_applications(id) ON DELETE CASCADE,
    applicant_id INTEGER REFERENCES applicant_profiles(id) ON DELETE CASCADE,
    room_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create chat_messages table
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('applicant', 'admin', 'system')),
    sender_id VARCHAR(100),
    sender_name VARCHAR(200),
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employee_documents_employee_id ON employee_documents(employee_id);
CREATE INDEX idx_invitation_links_code ON invitation_links(code);
CREATE INDEX idx_invitation_links_is_active ON invitation_links(is_active);
CREATE INDEX idx_applicant_profiles_email ON applicant_profiles(email);
CREATE INDEX idx_applicant_profiles_invitation_code ON applicant_profiles(invitation_code);
CREATE INDEX idx_applicant_profiles_status ON applicant_profiles(status);
CREATE INDEX idx_job_applications_applicant_id ON job_applications(applicant_id);
CREATE INDEX idx_job_applications_invitation_code ON job_applications(invitation_code);
CREATE INDEX idx_job_applications_status ON job_applications(application_status);
CREATE INDEX idx_application_documents_application_id ON application_documents(application_id);
CREATE INDEX idx_chat_rooms_application_id ON chat_rooms(application_id);
CREATE INDEX idx_chat_rooms_applicant_id ON chat_rooms(applicant_id);
CREATE INDEX idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Success message
SELECT 'Database tables created successfully!' AS status;
