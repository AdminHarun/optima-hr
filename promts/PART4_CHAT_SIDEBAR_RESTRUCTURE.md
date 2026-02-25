# PART 4: Chat Sidebar Yeniden Yapılandırma

## Görev Özeti
ChatPageNew.js dosyasındaki far-left sidebar'daki emoji ikonları MUI SVG ikonlarına çevir, Home/DMs görünüm değişimi ekle, "OPTIMA HR" header metnini kaldır, Gruplar bölümünü tamamen kaldır.

---

## Proje Bilgileri
- **Proje Yolu**: `/Users/furkandaghan/Desktop/optima/`
- **Frontend**: React 19 + Vite + MUI
- **Dosya**: `/frontend/src/pages/admin/ChatPageNew.js` (~1069 satır)
- **Tema Hook**: `useTheme()` → `{ currentTheme }` → `isDark = currentTheme !== 'basic-light'`
- **Auth**: `useEmployeeAuth()` → `{ currentUser }`
- **Router**: `useNavigate()` kullanılıyor
- **Referans Görsel**: `/Users/furkandaghan/Desktop/chat demo/slack DMs.png`

---

## Değişiklik 1: Far-Left Sidebar İkonları (Emoji → SVG)

### Yeni Import'lar
```javascript
import {
  HomeOutlined as HomeIcon,
  ChatBubbleOutline as DMsIcon,
  NotificationsOutlined as ActivityIcon,
  InsertDriveFileOutlined as FilesIcon,
  MoreHoriz as MoreIcon,
  // Mevcut import'lara ekle
} from '@mui/icons-material';
```

### Mevcut Kod (Satır ~357-367)
```javascript
const farNavItems = [
  { icon: '🏠', label: 'Home', path: '/admin/dashboard' },
  { icon: '💬', label: 'DMs', path: null, active: true, badge: rooms.filter(r => r.unreadCount > 0).length || null },
  { icon: '🔔', label: 'Activity', path: '/admin/dashboard', badgeGreen: true },
  { icon: '📁', label: 'Files', path: '/admin/documents' },
];

const farNavBottom = [
  { icon: '⋯', label: 'More', path: null },
  { icon: '⚙', label: 'Admin', path: '/admin/settings' },
];
```

### Yeni Kod
```javascript
// Yeni state: aktif görünüm (Home veya DMs)
const [activeView, setActiveView] = useState('dms'); // 'home' | 'dms'

const farNavItems = [
  { icon: <HomeIcon sx={{ fontSize: 20 }} />, label: 'Home', action: () => setActiveView('home'), active: activeView === 'home' },
  { icon: <DMsIcon sx={{ fontSize: 20 }} />, label: 'DMs', action: () => setActiveView('dms'), active: activeView === 'dms', badge: rooms.filter(r => r.unreadCount > 0).length || null },
  { icon: <ActivityIcon sx={{ fontSize: 20 }} />, label: 'Activity', path: '/admin/dashboard' },
  { icon: <FilesIcon sx={{ fontSize: 20 }} />, label: 'Files', path: '/admin/documents' },
];

const farNavBottom = [
  { icon: <MoreIcon sx={{ fontSize: 20 }} />, label: 'More', path: null },
  { icon: <SettingsIcon sx={{ fontSize: 20 }} />, label: 'Admin', path: '/admin/settings' },
];
```

### Far-Left Sidebar İkon Render Güncellemesi

Mevcut ikon render (satır ~463):
```jsx
<Typography sx={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</Typography>
```

Yeni ikon render:
```jsx
{typeof item.icon === 'string' ? (
  <Typography sx={{ fontSize: '20px', lineHeight: 1 }}>{item.icon}</Typography>
) : (
  <Box sx={{ lineHeight: 1, display: 'flex' }}>{item.icon}</Box>
)}
```

### onClick Güncellemesi

Mevcut (satır ~429):
```jsx
onClick={() => item.path && navigate(item.path)}
```

Yeni:
```jsx
onClick={() => {
  if (item.action) item.action();
  else if (item.path) navigate(item.path);
}}
```

### Aktif İkon Stili
Her far-left nav item'da `item.active` kontrolü zaten var. `active` artık `activeView` state'ine bağlı olacak (yukarıdaki tanıma bakın). Sol kenar mavi çizgi (#36C5F0) aktif öğede gösterilmeye devam edecek.

---

## Değişiklik 2: "OPTIMA HR" Header Kaldırma

### Kaldırılacak Kod (Satır ~538-617)
Main sidebar'ın header bölümündeki "OPTIMA HR" yazısı ve yanındaki ▼ simgesi kaldırılacak.

**Mevcut:**
```jsx
<Typography sx={{ fontWeight: 700, color: isDark ? '#E0E0E0' : '#111827', fontSize: '18px', ... }}>
  OPTIMA HR
  <Typography component="span" sx={{ fontSize: '10px', ... }}>▼</Typography>
</Typography>
```

**Yeni (activeView'e göre):**
```jsx
<Typography sx={{ fontWeight: 700, color: isDark ? '#E0E0E0' : '#111827', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}>
  {activeView === 'home' ? 'Home' : 'Direct Messages'}
  <Typography component="span" sx={{ fontSize: '10px', color: isDark ? '#ABABAD' : '#6b7280', ml: 0.5 }}>▼</Typography>
</Typography>
```

### Header Sağ Taraf İkonları
- SettingsIcon (filtre/ayar) ve EditIcon (compose/yeni mesaj) kalacak
- "Yeni Grup Oluştur" menü öğesi kaldırılacak (Gruplar kalkıyor)
- EditIcon'a tıklanınca: DMs modunda "Yeni DM" eylemi (yeni sohbet başlatma)

**Menu içeriği güncellemesi:**
```jsx
<Menu ...>
  <MenuItem onClick={() => { setAddMenuAnchor(null); /* Yeni DM başlat */ }}>
    <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
    <ListItemText>Yeni Mesaj</ListItemText>
  </MenuItem>
</Menu>
```

---

## Değişiklik 3: Gruplar Bölümü Kaldırma

### Kaldırılacak State'ler
```javascript
const [groups, setGroups] = useState([]);           // satır 29
const [groupsOpen, setGroupsOpen] = useState(true); // satır 39
const [createGroupOpen, setCreateGroupOpen] = useState(false); // satır 34
```

### Kaldırılacak Import
```javascript
import CreateGroupModal from '../../components/chat/CreateGroupModal'; // satır 7
```

### Kaldırılacak useEffect (Satır ~121-155)
```javascript
// Load group chats
useEffect(() => {
  const loadGroups = async () => { ... };
  loadGroups();
  const interval = setInterval(loadGroups, 15000);
  return () => clearInterval(interval);
}, []);
```

### Kaldırılacak Fonksiyonlar
```javascript
const handleGroupCreated = (group) => { ... };  // satır ~180-192
```

### Kaldırılacak Computed Değer
```javascript
const filteredGroups = groups.filter(...);  // satır ~297-299
```

### Kaldırılacak JSX - Gruplar SectionHeader + Collapse (Satır ~825-890)
```jsx
{/* ─── Group Messages ─── */}
<SectionHeader label="Gruplar" ... />
<Collapse in={groupsOpen}> ... </Collapse>
```

### Kaldırılacak JSX - CreateGroupModal (Satır ~1059-1064)
```jsx
<CreateGroupModal
  open={createGroupOpen}
  onClose={() => setCreateGroupOpen(false)}
  onGroupCreated={handleGroupCreated}
/>
```

---

## Değişiklik 4: Home / DMs Görünüm Değişimi

### Main Sidebar İçerik (`activeView` state'ine göre)

**DMs Görünümü (activeView === 'dms'):**
Mevcut yapı korunacak ama sadeleştirilecek:
- Header: "Direct Messages ▼" + Compose ikonu
- "Find a DM" search alanı (mevcut arama kutusu)
- Nav items (Threads, Huddles, Directories) → Sadece DMs modunda göster
- Direct Messages section → mevcut DM listesi
- Kanallar section → **DMs modunda GÖSTERİLMEYECEK**

**Home Görünümü (activeView === 'home'):**
- Header: "Home ▼"
- Son aktiviteler listesi (DM + kanal karışık, zamana göre sıralı)
- Her öğe: avatar/ikon + isim + son mesaj + zaman
- Kanallar section → Home modunda gösterilecek

### Koşullu Render Yapısı
```jsx
{/* Scrollable Sections */}
<Box sx={{ flex: 1, overflowY: 'auto', ... }}>

  {activeView === 'home' ? (
    <>
      {/* Home View: Son aktiviteler (DM + Kanal karışık) */}
      {[...filteredRooms.map(r => ({...r, type: 'dm'})),
        ...filteredChannels.map(c => ({...c, type: 'channel', lastMessageTime: new Date()}))
       ].sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0))
       .map((item) => (
         <Box key={item.id} onClick={() => item.type === 'dm' ? handleRoomSelect(item) : handleChannelSelect(item)} sx={/* mevcut DM item stili */}>
           {/* Avatar veya kanal ikonu */}
           {/* İsim */}
           {/* Son mesaj snippet */}
           {/* Zaman */}
         </Box>
       ))
      }
    </>
  ) : (
    <>
      {/* DMs View: Mevcut DM listesi */}
      <SectionHeader label="Direct Messages" isOpen={dmOpen} onToggle={() => setDmOpen(!dmOpen)} />
      <Collapse in={dmOpen}>
        {/* Mevcut DM render kodu */}
      </Collapse>

      {/* Kanallar - sadece Home'da göster, DMs'de gizle */}
      {/* Kanallar bölümü buraya taşınmayacak */}
    </>
  )}

  {/* Kanallar - her iki modda da gösterilebilir */}
  {activeView === 'home' && (
    <>
      <SectionHeader label="Kanallar" isOpen={channelsOpen} onToggle={() => setChannelsOpen(!channelsOpen)} />
      <Collapse in={channelsOpen}>
        {/* Mevcut kanal render kodu */}
      </Collapse>
    </>
  )}
</Box>
```

---

## Değişiklik 5: Nav Items Güncelleme (Main Sidebar)

### Mevcut (Satır ~668-696)
```jsx
{[
  { icon: '💬', label: 'Threads' },
  { icon: '🎧', label: 'Huddles' },
  { icon: '📁', label: 'Directories' }
].map((nav) => (...))}
```

### Yeni - SVG İkonlarla
```jsx
import {
  ForumOutlined as ThreadsIcon,
  HeadsetMicOutlined as HuddlesIcon,
  FolderOutlined as DirectoriesIcon,
} from '@mui/icons-material';

{activeView === 'dms' && (
  <Box sx={{ py: 1 }}>
    {[
      { icon: <ThreadsIcon sx={{ fontSize: 18 }} />, label: 'Threads' },
      { icon: <HuddlesIcon sx={{ fontSize: 18 }} />, label: 'Huddles' },
      { icon: <DirectoriesIcon sx={{ fontSize: 18 }} />, label: 'Directories' }
    ].map((nav) => (
      <Box key={nav.label} sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 1, cursor: 'pointer',
        color: isDark ? '#ABABAD' : '#6b7280', fontSize: '14px',
        '&:hover': { bgcolor: isDark ? '#27242C' : '#f0f0f0', color: isDark ? '#E0E0E0' : '#374151' }
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: '20px' }}>{nav.icon}</Box>
        <Typography sx={{ fontSize: '14px', color: 'inherit' }}>{nav.label}</Typography>
      </Box>
    ))}
  </Box>
)}
```

---

## Tema Uyumu

Tüm yeni SVG ikonlar mevcut renk şemasını kullanacak:
- Normal: `isDark ? '#ABABAD' : '#6b7280'`
- Hover/Aktif: `isDark ? '#E0E0E0' : '#111827'`
- Aktif arkaplan: `isDark ? '#27242C' : '#e5e7eb'`
- Sol kenar aktif çizgi: `#36C5F0`

---

## Kontrol Listesi
- [ ] Far-left sidebar emoji ikonlar → MUI SVG ikonları oldu
- [ ] `activeView` state'i eklendi ('home' | 'dms')
- [ ] Home ikonu → Home view, DMs ikonu → DMs view gösteriyor
- [ ] Aktif ikon sol kenar mavi çizgiyle belirtiliyor
- [ ] "OPTIMA HR" header metni kaldırıldı, yerine "Home" / "Direct Messages" geldi
- [ ] Gruplar tamamen kaldırıldı (state, useEffect, render, CreateGroupModal)
- [ ] Home view: Son aktiviteler (DM + kanal karışık) gösteriyor
- [ ] DMs view: Sadece DM listesi gösteriyor
- [ ] Nav items (Threads, Huddles, Directories) SVG ikonlu
- [ ] Kanallar: Home'da gösteriliyor, DMs'de gizli
- [ ] Build hatası yok
- [ ] Dark + Light tema doğru görünüyor
- [ ] Mevcut sohbet seçme ve mesajlaşma çalışıyor
