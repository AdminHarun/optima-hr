# Slack Arayüzü – %100 Birebir Görsel Replikasyon Promptu

Bu doküman, görseldeki Slack arayüzünün **piksel seviyesinde** birebir kopyalanması için gereken tüm görsel spesifikasyonları içerir. Sadece aşağıdaki iki istisna uygulanacaktır:
1. **Sol alt profil bölümü** (avatar + Invite teammates) **olmayacak**
2. **DM / Home** ve içinde **açılır odalar/kanallar** bölümü olacak (Channels, Direct messages yerine veya yanında)

Diğer tüm öğeler görseldekiyle **%100 aynı** olmalıdır.

---

## 1. GENEL RENK PALETİ (HEX)

### Arka plan tonları
| Amaç | Hex | Not |
|------|-----|-----|
| En sol dar nav – en koyu | `#16181d` | Workspace nav bar |
| Sol sidebar – koyu gri | `#1a1d21` – `#1d2126` | Kanallar/DM listesi |
| Ana sohbet alanı | `#222529` – `#252529` | Mesaj akışı |
| Hover arka plan | `#2c2f33` – `#2d3139` | Üzerine gelince |
| Seçili öğe arka plan | `#3d4147` – `#4a4d52` | Aktif kanal/DM |
| Input arka plan | `#1d2126` | Mesaj input |
| Banner arka plan | `#1e2228` | Upgrade AI banner |
| Border / ayırıcı | `#3d4147` – `#3f4448` | İnce çizgiler |
| Border (daha açık) | `#4c4f54` | Focus / vurgu kenarlık |

### Metin renkleri
| Amaç | Hex | Not |
|------|-----|-----|
| Ana metin | `#ffffff` | Başlıklar, seçili öğeler |
| İkincil metin | `#d1d9e0` – `#dcdee1` | Normal liste öğeleri |
| Soluk metin | `#8b9aab` – `#9ca3af` | Placeholder, yardım metni |
| Soluk metin 2 | `#6b7280` | Çok soluk etiketler |
| Link / vurgu | `#1264a3` – `#1d9bd1` | Tıklanabilir metinler |
| Yeşil aksiyon | `#2eb886` – `#0b8c6c` | Upgrade, onay butonları |
| Mor/vurgu | `#4a154b` – `#611f69` | Slack moru (opsiyonel logo) |

### Badge / vurgu
| Amaç | Hex |
|------|-----|
| Okunmamış badge arka plan | `#1264a3` veya `#2eb886` |
| Badge metin | `#ffffff` |
| Unread indicator (nokta) | `#2eb886` veya `#1264a3` |

---

## 2. TİPOGRAFİ

### Font ailesi
- **Birincil:** `Slack Lato`, `Lato`, `Helvetica Neue`, `sans-serif`
- **Fallback:** `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`
- **Monospace (kod):** `Monaco`, `Consolas`, `monospace`

### Font boyutları (px)
| Öğe | Boyut | Ağırlık | Satır yüksekliği |
|-----|-------|---------|------------------|
| Workspace adı (üst) | 18–20px | 700 | 1.2 |
| Nav öğe metni | 15px | 600 | 1.3 |
| Kanal/DM başlıkları | 13px | 600, uppercase | 1.2 |
| Liste öğesi (kanal adı) | 15px | 400 (seçili 600) | 1.3 |
| Mesaj metni | 15px | 400 | 1.4667 |
| Tarih ayırıcı | 13px | 400 | 1.4 |
| Hoş geldin başlığı | 22–24px | 700 | 1.3 |
| Input placeholder | 15px | 400 | 1.4 |
| Banner başlık | 16–18px | 600 | 1.3 |
| Banner açıklama | 14px | 400 | 1.4 |
| Buton metni | 15px | 600 | 1.2 |
| Toolbar ikonlar | — | — | (24×24px ikon) |

### Letter-spacing
- Başlıklar: `-0.2px` – `-0.3px`
- Kanal/DM etiketleri: `0.5px` (uppercase için)

---

## 3. LAYOUT – GENEL YAPISI VE GENİŞLİKLER

### Panel genişlikleri (px)
| Panel | Genişlik | Min | Max |
|-------|----------|-----|-----|
| En sol dar nav | 68–72px | 60 | 80 |
| Sol sidebar (kanallar/DM) | 260–280px | 220 | 320 |
| Ana sohbet alanı | flex: 1 | — | — |

### Yükseklikler
| Öğe | Değer |
|-----|-------|
| Üst header (sohbet başlığı) | 52–56px |
| Mesaj input + toolbar | ~120–140px (dinamik) |
| Nav öğe (tek satır) | 36–40px |
| Liste öğesi (kanal/DM) | 28–32px |

---

## 4. EN SOL DAR NAV (Workspace / Global Nav)

### Genel
- Arka plan: `#16181d`
- Genişlik: 72px
- Dikey flex, üstten alta sıralama
- **İstisna:** En altta profil/avatar ve Invite teammates **OLMAYACAK**

### Üst logo
- Kutu: ~36×36px, 4 renkli (yeşil, mavi, sarı, kırmızı) kare ikon
- Metin: "FİXBET" veya workspace adı, 18px, bold, beyaz
- Yanında dropdown ok (▼), 12px
- Padding: 12px dikey, 16px yatay (veya ortalanmış)

### Nav öğeleri
Her öğe:
- **Padding:** 12px 16px (veya px cinsinden: 12px 14px)
- **Gap (ikon–metin):** 10–12px
- **İkon boyutu:** 20–22px
- **Hover:** Arka plan `#2c2f33`, border-radius `6px`
- **Seçili:** Hafif arka plan veya solda 3px dikey çizgi `#4a154b` veya `#1264a3`

Sıra (yukarıdan aşağı):
1. Home (ev ikonu)
2. DMs (iki konuşma balonu)
3. Activity (çan ikonu)
4. Files (belge ikonu)
5. More (üç nokta veya benzeri)
6. Admin (dişli ikonu)

---

## 5. SOL SİDEBAR (Kanal / DM listesi)

### Üst başlık çubuğu
- Yükseklik: 52–56px
- Arka plan: `#1a1d21`, alt border `1px solid #3d4147`
- **Sol:** Workspace adı + dropdown ok
- **Sağ:** Dişli (ayarlar), kalem (düzenle), büyüteç (arama) – her biri 20–24px, gri `#8b9aab`, hover `#ffffff`

### Upgrade Plan butonu
- Arka plan: Koyu gradient veya `#2c2f33` – `#252529`
- Border: `1px solid #3d4147`
- Border-radius: `8px`
- Padding: 12px 16px
- İç: roket ikonu (~18px) + "Upgrade Plan" (15px, 600)
- Hover: Biraz daha açık arka plan, border hafif açılır
- Margin: 12–16px yatay, 8–12px üst

### İçerik bölümleri (genel)
- Başlık satırı: 13px, 600, uppercase, `#8b9aab`, padding 8–12px dikey, 16px yatay
- Başlık yanında: `+` veya `#` ikonu, 16px
- Collapse ok: `^` / `∨` veya ChevronDown/Up, 14–16px
- Bölümler arası border: `1px solid #3d4147` veya 4–8px boşluk

### Starred bölümü
- Başlık: "Starred" + yıldız ikonu
- Alt metin: "Drag and drop important stuff here" – 13px, `#6b7280`, italic
- Padding: 12–16px

### Kanallar bölümü
- Başlık: "Channels" + `#` simgesi
- Liste öğeleri:
  - `# all-fixbet` (seçili: arka plan `#3d4147`)
  - `# genel-mesai`
- Her öğe: padding 8–10px dikey, 16px yatay, border-radius `6px`
- Hover: `#2c2f33`
- Seçili: `#3d4147`, sol border `3px solid #1264a3` (opsiyonel)
- Font: 15px, 400 (seçili 600), `#d1d9e0` (seçili `#ffffff`)

### Direct messages bölümü
- Başlık: "Direct messages" + iki balon ikonu
- Altında DM listesi (avatar + isim + son mesaj önizlemesi)
- Öğe yüksekliği: ~44px
- Avatar: 36×36px, border-radius `8px` (Slack hafif yuvarlak kare)
- Son mesaj önizleme: 13px, `#8b9aab`, tek satır, ellipsis

### Apps bölümü
- Başlık: "Apps" + grid ikonu
- Altında: Slackbot vb. uygulamalar
- Slackbot: renkli 4 yapraklı Slack logosu + "Slackbot", seçili arka plan `#3d4147`

### İstisna – DM Home bölümü
- "DM" veya "Home" başlığı altında
- **Açılır/kapanır** odalar ve kanallar listesi
- Her bölüm (ör. Kanallar, Odalar) collapse/expand ile gösterilir
- Aynı stil: başlık + `+` + expand ikonu + liste

---

## 6. ANA SOHBET ALANI

### Üst chat header
- Yükseklik: 52–56px
- Arka plan: `#222529`
- Alt border: `1px solid #3d4147`
- **Sol:** Oda/kanal/kişi avatar (32×32px, 8px radius) + isim (18px, 600) + yıldız + üç nokta
- **Sağ:** Arama ikonu + üç nokta menü
- Padding: 0 16–20px

### Alt navigasyon (Messages / Add canvas)
- "Messages" – seçili, altında 2px çizgi, renk `#ffffff`
- "Add canvas" – `+` ikonlu, `#8b9aab`, hover `#ffffff`
- Yanında "+" butonu, 24×24px
- Yükseklik: 40px
- Alt border: `1px solid #3d4147`

### Upgrade AI banner
- Arka plan: `#1e2228`, border `1px solid #3d4147`, radius `12px`
- Margin: 16px
- Padding: 20–24px
- Başlık: 18px, 600, "Upgrade to use Slackbot's AI abilities"
- Açıklama: 14px, 400, `#9ca3af`
- Butonlar:
  - "Upgrade": arka plan `#2eb886`, metin beyaz, 15px 600, padding 10px 20px, radius `8px`, roket ikonu
  - "Learn more": link stil, `#1264a3`, 14px, underline hover
- Sağ üst: Şeffaf balon, "Can you create a to-do list...?" + yeşil play/gönder ikonu

### Mesaj alanı
- Arka plan: `#222529` – `#252529`
- Padding: 16–20px yatay, 24px üst
- Mesaj balonları:
  - Kendi mesajları: sağa hizalı, arka plan `#1264a3`, radius `18px 18px 4px 18px`
  - Karşı taraf: sola hizalı, arka plan `#3d4147`, radius `18px 18px 18px 4px`
  - Max genişlik: ~65% container
  - Padding: 12px 16px
  - Font: 15px, 400
  - Zaman: sağ alt, 11px, `#8b9aab`

### Hoş geldin mesajı
- "Hi, Slackbot here!" – 22–24px, 700
- "You're here! Hello!" – 15px, 400
- Açıklama paragrafı: 15px, `#9ca3af`, line-height 1.5
- (?) ikon vurgusu: `#1264a3` veya etrafı çerçeveli

### Tarih ayırıcı
- Yatay çizgi (flex) + ortada "December 7th, 2024" (13px, `#8b9aab`) + yanında dropdown ok
- Margin: 24px 0
- Çizgi: `1px solid #3d4147`

### Bot / sistem mesajı
- Sol: Avatar (28×28px) + "Slackbot LEGACY" + "6:44 PM" (13px, `#8b9aab`)
- Mesaj metni: 15px
- Altında butonlar:
  - "Extend Expiration Date": yeşil `#2eb886`, padding 10px 20px, radius `8px`, 15px 600
  - "Don't Extend": gri `#3d4147` border, arka plan transparan, hover hafif gri

---

## 7. MESAJ GİRİŞ ALANI (Composer)

### Input container
- Arka plan: `#1d2126`
- Üst border: `1px solid #3d4147`
- Padding: 12–16px
- Min yükseklik: ~80px

### Textarea / input
- Placeholder: "Message [kanal/kişi adı]"
- Arka plan: `#222529`, border `1px solid #3d4147`
- Border-radius: `8px`
- Padding: 12px 16px
- Font: 15px, 400, `#ffffff`
- Min height: 44px, max 120px (multiline)
- Focus: border `#1264a3`, 1px

### Formatting toolbar (input üstü)
- Height: ~36px
- İkonlar (24×24px): B, I, U, S, bullet list, numbered list, blockquote, code block, link, alignment (L/C/R/J)
- Renk: `#8b9aab`, hover `#ffffff`
- Gap: 8px
- Border-radius: `4px` hover

### Action bar (input altı)
- "+" (dosya/ekle)
- "Aa" (format panel)
- "@" (mention)
- Emoji (smiley)
- Mikrofon (ses)
- Video kamera
- Atölye (attachment) – varsa
- Gönder: kağıt uçak ikonu, 24×24px, yeşil `#2eb886` veya mavi `#1264a3`, sağa hizalı
- Hepsi 24×24px, arka plan transparan, hover hafif gri
- Padding: 8px 0

---

## 8. BADGE VE İNDİKATÖRLER

### Okunmamış sayı
- Min 18×18px, padding 2–4px
- Border-radius: 9px
- Arka plan: `#1264a3` veya `#2eb886`
- Font: 12px, 600, beyaz

### Çevrimiçi nokta
- 8×8px daire, `#2eb886`
- Sağ alt köşe, 2px beyaz border
- Offline: `#6b7280` veya `#9ca3af`

### Yıldız (starred)
- 16×16px, `#f59e0b` (sarı)
- Hover: `#fbbf24`

---

## 9. SHADOW VE EFektler

- Dropdown: `0 4px 12px rgba(0,0,0,0.4)`
- Modal: `0 8px 32px rgba(0,0,0,0.5)`
- Button hover: Hafif scale (1.02) veya brightness artışı
- Transition: `0.15s – 0.2s ease`

---

## 10. SPESİFİK ÖLÇÜLER ÖZET TABLOSU

| Öğe | Değer |
|-----|-------|
| Dar nav genişlik | 72px |
| Sidebar genişlik | 280px |
| Nav öğe yüksekliği | 40px |
| Liste öğe yüksekliği | 32px |
| Avatar (listede) | 36×36px |
| Avatar (header) | 32×32px |
| İkon (standart) | 20–24px |
| Input border-radius | 8px |
| Buton border-radius | 8px |
| Mesaj balon border-radius | 18px |
| Genel padding unit | 8px (8, 12, 16, 20, 24) |
| Border kalınlığı | 1px |
| Seçili sol çizgi | 3px |

---

## 11. İSTİSNA ÖZET

1. **Sol alt:** Profil avatarı + Invite teammates butonu **YOK**
2. **Sidebar:** "DM" / "Home" bölümü + içinde açılır/kapanır odalar ve kanallar listesi **VAR**
3. **Upgrade AI banner:** İçerik projeye göre değiştirilebilir; stil aynı kalmalı

---

*Bu doküman, görseldeki Slack arayüzünün piksel seviyesinde birebir reprodüksiyonu için referans niteliğindedir. Implementasyon sırasında her bileşen bu değerlerle kontrol edilmelidir.*
