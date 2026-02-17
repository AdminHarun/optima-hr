# 🚀 PHASE 4: PERFORMANS & ÖLÇEKLENEBİLİRLİK
## Production-Ready Optimizasyonlar (2 hafta)

---

## 📌 TASK 4.1: WEBSOCKET CONNECTION POOLING & CLUSTERING

### 🤖 Claude Prompt

```
GÖREV: WebSocket clustering ve Redis pub/sub ile multi-instance desteği

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Mevcut: Tek instance WebSocket
- Hedef: Çoklu backend instance'ları arasında WebSocket mesaj senkronizasyonu

BACKEND:

```javascript
// backend-express/services/ChatWebSocketService.js güncellemesi
const Redis = require('ioredis');

class ChatWebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.connections = new Map(); // userId -> WebSocket[]
    
    // Redis pub/sub
    this.redisSubscriber = new Redis(process.env.REDIS_URL);
    this.redisPublisher = new Redis(process.env.REDIS_URL);
    
    // Subscribe to broadcast channel
    this.redisSubscriber.subscribe('chat:broadcast', 'presence:update', 'notification:send');
    
    this.redisSubscriber.on('message', (channel, message) => {
      const data = JSON.parse(message);
      this.handleRedisMessage(channel, data);
    });
    
    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
  }

  handleConnection(ws, req) {
    const userId = this.authenticateConnection(req);
    if (!userId) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Kullanıcının connection'larını sakla (birden fazla device olabilir)
    if (!this.connections.has(userId)) {
      this.connections.set(userId, []);
    }
    this.connections.get(userId).push(ws);

    // Heartbeat
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => this.handleMessage(ws, userId, data));
    ws.on('close', () => this.handleDisconnect(userId, ws));
  }

  sendToUser(userId, data) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(data));
        }
      });
    } else {
      // User bu instance'da değil, Redis'e publish et
      this.redisPublisher.publish('chat:broadcast', JSON.stringify({
        type: 'user_message',
        userId,
        data
      }));
    }
  }

  handleRedisMessage(channel, message) {
    switch (channel) {
      case 'chat:broadcast':
        if (message.type === 'user_message') {
          this.sendToUser(message.userId, message.data);
        } else if (message.type === 'room_broadcast') {
          this.broadcastToRoom(message.roomId, message.data);
        }
        break;
      
      case 'presence:update':
        this.broadcastPresenceUpdate(message);
        break;
      
      case 'notification:send':
        this.sendNotification(message);
        break;
    }
  }

  // Heartbeat interval
  startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 saniye
  }
}

module.exports = ChatWebSocketService;
```

REDIS CHANNELS:

- `chat:broadcast` - Mesaj broadcast
- `presence:update` - Kullanıcı online/offline durumu
- `notification:send` - Bildirimler
- `typing:indicator` - Yazıyor göstergesi

LOAD BALANCER CONFIG (Nginx):

```nginx
upstream backend {
  ip_hash; # Aynı client'ı aynı instance'a yönlendir (WebSocket için önemli)
  server backend1:3000;
  server backend2:3000;
  server backend3:3000;
}

server {
  listen 80;
  server_name optima-hr.com;

  location /ws {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 86400;
  }

  location / {
    proxy_pass http://backend;
  }
}
```

BEKLENEN ÇIKTI:
- Çoklu backend instance çalışıyor
- WebSocket mesajları tüm instance'lara senkronize
- Redis pub/sub ile mesajlaşma
- Heartbeat ile dead connection temizliği
```

---

## 📌 TASK 4.2: MESSAGE PAGINATION & LAZY LOADING

### 🤖 Claude Prompt

```
GÖREV: Chat mesajları pagination ve lazy loading (infinite scroll)

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Mevcut: Tüm mesajlar tek seferde yükleniyor
- Hedef: Sayfalama ve sonsuz scroll

BACKEND:

```javascript
// backend-express/routes/chat.js
router.get('/rooms/:roomId/messages', authenticate, async (req, res) => {
  const { roomId } = req.params;
  const { limit = 50, before, after } = req.query;

  const whereClause = { room_id: roomId };
  
  // Cursor-based pagination
  if (before) {
    whereClause.id = { [Op.lt]: before };
  } else if (after) {
    whereClause.id = { [Op.gt]: after };
  }

  const messages = await ChatMessage.findAll({
    where: whereClause,
    include: [{ model: Employee, as: 'sender' }],
    order: [['id', before ? 'DESC' : 'ASC']],
    limit: parseInt(limit)
  });

  const hasMore = messages.length === parseInt(limit);

  res.json({
    messages: before ? messages.reverse() : messages,
    hasMore,
    nextCursor: messages.length > 0 ? messages[messages.length - 1].id : null,
    prevCursor: messages.length > 0 ? messages[0].id : null
  });
});
```

FRONTEND:

```jsx
// frontend/src/components/chat/MessageList.js
import { Virtuoso } from 'react-virtuoso';

const MessageList = ({ roomId }) => {
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const firstMessageId = messages[0]?.id;
      const res = await axios.get(`/api/chat/rooms/${roomId}/messages`, {
        params: { before: firstMessageId, limit: 50 }
      });
      
      setMessages([...res.data.messages, ...messages]);
      setHasMore(res.data.hasMore);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Virtuoso
      data={messages}
      startReached={loadMore}
      initialTopMostItemIndex={messages.length - 1}
      itemContent={(index, message) => (
        <MessageBubble key={message.id} message={message} />
      )}
    />
  );
};
```

BEKLENEN ÇIKTI:
- Mesajlar sayfalı yükleniyor
- Scroll yukarı çıkınca eski mesajlar yükleniyor (infinite scroll)
- Virtualized list ile performans
```

---

## 📌 TASK 4.3: REDIS CACHE STRATEJİSİ

### 🤖 Claude Prompt

```
GÖREV: Redis cache ile performans optimizasyonu

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Sık erişilen verileri cache'leme

BACKEND:

```javascript
// backend-express/services/CacheService.js
const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async get(key) {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key, value, ttl = 3600) {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async del(key) {
    await this.redis.del(key);
  }

  async delPattern(pattern) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // Cache wrapper
  async wrap(key, fn, ttl = 3600) {
    let data = await this.get(key);
    if (!data) {
      data = await fn();
      await this.set(key, data, ttl);
    }
    return data;
  }
}

module.exports = new CacheService();
```

CACHE KULLANIM ÖRNEKLERİ:

```javascript
// Kullanıcı profili cache
router.get('/employees/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  
  const employee = await cacheService.wrap(
    `employee:${id}`,
    () => Employee.findByPk(id, { include: ['roles', 'department'] }),
    3600 // 1 saat
  );
  
  res.json(employee);
});

// Kanal listesi cache
router.get('/channels', authenticate, async (req, res) => {
  const { siteCode } = req.user;
  
  const channels = await cacheService.wrap(
    `channels:${siteCode}`,
    () => Channel.findAll({ where: { siteCode, isArchived: false } }),
    1800 // 30 dakika
  );
  
  res.json(channels);
});

// Cache invalidation
router.put('/channels/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  
  await Channel.update(req.body, { where: { id } });
  
  // Cache'i temizle
  await cacheService.delPattern(`channels:*`);
  
  res.json({ success: true });
});
```

CACHE STRATEJİLERİ:

1. **User Session:** TTL 24 saat
2. **User Profile:** TTL 1 saat, değişince invalidate
3. **Channels List:** TTL 30 dakika
4. **Presence (online users):** TTL 5 dakika
5. **Chat Room Info:** TTL 15 dakika

BEKLENEN ÇIKTI:
- Redis cache çalışıyor
- Sık erişilen veriler cache'den geliyor
- Cache invalidation çalışıyor
- Response time'lar düştü
```

---

## 📌 TASK 4.4: DATABASE INDEXING & OPTIMIZATION

### 🤖 Claude Prompt

```
GÖREV: Database index ve query optimizasyonu

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Slow query'leri optimize etme

DATABASE INDEXES:

```sql
-- Chat mesajları
CREATE INDEX idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC);
CREATE INDEX idx_chat_messages_channel_created ON chat_messages(channel_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_parent ON chat_messages(parent_message_id) WHERE parent_message_id IS NOT NULL;

-- Employees
CREATE INDEX idx_employees_site_status ON employees_employee(site_code, status);
CREATE INDEX idx_employees_email ON employees_employee(email);
CREATE INDEX idx_employees_department ON employees_employee(department_id);

-- Tasks
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to, status);
CREATE INDEX idx_tasks_project ON tasks(project_id, status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status != 'done';

-- Channels
CREATE INDEX idx_channels_site_type ON channels(site_code, type, is_archived);

-- Audit logs
CREATE INDEX idx_audit_logs_employee_created ON audit_logs(employee_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Full-text search
CREATE INDEX idx_chat_messages_search ON chat_messages USING GIN(search_vector);
CREATE INDEX idx_files_name_search ON files USING GIN(to_tsvector('turkish', name));
```

QUERY OPTIMIZATION:

```javascript
// Önce (N+1 problem):
const rooms = await ChatRoom.findAll();
for (const room of rooms) {
  room.lastMessage = await ChatMessage.findOne({
    where: { room_id: room.id },
    order: [['created_at', 'DESC']]
  });
}

// Sonra (JOIN ile tek query):
const rooms = await ChatRoom.findAll({
  include: [{
    model: ChatMessage,
    as: 'messages',
    limit: 1,
    order: [['created_at', 'DESC']],
    separate: true
  }]
});
```

DATABASE MAINTENANCE CRON:

```javascript
// backend-express/jobs/dbMaintenance.js
cron.schedule('0 3 * * 0', async () => {
  // Her pazar gece 3'te
  await sequelize.query('VACUUM ANALYZE');
  await sequelize.query('REINDEX DATABASE optima_hr');
});
```

BEKLENEN ÇIKTI:
- Index'ler eklendi
- Slow query'ler optimize edildi
- N+1 problem'ler çözüldü
- VACUUM/REINDEX otomatik çalışıyor
```

---

## 📌 TASK 4.5: CDN ENTEGRASYONU (CLOUDFLARE)

### 🤖 Claude Prompt

```
GÖREV: Cloudflare CDN ile statik dosya dağıtımı

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Statik dosyaları CDN'den sunma

CLOUDFLARE SETUP:

1. **DNS Settings:**
   - Cloudflare'e domain ekle
   - Proxy enabled (turuncu bulut)

2. **Cache Rules:**
   - `/static/*` → Cache Everything, TTL 1 month
   - `/assets/*` → Cache Everything, TTL 1 week
   - `/api/*` → Bypass cache

3. **Page Rules:**
   ```
   optima-hr.com/static/*
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 week
   ```

BACKEND:

```javascript
// backend-express/server.js
// Statik dosyalar için Cache-Control header
app.use('/static', express.static('public/static', {
  maxAge: '30d',
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 gün
    } else if (path.endsWith('.jpg') || path.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 yıl
    }
  }
}));
```

FRONTEND BUILD OPTIMIZATION:

```javascript
// frontend/vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          utils: ['axios', 'date-fns']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
};
```

BEKLENEN ÇIKTI:
- Cloudflare CDN aktif
- Statik dosyalar CDN'den geliyor
- Cache hit rate yüksek
- Loading time'lar düştü
```

---

## 📌 TASK 4.6: LOAD BALANCING

### 🤖 Claude Prompt

```
GÖREV: Load balancer ile çoklu backend instance yönetimi

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Hedef: Nginx load balancer

NGINX CONFIG:

```nginx
# /etc/nginx/sites-available/optima-hr
upstream backend {
  least_conn; # En az bağlantılı server'a yönlendir
  
  server backend1.internal:3000 max_fails=3 fail_timeout=30s;
  server backend2.internal:3000 max_fails=3 fail_timeout=30s;
  server backend3.internal:3000 max_fails=3 fail_timeout=30s;
  
  # Health check
  check interval=3000 rise=2 fall=3 timeout=1000 type=http;
  check_http_send "HEAD /health HTTP/1.0\r\n\r\n";
  check_http_expect_alive http_2xx http_3xx;
}

server {
  listen 80;
  server_name optima-hr.com;

  # Rate limiting
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
  limit_req zone=api_limit burst=20 nodelay;

  location /api {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeout settings
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }

  location /ws {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
  }

  location / {
    root /var/www/optima-hr/frontend/build;
    try_files $uri $uri/ /index.html;
  }
}
```

BACKEND HEALTH CHECK:

```javascript
// backend-express/server.js
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});
```

DOCKER COMPOSE (Multi-instance):

```yaml
version: '3.8'

services:
  backend1:
    build: ./backend-express
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  backend2:
    build: ./backend-express
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend1
      - backend2

  postgres:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
```

BEKLENEN ÇIKTI:
- Nginx load balancer çalışıyor
- Çoklu backend instance yük dengeli
- Health check ile otomatik failover
- Rate limiting aktif
```

---

## ✅ PHASE 4 Tamamlanma Checklist

- [ ] TASK 4.1: WebSocket clustering
- [ ] TASK 4.2: Message pagination
- [ ] TASK 4.3: Redis cache
- [ ] TASK 4.4: Database optimization
- [ ] TASK 4.5: CDN entegrasyonu
- [ ] TASK 4.6: Load balancing

**PHASE 4 tamamlandıktan sonra PHASE 5'e geç!**

---
