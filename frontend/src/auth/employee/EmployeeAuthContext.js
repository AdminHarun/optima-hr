// Employee Authentication Context - Tamamen ayrı sistem
import React, { createContext, useContext, useState, useEffect } from 'react';

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

  // Sayfa yüklendiğinde session kontrolü
  useEffect(() => {
    checkEmployeeSession();
  }, []);

  // Session timeout kontrolü (8 saat)
  useEffect(() => {
    if (isAuthenticated) {
      const sessionTimeout = setInterval(() => {
        const session = getEmployeeSession();
        if (session) {
          const now = new Date().getTime();
          const loginTime = new Date(session.loginTime).getTime();
          const eightHours = 8 * 60 * 60 * 1000; // 8 saat ms

          if (now - loginTime > eightHours) {
            console.log('Employee session expired after 8 hours');
            logout();
          }
        }
      }, 60000); // Her dakika kontrol et

      return () => clearInterval(sessionTimeout);
    }
  }, [isAuthenticated]);

  const checkEmployeeSession = () => {
    try {
      const session = getEmployeeSession();
      if (session && session.userId) {
        const user = getEmployeeById(session.userId);
        if (user && user.isActive) {
          setCurrentUser(user);
          setIsAuthenticated(true);
          console.log('Employee session restored:', user.email);
        } else {
          clearEmployeeSession();
        }
      }
    } catch (error) {
      console.error('Employee session check error:', error);
      clearEmployeeSession();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Email ve şifre kontrolü
      const user = authenticateEmployee(email, password);
      
      if (!user) {
        throw new Error('Geçersiz email veya şifre');
      }

      if (!user.isActive) {
        throw new Error('Hesabınız deaktif durumda');
      }

      // Cihaz bilgilerini topla
      const deviceInfo = await collectEmployeeDeviceInfo();

      // Session oluştur
      const session = {
        userId: user.id,
        email: user.email,
        loginTime: new Date().toISOString(),
        deviceInfo,
        lastActivity: new Date().toISOString()
      };

      // Session'ı kaydet
      localStorage.setItem('employee_session', JSON.stringify(session));
      
      // Son giriş zamanını güncelle
      updateEmployeeLastLogin(user.id);

      setCurrentUser(user);
      setIsAuthenticated(true);

      console.log('Employee login successful:', user.email);
      return { success: true };

    } catch (error) {
      console.error('Employee login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    try {
      // Session'ı temizle
      localStorage.removeItem('employee_session');
      
      // State'i temizle
      setCurrentUser(null);
      setIsAuthenticated(false);
      
      console.log('Employee logout successful');
      return { success: true };
    } catch (error) {
      console.error('Employee logout error:', error);
      return { success: false };
    }
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

  // Aktivite güncelleme
  const updateActivity = () => {
    if (isAuthenticated) {
      const session = getEmployeeSession();
      if (session) {
        session.lastActivity = new Date().toISOString();
        localStorage.setItem('employee_session', JSON.stringify(session));
      }
    }
  };

  const value = {
    currentUser,
    isLoading,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    hasAccessToSite,
    updateActivity,
    PERMISSIONS,
    EMPLOYEE_ROLES
  };

  return (
    <EmployeeAuthContext.Provider value={value}>
      {children}
    </EmployeeAuthContext.Provider>
  );
};

// Helper fonksiyonlar - SADECE EMPLOYEE İÇİN
const getEmployeeSession = () => {
  try {
    const session = localStorage.getItem('employee_session');
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
};

const clearEmployeeSession = () => {
  localStorage.removeItem('employee_session');
};

const authenticateEmployee = (email, password) => {
  const employees = JSON.parse(localStorage.getItem('employees') || '[]');
  const employee = employees.find(emp => 
    emp.email.toLowerCase() === email.toLowerCase()
  );
  
  if (employee && employee.passwordHash === btoa(unescape(encodeURIComponent(password)))) {
    return employee;
  }
  
  return null;
};

const getEmployeeById = (id) => {
  const employees = JSON.parse(localStorage.getItem('employees') || '[]');
  return employees.find(emp => emp.id === id);
};

const updateEmployeeLastLogin = (userId) => {
  const employees = JSON.parse(localStorage.getItem('employees') || '[]');
  const updatedEmployees = employees.map(emp => 
    emp.id === userId 
      ? { ...emp, lastLogin: new Date().toISOString() }
      : emp
  );
  localStorage.setItem('employees', JSON.stringify(updatedEmployees));
};

const collectEmployeeDeviceInfo = async () => {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: new Date().toISOString()
  };
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
