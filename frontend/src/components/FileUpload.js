import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Alert,
  Paper,
  Grid
} from '@mui/material';
import { CloudUpload, AttachFile } from '@mui/icons-material';

function FileUpload({ onUploadSuccess, employeeId, documentTypeId }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setMessage('');
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setMessage('');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const uploadFile = async () => {
    if (!selectedFile) {
      setMessage('Lütfen bir dosya seçin');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('employee', employeeId);
    formData.append('document_type', documentTypeId);
    formData.append('title', selectedFile.name);

    try {
      const response = await fetch('http://127.0.0.1:9000/api/documents/', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('Dosya başarıyla yüklendi!');
        setSelectedFile(null);
        if (onUploadSuccess) {
          onUploadSuccess(data);
        }
      } else {
        setMessage('Dosya yüklenirken hata oluştu');
      }
    } catch (error) {
      setMessage('Bağlantı hatası: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Paper
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        sx={{
          border: '2px dashed #ccc',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          '&:hover': {
            borderColor: '#60a5fa',
            backgroundColor: '#f8fafc'
          }
        }}
      >
        <CloudUpload sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Dosyayı buraya sürükleyin veya seçin
        </Typography>
        
        <input
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          style={{ display: 'none' }}
          id="file-upload"
          type="file"
          onChange={handleFileSelect}
        />
        <label htmlFor="file-upload">
          <Button
            variant="contained"
            component="span"
            startIcon={<AttachFile />}
          >
            Dosya Seç
          </Button>
        </label>

        {selectedFile && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">
              Seçilen dosya: {selectedFile.name}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Boyut: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </Typography>
          </Box>
        )}

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={uploadProgress} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Yükleniyor... %{uploadProgress}
            </Typography>
          </Box>
        )}

        {selectedFile && !uploading && (
          <Button
            variant="outlined"
            onClick={uploadFile}
            sx={{ mt: 2 }}
          >
            Yükle
          </Button>
        )}

        {message && (
          <Alert 
            severity={message.includes('başarıyla') ? 'success' : 'error'} 
            sx={{ mt: 2 }}
          >
            {message}
          </Alert>
        )}
      </Paper>
    </Box>
  );
}

export default FileUpload;