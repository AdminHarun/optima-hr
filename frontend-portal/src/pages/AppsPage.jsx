import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Avatar, Chip, IconButton, Tooltip } from '@mui/material';
import {
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { APPS } from '../config';

const appIcons = {
  HR_PANEL: '📋',
  CAREER_PORTAL: '🌐',
  EMPLOYEE_PORTAL: '👤'
};

export default function AppsPage() {
  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 700 }}>
          Uygulamalar
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
          Optima HR platform uygulamalarını yönetin
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {Object.entries(APPS).map(([key, app]) => (
          <Grid item xs={12} md={6} lg={4} key={key}>
            <Card sx={{
              height: '100%', transition: 'all 0.3s ease',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 16px 48px rgba(0,0,0,0.3)' }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                  <Avatar sx={{
                    width: 56, height: 56, borderRadius: '16px',
                    background: `linear-gradient(135deg, ${app.color}, ${app.color}cc)`,
                    fontSize: '1.8rem'
                  }}>
                    {appIcons[key]}
                  </Avatar>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Chip
                      size="small"
                      icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                      label="Aktif"
                      sx={{
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        color: '#22c55e', fontWeight: 600,
                        '& .MuiChip-icon': { color: '#22c55e' }
                      }}
                    />
                  </Box>
                </Box>

                <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 600, mb: 0.5 }}>
                  {app.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
                  {app.description}
                </Typography>

                <Box sx={{
                  p: 2, borderRadius: '10px',
                  backgroundColor: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(71, 85, 105, 0.2)',
                  mb: 2
                }}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                    URL
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#3b82f6', fontWeight: 500 }}>
                      {app.url.replace('https://', '')}
                    </Typography>
                    <Tooltip title="Uygulamayı aç">
                      <IconButton size="small" onClick={() => window.open(app.url, '_blank')} sx={{ color: '#64748b' }}>
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                <Box sx={{
                  p: 2, borderRadius: '10px',
                  backgroundColor: 'rgba(15, 23, 42, 0.5)',
                  border: '1px solid rgba(71, 85, 105, 0.2)'
                }}>
                  <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                    Platform
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#cbd5e1' }}>
                    Cloudflare Pages
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
