// src/pages/ApplicantProfile.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Divider,
  Grid,
  Card,
  CardContent,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  Chat as ChatIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import sessionManager from '@shared/utils/sessionManager';

// Profili tum site-specific key'lerde ara
const findProfileAcrossSites = (profileId) => {
  const siteCodes = (() => {
    try {
      const sites = JSON.parse(localStorage.getItem('sites') || '[]');
      if (sites.length > 0) return sites.map(s => s.code);
    } catch (e) { }
    return ['FXB', 'MTD', 'ZBH'];
  })();
  for (const siteCode of siteCodes) {
    const profiles = JSON.parse(localStorage.getItem(`user_profiles_${siteCode}`) || '[]');
    const found = profiles.find(p => String(p.id) === String(profileId));
    if (found) return { profile: found, siteCode, profiles };
  }
  // Legacy fallback
  const legacyProfiles = JSON.parse(localStorage.getItem('user_profiles') || '[]');
  const found = legacyProfiles.find(p => String(p.id) === String(profileId));
  if (found) return { profile: found, siteCode: null, profiles: legacyProfiles };
  return null;
};

function ApplicantProfile() {
  const { applicantId } = useParams();
  const navigate = useNavigate();
  const [applicantInfo, setApplicantInfo] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [changePasswordDialog, setChangePasswordDialog] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [loginHistory, setLoginHistory] = useState([]);
  const [profileSiteCode, setProfileSiteCode] = useState(null);

  useEffect(() => {
    loadApplicantInfo();
    loadLoginHistory();
  }, [applicantId]);

  const loadApplicantInfo = () => {
    // Session kontrolü
    if (!sessionManager.hasActiveSession()) {
      navigate('/');
      return;
    }

    const session = sessionManager.getCurrentSession();

    // Profil bilgilerini site-specific key'lerden ara
    if (session.profileId === applicantId) {
      const result = findProfileAcrossSites(applicantId);

      if (result) {
        setApplicantInfo(result.profile);
        setProfileSiteCode(result.siteCode);
      } else {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  const loadLoginHistory = () => {
    // Site-specific session key'lerden ara
    const result = findProfileAcrossSites(applicantId);
    const sessionsKey = result?.siteCode ? `all_sessions_${result.siteCode}` : 'all_sessions';
    const allSessions = JSON.parse(localStorage.getItem(sessionsKey) || '[]');
    const userHistory = allSessions.filter(session =>
      session.profileId === applicantId
    ).slice(-10);
    setLoginHistory(userHistory);
  };

  const handleSaveProfile = () => {
    try {
      // Profil güncellemelerini kaydet (site-specific)
      const profilesKey = profileSiteCode ? `user_profiles_${profileSiteCode}` : 'user_profiles';
      const profiles = JSON.parse(localStorage.getItem(profilesKey) || '[]');
      const updatedProfiles = profiles.map(profile =>
        String(profile.id) === String(applicantId) ? { ...profile, ...applicantInfo } : profile
      );
      localStorage.setItem(profilesKey, JSON.stringify(updatedProfiles));
      setEditMode(false);
      alert('Profil güncellendi!');
    } catch (error) {
      console.error('Profil güncelleme hatası:', error);
      alert('Profil güncellenemedi.');
    }
  };

  const handleChangePassword = () => {
    if (passwords.new !== passwords.confirm) {
      alert('Yeni şifreler eşleşmiyor');
      return;
    }

    if (passwords.new.length < 8) {
      alert('Şifre en az 8 karakter olmalı');
      return;
    }

    try {
      // Mevcut şifreyi kontrol et
      if (!sessionManager.validatePassword(applicantInfo.email, passwords.current)) {
        alert('Mevcut şifre yanlış');
        return;
      }

      // Yeni şifreyi kaydet (site-specific)
      const securitiesKey = profileSiteCode ? `user_securities_${profileSiteCode}` : 'user_securities';
      const securities = JSON.parse(localStorage.getItem(securitiesKey) || '[]');
      const updatedSecurities = securities.map(security =>
        security.profileId === applicantId
          ? { ...security, passwordHash: btoa(unescape(encodeURIComponent(passwords.new))) }
          : security
      );
      localStorage.setItem(securitiesKey, JSON.stringify(updatedSecurities));

      setChangePasswordDialog(false);
      setPasswords({ current: '', new: '', confirm: '' });
      alert('Şifre başarıyla değiştirildi');
    } catch (error) {
      console.error('Şifre değiştirme hatası:', error);
      alert('Şifre değiştirilemedi');
    }
  };

  const handleStartChat = () => {
    // Chat sayfasına yönlendir (başvuru chat'i olarak)
    const appsKey = profileSiteCode ? `applications_${profileSiteCode}` : 'applications';
    const applicationsData = JSON.parse(localStorage.getItem(appsKey) || '[]');
    const applications = Array.isArray(applicationsData) ? applicationsData : [applicationsData].filter(Boolean);
    const userApplication = applications.find(app => app.profileId === applicantId);

    if (userApplication) {
      navigate(`/applicant-chat/${userApplication.id}`);
    } else {
      alert('Başvuru bulunamadı');
    }
  };

  if (!applicantInfo) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          Profil bilgileri bulunamadı.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Profil Header */}
      <Paper sx={{
        p: 3,
        mb: 3,
        background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
        color: 'white',
        borderRadius: '16px'
      }}>
        <Box display="flex" alignItems="center" gap={3}>
          <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(255,255,255,0.2)' }}>
            <PersonIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Box flex={1}>
            <Typography variant="h4" gutterBottom>
              {applicantInfo.firstName} {applicantInfo.lastName}
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              {applicantInfo.email}
            </Typography>
            <Box mt={1}>
              <Chip
                label="Aktif Profil"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
              />
            </Box>
          </Box>
          <Box>
            <Button
              variant="outlined"
              startIcon={<ChatIcon />}
              onClick={handleStartChat}
              sx={{
                color: 'white',
                borderColor: 'white',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Başvuru Chat'i
            </Button>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Sol Kolon - Kişisel Bilgiler */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3, borderRadius: '16px' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Kişisel Bilgiler</Typography>
              <Button
                startIcon={<EditIcon />}
                onClick={() => setEditMode(!editMode)}
                variant={editMode ? "contained" : "outlined"}
              >
                {editMode ? 'İptal' : 'Düzenle'}
              </Button>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Ad"
                  value={applicantInfo.firstName || ''}
                  disabled={!editMode}
                  onChange={(e) => setApplicantInfo(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Soyad"
                  value={applicantInfo.lastName || ''}
                  disabled={!editMode}
                  onChange={(e) => setApplicantInfo(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Telefon"
                  value={applicantInfo.phone || ''}
                  disabled={!editMode}
                  onChange={(e) => setApplicantInfo(prev => ({ ...prev, phone: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={applicantInfo.email || ''}
                  disabled // Email değiştirilemez
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Kayıt Tarihi"
                  value={applicantInfo.createdAt ? new Date(applicantInfo.createdAt).toLocaleString('tr-TR') : 'Bilinmiyor'}
                  disabled
                />
              </Grid>
            </Grid>

            {editMode && (
              <Box mt={2}>
                <Button
                  variant="contained"
                  onClick={handleSaveProfile}
                  sx={{ mr: 1 }}
                >
                  Değişiklikleri Kaydet
                </Button>
                <Button onClick={() => setEditMode(false)}>
                  İptal
                </Button>
              </Box>
            )}
          </Paper>

          {/* Güvenlik */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: '16px' }}>
            <Typography variant="h6" gutterBottom>Güvenlik</Typography>
            <Button
              startIcon={<SecurityIcon />}
              variant="outlined"
              onClick={() => setChangePasswordDialog(true)}
            >
              Şifre Değiştir
            </Button>
          </Paper>
        </Grid>

        {/* Sağ Kolon - Aktivite */}
        <Grid item xs={12} md={4}>
          {/* Son Girişler */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: '16px' }}>
            <Typography variant="h6" gutterBottom>
              <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Son Girişler
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {loginHistory.length > 0 ? (
              loginHistory.map((session, index) => (
                <Box key={index} mb={2}>
                  <Typography variant="body2">
                    {new Date(session.loginTime).toLocaleString('tr-TR')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    IP: {session.deviceInfo?.ip_address || 'Bilinmiyor'}
                  </Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                Giriş geçmişi bulunamadı
              </Typography>
            )}
          </Paper>

          {/* Profil Durumu */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: '16px' }}>
            <Typography variant="h6" gutterBottom color="success.main">
              ✅ Profil Durumu
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="success.main">
              Profil aktif ve kullanımda
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Chat erişimi: Açık
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Şifre Değiştirme Dialog */}
      <Dialog open={changePasswordDialog} onClose={() => setChangePasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Şifre Değiştir</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Mevcut Şifre"
            type="password"
            value={passwords.current}
            onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Yeni Şifre"
            type="password"
            value={passwords.new}
            onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
            margin="normal"
            helperText="En az 8 karakter"
          />
          <TextField
            fullWidth
            label="Yeni Şifre Tekrar"
            type="password"
            value={passwords.confirm}
            onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordDialog(false)}>İptal</Button>
          <Button onClick={handleChangePassword} variant="contained">Değiştir</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default ApplicantProfile;
