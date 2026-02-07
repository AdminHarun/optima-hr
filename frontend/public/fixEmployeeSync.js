// Çalışan senkronizasyon sorunlarını düzeltme scripti
(() => {
  // 1. Mevcut çalışanları temizle ve düzelt
  const employees = JSON.parse(localStorage.getItem('company_employees') || '[]');
  
  // Harun Wilson gibi demo verileri temizle
  const cleanedEmployees = employees.filter(emp => {
    // Demo verileri filtrele
    if (emp.first_name === 'Harun' && emp.last_name === 'Wilson') return false;
    if (!emp.employee_id || emp.employee_id === '') return false;
    return true;
  });
  
  // Temizlenmiş veriyi kaydet
  localStorage.setItem('company_employees', JSON.stringify(cleanedEmployees));
  
  // 2. Payroll verilerini de senkronize et
  const payrollData = JSON.parse(localStorage.getItem('payroll_data') || '[]');
  
  // Payroll'u güncelle - sadece company_employees'da olan çalışanları tut
  const syncedPayroll = payrollData.filter(p => {
    return cleanedEmployees.some(e => e.id === p.id || e.employee_id === p.employee_id);
  });
  
  // Aktif/Pasif durumları senkronize et
  const finalPayroll = syncedPayroll.map(p => {
    const employee = cleanedEmployees.find(e => e.id === p.id || e.employee_id === p.employee_id);
    if (employee) {
      return {
        ...p,
        is_active: employee.is_active !== false,
        name: `${employee.first_name} ${employee.last_name}`.trim(),
        salary: employee.net_salary || p.salary,
        usdt_address: employee.usdt_address || p.usdt_address
      };
    }
    return p;
  });
  
  localStorage.setItem('payroll_data', JSON.stringify(finalPayroll));
  
  console.log('✅ Çalışan verileri temizlendi ve senkronize edildi!');
  console.log(`Toplam ${cleanedEmployees.length} çalışan`);
  console.log(`Aktif: ${cleanedEmployees.filter(e => e.is_active !== false).length}`);
  console.log(`Pasif: ${cleanedEmployees.filter(e => e.is_active === false).length}`);
  
  // Sayfayı yenile
  location.reload();
})();
