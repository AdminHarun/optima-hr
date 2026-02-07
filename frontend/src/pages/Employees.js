// src/pages/Employees.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  ListItemSecondaryAction,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Checkbox
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  Badge as BadgeIcon,
  PersonOff as PersonOffIcon,
  CheckCircle as ActiveIcon,
  RestoreFromTrash as RestoreIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Description as DocumentIcon,
  AttachMoney as MoneyIcon,
  QrCode2 as QrIcon,
  AccountBalanceWallet as WalletIcon,
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Article as DocIcon
} from '@mui/icons-material';
import QRCode from 'qrcode';
import employeeService from '../services/employeeService';

// Pozisyonlar
const positions = {
  'OPERATOR': 'Operatör',
  'X_OPERATOR': 'X-Operatör', 
  'SENIOR_OPERATOR': 'Senior Operatör',
  'EXPERT_OPERATOR': 'Kıdemli Operatör',
  'CONSULTANT': 'Danışman',
  'ASSISTANT_MANAGER': 'Yönetici Yardımcısı',
  'MANAGER': 'Yönetici',
  'DIRECTOR': 'Müdür'
};

// Departmanlar - Optima renkleri
const departments = {
  'CHAT': { name: 'Chat', color: '#8bb94a' },
  'FOLLOW_UP': { name: 'Takip', color: '#1c61ab' },
  'WITHDRAWAL': { name: 'Çekim', color: '#FF9800' },
  'SUPPORT': { name: 'Destek', color: '#9C27B0' },
  'SALES': { name: 'Satış', color: '#F44336' },
  'ACCOUNTING': { name: 'Muhasebe', color: '#795548' },
  'HR': { name: 'İK', color: '#E91E63' }
};

function TabPanel({ children, value, index, ...other }) {
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openProfileDialog, setOpenProfileDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewMode, setViewMode] = useState('active');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]); // Seçilen çalışanlar için
  const siteCode = localStorage.getItem('optima_current_site') || 'FXB';
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    employee_id: '',
    email: '',
    phone: '',
    position: '',
    department: '',
    job_title: '',
    hire_date: '',
    birth_date: '',
    address: '',
    city: '',
    emergency_contact: '',
    emergency_phone: '',
    net_salary: '',
    usdt_address: '',
    documents: [],
    is_active: true
  });

  // Backend'den çalışanları yükle
  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      // Her zaman tüm çalışanları getir
      const data = await employeeService.getAllEmployees();
      const employeeList = Array.isArray(data) ? data : [];
      setEmployees(employeeList);

      // Aktif çalışanları payroll ile senkronize et
      const activeEmployees = employeeList.filter(emp => emp.is_active);
      if (activeEmployees.length > 0) {
        updatePayrollData(activeEmployees);
      }
    } catch (err) {
      console.error('Veri yükleme hatası:', err);
      setError('Veriler yüklenirken hata oluştu: ' + err.message);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBackStep = () => {
    setActiveStep((prev) => prev - 1);
  };

  const isStepValid = () => {
    switch(activeStep) {
      case 0: // Kişisel Bilgiler
        return formData.first_name && formData.last_name && formData.employee_id;
      case 1: // İletişim
        return formData.email && formData.phone;
      case 2: // İş Bilgileri
        return formData.position && formData.department && formData.job_title;
      case 3: // Finansal
        return true; // Opsiyonel
      default:
        return false;
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // ViewMode değiştiğinde sadece seçimleri temizle
  useEffect(() => {
    setSelectedIds([]); // Seçimleri temizle
  }, [viewMode]);

  // QR kod oluştur
  const generateQRCode = async (address) => {
    try {
      const qrUrl = await QRCode.toDataURL(address, {
        width: 200,
        margin: 1,
        color: {
          dark: '#1c61ab',
          light: '#FFFFFF',
        }
      });
      setQrCodeUrl(qrUrl);
    } catch (err) {
      console.error('QR kod oluşturma hatası:', err);
    }
  };

  // Çalışan kaydet (Create/Update)
  const saveEmployee = async (employeeData, isUpdate = false) => {
    try {
      setLoading(true);
      let result;

      if (isUpdate && selectedEmployee) {
        result = await employeeService.updateEmployee(selectedEmployee.id, employeeData);
      } else {
        result = await employeeService.createEmployee(employeeData);
      }

      // Liste yenile
      await fetchEmployees();
      return result;
    } catch (error) {
      console.error('Çalışan kaydetme hatası:', error);
      setError('Çalışan kaydedilirken hata oluştu: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };
      
      // Eğer ad veya soyad değiştiyse ve sistem adı boşsa otomatik oluştur
      if ((name === 'first_name' || name === 'last_name') && !isEditMode) {
        const firstName = name === 'first_name' ? value : prev.first_name;
        const lastName = name === 'last_name' ? value : prev.last_name;
        
        if (firstName && lastName && !prev.employee_id) {
          // Türkçe karakterleri dönüştür
          const systemName = `${firstName}.${lastName}`
            .toLowerCase()
            .replace(/ç/g, 'c')
            .replace(/ğ/g, 'g')
            .replace(/ı/g, 'i')
            .replace(/ö/g, 'o')
            .replace(/ş/g, 's')
            .replace(/ü/g, 'u')
            .replace(/ä/g, 'a')
            .replace(/ß/g, 'ss')
            .replace(/[^a-z0-9.]/g, '');
          
          updated.employee_id = systemName;
        }
      }
      
      return updated;
    });
  };

  // Belge yükleme
  const handleDocumentUpload = (event) => {
    const files = Array.from(event.target.files);
    const newDocuments = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadDate: new Date().toISOString(),
      url: URL.createObjectURL(file)
    }));
    
    setFormData(prev => ({
      ...prev,
      documents: [...(prev.documents || []), ...newDocuments]
    }));
  };

  // Belge silme
  const handleDocumentDelete = (docId) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(doc => doc.id !== docId)
    }));
  };

  // Belge indirme
  const handleDocumentDownload = (doc) => {
    const link = document.createElement('a');
    link.href = doc.url;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Profildeki belge silme
  const handleProfileDocumentDelete = (docId) => {
    if (window.confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) {
      const updatedEmployees = employees.map(emp => {
        if (emp.id === selectedEmployee.id) {
          return {
            ...emp,
            documents: emp.documents.filter(doc => doc.id !== docId)
          };
        }
        return emp;
      });

      // selectedEmployee'yi güncelle
      setSelectedEmployee(prev => ({
        ...prev,
        documents: prev.documents.filter(doc => doc.id !== docId)
      }));
    }
  };

  // Belge önizleme
  const handleDocumentPreview = (doc) => {
    setPreviewDoc(doc);
  };

  // Dosya ikonu
  const getFileIcon = (type) => {
    if (type?.includes('pdf')) return <PdfIcon />;
    if (type?.includes('image')) return <ImageIcon />;
    return <DocIcon />;
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Backend'e kaydet
      const employeeData = {
        ...formData,
        // Kripto adreslerini backend formatına çevir
        crypto_addresses: {
          usdt: formData.usdt_address || '',
          btc: '',
          eth: '',
          bnb: '',
          trx: ''
        }
      };

      const savedEmployee = await saveEmployee(employeeData, isEditMode);

      // Payroll verisini güncelle (maaş ve USDT adresi değişikliği için)
      if (savedEmployee || formData.is_active) {
        const employeeForPayroll = {
          ...formData,
          id: savedEmployee?.id || selectedEmployee?.id,
          crypto_addresses: { usdt: formData.usdt_address }
        };
        updatePayrollData([employeeForPayroll]);
      }

      handleCloseDialog();
      setError(null);
    } catch (err) {
      console.error('Kaydetme hatası:', err);
      setError('Kaydetme sırasında bir hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async (id) => {
    if (window.confirm('Bu çalışanı KALıCI olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
      try {
        setLoading(true);

        // Backend'den çalışanı sil
        await employeeService.deleteEmployee(id);

        // Frontend state'ini güncelle
        const updatedEmployees = employees.filter(emp => emp.id !== id);
        setEmployees(updatedEmployees);

        // Başarı mesajı
        setError(null);
        console.log('Çalışan başarıyla silindi');
      } catch (err) {
        console.error('Silme hatası:', err);
        setError('Çalışan silinirken hata oluştu: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bu çalışanı pasif duruma almak istediğinizden emin misiniz?')) {
      try {
        setLoading(true);
        await employeeService.deactivateEmployee(id);
        await fetchEmployees(); // Listeyi yenile

        // Payroll'dan da pasif yap
        const payrollData = JSON.parse(localStorage.getItem(`payroll_data_${siteCode}`) || '[]');
        const updatedPayroll = payrollData.map(p => {
          if (p.id === id) {
            return { ...p, is_active: false };
          }
          return p;
        });
        localStorage.setItem(`payroll_data_${siteCode}`, JSON.stringify(updatedPayroll));
      } catch (err) {
        console.error('Pasif yapma hatası:', err);
        setError('Çalışan pasif yapılırken hata oluştu: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRestore = async (id) => {
    try {
      setLoading(true);
      await employeeService.activateEmployee(id);
      await fetchEmployees(); // Listeyi yenile

      // Payroll'da da aktif yap
      const updatedEmployees = employees.filter(emp => emp.id === id);
      if (updatedEmployees.length > 0) {
        updatePayrollData([updatedEmployees[0]]);
      }
    } catch (err) {
      console.error('Aktif yapma hatası:', err);
      setError('Çalışan aktif yapılırken hata oluştu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Payroll verilerini güncelle/senkronize et
  const updatePayrollData = (employeesList) => {
    const payrollData = JSON.parse(localStorage.getItem(`payroll_data_${siteCode}`) || '[]');

    employeesList.forEach(employee => {
      const existingPayrollIndex = payrollData.findIndex(p =>
        p.id === employee.id || p.employee_id === employee.employee_id
      );

      if (existingPayrollIndex >= 0) {
        // Varsa güncelle
        payrollData[existingPayrollIndex] = {
          ...payrollData[existingPayrollIndex],
          is_active: employee.is_active,
          name: `${employee.first_name} ${employee.last_name}`.trim(),
          salary: employee.net_salary || payrollData[existingPayrollIndex].salary,
          usdt_address: employee.crypto_addresses?.usdt || employee.usdt_address || payrollData[existingPayrollIndex].usdt_address
        };
      } else if (employee.is_active) {
        // Aktif ise ve yoksa yeni ekle
        payrollData.push({
          id: employee.id,
          employee_id: employee.employee_id,
          name: `${employee.first_name} ${employee.last_name}`.trim(),
          system_name: employee.employee_id,
          position: employee.position || employee.job_title || 'UNKNOWN',
          hire_date: employee.hire_date,
          working_months: calculateWorkingMonths(employee.hire_date),
          deposit: 0,
          salary: employee.net_salary || 0,
          payable_salary: employee.net_salary || 0,
          bonus: 0,
          overtime: 0,
          usdt_address: employee.crypto_addresses?.usdt || employee.usdt_address || '',
          notes: '',
          is_active: true,
          last_payment_date: null,
          payment_history: []
        });
      }
    });

    localStorage.setItem(`payroll_data_${siteCode}`, JSON.stringify(payrollData));
  };

  const calculateWorkingMonths = (hireDate) => {
    if (!hireDate) return 0;
    const hire = new Date(hireDate);
    const now = new Date();
    return Math.max(0, (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth()));
  };

  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setIsEditMode(true);
      setSelectedEmployee(employee);
      setFormData(employee);
    } else {
      setIsEditMode(false);
      setSelectedEmployee(null);
      setFormData({
        first_name: '',
        last_name: '',
        employee_id: '',
        email: '',
        phone: '',
        position: '',
        department: '',
        job_title: '',
        hire_date: new Date().toISOString().split('T')[0],
        birth_date: '',
        address: '',
        city: '',
        emergency_contact: '',
        emergency_phone: '',
        net_salary: '',
        usdt_address: '',
        documents: [],
        is_active: true
      });
    }
    setOpenDialog(true);
    setActiveStep(0);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setIsEditMode(false);
    setSelectedEmployee(null);
    setActiveStep(0);
  };

  const handleOpenProfile = async (employee) => {
    setSelectedEmployee(employee);
    setOpenProfileDialog(true);
    setTabValue(0);
    
    if (employee.usdt_address) {
      await generateQRCode(employee.usdt_address);
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const inactiveIds = filteredEmployees
        .filter(emp => !emp.is_active)
        .map(emp => emp.id);
      setSelectedIds(inactiveIds);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(sid => sid !== id));
    }
  };

  // Filtrelenmiş çalışanlar
  const filteredEmployees = Array.isArray(employees)
    ? employees.filter(employee => {
        const statusMatch = viewMode === 'active' ? employee.is_active :
                           viewMode === 'inactive' ? !employee.is_active : true;
        const searchMatch = `${employee.first_name} ${employee.last_name} ${employee.employee_id}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        return statusMatch && searchMatch;
      })
    : [];

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  // İstatistikler
  const activeCount = employees.filter(e => e.is_active).length;
  const inactiveCount = employees.filter(e => !e.is_active).length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Çalışan Yönetimi
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Toplam: {activeCount} aktif, {inactiveCount} pasif çalışan
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                borderRadius: '20px',
                px: 2,
                '&.Mui-selected': {
                  background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #155090, #7aa042)'
                  }
                }
              }
            }}
          >
            <ToggleButton value="active">
              <ActiveIcon sx={{ mr: 1, fontSize: 20 }} />
              Mevcut ({activeCount})
            </ToggleButton>
            <ToggleButton value="inactive">
              <PersonOffIcon sx={{ mr: 1, fontSize: 20 }} />
              Çıkarılan ({inactiveCount})
            </ToggleButton>
          </ToggleButtonGroup>
          
          {viewMode === 'inactive' && selectedIds.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={() => {
                if (window.confirm(`Seçilen ${selectedIds.length} çalışanı KALıCI olarak silmek istediğinizden emin misiniz?`)) {
                  const updatedEmployees = employees.filter(e => !selectedIds.includes(e.id));
                  setEmployees(updatedEmployees);
                  // Payroll'u temizle
                  const payrollData = JSON.parse(localStorage.getItem(`payroll_data_${siteCode}`) || '[]');
                  const updatedPayroll = payrollData.filter(p => !selectedIds.includes(p.id));
                  localStorage.setItem(`payroll_data_${siteCode}`, JSON.stringify(updatedPayroll));
                  
                  setSelectedIds([]);
                }
              }}
              sx={{
                borderRadius: '20px',
                px: 2,
                borderColor: '#f44336',
                color: '#f44336',
                '&:hover': {
                  borderColor: '#d32f2f',
                  backgroundColor: 'rgba(244, 67, 54, 0.1)'
                }
              }}
            >
              Seçilenleri Sil ({selectedIds.length})
            </Button>
          )}
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              borderRadius: '20px',
              px: 3,
              background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
              '&:hover': {
                background: 'linear-gradient(135deg, #155090, #7aa042)'
              }
            }}
          >
            Yeni Çalışan Ekle
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Arama */}
      <Paper sx={{ 
        p: 2, 
        mb: 3,
        borderRadius: '16px',
        boxShadow: '0 4px 20px rgba(28,97,171,0.08)'
      }}>
        <TextField
          fullWidth
          placeholder="Çalışan ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            sx: {
              borderRadius: '12px',
              '& fieldset': { borderRadius: '12px' }
            }
          }}
        />
      </Paper>

      {/* Çalışanlar Tablosu */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(28,97,171,0.08)',
          overflow: 'hidden'
        }}
      >
        <Table>
          <TableHead>
            <TableRow sx={{ 
              background: 'linear-gradient(135deg, #f5f7fa, #f0f2f5)',
              '& th': { 
                fontWeight: 600,
                color: '#1c61ab',
                borderBottom: 'none'
              }
            }}>
              {viewMode === 'inactive' && (
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={filteredEmployees.every(emp => selectedIds.includes(emp.id))}
                    indeterminate={selectedIds.length > 0 && selectedIds.length < filteredEmployees.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filteredEmployees.map(emp => emp.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </TableCell>
              )}
              <TableCell>Çalışan</TableCell>
              <TableCell>Sistem Adı</TableCell>
              <TableCell>Pozisyon</TableCell>
              <TableCell>Departman</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>E-posta</TableCell>
              <TableCell>Başlama Tarihi</TableCell>
              <TableCell align="center">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees.length > 0 ? (
              filteredEmployees.map((employee) => (
              <TableRow 
                key={employee.id} 
                hover
                sx={{ 
                  '&:hover': {
                    backgroundColor: 'rgba(28,97,171,0.04)'
                  },
                  opacity: employee.is_active ? 1 : 0.6,
                  backgroundColor: employee.is_active ? 'inherit' : 'rgba(0,0,0,0.02)'
                }}
              >
                {viewMode === 'inactive' && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(employee.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, employee.id]);
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== employee.id));
                        }
                      }}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Box
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      cursor: 'pointer',
                      '&:hover': {
                        '& .MuiAvatar-root': {
                          transform: 'scale(1.1)',
                          transition: 'transform 0.2s'
                        }
                      }
                    }}
                    onClick={() => handleOpenProfile(employee)}
                  >
                    <Avatar sx={{ 
                      background: employee.is_active 
                        ? 'linear-gradient(135deg, #1c61ab, #8bb94a)'
                        : '#999',
                      width: 40,
                      height: 40,
                      fontSize: '14px',
                      fontWeight: 600
                    }}>
                      {getInitials(employee.first_name, employee.last_name)}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight="600">
                        {employee.first_name} {employee.last_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {employee.job_title}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={employee.employee_id}
                    size="small"
                    sx={{ 
                      bgcolor: employee.is_active ? '#e8f4fd' : '#ffebee',
                      color: employee.is_active ? '#1c61ab' : '#999',
                      fontWeight: 500
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {positions[employee.position] || employee.position}
                  </Typography>
                </TableCell>
                <TableCell>
                  {departments[employee.department] ? (
                    <Chip
                      label={departments[employee.department].name}
                      size="small"
                      sx={{
                        bgcolor: employee.is_active 
                          ? departments[employee.department].color 
                          : '#ccc',
                        color: 'white',
                        fontWeight: 500
                      }}
                    />
                  ) : (
                    <Typography variant="body2">{employee.department}</Typography>
                  )}
                </TableCell>
                <TableCell>{employee.phone}</TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{new Date(employee.hire_date).toLocaleDateString('tr-TR')}</TableCell>
                <TableCell align="center">
                  <Tooltip title="Profili Görüntüle">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenProfile(employee)}
                      sx={{ 
                        color: '#2196F3',
                        '&:hover': { 
                          backgroundColor: 'rgba(33,150,243,0.1)',
                          transform: 'scale(1.1)'
                        }
                      }}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  
                  {employee.is_active ? (
                    <>
                      <Tooltip title="Düzenle">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(employee)}
                          sx={{ 
                            color: '#1c61ab',
                            '&:hover': { 
                              backgroundColor: 'rgba(28,97,171,0.1)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Pasif Yap">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(employee.id)}
                          sx={{ 
                            color: '#f44336',
                            '&:hover': { 
                              backgroundColor: 'rgba(244,67,54,0.1)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <PersonOffIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Tooltip title="Aktif Yap">
                        <IconButton
                          size="small"
                          onClick={() => handleRestore(employee.id)}
                          sx={{ 
                            color: '#8bb94a',
                            '&:hover': { 
                              backgroundColor: 'rgba(139,185,74,0.1)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <RestoreIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Kalıcı Olarak Sil">
                        <IconButton
                          size="small"
                          onClick={() => handlePermanentDelete(employee.id)}
                          sx={{ 
                            color: '#f44336',
                            '&:hover': { 
                              backgroundColor: 'rgba(244,67,54,0.1)',
                              transform: 'scale(1.1)'
                            }
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </TableCell>
              </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={viewMode === 'inactive' ? 9 : 8} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    {viewMode === 'active' ? 'Aktif çalışan bulunamadı' : 'Pasif çalışan bulunamadı'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Yeni/Düzenle Dialog - Stepper Form */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            overflow: 'visible'
          }
        }}
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
          color: 'white',
          fontWeight: 600
        }}>
          {isEditMode ? 'Çalışan Düzenle' : 'Yeni Çalışan Ekle'}
          <IconButton
            onClick={handleCloseDialog}
            sx={{ 
              position: 'absolute', 
              right: 8, 
              top: 8,
              color: 'white'
            }}
          >
            <DeleteIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* Adım 1: Kişisel Bilgiler */}
            <Step>
              <StepLabel>
                <Typography fontWeight={600}>Kişisel Bilgiler</Typography>
              </StepLabel>
              <StepContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Ad *"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      required
                      InputProps={{ sx: { borderRadius: '12px' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Soyad *"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      required
                      InputProps={{ sx: { borderRadius: '12px' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Sistem Adı *"
                      name="employee_id"
                      value={formData.employee_id}
                      onChange={handleInputChange}
                      required
                      InputProps={{ sx: { borderRadius: '12px' } }}
                      placeholder="örn: ad.soyad"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Doğum Tarihi"
                      name="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                      InputProps={{ sx: { borderRadius: '12px' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="İşe Başlama Tarihi *"
                      name="hire_date"
                      type="date"
                      value={formData.hire_date}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                      required
                      InputProps={{ sx: { borderRadius: '12px' } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                      <Button
                        variant="contained"
                        onClick={handleNextStep}
                        disabled={!isStepValid()}
                        sx={{
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #155090, #7aa042)'
                          },
                          '&:disabled': {
                            background: '#ccc'
                          }
                        }}
                      >
                        Devam Et
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </StepContent>
            </Step>

            {/* Adım 2: İletişim ve Adres */}
            <Step>
              <StepLabel>
                <Typography fontWeight={600}>İletişim ve Adres Bilgileri</Typography>
              </StepLabel>
              <StepContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="E-posta *"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      InputProps={{ sx: { borderRadius: '12px' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Telefon *"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="05XX XXX XX XX"
                      required
                      InputProps={{ sx: { borderRadius: '12px' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <TextField
                      fullWidth
                      label="Adres"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      InputProps={{ sx: { borderRadius: '12px' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Şehir"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      InputProps={{ sx: { borderRadius: '12px' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Acil Durum Kişisi"
                      name="emergency_contact"
                      value={formData.emergency_contact}
                      onChange={handleInputChange}
                      InputProps={{ sx: { borderRadius: '12px' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Acil Durum Telefonu"
                      name="emergency_phone"
                      value={formData.emergency_phone}
                      onChange={handleInputChange}
                      placeholder="05XX XXX XX XX"
                      InputProps={{ sx: { borderRadius: '12px' } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                      <Button onClick={handleBackStep} sx={{ borderRadius: '12px' }}>
                        Geri
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleNextStep}
                        disabled={!isStepValid()}
                        sx={{
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #155090, #7aa042)'
                          },
                          '&:disabled': {
                            background: '#ccc'
                          }
                        }}
                      >
                        Devam Et
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </StepContent>
            </Step>

            {/* Adım 3: İş Bilgileri */}
            <Step>
              <StepLabel>
                <Typography fontWeight={600}>İş Bilgileri</Typography>
              </StepLabel>
              <StepContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth required>
                      <InputLabel>Pozisyon</InputLabel>
                      <Select
                        name="position"
                        value={formData.position}
                        onChange={handleInputChange}
                        label="Pozisyon"
                        sx={{ borderRadius: '12px' }}
                      >
                        {Object.entries(positions).map(([key, value]) => (
                          <MenuItem key={key} value={key}>{value}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth required>
                      <InputLabel>Departman</InputLabel>
                      <Select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        label="Departman"
                        sx={{ borderRadius: '12px' }}
                      >
                        {Object.entries(departments).map(([key, dept]) => (
                          <MenuItem key={key} value={key}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ 
                                width: 10, 
                                height: 10, 
                                borderRadius: '50%', 
                                bgcolor: dept.color 
                              }} />
                              {dept.name}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Görev Tanımı *"
                      name="job_title"
                      value={formData.job_title}
                      onChange={handleInputChange}
                      required
                      InputProps={{ sx: { borderRadius: '12px' } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                      <Button onClick={handleBackStep} sx={{ borderRadius: '12px' }}>
                        Geri
                      </Button>
                      <Button
                        variant="contained"
                        onClick={handleNextStep}
                        disabled={!isStepValid()}
                        sx={{
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #155090, #7aa042)'
                          },
                          '&:disabled': {
                            background: '#ccc'
                          }
                        }}
                      >
                        Devam Et
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </StepContent>
            </Step>

            {/* Adım 4: Finansal ve Belgeler */}
            <Step>
              <StepLabel>
                <Typography fontWeight={600}>Finansal Bilgiler ve Belgeler</Typography>
              </StepLabel>
              <StepContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Net Maaş (USD)"
                      name="net_salary"
                      value={formData.net_salary}
                      onChange={handleInputChange}
                      type="number"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        sx: { borderRadius: '12px' }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="USDT TRC-20 Adresi"
                      name="usdt_address"
                      value={formData.usdt_address}
                      onChange={handleInputChange}
                      placeholder="TRX..."
                      InputProps={{ sx: { borderRadius: '12px' } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      Belgeler
                    </Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<UploadIcon />}
                      sx={{
                        borderRadius: '12px',
                        borderColor: '#1c61ab',
                        color: '#1c61ab',
                        '&:hover': {
                          borderColor: '#8bb94a',
                          backgroundColor: 'rgba(139,185,74,0.05)'
                        }
                      }}
                    >
                      Belge Yükle
                      <input
                        type="file"
                        hidden
                        multiple
                        onChange={handleDocumentUpload}
                      />
                    </Button>
                    
                    {formData.documents?.length > 0 && (
                      <List dense sx={{ mt: 2 }}>
                        {formData.documents.map(doc => (
                          <ListItem 
                            key={doc.id}
                            sx={{
                              bgcolor: '#f8f9fa',
                              borderRadius: '8px',
                              mb: 1
                            }}
                          >
                            <ListItemIcon>
                              {getFileIcon(doc.type)}
                            </ListItemIcon>
                            <ListItemText 
                              primary={doc.name}
                              secondary={`${(doc.size / 1024).toFixed(2)} KB`}
                            />
                            <ListItemSecondaryAction>
                              <IconButton 
                                edge="end" 
                                onClick={() => handleDocumentDelete(doc.id)}
                                size="small"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                      <Button onClick={handleBackStep} sx={{ borderRadius: '12px' }}>
                        Geri
                      </Button>
                      <Button 
                        variant="contained"
                        onClick={handleSave}
                        sx={{
                          borderRadius: '12px',
                          px: 3,
                          background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #155090, #7aa042)'
                          }
                        }}
                      >
                        {isEditMode ? 'Güncelle' : 'Kaydet'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
      </Dialog>

      {/* Profil ve Belge Önizleme Dialogları buraya devam edecek... */}
      {/* Kod çok uzun olduğu için sadece ana kısımları gösterdim */}

      {/* Profil Dialog - Modern Tasarım */}
      <Dialog 
        open={openProfileDialog} 
        onClose={() => setOpenProfileDialog(false)} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px'
          }
        }}
      >
        {selectedEmployee && (
          <>
            <DialogTitle sx={{ 
              background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
              color: 'white'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ 
                  width: 64, 
                  height: 64, 
                  bgcolor: 'white',
                  color: '#1c61ab',
                  fontSize: '20px',
                  fontWeight: 700
                }}>
                  {getInitials(selectedEmployee.first_name, selectedEmployee.last_name)}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" fontWeight={600}>
                    {selectedEmployee.first_name} {selectedEmployee.last_name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip 
                      label={selectedEmployee.employee_id} 
                      size="small"
                      sx={{ bgcolor: 'white', color: '#1c61ab' }}
                    />
                    <Chip 
                      label={positions[selectedEmployee.position] || selectedEmployee.position} 
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                    />
                    {departments[selectedEmployee.department] && (
                      <Chip
                        label={departments[selectedEmployee.department].name}
                        size="small"
                        sx={{ bgcolor: 'white', color: departments[selectedEmployee.department].color }}
                      />
                    )}
                    <Chip 
                      label={selectedEmployee.is_active ? 'Aktif' : 'Pasif'}
                      size="small"
                      sx={{ 
                        bgcolor: selectedEmployee.is_active ? '#8bb94a' : '#f44336',
                        color: 'white'
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </DialogTitle>
            
            <DialogContent>
              <Tabs 
                value={tabValue} 
                onChange={(e, v) => setTabValue(v)}
                sx={{
                  '& .MuiTab-root': {
                    borderRadius: '12px 12px 0 0',
                    mr: 1,
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                      color: 'white'
                    }
                  }
                }}
              >
                <Tab label="Genel Bilgiler" />
                <Tab label="İletişim" />
                <Tab label="İş Bilgileri" />
                <Tab label="Finansal" />
                <Tab label="Belgeler" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ 
                          color: '#1c61ab',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <PersonIcon sx={{ mr: 1 }} />
                          Kişisel Bilgiler
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <List dense>
                          <ListItem>
                            <ListItemText 
                              primary="Ad Soyad"
                              secondary={`${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Sistem Adı"
                              secondary={selectedEmployee.employee_id}
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Doğum Tarihi"
                              secondary={selectedEmployee.birth_date ? new Date(selectedEmployee.birth_date).toLocaleDateString('tr-TR') : '-'}
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ 
                          color: '#1c61ab',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <LocationIcon sx={{ mr: 1 }} />
                          Adres Bilgileri
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        <List dense>
                          <ListItem>
                            <ListItemText 
                              primary="Adres"
                              secondary={selectedEmployee.address || '-'}
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Şehir"
                              secondary={selectedEmployee.city || '-'}
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ 
                      color: '#1c61ab',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <PhoneIcon sx={{ mr: 1 }} />
                      İletişim Bilgileri
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <ListItem>
                            <ListItemIcon><EmailIcon color="primary" /></ListItemIcon>
                            <ListItemText 
                              primary="E-posta"
                              secondary={selectedEmployee.email}
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><PhoneIcon color="primary" /></ListItemIcon>
                            <ListItemText 
                              primary="Telefon"
                              secondary={selectedEmployee.phone}
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                          </ListItem>
                        </List>
                      </Grid>
                      {selectedEmployee.emergency_contact && (
                        <Grid item xs={12} md={6}>
                          <List dense>
                            <ListItem>
                              <ListItemIcon><PersonIcon color="error" /></ListItemIcon>
                              <ListItemText 
                                primary="Acil Durum Kişisi"
                                secondary={selectedEmployee.emergency_contact}
                                primaryTypographyProps={{ fontWeight: 500 }}
                              />
                            </ListItem>
                            <ListItem>
                              <ListItemIcon><PhoneIcon color="error" /></ListItemIcon>
                              <ListItemText 
                                primary="Acil Durum Telefonu"
                                secondary={selectedEmployee.emergency_phone || '-'}
                                primaryTypographyProps={{ fontWeight: 500 }}
                              />
                            </ListItem>
                          </List>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ 
                      color: '#1c61ab',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <WorkIcon sx={{ mr: 1 }} />
                      İş Bilgileri
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <ListItem>
                            <ListItemText 
                              primary="Pozisyon"
                              secondary={positions[selectedEmployee.position] || selectedEmployee.position}
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Departman"
                              secondary={
                                <Chip
                                  label={departments[selectedEmployee.department]?.name || selectedEmployee.department}
                                  size="small"
                                  sx={{
                                    bgcolor: departments[selectedEmployee.department]?.color,
                                    color: 'white'
                                  }}
                                />
                              }
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Görev"
                              secondary={selectedEmployee.job_title}
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                          </ListItem>
                        </List>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <List dense>
                          <ListItem>
                            <ListItemText 
                              primary="İşe Başlama Tarihi"
                              secondary={new Date(selectedEmployee.hire_date).toLocaleDateString('tr-TR')}
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemText 
                              primary="Çalışma Süresi"
                              secondary={`${Math.floor((new Date() - new Date(selectedEmployee.hire_date)) / (1000 * 60 * 60 * 24 * 30))} ay`}
                              primaryTypographyProps={{ fontWeight: 500 }}
                            />
                          </ListItem>
                        </List>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </TabPanel>

              <TabPanel value={tabValue} index={3}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ 
                      borderRadius: '16px', 
                      background: 'linear-gradient(135deg, #1c61ab, #155090)',
                      color: 'white'
                    }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ 
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <MoneyIcon sx={{ mr: 1 }} />
                          Maaş Bilgisi
                        </Typography>
                        <Typography variant="h3" sx={{ mt: 3, mb: 1, fontWeight: 700 }}>
                          ${selectedEmployee.net_salary || '0'}
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9 }}>
                          Net Maaş (USD)
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card sx={{ 
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #8bb94a, #7aa042)',
                      color: 'white'
                    }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom sx={{ 
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <WalletIcon sx={{ mr: 1 }} />
                          USDT TRC-20
                        </Typography>
                        {selectedEmployee.usdt_address ? (
                          <>
                            <Typography variant="body2" sx={{ 
                              mt: 2, 
                              wordBreak: 'break-all',
                              bgcolor: 'rgba(255,255,255,0.2)',
                              p: 1,
                              borderRadius: '8px'
                            }}>
                              {selectedEmployee.usdt_address}
                            </Typography>
                            {qrCodeUrl && (
                              <Box sx={{ 
                                mt: 2, 
                                textAlign: 'center',
                                bgcolor: 'white',
                                p: 2,
                                borderRadius: '12px'
                              }}>
                                <img src={qrCodeUrl} alt="USDT QR Code" style={{ maxWidth: '150px' }} />
                                <Typography variant="caption" display="block" sx={{ mt: 1, color: '#666' }}>
                                  USDT TRC-20 QR Kod
                                </Typography>
                              </Box>
                            )}
                          </>
                        ) : (
                          <Typography variant="body1" sx={{ mt: 3, opacity: 0.9 }}>
                            USDT adresi tanımlı değil
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={4}>
                <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                  <CardContent>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      mb: 2
                    }}>
                      <Typography variant="h6" sx={{ 
                        color: '#1c61ab',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <DocumentIcon sx={{ mr: 1 }} />
                        Belgeler
                      </Typography>
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadIcon />}
                        size="small"
                        sx={{
                          borderRadius: '12px',
                          borderColor: '#1c61ab',
                          color: '#1c61ab',
                          '&:hover': {
                            borderColor: '#8bb94a',
                            backgroundColor: 'rgba(139,185,74,0.05)'
                          }
                        }}
                      >
                        Yeni Belge Ekle
                        <input
                          type="file"
                          hidden
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files);
                            const newDocuments = files.map(file => ({
                              id: Date.now() + Math.random(),
                              name: file.name,
                              size: file.size,
                              type: file.type,
                              uploadDate: new Date().toISOString(),
                              url: URL.createObjectURL(file)
                            }));
                            
                            const updatedEmployees = employees.map(emp => {
                              if (emp.id === selectedEmployee.id) {
                                return {
                                  ...emp,
                                  documents: [...(emp.documents || []), ...newDocuments]
                                };
                              }
                              return emp;
                            });

                            setSelectedEmployee(prev => ({
                              ...prev,
                              documents: [...(prev.documents || []), ...newDocuments]
                            }));
                          }}
                        />
                      </Button>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    
                    {selectedEmployee.documents && selectedEmployee.documents.length > 0 ? (
                      <Grid container spacing={2}>
                        {selectedEmployee.documents.map(doc => (
                          <Grid item xs={12} sm={6} md={4} key={doc.id}>
                            <Card sx={{ 
                              borderRadius: '12px',
                              bgcolor: '#f8f9fa',
                              position: 'relative',
                              '&:hover': {
                                boxShadow: '0 4px 20px rgba(28,97,171,0.15)',
                                transform: 'translateY(-2px)',
                                transition: 'all 0.3s'
                              },
                              '&:hover .delete-icon': {
                                opacity: 1
                              }
                            }}>
                              <IconButton
                                className="delete-icon"
                                size="small"
                                onClick={() => handleProfileDocumentDelete(doc.id)}
                                sx={{
                                  position: 'absolute',
                                  top: 8,
                                  right: 8,
                                  opacity: 0.6,
                                  transition: 'opacity 0.3s',
                                  bgcolor: 'white',
                                  '&:hover': {
                                    bgcolor: '#ffebee',
                                    color: '#f44336'
                                  }
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                              <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                  {getFileIcon(doc.type)}
                                  <Typography variant="subtitle2" sx={{ ml: 1, fontWeight: 500 }}>
                                    {doc.name}
                                  </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  {(doc.size / 1024).toFixed(2)} KB
                                </Typography>
                                <Typography variant="caption" display="block" color="text.secondary">
                                  {new Date(doc.uploadDate).toLocaleDateString('tr-TR')}
                                </Typography>
                                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                                  <Button 
                                    size="small"
                                    startIcon={<ViewIcon />}
                                    onClick={() => handleDocumentPreview(doc)}
                                    sx={{ 
                                      borderRadius: '8px',
                                      color: '#1c61ab'
                                    }}
                                  >
                                    Görüntüle
                                  </Button>
                                  <Button 
                                    size="small"
                                    startIcon={<DownloadIcon />}
                                    onClick={() => handleDocumentDownload(doc)}
                                    sx={{ 
                                      borderRadius: '8px',
                                      color: '#8bb94a'
                                    }}
                                  >
                                    İndir
                                  </Button>
                                  <Button 
                                    size="small"
                                    startIcon={<DeleteIcon />}
                                    onClick={() => handleProfileDocumentDelete(doc.id)}
                                    sx={{ 
                                      borderRadius: '8px',
                                      color: '#f44336',
                                      '&:hover': {
                                        backgroundColor: 'rgba(244, 67, 54, 0.08)'
                                      }
                                    }}
                                  >
                                    Kaldır
                                  </Button>
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Box sx={{ 
                        textAlign: 'center', 
                        py: 6,
                        bgcolor: '#f8f9fa',
                        borderRadius: '12px'
                      }}>
                        <DocumentIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
                        <Typography variant="body1" color="text.secondary">
                          Henüz belge yüklenmemiş
                        </Typography>
                        <Button
                          variant="outlined"
                          component="label"
                          startIcon={<UploadIcon />}
                          sx={{
                            mt: 2,
                            borderRadius: '12px',
                            borderColor: '#1c61ab',
                            color: '#1c61ab',
                            '&:hover': {
                              borderColor: '#8bb94a',
                              backgroundColor: 'rgba(139,185,74,0.05)'
                            }
                          }}
                        >
                          İlk Belgeyi Yükle
                          <input
                            type="file"
                            hidden
                            multiple
                            onChange={(e) => {
                              const files = Array.from(e.target.files);
                              const newDocuments = files.map(file => ({
                                id: Date.now() + Math.random(),
                                name: file.name,
                                size: file.size,
                                type: file.type,
                                uploadDate: new Date().toISOString(),
                                url: URL.createObjectURL(file)
                              }));
                              
                              const updatedEmployees = employees.map(emp => {
                                if (emp.id === selectedEmployee.id) {
                                  return {
                                    ...emp,
                                    documents: newDocuments
                                  };
                                }
                                return emp;
                              });

                              setSelectedEmployee(prev => ({
                                ...prev,
                                documents: newDocuments
                              }));
                            }}
                          />
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </TabPanel>
            </DialogContent>
            
            <DialogActions sx={{ p: 3 }}>
              {selectedEmployee.is_active && (
                <Button 
                  onClick={() => {
                    setOpenProfileDialog(false);
                    handleOpenDialog(selectedEmployee);
                  }}
                  variant="outlined"
                  startIcon={<EditIcon />}
                  sx={{
                    borderRadius: '12px',
                    px: 3,
                    mr: 1,
                    borderColor: '#1c61ab',
                    color: '#1c61ab',
                    '&:hover': {
                      borderColor: '#155090',
                      backgroundColor: 'rgba(28, 97, 171, 0.1)'
                    }
                  }}
                >
                  Düzenle
                </Button>
              )}
              <Button 
                onClick={() => setOpenProfileDialog(false)}
                variant="contained"
                sx={{
                  borderRadius: '12px',
                  px: 3,
                  background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #155090, #7aa042)'
                  }
                }}
              >
                Kapat
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Belge Önizleme Dialog */}
      <Dialog
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px' }
        }}
      >
        {previewDoc && (
          <>
            <DialogTitle sx={{ 
              background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
              color: 'white'
            }}>
              {previewDoc.name}
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
              {previewDoc.type?.includes('image') ? (
                <img 
                  src={previewDoc.url} 
                  alt={previewDoc.name}
                  style={{ width: '100%', borderRadius: '12px' }}
                />
              ) : previewDoc.type?.includes('pdf') ? (
                <iframe
                  src={previewDoc.url}
                  width="100%"
                  height="500px"
                  style={{ border: 'none', borderRadius: '12px' }}
                  title={previewDoc.name}
                />
              ) : (
                <Box sx={{ 
                  textAlign: 'center', 
                  py: 6,
                  bgcolor: '#f8f9fa',
                  borderRadius: '12px'
                }}>
                  <DocumentIcon sx={{ fontSize: 64, color: '#1c61ab', mb: 2 }} />
                  <Typography variant="h6" color="#1c61ab">
                    {previewDoc.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Bu dosya türü önizlenemiyor
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={() => {
                      handleDocumentDownload(previewDoc);
                      setPreviewDoc(null);
                    }}
                    sx={{
                      mt: 3,
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #155090, #7aa042)'
                      }
                    }}
                  >
                    Dosyayı İndir
                  </Button>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPreviewDoc(null)}>Kapat</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default Employees;
