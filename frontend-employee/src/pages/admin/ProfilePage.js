// src/pages/admin/ProfilePage.js - Bagimsiz Profilim sayfasi
import React, { useState } from 'react';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  TextField,
  Button,
  Stack,
  Snackbar,
  Alert,
  Avatar,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';

const COLORS = {
  primary: '#1c61ab',
  accent: '#8bb94a',
  gradient: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
  gradientBlue: 'linear-gradient(135deg, #1c61ab, #2196F3)',
};

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#1c61ab', bgColor: '#e3f2fd' },
  ADMIN: { label: 'Admin', color: '#1c61ab', bgColor: '#e3f2fd' },
  HR_MANAGER: { label: 'HR Muduru', color: '#2e7d32', bgColor: '#e8f5e9' },
  HR: { label: 'Insan Kaynaklari', color: '#8bb94a', bgColor: '#f1f8e9' },
  HR_EXPERT: { label: 'HR Uzmani', color: '#0277bd', bgColor: '#e1f5fe' },
  RECRUITER: { label: 'Ise Alim Uzmani', color: '#8bb94a', bgColor: '#f1f8e9' },
  HR_ASSISTANT: { label: 'HR Asistani', color: '#f57c00', bgColor: '#fff3e0' },
  USER: { label: 'Kullanici', color: '#1c61ab', bgColor: '#e3f2fd' },
};

function ProfilePage() {
  const { currentUser, isLoading: authLoading } = useEmployeeAuth();
  const [profilePassword, setProfilePassword] = useState({ current: '', newPass: '', confirm: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const handleChangePassword = () => {
    if (!profilePassword.current || !profilePassword.newPass || !profilePassword.confirm) {
      setSnackbar({ open: true, message: 'Tum alanlari doldurun', severity: 'error' });
      return;
    }
    if (profilePassword.newPass !== profilePassword.confirm) {
      setSnackbar({ open: true, message: 'Yeni sifreler eslesmiyor', severity: 'error' });
      return;
    }
    if (profilePassword.newPass.length < 6) {
      setSnackbar({ open: true, message: 'Sifre en az 6 karakter olmali', severity: 'error' });
      return;
    }
    try {
      const session = JSON.parse(localStorage.getItem('employee_session') || '{}');
      const employees = JSON.parse(localStorage.getItem('employees') || '[]');
      const idx = employees.findIndex(e => e.id === session.userId);
      if (idx < 0) {
        setSnackbar({ open: true, message: 'Kullanici bulunamadi', severity: 'error' });
        return;
      }
      const currentHash = btoa(unescape(encodeURIComponent(profilePassword.current)));
      if (employees[idx].passwordHash !== currentHash) {
        setSnackbar({ open: true, message: 'Mevcut sifre yanlis', severity: 'error' });
        return;
      }
      employees[idx].passwordHash = btoa(unescape(encodeURIComponent(profilePassword.newPass)));
      localStorage.setItem('employees', JSON.stringify(employees));
      setProfilePassword({ current: '', newPass: '', confirm: '' });
      setSnackbar({ open: true, message: 'Sifre basariyla degistirildi', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Sifre degistirme hatasi', severity: 'error' });
    }
  };

  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 2 }}>
        <LinearProgress sx={{ width: 200, borderRadius: 1, '& .MuiLinearProgress-bar': { background: COLORS.gradient } }} />
        <Typography sx={{ color: '#999', fontSize: '0.9rem' }}>Yukleniyor...</Typography>
      </Box>
    );
  }

  const user = currentUser || { firstName: '', lastName: '', email: '', role: '', siteId: '' };
  const roleConfig = ROLE_CONFIG[user.role] || { label: user.role || '-', color: COLORS.primary, bgColor: '#e3f2fd' };

  // Oturum bilgileri
  const session = JSON.parse(localStorage.getItem('employee_session') || '{}');
  const loginTime = session.loginTime ? new Date(session.loginTime) : null;
  const sessionDuration = loginTime ? Math.round((Date.now() - loginTime.getTime()) / 60000) : 0;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Baslik */}
      <Typography variant="h5" sx={{
        background: COLORS.gradient,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: 700,
        mb: 3
      }}>
        Profilim
      </Typography>

      {/* Profil Karti */}
      <Paper sx={{ borderRadius: 3, p: 3, mb: 3, border: '1px solid rgba(28, 97, 171, 0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
          <Avatar sx={{
            width: 72, height: 72,
            background: COLORS.gradient,
            fontSize: '1.8rem',
            fontWeight: 700
          }}>
            {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: '1.3rem', fontWeight: 700, color: '#333' }}>
              {user.firstName} {user.lastName}
            </Typography>
            <Chip
              label={roleConfig.label}
              size="small"
              sx={{
                backgroundColor: roleConfig.bgColor,
                color: roleConfig.color,
                fontWeight: 700,
                mt: 0.5
              }}
            />
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <EmailIcon sx={{ fontSize: 18, color: '#999' }} />
              <Box>
                <Typography sx={{ fontSize: '0.75rem', color: '#999' }}>E-posta</Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>{user.email}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <BusinessIcon sx={{ fontSize: 18, color: '#999' }} />
              <Box>
                <Typography sx={{ fontSize: '0.75rem', color: '#999' }}>Site</Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>
                  {user.siteName || user.siteId || 'Tum Siteler'}
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <PersonIcon sx={{ fontSize: 18, color: '#999' }} />
              <Box>
                <Typography sx={{ fontSize: '0.75rem', color: '#999' }}>Rol</Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>{roleConfig.label}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <AccessTimeIcon sx={{ fontSize: 18, color: '#999' }} />
              <Box>
                <Typography sx={{ fontSize: '0.75rem', color: '#999' }}>Oturum Suresi</Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>
                  {loginTime
                    ? `${Math.floor(sessionDuration / 60)}s ${sessionDuration % 60}dk`
                    : '-'}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Sifre Degistirme */}
      <Paper sx={{ borderRadius: 3, p: 3, border: '1px solid rgba(28, 97, 171, 0.08)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <LockIcon sx={{ fontSize: 20, color: COLORS.primary }} />
          <Typography sx={{ fontWeight: 700, color: COLORS.primary, fontSize: '1rem' }}>Sifre Degistir</Typography>
        </Box>
        <Stack spacing={2} sx={{ maxWidth: 400 }}>
          <TextField
            label="Mevcut Sifre" type="password" size="small"
            value={profilePassword.current}
            onChange={(e) => setProfilePassword({ ...profilePassword, current: e.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField
            label="Yeni Sifre" type="password" size="small"
            value={profilePassword.newPass}
            onChange={(e) => setProfilePassword({ ...profilePassword, newPass: e.target.value })}
            helperText="En az 6 karakter"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField
            label="Yeni Sifre (Tekrar)" type="password" size="small"
            value={profilePassword.confirm}
            onChange={(e) => setProfilePassword({ ...profilePassword, confirm: e.target.value })}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <Button
            variant="contained"
            onClick={handleChangePassword}
            startIcon={<SaveIcon />}
            sx={{
              background: COLORS.gradientBlue,
              textTransform: 'none',
              borderRadius: 2,
              fontWeight: 600,
              alignSelf: 'flex-start',
              '&:hover': { opacity: 0.9 }
            }}
          >
            Sifreyi Degistir
          </Button>
        </Stack>
      </Paper>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ProfilePage;
