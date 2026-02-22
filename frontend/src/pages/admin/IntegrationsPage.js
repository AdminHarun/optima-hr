// IntegrationsPage - Third-party Integration Management (Phase 5.3)
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Grid, Card, CardContent,
  CircularProgress, Alert, Snackbar, Avatar, Divider
} from '@mui/material';
import {
  CloudSync as CloudIcon,
  GitHub as GitHubIcon,
  ViewKanban as TrelloIcon,
  CloudUpload as DriveIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Schedule as PendingIcon
} from '@mui/icons-material';
import { useSite } from '../../contexts/SiteContext';
import { API_BASE_URL } from '../../config/config';

const COLORS = {
  primary: '#1c61ab',
  secondary: '#8bb94a',
  headerGradient: 'linear-gradient(135deg, #1c61ab 0%, #1a6fc2 50%, #4a8c3f 100%)',
  gradient: 'linear-gradient(135deg, #1c61ab 0%, #2d7bcc 50%, #8bb94a 100%)',
};

const INTEGRATIONS = [
  {
    type: 'google_drive',
    name: 'Google Drive',
    icon: <DriveIcon sx={{ fontSize: 32 }} />,
    color: '#4285F4',
    bgColor: '#e8f0fe',
    description: 'Dosyalari Google Drive ile senkronize edin. Paylasilmis klasorler ve belgeler.',
    features: ['Dosya senkronizasyonu', 'Paylasilmis klasorler', 'Otomatik yedekleme'],
  },
  {
    type: 'github',
    name: 'GitHub',
    icon: <GitHubIcon sx={{ fontSize: 32 }} />,
    color: '#24292e',
    bgColor: '#f0f0f0',
    description: 'GitHub repository bildirimlerini alin. PR ve issue takibi.',
    features: ['Repository bildirimleri', 'PR takibi', 'Issue entegrasyonu'],
  },
  {
    type: 'trello',
    name: 'Trello',
    icon: <TrelloIcon sx={{ fontSize: 32 }} />,
    color: '#0079BF',
    bgColor: '#e4f0f9',
    description: 'Trello kartlarini gorevlerle senkronize edin. Board yonetimi.',
    features: ['Kart senkronizasyonu', 'Board yonetimi', 'Gorev eslestirme'],
  },
];

export default function IntegrationsPage() {
  const { currentSite } = useSite();
  const [connectedIntegrations, setConnectedIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const siteCode = currentSite?.code || 'FXB';

  const loadConnected = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/integrations/connected`, {
        headers: { 'x-site-id': siteCode },
      });
      if (res.ok) {
        const data = await res.json();
        setConnectedIntegrations(data.map(d => d.type));
      }
    } catch {
      // Silent fail - just show all as disconnected
    } finally {
      setLoading(false);
    }
  }, [siteCode]);

  useEffect(() => {
    loadConnected();
  }, [loadConnected]);

  const handleConnect = (type) => {
    setSnackbar({
      open: true,
      message: `${INTEGRATIONS.find(i => i.type === type)?.name} entegrasyonu yakinda aktif olacak.`,
      severity: 'info',
    });
  };

  const isConnected = (type) => connectedIntegrations.includes(type);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{
        background: COLORS.headerGradient,
        borderRadius: '20px',
        p: { xs: 3, md: 4 },
        mb: 3,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Box sx={{
          position: 'absolute', top: -30, right: -30,
          width: 120, height: 120, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />
        <Box sx={{
          position: 'absolute', bottom: -20, right: 80,
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
        }} />

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, letterSpacing: '-0.5px' }}>
              Entegrasyonlar
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85 }}>
              Ucuncu parti servisleri Optima ile entegre edin
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadConnected}
            sx={{
              color: 'white', borderColor: 'rgba(255,255,255,0.4)',
              '&:hover': { borderColor: 'white', background: 'rgba(255,255,255,0.1)' },
              borderRadius: '12px', textTransform: 'none', fontWeight: 600,
            }}
          >
            Yenile
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, mt: 3 }}>
          {[
            { label: 'Mevcut', value: INTEGRATIONS.length, icon: <CloudIcon /> },
            { label: 'Bagli', value: connectedIntegrations.length, icon: <LinkIcon /> },
          ].map((stat) => (
            <Box key={stat.label} sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              background: 'rgba(255,255,255,0.1)', borderRadius: '12px',
              px: 2, py: 1, backdropFilter: 'blur(5px)',
            }}>
              <Box sx={{ opacity: 0.8, display: 'flex' }}>{stat.icon}</Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{stat.value}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>{stat.label}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Loading */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: COLORS.primary }} />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {INTEGRATIONS.map((integration) => {
            const connected = isConnected(integration.type);
            return (
              <Grid item xs={12} sm={6} md={4} key={integration.type}>
                <Card sx={{
                  borderRadius: '16px',
                  border: '1px solid',
                  borderColor: connected ? 'rgba(139, 185, 74, 0.3)' : 'rgba(0,0,0,0.08)',
                  transition: 'all 0.3s ease',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 30px rgba(28, 97, 171, 0.12)',
                    borderColor: COLORS.primary,
                  },
                }}>
                  <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Icon + Title */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{
                        width: 56, height: 56, borderRadius: '14px',
                        background: integration.bgColor,
                        color: integration.color,
                      }}>
                        {integration.icon}
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                          {integration.name}
                        </Typography>
                        {connected ? (
                          <Chip size="small" icon={<CheckIcon sx={{ fontSize: 14 }} />}
                            label="Bagli"
                            sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600,
                              background: '#e8f5e9', color: '#2e7d32',
                              '& .MuiChip-icon': { color: '#2e7d32' },
                            }}
                          />
                        ) : (
                          <Chip size="small" icon={<PendingIcon sx={{ fontSize: 14 }} />}
                            label="Bagli Degil"
                            sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600,
                              background: '#f5f5f5', color: '#999',
                              '& .MuiChip-icon': { color: '#999' },
                            }}
                          />
                        )}
                      </Box>
                    </Box>

                    {/* Description */}
                    <Typography variant="body2" sx={{ color: '#666', mb: 2, lineHeight: 1.6 }}>
                      {integration.description}
                    </Typography>

                    {/* Features */}
                    <Box sx={{ mb: 2, flex: 1 }}>
                      {integration.features.map((feature, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Box sx={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: COLORS.secondary, flexShrink: 0,
                          }} />
                          <Typography variant="caption" sx={{ color: '#777' }}>{feature}</Typography>
                        </Box>
                      ))}
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    {/* Action */}
                    <Button
                      fullWidth
                      variant={connected ? 'outlined' : 'contained'}
                      startIcon={connected ? <LinkOffIcon /> : <LinkIcon />}
                      onClick={() => handleConnect(integration.type)}
                      sx={{
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 600,
                        ...(connected ? {
                          color: '#e53935', borderColor: '#e53935',
                          '&:hover': { background: '#ffebee', borderColor: '#e53935' },
                        } : {
                          background: COLORS.gradient,
                          '&:hover': { opacity: 0.9 },
                        }),
                      }}
                    >
                      {connected ? 'Baglantıyı Kes' : 'Yakinda'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: '12px', fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
