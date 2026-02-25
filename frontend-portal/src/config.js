/**
 * Optima HR Portal — Configuration
 * admin.optima-hr.net
 */

const getBaseUrls = () => {
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('optima-hr.net')) {
    return {
      API_BASE_URL: 'https://api.optima-hr.net',
      WS_BASE_URL: 'wss://api.optima-hr.net',
    };
  }
  return {
    API_BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:9000',
    WS_BASE_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:9000',
  };
};

export const { API_BASE_URL, WS_BASE_URL } = getBaseUrls();

// Uygulamalar
export const APPS = {
  HR_PANEL: {
    name: 'HR Yönetim Paneli',
    url: 'https://app.optima-hr.net',
    icon: 'AdminPanelSettings',
    color: '#1c61ab',
    description: 'Çalışan yönetimi, işe alım, chat'
  },
  CAREER_PORTAL: {
    name: 'Kariyer Portalı',
    url: 'https://pub.optima-hr.net',
    icon: 'Work',
    color: '#8bb94a',
    description: 'İş ilanları, başvuru formu'
  },
  EMPLOYEE_PORTAL: {
    name: 'Çalışan Portalı',
    url: 'https://emp.optima-hr.net',
    icon: 'Person',
    color: '#e67e22',
    description: 'Çalışan self-servis paneli'
  }
};

// Roller
export const ROLES = {
  SUPER_ADMIN: { label: 'Süper Admin', color: '#e74c3c', level: 100 },
  DEVELOPER: { label: 'Geliştirici', color: '#9b59b6', level: 90 },
  ADMIN: { label: 'Yönetici', color: '#1c61ab', level: 80 },
  HR: { label: 'İnsan Kaynakları', color: '#8bb94a', level: 70 },
  USER: { label: 'Kullanıcı', color: '#95a5a6', level: 10 },
};

// Portal erişim rolleri
export const PORTAL_ACCESS_ROLES = ['SUPER_ADMIN', 'DEVELOPER'];
