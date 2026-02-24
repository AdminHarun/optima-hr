// VideoCallModal.js - Daily.co Video Call Integration
// Modern & Professional Design
import React, { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';
import {
  Dialog,
  DialogContent,
  Box,
  IconButton,
  Typography,
  Avatar,
  Chip,
  Tooltip,
  CircularProgress,
  Fade,
  Zoom,
  Badge,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Fullscreen,
  FullscreenExit,
  VideoCall as VideoCallIcon,
  Language as IpIcon,
  Timer as TimerIcon,
  Person as PersonIcon,
  Shield as ShieldIcon,
  FiberManualRecord as RecordIcon,
  SignalCellularAlt as SignalIcon
} from '@mui/icons-material';
import optimaColors from '@shared/theme/colors';

/**
 * VideoCallModal - Daily.co Video Call Integration
 *
 * Features:
 * - No login required - token based authentication
 * - Direct call from chat
 * - IP tracking for admin
 * - Cloud recording support
 */
const VideoCallModal = ({
  open = false,
  onClose,
  roomId,
  roomName,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserEmail,
  participantId,
  participantName,
  participantAvatar,
  participantEmail,
  isModerator = true,
  dailyUrl = null,
  participantIp = null // IP address of participant (for admin view)
}) => {
  console.log('VideoCallModal: Component rendered', {
    open,
    roomId,
    dailyUrl,
    participantIp
  });

  const containerRef = useRef(null);
  const callFrameRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [callDuration, setCallDuration] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);
  const [error, setError] = useState(null);
  const [containerReady, setContainerReady] = useState(false);
  const durationIntervalRef = useRef(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('Cleaning up Daily.co call frame');

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (callFrameRef.current) {
      try {
        callFrameRef.current.destroy();
      } catch (error) {
        console.error('Error destroying call frame:', error);
      }
      callFrameRef.current = null;
    }

    setIsLoading(true);
    setHasJoined(false);
    setParticipants([]);
    setCallDuration(0);
    setError(null);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    console.log('Closing video call modal');
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  // Container hazir olunca state'i guncelle
  useEffect(() => {
    if (open && containerRef.current) {
      setContainerReady(true);
    } else {
      setContainerReady(false);
    }
  }, [open]);

  // Modal acildiginda container'in renderlanmasini bekle
  useEffect(() => {
    if (open && !containerReady) {
      const timer = setTimeout(() => {
        if (containerRef.current) {
          setContainerReady(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, containerReady]);

  // Initialize Daily.co
  useEffect(() => {
    console.log('VideoCallModal useEffect - open:', open, 'dailyUrl:', dailyUrl, 'containerReady:', containerReady);

    if (!open || !dailyUrl || !containerReady) {
      console.log('VideoCallModal: Waiting for all conditions...', { open, hasDailyUrl: !!dailyUrl, containerReady });
      return;
    }

    if (!containerRef.current) {
      console.log('VideoCallModal: Container ref still null');
      return;
    }

    console.log('VideoCallModal: Initializing Daily.co with URL:', dailyUrl);

    const initializeDaily = async () => {
      try {
        // Create Daily.co call frame
        const callFrame = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: '0',
            borderRadius: '0'
          },
          showLeaveButton: true,
          showFullscreenButton: true,
          showLocalVideo: true,
          showParticipantsBar: true
        });

        callFrameRef.current = callFrame;

        // Event listeners
        callFrame.on('joining-meeting', () => {
          console.log('Joining Daily.co meeting...');
        });

        callFrame.on('joined-meeting', (event) => {
          console.log('Joined Daily.co meeting:', event);
          setIsLoading(false);
          setHasJoined(true);

          // Start duration tracking
          durationIntervalRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
          }, 1000);
        });

        callFrame.on('participant-joined', (event) => {
          console.log('Participant joined:', event);
          // Participant katildiginda loading'i kapat (fallback)
          setIsLoading(false);
          setHasJoined(true);
          setParticipants(prev => {
            const exists = prev.some(p => p.session_id === event.participant.session_id);
            if (!exists) {
              return [...prev, event.participant];
            }
            return prev;
          });
        });

        callFrame.on('participant-left', (event) => {
          console.log('Participant left:', event);
          setParticipants(prev => prev.filter(p => p.session_id !== event.participant.session_id));
        });

        callFrame.on('participant-updated', (event) => {
          console.log('Participant updated:', event);
          // Participant update olunca da loading'i kapat (fallback)
          setIsLoading(false);
          setHasJoined(true);
          setParticipants(prev => prev.map(p =>
            p.session_id === event.participant.session_id ? event.participant : p
          ));
        });

        // Camera/mic izni alindiktan sonra loading'i kapat
        callFrame.on('camera-error', (event) => {
          console.log('Camera error:', event);
        });

        callFrame.on('started-camera', () => {
          console.log('Camera started');
          setIsLoading(false);
          setHasJoined(true);
        });

        callFrame.on('left-meeting', () => {
          console.log('Left Daily.co meeting');
          handleClose();
        });

        callFrame.on('error', (event) => {
          console.error('Daily.co error:', event);
          setError(event.errorMsg || 'Video call error occurred');
          setIsLoading(false);
        });

        // Join the meeting
        await callFrame.join({
          url: dailyUrl,
          userName: currentUserName
        });

        console.log('Daily.co join called successfully');

        // Safety timeout - 3 saniye sonra loading'i kapat
        setTimeout(() => {
          setIsLoading(prev => {
            if (prev) {
              console.log('Safety timeout: hiding loading screen');
              setHasJoined(true);
              return false;
            }
            return prev;
          });
        }, 3000);

      } catch (error) {
        console.error('Failed to initialize Daily.co:', error);
        setError(error.message || 'Failed to start video call');
        setIsLoading(false);
      }
    };

    initializeDaily();

    return () => {
      cleanup();
    };
  }, [open, dailyUrl, currentUserName, cleanup, handleClose, containerReady]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Format call duration
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason === 'backdropClick' && hasJoined) {
          console.log('Preventing backdrop close during active call');
          return;
        }
        handleClose();
      }}
      maxWidth={false}
      fullScreen
      TransitionComponent={Fade}
      transitionDuration={300}
      PaperProps={{
        sx: {
          background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)',
          margin: 0,
          maxHeight: '100%',
          height: '100vh',
          width: '100vw',
          overflow: 'hidden'
        }
      }}
    >
      {/* Floating Top Bar - Glassmorphism */}
      <Fade in={open} timeout={500}>
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            zIndex: 1100,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            pointerEvents: 'none',
            '& > *': { pointerEvents: 'auto' }
          }}
        >
          {/* Left Panel - Call Info */}
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            {/* Live Indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <RecordIcon
                sx={{
                  fontSize: 12,
                  color: hasJoined ? '#ef4444' : 'rgba(255,255,255,0.3)',
                  animation: hasJoined ? 'pulse 1.5s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.4 },
                    '100%': { opacity: 1 }
                  }
                }}
              />
              <Typography
                sx={{
                  color: hasJoined ? '#ef4444' : 'rgba(255,255,255,0.5)',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                {hasJoined ? 'CANLI' : 'BAĞLANIYOR'}
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />

            {/* Call Duration */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimerIcon sx={{ fontSize: 18, color: optimaColors.turquoise }} />
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'monospace'
                }}
              >
                {formatDuration(callDuration)}
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.1)' }} />

            {/* Participants Count */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon sx={{ fontSize: 18, color: optimaColors.lightBlue }} />
              <Typography sx={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                {participants.length + 1} Katılımcı
              </Typography>
            </Box>

            {/* Connection Quality */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SignalIcon sx={{ fontSize: 16, color: '#22c55e' }} />
            </Box>
          </Box>

          {/* Center Panel - Participant Info with IP (Admin Only) */}
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '12px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            {/* Your Avatar */}
            <Tooltip title={`Siz: ${currentUserName}`} placement="bottom">
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: '#22c55e',
                      border: '2px solid #1a1a2e'
                    }}
                  />
                }
              >
                <Avatar
                  src={currentUserAvatar}
                  sx={{
                    width: 40,
                    height: 40,
                    border: '2px solid',
                    borderColor: optimaColors.turquoise,
                    fontSize: '16px',
                    fontWeight: 700,
                    background: `linear-gradient(135deg, ${optimaColors.lightBlue} 0%, ${optimaColors.turquoise} 100%)`
                  }}
                >
                  {currentUserName?.[0] || '?'}
                </Avatar>
              </Badge>
            </Tooltip>

            {/* Connection Line */}
            <Box
              sx={{
                width: 40,
                height: 2,
                background: `linear-gradient(90deg, ${optimaColors.turquoise}, ${optimaColors.lightBlue})`,
                borderRadius: 1
              }}
            />

            {/* Participant Avatar */}
            <Tooltip title={participantName} placement="bottom">
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: participants.length > 0 ? '#22c55e' : '#fbbf24',
                      border: '2px solid #1a1a2e'
                    }}
                  />
                }
              >
                <Avatar
                  src={participantAvatar}
                  sx={{
                    width: 40,
                    height: 40,
                    border: '2px solid',
                    borderColor: participants.length > 0 ? optimaColors.turquoise : 'rgba(255,255,255,0.2)',
                    fontSize: '16px',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    opacity: participants.length > 0 ? 1 : 0.6
                  }}
                >
                  {participantName?.[0] || '?'}
                </Avatar>
              </Badge>
            </Tooltip>

            {/* Participant Name & IP for Admin */}
            <Box sx={{ ml: 1 }}>
              <Typography
                sx={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  lineHeight: 1.2
                }}
              >
                {participantName}
              </Typography>
              {/* IP Address - Admin Only */}
              {participantIp && isModerator && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <IpIcon sx={{ fontSize: 12, color: '#fbbf24' }} />
                  <Typography
                    sx={{
                      color: '#fbbf24',
                      fontSize: '11px',
                      fontWeight: 600,
                      fontFamily: 'monospace',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {participantIp}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Moderator Badge */}
            {isModerator && (
              <Chip
                icon={<ShieldIcon sx={{ fontSize: 14 }} />}
                label="Moderatör"
                size="small"
                sx={{
                  ml: 1,
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 600,
                  height: 26,
                  '& .MuiChip-icon': {
                    color: '#fff'
                  }
                }}
              />
            )}
          </Box>

          {/* Right Panel - Controls */}
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <Tooltip title={isFullscreen ? 'Küçült' : 'Tam Ekran'}>
              <IconButton
                onClick={toggleFullscreen}
                sx={{
                  color: '#fff',
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  width: 40,
                  height: 40,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    transform: 'scale(1.05)'
                  }
                }}
              >
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Görüşmeyi Sonlandır">
              <IconButton
                onClick={handleClose}
                sx={{
                  color: '#fff',
                  bgcolor: '#ef4444',
                  width: 40,
                  height: 40,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: '#dc2626',
                    transform: 'scale(1.05)'
                  }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Fade>

      {/* Daily.co Container */}
      <DialogContent
        sx={{
          p: 0,
          background: 'transparent',
          position: 'relative',
          height: '100vh',
          overflow: 'hidden',
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }}
      >
        {/* Loading Overlay - Modern Design */}
        <Fade in={isLoading} timeout={300}>
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: isLoading ? 'flex' : 'none',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)',
              zIndex: 1000,
              gap: 3
            }}
          >
            {/* Animated Video Icon */}
            <Zoom in={isLoading} timeout={500}>
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(20, 184, 166, 0.2) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    border: `3px solid ${optimaColors.turquoise}`,
                    animation: 'ripple 1.5s infinite',
                    '@keyframes ripple': {
                      '0%': { transform: 'scale(1)', opacity: 1 },
                      '100%': { transform: 'scale(1.5)', opacity: 0 }
                    }
                  }
                }}
              >
                <VideoCallIcon
                  sx={{
                    fontSize: 50,
                    color: optimaColors.turquoise,
                    animation: 'bounce 1s infinite',
                    '@keyframes bounce': {
                      '0%, 100%': { transform: 'translateY(0)' },
                      '50%': { transform: 'translateY(-5px)' }
                    }
                  }}
                />
              </Box>
            </Zoom>

            {/* Loading Text */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h5"
                sx={{
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '22px',
                  mb: 1,
                  background: `linear-gradient(135deg, ${optimaColors.lightBlue} 0%, ${optimaColors.turquoise} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                Görüntülü Görüşme Başlatılıyor
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '15px'
                }}
              >
                <span style={{ color: optimaColors.turquoise, fontWeight: 600 }}>{participantName}</span> ile bağlantı kuruluyor...
              </Typography>
            </Box>

            {/* Loading Dots */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: optimaColors.turquoise,
                    animation: 'loadingDot 1.4s infinite',
                    animationDelay: `${i * 0.2}s`,
                    '@keyframes loadingDot': {
                      '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.4 },
                      '40%': { transform: 'scale(1)', opacity: 1 }
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
        </Fade>

        {/* Error Display - Modern Design */}
        {error && (
          <Fade in={!!error} timeout={300}>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 100%)',
                zIndex: 1000,
                gap: 2
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <CloseIcon sx={{ fontSize: 40, color: '#ef4444' }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  color: '#ef4444',
                  fontWeight: 700,
                  fontSize: '18px'
                }}
              >
                Bağlantı Hatası
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '14px',
                  maxWidth: 400,
                  textAlign: 'center',
                  px: 2
                }}
              >
                {error}
              </Typography>
            </Box>
          </Fade>
        )}

        {/* Daily.co iframe container */}
        <Box
          ref={containerRef}
          sx={{
            width: '100%',
            height: '100%',
            '& iframe': {
              border: 'none',
              width: '100%',
              height: '100%'
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallModal;
