# Optima Chat System - Implementation Guide

## Overview

This is a production-ready chat system for Optima HR platform, adapted from Rocket.Chat's proven architecture and converted to Material-UI. The system enables real-time communication between Admins and Job Applicants.

**Architecture**: Rocket.Chat-inspired patterns → Material-UI components → PostgreSQL + Express.js + WebSocket

## Features

### ✅ Implemented Features

1. **Real-time Messaging**
   - WebSocket-based instant messaging
   - Message status indicators (sending, sent, delivered, read)
   - Typing indicators
   - Online/offline status

2. **Rocket.Chat UX Patterns**
   - Sequential message grouping (5-minute threshold)
   - Date separators (Bugün, Dün, formatted dates)
   - Hover-based message toolbar
   - System messages support

3. **Rich Message Features**
   - Emoji picker integration (@emoji-mart/react)
   - Message reactions
   - File attachments (images, PDFs, documents)
   - Message editing with inline editor
   - Message deletion
   - Copy message to clipboard

4. **Modern UI/UX**
   - Material-UI components
   - Optima brand colors (#1c61ab blue, #8bb94a green)
   - WhatsApp-style status indicators
   - Smooth animations and transitions
   - Responsive design

5. **Performance**
   - React.memo optimization
   - Efficient re-rendering
   - Auto-scroll management
   - Message batching

## Component Architecture

```
frontend/src/components/chat/
├── ChatContainer.js       # WebSocket integration + state management
├── ChatRoom.js           # Main chat UI with header, list, composer
├── MessageList.js        # Message list with date separators
├── RoomMessage.js        # Individual message component
├── MessageHeader.js      # Sender name, timestamp, status
├── MessageContent.js     # Message text, files, reactions
├── MessageToolbar.js     # Action buttons (emoji, edit, delete, etc.)
├── ChatComposer.js       # Message input area
└── index.js             # Barrel export

frontend/src/theme/
└── chatTheme.js          # Optima brand colors and styling

frontend/src/services/
└── webSocketService.js   # WebSocket connection management
```

## Component Hierarchy

```
ChatContainer (State + WebSocket)
└── ChatRoom (UI Layout)
    ├── Header (Avatar, name, status, video call button)
    ├── MessageList (Scrollable container)
    │   └── RoomMessage (Individual message)
    │       ├── MessageHeader (Name, time, status)
    │       ├── MessageContent (Text, files, reactions)
    │       └── MessageToolbar (Actions on hover)
    └── ChatComposer (Input area)
        ├── Emoji picker
        ├── File upload
        └── Send button
```

## Usage Examples

### Basic Implementation

```javascript
import { ChatContainer } from '../components/chat';

<ChatContainer
  roomId="applicant_123"
  roomName="Chat with John Doe"
  participantId="123"
  participantName="John Doe"
  participantAvatar={null}
  currentUserId="admin_1"
  currentUserType="admin"
  onBack={() => console.log('Back clicked')}
  onVideoCall={() => console.log('Video call requested')}
/>
```

### Test Page

A test page is available at `/frontend/src/pages/ChatTestPage.js` for quick testing.

## WebSocket Protocol

### Connection

```javascript
// Admin connection
ws://localhost:9000/ws/admin-chat/{roomId}

// Applicant connection
ws://localhost:9000/ws/applicant-chat/{roomId}
```

### Message Types

#### 1. Chat Message
```json
{
  "type": "message",
  "id": "msg_12345",
  "content": "Hello!",
  "sender": "Admin",
  "timestamp": "2025-10-09T10:30:00Z",
  "file": {
    "url": "http://...",
    "name": "file.pdf",
    "size": 12345,
    "mime_type": "application/pdf"
  }
}
```

#### 2. Typing Indicator
```json
{
  "type": "typing",
  "is_typing": true,
  "sender": "Admin",
  "timestamp": "2025-10-09T10:30:00Z"
}
```

#### 3. Message Reaction
```json
{
  "type": "reaction",
  "message_id": "msg_12345",
  "emoji": "👍",
  "action": "add",
  "sender": "Admin"
}
```

#### 4. User Status
```json
{
  "type": "user_status",
  "user_id": "123",
  "online": true
}
```

#### 5. Message Status Update
```json
{
  "type": "message_status",
  "message_id": "msg_12345",
  "status": "read"
}
```

## Database Schema

### chat_rooms
```sql
CREATE TABLE chat_rooms (
  id SERIAL PRIMARY KEY,
  applicant_id INTEGER NOT NULL,
  room_type VARCHAR(50) DEFAULT 'direct',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### chat_messages
```sql
CREATE TABLE chat_messages (
  id SERIAL PRIMARY KEY,
  room_id INTEGER REFERENCES chat_rooms(id),
  sender_type VARCHAR(50) NOT NULL,
  sender_name VARCHAR(255),
  content TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),
  reactions JSONB,
  status VARCHAR(50) DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Get Room Messages
```
GET /api/chat/rooms/:roomId/messages
Response: { messages: [...] }
```

### Upload File
```
POST /api/chat/upload
Body: FormData with 'file' and 'room_id'
Response: { file_url, file_name, file_size, mime_type }
```

### Edit Message
```
PUT /api/chat/messages/:messageId
Body: { content: "Updated text" }
Response: { success: true }
```

### Delete Message
```
DELETE /api/chat/messages/:messageId
Response: { success: true }
```

## Styling - Optima Brand

### Colors
```javascript
primary: {
  main: '#1c61ab',      // Optima blue
  light: '#4a8bd4',
  dark: '#144887'
}

secondary: {
  main: '#8bb94a',      // Optima green
  light: '#a8ca6f',
  dark: '#6b9337'
}

background: {
  default: '#f5f6f7',
  chat: '#f5f6f7',
  message: '#ffffff',
  ownMessage: '#e3f2fd'
}
```

### Gradients
```css
/* Primary gradient */
background: linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%);

/* Header gradient */
background: linear-gradient(90deg, #1c61ab 0%, #4a8bd4 100%);
```

## Rocket.Chat Patterns Implemented

### 1. Sequential Message Grouping
Messages from the same sender within 5 minutes are grouped together, hiding the avatar and compacting the header.

```javascript
const shouldBeSequential = (currentMsg, previousMsg) => {
  if (!previousMsg) return false;
  if (currentMsg.sender_type !== previousMsg.sender_type) return false;

  const timeDiff = new Date(currentMsg.created_at) - new Date(previousMsg.created_at);
  return timeDiff <= 5 * 60 * 1000; // 5 minutes
};
```

### 2. Date Separators
Messages are separated by date with "Bugün" (Today), "Dün" (Yesterday), or formatted dates.

### 3. Hover Toolbar
Action buttons appear on hover, positioned above the message (Rocket.Chat style).

### 4. Status Indicators
WhatsApp-style message status:
- ⏱️ Sending (clock icon)
- ✓ Sent (single check)
- ✓✓ Delivered (double check, gray)
- ✓✓ Read (double check, blue)
- ❗ Failed (error icon)

## Migration from Old System

### Old System (Chat.js - 945 lines)
- Monolithic component
- All logic in one file
- LocalStorage-based
- Hard to maintain

### New System (Modular - Rocket.Chat inspired)
- 8 focused components
- Separation of concerns
- WebSocket + API integration
- Easy to extend and maintain

## Performance Optimizations

1. **React.memo** - All components are memoized
2. **Callback optimization** - useCallback for event handlers
3. **Ref management** - Efficient DOM references
4. **Scroll optimization** - Smart auto-scroll with behavior: 'smooth'
5. **Message batching** - Prevents excessive re-renders

## Future Enhancements

### Video Call Module (Separate Folder)
```
frontend/src/features/video-call/
├── VideoCallProvider.js
├── VideoCallRoom.js
├── VideoControls.js
├── ParticipantGrid.js
└── index.js
```

### Planned Features
- [ ] Message search
- [ ] Thread replies
- [ ] Message pinning
- [ ] User mentions (@username)
- [ ] Link previews
- [ ] Voice messages
- [ ] Message forwarding
- [ ] Chat export
- [ ] Read receipts per user
- [ ] Message translation

## Testing

### Manual Testing Steps

1. **Start Backend**
```bash
cd backend-express
node server.js
```

2. **Start Frontend**
```bash
cd frontend
npm start
```

3. **Open Test Page**
```
http://localhost:3000/chat-test
```

4. **Test Scenarios**
- Send text messages
- Add emoji reactions
- Edit messages
- Delete messages
- Upload files
- Check typing indicators
- Verify message status
- Test sequential grouping
- Check date separators

### WebSocket Testing

Use `test_websocket_connection.js` for WebSocket testing:
```bash
node test_websocket_connection.js
```

## Troubleshooting

### WebSocket Connection Issues
- Check backend is running on port 9000
- Verify WebSocket endpoint: `ws://localhost:9000/ws/admin-chat/{roomId}`
- Check browser console for connection errors

### Message Not Sending
- Verify WebSocket connection is established
- Check network tab for WebSocket frames
- Verify message format matches protocol

### Styling Issues
- Ensure Material-UI is properly installed: `@mui/material @emotion/react @emotion/styled`
- Check theme provider wraps the app
- Verify imports from `@mui/material`

## Key Files Reference

| File | Purpose | Lines |
|------|---------|-------|
| ChatContainer.js | WebSocket integration | 395 |
| ChatRoom.js | Main UI layout | 379 |
| MessageList.js | Message list with patterns | 234 |
| RoomMessage.js | Individual message | 159 |
| MessageHeader.js | Message header | 132 |
| MessageContent.js | Message content | 196 |
| MessageToolbar.js | Action toolbar | 131 |
| ChatComposer.js | Input area | 319 |
| chatTheme.js | Optima styling | 170 |
| webSocketService.js | WebSocket service | 181 |

**Total**: ~2,300 lines (vs 945 lines in old monolithic Chat.js)

## Credits

- **Inspired by**: Rocket.Chat (https://rocket.chat)
- **UI Framework**: Material-UI (MUI)
- **Design**: Optima HR brand guidelines
- **Architecture**: Hybrid approach - Rocket.Chat patterns + Optima needs

## Documentation

- [CHAT_SYSTEM_COMPARISON.md](./CHAT_SYSTEM_COMPARISON.md) - Detailed comparison
- [Rocket.Chat Source](C:\Users\Furkan\Desktop\Rocket.Chat-develop (1)) - Original source

---

**Last Updated**: 2025-10-09
**Version**: 1.0.0
**Status**: Production Ready ✅
