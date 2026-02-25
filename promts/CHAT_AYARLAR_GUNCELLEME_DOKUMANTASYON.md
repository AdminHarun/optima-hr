# Optima HR - Chat & Ayarlar Güncelleme Dokümantasyonu

## Genel Bakış

Bu dokümantasyon, Optima HR projesinin chat arayüzü ve ayarlar sisteminde yapılacak kapsamlı güncellemeyi 5 parçaya bölünmüş şekilde açıklar. Her parça bağımsız olarak uygulanabilir ve test edilebilir.

---

## Mevcut Durum

### Frontend Mimarisi
- **AdminLayout**: Tüm admin sayfalarını sarar (AdminSidebar 280px + AdminHeader 64px + Outlet)
- **AdminHeader**: Üstte site seçici, navigasyon tab'ları (Mesajlar/Mail/Aramalar/Takvim), sağda profil menüsü + bildirim
- **AdminSidebar**: 280px kalıcı çekmece, logo, kullanıcı selamlama, navigasyon menüsü
- **ChatPageNew**: 70px far-left sidebar (emoji ikonlar) + 260px main sidebar (DM/Grup/Kanal) + chat alanı
- **ThemeContext**: 16 tema (2 temel + 14 manzara), CSS değişkenleri, localStorage persistence
- **SettingsPage**: 2154 satır, tam sayfa, 7 bölüm (site/kullanıcı/güvenlik/izin/istatistik/denetim)

### Backend Altyapı
- **Employee Model**: status (online/away/busy/offline), custom_status, custom_status_emoji, last_seen_at, avatar_url
- **PresenceService**: In-memory + Redis + DB, otomatik away (10dk)
- **WebSocket**: set_status, presence_subscribe, presence_bulk eventi destekleniyor
- **API**: PUT /api/employees/me/status (status güncelleme), GET /api/employees/statuses
- **ChannelMember**: muted, muted_until, notification_preference (all/mentions/none) desteği var

---

## Güncelleme Parçaları

### PARÇA 1: AdminHeader Temizlik + AdminSidebar Profil Kutusu

**Ne Yapılıyor:**
- AdminHeader'daki profil menüsü (avatar, isim, rol, tema seçici) tamamen kaldırılıyor
- AdminSidebar'ın alt sol köşesine küçük bir profil avatar kutusu (36x36px) ekleniyor
- Sidebar'daki logo ve "Hoş geldiniz" bloğu sadeleştiriliyor

**Neden:**
Slack'teki gibi profil erişimi sol sidebar'ın alt köşesinden yapılacak. Header sadeleşecek.

**Etkilenen Dosyalar:**
- `AdminHeader.js` → ~400 satır kaldırılacak (profil menüsü + tema seçici)
- `AdminSidebar.js` → Alt köşeye profil kutusu eklenecek

---

### PARÇA 2: Profil Açılır Menüsü (ProfileDropdownMenu)

**Ne Yapılıyor:**
Sidebar'daki avatar'a tıklanınca açılan tam özellikli profil menüsü oluşturuluyor.

**Menü İçeriği:**
1. **Kullanıcı Bilgisi**: Avatar + İsim + Aktiflik durumu
2. **Statü Güncelle**: Alt menü ile seçenekler
   - 📞 Görüşmede
   - 🚫 Sistem dışı
   - 🏖️ Tatilde
   - 🏠 Evden çalışıyor
3. **Away/Online Toggle**: Tek tıkla durumu değiştir
4. **Bildirimleri Sessize Al**: Hover'da alt menü açılır
   - 30 dakika / 1 saat / 2 saat / Yarına kadar / Haftaya kadar
   - Özel: Tarih-saat seçici dialog
5. **Profil**: Profil sayfasına yönlendirir
6. **Tercihler**: Ayarlar modal'ını açar
7. **Çıkış Yap**: Oturumu sonlandırır

**Backend Entegrasyonu:**
- Mevcut `PUT /api/employees/me/status` API'si kullanılır
- WebSocket `setStatus()` ile gerçek zamanlı yayın
- Mute için geçici olarak localStorage, Part 5'te backend'e taşınır

---

### PARÇA 3: Tercihler Modal Penceresi (PreferencesModal)

**Ne Yapılıyor:**
Slack tarzı bir modal pencere oluşturuluyor. Tema seçimi AdminHeader'dan buraya taşınıyor.

**Modal Yapısı:**
- **Başlık**: "Tercihler" + Kapat (×) butonu
- **Sol Panel** (240px): 11 bölüm navigasyonu
- **Sağ Panel**: Aktif bölümün içeriği

**Bölümler:**
| # | Bölüm | Durum |
|---|--------|-------|
| 1 | Bildirimler | Placeholder (Part 5'te doldurulacak) |
| 2 | Navigasyon | Placeholder |
| 3 | Ana Sayfa | Placeholder |
| 4 | **Görünüm (Appearance)** | **Tam fonksiyonel** |
| 5 | Mesajlaşma ve Medya | Placeholder |
| 6 | Dil ve Bölge | Placeholder (Part 5'te doldurulacak) |
| 7 | Erişilebilirlik | Placeholder |
| 8 | Okundu olarak işaretle | Placeholder |
| 9 | Audio ve Video | Placeholder (Part 5'te doldurulacak) |
| 10 | Bağlı Hesaplar | Placeholder |
| 11 | Gizlilik ve Görünürlük | Placeholder |

**Görünüm Bölümü Detayı:**
- **Renk Modu**: Açık / Koyu / Sistem (3 kart, tıklanınca tema değişir)
- **Tema Sekmeler**: "Optima Temaları" / "Özel Tasarım"
- **Tema Grid'i**: 3 sütunlu, yuvarlak renk preview + tema adı, aktif = mavi çerçeve
- **Özel Tasarım**: Mevcut CustomThemeCreator.jsx bileşeni gömülür

**Referans**: Slack ayarlar görseli (`/chat demo/Slack ayarlar.png`) ve sağlanan HTML kodu

---

### PARÇA 4: Chat Sidebar Yeniden Yapılandırma

**Ne Yapılıyor:**
- Far-left sidebar'daki emoji ikonlar (🏠💬🔔📁) → MUI SVG ikonları
- Home/DMs görünüm değişimi ekleniyor
- "OPTIMA HR" header metni kaldırılıyor
- Gruplar bölümü tamamen kaldırılıyor

**Home Görünümü** (Home ikonu tıklandığında):
- Son aktiviteler (DM + kanal karışık, zamana göre sıralı)
- Hızlı erişim öğeleri

**DMs Görünümü** (DMs ikonu tıklandığında):
- "Direct messages ▼" başlığı + Unreads toggle + compose ikonu
- "Find a DM" arama alanı
- Sadece DM listesi (kanal yok, grup yok)

**Kaldırılacaklar:**
- Gruplar: state, useEffect, render bloğu, CreateGroupModal
- "OPTIMA HR" header yazısı
- Emoji ikonlar (yerlerine SVG)

**Referans**: Slack DMs görseli (`/chat demo/slack DMs.png`)

---

### PARÇA 5: Backend Geliştirmeleri + Tercihler Bölümleri

**Ne Yapılıyor:**
Backend'e bildirim sessize alma ve tercihler kalıcılığı ekleniyor. PreferencesModal'da 2-3 bölüm daha doldurulacak.

**Backend:**
- Employee tablosuna yeni kolonlar: `notifications_muted_until`, `preferences` (JSONB)
- Yeni API: `PUT /api/employees/me/notifications/mute`
- Yeni API: `GET/PUT /api/employees/me/preferences`

**Frontend:**
- Bildirimler bölümü: Ses toggle, masaüstü bildirim izni, DND zamanlama
- Dil ve Bölge: Dil seçici (TR/EN), tarih formatı, saat dilimi
- Audio ve Video: Mikrofon/kamera cihaz seçimi
- NotificationContext'e mute farkındalığı eklenir

---

## Uygulama Sırası

```
Parça 1 (temel) → Parça 2 (profil menüsü) → Parça 3 (tercihler)
                                                    ↓
Parça 4 (chat sidebar, paralel) ───────────────────┘
                                                    ↓
                                              Parça 5 (backend + doldur)
```

**Tahmini Dosya Değişiklikleri:**
- 2 yeni dosya oluşturulacak (ProfileDropdownMenu, PreferencesModal)
- 5-6 dosya değiştirilecek (AdminHeader, AdminSidebar, ChatPageNew, NotificationContext, backend dosyaları)
- ~1500 satır yeni kod, ~600 satır kaldırılan/değiştirilen kod

---

## Test Kontrol Listesi

Her parça sonrası kontrol edilecekler:
- [ ] Build hatası yok
- [ ] Login/logout çalışıyor
- [ ] Chat mesajlaşma çalışıyor (mesaj gönder/al)
- [ ] Tema değişimi çalışıyor
- [ ] Dark + Light tema'da doğru görünüm
- [ ] Mevcut tüm özellikler bozulmamış
- [ ] Referans görsellerle karşılaştırma yapıldı
