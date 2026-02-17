# 🚀 OPTIMA HR - CLAUDE İMPLEMENTATION GUIDE
## Kapsamlı Geliştirme Yol Haritası

> **Kullanım:** Bu dökümanı Claude'a bölümler halinde kopyala-yapıştır yaparak gönder.
> Her bölüm bağımsız çalışacak şekilde tasarlandı ve mevcut proje yapısını referans alıyor.

---

# 📚 İÇİNDEKİLER

## PHASE 0: HAZIRLIK VE MEVCUT SORUNLAR
- [x] Proje yapısı analizi
- [ ] Acil bug fix'ler (YAPILACAKLAR.md)

## PHASE 1: İLETİŞİM & İŞBİRLİĞİ (2-3 hafta)
- [ ] 1.1 Kanal (Channel) Sistemi
- [ ] 1.2 Thread Sistemi
- [ ] 1.3 Mention Sistemi (@kullanıcı, @channel)
- [ ] 1.4 Global Arama Motoru
- [ ] 1.5 Durum (Status) Sistemi
- [ ] 1.6 Çevrimdışı Mesajlaşma & Kuyruk

## PHASE 2: İŞ AKIŞI ENTEGRASYONU (3-4 hafta)
- [ ] 2.1 Görev Yönetim Sistemi (Task Management)
- [ ] 2.2 Kanban Panosu
- [ ] 2.3 Takvim Entegrasyonu
- [ ] 2.4 Dosya Yönetimi & Cloudflare R2
- [ ] 2.5 Dosya Versiyonlama

## PHASE 3: GÜVENLİK & KURUMSAL ÖZELLİKLER (2 hafta)
- [ ] 3.1 RBAC (Role Based Access Control)
- [ ] 3.2 2FA/MFA Sistemi
- [ ] 3.3 Detaylı Audit Logging
- [ ] 3.4 SSO (Single Sign-On) Entegrasyonu
- [ ] 3.5 Data Retention Politikaları

## PHASE 4: PERFORMANS & ÖLÇEKLENEBİLİRLİK (2 hafta)
- [ ] 4.1 WebSocket Connection Pooling & Clustering
- [ ] 4.2 Message Pagination & Lazy Loading
- [ ] 4.3 Redis Cache Stratejisi
- [ ] 4.4 Database Indexing & Optimization
- [ ] 4.5 CDN Entegrasyonu (Cloudflare)
- [ ] 4.6 Load Balancing

## PHASE 5: ENTEGRASYONLAR & OTOMASYONLAR (2-3 hafta)
- [ ] 5.1 Bot/Webhook Sistemi
- [ ] 5.2 Slash Komutları (/remind, /poll)
- [ ] 5.3 Üçüncü Parti Entegrasyonlar
- [ ] 5.4 Workflow Otomasyon Motoru

## PHASE 6: KULLANICI DENEYİMİ (2 hafta)
- [ ] 6.1 PWA & Offline Modu
- [ ] 6.2 Keyboard Shortcuts
- [ ] 6.3 Zengin Metin Editörü (Markdown/WYSIWYG)
- [ ] 6.4 Gelişmiş Emoji & GIF Entegrasyonu
- [ ] 6.5 Dark Mode Optimizasyonu

---

# 📖 KULLANIM KILAVUZU

## Nasıl Kullanılır?

1. **Her Phase için ayrı dosya var:**
   - `CLAUDE_PROMPTS_PHASE_0.md` - Acil düzeltmeler
   - `CLAUDE_PROMPTS_PHASE_1_TASK_1.md` - Kanal sistemi
   - `CLAUDE_PROMPTS_PHASE_1_TASK_2.md` - Thread sistemi
   - `CLAUDE_PROMPTS_PHASE_1_TASK_3-6.md` - Diğer iletişim özellikleri
   - `CLAUDE_PROMPTS_PHASE_2.md` - Görev yönetimi ve dosya sistemi
   - `CLAUDE_PROMPTS_PHASE_3.md` - Güvenlik ve kurumsal özellikler
   - `CLAUDE_PROMPTS_PHASE_4.md` - Performans ve ölçeklenebilirlik
   - `CLAUDE_PROMPTS_PHASE_5.md` - Entegrasyonlar ve otomasyonlar
   - `CLAUDE_PROMPTS_PHASE_6.md` - Kullanıcı deneyimi

2. **Her dosyayı sırayla aç ve içindeki prompt'ları kopyala-yapıştır yap:**
   - Her prompt kendi başına çalışacak şekilde tasarlandı
   - Claude tüm context'i anlayacak
   - Gerekli dosyaları bulup düzenleyecek

3. **Task tamamlanma kontrol listelerini takip et:**
   - Her task sonunda checklist var
   - Tamamlanmadan sonraki task'a geçme

4. **Hata durumunda:**
   - Prompt'u tekrar gönder
   - Hata mesajını Claude'a göster
   - Context'i hatırlat

## 📂 Dosya Yapısı

```
CLAUDE_IMPLEMENTATION_GUIDE.md       # Bu dosya (genel bakış)
├── CLAUDE_PROMPTS_PHASE_0.md         # Acil düzeltmeler (önce bunu)
├── CLAUDE_PROMPTS_PHASE_1_TASK_1.md  # Kanal sistemi
├── CLAUDE_PROMPTS_PHASE_1_TASK_2.md  # Thread sistemi
├── CLAUDE_PROMPTS_PHASE_1_TASK_3-6.md # Mention, arama, status
├── CLAUDE_PROMPTS_PHASE_2.md         # Görev yönetimi
├── CLAUDE_PROMPTS_PHASE_3.md         # RBAC, 2FA, SSO
├── CLAUDE_PROMPTS_PHASE_4.md         # Performance optimization
├── CLAUDE_PROMPTS_PHASE_5.md         # Webhook, bot, workflow
└── CLAUDE_PROMPTS_PHASE_6.md         # PWA, shortcuts, UX
```

---
---

# PHASE 0: HAZIRLIK VE ACİL DÜZELTMELER

## 📋 Proje Context'i

**Mevcut Teknoloji Stack:**
- Backend: Node.js/Express + PostgreSQL + Sequelize + WebSocket (ws) + Redis
- Frontend: React 19 + Vite + Tailwind CSS + Material UI
- Desktop: Electron
- Video: Daily.co

**Proje Dizin Yapısı:**
```
/Users/furkandaghan/Documents/verdent-projects/optima/
├── backend-express/
│   ├── server.js
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── middleware/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   └── services/
│   └── electron/
└── YAPILACAKLAR.md
```

---

