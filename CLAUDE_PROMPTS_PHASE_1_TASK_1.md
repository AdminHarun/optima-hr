# 🚀 PHASE 1: İLETİŞİM & İŞBİRLİĞİ ÖZELLİKLERİ
## Slack Tarzı Chat Sistemi Güçlendirmesi (2-3 hafta)

---

## 📋 PHASE 1 Genel Bakış

**Hedef:** Mevcut birebir/grup chat sistemini Slack seviyesine çıkarmak.

**Eklenecek Özellikler:**
1. Kanal (Channel) Sistemi
2. Thread (Konuşma Zincirleri) Sistemi  
3. Mention (@kullanıcı, @channel) Sistemi
4. Global Arama Motoru
5. Durum (Status) Sistemi
6. Çevrimdışı Mesajlaşma & Kuyruk

---

## 📌 TASK 1.1: KANAL (CHANNEL) SİSTEMİ

### 🎯 Amaç
Slack'teki gibi departman/proje bazlı açık/kapalı kanallar oluşturmak.

### 🏗️ Teknik Tasarım

**Database Schema (PostgreSQL):**

```sql
-- Yeni tablo: channels
CREATE TABLE channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) DEFAULT 'public', -- 'public', 'private'
    site_code VARCHAR(50) NOT NULL,
    created_by INTEGER REFERENCES employees_employee(employee_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_archived BOOLEAN DEFAULT false,
    UNIQUE(name, site_code)
);

-- Yeni tablo: channel_members
CREATE TABLE channel_members (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees_employee(employee_id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'member'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    muted BOOLEAN DEFAULT false,
    UNIQUE(channel_id, employee_id)
);

-- chat_messages tablosuna kanal desteği
ALTER TABLE chat_messages ADD COLUMN channel_id INTEGER REFERENCES channels(id);
ALTER TABLE chat_messages ADD COLUMN message_type VARCHAR(20) DEFAULT 'text'; -- 'text', 'system', 'join', 'leave'

-- Index'ler
CREATE INDEX idx_channels_site_code ON channels(site_code);
CREATE INDEX idx_channel_members_employee ON channel_members(employee_id);
CREATE INDEX idx_chat_messages_channel ON chat_messages(channel_id);
```

**Backend Model (Sequelize):**

```javascript
// backend-express/models/Channel.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Channel = sequelize.define('Channel', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        is: /^[a-z0-9-_]+$/, // Sadece küçük harf, rakam, tire ve alt çizgi
        len: [3, 80]
      }
    },
    displayName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'display_name'
    },
    description: {
      type: DataTypes.TEXT
    },
    type: {
      type: DataTypes.ENUM('public', 'private'),
      defaultValue: 'public'
    },
    siteCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'site_code'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      field: 'created_by'
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_archived'
    }
  }, {
    tableName: 'channels',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  Channel.associate = (models) => {
    Channel.belongsTo(models.Employee, { foreignKey: 'createdBy', as: 'creator' });
    Channel.belongsToMany(models.Employee, {
      through: 'channel_members',
      foreignKey: 'channel_id',
      otherKey: 'employee_id',
      as: 'members'
    });
    Channel.hasMany(models.ChatMessage, { foreignKey: 'channel_id', as: 'messages' });
  };

  return Channel;
};

// backend-express/models/ChannelMember.js
module.exports = (sequelize) => {
  const ChannelMember = sequelize.define('ChannelMember', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    channelId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'channel_id'
    },
    employeeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'employee_id'
    },
    role: {
      type: DataTypes.ENUM('owner', 'admin', 'member'),
      defaultValue: 'member'
    },
    muted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'channel_members',
    timestamps: true,
    createdAt: 'joined_at',
    updatedAt: false
  });

  return ChannelMember;
};
```

**Backend Routes:**

```javascript
// backend-express/routes/channels.js
const express = require('express');
const router = express.Router();
const { Channel, ChannelMember, Employee, ChatMessage } = require('../models');
const { authenticate } = require('../middleware/auth');
const { Op } = require('sequelize');

// Tüm kanalları listele (public + üye olunan private)
router.get('/', authenticate, async (req, res) => {
  try {
    const { siteCode, employeeId } = req.user;

    const channels = await Channel.findAll({
      where: {
        siteCode,
        isArchived: false,
        [Op.or]: [
          { type: 'public' },
          {
            type: 'private',
            id: {
              [Op.in]: sequelize.literal(`(
                SELECT channel_id FROM channel_members 
                WHERE employee_id = ${employeeId}
              )`)
            }
          }
        ]
      },
      include: [
        {
          model: Employee,
          as: 'creator',
          attributes: ['employee_id', 'first_name', 'last_name']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Kanal oluştur
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, displayName, description, type } = req.body;
    const { siteCode, employeeId } = req.user;

    // Name validation (küçük harf + tire/alt çizgi)
    const cleanName = name.toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    const channel = await Channel.create({
      name: cleanName,
      displayName,
      description,
      type: type || 'public',
      siteCode,
      createdBy: employeeId
    });

    // Oluşturan kişiyi otomatik owner yap
    await ChannelMember.create({
      channelId: channel.id,
      employeeId,
      role: 'owner'
    });

    res.status(201).json(channel);
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// Kanala katıl (public kanallar için)
router.post('/:channelId/join', authenticate, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { employeeId } = req.user;

    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (channel.type === 'private') {
      return res.status(403).json({ error: 'Cannot join private channel without invitation' });
    }

    const [member, created] = await ChannelMember.findOrCreate({
      where: { channelId, employeeId },
      defaults: { role: 'member' }
    });

    res.json({ message: created ? 'Joined channel' : 'Already a member' });
  } catch (error) {
    console.error('Error joining channel:', error);
    res.status(500).json({ error: 'Failed to join channel' });
  }
});

// Kanaldan ayrıl
router.post('/:channelId/leave', authenticate, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { employeeId } = req.user;

    await ChannelMember.destroy({
      where: { channelId, employeeId }
    });

    res.json({ message: 'Left channel' });
  } catch (error) {
    console.error('Error leaving channel:', error);
    res.status(500).json({ error: 'Failed to leave channel' });
  }
});

// Kanal mesajlarını getir
router.get('/:channelId/messages', authenticate, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { employeeId } = req.user;
    const { limit = 50, before } = req.query;

    // Üyelik kontrolü
    const member = await ChannelMember.findOne({
      where: { channelId, employeeId }
    });

    if (!member) {
      return res.status(403).json({ error: 'Not a member of this channel' });
    }

    const whereClause = { channel_id: channelId };
    if (before) {
      whereClause.created_at = { [Op.lt]: new Date(before) };
    }

    const messages = await ChatMessage.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'sender',
          attributes: ['employee_id', 'first_name', 'last_name', 'profile_picture']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit)
    });

    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching channel messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
```

**Frontend: Channel Sidebar Component**

```jsx
// frontend/src/components/chat/ChannelSidebar.js
import React, { useState, useEffect } from 'react';
import { List, ListItem, ListItemButton, ListItemText, IconButton, Dialog, TextField, Button, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TagIcon from '@mui/icons-material/Tag';
import LockIcon from '@mui/icons-material/Lock';
import axios from 'axios';

const ChannelSidebar = ({ onChannelSelect, selectedChannelId }) => {
  const [channels, setChannels] = useState([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newChannel, setNewChannel] = useState({
    name: '',
    displayName: '',
    description: '',
    type: 'public'
  });

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await axios.get('/api/channels', {
        withCredentials: true
      });
      setChannels(response.data);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const handleCreateChannel = async () => {
    try {
      await axios.post('/api/channels', newChannel, {
        withCredentials: true
      });
      setCreateDialogOpen(false);
      setNewChannel({ name: '', displayName: '', description: '', type: 'public' });
      fetchChannels();
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  return (
    <div className="channel-sidebar">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Kanallar</h2>
        <IconButton size="small" onClick={() => setCreateDialogOpen(true)}>
          <AddIcon />
        </IconButton>
      </div>

      <List>
        {channels.map((channel) => (
          <ListItem key={channel.id} disablePadding>
            <ListItemButton
              selected={selectedChannelId === channel.id}
              onClick={() => onChannelSelect(channel)}
            >
              {channel.type === 'private' ? <LockIcon fontSize="small" /> : <TagIcon fontSize="small" />}
              <ListItemText 
                primary={channel.displayName} 
                className="ml-2"
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <div className="p-6 min-w-[400px]">
          <h2 className="text-xl font-bold mb-4">Yeni Kanal Oluştur</h2>
          
          <TextField
            fullWidth
            label="Kanal Adı"
            value={newChannel.name}
            onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
            helperText="Küçük harf, rakam, tire ve alt çizgi kullanılabilir"
            className="mb-4"
          />

          <TextField
            fullWidth
            label="Görünen Ad"
            value={newChannel.displayName}
            onChange={(e) => setNewChannel({ ...newChannel, displayName: e.target.value })}
            className="mb-4"
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Açıklama"
            value={newChannel.description}
            onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
            className="mb-4"
          />

          <FormControl fullWidth className="mb-4">
            <InputLabel>Tür</InputLabel>
            <Select
              value={newChannel.type}
              onChange={(e) => setNewChannel({ ...newChannel, type: e.target.value })}
            >
              <MenuItem value="public">Açık</MenuItem>
              <MenuItem value="private">Özel</MenuItem>
            </Select>
          </FormControl>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setCreateDialogOpen(false)}>İptal</Button>
            <Button variant="contained" onClick={handleCreateChannel}>Oluştur</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ChannelSidebar;
```

---

### 🤖 Claude'a Gönderilecek Prompt (TASK 1.1)

```
GÖREV: Optima HR projesine Slack tarzı Kanal (Channel) sistemi ekle.

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Backend: Node.js/Express + PostgreSQL + Sequelize
- Frontend: React 19 + Vite + MUI + Tailwind CSS
- Mevcut: Birebir chat ve grup chat var
- Hedef: Departman/proje bazlı açık/kapalı kanallar

İŞLEMLER:

1. DATABASE SCHEMA:
   - Yeni tablo: channels (id, name, display_name, description, type, site_code, created_by, is_archived)
   - Yeni tablo: channel_members (id, channel_id, employee_id, role, joined_at, muted)
   - chat_messages tablosuna channel_id kolonu ekle
   - Gerekli index'leri oluştur
   - Migration scripti oluştur veya server.js'e sync ekle

2. BACKEND MODELS:
   - Dosya: backend-express/models/Channel.js (yeni)
   - Dosya: backend-express/models/ChannelMember.js (yeni)
   - Sequelize model tanımlamaları
   - İlişkilendirmeler (associations)

3. BACKEND ROUTES:
   - Dosya: backend-express/routes/channels.js (yeni)
   - GET /api/channels - Kanalları listele
   - POST /api/channels - Kanal oluştur
   - POST /api/channels/:id/join - Kanala katıl
   - POST /api/channels/:id/leave - Kanaldan ayrıl
   - GET /api/channels/:id/messages - Kanal mesajlarını getir
   - Dosya: backend-express/server.js - Routes'u register et

4. WEBSOCKET ENTEGRASYONU:
   - Dosya: backend-express/services/ChatWebSocketService.js
   - Kanal mesajları için broadcast logic
   - Kullanıcı kanala join olduğunda notification

5. FRONTEND COMPONENTS:
   - Dosya: frontend/src/components/chat/ChannelSidebar.js (yeni)
   - Kanal listesi
   - Kanal oluşturma dialog'u
   - Kanala katılma/ayrılma butonları

6. FRONTEND INTEGRATION:
   - Dosya: frontend/src/pages/admin/ChatPageNew.js veya ilgili chat page
   - ChannelSidebar'ı entegre et
   - Kanal seçildiğinde mesajları göster
   - Kanal mesajı gönderme

BEKLENEN ÇIKTI:
- Çalışan kanal sistemi
- Public/private kanal desteği
- Kanal oluşturma, katılma, ayrılma işlevleri
- Kanal mesajlaşma
- WebSocket ile real-time updates

NOT: Mevcut chat sistemine dokunma, sadece kanal özelliğini ekle.
```

---

## ✅ TASK 1.1 Tamamlanma Checklist

- [ ] Database schema oluşturuldu
- [ ] Backend models tanımlandı
- [ ] Backend API routes implement edildi
- [ ] WebSocket kanal desteği eklendi
- [ ] Frontend ChannelSidebar component'i oluşturuldu
- [ ] Kanal oluşturma çalışıyor
- [ ] Kanala katılma/ayrılma çalışıyor
- [ ] Kanal mesajlaşma çalışıyor
- [ ] Real-time updates test edildi

---

*Diğer task'ları (1.2, 1.3, 1.4, 1.5, 1.6) ayrı dosyalarda detaylandırıyorum...*
