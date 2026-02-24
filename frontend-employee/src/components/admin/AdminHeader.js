// Admin Header - Liquid Glass Theme with Elegant Tabs
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
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  Avatar
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Chat as ChatIcon,
  Mail as MailIcon,
  Close as CloseIcon,
  Info as InfoIcon,
  VideoCall as VideoCallIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material';

function AdminHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useEmployeeAuth();

  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);

  // Bildirim context'inden gercek zamanli bildirimler
  const { unreadCount: unreadMessages, notifications: contextNotifications, markAsRead } = useNotifications();
  const unreadMails = 0;

  const handleNotificationOpen = () => {
    setNotificationDialogOpen(true);
  };

  const handleDialogClose = () => {
    setNotificationDialogOpen(false);
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
        <Toolbar sx={{ px: 3, minHeight: '64px !important', WebkitAppRegion: 'drag' }}>
          {/* Sol Taraf - Site Seçici (Sabit) */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            WebkitAppRegion: 'no-drag',
            minWidth: 180
          }}>
            <SiteSelector />
          </Box>

          {/* Orta - Sekmeler (Ortalanmış) */}
          <Box sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            WebkitAppRegion: 'no-drag'
          }}>
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

          {/* Sağ Taraf - Bildirimler */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, WebkitAppRegion: 'no-drag', minWidth: 180, justifyContent: 'flex-end' }}>
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
          </Box>
        </Toolbar>
      </AppBar>

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
