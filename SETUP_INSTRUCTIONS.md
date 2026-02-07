# Optima HR - Multi-Tenant Upgrade & Electron Setup

## 🎯 Yapılan Değişiklikler

### 1. Database Migration ✅
- `sites` tablosu oluşturuldu (FIXBET, MATADORBET, ZBahis)
- Tüm tablolara `site_id` eklendi
- Permission sistemi eklendi
- Audit log sistemi eklendi

### 2. Backend Multi-Tenant ✅
- Site middleware eklendi
- Permission middleware eklendi
- Token servisi oluşturuldu (encoded Base64 tokenlar)
- Başvuru route'una site izolasyonu eklendi

### 3. Electron Desktop App ✅
- Mac ve Windows desteği
- Auto-update sistemi
- System tray entegrasyonu
- Native menüler (Türkçe)

---

## 🚀 Kurulum Adımları

### 1. Database Migration Çalıştır

```bash
cd backend-express
node scripts/runMigration.js
```

Bu komut:
- Sites tablosunu oluşturur (FXB, MTD, ZBH)
- Mevcut verilere `site_id = 1` (FIXBET) atar
- Permission tablosunu doldurur
- Index'leri oluşturur

### 2. Backend Bağımlılıkları

Backend'de yeni bağımlılık eklenmedi, mevcut sistem çalışacak.

### 3. Electron Bağımlılıkları Yükle

Ana dizinde (optima/):

```bash
npm install
```

Bu şunları yükler:
- electron
- electron-builder  
- electron-updater
- electron-is-dev
- concurrently
- wait-on

### 4. Icon Dosyalarını Hazırla

`electron/assets/` klasörüne şu dosyaları kopyala:

1. **icon.png** (512x512 veya 1024x1024)
   - Kaynak: `frontend/src/assets/images/logo1.png` veya `logo2.png`
   - Uygulama ikonu

2. **tray-icon.png** (32x32 veya 64x64)
   - System tray için küçük ikon
   - Logo'nun küçük versiyonu

3. **dmg-background.png** (540x380) - Opsiyonel
   - DMG installer arka planı
   - Optima branding için

**Icon oluşturma (otomatik):**
```bash
# Mac'te (iconv kullanarak)
sips -z 512 512 frontend/src/assets/images/logo1.png --out electron/assets/icon.png

# Tray icon
sips -z 32 32 frontend/src/assets/images/logo1.png --out electron/assets/tray-icon.png
```

### 5. Frontend Build

```bash
cd frontend
npm run build
```

Bu `build/` klasörünü oluşturur.

---

## 🖥️ Electron Uygulamayı Çalıştırma

### Development Mode (Test)

```bash
# Terminal 1: Backend çalıştır
cd backend-express
npm start

# Terminal 2: Frontend + Electron çalıştır  
cd .. # ana dizine dön
npm run electron:dev
```

Bu:
1. React dev server'ı başlatır (localhost:3000)
2. Backend API server (localhost:9000)
3. Electron penceresi açar

### Production Build (DMG oluştur)

```bash
# Frontend build
cd frontend
npm run build

# Electron Mac build
cd ..
npm run electron:build:mac
```

Sonuç:
```
dist/
└── Optima HR-1.0.0.dmg  ← BU DOSYA!
```

### .DMG Kurulum

1. `Optima HR-1.0.0.dmg` dosyasını çift tıkla
2. Optima HR'ı Applications'a sürükle
3. Applications'dan aç
4. İlk açılışta "güvenilmeyen geliştirici" uyarısı:
   - System Preferences → Security → "Open Anyway"

---

## 🔧 Yapılandırma

### API URL Değiştirme

Frontend `.env` dosyası:

```bash
# Development
REACT_APP_API_URL=http://localhost:9000

# Production  
REACT_APP_API_URL=https://api.optimahr.com
```

### Auto-Update Sunucusu

`package.json` içinde:

```json
"publish": {
  "provider": "generic",
  "url": "https://updates.optimahr.com"
}
```

Buraya yeni versiyonları yükleyin:
```
https://updates.optimahr.com/
├── latest-mac.yml
└── Optima HR-1.0.1.dmg
```

---

## 📱 Kullanıcı Deneyimi

### İlk Açılış

1. Uygulama açılır
2. Login ekranı görünür
3. **Email:** admin@optima.com
4. **Şifre:** admin123 (mock data - şuanlık)

### Süper Admin Özellikleri

- Sol üstte site seçici görünür: `[FIXBET ▼]`
- Dropdown'dan MATADORBET, ZBahis'e geçiş yapabilir
- Her site tamamen izole veri

### Auto-Update

Uygulama her açılışta:
1. Update kontrolü yapar
2. Yeni versiyon varsa bildirim gösterir
3. Kullanıcı "İndir" derse arka planda indirir
4. "Kur" derse uygulamayı yeniden başlatır

---

## 🎫 Token Sistemi Kullanımı

### Yeni Başvuru Linki Oluştur

Backend API:

```javascript
POST /api/invitations/create-link

Body:
{
  "siteId": 1,  // FIXBET = 1, MATADORBET = 2, ZBahis = 3
  "title": "Ocak 2026 Başvuruları",
  "maxUses": 100,  // Opsiyonel
  "expiresAt": "2026-02-01"  // Opsiyonel
}

Response:
{
  "token": "eyJzaXRlIjoiRlhCIiwiaWQiOiJhYmMxMjMifQ",
  "url": "https://basvuru.optimahr.com/eyJzaXRlIjoiRlhCIiwiaWQiOiJhYmMxMjMifQ"
}
```

### Token Decode

Token içinde:
```json
{
  "site": "FXB",
  "id": "abc123",
  "ts": 1737504000000
}
```

Aday bu linke tıklayınca:
1. Token decode edilir → `site = FXB`
2. Başvuru FIXBET'e kaydedilir (`site_id = 1`)
3. Chat odası FIXBET bazlı oluşturulur

---

## 🔒 Güvenlik Notları

### Permission Kontrolü

Backend'de her endpoint:

```javascript
router.post('/applications/:id/hire',
  requirePermission('applications', 'hire'),
  async (req, res) => {
    // Sadece yetkisi olanlar buraya girebilir
  }
);
```

### DM Engelleme

```javascript
// Aday → Aday mesaj engellenecek
if (sender.role === 'APPLICANT' && receiver.role === 'APPLICANT') {
  return res.status(403).json({ error: 'Adaylar birbirine mesaj gönderemez' });
}
```

### Site İzolasyonu

Her query otomatik:

```sql
SELECT * FROM applicant_profiles WHERE site_id = ?
```

---

## 🐛 Sorun Giderme

### "Geçersiz davet linki" Hatası

- Migration çalıştırıldı mı?
- Sites tablosu dolu mu?
  ```bash
  psql optima_hr -c "SELECT * FROM sites;"
  ```

### Electron açılmıyor

- `npm install` yapıldı mı?
- `frontend/build/` klasörü var mı?
- Terminal'de hata var mı?

### DMG oluşturamıyorum

- Icon dosyaları var mı? (`electron/assets/icon.png`)
- Xcode Command Line Tools kurulu mu?
  ```bash
  xcode-select --install
  ```

---

## 📋 Checklist

Üretim öncesi:

- [ ] Database migration çalıştırıldı
- [ ] Sites tablosu dolu (FXB, MTD, ZBH)
- [ ] Permission'lar tanımlı
- [ ] Icon dosyaları hazır
- [ ] Frontend build yapıldı
- [ ] Backend API URL production'a çevrildi
- [ ] DMG build test edildi
- [ ] Mac'te kurulum test edildi
- [ ] Update sunucusu hazır

---

## 🚀 Deployment

### Frontend Build (Production)

```bash
cd frontend
REACT_APP_API_URL=https://api.optimahr.com npm run build
```

### Electron Build

```bash
npm run electron:build:mac
```

### Upload

```bash
# DMG'yi sunucuya yükle
scp dist/Optima\ HR-1.0.0.dmg user@server:/var/www/updates/

# latest-mac.yml'yi yükle
scp dist/latest-mac.yml user@server:/var/www/updates/
```

---

## 📞 Destek

Sorun yaşarsanız:

1. Terminal loglarını kontrol edin
2. Browser console'a bakın (Electron DevTools)
3. Database connection'ı test edin
4. Migration loglarını inceleyin

**Başarılar!** 🎉
