/**
 * Manual migration script to add missing columns to database tables
 * This runs on server startup to ensure all columns exist
 */

const addMissingColumns = async (sequelize) => {
  console.log('🔄 Running manual column migration...');

  const qi = sequelize.getQueryInterface();

  const addColumnIfNotExists = async (table, column, type, options = {}) => {
    try {
      await qi.addColumn(table, column, { type, ...options });
      console.log(`  ✅ Added ${column} to ${table}`);
    } catch (e) {
      if (e.message && (e.message.includes('already exists') || e.message.includes('duplicate column'))) {
        // Column already exists, skip silently
      } else {
        console.log(`  ⚠️ ${table}.${column}: ${e.message}`);
      }
    }
  };

  // JobApplication columns
  console.log('📋 Checking job_applications columns...');
  await addColumnIfNotExists('job_applications', 'tc_number', 'VARCHAR(11)');
  await addColumnIfNotExists('job_applications', 'birth_date', 'DATE');
  await addColumnIfNotExists('job_applications', 'address', 'TEXT');
  await addColumnIfNotExists('job_applications', 'city', 'VARCHAR(100)');
  await addColumnIfNotExists('job_applications', 'district', 'VARCHAR(100)');
  await addColumnIfNotExists('job_applications', 'postal_code', 'VARCHAR(10)');
  await addColumnIfNotExists('job_applications', 'education_level', 'VARCHAR(50)');
  await addColumnIfNotExists('job_applications', 'university', 'VARCHAR(200)');
  await addColumnIfNotExists('job_applications', 'department', 'VARCHAR(200)');
  await addColumnIfNotExists('job_applications', 'graduation_year', 'INTEGER');
  await addColumnIfNotExists('job_applications', 'gpa', 'DECIMAL(5,2)');
  await addColumnIfNotExists('job_applications', 'has_sector_experience', 'BOOLEAN', { defaultValue: false });
  await addColumnIfNotExists('job_applications', 'experience_level', 'VARCHAR(50)');
  await addColumnIfNotExists('job_applications', 'last_company', 'VARCHAR(200)');
  await addColumnIfNotExists('job_applications', 'last_position', 'VARCHAR(200)');
  await addColumnIfNotExists('job_applications', 'internet_download', 'INTEGER');
  await addColumnIfNotExists('job_applications', 'internet_upload', 'INTEGER');
  await addColumnIfNotExists('job_applications', 'typing_speed', 'INTEGER');
  await addColumnIfNotExists('job_applications', 'processor', 'VARCHAR(100)');
  await addColumnIfNotExists('job_applications', 'ram', 'VARCHAR(50)');
  await addColumnIfNotExists('job_applications', 'os', 'VARCHAR(100)');
  await addColumnIfNotExists('job_applications', 'source', 'VARCHAR(100)');
  await addColumnIfNotExists('job_applications', 'has_reference', 'BOOLEAN', { defaultValue: false });
  await addColumnIfNotExists('job_applications', 'reference_name', 'VARCHAR(200)');
  await addColumnIfNotExists('job_applications', 'kvkk_approved', 'BOOLEAN', { defaultValue: false });
  await addColumnIfNotExists('job_applications', 'status', 'VARCHAR(50)', { defaultValue: 'submitted' });
  await addColumnIfNotExists('job_applications', 'reject_reason', 'TEXT');
  await addColumnIfNotExists('job_applications', 'submitted_ip', 'INET');
  await addColumnIfNotExists('job_applications', 'submitted_location', 'JSONB');
  await addColumnIfNotExists('job_applications', 'cv_file_path', 'VARCHAR(500)');
  await addColumnIfNotExists('job_applications', 'cv_file_name', 'VARCHAR(255)');
  await addColumnIfNotExists('job_applications', 'internet_test_file_path', 'VARCHAR(500)');
  await addColumnIfNotExists('job_applications', 'internet_test_file_name', 'VARCHAR(255)');
  await addColumnIfNotExists('job_applications', 'typing_test_file_path', 'VARCHAR(500)');
  await addColumnIfNotExists('job_applications', 'typing_test_file_name', 'VARCHAR(255)');
  await addColumnIfNotExists('job_applications', 'token', 'VARCHAR(32)');
  await addColumnIfNotExists('job_applications', 'profileId', 'INTEGER');
  await addColumnIfNotExists('job_applications', 'applicant_profile_id', 'INTEGER');
  await addColumnIfNotExists('job_applications', 'invitation_link_id', 'INTEGER');
  await addColumnIfNotExists('job_applications', 'site_code', 'VARCHAR(50)');
  await addColumnIfNotExists('job_applications', 'submitted_at', 'TIMESTAMP', { defaultValue: sequelize.literal('CURRENT_TIMESTAMP') });
  await addColumnIfNotExists('job_applications', 'updated_at', 'TIMESTAMP', { defaultValue: sequelize.literal('CURRENT_TIMESTAMP') });

  // ApplicantProfile columns
  console.log('📋 Checking applicant_profiles columns...');
  await addColumnIfNotExists('applicant_profiles', 'first_name', 'VARCHAR(100)');
  await addColumnIfNotExists('applicant_profiles', 'last_name', 'VARCHAR(100)');
  await addColumnIfNotExists('applicant_profiles', 'email', 'VARCHAR(255)');
  await addColumnIfNotExists('applicant_profiles', 'phone', 'VARCHAR(20)');
  await addColumnIfNotExists('applicant_profiles', 'session_token', 'VARCHAR(64)');
  await addColumnIfNotExists('applicant_profiles', 'chat_token', 'VARCHAR(64)');
  await addColumnIfNotExists('applicant_profiles', 'profile_created_ip', 'INET');
  await addColumnIfNotExists('applicant_profiles', 'profile_created_location', 'JSONB');
  await addColumnIfNotExists('applicant_profiles', 'device_info', 'JSONB');
  await addColumnIfNotExists('applicant_profiles', 'vpn_score', 'INTEGER', { defaultValue: 0 });
  await addColumnIfNotExists('applicant_profiles', 'is_vpn', 'BOOLEAN', { defaultValue: false });
  await addColumnIfNotExists('applicant_profiles', 'password_hash', 'VARCHAR(255)');
  await addColumnIfNotExists('applicant_profiles', 'security_question', 'VARCHAR(500)');
  await addColumnIfNotExists('applicant_profiles', 'security_answer_hash', 'VARCHAR(255)');
  await addColumnIfNotExists('applicant_profiles', 'token', 'VARCHAR(32)');
  await addColumnIfNotExists('applicant_profiles', 'invitation_link_id', 'INTEGER');
  await addColumnIfNotExists('applicant_profiles', 'site_code', 'VARCHAR(50)');
  await addColumnIfNotExists('applicant_profiles', 'profile_created_at', 'TIMESTAMP', { defaultValue: sequelize.literal('CURRENT_TIMESTAMP') });
  await addColumnIfNotExists('applicant_profiles', 'updated_at', 'TIMESTAMP', { defaultValue: sequelize.literal('CURRENT_TIMESTAMP') });

  // ChatRoom columns
  console.log('📋 Checking chat_rooms columns...');
  await addColumnIfNotExists('chat_rooms', 'room_type', 'VARCHAR(20)', { defaultValue: 'applicant' });
  await addColumnIfNotExists('chat_rooms', 'applicant_id', 'BIGINT');
  await addColumnIfNotExists('chat_rooms', 'applicant_email', 'VARCHAR(255)');
  await addColumnIfNotExists('chat_rooms', 'applicant_name', 'VARCHAR(255)');
  await addColumnIfNotExists('chat_rooms', 'room_name', 'VARCHAR(255)');
  await addColumnIfNotExists('chat_rooms', 'is_active', 'BOOLEAN', { defaultValue: true });
  await addColumnIfNotExists('chat_rooms', 'last_message_id', 'INTEGER');
  await addColumnIfNotExists('chat_rooms', 'last_message_at', 'TIMESTAMP');
  await addColumnIfNotExists('chat_rooms', 'metadata', 'JSON');
  await addColumnIfNotExists('chat_rooms', 'site_code', 'VARCHAR(50)');
  await addColumnIfNotExists('chat_rooms', 'created_at', 'TIMESTAMP', { defaultValue: sequelize.literal('CURRENT_TIMESTAMP') });
  await addColumnIfNotExists('chat_rooms', 'updated_at', 'TIMESTAMP', { defaultValue: sequelize.literal('CURRENT_TIMESTAMP') });

  // ChatMessage columns
  console.log('📋 Checking chat_messages columns...');
  await addColumnIfNotExists('chat_messages', 'message_id', 'VARCHAR(100)');
  await addColumnIfNotExists('chat_messages', 'room_id', 'INTEGER');
  await addColumnIfNotExists('chat_messages', 'sender_type', 'VARCHAR(20)');
  await addColumnIfNotExists('chat_messages', 'sender_name', 'VARCHAR(255)');
  await addColumnIfNotExists('chat_messages', 'sender_id', 'INTEGER');
  await addColumnIfNotExists('chat_messages', 'message_type', 'VARCHAR(20)', { defaultValue: 'text' });
  await addColumnIfNotExists('chat_messages', 'content', 'TEXT');
  await addColumnIfNotExists('chat_messages', 'file_url', 'TEXT');
  await addColumnIfNotExists('chat_messages', 'file_name', 'VARCHAR(255)');
  await addColumnIfNotExists('chat_messages', 'file_size', 'INTEGER');
  await addColumnIfNotExists('chat_messages', 'file_mime_type', 'VARCHAR(100)');
  await addColumnIfNotExists('chat_messages', 'reply_to_id', 'INTEGER');
  await addColumnIfNotExists('chat_messages', 'status', 'VARCHAR(20)', { defaultValue: 'sent' });
  await addColumnIfNotExists('chat_messages', 'reactions', 'JSON');
  await addColumnIfNotExists('chat_messages', 'metadata', 'JSON');
  await addColumnIfNotExists('chat_messages', 'is_edited', 'BOOLEAN', { defaultValue: false });
  await addColumnIfNotExists('chat_messages', 'edited_at', 'TIMESTAMP');
  await addColumnIfNotExists('chat_messages', 'is_deleted', 'BOOLEAN', { defaultValue: false });
  await addColumnIfNotExists('chat_messages', 'deleted_at', 'TIMESTAMP');
  await addColumnIfNotExists('chat_messages', 'created_at', 'TIMESTAMP', { defaultValue: sequelize.literal('CURRENT_TIMESTAMP') });
  await addColumnIfNotExists('chat_messages', 'updated_at', 'TIMESTAMP', { defaultValue: sequelize.literal('CURRENT_TIMESTAMP') });

  console.log('✅ Manual column migration completed');
};

module.exports = { addMissingColumns };
