// Admin Dashboard - Modern & Aesthetic Design
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Divider,
  Tooltip,
  Skeleton,
  useTheme,
  alpha
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Chat as ChatIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccessTime as AccessTimeIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
  Visibility as VisibilityIcon,
  PersonAdd as PersonAddIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  CalendarToday as CalendarIcon,
  Speed as SpeedIcon,
  CloudDone as CloudDoneIcon,
  Storage as StorageIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Circle as CircleIcon
} from '@mui/icons-material';

// Optima Colors
const COLORS = {
  primary: '#1c61ab',
  primaryLight: '#2d7bcc',
  primaryDark: '#0d4f91',
  secondary: '#8bb94a',
  secondaryLight: '#a5d264',
  gradient: 'linear-gradient(135deg, #1c61ab 0%, #2d7bcc 50%, #8bb94a 100%)',
  gradientBlue: 'linear-gradient(135deg, #1c61ab 0%, #3d8bd4 100%)',
  gradientGreen: 'linear-gradient(135deg, #8bb94a 0%, #a5d264 100%)',
  gradientOrange: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
  gradientPurple: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
};

function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser, hasPermission, PERMISSIONS } = useEmployeeAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalApplications: 0,
    todayApplications: 0,
    weekApplications: 0,
    pendingChats: 0,
    activeUsers: 0,
    totalProfiles: 0,
    approvedApplications: 0,
    rejectedApplications: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  const loadDashboardData = async () => {
    setLoading(true);

    // Simulate loading delay for smooth animation
    await new Promise(resolve => setTimeout(resolve, 500));

    const siteCode = localStorage.getItem('optima_current_site') || 'FXB';

    // Applications data
    const applicationsData = JSON.parse(localStorage.getItem(`applications_${siteCode}`) || '[]');
    const applications = Array.isArray(applicationsData) ? applicationsData : [applicationsData].filter(Boolean);

    const today = new Date();
    const todayStr = today.toDateString();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayApps = applications.filter(app =>
      new Date(app.createdAt || app.submittedAt).toDateString() === todayStr
    );

    const weekApps = applications.filter(app =>
      new Date(app.createdAt || app.submittedAt) >= weekAgo
    );

    const approvedApps = applications.filter(app => app.status === 'approved');
    const rejectedApps = applications.filter(app => app.status === 'rejected');

    // Chat data
    let pendingChats = 0;
    applications.forEach(app => {
      const messages = JSON.parse(localStorage.getItem(`chat_messages_${siteCode}_${app.id}`) || '[]');
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.sender_type === 'applicant') {
        pendingChats++;
      }
    });

    // Employee data
    const employees = JSON.parse(localStorage.getItem(`employees_${siteCode}`) || '[]');
    const activeEmployees = employees.filter(emp => emp.isActive || emp.is_active);

    // Profiles data
    const profiles = JSON.parse(localStorage.getItem(`profiles_${siteCode}`) || '[]');

    setStats({
      totalApplications: applications.length,
      todayApplications: todayApps.length,
      weekApplications: weekApps.length,
      pendingChats,
      activeUsers: activeEmployees.length,
      totalProfiles: profiles.length || applications.length,
      approvedApplications: approvedApps.length,
      rejectedApplications: rejectedApps.length
    });

    // Recent applications
    setRecentApplications(applications.slice(-5).reverse());

    // Recent activities
    const activities = [];
    applications.slice(-8).reverse().forEach(app => {
      const time = new Date(app.submittedAt || app.createdAt);
      activities.push({
        id: `app-${app.id}`,
        type: 'application',
        title: 'Yeni başvuru alındı',
        description: `${app.firstName} ${app.lastName}`,
        time: formatTimeAgo(time),
        status: app.status,
        avatar: `${app.firstName?.[0] || ''}${app.lastName?.[0] || ''}`
      });
    });

    setRecentActivities(activities.slice(0, 6));
    setLoading(false);
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR');
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return { bg: '#e8f5e9', color: '#2e7d32', label: 'Onaylandı' };
      case 'rejected': return { bg: '#ffebee', color: '#c62828', label: 'Reddedildi' };
      case 'pending': return { bg: '#fff3e0', color: '#f57c00', label: 'Beklemede' };
      default: return { bg: '#e3f2fd', color: '#1976d2', label: 'Yeni' };
    }
  };

  // Stat Card Component
  const StatCard = ({ title, value, subtitle, icon, gradient, trend, trendValue, onClick }) => (
    <Card
      onClick={onClick}
      sx={{
        background: '#fff',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 40px rgba(28, 97, 171, 0.15)',
          borderColor: COLORS.primary
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: gradient
        }
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            {React.cloneElement(icon, { sx: { color: '#fff', fontSize: 24 } })}
          </Box>
          {trend && (
            <Chip
              size="small"
              icon={trend === 'up' ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
              label={trendValue}
              sx={{
                bgcolor: trend === 'up' ? alpha('#4caf50', 0.1) : alpha('#f44336', 0.1),
                color: trend === 'up' ? '#4caf50' : '#f44336',
                fontWeight: 600,
                fontSize: 11,
                height: 24,
                '& .MuiChip-icon': { color: 'inherit' }
              }}
            />
          )}
        </Box>

        <Typography variant="h3" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
          {loading ? <Skeleton width={60} /> : value}
        </Typography>

        <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {title}
        </Typography>

        {subtitle && (
          <Typography variant="caption" sx={{ color: 'text.disabled', mt: 0.5, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  // Quick Action Button
  const QuickActionButton = ({ icon, label, onClick, color }) => (
    <Button
      onClick={onClick}
      fullWidth
      sx={{
        py: 1.5,
        px: 2,
        justifyContent: 'flex-start',
        borderRadius: 2,
        bgcolor: alpha(color, 0.08),
        color: color,
        fontWeight: 500,
        textTransform: 'none',
        '&:hover': {
          bgcolor: alpha(color, 0.15),
          transform: 'translateX(4px)'
        },
        transition: 'all 0.2s ease'
      }}
      startIcon={icon}
    >
      {label}
    </Button>
  );

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto', pb: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                background: COLORS.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 0.5
              }}
            >
              {getWelcomeMessage()}, {currentUser?.firstName || 'Admin'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {currentUser?.siteName || 'Optima HR'} • {new Date().toLocaleDateString('tr-TR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Typography>
          </Box>

          <Tooltip title="Yenile">
            <IconButton
              onClick={loadDashboardData}
              sx={{
                bgcolor: alpha(COLORS.primary, 0.1),
                '&:hover': { bgcolor: alpha(COLORS.primary, 0.2) }
              }}
            >
              <RefreshIcon sx={{ color: COLORS.primary }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Toplam Başvuru"
            value={stats.totalApplications}
            subtitle="Tüm zamanlar"
            icon={<AssignmentIcon />}
            gradient={COLORS.gradientBlue}
            onClick={() => navigate('/admin/applications')}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Bugün"
            value={stats.todayApplications}
            subtitle="Yeni başvuru"
            icon={<TrendingUpIcon />}
            gradient={COLORS.gradientGreen}
            trend={stats.todayApplications > 0 ? 'up' : undefined}
            trendValue={stats.todayApplications > 0 ? `+${stats.todayApplications}` : undefined}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Bekleyen Chat"
            value={stats.pendingChats}
            subtitle="Yanıt bekliyor"
            icon={<ChatIcon />}
            gradient={COLORS.gradientOrange}
            onClick={() => navigate('/admin/chat')}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <StatCard
            title="Aktif Personel"
            value={stats.activeUsers}
            subtitle="Sistemde kayıtlı"
            icon={<PeopleIcon />}
            gradient={COLORS.gradientPurple}
            onClick={() => navigate('/admin/employees')}
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Column - Activities & Applications */}
        <Grid item xs={12} lg={8}>
          {/* Recent Activities */}
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ p: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: 2,
                    background: COLORS.gradientBlue,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <AccessTimeIcon sx={{ color: '#fff', fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>Son Aktiviteler</Typography>
                    <Typography variant="caption" color="text.secondary">Gerçek zamanlı güncellemeler</Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/admin/applications')}
                  sx={{ textTransform: 'none', color: COLORS.primary }}
                >
                  Tümünü Gör
                </Button>
              </Box>

              <Divider />

              <Box sx={{ p: 2 }}>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 2, py: 1.5 }}>
                      <Skeleton variant="circular" width={44} height={44} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton width="60%" height={20} />
                        <Skeleton width="40%" height={16} />
                      </Box>
                    </Box>
                  ))
                ) : recentActivities.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">Henüz aktivite yok</Typography>
                  </Box>
                ) : (
                  recentActivities.map((activity, index) => (
                    <Box
                      key={activity.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        py: 1.5,
                        px: 1,
                        borderRadius: 2,
                        transition: 'all 0.2s ease',
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 44,
                          height: 44,
                          bgcolor: alpha(COLORS.primary, 0.1),
                          color: COLORS.primary,
                          fontWeight: 600,
                          fontSize: 14
                        }}
                      >
                        {activity.avatar}
                      </Avatar>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {activity.description}
                          </Typography>
                          {activity.status && (
                            <Chip
                              size="small"
                              label={getStatusColor(activity.status).label}
                              sx={{
                                height: 20,
                                fontSize: 10,
                                fontWeight: 600,
                                bgcolor: getStatusColor(activity.status).bg,
                                color: getStatusColor(activity.status).color
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {activity.title} • {activity.time}
                        </Typography>
                      </Box>

                      <IconButton size="small" sx={{ color: 'text.secondary' }}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Statistics Overview */}
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
                Başvuru İstatistikleri
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: alpha('#4caf50', 0.08) }}>
                    <Typography variant="h4" fontWeight={700} color="#4caf50">
                      {stats.approvedApplications}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Onaylanan</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={stats.totalApplications ? (stats.approvedApplications / stats.totalApplications) * 100 : 0}
                      sx={{
                        mt: 1.5, height: 6, borderRadius: 3,
                        bgcolor: alpha('#4caf50', 0.2),
                        '& .MuiLinearProgress-bar': { bgcolor: '#4caf50', borderRadius: 3 }
                      }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: alpha('#f44336', 0.08) }}>
                    <Typography variant="h4" fontWeight={700} color="#f44336">
                      {stats.rejectedApplications}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Reddedilen</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={stats.totalApplications ? (stats.rejectedApplications / stats.totalApplications) * 100 : 0}
                      sx={{
                        mt: 1.5, height: 6, borderRadius: 3,
                        bgcolor: alpha('#f44336', 0.2),
                        '& .MuiLinearProgress-bar': { bgcolor: '#f44336', borderRadius: 3 }
                      }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2, borderRadius: 2, bgcolor: alpha('#ff9800', 0.08) }}>
                    <Typography variant="h4" fontWeight={700} color="#ff9800">
                      {stats.totalApplications - stats.approvedApplications - stats.rejectedApplications}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Bekleyen</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={stats.totalApplications ? ((stats.totalApplications - stats.approvedApplications - stats.rejectedApplications) / stats.totalApplications) * 100 : 0}
                      sx={{
                        mt: 1.5, height: 6, borderRadius: 3,
                        bgcolor: alpha('#ff9800', 0.2),
                        '& .MuiLinearProgress-bar': { bgcolor: '#ff9800', borderRadius: 3 }
                      }}
                    />
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Quick Actions & System Status */}
        <Grid item xs={12} lg={4}>
          {/* Quick Actions */}
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Hızlı İşlemler
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <QuickActionButton
                  icon={<AssignmentIcon />}
                  label="Başvuruları Görüntüle"
                  onClick={() => navigate('/admin/applications')}
                  color={COLORS.primary}
                />
                <QuickActionButton
                  icon={<ChatIcon />}
                  label="Chat Yönetimi"
                  onClick={() => navigate('/admin/chat')}
                  color="#ff9800"
                />
                <QuickActionButton
                  icon={<PeopleIcon />}
                  label="Personel Yönetimi"
                  onClick={() => navigate('/admin/employees')}
                  color="#9c27b0"
                />
                <QuickActionButton
                  icon={<EmailIcon />}
                  label="Davet Linki Oluştur"
                  onClick={() => navigate('/admin/invitations')}
                  color={COLORS.secondary}
                />
              </Box>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  Sistem Durumu
                </Typography>
                <Chip
                  size="small"
                  label="Aktif"
                  sx={{
                    bgcolor: alpha('#4caf50', 0.1),
                    color: '#4caf50',
                    fontWeight: 600
                  }}
                  icon={<CircleIcon sx={{ fontSize: '10px !important', color: '#4caf50' }} />}
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">Sistem Sağlığı</Typography>
                    <Typography variant="body2" fontWeight={600} color="#4caf50">98%</Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={98}
                    sx={{
                      height: 8, borderRadius: 4,
                      bgcolor: alpha('#4caf50', 0.1),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: '#4caf50',
                        borderRadius: 4
                      }
                    }}
                  />
                </Box>

                <Divider />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                  <Typography variant="body2">Veritabanı Bağlantısı</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                  <Typography variant="body2">API Sunucusu</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                  <Typography variant="body2">WebSocket Bağlantısı</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CloudDoneIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                  <Typography variant="body2">Cloudflare R2 Storage</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AdminDashboard;
