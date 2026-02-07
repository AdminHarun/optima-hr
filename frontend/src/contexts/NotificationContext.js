// NotificationContext.js - Global bildirim sistemi (Backend API polling)
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, IconButton, Paper, Slide } from '@mui/material';
import { Close as CloseIcon, Chat as ChatIcon } from '@mui/icons-material';
import notificationService from '../services/notificationService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const prevCountRef = useRef(0);
  const prevRoomsRef = useRef({});
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

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
    prevCountRef.current = 0;
    prevRoomsRef.current = {};
  }, []);

  const checkForNewMessages = useCallback(async () => {
    try {
      const currentSite = localStorage.getItem('optima_current_site') || 'FXB';

      const response = await fetch(`${API_BASE_URL}/chat/api/rooms/applicant_rooms/`, {
        credentials: 'include',
        headers: { 'X-Site-Id': currentSite }
      });

      if (!response.ok) return;

      const rooms = await response.json();

      // Toplam okunmamis mesaj sayisini hesapla
      let totalUnread = 0;
      const currentRooms = {};

      rooms.forEach(room => {
        const count = room.unread_count || 0;
        totalUnread += count;
        currentRooms[room.room_id] = {
          unread: count,
          name: room.applicant_name || room.applicant_email || 'Aday',
          lastMessage: room.last_message?.content || ''
        };
      });

      // Ilk poll'da sadece sayiyi ayarla, ses calma
      if (isFirstPollRef.current) {
        isFirstPollRef.current = false;
        prevCountRef.current = totalUnread;
        prevRoomsRef.current = currentRooms;
        setUnreadCount(totalUnread);
        return;
      }

      // Yeni mesaj tespit: hangi odada artis oldu?
      if (totalUnread > prevCountRef.current) {
        let latestRoom = null;

        Object.entries(currentRooms).forEach(([roomId, info]) => {
          const prev = prevRoomsRef.current[roomId]?.unread || 0;
          if (info.unread > prev) {
            latestRoom = info;
          }
        });

        // Ses cal
        notificationService.playMessageSound();

        // Toast goster
        if (latestRoom) {
          addToast({
            senderName: latestRoom.name,
            message: latestRoom.lastMessage?.substring(0, 80) || 'Yeni mesaj',
            type: 'chat',
          });
        }
      }

      prevCountRef.current = totalUnread;
      prevRoomsRef.current = currentRooms;
      setUnreadCount(totalUnread);
    } catch (err) {
      // Backend'e ulasilamazsa sessizce devam et
    }
  }, [addToast]);

  useEffect(() => {
    checkForNewMessages();
    pollIntervalRef.current = setInterval(checkForNewMessages, 10000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [checkForNewMessages]);

  const value = { unreadCount, toasts, addToast, removeToast, markAsRead };

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
                background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <ChatIcon sx={{ color: '#fff', fontSize: 18 }} />
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
