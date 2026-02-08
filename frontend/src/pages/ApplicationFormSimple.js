// src/pages/ApplicationFormSimple.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import sessionManager from '../utils/sessionManager';
import applicationService from '../services/applicationService';
import invitationService from '../services/invitationService';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Grid,
  Alert,
  Chip,
  Card,
  CardContent,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Stack,
  IconButton
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Send as SendIcon,
  Block as BlockIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Computer as ComputerIcon,
  Description as FileIcon,
  Check as CheckIcon,
  Home as AddressIcon,
  Assignment as AssignmentIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon
} from '@mui/icons-material';

const educationLevels = [
  'İlköğretim',
  'Lise',
  'Önlisans',
  'Lisans',
  'Yüksek Lisans',
  'Doktora'
];

const experienceLevels = [
  'Deneyimim yok',
  '0-1 yıl',
  '1-3 yıl',
  '3-5 yıl',
  '5-10 yıl',
  '10+ yıl'
];

const sources = [
  'Kariyer.net',
  'LinkedIn',
  'Indeed',
  'Arkadaş tavsiyesi',
  'Google araması',
  'Sosyal medya',
  'Diğer'
];

// Adım tanımları
const steps = [
  {
    id: 'personal',
    title: 'Kişisel Bilgiler',
    description: 'Temel kişisel bilgileriniz',
    icon: PersonIcon,
    color: '#1c61ab'
  },
  {
    id: 'address',
    title: 'Adres Bilgileri',
    description: 'İletişim adresi bilgileri',
    icon: AddressIcon,
    color: '#1c61ab'
  },
  {
    id: 'education',
    title: 'Eğitim Bilgileri',
    description: 'Eğitim geçmişiniz',
    icon: SchoolIcon,
    color: '#1c61ab'
  },
  {
    id: 'experience',
    title: 'Deneyim',
    description: 'İş deneyimi bilgileri',
    icon: WorkIcon,
    color: '#1c61ab'
  },
  {
    id: 'technical',
    title: 'Teknik Bilgiler',
    description: 'Sistem ve teknik detaylar',
    icon: ComputerIcon,
    color: '#1c61ab'
  },
  {
    id: 'documents',
    title: 'Belgeler',
    description: 'CV ve test dosyaları',
    icon: FileIcon,
    color: '#1c61ab'
  },
  {
    id: 'additional',
    title: 'Ek Bilgiler',
    description: 'Referans ve diğer bilgiler',
    icon: AssignmentIcon,
    color: '#1c61ab'
  }
];

// Profili tum site-specific key'lerde ara
const findProfileAcrossSites = (tokenValue) => {
  const siteCodes = (() => {
    try {
      const sites = JSON.parse(localStorage.getItem('sites') || '[]');
      if (sites.length > 0) return sites.map(s => s.code);
    } catch (e) {}
    return ['FXB', 'MTD', 'ZBH'];
  })();
  for (const siteCode of siteCodes) {
    const profiles = JSON.parse(localStorage.getItem(`user_profiles_${siteCode}`) || '[]');
    const found = profiles.find(p => p.token === tokenValue);
    if (found) return { profile: found, siteCode };
  }
  // Legacy fallback
  const legacyProfiles = JSON.parse(localStorage.getItem('user_profiles') || '[]');
  const found = legacyProfiles.find(p => p.token === tokenValue);
  if (found) return { profile: found, siteCode: null };
  return null;
};

// Token'i tum site-specific invitation_links key'lerinde ara
const findInvitationAcrossSites = (tokenValue) => {
  const siteCodes = (() => {
    try {
      const sites = JSON.parse(localStorage.getItem('sites') || '[]');
      if (sites.length > 0) return sites.map(s => s.code);
    } catch (e) {}
    return ['FXB', 'MTD', 'ZBH'];
  })();
  for (const siteCode of siteCodes) {
    const links = JSON.parse(localStorage.getItem(`invitation_links_${siteCode}`) || '[]');
    const found = links.find(inv => inv.token === tokenValue);
    if (found) return { invitation: found, siteCode };
  }
  // Legacy fallback
  const globalLinks = JSON.parse(localStorage.getItem('invitation_links') || '[]');
  const found = globalLinks.find(inv => inv.token === tokenValue);
  if (found) return { invitation: found, siteCode: null };
  return null;
};

function ApplicationFormSimple() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true); // Yeni: ilk yukleme durumu
  const [activeStep, setActiveStep] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});
  const [currentProfile, setCurrentProfile] = useState(null);
  const [linkExpiredDialog, setLinkExpiredDialog] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());

  const [formData, setFormData] = useState({
    // Kişisel
    firstName: '',
    lastName: '',
    tcNumber: '',
    birthDate: '',
    phone: '',
    email: '',

    // Adres
    address: '',
    city: '',
    district: '',
    postalCode: '',

    // Eğitim
    educationLevel: '',
    university: '',
    department: '',
    graduationYear: '',
    gpa: '',

    // Deneyim
    hasSectorExperience: false,
    experienceLevel: '',
    lastCompany: '',
    lastPosition: '',

    // Teknik
    internetDownload: '',
    internetUpload: '',
    typingSpeed: '',
    processor: '',
    ram: '',
    os: '',

    // Diğer
    source: '',
    hasReference: false,
    referenceName: '',
    kvkkApproved: false
  });

  const [files, setFiles] = useState({
    cv: null,
    internetTest: null,
    typingTest: null
  });

  // Session ve token kontrolü
  useEffect(() => {
    const validateTokenAndLoadProfile = async () => {
      if (!token) {
        navigate('/');
        return;
      }

      try {
        // API ile token doğrula
        const validation = await applicationService.validateToken(token);

        if (!validation.valid) {
          setLinkExpiredDialog(true);
          setInitializing(false);
          return;
        }

        // Link durumunu kontrol et - sadece tamamen kullanılmış olanları engelle
        if (validation.status === 'used' || validation.status === 'completed') {
          console.log('❌ Link zaten kullanılmış:', validation.status);
          setLinkExpiredDialog(true);
          setInitializing(false);
          return;
        }

        // 'profile_created' durumu kabul edilebilir - link henüz aktif
        if (validation.status === 'profile_created') {
          console.log('✅ Profil oluşturulmuş, form doldurulabilir');
        }

        // İlk olarak LocalStorage'da bu token ile oluşturulmuş profil var mı kontrol et (site-specific)
        const profileResult = findProfileAcrossSites(token);
        const existingProfile = profileResult?.profile || null;

        console.log('🔍 Token ile profil arama:', token);
        console.log('🔍 Bulunan profil:', existingProfile);

        if (existingProfile) {
          console.log('✅ Bu token için profil zaten var, forma devam ediliyor');

          // Profil var ise session'ı otomatik olarak ayarla
          sessionManager.setCurrentSession({
            profileId: existingProfile.id,
            email: existingProfile.email,
            firstName: existingProfile.firstName,
            lastName: existingProfile.lastName,
            phone: existingProfile.phone,
            token: token,
            sessionToken: existingProfile.sessionToken,
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            isActive: true
          });

          setCurrentProfile(existingProfile);

          // Profil bilgilerini yükle
          setFormData(prev => ({
            ...prev,
            firstName: existingProfile.firstName || '',
            lastName: existingProfile.lastName || '',
            email: existingProfile.email || '',
            phone: existingProfile.phone || ''
          }));

          setInitializing(false);
          return;
        }

        // Profil bulunamadıysa - direkt CreateProfile'a yonlendir (form gosterme)
        console.log('🔍 Bu token icin profil bulunamadi, CreateProfile\'a yonlendiriliyor');
        navigate(`/create-profile/${token}`, { replace: true });
        return;

      } catch (error) {
        console.error('Token doğrulama hatası:', error);
        if (error.message.includes('kullanılmış')) {
          setLinkExpiredDialog(true);
          setInitializing(false);
        } else {
          // Fallback: Site-specific localStorage kontrol
          const invResult = findInvitationAcrossSites(token);
          const currentLink = invResult?.invitation || null;

          if (currentLink && currentLink.status === 'used') {
            setLinkExpiredDialog(true);
            setInitializing(false);
            return;
          }

          // Profil token bazli ara
          const profileResult = findProfileAcrossSites(token);
          if (profileResult?.profile) {
            setCurrentProfile(profileResult.profile);
            setFormData(prev => ({
              ...prev,
              firstName: profileResult.profile.firstName || '',
              lastName: profileResult.profile.lastName || '',
              email: profileResult.profile.email || '',
              phone: profileResult.profile.phone || ''
            }));
            setInitializing(false);
          } else {
            // Profil yok, CreateProfile'a yonlendir
            navigate(`/create-profile/${token}`, { replace: true });
          }
        }
      }
    };

    validateTokenAndLoadProfile();
  }, [token, navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Validation hatalarını temizle
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    setFiles(prev => ({
      ...prev,
      [fileType]: file
    }));
  };

  const validateStep = (stepId) => {
    const errors = {};

    switch (stepId) {
      case 'personal':
        if (!formData.firstName.trim()) errors.firstName = 'Ad gerekli';
        if (!formData.lastName.trim()) errors.lastName = 'Soyad gerekli';
        if (!formData.tcNumber.trim()) errors.tcNumber = 'TC Kimlik No gerekli';
        if (!formData.birthDate) errors.birthDate = 'Doğum tarihi gerekli';
        break;

      case 'address':
        if (!formData.address.trim()) errors.address = 'Adres gerekli';
        if (!formData.city.trim()) errors.city = 'Şehir gerekli';
        if (!formData.district.trim()) errors.district = 'İlçe gerekli';
        break;

      case 'education':
        if (!formData.educationLevel) errors.educationLevel = 'Eğitim seviyesi gerekli';
        break;

      case 'technical':
        if (!formData.internetDownload) errors.internetDownload = 'İndirme hızı gerekli';
        if (!formData.internetUpload) errors.internetUpload = 'Yükleme hızı gerekli';
        if (!formData.typingSpeed) errors.typingSpeed = 'Yazma hızı gerekli';
        break;

      case 'documents':
        if (!files.cv) errors.cv = 'CV dosyası gerekli';
        if (!files.internetTest) errors.internetTest = 'İnternet hız testi gerekli';
        if (!files.typingTest) errors.typingTest = 'Yazma hızı testi gerekli';
        break;

      case 'additional':
        if (!formData.source) errors.source = 'Nereden duydunuz alanı gerekli';
        if (!formData.kvkkApproved) errors.kvkkApproved = 'KVKK onayı gerekli';
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStepClick = (stepIndex) => {
    setActiveStep(stepIndex);
  };

  const handleNext = () => {
    const currentStepId = steps[activeStep].id;

    if (validateStep(currentStepId)) {
      setCompletedSteps(prev => new Set([...prev, currentStepId]));

      if (activeStep < steps.length - 1) {
        setActiveStep(activeStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep('additional')) {
      return;
    }

    setLoading(true);
    try {
      const formDataWithToken = { ...formData, token };
      const result = await applicationService.submitApplication(formDataWithToken, files);

      if (result.success) {
        // Başvuru başarılı - ApplicationSuccess sayfasına yönlendir
        navigate('/application-success', {
          state: {
            applicationId: result.applicationId,
            chatToken: result.chatToken,
            applicantName: `${formData.firstName} ${formData.lastName}`
          }
        });
      }
    } catch (error) {
      console.error('Form gönderme hatası:', error);
      setValidationErrors({ general: 'Form gönderilirken bir hata oluştu: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  const isStepCompleted = (stepId) => {
    return completedSteps.has(stepId);
  };

  const getCurrentStepIcon = (step, index) => {
    const IconComponent = step.icon;
    const isActive = index === activeStep;
    const isCompleted = isStepCompleted(step.id);

    if (isCompleted) {
      return <CheckCircleIcon sx={{ color: '#8bb94a', fontSize: 20 }} />;
    } else if (isActive) {
      return <IconComponent sx={{ color: step.color, fontSize: 20 }} />;
    } else {
      return <RadioButtonUncheckedIcon sx={{ color: '#666', fontSize: 20 }} />;
    }
  };

  // Initializing - loading ekrani
  if (initializing) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a0b 0%, #1c61ab 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <Box sx={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
        <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Yukleniyor...</Typography>
      </Box>
    );
  }

  // Link expired dialog
  if (linkExpiredDialog) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0a0b 0%, #1c61ab 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}
      >
        <Card
          sx={{
            maxWidth: 500,
            width: '100%',
            textAlign: 'center',
            borderRadius: 4,
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Avatar
              sx={{
                bgcolor: '#f44336',
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 3
              }}
            >
              <BlockIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: '#0a0a0b' }}>
              Başvuru Linki Geçersiz
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
              Bu başvuru linki daha önce kullanılmış ve geçerliliğini yitirmiştir.
              Yeni bir başvuru yapmak için İnsan Kaynakları departmanı ile iletişime geçiniz.
            </Typography>
            <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
              ik@optimahrms.com
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#f8f9fa',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' }
      }}
    >
      {/* Sidebar Navigation */}
      <Paper
        elevation={0}
        sx={{
          width: { xs: '100%', md: 320 },
          background: 'white',
          borderRight: { xs: 'none', md: '1px solid #e0e0e0' },
          borderBottom: { xs: '1px solid #e0e0e0', md: 'none' },
          display: 'flex',
          flexDirection: 'column',
          position: { xs: 'static', md: 'fixed' },
          height: { xs: 'auto', md: '100vh' },
          overflow: 'auto',
          zIndex: 100
        }}
      >
        {/* Header */}
        <Box sx={{ p: 3, borderBottom: '1px solid #e0e0e0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton
              onClick={() => navigate(`/create-profile/${token}`)}
              sx={{ mr: 1, color: '#666' }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0a0a0b' }}>
              Başvuru Formu
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Başvuru işleminizi tamamlamak için lütfen tüm adımları doldurun.
          </Typography>
        </Box>

        {/* Steps List */}
        <List sx={{ flex: 1, px: 1 }}>
          {steps.map((step, index) => {
            const isActive = index === activeStep;
            const isCompleted = isStepCompleted(step.id);

            return (
              <ListItem key={step.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleStepClick(index)}
                  sx={{
                    borderRadius: 2,
                    mx: 1,
                    my: 0.5,
                    minHeight: 64,
                    bgcolor: isActive ? 'rgba(28, 97, 171, 0.08)' : 'transparent',
                    border: isActive ? '1px solid rgba(28, 97, 171, 0.2)' : '1px solid transparent',
                    '&:hover': {
                      bgcolor: isActive ? 'rgba(28, 97, 171, 0.12)' : 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getCurrentStepIcon(step, index)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? '#1c61ab' : isCompleted ? '#8bb94a' : '#333',
                          fontSize: '0.9rem'
                        }}
                      >
                        {step.title}
                      </Typography>
                    }
                    secondary={
                      <Typography
                        variant="caption"
                        sx={{
                          color: isActive ? 'rgba(28, 97, 171, 0.7)' : '#666',
                          fontSize: '0.75rem'
                        }}
                      >
                        {step.description}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {/* Footer */}
        <Box sx={{ p: 3, borderTop: '1px solid #e0e0e0' }}>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
            © 2024 Optima HR
          </Typography>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{
        flex: 1,
        ml: { xs: 0, md: '320px' },
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        width: { xs: '100%', md: 'auto' }
      }}>
        {/* Top Bar */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            background: 'white',
            borderBottom: '1px solid #e0e0e0',
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#0a0a0b', mb: 0.5 }}>
                {steps[activeStep].title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {steps[activeStep].description}
              </Typography>
            </Box>
            <Chip
              label={`Adım ${activeStep + 1} / ${steps.length}`}
              sx={{
                bgcolor: 'rgba(28, 97, 171, 0.1)',
                color: '#1c61ab',
                fontWeight: 600,
                borderRadius: 2
              }}
            />
          </Box>
        </Paper>

        {/* Form Content */}
        <Box sx={{ flex: 1, p: { xs: 2, sm: 3, md: 4 }, overflow: 'auto' }}>
          <Box sx={{ maxWidth: '1000px', mx: 'auto', width: '100%', px: { xs: 2, md: 0 } }}>
            {renderStepContent()}
          </Box>
        </Box>

        {/* Bottom Navigation */}
        <Paper
          elevation={0}
          sx={{
            p: 3,
            background: 'white',
            borderTop: '1px solid #e0e0e0',
            position: 'sticky',
            bottom: 0
          }}
        >
          <Box sx={{ maxWidth: '1000px', mx: 'auto', width: '100%', px: { xs: 2, md: 0 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                onClick={handleBack}
                disabled={activeStep === 0}
                sx={{
                  color: '#666',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:disabled': { color: '#ccc' }
                }}
              >
                Geri
              </Button>

              <Box sx={{ display: 'flex', gap: 1 }}>
                {steps.map((_, index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: index === activeStep ? '#1c61ab' :
                               isStepCompleted(steps[index].id) ? '#8bb94a' : '#e0e0e0',
                      transition: 'background-color 0.3s ease'
                    }}
                  />
                ))}
              </Box>

              {activeStep === steps.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  variant="contained"
                  endIcon={<SendIcon />}
                  sx={{
                    bgcolor: '#8bb94a',
                    '&:hover': { bgcolor: '#7aa83e' },
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(139, 185, 74, 0.3)'
                  }}
                >
                  {loading ? 'Gönderiliyor...' : 'Başvuruyu Gönder'}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  variant="contained"
                  sx={{
                    bgcolor: '#1c61ab',
                    '&:hover': { bgcolor: '#154a8a' },
                    borderRadius: 3,
                    px: 4,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Devam Et
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Box>
  );

  function renderStepContent() {
    const currentStep = steps[activeStep];

    return (
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          border: '1px solid #e8ecf4',
          overflow: 'visible',
          boxShadow: '0 8px 32px rgba(28, 97, 171, 0.08)',
          background: '#fff',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #1c61ab 0%, #8bb94a 100%)',
            borderRadius: '16px 16px 0 0'
          }
        }}
      >
        <CardContent sx={{
          p: { xs: 3, md: 4 },
          background: 'linear-gradient(135deg, #fafbff 0%, #f8f9fa 100%)',
          '& .MuiGrid-container': {
            alignItems: 'flex-start'
          },
          '& .MuiTextField-root, & .MuiFormControl-root': {
            width: '100%',
            mb: 2
          },
          '& .MuiOutlinedInput-root': {
            minHeight: '56px',
            borderRadius: '12px',
            backgroundColor: '#fff',
            border: '2px solid #e8ecf4',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 8px rgba(28, 97, 171, 0.04)',
            '&:hover': {
              borderColor: '#c7d2fe',
              backgroundColor: '#fff',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(28, 97, 171, 0.08)'
            },
            '&.Mui-focused': {
              backgroundColor: '#fff',
              borderColor: '#1c61ab',
              boxShadow: '0 0 0 4px rgba(28, 97, 171, 0.1), 0 4px 12px rgba(28, 97, 171, 0.15)'
            },
            '& .MuiOutlinedInput-notchedOutline': {
              border: 'none'
            }
          },
          '& .MuiSelect-select': {
            minHeight: '23px !important',
            padding: '16.5px 18px !important'
          },
          '& .MuiInputLabel-root': {
            color: '#64748b',
            fontWeight: 600,
            fontSize: '0.95rem',
            '&.Mui-focused': {
              color: '#1c61ab',
              fontWeight: 700
            },
            '&.MuiInputLabel-shrink': {
              background: 'linear-gradient(to right, #fff 0%, #fff 100%)',
              padding: '0 8px',
              marginLeft: '-4px'
            }
          },
          '& .MuiFormHelperText-root': {
            marginLeft: '12px',
            fontSize: '0.8rem',
            fontWeight: 500
          }
        }}>
          {validationErrors.general && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {validationErrors.general}
            </Alert>
          )}

          {renderFormFields(currentStep.id)}
        </CardContent>
      </Card>
    );
  }

  function renderFormFields(stepId) {
    switch (stepId) {
      case 'personal':
        return (
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 1.5,
                  color: '#1c61ab',
                  fontSize: '1.4rem',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60px',
                    height: '3px',
                    background: 'linear-gradient(90deg, #1c61ab 0%, #8bb94a 100%)',
                    borderRadius: '2px'
                  }
                }}
              >
                👤 Kişisel Bilgileriniz
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Lütfen kişisel bilgilerinizi eksiksiz olarak doldurun.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="Ad"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                error={!!validationErrors.firstName}
                helperText={validationErrors.firstName}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Soyad"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                error={!!validationErrors.lastName}
                helperText={validationErrors.lastName}
                sx={{ flex: 1 }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="TC Kimlik Numarası"
                name="tcNumber"
                value={formData.tcNumber}
                onChange={handleInputChange}
                error={!!validationErrors.tcNumber}
                helperText={validationErrors.tcNumber}
                inputProps={{ maxLength: 11 }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Doğum Tarihi"
                name="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={handleInputChange}
                error={!!validationErrors.birthDate}
                helperText={validationErrors.birthDate}
                InputLabelProps={{ shrink: true }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="Telefon"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled
                sx={{ flex: 1 }}
              />
              <TextField
                label="E-posta"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        );

      case 'address':
        return (
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 1.5,
                  color: '#1c61ab',
                  fontSize: '1.4rem',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60px',
                    height: '3px',
                    background: 'linear-gradient(90deg, #1c61ab 0%, #8bb94a 100%)',
                    borderRadius: '2px'
                  }
                }}
              >
                🏠 Adres Bilgileriniz
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                İletişim kurabilmemiz için adres bilgilerinizi girin.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Adres"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                error={!!validationErrors.address}
                helperText={validationErrors.address}
                multiline
                rows={3}
                placeholder="Tam adresinizi yazın..."
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="Şehir"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                error={!!validationErrors.city}
                helperText={validationErrors.city}
                placeholder="Örn: İstanbul"
                sx={{ flex: 1 }}
              />
              <TextField
                label="İlçe"
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                error={!!validationErrors.district}
                helperText={validationErrors.district}
                placeholder="Örn: Kadıköy"
                sx={{ flex: 1 }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Posta Kodu (Opsiyonel)"
                name="postalCode"
                value={formData.postalCode}
                onChange={handleInputChange}
                placeholder="34000"
                sx={{ maxWidth: 200 }}
              />
            </Box>
          </Box>
        );

      case 'education':
        return (
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 1.5,
                  color: '#1c61ab',
                  fontSize: '1.4rem',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60px',
                    height: '3px',
                    background: 'linear-gradient(90deg, #1c61ab 0%, #8bb94a 100%)',
                    borderRadius: '2px'
                  }
                }}
              >
                🎓 Eğitim Bilgileriniz
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Eğitim geçmişinizle ilgili bilgileri doldurun.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormControl
                fullWidth
                error={!!validationErrors.educationLevel}
              >
                <InputLabel>Eğitim Seviyesi *</InputLabel>
                <Select
                  name="educationLevel"
                  value={formData.educationLevel}
                  onChange={handleInputChange}
                  label="Eğitim Seviyesi *"
                  MenuProps={{
                    PaperProps: {
                      sx: { maxHeight: 300, minWidth: 200 }
                    }
                  }}
                >
                  {educationLevels.map((level) => (
                    <MenuItem key={level} value={level} sx={{ py: 1.5, px: 2 }}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
                {validationErrors.educationLevel && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {validationErrors.educationLevel}
                  </Typography>
                )}
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="Üniversite"
                name="university"
                value={formData.university}
                onChange={handleInputChange}
                placeholder="Örn: İstanbul Üniversitesi"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Bölüm"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                placeholder="Örn: Bilgisayar Mühendisliği"
                sx={{ flex: 1 }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="Mezuniyet Yılı"
                name="graduationYear"
                type="number"
                value={formData.graduationYear}
                onChange={handleInputChange}
                placeholder="2024"
                inputProps={{ min: 1970, max: 2030 }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="GPA / Not Ortalaması"
                name="gpa"
                type="number"
                inputProps={{ step: 0.01, min: 0, max: 4 }}
                value={formData.gpa}
                onChange={handleInputChange}
                placeholder="3.45"
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        );

      case 'experience':
        return (
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 1.5,
                  color: '#1c61ab',
                  fontSize: '1.4rem',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60px',
                    height: '3px',
                    background: 'linear-gradient(90deg, #1c61ab 0%, #8bb94a 100%)',
                    borderRadius: '2px'
                  }
                }}
              >
                💼 İş Deneyimi
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                İş deneyimi bilgilerinizi paylaşın.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ p: 2, bgcolor: 'rgba(28, 97, 171, 0.05)', borderRadius: 2, border: '1px solid rgba(28, 97, 171, 0.1)' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="hasSectorExperience"
                      checked={formData.hasSectorExperience}
                      onChange={handleInputChange}
                      sx={{
                        color: '#1c61ab',
                        '&.Mui-checked': { color: '#1c61ab' }
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Bu sektörde (müşteri hizmetleri/call center) deneyimim var
                    </Typography>
                  }
                />
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormControl fullWidth>
                <InputLabel>Toplam İş Deneyimi</InputLabel>
                <Select
                  name="experienceLevel"
                  value={formData.experienceLevel}
                  onChange={handleInputChange}
                  label="Toplam İş Deneyimi"
                  MenuProps={{
                    PaperProps: {
                      sx: { maxHeight: 300, minWidth: 250 }
                    }
                  }}
                >
                  {experienceLevels.map((level) => (
                    <MenuItem key={level} value={level} sx={{ py: 1.5, px: 2 }}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="Son Çalıştığınız Şirket"
                name="lastCompany"
                value={formData.lastCompany}
                onChange={handleInputChange}
                placeholder="Örn: ABC Teknoloji"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Son Pozisyonunuz"
                name="lastPosition"
                value={formData.lastPosition}
                onChange={handleInputChange}
                placeholder="Örn: Müşteri Temsilcisi"
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        );

      case 'technical':
        return (
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 1.5,
                  color: '#1c61ab',
                  fontSize: '1.4rem',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60px',
                    height: '3px',
                    background: 'linear-gradient(90deg, #1c61ab 0%, #8bb94a 100%)',
                    borderRadius: '2px'
                  }
                }}
              >
                💻 Teknik Bilgiler
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Sistem ve internet bağlantısı bilgilerinizi girin.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="İnternet İndirme Hızı (Mbps)"
                name="internetDownload"
                type="number"
                value={formData.internetDownload}
                onChange={handleInputChange}
                error={!!validationErrors.internetDownload}
                helperText={validationErrors.internetDownload}
                sx={{ flex: 1 }}
              />
              <TextField
                label="İnternet Yükleme Hızı (Mbps)"
                name="internetUpload"
                type="number"
                value={formData.internetUpload}
                onChange={handleInputChange}
                error={!!validationErrors.internetUpload}
                helperText={validationErrors.internetUpload}
                sx={{ flex: 1 }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Yazma Hızı (WPM)"
                name="typingSpeed"
                type="number"
                value={formData.typingSpeed}
                onChange={handleInputChange}
                error={!!validationErrors.typingSpeed}
                helperText={validationErrors.typingSpeed}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="İşlemci Bilgisi"
                name="processor"
                value={formData.processor}
                onChange={handleInputChange}
                placeholder="Örn: Intel i5, AMD Ryzen"
                sx={{ flex: 1 }}
              />
              <TextField
                label="RAM Miktarı"
                name="ram"
                value={formData.ram}
                onChange={handleInputChange}
                placeholder="Örn: 8GB, 16GB"
                sx={{ flex: 1 }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="İşletim Sistemi"
                name="os"
                value={formData.os}
                onChange={handleInputChange}
                placeholder="Örn: Windows 11, macOS, Linux"
              />
            </Box>
          </Box>
        );

      case 'documents':
        return (
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 1.5,
                  color: '#1c61ab',
                  fontSize: '1.4rem',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60px',
                    height: '3px',
                    background: 'linear-gradient(90deg, #1c61ab 0%, #8bb94a 100%)',
                    borderRadius: '2px'
                  }
                }}
              >
                📄 Belgeler
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Lütfen gerekli belgeleri yükleyin.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* CV Dosyası */}
              <Card
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: 'center',
                  border: validationErrors.cv ? '1px solid #f44336' : '1px dashed #ccc',
                  borderRadius: 2,
                  minHeight: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  '&:hover': {
                    borderColor: validationErrors.cv ? '#f44336' : '#1c61ab',
                    bgcolor: 'rgba(28, 97, 171, 0.02)'
                  }
                }}
              >
                <input
                  accept=".pdf,.doc,.docx"
                  style={{ display: 'none' }}
                  id="cv-upload"
                  type="file"
                  onChange={(e) => handleFileChange(e, 'cv')}
                />
                <label htmlFor="cv-upload">
                  <Box sx={{ cursor: 'pointer' }}>
                    <FileIcon sx={{ fontSize: 48, color: files.cv ? '#8bb94a' : '#ccc', mb: 2 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      CV Dosyası
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: '0.85rem',
                        mb: 2,
                        wordBreak: 'break-word',
                        lineHeight: 1.4
                      }}
                    >
                      {files.cv ? files.cv.name : 'PDF, DOC, DOCX'}
                    </Typography>
                    <Button
                      component="span"
                      variant="outlined"
                      size="small"
                      sx={{
                        textTransform: 'none',
                        color: '#1c61ab',
                        borderColor: '#1c61ab',
                        '&:hover': {
                          borderColor: '#154a8a',
                          bgcolor: 'rgba(28, 97, 171, 0.04)'
                        }
                      }}
                    >
                      {files.cv ? 'Değiştir' : 'Dosya Seç'}
                    </Button>
                  </Box>
                </label>
                {validationErrors.cv && (
                  <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block' }}>
                    {validationErrors.cv}
                  </Typography>
                )}
              </Card>

              {/* İnternet Hız Testi */}
              <Card
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: 'center',
                  border: validationErrors.internetTest ? '1px solid #f44336' : '1px dashed #ccc',
                  borderRadius: 2,
                  minHeight: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  '&:hover': {
                    borderColor: validationErrors.internetTest ? '#f44336' : '#1c61ab',
                    bgcolor: 'rgba(28, 97, 171, 0.02)'
                  }
                }}
              >
                <input
                  accept=".jpg,.jpeg,.png,.gif"
                  style={{ display: 'none' }}
                  id="internet-test-upload"
                  type="file"
                  onChange={(e) => handleFileChange(e, 'internetTest')}
                />
                <label htmlFor="internet-test-upload">
                  <Box sx={{ cursor: 'pointer' }}>
                    <ComputerIcon sx={{ fontSize: 48, color: files.internetTest ? '#8bb94a' : '#ccc', mb: 2 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      İnternet Hız Testi
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: '0.85rem',
                        mb: 2,
                        wordBreak: 'break-word',
                        lineHeight: 1.4
                      }}
                    >
                      {files.internetTest ? files.internetTest.name : 'JPG, PNG, GIF'}
                    </Typography>
                    <Button
                      component="span"
                      variant="outlined"
                      size="small"
                      sx={{
                        textTransform: 'none',
                        color: '#1c61ab',
                        borderColor: '#1c61ab',
                        '&:hover': {
                          borderColor: '#154a8a',
                          bgcolor: 'rgba(28, 97, 171, 0.04)'
                        }
                      }}
                    >
                      {files.internetTest ? 'Değiştir' : 'Dosya Seç'}
                    </Button>
                  </Box>
                </label>
                {validationErrors.internetTest && (
                  <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block' }}>
                    {validationErrors.internetTest}
                  </Typography>
                )}
              </Card>

              {/* Yazma Hızı Testi */}
              <Card
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: 'center',
                  border: validationErrors.typingTest ? '1px solid #f44336' : '1px dashed #ccc',
                  borderRadius: 2,
                  minHeight: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  '&:hover': {
                    borderColor: validationErrors.typingTest ? '#f44336' : '#1c61ab',
                    bgcolor: 'rgba(28, 97, 171, 0.02)'
                  }
                }}
              >
                <input
                  accept=".jpg,.jpeg,.png,.gif"
                  style={{ display: 'none' }}
                  id="typing-test-upload"
                  type="file"
                  onChange={(e) => handleFileChange(e, 'typingTest')}
                />
                <label htmlFor="typing-test-upload">
                  <Box sx={{ cursor: 'pointer' }}>
                    <AssignmentIcon sx={{ fontSize: 48, color: files.typingTest ? '#8bb94a' : '#ccc', mb: 2 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Yazma Hızı Testi
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: '0.85rem',
                        mb: 2,
                        wordBreak: 'break-word',
                        lineHeight: 1.4
                      }}
                    >
                      {files.typingTest ? files.typingTest.name : 'JPG, PNG, GIF'}
                    </Typography>
                    <Button
                      component="span"
                      variant="outlined"
                      size="small"
                      sx={{
                        textTransform: 'none',
                        color: '#1c61ab',
                        borderColor: '#1c61ab',
                        '&:hover': {
                          borderColor: '#154a8a',
                          bgcolor: 'rgba(28, 97, 171, 0.04)'
                        }
                      }}
                    >
                      {files.typingTest ? 'Değiştir' : 'Dosya Seç'}
                    </Button>
                  </Box>
                </label>
                {validationErrors.typingTest && (
                  <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block' }}>
                    {validationErrors.typingTest}
                  </Typography>
                )}
              </Card>
            </Box>
          </Box>
        );

      case 'additional':
        return (
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            <Box sx={{ mb: 4, textAlign: 'center' }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 1.5,
                  color: '#1c61ab',
                  fontSize: '1.4rem',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60px',
                    height: '3px',
                    background: 'linear-gradient(90deg, #1c61ab 0%, #8bb94a 100%)',
                    borderRadius: '2px'
                  }
                }}
              >
                ✨ Ek Bilgiler
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                Son adım! Lütfen ek bilgileri doldurun.
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <FormControl
                fullWidth
                error={!!validationErrors.source}
              >
                <InputLabel>Bu iş ilanını nereden duydunuz? *</InputLabel>
                <Select
                  name="source"
                  value={formData.source}
                  onChange={handleInputChange}
                  label="Bu iş ilanını nereden duydunuz? *"
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        maxHeight: 300,
                        minWidth: 350,
                        '& .MuiMenuItem-root': {
                          whiteSpace: 'normal',
                          wordWrap: 'break-word'
                        }
                      }
                    }
                  }}
                >
                  {sources.map((source) => (
                    <MenuItem key={source} value={source} sx={{ py: 1.5, px: 2, minHeight: 'auto' }}>
                      {source}
                    </MenuItem>
                  ))}
                </Select>
                {validationErrors.source && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {validationErrors.source}
                  </Typography>
                )}
              </FormControl>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ p: 2, bgcolor: 'rgba(139, 185, 74, 0.05)', borderRadius: 2, border: '1px solid rgba(139, 185, 74, 0.1)' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="hasReference"
                      checked={formData.hasReference}
                      onChange={handleInputChange}
                      sx={{
                        color: '#8bb94a',
                        '&.Mui-checked': { color: '#8bb94a' }
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Şirkette tanıdığım/referansım olan birisi var
                    </Typography>
                  }
                />
              </Box>
            </Box>

            {formData.hasReference && (
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  label="Referans Kişi Adı ve Pozisyonu"
                  name="referenceName"
                  value={formData.referenceName}
                  onChange={handleInputChange}
                  placeholder="Örn: Ahmet Yılmaz - İK Uzmanı"
                />
              </Box>
            )}

            <Box sx={{ mb: 3 }}>
              <Card
                variant="outlined"
                sx={{
                  p: 3,
                  border: validationErrors.kvkkApproved ? '2px solid #f44336' : '1px solid #e0e0e0',
                  borderRadius: 2,
                  bgcolor: validationErrors.kvkkApproved ? 'rgba(244, 67, 54, 0.05)' : 'rgba(28, 97, 171, 0.02)'
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      name="kvkkApproved"
                      checked={formData.kvkkApproved}
                      onChange={handleInputChange}
                      sx={{
                        color: validationErrors.kvkkApproved ? '#f44336' : '#1c61ab',
                        '&.Mui-checked': { color: '#1c61ab' }
                      }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ lineHeight: 1.6, fontWeight: 500 }}>
                      <strong>KVKK Aydınlatma Metni</strong> kapsamında kişisel verilerimin işlenmesine,
                      başvuru sürecinde kullanılmasına ve değerlendirilmesine onay veriyorum. *
                    </Typography>
                  }
                />
                {validationErrors.kvkkApproved && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block', ml: 4, fontWeight: 600 }}>
                    {validationErrors.kvkkApproved}
                  </Typography>
                )}
              </Card>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  }
}

export default ApplicationFormSimple;