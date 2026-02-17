import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Divider,
  Tooltip,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachIcon,
  EmojiEmotions as EmojiIcon,
  MoreVert as MoreIcon,
  Tag as TagIcon,
  Lock as LockIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  ExitToApp as LeaveIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  VolumeOff as MuteIcon,
  VolumeUp as UnmuteIcon,
  Reply as ReplyIcon,
  Forum as ForumIcon
} from '@mui/icons-material';
import ThreadPanel from './ThreadPanel';
import MentionInput from './MentionInput';

import { API_BASE_URL, WS_BASE_URL } from '../../config/config';

const getSiteHeaders = () => {
  const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
  return { 'X-Site-Id': currentSite };
};

const ChannelChatView = ({
  channel,
  currentUserId,
  currentUserName,
  onLeaveChannel,
  onChannelUpdate
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!channel?.id) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/channels/${channel.id}/messages?limit=100`,
        {
          credentials: 'include',
          headers: getSiteHeaders()
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setTimeout(() => scrollToBottom(false), 100);

        // Mark as read
        await fetch(`${API_BASE_URL}/api/channels/${channel.id}/read`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...getSiteHeaders()
          },
          body: JSON.stringify({
            lastMessageId: data.messages?.[data.messages.length - 1]?.id
          })
        });
      }
    } catch (err) {
      console.error('Error fetching channel messages:', err);
    } finally {
      setLoading(false);
    }
  }, [channel?.id, scrollToBottom]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // WebSocket connection for real-time messages
  useEffect(() => {
    if (!channel?.id) return;

    const connectWebSocket = () => {
      const wsUrl = `${WS_BASE_URL}/ws/channel/${channel.id}/`;
      console.log('📺 Connecting to channel WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Channel WebSocket connected');
        // Subscribe to this channel
        ws.send(JSON.stringify({
          type: 'subscribe_channels',
          channelIds: [channel.id]
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 Channel WS message:', data);

          switch (data.type) {
            case 'channel_message':
              // Add new message to the list (avoid duplicates)
              if (data.channelId === channel.id) {
                setMessages(prev => {
                  const exists = prev.some(m =>
                    m.id === data.message.id || m.messageId === data.message.messageId
                  );
                  if (exists) return prev;
                  return [...prev, {
                    id: data.message.id,
                    messageId: data.message.messageId,
                    content: data.message.content,
                    senderType: data.message.senderType,
                    senderName: data.message.senderName,
                    senderId: data.message.senderId,
                    senderAvatar: data.message.senderAvatar,
                    createdAt: data.message.createdAt
                  }];
                });
                setTimeout(() => scrollToBottom(), 100);
              }
              break;

            case 'channel_typing_indicator':
              if (data.channelId === channel.id && data.userId !== currentUserId) {
                setTypingUsers(prev => {
                  if (data.isTyping) {
                    if (!prev.find(u => u.userId === data.userId)) {
                      return [...prev, { userId: data.userId, userName: data.userName }];
                    }
                  } else {
                    return prev.filter(u => u.userId !== data.userId);
                  }
                  return prev;
                });
              }
              break;

            case 'channels_subscribed':
              console.log('📺 Subscribed to channels:', data.channelIds);
              break;

            case 'thread_update':
              // Update reply count on parent message
              if (data.channelId === channel.id) {
                setMessages(prev => prev.map(m =>
                  m.id === data.messageId
                    ? { ...m, replyCount: data.replyCount, lastReply: data.lastReply }
                    : m
                ));
              }
              break;

            case 'mention_notification':
              // Show desktop notification for mentions
              console.log('📬 Mention notification:', data);
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`${data.senderName} sizi etiketledi`, {
                  body: data.content,
                  icon: '/logo192.png',
                  tag: `mention-${data.messageId}`
                });
              }
              break;

            default:
              break;
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('📺 Channel WebSocket closed:', event.code, event.reason);
        // Reconnect after 3 seconds
        setTimeout(() => {
          if (wsRef.current === ws) {
            connectWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('📺 Channel WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [channel?.id, currentUserId, scrollToBottom]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);

      const response = await fetch(
        `${API_BASE_URL}/api/channels/${channel.id}/messages`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...getSiteHeaders()
          },
          body: JSON.stringify({
            content: newMessage.trim()
          })
        }
      );

      if (response.ok) {
        const sent = await response.json();
        setMessages(prev => [...prev, sent]);
        setNewMessage('');
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'channel_typing',
        channelId: channel?.id,
        isTyping
      }));
    }
  }, [channel?.id]);

  // Handle input change with typing indicator
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    // Send typing indicator
    sendTypingIndicator(true);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  // Toggle star
  const handleToggleStar = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/channels/${channel.id}/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getSiteHeaders()
        },
        body: JSON.stringify({ starred: !channel.membership?.starred })
      });
      onChannelUpdate?.();
    } catch (err) {
      console.error('Error toggling star:', err);
    }
    setMenuAnchor(null);
  };

  // Toggle mute
  const handleToggleMute = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/channels/${channel.id}/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getSiteHeaders()
        },
        body: JSON.stringify({ muted: !channel.membership?.muted })
      });
      onChannelUpdate?.();
    } catch (err) {
      console.error('Error toggling mute:', err);
    }
    setMenuAnchor(null);
  };

  // Leave channel
  const handleLeaveChannel = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/channels/${channel.id}/leave`,
        {
          method: 'POST',
          credentials: 'include',
          headers: getSiteHeaders()
        }
      );

      if (response.ok) {
        onLeaveChannel?.();
      }
    } catch (err) {
      console.error('Error leaving channel:', err);
    }
    setMenuAnchor(null);
  };

  // Format message time
  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  // Format date header
  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Bugun';
    if (date.toDateString() === yesterday.toDateString()) return 'Dun';
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  // Get avatar initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  if (!channel) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Bir kanal secin</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', height: '100%' }}>
      {/* Main Chat Area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'white'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {channel.type === 'private' ? (
              <LockIcon sx={{ color: '#6b7280' }} />
            ) : (
              <TagIcon sx={{ color: '#6b7280' }} />
            )}
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {channel.displayName}
              </Typography>
              {channel.topic && (
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  {channel.topic}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<PeopleIcon sx={{ fontSize: 16 }} />}
              label={channel.memberCount || 0}
              size="small"
              variant="outlined"
            />

            <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
              <MoreIcon />
            </IconButton>

            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
            >
              <MenuItem onClick={handleToggleStar}>
                <ListItemIcon>
                  {channel.membership?.starred ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText>
                  {channel.membership?.starred ? 'Yildizdan Kaldir' : 'Yildizla'}
                </ListItemText>
              </MenuItem>
              <MenuItem onClick={handleToggleMute}>
                <ListItemIcon>
                  {channel.membership?.muted ? <UnmuteIcon fontSize="small" /> : <MuteIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText>
                  {channel.membership?.muted ? 'Bildirimleri Ac' : 'Sessize Al'}
                </ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLeaveChannel} sx={{ color: 'error.main' }}>
                <ListItemIcon>
                  <LeaveIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Kanaldan Ayril</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Messages */}
        <Box
          ref={messagesContainerRef}
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 2,
            bgcolor: '#f9fafb'
          }}
        >
          {loading && messages.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <TagIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
              <Typography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
                #{channel.name} kanalina hos geldiniz!
              </Typography>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                Bu kanalin ilk mesajini siz gonderin.
              </Typography>
            </Box>
          ) : (
            Object.entries(groupedMessages).map(([date, dayMessages]) => (
              <Box key={date}>
                {/* Date Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                  <Divider sx={{ flex: 1 }} />
                  <Typography
                    variant="caption"
                    sx={{
                      px: 2,
                      color: '#6b7280',
                      fontWeight: 500
                    }}
                  >
                    {formatDateHeader(date)}
                  </Typography>
                  <Divider sx={{ flex: 1 }} />
                </Box>

                {/* Messages */}
                {dayMessages.map((message, index) => {
                  const isOwn = message.senderId?.toString() === currentUserId?.toString();
                  const showAvatar = index === 0 ||
                    dayMessages[index - 1]?.senderId !== message.senderId;
                  const isHovered = hoveredMessageId === message.id;

                  return (
                    <Box
                      key={message.id}
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        mb: showAvatar ? 2 : 0.5,
                        pl: showAvatar ? 0 : 5.5,
                        position: 'relative',
                        '&:hover': {
                          bgcolor: 'rgba(99, 102, 241, 0.04)'
                        },
                        borderRadius: 1,
                        py: 0.5,
                        px: 1,
                        mx: -1
                      }}
                    >
                      {showAvatar && (
                        <Avatar
                          src={message.senderAvatar}
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: isOwn ? '#6366f1' : '#e5e7eb',
                            fontSize: '14px'
                          }}
                        >
                          {getInitials(message.senderName)}
                        </Avatar>
                      )}

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        {showAvatar && (
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.25 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: isOwn ? '#6366f1' : '#1f2937' }}
                            >
                              {message.senderName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                              {formatMessageTime(message.createdAt)}
                            </Typography>
                          </Box>
                        )}

                        <Typography
                          variant="body2"
                          sx={{
                            color: '#374151',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}
                        >
                          {message.content}
                          {message.isEdited && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ ml: 1, color: '#9ca3af' }}
                            >
                              (duzenlendi)
                            </Typography>
                          )}
                        </Typography>

                        {/* Thread Reply Count */}
                        {message.replyCount > 0 && (
                          <Box
                            onClick={() => setSelectedThread(message)}
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.5,
                              mt: 0.5,
                              px: 1,
                              py: 0.25,
                              borderRadius: 1,
                              bgcolor: 'rgba(99, 102, 241, 0.08)',
                              cursor: 'pointer',
                              '&:hover': {
                                bgcolor: 'rgba(99, 102, 241, 0.15)'
                              }
                            }}
                          >
                            <ForumIcon sx={{ fontSize: 14, color: '#6366f1' }} />
                            <Typography
                              variant="caption"
                              sx={{ color: '#6366f1', fontWeight: 600 }}
                            >
                              {message.replyCount} yanit
                            </Typography>
                            {message.lastReply && (
                              <Typography
                                variant="caption"
                                sx={{ color: '#9ca3af', ml: 0.5 }}
                              >
                                - {message.lastReply.senderName}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>

                      {/* Hover Actions */}
                      {isHovered && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: 8,
                            display: 'flex',
                            gap: 0.5,
                            bgcolor: 'white',
                            borderRadius: 1,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            border: '1px solid #e5e7eb',
                            p: 0.25
                          }}
                        >
                          <Tooltip title="Konuya yanit ver">
                            <IconButton
                              size="small"
                              onClick={() => setSelectedThread(message)}
                              sx={{ p: 0.5 }}
                            >
                              <ReplyIcon sx={{ fontSize: 18, color: '#6b7280' }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            ))
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* Message Input */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid #e5e7eb',
            bgcolor: 'white'
          }}
        >
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <IconButton size="small" disabled>
              <AttachIcon />
            </IconButton>

            <Box sx={{ flex: 1 }}>
              {/* Typing indicator */}
              {typingUsers.length > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#6366f1',
                    fontSize: '11px',
                    pl: 1,
                    display: 'block',
                    mb: 0.5
                  }}
                >
                  {typingUsers.length === 1
                    ? `${typingUsers[0].userName} yaziyor...`
                    : `${typingUsers.length} kisi yaziyor...`}
                </Typography>
              )}
              <MentionInput
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={`#${channel.name} kanalina mesaj gonder (@mention, #kanal)`}
                channelId={channel.id}
                disabled={sending}
                multiline
                maxRows={4}
              />
            </Box>

            <IconButton size="small" disabled>
              <EmojiIcon />
            </IconButton>

            <IconButton
              color="primary"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? <CircularProgress size={20} /> : <SendIcon />}
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Thread Panel */}
      {selectedThread && (
        <ThreadPanel
          channelId={channel.id}
          parentMessage={selectedThread}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onClose={() => setSelectedThread(null)}
        />
      )}
    </Box>
  );
};

export default ChannelChatView;
