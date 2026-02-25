# PART 2: ProfileDropdownMenu Bileşeni

## Görev Özeti
AdminSidebar'ın alt köşesindeki profil avatar kutusuna tıklanınca açılan tam özellikli bir açılır menü oluştur. Bu menü Slack'teki profil menüsüne benzer olacak: kullanıcı bilgisi, statü güncelleme, away/online toggle, bildirim sessize alma (zamanlı), profil, tercihler ve çıkış seçenekleri.

---

## Proje Bilgileri
- **Proje Yolu**: `/Users/furkandaghan/Desktop/optima/`
- **Frontend**: React 19 + Vite + MUI
- **Auth Hook**: `useEmployeeAuth()` → `{ currentUser, logout }`
- **Tema Hook**: `useTheme()` → `{ currentTheme }` → `isDark = currentTheme !== 'basic-light'`
- **WebSocket**: `import webSocketService from '../../services/webSocketService'`
- **Status API**: `PUT /api/employees/me/status` → body: `{ status, customStatus, customEmoji }`
- **API Base**: `import { API_BASE_URL } from '../../config/config'`
- **Router**: `import { useNavigate } from 'react-router-dom'`

---

## Yeni Dosya: ProfileDropdownMenu.jsx
**Yol**: `/frontend/src/components/admin/ProfileDropdownMenu.jsx` (~450 satır)

### Props
```javascript
{
  anchorEl,       // HTMLElement | null - menüyü konumlandırmak için
  open,           // boolean - menü açık mı
  onClose,        // () => void - menüyü kapat
  onPreferencesClick  // () => void - tercihler modal'ını aç
}
```

### İç State
```javascript
const [statusSubmenuOpen, setStatusSubmenuOpen] = useState(false);
const [muteSubmenuOpen, setMuteSubmenuOpen] = useState(false);
const [muteCustomDialogOpen, setMuteCustomDialogOpen] = useState(false);
const [currentStatus, setCurrentStatus] = useState('online');
const [customStatus, setCustomStatus] = useState('');
```

### Menü Yapısı (Üstten Alta)

#### 1. Kullanıcı Bilgi Bloğu (Header)
```
┌─────────────────────────────────┐
│  [Avatar 48px]  İsim Soyisim   │
│                 ● Çevrimiçi     │
└─────────────────────────────────┘
```
- Avatar: 48x48px, borderRadius 8px
- İsim: fontWeight 700, fontSize 15px
- Durum: yeşil dot + "Çevrimiçi" / sarı dot + "Uzakta" / kırmızı dot + "Meşgul" / gri dot + "Çevrimdışı"
- Padding: 16px, borderBottom: 1px solid

#### 2. Statünü Güncelle (Alt Menülü)
```
┌─────────────────────────────────┐
│  😊  Statünü güncelle        ▸  │
│  ┌───────────────────────────┐  │
│  │  📞 Görüşmede             │  │
│  │  🚫 Sistem dışı           │  │
│  │  🏖️ Tatilde                │  │
│  │  🏠 Evden çalışıyor       │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```
- Ana öğeye hover/click → sağda alt menü açılır
- Her öğe tıklanınca: `PUT /api/employees/me/status` API çağrısı
- Başarılı olunca: WebSocket `setStatus()` ile broadcast + menü kapanır

**API Çağrısı Örneği:**
```javascript
const updateStatus = async (status, customStatus, customEmoji) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/employees/me/status`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...getSiteHeaders()
      },
      body: JSON.stringify({ status, customStatus, customEmoji })
    });
    if (response.ok) {
      webSocketService.setStatus(status, customStatus);
      setCurrentStatus(status);
      setCustomStatus(customStatus || '');
    }
  } catch (error) {
    console.error('Status update failed:', error);
  }
};
```

**Statü Seçenekleri:**
```javascript
const statusOptions = [
  { label: 'Görüşmede', emoji: '📞', status: 'busy', customStatus: 'Görüşmede' },
  { label: 'Sistem dışı', emoji: '🚫', status: 'away', customStatus: 'Sistem dışı' },
  { label: 'Tatilde', emoji: '🏖️', status: 'away', customStatus: 'Tatilde' },
  { label: 'Evden çalışıyor', emoji: '🏠', status: 'online', customStatus: 'Evden çalışıyor' }
];
```

#### 3. Away / Online Toggle
```
┌─────────────────────────────────┐
│  🔘  Kendini uzakta yap        │  ← eğer online ise
│  ✅  Kendini çevrimiçi yap     │  ← eğer away ise
└─────────────────────────────────┘
```
- `currentStatus === 'online'` → "Kendini uzakta yap" göster
- `currentStatus === 'away'` → "Kendini çevrimiçi yap" göster
- Tıklanınca: toggle statüsü ve API çağrısı

#### 4. Bildirimleri Sessize Al (Alt Menülü)
```
┌─────────────────────────────────┐
│  🔕  Bildirimleri sessize al ▸  │
│  ┌───────────────────────────┐  │
│  │  30 dakika                 │  │
│  │  1 saat                    │  │
│  │  2 saat                    │  │
│  │  Yarına kadar              │  │
│  │  Haftaya kadar             │  │
│  │  ──────────────            │  │
│  │  Özel...                   │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

**Mute Süre Hesaplamaları:**
```javascript
const muteOptions = [
  { label: '30 dakika', duration: 30 * 60 * 1000 },
  { label: '1 saat', duration: 60 * 60 * 1000 },
  { label: '2 saat', duration: 2 * 60 * 60 * 1000 },
  { label: 'Yarına kadar', getDuration: () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.getTime() - Date.now();
  }},
  { label: 'Haftaya kadar', getDuration: () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + (8 - nextWeek.getDay()) % 7);
    nextWeek.setHours(9, 0, 0, 0);
    return nextWeek.getTime() - Date.now();
  }}
];
```

- Tıklanınca: `localStorage.setItem('optima_notifications_muted_until', muteUntil.toISOString())`
- "Özel" tıklanınca: `setMuteCustomDialogOpen(true)` → DateTimePicker dialog açılır

**"Özel" Seçeneği - MuteCustomDialog (iç bileşen):**
```jsx
const MuteCustomDialog = ({ open, onClose, onConfirm }) => (
  <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
    <DialogTitle>Bildirimleri ne zamana kadar sessize al?</DialogTitle>
    <DialogContent>
      <TextField
        type="datetime-local"
        fullWidth
        inputProps={{ min: new Date().toISOString().slice(0, 16) }}
        onChange={(e) => setSelectedDate(e.target.value)}
        sx={{ mt: 2 }}
      />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>İptal</Button>
      <Button variant="contained" onClick={() => onConfirm(selectedDate)}>
        Sessize Al
      </Button>
    </DialogActions>
  </Dialog>
);
```

#### 5. Divider
```
──────────────────────────────────
```

#### 6. Profil
- İkon: PersonOutlinedIcon
- Tıklanınca: `navigate('/admin/profile')` + `onClose()`

#### 7. Tercihler
- İkon: SettingsOutlinedIcon
- Tıklanınca: `onPreferencesClick()` + `onClose()`

#### 8. Çıkış Yap
- İkon: LogoutIcon, renk: kırmızı (#E01E5A)
- Tıklanınca: `logout()` + `navigate('/admin/login')`

---

### Alt Menü (Submenu) Stratejisi

MUI'nin iç içe Menu bileşeni karmaşık olduğu için, mutlak konumlandırılmış `Paper` kullanılacak:

```jsx
{/* Ana menü öğesi */}
<MenuItem
  onMouseEnter={() => setStatusSubmenuOpen(true)}
  onMouseLeave={() => setStatusSubmenuOpen(false)}
  sx={{ position: 'relative' }}
>
  <ListItemIcon>😊</ListItemIcon>
  <ListItemText>Statünü güncelle</ListItemText>
  <Typography sx={{ ml: 'auto', color: '#ABABAD' }}>▸</Typography>

  {/* Alt menü */}
  {statusSubmenuOpen && (
    <Paper
      sx={{
        position: 'absolute',
        left: '100%',
        top: 0,
        minWidth: 200,
        py: 0.5,
        bgcolor: isDark ? '#1A1D21' : '#ffffff',
        border: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}`,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 1
      }}
      onMouseEnter={() => setStatusSubmenuOpen(true)}
      onMouseLeave={() => setStatusSubmenuOpen(false)}
    >
      {statusOptions.map(option => (
        <MenuItem
          key={option.label}
          onClick={() => {
            updateStatus(option.status, option.customStatus, option.emoji);
            onClose();
          }}
        >
          <ListItemIcon>{option.emoji}</ListItemIcon>
          <ListItemText>{option.label}</ListItemText>
        </MenuItem>
      ))}
    </Paper>
  )}
</MenuItem>
```

---

### Tema Uyumu

Tüm bileşen `isDark` koşulunu kullanacak:
- Menü arkaplanı: `isDark ? '#1A1D21' : '#ffffff'`
- Metin rengi: `isDark ? '#E0E0E0' : '#111827'`
- İkincil metin: `isDark ? '#ABABAD' : '#6b7280'`
- Hover: `isDark ? '#27242C' : '#f0f0f0'`
- Border: `isDark ? '#35373B' : '#e5e7eb'`
- Ayırıcı: `isDark ? '#35373B' : '#e5e7eb'`

---

## AdminSidebar.js Bağlantısı

Part 1'de eklenen state ve avatar kutusuna bu bileşeni bağla:

```javascript
import ProfileDropdownMenu from './ProfileDropdownMenu';

// JSX içinde, avatar kutusunun hemen altına:
<ProfileDropdownMenu
  anchorEl={profileMenuAnchor}
  open={Boolean(profileMenuAnchor)}
  onClose={() => setProfileMenuAnchor(null)}
  onPreferencesClick={() => {
    setProfileMenuAnchor(null);
    setPreferencesOpen(true);
  }}
/>
```

---

## Referans: Mevcut StatusSelector.js Pattern
**Yol**: `/frontend/src/components/chat/StatusSelector.js` (339 satır)

Bu dosyadaki pattern referans alınabilir:
- Satır 40-48: Preset statüler (online, away, busy, offline)
- Satır 76-99: `updateStatus()` API çağrısı
- Satır 26-38: getSiteHeaders() helper

---

## Kontrol Listesi
- [ ] Yeni dosya oluşturuldu: `ProfileDropdownMenu.jsx`
- [ ] Avatar tıklanınca menü açılıyor
- [ ] Kullanıcı bilgisi (avatar, isim, durum) doğru gösteriliyor
- [ ] Statü güncelleme çalışıyor (API + WebSocket)
- [ ] Away/Online toggle çalışıyor
- [ ] Bildirimleri sessize alma süreleri çalışıyor
- [ ] "Özel" seçeneği DateTimePicker dialog açıyor
- [ ] Profil linki çalışıyor
- [ ] Tercihler tıklanınca PreferencesModal tetikleniyor (Part 3'te bağlanacak)
- [ ] Çıkış yap çalışıyor
- [ ] Dark + Light tema doğru görünüyor
- [ ] Alt menüler (statü, mute) hover'da doğru konumda açılıyor
- [ ] Build hatası yok
