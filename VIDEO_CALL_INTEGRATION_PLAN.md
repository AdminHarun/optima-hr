# Video Call & Calendar Integration - Comprehensive Development Plan

## 📋 Current System Analysis (Completed ✅)

### ✅ What We Have
1. **Chat System** - Fully functional Rocket.Chat-inspired messaging
   - Real-time WebSocket communication
   - Message status indicators
   - File attachments
   - Emoji reactions
   - 8 modular components (~2,300 lines)

2. **Backend Video Call Service** - Partial implementation
   - Database tables for video calls (video_calls, video_call_participants)
   - Basic call session tracking
   - Call history and statistics
   - **Location**: `backend-express/services/videoCallService.js`

3. **Calendar Page** - Basic UI only
   - Event creation and viewing
   - No integration with chat/video calls
   - No meeting scheduling for applicants
   - **Location**: `frontend/src/pages/CalendarPage.js`

4. **Calls Page** - UI with mock data
   - Candidate list with chat integration
   - Video call button (not functional)
   - **Location**: `frontend/src/pages/admin/CallsPageNew.js`

---

## 🔴 Critical Missing Features

### 1. **Video Call Request Flow** ❌
**Problem**: Admin can click video call button in chat, but:
- No notification sent to applicant
- No accept/reject mechanism
- No call room creation
- No WebSocket events for video calls

### 2. **Rocket.Chat Video Conference Pattern** ❌
**Missing from Rocket.Chat analysis**:
- `VideoConfManager` - Call state management
- Direct call flow (ring → accept → join)
- Incoming call notifications
- Call timeout handling
- Provider integration (Jitsi, Zoom, etc.)

### 3. **Calendar-Chat Integration** ❌
**Problem**: Calendar exists but:
- Cannot schedule video meetings from calendar
- No sync with applicant chats
- No meeting invitations to applicants
- No calendar events from video calls

### 4. **Calls Section** ❌
**Problem**: CallsPage has UI but:
- Video call button just shows alert
- No actual call initiation
- No call history integration
- No active call indicator

---

## 🎯 Implementation Roadmap

## Phase 1: Video Call Infrastructure (Week 1-2)

### Step 1.1: WebSocket Video Call Events
**File**: `backend-express/services/chatWebSocketService.js`

Add new message types:
```javascript
{
  type: 'video_call_request',
  call_id: 'call_123',
  initiator: { id: 'admin_1', name: 'Admin' },
  participant: { id: 'applicant_123', name: 'John Doe' },
  room_id: 'applicant_123',
  timestamp: '2025-10-11T10:00:00Z'
}

{
  type: 'video_call_response',
  call_id: 'call_123',
  action: 'accept' | 'reject',
  participant_id: 'applicant_123'
}

{
  type: 'video_call_started',
  call_id: 'call_123',
  jitsi_room_name: 'optima-call-123',
  participants: [...]
}

{
  type: 'video_call_ended',
  call_id: 'call_123',
  duration: 1234,
  ended_by: 'admin_1'
}
```

### Step 1.2: Video Call API Endpoints
**File**: `backend-express/routes/videoCalls.js` (NEW)

```javascript
// POST /api/video-calls/initiate
// POST /api/video-calls/:callId/respond
// GET /api/video-calls/:callId/status
// POST /api/video-calls/:callId/end
// GET /api/video-calls/history/:roomId
```

### Step 1.3: Jitsi Integration
**File**: `backend-express/services/jitsiService.js` (NEW)

- Generate secure Jitsi room names
- Create JWT tokens for authentication
- Configure moderator/participant roles
- Handle Jitsi webhooks for call events

---

## Phase 2: Frontend Video Call Components (Week 2-3)

### Step 2.1: Video Call Manager (Rocket.Chat Pattern)
**File**: `frontend/src/services/VideoCallManager.js` (NEW)

Adapt Rocket.Chat's VideoConfManager:
```javascript
class VideoCallManager {
  // Call state management
  startCall(roomId, participantName)
  acceptIncomingCall(callId)
  rejectIncomingCall(callId)
  joinCall(callId)
  endCall(callId)

  // Events
  on('call/incoming', callback)
  on('call/accepted', callback)
  on('call/rejected', callback)
  on('call/ended', callback)
}
```

### Step 2.2: Video Call Popup Components
**Files**: `frontend/src/components/videoCall/` (NEW FOLDER)

Create components:
```
videoCall/
├── VideoCallPopup.js           // Incoming call notification
├── VideoCallDialog.js          // Call controls (mute, camera, end)
├── VideoCallWindow.js          // Jitsi iframe container
├── IncomingCallNotification.js // Ringing notification
└── index.js
```

### Step 2.3: Integrate with Chat
**File**: `frontend/src/components/chat/ChatRoom.js`

Add:
- Video call request button in header
- Incoming call notification overlay
- Active call indicator
- Call history in chat

---

## Phase 3: Calendar Integration (Week 3-4)

### Step 3.1: Meeting Scheduling API
**File**: `backend-express/routes/meetings.js` (NEW)

```javascript
// POST /api/meetings/schedule
// GET /api/meetings/:applicantId
// PUT /api/meetings/:meetingId
// DELETE /api/meetings/:meetingId
// POST /api/meetings/:meetingId/notify
```

### Step 3.2: Calendar Event Types
**File**: `frontend/src/pages/CalendarPage.js`

Add new event type:
```javascript
{
  type: 'video_meeting',
  applicant_id: '123',
  applicant_name: 'John Doe',
  scheduled_time: '2025-10-15T14:00:00Z',
  duration_minutes: 30,
  meeting_link: 'optima-call-456',
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
}
```

### Step 3.3: Meeting Invitation Flow
1. Admin schedules meeting in calendar
2. System sends WebSocket notification to applicant
3. Email notification with meeting details
4. Add to applicant's profile/dashboard
5. Reminder 15 minutes before meeting
6. One-click join from notification

---

## Phase 4: Calls Page Enhancement (Week 4)

### Step 4.1: Active Calls Dashboard
**File**: `frontend/src/pages/admin/CallsPageNew.js`

Add sections:
```javascript
- Active Calls (live now)
- Scheduled Meetings (upcoming)
- Call History (past calls)
- Call Analytics (duration, status)
```

### Step 4.2: Real-time Call Status
- Show active calls with duration
- Join ongoing calls
- Call quality indicators
- Recording status (if implemented)

---

## Phase 5: Applicant Side (Week 5)

### Step 5.1: Applicant Video Call UI
**File**: `frontend/src/pages/ApplicantProfile.js`

Add:
- Incoming call notification
- Accept/Reject buttons
- Video call window
- Call history section
- Scheduled meetings list

### Step 5.2: Applicant Notifications
- Browser notification for incoming calls
- Audio ring tone
- Toast notification in app
- Email notification for scheduled meetings

---

## 🛠️ Technical Implementation Details

### Database Schema Updates

#### 1. Meetings Table (NEW)
```sql
CREATE TABLE meetings (
  id SERIAL PRIMARY KEY,
  meeting_id VARCHAR(255) UNIQUE NOT NULL,
  applicant_id INTEGER NOT NULL,
  admin_id VARCHAR(255) NOT NULL,
  room_id VARCHAR(255) NOT NULL,

  -- Meeting details
  title VARCHAR(255),
  scheduled_time TIMESTAMP NOT NULL,
  duration_minutes INTEGER DEFAULT 30,

  -- Video call
  jitsi_room_name VARCHAR(255),
  meeting_link TEXT,

  -- Status
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, cancelled, no_show

  -- Notifications
  reminder_sent BOOLEAN DEFAULT FALSE,
  notification_sent BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,

  FOREIGN KEY (applicant_id) REFERENCES applicant_profiles(id)
);

CREATE INDEX idx_meetings_applicant ON meetings(applicant_id);
CREATE INDEX idx_meetings_scheduled_time ON meetings(scheduled_time);
CREATE INDEX idx_meetings_status ON meetings(status);
```

#### 2. Update video_calls table
```sql
ALTER TABLE video_calls
  ADD COLUMN meeting_id VARCHAR(255),
  ADD COLUMN notification_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN response_time TIMESTAMP,
  ADD FOREIGN KEY (meeting_id) REFERENCES meetings(meeting_id);
```

### WebSocket Protocol Extensions

#### Video Call Flow
```javascript
// 1. Admin initiates call
Admin → Server: {
  type: 'video_call_request',
  room_id: 'applicant_123',
  call_id: 'call_xyz'
}

// 2. Server broadcasts to applicant
Server → Applicant: {
  type: 'video_call_incoming',
  call_id: 'call_xyz',
  caller_name: 'Admin',
  room_id: 'applicant_123'
}

// 3. Applicant accepts
Applicant → Server: {
  type: 'video_call_accept',
  call_id: 'call_xyz'
}

// 4. Server creates Jitsi room and notifies both
Server → Both: {
  type: 'video_call_ready',
  call_id: 'call_xyz',
  jitsi_url: 'https://meet.jit.si/optima-call-xyz',
  jwt_token: '...'
}

// 5. Either party ends call
User → Server: {
  type: 'video_call_end',
  call_id: 'call_xyz'
}

Server → Both: {
  type: 'video_call_ended',
  call_id: 'call_xyz',
  duration: 1234
}
```

---

## 📦 Required Dependencies

### Backend
```json
{
  "jsonwebtoken": "^9.0.2",        // JWT for Jitsi authentication
  "node-cron": "^3.0.3",           // Scheduled meeting reminders
  "nodemailer": "^6.9.7"           // Email notifications
}
```

### Frontend
```json
{
  "@jitsi/react-sdk": "^1.3.0",    // Jitsi React integration
  "react-notifications": "^1.7.4",  // Browser notifications
  "date-fns": "^3.0.0"             // Date utilities for calendar
}
```

---

## 🎨 UI/UX Mockups

### 1. Incoming Call Notification (Applicant View)
```
╔══════════════════════════════════════╗
║  📞 Admin is calling...              ║
║                                      ║
║     [Admin Avatar]                   ║
║     Görüntülü Görüşme Talebi        ║
║                                      ║
║  [❌ Reddet]      [✅ Kabul Et]      ║
╚══════════════════════════════════════╝
```

### 2. Video Call Window
```
╔══════════════════════════════════════╗
║  [Jitsi Video Container - 800x600]   ║
║                                      ║
║  Controls:                           ║
║  [🎤 Mute] [📹 Camera] [🔊 Audio]   ║
║  [📺 Share] [💬 Chat] [❌ End]       ║
╚══════════════════════════════════════╝
```

### 3. Calendar Meeting Creation
```
╔══════════════════════════════════════╗
║  📅 Görüntülü Mülakat Planla         ║
║                                      ║
║  Aday: [John Doe ▼]                 ║
║  Tarih: [2025-10-15]                ║
║  Saat: [14:00] Süre: [30 dk]       ║
║  Açıklama: [________________]        ║
║                                      ║
║  ☑️ Email bildirimi gönder          ║
║  ☑️ 15 dk önce hatırlat             ║
║                                      ║
║  [İptal]              [Planla]      ║
╚══════════════════════════════════════╝
```

---

## 🔍 Testing Checklist

### Video Call Flow
- [ ] Admin initiates call from chat
- [ ] Applicant receives notification
- [ ] Applicant can accept/reject
- [ ] Jitsi room opens for both parties
- [ ] Video/audio works correctly
- [ ] Call ends properly
- [ ] Call is saved to history
- [ ] Call duration is tracked

### Calendar Integration
- [ ] Admin schedules meeting from calendar
- [ ] Applicant receives email notification
- [ ] Applicant sees meeting in their dashboard
- [ ] Reminder notification 15 min before
- [ ] Meeting can be joined from notification
- [ ] Completed meetings marked correctly
- [ ] Cancelled meetings handled properly

### Edge Cases
- [ ] What if applicant is offline?
- [ ] What if applicant rejects call?
- [ ] What if network drops during call?
- [ ] What if scheduled meeting time passed?
- [ ] What if multiple admins call same applicant?

---

## 📊 Implementation Timeline

| Week | Phase | Tasks | Status |
|------|-------|-------|--------|
| 1-2 | Infrastructure | WebSocket events, API endpoints, Jitsi setup | ⏳ Pending |
| 2-3 | Frontend Components | VideoCallManager, Popups, Chat integration | ⏳ Pending |
| 3-4 | Calendar Integration | Meeting API, Scheduling, Notifications | ⏳ Pending |
| 4 | Calls Page | Dashboard, Analytics, History | ⏳ Pending |
| 5 | Applicant Side | UI, Notifications, Testing | ⏳ Pending |
| 6 | Testing & Polish | End-to-end testing, Bug fixes | ⏳ Pending |

---

## 🚨 Priority Order (Start Here!)

### 🔥 Phase 1A: Critical Path (Do This First!)
1. ✅ **WebSocket Video Call Events** (2 days)
   - Add video call message types to chatWebSocketService.js
   - Test with existing chat infrastructure

2. ✅ **Video Call API Endpoints** (2 days)
   - Create routes/videoCalls.js
   - Integrate with videoCallService.js

3. ✅ **Jitsi Basic Integration** (3 days)
   - Install Jitsi React SDK
   - Create basic Jitsi room component
   - Test video/audio functionality

### 🔥 Phase 1B: Basic Video Call Flow (Critical!)
4. ✅ **VideoCallManager Service** (3 days)
   - Adapt Rocket.Chat pattern
   - State management for calls
   - WebSocket integration

5. ✅ **Incoming Call Notification** (2 days)
   - Popup component for applicant
   - Accept/Reject handlers
   - Audio ring tone

6. ✅ **Chat Integration** (2 days)
   - Video call button in ChatRoom
   - Show incoming call overlay
   - Handle call states

### Phase 2: Calendar & Scheduling
7. Meeting scheduling API
8. Calendar integration
9. Email notifications
10. Reminder system

---

## 📝 Key Files to Create/Modify

### 🆕 New Files
```
backend-express/
├── routes/videoCalls.js
├── routes/meetings.js
├── services/jitsiService.js
└── services/emailService.js

frontend/src/
├── services/VideoCallManager.js
├── components/videoCall/
│   ├── VideoCallPopup.js
│   ├── VideoCallDialog.js
│   ├── VideoCallWindow.js
│   ├── IncomingCallNotification.js
│   └── index.js
└── contexts/VideoCallContext.js
```

### ✏️ Modify Existing
```
backend-express/services/chatWebSocketService.js  // Add video call events
frontend/src/components/chat/ChatRoom.js          // Add video call button
frontend/src/components/chat/ChatContainer.js     // Handle video call callbacks
frontend/src/pages/CalendarPage.js                // Add meeting scheduling
frontend/src/pages/admin/CallsPageNew.js          // Connect real video calls
frontend/src/pages/ApplicantProfile.js            // Add video call UI
```

---

## 🎯 Success Criteria

### Must Have (MVP)
- [x] Admin can initiate video call from chat
- [ ] Applicant receives real-time notification
- [ ] Applicant can accept/reject call
- [ ] Jitsi video room opens for both
- [ ] Call history is saved
- [ ] Basic call analytics (duration, status)

### Should Have (V1.1)
- [ ] Calendar meeting scheduling
- [ ] Email notifications for meetings
- [ ] Reminder notifications
- [ ] Call quality indicators
- [ ] Multiple simultaneous calls support

### Nice to Have (V2.0)
- [ ] Screen sharing
- [ ] Call recording
- [ ] Waiting room
- [ ] Virtual background
- [ ] AI transcription

---

## 🐛 Known Issues to Address

1. **Current videoCallService.js limitations**:
   - No WebSocket integration
   - No notification system
   - No Jitsi provider integration

2. **Chat system gaps**:
   - Video call button exists but not functional
   - No video call message types
   - No call state management

3. **Calendar isolation**:
   - No connection to chat rooms
   - No applicant notification system
   - No video call integration

---

## 📚 Resources & References

### Rocket.Chat Implementation Reference
- `VideoConfManager.ts` - Call state management pattern
- `VideoConfProvider.tsx` - React context for video calls
- `videoConference.ts` API - REST endpoints design
- Direct call flow: ring → accept → join

### Jitsi Integration
- External API: https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe
- JWT Authentication: https://github.com/jitsi/lib-jitsi-meet/blob/master/doc/tokens.md

### WebSocket Protocol
- Extend existing chat protocol
- Use same connection for video call signaling
- Leverage chatWebSocketService.js infrastructure

---

## 🔐 Security Considerations

1. **JWT Tokens for Jitsi**
   - Expire after call duration
   - Tied to specific user IDs
   - Room-specific permissions

2. **Call Authorization**
   - Only admin can initiate calls
   - Applicant can only accept/reject
   - Validate room access before call

3. **Privacy**
   - No call recording without consent
   - Delete call data after 90 days
   - Secure video stream transmission

---

**Generated**: 2025-10-11
**Status**: Ready for Implementation ✅
**Next Step**: Start with Phase 1A - WebSocket Video Call Events
