# PART 3: PreferencesModal - Tercihler Modal Penceresi

## Görev Özeti
Slack tarzı bir Tercihler (Preferences) modal penceresi oluştur. Sol navigasyon paneli + sağ içerik alanı. "Görünüm" (Appearance) bölümü tam fonksiyonel olacak (renk modu seçimi + tema grid'i). Diğer bölümler placeholder olarak kalacak (Part 5'te doldurulacak).

---

## Proje Bilgileri
- **Proje Yolu**: `/Users/furkandaghan/Desktop/optima/`
- **Tema Hook**: `useTheme()` → `{ currentTheme, themeConfig, themes, changeTheme, isLoading }`
  - `themes` → THEMES array'i (16 tema, `/frontend/src/contexts/ThemeContext.js` satır 27-652)
  - `changeTheme(themeId)` → tema değiştirir, localStorage'a kaydeder, CSS variables günceller
- **Mevcut Tema Oluşturucu**: `CustomThemeCreator.jsx` (`/frontend/src/components/admin/CustomThemeCreator.jsx`, 429 satır)
- **Referans Görsel**: `/Users/furkandaghan/Desktop/chat demo/Slack ayarlar.png`
- **Referans HTML**: Kullanıcının sağladığı Preferences HTML kodu (dark tema, 3 sütun grid, Slack tarzı)

---

## Yeni Dosya: PreferencesModal.jsx
**Yol**: `/frontend/src/components/admin/PreferencesModal.jsx` (~700 satır)

### Props
```javascript
{
  open,     // boolean - modal açık mı
  onClose   // () => void - modal'ı kapat
}
```

---

## Modal Genel Yapısı

```
┌──────────────────────────────────────────────────────────┐
│  Tercihler                                          ✕    │
├──────────────┬───────────────────────────────────────────┤
│              │                                           │
│  🔔 Bildirim │   Renk Modu                              │
│  🧭 Navigas  │   ┌────────┐ ┌────────┐ ┌────────┐      │
│  🏠 Ana Sayf │   │☀ Açık  │ │☾ Koyu  │ │💻Sistem│      │
│  🎨 Görünüm ◄│   └────────┘ └────────┘ └────────┘      │
│  💬 Mesajlaş │                                           │
│  🌐 Dil ve B │   Optima Temaları │ Özel Tasarım         │
│  ♿ Erişileb │   ─────────────────────────               │
│  ✓  Okundu   │                                           │
│  🎥 Audio &  │   Tek Renk                               │
│  🔗 Bağlı H  │   ┌──────────┐┌──────────┐┌──────────┐  │
│  🔒 Gizlilik │   │ ◉ Light  ││ ◉ Dark   ││ ◉ Sakura │  │
│              │   └──────────┘└──────────┘└──────────┘  │
│              │   ┌──────────┐┌──────────┐┌──────────┐  │
│              │   │ ◉ Ocean  ││ ◉ Alpine ││ ◉ Golden │  │
│              │   └──────────┘└──────────┘└──────────┘  │
│              │                                           │
│              │   Manzara Temaları                        │
│              │   ┌──────────┐┌──────────┐┌──────────┐  │
│              │   │🖼️ Sakura ││🖼️ Tropical││🖼️ Nordic│  │
│              │   └──────────┘└──────────┘└──────────┘  │
│              │                                           │
└──────────────┴───────────────────────────────────────────┘
```

### MUI Dialog Yapılandırması
```jsx
<Dialog
  open={open}
  onClose={onClose}
  maxWidth={false}
  PaperProps={{
    sx: {
      width: '900px',
      height: '600px',
      maxHeight: '80vh',
      bgcolor: isDark ? '#1A1D21' : '#ffffff',
      color: isDark ? '#E0E0E0' : '#111827',
      borderRadius: '12px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }
  }}
>
```

---

## Header Bölümü
```jsx
{/* Header */}
<Box sx={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  px: 3,
  py: 2.5,
  borderBottom: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}`
}}>
  <Typography sx={{ fontSize: '28px', fontWeight: 700 }}>
    Tercihler
  </Typography>
  <IconButton
    onClick={onClose}
    sx={{
      color: isDark ? '#ABABAD' : '#6b7280',
      '&:hover': { bgcolor: isDark ? '#27242C' : '#f0f0f0' }
    }}
  >
    <CloseIcon />
  </IconButton>
</Box>
```

---

## Sol Navigasyon Paneli (240px)

### State
```javascript
const [activeSection, setActiveSection] = useState('appearance');
```

### Navigasyon Öğeleri
```javascript
const navSections = [
  { id: 'notifications', label: 'Bildirimler', icon: <NotificationsOutlinedIcon /> },
  { id: 'navigation', label: 'Navigasyon', icon: <ExploreOutlinedIcon /> },
  { id: 'home', label: 'Ana Sayfa', icon: <HomeOutlinedIcon /> },
  { id: 'appearance', label: 'Görünüm', icon: <PaletteOutlinedIcon /> },
  { id: 'messages', label: 'Mesajlaşma ve Medya', icon: <ChatOutlinedIcon /> },
  { id: 'language', label: 'Dil ve Bölge', icon: <LanguageIcon /> },
  { id: 'accessibility', label: 'Erişilebilirlik', icon: <AccessibilityNewIcon /> },
  { id: 'markAsRead', label: 'Okundu olarak işaretle', icon: <DoneAllIcon /> },
  { id: 'audioVideo', label: 'Audio ve Video', icon: <VideocamOutlinedIcon /> },
  { id: 'connectedAccounts', label: 'Bağlı Hesaplar', icon: <LinkIcon /> },
  { id: 'privacy', label: 'Gizlilik ve Görünürlük', icon: <LockOutlinedIcon /> }
];
```

### Nav Öğe Stili (Slack ayarlar görseline uygun)
```jsx
{navSections.map((section) => (
  <Box
    key={section.id}
    onClick={() => setActiveSection(section.id)}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      px: 2.5,
      py: 1.25,
      mx: 1.5,
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '15px',
      color: activeSection === section.id
        ? '#ffffff'
        : (isDark ? '#ABABAD' : '#6b7280'),
      bgcolor: activeSection === section.id
        ? '#1164A3'
        : 'transparent',
      '&:hover': {
        bgcolor: activeSection === section.id
          ? '#1164A3'
          : (isDark ? '#27242C' : '#f0f0f0'),
        color: activeSection === section.id
          ? '#ffffff'
          : (isDark ? '#E0E0E0' : '#374151')
      },
      transition: 'all 0.2s'
    }}
  >
    <Box sx={{ fontSize: '18px', display: 'flex' }}>{section.icon}</Box>
    <Typography sx={{ fontSize: '15px' }}>{section.label}</Typography>
  </Box>
))}
```

---

## Sağ İçerik Paneli - Görünüm (Appearance) Bölümü

Bu bölüm tam fonksiyonel olacak. Diğer bölümler placeholder.

### A. Renk Modu Seçimi

```jsx
<Box sx={{ mb: 6 }}>
  <Typography sx={{ fontSize: '22px', fontWeight: 700, mb: 1.5 }}>
    Renk Modu
  </Typography>
  <Typography sx={{ fontSize: '15px', color: isDark ? '#ABABAD' : '#6b7280', lineHeight: 1.5, mb: 3 }}>
    Optima HR'ın görünümünün açık mı, koyu mu yoksa bilgisayar ayarlarınızı mı takip etmesini seçin.
  </Typography>

  <Box sx={{ display: 'flex', gap: 2 }}>
    {[
      { id: 'light', label: 'Açık', icon: <LightModeIcon />, theme: 'basic-light' },
      { id: 'dark', label: 'Koyu', icon: <DarkModeIcon />, theme: 'basic-dark' },
      { id: 'system', label: 'Sistem', icon: <ComputerIcon />, theme: null }
    ].map((mode) => {
      const isActive = colorMode === mode.id;
      return (
        <Box
          key={mode.id}
          onClick={() => handleColorModeChange(mode.id)}
          sx={{
            flex: 1,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.25,
            bgcolor: isDark ? '#222529' : '#f8f9fa',
            border: `2px solid ${isActive ? '#1164A3' : (isDark ? '#35373B' : '#e5e7eb')}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '15px',
            color: isDark ? '#E0E0E0' : '#111827',
            transition: 'all 0.2s',
            '&:hover': { borderColor: isActive ? '#1164A3' : (isDark ? '#ABABAD' : '#9ca3af') },
            ...(isActive && { bgcolor: isDark ? 'rgba(17,100,163,0.1)' : 'rgba(17,100,163,0.05)' })
          }}
        >
          {mode.icon}
          <span>{mode.label}</span>
        </Box>
      );
    })}
  </Box>
</Box>
```

**colorMode Handler:**
```javascript
const [colorMode, setColorMode] = useState(() => {
  if (currentTheme === 'basic-light') return 'light';
  if (currentTheme === 'basic-dark') return 'dark';
  return 'dark'; // wallpaper temaları koyu modda
});

const handleColorModeChange = (mode) => {
  setColorMode(mode);
  if (mode === 'light') changeTheme('basic-light');
  else if (mode === 'dark') changeTheme('basic-dark');
  else if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    changeTheme(prefersDark ? 'basic-dark' : 'basic-light');
  }
};
```

### B. Tema Sekmeleri

```jsx
<Box sx={{ mb: 4 }}>
  <Box sx={{ display: 'flex', gap: 4, borderBottom: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}` }}>
    {['themes', 'custom'].map((tab) => (
      <Typography
        key={tab}
        onClick={() => setThemeTab(tab)}
        sx={{
          pb: 1.5,
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '15px',
          color: themeTab === tab ? (isDark ? '#E0E0E0' : '#111827') : (isDark ? '#ABABAD' : '#6b7280'),
          borderBottom: themeTab === tab ? `2px solid ${isDark ? '#E0E0E0' : '#111827'}` : '2px solid transparent',
          mb: '-1px'
        }}
      >
        {tab === 'themes' ? 'Optima Temaları' : 'Özel Tasarım'}
      </Typography>
    ))}
  </Box>
</Box>
```

### C. Tema Grid'i (3 Sütun)

Temalar iki kategoriye ayrılır:
1. **Temel Temalar** (basic-light, basic-dark) → "Tek Renk" başlığı
2. **Manzara Temaları** (diğer 14 tema) → "Manzara Temaları" başlığı

```jsx
{themeTab === 'themes' && (
  <>
    {/* Tek Renk Kategorisi */}
    <Box sx={{ mb: 4 }}>
      <Typography sx={{ fontSize: '13px', fontWeight: 600, mb: 2, textTransform: 'capitalize', letterSpacing: '0.3px' }}>
        Tek Renk
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        {themes.filter(t => t.isBasic).map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={currentTheme === theme.id}
            onClick={() => changeTheme(theme.id)}
            isDark={isDark}
          />
        ))}
      </Box>
    </Box>

    {/* Manzara Temaları Kategorisi */}
    <Box sx={{ mb: 4 }}>
      <Typography sx={{ fontSize: '13px', fontWeight: 600, mb: 2, textTransform: 'capitalize', letterSpacing: '0.3px' }}>
        Manzara Temaları
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        {themes.filter(t => !t.isBasic).map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={currentTheme === theme.id}
            onClick={() => changeTheme(theme.id)}
            isDark={isDark}
          />
        ))}
      </Box>
    </Box>
  </>
)}

{themeTab === 'custom' && (
  <CustomThemeCreator />
)}
```

### ThemeCard İç Bileşeni
```jsx
const ThemeCard = ({ theme, isActive, onClick, isDark }) => (
  <Box
    onClick={onClick}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      p: 2,
      bgcolor: isDark ? '#222529' : '#f8f9fa',
      border: `2px solid ${isActive ? '#1164A3' : (isDark ? '#35373B' : '#e5e7eb')}`,
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      '&:hover': {
        borderColor: isActive ? '#1164A3' : (isDark ? '#ABABAD' : '#9ca3af'),
        bgcolor: isDark ? '#27242C' : '#f0f0f0'
      },
      ...(isActive && { bgcolor: isDark ? 'rgba(17,100,163,0.1)' : 'rgba(17,100,163,0.05)' })
    }}
  >
    {/* Tema Preview - Yuvarlak */}
    <Box sx={{
      width: 48,
      height: 48,
      borderRadius: '50%',
      flexShrink: 0,
      border: `2px solid ${isActive ? '#1164A3' : (isDark ? '#35373B' : '#e5e7eb')}`,
      overflow: 'hidden',
      background: theme.isBasic
        ? `linear-gradient(135deg, ${theme.colors.sidebar.bg} 50%, ${theme.colors.card.bg} 50%)`
        : `url(${theme.preview}) center/cover`
    }} />
    {/* Tema İsmi */}
    <Typography sx={{ fontSize: '15px', fontWeight: 600 }}>
      {theme.name}
    </Typography>
  </Box>
);
```

---

## Placeholder Bölümler (Diğer 10 Bölüm)

```jsx
const renderPlaceholder = (sectionId) => {
  const section = navSections.find(s => s.id === sectionId);
  return (
    <Box sx={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      py: 8
    }}>
      <Box sx={{ fontSize: '48px', opacity: 0.3 }}>
        {section?.icon}
      </Box>
      <Typography sx={{ fontSize: '18px', fontWeight: 600, color: isDark ? '#ABABAD' : '#6b7280' }}>
        {section?.label}
      </Typography>
      <Typography sx={{ fontSize: '14px', color: isDark ? '#666' : '#9ca3af' }}>
        Yakın zamanda eklenecek
      </Typography>
    </Box>
  );
};
```

---

## AdminSidebar.js Bağlantısı

```javascript
import PreferencesModal from './PreferencesModal';

// JSX'e ekle (Drawer içinde, en sonda):
<PreferencesModal
  open={preferencesOpen}
  onClose={() => setPreferencesOpen(false)}
/>
```

---

## Önemli Import'lar

```javascript
import React, { useState } from 'react';
import {
  Dialog, Box, Typography, IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Computer as ComputerIcon,
  NotificationsOutlined as NotificationsOutlinedIcon,
  ExploreOutlined as ExploreOutlinedIcon,
  HomeOutlined as HomeOutlinedIcon,
  PaletteOutlined as PaletteOutlinedIcon,
  ChatOutlined as ChatOutlinedIcon,
  Language as LanguageIcon,
  AccessibilityNew as AccessibilityNewIcon,
  DoneAll as DoneAllIcon,
  VideocamOutlined as VideocamOutlinedIcon,
  Link as LinkIcon,
  LockOutlined as LockOutlinedIcon
} from '@mui/icons-material';
import { useTheme } from '../../contexts/ThemeContext';
import CustomThemeCreator from './CustomThemeCreator';
```

---

## Kontrol Listesi
- [ ] Yeni dosya oluşturuldu: `PreferencesModal.jsx`
- [ ] Modal 900x600px olarak açılıyor
- [ ] "Tercihler" başlığı ve × kapat butonu çalışıyor
- [ ] Sol nav 11 bölüm gösteriyor, aktif = mavi arkaplan
- [ ] Görünüm bölümü tam fonksiyonel
- [ ] Renk Modu: Açık/Koyu/Sistem kartları çalışıyor
- [ ] Tema seçimi çalışıyor (tıklanınca tema değişiyor)
- [ ] Tema grid'i 3 sütunlu, aktif tema mavi çerçeveli
- [ ] "Özel Tasarım" sekmesi CustomThemeCreator'ı gösteriyor
- [ ] Diğer 10 bölüm placeholder gösteriyor
- [ ] Dark + Light tema doğru görünüyor
- [ ] Slack ayarlar görseline benziyor
- [ ] Build hatası yok
