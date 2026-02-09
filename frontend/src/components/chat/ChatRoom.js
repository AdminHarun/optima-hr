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
  VideoCall as VideoCallIcon
} from '@mui/icons-material';
import MessageList from './MessageList';
import ChatComposer from './ChatComposer';
import ApplicantProfileModal from './ApplicantProfileModal';

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
  onLoadMore
}) => {
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
    >
      {/* Chat Header - Modern & Soft */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 0,
          borderBottom: '1px solid rgba(100, 150, 200, 0.08)',
          px: 2,
          py: 0.5,
          background: 'linear-gradient(180deg, #ffffff 0%, rgba(250, 251, 252, 0.95) 100%)',
          zIndex: 10,
          flexShrink: 0
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          {/* Back Button (mobile) */}
          {onBack && (
            <IconButton
              size="small"
              onClick={onBack}
              sx={{
                display: { xs: 'flex', md: 'none' },
                color: '#718096',
                '&:hover': {
                  backgroundColor: 'rgba(100, 150, 200, 0.08)'
                }
              }}
            >
              <ArrowBack />
            </IconButton>
          )}

          {/* Participant Avatar with Online Status */}
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            variant="dot"
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: participantOnline ? '#48bb78' : '#cbd5e0',
                width: 8,
                height: 8,
                borderRadius: '50%',
                border: '1.5px solid white',
                boxShadow: participantOnline ? '0 0 0 2px rgba(72, 187, 120, 0.2)' : 'none'
              }
            }}
          >
            <Avatar
              src={participantAvatar}
              alt={participantName}
              sx={{
                width: 32,
                height: 32,
                background: 'linear-gradient(135deg, #6a9fd4 0%, #a0c88c 100%)',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: '0 1px 4px rgba(100, 150, 200, 0.12)',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'scale(1.03)',
                  boxShadow: '0 2px 8px rgba(100, 150, 200, 0.18)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              {getInitials(participantFirstName, participantLastName)}
            </Avatar>
          </Badge>

          {/* Room Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              onClick={() => participantId && setShowProfileModal(true)}
              sx={{
                fontWeight: 600,
                fontSize: '15px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: '#2d3748',
                letterSpacing: '-0.2px',
                cursor: participantId ? 'pointer' : 'default',
                transition: 'color 0.2s ease',
                '&:hover': participantId ? {
                  color: '#5a9fd4',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px'
                } : {}
              }}
            >
              {participantName || roomName}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: participantOnline ? '#48bb78' : '#a0aec0',
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  bgcolor: participantOnline ? '#48bb78' : '#cbd5e0',
                  display: 'inline-block'
                }}
              />
              {participantOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {/* Video Call Button */}
            <IconButton
              onClick={handleVideoCallClick}
              sx={{
                color: '#5a9fd4',
                backgroundColor: 'rgba(90, 159, 212, 0.1)',
                borderRadius: '12px',
                width: 40,
                height: 40,
                '&:hover': {
                  backgroundColor: 'rgba(90, 159, 212, 0.15)',
                  transform: 'scale(1.05)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <VideoCallIcon sx={{ fontSize: 22 }} />
            </IconButton>

            {/* More Options */}
            <IconButton
              size="small"
              sx={{
                color: '#a0aec0',
                borderRadius: '12px',
                width: 40,
                height: 40,
                '&:hover': {
                  backgroundColor: 'rgba(100, 150, 200, 0.08)',
                  color: '#718096'
                }
              }}
            >
              <MoreVert sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </Box>
      </Paper>

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
          />

          {/* Live Typing Preview - Comm100 Style (Admin can see what applicant is typing) */}
          {typingPreview && typingPreview.content && currentUserType === 'admin' && (
            <Box
              sx={{
                px: 2,
                py: 1.5,
                mx: 2,
                mb: 1,
                backgroundColor: 'rgba(139, 185, 74, 0.08)',
                border: '1px dashed rgba(139, 185, 74, 0.4)',
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
                  color: '#555',
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
                backgroundColor: '#f5f6f7',
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
