// src/pages/ApplicationDetail.js - Modern Basvuru Detay Sayfasi
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Grid,
  Button,
  Divider,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Avatar,
  Card,
  CardContent,
  LinearProgress,
  Tooltip,
  Tabs,
  Tab,
  Skeleton
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Computer as ComputerIcon,
  AttachFile as FileIcon,
  Check as CheckIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  Speed as SpeedIcon,
  Chat as ChatIcon,
  Router as RouterIcon,
  Fingerprint as FingerprintIcon,
  Security as SecurityIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Grade as GradeIcon
} from '@mui/icons-material';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:9000') + '/api';

const STATUS_CONFIG = {
  submitted: { label: 'Form Gonderildi', color: '#1976d2', bgColor: '#e3f2fd', progress: 25 },
  form_completed: { label: 'Form Tamamlandi', color: '#1976d2', bgColor: '#e3f2fd', progress: 25 },
  in_review: { label: 'Inceleniyor', color: '#f57c00', bgColor: '#fff3e0', progress: 50 },
  under_review: { label: 'Inceleniyor', color: '#f57c00', bgColor: '#fff3e0', progress: 50 },
  interview_scheduled: { label: 'Mulakat Planlandi', color: '#7b1fa2', bgColor: '#f3e5f5', progress: 75 },
  approved: { label: 'Onaylandi', color: '#2e7d32', bgColor: '#e8f5e9', progress: 100 },
  hired: { label: 'Ise Alindi', color: '#2e7d32', bgColor: '#e8f5e9', progress: 100 },
  rejected: { label: 'Reddedildi', color: '#c62828', bgColor: '#ffebee', progress: 100 }
};

function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [filePreview, setFilePreview] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    loadApplicationData();
  }, [id]);

  const loadApplicationData = async () => {
    setLoading(true);
    setError(null);

    try {
      // API'den basvuru detayini al
      const response = await fetch(`${API_BASE_URL}/applications/${id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-Id': localStorage.getItem('optima_current_site') || 'FXB'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setApplication(data);

        // Profil bilgisi artik API'den geliyor
        if (data.profileCreatedIp || data.deviceInfo) {
          setProfile({
            profileCreatedIp: data.profileCreatedIp,
            profileCreatedLocation: data.profileCreatedLocation,
            deviceInfo: data.deviceInfo,
            vpnScore: data.vpnScore,
            isVpn: data.isVpn,
            chatToken: data.chatToken,
            id: data.applicant_profile_id
          });
        }
        setLoading(false);
        return;
      }
    } catch (apiError) {
      console.warn('API baglantisi basarisiz, localStorage deneniyor:', apiError.message);
    }

    // Fallback: localStorage
    const siteCode = localStorage.getItem('optima_current_site') || 'FXB';
    const savedApplications = JSON.parse(localStorage.getItem(`applications_${siteCode}`) || '[]');
    const foundApp = savedApplications.find(app => String(app.id) === String(id));

    if (foundApp) {
      setApplication(foundApp);

      // Profil bilgisi bul
      const profiles = JSON.parse(localStorage.getItem(`user_profiles_${siteCode}`) || '[]');
      const foundProfile = profiles.find(p =>
        String(p.id) === String(foundApp.profileId) ||
        p.email === foundApp.email
      );
      if (foundProfile) {
        setProfile(foundProfile);
      }
    } else {
      setError('Basvuru bulunamadi');
    }

    setLoading(false);
  };

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    const currentRejectReason = newStatus === 'rejected' ? rejectReason : null;

    try {
      const response = await fetch(`${API_BASE_URL}/applications/${id}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-Id': localStorage.getItem('optima_current_site') || 'FXB'
        },
        body: JSON.stringify({ status: newStatus, rejectReason: currentRejectReason })
      });

      if (!response.ok) {
        console.warn('API status guncelleme basarisiz');
      }
    } catch (apiError) {
      console.warn('API status guncelleme hatasi:', apiError);
    }

    // localStorage'i da guncelle
    const siteCode = localStorage.getItem('optima_current_site') || 'FXB';
    const savedApplications = JSON.parse(localStorage.getItem(`applications_${siteCode}`) || '[]');
    const updatedApplications = savedApplications.map(app => {
      if (String(app.id) === String(id)) {
        return {
          ...app,
          status: newStatus,
          ...(newStatus === 'rejected' && { rejectReason: currentRejectReason, rejectedAt: new Date().toISOString() }),
          ...(newStatus === 'approved' && { approvedAt: new Date().toISOString() })
        };
      }
      return app;
    });
    localStorage.setItem(`applications_${siteCode}`, JSON.stringify(updatedApplications));

    // State'i guncelle (tek bir setApplication)
    setApplication(prev => ({
      ...prev,
      status: newStatus,
      ...(newStatus === 'rejected' && { rejectReason: currentRejectReason })
    }));

    setRejectDialogOpen(false);
    setRejectReason(''); // Formu temizle
    setStatusUpdating(false);
  };

  const handleViewFile = (fileUrl, fileName) => {
    if (!fileUrl) return;

    // Backend'den gelen path'i URL'e cevir
    let url = fileUrl;
    if (fileUrl.startsWith('/Users') || fileUrl.startsWith('/var')) {
      // Absolute path - uploads dizinine gore relative path olustur
      const uploadIndex = fileUrl.indexOf('/uploads/');
      if (uploadIndex !== -1) {
        url = `${API_BASE_URL}${fileUrl.substring(uploadIndex)}`;
      }
    } else if (!fileUrl.startsWith('http') && !fileUrl.startsWith('data:')) {
      url = `${API_BASE_URL}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
    }

    setFilePreview({ url, name: fileName });
  };

  const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.submitted;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Skeleton variant="rectangular" height={60} sx={{ mb: 3, borderRadius: 2 }} />
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
            </Grid>
          </Grid>
        </Paper>
      </Container>
    );
  }

  if (error || !application) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error || 'Basvuru bulunamadi'}
        </Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/admin/recruitment')} sx={{ mt: 2 }}>
          Listeye Don
        </Button>
      </Container>
    );
  }

  const statusConfig = getStatusConfig(application.status);
  const fullName = `${application.firstName || application.first_name || ''} ${application.lastName || application.last_name || ''}`.trim() || 'Bilinmiyor';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa', py: 3 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Paper sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.03), rgba(139, 185, 74, 0.03))',
          border: '1px solid rgba(28, 97, 171, 0.1)'
        }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Button
                startIcon={<BackIcon />}
                onClick={() => navigate('/admin/recruitment')}
                sx={{
                  color: '#1c61ab',
                  '&:hover': { bgcolor: 'rgba(28, 97, 171, 0.08)' }
                }}
              >
                Listeye Don
              </Button>
              <Divider orientation="vertical" flexItem />
              <Avatar sx={{
                width: 56,
                height: 56,
                background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                fontSize: '1.2rem',
                fontWeight: 700
              }}>
                {fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700} color="#1a1a2e">
                  {fullName}
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                  <EmailIcon sx={{ fontSize: 16, color: '#666' }} />
                  <Typography variant="body2" color="text.secondary">
                    {application.email}
                  </Typography>
                  {application.phone && (
                    <>
                      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                      <PhoneIcon sx={{ fontSize: 16, color: '#666' }} />
                      <Typography variant="body2" color="text.secondary">
                        {application.phone}
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>
            </Box>

            <Box display="flex" alignItems="center" gap={2}>
              <Chip
                label={statusConfig.label}
                sx={{
                  bgcolor: statusConfig.bgColor,
                  color: statusConfig.color,
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  px: 1,
                  height: 36
                }}
              />
              {profile?.chatToken && (
                <Tooltip title="Chat'e Git">
                  <IconButton
                    onClick={() => navigate(`/chat?applicant=applicant_${profile.id}`)}
                    sx={{
                      bgcolor: 'rgba(28, 97, 171, 0.1)',
                      color: '#1c61ab',
                      '&:hover': { bgcolor: 'rgba(28, 97, 171, 0.2)' }
                    }}
                  >
                    <ChatIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Progress Bar */}
          <Box sx={{ mt: 3 }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              {['Form', 'Inceleme', 'Mulakat', 'Sonuc'].map((step, i) => {
                const stepProgress = [25, 50, 75, 100];
                const isActive = statusConfig.progress >= stepProgress[i];
                const isRejected = application.status === 'rejected';
                return (
                  <Typography
                    key={step}
                    variant="caption"
                    sx={{
                      fontWeight: isActive ? 700 : 400,
                      color: isRejected && i === 3 ? '#c62828' : isActive ? '#1c61ab' : '#999'
                    }}
                  >
                    {step}
                  </Typography>
                );
              })}
            </Box>
            <LinearProgress
              variant="determinate"
              value={statusConfig.progress}
              sx={{
                height: 8,
                borderRadius: 4,
                bgcolor: '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: application.status === 'rejected'
                    ? '#c62828'
                    : 'linear-gradient(90deg, #1c61ab, #8bb94a)'
                }
              }}
            />
          </Box>
        </Paper>

        {/* Tabs */}
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              '& .MuiTab-root': {
                fontWeight: 600,
                textTransform: 'none',
                minHeight: 56
              },
              '& .Mui-selected': { color: '#1c61ab' },
              '& .MuiTabs-indicator': {
                background: 'linear-gradient(90deg, #1c61ab, #8bb94a)',
                height: 3
              }
            }}
          >
            <Tab icon={<PersonIcon />} iconPosition="start" label="Kisisel Bilgiler" />
            <Tab icon={<SchoolIcon />} iconPosition="start" label="Egitim & Deneyim" />
            <Tab icon={<ComputerIcon />} iconPosition="start" label="Teknik Bilgiler" />
            <Tab icon={<FileIcon />} iconPosition="start" label="Dosyalar" />
            {profile && <Tab icon={<SecurityIcon />} iconPosition="start" label="Guvenlik" />}
          </Tabs>

          <Box sx={{ p: 3 }}>
            {/* TAB 0: Kisisel Bilgiler */}
            {activeTab === 0 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#1c61ab' }}>
                        <PersonIcon fontSize="small" />
                        Kimlik Bilgileri
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <InfoRow label="Ad Soyad" value={fullName} />
                        <InfoRow label="TC Kimlik No" value={application.tc_number || application.tcNumber} />
                        <InfoRow label="Dogum Tarihi" value={application.birth_date || application.birthDate ? new Date(application.birth_date || application.birthDate).toLocaleDateString('tr-TR') : '-'} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#8bb94a' }}>
                        <LocationIcon fontSize="small" />
                        Iletisim Bilgileri
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <InfoRow label="Email" value={application.email} />
                        <InfoRow label="Telefon" value={application.phone} />
                        <InfoRow label="Sehir" value={application.city} />
                        <InfoRow label="Ilce" value={application.district} />
                        <InfoRow label="Adres" value={application.address} />
                        <InfoRow label="Posta Kodu" value={application.postal_code || application.postalCode} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#f57c00' }}>
                        <ScheduleIcon fontSize="small" />
                        Basvuru Bilgileri
                      </Typography>
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6} sm={3}>
                          <InfoBox label="Basvuru Tarihi" value={application.submitted_at || application.submittedAt ? new Date(application.submitted_at || application.submittedAt).toLocaleDateString('tr-TR') : '-'} />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <InfoBox label="Basvuru Saati" value={application.submitted_at || application.submittedAt ? new Date(application.submitted_at || application.submittedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '-'} />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <InfoBox label="Kaynak" value={application.source || '-'} />
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <InfoBox label="Referans" value={application.has_reference || application.hasReference ? (application.reference_name || application.referenceName || 'Var') : 'Yok'} />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* TAB 1: Egitim & Deneyim */}
            {activeTab === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#1c61ab' }}>
                        <SchoolIcon fontSize="small" />
                        Egitim Bilgileri
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <InfoRow label="Egitim Durumu" value={application.education_level || application.educationLevel} />
                        <InfoRow label="Universite" value={application.university || application.school} />
                        <InfoRow label="Bolum" value={application.department} />
                        <InfoRow label="Mezuniyet Yili" value={application.graduation_year || application.graduationYear} />
                        <InfoRow label="Not Ortalamasi" value={application.gpa ? `${application.gpa}/100` : '-'} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 2, height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#8bb94a' }}>
                        <WorkIcon fontSize="small" />
                        Is Deneyimi
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <InfoRow
                          label="Sektor Deneyimi"
                          value={
                            <Chip
                              label={application.has_sector_experience || application.hasSectorExperience ? 'Var' : 'Yok'}
                              size="small"
                              color={application.has_sector_experience || application.hasSectorExperience ? 'success' : 'default'}
                            />
                          }
                        />
                        {(application.has_sector_experience || application.hasSectorExperience) && (
                          <>
                            <InfoRow label="Deneyim Suresi" value={application.experience_level || application.experienceLevel} />
                            <InfoRow label="Son Is Yeri" value={application.last_company || application.lastCompany} />
                            <InfoRow label="Son Pozisyon" value={application.last_position || application.lastPosition} />
                          </>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* TAB 2: Teknik Bilgiler */}
            {activeTab === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Card sx={{ borderRadius: 2, textAlign: 'center', p: 2 }}>
                    <SpeedIcon sx={{ fontSize: 48, color: '#1c61ab', mb: 1 }} />
                    <Typography variant="h4" fontWeight={700} color="#1c61ab">
                      {application.internet_download || application.internetDownload || '0'} / {application.internet_upload || application.internetUpload || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Indirme / Yukleme (Mbps)
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ borderRadius: 2, textAlign: 'center', p: 2 }}>
                    <GradeIcon sx={{ fontSize: 48, color: '#8bb94a', mb: 1 }} />
                    <Typography variant="h4" fontWeight={700} color="#8bb94a">
                      {application.typing_speed || application.typingSpeed || '0'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Klavye Hizi (WPM)
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card sx={{ borderRadius: 2, p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ComputerIcon fontSize="small" color="primary" />
                      Bilgisayar Ozellikleri
                    </Typography>
                    <InfoRow label="Islemci" value={application.processor} compact />
                    <InfoRow label="RAM" value={application.ram ? `${application.ram} GB` : '-'} compact />
                    <InfoRow label="Isletim Sistemi" value={application.os} compact />
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* TAB 3: Dosyalar */}
            {activeTab === 3 && (
              <Grid container spacing={3}>
                {(application.cv_file_path || application.cv) && (
                  <Grid item xs={12} sm={6} md={4}>
                    <FileCard
                      icon={<PdfIcon sx={{ fontSize: 40, color: '#dc2626' }} />}
                      title="CV / Ozgecmis"
                      fileName={application.cv_file_name || 'CV.pdf'}
                      onClick={() => handleViewFile(application.cv_file_path || application.cv, 'CV')}
                    />
                  </Grid>
                )}
                {(application.internet_test_file_path || application.internetTest) && (
                  <Grid item xs={12} sm={6} md={4}>
                    <FileCard
                      icon={<SpeedIcon sx={{ fontSize: 40, color: '#1c61ab' }} />}
                      title="Internet Hiz Testi"
                      fileName={application.internet_test_file_name || 'speedtest.png'}
                      onClick={() => handleViewFile(application.internet_test_file_path || application.internetTest, 'Internet Testi')}
                    />
                  </Grid>
                )}
                {(application.typing_test_file_path || application.typingTest) && (
                  <Grid item xs={12} sm={6} md={4}>
                    <FileCard
                      icon={<GradeIcon sx={{ fontSize: 40, color: '#8bb94a' }} />}
                      title="Klavye Hiz Testi"
                      fileName={application.typing_test_file_name || 'typingtest.png'}
                      onClick={() => handleViewFile(application.typing_test_file_path || application.typingTest, 'Klavye Testi')}
                    />
                  </Grid>
                )}
                {!application.cv_file_path && !application.cv && !application.internet_test_file_path && !application.typing_test_file_path && (
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      Bu basvuruya ait yuklu dosya bulunmamaktadir.
                    </Alert>
                  </Grid>
                )}
              </Grid>
            )}

            {/* TAB 4: Guvenlik (Profil varsa) */}
            {activeTab === 4 && profile && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#1c61ab' }}>
                        <RouterIcon fontSize="small" />
                        IP ve Konum
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <InfoRow label="IP Adresi" value={profile.profileCreatedIp || application.submitted_ip || '-'} />
                        {profile.profileCreatedLocation && (
                          <>
                            <InfoRow label="Ulke" value={profile.profileCreatedLocation.country || '-'} />
                            <InfoRow label="Sehir" value={profile.profileCreatedLocation.city || '-'} />
                            <InfoRow label="ISP" value={profile.profileCreatedLocation.org || '-'} />
                          </>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#8bb94a' }}>
                        <FingerprintIcon fontSize="small" />
                        Cihaz Bilgileri
                      </Typography>
                      {profile.deviceInfo ? (
                        <Box sx={{ mt: 2 }}>
                          <InfoRow label="Platform" value={profile.deviceInfo.platform || '-'} />
                          <InfoRow label="Ekran" value={profile.deviceInfo.screenResolution || '-'} />
                          <InfoRow label="Zaman Dilimi" value={profile.deviceInfo.timezone || '-'} />
                          <InfoRow label="Dil" value={profile.deviceInfo.language || '-'} />
                          {profile.deviceInfo.hardwareConcurrency && (
                            <InfoRow label="CPU Cekirdek" value={profile.deviceInfo.hardwareConcurrency} />
                          )}
                        </Box>
                      ) : (
                        <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                          Cihaz bilgisi mevcut degil
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                {(profile.vpnScore > 0 || profile.isVpn) && (
                  <Grid item xs={12}>
                    <Alert
                      severity={profile.vpnScore > 50 ? 'warning' : 'info'}
                      sx={{ borderRadius: 2 }}
                    >
                      <Typography variant="body2">
                        <strong>VPN Skoru:</strong> {profile.vpnScore}/100
                        {profile.isVpn && ' - VPN Kullanimi Tespit Edildi!'}
                      </Typography>
                    </Alert>
                  </Grid>
                )}
              </Grid>
            )}
          </Box>
        </Paper>

        {/* Action Buttons */}
        {application.status !== 'rejected' && application.status !== 'approved' && application.status !== 'hired' && (
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Basvuru Islemleri
            </Typography>
            <Box display="flex" gap={2} flexWrap="wrap" mt={2}>
              <Button
                variant="contained"
                onClick={() => handleStatusChange('in_review')}
                disabled={statusUpdating || application.status === 'in_review'}
                sx={{
                  background: 'linear-gradient(135deg, #f57c00, #ff9800)',
                  '&:hover': { background: 'linear-gradient(135deg, #e65100, #f57c00)' },
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                Incelemeye Al
              </Button>
              <Button
                variant="contained"
                onClick={() => handleStatusChange('interview_scheduled')}
                disabled={statusUpdating}
                sx={{
                  background: 'linear-gradient(135deg, #7b1fa2, #9c27b0)',
                  '&:hover': { background: 'linear-gradient(135deg, #6a1b9a, #7b1fa2)' },
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                Mulakat Planla
              </Button>
              <Button
                variant="contained"
                onClick={() => handleStatusChange('approved')}
                disabled={statusUpdating}
                sx={{
                  background: 'linear-gradient(135deg, #2e7d32, #4caf50)',
                  '&:hover': { background: 'linear-gradient(135deg, #1b5e20, #2e7d32)' },
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                Onayla
              </Button>
              <Button
                variant="outlined"
                onClick={() => setRejectDialogOpen(true)}
                disabled={statusUpdating}
                sx={{
                  borderColor: '#c62828',
                  color: '#c62828',
                  '&:hover': {
                    borderColor: '#b71c1c',
                    bgcolor: 'rgba(198, 40, 40, 0.04)'
                  },
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                Reddet
              </Button>
            </Box>
          </Paper>
        )}

        {/* Red Gerekcesi Alert */}
        {application.status === 'rejected' && application.rejectReason && (
          <Alert severity="error" sx={{ borderRadius: 2, mt: 2 }}>
            <Typography variant="body2">
              <strong>Red Gerekcesi:</strong> {application.rejectReason}
            </Typography>
          </Alert>
        )}

        {/* Onay Alert */}
        {(application.status === 'approved' || application.status === 'hired') && (
          <Alert severity="success" sx={{ borderRadius: 2, mt: 2 }}>
            <Typography variant="body2">
              Bu basvuru onaylanmistir. Basvuran ile iletisime gecebilirsiniz.
            </Typography>
          </Alert>
        )}
      </Container>

      {/* Red Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Basvuruyu Reddet</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Lutfen basvuruyu reddetme nedeninizi belirtin:
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Orn: Teknik yeterlilikler yetersiz, deneyim eksik vb."
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Iptal
          </Button>
          <Button
            onClick={() => handleStatusChange('rejected')}
            variant="contained"
            disabled={!rejectReason.trim() || statusUpdating}
            sx={{
              bgcolor: '#c62828',
              '&:hover': { bgcolor: '#b71c1c' },
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            Reddet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dosya Onizleme Dialog */}
      <Dialog
        open={!!filePreview}
        onClose={() => setFilePreview(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700}>{filePreview?.name}</Typography>
          <IconButton onClick={() => setFilePreview(null)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {filePreview?.url && (
            filePreview.url.toLowerCase().includes('.pdf') ? (
              <iframe
                src={filePreview.url}
                width="100%"
                height="500px"
                style={{ border: 'none', borderRadius: 8 }}
                title={filePreview.name}
              />
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <img
                  src={filePreview.url}
                  alt={filePreview.name}
                  style={{ maxWidth: '100%', maxHeight: '500px', borderRadius: 8 }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'block';
                  }}
                />
                <Box sx={{ display: 'none', p: 4, textAlign: 'center' }}>
                  <PdfIcon sx={{ fontSize: 64, color: '#ccc', mb: 2 }} />
                  <Typography color="text.secondary">Dosya onizlemesi yuklenemedi</Typography>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    href={filePreview.url}
                    target="_blank"
                    sx={{ mt: 2 }}
                  >
                    Dosyayi Indir
                  </Button>
                </Box>
              </Box>
            )
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

// Helper Components
function InfoRow({ label, value, compact }) {
  return (
    <Box sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      py: compact ? 0.5 : 1,
      borderBottom: '1px solid rgba(0,0,0,0.05)'
    }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right', maxWidth: '60%' }}>
        {value || '-'}
      </Typography>
    </Box>
  );
}

function InfoBox({ label, value }) {
  return (
    <Box sx={{
      p: 2,
      bgcolor: 'rgba(28, 97, 171, 0.04)',
      borderRadius: 2,
      textAlign: 'center'
    }}>
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography variant="body1" fontWeight={700} sx={{ mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  );
}

function FileCard({ icon, title, fileName, onClick }) {
  return (
    <Card
      sx={{
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
        }
      }}
      onClick={onClick}
    >
      <CardContent sx={{ textAlign: 'center', py: 3 }}>
        {icon}
        <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{
          display: 'block',
          mt: 0.5,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {fileName}
        </Typography>
        <Button
          size="small"
          startIcon={<ViewIcon />}
          sx={{ mt: 1.5, textTransform: 'none' }}
        >
          Goruntule
        </Button>
      </CardContent>
    </Card>
  );
}

export default ApplicationDetail;
