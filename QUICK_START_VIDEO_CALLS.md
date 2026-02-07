# 🚀 Video Call Implementation - Quick Start Guide

## 🎯 Hızlı Başlangıç (İlk 3 Gün)

Bu rehber, video call sistemini **minimum sürede çalışır hale getirmek** için hazırlanmıştır.

---

## ✅ Adım 1: Dependencies Kurulumu (30 dakika)

### Backend Dependencies
```bash
cd backend-express
npm install jsonwebtoken node-cron nodemailer
```

### Frontend Dependencies
```bash
cd frontend
npm install @jitsi/react-sdk react-notifications date-fns
```

---

## ✅ Adım 2: WebSocket Video Call Events (2 saat)

### `backend-express/services/chatWebSocketService.js` - Eklemeler

Mevcut dosyanın **handleMessage** fonksiyonuna ekle:

```javascript
// Video Call Event Handler
function handleVideoCallEvents(ws, data, clients) {
  const { type, call_id, room_id, action } = data;

  switch (type) {
    case 'video_call_request':
      // Admin video call başlatıyor
      const recipient = clients.get(room_id)?.applicant;
      if (recipient) {
        recipient.send(JSON.stringify({
          type: 'video_call_incoming',
          call_id,
          caller_name: data.caller_name,
          room_id
        }));
      }
      break;

    case 'video_call_response':
      // Applicant kabul/ret ediyor
      const admin = clients.get(room_id)?.admin;
      if (admin) {
        admin.send(JSON.stringify({
          type: 'video_call_response',
          call_id,
          action, // 'accept' or 'reject'
          participant_name: data.participant_name
        }));
      }

      // Eğer kabul edildiyse, Jitsi room oluştur
      if (action === 'accept') {
        const jitsiRoomName = `optima-call-${call_id}`;
        const jitsiUrl = `https://meet.jit.si/${jitsiRoomName}`;

        // Her ikisine de Jitsi URL'i gönder
        [admin, recipient].forEach(client => {
          if (client) {
            client.send(JSON.stringify({
              type: 'video_call_ready',
              call_id,
              jitsi_url: jitsiUrl,
              room_name: jitsiRoomName
            }));
          }
        });

        // Database'e kaydet
        saveVideoCall(call_id, room_id, jitsiRoomName);
      }
      break;

    case 'video_call_end':
      // Call sonlandırılıyor
      const roomClients = clients.get(room_id);
      [roomClients?.admin, roomClients?.applicant].forEach(client => {
        if (client) {
          client.send(JSON.stringify({
            type: 'video_call_ended',
            call_id
          }));
        }
      });

      // Database'i güncelle
      endVideoCall(call_id);
      break;
  }
}

// handleMessage içinde ekle:
else if (data.type && data.type.startsWith('video_call_')) {
  handleVideoCallEvents(ws, data, clients);
}
```

### Database Helper Functions

```javascript
async function saveVideoCall(callId, roomId, jitsiRoomName) {
  const videoCallService = require('./videoCallService');

  await videoCallService.createCall({
    callId,
    roomId,
    roomName: roomId,
    initiatorId: 'admin',
    initiatorName: 'Admin',
    participantId: roomId.replace('applicant_', ''),
    participantName: 'Applicant',
    jitsiRoomName,
    moderatorId: 'admin'
  });
}

async function endVideoCall(callId) {
  const videoCallService = require('./videoCallService');
  await videoCallService.endCall(callId);
}
```

---

## ✅ Adım 3: Frontend Video Call Popup (3 saat)

### `frontend/src/components/videoCall/IncomingCallNotification.js` (YENİ)

```javascript
import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Avatar, Typography } from '@mui/material';
import { VideoCall, CallEnd } from '@mui/icons-material';

const IncomingCallNotification = ({ callData, onAccept, onReject }) => {
  const [open, setOpen] = useState(!!callData);

  useEffect(() => {
    setOpen(!!callData);

    // Ring tone (opsiyonel)
    if (callData) {
      const audio = new Audio('/sounds/ring.mp3');
      audio.loop = true;
      audio.play();

      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [callData]);

  const handleAccept = () => {
    setOpen(false);
    onAccept(callData.call_id);
  };

  const handleReject = () => {
    setOpen(false);
    onReject(callData.call_id);
  };

  if (!callData) return null;

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
          color: 'white'
        }
      }}
    >
      <DialogTitle sx={{ textAlign: 'center', pt: 4 }}>
        <VideoCall sx={{ fontSize: 64, mb: 2 }} />
        <Typography variant="h5" fontWeight="bold">
          Görüntülü Görüşme Talebi
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ textAlign: 'center', pb: 2 }}>
        <Avatar sx={{
          width: 80,
          height: 80,
          margin: '0 auto 16px',
          bgcolor: 'white',
          color: '#1c61ab',
          fontSize: 32,
          fontWeight: 'bold'
        }}>
          {callData.caller_name?.[0] || 'A'}
        </Avatar>
        <Typography variant="h6">
          {callData.caller_name || 'Admin'}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
          sizi arıyor...
        </Typography>
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'center', pb: 4, gap: 2 }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleReject}
          startIcon={<CallEnd />}
          sx={{
            bgcolor: '#d32f2f',
            color: 'white',
            px: 4,
            '&:hover': { bgcolor: '#b71c1c' }
          }}
        >
          Reddet
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleAccept}
          startIcon={<VideoCall />}
          sx={{
            bgcolor: '#2e7d32',
            color: 'white',
            px: 4,
            '&:hover': { bgcolor: '#1b5e20' }
          }}
        >
          Kabul Et
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IncomingCallNotification;
```

### `frontend/src/components/videoCall/VideoCallWindow.js` (YENİ)

```javascript
import React, { useEffect } from 'react';
import { Dialog, IconButton, Box } from '@mui/material';
import { Close } from '@mui/icons-material';

const VideoCallWindow = ({ callData, onClose }) => {
  const [open, setOpen] = React.useState(!!callData);

  useEffect(() => {
    setOpen(!!callData);
  }, [callData]);

  const handleClose = () => {
    setOpen(false);
    onClose();
  };

  if (!callData?.jitsi_url) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          borderRadius: 2
        }
      }}
    >
      <Box sx={{ position: 'relative', height: '100%' }}>
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            zIndex: 1000,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: 'white',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
          }}
        >
          <Close />
        </IconButton>

        <iframe
          src={callData.jitsi_url}
          allow="camera; microphone; display-capture"
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        />
      </Box>
    </Dialog>
  );
};

export default VideoCallWindow;
```

---

## ✅ Adım 4: Chat Integration (1 saat)

### `frontend/src/components/chat/ChatContainer.js` - Eklemeler

```javascript
import { useState } from 'react';
import IncomingCallNotification from '../videoCall/IncomingCallNotification';
import VideoCallWindow from '../videoCall/VideoCallWindow';

// State ekle
const [incomingCall, setIncomingCall] = useState(null);
const [activeCall, setActiveCall] = useState(null);

// WebSocket handler'da ekle
const handleIncomingMessage = useCallback((data) => {
  // ... mevcut kod ...

  switch (data.type) {
    // ... mevcut cases ...

    case 'video_call_incoming':
      // Applicant: Gelen arama bildirimi
      setIncomingCall({
        call_id: data.call_id,
        caller_name: data.caller_name,
        room_id: data.room_id
      });
      break;

    case 'video_call_response':
      // Admin: Applicant'ın cevabı
      if (data.action === 'accept') {
        console.log('Call accepted by applicant');
      } else {
        console.log('Call rejected by applicant');
        alert('Arama reddedildi');
      }
      break;

    case 'video_call_ready':
      // Her iki taraf: Jitsi odası hazır
      setActiveCall({
        call_id: data.call_id,
        jitsi_url: data.jitsi_url,
        room_name: data.room_name
      });
      setIncomingCall(null); // Bildirimi kapat
      break;

    case 'video_call_ended':
      // Call sonlandı
      setActiveCall(null);
      break;
  }
}, []);

// Accept handler
const handleAcceptCall = (callId) => {
  webSocketService.send({
    type: 'video_call_response',
    call_id: callId,
    action: 'accept',
    participant_name: participantName
  });
};

// Reject handler
const handleRejectCall = (callId) => {
  webSocketService.send({
    type: 'video_call_response',
    call_id: callId,
    action: 'reject',
    participant_name: participantName
  });
  setIncomingCall(null);
};

// End call handler
const handleEndCall = () => {
  if (activeCall) {
    webSocketService.send({
      type: 'video_call_end',
      call_id: activeCall.call_id,
      room_id: roomId
    });
    setActiveCall(null);
  }
};

// Return JSX'ine ekle
return (
  <>
    <ChatRoom {...props} />

    {/* Incoming Call Notification */}
    <IncomingCallNotification
      callData={incomingCall}
      onAccept={handleAcceptCall}
      onReject={handleRejectCall}
    />

    {/* Video Call Window */}
    <VideoCallWindow
      callData={activeCall}
      onClose={handleEndCall}
    />
  </>
);
```

### `frontend/src/components/chat/ChatRoom.js` - Video Call Button

```javascript
// onVideoCall callback'i güncelle
const handleVideoCall = () => {
  const callId = `call_${Date.now()}`;

  // WebSocket üzerinden video call request gönder
  const ws = webSocketService.getConnection();
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'video_call_request',
      call_id: callId,
      room_id: roomId,
      caller_name: currentUserType === 'admin' ? 'Admin' : currentUserName
    }));
  }

  // Parent callback'i çağır (opsiyonel)
  onVideoCall?.();
};
```

---

## ✅ Adım 5: Test (30 dakika)

### Test Senaryosu

1. **Backend'i başlat**:
```bash
cd backend-express
node server.js
```

2. **Frontend'i başlat**:
```bash
cd frontend
npm start
```

3. **Test adımları**:

**Admin tarafı** (http://localhost:3000/chat):
- Chat sayfasını aç
- Bir applicant seç
- Video call butonuna tıkla

**Applicant tarafı** (http://localhost:3000/applicant-chat):
- Applicant olarak giriş yap
- Incoming call notification görünmeli
- "Kabul Et" butonuna tıkla
- Jitsi penceresi açılmalı

**Her iki taraf**:
- Video ve ses aktif olmalı
- Chat devam etmeli
- Call sonlandırma çalışmalı

---

## 🐛 Troubleshooting

### Problem 1: WebSocket mesajı gitmiyor
**Çözüm**: `chatWebSocketService.js`'de console.log ekle:
```javascript
console.log('📞 Video call event received:', data);
```

### Problem 2: Jitsi açılmıyor
**Çözüm**: Tarayıcı konsolunda CORS hatası var mı kontrol et. Jitsi iframe'e `allow` attribute eklenmiş mi?

### Problem 3: Incoming call notification görünmüyor
**Çözüm**: ChatContainer'da state güncellenmiş mi kontrol et:
```javascript
console.log('Incoming call state:', incomingCall);
```

---

## 📋 Checklist

- [ ] Backend dependencies kuruldu
- [ ] Frontend dependencies kuruldu
- [ ] chatWebSocketService.js güncellendi
- [ ] IncomingCallNotification component oluşturuldu
- [ ] VideoCallWindow component oluşturuldu
- [ ] ChatContainer video call state'leri eklendi
- [ ] ChatRoom video call button güncellendi
- [ ] Test edildi ve çalışıyor ✅

---

## 🎯 Sonraki Adımlar (İsteğe Bağlı)

### 1. JWT Authentication (Güvenlik)
- Jitsi için JWT token oluştur
- Moderator/participant rolleri ekle

### 2. Call History
- Tamamlanan call'ları kaydet
- Chat içinde call history göster

### 3. Calendar Integration
- Scheduled meeting'ler için otomatik call başlat
- Meeting reminder notifications

### 4. Advanced Features
- Screen sharing
- Call recording
- Waiting room
- Virtual backgrounds

---

## 📚 Kaynaklar

- **Jitsi Docs**: https://jitsi.github.io/handbook/
- **Rocket.Chat Video Conf**: Referans pattern (mevcut analiz)
- **WebSocket Protocol**: Mevcut chat protocol üzerine inşa edildi

---

**Tahmini Süre**: 3 gün (temel implementasyon)
**Zorluk**: Orta
**Önkoşul**: Mevcut chat sistemi çalışıyor olmalı

**Son Güncelleme**: 2025-10-11
**Durum**: Uygulamaya Hazır ✅
