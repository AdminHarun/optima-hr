// VideoCallModal.js - Rocket.Chat inspired Jitsi integration (FIXED VERSION)
import React, { useEffect, useRef, useState } from 'react';
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
  VideoCall as VideoCallIcon
} from '@mui/icons-material';
import optimaColors from '../../theme/colors';

/**
 * VideoCallModal - Rocket.Chat style Jitsi Meet integration (FIXED)
 *
 * BUG FIXES:
 * - prejoinConfig.enabled: false to skip prejoin page completely
 * - Proper event handling to prevent premature modal close
 * - Better fullscreen management
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
  jitsiDomain = process.env.REACT_APP_JITSI_DOMAIN || 'meet.jit.si',
  jwt = null,
  jitsiRoomName = null
}) => {
  console.log('🎥 VideoCallModal: Component rendered', {
    open,
    roomId,
    jitsiRoomName
  });

  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const hasJoinedRef = useRef(false); // ✅ FIX: Use ref instead of state for closure issue
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [callDuration, setCallDuration] = useState(0);
  const [hasJoined, setHasJoined] = useState(false); // For UI only

  // Generate Jitsi room name
  const generateJitsiRoomName = () => {
    if (jitsiRoomName) {
      console.log('🔥 Using backend-provided Jitsi room name:', jitsiRoomName);
      return jitsiRoomName;
    }

    console.warn('⚠️ No backend room name provided, using fallback');
    return `optima_${roomId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  };

  // Load Jitsi Meet API script
  useEffect(() => {
    if (!open) {
      console.log('VideoCallModal: Not open, skipping init');
      return;
    }

    console.log('VideoCallModal: Modal opened, initializing Jitsi...');

    // Wait for container
    const checkContainer = setInterval(() => {
      if (jitsiContainerRef.current) {
        clearInterval(checkContainer);
        console.log('VideoCallModal: Container ready');

        const loadJitsiScript = () => {
          if (window.JitsiMeetExternalAPI) {
            console.log('VideoCallModal: JitsiMeetExternalAPI already loaded');
            initializeJitsi();
            return;
          }

          console.log('VideoCallModal: Loading Jitsi External API...');
          const script = document.createElement('script');
          script.src = `https://${jitsiDomain}/external_api.js`;
          script.async = true;
          script.onload = () => {
            console.log('✅ Jitsi script loaded');
            initializeJitsi();
          };
          script.onerror = () => {
            console.error('❌ Failed to load Jitsi');
            setIsLoading(false);
          };
          document.body.appendChild(script);
        };

        loadJitsiScript();
      }
    }, 100);

    return () => {
      clearInterval(checkContainer);
      cleanup();
    };
  }, [open]);

  // Initialize Jitsi
  const initializeJitsi = () => {
    if (!jitsiContainerRef.current) {
      console.error('❌ Container ref is null');
      return;
    }

    const roomName = generateJitsiRoomName();
    console.log('🚀 Initializing Jitsi with room:', roomName);

    // Jitsi configuration - FIXED FOR ROCKET.CHAT STYLE
    const options = {
      roomName: roomName,
      parentNode: jitsiContainerRef.current,

      // User info
      userInfo: {
        email: currentUserEmail,
        displayName: currentUserName,
        avatarURL: currentUserAvatar
      },

      // Config overwrite - CRITICAL FIXES
      configOverwrite: {
        // ANONYMOUS/GUEST MODE - Giris ekranini atla
        enableInsecureRoomNameWarning: false,
        requireDisplayName: false,
        enableClosePage: false,
        disableThirdPartyRequests: true,
        disableLocalVideoFlip: false,
        enableLayerSuspension: true,

        // Authentication bypass
        hosts: {
          anonymousdomain: jitsiDomain
        },
        enableUserRolesBasedOnToken: false,

        // PREJOIN PAGE FIX - Multiple methods to ensure prejoin is skipped
        prejoinConfig: {
          enabled: false
        },

        // Legacy fallback (for older Jitsi versions)
        prejoinPageEnabled: false,

        // Force skip prejoin (latest Jitsi API)
        skipPrejoin: true,

        // Skip welcome page
        enableWelcomePage: false,
        skipWelcomePage: true,

        // Disable deep linking
        disableDeepLinking: true,

        // Audio/Video settings
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        startAudioOnly: false,

        // Branding
        brandingRoomAlias: roomName,
        defaultLocalDisplayName: currentUserName,
        defaultRemoteDisplayName: participantName,

        // Toolbar - Minimal but useful
        toolbarButtons: [
          'microphone',
          'camera',
          'desktop',
          'hangup',
          'chat',
          'recording',
          'settings',
          'filmstrip',
          'tileview',
          'fullscreen'
        ],

        // Recording
        fileRecordingsEnabled: true,
        liveStreamingEnabled: false,

        // Notifications
        disableJoinLeaveSounds: false,
        enableNoAudioDetection: true,
        enableNoisyMicDetection: true,

        // Quality
        resolution: 720,
        constraints: {
          video: {
            height: {
              ideal: 720,
              max: 1080,
              min: 240
            }
          }
        },

        // Lobby settings
        lobby: {
          autoKnock: false,
          enableChat: false
        },

        // Security UI
        securityUi: {
          hideLobbyButton: true,
          disableLobbyPassword: true
        }
      },

      // Interface config
      interfaceConfigOverwrite: {
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        SHOW_BRAND_WATERMARK: false,
        BRAND_WATERMARK_LINK: '',

        // Optima branding
        DEFAULT_BACKGROUND: optimaColors.lightBlue,
        DEFAULT_LOGO_URL: '/logo192.png',
        APP_NAME: 'Optima HR',
        NATIVE_APP_NAME: 'Optima HR',
        PROVIDER_NAME: 'Optima',

        // Colors
        TOOLBAR_BUTTON_BACKGROUND: optimaColors.turquoise,
        TOOLBAR_BUTTON_HOVER: optimaColors.lightGreen,

        // Layout
        VERTICAL_FILMSTRIP: true,
        TILE_VIEW_MAX_COLUMNS: 5,

        // Mobile
        MOBILE_APP_PROMO: false,

        // UI
        TOOLBAR_ALWAYS_VISIBLE: false,
        SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile'],

        // Notifications
        DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
        DISABLE_PRESENCE_STATUS: false,
        DISABLE_RINGING: false,

        // Welcome footer
        SHOW_PROMOTIONAL_CLOSE_PAGE: false,
        DISPLAY_WELCOME_FOOTER: false,

        // Authentication - force guest mode
        AUTHENTICATION_ENABLE: false,
        GENERATE_ROOMNAMES_ON_WELCOME_PAGE: false,
        HIDE_INVITE_MORE_HEADER: true
      },

      // JWT if provided
      ...(jwt && { jwt })
    };

    try {
      console.log('🎬 Creating JitsiMeetExternalAPI...');
      const api = new window.JitsiMeetExternalAPI(jitsiDomain, options);
      jitsiApiRef.current = api;
      console.log('✅ JitsiMeetExternalAPI created');

      // Event listeners - FIXED FOR PROPER HANDLING

      // videoConferenceJoined - User successfully joined
      api.addEventListener('videoConferenceJoined', (data) => {
        console.log('✅ Video conference JOINED:', data);
        setIsLoading(false);
        hasJoinedRef.current = true; // ✅ CRITICAL: Mark as joined in ref
        setHasJoined(true); // For UI

        // Set moderator permissions
        if (isModerator) {
          api.executeCommand('toggleLobby', false);
        }
      });

      // ✅ SAFETY NET: If prejoin config doesn't work, hide loading after 3 seconds
      // This allows user to interact with prejoin screen if it appears
      const loadingTimeout = setTimeout(() => {
        if (!hasJoinedRef.current) {
          console.log('⚠️ Auto-hiding loading screen (prejoin might be visible)');
          setIsLoading(false);
        }
      }, 3000);

      // Participant events
      api.addEventListener('participantJoined', (data) => {
        console.log('👤 Participant joined:', data);
        setParticipants(prev => [...prev, data]);
      });

      api.addEventListener('participantLeft', (data) => {
        console.log('👤 Participant left:', data);
        setParticipants(prev => prev.filter(p => p.id !== data.id));
      });

      // videoConferenceLeft - FIXED: Only close if user actually joined
      api.addEventListener('videoConferenceLeft', () => {
        console.log('🚪 Video conference LEFT');

        // ✅ CRITICAL FIX: Use ref to check current value (not stale closure)
        // This prevents premature close when prejoin screen is shown
        if (hasJoinedRef.current) {
          console.log('✅ User had joined, closing modal');
          handleClose();
        } else {
          console.log('⚠️ User never joined, ignoring videoConferenceLeft');
        }
      });

      // readyToClose - Always respect this
      api.addEventListener('readyToClose', () => {
        console.log('🚪 Ready to close');
        handleClose();
      });

      // Recording events
      api.addEventListener('recordingStatusChanged', (data) => {
        console.log('📹 Recording status:', data);
      });

      // Error handling
      api.addEventListener('errorOccurred', (error) => {
        console.error('❌ Jitsi error:', error);
      });

      // Call duration tracking
      const durationInterval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      return () => {
        clearInterval(durationInterval);
        clearTimeout(loadingTimeout);
      };

    } catch (error) {
      console.error('❌ Failed to initialize Jitsi:', error);
      setIsLoading(false);
    }
  };

  // Cleanup function
  const cleanup = () => {
    console.log('🧹 Cleaning up Jitsi');
    if (jitsiApiRef.current) {
      try {
        jitsiApiRef.current.dispose();
      } catch (error) {
        console.error('Error disposing Jitsi:', error);
      }
      jitsiApiRef.current = null;
    }
    hasJoinedRef.current = false; // Reset ref
    setIsLoading(true);
    setHasJoined(false);
    setParticipants([]);
    setCallDuration(0);
  };

  // Handle close
  const handleClose = () => {
    console.log('🚪 Closing video call modal');
    cleanup();
    onClose();
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      jitsiContainerRef.current?.requestFullscreen();
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
        // Prevent closing on backdrop click during call
        if (reason === 'backdropClick' && hasJoinedRef.current) {
          console.log('⚠️ Preventing backdrop close during active call');
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
      {/* Custom AppBar - Optima Colors */}
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
                {roomName}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: '12px'
                }}
              >
                {hasJoined ? `${formatDuration(callDuration)} • ${participants.length + 1} katılımcı` : 'Bağlanıyor...'}
              </Typography>
            </Box>
          </Box>

          {/* Center: Participants */}
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
                {currentUserName[0]}
              </Avatar>
            </Tooltip>

            {/* Participant */}
            <Tooltip title={participantName}>
              <Avatar
                src={participantAvatar}
                sx={{
                  width: 32,
                  height: 32,
                  border: participants.some(p => p.displayName === participantName)
                    ? `2px solid ${optimaColors.turquoise}`
                    : '2px solid rgba(255, 255, 255, 0.2)',
                  fontSize: '14px',
                  fontWeight: 700,
                  bgcolor: optimaColors.lightBlue,
                  opacity: participants.some(p => p.displayName === participantName) ? 1 : 0.5
                }}
              >
                {participantName[0]}
              </Avatar>
            </Tooltip>

            {isModerator && (
              <Chip
                label="Moderatör"
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
            <Tooltip title={isFullscreen ? 'Tam ekrandan çık' : 'Tam ekran'}>
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

      {/* Jitsi Meet Container */}
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
              Görüntülü görüşme başlatılıyor...
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '14px'
              }}
            >
              {participantName} ile bağlanıyorsunuz
            </Typography>
          </Box>
        )}

        {/* Jitsi container */}
        <Box
          ref={jitsiContainerRef}
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

      {/* CSS styling for Jitsi */}
      <style>{`
        /* Hide Jitsi branding */
        .watermark,
        .leftwatermark,
        .rightwatermark,
        [class*="watermark"] {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }

        /* ✅ FIX: DO NOT hide prejoin screen - it needs to be visible if config doesn't work */
        /* Let Jitsi handle prejoin based on config, don't force hide it */

        /* Hide subject/room name only in conference (not prejoin) */
        .subject:not(.prejoin-input-area-container .subject),
        .subject-text:not(.prejoin-input-area-container .subject-text) {
          display: none !important;
        }

        /* Hide welcome page */
        [class*="promo"] {
          display: none !important;
        }

        /* Optima toolbar colors */
        .toolbox-button,
        .toolbox-icon {
          background: ${optimaColors.turquoise100} !important;
          color: ${optimaColors.turquoise} !important;
          border-radius: 12px !important;
          transition: all 0.2s ease !important;
        }

        .toolbox-button:hover,
        .toolbox-icon:hover {
          background: ${optimaColors.lightGreen} !important;
          color: ${optimaColors.white} !important;
          transform: scale(1.05) !important;
        }

        .toolbox-button.toggled,
        .toolbox-icon.toggled {
          background: ${optimaColors.turquoise} !important;
          color: ${optimaColors.white} !important;
        }

        /* Hangup button */
        .toolbox-button.hangup,
        [class*="hangup"] {
          background: ${optimaColors.red100} !important;
          color: ${optimaColors.red} !important;
        }

        .toolbox-button.hangup:hover,
        [class*="hangup"]:hover {
          background: ${optimaColors.red} !important;
          color: ${optimaColors.white} !important;
        }

        /* Filmstrip */
        .filmstrip,
        .remote-videos-container,
        [class*="tile"] {
          background: rgba(28, 28, 28, 0.95) !important;
        }

        /* Video tiles */
        .videocontainer,
        .videocontainer:hover {
          border: 2px solid ${optimaColors.turquoise} !important;
        }

        /* Dominant speaker */
        .videocontainer.dominant-speaker {
          border: 3px solid ${optimaColors.lightGreen} !important;
          box-shadow: 0 0 12px ${optimaColors.lightGreen} !important;
        }

        /* Notifications */
        [class*="notification"],
        [class*="toast"] {
          background: ${optimaColors.lightBlue} !important;
          color: ${optimaColors.white} !important;
          border-radius: 12px !important;
        }
      `}</style>
    </Dialog>
  );
};

export default VideoCallModal;
