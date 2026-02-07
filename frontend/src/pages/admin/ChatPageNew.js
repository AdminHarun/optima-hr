// src/pages/admin/ChatPageNew.js - Professional Chat UI (inspired by reference design)
import React, { useState, useEffect } from 'react';
import { Box, Avatar, Badge, Typography, TextField, InputAdornment, Fade, IconButton, Divider } from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon, MoreVert as MoreVertIcon, Add as AddIcon } from '@mui/icons-material';
import { ChatContainer } from '../../components/chat';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';

/**
 * Professional Chat Interface
 * Modern sidebar with Recent Chats + All Chats sections
 */
const getSiteHeaders = () => {
  const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
  return { 'X-Site-Id': currentSite };
};

function ChatPageNew() {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredRoom, setHoveredRoom] = useState(null);

  // Load chat rooms from backend
  useEffect(() => {
    const loadChatRooms = async () => {
      try {
        // Load rooms
        const response = await fetch(`${API_BASE_URL}/chat/api/rooms/applicant_rooms/`, {
          credentials: 'include',
          headers: getSiteHeaders()
        });

        if (!response.ok) {
          throw new Error('Failed to load chat rooms');
        }

        const data = await response.json();

        // Load online status
        const onlineStatusResponse = await fetch(`${API_BASE_URL}/chat/api/rooms/online_status`, {
          credentials: 'include',
          headers: getSiteHeaders()
        });

        let onlineStatus = {};
        if (onlineStatusResponse.ok) {
          onlineStatus = await onlineStatusResponse.json();
        }

        console.log('📥 Chat rooms loaded:', data);
        console.log('👤 Online status:', onlineStatus);

        // Transform backend data to UI format
        const transformedRooms = data.map(room => {
          const firstName = room.applicant_name?.split(' ')[0] || '';
          const lastName = room.applicant_name?.split(' ').slice(1).join(' ') || '';

          const lastMsgTime = room.last_message?.created_at ? new Date(room.last_message.created_at) : new Date(room.created_at);
          const lastSeenTime = room.last_seen || room.last_message?.created_at || room.created_at;
          // Online durumu: backend status + son mesaj 2 dakikadan yeni mi kontrolu
          const rawOnline = onlineStatus[room.room_id] || false;
          const lastActivityAge = Date.now() - new Date(lastSeenTime).getTime();
          const isRecentlyActive = lastActivityAge < 2 * 60 * 1000; // 2 dakika
          const isOnline = rawOnline && isRecentlyActive;

          return {
            id: `room_${room.id}`,
            roomId: room.room_id,
            name: room.applicant_name || room.applicant_email || 'Unknown',
            firstName,
            lastName,
            participantId: room.applicant_id.toString(),
            participantName: room.applicant_name || room.applicant_email || 'Unknown',
            participantEmail: room.applicant_email,
            participantAvatar: null,
            participantOnline: isOnline,
            lastSeen: lastSeenTime,
            lastMessage: room.last_message?.content || 'Henuz mesaj yok',
            lastMessageTime: lastMsgTime,
            unreadCount: room.unread_count || 0
          };
        });

        setRooms(transformedRooms);

        // Auto-select first room ONLY on initial load (not on refresh)
        setSelectedRoom(prev => {
          if (prev) {
            // Keep current selection, just update room data
            const updatedRoom = transformedRooms.find(r => r.roomId === prev.roomId);
            return updatedRoom || prev;
          }
          // Initial load: select first unread or first room
          const firstUnread = transformedRooms.find(r => r.unreadCount > 0);
          return firstUnread || transformedRooms[0] || null;
        });
      } catch (error) {
        console.error('❌ Error loading chat rooms:', error);
        setRooms([]);
      }
    };

    loadChatRooms();

    // Refresh rooms every 10 seconds
    const interval = setInterval(loadChatRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    setRooms(prevRooms =>
      prevRooms.map(r =>
        r.id === room.id ? { ...r, unreadCount: 0 } : r
      )
    );
  };

  // Callback for when messages are marked as read in ChatContainer
  const handleMessagesRead = async (roomId) => {
    console.log('📬 Messages marked as read for room:', roomId);

    // Refresh rooms to get updated unread counts from backend
    try {
      const response = await fetch(`${API_BASE_URL}/chat/api/rooms/applicant_rooms/`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load chat rooms');
      }

      const data = await response.json();

      // Load online status
      const onlineStatusResponse = await fetch(`${API_BASE_URL}/chat/api/rooms/online_status`, {
        credentials: 'include'
      });

      let onlineStatus = {};
      if (onlineStatusResponse.ok) {
        onlineStatus = await onlineStatusResponse.json();
      }

      // Transform backend data to UI format
      const transformedRooms = data.map(room => {
        const firstName = room.applicant_name?.split(' ')[0] || '';
        const lastName = room.applicant_name?.split(' ').slice(1).join(' ') || '';
        const lastMsgTime = room.last_message?.created_at ? new Date(room.last_message.created_at) : new Date(room.created_at);
        const lastSeenTime = room.last_seen || room.last_message?.created_at || room.created_at;
        const rawOnline = onlineStatus[room.room_id] || false;
        const lastActivityAge = Date.now() - new Date(lastSeenTime).getTime();
        const isRecentlyActive = lastActivityAge < 2 * 60 * 1000;
        const isOnline = rawOnline && isRecentlyActive;

        return {
          id: `room_${room.id}`,
          roomId: room.room_id,
          name: room.applicant_name || room.applicant_email || 'Unknown',
          firstName,
          lastName,
          participantId: room.applicant_id.toString(),
          participantName: room.applicant_name || room.applicant_email || 'Unknown',
          participantEmail: room.applicant_email,
          participantAvatar: null,
          participantOnline: isOnline,
          lastSeen: lastSeenTime,
          lastMessage: room.last_message?.content || 'Henuz mesaj yok',
          lastMessageTime: lastMsgTime,
          unreadCount: room.unread_count || 0
        };
      });

      setRooms(transformedRooms);
      console.log('Rooms refreshed, unread counts updated');
    } catch (error) {
      console.error('❌ Error refreshing rooms:', error);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'şimdi';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}dk`;
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'dün';
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  // Get avatar initials (first + last name)
  const getInitials = (firstName, lastName) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  // Enhanced search: name, email, and applicant ID
  const filteredRooms = rooms.filter(room => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    const nameMatch = room.name?.toLowerCase().includes(searchLower);
    const emailMatch = room.participantEmail?.toLowerCase().includes(searchLower);
    const idMatch = room.participantId?.toLowerCase().includes(searchLower);

    return nameMatch || emailMatch || idMatch;
  });

  // Separate recent chats (with messages in last 24 hours or unread)
  const recentChats = filteredRooms.filter(room => {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return room.unreadCount > 0 || room.lastMessageTime > dayAgo;
  }).slice(0, 4); // Top 4 recent

  const allChats = filteredRooms;

  return (
    <Box sx={{
      display: 'flex',
      height: 'calc(100vh - 64px - 48px)',
      bgcolor: '#f8f9fa',
      overflow: 'hidden',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    }}>
      {/* Sidebar - Modern Design */}
      <Box
        sx={{
          width: 340,
          bgcolor: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '1px 0 3px rgba(0, 0, 0, 0.05)'
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: '#111827',
                fontSize: '20px',
                letterSpacing: '-0.3px'
              }}
            >
              Sohbetler
            </Typography>
            <Box>
              <IconButton size="small" sx={{ color: '#6b7280' }}>
                <AddIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" sx={{ color: '#6b7280', ml: 0.5 }}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Search */}
          <TextField
            fullWidth
            placeholder="Kişi veya mesaj ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: '#9ca3af' }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchTerm('')}
                    sx={{ padding: 0.5 }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                fontSize: '14px',
                bgcolor: '#f3f4f6',
                borderRadius: '8px',
                '& fieldset': { border: 'none' },
                '&:hover': {
                  bgcolor: '#e5e7eb'
                },
                '&.Mui-focused': {
                  bgcolor: '#ffffff',
                  boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.1)'
                },
                '& .MuiInputBase-input': {
                  padding: '8px 12px'
                }
              }
            }}
          />
        </Box>

        {/* Scrollable Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {/* Recent Chats Section */}
          {!searchTerm && recentChats.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ px: 2.5, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    color: '#374151',
                    fontSize: '13px',
                    textTransform: 'none'
                  }}
                >
                  Son Sohbetler
                </Typography>
                <IconButton size="small" sx={{ padding: 0.5 }}>
                  <MoreVertIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, px: 2.5, overflowX: 'auto', pb: 1.5 }}>
                {recentChats.map((room) => (
                  <Box
                    key={`recent-${room.id}`}
                    onClick={() => handleRoomSelect(room)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      minWidth: 60
                    }}
                  >
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: room.participantOnline ? '#10b981' : '#d1d5db',
                            border: '2px solid white'
                          }}
                        />
                      }
                    >
                      <Avatar
                        sx={{
                          width: 56,
                          height: 56,
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          fontSize: '18px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {getInitials(room.firstName, room.lastName)}
                      </Avatar>
                    </Badge>
                    <Typography
                      variant="caption"
                      sx={{
                        mt: 0.75,
                        fontSize: '12px',
                        fontWeight: 500,
                        color: '#374151',
                        maxWidth: 60,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: 'center'
                      }}
                    >
                      {room.firstName || room.name.split(' ')[0]}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Divider */}
          {!searchTerm && recentChats.length > 0 && (
            <Divider sx={{ mx: 2.5, my: 1 }} />
          )}

          {/* All Chats Section */}
          <Box>
            <Box sx={{ px: 2.5, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: '#374151',
                  fontSize: '13px',
                  textTransform: 'none'
                }}
              >
                Tüm Sohbetler
              </Typography>
              <IconButton size="small" sx={{ padding: 0.5 }}>
                <MoreVertIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
              </IconButton>
            </Box>

            {allChats.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, px: 3 }}>
                <Typography variant="body2" sx={{ color: '#9ca3af', fontSize: '14px' }}>
                  {searchTerm ? `"${searchTerm}" için sonuç bulunamadı` : 'Henüz sohbet yok'}
                </Typography>
              </Box>
            ) : (
              allChats.map((room) => {
                const isSelected = selectedRoom?.id === room.id;
                const hasUnread = room.unreadCount > 0;

                return (
                  <Box
                    key={room.id}
                    onClick={() => handleRoomSelect(room)}
                    onMouseEnter={() => setHoveredRoom(room.id)}
                    onMouseLeave={() => setHoveredRoom(null)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      px: 2.5,
                      py: 1.5,
                      cursor: 'pointer',
                      bgcolor: isSelected ? '#f3f4f6' : 'transparent',
                      borderLeft: isSelected ? '3px solid #6366f1' : '3px solid transparent',
                      '&:hover': {
                        bgcolor: '#f9fafb'
                      },
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: room.participantOnline ? '#10b981' : '#d1d5db',
                            border: '2px solid white'
                          }}
                        />
                      }
                    >
                      <Avatar
                        sx={{
                          width: 44,
                          height: 44,
                          background: isSelected
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'linear-gradient(135deg, #a0aec0 0%, #cbd5e0 100%)',
                          fontSize: '16px',
                          fontWeight: 600
                        }}
                      >
                        {getInitials(room.firstName, room.lastName)}
                      </Avatar>
                    </Badge>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: hasUnread ? 600 : 500,
                            color: '#111827',
                            fontSize: '14px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {room.name}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#6b7280',
                            fontSize: '11px',
                            ml: 1,
                            flexShrink: 0
                          }}
                        >
                          {formatTime(room.lastMessageTime)}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography
                          variant="body2"
                          sx={{
                            color: hasUnread ? '#374151' : '#9ca3af',
                            fontSize: '13px',
                            fontWeight: hasUnread ? 500 : 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1
                          }}
                        >
                          {room.lastMessage}
                        </Typography>
                        {hasUnread && (
                          <Box
                            sx={{
                              minWidth: 20,
                              height: 20,
                              borderRadius: '10px',
                              bgcolor: '#ef4444',
                              color: 'white',
                              fontSize: '11px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              px: 0.75,
                              ml: 1,
                              flexShrink: 0
                            }}
                          >
                            {room.unreadCount}
                          </Box>
                        )}
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: room.participantOnline ? '#10b981' : '#9ca3af',
                          fontSize: '11px',
                          fontWeight: room.participantOnline ? 600 : 400,
                          mt: 0.25
                        }}
                      >
                        {room.participantOnline ? 'Cevrimici' : (room.lastSeen ? `Son gorunme: ${formatTime(new Date(room.lastSeen))}` : 'Cevrimdisi')}
                      </Typography>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>
      </Box>

      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedRoom ? (
          <ChatContainer
            roomId={selectedRoom.roomId}
            roomName={selectedRoom.name}
            participantId={selectedRoom.participantId}
            participantName={selectedRoom.participantName}
            participantFirstName={selectedRoom.firstName}
            participantLastName={selectedRoom.lastName}
            participantAvatar={selectedRoom.participantAvatar}
            participantEmail={`${selectedRoom.participantId}@optima.com`}
            participantOnline={selectedRoom.participantOnline}
            currentUserId="admin_1"
            currentUserName="Admin"
            currentUserAvatar={null}
            currentUserEmail="admin@optima.com"
            currentUserType="admin"
            onMessagesRead={handleMessagesRead}
          />
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `
                linear-gradient(rgba(255, 255, 255, 0.20), rgba(255, 255, 255, 0.20)),
                url(/assets/images/42904319_SL-120722-54440-06.jpg)
              `,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundAttachment: 'fixed'
            }}
          >
            <Box sx={{ textAlign: 'center', maxWidth: 480, px: 4 }}>
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px'
                }}
              >
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
                    fill="url(#gradient)"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
              </Box>

              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: '#111827',
                  mb: 1.5,
                  fontSize: '24px'
                }}
              >
                Bir sohbet seçin
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#6b7280',
                  fontSize: '15px',
                  lineHeight: 1.6
                }}
              >
                Mesajlaşmaya başlamak için yan menüden bir sohbet seçin
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default ChatPageNew;
