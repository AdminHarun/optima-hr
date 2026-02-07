// Management API Service
import axios from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:9000') + '/api';

// Axios instance with auth header
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token and site header to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('employee_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
  config.headers['X-Site-Id'] = currentSite;
  return config;
});

// ==================== SITE MANAGEMENT ====================

export const siteApi = {
  // Get all sites
  getAll: async () => {
    try {
      const response = await apiClient.get('/management/sites');
      return response.data;
    } catch (error) {
      console.error('Get sites error:', error);
      throw error;
    }
  },

  // Get single site
  getById: async (siteCode) => {
    try {
      const response = await apiClient.get(`/management/sites/${siteCode}`);
      return response.data;
    } catch (error) {
      console.error('Get site error:', error);
      throw error;
    }
  },

  // Create new site
  create: async (siteData) => {
    try {
      const response = await apiClient.post('/management/sites', siteData);
      return response.data;
    } catch (error) {
      console.error('Create site error:', error);
      throw error;
    }
  },

  // Update site
  update: async (siteCode, siteData) => {
    try {
      const response = await apiClient.put(`/management/sites/${siteCode}`, siteData);
      return response.data;
    } catch (error) {
      console.error('Update site error:', error);
      throw error;
    }
  },

  // Delete site
  delete: async (siteCode) => {
    try {
      const response = await apiClient.delete(`/management/sites/${siteCode}`);
      return response.data;
    } catch (error) {
      console.error('Delete site error:', error);
      throw error;
    }
  },

  // Toggle site status
  toggleStatus: async (siteCode) => {
    try {
      const response = await apiClient.patch(`/management/sites/${siteCode}/toggle-status`);
      return response.data;
    } catch (error) {
      console.error('Toggle site status error:', error);
      throw error;
    }
  },

  // Get site statistics
  getStats: async (siteCode) => {
    try {
      const response = await apiClient.get(`/management/sites/${siteCode}/stats`);
      return response.data;
    } catch (error) {
      console.error('Get site stats error:', error);
      throw error;
    }
  }
};

// ==================== USER MANAGEMENT ====================

export const userApi = {
  // Get all users
  getAll: async (params = {}) => {
    try {
      const response = await apiClient.get('/management/users', { params });
      return response.data;
    } catch (error) {
      console.error('Get users error:', error);
      throw error;
    }
  },

  // Get single user
  getById: async (userId) => {
    try {
      const response = await apiClient.get(`/management/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get user error:', error);
      throw error;
    }
  },

  // Create new user
  create: async (userData) => {
    try {
      const response = await apiClient.post('/management/users', userData);
      return response.data;
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  },

  // Update user
  update: async (userId, userData) => {
    try {
      const response = await apiClient.put(`/management/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },

  // Delete user
  delete: async (userId) => {
    try {
      const response = await apiClient.delete(`/management/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  },

  // Toggle user status
  toggleStatus: async (userId) => {
    try {
      const response = await apiClient.patch(`/management/users/${userId}/toggle-status`);
      return response.data;
    } catch (error) {
      console.error('Toggle user status error:', error);
      throw error;
    }
  },

  // Bulk operations
  bulkDelete: async (userIds) => {
    try {
      const response = await apiClient.post('/management/users/bulk-delete', { userIds });
      return response.data;
    } catch (error) {
      console.error('Bulk delete users error:', error);
      throw error;
    }
  },

  bulkUpdateStatus: async (userIds, isActive) => {
    try {
      const response = await apiClient.post('/management/users/bulk-update-status', { 
        userIds, 
        isActive 
      });
      return response.data;
    } catch (error) {
      console.error('Bulk update status error:', error);
      throw error;
    }
  }
};

// ==================== PERMISSION MANAGEMENT ====================

export const permissionApi = {
  // Get all permissions
  getAll: async () => {
    try {
      const response = await apiClient.get('/management/permissions');
      return response.data;
    } catch (error) {
      console.error('Get permissions error:', error);
      throw error;
    }
  },

  // Get permissions by role
  getByRole: async (role) => {
    try {
      const response = await apiClient.get(`/management/permissions/role/${role}`);
      return response.data;
    } catch (error) {
      console.error('Get role permissions error:', error);
      throw error;
    }
  },

  // Update role permissions
  updateRolePermissions: async (role, permissions) => {
    try {
      const response = await apiClient.put(`/management/permissions/role/${role}`, {
        permissions
      });
      return response.data;
    } catch (error) {
      console.error('Update role permissions error:', error);
      throw error;
    }
  },

  // Get user-specific permissions
  getUserPermissions: async (userId) => {
    try {
      const response = await apiClient.get(`/management/permissions/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Get user permissions error:', error);
      throw error;
    }
  },

  // Update user-specific permissions
  updateUserPermissions: async (userId, permissions) => {
    try {
      const response = await apiClient.put(`/management/permissions/user/${userId}`, {
        permissions
      });
      return response.data;
    } catch (error) {
      console.error('Update user permissions error:', error);
      throw error;
    }
  }
};

// ==================== AUDIT LOG ====================

export const auditApi = {
  // Get audit logs
  getLogs: async (params = {}) => {
    try {
      const response = await apiClient.get('/management/audit-logs', { params });
      return response.data;
    } catch (error) {
      console.error('Get audit logs error:', error);
      throw error;
    }
  },

  // Get logs by entity
  getByEntity: async (entityType, entityId) => {
    try {
      const response = await apiClient.get(`/management/audit-logs/${entityType}/${entityId}`);
      return response.data;
    } catch (error) {
      console.error('Get entity logs error:', error);
      throw error;
    }
  },

  // Get logs by user
  getByUser: async (userId, params = {}) => {
    try {
      const response = await apiClient.get(`/management/audit-logs/user/${userId}`, { params });
      return response.data;
    } catch (error) {
      console.error('Get user logs error:', error);
      throw error;
    }
  }
};

// ==================== EXPORT/IMPORT ====================

export const exportApi = {
  // Export sites to Excel
  exportSites: async (format = 'xlsx') => {
    try {
      const response = await apiClient.get(`/management/export/sites?format=${format}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Export sites error:', error);
      throw error;
    }
  },

  // Export users to Excel
  exportUsers: async (format = 'xlsx', filters = {}) => {
    try {
      const response = await apiClient.get(`/management/export/users?format=${format}`, {
        params: filters,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Export users error:', error);
      throw error;
    }
  },

  // Import sites from Excel
  importSites: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/management/import/sites', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Import sites error:', error);
      throw error;
    }
  },

  // Import users from Excel
  importUsers: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post('/management/import/users', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Import users error:', error);
      throw error;
    }
  }
};

// ==================== STATISTICS ====================

export const statsApi = {
  // Get overall statistics
  getOverall: async () => {
    try {
      const response = await apiClient.get('/management/stats/overall');
      return response.data;
    } catch (error) {
      console.error('Get overall stats error:', error);
      throw error;
    }
  },

  // Get site statistics
  getBySite: async (siteCode) => {
    try {
      const response = await apiClient.get(`/management/stats/site/${siteCode}`);
      return response.data;
    } catch (error) {
      console.error('Get site stats error:', error);
      throw error;
    }
  },

  // Get user activity stats
  getUserActivity: async (params = {}) => {
    try {
      const response = await apiClient.get('/management/stats/user-activity', { params });
      return response.data;
    } catch (error) {
      console.error('Get user activity error:', error);
      throw error;
    }
  }
};

export default {
  site: siteApi,
  user: userApi,
  permission: permissionApi,
  audit: auditApi,
  export: exportApi,
  stats: statsApi
};
