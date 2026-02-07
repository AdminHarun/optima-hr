// Real-time Chat Component with API integration
import React, { useState, useRef, useEffect } from 'react';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  TextField,
  IconButton,
  Typography,
  Divider,
  Avatar,
  Badge,
  Paper,
  InputAdornment,
  Chip,
  CircularProgress
} from '@mui/material';
import { Send, EmojiEmotions, AttachFile, Search, Circle } from '@mui/icons-material';
import Chat from '../Chat';

function ModernChat({ selectedChatId, onChatSelect }) {
  const { currentUser } = useEmployeeAuth();
  const [chatRooms, setChatRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [presenceData, setPresenceData] = useState({});

  // Load real chat room data from API
  useEffect(() => {
    const loadChatRooms = async () => {
      try {
        setLoading(true);
        
        // Fetch real chat room statuses
        const response = await fetch('/chat/api/rooms/status/');
        const data = await response.json();
        
        if (data.success) {
          const rooms = data.rooms.map(room => ({
            id: `applicant_${room.applicant_id}`,
            applicant_id: room.applicant_id,
            name: room.applicant_name,
            lastMessage: 'Chat aktif',
            timestamp: room.last_activity ? 
              new Date(room.last_activity).toLocaleTimeString('tr-TR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              }) : 'Henüz mesaj yok',
            unreadCount: room.unread_count,
            isOnline: room.is_online,
            lastSeen: room.last_seen,
            messageCount: room.message_count
          }));
          
          setChatRooms(rooms);
          
          // Load individual presence data for each applicant
          rooms.forEach(async (room) => {
            try {
              const presenceResponse = await fetch(`/chat/api/applicant/${room.applicant_id}/presence/`);
              const presenceInfo = await presenceResponse.json();
              
              if (presenceInfo.success) {
                setPresenceData(prev => ({
                  ...prev,
                  [room.id]: {
                    isOnline: presenceInfo.is_online,
                    isTyping: presenceInfo.is_typing,
                    lastSeen: presenceInfo.last_seen,
                    unreadCount: presenceInfo.unread_count
                  }
                }));
              }
            } catch (error) {
              console.error(`Error loading presence for ${room.applicant_id}:`, error);
            }
          });
        }
      } catch (error) {
        console.error('Error loading chat rooms:', error);
        // Fallback to localStorage data
        const siteCode = localStorage.getItem('optima_current_site') || 'FXB';
        const applications = JSON.parse(localStorage.getItem(`applications_${siteCode}`) || '[]');
        const fallbackRooms = applications.map(app => ({
          id: `applicant_${app.id}`,
          applicant_id: app.id,
          name: `${app.firstName || 'İsimsiz'} ${app.lastName || 'Başvuru'}`,
          lastMessage: 'Chat aktif (yerel veri)',
          timestamp: new Date(app.createdAt || Date.now()).toLocaleTimeString('tr-TR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          unreadCount: 0,
          isOnline: false,
          lastSeen: null,
          messageCount: 0
        }));
        setChatRooms(fallbackRooms);
      } finally {
        setLoading(false);
      }
    };

    loadChatRooms();

    // Set up periodic refresh for real-time updates
    const interval = setInterval(loadChatRooms, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Filter chats based on search term
  const filteredChats = chatRooms.filter(chat =>
    chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get real-time status for a chat room
  const getChatStatus = (chatId) => {
    const presence = presenceData[chatId];
    if (!presence) return { isOnline: false, statusText: 'Bilinmiyor', color: 'default' };

    if (presence.isTyping) {
      return { isOnline: true, statusText: 'Yazıyor...', color: 'info' };
    } else if (presence.isOnline) {
      return { isOnline: true, statusText: 'Çevrimiçi', color: 'success' };
    } else if (presence.lastSeen) {
      const lastSeenDate = new Date(presence.lastSeen);
      const now = new Date();
      const diffMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
      
      if (diffMinutes < 5) {
        return { isOnline: false, statusText: 'Az önce aktifti', color: 'warning' };
      } else if (diffMinutes < 60) {
        return { isOnline: false, statusText: `${diffMinutes} dk önce`, color: 'default' };
      } else {
        const diffHours = Math.floor(diffMinutes / 60);
        return { isOnline: false, statusText: `${diffHours} saat önce`, color: 'default' };
      }
    }
    
    return { isOnline: false, statusText: 'Çevrimdışı', color: 'error' };
  };

  // Get unread count for a chat
  const getUnreadCount = (chatId) => {
    const presence = presenceData[chatId];
    return presence?.unreadCount || 0;
  };

  if (loading) {
    return (
      <Box sx={{ 
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Chat odaları yükleniyor...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(28, 97, 171, 0.1)'
    }}>
      {/* Sol Panel - Real Chat Listesi */}
      <Box sx={{ 
        width: 300,
        borderRight: '1px solid rgba(28, 97, 171, 0.1)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Arama */}
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Sohbet ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              sx: {
                borderRadius: '12px',
                background: 'rgba(28, 97, 171, 0.05)'
              }
            }}
          />
        </Box>

        {/* Real Chat Listesi */}
        <List sx={{ flex: 1, overflow: 'auto', px: 1 }}>
          {filteredChats.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {searchTerm ? 'Eşleşen sohbet bulunamadı' : 'Henüz aktif chat yok'}
              </Typography>
            </Box>
          ) : (
            filteredChats.map((chat) => {
              const status = getChatStatus(chat.id);
              const unreadCount = getUnreadCount(chat.id);
              
              return (
                <ListItem
                  key={chat.id}
                  onClick={() => onChatSelect(chat.id)}
                  sx={{
                    mb: 0.5,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: selectedChatId === chat.id 
                      ? 'linear-gradient(135deg, rgba(28, 97, 171, 0.1), rgba(139, 185, 74, 0.1))'
                      : 'transparent',
                    '&:hover': {
                      background: 'rgba(28, 97, 171, 0.05)'
                    },
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Badge 
                    variant="dot" 
                    color={status.isOnline ? "success" : "error"}
                    invisible={!status.isOnline}
                    sx={{
                      '& .MuiBadge-dot': {
                        width: 8,
                        height: 8,
                        borderRadius: '50%'
                      }
                    }}
                  >
                    <Avatar sx={{ 
                      width: 40, 
                      height: 40,
                      background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                      mr: 2
                    }}>
                      {chat.name.charAt(0)}
                    </Avatar>
                  </Badge>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight="bold" noWrap>
                        {chat.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {chat.timestamp}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Circle sx={{ 
                          fontSize: 8, 
                          color: status.color === 'success' ? '#4caf50' : 
                                status.color === 'warning' ? '#ff9800' : 
                                status.color === 'error' ? '#f44336' : '#9e9e9e'
                        }} />
                        <Typography 
                          variant="caption" 
                          color={status.isOnline ? 'success.main' : 'text.secondary'}
                          sx={{ fontWeight: status.isTyping ? 'bold' : 'normal' }}
                        >
                          {status.statusText}
                        </Typography>
                      </Box>
                      
                      {unreadCount > 0 && (
                        <Chip
                          label={unreadCount}
                          size="small"
                          color="primary"
                          sx={{
                            height: 18,
                            minWidth: 18,
                            fontSize: '10px',
                            '& .MuiChip-label': {
                              px: 0.5
                            }
                          }}
                        />
                      )}
                    </Box>

                    {/* Message count indicator */}
                    {chat.messageCount > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                        {chat.messageCount} mesaj
                      </Typography>
                    )}
                  </Box>
                </ListItem>
              );
            })
          )}
        </List>
      </Box>

      {/* Sağ Panel - Real Chat Bileşeni */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Chat selectedChatId={selectedChatId} />
      </Box>
    </Box>
  );
}

export default ModernChat;
