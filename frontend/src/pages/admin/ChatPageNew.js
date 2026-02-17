// src/pages/admin/ChatPageNew.js - Professional Chat UI (inspired by reference design)
import React, { useState, useEffect } from 'react';
import { Box, Avatar, Badge, Typography, TextField, InputAdornment, Fade, IconButton, Divider, Tabs, Tab, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon, MoreVert as MoreVertIcon, Add as AddIcon, Group as GroupIcon, Person as PersonIcon, GroupAdd as GroupAddIcon, Tag as TagIcon } from '@mui/icons-material';
import { ChatContainer, ChannelSidebar, ChannelChatView } from '../../components/chat';
import CreateGroupModal from '../../components/chat/CreateGroupModal';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';

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
  const { currentUser } = useEmployeeAuth();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [groups, setGroups] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0: Kişiler, 1: Gruplar, 2: Kanallar
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [addMenuAnchor, setAddMenuAnchor] = useState(null);

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

  // Load group chats
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/chat/api/groups/`, {
          credentials: 'include',
          headers: getSiteHeaders()
        });

        if (response.ok) {
          const data = await response.json();
          console.log('📥 Groups loaded:', data);

          const transformedGroups = data.map(group => ({
            id: `group_${group.id}`,
            roomId: group.room_id || `group_${group.id}`,
            name: group.room_name,
            description: group.description,
            isGroup: true,
            memberCount: group.member_count || group.members?.length || 0,
            lastMessage: group.last_message?.content || 'Henüz mesaj yok',
            lastMessageTime: group.last_message_at ? new Date(group.last_message_at) : new Date(group.created_at),
            unreadCount: 0
          }));

          setGroups(transformedGroups);
        }
      } catch (error) {
        console.error('❌ Error loading groups:', error);
      }
    };

    loadGroups();
    const interval = setInterval(loadGroups, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleGroupCreated = (group) => {
    console.log('✅ New group created:', group);
    // Add new group to list
    setGroups(prev => [{
      id: `group_${group.id}`,
      roomId: group.room_id || `group_${group.id}`,
      name: group.room_name,
      description: group.description,
      isGroup: true,
      memberCount: group.members?.length || 1,
      lastMessage: 'Grup oluşturuldu',
      lastMessageTime: new Date(),
      unreadCount: 0
    }, ...prev]);

    // Switch to groups tab and select the new group
    setActiveTab(1);
  };

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

  // Format last seen as full date/time (not relative)
  const formatLastSeen = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();

    // Today - show only time
    if (d.toDateString() === now.toDateString()) {
      return `Bugün ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Dün ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Full date and time
    return d.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    });
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
              <IconButton
                size="small"
                sx={{ color: '#6b7280' }}
                onClick={(e) => setAddMenuAnchor(e.currentTarget)}
              >
                <AddIcon fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={addMenuAnchor}
                open={Boolean(addMenuAnchor)}
                onClose={() => setAddMenuAnchor(null)}
                PaperProps={{
                  sx: { minWidth: 180, borderRadius: '8px', mt: 1 }
                }}
              >
                <MenuItem onClick={() => { setAddMenuAnchor(null); setCreateGroupOpen(true); }}>
                  <ListItemIcon>
                    <GroupAddIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Yeni Grup Oluştur</ListItemText>
                </MenuItem>
              </Menu>
              <IconButton size="small" sx={{ color: '#6b7280', ml: 0.5 }}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Tabs: Kişiler / Gruplar */}
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
            sx={{
              minHeight: 36,
              mb: 2,
              '& .MuiTabs-indicator': {
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                height: 3,
                borderRadius: '3px 3px 0 0'
              }
            }}
          >
            <Tab
              icon={<PersonIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Kişiler"
              sx={{
                minHeight: 36,
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'none',
                flex: 1,
                '&.Mui-selected': { color: '#6366f1' }
              }}
            />
            <Tab
              icon={<GroupIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Gruplar${groups.length > 0 ? ` (${groups.length})` : ''}`}
              sx={{
                minHeight: 36,
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'none',
                flex: 1,
                '&.Mui-selected': { color: '#6366f1' }
              }}
            />
            <Tab
              icon={<TagIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Kanallar${channels.length > 0 ? ` (${channels.length})` : ''}`}
              sx={{
                minHeight: 36,
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'none',
                flex: 1,
                '&.Mui-selected': { color: '#6366f1' }
              }}
            />
          </Tabs>

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
          {/* Tab 0: Kişiler (Applicant Chats) */}
          {activeTab === 0 && (
            <>
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
                        {room.participantOnline ? 'Çevrimiçi' : (room.lastSeen ? `Son görülme: ${formatLastSeen(room.lastSeen)}` : 'Çevrimdışı')}
                      </Typography>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>
            </>
          )}

          {/* Tab 1: Gruplar (Group Chats) */}
          {activeTab === 1 && (
            <Box>
              {groups.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
                  <Box sx={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    bgcolor: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <GroupIcon sx={{ fontSize: 32, color: '#9ca3af' }} />
                  </Box>
                  <Typography variant="body1" sx={{ color: '#374151', fontWeight: 500, mb: 1 }}>
                    Henüz grup yok
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#9ca3af', mb: 2 }}>
                    Yeni bir grup oluşturarak başlayın
                  </Typography>
                  <Box
                    onClick={() => setCreateGroupOpen(true)}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 3,
                      py: 1,
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: '14px',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                      }
                    }}
                  >
                    <GroupAddIcon sx={{ fontSize: 18 }} />
                    Grup Oluştur
                  </Box>
                </Box>
              ) : (
                groups.filter(g => !searchTerm || g.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((group) => {
                  const isSelected = selectedRoom?.id === group.id;

                  return (
                    <Box
                      key={group.id}
                      onClick={() => handleRoomSelect({ ...group, participantName: group.name })}
                      onMouseEnter={() => setHoveredRoom(group.id)}
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
                        '&:hover': { bgcolor: '#f9fafb' },
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 44,
                          height: 44,
                          background: isSelected
                            ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          fontSize: '16px',
                          fontWeight: 600
                        }}
                      >
                        <GroupIcon />
                      </Avatar>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 500,
                              color: '#111827',
                              fontSize: '14px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {group.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: '#6b7280', fontSize: '11px', ml: 1, flexShrink: 0 }}
                          >
                            {formatTime(group.lastMessageTime)}
                          </Typography>
                        </Box>

                        <Typography
                          variant="body2"
                          sx={{
                            color: '#9ca3af',
                            fontSize: '13px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {group.lastMessage}
                        </Typography>

                        <Typography
                          variant="caption"
                          sx={{ color: '#6b7280', fontSize: '11px', mt: 0.25 }}
                        >
                          {group.memberCount} üye
                        </Typography>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          )}

          {/* Tab 2: Kanallar (Channels) */}
          {activeTab === 2 && (
            <ChannelSidebar
              onChannelSelect={(channel) => {
                setSelectedChannel(channel);
                setSelectedRoom(null); // Clear room selection
              }}
              selectedChannelId={selectedChannel?.id}
            />
          )}
        </Box>
      </Box>

      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Channel Chat View (when activeTab === 2 and channel selected) */}
        {activeTab === 2 && selectedChannel ? (
          <ChannelChatView
            channel={selectedChannel}
            currentUserId={currentUser?.id || 1}
            currentUserName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Admin'}
            onLeaveChannel={() => {
              setSelectedChannel(null);
            }}
            onChannelUpdate={() => {
              // Refresh channels by re-rendering ChannelSidebar
            }}
          />
        ) : selectedRoom ? (
          <ChatContainer
            roomId={selectedRoom.roomId}
            roomName={selectedRoom.name}
            participantId={selectedRoom.participantId}
            participantName={selectedRoom.participantName}
            participantFirstName={selectedRoom.firstName}
            participantLastName={selectedRoom.lastName}
            participantAvatar={selectedRoom.participantAvatar}
            participantEmail={selectedRoom.isGroup ? null : `${selectedRoom.participantId}@optima.com`}
            participantOnline={selectedRoom.participantOnline}
            currentUserId="admin_1"
            currentUserName="Admin"
            currentUserAvatar={null}
            currentUserEmail="admin@optima.com"
            currentUserType="admin"
            onMessagesRead={handleMessagesRead}
            isGroup={selectedRoom.isGroup || false}
            memberCount={selectedRoom.memberCount}
            groupDescription={selectedRoom.description}
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

      {/* Create Group Modal */}
      <CreateGroupModal
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onGroupCreated={handleGroupCreated}
      />
    </Box>
  );
}

export default ChatPageNew;
