# 🔧 PHASE 0: ACİL DÜZELTMELER
## Bu bölümü Claude'a ilk olarak gönder

---

## 🎯 GÖREV: Mevcut Hataları Düzelt (YAPILACAKLAR.md)

**Context:** `/Users/furkandaghan/Documents/verdent-projects/optima/YAPILACAKLAR.md` dosyasında listelenmiş acil sorunlar var.

### 📌 TASK 0.1: Chat Mesaj Yüklenme Hatası Düzeltmesi

**Sorun Açıklaması:**
- Dosya: `frontend/src/pages/ApplicantChat.js`
- Belirti: "Bağlantı var" diyor ama "Mesajlar yüklenemedi" hatası
- Olası Sebepler:
  - WebSocket bağlı ama HTTP endpoint 401/403 dönüyor
  - Room oluşturulmamış
  - CORS/credentials sorunu

**Yapılacaklar:**

1. **Backend: Chat room otomatik oluşturma kontrolü**
   - Dosya: `backend-express/routes/applications.js` (veya form submission endpoint'i)
   - Form submit edildiğinde otomatik chat room oluşturulmalı
   - Kontrol: Room varsa skip, yoksa oluştur

2. **Frontend: ApplicantChat.js hata ayıklama**
   - Dosya: `frontend/src/pages/ApplicantChat.js` (satır 143-165)
   - `loadMessages` fonksiyonuna detaylı hata yakalama ekle
   - Console log'ları ekle (roomId, response status, error details)
   - Credentials kontrolü

3. **Backend: Applicant chat endpoint auth kontrolü**
   - Dosya: `backend-express/routes/chat.js` (veya ilgili route)
   - `/chat/api/rooms/${roomId}/messages` endpoint'i
   - Applicant için özel auth middleware gerekebilir (sadece kendi room'una erişim)

**Claude'a Gönderilecek Prompt:**

```
GÖREV: Optima HR projesinde ApplicantChat mesaj yüklenme hatası var.

SORUN: Applicant chat'te "Bağlantı var" diyor ama mesajlar yüklenemiyor.

İŞLEMLER:

1. Backend'de form submission sırasında chat room otomatik oluşturulma mantığını kontrol et ve gerekirse ekle:
   - Dosya: backend-express/routes/applications.js (veya form endpoint'i)
   - Room oluşturma: applicant_id ile chat_rooms tablosuna kayıt
   - Eğer room varsa skip, yoksa oluştur

2. Frontend'de ApplicantChat.js içindeki loadMessages fonksiyonunu incele:
   - Dosya: frontend/src/pages/ApplicantChat.js (satır 143-165 civarı)
   - Detaylı console.log ekle (roomId, response.status, error message)
   - Credentials ve CORS ayarlarını kontrol et

3. Backend'de /chat/api/rooms/${roomId}/messages endpoint'ini incele:
   - Applicant'ın sadece kendi room'una erişebildiğinden emin ol
   - Auth middleware kontrolü
   - Hata mesajlarını döndür

BEKLENEN ÇIKTI:
- Hatanın kök sebebini bul
- Düzeltmeleri yap
- Test senaryosu öner
```

---

### 📌 TASK 0.2: Admin Chat Profil Görünmeme Sorunu

**Sorun Açıklaması:**
- Dosya: `frontend/src/pages/admin/ChatPageNew.js`
- Belirti: Form doldurulduktan sonra başvuranların profili admin chat'te görünmüyor

**Yapılacaklar:**

1. **Backend: Applicant rooms endpoint kontrolü**
   - Endpoint: `/chat/api/rooms/applicant_rooms/`
   - Return data: başvuran bilgileri + room bilgileri

2. **Frontend: ChatPageNew.js data flow kontrolü**
   - ChatContainer'a doğru participantId geçiyor mu?
   - ApplicantProfileModal açılabiliyor mu?

**Claude'a Gönderilecek Prompt:**

```
GÖREV: Admin chat'te başvuranların profilleri görünmüyor.

SORUN: Form doldurulduktan sonra admin panel chat'inde başvuranlar listeleniyor ama profil detayları görünmüyor.

İŞLEMLER:

1. Backend endpoint kontrolü:
   - Dosya: backend-express/routes/chat.js
   - Endpoint: /chat/api/rooms/applicant_rooms/
   - Response'da başvuran profil bilgileri tam olarak dönüyor mu kontrol et
   - Gerekli JOIN'ler yapılmış mı? (applicant_profiles, employees_employee vs.)

2. Frontend data flow kontrolü:
   - Dosya: frontend/src/pages/admin/ChatPageNew.js
   - ChatContainer'a participantId doğru geçiyor mu?
   - ApplicantProfileModal'a gerekli props geçiyor mu?
   - Console.log ekleyerek data akışını kontrol et

3. ApplicantProfileModal component kontrolü:
   - Dosya: frontend/src/components/chat/ApplicantProfileModal.js
   - participantId ile profil bilgisi çekiliyor mu?
   - Hata varsa console'a bas

BEKLENEN ÇIKTI:
- Profil görünmeme sebebini bul
- Eksik data varsa backend'e ekle
- Frontend'de doğru mapping yap
```

---

### 📌 TASK 0.3: Favicon Değişikliği

**Sorun Açıklaması:**
- Dosya: `frontend/public/index.html`, `frontend/index.html`
- Mevcut: React default favicon
- İstenilen: Optima logosu (logo3.ico, logo3.png mevcut)

**Claude'a Gönderilecek Prompt:**

```
GÖREV: Favicon'u Optima logosuna değiştir.

İŞLEMLER:

1. Frontend public klasöründeki favicon referanslarını güncelle:
   - Dosya: frontend/public/index.html veya frontend/index.html (hangisi varsa)
   - Mevcut: <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
   - Değiştir: logo3.ico kullan
   - Dosya: frontend/public/manifest.json
   - icons array'ini logo3.png ile güncelle

2. Favicon dosyalarını kontrol et:
   - logo3.ico ve logo3.png var mı? (frontend/public/ içinde)
   - Yoksa oluştur veya kullanıcıya bildir

BEKLENEN ÇIKTI:
- Favicon başarıyla değiştirilmiş olsun
- manifest.json güncellenmiş olsun
- Tarayıcı refresh sonrası yeni favicon görünsün
```

---

### 📌 TASK 0.4: Landing Page Oluşturma

**Sorun Açıklaması:**
- Dosya: `frontend/src/App.js` (satır 354)
- Mevcut: `<Route path="/" element={<Navigate to="/admin/login" replace />} />`
- İstenilen: Profesyonel landing page

**Claude'a Gönderilecek Prompt:**

```
GÖREV: Optima HR için profesyonel bir Landing Page oluştur.

CONTEXT:
- Mevcut durum: Ana sayfa doğrudan /admin/login'e yönlendiriyor
- Dosya: frontend/src/App.js (satır 354 civarı)
- Tema renkleri: Primary #1c61ab (mavi), Secondary #8bb94a (yeşil)

İŞLEMLER:

1. Yeni component oluştur:
   - Dosya: frontend/src/pages/LandingPage.js
   - Modern, responsive tasarım (Tailwind CSS + MUI kullan)
   
2. İçerik:
   - Hero Section:
     * Büyük başlık: "İnsan Kaynakları Yönetimini Kolaylaştırın"
     * Alt başlık: "Optima HR ile ekibinizi verimli yönetin"
     * CTA butonları: "Giriş Yap" (→ /admin/login), "Daha Fazla Bilgi"
   
   - Özellikler Bölümü (3-4 kart):
     * İşe Alım Yönetimi
     * Çalışan Performansı
     * Bordro & Puantaj
     * İç İletişim & Chat
   
   - Footer:
     * Copyright
     * İletişim bilgisi placeholder

3. Routing güncelle:
   - Dosya: frontend/src/App.js
   - Değiştir: <Route path="/" element={<Navigate to="/admin/login" />} />
   - Yeni: <Route path="/" element={<LandingPage />} />

4. Görsel:
   - Mevcut: frontend/public/wallpapers/ veya frontend/public/assets/images/
   - Hero section için arka plan görseli kullan veya gradient

BEKLENEN ÇIKTI:
- Profesyonel görünümlü landing page
- Responsive (mobil uyumlu)
- Optima tema renklerini kullanarak tasarlanmış
- Giriş butonları çalışıyor
```

---

## ✅ PHASE 0 Tamamlanma Kontrol Listesi

İlk bu görevleri tamamla ve ardından PHASE 1'e geç:

- [ ] Chat mesaj yüklenme hatası düzeltildi
- [ ] Admin chat profil görünme sorunu düzeltildi
- [ ] Favicon değiştirildi
- [ ] Landing page oluşturuldu ve routing güncellendi

---

**NOT:** Her task için Claude'a gönderilen prompt'u aynen kopyala-yapıştır yapabilirsin. Claude tüm context'i anlayacak ve gerekli dosyaları bulup düzenleyecek şekilde tasarlandı.

