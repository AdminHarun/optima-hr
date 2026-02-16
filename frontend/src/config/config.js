/**
 * Centralized Configuration for Optima HR
 *
 * Bu dosya tüm URL ve endpoint yapılandırmalarını merkezi olarak yönetir.
 * Environment variable'lar .env dosyalarından okunur:
 * - .env (development)
 * - .env.production (production build)
 *
 * Vite kullanır: import.meta.env.VITE_*
 * CRA fallback: process.env.REACT_APP_*
 */

// Helper to get env variable (Vite + CRA compatible)
const getEnv = (viteKey, craKey, defaultValue) => {
  // Vite environment
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[viteKey] || defaultValue;
  }
  // CRA fallback
  if (typeof process !== 'undefined' && process.env) {
    return process.env[craKey] || defaultValue;
  }
  return defaultValue;
};

// Base URLs
export const API_BASE_URL = getEnv('VITE_API_URL', 'REACT_APP_API_URL', 'http://localhost:9000');
export const WS_BASE_URL = getEnv('VITE_WS_URL', 'REACT_APP_WS_URL', 'ws://localhost:9000');
export const PUBLIC_URL = getEnv('VITE_PUBLIC_URL', 'REACT_APP_PUBLIC_URL', 'http://localhost:3000');

// API Endpoints
export const API_ENDPOINTS = {
  // Applications
  applications: `${API_BASE_URL}/api/applications`,
  applicationById: (id) => `${API_BASE_URL}/api/applications/${id}`,
  applicationByProfile: (profileId) => `${API_BASE_URL}/api/applications/by-profile/${profileId}`,
  applicationStatus: (id) => `${API_BASE_URL}/api/applications/${id}/status`,
  applicationChat: (token) => `${API_BASE_URL}/api/applications/chat/${token}`,

  // Profiles
  profiles: `${API_BASE_URL}/api/profiles`,
  profileById: (id) => `${API_BASE_URL}/api/profiles/${id}`,

  // Invitations
  invitations: `${API_BASE_URL}/api/invitations`,
  invitationByToken: (token) => `${API_BASE_URL}/api/invitations/by-token/${token}`,

  // Chat
  chatRooms: `${API_BASE_URL}/chat/api/rooms`,
  chatMessages: (roomId) => `${API_BASE_URL}/chat/api/rooms/${roomId}/messages`,
  chatMarkRead: `${API_BASE_URL}/chat/api/messages/mark_read/`,
  chatUpload: `${API_BASE_URL}/chat/api/upload`,
  chatOnlineStatus: `${API_BASE_URL}/chat/api/rooms/online_status`,
  chatApplicantRooms: `${API_BASE_URL}/chat/api/rooms/applicant_rooms/`,

  // Files
  fileUpload: `${API_BASE_URL}/api/upload`,
  uploads: `${API_BASE_URL}/uploads`,

  // Auth
  login: `${API_BASE_URL}/api/auth/login`,
  register: `${API_BASE_URL}/api/auth/register`,

  // Employees
  employees: `${API_BASE_URL}/api/employees`,
  employeeDirectory: `${API_BASE_URL}/api/employees/directory`,
  employeeDM: `${API_BASE_URL}/api/employees/dm`,

  // Management
  managementUsers: `${API_BASE_URL}/api/management/users`,
  managementRoles: `${API_BASE_URL}/api/management/roles`,
  managementAuditLogs: `${API_BASE_URL}/api/management/audit-logs`,
};

// WebSocket Endpoints
export const WS_ENDPOINTS = {
  adminChat: (roomId) => `${WS_BASE_URL}/ws/admin-chat/${roomId}`,
  applicantChat: (roomId) => `${WS_BASE_URL}/ws/applicant-chat/${roomId}`,
  // New user-specific endpoint for FAZ 2
  userChat: (userId) => `${WS_BASE_URL}/ws/chat/${userId}`,
};

// Helper function to get file URL
export const getFileUrl = (filePath) => {
  if (!filePath) return null;

  // Already a full URL
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  // Data URL
  if (filePath.startsWith('data:')) {
    return filePath;
  }

  // Absolute path - extract uploads path
  if (filePath.startsWith('/Users') || filePath.startsWith('/var')) {
    const uploadIndex = filePath.indexOf('/uploads/');
    if (uploadIndex !== -1) {
      return `${API_BASE_URL}${filePath.substring(uploadIndex)}`;
    }
  }

  // Relative path
  if (!filePath.startsWith('/')) {
    return `${API_BASE_URL}/${filePath}`;
  }

  return `${API_BASE_URL}${filePath}`;
};

// Export all config
const config = {
  API_BASE_URL,
  WS_BASE_URL,
  PUBLIC_URL,
  API_ENDPOINTS,
  WS_ENDPOINTS,
  getFileUrl,
};

export default config;
