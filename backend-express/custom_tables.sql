-- Özel tablolar için örnek SQL dosyası
-- Bu dosyayı sql_injector.js ile çalıştırabilirsiniz

-- Şirket tablosu
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    tax_number VARCHAR(20) UNIQUE,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(200),
    industry VARCHAR(100),
    employee_count INTEGER DEFAULT 0,
    founded_year INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projeler tablosu
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    client_company_id INTEGER REFERENCES companies(id),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'planning'
        CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Proje katılımcıları tablosu
CREATE TABLE IF NOT EXISTS project_participants (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees_employee(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'manager', 'developer', 'analyst', etc.
    hourly_rate DECIMAL(8,2),
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, employee_id)
);

-- Zaman takibi tablosu
CREATE TABLE IF NOT EXISTS time_tracking (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees_employee(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    task_description TEXT,
    work_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    hours_worked DECIMAL(4,2),
    is_billable BOOLEAN DEFAULT TRUE,
    notes TEXT,
    approved_by INTEGER REFERENCES employees_employee(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Müşteri geri bildirimleri tablosu
CREATE TABLE IF NOT EXISTS customer_feedback (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    customer_name VARCHAR(100),
    customer_email VARCHAR(100),
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback_type VARCHAR(20) DEFAULT 'general'
        CHECK (feedback_type IN ('general', 'bug_report', 'feature_request', 'complaint', 'compliment')),
    title VARCHAR(200),
    message TEXT,
    status VARCHAR(20) DEFAULT 'open'
        CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    assigned_to INTEGER REFERENCES employees_employee(id),
    priority VARCHAR(10) DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Envanter tablosu
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100) UNIQUE,
    purchase_date DATE,
    purchase_price DECIMAL(12,2),
    warranty_end_date DATE,
    assigned_to INTEGER REFERENCES employees_employee(id),
    location VARCHAR(100),
    condition VARCHAR(20) DEFAULT 'good'
        CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'broken')),
    status VARCHAR(20) DEFAULT 'available'
        CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Toplantılar tablosu
CREATE TABLE IF NOT EXISTS meetings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    meeting_type VARCHAR(20) DEFAULT 'general'
        CHECK (meeting_type IN ('general', 'project', 'department', 'one_on_one', 'client', 'board')),
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(200),
    is_virtual BOOLEAN DEFAULT FALSE,
    meeting_link VARCHAR(500),
    organizer_id INTEGER REFERENCES employees_employee(id),
    status VARCHAR(20) DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    agenda TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Toplantı katılımcıları tablosu
CREATE TABLE IF NOT EXISTS meeting_participants (
    id SERIAL PRIMARY KEY,
    meeting_id INTEGER REFERENCES meetings(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees_employee(id) ON DELETE CASCADE,
    participation_type VARCHAR(20) DEFAULT 'required'
        CHECK (participation_type IN ('required', 'optional', 'organizer')),
    response VARCHAR(20) DEFAULT 'pending'
        CHECK (response IN ('pending', 'accepted', 'declined', 'tentative')),
    attended BOOLEAN,
    response_date TIMESTAMP WITH TIME ZONE,
    UNIQUE(meeting_id, employee_id)
);

-- İndeksler oluştur
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_company_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_employee ON time_tracking(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_project ON time_tracking(project_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_date ON time_tracking(work_date);
CREATE INDEX IF NOT EXISTS idx_feedback_project ON customer_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON customer_feedback(status);
CREATE INDEX IF NOT EXISTS idx_inventory_assigned ON inventory(assigned_to);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_meetings_organizer ON meetings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_datetime ON meetings(start_datetime);

-- Örnek veriler ekle
INSERT INTO companies (name, tax_number, industry, employee_count) VALUES
    ('ABC Teknoloji A.Ş.', '1234567890', 'Yazılım', 150),
    ('XYZ İnşaat Ltd.', '0987654321', 'İnşaat', 75),
    ('DEF Danışmanlık', '1122334455', 'Danışmanlık', 25)
ON CONFLICT (tax_number) DO NOTHING;

-- Trigger fonksiyonları
CREATE OR REPLACE FUNCTION update_project_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Proje tamamlanma yüzdesi 100 olduğunda status'u completed yap
    IF NEW.completion_percentage = 100 AND OLD.completion_percentage < 100 THEN
        NEW.status = 'completed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger oluştur
DROP TRIGGER IF EXISTS project_completion_trigger ON projects;
CREATE TRIGGER project_completion_trigger
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_project_completion();

COMMIT;