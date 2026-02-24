// src/pages/ApplicantChat.js - WebSocket Enabled Chat for Applicants
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Paper,
  Container,
  Alert,
  Divider,
  Button,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import { Send, ArrowBack, Group as GroupIcon, Person as PersonIcon } from '@mui/icons-material';
import VideoCallModal from '../components/chat/VideoCallModal';
import MessageContent from '../components/chat/MessageContent';
import webSocketService from '../services/webSocketService';
import { IncomingCallNotification } from '../components/videoCall';

import { API_BASE_URL, WS_BASE_URL } from '../config/config';

function ApplicantChat() {
  const { chatToken } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [applicantInfo, setApplicantInfo] = useState(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  // Video Call States
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  // Group Chat States
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState(0); // 0: HR Chat, 1: Groups
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);

  // Otomatik scroll fonksiyonu
  const scrollToBottom = useCallback((instant = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: instant ? "auto" : "smooth" });
    }
  }, []);

  // Sadece yeni mesaj geldiginde scroll yap
  useEffect(() => {
    if (messages.length === 0) return;

    if (isInitialLoadRef.current) {
      // Ilk yuklemede aninda en alta git
      isInitialLoadRef.current = false;
      setTimeout(() => scrollToBottom(true), 50);
    } else if (messages.length > prevMessageCountRef.current) {
      // Yeni mesaj geldi - smooth scroll
      scrollToBottom(false);
    }
    // Mesaj sayisi azaldiysa veya ayni kaldiysa scroll yapma (reload durumu)
    prevMessageCountRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Chat token ile profil bilgilerini yükle
  useEffect(() => {
    const loadProfile = async () => {
      if (!chatToken) {
        setError('Chat token bulunamadı');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/applications/chat/${chatToken}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Chat token doğrulanamadı');
        }

        const profileData = await response.json();
        setApplicantInfo(profileData);
        setLoading(false);
      } catch (error) {
        console.error('Profile loading error:', error);
        setError('Chat sayfası yüklenemedi');
        setLoading(false);
      }
    };

    loadProfile();
  }, [chatToken]);

  // Load groups for applicant
  useEffect(() => {
    const loadGroups = async () => {
      if (!applicantInfo?.id) return;

      console.log('🔍 Loading groups for applicant ID:', applicantInfo.id);

      try {
        const url = `${API_BASE_URL}/chat/api/groups/?member_type=applicant&member_id=${applicantInfo.id}`;
        console.log('📡 Fetching groups from:', url);

        const response = await fetch(url, { credentials: 'include' });

        if (response.ok) {
          const data = await response.json();
          console.log('📥 Applicant groups loaded:', data.length, 'groups');
          console.log('📋 Groups data:', data);
          setGroups(data);
        } else {
          console.error('❌ Groups API error:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('❌ Error loading groups:', error);
      }
    };

    loadGroups();
  }, [applicantInfo?.id]);

  // Load messages from server with retry logic (MUST be defined before WebSocket useEffect)
  const loadMessages = useCallback(async (retryCount = 0) => {
    if (!applicantInfo?.id) {
      console.log('⏳ loadMessages: applicantInfo.id not ready yet');
      return;
    }

    const roomId = `applicant_${applicantInfo.id}`;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    console.log(`📡 Loading messages for room: ${roomId} (attempt ${retryCount + 1}/${maxRetries + 1})`);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/api/rooms/${roomId}/messages`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`📡 Messages API response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Messages API error: ${response.status} - ${errorText}`);

        // Retry for server errors (5xx) or if room not found (404 - might be creating)
        if ((response.status >= 500 || response.status === 404) && retryCount < maxRetries) {
          console.log(`🔄 Retrying in ${retryDelay}ms...`);
          setTimeout(() => loadMessages(retryCount + 1), retryDelay);
          return;
        }

        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to load messages'}`);
      }

      const data = await response.json();
      console.log('📥 Messages loaded successfully:', data.messages?.length || 0, 'messages');

      setMessages(data.messages || []);
      setError(null);
    } catch (err) {
      console.error('❌ Error loading messages:', err.message);

      // Retry for network errors
      if (err.name === 'TypeError' && retryCount < maxRetries) {
        console.log(`🔄 Network error, retrying in ${retryDelay}ms...`);
        setTimeout(() => loadMessages(retryCount + 1), retryDelay);
        return;
      }

      setError('Mesajlar yüklenemedi. Lütfen sayfayı yenileyin.');
      setMessages([]);
    }
  }, [applicantInfo?.id]);

  // Handle incoming WebSocket messages (MUST be defined before WebSocket useEffect)
  const handleIncomingMessage = useCallback((data) => {
    switch (data.type) {
      case 'chat_message':
        // New message received from backend
        const incomingMessage = data.message;

        setMessages(prev => {
          // Check if message already exists
          const exists = prev.some(msg =>
            msg.id === incomingMessage.id ||
            msg.message_id === incomingMessage.message_id
          );
          if (exists) return prev;

          return [...prev, incomingMessage];
        });
        break;

      case 'typing_indicator':
        // Admin is typing
        console.log('👨‍💼 Admin is typing...');
        break;

      case 'message_status':
        // Message status update (sent, delivered, read)
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.message_id || msg.message_id === data.message_id) {
            return { ...msg, status: data.status };
          }
          return msg;
        }));
        break;

      case 'error':
        console.error('WebSocket error:', data.message);
        setError(data.message);
        break;

      // ==================== VIDEO CALL EVENTS ====================
      case 'video_call_incoming':
        // Admin calling applicant
        console.log('📞 Incoming video call from admin:', data);
        setIncomingCall({
          call_id: data.call_id,
          caller_name: data.caller_name,
          caller_type: data.caller_type,
          room_id: data.room_id
        });
        break;

      case 'video_call_ready':
        // Daily.co room ready
        console.log('Video call ready:', data);
        setActiveCall({
          call_id: data.call_id,
          daily_url: data.daily_url,
          room_name: data.room_name
        });
        setIncomingCall(null);
        break;

      case 'video_call_ended':
        // Call ended
        console.log('📞 Video call ended:', data);
        setActiveCall(null);
        setIncomingCall(null);
        break;

      case 'video_call_expired':
        // Call timeout (30 seconds passed without answer)
        console.log('⏰ Video call expired:', data);
        setIncomingCall(null);
        setActiveCall(null);
        setError('Arama süresi doldu (30 saniye)');
        setTimeout(() => setError(null), 3000);
        break;

      case 'video_call_error':
        // Video call error
        console.error('📞 Video call error:', data);
        setError(data.error || 'Video arama hatası');
        setTimeout(() => setError(null), 3000);
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }, []);

  // WebSocket bağlantısını kur
  useEffect(() => {
    if (!applicantInfo?.id) return;

    const roomId = `applicant_${applicantInfo.id}`;
    console.log('💬 Applicant connecting to room:', roomId);

    // Connect to WebSocket
    const wsUrl = `${WS_BASE_URL}/ws/applicant-chat/${roomId}`;
    webSocketService.connect(wsUrl, 'applicant');

    // Connection handler
    const unsubscribeConnection = webSocketService.onConnection((event) => {
      console.log('🔌 Connection event:', event);

      if (event.type === 'connected') {
        setIsConnected(true);
        setError(null);
        // Load initial messages with small delay to ensure room exists
        setTimeout(() => loadMessages(), 100);
      } else if (event.type === 'disconnected') {
        setIsConnected(false);
        setError('Bağlantı kesildi. Yeniden bağlanılıyor...');
      } else if (event.type === 'reconnecting') {
        setError(`Yeniden bağlanılıyor... (${event.attempt}/${event.maxAttempts})`);
      } else if (event.type === 'failed') {
        setError('Bağlantı kurulamadı. Lütfen sayfayı yenileyin.');
      }
    });

    // Message handler
    const unsubscribeMessage = webSocketService.onMessage((data) => {
      console.log('📨 Message received:', data);
      handleIncomingMessage(data);
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      unsubscribeConnection();
      unsubscribeMessage();
      webSocketService.disconnect();
      setMessages([]);
    };
  }, [applicantInfo?.id, loadMessages, handleIncomingMessage]);

  // Send message via WebSocket
  const sendMessage = () => {
    if (!newMessage.trim() || !isConnected) return;

    try {
      // Generate unique message ID
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Send via WebSocket
      const success = webSocketService.sendMessage(newMessage.trim(), messageId);

      if (!success) {
        throw new Error('Failed to send message');
      }

      // Optimistically add message to UI
      const optimisticMessage = {
        id: messageId,
        message_id: messageId,
        content: newMessage.trim(),
        sender_type: 'applicant',
        sender_name: `${applicantInfo.firstName} ${applicantInfo.lastName}`,
        created_at: new Date().toISOString(),
        reactions: [],
        status: 'sending',
        is_own_message: true
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');

      // Update status to sent after a delay
      setTimeout(() => {
        setMessages(prev => prev.map(msg =>
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        ));
      }, 500);

      console.log('💬 Applicant mesaj gönderdi:', {
        messageId,
        content: newMessage.trim()
      });

    } catch (err) {
      console.error('Error sending message:', err);
      setError('Mesaj gönderilemedi');
    }
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage((prevMessage) => prevMessage + emoji.native);
    setEmojiAnchorEl(null);
  };

  // ==================== VIDEO CALL HANDLERS ====================

  // Accept incoming call with mic/cam preferences
  const handleAcceptCall = useCallback((callId, preferences = { mic: true, cam: true }) => {
    console.log('📞 Applicant accepting call:', callId, 'Preferences:', preferences);
    const ws = webSocketService.getConnection();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'video_call_response',
        call_id: callId,
        action: 'accept',
        participant_name: `${applicantInfo?.firstName || ''} ${applicantInfo?.lastName || ''}`.trim(),
        preferences // Mic/Cam preferences from IncomingCallNotification
      }));
      console.log('✅ Call acceptance sent with preferences:', preferences);
    }
  }, [applicantInfo]);

  // Reject incoming call
  const handleRejectCall = useCallback((callId) => {
    console.log('📞 Applicant rejecting call:', callId);
    const ws = webSocketService.getConnection();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'video_call_response',
        call_id: callId,
        action: 'reject',
        participant_name: `${applicantInfo?.firstName || ''} ${applicantInfo?.lastName || ''}`.trim()
      }));
      console.log('✅ Call rejection sent');
    }
    setIncomingCall(null);
  }, [applicantInfo]);

  // End active call
  const handleEndCall = useCallback(() => {
    if (activeCall && applicantInfo?.id) {
      console.log('📞 Applicant ending call:', activeCall.call_id);
      const ws = webSocketService.getConnection();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'video_call_end',
          call_id: activeCall.call_id,
          room_id: `applicant_${applicantInfo.id}`
        }));
        console.log('✅ Call end sent');
      }
      setActiveCall(null);
    }
  }, [activeCall, applicantInfo]);

  if (loading) {
    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: "url('/site_background.jpg')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundPosition: "center center"
      }}>
        <Paper sx={{
          p: 4,
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          textAlign: 'center'
        }}>
          <Typography variant="h6" sx={{ color: '#1c61ab', mb: 2 }}>
            Chat Yükleniyor...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Lütfen bekleyiniz
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (error && !applicantInfo) {
    return (
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: "url('/site_background.jpg')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundPosition: "center center"
      }}>
        <Paper sx={{
          p: 4,
          borderRadius: '20px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          textAlign: 'center'
        }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Lütfen doğru chat linkini kullandığınızdan emin olun.
          </Typography>
        </Paper>
      </Box>
    );
  }

  if (!applicantInfo) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          Başvuru bulunamadı. Lütfen doğru linki kullandığınızdan emin olun.
        </Alert>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        backgroundImage: "url('/site_background.jpg')",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        backgroundPosition: "center center",
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          zIndex: 0
        }
      }}
    >
      <Paper
        sx={{
          width: '100%',
          maxWidth: '800px',
          height: '80vh',
          borderRadius: '20px',
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(28, 97, 171, 0.2)',
          boxShadow: '0 20px 60px rgba(28, 97, 171, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Header */}
        <Box sx={{
          p: 2,
          background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.1), rgba(139, 185, 74, 0.1))',
          borderBottom: '1px solid rgba(28, 97, 171, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Avatar sx={{
            background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
            boxShadow: '0 4px 12px rgba(28, 97, 171, 0.3)'
          }}>
            {`${applicantInfo.firstName?.[0] || ''}${applicantInfo.lastName?.[0] || ''}`.toUpperCase() || 'B'}
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{
              background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold'
            }}>
              İnsan Kaynakları ile Mesajlaşma
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {applicantInfo.firstName} {applicantInfo.lastName}
              {isConnected ? ' • Bağlı' : ' • Bağlantı bekleniyor...'}
            </Typography>
          </Box>

          <Button
            startIcon={<ArrowBack />}
            onClick={() => window.close()}
            variant="outlined"
            sx={{
              borderColor: '#1c61ab',
              color: '#1c61ab',
              '&:hover': {
                borderColor: '#8bb94a',
                backgroundColor: 'rgba(139, 185, 74, 0.1)'
              }
            }}
          >
            Kapat
          </Button>
        </Box>

        {/* Tabs - Only show if there are groups */}
        {groups.length > 0 && (
          <Box sx={{ px: 2, borderBottom: '1px solid rgba(28, 97, 171, 0.1)' }}>
            <Tabs
              value={activeTab}
              onChange={(e, v) => { setActiveTab(v); setSelectedGroup(null); }}
              sx={{
                minHeight: 40,
                '& .MuiTabs-indicator': {
                  background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
                  height: 3
                }
              }}
            >
              <Tab
                icon={<PersonIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="İK ile Sohbet"
                sx={{
                  minHeight: 40,
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&.Mui-selected': { color: '#1c61ab' }
                }}
              />
              <Tab
                icon={
                  <Badge badgeContent={groups.length} color="primary" sx={{ '& .MuiBadge-badge': { fontSize: 10 } }}>
                    <GroupIcon sx={{ fontSize: 18 }} />
                  </Badge>
                }
                iconPosition="start"
                label="Gruplar"
                sx={{
                  minHeight: 40,
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&.Mui-selected': { color: '#1c61ab' }
                }}
              />
            </Tabs>
          </Box>
        )}

        {/* Connection Error */}
        {error && applicantInfo && (
          <Alert severity="warning" sx={{ m: 1 }}>
            {error}
          </Alert>
        )}

        {/* Tab Content */}
        {activeTab === 0 ? (
          /* Tab 0: HR Chat */
          <>
            {/* Mesaj Listesi */}
            <Box sx={{
              flex: 1,
              overflowY: 'auto',
              p: 1,
              display: 'flex',
              flexDirection: 'column'
            }}>
              <List sx={{ width: '100%', py: 0, display: 'flex', flexDirection: 'column' }}>
                {messages.map((message) => {
                  const isOwnMessage = message.sender_type === 'applicant';
                  return (
                    <ListItem
                      key={message.id || message.message_id}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                        px: 1,
                        py: 0.5,
                      }}
                    >
                      {/* Avatar ve Mesaj */}
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        maxWidth: '80%',
                        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
                        gap: 1
                      }}>
                        {/* Avatar */}
                        <Avatar sx={{
                          width: 32,
                          height: 32,
                          background: isOwnMessage
                            ? 'linear-gradient(135deg, #8bb94a, #a4d65e)'
                            : 'linear-gradient(135deg, #1c61ab, #4a9eff)',
                          fontSize: '14px'
                        }}>
                          {isOwnMessage
                            ? `${applicantInfo.firstName?.[0] || ''}${applicantInfo.lastName?.[0] || ''}`.toUpperCase() || 'B'
                            : 'İK'
                          }
                        </Avatar>

                        {/* Message Container - Baloncuk + Timestamp */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {/* Mesaj Baloncuğu */}
                          <Box
                            sx={{
                              background: isOwnMessage
                                ? 'linear-gradient(135deg, #8bb94a, #a4d65e)'
                                : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(233, 240, 247, 0.9))',
                              color: isOwnMessage ? 'white' : 'black',
                              p: 1.5,
                              borderRadius: '16px',
                              borderTopLeftRadius: !isOwnMessage ? '6px' : '16px',
                              borderTopRightRadius: isOwnMessage ? '6px' : '16px',
                              wordBreak: 'break-word',
                              backdropFilter: 'blur(10px)',
                              border: isOwnMessage ? 'none' : '1px solid rgba(28, 97, 171, 0.2)',
                              boxShadow: isOwnMessage
                                ? '0 4px 16px rgba(139, 185, 74, 0.25)'
                                : '0 2px 8px rgba(28, 97, 171, 0.1)',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                transform: 'translateY(-1px)',
                                boxShadow: isOwnMessage
                                  ? '0 6px 20px rgba(139, 185, 74, 0.3)'
                                  : '0 4px 12px rgba(28, 97, 171, 0.15)'
                              }
                            }}
                          >
                            {/* ✅ FIX: Use MessageContent to show images/videos/files */}
                            <MessageContent
                              message={message}
                              isEditing={false}
                              onSaveEdit={() => { }}
                              onCancelEdit={() => { }}
                            />
                          </Box>

                          {/* Timestamp - BALONCUĞUN DIŞINDA */}
                          <Typography variant="caption"
                            sx={{
                              opacity: 0.6,
                              fontSize: '10px',
                              color: '#718096',
                              alignSelf: isOwnMessage ? 'flex-end' : 'flex-start',
                              px: 0.5
                            }}
                          >
                            {new Date(message.created_at).toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {message.status && isOwnMessage && ` • ${message.status === 'sending' ? 'Gönderiliyor' : message.status === 'sent' ? 'İletildi' : ''}`}
                          </Typography>
                        </Box>
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
              {/* Otomatik scroll için referans */}
              <div ref={messagesEndRef} />
            </Box>

            <Divider sx={{ borderColor: 'rgba(28, 97, 171, 0.2)' }} />

            {/* Mesaj Giriş Alanı */}
            <Box sx={{
              p: 2,
              background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.05), rgba(139, 185, 74, 0.05))',
              backdropFilter: 'blur(10px)',
              borderTop: '1px solid rgba(28, 97, 171, 0.1)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  fullWidth
                  placeholder={isConnected ? "Mesajınızı yazın..." : "Bağlantı bekleniyor..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  variant="outlined"
                  size="small"
                  multiline
                  maxRows={3}
                  disabled={!isConnected}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      background: 'rgba(255, 255, 255, 0.9)',
                      borderRadius: '16px',
                      '& fieldset': {
                        borderColor: 'rgba(28, 97, 171, 0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(28, 97, 171, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#1c61ab',
                      },
                    },
                    '& .MuiOutlinedInput-input': {
                      padding: '12px 16px',
                    }
                  }}
                />

                <IconButton
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || !isConnected}
                  sx={{
                    background: (newMessage.trim() && isConnected)
                      ? 'linear-gradient(135deg, #1c61ab, #8bb94a)'
                      : 'rgba(0, 0, 0, 0.12)',
                    color: (newMessage.trim() && isConnected) ? 'white' : 'rgba(0, 0, 0, 0.26)',
                    '&:hover': {
                      background: (newMessage.trim() && isConnected)
                        ? 'linear-gradient(135deg, #8bb94a, #1c61ab)'
                        : 'rgba(0, 0, 0, 0.12)',
                      transform: (newMessage.trim() && isConnected) ? 'scale(1.05)' : 'none'
                    },
                    '&:disabled': {
                      background: 'rgba(0, 0, 0, 0.12)',
                      color: 'rgba(0, 0, 0, 0.26)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Send />
                </IconButton>
              </Box>
            </Box>
          </>
        ) : (
          /* Tab 1: Groups */
          <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {groups.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <GroupIcon sx={{ fontSize: 48, color: '#9ca3af', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  Henüz bir gruba dahil değilsiniz
                </Typography>
              </Box>
            ) : (
              <List>
                {groups.map((group) => (
                  <ListItem
                    key={group.id || group.room_id}
                    onClick={() => setSelectedGroup(group)}
                    sx={{
                      mb: 1,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: selectedGroup?.id === group.id
                        ? 'linear-gradient(135deg, rgba(28, 97, 171, 0.1), rgba(139, 185, 74, 0.1))'
                        : 'rgba(255, 255, 255, 0.9)',
                      border: '1px solid rgba(28, 97, 171, 0.1)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.05), rgba(139, 185, 74, 0.05))'
                      }
                    }}
                  >
                    <Avatar sx={{
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      mr: 2
                    }}>
                      <GroupIcon />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {group.room_name || group.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {group.member_count || group.memberCount || 0} üye
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}

            {/* Group Chat View - Coming Soon */}
            {selectedGroup && (
              <Box sx={{
                mt: 2,
                p: 3,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.05), rgba(139, 185, 74, 0.05))',
                border: '1px solid rgba(28, 97, 171, 0.1)',
                textAlign: 'center'
              }}>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {selectedGroup.room_name || selectedGroup.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Grup sohbeti özelliği yakında aktif olacaktır.
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* Incoming Call Notification */}
      <IncomingCallNotification
        callData={incomingCall}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      {/* Video Call Modal - Daily.co */}
      <VideoCallModal
        open={!!activeCall}
        onClose={handleEndCall}
        roomId={`applicant_${applicantInfo?.id}`}
        roomName={`${applicantInfo?.firstName} ${applicantInfo?.lastName}`}
        currentUserId={applicantInfo?.id}
        currentUserName={`${applicantInfo?.firstName} ${applicantInfo?.lastName}`}
        currentUserAvatar={null}
        currentUserEmail={applicantInfo?.email}
        participantId="admin"
        participantName="Insan Kaynaklari"
        participantAvatar={null}
        participantEmail="hr@optima.com"
        isModerator={false}
        dailyUrl={activeCall?.daily_url}
      />
    </Box>
  );
}

export default ApplicantChat;
