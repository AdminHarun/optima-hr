# Optima HR - Yapılacaklar Listesi

## Durum: Beklemede
Son Güncelleme: 2026-02-08

---

## 1. Süresi Dolan Link Sayfası - "Ana Sayfaya Dön" Butonu Kaldırılacak

**Dosya:** `frontend/src/pages/ApplicationFormSimple.js` (satır 547-559)

**Sorun:** Süresi dolmuş linkler için gösterilen sayfada "Ana Sayfaya Dön" butonu admin login sayfasına yönlendiriyor (`navigate('/')` → `/admin/login`).

**Çözüm:** Bu butonu tamamen kaldır veya sadece bilgi metni bırak.

**Etkilenen Kod:**
```javascript
// KALDIRILACAK:
<Button
  variant="contained"
  onClick={() => navigate('/')}
  ...
>
  Ana Sayfaya Dön
</Button>
```

---

## 2. Ana Sayfa Tasarımı - Profesyonel Landing Page

**Dosyalar:**
- `frontend/src/App.js` (satır 354) - Routing değişikliği
- `frontend/src/pages/LandingPage.js` - **YENİ DOSYA**

**Mevcut Durum:**
```javascript
// App.js satır 354
<Route path="/" element={<Navigate to="/admin/login" replace />} />
```

**Yapılacaklar:**
- [ ] Profesyonel bir LandingPage.js componenti oluştur
- [ ] İş dünyası görselleri (Unsplash/Pexels API veya statik)
- [ ] "Giriş Yap" butonu → /admin/login
- [ ] Şirket hakkında kısa bilgi
- [ ] HR hizmetleri özeti
- [ ] Modern, responsive tasarım

---

## 3. Chat Sorunları - Admin ve Applicant Tarafı

### 3.1 Admin Chat Profil Görünmeme Sorunu

**Dosya:** `frontend/src/pages/admin/ChatPageNew.js`

**Sorun:** Form doldurulduktan sonra başvuranların profili admin chat'te görünmüyor.

**Araştırılacak:**
- ChatContainer'a geçirilen participantId doğru mu?
- Backend `/chat/api/rooms/applicant_rooms/` endpoint'i doğru data dönüyor mu?
- ApplicantProfileModal açılabiliyor mu?

### 3.2 Applicant Chat Mesaj Yüklenmiyor Hatası

**Dosya:** `frontend/src/pages/ApplicantChat.js`

**Sorun:** "Bağlantı var" diyor ama "Mesajlar yüklenemedi" hatası.

**Olası Sebepler:**
- WebSocket bağlantısı kurulmuş ama HTTP `/chat/api/rooms/${roomId}/messages` endpoint'i 401/403 dönüyor olabilir
- Room oluşturulmamış olabilir (form submit sırasında chat room create edilmeli)
- CORS veya credentials sorunu

**Kontrol Edilecek:**
```javascript
// Satır 143-165
const loadMessages = async () => {
  const response = await fetch(`${API_BASE_URL}/chat/api/rooms/${roomId}/messages`, {
    credentials: 'include'
  });
  // ...
}
```

---

## 4. Profesyonel Landing Page Tasarım Detayları

**Beklenen Özellikler:**
- Hero section (büyük başlık + CTA butonları)
- Hizmetler bölümü (İşe alım, Performans, Bordro vb.)
- Görseller (iş dünyası temalı stock fotolar)
- Footer (iletişim, sosyal medya)
- Animasyonlu geçişler (Framer Motion veya CSS)
- Tam responsive (mobil uyumlu)

**Renk Paleti:**
- Primary: #1c61ab (Optima Mavi)
- Secondary: #8bb94a (Optima Yeşil)
- Background: Gradient veya site_background.jpg

---

## 5. Bildirim Sistemi - Gerçek Zamanlı Bildirimler

**Dosya:** `frontend/src/components/admin/AdminHeader.js`

**Mevcut Durum (satır 116-152):**
```javascript
const getNotifications = () => {
  // Sadece localStorage'dan son 24 saatteki başvuruları okuyor
  // Sabit, gerçek zamanlı değil
}
```

**Yapılacaklar:**
- [ ] NotificationContext oluştur (veya mevcut olanı genişlet)
- [ ] Bildirim türleri:
  - Yeni form başvurusu geldiğinde
  - Yeni profil oluşturulduğunda
  - Yeni mesaj geldiğinde
- [ ] Okundu/Okunmadı durumu takibi
- [ ] localStorage veya backend'de bildirim state'i sakla
- [ ] Badge sayısı: Okunmamış bildirim sayısı
- [ ] Bildirim açıldığında okundu işaretle
- [ ] WebSocket ile gerçek zamanlı bildirim (opsiyonel)

**Bildirim Yapısı:**
```javascript
{
  id: string,
  type: 'new_application' | 'new_profile' | 'new_message',
  title: string,
  message: string,
  timestamp: Date,
  read: boolean,
  link: string // tıklandığında nereye gidecek
}
```

---

## 6. Favicon Değişikliği - React → Optima

**Dosyalar:**
- `frontend/public/index.html` (satır 5)
- `frontend/public/favicon.ico` - Değiştirilecek
- `frontend/public/manifest.json` - Güncellenecek

**Mevcut:**
```html
<link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
```

**Yapılacak:**
- [ ] Optima logosundan favicon oluştur (16x16, 32x32, 48x48)
- [ ] `logo3.ico` veya yeni bir `optima-favicon.ico` kullan
- [ ] manifest.json'daki ikonları güncelle

**Not:** `logo3.ico` ve `logo3.png` zaten mevcut - bunları favicon olarak ayarla.

---

## 7. Cloudflare R2 Dosya Depolama (SON ADIM)

**Detaylı plan:** `r2-migration-plan.md` dosyasında mevcut.

**Özet:**
- AWS SDK kurulumu
- R2 Storage Service oluşturma
- Multer memory storage'a geçiş
- Applications ve Chat route'larını güncelleme
- Environment variables ekleme

---

## Öncelik Sırası

1. **Favicon değişikliği** (Kolay, hızlı)
2. **"Ana Sayfaya Dön" butonu kaldırma** (Kolay, 1 satır)
3. **Chat sorunlarını araştır ve düzelt** (Orta zorluk)
4. **Landing Page tasarımı** (Orta-Yüksek zorluk)
5. **Bildirim sistemi** (Yüksek zorluk)
6. **Cloudflare R2 entegrasyonu** (Yüksek zorluk, son adım)

---

## Notlar

- Chat sorunları için backend loglarına bakmak gerekebilir
- Landing Page için Unsplash API kullanılabilir (ücretsiz stock fotolar)
- Bildirim sistemi WebSocket entegrasyonu ile daha iyi çalışır
- R2 için Cloudflare hesabında bucket ve API token oluşturulması gerekli
