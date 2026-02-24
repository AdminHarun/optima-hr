// src/pages/ApplicationSuccess.js - Basvuru Basarili Sayfasi
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import sessionManager from '@shared/utils/sessionManager';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Fade,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Dashboard as DashboardIcon,
  Chat as ChatIcon,
  Assignment as AssignmentIcon,
  EventAvailable as InterviewIcon,
  ThumbUp as ApprovedIcon,
  Security as SecurityIcon,
  Login as LoginIcon
} from '@mui/icons-material';

const steps = [
  { label: 'Form Gonderildi', icon: <AssignmentIcon /> },
  { label: 'Inceleme', icon: <CheckIcon /> },
  { label: 'Mulakat', icon: <InterviewIcon /> },
  { label: 'Sonuc', icon: <ApprovedIcon /> }
];

function ApplicationSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // State'den gelen verileri al (ApplicationForm'dan)
    const stateData = location.state;

    if (stateData) {
      setProfileData({
        firstName: stateData.firstName || '',
        lastName: stateData.lastName || '',
        email: stateData.email || '',
        chatToken: stateData.chatToken || '',
        applicationId: stateData.applicationId || '',
        profileId: stateData.profileId || ''
      });

      // Session'i guncelle (cabinet icin)
      if (stateData.profileId && stateData.email) {
        sessionManager.createSession(stateData.profileId, stateData.email, {
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timestamp: new Date().toISOString()
        });
      }
    }

    setLoading(false);
  }, [location]);

  if (loading) {
    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
      }}>
        <LinearProgress sx={{ width: 200 }} />
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: "url('/site_background.jpg')",
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      backgroundPosition: 'center center',
      py: 4,
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.88))',
        zIndex: 0
      }
    }}>
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Fade in timeout={600}>
          <Paper sx={{
            borderRadius: '24px',
            overflow: 'hidden',
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(71, 85, 105, 0.3)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4)'
          }}>
            {/* Header - Basari Ikonu */}
            <Box sx={{
              p: 4,
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(139, 185, 74, 0.15), rgba(28, 97, 171, 0.1))',
              borderBottom: '1px solid rgba(71, 85, 105, 0.2)'
            }}>
              <Box sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                mx: 'auto',
                mb: 2,
                background: 'linear-gradient(135deg, #8bb94a, #a4d65e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(139, 185, 74, 0.4)',
                animation: 'pulse 2s infinite'
              }}>
                <CheckIcon sx={{ color: '#fff', fontSize: 48 }} />
              </Box>

              <Typography variant="h4" sx={{
                color: '#f1f5f9',
                fontWeight: 700,
                mb: 1,
                background: 'linear-gradient(135deg, #8bb94a, #a4d65e)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Basvurunuz Alindi!
              </Typography>

              {profileData?.firstName && (
                <Typography sx={{ color: '#94a3b8', fontSize: '1.1rem' }}>
                  Tebrikler {profileData.firstName}! Basvurunuz basariyla kaydedildi.
                </Typography>
              )}
            </Box>

            {/* Ilerleme Cubugu */}
            <Box sx={{ px: 4, py: 3, background: 'rgba(28, 97, 171, 0.05)' }}>
              <Stepper activeStep={0} alternativeLabel>
                {steps.map((step, index) => (
                  <Step key={step.label} completed={index === 0}>
                    <StepLabel
                      StepIconProps={{
                        sx: {
                          color: index === 0 ? '#8bb94a' : 'rgba(148, 163, 184, 0.3)',
                          '&.Mui-active': { color: '#8bb94a' },
                          '&.Mui-completed': { color: '#8bb94a' }
                        }
                      }}
                    >
                      <Typography sx={{
                        color: index === 0 ? '#f1f5f9' : '#64748b',
                        fontSize: '0.75rem',
                        fontWeight: index === 0 ? 600 : 400
                      }}>
                        {step.label}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* Ana Icerik */}
            <Box sx={{ p: 4 }}>
              {/* Onemli Bilgi */}
              <Alert
                severity="info"
                icon={<SecurityIcon sx={{ color: '#60a5fa' }} />}
                sx={{
                  mb: 3,
                  borderRadius: '12px',
                  backgroundColor: 'rgba(28, 97, 171, 0.1)',
                  border: '1px solid rgba(28, 97, 171, 0.2)',
                  color: '#bfdbfe',
                  '& .MuiAlert-message': { width: '100%' }
                }}
              >
                <Typography sx={{ fontWeight: 600, mb: 1, color: '#f1f5f9' }}>
                  Aday Paneliniz Hazir!
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                  Artik Aday Paneliniz uzerinden basvurunuzun durumunu takip edebilir ve IK ekibiyle mesajlasabilirsiniz.
                </Typography>
              </Alert>

              {/* Giris Bilgileri */}
              <Box sx={{
                p: 3,
                borderRadius: '16px',
                background: 'rgba(139, 185, 74, 0.08)',
                border: '1px solid rgba(139, 185, 74, 0.2)',
                mb: 3
              }}>
                <Typography sx={{ color: '#8bb94a', fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LoginIcon sx={{ fontSize: 20 }} />
                  Giris Bilgileriniz
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>Email:</Typography>
                    <Typography sx={{ color: '#f1f5f9', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {profileData?.email || '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>Giris Yontemi:</Typography>
                    <Typography sx={{ color: '#f1f5f9', fontWeight: 500, fontSize: '0.9rem' }}>
                      Sifre veya Guvenlik Sorusu
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2, borderColor: 'rgba(139, 185, 74, 0.2)' }} />

                <Typography sx={{ color: '#71717a', fontSize: '0.8rem', textAlign: 'center' }}>
                  Profil olustururken belirlediginiz sifre veya guvenlik sorusu ile giris yapabilirsiniz.
                </Typography>
              </Box>

              {/* Butonlar */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<DashboardIcon />}
                  onClick={() => navigate('/cabinet')}
                  sx={{
                    py: 1.5,
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '1rem',
                    background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                    boxShadow: '0 8px 32px rgba(28, 97, 171, 0.3)',
                    textTransform: 'none',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #8bb94a, #1c61ab)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 40px rgba(28, 97, 171, 0.4)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  Aday Paneline Git
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ChatIcon />}
                  onClick={() => navigate('/cabinet')}
                  sx={{
                    py: 1.2,
                    borderRadius: '12px',
                    fontWeight: 600,
                    borderColor: 'rgba(71, 85, 105, 0.5)',
                    color: '#94a3b8',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: '#8bb94a',
                      color: '#8bb94a',
                      background: 'rgba(139, 185, 74, 0.05)'
                    }
                  }}
                >
                  IK ile Mesajlas
                </Button>
              </Box>

              {/* Alt Bilgi */}
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography sx={{ color: '#475569', fontSize: '0.8rem' }}>
                  Basvurunuz inceleme surecine alindi. Ortalama degerlendirme suresi 2-3 is gunudur.
                </Typography>
              </Box>
            </Box>

            {/* Footer */}
            <Box sx={{
              p: 2,
              textAlign: 'center',
              borderTop: '1px solid rgba(71, 85, 105, 0.2)',
              background: 'rgba(15, 23, 42, 0.3)'
            }}>
              <Typography sx={{ color: '#475569', fontSize: '0.75rem' }}>
                Optima HR - Aday Basvuru Sistemi
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Container>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 8px 32px rgba(139, 185, 74, 0.4); }
          50% { box-shadow: 0 8px 48px rgba(139, 185, 74, 0.6); }
          100% { box-shadow: 0 8px 32px rgba(139, 185, 74, 0.4); }
        }
      `}</style>
    </Box>
  );
}

export default ApplicationSuccess;
