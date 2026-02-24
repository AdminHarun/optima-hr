// ApplicantProfileModal.js - Displays applicant profile details
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Avatar,
  Button,
  Divider,
  CircularProgress,
  Grid,
  Chip,
  IconButton,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Speed as SpeedIcon,
  Computer as ComputerIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon,
  Person as PersonIcon
} from '@mui/icons-material';

import { API_BASE_URL } from '../../config/config';
const API_URL = API_BASE_URL;

/**
 * Applicant Profile Modal Component
 * Shows detailed information about an applicant
 */
const ApplicantProfileModal = ({ open, onClose, applicantId, onViewForm }) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && applicantId) {
      loadProfile();
    }
  }, [open, applicantId]);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/applications/profile/${applicantId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Profil yüklenemedi');
      }

      const data = await response.json();
      setProfile(data);
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const InfoRow = ({ icon, label, value, fullWidth = false }) => {
    if (!value) return null;

    return (
      <Grid item xs={12} sm={fullWidth ? 12 : 6}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
            p: 1.5,
            backgroundColor: 'rgba(100, 150, 200, 0.04)',
            borderRadius: '10px',
            border: '1px solid rgba(100, 150, 200, 0.08)',
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: 'rgba(100, 150, 200, 0.08)',
              borderColor: 'rgba(100, 150, 200, 0.15)',
              transform: 'translateY(-1px)'
            }
          }}
        >
          <Box
            sx={{
              color: '#5a9fd4',
              mt: 0.25,
              flexShrink: 0
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                color: '#6e7680',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block',
                mb: 0.5
              }}
            >
              {label}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#2d3748',
                fontSize: '14px',
                fontWeight: 500,
                wordBreak: 'break-word'
              }}
            >
              {value}
            </Typography>
          </Box>
        </Box>
      </Grid>
    );
  };

  const Section = ({ title, icon, children }) => (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Box sx={{ color: '#5a9fd4' }}>{icon}</Box>
        <Typography
          variant="h6"
          sx={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#1a1d1f',
            letterSpacing: '-0.3px'
          }}
        >
          {title}
        </Typography>
      </Box>
      <Grid container spacing={1.5}>
        {children}
      </Grid>
    </Box>
  );

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.12)',
          maxHeight: '90vh'
        }
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: 3,
          pb: 2,
          background: 'linear-gradient(135deg, rgba(106, 159, 212, 0.08) 0%, rgba(160, 200, 140, 0.08) 100%)',
          borderBottom: '1px solid rgba(100, 150, 200, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              background: 'linear-gradient(135deg, #6a9fd4 0%, #a0c88c 100%)',
              fontSize: '24px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(106, 159, 212, 0.25)'
            }}
          >
            {profile ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}` : '...'}
          </Avatar>
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: '#1a1d1f',
                fontSize: '20px',
                letterSpacing: '-0.4px',
                mb: 0.5
              }}
            >
              {loading ? 'Yükleniyor...' : profile ? `${profile.firstName} ${profile.lastName}` : 'Başvuran Profili'}
            </Typography>
            {profile?.application?.status && (
              <Chip
                label={
                  profile.application.status === 'submitted' ? 'Başvuru Tamamlandı' :
                    profile.application.status === 'approved' ? 'Onaylandı' :
                      profile.application.status === 'rejected' ? 'Reddedildi' :
                        profile.application.status
                }
                size="small"
                sx={{
                  height: 22,
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor:
                    profile.application.status === 'submitted' ? 'rgba(59, 130, 246, 0.12)' :
                      profile.application.status === 'approved' ? 'rgba(34, 197, 94, 0.12)' :
                        profile.application.status === 'rejected' ? 'rgba(239, 68, 68, 0.12)' :
                          'rgba(156, 163, 175, 0.12)',
                  color:
                    profile.application.status === 'submitted' ? '#3b82f6' :
                      profile.application.status === 'approved' ? '#22c55e' :
                        profile.application.status === 'rejected' ? '#ef4444' :
                          '#6b7280'
                }}
              />
            )}
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: '#6e7680',
            '&:hover': { backgroundColor: 'rgba(110, 118, 128, 0.1)' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={40} sx={{ color: '#5a9fd4' }} />
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body1" color="error">
              {error}
            </Typography>
            <Button onClick={loadProfile} sx={{ mt: 2 }}>
              Tekrar Dene
            </Button>
          </Box>
        ) : profile ? (
          <>
            {/* İletişim Bilgileri */}
            <Section title="İletişim Bilgileri" icon={<PersonIcon />}>
              <InfoRow
                icon={<EmailIcon fontSize="small" />}
                label="E-posta"
                value={profile.email}
                fullWidth
              />
              <InfoRow
                icon={<PhoneIcon fontSize="small" />}
                label="Telefon"
                value={profile.phone}
              />
              {profile.profileCreatedAt && (
                <InfoRow
                  icon={<CalendarIcon fontSize="small" />}
                  label="Profil Oluşturulma"
                  value={formatDate(profile.profileCreatedAt)}
                />
              )}
            </Section>

            {profile.application && (
              <>
                <Divider sx={{ my: 3 }} />

                {/* Kişisel Bilgiler */}
                {(profile.application.birthDate || profile.application.address) && (
                  <Section title="Kişisel Bilgiler" icon={<LocationIcon />}>
                    {profile.application.birthDate && (
                      <InfoRow
                        icon={<CalendarIcon fontSize="small" />}
                        label="Doğum Tarihi"
                        value={formatDate(profile.application.birthDate)}
                      />
                    )}
                    {profile.application.city && (
                      <InfoRow
                        icon={<LocationIcon fontSize="small" />}
                        label="Şehir"
                        value={`${profile.application.city}${profile.application.district ? ' / ' + profile.application.district : ''}`}
                      />
                    )}
                    {profile.application.address && (
                      <InfoRow
                        icon={<LocationIcon fontSize="small" />}
                        label="Adres"
                        value={profile.application.address}
                        fullWidth
                      />
                    )}
                  </Section>
                )}

                {/* Eğitim Bilgileri */}
                {(profile.application.educationLevel || profile.application.university) && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Section title="Eğitim Bilgileri" icon={<SchoolIcon />}>
                      {profile.application.educationLevel && (
                        <InfoRow
                          icon={<SchoolIcon fontSize="small" />}
                          label="Eğitim Seviyesi"
                          value={profile.application.educationLevel}
                        />
                      )}
                      {profile.application.university && (
                        <InfoRow
                          icon={<SchoolIcon fontSize="small" />}
                          label="Üniversite"
                          value={profile.application.university}
                        />
                      )}
                      {profile.application.department && (
                        <InfoRow
                          icon={<SchoolIcon fontSize="small" />}
                          label="Bölüm"
                          value={profile.application.department}
                        />
                      )}
                      {profile.application.graduationYear && (
                        <InfoRow
                          icon={<CalendarIcon fontSize="small" />}
                          label="Mezuniyet Yılı"
                          value={profile.application.graduationYear}
                        />
                      )}
                      {profile.application.gpa && (
                        <InfoRow
                          icon={<SchoolIcon fontSize="small" />}
                          label="Not Ortalaması"
                          value={profile.application.gpa}
                        />
                      )}
                    </Section>
                  </>
                )}

                {/* Deneyim Bilgileri */}
                {(profile.application.experienceLevel || profile.application.lastCompany) && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Section title="Deneyim Bilgileri" icon={<WorkIcon />}>
                      {profile.application.experienceLevel && (
                        <InfoRow
                          icon={<WorkIcon fontSize="small" />}
                          label="Deneyim Seviyesi"
                          value={profile.application.experienceLevel}
                        />
                      )}
                      {profile.application.lastCompany && (
                        <InfoRow
                          icon={<WorkIcon fontSize="small" />}
                          label="Son Şirket"
                          value={profile.application.lastCompany}
                        />
                      )}
                      {profile.application.lastPosition && (
                        <InfoRow
                          icon={<WorkIcon fontSize="small" />}
                          label="Son Pozisyon"
                          value={profile.application.lastPosition}
                        />
                      )}
                    </Section>
                  </>
                )}

                {/* Teknik Bilgiler */}
                {(profile.application.internetDownload || profile.application.typingSpeed || profile.application.processor) && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Section title="Teknik Bilgiler" icon={<ComputerIcon />}>
                      {profile.application.internetDownload && (
                        <InfoRow
                          icon={<SpeedIcon fontSize="small" />}
                          label="İnternet Hızı"
                          value={`↓ ${profile.application.internetDownload} Mbps ${profile.application.internetUpload ? `↑ ${profile.application.internetUpload} Mbps` : ''}`}
                        />
                      )}
                      {profile.application.typingSpeed && (
                        <InfoRow
                          icon={<SpeedIcon fontSize="small" />}
                          label="Yazma Hızı"
                          value={`${profile.application.typingSpeed} WPM`}
                        />
                      )}
                      {profile.application.processor && (
                        <InfoRow
                          icon={<ComputerIcon fontSize="small" />}
                          label="İşlemci"
                          value={profile.application.processor}
                        />
                      )}
                      {profile.application.ram && (
                        <InfoRow
                          icon={<ComputerIcon fontSize="small" />}
                          label="RAM"
                          value={profile.application.ram}
                        />
                      )}
                      {profile.application.os && (
                        <InfoRow
                          icon={<ComputerIcon fontSize="small" />}
                          label="İşletim Sistemi"
                          value={profile.application.os}
                        />
                      )}
                    </Section>
                  </>
                )}

                {/* Diğer Bilgiler */}
                {(profile.application.source || profile.application.referenceName) && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Section title="Diğer Bilgiler" icon={<DescriptionIcon />}>
                      {profile.application.source && (
                        <InfoRow
                          icon={<DescriptionIcon fontSize="small" />}
                          label="Başvuru Kaynağı"
                          value={profile.application.source}
                        />
                      )}
                      {profile.application.referenceName && (
                        <InfoRow
                          icon={<PersonIcon fontSize="small" />}
                          label="Referans"
                          value={profile.application.referenceName}
                        />
                      )}
                      {profile.application.submittedAt && (
                        <InfoRow
                          icon={<CalendarIcon fontSize="small" />}
                          label="Başvuru Tarihi"
                          value={formatDate(profile.application.submittedAt)}
                        />
                      )}
                    </Section>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body1" color="textSecondary">
              Profil bilgisi bulunamadı
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* Actions */}
      <DialogActions
        sx={{
          p: 3,
          pt: 2,
          borderTop: '1px solid rgba(100, 150, 200, 0.12)',
          gap: 1
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            color: '#6e7680',
            '&:hover': { backgroundColor: 'rgba(110, 118, 128, 0.08)' }
          }}
        >
          Kapat
        </Button>
        {profile?.invitationLink?.token && onViewForm && (
          <Button
            onClick={() => {
              onViewForm(profile.invitationLink.token);
              onClose();
            }}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #6a9fd4 0%, #a0c88c 100%)',
              color: '#ffffff',
              fontWeight: 600,
              px: 3,
              boxShadow: '0 2px 8px rgba(106, 159, 212, 0.25)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a8fc4 0%, #90b87c 100%)',
                boxShadow: '0 4px 12px rgba(106, 159, 212, 0.3)'
              }
            }}
          >
            Başvuru Formunu Görüntüle
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ApplicantProfileModal;
