// src/components/chat/ChatSidebar.js - Rocket.Chat inspired sidebar with message search
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Badge,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Divider,
  Toolbar,
  Tooltip,
  CircularProgress,
  Tab,
  Tabs
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  VideoCall as VideoCallIcon,
  Close as CloseIcon,
  Message as MessageIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { chatApi } from '../../services';

/**
 * ChatSidebar Component - Rocket.Chat style sidebar with message search
 */
const ChatSidebar = ({
  rooms = [],
  selectedRoomId,
  onRoomSelect,
  onCreateRoom,
  open = true,
  onClose,
  drawerWidth = 280,
  variant = 'permanent',
  onMessageSelect // New: callback when a message search result is selected
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchMode, setSearchMode] = useState(0); // 0 = rooms, 1 = messages
  const [messageSearchResults, setMessageSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Debounced message search
  useEffect(() => {
    if (searchMode !== 1 || searchTerm.length < 2) {
      setMessageSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const response = await chatApi.searchMessages(searchTerm);
        setMessageSearchResults(response.results || []);
      } catch (error) {
        console.error('Message search error:', error);
        setSearchError('Arama yapılırken hata oluştu');
        setMessageSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchMode]);

  // Format last message time
  const formatTime = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Dün';
    }

    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('tr-TR', { weekday: 'short' });
    }

    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  // Format full date time for message results
  const formatFullDateTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter and search rooms
  const filteredRooms = useMemo(() => {
    let filtered = rooms;

    if (searchMode === 0 && searchTerm) {
      filtered = filtered.filter(room =>
        room.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        room.participantName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus === 'unread') {
      filtered = filtered.filter(room => room.unreadCount > 0);
    } else if (filterStatus === 'online') {
      filtered = filtered.filter(room => room.participantOnline);
    }

    return filtered.sort((a, b) => {
      const timeA = new Date(a.lastMessageTime || 0);
      const timeB = new Date(b.lastMessageTime || 0);
      return timeB - timeA;
    });
  }, [rooms, searchTerm, filterStatus, searchMode]);

  // Handle message result click
  const handleMessageResultClick = useCallback((result) => {
    if (result.room_info) {
      const roomId = `applicant_${result.room_info.applicant_id}`;
      const room = rooms.find(r => r.id === roomId || r.applicant_id === result.room_info.applicant_id);
      if (room) {
        onRoomSelect(room);
      } else {
        // Create a minimal room object to select
        onRoomSelect({
          id: roomId,
          applicant_id: result.room_info.applicant_id,
          participantName: result.room_info.name
        });
      }
      // Call onMessageSelect if provided to scroll to message
      if (onMessageSelect) {
        onMessageSelect(result.message_id);
      }
    }
    // Clear search
    setSearchTerm('');
    setSearchMode(0);
  }, [rooms, onRoomSelect, onMessageSelect]);

  // Room item component
  const RoomItem = ({ room }) => {
    const isSelected = room.id === selectedRoomId;
    const hasUnread = room.unreadCount > 0;

    return (
      <ListItem
        button
        selected={isSelected}
        onClick={() => onRoomSelect(room)}
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 1,
          mx: 1,
          mb: 0.5,
          transition: 'all 0.2s',
          '&.Mui-selected': {
            backgroundColor: 'rgba(28, 97, 171, 0.1)',
            borderLeft: '3px solid #1c61ab',
            '&:hover': {
              backgroundColor: 'rgba(28, 97, 171, 0.15)',
            }
          },
          '&:hover': {
            backgroundColor: 'rgba(28, 97, 171, 0.05)',
          }
        }}
      >
        <ListItemAvatar>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            variant="dot"
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: room.participantOnline ? '#8bb94a' : '#bdbdbd',
                width: 12,
                height: 12,
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: room.participantOnline ? '0 0 0 2px rgba(139, 185, 74, 0.2)' : 'none'
              }
            }}
          >
            <Avatar
              src={room.participantAvatar}
              sx={{
                width: 44,
                height: 44,
                background: isSelected
                  ? 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)'
                  : 'linear-gradient(135deg, #8bb94a 0%, #a8ca6f 100%)',
                fontWeight: 700,
                fontSize: '1rem'
              }}
            >
              {room.participantName?.[0]?.toUpperCase() || room.name?.[0]?.toUpperCase() || '?'}
            </Avatar>
          </Badge>
        </ListItemAvatar>

        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: hasUnread ? 700 : 600,
                  color: hasUnread ? '#1c61ab' : 'text.primary',
                  fontSize: '0.9rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1
                }}
              >
                {room.participantName || room.name || 'Unknown'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: hasUnread ? '#1c61ab' : 'text.secondary',
                  fontWeight: hasUnread ? 600 : 400,
                  fontSize: '0.7rem',
                  ml: 1
                }}
              >
                {formatTime(room.lastMessageTime)}
              </Typography>
            </Box>
          }
          secondary={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.8rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  fontWeight: hasUnread ? 600 : 400
                }}
              >
                {room.lastMessage || 'Mesaj yok'}
              </Typography>
              {hasUnread && (
                <Chip
                  label={room.unreadCount}
                  size="small"
                  sx={{
                    height: 20,
                    minWidth: 20,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
                    color: '#ffffff',
                    ml: 1,
                    '& .MuiChip-label': {
                      px: 0.75
                    }
                  }}
                />
              )}
            </Box>
          }
        />
      </ListItem>
    );
  };

  // Message search result item
  const MessageResultItem = ({ result }) => {
    // Highlight search term in snippet
    const highlightSnippet = (text) => {
      if (!searchTerm || !text) return text;
      const regex = new RegExp(`(${searchTerm})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) =>
        regex.test(part) ? (
          <Box component="span" key={i} sx={{ backgroundColor: '#fff59d', fontWeight: 600 }}>
            {part}
          </Box>
        ) : part
      );
    };

    return (
      <ListItem
        button
        onClick={() => handleMessageResultClick(result)}
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 1,
          mx: 1,
          mb: 0.5,
          backgroundColor: '#fff',
          border: '1px solid #e0e0e0',
          transition: 'all 0.2s',
          '&:hover': {
            backgroundColor: 'rgba(28, 97, 171, 0.05)',
            borderColor: '#1c61ab'
          }
        }}
      >
        <ListItemAvatar>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              background: 'linear-gradient(135deg, #1c61ab 0%, #4a8bd4 100%)',
              fontSize: '0.9rem'
            }}
          >
            <MessageIcon sx={{ fontSize: 20 }} />
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, color: '#1c61ab', fontSize: '0.85rem' }}
              >
                {result.room_info?.name || 'Bilinmeyen Oda'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                {formatFullDateTime(result.created_at)}
              </Typography>
            </Box>
          }
          secondary={
            <Box>
              <Typography
                variant="caption"
                sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}
              >
                {result.sender_name} ({result.sender_type === 'admin' ? 'Admin' : 'Aday'})
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.primary',
                  fontSize: '0.8rem',
                  lineHeight: 1.4
                }}
              >
                {highlightSnippet(result.snippet || result.content)}
              </Typography>
            </Box>
          }
        />
      </ListItem>
    );
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fafbfc' }}>
      {/* Sidebar Header */}
      <Toolbar
        sx={{
          background: 'linear-gradient(90deg, #1c61ab 0%, #4a8bd4 100%)',
          color: '#ffffff',
          minHeight: 64,
          px: 2
        }}
      >
        <VideoCallIcon sx={{ mr: 1.5, fontSize: 28 }} />
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          Görüşmeler
        </Typography>
        {variant === 'temporary' && (
          <IconButton
            edge="end"
            color="inherit"
            onClick={onClose}
            sx={{ ml: 1 }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Toolbar>

      {/* Search Bar */}
      <Box sx={{ p: 2, pb: 1 }}>
        <TextField
          fullWidth
          placeholder={searchMode === 0 ? "Kişi ara..." : "Mesajlarda ara..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: '#6c757d' }} />
              </InputAdornment>
            ),
            endAdornment: isSearching && (
              <InputAdornment position="end">
                <CircularProgress size={18} />
              </InputAdornment>
            ),
            sx: {
              borderRadius: 2,
              backgroundColor: '#ffffff',
              '&:hover': {
                backgroundColor: '#ffffff',
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#e0e0e0',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#8bb94a',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#1c61ab',
              }
            }
          }}
        />
      </Box>

      {/* Search Mode Tabs */}
      <Box sx={{ px: 2, pb: 1 }}>
        <Tabs
          value={searchMode}
          onChange={(e, newValue) => {
            setSearchMode(newValue);
            setMessageSearchResults([]);
          }}
          variant="fullWidth"
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              fontSize: '0.8rem',
              textTransform: 'none',
              fontWeight: 500
            },
            '& .Mui-selected': {
              color: '#1c61ab',
              fontWeight: 600
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#1c61ab'
            }
          }}
        >
          <Tab icon={<PersonIcon sx={{ fontSize: 18, mr: 0.5 }} />} iconPosition="start" label="Kişiler" />
          <Tab icon={<MessageIcon sx={{ fontSize: 18, mr: 0.5 }} />} iconPosition="start" label="Mesajlar" />
        </Tabs>
      </Box>

      {/* Filter Chips - Only show for rooms mode */}
      {searchMode === 0 && (
        <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 1 }}>
          <Chip
            label="Tümü"
            size="small"
            onClick={() => setFilterStatus('all')}
            sx={{
              backgroundColor: filterStatus === 'all' ? '#1c61ab' : '#ffffff',
              color: filterStatus === 'all' ? '#ffffff' : '#6c757d',
              fontWeight: filterStatus === 'all' ? 600 : 400,
              border: '1px solid',
              borderColor: filterStatus === 'all' ? '#1c61ab' : '#e0e0e0',
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: filterStatus === 'all' ? '#144887' : '#f5f5f5',
              }
            }}
          />
          <Chip
            label="Okunmamış"
            size="small"
            onClick={() => setFilterStatus('unread')}
            sx={{
              backgroundColor: filterStatus === 'unread' ? '#1c61ab' : '#ffffff',
              color: filterStatus === 'unread' ? '#ffffff' : '#6c757d',
              fontWeight: filterStatus === 'unread' ? 600 : 400,
              border: '1px solid',
              borderColor: filterStatus === 'unread' ? '#1c61ab' : '#e0e0e0',
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: filterStatus === 'unread' ? '#144887' : '#f5f5f5',
              }
            }}
          />
          <Chip
            label="Çevrimiçi"
            size="small"
            onClick={() => setFilterStatus('online')}
            sx={{
              backgroundColor: filterStatus === 'online' ? '#8bb94a' : '#ffffff',
              color: filterStatus === 'online' ? '#ffffff' : '#6c757d',
              fontWeight: filterStatus === 'online' ? 600 : 400,
              border: '1px solid',
              borderColor: filterStatus === 'online' ? '#8bb94a' : '#e0e0e0',
              transition: 'all 0.2s',
              '&:hover': {
                backgroundColor: filterStatus === 'online' ? '#6b9337' : '#f5f5f5',
              }
            }}
          />
        </Box>
      )}

      <Divider />

      {/* Content Area */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {searchMode === 0 ? (
          // Room List
          filteredRooms.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                p: 3
              }}
            >
              <Typography variant="body2" color="text.secondary" align="center">
                {searchTerm || filterStatus !== 'all'
                  ? 'Arama kriterlerine uygun görüşme bulunamadı'
                  : 'Henüz görüşme yok'}
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {filteredRooms.map((room) => (
                <RoomItem key={room.id} room={room} />
              ))}
            </List>
          )
        ) : (
          // Message Search Results
          <Box>
            {searchTerm.length < 2 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  En az 2 karakter yazın
                </Typography>
              </Box>
            ) : isSearching ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress size={24} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Aranıyor...
                </Typography>
              </Box>
            ) : searchError ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="error">
                  {searchError}
                </Typography>
              </Box>
            ) : messageSearchResults.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  "{searchTerm}" için sonuç bulunamadı
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {messageSearchResults.map((result) => (
                  <MessageResultItem key={result.id || result.message_id} result={result} />
                ))}
              </List>
            )}
          </Box>
        )}
      </Box>

      {/* Create New Room Button */}
      {onCreateRoom && searchMode === 0 && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Tooltip title="Yeni görüşme başlat">
              <IconButton
                fullWidth
                onClick={onCreateRoom}
                sx={{
                  background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
                  color: '#ffffff',
                  borderRadius: 2,
                  py: 1.5,
                  transition: 'all 0.2s',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #144887 0%, #6b9337 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(28, 97, 171, 0.3)'
                  }
                }}
              >
                <AddIcon sx={{ mr: 1 }} />
                <Typography variant="button" sx={{ fontWeight: 600 }}>
                  Yeni Görüşme
                </Typography>
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          border: 'none',
          boxShadow: variant === 'permanent' ? '2px 0 8px rgba(0, 0, 0, 0.05)' : 'none'
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default ChatSidebar;
