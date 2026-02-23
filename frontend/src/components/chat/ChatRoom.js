// Adapted from Rocket.Chat Room.tsx and RoomBody.tsx
// Converted to Material-UI for Optima
import React, { memo, useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  ArrowBack,
  MoreVert,
  VideoCall as VideoCallIcon,
  SignalWifiOff as DisconnectedIcon,
  SignalWifi4Bar as ConnectedIcon,
  CloudUpload as DropIcon,
  Search as SearchIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import MessageList from './MessageList';
import ChatComposer from './ChatComposer';
import ApplicantProfileModal from './ApplicantProfileModal';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Chat Room Component - Main chat interface
 * Rocket.Chat Room pattern adapted for Optima
 *
 * Features:
 * - Room header with participant info
 * - Message list with scrolling
 * - Message composer
 * - Typing indicator
 * - Online status
 * - Video call button
 */
const ChatRoom = ({
  roomId,
  roomName,
  participantName,
  participantFirstName,
  participantLastName,
  participantAvatar,
  participantEmail,
  participantId,
  participantOnline = false,
  isConnected = true,
  messages = [],
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserEmail,
  currentUserType = 'admin',
  isLoading = false,
  error = null,
  typingUsers = [],
  typingPreview = null, // Live typing preview (Comm100 style)
  onSendMessage,
  onFileUpload,
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
  onReactionMessage,
  onForwardMessage,
  onPinMessage,
  onBack,
  onVideoCall,
  onLoadMore,
  isGroup = false,
  memberCount = 0,
  groupDescription = null
}) => {
  const { currentTheme } = useTheme();
  const isDark = currentTheme !== 'basic-light';

  // Drag and drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragFile, setDragFile] = useState(null);
  const dragCounterRef = useRef(0);
  // Get avatar initials
  const getInitials = (firstName, lastName) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || participantName?.[0]?.toUpperCase() || '?';
  };
  const [isTyping, setIsTyping] = useState(false);
  const messageListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = useState(null);

  // Handle typing indicator from current user
  const handleTyping = useCallback((typing) => {
    setIsTyping(typing);
  }, []);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0]; // Take first file
      setDragFile(file);
      console.log('📁 File dropped:', file.name, file.type);
    }
  }, []);

  // Send message handler
  const handleSendMessage = useCallback(async (content, fileData = null) => {
    if (onSendMessage) {
      // Mesajı gönder - replyingTo varsa reply_to_message_id parametresini ekle
      await onSendMessage(content, fileData, replyingTo?.id || replyingTo?.message_id || null);
      // Mesaj gönderildikten sonra reply state'ini temizle
      setReplyingTo(null);
    }
  }, [onSendMessage, replyingTo]);

  // File upload handler
  const handleFileUpload = useCallback(async (file) => {
    if (onFileUpload) {
      await onFileUpload(file, roomId);
    }
  }, [onFileUpload, roomId]);

  // Copy message handler
  const handleCopyMessage = useCallback((content) => {
    // Already handled in MessageToolbar
  }, []);

  // Video call handler - triggers call request via parent
  const handleVideoCallClick = useCallback(() => {
    if (onVideoCall) {
      onVideoCall();
    }
  }, [onVideoCall]);

  // Format typing users display
  const getTypingText = () => {
    if (typingUsers.length === 0) return '';
    if (typingUsers.length === 1) return `${typingUsers[0]} is typing...`;
    if (typingUsers.length === 2) return `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
    return `${typingUsers.length} people are typing...`;
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            backgroundColor: 'rgba(99, 102, 241, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            pointerEvents: 'none'
          }}
        >
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { transform: 'scale(1)', opacity: 1 },
                '50%': { transform: 'scale(1.1)', opacity: 0.8 }
              }
            }}
          >
            <DropIcon sx={{ fontSize: 48, color: '#fff' }} />
          </Box>
          <Typography
            variant="h6"
            sx={{
              color: '#fff',
              fontWeight: 600,
              textAlign: 'center'
            }}
          >
            Dosyayı buraya bırakın
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              textAlign: 'center'
            }}
          >
            Resim, video veya belge yükleyebilirsiniz
          </Typography>
        </Box>
      )}
      {/* Chat Header - Slack Style */}
      <Box
        sx={{
          borderBottom: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}`,
          px: 3,
          py: 1.5,
          bgcolor: isDark ? '#1A1D21' : '#ffffff',
          zIndex: 10,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Left: Star + Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
          {/* Back Button (mobile) */}
          {onBack && (
            <IconButton
              size="small"
              onClick={onBack}
              sx={{
                display: { xs: 'flex', md: 'none' },
                color: isDark ? '#ABABAD' : '#718096'
              }}
            >
              <ArrowBack sx={{ fontSize: 20 }} />
            </IconButton>
          )}

          {/* Star */}
          <IconButton
            size="small"
            sx={{
              color: isDark ? '#ABABAD' : '#9ca3af',
              p: 0.5,
              '&:hover': { color: isDark ? '#E0E0E0' : '#374151' }
            }}
          >
            <StarBorderIcon sx={{ fontSize: 20 }} />
          </IconButton>

          {/* Name + Status */}
          <Box sx={{ minWidth: 0 }}>
            <Typography
              onClick={() => !isGroup && participantId && setShowProfileModal(true)}
              sx={{
                fontWeight: 700,
                fontSize: '18px',
                color: isDark ? '#E0E0E0' : '#111827',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: !isGroup && participantId ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                '&:hover': !isGroup && participantId ? { color: isDark ? '#5CC5F8' : '#6366f1' } : {}
              }}
            >
              {participantName || roomName}
            </Typography>
            <Typography
              sx={{
                fontSize: '13px',
                color: isDark ? '#ABABAD' : '#6b7280',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75
              }}
            >
              {isGroup ? (
                <>
                  {memberCount} üye
                  {groupDescription && <Box component="span" sx={{ mx: 0.25 }}>·</Box>}
                  {groupDescription && (
                    <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                      {groupDescription}
                    </Box>
                  )}
                </>
              ) : (
                <>
                  <Box
                    component="span"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: participantOnline ? '#2EB67D' : (isDark ? '#35373B' : '#cbd5e0')
                    }}
                  />
                  {participantOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                </>
              )}
            </Typography>
          </Box>
        </Box>

        {/* Right: Actions */}
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
          {/* Connection indicator (compact) */}
          {!isConnected && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: '4px',
                bgcolor: isDark ? 'rgba(245,101,101,0.15)' : 'rgba(245,101,101,0.1)'
              }}
            >
              <DisconnectedIcon sx={{ fontSize: 14, color: '#f56565' }} />
              <Typography variant="caption" sx={{ color: '#f56565', fontWeight: 500, fontSize: '11px' }}>
                Bağlantı Yok
              </Typography>
            </Box>
          )}

          {/* Video Call */}
          {!isGroup && onVideoCall && (
            <IconButton
              onClick={handleVideoCallClick}
              disabled={!isConnected}
              size="small"
              sx={{
                color: isDark ? '#ABABAD' : '#6b7280',
                borderRadius: '4px',
                '&:hover': { bgcolor: isDark ? '#27242C' : '#f0f0f0', color: isDark ? '#E0E0E0' : '#374151' }
              }}
            >
              <VideoCallIcon sx={{ fontSize: 20 }} />
            </IconButton>
          )}

          {/* Search */}
          <IconButton
            size="small"
            sx={{
              color: isDark ? '#ABABAD' : '#6b7280',
              borderRadius: '4px',
              '&:hover': { bgcolor: isDark ? '#27242C' : '#f0f0f0', color: isDark ? '#E0E0E0' : '#374151' }
            }}
          >
            <SearchIcon sx={{ fontSize: 20 }} />
          </IconButton>

          {/* More Options */}
          <IconButton
            size="small"
            sx={{
              color: isDark ? '#ABABAD' : '#6b7280',
              borderRadius: '4px',
              '&:hover': { bgcolor: isDark ? '#27242C' : '#f0f0f0', color: isDark ? '#E0E0E0' : '#374151' }
            }}
          >
            <MoreVert sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert
          severity="error"
          sx={{ m: 2, borderRadius: 2 }}
          onClose={() => {}}
        >
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && messages.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 2
          }}
        >
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Mesajlar yükleniyor...
          </Typography>
        </Box>
      ) : (
        <>
          {/* Message List */}
          <MessageList
            messages={messages}
            currentUserId={currentUserId}
            currentUserType={currentUserType}
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
            onReplyMessage={(message) => {
              setReplyingTo(message);
              onReplyMessage?.(message);
            }}
            onReactionMessage={onReactionMessage}
            onForwardMessage={onForwardMessage}
            onPinMessage={onPinMessage}
            onCopyMessage={handleCopyMessage}
            onNameClick={() => participantId && setShowProfileModal(true)}
            isDark={isDark}
          />

          {/* Live Typing Preview - Comm100 Style (Admin can see what applicant is typing) */}
          {typingPreview && typingPreview.content && currentUserType === 'admin' && (
            <Box
              sx={{
                px: 2,
                py: 1.5,
                mx: 2,
                mb: 1,
                backgroundColor: isDark ? 'rgba(46, 184, 134, 0.1)' : 'rgba(139, 185, 74, 0.08)',
                border: isDark ? '1px dashed rgba(46, 184, 134, 0.4)' : '1px dashed rgba(139, 185, 74, 0.4)',
                borderRadius: '12px',
                flexShrink: 0
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    gap: 0.3,
                    '& span': {
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      backgroundColor: '#8bb94a',
                      animation: 'typing 1.4s infinite',
                      '&:nth-of-type(2)': { animationDelay: '0.2s' },
                      '&:nth-of-type(3)': { animationDelay: '0.4s' }
                    },
                    '@keyframes typing': {
                      '0%, 60%, 100%': { transform: 'translateY(0)', opacity: 0.7 },
                      '30%': { transform: 'translateY(-4px)', opacity: 1 }
                    }
                  }}
                >
                  <span /><span /><span />
                </Box>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#8bb94a',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Canlı Yazı Önizleme
                </Typography>
              </Box>
              <Typography
                sx={{
                  color: isDark ? '#E0E0E0' : '#555',
                  fontSize: '0.9rem',
                  fontStyle: 'italic',
                  wordBreak: 'break-word',
                  lineHeight: 1.4,
                  pl: 0.5
                }}
              >
                "{typingPreview.content}"
              </Typography>
            </Box>
          )}

          {/* Typing Indicator (fallback when no preview content) */}
          {typingUsers.length > 0 && !typingPreview?.content && currentUserType === 'admin' && (
            <Box
              sx={{
                px: 3,
                py: 1,
                backgroundColor: isDark ? '#1d2126' : '#f5f6f7',
                flexShrink: 0
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    gap: 0.25,
                    '& span': {
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      backgroundColor: 'text.secondary',
                      animation: 'typing 1.4s infinite',
                      '&:nth-of-type(2)': {
                        animationDelay: '0.2s'
                      },
                      '&:nth-of-type(3)': {
                        animationDelay: '0.4s'
                      }
                    },
                    '@keyframes typing': {
                      '0%, 60%, 100%': {
                        transform: 'translateY(0)',
                        opacity: 0.7
                      },
                      '30%': {
                        transform: 'translateY(-4px)',
                        opacity: 1
                      }
                    }
                  }}
                >
                  <span />
                  <span />
                  <span />
                </Box>
                {getTypingText()}
              </Typography>
            </Box>
          )}

          {/* Message Composer */}
          <ChatComposer
            onSendMessage={handleSendMessage}
            onFileUpload={handleFileUpload}
            onTyping={handleTyping}
            placeholder={`Message ${participantName || 'recipient'}...`}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            droppedFile={dragFile}
            onDroppedFileHandled={() => setDragFile(null)}
            isDark={isDark}
          />
        </>
      )}

      {/* Applicant Profile Modal */}
      {showProfileModal && participantId && (
        <ApplicantProfileModal
          open={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          applicantId={participantId}
          onViewForm={(token) => {
            // Navigate to application form
            window.open(`/application/success/${token}`, '_blank');
          }}
        />
      )}
    </Box>
  );
};

export default memo(ChatRoom);
