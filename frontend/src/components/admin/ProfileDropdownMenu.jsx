import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Avatar,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField
} from '@mui/material';
import {
  PersonOutlined as PersonIcon,
  SettingsOutlined as SettingsIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE_URL } from '../../config/config';
import webSocketService from '../../services/webSocketService';

const getSiteHeaders = () => {
  const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
  return { 'X-Site-Id': currentSite };
};

const statusColors = {
  online: '#2EB67D',
  away: '#ECB22E',
  busy: '#E01E5A',
  offline: '#9ca3af'
};

const statusLabels = {
  online: 'Çevrimiçi',
  away: 'Uzakta',
  busy: 'Meşgul',
  offline: 'Çevrimdışı'
};

const statusOptions = [
  { label: 'Görüşmede', emoji: '📞', status: 'busy', customStatus: 'Görüşmede' },
  { label: 'Sistem dışı', emoji: '🚫', status: 'away', customStatus: 'Sistem dışı' },
  { label: 'Tatilde', emoji: '🏖️', status: 'away', customStatus: 'Tatilde' },
  { label: 'Evden çalışıyor', emoji: '🏠', status: 'online', customStatus: 'Evden çalışıyor' }
];

const muteOptions = [
  { label: '30 dakika', duration: 30 * 60 * 1000 },
  { label: '1 saat', duration: 60 * 60 * 1000 },
  { label: '2 saat', duration: 2 * 60 * 60 * 1000 },
  {
    label: 'Yarına kadar',
    getDuration: () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow.getTime() - Date.now();
    }
  },
  {
    label: 'Haftaya kadar',
    getDuration: () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + (8 - nextWeek.getDay()) % 7);
      nextWeek.setHours(9, 0, 0, 0);
      return nextWeek.getTime() - Date.now();
    }
  }
];

export default function ProfileDropdownMenu({ anchorEl, open, onClose, onPreferencesClick }) {
  const navigate = useNavigate();
  const { currentUser, logout } = useEmployeeAuth();
  const { currentTheme } = useTheme();
  const isDark = currentTheme !== 'basic-light';

  const [statusSubmenuOpen, setStatusSubmenuOpen] = useState(false);
  const [muteSubmenuOpen, setMuteSubmenuOpen] = useState(false);
  const [muteCustomDialogOpen, setMuteCustomDialogOpen] = useState(false);
  const [muteCustomDate, setMuteCustomDate] = useState('');
  const [currentStatus, setCurrentStatus] = useState('online');
  const [customStatus, setCustomStatus] = useState('');

  const updateStatus = async (status, customStatusText, customEmoji) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/me/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getSiteHeaders()
        },
        body: JSON.stringify({ status, customStatus: customStatusText, customEmoji })
      });
      if (response.ok) {
        webSocketService.setStatus(status, customStatusText);
        setCurrentStatus(status);
        setCustomStatus(customStatusText || '');
      }
    } catch (error) {
      console.error('Status update failed:', error);
    }
  };

  const handleMute = (duration) => {
    const muteUntil = new Date(Date.now() + duration);
    localStorage.setItem('optima_notifications_muted_until', muteUntil.toISOString());
    onClose();
  };

  const handleCustomMute = () => {
    if (muteCustomDate) {
      const muteUntil = new Date(muteCustomDate);
      localStorage.setItem('optima_notifications_muted_until', muteUntil.toISOString());
      setMuteCustomDialogOpen(false);
      onClose();
    }
  };

  const handleLogout = () => {
    onClose();
    const result = logout();
    if (result.success) {
      navigate('/admin/login');
    }
  };

  const menuSx = {
    bgcolor: isDark ? '#1A1D21' : '#ffffff',
    color: isDark ? '#E0E0E0' : '#111827',
    border: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}`,
    borderRadius: '8px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    minWidth: 280,
    py: 0
  };

  const menuItemHover = {
    '&:hover': { bgcolor: isDark ? '#27242C' : '#f0f0f0' }
  };

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{ sx: menuSx }}
      >
        {/* 1. Kullanıcı Bilgi Bloğu */}
        <Box sx={{ p: 2, borderBottom: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}` }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={currentUser?.avatar}
              sx={{
                width: 48,
                height: 48,
                borderRadius: '8px',
                bgcolor: 'var(--theme-button-primary)',
                fontWeight: 700,
                fontSize: '16px'
              }}
            >
              {`${currentUser?.firstName?.[0] || ''}${currentUser?.lastName?.[0] || ''}`.toUpperCase()}
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '15px', color: isDark ? '#E0E0E0' : '#111827' }}>
                {currentUser?.firstName} {currentUser?.lastName}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{
                  width: 8, height: 8, borderRadius: '50%',
                  bgcolor: statusColors[currentStatus]
                }} />
                <Typography sx={{ fontSize: '13px', color: isDark ? '#ABABAD' : '#6b7280' }}>
                  {customStatus || statusLabels[currentStatus]}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* 2. Statünü Güncelle - Alt Menülü */}
        <MenuItem
          onMouseEnter={() => setStatusSubmenuOpen(true)}
          onMouseLeave={() => setStatusSubmenuOpen(false)}
          sx={{ position: 'relative', py: 1.5, ...menuItemHover }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Typography sx={{ fontSize: '18px' }}>😊</Typography>
          </ListItemIcon>
          <ListItemText>
            <Typography sx={{ fontSize: '14px', color: isDark ? '#E0E0E0' : '#111827' }}>
              Statünü güncelle
            </Typography>
          </ListItemText>
          <Typography sx={{ ml: 'auto', color: isDark ? '#ABABAD' : '#9ca3af', fontSize: '12px' }}>▸</Typography>

          {statusSubmenuOpen && (
            <Paper
              sx={{
                position: 'absolute',
                left: '100%',
                top: 0,
                minWidth: 200,
                py: 0.5,
                bgcolor: isDark ? '#1A1D21' : '#ffffff',
                border: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}`,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: 1
              }}
              onMouseEnter={() => setStatusSubmenuOpen(true)}
              onMouseLeave={() => setStatusSubmenuOpen(false)}
            >
              {statusOptions.map(option => (
                <MenuItem
                  key={option.label}
                  onClick={() => {
                    updateStatus(option.status, option.customStatus, option.emoji);
                    onClose();
                  }}
                  sx={menuItemHover}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Typography sx={{ fontSize: '16px' }}>{option.emoji}</Typography>
                  </ListItemIcon>
                  <ListItemText>
                    <Typography sx={{ fontSize: '14px', color: isDark ? '#E0E0E0' : '#111827' }}>
                      {option.label}
                    </Typography>
                  </ListItemText>
                </MenuItem>
              ))}
            </Paper>
          )}
        </MenuItem>

        {/* 3. Away/Online Toggle */}
        <MenuItem
          onClick={() => {
            const newStatus = currentStatus === 'online' ? 'away' : 'online';
            updateStatus(newStatus, '', '');
            onClose();
          }}
          sx={{ py: 1.5, ...menuItemHover }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Typography sx={{ fontSize: '18px' }}>
              {currentStatus === 'online' ? '🔘' : '✅'}
            </Typography>
          </ListItemIcon>
          <ListItemText>
            <Typography sx={{ fontSize: '14px', color: isDark ? '#E0E0E0' : '#111827' }}>
              {currentStatus === 'online' ? 'Kendini uzakta yap' : 'Kendini çevrimiçi yap'}
            </Typography>
          </ListItemText>
        </MenuItem>

        {/* 4. Bildirimleri Sessize Al - Alt Menülü */}
        <MenuItem
          onMouseEnter={() => setMuteSubmenuOpen(true)}
          onMouseLeave={() => setMuteSubmenuOpen(false)}
          sx={{ position: 'relative', py: 1.5, ...menuItemHover }}
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Typography sx={{ fontSize: '18px' }}>🔕</Typography>
          </ListItemIcon>
          <ListItemText>
            <Typography sx={{ fontSize: '14px', color: isDark ? '#E0E0E0' : '#111827' }}>
              Bildirimleri sessize al
            </Typography>
          </ListItemText>
          <Typography sx={{ ml: 'auto', color: isDark ? '#ABABAD' : '#9ca3af', fontSize: '12px' }}>▸</Typography>

          {muteSubmenuOpen && (
            <Paper
              sx={{
                position: 'absolute',
                left: '100%',
                top: 0,
                minWidth: 200,
                py: 0.5,
                bgcolor: isDark ? '#1A1D21' : '#ffffff',
                border: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}`,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: 1
              }}
              onMouseEnter={() => setMuteSubmenuOpen(true)}
              onMouseLeave={() => setMuteSubmenuOpen(false)}
            >
              {muteOptions.map(option => (
                <MenuItem
                  key={option.label}
                  onClick={() => {
                    const dur = option.getDuration ? option.getDuration() : option.duration;
                    handleMute(dur);
                  }}
                  sx={menuItemHover}
                >
                  <ListItemText>
                    <Typography sx={{ fontSize: '14px', color: isDark ? '#E0E0E0' : '#111827' }}>
                      {option.label}
                    </Typography>
                  </ListItemText>
                </MenuItem>
              ))}
              <Divider sx={{ borderColor: isDark ? '#35373B' : '#e5e7eb' }} />
              <MenuItem
                onClick={() => {
                  setMuteCustomDialogOpen(true);
                  setMuteSubmenuOpen(false);
                }}
                sx={menuItemHover}
              >
                <ListItemText>
                  <Typography sx={{ fontSize: '14px', color: isDark ? '#E0E0E0' : '#111827' }}>
                    Özel...
                  </Typography>
                </ListItemText>
              </MenuItem>
            </Paper>
          )}
        </MenuItem>

        {/* 5. Divider */}
        <Divider sx={{ borderColor: isDark ? '#35373B' : '#e5e7eb' }} />

        {/* 6. Profil */}
        <MenuItem
          onClick={() => { navigate('/admin/profile'); onClose(); }}
          sx={{ py: 1.5, ...menuItemHover }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: isDark ? '#ABABAD' : '#6b7280' }}>
            <PersonIcon sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText>
            <Typography sx={{ fontSize: '14px', color: isDark ? '#E0E0E0' : '#111827' }}>
              Profil
            </Typography>
          </ListItemText>
        </MenuItem>

        {/* 7. Tercihler */}
        <MenuItem
          onClick={() => { onPreferencesClick(); }}
          sx={{ py: 1.5, ...menuItemHover }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: isDark ? '#ABABAD' : '#6b7280' }}>
            <SettingsIcon sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText>
            <Typography sx={{ fontSize: '14px', color: isDark ? '#E0E0E0' : '#111827' }}>
              Tercihler
            </Typography>
          </ListItemText>
        </MenuItem>

        {/* 8. Çıkış Yap */}
        <MenuItem onClick={handleLogout} sx={{ py: 1.5, ...menuItemHover }}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <LogoutIcon sx={{ fontSize: 20, color: '#E01E5A' }} />
          </ListItemIcon>
          <ListItemText>
            <Typography sx={{ fontSize: '14px', color: '#E01E5A' }}>
              Çıkış Yap
            </Typography>
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* Özel Mute Dialog */}
      <Dialog
        open={muteCustomDialogOpen}
        onClose={() => setMuteCustomDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: isDark ? '#1A1D21' : '#ffffff',
            color: isDark ? '#E0E0E0' : '#111827',
            borderRadius: '12px'
          }
        }}
      >
        <DialogTitle sx={{ color: isDark ? '#E0E0E0' : '#111827' }}>
          Bildirimleri ne zamana kadar sessize al?
        </DialogTitle>
        <DialogContent>
          <TextField
            type="datetime-local"
            fullWidth
            inputProps={{ min: new Date().toISOString().slice(0, 16) }}
            onChange={(e) => setMuteCustomDate(e.target.value)}
            sx={{
              mt: 2,
              '& .MuiInputBase-root': {
                color: isDark ? '#E0E0E0' : '#111827',
                bgcolor: isDark ? '#222529' : '#f3f4f6',
                borderRadius: '8px'
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMuteCustomDialogOpen(false)} sx={{ color: isDark ? '#ABABAD' : '#6b7280' }}>
            İptal
          </Button>
          <Button variant="contained" onClick={handleCustomMute} sx={{ bgcolor: 'var(--theme-button-primary)' }}>
            Sessize Al
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
