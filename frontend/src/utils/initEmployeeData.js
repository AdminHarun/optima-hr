// src/utils/initEmployeeData.js
// Demo çalışan verilerini localStorage'a ekleyen yardımcı dosya

const initEmployeeData = () => {
  try {
    const existingEmployees = localStorage.getItem('employees');
    
    // Veri yoksa veya bozuksa yeniden oluştur
    let needsInit = false;
    
    if (!existingEmployees) {
      needsInit = true;
    } else {
      try {
        const employees = JSON.parse(existingEmployees);
        // Veri array değilse veya boşsa yeniden oluştur
        if (!Array.isArray(employees) || employees.length === 0) {
          needsInit = true;
        } else {
          // Admin hesabı var mı kontrol et
          const hasAdmin = employees.some(emp => 
            emp.email === 'admin@company.com' || 
            emp.role === 'SUPER_ADMIN'
          );
          if (!hasAdmin) {
            needsInit = true;
          }
        }
      } catch (e) {
        // Parse hatası varsa yeniden oluştur
        needsInit = true;
      }
    }
    
    if (needsInit) {
      const demoEmployees = [
        {
          id: 1,
          employee_id: 'EMP001',
          email: 'admin@company.com',
          passwordHash: btoa(unescape(encodeURIComponent('admin123'))), // admin123
          first_name: 'Admin',
          last_name: 'User',
          role: 'SUPER_ADMIN',
          position: 'MANAGER',
          siteId: 'ALL',
          isActive: true,
          hire_date: '2023-01-15',
          net_salary: 5000,
          usdt_address: 'TXkJqDHQmwNYBNZR3VRV8jCZwRKc8uyEMj',
          createdAt: new Date().toISOString(),
          lastLogin: null
        },
        {
          id: 2,
          employee_id: 'EMP002',
          email: 'hr@site-a.com',
          passwordHash: btoa(unescape(encodeURIComponent('hr123'))), // hr123
          first_name: 'Ayşe',
          last_name: 'Yılmaz',
          role: 'HR_MANAGER',
          position: 'HR',
          siteId: 'SITE_A',
          isActive: true,
          hire_date: '2023-03-20',
          net_salary: 3500,
          usdt_address: 'TRxJqDHQmwNYBNZR3VRV8jCZwRKc8uyXYZ',
          createdAt: new Date().toISOString(),
          lastLogin: null
        },
        {
          id: 3,
          employee_id: 'EMP003',
          email: 'expert@site-a.com',
          passwordHash: btoa(unescape(encodeURIComponent('expert123'))), // expert123
          first_name: 'Mehmet',
          last_name: 'Demir',
          role: 'HR_EXPERT',
          position: 'X_OPERATOR',
          siteId: 'SITE_A',
          isActive: true,
          hire_date: '2024-06-10',
          net_salary: 2500,
          usdt_address: 'TAbCqDHQmwNYBNZR3VRV8jCZwRKc8uyABC',
          createdAt: new Date().toISOString(),
          lastLogin: null
        },
        {
          id: 4,
          employee_id: 'EMP004',
          email: 'furkan@optima.com',
          passwordHash: btoa(unescape(encodeURIComponent('furkan123'))), // furkan123
          first_name: 'Furkan',
          last_name: 'Dağhan',
          role: 'SUPER_ADMIN',
          position: 'DEVELOPER',
          siteId: 'ALL',
          isActive: true,
          hire_date: '2022-09-01',
          net_salary: 8000,
          usdt_address: 'TFurkanDHQmwNYBNZR3VRV8jCZwRKc8uy',
          createdAt: new Date().toISOString(),
          lastLogin: null
        },
        {
          id: 5,
          employee_id: 'EMP005',
          email: 'harun@optima.com',
          passwordHash: btoa(unescape(encodeURIComponent('harun123'))), // harun123
          first_name: 'Harun',
          last_name: 'Yılmaz',
          role: 'HR_MANAGER',
          position: 'SUPERVISOR',
          siteId: 'SITE_A',
          isActive: true,
          hire_date: '2024-01-10',
          net_salary: 4000,
          usdt_address: 'THarunDHQmwNYBNZR3VRV8jCZwRKc8uyXZ',
          createdAt: new Date().toISOString(),
          lastLogin: null
        },
        {
          id: 6,
          employee_id: 'EMP006',
          email: 'zeynep@optima.com',
          passwordHash: btoa(unescape(encodeURIComponent('zeynep123'))), // zeynep123
          first_name: 'Zeynep',
          last_name: 'Kaya',
          role: 'USER',
          position: 'CHAT_OPERATOR',
          siteId: 'SITE_B',
          isActive: true,
          hire_date: '2024-11-01',
          net_salary: 2000,
          usdt_address: 'TZeynepDHQmwNYBNZR3VRV8jCZwRKc8uyZ',
          createdAt: new Date().toISOString(),
          lastLogin: null
        },
        {
          id: 7,
          employee_id: 'EMP007',
          email: 'ali@optima.com',
          passwordHash: btoa(unescape(encodeURIComponent('ali123'))), // ali123
          first_name: 'Ali',
          last_name: 'Öztürk',
          role: 'USER',
          position: 'FINANCE',
          siteId: 'SITE_A',
          isActive: false, // Pasif çalışan
          hire_date: '2023-05-15',
          net_salary: 3000,
          usdt_address: '',
          createdAt: new Date().toISOString(),
          lastLogin: null
        }
      ];
      
      localStorage.setItem('employees', JSON.stringify(demoEmployees));
      console.log('✅ Demo çalışan verileri oluşturuldu');
      
      // Debug için kullanıcıları listele
      console.log('Kullanılabilir hesaplar:');
      demoEmployees.forEach(emp => {
        const password = emp.email.includes('admin') ? 'admin123' : 
                        emp.email.includes('hr') ? 'hr123' :
                        emp.email.includes('expert') ? 'expert123' :
                        emp.email.includes('furkan') ? 'furkan123' :
                        emp.email.includes('harun') ? 'harun123' :
                        emp.email.includes('zeynep') ? 'zeynep123' :
                        emp.email.includes('ali') ? 'ali123' : '';
        console.log(`📧 ${emp.email} / 🔑 ${password} - ${emp.role} - ${emp.position || 'N/A'}`);
      });
    } else {
      console.log('✅ Çalışan verileri mevcut');
    }
  } catch (error) {
    console.error('❌ Çalışan verileri başlatma hatası:', error);
    
    // Hata durumunda temizleyip yeniden oluştur
    localStorage.removeItem('employees');
    
    // Basit bir veri seti oluştur
    const fallbackData = [
      {
        id: 1,
        employee_id: 'EMP001',
        email: 'admin@company.com',
        passwordHash: btoa(unescape(encodeURIComponent('admin123'))),
        first_name: 'Admin',
        last_name: 'User',
        role: 'SUPER_ADMIN',
        position: 'MANAGER',
        siteId: 'ALL',
        isActive: true,
        hire_date: new Date().toISOString(),
        net_salary: 5000,
        usdt_address: '',
        createdAt: new Date().toISOString()
      }
    ];
    
    localStorage.setItem('employees', JSON.stringify(fallbackData));
    console.log('✅ Yedek admin hesabı oluşturuldu: admin@company.com / admin123');
  }
};

// Sayfa yüklendiğinde otomatik çalıştır
initEmployeeData();

// Debug fonksiyonu - Konsol'da kullanılabilir
window.resetEmployeeData = () => {
  localStorage.removeItem('employees');
  initEmployeeData();
  console.log('✅ Çalışan verileri sıfırlandı');
};

window.listEmployees = () => {
  try {
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    console.table(employees.map(emp => ({
      ID: emp.id,
      Email: emp.email,
      Name: `${emp.first_name || emp.firstName} ${emp.last_name || emp.lastName}`,
      Position: emp.position || 'N/A',
      Salary: emp.net_salary || 0,
      Role: emp.role,
      Active: emp.isActive ? '✅' : '❌'
    })));
  } catch (e) {
    console.error('Çalışan listesi okunamadı');
  }
};

export default initEmployeeData;
