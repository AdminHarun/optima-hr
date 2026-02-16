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
  AuditLog
};