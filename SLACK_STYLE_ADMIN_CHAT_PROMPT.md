# Slack Benzeri Admin Chat Arayüzü - Detaylı Prompt

Bu prompt, mevcut Optima admin chat sayfasının (ChatPageNew) arayüzünü Slack benzeri hale getirmek için gereken tasarım gereksinimlerini tanımlar. **Sitenin genel sidebar’ı ve header’ı değişmeyecek**, sadece admin chat sayfasının kendi içindeki layout ve bileşenler güncellenecek.

---

## Genel Kısıtlamalar

- Mevcut sitenin global sidebar’ı ve header’ı **aynı kalacak**
- Sadece admin chat sayfasının kendi alanında (chat container içinde) değişiklik yapılacak
- Sol alt köşede profil/avatar bölümü **olmayacak**

---

## Layout Yapısı

```
┌─────────────────────────────────────────────────────────────┐
│  [Mevcut site header - değişmez]                             │
├────────────────┬──────────────────────────────────────────────┤
│ [Site sidebar] │  Admin Chat Alanı (değişecek)                │
│  (değişmez)    │  ┌─────────────┬──────────────────────────┐ │
│                │  │ Yeni Sol     │ Mesaj Alanı + Composer   │ │
│                │  │ Sidebar      │                          │ │
│                │  │ (Slack tipi) │                          │ │
│                │  └─────────────┴──────────────────────────┘ │
└────────────────┴──────────────────────────────────────────────┘
```

---

## Yeni Sol Sidebar – Slack Benzeri Yapı

### 1. Üst Bölüm – Ana Navigasyon

- **Home** – Ana sayfa, tüm sohbetlerin özeti (seçili durumda hafif arka plan vurgusu)
- **Direct messages (DM)** – Bire bir sohbetler bölümü
- Her öğe: Sol tarafta ikon + metin
- Hover: Hafif arka plan rengi
- Seçili: Solda 3–4px kalınlığında dikey çizgi veya hafif arka plan

### 2. Açılır/Kapanır Bölümler (Collapsible Sections)

Slack’taki gibi başlık satırına tıklanınca açılıp kapanan bölümler:

**a) Direct messages (veya DM)**
- Başlık: "Direct messages" veya "Özel Mesajlar"
- Yanında "+" ile yeni DM başlatma
- Yanında "^" veya "∨" ile aç/kapa
- Altında: Son sohbet edilen kişiler listesi (avatar + isim + son mesaj önizlemesi + zaman)
- Okunmamış mesaj varsa mavi nokta veya sayı badge

**b) Channels (Kanallar)**
- Başlık: "Channels" veya "Kanallar"
- Yanında "+" ile yeni kanal oluşturma
- Yanında aç/kapa ikonu
- Altında: # all-fixbet, # genel-mesai gibi kanal listesi
- Kanal adları "#" ile başlar
- Starred/Yıldızlı kanallar üstte veya ayrı bölümde

**c) Gruplar (opsiyonel, mevcut gruplar için)**
- Başlık: "Gruplar"
- Yanında "+" ile yeni grup
- Altında mevcut grup sohbetleri listesi

### 3. Sidebar Stili – Dark tema (Slack’a benzer)

- Arka plan: Koyu gri (#1a1d21 – #252529)
- Metin: Beyaz (#ffffff) veya açık gri (#d1d9e0)
- İkincil metin: Gri (#8b9aab)
- Hover: Hafif açık gri (#2c2f33)
- Seçili: Solda mavi çizgi (#4a154b veya #1264a3)
- Border: İnce koyu gri ayırıcılar (#3d4147)
- Arama input: Koyu arka plan, yuvarlak köşeler

### 4. Arama Alanı

- Sidebar üstünde veya Direct messages üstünde
- Placeholder: "Kişi veya mesaj ara..."
- Koyu tema ile uyumlu input stili
- Sol tarafta arama ikonu

### 5. Sidebar Genişliği

- Yaklaşık 260–280px (veya mevcut 340px korunabilir)
- Responsive: Mobilde hamburger ile açılan drawer

---

## Ana Mesaj Alanı (Sağ Panel)

### 1. Chat Header (üst bar)

- Solda: Oda/kanal/kişi adı + avatar veya ikon
- Sağda: Arama, ayarlar (dişli), video arama, menü (3 nokta) ikonları
- Arka plan: Tema ile uyumlu (dark veya light)
- Alt çizgi ile mesaj alanından ayrım

### 2. Mesaj Listesi

- Tarih ayırıcıları: "December 7th, 2024" benzeri
- Mesaj balonları: Sol/sağ hizalama (gönderen/alıcı)
- Scroll: En altta yeni mesajlar
- Infinite scroll: Yukarı kaydırınca eski mesajlar yüklensin

### 3. Mesaj Composer (alt kısım)

- Input alanı: Placeholder "Message [kanal/kişi adı]"
- Üstünde veya yanında format toolbar (opsiyonel): Bold, italic, liste vb.
- Alt action bar: + (dosya), @ (mention), emoji, mikrofon, video, gönder butonu
- Arka plan: Tema ile uyumlu, üst border ile mesaj alanından ayrım

---

## Boş Durum (Sohbet Seçilmediğinde)

- Ortada büyük mesaj ikonu
- Metin: "Bir sohbet seçin" veya "Mesajlaşmaya başlamak için sol menüden bir sohbet seçin"
- Arka plan: Hafif gradient veya mevcut arka plan resmi (korunabilir)

---

## Özet Kontrol Listesi

- [ ] Sol sidebar: DM/Home, Channels, Gruplar – Slack tipi açılır bölümler
- [ ] Sol alt profil bölümü YOK
- [ ] Dark tema (Slack benzeri renk paleti)
- [ ] Site global sidebar ve header DEĞİŞMEYECEK
- [ ] Mevcut ChatContainer, ChatRoom, MessageList, ChatComposer mantığı korunacak
- [ ] Sadece layout, sidebar yapısı ve stil güncellenecek

---

## Teknik Notlar (Implementasyon için)

- Mevcut `ChatPageNew.js` içindeki sidebar (Box ile sarılı bölüm) yeniden yapılandırılacak
- `ChannelSidebar` expandable yapıda zaten var; bu pattern DM ve Gruplar için de uygulanacak
- Tab yapısı (Kişiler/Gruplar/Kanallar) kaldırılıp, tek sidebar’da collapsible bölümler haline getirilecek
- Dark tema için inline sx veya theme override kullanılacak; sadece admin chat alanında geçerli olacak

---

*Bu prompt, Optima admin chat arayüzünün Slack benzeri görünüm ve davranışa güncellenmesi için kullanılacak tasarım spesifikasyonudur.*
