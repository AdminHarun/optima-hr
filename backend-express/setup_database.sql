-- PostgreSQL Database Setup for Optima HR
-- Run this script to create the database and tables

-- Create database (run as postgres user)
-- CREATE DATABASE optima_hr;

-- Connect to optima_hr database first
\c optima_hr;

-- Create employees table
CREATE TABLE IF NOT EXISTS employees_employee (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,

    -- Personal information
    tc_no VARCHAR(11),
    birth_date DATE,
    birth_place VARCHAR(100),
    blood_type VARCHAR(5),

    -- Address information
    address TEXT,
    city VARCHAR(100),
    district VARCHAR(100),

    -- Job information
    department VARCHAR(20) CHECK (department IN (
        'CHAT', 'FOLLOW_UP', 'WITHDRAWAL', 'SUPPORT', 'SALES',
        'ACCOUNTING', 'HR', 'IT', 'MARKETING', 'FINANCE',
        'OPERATIONS', 'ADMIN'
    )) NOT NULL,
    position VARCHAR(20) CHECK (position IN (
        'OPERATOR', 'X_OPERATOR', 'SENIOR_OPERATOR', 'EXPERT_OPERATOR',
        'CONSULTANT', 'ASSISTANT_MANAGER', 'MANAGER', 'DIRECTOR',
        'JUNIOR', 'MID', 'SENIOR', 'LEAD', 'C_LEVEL'
    )) NOT NULL,
    job_title VARCHAR(200) NOT NULL,
    hire_date DATE NOT NULL,
    job_description TEXT,

    -- Education information
    school VARCHAR(200),
    graduation_year VARCHAR(4),
    languages VARCHAR(500),

    -- Emergency contact
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    emergency_relation VARCHAR(50),

    -- Financial information
    gross_salary DECIMAL(12,2),
    net_salary DECIMAL(12,2),
    salary DECIMAL(12,2),
    payment_day INTEGER DEFAULT 15,

    -- Bank information
    bank_name VARCHAR(100),
    iban VARCHAR(34),

    -- Crypto wallet addresses
    crypto_addresses JSONB DEFAULT '{}',
    usdt_address VARCHAR(100),

    -- Insurance information
    sgk_no VARCHAR(20),
    insurance_start DATE,

    -- Vehicle information
    license_class VARCHAR(10),
    vehicle_plate VARCHAR(15),

    -- System fields
    is_active BOOLEAN DEFAULT TRUE,
    profile_picture VARCHAR(255),
    deactivated_at TIMESTAMP,
    restored_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create employee documents table
CREATE TABLE IF NOT EXISTS employees_employeedocument (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    file VARCHAR(255) NOT NULL,
    category VARCHAR(20) CHECK (category IN (
        'CV', 'CERTIFICATE', 'DIPLOMA', 'ID',
        'CONTRACT', 'HEALTH', 'OTHER'
    )) DEFAULT 'OTHER',
    size INTEGER NOT NULL,
    mime_type VARCHAR(100),
    uploaded_by_id INTEGER,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (employee_id) REFERENCES employees_employee(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employee_id ON employees_employee(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_email ON employees_employee(email);
CREATE INDEX IF NOT EXISTS idx_employee_department ON employees_employee(department);
CREATE INDEX IF NOT EXISTS idx_employee_active ON employees_employee(is_active);
CREATE INDEX IF NOT EXISTS idx_document_employee_id ON employees_employeedocument(employee_id);
CREATE INDEX IF NOT EXISTS idx_document_category ON employees_employeedocument(category);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON employees_employee
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample admin user (optional)
INSERT INTO employees_employee (
    employee_id, first_name, last_name, email, phone,
    department, position, job_title, hire_date
) VALUES (
    'ADMIN001', 'System', 'Administrator', 'admin@optima.com', '+90 555 000 0001',
    'IT', 'C_LEVEL', 'System Administrator', CURRENT_DATE
) ON CONFLICT (employee_id) DO NOTHING;

COMMIT;