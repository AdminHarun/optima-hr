# Optima HR - Geliştirici Dokümantasyonu ve Master Prompt Rehberi

Bu teknik dokümantasyon, Yapay Zeka (Claude AI) aracılığıyla Optima HRMS sistemine entegre edilecek olan **Slack Mimarisi Profil ve Ayarlar Revizyonu** sürecini yönetmeniz için profesyonelce hazırlanmış bir yol haritasıdır.

Projeler standart "Kod ver/Kod al" seviyesini aşıp karmaşık ve durumlu (stateful) React mimarilerine evrildiğinde, Yapay Zekaya gönderilecek komutların (Prompt'ların) da Yüzüklerin Efendisi kitapları kadar detaylı, öngörülü ve spesifik olması gerekir. Aşağıda inceleyeceğiniz 3 parçalık yapı, tamamen bu mühendislik vizyonuyla inşa edilmiştir.

---

## 1. Neden Tek Bir Görev İçin Çoklu (Bölünmüş) Prompt Sistemine Geçtik?

Kullanıcı arayüzünde (UI) basit görünen bir "Tıklayıp Menü Açma ve Ayar Değiştirme" eylemi, Arka planda (Under-the-hood);
- Layout temizliği yapmayı,
- Context (Auth, Theme) bazlı Global state değişikliklerini manipüle etmeyi,
- DOM ağacında z-index ve Portal gibi karmaşık modal renderlarını gerçekleştirmeyi,
- CSS sınıflarında Glassmorphism token'larının uyumunu dengelemeyi gerektirir.

Bütün bu istekleri tek paragrafta (veya tek prompt'da) yazdığımızda:
1. **Context Window (Bağlam Penceresi) Şişer:** Claude, en baştaki detayları unutmaya başlar.
2. **Cut-off (Yarım Kalma):** Kod üretilirken response kotası dolar ve "Devam Et" deseniz bile class adları kayabilir, kod bozulur ve parçalar birbirine uymaz.
3. **Debug (Hata Ayıklama) Zorluğu:** Header taşımasındaki bir hata yüzünden, muhteşem yazılmış bir "Ayarlar" sayfasını baştan yazdırmak zorunda kalırsınız.

Bu sebeple "Divide and Conquer (Böl ve Yönet)" stratejisini benimsedik:
* **Part 1:** Sadece CSS ve Layout kırılmalarını engellemek için **DOM Modifikasyonları.**
* **Part 2:** Olay güdümlü, animasyonlu ve "Update State" yetkinliği yüksek olan **Component İzolasyonu.**
* **Part 3:** Veri yoğunluğu fazla olan "Settings Data Form" niteliğindeki devasa bir **Arayüz Kodlaması.**

---

## 2. Prompt'lar Ne İçeriyor ve Uygulamayı Hangi Hale Getirecek?

### 📦 Part 1: Layout Değişimi (`part1_layout.md`)
Bu promptun felsefesi "Yıkıcı ve Yeniden Kurucu" olmasıdır. Optima projesindeki darmadağın sağ üst köşeyi yokedip, son dönemin "Sidebar Focus" UX mantığını uygular.
* **Beklenen Müdahale:** `AdminHeader.js` soyutlanıp inceltilecek. `AdminSidebar.js` içindeki `List` bittiği noktaya, profil bilgisini içeren Flexbox kutusu yerleştirilecek ve menü state (`profileMenuAnchor`) zemini atılacaktır.

### 📦 Part 2: Olay Yöneticisi Profil Menüsü (`part2_profile_menu.md`)
Bu prompt "Micro-Interactions (Mikro Etkileşimler)" odaklıdır. Amaç içi boş linkler koymak değil, Slack'in hissini vermektir.
* **Beklenen Müdahale:** İçiçe menü mantığı (Nested menus), Date picker (Sessize alma modülü) ve status toggle operasyonlarını içeren interaktif bir `<Menu>` veya Popover componenti tasarlanır. Kod statik olmaz, `onClose`, `onPreferencesClick` gibi external function call'lar ile dış dünyayla iletişim kurar.

### 📦 Part 3: Komuta Merkezi (Preferences) Modal (`part3_preferences.md`)
Kullanıcının ilettiği Vanilla HTML taslağının (Saf kodun), MUI (Material-UI) standartlarına ve Optima HR context mantığına evrilmesidir. 
* **Beklenen Müdahale:** Optima HR'da mevcutta bulunan OptimaThemer logic'i ile sekme bazlı (Tab-based) kocaman bir ekran kodlanır. Sol tarafta 10+ sayfa arası yönlendirme yapan bir local-state routing sistemi, sağ tarafta ise `Array.map` ile dinamik basılan renk küpleri ve temalar kodlanır.

---

## 3. Adım Adım Entegrasyon Talimatları (Nasıl Devam Etmeli?)

Her adımda mutlak suretle kodun çalıştığından emin olarak bir sonrakine geçmeli, AI ile "Agile (Çevik)" bir iletişim kurmalısınız.

**AŞAMA 1: Ortam Hazırlığı (Temizlik)**
1. Claude'da yepyeni, temiz bir Chat (Sohbet) başlatın. (Önceki Optima konuşmalarınızla bağlamı karıştırmasın).
2. Hazırladığımız `part1_layout.md` dosyasının tüm metnini kopyalayıp enter'a basın.
3. Size vereceği kod bloklarındaki satırları `frontend/src/components/admin/AdminHeader.js` ve `AdminSidebar.js` içine (veya projede buna denk gelen sidebar dosyanıza) aktarın. React sunucusunda (Vite/Node) değişikliği gözlemleyin. Sağ üstteki avatar gitti mi? Sol alttaki ufak kutucuk parlıyor mu? Her şey iyiyse Aşama 2'ye geçin. Hata varsa Claude'a söyleyin ("Şurada Tailwind css margin hatası verdi" vb.) düzeltip ilerleyin.

**AŞAMA 2: Beyin ve Organların Eklenmesi**
4. Aynı sohbet penceresinden aslan kalkmadan, `part2_profile_menu.md` dosyasının içeriğini kopyalayıp gönderin.
5. Claude size `ProfileDropdownMenu.jsx` isminde harika bir bileşen verecek. Bu dosyayı Sidebar klasörünüzün içine (veya components/common'a) kaydedin. 
6. Aşama 1'de bıraktığınız Sidebar içindeki kutucuğun onClick eventine bu yeni Menu komponentini bağlayın. Ekrandaki hover submenulerini ve "Bildirimler için dialog açılıyor mu?" olayını test edin. Başarılıysa son aşamaya geçin.

**AŞAMA 3: Büyük Ayarlar Kalesinin İnşası**
7. Yine aynı sohbette `part3_preferences.md` promptunu yapıştırıp yollayın.
8. Gelen `PreferencesModal.jsx` bileşenini kaydedin.
9. Aşama 2'de elde ettiğiniz Profil Dropdown menüsünde bulunan "Ayarlar/Tercihler" list-item'ına bir tık(onClick) eventi ekleyip, bu dev Modal'ı `isOpen={true}` state'ine geçirecek mekanizmayı ana Layout'un (`AdminLayout.js` vs) içine koyun.
10. Ayarlar Modalını açın, CSS uyuşmazlıkları varsa düzelttirin (özellikle Webkit-Scrollbar ve Z-Index ayarlarını kontrol edin) ve ardından o nefis Light/Dark/Theme butonlarının keyfini çıkarın.

Tebrikler. Artık Optima HR sisteminizin, modern global SaaS yazılımlarıyla (Slack, Linear, vb.) rekabet edebilecek derecede ileri seviye bir Profil+Ayar gezinme mimarisi var. Her türlü hata durumunda verilen bu prompt setinin detaylı spesifikasyonları sayesinde AI neyi nerede yanlış yaptığını kolayca kavrayacaktır. Kolay Gelsin!
