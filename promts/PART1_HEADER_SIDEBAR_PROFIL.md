# PART 1: AdminHeader Temizlik + AdminSidebar Profil Kutusu

## Görev Özeti
AdminHeader'daki profil menüsünü (avatar, isim, rol chip'i, tema seçici) tamamen kaldır. AdminSidebar'ın alt kısmına küçük bir profil avatar kutusu ekle. Bu kutu Part 2'de oluşturulacak ProfileDropdownMenu bileşeninin tetikleyicisi olacak.

---

## Proje Bilgileri
- **Proje Yolu**: `/Users/furkandaghan/Desktop/optima/`
- **Frontend**: React 19 + Vite + MUI + Tailwind CSS
- **Tema**: `useTheme()` hook'u → `isDark = currentTheme !== 'basic-light'`
- **Auth**: `useEmployeeAuth()` → `currentUser` objesi (id, email, firstName, lastName, role, avatar)

---

## Dosya 1: AdminHeader.js
**Yol**: `/frontend/src/components/admin/AdminHeader.js` (734 satır)

### Kaldırılacak Bölümler

**1. State ve handler'lar (profil menüsü ile ilgili):**
- `anchorEl` state ve `setAnchorEl`
- `themeMenuOpen` state ve `setThemeMenuOpen`
- `handleProfileMenu`, `handleClose`, `handleThemeChange` fonksiyonları
- Profil menüsü ile ilgili tüm import'lar: `PaletteIcon`, `CheckIcon`, `LightModeIcon`, `DarkModeIcon`, `LandscapeIcon`, `Chip` (profil ile ilgili olanlar)

**2. JSX - Sağ taraftaki profil bölümü (~satır 291-352):**
- Kullanıcı adı Typography
- Rol chip'i
- Avatar IconButton (onClick → profil menüsü açıyor)
- Bu bölümü tamamen kaldır, sadece bildirim zili (NotificationsIcon) kalacak

**3. JSX - Profil dropdown Menu (~satır 357-612):**
- `<Menu anchorEl={anchorEl}...>` bloğunun tamamı
- İçindeki: Avatar, isim, email, rol chip'i
- Tema seçici toggle + tema listesi
- "Profilim" ve "Çıkış Yap" butonları
- TÜMÜNÜ kaldır

**4. Bildirim bölümü (sakla):**
- NotificationsIcon + badge → KALACAK
- Notification dialog → KALACAK

### Sonuç
AdminHeader sadece şunları içerecek:
- Sol: SiteSelector
- Orta: NavButton'lar (Mesajlar, Mail, Aramalar, Takvim)
- Sağ: Bildirim zili + badge

---

## Dosya 2: AdminSidebar.js
**Yol**: `/frontend/src/components/admin/AdminSidebar.js` (384 satır)

### Kaldırılacak/Değiştirilecek Bölümler

**1. Header Logo Bölümü (~satır 196-210):**
- Mevcut büyük logo + "Yönetim Paneli" yazısı → Sadeleştir
- Küçük bir logo veya workspace simgesi yeterli (isteğe bağlı bırakılabilir, şimdilik kalsın)

**2. "Hoş geldiniz" Selamlama (~satır 214-235):**
- "Hoş geldiniz," + kullanıcı adı + site chip'i → Tamamen kaldır
- Bu bilgi artık profil menüsünde olacak

**3. Footer Versiyon Bilgisi (~satır 362-379):**
- "v1.5.0 - OPTIMA HR Management System" + güvenlik badge'i → Kaldır
- Yerine profil avatar kutusu gelecek

### Eklenecek: Profil Avatar Kutusu (Sidebar'ın En Altına)

Sidebar'ın flex yapısında (Drawer içinde zaten column flex), menü öğelerinden sonra `mt: 'auto'` ile en alta itilecek profil kutusu:

```jsx
{/* Profil Avatar Kutusu */}
<Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
  <Box
    onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
    sx={{
      width: 36,
      height: 36,
      borderRadius: '8px',
      bgcolor: 'var(--theme-button-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: '14px',
      color: 'white',
      position: 'relative',
      '&:hover': { opacity: 0.9 }
    }}
  >
    {/* Kullanıcı baş harfleri veya avatar */}
    {currentUser?.avatar ? (
      <img src={currentUser.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }} />
    ) : (
      `${currentUser?.firstName?.[0] || ''}${currentUser?.lastName?.[0] || ''}`.toUpperCase()
    )}
    {/* Online durumu dot */}
    <Box sx={{
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 12,
      height: 12,
      bgcolor: '#2EB67D', // online yeşil
      border: '2px solid var(--theme-sidebar-bg)',
      borderRadius: '50%'
    }} />
  </Box>
</Box>
```

### Yeni State Değişkenleri
```javascript
const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
const [preferencesOpen, setPreferencesOpen] = useState(false);
```

### İleride Bağlanacak Noktalar (Part 2 ve 3'te)
```jsx
{/* Part 2'de eklenecek: */}
{/* <ProfileDropdownMenu
  anchorEl={profileMenuAnchor}
  open={Boolean(profileMenuAnchor)}
  onClose={() => setProfileMenuAnchor(null)}
  onPreferencesClick={() => { setProfileMenuAnchor(null); setPreferencesOpen(true); }}
/> */}

{/* Part 3'te eklenecek: */}
{/* <PreferencesModal
  open={preferencesOpen}
  onClose={() => setPreferencesOpen(false)}
/> */}
```

---

## Kontrol Listesi
- [ ] AdminHeader: Profil avatar, isim, rol chip'i kaldırıldı
- [ ] AdminHeader: Tema seçici menü kaldırıldı
- [ ] AdminHeader: Sadece SiteSelector + NavButtons + Bildirim zili kaldı
- [ ] AdminSidebar: "Hoş geldiniz" bloğu kaldırıldı
- [ ] AdminSidebar: Footer versiyon bilgisi kaldırıldı
- [ ] AdminSidebar: Alt köşeye 36x36 avatar kutusu eklendi
- [ ] AdminSidebar: profileMenuAnchor ve preferencesOpen state'leri eklendi
- [ ] Build hatası yok
- [ ] Mevcut tüm özellikler çalışıyor (navigasyon, bildirimler, chat)
- [ ] Dark + Light tema doğru görünüyor
