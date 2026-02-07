// Adapted from Rocket.Chat RoomMessage.tsx
// Converted to Material-UI and simplified for Optima needs
import React, { memo } from 'react';
import { Box, Avatar, Typography, Paper } from '@mui/material';
import MessageHeader from './MessageHeader';
import MessageContent from './MessageContent';
import MessageToolbar from './MessageToolbar';

/**
 * Main message component - Rocket.Chat pattern adapted for Optima
 *
 * @param {Object} props
 * @param {Object} props.message - Message object
 * @param {boolean} props.sequential - Is this message part of a sequence from same user
 * @param {boolean} props.isOwnMessage - Is this message from current user
 * @param {Function} props.onEdit - Edit message callback
 * @param {Function} props.onDelete - Delete message callback
 * @param {Function} props.onReply - Reply to message callback
 * @param {Function} props.onReaction - Add reaction callback
 */
const RoomMessage = ({
  message,
  sequential = false,
  isOwnMessage = false,
  currentUserType,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  onCopy,
  onForward,
  onPin,
  isPinned = false,
  onNameClick
}) => {
  const [isEditing, setIsEditing] = React.useState(false);

  // Sequential messages hide avatar and compact header
  const showAvatar = !sequential;
  const showHeader = !sequential;

  return (
    <Box
      id={`message-${message.id || message.message_id}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwnMessage ? 'flex-end' : 'flex-start', // ADMIN mesaj SAĞDA, applicant mesaj SOLDA
        px: 2,
        py: sequential ? 0.2 : 0.5,
        position: 'relative',
        transition: 'all 0.2s ease'
      }}
      data-message-id={message.message_id || message.id}
      data-message-status={message.status}
      data-sender-type={message.sender_type}
      data-sequential={sequential}
      data-own={isOwnMessage}
      data-qa-type="message"
    >
      {/* Avatar ve Mesaj Container */}
      <Box sx={{
        display: 'flex',
        alignItems: 'flex-start',
        maxWidth: '80%',
        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
        gap: 1
      }}>
        {/* Avatar */}
        <Box sx={{ flexShrink: 0, pt: 0.25 }}>
          {showAvatar ? (
            <Avatar
              src={message.avatar_url}
              alt={message.sender_name}
              sx={{
                width: 32,
                height: 32,
                background: isOwnMessage
                  ? 'linear-gradient(135deg, #6a9fd4 0%, #5a8fc4 100%)'
                  : 'linear-gradient(135deg, #a0c88c 0%, #90b87c 100%)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 4px rgba(100, 150, 200, 0.12)',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: '0 2px 8px rgba(100, 150, 200, 0.2)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              {message.sender_name?.[0]?.toUpperCase()}
            </Avatar>
          ) : (
            <Box sx={{ width: 32 }} />
          )}
        </Box>

        {/* Main Message Container with Toolbar - Dinamik genişlik */}
        <Box sx={{
          position: 'relative',
          display: 'inline-flex',
          flexDirection: 'column',
          flex: 1
        }}>
          {/* Message Card ile Toolbar'ı içeren wrapper */}
          <Box sx={{
            display: 'flex',
            flexDirection: isOwnMessage ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 0.5,
            '&:hover .message-toolbar': {
              opacity: 1
            }
          }}>
            {/* Message Card - Kompakt ve dinamik */}
            <Paper
              elevation={0}
              sx={{
                backgroundColor: isOwnMessage ? 'rgba(106, 159, 212, 0.15)' : 'rgba(255, 255, 255, 0.92)',
                borderRadius: isOwnMessage ? '16px 16px 6px 16px' : '16px 16px 16px 6px',
                px: 1.25,
                py: 0.75,
                position: 'relative',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
                border: '1px solid',
                borderColor: isOwnMessage ? 'rgba(106, 159, 212, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                transition: 'all 0.2s ease',
                display: 'inline-block',
                width: 'fit-content',
                maxWidth: '100%',
                '&:hover': {
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                  transform: 'translateY(-0.5px)'
                }
              }}
            >
              {/* Header (name + timestamp) */}
              {showHeader && (
                <MessageHeader
                  message={message}
                  isOwnMessage={isOwnMessage}
                  onNameClick={onNameClick}
                />
              )}

              {/* Message Content */}
              <MessageContent
                message={message}
                isEditing={isEditing}
                onSaveEdit={(newContent) => {
                  onEdit?.(message.id, newContent);
                  setIsEditing(false);
                }}
                onCancelEdit={() => setIsEditing(false)}
              />

              {/* Read Receipt Indicators - WhatsApp/Telegram Style */}
              {isOwnMessage && !isEditing && !message.is_deleted && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 0.25,
                    mt: 0.25,
                    pr: 0.5
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '9px',
                      color: '#a0aec0',
                      lineHeight: 1
                    }}
                  >
                    {new Date(message.created_at).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      ml: 0.5
                    }}
                  >
                    {message.status === 'read' ? (
                      // Double blue checkmarks for read messages
                      <Box sx={{ display: 'flex', position: 'relative', width: 14, height: 10 }}>
                        <Typography
                          component="span"
                          sx={{
                            fontSize: '12px',
                            color: '#4fc3f7',
                            lineHeight: 1,
                            position: 'absolute',
                            left: 0,
                            fontWeight: 600
                          }}
                        >
                          ✓
                        </Typography>
                        <Typography
                          component="span"
                          sx={{
                            fontSize: '12px',
                            color: '#4fc3f7',
                            lineHeight: 1,
                            position: 'absolute',
                            left: 4,
                            fontWeight: 600
                          }}
                        >
                          ✓
                        </Typography>
                      </Box>
                    ) : message.status === 'sent' ? (
                      // Single gray checkmark for sent messages
                      <Typography
                        component="span"
                        sx={{
                          fontSize: '12px',
                          color: '#cbd5e0',
                          lineHeight: 1,
                          fontWeight: 600
                        }}
                      >
                        ✓
                      </Typography>
                    ) : (
                      // Clock icon for pending messages
                      <Typography
                        component="span"
                        sx={{
                          fontSize: '10px',
                          color: '#cbd5e0',
                          lineHeight: 1
                        }}
                      >
                        ⏱
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}

            </Paper>

            {/* Message Toolbar - 3-dot menu (baloncuğun DIŞINDA) */}
            {/* Admin mesaj (sağda) -> 3 nokta SOLDA */}
            {/* Applicant mesaj (solda) -> 3 nokta SAĞDA */}
            {!isEditing && (
              <Box
                className="message-toolbar"
                sx={{
                  flexShrink: 0,
                  opacity: 1, // Her zaman görünür
                  transition: 'opacity 0.2s ease'
                }}
              >
                <MessageToolbar
                  message={message}
                  isOwnMessage={isOwnMessage}
                  currentUserType={currentUserType}
                  onEdit={() => setIsEditing(true)}
                  onDelete={() => onDelete?.(message.id)}
                  onReply={() => onReply?.(message)}
                  onForward={onForward}
                  onCopy={() => onCopy?.(message.content)}
                  onPin={onPin}
                  isPinned={isPinned}
                />
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// Memoize to prevent unnecessary re-renders (Rocket.Chat pattern)
export default memo(RoomMessage);
