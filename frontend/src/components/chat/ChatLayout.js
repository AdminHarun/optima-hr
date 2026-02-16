/**
 * ChatLayout - 3-Panel Chat Layout with Channel Tabs
 *
 * Layout:
 * ┌──────────────┬──────────────┬────────────────────┐
 * │ Channel Tabs │ Room List    │ Chat Area          │
 * │ EXTERNAL/    │ + Search     │ + Header           │
 * │ INTERNAL     │ + Pinned     │ + MessageList      │
 * │              │ + Recent     │ + Composer         │
 * │ + Employee   │              │ + Typing Preview   │
 * │   Directory  │              │                    │
 * └──────────────┴──────────────┴────────────────────┘
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Badge,
  IconButton,
  Tooltip,
  Drawer,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Forum as ForumIcon,
  Business as BusinessIcon,
  People as PeopleIcon,
  Menu as MenuIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { ChatProvider, useChatContext } from '../../contexts/ChatContext';
import { EmployeeDirectoryPanel } from './EmployeeDirectory';
import ChatSidebar from './ChatSidebar';
import ChatContainer from './ChatContainer';
import webSocketService from '../../services/webSocketService';
import electronNotificationService from '../../services/electronNotificationService';

const CHANNEL_TABS = {
  EXTERNAL: 0,
  INTERNAL: 1
};

/**
 * ChatLayoutContent - Inner component with context access
 */
const ChatLayoutContent = ({
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserEmail,
  currentUserType = 'admin',
  employeeId = null
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const {
    rooms,
    activeRoom,
    unreadCounts,
    connectionStatus,
    switchChannel,
    setActiveRoom
  } = useChatContext();

  const [activeTab, setActiveTab] = useState(CHANNEL_TABS.EXTERNAL);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Calculate unread counts per channel
  const externalUnread = Object.entries(unreadCounts)
    .filter(([roomId, _]) => {
      const room = rooms.find(r => r.id === roomId || r.id === parseInt(roomId));
      return room?.channel_type === 'EXTERNAL' || room?.room_type === 'APPLICATION_CHANNEL';
    })
    .reduce((sum, [_, count]) => sum + count, 0);

  const internalUnread = Object.entries(unreadCounts)
    .filter(([roomId, _]) => {
      const room = rooms.find(r => r.id === roomId || r.id === parseInt(roomId));
      return room?.channel_type === 'INTERNAL';
    })
    .reduce((sum, [_, count]) => sum + count, 0);

  // Update Electron badge count
  useEffect(() => {
    const totalUnread = externalUnread + internalUnread;
    electronNotificationService.updateBadge(totalUnread);
  }, [externalUnread, internalUnread]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    switchChannel(newValue === CHANNEL_TABS.EXTERNAL ? 'EXTERNAL' : 'INTERNAL');
  };

  // Handle room selection
  const handleRoomSelect = (room) => {
    setActiveRoom(room);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  // Handle DM start from employee directory
  const handleStartDM = (employee) => {
    // DM creation handled by EmployeeDirectory
    setDirectoryOpen(false);
  };

  // Setup Electron navigation callback
  useEffect(() => {
    electronNotificationService.setNavigateCallback((roomId) => {
      const room = rooms.find(r => r.id === roomId || r.id === parseInt(roomId));
      if (room) {
        setActiveRoom(room);
      }
    });

    return () => {
      electronNotificationService.cleanup();
    };
  }, [rooms, setActiveRoom]);

  // Filter rooms based on active tab
  const filteredRooms = rooms.filter(room => {
    if (activeTab === CHANNEL_TABS.EXTERNAL) {
      return room.channel_type === 'EXTERNAL' || room.room_type === 'APPLICATION_CHANNEL';
    }
    return room.channel_type === 'INTERNAL';
  });

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Panel 1: Channel Tabs + Employee Directory Toggle */}
      <Box
        sx={{
          width: isMobile ? '100%' : 72,
          minWidth: isMobile ? 'auto' : 72,
          display: isMobile && activeRoom ? 'none' : 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          borderRight: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(180deg, var(--glass-bg) 0%, rgba(255,255,255,0.05) 100%)',
          backdropFilter: 'blur(20px)'
        }}
      >
        <Tabs
          orientation={isMobile ? 'horizontal' : 'vertical'}
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            flex: 1,
            '& .MuiTab-root': {
              minWidth: isMobile ? 'auto' : 72,
              minHeight: 72
            }
          }}
        >
          <Tab
            icon={
              <Badge badgeContent={externalUnread} color="error" max={99}>
                <ForumIcon />
              </Badge>
            }
            aria-label="External (Applicants)"
            sx={{ py: 2 }}
          />
          <Tab
            icon={
              <Badge badgeContent={internalUnread} color="primary" max={99}>
                <BusinessIcon />
              </Badge>
            }
            aria-label="Internal (Employees)"
            sx={{ py: 2 }}
          />
        </Tabs>

        {/* Employee Directory Toggle (only for INTERNAL channel) */}
        {activeTab === CHANNEL_TABS.INTERNAL && (
          <Tooltip title="Çalışan Rehberi" placement="right">
            <IconButton
              onClick={() => setDirectoryOpen(true)}
              sx={{
                m: 1,
                bgcolor: directoryOpen ? 'primary.main' : 'action.hover',
                color: directoryOpen ? 'white' : 'text.primary',
                '&:hover': {
                  bgcolor: directoryOpen ? 'primary.dark' : 'action.selected'
                }
              }}
            >
              <PeopleIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Panel 2: Room List */}
      {isMobile ? (
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          PaperProps={{
            sx: { width: '80%', maxWidth: 320 }
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
            <IconButton onClick={() => setMobileDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <ChatSidebar
            rooms={filteredRooms}
            activeRoomId={activeRoom?.id}
            unreadCounts={unreadCounts}
            onRoomSelect={handleRoomSelect}
            currentUserType={currentUserType}
            channelType={activeTab === CHANNEL_TABS.EXTERNAL ? 'EXTERNAL' : 'INTERNAL'}
          />
        </Drawer>
      ) : (
        <Box
          sx={{
            width: 320,
            minWidth: 280,
            maxWidth: 360,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default',
            borderRight: '1px solid',
            borderColor: 'divider'
          }}
        >
          <ChatSidebar
            rooms={filteredRooms}
            activeRoomId={activeRoom?.id}
            unreadCounts={unreadCounts}
            onRoomSelect={handleRoomSelect}
            currentUserType={currentUserType}
            channelType={activeTab === CHANNEL_TABS.EXTERNAL ? 'EXTERNAL' : 'INTERNAL'}
          />
        </Box>
      )}

      {/* Panel 3: Chat Area */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.paper',
          minWidth: 0
        }}
      >
        {/* Mobile menu button */}
        {isMobile && !activeRoom && (
          <Box sx={{ p: 2 }}>
            <IconButton onClick={() => setMobileDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          </Box>
        )}

        {activeRoom ? (
          <ChatContainer
            roomId={activeRoom.id}
            roomName={activeRoom.name || activeRoom.room_name}
            participantId={activeRoom.participant_id}
            participantName={activeRoom.participant_name}
            participantFirstName={activeRoom.participant_first_name}
            participantLastName={activeRoom.participant_last_name}
            participantAvatar={activeRoom.participant_avatar}
            participantEmail={activeRoom.participant_email}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            currentUserAvatar={currentUserAvatar}
            currentUserEmail={currentUserEmail}
            currentUserType={currentUserType}
            onBack={() => {
              setActiveRoom(null);
              if (isMobile) setMobileDrawerOpen(true);
            }}
            isGroup={activeRoom.room_type === 'DEPARTMENT_GROUP' || activeRoom.is_group}
            memberCount={activeRoom.member_count || 0}
            groupDescription={activeRoom.description}
          />
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <ForumIcon sx={{ fontSize: 64, opacity: 0.3 }} />
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ fontSize: '1.1rem', fontWeight: 500, mb: 0.5 }}>
                Sohbet Seçin
              </Box>
              <Box sx={{ fontSize: '0.875rem', opacity: 0.7 }}>
                {activeTab === CHANNEL_TABS.EXTERNAL
                  ? 'Aday sohbetlerini görüntülemek için bir oda seçin'
                  : 'Çalışan sohbetlerini görüntülemek için bir oda seçin veya yeni DM başlatın'}
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* Employee Directory Drawer */}
      <Drawer
        anchor="right"
        open={directoryOpen}
        onClose={() => setDirectoryOpen(false)}
        PaperProps={{
          sx: {
            width: isMobile ? '100%' : 400,
            maxWidth: '100%'
          }
        }}
      >
        <EmployeeDirectoryPanel
          onClose={() => setDirectoryOpen(false)}
          onStartDM={handleStartDM}
          currentEmployeeId={employeeId}
        />
      </Drawer>
    </Box>
  );
};

/**
 * ChatLayout - Wrapper with ChatProvider
 */
const ChatLayout = (props) => {
  return (
    <ChatProvider>
      <ChatLayoutContent {...props} />
    </ChatProvider>
  );
};

export default ChatLayout;
