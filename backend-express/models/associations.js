// Model associations - İlişkileri tanımla
const InvitationLink = require('./InvitationLink');
const ApplicantProfile = require('./ApplicantProfile');
const JobApplication = require('./JobApplication');
const ChatRoom = require('./ChatRoom');
const ChatMessage = require('./ChatMessage');
const ChatRoomMember = require('./ChatRoomMember');
const EmployeePresence = require('./EmployeePresence');
const MessageReadReceipt = require('./MessageReadReceipt');
const Employee = require('./Employee');
const Channel = require('./Channel');
const ChannelMember = require('./ChannelMember');
const OfflineMessageQueue = require('./OfflineMessageQueue');
const ScheduledMessage = require('./ScheduledMessage');
const MessageBookmark = require('./MessageBookmark');
const Task = require('./Task');
const TaskComment = require('./TaskComment');
const CalendarEvent = require('./CalendarEvent');
const ManagedFile = require('./ManagedFile');
const FileFolder = require('./FileFolder');
const FileVersion = require('./FileVersion');
const Role = require('./Role');
const Permission = require('./Permission');
const RolePermission = require('./RolePermission');
const EmployeeRole = require('./EmployeeRole');

// InvitationLink ile ApplicantProfile ilişkisi
InvitationLink.hasMany(ApplicantProfile, {
  foreignKey: 'invitation_link_id',
  as: 'profiles'
});
ApplicantProfile.belongsTo(InvitationLink, {
  foreignKey: 'invitation_link_id',
  as: 'invitation_link'
});

// InvitationLink ile JobApplication ilişkisi
InvitationLink.hasMany(JobApplication, {
  foreignKey: 'invitation_link_id',
  as: 'applications'
});
JobApplication.belongsTo(InvitationLink, {
  foreignKey: 'invitation_link_id',
  as: 'invitation_link'
});

// ApplicantProfile ile JobApplication ilişkisi
ApplicantProfile.hasMany(JobApplication, {
  foreignKey: 'applicant_profile_id',
  as: 'applications'
});
JobApplication.belongsTo(ApplicantProfile, {
  foreignKey: 'applicant_profile_id',
  as: 'applicant_profile'
});

// ChatRoom ilişkileri
ChatRoom.hasMany(ChatMessage, {
  foreignKey: 'room_id',
  as: 'messages'
});
ChatMessage.belongsTo(ChatRoom, {
  foreignKey: 'room_id',
  as: 'room'
});

// ChatMessage self-reference for replies
ChatMessage.hasMany(ChatMessage, {
  foreignKey: 'reply_to_id',
  as: 'replies'
});
ChatMessage.belongsTo(ChatMessage, {
  foreignKey: 'reply_to_id',
  as: 'reply_to'
});

// ChatMessage - Employee (sender) ilişkisi
ChatMessage.belongsTo(Employee, {
  foreignKey: 'sender_id',
  as: 'sender_employee',
  constraints: false
});
Employee.hasMany(ChatMessage, {
  foreignKey: 'sender_id',
  as: 'sent_messages',
  constraints: false
});

// ChatRoomMember associations
ChatRoom.hasMany(ChatRoomMember, {
  foreignKey: 'room_id',
  as: 'members'
});
ChatRoomMember.belongsTo(ChatRoom, {
  foreignKey: 'room_id',
  as: 'room'
});

// Management Models
const Site = require('./Site');
const AdminUser = require('./AdminUser');
const AuditLog = require('./AuditLog');

// EmployeePresence - Employee iliskisi
Employee.hasOne(EmployeePresence, {
  foreignKey: 'employee_id',
  as: 'presence'
});
EmployeePresence.belongsTo(Employee, {
  foreignKey: 'employee_id',
  as: 'employee'
});

// MessageReadReceipt - ChatMessage iliskisi
ChatMessage.hasMany(MessageReadReceipt, {
  foreignKey: 'message_id',
  as: 'read_receipts'
});
MessageReadReceipt.belongsTo(ChatMessage, {
  foreignKey: 'message_id',
  as: 'message'
});

// AdminUser - Employee iliskisi (onboarding icin)
AdminUser.belongsTo(Employee, {
  foreignKey: 'employee_id',
  as: 'employee'
});
Employee.hasOne(AdminUser, {
  foreignKey: 'employee_id',
  as: 'admin_user'
});

// ChatRoom - Pinned Message iliskisi
ChatRoom.belongsTo(ChatMessage, {
  foreignKey: 'pinned_message_id',
  as: 'pinned_message'
});

// ==================== CHANNEL (KANAL) SİSTEMİ ====================

// Channel - ChannelMember ilişkisi
Channel.hasMany(ChannelMember, {
  foreignKey: 'channel_id',
  as: 'members',
  onDelete: 'CASCADE'
});
ChannelMember.belongsTo(Channel, {
  foreignKey: 'channel_id',
  as: 'channel'
});

// Channel - Employee (creator) ilişkisi
Channel.belongsTo(Employee, {
  foreignKey: 'created_by',
  as: 'creator'
});

// ChannelMember - Employee ilişkisi
ChannelMember.belongsTo(Employee, {
  foreignKey: 'employee_id',
  as: 'employee'
});
Employee.hasMany(ChannelMember, {
  foreignKey: 'employee_id',
  as: 'channel_memberships'
});

// Channel - ChatMessage ilişkisi (kanal mesajları)
Channel.hasMany(ChatMessage, {
  foreignKey: 'channel_id',
  as: 'messages'
});
ChatMessage.belongsTo(Channel, {
  foreignKey: 'channel_id',
  as: 'channel'
});

// ==================== BOOKMARK SİSTEMİ (Task 2.6) ====================

// MessageBookmark - ChatMessage ilişkisi
ChatMessage.hasMany(MessageBookmark, {
  foreignKey: 'message_id',
  as: 'bookmarks'
});
MessageBookmark.belongsTo(ChatMessage, {
  foreignKey: 'message_id',
  as: 'message'
});

// ==================== TASK (GÖREV) YÖNETİMİ ====================

// Task - Employee (creator) ilişkisi
Task.belongsTo(Employee, {
  foreignKey: 'created_by',
  as: 'creator'
});
Employee.hasMany(Task, {
  foreignKey: 'created_by',
  as: 'created_tasks'
});

// Task - Employee (assignee) ilişkisi
Task.belongsTo(Employee, {
  foreignKey: 'assigned_to',
  as: 'assignee'
});
Employee.hasMany(Task, {
  foreignKey: 'assigned_to',
  as: 'assigned_tasks'
});

// TaskComment - Task ilişkisi
Task.hasMany(TaskComment, {
  foreignKey: 'task_id',
  as: 'comments',
  onDelete: 'CASCADE'
});
TaskComment.belongsTo(Task, {
  foreignKey: 'task_id',
  as: 'task'
});

// TaskComment - Employee ilişkisi
TaskComment.belongsTo(Employee, {
  foreignKey: 'employee_id',
  as: 'author'
});

// CalendarEvent - Employee iilişkisi
CalendarEvent.belongsTo(Employee, {
  foreignKey: 'created_by',
  as: 'creator'
});
Employee.hasMany(CalendarEvent, {
  foreignKey: 'created_by',
  as: 'calendar_events'
});

// ManagedFile - Employee ilişkisi
ManagedFile.belongsTo(Employee, {
  foreignKey: 'uploaded_by',
  as: 'uploader'
});
Employee.hasMany(ManagedFile, {
  foreignKey: 'uploaded_by',
  as: 'uploaded_files'
});

// ManagedFile - FileFolder ilişkisi
ManagedFile.belongsTo(FileFolder, {
  foreignKey: 'folder_id',
  as: 'folder'
});
FileFolder.hasMany(ManagedFile, {
  foreignKey: 'folder_id',
  as: 'files'
});

// FileFolder - self-referencing
FileFolder.hasMany(FileFolder, {
  foreignKey: 'parent_id',
  as: 'subfolders'
});
FileFolder.belongsTo(FileFolder, {
  foreignKey: 'parent_id',
  as: 'parent'
});

// FileVersion - ManagedFile ilişkisi
FileVersion.belongsTo(ManagedFile, {
  foreignKey: 'file_id',
  as: 'file'
});
ManagedFile.hasMany(FileVersion, {
  foreignKey: 'file_id',
  as: 'versions',
  onDelete: 'CASCADE'
});

// FileVersion - Employee ilişkisi
FileVersion.belongsTo(Employee, {
  foreignKey: 'uploaded_by',
  as: 'uploader'
});

// ==================== RBAC (ROL TABANLI ERİŞİM KONTROLÜ) ====================

// Role - Permission (M:N through RolePermission)
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'role_id',
  otherKey: 'permission_id',
  as: 'permissions'
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permission_id',
  otherKey: 'role_id',
  as: 'roles'
});

// Employee - Role (M:N through EmployeeRole)
Employee.belongsToMany(Role, {
  through: EmployeeRole,
  foreignKey: 'employee_id',
  otherKey: 'role_id',
  as: 'roles'
});
Role.belongsToMany(Employee, {
  through: EmployeeRole,
  foreignKey: 'role_id',
  otherKey: 'employee_id',
  as: 'employees'
});

// EmployeeRole - Role ilişkisi (eager loading için)
EmployeeRole.belongsTo(Role, {
  foreignKey: 'role_id',
  as: 'role'
});
Role.hasMany(EmployeeRole, {
  foreignKey: 'role_id',
  as: 'employee_roles'
});

module.exports = {
  InvitationLink,
  ApplicantProfile,
  JobApplication,
  ChatRoom,
  ChatMessage,
  ChatRoomMember,
  EmployeePresence,
  MessageReadReceipt,
  Employee,
  Site,
  AdminUser,
  AuditLog,
  Channel,
  ChannelMember,
  OfflineMessageQueue,
  ScheduledMessage,
  MessageBookmark,
  Task,
  TaskComment,
  CalendarEvent,
  ManagedFile,
  FileFolder,
  FileVersion,
  Role,
  Permission,
  RolePermission,
  EmployeeRole
};