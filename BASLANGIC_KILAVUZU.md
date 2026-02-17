# 📝 CLAUDE İMPLEMENTATION GUIDE - HIZLI BAŞLANGIÇ

## 🎯 Ne Yapacaksın?

Optima HR projesini Slack/Bitrix seviyesine çıkarmak için Claude'a göndereceğin detaylı prompt'lar.

## 📚 Dosyalar

Tüm dosyalar bu klasörde:
`/Users/furkandaghan/Documents/verdent-projects/optima/`

### Ana Döküman
- **CLAUDE_IMPLEMENTATION_GUIDE.md** - Genel bakış (bu dosya)

### Phase Dökümanları (Sırayla kullan)
1. **CLAUDE_PROMPTS_PHASE_0.md** - Acil bug fix'ler (ÖNCELİKLE BU!)
2. **CLAUDE_PROMPTS_PHASE_1_TASK_1.md** - Kanal sistemi
3. **CLAUDE_PROMPTS_PHASE_1_TASK_2.md** - Thread sistemi
4. **CLAUDE_PROMPTS_PHASE_1_TASK_3-6.md** - Mention, arama, status
5. **CLAUDE_PROMPTS_PHASE_2.md** - Görev yönetimi, takvim, R2
6. **CLAUDE_PROMPTS_PHASE_3.md** - RBAC, 2FA, audit logging
7. **CLAUDE_PROMPTS_PHASE_4.md** - Performance, cache, scaling
8. **CLAUDE_PROMPTS_PHASE_5.md** - Webhook, bot, entegrasyonlar
9. **CLAUDE_PROMPTS_PHASE_6.md** - PWA, shortcuts, UX

## 🚀 Nasıl Kullanırsın?

### Adım 1: Dosyayı Aç
Örnek: `CLAUDE_PROMPTS_PHASE_0.md` dosyasını aç.

### Adım 2: Prompt'u Kopyala
Dosya içinde **"🤖 Claude'a Gönderilecek Prompt"** başlıklı bölümleri bul.

### Adım 3: Claude'a Yapıştır
Prompt'u kopyala ve Claude'a gönder. Örnek:

```
GÖREV: Optima HR projesinde ApplicantChat mesaj yüklenme hatası var.

SORUN: Applicant chat'te "Bağlantı var" diyor ama mesajlar yüklenemiyor.

İŞLEMLER:
1. Backend'de form submission sırasında chat room otomatik oluşturulma mantığını kontrol et...
2. Frontend'de ApplicantChat.js içindeki loadMessages fonksiyonunu incele...
...
```

### Adım 4: Bekle ve Kontrol Et
Claude kodu yazacak. Tamamlandığında checklist'i kontrol et.

### Adım 5: Sonraki Task'a Geç
Bir task bittikten sonra, o dosyadaki sonraki task'a veya bir sonraki phase dosyasına geç.

## ✅ Tamamlanma Kontrol Listesi Örneği

Her task sonunda böyle bir checklist var:

```
✅ TASK 1.1 Tamamlanma Checklist

- [ ] Database schema oluşturuldu
- [ ] Backend models tanımlandı
- [ ] Backend API routes implement edildi
- [ ] Frontend component'i oluşturuldu
- [ ] Test edildi ve çalışıyor
```

Tamamlanmadan sonraki task'a geçme!

## 🎯 Öncelik Sırası

### 🔥 ÇOK ACİL (1-2 gün)
1. **PHASE 0** - Bug fix'ler
   - Chat mesaj yüklenme
   - Admin profil görünme
   - Favicon
   - Landing page

### ⚡ ÖNCELİKLİ (1-2 hafta)
2. **PHASE 1** - İletişim özellikleri
   - Kanallar
   - Thread'ler
   - Mention
   - Arama

### 🎯 ÖNEMLİ (2-3 hafta)
3. **PHASE 2** - İş akışı
   - Görev yönetimi
   - Kanban
   - Takvim

### 🔒 KRİTİK (2 hafta)
4. **PHASE 3** - Güvenlik
   - RBAC
   - 2FA
   - Audit logging

### 🚀 PERFORMANS (2 hafta)
5. **PHASE 4** - Ölçeklenebilirlik
   - WebSocket clustering
   - Cache
   - CDN

### 🔗 ENTEGRASYON (2-3 hafta)
6. **PHASE 5** - Otomasyonlar
   - Webhook
   - Bot
   - Workflow

### 🎨 KULLANICI DENEYİMİ (2 hafta)
7. **PHASE 6** - UX iyileştirmeleri
   - PWA
   - Keyboard shortcuts
   - Rich text editor

## 💡 İpuçları

1. **Sabırlı Ol:** Her task 30-60 dakika sürebilir.
2. **Test Et:** Her task sonrası mutlaka test et.
3. **Git Commit:** Her önemli değişiklikten sonra commit at.
4. **Hata Durumunda:** Prompt'u tekrar gönder, hata mesajını ekle.
5. **Context Hatırlat:** Claude unutursa "Optima HR projesinde çalışıyoruz" de.

## 🆘 Yardım

Bir şey anlamadıysan veya hata alıyorsan:

1. Hata mesajını Claude'a göster
2. Hangi task'ta olduğunu söyle
3. "Ne yapmam gerekiyor?" diye sor

## 📊 İlerleme Takibi

Her phase'i tamamladıkça işaretle:

- [ ] PHASE 0: Acil düzeltmeler
- [ ] PHASE 1: İletişim özellikleri
- [ ] PHASE 2: İş akışı entegrasyonu
- [ ] PHASE 3: Güvenlik & kurumsal
- [ ] PHASE 4: Performans & ölçeklenebilirlik
- [ ] PHASE 5: Entegrasyonlar & otomasyonlar
- [ ] PHASE 6: Kullanıcı deneyimi

## 🎉 Başarı!

Tüm phase'ler tamamlandığında, Optima HR enterprise-level bir Slack/Bitrix alternatifi olacak!

---

**HADİ BAŞLA! İLK OLARAK `CLAUDE_PROMPTS_PHASE_0.md` DOSYASINI AÇ!**

---
