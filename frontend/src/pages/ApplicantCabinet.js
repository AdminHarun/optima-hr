// src/pages/ApplicantCabinet.js - Aday Kabini (Dashboard + Gomulu Chat)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import sessionManager from '../utils/sessionManager';
import webSocketService from '../services/webSocketService';
import MessageContent from '../components/chat/MessageContent';
import VideoCallModal from '../components/chat/VideoCallModal';
import { IncomingCallNotification } from '../components/videoCall';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  Divider,
  Alert,
  LinearProgress,
  TextField,
  IconButton,
  List,
  ListItem,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Snackbar
} from '@mui/material';
import {
  Chat as ChatIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as PendingIcon,
  Cancel as RejectedIcon,
  Refresh as RefreshIcon,
  ExitToApp as LogoutIcon,
  LockClock as LockClockIcon,
  Send as SendIcon,
  Dashboard as DashboardIcon,
  ArrowBack as ArrowBackIcon,
  ContentCopy as CopyIcon,
  Link as LinkIcon,
  Warning as WarningIcon,
  Email as EmailIcon,
  Add as AddIcon,
  Replay as ReplayIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:9000';

// Profili tum site-specific key'lerde ara
const findProfileAcrossSites = (profileId) => {
  const siteCodes = (() => {
    try {
      const sites = JSON.parse(localStorage.getItem('sites') || '[]');
      if (sites.length > 0) return sites.map(s => s.code);
    } catch (e) {}
    return ['FXB', 'MTD', 'ZBH'];
  })();
  for (const siteCode of siteCodes) {
    const profiles = JSON.parse(localStorage.getItem(`user_profiles_${siteCode}`) || '[]');
    const found = profiles.find(p => String(p.id) === String(profileId));
    if (found) return { profile: found, siteCode };
  }
  const legacyProfiles = JSON.parse(localStorage.getItem('user_profiles') || '[]');
  const found = legacyProfiles.find(p => String(p.id) === String(profileId));
  if (found) return { profile: found, siteCode: null };
  return null;
};

const findApplicationAcrossSites = (profileId) => {
  const siteCodes = (() => {
    try {
      const sites = JSON.parse(localStorage.getItem('sites') || '[]');
      if (sites.length > 0) return sites.map(s => s.code);
    } catch (e) {}
    return ['FXB', 'MTD', 'ZBH'];
  })();
  for (const siteCode of siteCodes) {
    const apps = JSON.parse(localStorage.getItem(`applications_${siteCode}`) || '[]');
    const found = apps.find(a => String(a.profileId) === String(profileId) || a.email === profileId);
    if (found) return { application: found, siteCode };
  }
  const legacyApps = JSON.parse(localStorage.getItem('applications') || '[]');
  const found = legacyApps.find(a => String(a.profileId) === String(profileId) || a.email === profileId);
  if (found) return { application: found, siteCode: null };
  return null;
};

const STATUS_CONFIG = {
  submitted: { label: 'Form Gonderildi', color: '#1976d2', icon: <AssignmentIcon />, bgColor: '#e3f2fd' },
  form_completed: { label: 'Form Gonderildi', color: '#1976d2', icon: <AssignmentIcon />, bgColor: '#e3f2fd' },
  in_review: { label: 'Inceleniyor', color: '#f57c00', icon: <PendingIcon />, bgColor: '#fff3e0' },
  under_review: { label: 'Inceleniyor', color: '#f57c00', icon: <PendingIcon />, bgColor: '#fff3e0' },
  interview_scheduled: { label: 'Mulakat Planlandi', color: '#7b1fa2', icon: <TimeIcon />, bgColor: '#f3e5f5' },
  approved: { label: 'Onaylandi', color: '#2e7d32', icon: <CheckCircleIcon />, bgColor: '#e8f5e9' },
  hired: { label: 'Ise Alindi', color: '#2e7d32', icon: <CheckCircleIcon />, bgColor: '#e8f5e9' },
  rejected: { label: 'Reddedildi', color: '#c62828', icon: <RejectedIcon />, bgColor: '#ffebee' },
  pending: { label: 'Beklemede', color: '#f57c00', icon: <PendingIcon />, bgColor: '#fff3e0' },
};

function ApplicantCabinet() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [applicantInfo, setApplicantInfo] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const wsCleanupRef = useRef(null);
  const typingPreviewDebounceRef = useRef(null); // Debounce for typing preview

  // Video call state
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  // Logout dialog state
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [copySnackbar, setCopySnackbar] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    if (!sessionManager.hasActiveSession()) {
      setSessionExpired(true);
      setLoading(false);
      return;
    }

    const session = sessionManager.getCurrentSession();
    if (!session?.profileId) {
      setSessionExpired(true);
      setLoading(false);
      return;
    }

    // Profili localStorage'dan al (kisisel bilgiler icin)
    const profileResult = findProfileAcrossSites(session.profileId);
    if (profileResult) {
      setProfile(profileResult.profile);
    }

    // Basvuru durumunu API'den al (guncel status icin)
    try {
      const response = await fetch(`${API_BASE_URL}/api/applications/by-profile/${session.profileId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const appData = await response.json();
        setApplication(appData);
      } else {
        // API'den alinamazsa localStorage'dan dene
        const appResult = findApplicationAcrossSites(session.profileId) ||
                          findApplicationAcrossSites(session.email);
        if (appResult) {
          setApplication(appResult.application);
        }
      }
    } catch (error) {
      console.warn('API baglantisi basarisiz, localStorage kullaniliyor:', error);
      // Fallback: localStorage
      const appResult = findApplicationAcrossSites(session.profileId) ||
                        findApplicationAcrossSites(session.email);
      if (appResult) {
        setApplication(appResult.application);
      }
    }

    setLoading(false);
  };

  // ======================== CHAT LOGIC ========================

  const scrollToBottom = useCallback((instant = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      setTimeout(() => scrollToBottom(true), 50);
    } else if (messages.length > prevMessageCountRef.current) {
      scrollToBottom(false);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Application yuklendikten sonra applicantInfo'yu ve WebSocket baglantisinı baslat
  // Video call bildirimleri tum sayfalarda calisacak
  useEffect(() => {
    if (!application?.chatToken) return;

    const initApplicantInfo = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/applications/chat/${application.chatToken}`, {
          credentials: 'include'
        });

        if (!response.ok) throw new Error('Applicant info yuklenemedi');

        const profileData = await response.json();
        setApplicantInfo(profileData);
      } catch (err) {
        console.error('Applicant info yuklenemedi:', err);
      }
    };

    initApplicantInfo();
  }, [application?.chatToken]);

  // Chat sekmesine gecildiginde mesajlari yukle
  useEffect(() => {
    if (activeTab !== 1 || !applicantInfo?.id) return;

    setChatLoading(true);
    setChatError(null);
    loadMessages();
  }, [activeTab, applicantInfo?.id]);

  // applicantInfo geldiginde WebSocket baglan (tum sekmeler icin - video call bildirimleri)
  useEffect(() => {
    if (!applicantInfo?.id) return;

    const roomId = `applicant_${applicantInfo.id}`;
    const wsUrl = `${WS_BASE_URL}/ws/applicant-chat/${roomId}`;
    webSocketService.connect(wsUrl, 'applicant');

    const unsubConnection = webSocketService.onConnection((event) => {
      if (event.type === 'connected') {
        setIsConnected(true);
        setChatError(null);
        // Sadece chat sekmesindeyse mesajlari yukle
        if (activeTab === 1) {
          loadMessages();
        }
      } else if (event.type === 'disconnected') {
        setIsConnected(false);
      } else if (event.type === 'reconnecting') {
        console.log(`🔄 Yeniden baglaniliyor... (${event.attempt}/${event.maxAttempts})`);
      }
    });

    const unsubMessage = webSocketService.onMessage((data) => {
      handleIncomingMessage(data);
    });

    wsCleanupRef.current = () => {
      unsubConnection();
      unsubMessage();
    };

    // Component unmount oldugunda baglantıyı kes
    return () => {
      unsubConnection();
      unsubMessage();
      webSocketService.disconnect();
      setMessages([]);
    };
  }, [applicantInfo?.id]);

  const loadMessages = async () => {
    if (!applicantInfo?.id) return;
    try {
      const roomId = `applicant_${applicantInfo.id}`;
      const response = await fetch(`${API_BASE_URL}/chat/api/rooms/${roomId}/messages`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Mesajlar yuklenemedi');
      const data = await response.json();
      setMessages(data.messages || []);
      setChatLoading(false);
    } catch (err) {
      setChatError('Mesajlar yuklenemedi');
      setChatLoading(false);
    }
  };

  const handleIncomingMessage = useCallback((data) => {
    switch (data.type) {
      case 'chat_message': {
        const msg = data.message;
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id || m.message_id === msg.message_id)) return prev;
          return [...prev, msg];
        });
        break;
      }
      case 'message_status':
        setMessages(prev => prev.map(m =>
          (m.id === data.message_id || m.message_id === data.message_id) ? { ...m, status: data.status } : m
        ));
        break;
      case 'video_call_incoming':
        setIncomingCall({ call_id: data.call_id, caller_name: data.caller_name, caller_type: data.caller_type, room_id: data.room_id });
        break;
      case 'video_call_ready':
        setActiveCall({ call_id: data.call_id, daily_url: data.daily_url, room_name: data.room_name });
        setIncomingCall(null);
        break;
      case 'video_call_ended':
        setActiveCall(null);
        setIncomingCall(null);
        break;
      case 'video_call_expired':
        setIncomingCall(null);
        setActiveCall(null);
        break;
      default:
        break;
    }
  }, []);

  const sendMessage = () => {
    if (!newMessage.trim() || !isConnected) return;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const success = webSocketService.sendMessage(newMessage.trim(), messageId);
    if (!success) return;

    const optimistic = {
      id: messageId,
      message_id: messageId,
      content: newMessage.trim(),
      sender_type: 'applicant',
      sender_name: `${applicantInfo?.firstName || ''} ${applicantInfo?.lastName || ''}`.trim(),
      created_at: new Date().toISOString(),
      reactions: [],
      status: 'sending',
      is_own_message: true
    };
    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');

    // Clear typing preview when message is sent
    webSocketService.sendTypingPreview('');

    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, status: 'sent' } : m));
    }, 500);
  };

  // Video call handlers
  const handleAcceptCall = useCallback((callId, preferences = { mic: true, cam: true }) => {
    const ws = webSocketService.getConnection();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'video_call_response', call_id: callId, action: 'accept',
        participant_name: `${applicantInfo?.firstName || ''} ${applicantInfo?.lastName || ''}`.trim(),
        preferences
      }));
    }
  }, [applicantInfo]);

  const handleRejectCall = useCallback((callId) => {
    const ws = webSocketService.getConnection();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'video_call_response', call_id: callId, action: 'reject',
        participant_name: `${applicantInfo?.firstName || ''} ${applicantInfo?.lastName || ''}`.trim()
      }));
    }
    setIncomingCall(null);
  }, [applicantInfo]);

  const handleEndCall = useCallback(() => {
    if (activeCall && applicantInfo?.id) {
      const ws = webSocketService.getConnection();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'video_call_end', call_id: activeCall.call_id, room_id: `applicant_${applicantInfo.id}` }));
      }
      setActiveCall(null);
    }
  }, [activeCall, applicantInfo]);

  // ======================== NAVIGATION ========================

  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  const handleLogoutConfirm = () => {
    setLogoutDialogOpen(false);
    sessionManager.clearSession();
    navigate('/applicant-login');
  };

  const copyLoginInfo = () => {
    const loginUrl = `${window.location.origin}/applicant-login`;
    const info = `Optima HR - Aday Paneli Giris Bilgileri\n\nGiris Adresi: ${loginUrl}\nEmail: ${profile?.email || session?.email || '-'}\n\nNot: Sifreniz veya guvenlik sorunuz ile giris yapabilirsiniz.`;
    navigator.clipboard.writeText(info);
    setCopySnackbar(true);
  };

  const copyLoginLink = () => {
    const loginUrl = `${window.location.origin}/applicant-login`;
    navigator.clipboard.writeText(loginUrl);
    setCopySnackbar(true);
  };

  // ======================== RENDER ========================

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
        <LinearProgress sx={{ width: 200 }} />
      </Box>
    );
  }

  if (sessionExpired) {
    return (
      <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
        <Container maxWidth="sm">
          <Paper sx={{ borderRadius: 4, p: 5, textAlign: 'center', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
            <LockClockIcon sx={{ fontSize: 64, color: '#f57c00', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>Oturum Suresi Doldu</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Guvenliginiz icin oturumunuz sonlandirildi. Panele erismeye devam etmek icin tekrar giris yapin.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/applicant-login')}
              sx={{
                borderRadius: '12px', textTransform: 'none', fontWeight: 700, px: 4, py: 1.2,
                background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                '&:hover': { background: 'linear-gradient(135deg, #8bb94a, #1c61ab)' }
              }}>
              Giris Yap
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  const session = sessionManager.getCurrentSession();
  const sessionDuration = session?.loginTime
    ? Math.round((Date.now() - new Date(session.loginTime).getTime()) / 60000)
    : 0;
  const statusConfig = STATUS_CONFIG[application?.status] || STATUS_CONFIG.pending;
  const hasChatAccess = !!application?.chatToken;

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', py: 3 }}>
      <Container maxWidth="md">
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 48, height: 48, background: 'linear-gradient(135deg, #1c61ab, #8bb94a)', fontSize: '1.1rem', fontWeight: 700 }}>
              {profile?.firstName?.charAt(0)}{profile?.lastName?.charAt(0)}
            </Avatar>
            <Box>
              <Typography sx={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700 }}>
                {profile?.firstName || 'Aday'} {profile?.lastName || ''}
              </Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{profile?.email}</Typography>
            </Box>
          </Box>
          <Button variant="outlined" startIcon={<LogoutIcon />} onClick={handleLogoutClick}
            sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)', textTransform: 'none', '&:hover': { borderColor: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)' } }}>
            Cikis
          </Button>
        </Box>

        {/* Tabs */}
        <Paper sx={{ borderRadius: '16px 16px 0 0', background: 'rgba(255,255,255,0.95)', overflow: 'hidden' }}>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}
            sx={{
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none', fontSize: '0.95rem', minHeight: 52 },
              '& .Mui-selected': { color: '#1c61ab' },
              '& .MuiTabs-indicator': { background: 'linear-gradient(90deg, #1c61ab, #8bb94a)', height: 3 }
            }}>
            <Tab icon={<DashboardIcon sx={{ fontSize: 20 }} />} iconPosition="start" label="Pano" />
            <Tab icon={<ChatIcon sx={{ fontSize: 20 }} />} iconPosition="start"
              label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>Mesajlasma{!hasChatAccess && <Chip size="small" label="Pasif" sx={{ fontSize: '0.65rem', height: 18, opacity: 0.6 }} />}</Box>}
              disabled={!hasChatAccess}
            />
          </Tabs>
        </Paper>

        {/* Tab Content */}
        {activeTab === 0 && (
          <Paper sx={{ borderRadius: '0 0 16px 16px', p: 3, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)' }}>
            {/* Basvuru Durumu */}
            <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#333', mb: 2 }}>Basvuru Durumu</Typography>
            {application ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: statusConfig.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: statusConfig.color }}>
                    {statusConfig.icon}
                  </Box>
                  <Box>
                    <Chip label={statusConfig.label} sx={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color, fontWeight: 700, fontSize: '0.9rem' }} />
                    <Typography sx={{ color: '#999', fontSize: '0.8rem', mt: 0.5 }}>
                      Son guncelleme: {application.submittedAt ? new Date(application.submittedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </Typography>
                  </Box>
                </Box>

                {/* Ilerleme Cubugu */}
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    {['Form', 'Inceleme', 'Mulakat', 'Sonuc'].map((step, i) => {
                      const stepStatuses = [['submitted', 'form_completed'], ['in_review', 'under_review'], ['interview_scheduled'], ['approved', 'hired', 'rejected']];
                      const currentIndex = stepStatuses.findIndex(s => s.includes(application.status));
                      const isActive = i <= currentIndex;
                      return (
                        <Typography key={step} sx={{ fontSize: '0.75rem', color: isActive ? '#1c61ab' : '#ccc', fontWeight: isActive ? 700 : 400 }}>{step}</Typography>
                      );
                    })}
                  </Box>
                  <LinearProgress variant="determinate"
                    value={(() => {
                      const order = ['submitted', 'form_completed', 'in_review', 'under_review', 'interview_scheduled', 'approved', 'hired'];
                      let idx = order.indexOf(application.status);
                      if (application.status === 'rejected') return 100;
                      // submitted ve form_completed ayni asama
                      if (idx === 0 || idx === 1) idx = 0;
                      // in_review ve under_review ayni asama
                      else if (idx === 2 || idx === 3) idx = 1;
                      // interview_scheduled
                      else if (idx === 4) idx = 2;
                      // approved ve hired
                      else if (idx === 5 || idx === 6) idx = 3;
                      return idx >= 0 ? ((idx + 1) / 4) * 100 : 25;
                    })()}
                    sx={{ height: 8, borderRadius: 4, backgroundColor: '#e0e0e0', '& .MuiLinearProgress-bar': { background: application.status === 'rejected' ? '#c62828' : 'linear-gradient(135deg, #1c61ab, #8bb94a)', borderRadius: 4 } }}
                  />
                </Box>

                {application.status === 'rejected' && (
                  <Box sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, rgba(198, 40, 40, 0.08), rgba(198, 40, 40, 0.03))',
                    border: '1px solid rgba(198, 40, 40, 0.2)'
                  }}>
                    <Typography sx={{ color: '#c62828', fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RejectedIcon sx={{ fontSize: 20 }} />
                      Basvurunuz Reddedildi
                    </Typography>
                    {application.rejectReason ? (
                      <Box sx={{ mt: 1 }}>
                        <Typography sx={{ color: '#666', fontSize: '0.85rem', fontWeight: 600, mb: 0.5 }}>
                          Red Gerekcesi:
                        </Typography>
                        <Typography sx={{
                          color: '#333',
                          fontSize: '0.9rem',
                          p: 1.5,
                          bgcolor: 'rgba(255,255,255,0.8)',
                          borderRadius: 2,
                          border: '1px solid rgba(198, 40, 40, 0.1)'
                        }}>
                          {application.rejectReason}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography sx={{ color: '#999', fontSize: '0.85rem', fontStyle: 'italic' }}>
                        Red gerekcesi belirtilmemis.
                      </Typography>
                    )}
                    <Typography sx={{ color: '#999', fontSize: '0.75rem', mt: 1.5 }}>
                      Sorulariniz icin IK ekibi ile iletisime gecebilirsiniz.
                    </Typography>
                  </Box>
                )}
              </Box>
            ) : (
              <Alert severity="info" sx={{ borderRadius: 2 }}>Henuz basvuru formu gonderilmemis.</Alert>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Hizli Erisim */}
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Card sx={{ borderRadius: 3, background: hasChatAccess ? 'linear-gradient(135deg, rgba(28,97,171,0.05), rgba(139,185,74,0.05))' : '#f5f5f5', cursor: hasChatAccess ? 'pointer' : 'default', opacity: hasChatAccess ? 1 : 0.5, transition: 'transform 0.2s', '&:hover': hasChatAccess ? { transform: 'translateY(-4px)' } : {} }}
                  onClick={hasChatAccess ? () => setActiveTab(1) : undefined}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <ChatIcon sx={{ fontSize: 40, color: '#1c61ab', mb: 1 }} />
                    <Typography sx={{ fontWeight: 700, color: '#333' }}>Canli Destek</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#999', mt: 0.5 }}>
                      {hasChatAccess ? 'IK ile mesajlasin' : 'Form gonderdikten sonra aktif'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card sx={{ borderRadius: 3, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }} onClick={loadData}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <RefreshIcon sx={{ fontSize: 40, color: '#f57c00', mb: 1 }} />
                    <Typography sx={{ fontWeight: 700, color: '#333' }}>Yenile</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#999', mt: 0.5 }}>Durumu guncelle</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card sx={{ borderRadius: 3, background: '#f5f5f5' }}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <TimeIcon sx={{ fontSize: 40, color: '#999', mb: 1 }} />
                    <Typography sx={{ fontWeight: 700, color: '#333' }}>Oturum</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#999', mt: 0.5 }}>
                      {Math.floor(sessionDuration / 60)}s {sessionDuration % 60}dk
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Yeni Basvuru Talebi - Sadece reddedilmis basvurular icin */}
            {application?.status === 'rejected' && (
              <>
                <Divider sx={{ my: 3 }} />
                <Box sx={{
                  p: 2.5,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.05), rgba(139, 185, 74, 0.03))',
                  border: '1px solid rgba(28, 97, 171, 0.1)'
                }}>
                  <Typography sx={{ fontWeight: 700, color: '#333', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ReplayIcon sx={{ color: '#1c61ab' }} />
                    Tekrar Basvurmak Ister misiniz?
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', color: '#666', mb: 2 }}>
                    Basvurunuz reddedilmis olsa bile, eksikliklerinizi giderdikten sonra yeni bir basvuru yapabilirsiniz.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<ChatIcon />}
                    onClick={() => setActiveTab(1)}
                    disabled={!hasChatAccess}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                      '&:hover': { background: 'linear-gradient(135deg, #8bb94a, #1c61ab)' }
                    }}
                  >
                    IK ile Iletisime Gec
                  </Button>
                </Box>
              </>
            )}

            {/* Giris Bilgileri */}
            <Divider sx={{ my: 3 }} />
            <Box sx={{
              p: 2.5,
              borderRadius: 3,
              background: 'rgba(0,0,0,0.02)',
              border: '1px solid rgba(0,0,0,0.06)'
            }}>
              <Typography sx={{ fontWeight: 700, color: '#333', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinkIcon sx={{ color: '#1c61ab' }} />
                Tekrar Giris Icin Bilgileriniz
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                  <Typography sx={{ color: '#666', fontSize: '0.85rem' }}>Giris Adresi:</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#1c61ab' }}>
                      {window.location.origin}/applicant-login
                    </Typography>
                    <Tooltip title="Linki Kopyala">
                      <IconButton size="small" onClick={copyLoginLink} sx={{ color: '#1c61ab' }}>
                        <CopyIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ color: '#666', fontSize: '0.85rem' }}>Email:</Typography>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {profile?.email || session?.email || '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography sx={{ color: '#666', fontSize: '0.85rem' }}>Giris Yontemi:</Typography>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>
                    Sifre veya Guvenlik Sorusu
                  </Typography>
                </Box>
              </Box>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<CopyIcon />}
                onClick={copyLoginInfo}
                sx={{
                  textTransform: 'none',
                  borderRadius: 2,
                  borderColor: 'rgba(28, 97, 171, 0.3)',
                  color: '#1c61ab',
                  '&:hover': { borderColor: '#1c61ab', bgcolor: 'rgba(28, 97, 171, 0.04)' }
                }}
              >
                Tum Bilgileri Kopyala
              </Button>

              <Alert severity="info" sx={{ mt: 2, borderRadius: 2, bgcolor: 'rgba(28, 97, 171, 0.04)' }}>
                <Typography sx={{ fontSize: '0.8rem' }}>
                  Bu bilgileri guvenli bir yere kaydedin. Panele tekrar giris yapmak icin ihtiyaciniz olacak.
                </Typography>
              </Alert>
            </Box>
          </Paper>
        )}

        {/* CHAT TAB */}
        {activeTab === 1 && (
          <Paper sx={{ borderRadius: '0 0 16px 16px', background: 'rgba(255,255,255,0.95)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
            {/* Chat Header */}
            <Box sx={{ p: 2, background: 'linear-gradient(135deg, rgba(28,97,171,0.08), rgba(139,185,74,0.08))', borderBottom: '1px solid rgba(28,97,171,0.15)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 36, height: 36, background: 'linear-gradient(135deg, #1c61ab, #8bb94a)', fontSize: '0.8rem' }}>IK</Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, color: '#1c61ab', fontSize: '0.95rem' }}>Insan Kaynaklari</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: isConnected ? '#8bb94a' : '#999' }}>
                  {chatLoading ? 'Baglaniyor...' : isConnected ? 'Bagli' : 'Baglanti bekleniyor...'}
                </Typography>
              </Box>
              <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => setActiveTab(0)}
                sx={{ color: '#1c61ab', textTransform: 'none', '&:hover': { background: 'rgba(28,97,171,0.08)' } }}>
                Panoya Don
              </Button>
            </Box>

            {chatError && <Alert severity="warning" sx={{ m: 1, borderRadius: 2 }}>{chatError}</Alert>}

            {chatLoading ? (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LinearProgress sx={{ width: 120 }} />
              </Box>
            ) : (
              <>
                {/* Mesaj Listesi */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column' }}>
                  {messages.length === 0 && !chatLoading && (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>Henuz mesaj yok. IK ekibine bir mesaj gonderin.</Typography>
                    </Box>
                  )}
                  <List sx={{ py: 0, display: 'flex', flexDirection: 'column' }}>
                    {messages.map((message) => {
                      const isOwn = message.sender_type === 'applicant';
                      return (
                        <ListItem key={message.id || message.message_id}
                          sx={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', px: 1, py: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', maxWidth: '80%', flexDirection: isOwn ? 'row-reverse' : 'row', gap: 1 }}>
                            <Avatar sx={{ width: 28, height: 28, fontSize: '11px',
                              background: isOwn ? 'linear-gradient(135deg, #8bb94a, #a4d65e)' : 'linear-gradient(135deg, #1c61ab, #4a9eff)' }}>
                              {isOwn ? `${applicantInfo?.firstName?.[0] || ''}${applicantInfo?.lastName?.[0] || ''}`.toUpperCase() : 'IK'}
                            </Avatar>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                              <Box sx={{
                                background: isOwn ? 'linear-gradient(135deg, #8bb94a, #a4d65e)' : 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(233,240,247,0.9))',
                                color: isOwn ? 'white' : 'black',
                                p: 1.5, borderRadius: '14px',
                                borderTopLeftRadius: !isOwn ? '4px' : '14px',
                                borderTopRightRadius: isOwn ? '4px' : '14px',
                                wordBreak: 'break-word',
                                border: isOwn ? 'none' : '1px solid rgba(28,97,171,0.15)',
                                boxShadow: isOwn ? '0 2px 8px rgba(139,185,74,0.2)' : '0 1px 4px rgba(28,97,171,0.08)'
                              }}>
                                <MessageContent message={message} isEditing={false} onSaveEdit={() => {}} onCancelEdit={() => {}} />
                              </Box>
                              <Typography variant="caption" sx={{ opacity: 0.5, fontSize: '10px', color: '#718096', alignSelf: isOwn ? 'flex-end' : 'flex-start', px: 0.5 }}>
                                {new Date(message.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                {message.status && isOwn && ` • ${message.status === 'sending' ? 'Gonderiliyor' : message.status === 'sent' ? 'Iletildi' : message.status === 'read' ? 'Okundu' : ''}`}
                              </Typography>
                            </Box>
                          </Box>
                        </ListItem>
                      );
                    })}
                  </List>
                  <div ref={messagesEndRef} />
                </Box>

                {/* Mesaj Giris */}
                <Box sx={{ p: 1.5, borderTop: '1px solid rgba(28,97,171,0.1)', background: 'rgba(28,97,171,0.02)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField fullWidth placeholder={isConnected ? 'Mesajinizi yazin...' : 'Baglanti bekleniyor...'}
                      value={newMessage} onChange={(e) => {
                        const value = e.target.value;
                        setNewMessage(value);
                        // Live typing preview - admin gorebilir (debounced)
                        if (isConnected) {
                          // Debounce: 150ms bekle, surekli mesaj gondermeyi engelle
                          if (typingPreviewDebounceRef.current) {
                            clearTimeout(typingPreviewDebounceRef.current);
                          }
                          typingPreviewDebounceRef.current = setTimeout(() => {
                            webSocketService.sendTypingPreview(value);
                          }, 150);
                        }
                      }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      variant="outlined" size="small" multiline maxRows={3} disabled={!isConnected}
                      sx={{
                        '& .MuiOutlinedInput-root': { background: '#fff', borderRadius: '14px',
                          '& fieldset': { borderColor: 'rgba(28,97,171,0.2)' },
                          '&:hover fieldset': { borderColor: 'rgba(28,97,171,0.4)' },
                          '&.Mui-focused fieldset': { borderColor: '#1c61ab' }
                        }
                      }}
                    />
                    <IconButton onClick={sendMessage} disabled={!newMessage.trim() || !isConnected}
                      sx={{
                        background: (newMessage.trim() && isConnected) ? 'linear-gradient(135deg, #1c61ab, #8bb94a)' : 'rgba(0,0,0,0.08)',
                        color: (newMessage.trim() && isConnected) ? 'white' : 'rgba(0,0,0,0.26)',
                        '&:hover': { background: (newMessage.trim() && isConnected) ? 'linear-gradient(135deg, #8bb94a, #1c61ab)' : 'rgba(0,0,0,0.08)' }
                      }}>
                      <SendIcon />
                    </IconButton>
                  </Box>
                </Box>
              </>
            )}
          </Paper>
        )}
      </Container>

      {/* Video Call Components */}
      <IncomingCallNotification callData={incomingCall} onAccept={handleAcceptCall} onReject={handleRejectCall} />
      <VideoCallModal
        open={!!activeCall}
        onClose={handleEndCall}
        roomId={`applicant_${applicantInfo?.id}`}
        roomName={`${applicantInfo?.firstName || ''} ${applicantInfo?.lastName || ''}`}
        currentUserId={applicantInfo?.id}
        currentUserName={`${applicantInfo?.firstName || ''} ${applicantInfo?.lastName || ''}`}
        currentUserAvatar={null}
        currentUserEmail={applicantInfo?.email}
        participantId="admin"
        participantName="Insan Kaynaklari"
        participantAvatar={null}
        participantEmail="hr@optima.com"
        isModerator={false}
        dailyUrl={activeCall?.daily_url}
      />

      {/* Cikis Onay Dialogu */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
          <WarningIcon sx={{ color: '#f57c00', fontSize: 28 }} />
          <Typography variant="h6" fontWeight={700}>Cikis Yapmak Uzeresiniz</Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Giris bilgilerinizi kaydettiniz mi?
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Panele tekrar erisebilmek icin asagidaki bilgilere ihtiyaciniz olacak.
            </Typography>
          </Alert>

          <Paper sx={{ p: 2, bgcolor: 'rgba(28, 97, 171, 0.04)', borderRadius: 2, border: '1px solid rgba(28, 97, 171, 0.1)' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, color: '#1c61ab', display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinkIcon sx={{ fontSize: 18 }} />
              Giris Bilgileriniz
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Giris Adresi:</Typography>
                <Typography variant="body2" fontWeight={500} sx={{ fontFamily: 'monospace', color: '#1c61ab' }}>
                  {window.location.origin}/applicant-login
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Email:</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {profile?.email || session?.email || '-'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">Giris Yontemi:</Typography>
                <Typography variant="body2" fontWeight={500}>Sifre veya Guvenlik Sorusu</Typography>
              </Box>
            </Box>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<CopyIcon />}
              onClick={copyLoginInfo}
              sx={{ mt: 2, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Giris Bilgilerini Kopyala
            </Button>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1, gap: 1 }}>
          <Button
            onClick={() => setLogoutDialogOpen(false)}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Iptal
          </Button>
          <Button
            variant="contained"
            onClick={handleLogoutConfirm}
            startIcon={<LogoutIcon />}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              bgcolor: '#c62828',
              '&:hover': { bgcolor: '#b71c1c' }
            }}
          >
            Evet, Cikis Yap
          </Button>
        </DialogActions>
      </Dialog>

      {/* Kopyalama Snackbar */}
      <Snackbar
        open={copySnackbar}
        autoHideDuration={3000}
        onClose={() => setCopySnackbar(false)}
        message="Bilgiler panoya kopyalandi!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

export default ApplicantCabinet;
