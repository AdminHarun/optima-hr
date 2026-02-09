// VideoCallModal.js - Daily.co Video Call Integration
import React, { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe from '@daily-co/daily-js';
import {
  Dialog,
  DialogContent,
  Box,
  IconButton,
  Typography,
  Toolbar,
  AppBar,
  Avatar,
  Chip,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Fullscreen,
  FullscreenExit,
  VideoCall as VideoCallIcon,
  Language as IpIcon
} from '@mui/icons-material';
import optimaColors from '../../theme/colors';

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
      PaperProps={{
        sx: {
          backgroundColor: '#1c1c1c',
          margin: 0,
          maxHeight: '100%',
          height: '100vh',
          width: '100vw'
        }
      }}
    >
      {/* Custom AppBar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${optimaColors.lightBlue} 0%, ${optimaColors.turquoise} 100%)`,
          borderBottom: `1px solid ${optimaColors.lightBlue200}`
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', py: 0.5 }}>
          {/* Left: Room info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <VideoCallIcon sx={{ color: optimaColors.white, fontSize: 28 }} />
            <Box>
              <Typography
                variant="subtitle1"
                sx={{
                  color: optimaColors.white,
                  fontWeight: 700,
                  fontSize: '15px',
                  lineHeight: 1.2
                }}
              >
                {roomName || 'Video Gorusmesi'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: '12px'
                }}
              >
                {hasJoined ? `${formatDuration(callDuration)} - ${participants.length + 1} katilimci` : 'Baglaniyor...'}
              </Typography>
            </Box>
          </Box>

          {/* Center: Participants and IP info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Current user */}
            <Tooltip title={currentUserName}>
              <Avatar
                src={currentUserAvatar}
                sx={{
                  width: 32,
                  height: 32,
                  border: `2px solid ${optimaColors.turquoise}`,
                  fontSize: '14px',
                  fontWeight: 700,
                  bgcolor: optimaColors.lightBlue
                }}
              >
                {currentUserName?.[0] || '?'}
              </Avatar>
            </Tooltip>

            {/* Participant */}
            <Tooltip title={participantName}>
              <Avatar
                src={participantAvatar}
                sx={{
                  width: 32,
                  height: 32,
                  border: participants.length > 0
                    ? `2px solid ${optimaColors.turquoise}`
                    : '2px solid rgba(255, 255, 255, 0.2)',
                  fontSize: '14px',
                  fontWeight: 700,
                  bgcolor: optimaColors.lightBlue,
                  opacity: participants.length > 0 ? 1 : 0.5
                }}
              >
                {participantName?.[0] || '?'}
              </Avatar>
            </Tooltip>

            {/* IP Address chip (only for admin/moderator) */}
            {participantIp && isModerator && (
              <Tooltip title="Katilimci IP Adresi">
                <Chip
                  icon={<IpIcon sx={{ fontSize: 16, color: optimaColors.lightBlue }} />}
                  label={participantIp}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    color: optimaColors.white,
                    fontSize: '11px',
                    fontWeight: 500,
                    height: 24,
                    ml: 1,
                    '& .MuiChip-icon': {
                      color: optimaColors.white
                    }
                  }}
                />
              </Tooltip>
            )}

            {isModerator && (
              <Chip
                label="Moderator"
                size="small"
                sx={{
                  backgroundColor: optimaColors.lightGreen100,
                  color: optimaColors.lightGreen,
                  fontSize: '11px',
                  fontWeight: 600,
                  height: 24,
                  ml: 1
                }}
              />
            )}
          </Box>

          {/* Right: Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={isFullscreen ? 'Tam ekrandan cik' : 'Tam ekran'}>
              <IconButton
                onClick={toggleFullscreen}
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff'
                  }
                }}
              >
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Kapat">
              <IconButton
                onClick={handleClose}
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': {
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444'
                  }
                }}
              >
                <CloseIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Daily.co Container */}
      <DialogContent
        sx={{
          p: 0,
          backgroundColor: '#1c1c1c',
          position: 'relative',
          height: 'calc(100vh - 64px)',
          overflow: 'hidden',
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }}
      >
        {/* Loading overlay */}
        {isLoading && (
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
              backgroundColor: '#1c1c1c',
              zIndex: 1000,
              gap: 2
            }}
          >
            <CircularProgress
              size={60}
              sx={{
                color: optimaColors.turquoise
              }}
            />
            <Typography
              variant="h6"
              sx={{
                color: optimaColors.white,
                fontWeight: 600,
                fontSize: '16px'
              }}
            >
              Goruntulu gorusme baslatiliyor...
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px'
              }}
            >
              {participantName} ile baglaniyorsunuz
            </Typography>
          </Box>
        )}

        {/* Error display */}
        {error && (
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
              backgroundColor: '#1c1c1c',
              zIndex: 1000,
              gap: 2
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: '#ef4444',
                fontWeight: 600,
                fontSize: '16px'
              }}
            >
              Baglanti Hatasi
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px',
                maxWidth: 400,
                textAlign: 'center'
              }}
            >
              {error}
            </Typography>
          </Box>
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
