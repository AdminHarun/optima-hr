import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Avatar, Chip,
  LinearProgress, IconButton, Tooltip, Skeleton
} from '@mui/material';
import {
  People as PeopleIcon,
  Apps as AppsIcon,
  Security as SecurityIcon,
  TrendingUp as TrendingUpIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  PersonAdd as PersonAddIcon,
  Shield as ShieldIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import { API_BASE_URL, APPS } from '../config';

function StatCard({ icon, title, value, subtitle, color, trend }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Avatar sx={{
            width: 48, height: 48, borderRadius: '14px',
            background: `linear-gradient(135deg, ${color}20, ${color}40)`,
            color: color
          }}>
            {icon}
          </Avatar>
          {trend && (
            <Chip
              size="small"
              icon={<TrendingUpIcon sx={{ fontSize: 14 }} />}
              label={trend}
              sx={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                color: '#22c55e', fontWeight: 600, fontSize: '0.75rem',
                height: 26, '& .MuiChip-icon': { color: '#22c55e' }
              }}
            />
          )}
        </Box>
        <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: '#475569', mt: 0.5, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function AppCard({ app, status }) {
  return (
    <Card sx={{
      cursor: 'pointer', transition: 'all 0.3s ease',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 40px rgba(0,0,0,0.3)' }
    }}
      onClick={() => window.open(app.url, '_blank')}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
          }}>
            <AppsIcon sx={{ fontSize: 24 }} />
          </Avatar>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              size="small"
              icon={status === 'active' ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <WarningIcon sx={{ fontSize: 14 }} />}
              label={status === 'active' ? 'Aktif' : 'Sorun'}
              sx={{
                backgroundColor: status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: status === 'active' ? '#22c55e' : '#f59e0b',
                fontWeight: 600, fontSize: '0.7rem', height: 24,
                '& .MuiChip-icon': { color: status === 'active' ? '#22c55e' : '#f59e0b' }
              }}
            />
            <Tooltip title="Uygulamayı aç">
              <IconButton size="small" sx={{ color: '#64748b' }}>
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Typography variant="subtitle1" sx={{ color: '#f1f5f9', fontWeight: 600, mb: 0.5 }}>
          {app.name}
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.8rem' }}>
          {app.description}
        </Typography>
        <Typography variant="caption" sx={{ color: '#475569', mt: 1, display: 'block' }}>
          {app.url.replace('https://', '')}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/management/users`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          const users = data.data || data || [];
          setStats({
            totalUsers: Array.isArray(users) ? users.length : 0,
            activeUsers: Array.isArray(users) ? users.filter(u => u.is_active).length : 0,
            twoFaUsers: Array.isArray(users) ? users.filter(u => u.two_factor_enabled).length : 0,
          });
        }
      } catch (err) {
        console.error('Stats fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const securityScore = stats ? Math.round(((stats.twoFaUsers || 0) / Math.max(stats.totalUsers, 1)) * 100) : 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 1 }}>
          Genel Bakış
        </Typography>
        <Typography variant="body1" sx={{ color: '#64748b' }}>
          Optima HR organizasyonunuza hoş geldiniz, {user?.first_name}
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Card sx={{ mb: 4, background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.1), rgba(139, 185, 74, 0.05))' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 2, fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 1 }}>
            Hızlı İşlemler
          </Typography>
          <Grid container spacing={2}>
            {[
              { icon: <PersonAddIcon />, label: 'Kullanıcı Davet Et', color: '#3b82f6' },
              { icon: <AppsIcon />, label: 'Uygulama Ekle', color: '#8bb94a' },
              { icon: <ShieldIcon />, label: 'Güvenlik Kontrolü', color: '#f59e0b' },
            ].map((action, i) => (
              <Grid item xs={12} sm={4} key={i}>
                <Box sx={{
                  p: 2, borderRadius: '12px', textAlign: 'center',
                  border: '1px solid rgba(71, 85, 105, 0.3)',
                  cursor: 'pointer', transition: 'all 0.2s',
                  '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: action.color }
                }}>
                  <Box sx={{ color: action.color, mb: 1 }}>{action.icon}</Box>
                  <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 500, fontSize: '0.85rem' }}>
                    {action.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PeopleIcon />}
            title="Toplam Kullanıcı"
            value={loading ? '...' : stats?.totalUsers || 0}
            color="#3b82f6"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PeopleIcon />}
            title="Aktif Kullanıcı"
            value={loading ? '...' : stats?.activeUsers || 0}
            color="#22c55e"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<SecurityIcon />}
            title="2FA Etkin"
            value={loading ? '...' : stats?.twoFaUsers || 0}
            subtitle={`Güvenlik skoru: %${securityScore}`}
            color="#f59e0b"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<AppsIcon />}
            title="Uygulama"
            value="3"
            subtitle="HR Panel, Kariyer, Çalışan"
            color="#8bb94a"
          />
        </Grid>
      </Grid>

      {/* Apps */}
      <Typography variant="h6" sx={{ color: '#f1f5f9', mb: 2, fontWeight: 600 }}>
        Uygulamalar
      </Typography>
      <Grid container spacing={3}>
        {Object.values(APPS).map((app, i) => (
          <Grid item xs={12} md={4} key={i}>
            <AppCard app={app} status="active" />
          </Grid>
        ))}
      </Grid>

      {/* Güvenlik Skoru */}
      <Card sx={{ mt: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ color: '#f1f5f9', fontWeight: 600 }}>
              Güvenlik Durumu
            </Typography>
            <Chip
              size="small"
              label={securityScore >= 80 ? 'İyi' : securityScore >= 50 ? 'Orta' : 'Düşük'}
              sx={{
                backgroundColor: securityScore >= 80 ? 'rgba(34, 197, 94, 0.1)' : securityScore >= 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: securityScore >= 80 ? '#22c55e' : securityScore >= 50 ? '#f59e0b' : '#ef4444',
                fontWeight: 600
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <LinearProgress
                variant="determinate" value={securityScore}
                sx={{
                  height: 8, borderRadius: 4,
                  backgroundColor: 'rgba(71, 85, 105, 0.3)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                    background: securityScore >= 80
                      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                      : securityScore >= 50
                        ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                        : 'linear-gradient(90deg, #ef4444, #dc2626)'
                  }
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#f1f5f9', fontWeight: 700, minWidth: 40 }}>
              %{securityScore}
            </Typography>
          </Box>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {[
              { label: 'Turnstile Bot Koruması', ok: true },
              { label: 'Brute Force Koruması', ok: true },
              { label: 'HTTPS Zorunlu', ok: true },
              { label: 'Auth Middleware', ok: true },
              { label: '2FA Zorunlu', ok: false },
              { label: 'IP Whitelist', ok: false },
            ].map((item, i) => (
              <Grid item xs={6} sm={4} key={i}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {item.ok
                    ? <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 18 }} />
                    : <WarningIcon sx={{ color: '#64748b', fontSize: 18 }} />
                  }
                  <Typography variant="caption" sx={{ color: item.ok ? '#cbd5e1' : '#64748b' }}>
                    {item.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
