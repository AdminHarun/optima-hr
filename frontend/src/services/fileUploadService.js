// File Upload Service - Chat dosya yükleme
import axios from 'axios';

import { API_BASE_URL } from '../config/config';

class FileUploadService {
  // Tek dosya yükleme
  async uploadFile(file, onProgress) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${API_BASE_URL}/chat/api/upload/file/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(percentCompleted);
            }
          },
        }
      );

      return response.data.file;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  // Çoklu dosya yükleme
  async uploadFiles(files, onProgress) {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await axios.post(
        `${API_BASE_URL}/chat/api/upload/files/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(percentCompleted);
            }
          },
        }
      );

      return response.data.files;
    } catch (error) {
      console.error('Files upload error:', error);
      throw error;
    }
  }

  // Dosya indirme URL'i oluştur
  getFileUrl(fileUrl) {
    if (!fileUrl) return null;

    // Eğer tam URL ise direkt döndür
    if (fileUrl.startsWith('http')) {
      return fileUrl;
    }

    // Relative path ise API base ekle
    return `${API_BASE_URL}${fileUrl}`;
  }

  // Dosya indirme
  downloadFile(filename) {
    const url = `${API_BASE_URL}/chat/api/download/${filename}`;
    window.open(url, '_blank');
  }

  // Dosya tipini kontrol et
  getFileType(mimeType, fileName) {
    if (!mimeType && fileName) {
      const ext = fileName.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
      if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
      if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
      if (['pdf'].includes(ext)) return 'pdf';
      return 'document';
    }

    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'document';
  }

  // Dosya boyutunu formatla
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

const fileUploadService = new FileUploadService();
export default fileUploadService;
