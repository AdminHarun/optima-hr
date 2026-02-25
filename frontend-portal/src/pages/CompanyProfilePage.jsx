import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, TextField, Button,
  Avatar, Alert, Divider
} from '@mui/material';
import {
  Business as BusinessIcon, Save as SaveIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';

export default function CompanyProfilePage() {
  const [company, setCompany] = useState({
    name: 'Optima HR',
    legalName: 'Optima İnsan Kaynakları A.Ş.',
    taxId: '',
    email: 'info@optima-hr.net',
    phone: '',
    address: '',
    city: 'İstanbul',
    country: 'Türkiye',
    website: 'https://optima-hr.net',
    description: 'Modern insan kaynakları yönetim platformu',
  });
  const [saved, setSaved] = useState(false);

  const handleChange = (key, value) => {
    setCompany(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '10px', backgroundColor: 'rgba(15, 23, 42, 0.5)',
      '& fieldset': { borderColor: 'rgba(71, 85, 105, 0.3)' },
      '&:hover fieldset': { borderColor: 'rgba(59, 130, 246, 0.5)' },
      '&.Mui-focused fieldset': { borderColor: '#3b82f6' }
    },
    '& .MuiInputLabel-root': { color: '#94a3b8' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#60a5fa' },
    '& .MuiOutlinedInput-input': { color: '#f1f5f9' },
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 700 }}>
            Şirket Profili
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            Organizasyon bilgilerinizi yönetin
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}
          sx={{
            background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
            fontWeight: 600, borderRadius: '12px', px: 3
          }}
        >
          Kaydet
        </Button>
      </Box>

      {saved && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>
          Şirket bilgileri kaydedildi
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Logo */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <Avatar sx={{
                width: 100, height: 100, mx: 'auto', mb: 2,
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                fontSize: '2.5rem', fontWeight: 800
              }}>
                O
              </Avatar>
              <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 600, mb: 0.5 }}>
                {company.name}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                {company.description}
              </Typography>
              <Button variant="outlined" startIcon={<UploadIcon />}
                sx={{
                  borderColor: 'rgba(71, 85, 105, 0.5)', color: '#94a3b8',
                  borderRadius: '10px',
                  '&:hover': { borderColor: '#3b82f6', color: '#3b82f6' }
                }}
              >
                Logo Yükle
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Bilgiler */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ color: '#f1f5f9', fontWeight: 600, mb: 3 }}>
                Genel Bilgiler
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Şirket Adı" value={company.name}
                    onChange={(e) => handleChange('name', e.target.value)} sx={inputSx} size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Resmi Ünvan" value={company.legalName}
                    onChange={(e) => handleChange('legalName', e.target.value)} sx={inputSx} size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Vergi No" value={company.taxId}
                    onChange={(e) => handleChange('taxId', e.target.value)} sx={inputSx} size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Website" value={company.website}
                    onChange={(e) => handleChange('website', e.target.value)} sx={inputSx} size="small" />
                </Grid>
              </Grid>

              <Divider sx={{ borderColor: 'rgba(71, 85, 105, 0.3)', my: 3 }} />

              <Typography variant="subtitle1" sx={{ color: '#f1f5f9', fontWeight: 600, mb: 3 }}>
                İletişim
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Email" value={company.email}
                    onChange={(e) => handleChange('email', e.target.value)} sx={inputSx} size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Telefon" value={company.phone}
                    onChange={(e) => handleChange('phone', e.target.value)} sx={inputSx} size="small" />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth label="Adres" value={company.address} multiline rows={2}
                    onChange={(e) => handleChange('address', e.target.value)} sx={inputSx} size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Şehir" value={company.city}
                    onChange={(e) => handleChange('city', e.target.value)} sx={inputSx} size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Ülke" value={company.country}
                    onChange={(e) => handleChange('country', e.target.value)} sx={inputSx} size="small" />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
