# Kapsamlı Optima HR Refactoring İsteği
## Bölüm 3: "Slack Mimarisi" Ayarlar (Preferences) Modal Geliştirmesi

### 3.1. Genel Bağlam ve Yapay Zeka (Claude) İçin Giriş
Merhaba Claude! Bölüm 2'de muazzam bir Profil Menüsü tasarladık ve o menünün içerisine bir "Ayarlar/Tercihler" butonu koyduk. Tıklandığında `onPreferencesClick` prop'u çalışıyordu.

Şimdi bu dizinin final bölümü olan **Bölüm 3'e** geldik. Senden devasa, sistemin merkezini oluşturacak olan Optima HR uygulamasının **"Global Ayarlar Modalı"nı (`PreferencesModal.jsx`)** kodlamanı istiyorum. Sana referans olarak saf HTML ve CSS (vanilla) ile yazılmış eksiksiz bir "Slack Benzeri Ayarlar Sayfası" prototipi sağladım (Önceki mesajlarımdaki HTML örnek blokları veya prompt içeriğindeki tarif ettiğim yapı). Amacımız bu saf vizyonu kurumsal bir React + MUI v7 yapısına dönüştürmek.

### 3.2. Modal Çatısı (Layout) Talepleri
- **Bileşen Türü:** Tam sayfa olmayan, ancak ekranın büyük bir kısmını kaplayan bir Modal (`Dialog` maxWidth="md" veya "lg" prop'larıyla kullanılsın).
- **Zemin:** Arkasında backdrop (blur efekti) olmalı, modalın kendisinin ise dark-glassmorphism tarzı bir arkaplanı (`#1A1D21` vs.) olmalı.
- **Karakteristik Arayüz:** Slack gibi, pencerenin sol tarafında (Left Sidebar) dar bir "Kategoriler/Ayar Sekmeleri" sütunu, sağ tarafında ise çok daha geniş ve scroll edilebilen "İçerik Detay (Content)" sütunu bulunmalıdır.

### 3.3. Sol Navigasyon (Left Sidebar)
Bu sekme listesi state'de (`activeTab` vb.) tutulmalı. Seçilen isme göre sağ tarafın componenti render edilmelidir.
- Gerekli sekmeler (İkonlarıyla birlikte):
  - 🔔 "Bildirimler"
  - 🧭 "Navigasyon"
  - 🏠 "Ana Sayfa"
  - 🎨 **"Görünüm" (Appearance) - BU SEKMEYİ TAMAMEN KODLAYACAĞIZ.**
  - 💬 "Mesajlaşma ve Medya"
  - 🌐 "Dil ve Bölge"
  - ♿ "Erişilebilirlik"
  - ✓ "Okundu Olarak İşaretle"
  - 🎥 "Audio ve Video"
  - 🔗 "Bağlı Hesaplar"
  - 🔒 "Gizlilik ve Görünürlük"

### 3.4. Görünüm (Appearance) Sayfasının Spesifik İş Mantığı (KRİTİK)
Kullanıcı sol menüden "Görünüm" sekmesini seçtiğinde sağ tarafta son derece profesyonel bir arayüz belirmelidir. Referans HTML'i modernize ederek React'te yazacaksın. Bu ekranda 3 ana kontrol birimi olacak:

#### 1. Color Mode (Aydınlık / Karanlık Sistemi)
- "Slack'in karanlık mı aydınlık mı olacağını veya sistem ayarlarını takip edeceğini seçin" ibaresiyle yan yana 3 büyük kart (kutu) oluşturulmalı:
  - ☀️ Light
  - 🌙 Dark
  - 💻 System
- Tıklanılan kart "active" state'ine geçip kenarlıkları (border-color) Optima'nın primary rengine (`#1164A3` veya muadili) dönmeli.
- Projenin ana `useTheme()` context'i ile bu state etkileşimli olmalıdır.

#### 2. Slack Temaları / Custom Tema Geçişleri (Tab Sistemi İçinde Tab)
- Görünüm sayfasının kendi içinde sayfa ortasında sekmeler (Tabs) olmalı: `[Optima Temaları]` ve `[Özel Tasarım]`.

#### 3. Tek Renk ve Vision Assistive (Renk Körü Temaları) Grid Yapısı
- Eğer "Optima Temaları" tabı seçiliyse ekranda aşağı doğru kategoriler inmelidir: `Single color` ve `Vision assistive`.
- **Tema Kartları (Theme Card):** MUI `<Grid>` kullanarak veya Tailwind `grid-cols-3` ile yanyana dizilmiş dikdörtgen kutucuklar yapmalısın. 
  - Her kutunun solunda yuvarlak (border-radius: 50%) bir `div` bulunmalı. Bu yuvarlağın içi, o temanın renklerini temsil eden gradient bir renk (`linear-gradient(135deg, ...)`) ile doldurulmalı. (Örn: Aubergine, Clementine, Banana, Jade, Lagoon, Barbra, Gray).
  - Sağında temanın adı yazmalı.
- **Fonksiyonalite:** Bu kartlardan birine tıklandığında Optima'nın `changeTheme(themeName)` fonksiyonuna o isim tetiklenmeli ve kartın CSS'i Active state'ine geçmeli. Optima'da `basic-light`, `basic-dark` veya landscape gradientleri destekleyen bir Context halihazırda var. Optik uyum sağlayarak mevcut projeye zarar vermeyecek şekilde sadece trigger fonksiyonlarını prop olarak koyabilirsin.

### 3.5. Diğer Sayfalar (Placeholder / Dummy Logic)
Uygulamayı aşırı hantallaştırmamak için, "Görünüm" hariç diğer her sekmenin içerik tarafına bir `<Box>` koy ve ortasında büyükçe "Yakında Eklenecek" veya "Bildirimler Ayarları (Yapım Aşamasında)" şeklinde boş (placeholder) ekranlar render et. Her sekmeyi gerçekçi bir şekilde componentlere ayırmana (NotificationsView.jsx, AudioVideoView.jsx vs.) şu anlık gerek yok, doğrudan modal içinde switch-case veya nesne haritası ile döndürebilirsin.

### 3.6. Beklenen Çıktı Standardı (Claude'a Notlar)
1. Saf HTML ve CSS yapısını React komponentlerine (`styled-components` veya `sx` syntax'ına) çevir.
2. Custom scrollbar CSS kurallarını mutlaka uygula (scrollbar-width, webkit-scrollbar-thumb vb.), Optima'nın cam (dark) temasına uygun ince ve zarif bir kaydırma çubuğu olmalı.
3. Kodu **TAMAMEN ve TEK PARÇA HALİNDE** ver. Parçalanmış kod blokları entegre etmesi zordur. Dialog sarmalayıcısı (wrapper), sidebar (sol panel), içerik (sağ panel) hepsi `PreferencesModal.jsx` içerisinde veya yan alt bileşenler (subcomponents) halinde tek bir yanıt bloğunda yer alsın.

Optima HR projesi için bu kritik UI / UX yükseltmesini profesyonel bir kod kalitesiyle yazmanı rica ediyorum! Başarılar.
