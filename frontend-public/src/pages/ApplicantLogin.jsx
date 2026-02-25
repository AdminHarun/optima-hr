// src/pages/ApplicantLogin.js - Aday Giris Sayfasi (DB-based auth)
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import sessionManager from '@shared/utils/sessionManager';
import applicationService from '../services/applicationService';
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
  Fade,
  CircularProgress
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  HelpOutline as HelpIcon,
  QuestionAnswer as QuestionIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

const inputSx = {
  mb: 3,
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(71, 85, 105, 0.5)',
    '& fieldset': { border: 'none' },
    '&:hover': { backgroundColor: 'rgba(30, 41, 59, 0.6)', borderColor: 'rgba(28, 97, 171, 0.5)' },
    '&.Mui-focused': { backgroundColor: 'rgba(30, 41, 59, 0.7)', borderColor: '#1c61ab', boxShadow: '0 0 0 3px rgba(28, 97, 171, 0.1)' }
  },
  '& .MuiInputLabel-root': { color: '#a1a1aa' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#60a5fa' },
  '& .MuiOutlinedInput-input': { color: '#f1f5f9' },
  '& .MuiFormHelperText-root': { color: '#71717a' },
  '& .MuiFormHelperText-root.Mui-error': { color: '#ef4444' }
};

function ApplicantLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('password'); // 'password' | 'security'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);
  const turnstileWidgetId = useRef(null);

  const TURNSTILE_SITE_KEY = '0x4AAAAAACh60GABJM3jjI_D';

  useEffect(() => {
    const renderTurnstile = () => {
      if (window.turnstile && turnstileRef.current && !turnstileWidgetId.current) {
        turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token) => setTurnstileToken(token),
          'expired-callback': () => setTurnstileToken(''),
          theme: 'dark',
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

  const handlePasswordLogin = async () => {
    setError('');
    if (!email.trim()) { setError('Email adresi gerekli'); return; }
    if (!password.trim()) { setError('Sifre gerekli'); return; }
    if (!turnstileToken) { setError('Lütfen "Gerçek kişi olduğunuzu doğrulayın" kutucuğunu tamamlayın'); return; }

    setLoading(true);
    try {
      const result = await applicationService.applicantLogin(email.trim(), password);

      // Giris basarili - session olustur
      sessionManager.createSession(result.id, result.email, {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: new Date().toISOString()
      });

      // Profil bilgilerini localStorage'a kaydet (cabinet icin)
      if (result.siteCode) {
        const profilesKey = `user_profiles_${result.siteCode}`;
        const profiles = JSON.parse(localStorage.getItem(profilesKey) || '[]');
        const exists = profiles.some(p => String(p.id) === String(result.id));
        if (!exists) {
          profiles.push({
            id: result.id,
            firstName: result.firstName,
            lastName: result.lastName,
            email: result.email,
            phone: result.phone,
            chatToken: result.chatToken,
            sessionToken: result.sessionToken,
            isActive: true
          });
          localStorage.setItem(profilesKey, JSON.stringify(profiles));
        }
      }

      setLoading(false);
      navigate('/cabinet');
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Giris basarisiz');
      if (window.turnstile && turnstileWidgetId.current) {
        window.turnstile.reset(turnstileWidgetId.current);
        setTurnstileToken('');
      }
    }
  };

  const handleSecurityMode = async () => {
    setError('');
    if (!email.trim()) { setError('Once email adresinizi girin'); return; }

    setLoading(true);
    try {
      const result = await applicationService.getSecurityQuestion(email.trim());
      setSecurityQuestion(result.securityQuestion);
      setMode('security');
      setError('');
    } catch (err) {
      setError(err.message || 'Guvenlik sorusu alinamadi');
    }
    setLoading(false);
  };

  const handleSecurityLogin = async () => {
    setError('');
    if (!securityAnswer.trim()) { setError('Guvenlik sorusu cevabi gerekli'); return; }

    setLoading(true);
    try {
      const result = await applicationService.applicantLoginWithSecurity(email.trim(), securityAnswer);

      sessionManager.createSession(result.id, result.email, {
        userAgent: navigator.userAgent,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timestamp: new Date().toISOString()
      });

      if (result.siteCode) {
        const profilesKey = `user_profiles_${result.siteCode}`;
        const profiles = JSON.parse(localStorage.getItem(profilesKey) || '[]');
        const exists = profiles.some(p => String(p.id) === String(result.id));
        if (!exists) {
          profiles.push({
            id: result.id,
            firstName: result.firstName,
            lastName: result.lastName,
            email: result.email,
            phone: result.phone,
            chatToken: result.chatToken,
            sessionToken: result.sessionToken,
            isActive: true
          });
          localStorage.setItem(profilesKey, JSON.stringify(profiles));
        }
      }

      setLoading(false);
      navigate('/cabinet');
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Giris basarisiz');
    }
  };

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
            {/* Header */}
            <Box sx={{
              p: 4, pb: 2, textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.15), rgba(139, 185, 74, 0.1))',
              borderBottom: '1px solid rgba(71, 85, 105, 0.2)'
            }}>
              <Box sx={{
                width: 64, height: 64, borderRadius: '18px', mx: 'auto', mb: 2,
                background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(28, 97, 171, 0.3)'
              }}>
                <LoginIcon sx={{ color: '#fff', fontSize: 32 }} />
              </Box>
              <Typography variant="h5" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 0.5 }}>
                Aday Girisi
              </Typography>
              <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                Panele erismeye devam etmek icin giris yapin
              </Typography>
            </Box>

            {/* Form */}
            <Box sx={{ p: 4 }}>
              {error && (
                <Alert severity="error" sx={{
                  mb: 3, borderRadius: '12px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#fca5a5',
                  '& .MuiAlert-icon': { color: '#ef4444' }
                }}>
                  {error}
                </Alert>
              )}

              {mode === 'password' ? (
                <>
                  <TextField
                    fullWidth label="Email Adresi" type="email"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                    sx={inputSx}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: '#60a5fa', fontSize: '1.1rem' }} /></InputAdornment>
                    }}
                  />

                  <TextField
                    fullWidth label="Sifre" type={showPassword ? 'text' : 'password'}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePasswordLogin()}
                    sx={inputSx}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: '#60a5fa', fontSize: '1.1rem' }} /></InputAdornment>,
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} sx={{ color: '#94a3b8' }}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />

                  {/* Cloudflare Turnstile */}
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <div ref={turnstileRef}></div>
                  </Box>

                  <Button fullWidth variant="contained" onClick={handlePasswordLogin} disabled={loading || !turnstileToken}
                    startIcon={loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : null}
                    sx={{
                      py: 1.5, borderRadius: '12px', fontWeight: 700, fontSize: '1rem',
                      background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                      boxShadow: '0 8px 32px rgba(28, 97, 171, 0.3)',
                      textTransform: 'none',
                      '&:hover': { background: 'linear-gradient(135deg, #8bb94a, #1c61ab)', transform: 'translateY(-2px)', boxShadow: '0 12px 40px rgba(28, 97, 171, 0.4)' },
                      transition: 'all 0.3s ease'
                    }}>
                    {loading ? 'Giris yapiliyor...' : 'Giris Yap'}
                  </Button>

                  <Divider sx={{ my: 3, borderColor: 'rgba(71, 85, 105, 0.3)' }}>
                    <Typography sx={{ color: '#64748b', fontSize: '0.8rem' }}>veya</Typography>
                  </Divider>

                  <Button fullWidth variant="outlined" startIcon={<HelpIcon />} onClick={handleSecurityMode}
                    disabled={loading}
                    sx={{
                      py: 1.2, borderRadius: '12px', fontWeight: 600,
                      borderColor: 'rgba(71, 85, 105, 0.5)', color: '#94a3b8',
                      textTransform: 'none',
                      '&:hover': { borderColor: '#8bb94a', color: '#8bb94a', background: 'rgba(139, 185, 74, 0.05)' }
                    }}>
                    Sifremi unuttum - Guvenlik sorusu ile giris
                  </Button>
                </>
              ) : (
                <>
                  <Button startIcon={<ArrowBackIcon />} onClick={() => { setMode('password'); setError(''); setSecurityAnswer(''); }}
                    sx={{ mb: 2, color: '#94a3b8', textTransform: 'none', '&:hover': { color: '#60a5fa' } }}>
                    Sifre ile girise don
                  </Button>

                  <Alert severity="info" sx={{
                    mb: 3, borderRadius: '12px',
                    backgroundColor: 'rgba(28, 97, 171, 0.1)',
                    border: '1px solid rgba(28, 97, 171, 0.2)',
                    color: '#bfdbfe',
                    '& .MuiAlert-icon': { color: '#60a5fa' }
                  }}>
                    <Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: '0.9rem' }}>Guvenlik Sorunuz:</Typography>
                    <Typography sx={{ fontSize: '0.85rem' }}>{securityQuestion}</Typography>
                  </Alert>

                  <TextField
                    fullWidth label="Guvenlik Sorusu Cevabi"
                    value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSecurityLogin()}
                    sx={inputSx}
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><QuestionIcon sx={{ color: '#60a5fa', fontSize: '1.1rem' }} /></InputAdornment>
                    }}
                  />

                  <Button fullWidth variant="contained" onClick={handleSecurityLogin} disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : null}
                    sx={{
                      py: 1.5, borderRadius: '12px', fontWeight: 700, fontSize: '1rem',
                      background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                      boxShadow: '0 8px 32px rgba(28, 97, 171, 0.3)',
                      textTransform: 'none',
                      '&:hover': { background: 'linear-gradient(135deg, #8bb94a, #1c61ab)', transform: 'translateY(-2px)' },
                      transition: 'all 0.3s ease'
                    }}>
                    {loading ? 'Dogrulaniyor...' : 'Giris Yap'}
                  </Button>
                </>
              )}
            </Box>

            {/* Footer */}
            <Box sx={{ p: 3, pt: 0, textAlign: 'center' }}>
              <Typography sx={{ color: '#475569', fontSize: '0.75rem' }}>
                Optima HR - Aday Paneli
              </Typography>
            </Box>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
}

export default ApplicantLogin;
