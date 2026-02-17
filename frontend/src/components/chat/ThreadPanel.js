import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Divider,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  Reply as ReplyIcon
} from '@mui/icons-material';

import { API_BASE_URL, WS_BASE_URL } from '../../config/config';

const getSiteHeaders = () => {
  const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
  return { 'X-Site-Id': currentSite };
};

const ThreadPanel = ({
  channelId,
  parentMessage,
  currentUserId,
  currentUserName,
  onClose
}) => {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newReply, setNewReply] = useState('');
  const [replyCount, setReplyCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const repliesEndRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (repliesEndRef.current) {
      repliesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, []);

  // Fetch thread
  const fetchThread = useCallback(async () => {
    if (!parentMessage?.id) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/channels/${channelId}/messages/${parentMessage.id}/thread`,
        {
          credentials: 'include',
          headers: getSiteHeaders()
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReplies(data.replies || []);
        setReplyCount(data.totalReplies || 0);
        setTimeout(() => scrollToBottom(false), 100);
      }
    } catch (err) {
      console.error('Error fetching thread:', err);
    } finally {
      setLoading(false);
    }
  }, [channelId, parentMessage?.id, scrollToBottom]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  // WebSocket connection for real-time thread updates
  useEffect(() => {
    if (!parentMessage?.id) return;

    const connectWebSocket = () => {
      const wsUrl = `${WS_BASE_URL}/ws/channel/${channelId}/`;
      console.log('📺 Connecting to thread WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Thread WebSocket connected');
        // Subscribe to thread
        ws.send(JSON.stringify({
          type: 'subscribe_thread',
          threadId: parentMessage.id
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'thread_reply':
              if (data.parentMessageId === parentMessage.id) {
                setReplies(prev => {
                  const exists = prev.some(r => r.id === data.message.id);
                  if (exists) return prev;
                  return [...prev, data.message];
                });
                setReplyCount(data.replyCount);
                setTimeout(() => scrollToBottom(), 100);
              }
              break;

            case 'thread_typing_indicator':
              if (data.threadId === parentMessage.id && data.userId !== currentUserId) {
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

            default:
              break;
          }
        } catch (err) {
          console.error('Error parsing thread WS message:', err);
        }
      };

      ws.onclose = () => {
        console.log('📺 Thread WebSocket closed');
      };

      ws.onerror = (error) => {
        console.error('📺 Thread WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        // Unsubscribe from thread
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'unsubscribe_thread',
            threadId: parentMessage.id
          }));
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [channelId, parentMessage?.id, currentUserId, scrollToBottom]);

  // Send reply
  const handleSendReply = async () => {
    if (!newReply.trim() || sending) return;

    try {
      setSending(true);

      const response = await fetch(
        `${API_BASE_URL}/api/channels/${channelId}/messages/${parentMessage.id}/thread`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...getSiteHeaders()
          },
          body: JSON.stringify({ content: newReply.trim() })
        }
      );

      if (response.ok) {
        const sent = await response.json();
        setReplies(prev => [...prev, sent]);
        setReplyCount(sent.parentReplyCount || replyCount + 1);
        setNewReply('');
        setTimeout(() => scrollToBottom(), 100);
      }
    } catch (err) {
      console.error('Error sending thread reply:', err);
    } finally {
      setSending(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  // Send typing indicator
  const sendTypingIndicator = useCallback((isTyping) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'thread_typing',
        threadId: parentMessage?.id,
        isTyping
      }));
    }
  }, [parentMessage?.id]);

  // Handle input change
  const handleInputChange = (e) => {
    setNewReply(e.target.value);
    sendTypingIndicator(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(false);
    }, 2000);
  };

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  // Get initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (!parentMessage) return null;

  return (
    <Paper
      elevation={3}
      sx={{
        width: 380,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid #e5e7eb',
        bgcolor: '#ffffff'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReplyIcon sx={{ color: '#6366f1' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Konu
          </Typography>
          <Typography variant="caption" sx={{ color: '#6b7280' }}>
            {replyCount} yanit
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Parent Message */}
      <Box sx={{ p: 2, bgcolor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              bgcolor: '#6366f1',
              fontSize: '14px'
            }}
          >
            {getInitials(parentMessage.senderName)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {parentMessage.senderName}
              </Typography>
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                {formatTime(parentMessage.createdAt)}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#374151' }}>
              {parentMessage.content}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Replies */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : replies.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" sx={{ color: '#9ca3af' }}>
              Henuz yanit yok. Ilk yaniti siz yazin!
            </Typography>
          </Box>
        ) : (
          replies.map((reply) => (
            <Box
              key={reply.id}
              sx={{ display: 'flex', gap: 1.5, mb: 2 }}
            >
              <Avatar
                src={reply.senderAvatar}
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: reply.senderId === currentUserId ? '#6366f1' : '#e5e7eb',
                  fontSize: '12px'
                }}
              >
                {getInitials(reply.senderName)}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.25 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '13px' }}>
                    {reply.senderName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '11px' }}>
                    {formatTime(reply.createdAt)}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  sx={{ color: '#374151', fontSize: '13px', whiteSpace: 'pre-wrap' }}
                >
                  {reply.content}
                </Typography>
              </Box>
            </Box>
          ))
        )}
        <div ref={repliesEndRef} />
      </Box>

      {/* Reply Input */}
      <Box sx={{ p: 2, borderTop: '1px solid #e5e7eb' }}>
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <Typography
            variant="caption"
            sx={{ color: '#6366f1', fontSize: '11px', display: 'block', mb: 0.5 }}
          >
            {typingUsers.length === 1
              ? `${typingUsers[0].userName} yaziyor...`
              : `${typingUsers.length} kisi yaziyor...`}
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={3}
            placeholder="Yanit yaz..."
            value={newReply}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: '#f9fafb',
                fontSize: '13px'
              }
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSendReply}
            disabled={!newReply.trim() || sending}
            size="small"
          >
            {sending ? <CircularProgress size={18} /> : <SendIcon />}
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

export default ThreadPanel;
