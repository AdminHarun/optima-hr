# 🚀 PHASE 1: TASK 1.3-1.6 - DİĞER İLETİŞİM ÖZELLİKLERİ

---

## 📌 TASK 1.3: MENTION SİSTEMİ (@kullanıcı, @channel, @here)

### 🤖 Claude Prompt

```
GÖREV: Chat sistemine Mention (@kullanıcı, @channel, @here) sistemi ekle.

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Mesajlarda @kullanıcı ile mention, bildirim gönderme

İŞLEMLER:

1. DATABASE:
   - chat_messages tablosuna: mentions (JSONB/TEXT array) kolonu
   - Yeni tablo: message_mentions (message_id, mentioned_employee_id, mention_type)
   - Index: mentioned_employee_id

2. BACKEND MODEL & ROUTES:
   - ChatMessage model'e mentions field ekle
   - POST /api/chat/messages - Mesaj gönderirken mention parse et
   - Mention detection regex: /@(\w+)/g veya @[user_id] formatı
   - Mention edilen kullanıcılara bildirim gönder

3. WEBSOCKET:
   - mention_notification event'i
   - Mention edilen kullanıcıya real-time bildirim

4. FRONTEND:
   - Mesaj input'una mention autocomplete ekle
   - @ yazıldığında kullanıcı dropdown'u göster
   - Mention'ları highlight et (mavi/bold)
   - @channel, @here için özel davranış

IMPLEMENTATION DETAY:

Frontend - Mention Input Component:
- @emoji-mart/react benzeri autocomplete
- Kullanıcı listesi API: GET /api/employees/search?q=
- Seçilen kullanıcı: <span class="mention">@kullanıcı_adı</span>

Backend - Mention Parser:
```javascript
function parseMentions(content, employees) {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1];
    const employee = employees.find(e => 
      e.username === username || 
      `${e.first_name}${e.last_name}`.toLowerCase() === username.toLowerCase()
    );
    if (employee) mentions.push(employee.employee_id);
  }
  
  // Special mentions
  if (content.includes('@channel')) mentions.push('CHANNEL_ALL');
  if (content.includes('@here')) mentions.push('CHANNEL_ONLINE');
  
  return mentions;
}
```

BEKLENEN ÇIKTI:
- @ yazınca kullanıcı listesi
- Mention seçme çalışıyor
- Mention'lar highlight edilmiş
- Mention edilen kullanıcıya bildirim gidiyor
```

---

## 📌 TASK 1.4: GLOBAL ARAMA MOTORU (Ctrl+K)

### 🤖 Claude Prompt

```
GÖREV: Slack tarzı global arama (Ctrl+K shortcut) ekle.

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Mesaj, dosya, kullanıcı, kanal arama - Ctrl+K ile açılır

İŞLEMLER:

1. DATABASE:
   - PostgreSQL Full-Text Search kullan
   - chat_messages tablosuna: search_vector (tsvector) kolonu
   - Trigger: Mesaj eklenince/güncellenince search_vector otomatik güncelle
   - GIN index: search_vector

```sql
-- Full-text search setup
ALTER TABLE chat_messages ADD COLUMN search_vector tsvector;

CREATE INDEX idx_chat_messages_search 
ON chat_messages USING GIN(search_vector);

CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    to_tsvector('turkish', coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_messages_search_trigger
BEFORE INSERT OR UPDATE ON chat_messages
FOR EACH ROW EXECUTE FUNCTION update_search_vector();
```

2. BACKEND ROUTES:
   - GET /api/search?q=keyword&type=messages|files|users|channels
   - Response: 
     {
       messages: [...],
       files: [...],
       users: [...],
       channels: [...]
     }

3. BACKEND SEARCH LOGIC:
```javascript
// backend-express/routes/search.js
router.get('/', authenticate, async (req, res) => {
  const { q, type, limit = 20 } = req.query;
  const { siteCode, employeeId } = req.user;
  
  const results = {};
  
  // Mesaj arama
  if (!type || type === 'messages') {
    results.messages = await ChatMessage.findAll({
      where: {
        [Op.and]: [
          sequelize.literal(`search_vector @@ plainto_tsquery('turkish', '${q}')`),
          { site_code: siteCode }
        ]
      },
      include: [{ model: Employee, as: 'sender' }],
      limit,
      order: [[sequelize.literal(`ts_rank(search_vector, plainto_tsquery('turkish', '${q}'))`), 'DESC']]
    });
  }
  
  // Kullanıcı arama
  if (!type || type === 'users') {
    results.users = await Employee.findAll({
      where: {
        site_code: siteCode,
        [Op.or]: [
          { first_name: { [Op.iLike]: `%${q}%` } },
          { last_name: { [Op.iLike]: `%${q}%` } }
        ]
      },
      limit: 10
    });
  }
  
  // Kanal arama
  if (!type || type === 'channels') {
    results.channels = await Channel.findAll({
      where: {
        site_code: siteCode,
        [Op.or]: [
          { name: { [Op.iLike]: `%${q}%` } },
          { display_name: { [Op.iLike]: `%${q}%` } }
        ]
      },
      limit: 10
    });
  }
  
  res.json(results);
});
```

4. FRONTEND:
   - Global search modal/dialog component
   - Ctrl+K shortcut listener
   - Search input + results list
   - Keyboard navigation (up/down arrow, enter)

Frontend Component:
```jsx
// frontend/src/components/GlobalSearch.js
import { Dialog, TextField, List, ListItem } from '@mui/material';
import { useEffect, useState } from 'react';

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({});
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query) return;
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
      <TextField
        autoFocus
        placeholder="Mesaj, kişi, kanal ara... (Ctrl+K)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <List>
        {/* Results rendering */}
      </List>
    </Dialog>
  );
};
```

BEKLENEN ÇIKTI:
- Ctrl+K ile arama modal'ı açılır
- Mesaj, kullanıcı, kanal arama çalışır
- Keyboard navigation (ok tuşları)
- Arama sonuçları relevance sırasına göre
```

---

## 📌 TASK 1.5: DURUM (STATUS) SİSTEMİ

### 🤖 Claude Prompt

```
GÖREV: Kullanıcı durumu (Status) sistemi ekle - "Çevrimiçi", "Uzakta", "Rahatsız Etmeyin", "Toplantıda"

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Kullanıcılar durumlarını ayarlayabilsin, diğerleri görsün

İŞLEMLER:

1. DATABASE:
   - employees_employee tablosuna:
     * status VARCHAR(20) DEFAULT 'online' -- 'online', 'away', 'dnd', 'in_meeting', 'offline'
     * status_message TEXT
     * status_emoji VARCHAR(10)
     * status_expires_at TIMESTAMP

2. BACKEND:
   - PUT /api/employees/me/status
   - GET /api/employees/:id/status
   - WebSocket: status_change event

3. FRONTEND:
   - Status selector dropdown (header'da)
   - Status badge (avatar üzerinde renkli nokta)
   - Online: yeşil, Away: sarı, DND: kırmızı, In Meeting: mor
   - Custom status message input

IMPLEMENTATION:

Frontend Status Selector:
```jsx
// frontend/src/components/StatusSelector.js
const statuses = [
  { value: 'online', label: 'Çevrimiçi', color: 'green', emoji: '🟢' },
  { value: 'away', label: 'Uzakta', color: 'yellow', emoji: '🟡' },
  { value: 'dnd', label: 'Rahatsız Etmeyin', color: 'red', emoji: '🔴' },
  { value: 'in_meeting', label: 'Toplantıda', color: 'purple', emoji: '📅' }
];
```

Backend Logic:
```javascript
// Auto-away after 10 minutes idle
setInterval(async () => {
  await Employee.update(
    { status: 'away' },
    {
      where: {
        status: 'online',
        last_activity_at: {
          [Op.lt]: new Date(Date.now() - 10 * 60 * 1000)
        }
      }
    }
  );
}, 60000); // Her dakika kontrol
```

BEKLENEN ÇIKTI:
- Kullanıcı kendi durumunu değiştirebilir
- Durum renkli nokta olarak görünür
- Otomatik "Uzakta" (10dk idle)
- Status message (opsiyonel)
```

---

## 📌 TASK 1.6: ÇEVRİMDIŞI MESAJLAŞMA & KUYRUK

### 🤖 Claude Prompt

```
GÖREV: Çevrimdışı kullanıcılara mesaj kuyruğu sistemi

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Kullanıcı offline'ken gelen mesajlar kuyrukta beklesin, online olunca gösterilsin

İŞLEMLER:

1. DATABASE:
   - Yeni tablo: message_queue
     (id, message_id, recipient_id, queued_at, delivered_at, status)
   - status: 'queued', 'delivered', 'failed'

2. BACKEND:
   - Mesaj gönderilince: Alıcı offline'sa queue'ya ekle
   - WebSocket connection: Kullanıcı online olunca queue'daki mesajları gönder
   - Background job: Eski queued mesajları temizle (30 gün sonra)

3. WEBSOCKET:
   - Connection event'inde: Queue'daki mesajları gönder
   - Gönderilen mesajları delivered olarak işaretle

IMPLEMENTATION:

Backend Message Queue:
```javascript
// backend-express/services/MessageQueueService.js
class MessageQueueService {
  async queueMessage(messageId, recipientId) {
    await MessageQueue.create({
      message_id: messageId,
      recipient_id: recipientId,
      status: 'queued'
    });
  }

  async deliverQueuedMessages(employeeId) {
    const queued = await MessageQueue.findAll({
      where: { recipient_id: employeeId, status: 'queued' },
      include: [{ model: ChatMessage, include: ['sender', 'room'] }]
    });

    for (const item of queued) {
      // WebSocket'e gönder
      this.sendToUser(employeeId, {
        type: 'queued_message',
        message: item.ChatMessage
      });

      // Delivered olarak işaretle
      await item.update({ status: 'delivered', delivered_at: new Date() });
    }
  }
}
```

WebSocket Integration:
```javascript
// backend-express/services/ChatWebSocketService.js
onConnection(socket, employee) {
  // ... mevcut kod ...
  
  // Kuyrukdaki mesajları gönder
  const queueService = new MessageQueueService();
  queueService.deliverQueuedMessages(employee.employee_id);
}
```

BEKLENEN ÇIKTI:
- Offline kullanıcıya mesaj gönderme çalışır
- Mesaj kuyrukta bekler
- Kullanıcı online olunca mesajlar gelir
- Eski mesajlar otomatik temizlenir
```

---

## ✅ PHASE 1 Genel Tamamlanma Checklist

- [ ] TASK 1.1: Kanal sistemi
- [ ] TASK 1.2: Thread sistemi
- [ ] TASK 1.3: Mention sistemi
- [ ] TASK 1.4: Global arama
- [ ] TASK 1.5: Status sistemi
- [ ] TASK 1.6: Offline mesajlaşma

**PHASE 1 tamamlandıktan sonra PHASE 2'ye geç!**

---
