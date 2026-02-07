// Admin Dashboard - Role-based dashboard
import React, { useState, useEffect } from 'react';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Chat as ChatIcon,
  TrendingUp as TrendingUpIcon,
  Notifications as NotificationsIcon,
  AccessTime as AccessTimeIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

function AdminDashboard() {
  const { currentUser, hasPermission, PERMISSIONS, EMPLOYEE_ROLES } = useEmployeeAuth();
  const [stats, setStats] = useState({
    totalApplications: 0,
    todayApplications: 0,
    pendingChats: 0,
    activeUsers: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  const loadDashboardData = () => {
    const siteCode = localStorage.getItem('optima_current_site') || 'FXB';

    // Applications data (site-specific)
    const applicationsData = JSON.parse(localStorage.getItem(`applications_${siteCode}`) || '[]');
    // Ensure applications is always an array
    const applications = Array.isArray(applicationsData) ? applicationsData : [applicationsData].filter(Boolean);
    const today = new Date().toDateString();
    const todayApps = applications.filter(app =>
      new Date(app.createdAt).toDateString() === today
    );

    // Chat data - her applicant için chat mesajı var mı kontrol et
    let pendingChats = 0;
    applications.forEach(app => {
      const messages = JSON.parse(localStorage.getItem(`chat_messages_${siteCode}_${app.id}`) || '[]');
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.sender_type === 'applicant') {
        pendingChats++;
      }
    });

    // Employee data (site-specific)
    const employees = JSON.parse(localStorage.getItem(`employees_${siteCode}`) || '[]');
    const activeEmployees = employees.filter(emp => emp.isActive);

    setStats({
      totalApplications: applications.length,
      todayApplications: todayApps.length,
      pendingChats,
      activeUsers: activeEmployees.length
    });

    // Recent activities - gerçek verilerden oluştur
    const activities = [];
    
    // Başvurulardan aktiviteler
    applications.slice(-5).reverse().forEach(app => {
      const time = new Date(app.submittedAt || app.createdAt);
      const now = new Date();
      const diffMs = now - time;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      
      let timeStr = '';
      if (diffDays > 0) {
        timeStr = `${diffDays} gün önce`;
      } else if (diffHours > 0) {
        timeStr = `${diffHours} saat önce`;
      } else {
        timeStr = `${Math.floor(diffMs / (1000 * 60))} dakika önce`;
      }
      
      activities.push({
        id: `app-${app.id}`,
        type: 'application',
        message: 'Yeni başvuru alındı',
        time: timeStr,
        user: `${app.firstName} ${app.lastName}`,
        status: app.status
      });
    });
    
    // Çalışanlardan aktiviteler (İşe alınanlar/çıkarılanlar)
    employees.slice(-3).forEach(emp => {
      if (emp.hire_date) {
        const hireDate = new Date(emp.hire_date);
        const now = new Date();
        const diffDays = Math.floor((now - hireDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 30) { // Son 30 gündeki işe alımlar
          activities.push({
            id: `emp-${emp.id}`,
            type: 'employee',
            message: emp.is_active ? 'Çalışan işe alındı' : 'Çalışan işten çıkarıldı',
            time: `${diffDays} gün önce`,
            user: `${emp.first_name} ${emp.last_name}`,
            status: emp.is_active ? 'active' : 'inactive'
          });
        }
      }
    });
    
    // Sırala ve ilk 10 aktiviteyi al
    activities.sort((a, b) => {
      // Zamanları karşılaştır (dakika/saat/gün)
      const getMinutes = (timeStr) => {
        if (timeStr.includes('dakika')) return parseInt(timeStr);
        if (timeStr.includes('saat')) return parseInt(timeStr) * 60;
        if (timeStr.includes('gün')) return parseInt(timeStr) * 24 * 60;
        return 999999;
      };
      return getMinutes(a.time) - getMinutes(b.time);
    });

    setRecentActivities(activities.slice(0, 10));
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    let greeting = '';
    
    if (hour < 12) greeting = 'Günaydın';
    else if (hour < 18) greeting = 'İyi günler';
    else greeting = 'İyi akşamlar';
    
    return `${greeting}, ${currentUser.firstName}`;
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{
      background: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(28, 97, 171, 0.1)',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 40px rgba(28, 97, 171, 0.2)'
      }
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" fontWeight="bold" color={color}>
              {value}
            </Typography>
            <Typography variant="body1" color="text.primary" fontWeight="medium">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{
            background: `linear-gradient(135deg, ${color}, ${color}90)`,
            width: 56,
            height: 56
          }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ maxWidth: '1400px', mx: 'auto' }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{
          background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold'
        }}>
          {getWelcomeMessage()}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {currentUser.siteName} - {new Date().toLocaleDateString('tr-TR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Toplam Başvuru"
            value={stats.totalApplications}
            icon={<AssignmentIcon />}
            color="#1c61ab"
            subtitle="Tüm zamanlar"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Bugünkü Başvuru"
            value={stats.todayApplications}
            icon={<TrendingUpIcon />}
            color="#8bb94a"
            subtitle="Son 24 saat"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Bekleyen Chat"
            value={stats.pendingChats}
            icon={<ChatIcon />}
            color="#ff9800"
            subtitle="Yanıt bekliyor"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Aktif Kullanıcı"
            value={stats.activeUsers}
            icon={<PeopleIcon />}
            color="#9c27b0"
            subtitle="Sistem kullanıcıları"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Son Aktiviteler */}
        <Grid item xs={12} md={8}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(28, 97, 171, 0.1)'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccessTimeIcon sx={{ mr: 1, color: '#1c61ab' }} />
                <Typography variant="h6" fontWeight="bold">
                  Son Aktiviteler
                </Typography>
              </Box>
              
              <List>
                {recentActivities.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{
                          background: activity.type === 'application' ? '#1c61ab' :
                                    activity.type === 'chat' ? '#8bb94a' : 
                                    activity.type === 'employee' ? '#ff9800' : '#9c27b0',
                          width: 40,
                          height: 40
                        }}>
                          {activity.type === 'application' && <AssignmentIcon />}
                          {activity.type === 'chat' && <ChatIcon />}
                          {activity.type === 'employee' && <PeopleIcon />}
                          {activity.type === 'system' && <SecurityIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2">{activity.message}</Typography>
                            {activity.status === 'approved' && (
                              <Chip label="Onaylanmış" color="success" size="small" sx={{ height: 20 }} />
                            )}
                            {activity.status === 'rejected' && (
                              <Chip label="Reddedilmiş" color="error" size="small" sx={{ height: 20 }} />
                            )}
                            {activity.status === 'active' && (
                              <Chip label="Aktif" color="success" size="small" sx={{ height: 20 }} />
                            )}
                            {activity.status === 'inactive' && (
                              <Chip label="Pasif" color="default" size="small" sx={{ height: 20 }} />
                            )}
                          </Box>
                        }
                        secondary={`${activity.user} • ${activity.time}`}
                      />
                    </ListItem>
                    {index < recentActivities.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Hızlı İşlemler */}
        <Grid item xs={12} md={4}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(28, 97, 171, 0.1)',
            mb: 3
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Hızlı İşlemler
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {hasPermission(PERMISSIONS.VIEW_ALL_APPLICATIONS) && (
                  <Button 
                    variant="outlined" 
                    startIcon={<AssignmentIcon />}
                    href="/admin/applications"
                    fullWidth
                  >
                    Başvuruları Görüntüle
                  </Button>
                )}
                
                {hasPermission(PERMISSIONS.VIEW_CHAT) && (
                  <Button 
                    variant="outlined" 
                    startIcon={<ChatIcon />}
                    href="/admin/chat"
                    fullWidth
                  >
                    Chat Yönetimi
                  </Button>
                )}
                
                {hasPermission(PERMISSIONS.MANAGE_USERS) && (
                  <Button 
                    variant="outlined" 
                    startIcon={<PeopleIcon />}
                    href="/admin/users"
                    fullWidth
                  >
                    Kullanıcı Yönetimi
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Sistem Durumu */}
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(28, 97, 171, 0.1)'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Sistem Durumu
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Sistem Sağlığı</Typography>
                  <Typography variant="body2" color="success.main">98%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={98} 
                  color="success"
                  sx={{ borderRadius: '4px' }}
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircleIcon color="success" fontSize="small" />
                <Typography variant="body2">Veritabanı Bağlantısı</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <CheckCircleIcon color="success" fontSize="small" />
                <Typography variant="body2">Güvenlik Duvarı</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon color="success" fontSize="small" />
                <Typography variant="body2">Backup Sistemi</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AdminDashboard;
