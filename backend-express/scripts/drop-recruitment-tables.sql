-- Drop all recruitment-related tables in correct order (respecting foreign keys)
-- This script is safe to run multiple times

-- Drop tables in reverse order of creation (to respect foreign key constraints)
DROP TABLE IF EXISTS application_timeline CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS security_tracking CASCADE;
DROP TABLE IF EXISTS video_call_participants CASCADE;
DROP TABLE IF EXISTS video_calls CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS application_documents CASCADE;
DROP TABLE IF EXISTS job_applications CASCADE;
DROP TABLE IF EXISTS applicant_profiles CASCADE;
DROP TABLE IF EXISTS invitation_links CASCADE;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'All recruitment tables dropped successfully!';
END $$;
