# Kapsamlı Optima HR Refactoring İsteği
## Bölüm 1: Çekirdek Layout Revizyonu ve Header/Sidebar Entegrasyonu

### 1.1. Genel Bağlam ve Yapay Zeka (Claude) İçin Giriş
Merhaba Claude. Bugün, kurumsal düzeyde bir İnsan Kaynakları Yönetim Sistemi (HRMS) olan **Optima HR** projesi üzerinde kapsamlı bir Frontend (React) mimari revizyonu gerçekleştireceğiz. 

**Projenin Teknoloji Yığını:**
- `React 19` (Hooks ve Functional Components bazlı)
- `Vite` (Build Tool)
- `MUI v7` (Material-UI Core & Lab componentleri)
- `TailwindCSS` (Utility sınıfları için)
- `Electron` (Desktop entegrasyonu ve System Title Bar için)
- `Context API` (Global state yönetimi: Auth, Theme, Notifications)

**Hedef:**
Uygulamanın mevcut `AdminHeader.js` (Üst navigasyon barı) ve `AdminSidebar.js` (Sol menü navigasyonu) yapılarını, Slack veya Discord vari modern iletişim uygulamalarının UX/UI standartlarına uygun şekilde yeniden kurgulamaktır. Mevcut sistemde kullanıcı profili, role badge'leri, bildirimler ve profil menüsü (anchorEl tabanlı) Header'ın sağ tarafında yer almaktadır. 

Bu birinci bölümde senden beklentim, **tüm kullanıcı profil erişimini Header'dan tamamen söküp (temizleyip), Sidebar'ın (sol panelin) en alt köşesine ufak, kare veya hafif yuvarlatılmış şık bir buton/alan olarak taşıman**dır. 

### 1.2. Mimari Değişiklik Talepleri (Dosya Bazlı)

#### Görev 1: `src/components/admin/AdminHeader.js` Refactoring (Temizlik)
Devasa boyutlara ulaşmış olan `AdminHeader.js` dosyasını sadeleştireceğiz.
- **Aksiyon 1 (Profilin Kaldırılması):** Header'ın en sağında yer alan; kullanıcının ismini (firstName, lastName), rol çipini (`<Chip label={getRoleDisplayName...} />`), ve `<Avatar>` butonunu silmelisin. Sadece bildirim çanı (`<NotificationsIcon />`) gibi global fonksiyonlar kalabilir.
- **Aksiyon 2 (Menünün Kaldırılması):** Profil avatarına tıklandığında açılan devasa MUI `<Menu>` yapısını (anchorEl state'ini, "Çıkış Yap", "Profilim", "Tema Seçici" seçeneklerini) bu dosyadan tamamen izole edip silmelisin. Bunları 2. Bölümde Sidebar için baştan yazacağız.
- **Aksiyon 3 (Glassmorphism UI):** Optima HR, `var(--theme-header-bg)` ve `backdrop-filter: blur(20px)` gibi cam efekti odaklı bir temaya sahiptir. Geriye kalan navigasyon butonlarının (Mesajlar, Takvim vb.) ortalanmış yapısı bozulmadan UI dengesini yeniden kurmalısın.

#### Görev 2: `src/components/admin/AdminSidebar.js` Refactoring (Entegrasyon)
Sol menünün en altına (Footer kısmına) o meşhur "Workspace/Slack Profil Kutucuğu"nu yerleştireceksindir. 
- **Aksiyon 1 (Profil Kutusunun UI Tasarımı):** Sidebar'ın `mt: 'auto'` kısmına (en altına) yerleşecek bir Box veya Button oluştur. Bu kutu Sidebar'ın genişliğine uyum sağlamalı (örn. `px: 2, py: 1.5`), hover edildiğinde arkaplanı belirginleşmeli (`rgba(255,255,255,0.1)`). 
- **Aksiyon 2 (Kutu İçeriği):** İçerisinde sol tarafta kullanıcının Avatarı (kare köşeli ama `borderRadius: '8px'` tarzı rouded-md bir yapı), sağında ise ad-soyadı yer almalı.
- **Aksiyon 3 (Context Entegrasyonu):** `AdminSidebar.js` hali hazırda `useEmployeeAuth()` hook'unu kullanıyor. Bu hook'dan `currentUser` verisini çekerek avatar kaynağını (`currentUser.avatar`) ve isimlerini (`currentUser.firstName + currentUser.lastName`) buraya dinamik olarak entegre et.

### 1.3. State ve Event Stratejisi
- Bu yeniSidebarProfil kutucuğuna tıklandığında (veya üzerine gelindiğinde) bir olay tetiklenecek. 
- Sidebar dosyasının içinde bir `const [profileMenuAnchor, setProfileMenuAnchor] = useState(null)` state'i tanımla. Butona basıldığında bu state güncellenmeli.
- Şimdilik sadece bu butonu ve state'ini tasarla, açılacak olan menünün `ProfileDropdownMenu` adlı ayrı bir component olacağını varsayarak kodun içine boş bir entegrasyon noktası (örn. `{profileMenuAnchor && <ProfileDropdownMenu anchorEl={profileMenuAnchor} ... />}`) bırak. Gelişmiş menüyü 2. bölümde yazacağız.

### 1.4. Çıktı Beklentisi (Nasıl Yanıt Vermelisin?)
Senden "parça parça, fonksiyon fonksiyon ayrılmış" devasa bir kod incelemesi istemiyorum. Senden **üretim ortamına kopyalanmaya hazır (production-ready)** kod blokları istiyorum. 

Lütfen cevabını şu şekilde yapılandır:
1. **Teorik Açıklama (Kısa):** Hangi design pattern'leri kullandığını ve neden o şekilde refactor ettiğini açıkla.
2. **`AdminHeader.js` Yeni Kodu:** Temizlenmiş ve yalınlaştırılmış halini tam dosya olarak ver.
3. **`AdminSidebar.js` Yeni Kodu:** En alta eklenen profil kutusu ve DOM yapısıyla birlikte tam kodunu ver.
4. **Edge Caseler:** Mobil görünümde ne olacağına dair kısa notunu ekle.

Bu Bölüm 1'in sonudur. Mükemmel, hatasız ve JSX standartlarına uygun bir çıktı üretmek için tüm dikkatini bu yapısal ayrıştırmaya vermeni bekliyorum. Sonraki bölümde profil menüsünün derinliklerine ineceğiz.
