// src/pages/Payroll.js
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
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  InputAdornment,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  QrCode as QrCodeIcon,
  Refresh as RefreshIcon,
  Calculate as CalculateIcon,
  Payment as PaymentIcon,
  AccountBalance as AccountBalanceIcon,
  AttachMoney as MoneyIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Upload as UploadIcon
} from '@mui/icons-material';

import { API_BASE_URL } from '../config/config';

function Payroll() {
  const [employees, setEmployees] = useState([]);
  const [payrollData, setPayrollData] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedRow, setEditedRow] = useState({});
  const [qrDialog, setQrDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState('all');
  const [totalSalary, setTotalSalary] = useState(0);

  // Pozisyonlar
  const positions = {
    'MANAGER': 'Yönetici',
    'X_OPERATOR': 'X Operatörü',
    'CHAT_OPERATOR': 'Chat Operatörü',
    'SUPERVISOR': 'Süpervizör',
    'DEVELOPER': 'Yazılım Geliştirici',
    'HR': 'İnsan Kaynakları',
    'FINANCE': 'Muhasebe'
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [payrollData]);

  const loadEmployees = async () => {
    try {
      // Önce API'den çalışanları çek
      const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
      const response = await fetch(`${API_BASE_URL}/api/employees`, {
        headers: { 'X-Site-Id': currentSite }
      });
      const apiEmployees = response.ok ? await response.json() : [];

      // LocalStorage'dan payroll verilerini çek
      const savedPayroll = JSON.parse(localStorage.getItem(`payroll_data_${localStorage.getItem('optima_current_site') || 'FXB'}`) || '[]');

      console.log('API\'den yüklenen çalışanlar:', apiEmployees);

      // Her çalışan için maaş verisi oluştur veya güncelle
      const updatedPayroll = apiEmployees
        .filter(emp => emp.is_active !== false) // Sadece aktif çalışanlar
        .map(emp => {
          const existingPayroll = savedPayroll.find(p =>
            p.employee_id === emp.employee_id || p.id === emp.id
          );

          // Mevcut payroll verisi varsa güncelle
          if (existingPayroll) {
            return {
              ...existingPayroll,
              id: emp.id,
              employee_id: emp.employee_id,
              name: `${emp.first_name} ${emp.last_name}`.trim(),
              system_name: emp.employee_id,
              position: emp.position || emp.job_title || 'UNKNOWN',
              hire_date: emp.hire_date,
              is_active: emp.is_active,
              usdt_address: emp.usdt_address || existingPayroll.usdt_address || '',
              working_months: calculateWorkingMonths(emp.hire_date)
            };
          }

          // Yeni çalışan için varsayılan maaş verisi
          const workingMonths = calculateWorkingMonths(emp.hire_date);

          return {
            id: emp.id,
            employee_id: emp.employee_id,
            name: `${emp.first_name} ${emp.last_name}`.trim(),
            system_name: emp.employee_id,
            position: emp.position || emp.job_title || 'UNKNOWN',
            hire_date: emp.hire_date,
            working_months: workingMonths,
            deposit: existingPayroll?.deposit || 0,
            salary: emp.net_salary || existingPayroll?.salary || 0,
            payable_salary: (emp.net_salary || 0) - (existingPayroll?.deposit || 0),
            bonus: existingPayroll?.bonus || 0,
            overtime: existingPayroll?.overtime || 0,
            usdt_address: emp.usdt_address || '',
            notes: existingPayroll?.notes || '',
            is_active: emp.is_active,
            last_payment_date: existingPayroll?.last_payment_date || null,
            payment_history: existingPayroll?.payment_history || []
          };
        });

      console.log('Payroll listesi oluşturuldu:', updatedPayroll);

      setEmployees(apiEmployees);
      setPayrollData(updatedPayroll);
      localStorage.setItem(`payroll_data_${localStorage.getItem('optima_current_site') || 'FXB'}`, JSON.stringify(updatedPayroll));
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      setEmployees([]);
      setPayrollData([]);
    }
  };

  const calculateWorkingMonths = (hireDate) => {
    if (!hireDate || hireDate === 'Invalid Date') return 0;

    try {
      const hire = new Date(hireDate);
      if (isNaN(hire.getTime())) return 0;

      const now = new Date();
      const diffMonths = (now.getFullYear() - hire.getFullYear()) * 12 +
        (now.getMonth() - hire.getMonth());
      return Math.max(0, diffMonths);
    } catch (error) {
      console.error('Tarih hesaplama hatası:', error);
      return 0;
    }
  };

  const calculateTotals = () => {
    const total = payrollData
      .filter(emp => emp.is_active !== false)
      .reduce((sum, emp) => {
        const payable = parseFloat(emp.payable_salary) || 0;
        const bonus = parseFloat(emp.bonus) || 0;
        const overtime = parseFloat(emp.overtime) || 0;
        return sum + payable + bonus + overtime;
      }, 0);
    setTotalSalary(total);
  };

  const handleEdit = (employee) => {
    setEditingId(employee.id);
    setEditedRow({ ...employee });
  };

  const handleSave = () => {
    const updatedPayroll = payrollData.map(emp =>
      emp.id === editingId ? editedRow : emp
    );
    setPayrollData(updatedPayroll);
    localStorage.setItem(`payroll_data_${localStorage.getItem('optima_current_site') || 'FXB'}`, JSON.stringify(updatedPayroll));

    // Çalışanlar listesini de güncelle (USDT adresi için)
    const employees = JSON.parse(localStorage.getItem('employees') || '[]');
    const updatedEmployees = employees.map(emp => {
      if (emp.id === editingId) {
        return {
          ...emp,
          usdt_address: editedRow.usdt_address,
          net_salary: editedRow.salary
        };
      }
      return emp;
    });
    localStorage.setItem('employees', JSON.stringify(updatedEmployees));

    setEditingId(null);
    setEditedRow({});
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedRow({});
  };

  const handleFieldChange = (field, value) => {
    const updated = { ...editedRow, [field]: value };

    // Ödenecek maaşı otomatik hesapla
    if (field === 'salary' || field === 'deposit') {
      const salary = parseFloat(updated.salary) || 0;
      const deposit = parseFloat(updated.deposit) || 0;
      updated.payable_salary = Math.max(0, salary - deposit);
    }

    setEditedRow(updated);
  };

  const handleShowQR = (employee) => {
    setSelectedEmployee(employee);
    setQrDialog(true);
  };

  const generateQRCode = (address) => {
    if (!address) return null;
    // QR kod için Google Charts API kullan - URL encoding düzeltmesi
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`;
    return qrUrl;
  };

  const handleExport = () => {
    // CSV olarak dışa aktar
    const headers = ['İsim', 'Sistem Adı', 'Pozisyon', 'Başlama Tarihi', 'Çalışma Süresi',
      'Depozito', 'Maaş', 'Ödenecek', 'Prim', 'Mesai', 'USDT Adresi', 'Notlar'];

    const data = filteredData.map(emp => [
      emp.name,
      emp.system_name,
      positions[emp.position] || emp.position,
      emp.hire_date,
      `${emp.working_months} ay`,
      emp.deposit,
      emp.salary,
      emp.payable_salary,
      emp.bonus,
      emp.overtime,
      emp.usdt_address,
      emp.notes
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `maas_listesi_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const markAsPaid = (employee) => {
    if (window.confirm(`${employee.name} adlı çalışanın maaşı ödendi olarak işaretlensin mi?`)) {
      const payment = {
        date: new Date().toISOString(),
        amount: parseFloat(employee.payable_salary) + parseFloat(employee.bonus || 0) + parseFloat(employee.overtime || 0),
        type: 'salary',
        month: new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })
      };

      const updatedPayroll = payrollData.map(emp => {
        if (emp.id === employee.id) {
          return {
            ...emp,
            last_payment_date: payment.date,
            payment_history: [...(emp.payment_history || []), payment],
            deposit: 0, // Ödeme sonrası depozito sıfırlanır
            bonus: 0,
            overtime: 0
          };
        }
        return emp;
      });

      setPayrollData(updatedPayroll);
      localStorage.setItem(`payroll_data_${localStorage.getItem('optima_current_site') || 'FXB'}`, JSON.stringify(updatedPayroll));
    }
  };

  // Filtreleme - sadece aktif çalışanları göster
  const filteredData = payrollData.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.system_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.usdt_address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPosition = filterPosition === 'all' || emp.position === filterPosition;

    return matchesSearch && matchesPosition && emp.is_active !== false;
  });

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{
          background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold'
        }}>
          💰 Maaş Ödeme Sistemi
        </Typography>

        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            sx={{
              borderColor: '#8bb94a',
              color: '#8bb94a',
              '&:hover': {
                borderColor: '#7aa042',
                backgroundColor: 'rgba(139, 185, 74, 0.1)'
              }
            }}
          >
            Excel İndir
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadEmployees}
            sx={{
              borderColor: '#1c61ab',
              color: '#1c61ab',
              '&:hover': {
                borderColor: '#155090',
                backgroundColor: 'rgba(28, 97, 171, 0.1)'
              }
            }}
          >
            Yenile
          </Button>
        </Box>
      </Box>

      {/* İstatistikler */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.1), rgba(139, 185, 74, 0.1))',
            border: '1px solid rgba(28, 97, 171, 0.2)'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{
                  bgcolor: '#1c61ab',
                  mr: 2,
                  width: 48,
                  height: 48
                }}>
                  <PaymentIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="#1c61ab">
                    {filteredData.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Aktif Çalışan
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, rgba(139, 185, 74, 0.1), rgba(28, 97, 171, 0.1))',
            border: '1px solid rgba(139, 185, 74, 0.2)'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{
                  bgcolor: '#8bb94a',
                  mr: 2,
                  width: 48,
                  height: 48
                }}>
                  <MoneyIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="#8bb94a">
                    ${totalSalary.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Toplam Maaş
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1), rgba(255, 193, 7, 0.1))',
            border: '1px solid rgba(255, 152, 0, 0.2)'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{
                  bgcolor: '#ff9800',
                  mr: 2,
                  width: 48,
                  height: 48
                }}>
                  <CalculateIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="#ff9800">
                    ${filteredData.reduce((sum, e) => sum + (parseFloat(e.bonus) || 0), 0).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Toplam Prim
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.1), rgba(103, 58, 183, 0.1))',
            border: '1px solid rgba(156, 39, 176, 0.2)'
          }}>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{
                  bgcolor: '#9c27b0',
                  mr: 2,
                  width: 48,
                  height: 48
                }}>
                  <AccountBalanceIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="#9c27b0">
                    ${filteredData.reduce((sum, e) => sum + (parseFloat(e.deposit) || 0), 0).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Toplam Depozito
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtreler */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            size="small"
            placeholder="İsim, sistem adı veya USDT adresi ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: 1, maxWidth: 400 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Pozisyon</InputLabel>
            <Select
              value={filterPosition}
              onChange={(e) => setFilterPosition(e.target.value)}
              label="Pozisyon"
            >
              <MenuItem value="all">Tümü</MenuItem>
              {Object.entries(positions).map(([key, value]) => (
                <MenuItem key={key} value={key}>{value}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Tablo */}
      <TableContainer component={Paper} sx={{
        borderRadius: 2,
        boxShadow: '0 4px 20px rgba(28, 97, 171, 0.1)'
      }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(28, 97, 171, 0.05)' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>İsim Soyisim</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Sistem Adı</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Pozisyon</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Başlama Tarihi</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Çalışma Süresi</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Depozito ($)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Maaş ($)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Ödenecek ($)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Prim ($)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Mesai ($)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>TRC-20 Adresi</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Notlar</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((employee) => {
              const isEditing = editingId === employee.id;
              const data = isEditing ? editedRow : employee;

              return (
                <TableRow
                  key={employee.id}
                  sx={{
                    '&:hover': { bgcolor: 'rgba(28, 97, 171, 0.02)' },
                    bgcolor: data.last_payment_date &&
                      new Date(data.last_payment_date).getMonth() === new Date().getMonth()
                      ? 'rgba(139, 185, 74, 0.05)' : 'transparent'
                  }}
                >
                  <TableCell>{data.name || 'İsimsiz'}</TableCell>
                  <TableCell>
                    <Chip
                      label={data.system_name}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(28, 97, 171, 0.1)',
                        color: '#1c61ab',
                        fontFamily: 'monospace'
                      }}
                    />
                  </TableCell>
                  <TableCell>{positions[data.position] || data.position || 'Belirtilmemiş'}</TableCell>
                  <TableCell>
                    {data.hire_date && data.hire_date !== 'Invalid Date'
                      ? new Date(data.hire_date).toLocaleDateString('tr-TR')
                      : 'Belirtilmemiş'
                    }
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${data.working_months} ay`}
                      size="small"
                      color={data.working_months > 12 ? 'success' : data.working_months > 6 ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        size="small"
                        type="number"
                        value={data.deposit}
                        onChange={(e) => handleFieldChange('deposit', e.target.value)}
                        sx={{ width: 100 }}
                      />
                    ) : (
                      <Typography sx={{
                        color: data.deposit > 0 ? '#ff9800' : 'text.primary',
                        fontWeight: data.deposit > 0 ? 'bold' : 'normal'
                      }}>
                        ${data.deposit || 0}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        size="small"
                        type="number"
                        value={data.salary}
                        onChange={(e) => handleFieldChange('salary', e.target.value)}
                        sx={{ width: 100 }}
                      />
                    ) : (
                      <Typography sx={{ fontWeight: 'bold', color: '#1c61ab' }}>
                        ${data.salary || 0}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography sx={{
                      fontWeight: 'bold',
                      color: '#8bb94a',
                      fontSize: '1.1em'
                    }}>
                      ${data.payable_salary || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        size="small"
                        type="number"
                        value={data.bonus}
                        onChange={(e) => handleFieldChange('bonus', e.target.value)}
                        sx={{ width: 80 }}
                      />
                    ) : (
                      data.bonus > 0 && (
                        <Chip
                          label={`$${data.bonus}`}
                          size="small"
                          color="success"
                        />
                      )
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        size="small"
                        type="number"
                        value={data.overtime}
                        onChange={(e) => handleFieldChange('overtime', e.target.value)}
                        sx={{ width: 80 }}
                      />
                    ) : (
                      data.overtime > 0 && (
                        <Chip
                          label={`$${data.overtime}`}
                          size="small"
                          color="warning"
                        />
                      )
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        size="small"
                        value={data.usdt_address}
                        onChange={(e) => handleFieldChange('usdt_address', e.target.value)}
                        sx={{ width: 150 }}
                        placeholder="TRC-20 Adresi"
                      />
                    ) : (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          variant="caption"
                          sx={{
                            maxWidth: 100,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontFamily: 'monospace'
                          }}
                        >
                          {data.usdt_address || 'Yok'}
                        </Typography>
                        {data.usdt_address && (
                          <IconButton
                            size="small"
                            onClick={() => handleShowQR(data)}
                            sx={{
                              color: '#8bb94a',
                              '&:hover': {
                                transform: 'scale(1.1)',
                                bgcolor: 'rgba(139, 185, 74, 0.1)'
                              }
                            }}
                          >
                            <QrCodeIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <TextField
                        size="small"
                        value={data.notes}
                        onChange={(e) => handleFieldChange('notes', e.target.value)}
                        sx={{ width: 150 }}
                        placeholder="Not ekle..."
                      />
                    ) : (
                      <Typography variant="caption">
                        {data.notes || '-'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {isEditing ? (
                      <Box display="flex" gap={0.5}>
                        <IconButton size="small" onClick={handleSave} color="success">
                          <SaveIcon />
                        </IconButton>
                        <IconButton size="small" onClick={handleCancel} color="error">
                          <CancelIcon />
                        </IconButton>
                      </Box>
                    ) : (
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="Düzenle">
                          <IconButton size="small" onClick={() => handleEdit(employee)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Ödendi İşaretle">
                          <IconButton
                            size="small"
                            onClick={() => markAsPaid(employee)}
                            sx={{ color: '#8bb94a' }}
                          >
                            <PaymentIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* QR Kod Dialog */}
      <Dialog open={qrDialog} onClose={() => setQrDialog(false)}>
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
          color: 'white'
        }}>
          USDT TRC-20 Adresi
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pt: 3 }}>
          {selectedEmployee && (
            <>
              <Typography variant="h6" gutterBottom>
                {selectedEmployee.name}
              </Typography>

              {selectedEmployee.usdt_address ? (
                <>
                  <Box sx={{
                    p: 2,
                    bgcolor: 'white',
                    borderRadius: 2,
                    border: '2px solid #8bb94a',
                    mb: 2
                  }}>
                    <img
                      src={generateQRCode(selectedEmployee.usdt_address)}
                      alt="QR Code"
                      style={{ width: 200, height: 200 }}
                    />
                  </Box>

                  <Paper sx={{
                    p: 2,
                    bgcolor: 'rgba(139, 185, 74, 0.1)',
                    borderRadius: 2
                  }}>
                    <Typography variant="caption" color="text.secondary">
                      TRC-20 Adresi:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontFamily: 'monospace',
                        wordBreak: 'break-all',
                        fontWeight: 'bold',
                        color: '#1c61ab',
                        mt: 1
                      }}
                    >
                      {selectedEmployee.usdt_address}
                    </Typography>
                  </Paper>

                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="caption">
                      Ödenecek Tutar: <strong>${selectedEmployee.payable_salary}</strong>
                      {(selectedEmployee.bonus > 0 || selectedEmployee.overtime > 0) && (
                        <>
                          <br />
                          Prim: ${selectedEmployee.bonus || 0} | Mesai: ${selectedEmployee.overtime || 0}
                          <br />
                          <strong>
                            Toplam: $
                            {parseFloat(selectedEmployee.payable_salary) +
                              parseFloat(selectedEmployee.bonus || 0) +
                              parseFloat(selectedEmployee.overtime || 0)}
                          </strong>
                        </>
                      )}
                    </Typography>
                  </Alert>
                </>
              ) : (
                <Alert severity="warning">
                  Bu çalışan için USDT adresi tanımlanmamış!
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialog(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Payroll;
