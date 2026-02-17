# 🚀 PHASE 1: TASK 1.2 - THREAD SİSTEMİ
## Mesajlara Yanıt Zincirleri (Slack Tarzı)

---

## 🎯 Amaç
Slack'teki gibi mesajlara yanıt zincirleri (thread) oluşturarak konuşmaları organize etmek.

---

## 🏗️ Teknik Tasarım

### Database Schema Güncellemeleri

```sql
-- chat_messages tablosuna thread desteği
ALTER TABLE chat_messages ADD COLUMN parent_message_id INTEGER REFERENCES chat_messages(id) ON DELETE CASCADE;
ALTER TABLE chat_messages ADD COLUMN thread_reply_count INTEGER DEFAULT 0;
ALTER TABLE chat_messages ADD COLUMN last_thread_reply_at TIMESTAMP;

-- Index
CREATE INDEX idx_chat_messages_parent ON chat_messages(parent_message_id);
CREATE INDEX idx_chat_messages_thread_activity ON chat_messages(last_thread_reply_at) WHERE parent_message_id IS NULL;

-- Trigger: Thread reply count güncelleme
CREATE OR REPLACE FUNCTION update_thread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_message_id IS NOT NULL THEN
    UPDATE chat_messages 
    SET 
      thread_reply_count = thread_reply_count + 1,
      last_thread_reply_at = NEW.created_at
    WHERE id = NEW.parent_message_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER thread_reply_count_trigger
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_thread_count();
```

---

### Backend Model Güncellemesi

```javascript
// backend-express/models/ChatMessage.js güncellemesi
module.exports = (sequelize) => {
  const ChatMessage = sequelize.define('ChatMessage', {
    // ... mevcut alanlar ...
    
    parentMessageId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'parent_message_id',
      references: {
        model: 'chat_messages',
        key: 'id'
      }
    },
    threadReplyCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'thread_reply_count'
    },
    lastThreadReplyAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_thread_reply_at'
    }
  }, {
    // ... mevcut config ...
  });

  ChatMessage.associate = (models) => {
    // ... mevcut ilişkiler ...
    
    // Self-referencing for threads
    ChatMessage.hasMany(ChatMessage, {
      foreignKey: 'parentMessageId',
      as: 'threadReplies'
    });
    
    ChatMessage.belongsTo(ChatMessage, {
      foreignKey: 'parentMessageId',
      as: 'parentMessage'
    });
  };

  return ChatMessage;
};
```

---

### Backend Routes Güncellemesi

```javascript
// backend-express/routes/chat.js içine eklenecek

// Thread mesajlarını getir
router.get('/messages/:messageId/thread', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { employeeId } = req.user;

    // Parent mesajı getir
    const parentMessage = await ChatMessage.findByPk(messageId, {
      include: [
        {
          model: Employee,
          as: 'sender',
          attributes: ['employee_id', 'first_name', 'last_name', 'profile_picture']
        }
      ]
    });

    if (!parentMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Thread replies getir
    const threadReplies = await ChatMessage.findAll({
      where: { parent_message_id: messageId },
      include: [
        {
          model: Employee,
          as: 'sender',
          attributes: ['employee_id', 'first_name', 'last_name', 'profile_picture']
        },
        {
          model: ChatMessage,
          as: 'parentMessage',
          attributes: ['id', 'content']
        }
      ],
      order: [['created_at', 'ASC']]
    });

    res.json({
      parent: parentMessage,
      replies: threadReplies,
      totalReplies: threadReplies.length
    });
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
});

// Thread'e cevap gönder
router.post('/messages/:messageId/reply', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content, attachments } = req.body;
    const { employeeId } = req.user;

    // Parent mesajı kontrol et
    const parentMessage = await ChatMessage.findByPk(messageId);
    if (!parentMessage) {
      return res.status(404).json({ error: 'Parent message not found' });
    }

    // Thread reply oluştur
    const reply = await ChatMessage.create({
      content,
      senderId: employeeId,
      roomId: parentMessage.roomId,
      channelId: parentMessage.channelId,
      parentMessageId: messageId,
      attachments: attachments || [],
      messageType: 'text'
    });

    // Parent mesajın thread count'unu güncelle
    await parentMessage.update({
      threadReplyCount: parentMessage.threadReplyCount + 1,
      lastThreadReplyAt: new Date()
    });

    // Reply'i populate et
    const populatedReply = await ChatMessage.findByPk(reply.id, {
      include: [
        {
          model: Employee,
          as: 'sender',
          attributes: ['employee_id', 'first_name', 'last_name', 'profile_picture']
        }
      ]
    });

    // WebSocket broadcast
    const chatService = req.app.get('chatService');
    if (chatService) {
      chatService.broadcastThreadReply(parentMessage, populatedReply);
    }

    res.status(201).json(populatedReply);
  } catch (error) {
    console.error('Error creating thread reply:', error);
    res.status(500).json({ error: 'Failed to create thread reply' });
  }
});
```

---

### WebSocket Service Güncellemesi

```javascript
// backend-express/services/ChatWebSocketService.js içine ekle

class ChatWebSocketService {
  // ... mevcut metodlar ...

  broadcastThreadReply(parentMessage, reply) {
    const roomKey = parentMessage.roomId ? 
      `room:${parentMessage.roomId}` : 
      `channel:${parentMessage.channelId}`;

    const event = {
      type: 'thread_reply',
      parentMessageId: parentMessage.id,
      reply: reply,
      timestamp: new Date().toISOString()
    };

    // Room/channel'daki herkese gönder
    this.broadcastToRoom(roomKey, event);

    // Redis pub/sub
    if (this.redisPublisher) {
      this.redisPublisher.publish('chat:thread_reply', JSON.stringify({
        roomKey,
        event
      }));
    }
  }

  // Thread açıldığında bildirim
  notifyThreadOpened(messageId, userId) {
    const event = {
      type: 'thread_opened',
      messageId,
      userId,
      timestamp: new Date().toISOString()
    };

    this.sendToUser(userId, event);
  }
}
```

---

### Frontend: Thread Panel Component

```jsx
// frontend/src/components/chat/ThreadPanel.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  Drawer, 
  IconButton, 
  Typography, 
  Divider, 
  TextField, 
  Button,
  Avatar,
  Box
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

const ThreadPanel = ({ open, onClose, parentMessage }) => {
  const [threadReplies, setThreadReplies] = useState([]);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open && parentMessage) {
      fetchThread();
    }
  }, [open, parentMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [threadReplies]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchThread = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/chat/messages/${parentMessage.id}/thread`,
        { withCredentials: true }
      );
      setThreadReplies(response.data.replies);
    } catch (error) {
      console.error('Error fetching thread:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim()) return;

    try {
      const response = await axios.post(
        `/api/chat/messages/${parentMessage.id}/reply`,
        { content: replyContent },
        { withCredentials: true }
      );

      setThreadReplies([...threadReplies, response.data]);
      setReplyContent('');
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  if (!parentMessage) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: '450px' } }
      }}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Typography variant="h6">Thread</Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </div>

        {/* Parent Message */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-start gap-3">
            <Avatar 
              src={parentMessage.sender?.profile_picture}
              alt={`${parentMessage.sender?.first_name} ${parentMessage.sender?.last_name}`}
            >
              {parentMessage.sender?.first_name?.[0]}
            </Avatar>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <Typography variant="subtitle2" fontWeight="bold">
                  {parentMessage.sender?.first_name} {parentMessage.sender?.last_name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {format(new Date(parentMessage.created_at), 'PPp', { locale: tr })}
                </Typography>
              </div>
              <Typography variant="body2" className="mt-1">
                {parentMessage.content}
              </Typography>
            </div>
          </div>
        </div>

        {/* Thread Replies */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <Typography color="text.secondary">Yükleniyor...</Typography>
          ) : threadReplies.length === 0 ? (
            <Typography color="text.secondary">
              Henüz yanıt yok. İlk yanıtı siz yazın!
            </Typography>
          ) : (
            <>
              {threadReplies.map((reply) => (
                <div key={reply.id} className="flex items-start gap-3 mb-4">
                  <Avatar 
                    src={reply.sender?.profile_picture}
                    alt={`${reply.sender?.first_name} ${reply.sender?.last_name}`}
                    sx={{ width: 32, height: 32 }}
                  >
                    {reply.sender?.first_name?.[0]}
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <Typography variant="body2" fontWeight="bold">
                        {reply.sender?.first_name} {reply.sender?.last_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {format(new Date(reply.created_at), 'p', { locale: tr })}
                      </Typography>
                    </div>
                    <Typography variant="body2" className="mt-1">
                      {reply.content}
                    </Typography>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Reply Input */}
        <Divider />
        <div className="p-4">
          <div className="flex gap-2">
            <TextField
              fullWidth
              multiline
              maxRows={4}
              placeholder="Yanıt yaz..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              size="small"
            />
            <Button
              variant="contained"
              onClick={handleSendReply}
              disabled={!replyContent.trim()}
              sx={{ minWidth: '56px' }}
            >
              <SendIcon />
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default ThreadPanel;
```

---

### Frontend: Message Thread Button

```jsx
// frontend/src/components/chat/RoomMessage.js içine eklenecek
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

// Message component'ine thread butonu ekle
const MessageWithThread = ({ message, onOpenThread }) => {
  return (
    <div className="message-container">
      {/* Mevcut mesaj içeriği */}
      <div className="message-content">
        {message.content}
      </div>

      {/* Thread bilgisi */}
      {message.thread_reply_count > 0 && (
        <Button
          size="small"
          startIcon={<ChatBubbleOutlineIcon />}
          onClick={() => onOpenThread(message)}
          className="mt-2"
          sx={{ textTransform: 'none' }}
        >
          {message.thread_reply_count} yanıt
        </Button>
      )}

      {/* Thread başlat butonu (hover'da görünsün) */}
      <IconButton
        size="small"
        onClick={() => onOpenThread(message)}
        className="thread-reply-btn opacity-0 hover:opacity-100"
        title="Yanıtla"
      >
        <ChatBubbleOutlineIcon fontSize="small" />
      </IconButton>
    </div>
  );
};
```

---

### Frontend: Chat Context Güncellemesi

```javascript
// frontend/src/contexts/ChatContext.js içine ekle

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  // ... mevcut state'ler ...
  const [threadPanelOpen, setThreadPanelOpen] = useState(false);
  const [activeThreadMessage, setActiveThreadMessage] = useState(null);

  const openThread = (message) => {
    setActiveThreadMessage(message);
    setThreadPanelOpen(true);
  };

  const closeThread = () => {
    setThreadPanelOpen(false);
    setActiveThreadMessage(null);
  };

  // WebSocket thread reply listener
  useEffect(() => {
    if (!socket) return;

    socket.on('thread_reply', (data) => {
      // Thread açıksa, reply'i ekle
      if (threadPanelOpen && activeThreadMessage?.id === data.parentMessageId) {
        // ThreadPanel component'i kendi state'ini güncelleyecek
      }

      // Ana chat'te parent mesajın reply count'unu güncelle
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === data.parentMessageId
            ? { ...msg, thread_reply_count: (msg.thread_reply_count || 0) + 1 }
            : msg
        )
      );
    });

    return () => socket.off('thread_reply');
  }, [socket, threadPanelOpen, activeThreadMessage]);

  return (
    <ChatContext.Provider value={{ 
      // ... mevcut values ...
      threadPanelOpen,
      activeThreadMessage,
      openThread,
      closeThread
    }}>
      {children}
    </ChatContext.Provider>
  );
};
```

---

### Frontend: Integration

```jsx
// frontend/src/pages/admin/ChatPageNew.js veya ChatLayout.js

import ThreadPanel from '../components/chat/ThreadPanel';
import { useChat } from '../contexts/ChatContext';

const ChatPage = () => {
  const { threadPanelOpen, activeThreadMessage, openThread, closeThread } = useChat();

  return (
    <div className="chat-page">
      {/* Mevcut chat UI */}
      <ChatContainer onOpenThread={openThread} />

      {/* Thread Panel */}
      <ThreadPanel
        open={threadPanelOpen}
        onClose={closeThread}
        parentMessage={activeThreadMessage}
      />
    </div>
  );
};
```

---

## 🤖 Claude'a Gönderilecek Prompt (TASK 1.2)

```
GÖREV: Optima HR chat sistemine Thread (mesajlara yanıt zincirleri) özelliği ekle.

CONTEXT:
- Proje: /Users/furkandaghan/Documents/verdent-projects/optima
- Backend: Node.js/Express + PostgreSQL + Sequelize
- Frontend: React 19 + MUI + Tailwind CSS
- Hedef: Slack tarzı thread sistemi - mesajlara organize yanıt zincirleri

İŞLEMLER:

1. DATABASE SCHEMA:
   - chat_messages tablosuna ekle:
     * parent_message_id (INT, foreign key to chat_messages.id)
     * thread_reply_count (INT, default 0)
     * last_thread_reply_at (TIMESTAMP)
   - Index: parent_message_id üzerine
   - Trigger: Thread reply count otomatik güncelleme
   - Migration script veya server.js sync

2. BACKEND MODEL:
   - Dosya: backend-express/models/ChatMessage.js
   - parentMessageId, threadReplyCount, lastThreadReplyAt alanları ekle
   - Self-referencing ilişki: hasMany ve belongsTo (threadReplies, parentMessage)

3. BACKEND ROUTES:
   - Dosya: backend-express/routes/chat.js
   - GET /api/chat/messages/:messageId/thread - Thread mesajlarını getir
   - POST /api/chat/messages/:messageId/reply - Thread'e yanıt gönder

4. WEBSOCKET:
   - Dosya: backend-express/services/ChatWebSocketService.js
   - broadcastThreadReply metodu ekle
   - thread_reply event'i

5. FRONTEND COMPONENTS:
   - Dosya: frontend/src/components/chat/ThreadPanel.js (YENİ)
   - Drawer/Sidebar tarzı thread paneli
   - Parent mesaj gösterimi
   - Thread replies listesi
   - Yanıt gönderme input'u

6. FRONTEND INTEGRATION:
   - Dosya: frontend/src/components/chat/RoomMessage.js
   - Her mesaja thread butonu ekle (hover'da görünsün)
   - Thread reply count gösterimi
   
   - Dosya: frontend/src/contexts/ChatContext.js
   - Thread panel state yönetimi
   - openThread, closeThread fonksiyonları
   - WebSocket thread_reply listener

   - Dosya: frontend/src/pages/admin/ChatPageNew.js (veya ChatLayout)
   - ThreadPanel component'ini entegre et

BEKLENEN ÇIKTI:
- Mesajlara yanıt butonu
- Thread panel açılır/kapanır
- Thread içinde mesaj gönderme
- Real-time thread reply güncellemeleri
- Ana chat'te thread reply count gösterimi

NOT: Mevcut mesajlaşma sistemine minimal dokunuş, sadece thread özelliği ekle.
```

---

## ✅ TASK 1.2 Tamamlanma Checklist

- [ ] Database schema güncellemesi
- [ ] Backend model güncellendi
- [ ] Thread API endpoints oluşturuldu
- [ ] WebSocket thread desteği eklendi
- [ ] ThreadPanel component oluşturuldu
- [ ] Mesajlara thread butonu eklendi
- [ ] ChatContext thread state eklendi
- [ ] Thread açma/kapama çalışıyor
- [ ] Thread'e yanıt gönderme çalışıyor
- [ ] Real-time thread güncellemeleri test edildi

---
