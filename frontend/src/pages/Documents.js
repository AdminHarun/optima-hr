import React, { useState, useEffect } from 'react';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Box,
  IconButton,
  CircularProgress,
  Button,
  Fab
} from '@mui/material';
import { 
  Download, 
  Visibility, 
  Delete,
  CloudUpload as UploadIcon,
  Add as AddIcon 
} from '@mui/icons-material';
import documentService from '../services/documentService';

function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentService.getAllDocuments();
      setDocuments(data.results || data);
    } catch (error) {
      console.error('Belgeler yüklenirken hata:', error);
      setError(error.message);
      // Mock data for testing
      setDocuments([
        {
          id: 1,
          title: 'Kimlik Fotokopisi',
          employee_name: 'John Doe',
          document_type_name: 'Kimlik',
          upload_date: '2024-01-15',
          expiry_date: '2034-01-15',
          is_verified: true,
          file_url: '#'
        },
        {
          id: 2,
          title: 'Diploma',
          employee_name: 'Jane Smith',
          document_type_name: 'Eğitim',
          upload_date: '2024-01-10',
          expiry_date: null,
          is_verified: false,
          file_url: '#'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (documentId, title) => {
    try {
      // API'de download endpoint'i yoksa file_url'den indir
      const doc = documents.find(d => d.id === documentId);
      if (doc && doc.file_url) {
        const link = document.createElement('a');
        link.href = doc.file_url;
        link.download = title;
        link.click();
      }
    } catch (error) {
      console.error('İndirme hatası:', error);
    }
  };

  const handleDelete = async (documentId) => {
    if (window.confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) {
      try {
        await documentService.deleteDocument(documentId);
        setDocuments(documents.filter(doc => doc.id !== documentId));
      } catch (error) {
        console.error('Silme hatası:', error);
      }
    }
  };

  const handleVerify = async (documentId) => {
    try {
      await documentService.verifyDocument(documentId);
      setDocuments(documents.map(doc => 
        doc.id === documentId ? { ...doc, is_verified: true } : doc
      ));
    } catch (error) {
      console.error('Doğrulama hatası:', error);
    }
  };

  const getStatusColor = (doc) => {
    if (!doc.is_verified) return 'warning';
    if (doc.expiry_date) {
      const expiry = new Date(doc.expiry_date);
      const today = new Date();
      const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'error';
      if (diffDays < 30) return 'warning';
    }
    return 'success';
  };

  const getStatusLabel = (doc) => {
    if (!doc.is_verified) return 'Onay Bekliyor';
    if (doc.expiry_date) {
      const expiry = new Date(doc.expiry_date);
      const today = new Date();
      const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'Süresi Dolmuş';
      if (diffDays < 30) return `${diffDays} Gün Kaldı`;
    }
    return 'Onaylı';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Belge Yönetimi
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Toplam {documents.length} belge
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => console.log('Belge yükle')}
        >
          Belge Yükle
        </Button>
      </Box>

      {error && (
        <Box mb={2}>
          <Typography color="error">
            Hata: {error}
          </Typography>
        </Box>
      )}

      <Grid container spacing={3}>
        {documents.map((doc) => (
          <Grid item xs={12} md={6} lg={4} key={doc.id}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography variant="h6" gutterBottom noWrap sx={{ flex: 1 }}>
                    {doc.title}
                  </Typography>
                  <Chip 
                    label={getStatusLabel(doc)} 
                    color={getStatusColor(doc)} 
                    size="small"
                  />
                </Box>
                
                <Typography color="textSecondary" gutterBottom>
                  <strong>Çalışan:</strong> {doc.employee_name || 'Belirtilmemiş'}
                </Typography>
                
                <Typography color="textSecondary" gutterBottom>
                  <strong>Tür:</strong> {doc.document_type_name || 'Diğer'}
                </Typography>
                
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  <strong>Yüklenme:</strong> {new Date(doc.upload_date).toLocaleDateString('tr-TR')}
                </Typography>
                
                {doc.expiry_date && (
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    <strong>Geçerlilik:</strong> {new Date(doc.expiry_date).toLocaleDateString('tr-TR')}
                  </Typography>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <IconButton 
                    color="primary"
                    onClick={() => handleDownload(doc.id, doc.title)}
                    title="İndir"
                    size="small"
                  >
                    <Download />
                  </IconButton>
                  
                  <IconButton 
                    color="info"
                    onClick={() => window.open(doc.file_url, '_blank')}
                    title="Görüntüle"
                    size="small"
                  >
                    <Visibility />
                  </IconButton>
                  
                  {!doc.is_verified && (
                    <Button
                      size="small"
                      color="success"
                      onClick={() => handleVerify(doc.id)}
                    >
                      Onayla
                    </Button>
                  )}
                  
                  <IconButton 
                    color="error"
                    onClick={() => handleDelete(doc.id)}
                    title="Sil"
                    size="small"
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {documents.length === 0 && !error && (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Henüz belge yüklenmemiş
              </Typography>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                sx={{ mt: 2 }}
                onClick={() => console.log('İlk belgeyi yükle')}
              >
                İlk Belgeyi Yükle
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => console.log('Yeni belge ekle')}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}

export default Documents;
