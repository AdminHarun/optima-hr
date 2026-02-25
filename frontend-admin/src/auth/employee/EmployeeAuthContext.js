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
          // Backend'den gelen kullanıcı verisini uyumlu formata dönüştür
          const user = {
            id: data.user.id,
            email: data.user.email,
            first_name: data.user.first_name,
            firstName: data.user.first_name,
            last_name: data.user.last_name,
            lastName: data.user.last_name,
            role: data.user.role,
            siteId: data.user.site_code,
            site_code: data.user.site_code,
            avatar: data.user.avatar_url,
            avatar_url: data.user.avatar_url,
            phone: data.user.phone,
            isActive: data.user.is_active,
            is_active: data.user.is_active,
            employee_id: data.user.employee_id,
            two_factor_enabled: data.user.two_factor_enabled,
            lastLogin: data.user.last_login
          };
          setCurrentUser(user);
          setIsAuthenticated(true);
          console.log('Session restored:', user.email);
        }
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Backend'den login - /api/auth/login
  const login = async (email, password, turnstileToken) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include', // cookie'yi kabul et
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, turnstileToken })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Giriş başarısız');
      }

      // Kullanıcı bilgisini uyumlu formata dönüştür
      const user = {
        id: data.user.id,
        email: data.user.email,
        first_name: data.user.first_name,
        firstName: data.user.first_name,
        last_name: data.user.last_name,
        lastName: data.user.last_name,
        role: data.user.role,
        siteId: data.user.site_code,
        site_code: data.user.site_code,
        avatar: data.user.avatar_url,
        avatar_url: data.user.avatar_url,
        phone: data.user.phone,
        isActive: data.user.is_active,
        is_active: data.user.is_active,
        employee_id: data.user.employee_id,
        two_factor_enabled: data.user.two_factor_enabled,
        lastLogin: data.user.last_login
      };

      setCurrentUser(user);
      setIsAuthenticated(true);

      console.log('Login successful:', user.email);
      return { success: true };

    } catch (error) {
      console.error('Login error:', error);
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
