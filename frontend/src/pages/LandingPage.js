import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  WorkOutline as WorkIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Support as SupportIcon,
  Login as LoginIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';

const LandingPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const services = [
    {
      icon: <PeopleIcon sx={{ fontSize: 48, color: '#1c61ab' }} />,
      title: 'Personel Yönetimi',
      description: 'Çalışan bilgilerini merkezi olarak yönetin, performans takibi yapın ve kariyer gelişimlerini planlayın.'
    },
    {
      icon: <WorkIcon sx={{ fontSize: 48, color: '#1c61ab' }} />,
      title: 'İşe Alım Süreci',
      description: 'Başvuru takibi, mülakat planlama ve aday değerlendirme süreçlerini tek platformda yönetin.'
    },
    {
      icon: <AssessmentIcon sx={{ fontSize: 48, color: '#1c61ab' }} />,
      title: 'Performans Analizi',
      description: 'Detaylı raporlar ve analizler ile çalışan performansını ölçün ve iyileştirme alanlarını belirleyin.'
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 48, color: '#1c61ab' }} />,
      title: 'Güvenli Veri Yönetimi',
      description: 'KVKK uyumlu altyapı ile tüm personel verilerinizi güvenle saklayın ve yönetin.'
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 48, color: '#1c61ab' }} />,
      title: 'Hızlı Entegrasyon',
      description: 'Mevcut sistemlerinizle kolay entegrasyon ve hızlı kurulum ile anında kullanmaya başlayın.'
    },
    {
      icon: <SupportIcon sx={{ fontSize: 48, color: '#1c61ab' }} />,
      title: '7/24 Destek',
      description: 'Teknik destek ekibimiz her an yanınızda. Sorularınız için bize ulaşın.'
    }
  ];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.95) 0%, rgba(28, 97, 171, 0.85) 50%, rgba(139, 185, 74, 0.8) 100%)',
            zIndex: 1
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0
          }
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box sx={{ color: 'white' }}>
                {/* Logo */}
                <Box sx={{ mb: 4 }}>
                  <img
                    src="/logo3.png"
                    alt="Optima HR"
                    style={{
                      height: isMobile ? 60 : 80,
                      filter: 'brightness(0) invert(1)'
                    }}
                  />
                </Box>

                <Typography
                  variant={isMobile ? 'h3' : 'h2'}
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    mb: 3,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                  }}
                >
                  Modern İnsan Kaynakları Yönetimi
                </Typography>

                <Typography
                  variant={isMobile ? 'h6' : 'h5'}
                  sx={{
                    mb: 4,
                    opacity: 0.95,
                    fontWeight: 400,
                    lineHeight: 1.6
                  }}
                >
                  Şirketinizin en değerli varlığı olan insan kaynağınızı
                  en verimli şekilde yönetmek için geliştirilmiş profesyonel HR platformu.
                </Typography>

                <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/admin/login')}
                    startIcon={<LoginIcon />}
                    sx={{
                      bgcolor: 'white',
                      color: '#1c61ab',
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.9)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Yönetici Girişi
                  </Button>

                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/applicant-login')}
                    endIcon={<ArrowForwardIcon />}
                    sx={{
                      borderColor: 'white',
                      color: 'white',
                      px: 4,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.15)',
                        transform: 'translateY(-2px)'
                      },
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Aday Girişi
                  </Button>
                </Stack>
              </Box>
            </Grid>

            {/* Stats Section */}
            <Grid item xs={12} md={5}>
              <Box
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: 4,
                  p: 4,
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                <Grid container spacing={3}>
                  {[
                    { value: '500+', label: 'Aktif Kullanıcı' },
                    { value: '50+', label: 'Şirket' },
                    { value: '10K+', label: 'Başvuru İşlendi' },
                    { value: '%99.9', label: 'Uptime' }
                  ].map((stat, index) => (
                    <Grid item xs={6} key={index}>
                      <Box sx={{ textAlign: 'center', color: 'white' }}>
                        <Typography
                          variant="h3"
                          sx={{ fontWeight: 700, mb: 0.5 }}
                        >
                          {stat.value}
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9 }}>
                          {stat.label}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </Container>

        {/* Scroll Indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2,
            animation: 'bounce 2s infinite'
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 50,
              border: '2px solid rgba(255,255,255,0.5)',
              borderRadius: 15,
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 6,
                height: 10,
                bgcolor: 'white',
                borderRadius: 3,
                animation: 'scroll 2s infinite'
              }
            }}
          />
        </Box>
      </Box>

      {/* Services Section */}
      <Box
        sx={{
          py: { xs: 8, md: 12 },
          bgcolor: '#f8fafc'
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography
              variant="overline"
              sx={{
                color: '#8bb94a',
                fontWeight: 600,
                letterSpacing: 2,
                mb: 2,
                display: 'block'
              }}
            >
              HİZMETLERİMİZ
            </Typography>
            <Typography
              variant={isMobile ? 'h4' : 'h3'}
              sx={{ fontWeight: 700, color: '#1c61ab', mb: 2 }}
            >
              Kapsamlı HR Çözümleri
            </Typography>
            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', maxWidth: 600, mx: 'auto' }}
            >
              İşe alımdan performans yönetimine, tüm insan kaynakları süreçlerinizi
              tek bir platformdan yönetin.
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {services.map((service, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  sx={{
                    height: '100%',
                    transition: 'all 0.3s ease',
                    border: '1px solid #e5e7eb',
                    boxShadow: 'none',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(28, 97, 171, 0.15)',
                      borderColor: '#1c61ab'
                    }
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ mb: 3 }}>{service.icon}</Box>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 600, mb: 2, color: '#1e293b' }}
                    >
                      {service.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {service.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          py: { xs: 8, md: 10 },
          background: 'linear-gradient(135deg, #1c61ab 0%, #0d4a8c 100%)',
          color: 'white'
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant={isMobile ? 'h4' : 'h3'}
              sx={{ fontWeight: 700, mb: 3 }}
            >
              Hemen Başlayın
            </Typography>
            <Typography
              variant="h6"
              sx={{ mb: 4, opacity: 0.9, fontWeight: 400 }}
            >
              İnsan kaynakları süreçlerinizi dijitalleştirmek için
              hemen giriş yapın veya demo talep edin.
            </Typography>
            <Stack
              direction={isMobile ? 'column' : 'row'}
              spacing={2}
              justifyContent="center"
            >
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/admin/login')}
                sx={{
                  bgcolor: 'white',
                  color: '#1c61ab',
                  px: 5,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.9)'
                  }
                }}
              >
                Giriş Yap
              </Button>
              <Button
                variant="outlined"
                size="large"
                href="mailto:info@optimahrms.com?subject=Demo Talebi"
                sx={{
                  borderColor: 'white',
                  color: 'white',
                  px: 5,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                Demo Talep Et
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 6,
          bgcolor: '#0f172a',
          color: 'white'
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ mb: 3 }}>
                <img
                  src="/logo3.png"
                  alt="Optima HR"
                  style={{
                    height: 50,
                    filter: 'brightness(0) invert(1)'
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.7, mb: 2 }}>
                Optima HR, şirketlerin insan kaynakları süreçlerini
                dijitalleştirmelerine yardımcı olan profesyonel bir
                yönetim platformudur.
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Hızlı Erişim
              </Typography>
              <Stack spacing={1}>
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.7,
                    cursor: 'pointer',
                    '&:hover': { opacity: 1 }
                  }}
                  onClick={() => navigate('/admin/login')}
                >
                  Yönetici Girişi
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.7,
                    cursor: 'pointer',
                    '&:hover': { opacity: 1 }
                  }}
                  onClick={() => navigate('/applicant-login')}
                >
                  Aday Girişi
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                İletişim
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  info@optimahrms.com
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  ik@optimahrms.com
                </Typography>
              </Stack>
            </Grid>
          </Grid>

          <Divider sx={{ my: 4, borderColor: 'rgba(255,255,255,0.1)' }} />

          <Box
            sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Typography variant="body2" sx={{ opacity: 0.5 }}>
              © {new Date().getFullYear()} Optima HR Management System. Tüm hakları saklıdır.
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.5 }}>
              KVKK Uyumlu
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
              transform: translateX(-50%) translateY(0);
            }
            40% {
              transform: translateX(-50%) translateY(-10px);
            }
            60% {
              transform: translateX(-50%) translateY(-5px);
            }
          }

          @keyframes scroll {
            0% {
              opacity: 1;
              transform: translateX(-50%) translateY(0);
            }
            100% {
              opacity: 0;
              transform: translateX(-50%) translateY(15px);
            }
          }
        `}
      </style>
    </Box>
  );
};

export default LandingPage;
