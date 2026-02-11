// Admin Header - Liquid Glass Theme with Elegant Tabs & Theme Picker
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme, THEMES } from '../../contexts/ThemeContext';
import SiteSelector from './SiteSelector';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Box,
  Divider,
  ListItemIcon,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  List,
  ListItem,
  ListItemAvatar
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Chat as ChatIcon,
  Mail as MailIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  VideoCall as VideoCallIcon,
  CalendarToday as CalendarIcon,
  Palette as PaletteIcon,
  Check as CheckIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Landscape as LandscapeIcon
} from '@mui/icons-material';

function AdminHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, hasPermission, PERMISSIONS } = useEmployeeAuth();
  const { currentTheme, themeConfig, themes, changeTheme, isLoading: themeLoading } = useTheme();

  // Menu states
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  // Bildirim context'inden gercek zamanli bildirimler
  const { unreadCount: unreadMessages, notifications: contextNotifications, markAsRead } = useNotifications();
  const unreadMails = 0;

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
    setThemeMenuOpen(false);
  };

  const handleLogout = () => {
    handleProfileMenuClose();
    const result = logout();
    if (result.success) {
      navigate('/admin/login');
    }
  };

  const handleProfile = () => {
    handleProfileMenuClose();
    navigate('/admin/profile');
  };

  const handleThemeChange = (themeId) => {
    changeTheme(themeId);
  };

  const handleNotificationOpen = () => {
    setNotificationDialogOpen(true);
  };

  const handleDialogClose = () => {
    setNotificationDialogOpen(false);
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'SUPER_ADMIN': 'Super Admin',
      'ADMIN': 'Admin',
      'HR_MANAGER': 'HR Muduru',
      'HR': 'Insan Kaynaklari',
      'HR_EXPERT': 'HR Uzmani',
      'RECRUITER': 'Ise Alim Uzmani',
      'HR_ASSISTANT': 'HR Asistani',
      'USER': 'Kullanici'
    };
    return roleNames[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      'SUPER_ADMIN': 'error',
      'ADMIN': 'primary',
      'HR_MANAGER': 'success',
      'HR': 'success',
      'HR_EXPERT': 'info',
      'RECRUITER': 'success',
      'HR_ASSISTANT': 'warning',
      'USER': 'default'
    };
    return colors[role] || 'default';
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 60) {
      return `${minutes} dk önce`;
    } else if (hours < 24) {
      return `${hours} saat önce`;
    } else {
      return `${Math.floor(hours / 24)} gün önce`;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'chat':
        return <ChatIcon color="primary" />;
      case 'application':
        return <InfoIcon color="warning" />;
      case 'profile':
        return <PersonIcon color="secondary" />;
      default:
        return <InfoIcon color="primary" />;
    }
  };

  const notifications = contextNotifications || [];
  const unreadCount = notifications.filter(n => !n.read).length;

  // Elegant Nav Button Component - Modern Glass Style
  const NavButton = ({ label, icon, badge, isActive, onClick }) => (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2.5,
        py: 1.5,
        borderRadius: '10px',
        cursor: 'pointer',
        userSelect: 'none',
        position: 'relative',
        background: isActive
          ? 'rgba(255, 255, 255, 0.2)'
          : 'transparent',
        border: isActive
          ? '1px solid rgba(255, 255, 255, 0.3)'
          : '1px solid transparent',
        '&:hover': {
          background: 'rgba(255, 255, 255, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
        transition: 'all 0.2s ease',
      }}
    >
      <Box sx={{
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        opacity: isActive ? 1 : 0.8
      }}>
        {icon}
      </Box>
      <Typography
        variant="body2"
        sx={{
          color: 'white',
          fontWeight: isActive ? 600 : 500,
          fontSize: '0.875rem',
          opacity: isActive ? 1 : 0.9
        }}
      >
        {label}
      </Typography>
      {badge > 0 && (
        <Box sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          minWidth: 18,
          height: 18,
          borderRadius: '9px',
          bgcolor: 'error.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Typography sx={{ fontSize: '0.65rem', color: 'white', fontWeight: 'bold' }}>
            {badge > 99 ? '99+' : badge}
          </Typography>
        </Box>
      )}
    </Box>
  );

  if (!currentUser) {
    return null;
  }

  return (
    <>
      <AppBar
        position="sticky"
        sx={{
          background: 'var(--theme-header-bg)',
          backdropFilter: `blur(var(--theme-glass-blur, 20px)) saturate(var(--theme-glass-saturation, 180%))`,
          WebkitBackdropFilter: `blur(var(--theme-glass-blur, 20px)) saturate(var(--theme-glass-saturation, 180%))`,
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 3, pl: { xs: 2, md: 3 }, minHeight: '64px !important', WebkitAppRegion: 'drag' }}>
          {/* Sol Taraf - Site Seçici + Sekmeler */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            WebkitAppRegion: 'no-drag'
          }}>
            <SiteSelector />

            {/* Elegant Navigation Buttons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <NavButton
                label="Mesajlar"
                icon={<ChatIcon sx={{ fontSize: 18 }} />}
                badge={unreadMessages}
                isActive={location.pathname === '/admin/chat'}
                onClick={() => { markAsRead(); navigate('/admin/chat'); }}
              />
              <NavButton
                label="Mail"
                icon={<MailIcon sx={{ fontSize: 18 }} />}
                badge={unreadMails}
                isActive={location.pathname === '/admin/mail'}
                onClick={() => navigate('/admin/mail')}
              />
              <NavButton
                label="Aramalar"
                icon={<VideoCallIcon sx={{ fontSize: 18 }} />}
                badge={0}
                isActive={location.pathname === '/admin/calls'}
                onClick={() => navigate('/admin/calls')}
              />
              <NavButton
                label="Takvim"
                icon={<CalendarIcon sx={{ fontSize: 18 }} />}
                badge={0}
                isActive={location.pathname === '/admin/calendar'}
                onClick={() => navigate('/admin/calendar')}
              />
            </Box>
          </Box>

          {/* Sağ Taraf - Bildirimler ve Profil */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, WebkitAppRegion: 'no-drag' }}>
            <IconButton
              color="inherit"
              onClick={handleNotificationOpen}
              sx={{
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  transform: 'scale(1.05)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.2, color: 'var(--theme-header-text, white)' }}>
                  {currentUser.firstName} {currentUser.lastName}
                </Typography>
                <Chip
                  size="small"
                  label={getRoleDisplayName(currentUser.role)}
                  color={getRoleColor(currentUser.role)}
                  sx={{
                    height: '18px',
                    fontSize: '10px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white'
                  }}
                />
              </Box>

              <IconButton
                onClick={handleProfileMenuOpen}
                sx={{
                  padding: 0,
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 4px 20px rgba(255, 255, 255, 0.3)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    fontWeight: 'bold'
                  }}
                  src={currentUser.avatar}
                >
                  {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
                </Avatar>
              </IconButton>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Profil Menüsü - Tema Seçici ile */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 340,
            maxWidth: 400,
            maxHeight: '80vh',
            borderRadius: '16px',
            background: 'var(--theme-card-bg, rgba(255, 255, 255, 0.95))',
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--theme-card-border, rgba(0, 0, 0, 0.1))',
            boxShadow: 'var(--theme-card-shadow, 0 8px 32px rgba(0, 0, 0, 0.15))',
            overflow: 'hidden'
          }
        }}
      >
        {/* Kullanıcı Bilgisi */}
        <Box sx={{ p: 2.5, pb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                background: `var(--theme-button-primary)`,
                fontWeight: 'bold'
              }}
              src={currentUser.avatar}
            >
              {currentUser.firstName?.[0]}{currentUser.lastName?.[0]}
            </Avatar>
            <Box>
              <Typography variant="body1" fontWeight="bold" sx={{ color: 'var(--theme-primary)' }}>
                {currentUser.firstName} {currentUser.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                {currentUser.email}
              </Typography>
            </Box>
          </Box>
          <Chip
            size="small"
            label={getRoleDisplayName(currentUser.role)}
            color={getRoleColor(currentUser.role)}
            sx={{ fontSize: '11px' }}
          />
        </Box>

        <Divider />

        {/* Tema Seçici */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box
            onClick={() => setThemeMenuOpen(!themeMenuOpen)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              cursor: 'pointer',
              p: 1.5,
              borderRadius: '10px',
              '&:hover': { background: 'rgba(0, 0, 0, 0.04)' },
              transition: 'all 0.2s ease'
            }}
          >
            <Box sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'var(--theme-button-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <PaletteIcon sx={{ color: 'white', fontSize: 22 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={600}>Tema Seçimi</Typography>
              <Typography variant="caption" color="text.secondary">
                {themeConfig?.name || 'Basic Light'}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: '8px',
                backgroundImage: themeConfig?.preview ? `url(${themeConfig.preview})` : 'var(--theme-button-primary)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '2px solid rgba(0, 0, 0, 0.1)'
              }}
            />
          </Box>

          {/* Tema Listesi */}
          {themeMenuOpen && (
            <Box sx={{
              mt: 1.5,
              maxHeight: 350,
              overflowY: 'auto',
              borderRadius: '12px',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              background: 'rgba(0, 0, 0, 0.02)',
              '&::-webkit-scrollbar': { width: '6px' },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '3px'
              }
            }}>
              {/* Basic Themes */}
              <Box sx={{ p: 1.5, pb: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Temel Temalar
                </Typography>
              </Box>
              {themes.filter(t => t.id.startsWith('basic')).map((theme) => (
                <Box
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    mx: 1,
                    mb: 0.5,
                    borderRadius: '10px',
                    cursor: 'pointer',
                    background: currentTheme === theme.id ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                    border: currentTheme === theme.id ? '1px solid var(--theme-primary)' : '1px solid transparent',
                    '&:hover': { background: 'rgba(0, 0, 0, 0.04)' },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Box sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '8px',
                    background: theme.colors.button.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    {theme.id === 'basic-light' ? (
                      <LightModeIcon sx={{ color: 'white', fontSize: 18 }} />
                    ) : (
                      <DarkModeIcon sx={{ color: 'white', fontSize: 18 }} />
                    )}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight={500}>{theme.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{theme.description}</Typography>
                  </Box>
                  {currentTheme === theme.id && (
                    <CheckIcon sx={{ color: 'var(--theme-primary)', fontSize: 18 }} />
                  )}
                </Box>
              ))}

              {/* Wallpaper Themes */}
              <Box sx={{ p: 1.5, pb: 0.5, pt: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Manzara Temaları
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, p: 1 }}>
                {themes.filter(t => !t.id.startsWith('basic')).map((theme) => (
                  <Box
                    key={theme.id}
                    onClick={() => handleThemeChange(theme.id)}
                    sx={{
                      position: 'relative',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      aspectRatio: '16/10',
                      border: currentTheme === theme.id ? '3px solid var(--theme-primary)' : '2px solid transparent',
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${theme.preview})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)'
                      }}
                    />
                    <Box sx={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      p: 1
                    }}>
                      <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, fontSize: '0.7rem' }}>
                        {theme.name}
                      </Typography>
                    </Box>
                    {currentTheme === theme.id && (
                      <Box sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        bgcolor: 'var(--theme-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <CheckIcon sx={{ color: 'white', fontSize: 14 }} />
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        <Divider />

        <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profilim</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleLogout} sx={{ color: 'error.main', py: 1.5 }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Çıkış Yap</ListItemText>
        </MenuItem>
      </Menu>

      {/* Bildirimler Dialog */}
      <Dialog
        open={notificationDialogOpen}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            background: 'var(--theme-card-bg, rgba(255, 255, 255, 0.95))',
            backdropFilter: 'blur(20px)'
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <NotificationsIcon sx={{ color: 'var(--theme-primary)' }} />
            <Typography variant="h6" fontWeight="bold">
              Bildirimler
            </Typography>
            <Badge badgeContent={unreadCount} color="error" />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={() => markAsRead()}
                sx={{ textTransform: 'none', fontSize: '12px' }}
              >
                Tümünü Okundu İşaretle
              </Button>
            )}
            <IconButton onClick={handleDialogClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">
                Henüz bildirim yok
              </Typography>
            </Box>
          ) : (
            <List>
              {notifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  sx={{
                    mb: 1,
                    borderRadius: '12px',
                    background: notification.read
                      ? 'rgba(0,0,0,0.02)'
                      : 'rgba(var(--theme-primary), 0.05)',
                    border: notification.read
                      ? '1px solid rgba(0,0,0,0.05)'
                      : '1px solid var(--theme-card-border)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      background: 'rgba(0, 0, 0, 0.04)',
                      transform: 'translateY(-1px)'
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{
                      background: 'transparent',
                      width: 40,
                      height: 40
                    }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>

                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight="bold">
                        {notification.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTimeAgo(notification.timestamp)}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {notification.message}
                    </Typography>

                    {!notification.read && (
                      <Chip
                        size="small"
                        label="Yeni"
                        color="primary"
                        sx={{ mt: 1, height: 20, fontSize: '10px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                      />
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AdminHeader;
