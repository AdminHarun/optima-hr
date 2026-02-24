// Admin Dashboard - Horizontal Modern Design
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
  alpha,
  Stack
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Chat as ChatIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as VisibilityIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
  Circle as CircleIcon,
  CloudDone as CloudDoneIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';

// Optima Colors
const COLORS = {
  primary: '#1c61ab',
  secondary: '#8bb94a',
  gradient: 'linear-gradient(135deg, #1c61ab 0%, #2d7bcc 50%, #8bb94a 100%)',
  gradientBlue: 'linear-gradient(135deg, #1c61ab 0%, #3d8bd4 100%)',
  gradientGreen: 'linear-gradient(135deg, #8bb94a 0%, #a5d264 100%)',
  gradientOrange: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
  gradientPurple: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
};

function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useEmployeeAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalApplications: 0,
    todayApplications: 0,
    pendingChats: 0,
    activeUsers: 0,
    approvedApplications: 0,
    rejectedApplications: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, [currentUser]);

  const loadDashboardData = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    const siteCode = localStorage.getItem('optima_current_site') || 'FXB';
    const applicationsData = JSON.parse(localStorage.getItem(`applications_${siteCode}`) || '[]');
    const applications = Array.isArray(applicationsData) ? applicationsData : [applicationsData].filter(Boolean);

    const today = new Date().toDateString();
    const todayApps = applications.filter(app =>
      new Date(app.createdAt || app.submittedAt).toDateString() === today
    );

    let pendingChats = 0;
    applications.forEach(app => {
      const messages = JSON.parse(localStorage.getItem(`chat_messages_${siteCode}_${app.id}`) || '[]');
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.sender_type === 'applicant') pendingChats++;
    });

    const employees = JSON.parse(localStorage.getItem(`employees_${siteCode}`) || '[]');
    const activeEmployees = employees.filter(emp => emp.isActive || emp.is_active);

    const approvedApps = applications.filter(app => app.status === 'approved');
    const rejectedApps = applications.filter(app => app.status === 'rejected');

    setStats({
      totalApplications: applications.length,
      todayApplications: todayApps.length,
      pendingChats,
      activeUsers: activeEmployees.length,
      approvedApplications: approvedApps.length,
      rejectedApplications: rejectedApps.length
    });

    const activities = applications.slice(-6).reverse().map(app => ({
      id: `app-${app.id}`,
      name: `${app.firstName} ${app.lastName}`,
      time: formatTimeAgo(new Date(app.submittedAt || app.createdAt)),
      status: app.status,
      avatar: `${app.firstName?.[0] || ''}${app.lastName?.[0] || ''}`
    }));

    setRecentActivities(activities);
    setLoading(false);
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dk`;
    if (diffHours < 24) return `${diffHours} saat`;
    if (diffDays < 7) return `${diffDays} gün`;
    return date.toLocaleDateString('tr-TR');
  };

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  };

  const getStatusChip = (status) => {
    const config = {
      approved: { bg: '#e8f5e9', color: '#2e7d32', label: 'Onay' },
      rejected: { bg: '#ffebee', color: '#c62828', label: 'Red' },
      pending: { bg: '#fff3e0', color: '#f57c00', label: 'Bekl' },
      default: { bg: '#e3f2fd', color: '#1976d2', label: 'Yeni' }
    };
    const c = config[status] || config.default;
    return <Chip label={c.label} size="small" sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: c.bg, color: c.color }} />;
  };

  // Compact Stat Card
  const StatCard = ({ title, value, icon, gradient, onClick }) => (
    <Card
      onClick={onClick}
      sx={{
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
          borderColor: COLORS.primary
        } : {}
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {React.cloneElement(icon, { sx: { color: '#fff', fontSize: 20 } })}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" fontWeight={700} color="text.primary" lineHeight={1}>
              {loading ? <Skeleton width={40} /> : value}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {title}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // Quick Link Button
  const QuickLink = ({ icon, label, onClick, color }) => (
    <Button
      onClick={onClick}
      sx={{
        flex: 1,
        py: 1.5,
        px: 2,
        borderRadius: 2,
        bgcolor: alpha(color, 0.08),
        color: color,
        fontWeight: 500,
        fontSize: '0.8rem',
        textTransform: 'none',
        minWidth: 0,
        '&:hover': { bgcolor: alpha(color, 0.15) }
      }}
      startIcon={icon}
    >
      {label}
    </Button>
  );

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
      {/* Header Row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              background: COLORS.gradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            {getWelcomeMessage()}, {currentUser?.firstName || 'Admin'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Typography>
        </Box>
        <Tooltip title="Yenile">
          <IconButton onClick={loadDashboardData} sx={{ bgcolor: alpha(COLORS.primary, 0.08) }}>
            <RefreshIcon sx={{ color: COLORS.primary }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats Row - Horizontal */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Toplam Başvuru"
            value={stats.totalApplications}
            icon={<AssignmentIcon />}
            gradient={COLORS.gradientBlue}
            onClick={() => navigate('/admin/applications')}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Bugün Gelen"
            value={stats.todayApplications}
            icon={<TrendingUpIcon />}
            gradient={COLORS.gradientGreen}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Bekleyen Chat"
            value={stats.pendingChats}
            icon={<ChatIcon />}
            gradient={COLORS.gradientOrange}
            onClick={() => navigate('/admin/chat')}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="Aktif Personel"
            value={stats.activeUsers}
            icon={<PeopleIcon />}
            gradient={COLORS.gradientPurple}
            onClick={() => navigate('/admin/employees')}
          />
        </Grid>
      </Grid>

      {/* Quick Actions Row */}
      <Card sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', mb: 3 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction="row" spacing={1.5}>
            <QuickLink icon={<AssignmentIcon />} label="Başvurular" onClick={() => navigate('/admin/applications')} color={COLORS.primary} />
            <QuickLink icon={<ChatIcon />} label="Mesajlar" onClick={() => navigate('/admin/chat')} color="#ff9800" />
            <QuickLink icon={<PeopleIcon />} label="Personel" onClick={() => navigate('/admin/employees')} color="#9c27b0" />
            <QuickLink icon={<EmailIcon />} label="Davetler" onClick={() => navigate('/admin/invitations')} color={COLORS.secondary} />
          </Stack>
        </CardContent>
      </Card>

      {/* Main Content - Horizontal Layout */}
      <Grid container spacing={2}>
        {/* Recent Activities */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon sx={{ color: COLORS.primary, fontSize: 20 }} />
                  <Typography variant="subtitle1" fontWeight={600}>Son Başvurular</Typography>
                </Box>
                <Button
                  size="small"
                  endIcon={<ChevronRightIcon />}
                  onClick={() => navigate('/admin/applications')}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Tümü
                </Button>
              </Box>

              {loading ? (
                [...Array(4)].map((_, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.5, py: 1 }}>
                    <Skeleton variant="circular" width={32} height={32} />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton width="60%" height={16} />
                      <Skeleton width="30%" height={12} />
                    </Box>
                  </Box>
                ))
              ) : recentActivities.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  Henüz başvuru yok
                </Typography>
              ) : (
                <Stack spacing={0.5}>
                  {recentActivities.map((act) => (
                    <Box
                      key={act.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        py: 1,
                        px: 1,
                        borderRadius: 1.5,
                        '&:hover': { bgcolor: 'action.hover' }
                      }}
                    >
                      <Avatar sx={{ width: 32, height: 32, fontSize: 12, bgcolor: alpha(COLORS.primary, 0.1), color: COLORS.primary }}>
                        {act.avatar}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={500} noWrap>{act.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{act.time}</Typography>
                      </Box>
                      {getStatusChip(act.status)}
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Statistics + System Status */}
        <Grid item xs={12} md={6}>
          <Grid container spacing={2}>
            {/* Application Stats */}
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                    Başvuru Durumları
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Box sx={{ flex: 1, textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: alpha('#4caf50', 0.08) }}>
                      <Typography variant="h5" fontWeight={700} color="#4caf50">{stats.approvedApplications}</Typography>
                      <Typography variant="caption" color="text.secondary">Onaylanan</Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: alpha('#f44336', 0.08) }}>
                      <Typography variant="h5" fontWeight={700} color="#f44336">{stats.rejectedApplications}</Typography>
                      <Typography variant="caption" color="text.secondary">Reddedilen</Typography>
                    </Box>
                    <Box sx={{ flex: 1, textAlign: 'center', p: 1.5, borderRadius: 2, bgcolor: alpha('#ff9800', 0.08) }}>
                      <Typography variant="h5" fontWeight={700} color="#ff9800">
                        {stats.totalApplications - stats.approvedApplications - stats.rejectedApplications}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Bekleyen</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* System Status */}
            <Grid item xs={12}>
              <Card sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight={600}>Sistem Durumu</Typography>
                    <Chip
                      size="small"
                      label="Aktif"
                      icon={<CircleIcon sx={{ fontSize: '8px !important', color: '#4caf50' }} />}
                      sx={{ bgcolor: alpha('#4caf50', 0.1), color: '#4caf50', fontWeight: 600, height: 24 }}
                    />
                  </Box>
                  <Stack direction="row" spacing={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 16 }} />
                      <Typography variant="caption">Veritabanı</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 16 }} />
                      <Typography variant="caption">API</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 16 }} />
                      <Typography variant="caption">WebSocket</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CloudDoneIcon sx={{ color: '#4caf50', fontSize: 16 }} />
                      <Typography variant="caption">R2</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}

export default AdminDashboard;
