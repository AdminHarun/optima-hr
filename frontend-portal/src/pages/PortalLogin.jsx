import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Container, Paper, Typography, TextField, Button, Alert,
  InputAdornment, IconButton, Avatar, Fade
} from '@mui/material';
import {
  Visibility, VisibilityOff, Login as LoginIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';
import { API_BASE_URL } from '../config';

const TURNSTILE_SITE_KEY = '0x4AAAAAACh60GABJM3jjI_D';

export default function PortalLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);
  const turnstileWidgetId = useRef(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Tüm alanları doldurun'); return; }
    if (!turnstileToken) { setError('Bot doğrulamasını tamamlayın'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, turnstileToken })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Giriş başarısız');
      }

      // Sadece SUPER_ADMIN ve DEVELOPER erişebilir
      const allowedRoles = ['SUPER_ADMIN', 'DEVELOPER', 'ADMIN'];
      if (!allowedRoles.includes(data.user.role)) {
        throw new Error('Bu portale erişim yetkiniz yok. Sadece yöneticiler erişebilir.');
      }

      onLogin(data.user);
    } catch (err) {
      setError(err.message);
      if (window.turnstile && turnstileWidgetId.current) {
        window.turnstile.reset(turnstileWidgetId.current);
        setTurnstileToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      position: 'relative',
      '&::before': {
        content: '""', position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 30% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(139, 185, 74, 0.06) 0%, transparent 50%)',
      }
    }}>
      <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
        <Fade in timeout={600}>
          <Paper sx={{
            p: 5, borderRadius: '24px',
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(71, 85, 105, 0.3)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Avatar sx={{
                width: 72, height: 72, mx: 'auto', mb: 2,
                background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                boxShadow: '0 8px 32px rgba(28, 97, 171, 0.3)'
              }}>
                <ShieldIcon sx={{ fontSize: 36 }} />
              </Avatar>
              <Typography variant="h5" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 0.5 }}>
                Administration
              </Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>
                Optima HR Merkezi Yönetim
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{
                mb: 3, borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#fca5a5'
              }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth label="Email" type="email" value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                sx={{
                  mb: 2.5,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px', backgroundColor: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid rgba(71, 85, 105, 0.5)',
                    '& fieldset': { border: 'none' },
                    '&:hover': { borderColor: 'rgba(59, 130, 246, 0.5)' },
                    '&.Mui-focused': { borderColor: '#3b82f6', boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)' }
                  },
                  '& .MuiInputLabel-root': { color: '#94a3b8' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#60a5fa' },
                  '& .MuiOutlinedInput-input': { color: '#f1f5f9' },
                }}
              />
              <TextField
                fullWidth label="Şifre" type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                sx={{
                  mb: 2.5,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px', backgroundColor: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid rgba(71, 85, 105, 0.5)',
                    '& fieldset': { border: 'none' },
                    '&:hover': { borderColor: 'rgba(59, 130, 246, 0.5)' },
                    '&.Mui-focused': { borderColor: '#3b82f6', boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)' }
                  },
                  '& .MuiInputLabel-root': { color: '#94a3b8' },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#60a5fa' },
                  '& .MuiOutlinedInput-input': { color: '#f1f5f9' },
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} sx={{ color: '#94a3b8' }}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <div ref={turnstileRef}></div>
              </Box>

              <Button
                type="submit" fullWidth variant="contained"
                disabled={loading || !turnstileToken}
                startIcon={<LoginIcon />}
                sx={{
                  py: 1.5, borderRadius: '12px', fontWeight: 700, fontSize: '1rem',
                  background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                  boxShadow: '0 8px 32px rgba(28, 97, 171, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #8bb94a, #1c61ab)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 40px rgba(28, 97, 171, 0.4)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? 'Giriş yapılıyor...' : 'Yönetim Paneline Giriş'}
              </Button>
            </form>

            <Typography sx={{ color: '#475569', fontSize: '0.75rem', textAlign: 'center', mt: 3 }}>
              Bu portal sadece yetkili yöneticiler içindir
            </Typography>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
}
