import api from './api';

const employeeService = {
  // Tüm çalışanları listele
  getAllEmployees: async () => {
    const response = await api.get('/api/employees/');
    return response.data;
  },

  // Aktif çalışanları listele
  getActiveEmployees: async () => {
    const response = await api.get('/api/employees/active/');
    return response.data;
  },

  // Departmana göre çalışanları listele
  getEmployeesByDepartment: async (department) => {
    const response = await api.get('/api/employees/by_department/', {
      params: { department }
    });
    return response.data;
  },

  // Tek çalışan detayı
  getEmployee: async (id) => {
    const response = await api.get(`/api/employees/${id}/`);
    return response.data;
  },

  // Çalışan oluştur
  createEmployee: async (employeeData) => {
    const response = await api.post('/api/employees/create-user/', employeeData);
    return response.data;
  },

  // Çalışan güncelle
  updateEmployee: async (id, employeeData) => {
    const response = await api.patch(`/api/employees/${id}/`, employeeData);
    return response.data;
  },

  // Çalışan sil
  deleteEmployee: async (id) => {
    const response = await api.delete(`/api/employees/${id}/`);
    return response.data;
  },

  // Dashboard istatistikleri
  getDashboardStats: async () => {
    const response = await api.get('/api/employees/dashboard/');
    return response.data;
  },

  // Çalışan arama
  searchEmployees: async (searchParams) => {
    const response = await api.get('/api/employees/search/', {
      params: searchParams
    });
    return response.data;
  },

  // Pasif çalışanları listele
  getInactiveEmployees: async () => {
    const response = await api.get('/api/employees/inactive/');
    return response.data;
  },

  // Çalışanı pasif yap
  deactivateEmployee: async (id) => {
    const response = await api.post(`/api/employees/${id}/deactivate/`);
    return response.data;
  },

  // Çalışanı aktif yap
  activateEmployee: async (id) => {
    const response = await api.post(`/api/employees/${id}/activate/`);
    return response.data;
  },

  // Toplu işlemler
  bulkAction: async (action, employeeIds) => {
    const response = await api.post('/api/employees/bulk-action/', {
      action,
      employee_ids: employeeIds
    });
    return response.data;
  },

  // Çalışan belgeleri
  getEmployeeDocuments: async (employeeId) => {
    const response = await api.get(`/api/employees/${employeeId}/documents/`);
    return response.data;
  },

  // Belge yükle
  uploadDocument: async (employeeId, formData) => {
    const response = await api.post(`/api/employees/${employeeId}/documents/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  },

  // Kripto cüzdan güncelle
  updateCryptoAddresses: async (employeeId, cryptoAddresses) => {
    const response = await api.patch(`/api/employees/${employeeId}/update_crypto/`, {
      crypto_addresses: cryptoAddresses
    });
    return response.data;
  },

  // Belge indirme URL'si al
  getDocumentDownloadUrl: async (documentId) => {
    const response = await api.get(`/api/employee-documents/${documentId}/download/`);
    return response.data;
  },
};

export default employeeService;
