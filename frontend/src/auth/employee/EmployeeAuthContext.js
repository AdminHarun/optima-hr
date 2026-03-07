// Employee Authentication Context - Backend JWT + httpOnly Cookie
import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/config';

const EmployeeAuthContext = createContext();

// Çalışan rolleri ve yetkileri
export const EMPLOYEE_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  HR: 'HR',
  HR_EXPERT: 'HR_EXPERT',
  RECRUITER: 'RECRUITER',
  HR_ASSISTANT: 'HR_ASSISTANT',
  USER: 'USER'
};

export const PERMISSIONS = {
  MANAGE_USERS: 'manage_users',
  VIEW_ALL_APPLICATIONS: 'view_all_applications',
  VIEW_ASSIGNED_APPLICATIONS: 'view_assigned_applications',
  EDIT_APPLICATIONS: 'edit_applications',
  DELETE_APPLICATIONS: 'delete_applications',
  MANAGE_CHAT: 'manage_chat',
  VIEW_CHAT: 'view_chat',
  VIEW_FULL_REPORTS: 'view_full_reports',
  VIEW_LIMITED_REPORTS: 'view_limited_reports',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_SITES: 'manage_sites'
};

export const ROLE_PERMISSIONS = {
  [EMPLOYEE_ROLES.SUPER_ADMIN]: ['*'], // Tüm yetkiler
  [EMPLOYEE_ROLES.ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.VIEW_ALL_APPLICATIONS,
    PERMISSIONS.EDIT_APPLICATIONS,
    PERMISSIONS.DELETE_APPLICATIONS,
    PERMISSIONS.MANAGE_CHAT,
    PERMISSIONS.VIEW_CHAT,
    PERMISSIONS.VIEW_FULL_REPORTS,
    PERMISSIONS.VIEW_LIMITED_REPORTS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.MANAGE_SITES
  ],
  [EMPLOYEE_ROLES.HR_MANAGER]: [
    PERMISSIONS.VIEW_ALL_APPLICATIONS,
    PERMISSIONS.EDIT_APPLICATIONS,
    PERMISSIONS.MANAGE_CHAT,
    PERMISSIONS.VIEW_FULL_REPORTS,
    PERMISSIONS.VIEW_CHAT
  ],
  [EMPLOYEE_ROLES.HR]: [
    PERMISSIONS.VIEW_ALL_APPLICATIONS,
    PERMISSIONS.EDIT_APPLICATIONS,
    PERMISSIONS.MANAGE_CHAT,
    PERMISSIONS.VIEW_CHAT,
    PERMISSIONS.VIEW_FULL_REPORTS,
    PERMISSIONS.VIEW_LIMITED_REPORTS
  ],
  [EMPLOYEE_ROLES.HR_EXPERT]: [
    PERMISSIONS.VIEW_ASSIGNED_APPLICATIONS,
    PERMISSIONS.EDIT_APPLICATIONS,
    PERMISSIONS.VIEW_CHAT,
    PERMISSIONS.VIEW_LIMITED_REPORTS
  ],
  [EMPLOYEE_ROLES.RECRUITER]: [
    PERMISSIONS.VIEW_ALL_APPLICATIONS,
    PERMISSIONS.EDIT_APPLICATIONS,
    PERMISSIONS.MANAGE_CHAT,
    PERMISSIONS.VIEW_CHAT,
    PERMISSIONS.VIEW_LIMITED_REPORTS
  ],
  [EMPLOYEE_ROLES.HR_ASSISTANT]: [
    PERMISSIONS.VIEW_ASSIGNED_APPLICATIONS,
    PERMISSIONS.VIEW_CHAT
  ],
  [EMPLOYEE_ROLES.USER]: [
    PERMISSIONS.VIEW_CHAT
  ]
};

export const EmployeeAuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Sayfa yüklendiğinde backend'den oturum kontrolü
  useEffect(() => {
    checkSession();
  }, []);

  // Backend'den oturum kontrolü - /api/auth/me
  const checkSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        credentials: 'include', // httpOnly cookie gönder
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          const user = formatUser(data.user);
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Kullanıcı verisini uyumlu formata dönüştür
  const formatUser = (rawUser) => ({
    id: rawUser.id,
    email: rawUser.email,
    first_name: rawUser.first_name,
    firstName: rawUser.first_name,
    last_name: rawUser.last_name,
    lastName: rawUser.last_name,
    role: rawUser.role,
    siteId: rawUser.site_code,
    site_code: rawUser.site_code,
    avatar: rawUser.avatar_url,
    avatar_url: rawUser.avatar_url,
    phone: rawUser.phone,
    isActive: rawUser.is_active,
    is_active: rawUser.is_active,
    employee_id: rawUser.employee_id,
    two_factor_enabled: rawUser.two_factor_enabled,
    lastLogin: rawUser.last_login
  });

  // Backend'den login - /api/auth/login
  const login = async (email, password, turnstileToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, turnstileToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Giriş başarısız');
      }

      // 2FA gerekli — cookie henüz verilmedi
      if (data.requires2FA) {
        return { success: false, requires2FA: true, userId: data.userId };
      }

      if (!data.success) {
        throw new Error(data.error || 'Giriş başarısız');
      }

      const user = formatUser(data.user);
      setCurrentUser(user);
      setIsAuthenticated(true);
      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // 2FA doğrulama — login sonrası TOTP kodu ile
  const verify2FA = async (userId, token, backupCode = null) => {
    try {
      const body = { userId };
      if (token) body.token = token;
      if (backupCode) body.backupCode = backupCode;

      const response = await fetch(`${API_BASE_URL}/api/2fa/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '2FA doğrulama başarısız');
      }

      const user = formatUser(data.user);
      setCurrentUser(user);
      setIsAuthenticated(true);
      return { success: true };

    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Backend'den logout - /api/auth/logout
  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout API error:', error);
    }

    // State her durumda temizle
    setCurrentUser(null);
    setIsAuthenticated(false);

    console.log('Logout successful');
    return { success: true };
  };

  // Yetki kontrolü
  const hasPermission = (permission) => {
    if (!currentUser || !isAuthenticated) return false;
    
    const userPermissions = ROLE_PERMISSIONS[currentUser.role] || [];
    
    // Süper admin tüm yetkilere sahip
    if (userPermissions.includes('*')) return true;
    
    return userPermissions.includes(permission);
  };

  // Site erişim kontrolü
  const hasAccessToSite = (siteId) => {
    if (!currentUser || !isAuthenticated) return false;
    
    // Süper admin tüm sitelere erişebilir
    if (currentUser.role === EMPLOYEE_ROLES.SUPER_ADMIN) return true;
    
    // Diğer roller sadece kendi sitelerine erişebilir
    return currentUser.siteId === siteId;
  };

  const value = {
    currentUser,
    isLoading,
    isAuthenticated,
    login,
    verify2FA,
    logout,
    hasPermission,
    hasAccessToSite,
    PERMISSIONS,
    EMPLOYEE_ROLES
  };

  return (
    <EmployeeAuthContext.Provider value={value}>
      {children}
    </EmployeeAuthContext.Provider>
  );
};

// Custom hook
export const useEmployeeAuth = () => {
  const context = useContext(EmployeeAuthContext);
  if (!context) {
    throw new Error('useEmployeeAuth must be used within EmployeeAuthProvider');
  }
  return context;
};

export default EmployeeAuthContext;
