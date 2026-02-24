// src/pages/admin/ChatPageNew.js - Slack-Style Chat UI
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Avatar, Typography, TextField, InputAdornment, IconButton, Collapse, Tooltip } from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  Tag as TagIcon,
  Lock as LockIcon,
  HomeOutlined as HomeIcon,
  ChatBubbleOutline as DMsIcon,
  NotificationsOutlined as ActivityIcon,
  InsertDriveFileOutlined as FilesIcon,
  MoreHoriz as MoreIcon,
  Settings as SettingsIcon,
  ForumOutlined as ThreadsIcon,
  HeadsetMicOutlined as HuddlesIcon,
  FolderOutlined as DirectoriesIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { ChatContainer, ChannelChatView } from '../../components/chat';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';
import { useTheme } from '../../contexts/ThemeContext';

import { API_BASE_URL } from '../../config/config';

const getSiteHeaders = () => {
  const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
  return { 'X-Site-Id': currentSite };
};

function ChatPageNew() {
  const navigate = useNavigate();
  const { currentUser } = useEmployeeAuth();
  const { currentTheme } = useTheme();
  const isDark = currentTheme !== 'basic-light';
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredRoom, setHoveredRoom] = useState(null);

  // View switching: 'home' or 'dms'
  const [activeView, setActiveView] = useState('dms');

  // Collapsible section states
  const [dmOpen, setDmOpen] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(true);

  // Load chat rooms from backend
  useEffect(() => {
    const loadChatRooms = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/chat/api/rooms/applicant_rooms/`, {
          credentials: 'include',
          headers: getSiteHeaders()
        });

        if (!response.ok) throw new Error('Failed to load chat rooms');
        const data = await response.json();

        const onlineStatusResponse = await fetch(`${API_BASE_URL}/chat/api/rooms/online_status`, {
          credentials: 'include',
          headers: getSiteHeaders()
        });

        let onlineStatus = {};
        if (onlineStatusResponse.ok) {
          onlineStatus = await onlineStatusResponse.json();
        }

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
            firstName, lastName,
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
        setSelectedRoom(prev => {
          if (prev) {
            const updatedRoom = transformedRooms.find(r => r.roomId === prev.roomId);
            return updatedRoom || prev;
          }
          const firstUnread = transformedRooms.find(r => r.unreadCount > 0);
          return firstUnread || transformedRooms[0] || null;
        });
      } catch (error) {
        console.error('Error loading chat rooms:', error);
        setRooms([]);
      }
    };

    loadChatRooms();
    const interval = setInterval(loadChatRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load channels
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/channels`, {
          credentials: 'include',
          headers: getSiteHeaders()
        });
        if (response.ok) {
          const data = await response.json();
          setChannels(data);
        }
      } catch (error) {
        console.error('Error loading channels:', error);
      }
    };

    loadChannels();
    const interval = setInterval(loadChannels, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    setSelectedChannel(null);
    setRooms(prevRooms =>
      prevRooms.map(r => r.id === room.id ? { ...r, unreadCount: 0 } : r)
    );
  };

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
    setSelectedRoom(null);
  };

  const handleMessagesRead = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/api/rooms/applicant_rooms/`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to load chat rooms');
      const data = await response.json();

      const onlineStatusResponse = await fetch(`${API_BASE_URL}/chat/api/rooms/online_status`, {
        credentials: 'include'
      });
      let onlineStatus = {};
      if (onlineStatusResponse.ok) {
        onlineStatus = await onlineStatusResponse.json();
      }

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
          firstName, lastName,
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
    } catch (error) {
      console.error('Error refreshing rooms:', error);
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

  const getInitials = (firstName, lastName) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  // Filtered lists
  const filteredRooms = rooms.filter(room => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return room.name?.toLowerCase().includes(searchLower) ||
      room.participantEmail?.toLowerCase().includes(searchLower) ||
      room.participantId?.toLowerCase().includes(searchLower);
  });

  const filteredChannels = channels.filter(ch =>
    !searchTerm.trim() ||
    ch.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ch.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Avatar color palette
  const avatarColors = ['#E01E5A', '#36C5F0', '#2EB67D', '#ECB22E', '#6366f1', '#f59e0b'];
  const getAvatarColor = (index) => avatarColors[index % avatarColors.length];

  // Section header component
  const SectionHeader = ({ label, isOpen, onToggle, onAdd }) => (
    <Box
      sx={{
        px: 2, pt: 1, pb: 0.5,
        display: 'flex', alignItems: 'center', gap: 1,
        cursor: 'pointer',
        color: isDark ? '#ABABAD' : '#6b7280',
        fontSize: '13px', fontWeight: 700,
        '&:hover': { color: isDark ? '#E0E0E0' : '#374151' },
        userSelect: 'none'
      }}
      onClick={onToggle}
    >
      <Typography component="span" sx={{ fontSize: '12px', color: 'inherit' }}>
        {isOpen ? '▼' : '▶'}
      </Typography>
      <Typography component="span" sx={{ fontWeight: 700, fontSize: '13px', flex: 1, color: 'inherit' }}>
        {label}
      </Typography>
      {onAdd && (
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); onAdd(e); }}
          sx={{ p: 0.25, color: isDark ? '#ABABAD' : '#9ca3af', '&:hover': { color: isDark ? '#E0E0E0' : '#374151' } }}
        >
          <AddIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </Box>
  );

  // Far-left sidebar nav items with SVG icons
  const farNavItems = [
    { icon: <HomeIcon sx={{ fontSize: 20 }} />, label: 'Home', action: () => setActiveView('home'), active: activeView === 'home' },
    { icon: <DMsIcon sx={{ fontSize: 20 }} />, label: 'DMs', action: () => setActiveView('dms'), active: activeView === 'dms', badge: rooms.filter(r => r.unreadCount > 0).length || null },
    { icon: <ActivityIcon sx={{ fontSize: 20 }} />, label: 'Activity', path: '/admin/dashboard' },
    { icon: <FilesIcon sx={{ fontSize: 20 }} />, label: 'Files', path: '/admin/documents' },
  ];

  const farNavBottom = [
    { icon: <MoreIcon sx={{ fontSize: 20 }} />, label: 'More', path: null },
    { icon: <SettingsIcon sx={{ fontSize: 20 }} />, label: 'Admin', path: '/admin/settings' },
  ];

  // Combined activity list for Home view (DMs + Channels sorted by time)
  const activityItems = [
    ...filteredRooms.map(r => ({ ...r, itemType: 'dm' })),
    ...filteredChannels.map(c => ({ ...c, itemType: 'channel', lastMessageTime: new Date() }))
  ].sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

  return (
    <Box sx={{
      height: 'calc(100vh - 64px - 48px)',
      display: 'flex',
      overflow: 'hidden',
      bgcolor: isDark ? '#1A1D21' : '#ffffff',
      mx: -3,
      mb: -3
    }}>
      {/* Far-Left Sidebar 70px */}
      <Box
        sx={{
          width: 70,
          bgcolor: isDark ? '#1A1D21' : '#f8f9fa',
          borderRight: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          py: 1.5,
          flexShrink: 0
        }}
      >
        {/* Workspace Logo */}
        <Box
          sx={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #E01E5A, #ECB22E)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '14px', color: 'white',
            mb: 2, cursor: 'pointer', position: 'relative',
            '&::after': {
              content: '""', position: 'absolute',
              left: '-14px', top: '50%', transform: 'translateY(-50%)',
              width: '3px', height: '20px', background: 'white',
              borderRadius: '0 2px 2px 0'
            }
          }}
          onClick={() => navigate('/admin/dashboard')}
        >
          OH
        </Box>

        {/* Nav Items */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%', alignItems: 'center' }}>
          {farNavItems.map((item) => (
            <Tooltip key={item.label} title={item.label} placement="right">
              <Box
                onClick={() => {
                  if (item.action) item.action();
                  else if (item.path) navigate(item.path);
                }}
                sx={{
                  width: 44, height: 44, borderRadius: '8px',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '2px', cursor: 'pointer',
                  color: item.active ? (isDark ? '#E0E0E0' : '#111827') : (isDark ? '#ABABAD' : '#6b7280'),
                  bgcolor: item.active ? (isDark ? '#27242C' : '#e5e7eb') : 'transparent',
                  position: 'relative', transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: isDark ? '#27242C' : '#e5e7eb',
                    color: isDark ? '#E0E0E0' : '#111827'
                  },
                  ...(item.active && {
                    '&::before': {
                      content: '""', position: 'absolute',
                      left: '-13px', top: '50%', transform: 'translateY(-50%)',
                      width: '3px', height: '20px', background: '#36C5F0',
                      borderRadius: '0 2px 2px 0'
                    }
                  })
                }}
              >
                <Box sx={{ display: 'flex', lineHeight: 1 }}>{item.icon}</Box>
                <Typography sx={{ fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>{item.label}</Typography>
                {item.badge && (
                  <Box sx={{
                    position: 'absolute', top: 4, right: 4,
                    bgcolor: '#E01E5A', color: 'white',
                    fontSize: '10px', fontWeight: 700,
                    px: '5px', py: '2px', borderRadius: '10px',
                    minWidth: 18, textAlign: 'center', lineHeight: 1
                  }}>
                    {item.badge}
                  </Box>
                )}
              </Box>
            </Tooltip>
          ))}
        </Box>

        {/* Divider */}
        <Box sx={{ width: 24, height: '1px', bgcolor: isDark ? '#35373B' : '#e5e7eb', my: 1.5 }} />

        {/* Bottom Nav */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, width: '100%', alignItems: 'center' }}>
          {farNavBottom.map((item) => (
            <Tooltip key={item.label} title={item.label} placement="right">
              <Box
                onClick={() => item.path && navigate(item.path)}
                sx={{
                  width: 44, height: 44, borderRadius: '8px',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '2px', cursor: 'pointer',
                  color: isDark ? '#ABABAD' : '#6b7280',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: isDark ? '#27242C' : '#e5e7eb',
                    color: isDark ? '#E0E0E0' : '#111827'
                  }
                }}
              >
                <Box sx={{ display: 'flex', lineHeight: 1 }}>{item.icon}</Box>
                <Typography sx={{ fontSize: '10px', fontWeight: 500, lineHeight: 1 }}>{item.label}</Typography>
              </Box>
            </Tooltip>
          ))}
        </Box>

        <Box sx={{ flex: 1 }} />
      </Box>

      {/* Main Sidebar 260px */}
      <Box
        sx={{
          width: 260,
          bgcolor: isDark ? '#19181D' : '#ffffff',
          borderRight: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}`,
          display: 'flex', flexDirection: 'column'
        }}
      >
        {/* Header */}
        <Box sx={{
          p: 2, borderBottom: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <Typography sx={{
            fontWeight: 700, color: isDark ? '#E0E0E0' : '#111827',
            fontSize: '16px', display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            {activeView === 'home' ? 'Home' : 'Direct Messages'}
            <Typography component="span" sx={{ fontSize: '10px', color: isDark ? '#ABABAD' : '#6b7280', ml: 0.5 }}>
              ▼
            </Typography>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              size="small"
              sx={{
                color: isDark ? '#ABABAD' : '#6b7280',
                width: 28, height: 28, borderRadius: '4px',
                '&:hover': { bgcolor: isDark ? '#27242C' : '#f0f0f0', color: isDark ? '#E0E0E0' : '#374151' }
              }}
            >
              <SettingsIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              sx={{
                color: isDark ? '#ABABAD' : '#6b7280',
                width: 28, height: 28, borderRadius: '4px',
                '&:hover': { bgcolor: isDark ? '#27242C' : '#f0f0f0', color: isDark ? '#E0E0E0' : '#374151' }
              }}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Search */}
        <Box sx={{ px: 1.5, py: 1 }}>
          <TextField
            fullWidth
            placeholder={activeView === 'dms' ? 'Find a DM...' : 'Ara...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: isDark ? '#ABABAD' : '#9ca3af' }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchTerm('')}
                    sx={{ padding: 0.25, color: isDark ? '#ABABAD' : undefined }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                fontSize: '13px',
                bgcolor: isDark ? '#1d2126' : '#f3f4f6',
                borderRadius: '6px',
                color: isDark ? '#E0E0E0' : undefined,
                '& fieldset': { border: 'none' },
                '&:hover': { bgcolor: isDark ? '#27242C' : '#e5e7eb' },
                '&.Mui-focused': {
                  bgcolor: isDark ? '#222529' : '#ffffff',
                  boxShadow: isDark ? '0 0 0 2px rgba(18, 100, 163, 0.3)' : '0 0 0 2px rgba(59, 130, 246, 0.1)'
                },
                '& .MuiInputBase-input': {
                  padding: '6px 8px',
                  color: isDark ? '#E0E0E0' : undefined,
                  '&::placeholder': { color: isDark ? '#ABABAD' : undefined, opacity: 1 }
                }
              }
            }}
          />
        </Box>

        {/* Quick Nav Items - only in DMs view */}
        {activeView === 'dms' && (
          <Box sx={{ py: 1 }}>
            {[
              { icon: <ThreadsIcon sx={{ fontSize: 18 }} />, label: 'Threads' },
              { icon: <HuddlesIcon sx={{ fontSize: 18 }} />, label: 'Huddles' },
              { icon: <DirectoriesIcon sx={{ fontSize: 18 }} />, label: 'Directories' }
            ].map((nav) => (
              <Box
                key={nav.label}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2, py: 1, cursor: 'pointer',
                  color: isDark ? '#ABABAD' : '#6b7280', fontSize: '14px',
                  '&:hover': {
                    bgcolor: isDark ? '#27242C' : '#f0f0f0',
                    color: isDark ? '#E0E0E0' : '#374151'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', lineHeight: '20px' }}>{nav.icon}</Box>
                <Typography sx={{ fontSize: '14px', color: 'inherit' }}>{nav.label}</Typography>
              </Box>
            ))}
          </Box>
        )}

        {/* Scrollable Sections */}
        <Box sx={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 0.5,
          '&::-webkit-scrollbar': { width: '8px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: isDark ? '#35373B' : '#d1d5db', borderRadius: '4px' }
        }}>

          {activeView === 'home' ? (
            <>
              {/* Home View: Recent Activity */}
              <SectionHeader label="Son Aktiviteler" isOpen={true} onToggle={() => {}} />
              {activityItems.length === 0 ? (
                <Typography sx={{ px: 2, pl: 4, py: 1, fontSize: '13px', color: isDark ? '#ABABAD' : '#9ca3af', fontStyle: 'italic' }}>
                  Henüz aktivite yok
                </Typography>
              ) : (
                activityItems.map((item) => {
                  const isSelected = item.itemType === 'dm'
                    ? (selectedRoom?.id === item.id && !selectedChannel)
                    : (selectedChannel?.id === item.id);

                  return (
                    <Box
                      key={item.id}
                      onClick={() => item.itemType === 'dm' ? handleRoomSelect(item) : handleChannelSelect(item)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        px: 2, py: '6px', pl: 4, cursor: 'pointer',
                        bgcolor: isSelected ? (isDark ? '#3E103F' : '#e8e8e8') : 'transparent',
                        '&:hover': { bgcolor: isSelected ? undefined : (isDark ? '#27242C' : '#f0f0f0') },
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {item.itemType === 'dm' ? (
                        <Box sx={{ position: 'relative', flexShrink: 0 }}>
                          <Avatar sx={{
                            width: 20, height: 20, fontSize: '9px', fontWeight: 700, borderRadius: '4px',
                            background: isSelected ? 'rgba(255,255,255,0.3)' : getAvatarColor(activityItems.indexOf(item))
                          }}>
                            {getInitials(item.firstName, item.lastName)}
                          </Avatar>
                        </Box>
                      ) : (
                        item.type === 'private' ? (
                          <LockIcon sx={{ fontSize: 16, color: isDark ? '#ABABAD' : '#6b7280', flexShrink: 0 }} />
                        ) : (
                          <TagIcon sx={{ fontSize: 16, color: isDark ? '#ABABAD' : '#6b7280', flexShrink: 0 }} />
                        )
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{
                          fontSize: '14px',
                          color: isSelected ? '#fff' : (isDark ? '#E0E0E0' : '#111827'),
                          fontWeight: isSelected ? 600 : (item.unreadCount > 0 ? 700 : 400),
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '24px'
                        }}>
                          {item.itemType === 'dm' ? item.name : (item.displayName || item.name)}
                        </Typography>
                      </Box>
                      {item.lastMessageTime && (
                        <Typography sx={{
                          fontSize: '11px', flexShrink: 0,
                          color: isSelected ? 'rgba(255,255,255,0.7)' : (isDark ? '#ABABAD' : '#9ca3af')
                        }}>
                          {formatTime(item.lastMessageTime)}
                        </Typography>
                      )}
                    </Box>
                  );
                })
              )}

              {/* Channels in Home view */}
              <SectionHeader label="Kanallar" isOpen={channelsOpen} onToggle={() => setChannelsOpen(!channelsOpen)} />
              <Collapse in={channelsOpen}>
                {filteredChannels.length === 0 ? (
                  <Typography sx={{ px: 2, pl: 4, py: 1, fontSize: '13px', color: isDark ? '#ABABAD' : '#9ca3af', fontStyle: 'italic' }}>
                    Henüz kanal yok
                  </Typography>
                ) : (
                  filteredChannels.map((channel) => {
                    const isSelected = selectedChannel?.id === channel.id;
                    return (
                      <Box
                        key={channel.id}
                        onClick={() => handleChannelSelect(channel)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          px: 2, py: '6px', pl: 4, cursor: 'pointer',
                          bgcolor: isSelected ? (isDark ? '#3E103F' : '#e8e8e8') : 'transparent',
                          '&:hover': { bgcolor: isSelected ? undefined : (isDark ? '#27242C' : '#f0f0f0') },
                          transition: 'background 0.15s ease'
                        }}
                      >
                        {channel.type === 'private' ? (
                          <LockIcon sx={{ fontSize: 16, color: isDark ? '#ABABAD' : '#6b7280', flexShrink: 0 }} />
                        ) : (
                          <TagIcon sx={{ fontSize: 16, color: isDark ? '#ABABAD' : '#6b7280', flexShrink: 0 }} />
                        )}
                        <Typography sx={{
                          fontSize: '14px',
                          color: isSelected ? '#fff' : (isDark ? '#E0E0E0' : '#111827'),
                          fontWeight: isSelected ? 600 : 400,
                          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '24px'
                        }}>
                          {channel.displayName || channel.name}
                        </Typography>
                      </Box>
                    );
                  })
                )}
              </Collapse>
            </>
          ) : (
            <>
              {/* DMs View */}
              <SectionHeader label="Direct Messages" isOpen={dmOpen} onToggle={() => setDmOpen(!dmOpen)} />
              <Collapse in={dmOpen}>
                {filteredRooms.length === 0 ? (
                  <Typography sx={{
                    px: 2, pl: 4, py: 1, fontSize: '13px',
                    color: isDark ? '#ABABAD' : '#9ca3af', fontStyle: 'italic'
                  }}>
                    {searchTerm ? `"${searchTerm}" için sonuç yok` : 'Henüz sohbet yok'}
                  </Typography>
                ) : (
                  filteredRooms.map((room) => {
                    const isSelected = selectedRoom?.id === room.id && !selectedChannel;
                    const hasUnread = room.unreadCount > 0;

                    return (
                      <Box
                        key={room.id}
                        onClick={() => handleRoomSelect(room)}
                        onMouseEnter={() => setHoveredRoom(room.id)}
                        onMouseLeave={() => setHoveredRoom(null)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5,
                          px: 2, py: '6px', pl: 4, cursor: 'pointer',
                          bgcolor: isSelected ? (isDark ? '#3E103F' : '#e8e8e8') : 'transparent',
                          '&:hover': { bgcolor: isSelected ? undefined : (isDark ? '#27242C' : '#f0f0f0') },
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <Box sx={{ position: 'relative', flexShrink: 0 }}>
                          <Avatar sx={{
                            width: 20, height: 20, fontSize: '9px', fontWeight: 700, borderRadius: '4px',
                            background: isSelected ? 'rgba(255,255,255,0.3)' : getAvatarColor(filteredRooms.indexOf(room))
                          }}>
                            {getInitials(room.firstName, room.lastName)}
                          </Avatar>
                          <Box sx={{
                            position: 'absolute', bottom: 2, right: 2,
                            width: 8, height: 8, borderRadius: '50%',
                            bgcolor: room.participantOnline ? '#2EB67D' : '#ECB22E',
                            border: `2px solid ${isDark ? '#19181D' : '#fff'}`
                          }} />
                        </Box>
                        <Typography sx={{
                          fontSize: '14px',
                          color: isSelected ? '#fff' : (isDark ? '#E0E0E0' : '#111827'),
                          fontWeight: isSelected ? 600 : (hasUnread ? 700 : 400),
                          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '24px'
                        }}>
                          {room.name}
                        </Typography>
                        {hasUnread && (
                          <Box sx={{
                            minWidth: 18, height: 18, borderRadius: '9px',
                            bgcolor: '#E01E5A', color: 'white',
                            fontSize: '10px', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            px: 0.5, flexShrink: 0
                          }}>
                            {room.unreadCount}
                          </Box>
                        )}
                      </Box>
                    );
                  })
                )}
              </Collapse>
            </>
          )}
        </Box>
      </Box>

      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedChannel ? (
          <ChannelChatView
            channel={selectedChannel}
            currentUserId={currentUser?.id || 1}
            currentUserName={currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Admin'}
            onLeaveChannel={() => setSelectedChannel(null)}
            onChannelUpdate={() => {}}
            isDark={isDark}
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
            participantEmail={`${selectedRoom.participantId}@optima.com`}
            participantOnline={selectedRoom.participantOnline}
            currentUserId="admin_1"
            currentUserName="Admin"
            currentUserAvatar={null}
            currentUserEmail="admin@optima.com"
            currentUserType="admin"
            onMessagesRead={handleMessagesRead}
            isGroup={false}
          />
        ) : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: isDark ? '#1A1D21' : '#ffffff' }}>
            <Box sx={{ textAlign: 'center', maxWidth: 480, px: 4 }}>
              <Box sx={{
                width: 120, height: 120, borderRadius: '50%',
                background: isDark
                  ? 'linear-gradient(135deg, rgba(18, 100, 163, 0.2) 0%, rgba(29, 155, 209, 0.2) 100%)'
                  : 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill={isDark ? 'url(#gradient-dark)' : 'url(#gradient)'} />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                    <linearGradient id="gradient-dark" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1264a3" />
                      <stop offset="100%" stopColor="#1d9bd1" />
                    </linearGradient>
                  </defs>
                </svg>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: isDark ? '#E0E0E0' : '#111827', mb: 1.5, fontSize: '24px' }}>
                Bir sohbet seçin
              </Typography>
              <Typography variant="body1" sx={{ color: isDark ? '#ABABAD' : '#6b7280', fontSize: '15px', lineHeight: 1.6 }}>
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
