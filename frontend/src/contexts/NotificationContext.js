// NotificationContext.js - Global bildirim sistemi (Backend API polling)
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, IconButton, Paper, Slide } from '@mui/material';
import {
  Close as CloseIcon,
  Chat as ChatIcon,
  Description as FormIcon,
  Person as ProfileIcon
} from '@mui/icons-material';
import notificationService from '../services/notificationService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';
const STORAGE_KEY = 'optima_notifications_state';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

// Bildirimleri localStorage'dan yükle
const loadNotificationState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load notification state:', e);
  }
  return { readIds: [], lastSeenApplicationId: 0, lastSeenProfileId: 0 };
};

// Bildirimleri localStorage'a kaydet
const saveNotificationState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save notification state:', e);
  }
};

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [notificationState, setNotificationState] = useState(loadNotificationState);
  const prevCountRef = useRef(0);
  const prevRoomsRef = useRef({});
  const prevApplicationCountRef = useRef(0);
  const prevProfileCountRef = useRef(0);
  const pollIntervalRef = useRef(null);
  const isFirstPollRef = useRef(true);

  const removeToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  }, []);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = { id, ...toast };
    setToasts(prev => [...prev.slice(-4), newToast]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  const markAsRead = useCallback((notificationId = null) => {
    if (notificationId) {
      // Tek bir bildirimi okundu işaretle
      setNotificationState(prev => {
        const newState = {
          ...prev,
          readIds: [...new Set([...prev.readIds, notificationId])]
        };
        saveNotificationState(newState);
        return newState;
      });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } else {
      // Tüm bildirimleri okundu işaretle
      setNotificationState(prev => {
        const allIds = notifications.map(n => n.id);
        const newState = {
          ...prev,
          readIds: [...new Set([...prev.readIds, ...allIds])]
        };
        saveNotificationState(newState);
        return newState;
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      prevCountRef.current = 0;
      prevRoomsRef.current = {};
    }
  }, [notifications]);

  const checkForNewMessages = useCallback(async () => {
    try {
      const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
      const allNotifications = [];
      let chatUnread = 0;

      // 1. Chat mesajlarını kontrol et
      try {
        const chatResponse = await fetch(`${API_BASE_URL}/chat/api/rooms/applicant_rooms/`, {
          credentials: 'include',
          headers: { 'X-Site-Id': currentSite }
        });

        if (chatResponse.ok) {
          const rooms = await chatResponse.json();
          const currentRooms = {};

          rooms.forEach(room => {
            const count = room.unread_count || 0;
            chatUnread += count;
            currentRooms[room.room_id] = {
              unread: count,
              name: room.applicant_name || room.applicant_email || 'Aday',
              lastMessage: room.last_message?.content || ''
            };

            // Her oda için bildirim oluştur (okunmamış mesaj varsa)
            if (count > 0 && room.last_message) {
              allNotifications.push({
                id: `chat_${room.room_id}_${room.last_message.created_at}`,
                type: 'chat',
                title: room.applicant_name || 'Yeni Mesaj',
                message: room.last_message.content?.substring(0, 100) || 'Yeni mesaj',
                timestamp: new Date(room.last_message.created_at),
                link: `/admin/chat`,
                read: notificationState.readIds.includes(`chat_${room.room_id}_${room.last_message.created_at}`),
                roomId: room.room_id
              });
            }
          });

          // Yeni mesaj bildirimi (ilk yüklemede değilse)
          if (!isFirstPollRef.current && chatUnread > prevCountRef.current) {
            Object.entries(currentRooms).forEach(([roomId, info]) => {
              const prev = prevRoomsRef.current[roomId]?.unread || 0;
              if (info.unread > prev) {
                notificationService.playMessageSound();
                addToast({
                  senderName: info.name,
                  message: info.lastMessage?.substring(0, 80) || 'Yeni mesaj',
                  type: 'chat',
                });
              }
            });
          }

          prevRoomsRef.current = currentRooms;
        }
      } catch (e) {
        // Chat API hatası - sessizce devam et
      }

      // 2. Yeni başvuruları kontrol et
      try {
        const appResponse = await fetch(`${API_BASE_URL}/api/applications?status=pending&limit=10`, {
          credentials: 'include',
          headers: { 'X-Site-Id': currentSite }
        });

        if (appResponse.ok) {
          const appData = await appResponse.json();
          const applications = appData.applications || appData || [];

          // Son 24 saat içindeki başvurular
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

          applications.forEach(app => {
            const appDate = new Date(app.created_at || app.submittedAt);
            if (appDate > dayAgo) {
              const notifId = `app_${app.id}`;
              allNotifications.push({
                id: notifId,
                type: 'application',
                title: 'Yeni Başvuru',
                message: `${app.first_name || app.firstName} ${app.last_name || app.lastName} adlı kişiden yeni başvuru`,
                timestamp: appDate,
                link: `/admin/applications/${app.id}`,
                read: notificationState.readIds.includes(notifId),
                applicationId: app.id
              });
            }
          });

          // Yeni başvuru bildirimi
          if (!isFirstPollRef.current && applications.length > prevApplicationCountRef.current) {
            const newApp = applications[0];
            if (newApp) {
              notificationService.playMessageSound();
              addToast({
                senderName: 'Yeni Başvuru',
                message: `${newApp.first_name || newApp.firstName} ${newApp.last_name || newApp.lastName}`,
                type: 'application',
              });
            }
          }

          prevApplicationCountRef.current = applications.length;
        }
      } catch (e) {
        // Applications API hatası - sessizce devam et
      }

      // 3. Yeni profilleri kontrol et
      try {
        const profileResponse = await fetch(`${API_BASE_URL}/api/applications/profiles?limit=10`, {
          credentials: 'include',
          headers: { 'X-Site-Id': currentSite }
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          const profiles = profileData.profiles || profileData || [];

          // Son 24 saat içindeki profiller
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

          profiles.forEach(profile => {
            const profileDate = new Date(profile.created_at);
            if (profileDate > dayAgo) {
              const notifId = `profile_${profile.id}`;
              allNotifications.push({
                id: notifId,
                type: 'profile',
                title: 'Yeni Profil',
                message: `${profile.first_name} ${profile.last_name} profili oluşturuldu`,
                timestamp: profileDate,
                link: `/admin/profiles/${profile.id}`,
                read: notificationState.readIds.includes(notifId),
                profileId: profile.id
              });
            }
          });

          // Yeni profil bildirimi
          if (!isFirstPollRef.current && profiles.length > prevProfileCountRef.current) {
            const newProfile = profiles[0];
            if (newProfile) {
              addToast({
                senderName: 'Yeni Profil',
                message: `${newProfile.first_name} ${newProfile.last_name}`,
                type: 'profile',
              });
            }
          }

          prevProfileCountRef.current = profiles.length;
        }
      } catch (e) {
        // Profiles API hatası - sessizce devam et
      }

      // Bildirimleri timestamp'e göre sırala
      allNotifications.sort((a, b) => b.timestamp - a.timestamp);

      // State güncelle
      setNotifications(allNotifications.slice(0, 20)); // Son 20 bildirim

      // Okunmamış sayısını hesapla
      const totalUnread = allNotifications.filter(n => !n.read).length;
      setUnreadCount(totalUnread);

      if (isFirstPollRef.current) {
        isFirstPollRef.current = false;
        prevCountRef.current = chatUnread;
      } else {
        prevCountRef.current = chatUnread;
      }
    } catch (err) {
      // Genel hata - sessizce devam et
    }
  }, [addToast, notificationState.readIds]);

  useEffect(() => {
    checkForNewMessages();
    pollIntervalRef.current = setInterval(checkForNewMessages, 10000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [checkForNewMessages]);

  const value = { unreadCount, notifications, toasts, addToast, removeToast, markAsRead };

  // İkon seçici
  const getToastIcon = (type) => {
    switch (type) {
      case 'application':
        return <FormIcon sx={{ color: '#fff', fontSize: 18 }} />;
      case 'profile':
        return <ProfileIcon sx={{ color: '#fff', fontSize: 18 }} />;
      default:
        return <ChatIcon sx={{ color: '#fff', fontSize: 18 }} />;
    }
  };

  const getToastGradient = (type) => {
    switch (type) {
      case 'application':
        return 'linear-gradient(135deg, #f59e0b, #d97706)';
      case 'profile':
        return 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
      default:
        return 'linear-gradient(135deg, #1c61ab, #8bb94a)';
    }
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <Box sx={{
        position: 'fixed',
        top: 72,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        maxWidth: 360,
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <Slide key={toast.id} direction="left" in={true} mountOnEnter unmountOnExit>
            <Paper elevation={8} sx={{
              p: 2,
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.98)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(28,97,171,0.18)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
              pointerEvents: 'auto',
              boxShadow: '0 8px 32px rgba(28, 97, 171, 0.18)',
            }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: '10px',
                background: getToastGradient(toast.type),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {getToastIcon(toast.type)}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} sx={{ color: '#1c61ab', lineHeight: 1.3 }}>
                  {toast.senderName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3, fontSize: '0.82rem', lineHeight: 1.4 }} noWrap>
                  {toast.message}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => removeToast(toast.id)} sx={{ mt: -0.5, mr: -0.5 }}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Paper>
          </Slide>
        ))}
      </Box>
    </NotificationContext.Provider>
  );
};
