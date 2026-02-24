import api from './api';

const recruitmentService = {
  // Başvuru linki oluştur
  generateApplicationLink: async (email) => {
    const response = await api.post('/api/recruitment/generate-link/', { email });
    return response.data;
  },

  // Token doğrula
  validateToken: async (token) => {
    const response = await api.get(`/api/recruitment/validate-token/${token}/`);
    return response.data;
  },

  // Başvuru gönder
  submitApplication: async (token, applicationData) => {
    const formData = new FormData();
    
    // Form verilerini ekle
    Object.keys(applicationData).forEach(key => {
      if (key === 'cv_file' && applicationData[key]) {
        formData.append(key, applicationData[key]);
      } else {
        formData.append(key, applicationData[key]);
      }
    });

    const response = await api.post(
      `/api/recruitment/submit-application/${token}/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // İş ilanlarını listele
  getJobPostings: async () => {
    const response = await api.get('/api/recruitment/job-postings/');
    return response.data;
  },

  // Misafir mesajı gönder
  submitGuestMessage: async (messageData) => {
    const response = await api.post('/api/recruitment/guest-message/', messageData);
    return response.data;
  },

  // Aday durumunu kontrol et
  checkCandidateStatus: async (email) => {
    const response = await api.get(`/api/recruitment/candidate-status/${email}/`);
    return response.data;
  },
};

export default recruitmentService;
