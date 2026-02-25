import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Avatar, TextField,
  InputAdornment, Select, MenuItem, FormControl, CircularProgress,
  IconButton, Tooltip
} from '@mui/material';
import {
  Search as SearchIcon, Login as LoginIcon,
  Logout as LogoutIcon, Edit as EditIcon,
  PersonAdd as PersonAddIcon, Delete as DeleteIcon,
  Security as SecurityIcon, Settings as SettingsIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { API_BASE_URL } from '../config';

const actionIcons = {
  login: <LoginIcon sx={{ fontSize: 16 }} />,
  logout: <LogoutIcon sx={{ fontSize: 16 }} />,
  create: <PersonAddIcon sx={{ fontSize: 16 }} />,
  update: <EditIcon sx={{ fontSize: 16 }} />,
  delete: <DeleteIcon sx={{ fontSize: 16 }} />,
  security: <SecurityIcon sx={{ fontSize: 16 }} />,
  settings: <SettingsIcon sx={{ fontSize: 16 }} />,
};

const actionColors = {
  login: '#22c55e',
  logout: '#64748b',
  create: '#3b82f6',
  update: '#f59e0b',
  delete: '#ef4444',
  security: '#8b5cf6',
  settings: '#06b6d4',
};

// Simüle edilmiş audit log verileri (backend entegrasyonu sonra)
const generateMockLogs = () => {
  const actions = [
    { type: 'login', user: 'Super Admin', email: 'admin@company.com', detail: 'Başarılı giriş — admin.optima-hr.net', ip: '88.xxx.xxx.42' },
    { type: 'login', user: 'Super Admin', email: 'admin@company.com', detail: 'Başarılı giriş — app.optima-hr.net', ip: '88.xxx.xxx.42' },
    { type: 'security', user: 'Sistem', email: 'system', detail: 'Turnstile bot koruması aktif edildi', ip: '-' },
    { type: 'security', user: 'Sistem', email: 'system', detail: 'Brute force koruması aktif edildi (5 deneme / 15dk)', ip: '-' },
    { type: 'security', user: 'Sistem', email: 'system', detail: 'Auth middleware 19 route\'a uygulandı', ip: '-' },
    { type: 'create', user: 'Super Admin', email: 'admin@company.com', detail: 'Yeni kullanıcı oluşturuldu: Harun Yönetici', ip: '88.xxx.xxx.42' },
    { type: 'create', user: 'Super Admin', email: 'admin@company.com', detail: 'Yeni kullanıcı oluşturuldu: Test Deneme', ip: '88.xxx.xxx.42' },
    { type: 'update', user: 'Furkan Dağhan', email: 'furkan@optima.com', detail: 'Profil bilgileri güncellendi', ip: '88.xxx.xxx.42' },
    { type: 'settings', user: 'Super Admin', email: 'admin@company.com', detail: 'Cookie domain .optima-hr.net olarak ayarlandı', ip: '-' },
    { type: 'login', user: 'Furkan Dağhan', email: 'furkan@optima.com', detail: 'Başarılı giriş — app.optima-hr.net', ip: '88.xxx.xxx.42' },
  ];

  const now = new Date();
  return actions.map((action, i) => ({
    ...action,
    id: i + 1,
    timestamp: new Date(now - (i * 3600000 * Math.random() * 5)).toISOString(),
  }));
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    // Mock data — backend API sonra bağlanacak
    setTimeout(() => {
      setLogs(generateMockLogs());
      setLoading(false);
    }, 500);
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchSearch = !search ||
      `${log.user} ${log.detail} ${log.email}`.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || log.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 700 }}>
          Denetim Kayıtları
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
          Platform üzerindeki tüm kullanıcı aktivitelerini takip edin
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Log ara..." size="small" value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#64748b' }} /></InputAdornment>
            }}
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: '10px', backgroundColor: 'rgba(15, 23, 42, 0.5)',
                '& fieldset': { borderColor: 'rgba(71, 85, 105, 0.3)' },
              },
              '& .MuiOutlinedInput-input': { color: '#f1f5f9' },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <Select
              value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              sx={{
                borderRadius: '10px', backgroundColor: 'rgba(15, 23, 42, 0.5)',
                color: '#f1f5f9',
                '& fieldset': { borderColor: 'rgba(71, 85, 105, 0.3)' },
                '& .MuiSelect-icon': { color: '#64748b' }
              }}
            >
              <MenuItem value="all">Tüm İşlemler</MenuItem>
              <MenuItem value="login">Giriş</MenuItem>
              <MenuItem value="logout">Çıkış</MenuItem>
              <MenuItem value="create">Oluşturma</MenuItem>
              <MenuItem value="update">Güncelleme</MenuItem>
              <MenuItem value="delete">Silme</MenuItem>
              <MenuItem value="security">Güvenlik</MenuItem>
              <MenuItem value="settings">Ayarlar</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderColor: 'rgba(71, 85, 105, 0.3)' }}>İşlem</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderColor: 'rgba(71, 85, 105, 0.3)' }}>Kullanıcı</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderColor: 'rgba(71, 85, 105, 0.3)' }}>Detay</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderColor: 'rgba(71, 85, 105, 0.3)' }}>IP</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderColor: 'rgba(71, 85, 105, 0.3)' }}>Zaman</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, borderColor: 'rgba(71, 85, 105, 0.3)' }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filteredLogs.map((log) => (
                <TableRow key={log.id} sx={{ '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.03)' } }}>
                  <TableCell sx={{ borderColor: 'rgba(71, 85, 105, 0.3)' }}>
                    <Chip
                      size="small"
                      icon={actionIcons[log.type]}
                      label={log.type === 'login' ? 'Giriş' : log.type === 'logout' ? 'Çıkış' : log.type === 'create' ? 'Oluşturma' : log.type === 'update' ? 'Güncelleme' : log.type === 'delete' ? 'Silme' : log.type === 'security' ? 'Güvenlik' : 'Ayarlar'}
                      sx={{
                        backgroundColor: `${actionColors[log.type]}15`,
                        color: actionColors[log.type],
                        fontWeight: 600, fontSize: '0.75rem',
                        '& .MuiChip-icon': { color: actionColors[log.type] }
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(71, 85, 105, 0.3)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{
                        width: 32, height: 32, borderRadius: '8px',
                        background: `${actionColors[log.type]}30`,
                        color: actionColors[log.type],
                        fontSize: '0.75rem', fontWeight: 700
                      }}>
                        {log.user[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ color: '#f1f5f9', fontWeight: 500, fontSize: '0.85rem' }}>
                          {log.user}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {log.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(71, 85, 105, 0.3)', color: '#cbd5e1', fontSize: '0.85rem' }}>
                    {log.detail}
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(71, 85, 105, 0.3)' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
                      {log.ip}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(71, 85, 105, 0.3)', color: '#94a3b8', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                    {' '}
                    {new Date(log.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
