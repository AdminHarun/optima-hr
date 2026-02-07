import api from './api';

const documentService = {
  // Tüm dokümanları listele
  getAllDocuments: async (employeeId = null, documentType = null) => {
    const params = {};
    if (employeeId) params.employee = employeeId;
    if (documentType) params.type = documentType;
    
    const response = await api.get('/api/documents/', { params });
    return response.data;
  },

  // Doküman detayı
  getDocument: async (id) => {
    const response = await api.get(`/api/documents/${id}/`);
    return response.data;
  },

  // Doküman yükle
  uploadDocument: async (formData) => {
    const response = await api.post('/api/documents/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Doküman doğrula
  verifyDocument: async (id) => {
    const response = await api.post(`/api/documents/${id}/verify/`);
    return response.data;
  },

  // Doküman sil
  deleteDocument: async (id) => {
    const response = await api.delete(`/api/documents/${id}/`);
    return response.data;
  },

  // Doküman tipleri
  getDocumentTypes: async () => {
    const response = await api.get('/api/document-types/');
    return response.data;
  },

  // Süresi dolan dokümanlar
  getExpiredDocuments: async () => {
    const response = await api.get('/api/documents/expired/');
    return response.data;
  },
};

export default documentService;
