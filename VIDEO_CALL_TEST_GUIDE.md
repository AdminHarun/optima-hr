# Video Call System - Test Guide

## ✅ Implementation Complete!

Video call sistemi başarıyla implement edildi. Şimdi test edebilirsiniz!

---

## 🔧 Test Öncesi Hazırlık

### 1. Backend'i Başlatın
```bash
cd backend-express
node server.js
```

**Beklenen çıktı:**
```
✅ WebSocket server initialized on /ws
✅ Video call tables initialized
🚀 Server running on http://172.18.4.161:9000
```

### 2. Frontend'i Başlatın
```bash
cd frontend
npm start
```

**Beklenen çıktı:**
```
Compiled successfully!
Local: http://localhost:3000
```

---

## 🎬 Test Senaryoları

### Senaryo 1: Admin → Applicant Video Call (Temel Flow)

#### Adım 1: Admin Tarafı
1. **Tarayıcı 1**'de şu URL'yi açın: `http://localhost:3000/admin/calls`
2. Sol taraftaki aday listesinden birini seçin
3. Chat penceresi açılacak
4. Sağ üstteki **📹 Video Call** butonuna tıklayın

**Beklenen:**
- Console'da: `📞 Starting video call request: call_...`
- Console'da: `✅ Video call request sent`

#### Adım 2: Applicant Tarafı
1. **Tarayıcı 2**'de (veya başka bir browser) şu URL'yi açın:
   - `http://localhost:3000/applicant-chat` (eğer applicant login varsa)
   - Veya aynı chat room'a başka bir WebSocket connection açın

**Beklenen:**
- **Incoming Call Notification** popup açılacak
- Üstte video call iconu animate olacak (pulse efekti)
- Avatar ve caller name görünecek
- "Admin sizi arıyor..." yazacak

#### Adım 3: Call Kabul
1. Applicant tarafında **"Kabul Et"** butonuna tıklayın

**Beklenen:**
- Console'da: `📞 Accepting call: call_...`
- Console'da: `✅ Call acceptance sent`
- Notification popup kapanacak
- **Video Call Window** açılacak (Jitsi iframe)

#### Adım 4: Her İki Tarafta Jitsi
1. Her iki tarayıcıda da Jitsi penceresi açılacak
2. URL: `https://meet.jit.si/optima-call-{callId}`

**Beklenen:**
- Mikrofon/kamera izni isteyecek
- Video stream başlayacak
- Her iki taraf birbirini görecek

#### Adım 5: Call Sonlandırma
1. Video call penceresindeki **❌ Kapat** butonuna tıklayın

**Beklenen:**
- Console'da: `📞 Ending call: call_...`
- Video window kapanacak
- Database'de call "ended" olarak işaretlenecek

---

### Senaryo 2: Call Rejection (Red)

#### Adım 1: Admin Call Başlatır
1. Admin video call butonuna tıklar

#### Adım 2: Applicant Reddeder
1. Applicant incoming call notification'da **"Reddet"** butonuna tıklar

**Beklenen:**
- Admin tarafında: `❌ Call rejected by applicant`
- Error mesajı: "Arama reddedildi" (3 saniye gösterir)
- Notification popup kapanır
- Database'de call "missed" olarak işaretlenir

---

### Senaryo 3: Offline Applicant

#### Adım 1: Applicant Offline
1. Applicant chat'i kapatın (WebSocket disconnect)

#### Adım 2: Admin Call Başlatır
1. Admin video call butonuna tıklar

**Beklenen:**
- Call request gönderilir
- Ama kimse cevap vermez (timeout olabilir)
- Database'de call kaydedilir

---

## 🔍 Debug & Troubleshooting

### Console Log'ları Kontrol Edin

#### Backend Console (server.js)
```
📞 Video call request from Admin in room applicant_123
✅ Video call notification sent to applicant
📞 Video call accept by John Doe for call call_xxx
✅ Jitsi URL sent to admin: https://meet.jit.si/optima-call-xxx
✅ Jitsi URL sent to applicant: https://meet.jit.si/optima-call-xxx
```

#### Frontend Console (Admin)
```
📞 Starting video call request: call_1234567890
✅ Video call request sent
📞 Video call response: {action: 'accept', ...}
✅ Call accepted by applicant
📞 Video call ready: {jitsi_url: '...', ...}
```

#### Frontend Console (Applicant)
```
📞 Incoming video call: {caller_name: 'Admin', ...}
📞 Accepting call: call_1234567890
✅ Call acceptance sent
📞 Video call ready: {jitsi_url: '...', ...}
```

---

## 🗄️ Database Verification

### Video Calls Tablosunu Kontrol Edin
```sql
SELECT
  call_id,
  room_id,
  initiator_name,
  participant_name,
  status,
  jitsi_room_name,
  started_at,
  ended_at,
  duration_seconds
FROM video_calls
ORDER BY started_at DESC
LIMIT 5;
```

**Beklenen:**
| call_id | room_id | initiator_name | participant_name | status | jitsi_room_name |
|---------|---------|----------------|-----------------|--------|-----------------|
| call_123 | applicant_7 | Admin | John Doe | ended | optima-call-123 |

---

## 🚨 Common Issues & Solutions

### Issue 1: Incoming call notification görünmüyor
**Sebep:** WebSocket connection kurulmamış
**Çözüm:**
```javascript
// Frontend console'da kontrol et:
webSocketService.getConnection()
// null ise tekrar connect et
```

### Issue 2: Jitsi window açılmıyor
**Sebep:** video_call_ready event gelmiyor
**Çözüm:**
- Backend console'da "Jitsi URL sent" log var mı kontrol et
- Frontend console'da video_call_ready event log var mı kontrol et

### Issue 3: Video/Audio çalışmıyor
**Sebep:** Browser permissions
**Çözüm:**
- Browser'da mikrofon/kamera izinlerini kontrol et
- HTTPS gerekebilir (localhost için sorun yok)
- Jitsi'nin kendi izin dialogu çıkacak

### Issue 4: WebSocket disconnect
**Sebep:** Backend çalışmıyor veya IP yanlış
**Çözüm:**
```javascript
// ChatContainer.js'de doğru IP kontrol et:
const wsUrl = `ws://172.18.4.161:9000/ws/admin-chat/${roomId}`;
// IP adresiniz farklıysa güncelleyin
```

---

## ✅ Test Checklist

- [ ] Backend başlatıldı ve çalışıyor
- [ ] Frontend başlatıldı ve çalışıyor
- [ ] Admin video call butonuna tıklayabiliyor
- [ ] Applicant incoming call notification alıyor
- [ ] Applicant call'ı kabul edebiliyor
- [ ] Her iki tarafta Jitsi window açılıyor
- [ ] Video/audio stream çalışıyor
- [ ] Call sonlandırma çalışıyor
- [ ] Call rejection çalışıyor
- [ ] Database'de call kaydediliyor
- [ ] Console log'lar doğru

---

## 📊 Performance Metrics

### Expected Latency
- WebSocket message: **10-50ms**
- Jitsi room creation: **100-300ms**
- Video stream start: **500-1000ms**

### Database Queries
- Call creation: **< 50ms**
- Call update: **< 30ms**
- Call history: **< 100ms**

---

## 🎯 Next Steps (Opsiyonel)

Temel video call çalışıyor. İsterseniz şu ek özellikler eklenebilir:

### 1. Call History UI
- Geçmiş aramaları listele
- Call duration göster
- Missed/completed status

### 2. Call Timeout
- 30 saniye cevap verilmezse otomatik cancel
- Timeout notification

### 3. Multiple Calls
- Birden fazla eş zamanlı call support
- Call queue sistemi

### 4. Advanced Features
- Screen sharing
- Call recording (Jitsi feature)
- Call quality indicators
- Waiting room

---

## 🔗 Useful Links

- **Jitsi Meet Handbook**: https://jitsi.github.io/handbook/
- **WebSocket Protocol**: Existing chat protocol extended
- **Backend Service**: `backend-express/services/chatWebSocketService.js:397-584`
- **Frontend Components**: `frontend/src/components/videoCall/`

---

## 📝 Test Sonuç Raporu (Doldurun)

### Test Date: _____________

#### ✅ Çalışan Özellikler:
- [ ] Video call request
- [ ] Incoming call notification
- [ ] Call acceptance
- [ ] Call rejection
- [ ] Jitsi integration
- [ ] Call end
- [ ] Database logging

#### ❌ Sorunlar:
1. _____________________
2. _____________________
3. _____________________

#### 📝 Notlar:
_____________________
_____________________
_____________________

---

**Generated**: 2025-10-11
**Status**: Ready for Testing ✅
**Implementation Time**: ~3 hours
