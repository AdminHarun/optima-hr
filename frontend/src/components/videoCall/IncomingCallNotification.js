// IncomingCallNotification.js - Modern slide-in call notification
import React, { useEffect, useState } from 'react';
import {
  Slide,
  Paper,
  Box,
  Avatar,
  Typography,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  VideoCall,
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  PhoneInTalk
} from '@mui/icons-material';

const CALL_TIMEOUT_SECONDS = 30;

const IncomingCallNotification = ({ callData, onAccept, onReject }) => {
  const [open, setOpen] = useState(!!callData);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(CALL_TIMEOUT_SECONDS);

  useEffect(() => {
    setOpen(!!callData);

    if (callData) {
      setMicEnabled(true);
      setCamEnabled(true);
      setTimeRemaining(CALL_TIMEOUT_SECONDS);

      // Play ringtone
      try {
        const audio = new Audio('/sounds/ringtone.mp3');
        audio.loop = true;
        audio.volume = 0.5;
        audio.play().catch(() => {});

        const interval = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              handleReject();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => {
          clearInterval(interval);
          audio.pause();
          audio.currentTime = 0;
        };
      } catch (e) {
        // Audio not available
        const interval = setInterval(() => {
          setTimeRemaining(prev => {
            if (prev <= 1) {
              handleReject();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(interval);
      }
    }
  }, [callData]);

  const handleAccept = () => {
    setOpen(false);
    if (onAccept && callData) {
      onAccept(callData.call_id, {
        mic: micEnabled,
        cam: camEnabled
      });
    }
  };

  const handleReject = () => {
    setOpen(false);
    if (onReject && callData) {
      onReject(callData.call_id);
    }
  };

  if (!callData) return null;

  const progress = (timeRemaining / CALL_TIMEOUT_SECONDS) * 100;
  const isUrgent = timeRemaining <= 10;

  return (
    <Slide direction="down" in={open} mountOnEnter unmountOnExit>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          width: 380,
          borderRadius: '20px',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid rgba(99, 102, 241, 0.1)',
          boxShadow: '0 20px 60px rgba(99, 102, 241, 0.25), 0 0 0 1px rgba(99, 102, 241, 0.1)'
        }}
      >
        {/* Animated gradient border */}
        <Box
          sx={{
            height: 4,
            background: isUrgent
              ? 'linear-gradient(90deg, #ef4444 0%, #f97316 50%, #ef4444 100%)'
              : 'linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #6366f1 100%)',
            backgroundSize: '200% 100%',
            animation: 'gradientMove 2s linear infinite'
          }}
        />

        {/* Header with caller info */}
        <Box sx={{ p: 2.5, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Animated avatar */}
            <Box sx={{ position: 'relative' }}>
              <Avatar
                sx={{
                  width: 60,
                  height: 60,
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  fontSize: 24,
                  fontWeight: 700,
                  boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)'
                }}
              >
                {callData.caller_name?.[0]?.toUpperCase() || 'A'}
              </Avatar>
              {/* Pulsing ring */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -4,
                  left: -4,
                  right: -4,
                  bottom: -4,
                  borderRadius: '50%',
                  border: '2px solid rgba(99, 102, 241, 0.4)',
                  animation: 'pulseRing 1.5s ease-out infinite'
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: -8,
                  left: -8,
                  right: -8,
                  bottom: -8,
                  borderRadius: '50%',
                  border: '2px solid rgba(99, 102, 241, 0.2)',
                  animation: 'pulseRing 1.5s ease-out infinite 0.3s'
                }}
              />
            </Box>

            {/* Caller info */}
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <PhoneInTalk
                  sx={{
                    fontSize: 16,
                    color: '#6366f1',
                    animation: 'shake 0.5s ease-in-out infinite'
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    color: '#6366f1',
                    fontWeight: 600,
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Gelen Arama
                </Typography>
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: '#1e293b',
                  fontSize: '18px',
                  lineHeight: 1.2
                }}
              >
                {callData.caller_name || 'Admin'}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#64748b',
                  fontSize: '13px'
                }}
              >
                {callData.caller_type === 'admin' ? 'Yönetici' : 'Başvuru Sahibi'} • Görüntülü Görüşme
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Media preferences */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            gap: 1.5,
            py: 1.5,
            px: 2.5,
            bgcolor: 'rgba(99, 102, 241, 0.04)',
            borderTop: '1px solid rgba(99, 102, 241, 0.08)',
            borderBottom: '1px solid rgba(99, 102, 241, 0.08)'
          }}
        >
          <Tooltip title={micEnabled ? 'Mikrofonu Kapat' : 'Mikrofonu Aç'} arrow>
            <IconButton
              onClick={() => setMicEnabled(!micEnabled)}
              size="small"
              sx={{
                width: 44,
                height: 44,
                bgcolor: micEnabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: micEnabled ? '#10b981' : '#ef4444',
                border: `1.5px solid ${micEnabled ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                '&:hover': {
                  bgcolor: micEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  transform: 'scale(1.05)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              {micEnabled ? <Mic sx={{ fontSize: 22 }} /> : <MicOff sx={{ fontSize: 22 }} />}
            </IconButton>
          </Tooltip>

          <Tooltip title={camEnabled ? 'Kamerayı Kapat' : 'Kamerayı Aç'} arrow>
            <IconButton
              onClick={() => setCamEnabled(!camEnabled)}
              size="small"
              sx={{
                width: 44,
                height: 44,
                bgcolor: camEnabled ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: camEnabled ? '#3b82f6' : '#ef4444',
                border: `1.5px solid ${camEnabled ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                '&:hover': {
                  bgcolor: camEnabled ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  transform: 'scale(1.05)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              {camEnabled ? <Videocam sx={{ fontSize: 22 }} /> : <VideocamOff sx={{ fontSize: 22 }} />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Timeout progress */}
        <Box sx={{ px: 2.5, py: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '11px' }}>
              Otomatik reddetme
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: isUrgent ? '#ef4444' : '#6366f1',
                fontWeight: 700,
                fontSize: '12px'
              }}
            >
              {timeRemaining} saniye
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 4,
              borderRadius: 2,
              bgcolor: 'rgba(99, 102, 241, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                background: isUrgent
                  ? 'linear-gradient(90deg, #ef4444 0%, #f97316 100%)'
                  : 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
                transition: 'transform 1s linear'
              }
            }}
          />
        </Box>

        {/* Action buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            p: 2.5,
            pt: 1.5
          }}
        >
          <IconButton
            onClick={handleReject}
            sx={{
              flex: 1,
              height: 52,
              borderRadius: '14px',
              bgcolor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1.5px solid rgba(239, 68, 68, 0.2)',
              gap: 1,
              '&:hover': {
                bgcolor: '#ef4444',
                color: '#fff',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            <CallEnd sx={{ fontSize: 24 }} />
            <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>Reddet</Typography>
          </IconButton>

          <IconButton
            onClick={handleAccept}
            sx={{
              flex: 1,
              height: 52,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              gap: 1,
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.5)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            <VideoCall sx={{ fontSize: 24 }} />
            <Typography sx={{ fontWeight: 600, fontSize: '14px' }}>Kabul Et</Typography>
          </IconButton>
        </Box>

        {/* Animations */}
        <style>{`
          @keyframes gradientMove {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes pulseRing {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            100% {
              transform: scale(1.4);
              opacity: 0;
            }
          }
          @keyframes shake {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-10deg); }
            75% { transform: rotate(10deg); }
          }
        `}</style>
      </Paper>
    </Slide>
  );
};

export default IncomingCallNotification;
