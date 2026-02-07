// IncomingCallNotification.js - Rocket.Chat inspired with Optima branding
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Avatar,
  Typography,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  VideoCall,
  CallEnd,
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  VolumeOff
} from '@mui/icons-material';
import optimaColors from '../../theme/colors';

const CALL_TIMEOUT_SECONDS = 30;

const IncomingCallNotification = ({ callData, onAccept, onReject, position = 0 }) => {
  const [open, setOpen] = useState(!!callData);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(CALL_TIMEOUT_SECONDS);

  useEffect(() => {
    setOpen(!!callData);

    if (callData) {
      // Reset preferences
      setMicEnabled(true);
      setCamEnabled(true);
      setTimeRemaining(CALL_TIMEOUT_SECONDS);

      // Optional: Add ring tone
      // const audio = new Audio('/sounds/ring.mp3');
      // audio.loop = true;
      // audio.play();

      // Countdown timer
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleReject(); // Auto-reject on timeout
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearInterval(interval);
        // audio.pause();
        // audio.currentTime = 0;
      };
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

  const handleMuteAndDismiss = () => {
    // Sessize al ve kapat
    setOpen(false);
    if (onReject && callData) {
      onReject(callData.call_id, { muted: true });
    }
  };

  const toggleMic = () => setMicEnabled(!micEnabled);
  const toggleCam = () => setCamEnabled(!camEnabled);

  if (!callData) return null;

  const progress = (timeRemaining / CALL_TIMEOUT_SECONDS) * 100;

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          background: optimaColors.white,
          boxShadow: '0 12px 40px rgba(79, 209, 197, 0.15)',
          border: `2px solid ${optimaColors.turquoise100}`,
          overflow: 'hidden',
          position: 'relative',
          top: `${position * 10}px`,
          left: `${position * 10}px`,
        }
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          textAlign: 'center',
          pt: 3,
          pb: 2,
          position: 'relative',
          background: `linear-gradient(180deg, ${optimaColors.turquoise50} 0%, ${optimaColors.lightBlue50} 100%)`,
          borderBottom: `1px solid ${optimaColors.border}`
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: optimaColors.turquoiseGradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            animation: 'pulse 2s ease-in-out infinite',
            boxShadow: `0 4px 20px ${optimaColors.turquoise200}`
          }}
        >
          <VideoCall
            sx={{
              fontSize: 48,
              color: optimaColors.white
            }}
          />
        </Box>
        <Typography
          variant="h6"
          fontWeight="600"
          sx={{
            color: optimaColors.textPrimary,
            mb: 0.5
          }}
        >
          📞 Gelen Arama
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: optimaColors.textSecondary,
            fontSize: '14px'
          }}
        >
          Görüntülü görüşme talebi
        </Typography>
      </DialogTitle>

      {/* Mic/Cam Controllers - Rocket.Chat Style */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 1.5,
          py: 2,
          px: 3,
          borderBottom: `1px solid ${optimaColors.borderLight}`
        }}
      >
        <Tooltip title={micEnabled ? 'Mikrofonu Kapat' : 'Mikrofonu Aç'}>
          <IconButton
            onClick={toggleMic}
            sx={{
              width: 56,
              height: 56,
              background: micEnabled
                ? optimaColors.turquoise100
                : optimaColors.red100,
              color: micEnabled ? optimaColors.turquoise : optimaColors.red,
              border: `2px solid ${micEnabled ? optimaColors.turquoise200 : optimaColors.red200}`,
              '&:hover': {
                background: micEnabled
                  ? optimaColors.turquoise200
                  : optimaColors.red200,
                transform: 'scale(1.05)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            {micEnabled ? <Mic sx={{ fontSize: 28 }} /> : <MicOff sx={{ fontSize: 28 }} />}
          </IconButton>
        </Tooltip>

        <Tooltip title={camEnabled ? 'Kamerayı Kapat' : 'Kamerayı Aç'}>
          <IconButton
            onClick={toggleCam}
            sx={{
              width: 56,
              height: 56,
              background: camEnabled
                ? optimaColors.lightBlue100
                : optimaColors.red100,
              color: camEnabled ? optimaColors.lightBlue : optimaColors.red,
              border: `2px solid ${camEnabled ? optimaColors.lightBlue200 : optimaColors.red200}`,
              '&:hover': {
                background: camEnabled
                  ? optimaColors.lightBlue200
                  : optimaColors.red200,
                transform: 'scale(1.05)'
              },
              transition: 'all 0.2s ease'
            }}
          >
            {camEnabled ? <Videocam sx={{ fontSize: 28 }} /> : <VideocamOff sx={{ fontSize: 28 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Caller Info */}
      <DialogContent sx={{ textAlign: 'center', pb: 2, pt: 3 }}>
        <Avatar
          sx={{
            width: 100,
            height: 100,
            margin: '0 auto 16px',
            background: optimaColors.primaryGradient,
            color: optimaColors.white,
            fontSize: 40,
            fontWeight: '600',
            boxShadow: `0 6px 20px ${optimaColors.lightBlue200}`,
            border: `3px solid ${optimaColors.white}`
          }}
        >
          {callData.caller_name?.[0]?.toUpperCase() || 'A'}
        </Avatar>
        <Typography
          variant="h5"
          fontWeight="600"
          sx={{
            color: optimaColors.textPrimary,
            mb: 0.5
          }}
        >
          {callData.caller_name || 'Admin'}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: optimaColors.textSecondary,
            fontSize: '15px',
            mb: 1
          }}
        >
          {callData.caller_type === 'admin' ? 'Yönetici' : 'Başvuru Sahibi'}
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: optimaColors.turquoise,
            fontSize: '16px',
            fontWeight: 500
          }}
        >
          sizi arıyor...
        </Typography>
      </DialogContent>

      {/* Timeout Progress Bar - Rocket.Chat Inspired */}
      <Box sx={{ px: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" sx={{ color: optimaColors.textMuted, fontSize: '12px' }}>
            Otomatik red
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: timeRemaining <= 10 ? optimaColors.red : optimaColors.turquoise,
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            {timeRemaining}s
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: optimaColors.lightBlue50,
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              background: timeRemaining <= 10
                ? optimaColors.red
                : optimaColors.turquoiseGradient
            }
          }}
        />
      </Box>

      {/* Action Buttons */}
      <DialogActions
        sx={{
          justifyContent: 'center',
          pb: 3,
          pt: 1,
          gap: 1.5,
          px: 3
        }}
      >
        <Button
          variant="contained"
          size="large"
          onClick={handleReject}
          startIcon={<CallEnd />}
          sx={{
            bgcolor: optimaColors.white,
            color: optimaColors.red,
            px: 3,
            py: 1.5,
            fontSize: '15px',
            fontWeight: 600,
            borderRadius: '16px',
            textTransform: 'none',
            boxShadow: `0 4px 12px ${optimaColors.red100}`,
            border: `2px solid ${optimaColors.red200}`,
            '&:hover': {
              bgcolor: optimaColors.red50,
              transform: 'translateY(-2px)',
              boxShadow: `0 6px 16px ${optimaColors.red200}`,
              border: `2px solid ${optimaColors.red300}`
            },
            transition: 'all 0.2s ease'
          }}
        >
          Reddet
        </Button>

        <Button
          variant="contained"
          size="large"
          onClick={handleAccept}
          startIcon={<VideoCall />}
          sx={{
            background: optimaColors.callAccentGradient,
            color: optimaColors.white,
            px: 3,
            py: 1.5,
            fontSize: '15px',
            fontWeight: 600,
            borderRadius: '16px',
            textTransform: 'none',
            boxShadow: `0 4px 16px ${optimaColors.turquoise200}`,
            border: 'none',
            '&:hover': {
              background: optimaColors.turquoiseGradient,
              transform: 'translateY(-2px)',
              boxShadow: `0 6px 20px ${optimaColors.turquoise300}`
            },
            transition: 'all 0.2s ease'
          }}
        >
          Kabul Et
        </Button>

        <Tooltip title="Sessize al ve kapat">
          <IconButton
            onClick={handleMuteAndDismiss}
            sx={{
              color: optimaColors.textMuted,
              bgcolor: optimaColors.lightBlue50,
              border: `1px solid ${optimaColors.borderLight}`,
              '&:hover': {
                bgcolor: optimaColors.lightBlue100,
                color: optimaColors.textSecondary
              }
            }}
          >
            <VolumeOff />
          </IconButton>
        </Tooltip>
      </DialogActions>

      {/* Pulse Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 4px 20px ${optimaColors.turquoise200};
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 6px 30px ${optimaColors.turquoise300};
          }
        }
      `}</style>
    </Dialog>
  );
};

export default IncomingCallNotification;
