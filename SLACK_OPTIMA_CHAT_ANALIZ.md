# Slack Benzeri Chat Arayüzü – Detaylı Prompt & Optima Chat Karşılaştırması

## BÖLÜM 1: Slack Benzeri Arayüz – Detaylı UI/UX Prompt

Aşağıdaki prompt, görüntüdeki Slack arayüzünü yeniden oluşturmak veya benzer bir tasarım geliştirmek için kullanılabilir.

---

### 1.1 Genel Layout ve Yapı

```
Üç panel dikey layout:
- Sol panel: Workspace navigasyon + kanal/DM listesi (yaklaşık 260-280px)
- Orta/Ana panel: Mesaj akışı alanı
- Alt kısım: Mesaj yazma/composer alanı
```

**Renk paleti (dark tema):**
- Arka plan: Koyu gri (#1a1d21 - #252529)
- Sidebar: Daha koyu gri (#16181d)
- Metin: Beyaz (#ffffff), ikincil metin gri (#8b9aab)
- Vurgu: Slack mavi (#4a154b), yeşil aksiyon (#2eb886)
- Üst gradient banner: Koyu gradient + parıltı efekti

---

### 1.2 Üst Header Bar (Top Bar)

| Öğe | Açıklama |
|-----|----------|
| **Sol** | Workspace adı + dropdown ok (örn. "FİXBET") + küçük 4 renkli logo |
| **Orta** | Aktif sohbet adı (örn. "Slackbot") + ikon, yanında "Messages" ve "Add canvas" tab'ları, "+" ile yeni sekme |
| **Sağ** | Ayarlar (dişli), düzenle (kalem), arama, menü (3 nokta) ikonları |

**Davranış:** Workspace dropdown tıklanınca workspace seçimi/değiştirme menüsü açılır.

---

### 1.3 Sol Sidebar – Navigasyon Paneli

**Üst bölüm – CTA:**
- "Upgrade Plan" butonu (roket ikonu) – öne çıkan, gradient arka plan
- Ana navigasyon:
  - Home (seçili, hafif arka plan)
  - Threads
  - Huddles
  - Directories
  - DMs
  - Activity
  - Files
  - More
  - Admin

**Orta bölüm:**
- **Starred:** "Drag and drop important stuff here" placeholder
- **Channels:** "+" ile yeni kanal
  - # all-fixbet
  - # genel-mesai
- **Direct messages**
- **Apps:** "+" ile yeni app
  - Slackbot (seçili)

**Alt bölüm:**
- "Slack works better when you use it together" bilgi metni
- "+" ve profil avatar
- "Invite teammates" butonu

---

### 1.4 Ana Mesaj Alanı

**Üst banner (promosyon/AI):**
- Gradient arka plan, hafif parıltı animasyonu
- Başlık: "Upgrade to use Slackbot's AI abilities"
- Açıklama: "Slackbot has some cool new AI-powered capabilities, but they're only available on some paid plans."
- Butonlar: Yeşil "Upgrade" (roket ikonu), "Learn more" link
- Sağ tarafta örnek kullanıcı promptu: "Can you create a to-do list for next week?" + play/send ikonu

**Hoş geldin mesajı (Slackbot):**
- Kalın "Hi, Slackbot here!"
- "You're here! Hello!"
- Yardım metni, (?) ikon vurgusu
- "I, however, am not a human. Just a bot (a simple bot, with only a few tricks up my metaphorical sleeve). But I'm still happy to be here!"

**Tarih ayırıcı:**
- İnce yatay çizgi
- Ortada metin: "December 7th, 2024"

**Sistem/Bot mesajı (Slackbot LEGACY):**
- Gönderen: Slackbot LEGACY | Saat: 6:44 PM
- Metin: "An invitation link you created will expire in 3 days, on December 10th. Would you like to extend the expiration date for this link?"
- İnteraktif butonlar: Yeşil "Extend Expiration Date", gri "Don't Extend"

---

### 1.5 Mesaj Yazma Alanı (Composer)

**Input alanı:**
- Placeholder: "Message Slackbot" (veya aktif kanal/DM adı)
- Multiline text input
- Yuvarlak köşeler, hafif border
- Tema ile uyumlu arka plan

**Input üstü toolbar:**
- **Formatting:** Bold (B), Italic (I), Underline (U), Strikethrough (S)
- **Liste:** Madde işaretli liste, numaralı liste
- **Blok:** Blockquote, Code block, Code snippet
- **Diğer:** Link ekleme, metin hizalama (sol, orta, sağ, justify)

**Input altı action bar:**
- "+" – dosya ekleme, ek eklentiler
- "Aa" – metin format paneli
- "@" – mention
- Yüz ikonu – emoji
- Mikrofon – sesli mesaj
- Kamera – video arama
- Sağda – gönder butonu (kağıt uçağı ikonu)

---

### 1.6 Responsive & Erişilebilirlik

- Mobilde sol panel hamburger menü ile açılır
- Klavye: Enter gönder, Shift+Enter satır sonu
- ARIA etiketleri ve screen reader uyumu
- Kontrast oranı WCAG AA uyumlu

---

## BÖLÜM 2: Optima Projesi Chat Sistemi Analizi

### 2.1 Mimarî Özet

Optima chat sistemi, **Rocket.Chat ve WhatsApp/Telegram** tasarım desenlerinden esinlenmiş, HR/aday görüşmesi odaklı bir mesajlaşma çözümüdür.

```
Mimari:
┌─────────────────┬──────────────────┬─────────────────────┐
│ Channel Tabs    │ ChatSidebar       │ ChatContainer       │
│ (EXTERNAL/      │ (Room list +      │ → ChatRoom          │
│  INTERNAL)      │  search/filter)   │   → MessageList     │
│                 │                  │   → ChatComposer     │
└─────────────────┴──────────────────┴─────────────────────┘
```

### 2.2 Ana Bileşenler

| Bileşen | Rol | Özellikler |
|---------|-----|-------------|
| **ChatLayout** | Ana layout wrapper | 3 panel, channel tabs (EXTERNAL/INTERNAL), responsive |
| **ChatSidebar** | Oda listesi | Mesaj/kişi arama, filtre (Tümü, Okunmamış, Çevrimiçi), kişi/mesaj tab |
| **ChatContainer** | WebSocket + state | Bağlantı, mesaj akışı, typing, video call orchestration |
| **ChatRoom** | Odanın UI’ı | Header, MessageList, ChatComposer, drag-drop |
| **ChatComposer** | Mesaj girişi | Text, emoji, dosya, sesli mesaj, slash komutlar, hazır yanıtlar |
| **MessageList** | Mesaj akışı | Date separators, infinite scroll, read receipts |
| **MessageContent** | Tek mesaj render | Markdown, link preview, dosya, voice, reactions |

### 2.3 Özellik Detayları

**ChatComposer:**
- Metin girişi (multiline, max ~5000 karakter)
- Emoji & GIF picker (EmojiMart)
- Dosya ekleme (image/video/PDF/docs)
- Sesli mesaj kaydı (MediaRecorder API)
- Slash komut autocomplete (/ ile başlayan)
- Hazır yanıtlar (HR odaklı 8 adet)
- Reply kutusu (Telegram tarzı)
- Paste ile görsel yapıştırma
- Karakter sayacı
- Enter gönder, Shift+Enter satır sonu

**MessageContent:**
- Markdown render (react-markdown)
- Syntax highlighting (Prism)
- Link preview (backend API)
- Dosya önizleme (image, video, audio, PDF)
- Sesli mesaj oynatıcı (WhatsApp benzeri)
- Emoji reactions
- Reply referansı, düzenleme modu
- "Düzenlendi" etiketi

**ChatSidebar:**
- Kişi araması
- Mesaj araması (debounced API)
- Kişiler / Mesajlar tab
- Filtre: Tümü, Okunmamış, Çevrimiçi
- Oda kartları: avatar, son mesaj, zaman, okunmamış badge
- Yeni görüşme butonu

**Diğer:**
- WebSocket ile gerçek zamanlı mesajlaşma
- Typing indicator
- Video arama (VideoCallModal)
- Forward message modal
- Read receipts (Intersection Observer)
- Drag & drop dosya
- Optimistic updates
- Infinite scroll (eski mesajlar)
- Electron badge entegrasyonu
- Employee Directory (INTERNAL kanal için)

### 2.4 Tasarım Teması

- **Renk:** Mavi (#1c61ab) + yeşil (#8bb94a) gradient
- **Kütüphane:** Material-UI (MUI)
- **Stil:** Light-first, modern gradient butonlar
- **Layout:** 3 panel (channel tabs | sidebar | chat area)

---

## BÖLÜM 3: Slack vs Optima – Karşılaştırma

### 3.1 Layout & Navigasyon

| Kriter | Slack (Görsel) | Optima |
|--------|----------------|--------|
| Panel sayısı | 2–3 (sidebar + chat + alt composer) | 3 (channel tabs + sidebar + chat) |
| Kanallar | Channels, DMs, Apps ayrı bölümler | EXTERNAL / INTERNAL tab ile ayrım |
| Workspace | Workspace adı + switch | Kanal tipi + Employee Directory |
| Starred/Pinned | Starred bölümü | Pin mesaj desteği var |
| Mobil | Hamburger + drawer | Drawer + responsive breakpoints |

**Optima avantajı:** HR senaryosuna özelleşmiş (Aday vs Çalışan) net ayrım.

**Slack avantajı:** Kanal/DM/App hiyerarşisi daha zengin.

---

### 3.2 Mesaj Composer

| Özellik | Slack | Optima |
|---------|-------|--------|
| Rich text toolbar | B, I, U, S, listeler, blockquote, code | Yok (plain text + Markdown) |
| Emoji | Var | Var (EmojiMart + GIF) |
| Dosya | + butonu | AttachFile + drag-drop |
| Mention | @ | @ (autocomplete yok) |
| Sesli mesaj | Mikrofon ikonu | Var (MediaRecorder) |
| Slash komutlar | Var | Var (SlashCommandAutocomplete) |
| Format panel | Aa ile açılıyor | Yok |
| Video call | Kamera ikonu | Var (ChatRoom header’da) |
| Hazır yanıtlar | Yok (genelde) | Var (8 HR hazır yanıt) |
| AI özellikleri | Slackbot AI banner | Yok |

**Slack avantajı:** Görsel format toolbar, AI tanıtım banner’ı.

**Optima avantajı:** Hazır yanıtlar, sesli mesaj akışı, slash komutlar, drag-drop.

---

### 3.3 Mesaj Görüntüleme

| Özellik | Slack | Optima |
|---------|-------|--------|
| Markdown | Var | Var (react-markdown) |
| Code block | Var | Var (Prism syntax highlighter) |
| Link preview | Var | Var (backend API) |
| Tarih ayırıcı | Var | Var (MessageList) |
| Bot/system mesajları | Var | Var (CallStatusMessage vb.) |
| İnteraktif butonlar | Var (Extend/Don’t extend) | Call ile ilgili aksiyonlar |
| Reactions | Var | Var (emoji chips) |
| Thread/Reply | Var | Var (Telegram tarzı reply kutusu) |
| Edit/Delete | Var | Var |
| Forward | Var | Var (ForwardMessageModal) |

Bu alanda iki sistem birbirine oldukça yakın.

---

### 3.4 Arama & Filtreleme

| Özellik | Slack | Optima |
|---------|-------|--------|
| Mesaj araması | Header’da global arama | Sidebar’da mesaj araması |
| Kişi araması | DM listesinde | Sidebar’da kişi araması |
| Filtreler | Genelde unread/starred | Tümü, Okunmamış, Çevrimiçi |
| Arama sonucu vurgusu | Snippet + highlight | highlightSnippet ile vurgu |

**Optima:** Kişi ve mesaj araması tek sidebar’da, tab ile ayrılmış.

---

### 3.5 Üst Bölüm & Header

| Özellik | Slack | Optima |
|---------|-------|--------|
| Workspace/kanal adı | Var | Oda/aday adı |
| Sekmeler (Messages, Canvas) | Var | Yok |
| Ayarlar/Arama menü | Sağda ikonlar | ChatRoom’da MoreVert, VideoCall vb. |
| Upgrade/AI banner | Var | Yok |
| Bağlantı durumu | Implicit | Connected/Disconnected ikon |

---

### 3.6 Özet Matris

| Alan | Slack (görsel) | Optima | Öneri |
|------|----------------|--------|-------|
| Rich text toolbar | Var | Yok | Optima’ya B/I/U/S + liste eklenebilir |
| AI/Upgrade banner | Var | Yok | İleride AI özellikleri için benzer banner |
| Workspace/kanal hiyerarşisi | Zengin | Basit | HR senaryosu için Optima yeterli |
| Sesli mesaj | Var | Var | Aynı seviye |
| Hazır yanıtlar | Yok | Var | Optima önde |
| Mesaj araması | Var | Var | Aynı seviye |
| Video call | Var | Var | Aynı seviye |
| Dark mode | Var | Light-first | İstersen dark tema eklenebilir |
| Canvas/Not | Var | Yok | İleride canvas/notes eklenebilir |

---

## BÖLÜM 4: Optima İçin İyileştirme Önerileri

1. **Rich text toolbar:** ChatComposer’a Slack tarzı B/I/U/S, liste ve blockquote toolbar eklenebilir (Lexical/Draft.js veya Tiptap ile).
2. **Canvas / Not sekmesi:** Önemli bilgileri sabitlemek için basit bir canvas/notes alanı eklenebilir.
3. **Dark mode:** Tema anahtarı ile Slack benzeri dark tema seçeneği.
4. **Mention autocomplete:** @ yazıldığında kişi listesi ve otomatik tamamlama.
5. **Üst banner alanı:** Özel duyurular veya özellik tanıtımı için configurable banner.
6. **Görsel format paneli (Aa):** Slack’taki gibi ayrı bir formatting paneli açılabilir.

---

*Döküman: Optima projesi chat sistemi analizi ve Slack benzeri arayüz prompt karşılaştırması.*  
*Tarih: 22 Şubat 2026*
