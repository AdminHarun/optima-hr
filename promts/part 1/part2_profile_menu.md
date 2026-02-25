# Kapsamlı Optima HR Refactoring İsteği
## Bölüm 2: Slack Konseptli Gelişmiş Profil Menüsü (ProfileDropdownMenu)

### 2.1. Genel Bağlam ve Yapay Zeka (Claude) İçin Giriş
Merhaba Claude! Bölüm 1'de Optima HR'ın Admin paneli layout'unu temizlemiş ve sol alt köşeye şık bir "Profil Kutusu" entegre etmiştik. Tıkladığımızda açılması için bir state tanımlamıştık.

Bölüm 2'de senden bu tıkladığımızda açılacak olan **bağımsız, animasyonlu ve son derece fonksiyonel** profil menüsü ara yüzünü (`ProfileDropdownMenu.jsx`) kodlamanı istiyorum. Bu menü, sıradan bir liste olmayıp, içerisinde alt menüler (submenus), dialoglar bariyerleri ve API simülasyonları barındıran kompleks bir UI bileşenidir. Referans noktamız modern *Slack profil menüsü* mimarisidir.

### 2.2. Bileşen Anatomisi ve Hiyerarşik Yapı Talepleri
Yeni oluşturacağın `ProfileDropdownMenu.jsx` dosyası aşağıdaki özelliklere sırasıyla sahip olmalıdır:

#### 1. Başlık Kutusu (Kullanıcı Kimliği Alanı)
- Menünün en üstünde yer alır. MUI `<Box>` veya Tailwind `div` ile tasarlanabilir.
- Sol tarafta yuvarlatılmış dikdörtgen veya daire şeklinde Profil Fotoğrafı.
- Sağında kalın puntolarla Admin'in Adı ve Soyadı.
- İsmin hemen altında `Çevrimiçi` (Online) veya o anki aktiflik durumu rengiyle belirtilmiş şekilde yer almalı. (Örn: yeşil nokta + "Çevrimiçi").
- Bu alan tıklanabilir olmamalı, sadece bilgi ekranı (read-only) gibi davranmalı. Altına bir Divider (çizgi) eklenmeli.

#### 2. Statü Güncelleme ("Statünü Güncelle" / Update Status)
- Menünün ilk interaktif elemanıdır. 
- Standart bir `MenuItem` olacak fakat üzerine fareyle gelindiğinde veya tıklandığında (hover/click) **sağ tarafa doğru bir Alt Menü (Submenu)** açılacak.
- Açılan bu alt menüde şu seçenekler olacak: 
  - 📅 **"Görüşmede"** (In a meeting)
  - 🌴 **"Sistem dışı/Tatilde"** (Out of office)
  - 🏠 **"Evden çalışıyor"** (Working from home)
- Mimari Not: React ekosisteminde iç içe menüler (Nested Menus) MUI ile biraz trickydir. İstiyorsan `HoverMenu` pattern'i kurabilir veya kendi custom state yönetiminle (`activeSubmenu` state'i kullanarak) DOM içinde Absolute bir div çıkartabilirsin. Hangisini yaparsan yap pürüzsüz çalışmasını sağla.

#### 3. Presence (Durum Toggle) Ayarı
- Tek bir satırdan oluşur.
- Eğer kullanıcının state'i "Online" ise ekranda **"Kendini away yap"** yazmalı.
- Eğer kullanıcının state'i "Away" ise ekranda **"Kendini online yap"** yazmalı.
- Menü item'ına bir ikon (örn. `NightlightIcon` veya `CheckCircleIcon`) eklenmeli.

#### 4. Bildirimleri Sessize Al ("Pause notifications") BÖLÜMÜ (KRİTİK)
- Hiyerarşinin en zor bölümü burası. Üzerine gelindiğinde yine yana doğru açılan bir **Alt Menü (Submenu)** barındıracak.
- Submenu seçenekleri: `30 dakika`, `1 saat`, `2 saat`, `Yarına kadar`, `Haftaya kadar`, ve `Özel (Custom)...`.
- **Custom Logic (Özel Seçenek İşlemi):** 
  - Kullanıcı `Özel` seçeneğine tıkladığında tüm dropdown menüler *kapanmalı* ve ekranın ortasında bir MUI `<Dialog>` (Modal) açılmalıdır.
  - Bu Dialog'da `@mui/x-date-pickers` kütüphanesinden `DateTimePicker` component'i bulunmalıdır. Kullanıcı bildirimin "Ne zamana kadar" kapalı kalacağını tam tarih ve saat olarak seçip onaylamalıdır.

#### 5. Diğer Sayfa Bağlantıları ve Çıkış Yap
- Bu seçeneklerin üstüne bir `<Divider>` konulmalı.
- 👤 **Profil:** `/admin/profile` rotasına yönlendiren standart buton.
- ⚙️ **Ayarlar/Tercihler:** `onPreferencesClick` adında bir prop tetikleyecek (Bölüm 3'te yazacağımız büyük modalı açacak trigger).
- 🚪 **Çıkış Yap:** En altta, kırmızı (`error.main`) renkte, "Sign Out" butonu. Tıklandığında `useEmployeeAuth`'un `logout()` fonksiyonunu tetiklemeli.

### 2.3. Teknik İsterler ve Kod Geliştirme Standartları
- Optima HR, TailwindCSS ve MUI v7 kullanmaktadır. İstediğin birleşimi kullanabilirsin ama CSS uyuşmazlığından kaçınmak için menü stillerini `sx={...}` prop'uyla (Material-UI) veya Tailwind utility'leri ile pürüzsüz yap (örneğin dark theme arka planı, `backdrop-filter`, `box-shadow`).
- **State Yönetimi:** Submenu'ler için `anchorEl` mekanizması yorucu olabilir, Custom Popover'lar veya React state ile conditional rendering (koşullu gösterim) daha performanslı olabilir. Buna sen karar ver ama "çalışmayan" bir menü üretme. `useEmployeeAuth` context'ini import etmeyi unutma.
- **Props Interface:** Component dışarıya şu propları almalı: `anchorEl`, `isOpen`, `onClose`, `onPreferencesClick`.

### 2.4. Çıktı Beklentisi
Senden tamamen kopyala/yapıştır (copy-paste) ile projeye doğrudan entegre edebileceğim **tam (`ProfileDropdownMenu.jsx`) component kodu** istiyorum. 
- Kodun en başında kullandığın library importlarını belirt (`@mui/icons-material` vs.).
- Dialog modülünü (Tarih seçici için) aynı dosyanın içine yardımcı component (helper component) olarak yazabilirsin.

Kodlamaya başlamadan önce iç içe menü stratejini 2 cümleyle açıkla ve efsanevi kod bloklarını sun!
