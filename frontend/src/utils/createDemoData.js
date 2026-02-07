// Demo Employee Data Creator - İlk çalıştırmada demo kullanıcılar oluşturur
import { EMPLOYEE_ROLES } from '../auth/employee/EmployeeAuthContext';

export const createDemoEmployees = () => {
  const existingEmployees = JSON.parse(localStorage.getItem('employees') || '[]');
  
  if (existingEmployees.length > 0) {
    console.log('Demo employees already exist');
    return;
  }

  const demoEmployees = [
    {
      id: 'emp_001',
      username: 'admin',
      email: 'admin@company.com',
      firstName: 'Süper',
      lastName: 'Admin',
      role: EMPLOYEE_ROLES.SUPER_ADMIN,
      siteId: null, // Tüm sitelere erişim
      siteName: 'Tüm Siteler',
      passwordHash: btoa(unescape(encodeURIComponent('admin123'))),
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      avatar: null
    },
    {
      id: 'emp_002',
      username: 'hr.manager',
      email: 'hr@site-a.com',
      firstName: 'Mehmet',
      lastName: 'Yılmaz',
      role: EMPLOYEE_ROLES.HR_MANAGER,
      siteId: 'site-a',
      siteName: 'Site A İnsan Kaynakları',
      passwordHash: btoa(unescape(encodeURIComponent('hr123'))),
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      avatar: null
    },
    {
      id: 'emp_003',
      username: 'hr.expert',
      email: 'expert@site-a.com',
      firstName: 'Ayşe',
      lastName: 'Demir',
      role: EMPLOYEE_ROLES.HR_EXPERT,
      siteId: 'site-a',
      siteName: 'Site A İnsan Kaynakları',
      passwordHash: btoa(unescape(encodeURIComponent('expert123'))),
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      avatar: null
    },
    {
      id: 'emp_004',
      username: 'hr.assistant',
      email: 'assistant@site-a.com',
      firstName: 'Fatma',
      lastName: 'Kaya',
      role: EMPLOYEE_ROLES.HR_ASSISTANT,
      siteId: 'site-a',
      siteName: 'Site A İnsan Kaynakları',
      passwordHash: btoa(unescape(encodeURIComponent('assistant123'))),
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      avatar: null
    },
    {
      id: 'emp_005',
      username: 'hr.manager.b',
      email: 'hr@site-b.com',
      firstName: 'Ali',
      lastName: 'Özkan',
      role: EMPLOYEE_ROLES.HR_MANAGER,
      siteId: 'site-b',
      siteName: 'Site B İnsan Kaynakları',
      passwordHash: btoa(unescape(encodeURIComponent('hrb123'))),
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      avatar: null
    }
  ];

  // Demo sites oluştur
  const demoSites = [
    {
      id: 'site-a',
      name: 'Site A İnsan Kaynakları',
      domain: 'site-a.com',
      logo: '/logos/site-a.png',
      primaryColor: '#1c61ab',
      secondaryColor: '#8bb94a',
      contactEmail: 'hr@site-a.com',
      address: 'İstanbul, Türkiye',
      isActive: true,
      settings: {
        allowApplications: true,
        autoReplyEnabled: true,
        maxApplicationsPerDay: 100
      }
    },
    {
      id: 'site-b',
      name: 'Site B İnsan Kaynakları',
      domain: 'site-b.com',
      logo: '/logos/site-b.png',
      primaryColor: '#2196f3',
      secondaryColor: '#ff9800',
      contactEmail: 'hr@site-b.com',
      address: 'Ankara, Türkiye',
      isActive: true,
      settings: {
        allowApplications: true,
        autoReplyEnabled: false,
        maxApplicationsPerDay: 50
      }
    }
  ];

  // LocalStorage'a kaydet
  localStorage.setItem('employees', JSON.stringify(demoEmployees));
  localStorage.setItem('sites', JSON.stringify(demoSites));
  
  console.log('Demo employees and sites created:', {
    employees: demoEmployees.length,
    sites: demoSites.length
  });
};

// Uygulama ilk çalıştığında demo verileri oluştur
if (typeof window !== 'undefined') {
  // Browser ortamında çalışıyorsa
  setTimeout(() => {
    createDemoEmployees();
  }, 100);
}
