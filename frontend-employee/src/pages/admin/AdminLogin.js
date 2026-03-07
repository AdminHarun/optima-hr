// Admin Login - Tamamen ayrı login sistemi
import React, { useState, useEffect, useRef } from 'react';
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
  Fade,
  CircularProgress
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  AdminPanelSettings,
  Business,
  PhoneAndroid,
  ArrowBack
} from '@mui/icons-material';

const TURNSTILE_SITE_KEY = '0x4AAAAAACh60GABJM3jjI_D';

function AdminLogin() {
  const navigate = useNavigate();
  const { login, verify2FA, isLoading, isAuthenticated } = useEmployeeAuth();

  // Login form state
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Turnstile state
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);
  const turnstileWidgetId = useRef(null);

  // 2FA state
  const [twoFAStep, setTwoFAStep] = useState(false); // 2FA adımında mıyız?
  const [twoFAUserId, setTwoFAUserId] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Turnstile init
  useEffect(() => {
    const renderTurnstile = () => {
      if (window.turnstile && turnstileRef.current && !turnstileWidgetId.current) {
        turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(''),
          theme: 'light',
          language: 'tr'
        });
      }
    };
    if (window.turnstile) {
      renderTurnstile();
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.onload = () => setTimeout(renderTurnstile, 100);
      document.head.appendChild(script);
    }
    return () => {
      if (turnstileWidgetId.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
    };
  }, []);

  // 2FA'dan geri dönünce Turnstile'ı yeniden render et
  useEffect(() => {
    if (!twoFAStep && turnstileRef.current && !turnstileWidgetId.current) {
      if (window.turnstile) {
        turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(''),
          theme: 'light',
          language: 'tr'
        });
      }
    }
  }, [twoFAStep]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  // Adım 1: Email + Şifre
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }
    if (!turnstileToken) {
      setError('Bot doğrulamasını tamamlayın');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password, turnstileToken);

    if (result.success) {
      navigate('/admin/dashboard');
    } else if (result.requires2FA) {
      // 2FA gerekli — ikinci adıma geç
      setTwoFAUserId(result.userId);
      setTwoFAStep(true);
      setError('');
    } else {
      setError(result.error || 'Giriş başarısız');
      // Turnstile'ı resetle
      if (window.turnstile && turnstileWidgetId.current) {
        window.turnstile.reset(turnstileWidgetId.current);
        setTurnstileToken('');
      }
    }

    setLoading(false);
  };

  // Adım 2: TOTP Kodu
  const handle2FASubmit = async (e) => {
    e.preventDefault();
    if (!twoFACode.trim()) {
      setError('Lütfen doğrulama kodunu girin');
      return;
    }

    setLoading(true);
    setError('');

    const result = await verify2FA(
      twoFAUserId,
      useBackupCode ? null : twoFACode.replace(/\s/g, ''),
      useBackupCode ? twoFACode.replace(/\s/g, '') : null
    );

    if (result.success) {
      navigate('/admin/dashboard');
    } else {
      setError(result.error || 'Geçersiz doğrulama kodu');
    }

    setLoading(false);
  };

  const demoUsers = [
    { email: 'admin@company.com', role: 'Süper Admin', password: 'admin123' },
    { email: 'furkan@optima.com', role: 'Yönetici (Furkan)', password: 'furkan123' },
    { email: 'harun@optima.com', role: 'HR Müdürü (Harun)', password: 'harun123' }
  ];

  if (isLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundImage: "url('/site_background.jpg')",
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center center',
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
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          zIndex: 0
        }
      }}
    >
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, WebkitAppRegion: 'no-drag' }}>
        <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>

          {/* Sol Taraf — Login / 2FA Form */}
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
                  width: 80, height: 80, mx: 'auto', mb: 2,
                  background: twoFAStep
                    ? 'linear-gradient(135deg, #1c61ab, #9c27b0)'
                    : 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                  boxShadow: '0 8px 32px rgba(28, 97, 171, 0.3)'
                }}
              >
                {twoFAStep ? <PhoneAndroid sx={{ fontSize: 40 }} /> : <AdminPanelSettings sx={{ fontSize: 40 }} />}
              </Avatar>

              <Typography variant="h4" gutterBottom sx={{
                background: twoFAStep
                  ? 'linear-gradient(135deg, #1c61ab, #9c27b0)'
                  : 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 'bold'
              }}>
                {twoFAStep ? 'İki Faktörlü Doğrulama' : 'Yönetici Girişi'}
              </Typography>

              <Typography variant="body1" color="text.secondary">
                {twoFAStep
                  ? useBackupCode
                    ? 'Yedek kodunuzu girin'
                    : 'Authenticator uygulamanızdaki 6 haneli kodu girin'
                  : 'HR Yönetim Paneline Erişim'
                }
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
                {error}
              </Alert>
            )}

            {/* Turnstile - her zaman DOM'da, sadece CSS ile gizle */}
            <Box sx={{ display: twoFAStep ? 'none' : 'flex', justifyContent: 'center', mb: 2 }}>
              <div ref={turnstileRef}></div>
            </Box>

            {/* Adım 1: Email + Şifre */}
            {!twoFAStep && (
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Email Adresi"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  placeholder="admin@company.com"
                />

                <TextField
                  fullWidth
                  label="Şifre"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
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
                  disabled={loading || !turnstileToken}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LoginIcon />}
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
            )}

            {/* Adım 2: 2FA Kodu */}
            {twoFAStep && (
              <form onSubmit={handle2FASubmit}>
                {!useBackupCode && (
                  <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
                    Google Authenticator, Authy veya Microsoft Authenticator uygulamanızı açın ve 6 haneli kodu girin.
                  </Alert>
                )}

                <TextField
                  fullWidth
                  label={useBackupCode ? 'Yedek Kod' : 'Doğrulama Kodu'}
                  value={twoFACode}
                  onChange={(e) => {
                    setTwoFACode(e.target.value);
                    if (error) setError('');
                  }}
                  sx={{ mb: 3, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  placeholder={useBackupCode ? 'XXXXXXXX' : '000 000'}
                  inputProps={{
                    maxLength: useBackupCode ? 8 : 7,
                    style: { textAlign: 'center', fontSize: '1.4rem', letterSpacing: '0.3rem', fontWeight: 'bold' }
                  }}
                  autoFocus
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PhoneAndroid />}
                  sx={{
                    py: 1.5,
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #1c61ab, #9c27b0)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #9c27b0, #1c61ab)',
                      transform: 'translateY(-2px)',
                    },
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    transition: 'all 0.3s ease',
                    mb: 2
                  }}
                >
                  {loading ? 'Doğrulanıyor...' : 'Doğrula'}
                </Button>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Button
                    size="small"
                    startIcon={<ArrowBack />}
                    onClick={() => {
                      setTwoFAStep(false);
                      setTwoFACode('');
                      setUseBackupCode(false);
                      setError('');
                    }}
                    sx={{ color: 'text.secondary' }}
                  >
                    Geri Dön
                  </Button>

                  <Button
                    size="small"
                    onClick={() => {
                      setUseBackupCode(!useBackupCode);
                      setTwoFACode('');
                      setError('');
                    }}
                    sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
                  >
                    {useBackupCode ? 'Authenticator kodu kullan' : 'Yedek kod kullan'}
                  </Button>
                </Box>
              </form>
            )}

            {!twoFAStep && (
              <>
                <Divider sx={{ my: 3 }}>veya</Divider>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Demo hesabı ile giriş yapmak için aşağıdaki bilgileri kullanın
                  </Typography>
                </Box>
              </>
            )}
          </Paper>

          {/* Sağ Taraf — Demo Kullanıcılar (sadece login adımında) */}
          {!twoFAStep && (
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
                        color: 'white', fontSize: 32, mr: 2,
                        background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                        borderRadius: '50%', p: 1
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
                          '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 25px rgba(28, 97, 171, 0.2)' }
                        }}
                        onClick={() => setFormData({ email: user.email, password: user.password })}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="subtitle2" color="primary" fontWeight="bold">{user.role}</Typography>
                          <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                          <Typography variant="caption" color="text.secondary">Şifre: {user.password}</Typography>
                        </CardContent>
                      </Card>
                    ))}

                    <Alert severity="info" sx={{ mt: 2, fontSize: '12px' }}>
                      <Typography variant="caption">
                        💡 Demo hesaplardan birini seçerek hızlı giriş yapabilirsiniz.
                      </Typography>
                    </Alert>
                  </CardContent>
                </Card>
              </Fade>
            </Box>
          )}

          {/* Sağ Taraf — 2FA Yardım bilgisi */}
          {twoFAStep && (
            <Box sx={{ flex: 1, minWidth: '350px' }}>
              <Fade in timeout={600}>
                <Card sx={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '20px',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)'
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', mb: 2 }}>
                      Nasıl Kullanılır?
                    </Typography>

                    {[
                      { step: '1', text: 'Google Authenticator, Authy veya Microsoft Authenticator uygulamanızı açın' },
                      { step: '2', text: 'Optima HR için oluşturulan 6 haneli kodu bulun' },
                      { step: '3', text: 'Kodu bu alana girin (her 30 saniyede yenilenir)' },
                    ].map(({ step, text }) => (
                      <Box key={step} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                        <Avatar sx={{ width: 32, height: 32, background: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', fontWeight: 'bold', color: 'white', flexShrink: 0 }}>
                          {step}
                        </Avatar>
                        <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', pt: 0.3 }}>
                          {text}
                        </Typography>
                      </Box>
                    ))}

                    <Alert severity="warning" sx={{ mt: 2, background: 'rgba(255,167,38,0.15)', color: 'white', border: '1px solid rgba(255,167,38,0.3)', '& .MuiAlert-icon': { color: '#ffa726' } }}>
                      <Typography variant="caption">
                        Uygulamanıza erişemiyorsanız "Yedek kod kullan" seçeneğini deneyin.
                      </Typography>
                    </Alert>
                  </CardContent>
                </Card>
              </Fade>
            </Box>
          )}

        </Box>
      </Container>
    </Box>
  );
}

export default AdminLogin;
