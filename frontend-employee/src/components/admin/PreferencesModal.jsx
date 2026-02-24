import React, { useState } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  NotificationsOutlined as NotificationsIcon,
  ExploreOutlined as NavigationIcon,
  HomeOutlined as HomeIcon,
  PaletteOutlined as AppearanceIcon,
  ChatBubbleOutlined as MessagingIcon,
  LanguageOutlined as LanguageIcon,
  AccessibilityNewOutlined as AccessibilityIcon,
  DoneAllOutlined as MarkReadIcon,
  VideocamOutlined as AudioVideoIcon,
  LinkOutlined as ConnectedIcon,
  VisibilityOutlined as PrivacyIcon,
  Check as CheckIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  SettingsBrightness as SystemModeIcon
} from '@mui/icons-material';
import { useTheme, THEMES } from '../../contexts/ThemeContext';

const SECTIONS = [
  { id: 'notifications', label: 'Bildirimler', icon: NotificationsIcon },
  { id: 'navigation', label: 'Navigasyon', icon: NavigationIcon },
  { id: 'home', label: 'Ana Sayfa', icon: HomeIcon },
  { id: 'appearance', label: 'Görünüm', icon: AppearanceIcon },
  { id: 'messaging', label: 'Mesajlaşma ve Medya', icon: MessagingIcon },
  { id: 'language', label: 'Dil ve Bölge', icon: LanguageIcon },
  { id: 'accessibility', label: 'Erişilebilirlik', icon: AccessibilityIcon },
  { id: 'markread', label: 'Okundu olarak işaretle', icon: MarkReadIcon },
  { id: 'audiovideo', label: 'Audio ve Video', icon: AudioVideoIcon },
  { id: 'connected', label: 'Bağlı Hesaplar', icon: ConnectedIcon },
  { id: 'privacy', label: 'Gizlilik ve Görünürlük', icon: PrivacyIcon }
];

// Appearance Section Component
function AppearanceSection({ isDark }) {
  const { currentTheme, themes, changeTheme } = useTheme();
  const [themeTab, setThemeTab] = useState('optima'); // 'optima' | 'custom'

  const isLightMode = currentTheme === 'basic-light';
  const isDarkMode = currentTheme === 'basic-dark';
  const isWallpaper = !currentTheme.startsWith('basic');

  const colorModes = [
    { id: 'light', label: 'Açık', icon: LightModeIcon, active: isLightMode },
    { id: 'dark', label: 'Koyu', icon: DarkModeIcon, active: isDarkMode },
    { id: 'system', label: 'Sistem', icon: SystemModeIcon, active: false }
  ];

  const handleColorMode = (mode) => {
    if (mode === 'light') changeTheme('basic-light');
    else if (mode === 'dark') changeTheme('basic-dark');
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      changeTheme(prefersDark ? 'basic-dark' : 'basic-light');
    }
  };

  const basicThemes = themes.filter(t => t.id.startsWith('basic'));
  const wallpaperThemes = themes.filter(t => !t.id.startsWith('basic'));

  return (
    <Box>
      <Typography sx={{ fontSize: '22px', fontWeight: 700, color: isDark ? '#E0E0E0' : '#111827', mb: 0.5 }}>
        Görünüm
      </Typography>
      <Typography sx={{ fontSize: '14px', color: isDark ? '#ABABAD' : '#6b7280', mb: 3 }}>
        Uygulama görünümünü ve temasını özelleştirin.
      </Typography>

      {/* Renk Modu */}
      <Typography sx={{ fontSize: '14px', fontWeight: 600, color: isDark ? '#E0E0E0' : '#111827', mb: 1.5 }}>
        Renk Modu
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        {colorModes.map(mode => (
          <Box
            key={mode.id}
            onClick={() => handleColorMode(mode.id)}
            sx={{
              flex: 1,
              p: 2,
              borderRadius: '12px',
              border: `2px solid ${mode.active ? '#36C5F0' : (isDark ? '#35373B' : '#e5e7eb')}`,
              bgcolor: isDark ? '#222529' : '#f9fafb',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.2s',
              '&:hover': { borderColor: '#36C5F0', bgcolor: isDark ? '#27242C' : '#f0f0f0' }
            }}
          >
            <mode.icon sx={{ fontSize: 32, color: mode.active ? '#36C5F0' : (isDark ? '#ABABAD' : '#6b7280'), mb: 1 }} />
            <Typography sx={{ fontSize: '13px', fontWeight: mode.active ? 600 : 400, color: isDark ? '#E0E0E0' : '#111827' }}>
              {mode.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Tema Sekmeleri */}
      <Box sx={{ display: 'flex', gap: 0, mb: 3, borderBottom: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}` }}>
        {[
          { id: 'optima', label: 'Optima Temaları' },
          { id: 'custom', label: 'Özel Tasarım' }
        ].map(tab => (
          <Box
            key={tab.id}
            onClick={() => setThemeTab(tab.id)}
            sx={{
              px: 2, py: 1.5, cursor: 'pointer',
              borderBottom: themeTab === tab.id ? '2px solid #36C5F0' : '2px solid transparent',
              color: themeTab === tab.id ? '#36C5F0' : (isDark ? '#ABABAD' : '#6b7280'),
              fontWeight: themeTab === tab.id ? 600 : 400,
              fontSize: '14px',
              transition: 'all 0.2s',
              '&:hover': { color: isDark ? '#E0E0E0' : '#111827' }
            }}
          >
            {tab.label}
          </Box>
        ))}
      </Box>

      {themeTab === 'optima' ? (
        <>
          {/* Temel Temalar */}
          <Typography sx={{ fontSize: '12px', fontWeight: 600, color: isDark ? '#ABABAD' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5 }}>
            Temel Temalar
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {basicThemes.map(theme => (
              <Box
                key={theme.id}
                onClick={() => changeTheme(theme.id)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  p: 1.5, borderRadius: '10px', cursor: 'pointer', flex: 1,
                  border: `2px solid ${currentTheme === theme.id ? '#36C5F0' : (isDark ? '#35373B' : '#e5e7eb')}`,
                  bgcolor: isDark ? '#222529' : '#f9fafb',
                  transition: 'all 0.2s',
                  '&:hover': { borderColor: '#36C5F0' }
                }}
              >
                <Box sx={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: theme.colors.button.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {theme.id === 'basic-light' ?
                    <LightModeIcon sx={{ color: 'white', fontSize: 18 }} /> :
                    <DarkModeIcon sx={{ color: 'white', fontSize: 18 }} />
                  }
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '14px', fontWeight: 500, color: isDark ? '#E0E0E0' : '#111827' }}>
                    {theme.name}
                  </Typography>
                </Box>
                {currentTheme === theme.id && (
                  <CheckIcon sx={{ color: '#36C5F0', fontSize: 18 }} />
                )}
              </Box>
            ))}
          </Box>

          {/* Manzara Temaları */}
          <Typography sx={{ fontSize: '12px', fontWeight: 600, color: isDark ? '#ABABAD' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', mb: 1.5 }}>
            Manzara Temaları
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {wallpaperThemes.map(theme => (
              <Box
                key={theme.id}
                onClick={() => changeTheme(theme.id)}
                sx={{
                  position: 'relative',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  aspectRatio: '16/10',
                  border: `3px solid ${currentTheme === theme.id ? '#36C5F0' : 'transparent'}`,
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'scale(1.03)', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }
                }}
              >
                {theme.preview ? (
                  <Box sx={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(${theme.preview})`,
                    backgroundSize: 'cover', backgroundPosition: 'center'
                  }} />
                ) : (
                  <Box sx={{
                    position: 'absolute', inset: 0,
                    background: theme.colors.button.primary
                  }} />
                )}
                <Box sx={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)'
                }} />
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 1.5 }}>
                  <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '12px' }}>
                    {theme.name}
                  </Typography>
                </Box>
                {currentTheme === theme.id && (
                  <Box sx={{
                    position: 'absolute', top: 8, right: 8,
                    width: 24, height: 24, borderRadius: '50%',
                    bgcolor: '#36C5F0', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <CheckIcon sx={{ color: 'white', fontSize: 16 }} />
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        </>
      ) : (
        /* Özel Tasarım Tab */
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <AppearanceIcon sx={{ fontSize: 48, color: isDark ? '#ABABAD' : '#9ca3af', mb: 2 }} />
          <Typography sx={{ fontSize: '16px', fontWeight: 600, color: isDark ? '#E0E0E0' : '#111827', mb: 1 }}>
            Özel Tema Oluşturucu
          </Typography>
          <Typography sx={{ fontSize: '14px', color: isDark ? '#ABABAD' : '#6b7280' }}>
            Yakın zamanda eklenecek - Kendi temanızı oluşturun
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// Placeholder Section Component
function PlaceholderSection({ title, icon: Icon, isDark }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '22px', fontWeight: 700, color: isDark ? '#E0E0E0' : '#111827', mb: 3 }}>
        {title}
      </Typography>
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Icon sx={{ fontSize: 48, color: isDark ? '#ABABAD' : '#9ca3af', mb: 2 }} />
        <Typography sx={{ fontSize: '16px', fontWeight: 500, color: isDark ? '#ABABAD' : '#6b7280' }}>
          Yakın zamanda eklenecek
        </Typography>
      </Box>
    </Box>
  );
}

export default function PreferencesModal({ open, onClose }) {
  const { currentTheme } = useTheme();
  const isDark = currentTheme !== 'basic-light';
  const [activeSection, setActiveSection] = useState('appearance');

  const renderContent = () => {
    if (activeSection === 'appearance') {
      return <AppearanceSection isDark={isDark} />;
    }
    const section = SECTIONS.find(s => s.id === activeSection);
    return <PlaceholderSection title={section?.label || ''} icon={section?.icon || AppearanceIcon} isDark={isDark} />;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: '900px',
          height: '600px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          borderRadius: '16px',
          bgcolor: isDark ? '#1A1D21' : '#ffffff',
          color: isDark ? '#E0E0E0' : '#111827',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }
      }}
    >
      {/* Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 3, py: 2, borderBottom: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}`,
        flexShrink: 0
      }}>
        <Typography sx={{ fontSize: '18px', fontWeight: 700, color: isDark ? '#E0E0E0' : '#111827' }}>
          Tercihler
        </Typography>
        <IconButton onClick={onClose} sx={{ color: isDark ? '#ABABAD' : '#6b7280' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Body: Left Nav + Right Content */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sol Panel - Navigasyon */}
        <Box sx={{
          width: 240, flexShrink: 0,
          borderRight: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}`,
          overflowY: 'auto', py: 1,
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-thumb': { background: isDark ? '#35373B' : '#d1d5db', borderRadius: '2px' }
        }}>
          {SECTIONS.map(section => {
            const isActive = activeSection === section.id;
            const Icon = section.icon;
            return (
              <Box
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2, py: 1.5, mx: 1, borderRadius: '8px',
                  cursor: 'pointer',
                  bgcolor: isActive ? (isDark ? '#36C5F020' : '#36C5F010') : 'transparent',
                  color: isActive ? '#36C5F0' : (isDark ? '#ABABAD' : '#6b7280'),
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.15s',
                  '&:hover': {
                    bgcolor: isActive ? undefined : (isDark ? '#27242C' : '#f0f0f0'),
                    color: isActive ? undefined : (isDark ? '#E0E0E0' : '#111827')
                  }
                }}
              >
                <Icon sx={{ fontSize: 20, color: 'inherit' }} />
                <Typography sx={{ fontSize: '14px', color: 'inherit', fontWeight: 'inherit' }}>
                  {section.label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* Sağ Panel - İçerik */}
        <Box sx={{
          flex: 1, overflowY: 'auto', p: 4,
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-thumb': { background: isDark ? '#35373B' : '#d1d5db', borderRadius: '3px' }
        }}>
          {renderContent()}
        </Box>
      </Box>
    </Dialog>
  );
}
