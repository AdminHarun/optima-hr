// Admin Login - Tamamen ayrı login sistemi
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Card,
  CardContent,
  Avatar,
  Fade
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  Security,
  AdminPanelSettings,
  Business
} from '@mui/icons-material';

function AdminLogin() {
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated } = useEmployeeAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Zaten giriş yapmışsa dashboard'a yönlendir
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(''); // Hata varsa temizle
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        // Başarılı giriş - dashboard'a yönlendir
        navigate('/admin/dashboard');
      } else {
        setError(result.error || 'Giriş başarısız');
      }
    } catch (error) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Demo kullanıcıları göster
  const demoUsers = [
    { email: 'admin@company.com', role: 'Süper Admin', password: 'admin123' },
    { email: 'furkan@optima.com', role: 'Yönetici (Furkan)', password: 'furkan123' },
    { email: 'harun@optima.com', role: 'HR Müdürü (Harun)', password: 'harun123' }
  ];

  if (isLoading) {
    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        WebkitAppRegion: 'drag'
      }}>
        <Typography>Yükleniyor...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: "url('/site_background.jpg')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundPosition: "center center",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
        px: 2,
        WebkitAppRegion: 'drag',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 0
        }
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, WebkitAppRegion: 'no-drag' }}>
        <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Sol Taraf - Login Form */}
          <Paper
            sx={{
              flex: 1,
              minWidth: '400px',
              maxWidth: '500px',
              p: 4,
              borderRadius: '24px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 32px 80px rgba(0, 0, 0, 0.3)',
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  mx: 'auto',
                  mb: 2,
                  background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                  boxShadow: '0 8px 32px rgba(28, 97, 171, 0.3)'
                }}
              >
                <AdminPanelSettings sx={{ fontSize: 40 }} />
              </Avatar>
              
              <Typography variant="h4" gutterBottom sx={{
                background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 'bold'
              }}>
                Yönetici Girişi
              </Typography>
              
              <Typography variant="body1" color="text.secondary">
                HR Yönetim Paneline Erişim
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email Adresi"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                  }
                }}
                placeholder="admin@company.com"
              />

              <TextField
                fullWidth
                label="Şifre"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                startIcon={<LoginIcon />}
                sx={{
                  py: 1.5,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #8bb94a, #1c61ab)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(28, 97, 171, 0.4)'
                  },
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </Button>
            </form>

            <Divider sx={{ my: 3 }}>veya</Divider>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Demo hesabı ile giriş yapmak için yukarıdaki bilgileri kullanın
              </Typography>
            </Box>
          </Paper>

          {/* Sağ Taraf - Demo Kullanıcılar */}
          <Box sx={{ flex: 1, minWidth: '350px' }}>
            <Fade in timeout={1000}>
              <Card sx={{
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '20px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Business sx={{ 
                      color: 'white', 
                      fontSize: 32, 
                      mr: 2,
                      background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                      borderRadius: '50%',
                      p: 1
                    }} />
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                      Demo Hesaplar
                    </Typography>
                  </Box>

                  {demoUsers.map((user, index) => (
                    <Card 
                      key={index}
                      sx={{
                        mb: 2,
                        background: 'rgba(255, 255, 255, 0.9)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(28, 97, 171, 0.2)'
                        }
                      }}
                      onClick={() => {
                        setFormData({
                          email: user.email,
                          password: user.password
                        });
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="subtitle2" color="primary" fontWeight="bold">
                          {user.role}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {user.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Şifre: {user.password}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}

                  <Alert severity="info" sx={{ mt: 2, fontSize: '12px' }}>
                    <Typography variant="caption">
                      💡 Demo hesaplardan birini seçerek hızlı giriş yapabilirsiniz.
                      Bu hesaplar sadece test amaçlıdır.
                    </Typography>
                  </Alert>
                </CardContent>
              </Card>
            </Fade>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

export default AdminLogin;
