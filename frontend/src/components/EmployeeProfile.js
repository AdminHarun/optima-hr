// src/components/EmployeeProfile.js
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Avatar,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Alert,
  LinearProgress,
  Badge
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon,
  School as SchoolIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Description as DocumentIcon,
  AccountBalance as BankIcon,
  CreditCard as CardIcon,
  Security as SecurityIcon,
  LocalHospital as HealthIcon,
  DirectionsCar as CarIcon,
  Home as HomeIcon,
  Groups as FamilyIcon,
  Language as LanguageIcon,
  Computer as ComputerIcon,
  AttachMoney as SalaryIcon,
  Verified as VerifiedIcon,
  QrCode as QrCodeIcon
} from '@mui/icons-material';

// Kripto cüzdanlar
const cryptoWallets = [
  { id: 'btc', name: 'Bitcoin (BTC)', icon: '₿' },
  { id: 'eth', name: 'Ethereum (ETH)', icon: 'Ξ' },
  { id: 'usdt', name: 'Tether (USDT)', icon: '₮' },
  { id: 'bnb', name: 'BNB', icon: 'BNB' },
  { id: 'trx', name: 'TRON (TRX)', icon: 'TRX' }
];

// Tab panel komponenti
function TabPanel({ children, value, index }) {
  return (
    <Box hidden={value !== index} sx={{ pt: 3 }}>
      {value === index && children}
    </Box>
  );
}

function EmployeeProfile({ open, onClose, employee, onUpdate }) {
  const [tabValue, setTabValue] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState(employee || {});
  const [documents, setDocuments] = useState([]);
  const [cryptoAddresses, setCryptoAddresses] = useState({
    btc: '',
    eth: '',
    usdt: '',
    bnb: '',
    trx: ''
  });

  // Profil fotoğrafı yükleme
  const handlePhotoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData({ ...formData, photo: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // Belge yükleme
  const handleDocumentUpload = (event) => {
    const files = Array.from(event.target.files);
    const newDocs = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadDate: new Date().toISOString(),
      category: 'Genel'
    }));
    setDocuments([...documents, ...newDocs]);
  };

  // Form kaydetme
  const handleSave = () => {
    if (onUpdate) {
      onUpdate({ ...formData, cryptoAddresses, documents });
    }
    setEditMode(false);
  };

  const getInitials = () => {
    if (!employee) return '';
    return `${employee.first_name?.charAt(0) || ''}${employee.last_name?.charAt(0) || ''}`.toUpperCase();
  };

  const getExperienceYears = () => {
    if (!employee?.hire_date) return '0';
    const years = Math.floor((new Date() - new Date(employee.hire_date)) / (1000 * 60 * 60 * 24 * 365));
    return years;
  };

  if (!employee) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          borderRadius: 3
        }
      }}
    >
      <Box sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 3,
        position: 'relative'
      }}>
        <IconButton
          onClick={onClose}
          sx={{ 
            position: 'absolute', 
            right: 8, 
            top: 8,
            color: 'white',
            bgcolor: 'rgba(255,255,255,0.1)',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.2)'
            }
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Üst Profil Kartı */}
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  employee.is_active ? (
                    <VerifiedIcon sx={{ color: '#4CAF50', fontSize: 30 }} />
                  ) : null
                }
              >
                <Avatar 
                  src={formData.photo}
                  sx={{ 
                    width: 120, 
                    height: 120,
                    bgcolor: 'white',
                    color: '#667eea',
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    border: '4px solid white',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                  }}
                >
                  {getInitials()}
                </Avatar>
              </Badge>
              
              <Box sx={{ color: 'white' }}>
                <Typography variant="h4" fontWeight="bold">
                  {employee.first_name} {employee.last_name}
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9 }}>
                  {employee.job_title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Chip 
                    label={employee.employee_id} 
                    size="small" 
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)', 
                      color: 'white',
                      borderColor: 'white' 
                    }}
                    variant="outlined"
                  />
                  <Chip 
                    label={employee.department} 
                    size="small"
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)', 
                      color: 'white' 
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <Grid container spacing={2} sx={{ color: 'white' }}>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight="bold">
                    {getExperienceYears()}
                  </Typography>
                  <Typography variant="caption">Yıl Deneyim</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight="bold">
                    {documents.length}
                  </Typography>
                  <Typography variant="caption">Belge</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight="bold">
                    14
                  </Typography>
                  <Typography variant="caption">İzin Günü</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <Typography variant="h4" fontWeight="bold">
                    A+
                  </Typography>
                  <Typography variant="caption">Performans</Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Düzenleme Butonları */}
        <Box sx={{ position: 'absolute', bottom: 20, right: 20 }}>
          {!editMode ? (
            <Button
              startIcon={<EditIcon />}
              variant="contained"
              onClick={() => setEditMode(true)}
              sx={{ 
                bgcolor: 'white',
                color: '#667eea',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.9)'
                }
              }}
            >
              Düzenle
            </Button>
          ) : (
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<SaveIcon />}
                variant="contained"
                onClick={handleSave}
                sx={{ 
                  bgcolor: '#4CAF50',
                  '&:hover': { bgcolor: '#45a049' }
                }}
              >
                Kaydet
              </Button>
              <Button
                startIcon={<CancelIcon />}
                variant="outlined"
                onClick={() => setEditMode(false)}
                sx={{ 
                  borderColor: 'white',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    borderColor: 'white'
                  }
                }}
              >
                İptal
              </Button>
            </Stack>
          )}
        </Box>
      </Box>

      <DialogContent>
        <Tabs 
          value={tabValue} 
          onChange={(e, v) => setTabValue(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Genel" icon={<PersonIcon />} iconPosition="start" />
          <Tab label="İletişim" icon={<EmailIcon />} iconPosition="start" />
          <Tab label="İş Bilgileri" icon={<WorkIcon />} iconPosition="start" />
          <Tab label="Belgeler" icon={<DocumentIcon />} iconPosition="start" />
          <Tab label="Finansal" icon={<BankIcon />} iconPosition="start" />
          <Tab label="Kripto" icon={<CardIcon />} iconPosition="start" />
          <Tab label="Diğer" icon={<SecurityIcon />} iconPosition="start" />
        </Tabs>

        {/* Genel Bilgiler */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    <PersonIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Kişisel Bilgiler
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Ad"
                        value={formData.first_name || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Soyad"
                        value={formData.last_name || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="TC Kimlik No"
                        value={formData.tc_no || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Doğum Tarihi"
                        type="date"
                        value={formData.birth_date || ''}
                        disabled={!editMode}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Doğum Yeri"
                        value={formData.birth_place || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Kan Grubu"
                        value={formData.blood_type || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    <SchoolIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Eğitim Bilgileri
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Mezun Olunan Okul"
                        value={formData.school || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Bölüm"
                        value={formData.department || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Mezuniyet Yılı"
                        value={formData.graduation_year || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Yabancı Diller"
                        value={formData.languages || ''}
                        disabled={!editMode}
                        size="small"
                        placeholder="İngilizce (B2), Almanca (A1)"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* İletişim Bilgileri */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    <PhoneIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    İletişim
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Cep Telefonu"
                        value={formData.phone || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="E-posta"
                        value={formData.email || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Adres"
                        value={formData.address || ''}
                        disabled={!editMode}
                        size="small"
                        multiline
                        rows={2}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="İl"
                        value={formData.city || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="İlçe"
                        value={formData.district || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    <FamilyIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Acil Durum
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Acil Durum Kişisi"
                        value={formData.emergency_contact || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Yakınlık Derecesi"
                        value={formData.emergency_relation || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Telefon"
                        value={formData.emergency_phone || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* İş Bilgileri */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    <WorkIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Pozisyon Bilgileri
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Çalışan No"
                        value={formData.employee_id || ''}
                        disabled
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Pozisyon"
                        value={formData.position || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="Departman"
                        value={formData.department || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <TextField
                        fullWidth
                        label="İşe Başlama Tarihi"
                        type="date"
                        value={formData.hire_date || ''}
                        disabled={!editMode}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Görev Tanımı"
                        value={formData.job_description || ''}
                        disabled={!editMode}
                        size="small"
                        multiline
                        rows={3}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Belgeler */}
        <TabPanel value={tabValue} index={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" color="primary">
                  <DocumentIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Belgeler
                </Typography>
                {editMode && (
                  <Button
                    variant="contained"
                    startIcon={<UploadIcon />}
                    component="label"
                    size="small"
                  >
                    Belge Yükle
                    <input
                      type="file"
                      hidden
                      multiple
                      onChange={handleDocumentUpload}
                    />
                  </Button>
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Belge Adı</TableCell>
                      <TableCell>Kategori</TableCell>
                      <TableCell>Yüklenme Tarihi</TableCell>
                      <TableCell>Boyut</TableCell>
                      <TableCell align="center">İşlem</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documents.length > 0 ? (
                      documents.map(doc => (
                        <TableRow key={doc.id}>
                          <TableCell>{doc.name}</TableCell>
                          <TableCell>
                            <Chip label={doc.category} size="small" />
                          </TableCell>
                          <TableCell>
                            {new Date(doc.uploadDate).toLocaleDateString('tr-TR')}
                          </TableCell>
                          <TableCell>
                            {(doc.size / 1024).toFixed(2)} KB
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small">
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography variant="body2" color="text.secondary">
                            Henüz belge yüklenmemiş
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Finansal Bilgiler */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    <BankIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Banka Bilgileri
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Banka Adı"
                        value={formData.bank_name || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="IBAN"
                        value={formData.iban || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Hesap Sahibi"
                        value={`${formData.first_name} ${formData.last_name}`}
                        disabled
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    <SalaryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Maaş Bilgileri
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Brüt Maaş"
                        value={formData.gross_salary || ''}
                        disabled={!editMode}
                        size="small"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">₺</InputAdornment>
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Net Maaş"
                        value={formData.net_salary || ''}
                        disabled={!editMode}
                        size="small"
                        InputProps={{
                          endAdornment: <InputAdornment position="end">₺</InputAdornment>
                        }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Ödeme Günü"
                        value={formData.payment_day || '15'}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Kripto Bilgileri */}
        <TabPanel value={tabValue} index={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                <CardIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Kripto Cüzdan Adresleri
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Çekim işlemleri için kripto cüzdan adreslerinizi ekleyin
              </Alert>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                {cryptoWallets.map(wallet => (
                  <Grid item xs={12} key={wallet.id}>
                    <TextField
                      fullWidth
                      label={wallet.name}
                      value={cryptoAddresses[wallet.id] || ''}
                      onChange={(e) => setCryptoAddresses({
                        ...cryptoAddresses,
                        [wallet.id]: e.target.value
                      })}
                      disabled={!editMode}
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Typography sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
                              {wallet.icon}
                            </Typography>
                          </InputAdornment>
                        ),
                        endAdornment: editMode && (
                          <InputAdornment position="end">
                            <IconButton size="small">
                              <QrCodeIcon />
                            </IconButton>
                          </InputAdornment>
                        )
                      }}
                      placeholder={`${wallet.name} cüzdan adresinizi girin`}
                    />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Diğer Bilgiler */}
        <TabPanel value={tabValue} index={6}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    <SecurityIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Sigorta Bilgileri
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="SGK No"
                        value={formData.sgk_no || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Sigorta Başlangıç Tarihi"
                        type="date"
                        value={formData.insurance_start || ''}
                        disabled={!editMode}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="primary">
                    <CarIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Araç Bilgileri
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Ehliyet Sınıfı"
                        value={formData.license_class || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Araç Plakası"
                        value={formData.vehicle_plate || ''}
                        disabled={!editMode}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
}

export default EmployeeProfile;
