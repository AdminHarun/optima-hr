import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Switch, FormControlLabel,
  Chip, Alert, Button, Divider, Slider, Select, MenuItem, FormControl,
  InputLabel
} from '@mui/material';
import {
  Shield as ShieldIcon, VpnKey as VpnKeyIcon,
  Security as SecurityIcon, Save as SaveIcon,
  Lock as LockIcon, Fingerprint as FingerprintIcon
} from '@mui/icons-material';

export default function AuthPoliciesPage() {
  const [settings, setSettings] = useState({
    require2FA: false,
    sessionDurationHours: 8,
    passwordMinLength: 8,
    passwordRequireSpecial: true,
    passwordRequireNumbers: true,
    passwordRequireUppercase: true,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    turnstileEnabled: true,
  });

  const [saved, setSaved] = useState(false);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 700 }}>
            Kimlik Doğrulama
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
            Güvenlik politikalarını ve kimlik doğrulama ayarlarını yönetin
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}
          sx={{
            background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
            fontWeight: 600, borderRadius: '12px', px: 3
          }}
        >
          Kaydet
        </Button>
      </Box>

      {saved && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>
          Ayarlar başarıyla kaydedildi
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 2FA Politikası */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <FingerprintIcon sx={{ color: '#3b82f6' }} />
                <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 600 }}>
                  İki Faktörlü Doğrulama (2FA)
                </Typography>
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.require2FA}
                    onChange={(e) => handleChange('require2FA', e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#22c55e' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#22c55e' }
                    }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ color: '#f1f5f9', fontWeight: 500 }}>
                      Tüm kullanıcılar için 2FA zorunlu
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Aktif edilirse tüm admin kullanıcılardan 2FA kurulumu istenir
                    </Typography>
                  </Box>
                }
                sx={{ mb: 2, alignItems: 'flex-start' }}
              />

              <Box sx={{
                p: 2, borderRadius: '10px', backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.1)'
              }}>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  Mevcut 2FA durumu: 0/5 kullanıcı aktif
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Oturum Süresi */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <VpnKeyIcon sx={{ color: '#f59e0b' }} />
                <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 600 }}>
                  Oturum Ayarları
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
                Oturum süresi: <strong style={{ color: '#f1f5f9' }}>{settings.sessionDurationHours} saat</strong>
              </Typography>
              <Slider
                value={settings.sessionDurationHours}
                onChange={(e, v) => handleChange('sessionDurationHours', v)}
                min={1} max={24} step={1}
                marks={[
                  { value: 1, label: '1s' },
                  { value: 8, label: '8s' },
                  { value: 24, label: '24s' },
                ]}
                sx={{
                  color: '#3b82f6', mb: 3,
                  '& .MuiSlider-markLabel': { color: '#64748b', fontSize: '0.75rem' }
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Şifre Politikası */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <LockIcon sx={{ color: '#8bb94a' }} />
                <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 600 }}>
                  Şifre Politikası
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
                Minimum şifre uzunluğu: <strong style={{ color: '#f1f5f9' }}>{settings.passwordMinLength} karakter</strong>
              </Typography>
              <Slider
                value={settings.passwordMinLength}
                onChange={(e, v) => handleChange('passwordMinLength', v)}
                min={6} max={32} step={1}
                sx={{ color: '#8bb94a', mb: 2 }}
              />

              <Divider sx={{ borderColor: 'rgba(71, 85, 105, 0.3)', my: 2 }} />

              {[
                { key: 'passwordRequireSpecial', label: 'Özel karakter zorunlu (!@#$%)' },
                { key: 'passwordRequireNumbers', label: 'Rakam zorunlu (0-9)' },
                { key: 'passwordRequireUppercase', label: 'Büyük harf zorunlu (A-Z)' },
              ].map(item => (
                <FormControlLabel
                  key={item.key}
                  control={
                    <Switch
                      size="small"
                      checked={settings[item.key]}
                      onChange={(e) => handleChange(item.key, e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#8bb94a' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#8bb94a' }
                      }}
                    />
                  }
                  label={<Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.85rem' }}>{item.label}</Typography>}
                  sx={{ display: 'block', mb: 1 }}
                />
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Brute Force */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <ShieldIcon sx={{ color: '#ef4444' }} />
                <Typography variant="h6" sx={{ color: '#f1f5f9', fontWeight: 600 }}>
                  Brute Force Koruması
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
                Maksimum deneme: <strong style={{ color: '#f1f5f9' }}>{settings.maxLoginAttempts} deneme</strong>
              </Typography>
              <Slider
                value={settings.maxLoginAttempts}
                onChange={(e, v) => handleChange('maxLoginAttempts', v)}
                min={3} max={10} step={1}
                sx={{ color: '#ef4444', mb: 3 }}
              />

              <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
                Kilitleme süresi: <strong style={{ color: '#f1f5f9' }}>{settings.lockoutDurationMinutes} dakika</strong>
              </Typography>
              <Slider
                value={settings.lockoutDurationMinutes}
                onChange={(e, v) => handleChange('lockoutDurationMinutes', v)}
                min={5} max={60} step={5}
                sx={{ color: '#ef4444', mb: 2 }}
              />

              <Divider sx={{ borderColor: 'rgba(71, 85, 105, 0.3)', my: 2 }} />

              <FormControlLabel
                control={
                  <Switch
                    checked={settings.turnstileEnabled}
                    onChange={(e) => handleChange('turnstileEnabled', e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#f59e0b' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#f59e0b' }
                    }}
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ color: '#f1f5f9', fontWeight: 500 }}>
                      Cloudflare Turnstile
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      Bot koruması aktif
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start' }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
