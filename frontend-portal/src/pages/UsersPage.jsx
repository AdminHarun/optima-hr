import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Avatar, Chip, IconButton,
  TextField, InputAdornment, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Select, FormControl, InputLabel, Alert,
  Tooltip, CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon, PersonAdd as PersonAddIcon,
  Edit as EditIcon, Block as BlockIcon, CheckCircle as CheckCircleIcon,
  MoreVert as MoreVertIcon, Shield as ShieldIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { API_BASE_URL, ROLES } from '../config';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editDialog, setEditDialog] = useState({ open: false, user: null });
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/management/users`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || data || []);
      }
    } catch (err) {
      setError('Kullanıcılar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = users.filter(u => {
    const matchSearch = !search ||
      `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const getRoleChip = (role) => {
    const r = ROLES[role] || { label: role, color: '#64748b' };
    return (
      <Chip
        size="small"
        label={r.label}
        sx={{
          backgroundColor: `${r.color}20`,
          color: r.color,
          fontWeight: 600, fontSize: '0.75rem'
        }}
      />
    );
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 700 }}>
            Kullanıcılar
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            Platform kullanıcılarını yönetin — {users.length} kullanıcı
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddIcon />}
          sx={{
            background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
            fontWeight: 600, borderRadius: '12px', px: 3
          }}
        >
          Kullanıcı Davet Et
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Kullanıcı ara..." size="small" value={search}
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
              value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
              sx={{
                borderRadius: '10px', backgroundColor: 'rgba(15, 23, 42, 0.5)',
                color: '#f1f5f9',
                '& fieldset': { borderColor: 'rgba(71, 85, 105, 0.3)' },
                '& .MuiSelect-icon': { color: '#64748b' }
              }}
            >
              <MenuItem value="all">Tüm Roller</MenuItem>
              {Object.entries(ROLES).map(([key, r]) => (
                <MenuItem key={key} value={key}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderColor: 'rgba(71, 85, 105, 0.3)' }}>Kullanıcı</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderColor: 'rgba(71, 85, 105, 0.3)' }}>Rol</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderColor: 'rgba(71, 85, 105, 0.3)' }}>Durum</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderColor: 'rgba(71, 85, 105, 0.3)' }}>2FA</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderColor: 'rgba(71, 85, 105, 0.3)' }}>Son Giriş</TableCell>
                <TableCell sx={{ color: '#94a3b8', fontWeight: 600, borderColor: 'rgba(71, 85, 105, 0.3)' }} align="right">İşlem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, borderColor: 'rgba(71, 85, 105, 0.3)' }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#64748b', borderColor: 'rgba(71, 85, 105, 0.3)' }}>
                    Kullanıcı bulunamadı
                  </TableCell>
                </TableRow>
              ) : filteredUsers.map((user) => (
                <TableRow key={user.id} sx={{ '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.03)' } }}>
                  <TableCell sx={{ borderColor: 'rgba(71, 85, 105, 0.3)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{
                        width: 40, height: 40, borderRadius: '12px',
                        background: `linear-gradient(135deg, ${ROLES[user.role]?.color || '#64748b'}, ${ROLES[user.role]?.color || '#64748b'}aa)`,
                        fontSize: '0.85rem', fontWeight: 700
                      }}>
                        {(user.first_name?.[0] || '') + (user.last_name?.[0] || '')}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ color: '#f1f5f9', fontWeight: 600 }}>
                          {user.first_name} {user.last_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(71, 85, 105, 0.3)' }}>
                    {getRoleChip(user.role)}
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(71, 85, 105, 0.3)' }}>
                    <Chip
                      size="small"
                      label={user.is_active ? 'Aktif' : 'Deaktif'}
                      sx={{
                        backgroundColor: user.is_active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: user.is_active ? '#22c55e' : '#ef4444',
                        fontWeight: 600, fontSize: '0.75rem'
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(71, 85, 105, 0.3)' }}>
                    {user.two_factor_enabled
                      ? <ShieldIcon sx={{ color: '#22c55e', fontSize: 20 }} />
                      : <ShieldIcon sx={{ color: '#334155', fontSize: 20 }} />
                    }
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(71, 85, 105, 0.3)', color: '#94a3b8', fontSize: '0.8rem' }}>
                    {user.last_login
                      ? new Date(user.last_login).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Hiç giriş yapmadı'
                    }
                  </TableCell>
                  <TableCell align="right" sx={{ borderColor: 'rgba(71, 85, 105, 0.3)' }}>
                    <Tooltip title="Düzenle">
                      <IconButton size="small" sx={{ color: '#64748b' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
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
