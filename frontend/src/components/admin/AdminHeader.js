// Admin Header - Sohbetler ve Bildirimler ile genişletilmiş
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
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
  CalendarToday as CalendarIcon
} from '@mui/icons-material';

function AdminHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, hasPermission, PERMISSIONS } = useEmployeeAuth();
  
  // Menu states
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  
  // Bildirim context'inden gercek zamanli bildirimler
  const { unreadCount: unreadMessages, notifications: contextNotifications, markAsRead } = useNotifications();
  const unreadMails = 0;

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
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

  // Context'ten gelen bildirimleri formatlayarak göster
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

  // Chrome tarzı tab componenti
  const ChromeTab = ({ label, icon, badge, isActive, onClick }) => (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        minWidth: 120,
        height: 36,
        cursor: 'pointer',
        userSelect: 'none',
        
        // Arka plan ve köşeler
        background: isActive 
          ? 'rgba(255, 255, 255, 0.95)' 
          : 'rgba(255, 255, 255, 0.1)',
        borderRadius: '10px 10px 0 0',
        
        // Kenarlık
        borderTop: isActive ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
        borderLeft: isActive ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
        borderRight: isActive ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
        
        // Hover efekti
        '&:hover': {
          background: isActive 
            ? 'rgba(255, 255, 255, 0.95)'
            : 'rgba(255, 255, 255, 0.2)',
        },
        
        // Geçiş animasyonu
        transition: 'all 0.2s ease',
        
        // Aktif tab'ın alt tarafını header ile birleştir
        marginBottom: isActive ? '-1px' : 0,
        zIndex: isActive ? 2 : 1,
        
        // Chrome tab şekli için pseudo elements
        '&::before': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: -8,
          width: 8,
          height: 8,
          background: 'transparent',
          borderBottomRightRadius: '8px',
          boxShadow: isActive ? '4px 4px 0 0 rgba(255, 255, 255, 0.95)' : 'none',
          display: isActive ? 'block' : 'none'
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          right: -8,
          width: 8,
          height: 8,
          background: 'transparent',
          borderBottomLeftRadius: '8px',
          boxShadow: isActive ? '-4px 4px 0 0 rgba(255, 255, 255, 0.95)' : 'none',
          display: isActive ? 'block' : 'none'
        }
      }}
    >
      {/* İkon */}
      <Box sx={{ 
        color: isActive ? '#1c61ab' : 'white',
        display: 'flex',
        alignItems: 'center'
      }}>
        {icon}
      </Box>
      
      {/* Label */}
      <Typography 
        variant="body2" 
        sx={{ 
          color: isActive ? '#1c61ab' : 'white',
          fontWeight: isActive ? 600 : 500,
          fontSize: '0.9rem'
        }}
      >
        {label}
      </Typography>
      
      {/* Badge */}
      {badge > 0 && (
        <Badge 
          badgeContent={badge} 
          color="error"
          sx={{ 
            '& .MuiBadge-badge': { 
              fontSize: '0.65rem',
              height: 16,
              minWidth: 16,
              right: -6,
              top: 6
            }
          }}
        />
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
          background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.95), rgba(139, 185, 74, 0.95))',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(28, 97, 171, 0.2)'
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: 3, pl: { xs: 2, md: 3 }, minHeight: '56px !important', WebkitAppRegion: 'drag' }}>
          {/* Sol Taraf - Site Seçici + Sekmeler (Yatay) */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            WebkitAppRegion: 'no-drag'
          }}>
            {/* Site Seçici */}
            <SiteSelector />

            {/* Sekmeler - Site seçicinin sağında yatay */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
              <ChromeTab
                label="Mesajlar"
                icon={<ChatIcon sx={{ fontSize: 18 }} />}
                badge={unreadMessages}
                isActive={location.pathname === '/admin/chat'}
                onClick={() => { markAsRead(); navigate('/admin/chat'); }}
              />

              <ChromeTab
                label="Mail"
                icon={<MailIcon sx={{ fontSize: 18 }} />}
                badge={unreadMails}
                isActive={location.pathname === '/admin/mail'}
                onClick={() => navigate('/admin/mail')}
              />

              <ChromeTab
                label="Aramalar"
                icon={<VideoCallIcon sx={{ fontSize: 18 }} />}
                badge={0}
                isActive={location.pathname === '/admin/calls'}
                onClick={() => navigate('/admin/calls')}
              />

              <ChromeTab
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

            {/* Bildirimler */}
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

            {/* Kullanıcı Profili */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              
              {/* Kullanıcı Bilgileri */}
              <Box sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.2, color: 'white' }}>
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

              {/* Avatar */}
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

      {/* Profil Menüsü */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 280,
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(28, 97, 171, 0.1)',
            boxShadow: '0 8px 32px rgba(28, 97, 171, 0.2)'
          }
        }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <Typography variant="body1" fontWeight="bold">
            {currentUser.firstName} {currentUser.lastName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {currentUser.email}
          </Typography>
          <Chip
            size="small"
            label={getRoleDisplayName(currentUser.role)}
            color={getRoleColor(currentUser.role)}
            sx={{ mt: 1, fontSize: '11px' }}
          />
        </Box>
        
        <Divider />
        
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Profilim</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
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
            background: 'rgba(255, 255, 255, 0.95)',
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
            <NotificationsIcon sx={{ color: '#1c61ab' }} />
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
                    : 'rgba(28, 97, 171, 0.05)',
                  border: notification.read 
                    ? '1px solid rgba(0,0,0,0.05)'
                    : '1px solid rgba(28, 97, 171, 0.1)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: 'rgba(28, 97, 171, 0.08)',
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