// src/components/chat/RoomMessage.js - Slack-Style Message Layout
import React, { memo } from 'react';
import { Box, Avatar, Typography } from '@mui/material';
import MessageHeader from './MessageHeader';
import MessageContent from './MessageContent';
import MessageToolbar from './MessageToolbar';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { currentTheme } = useTheme();
  const isDark = currentTheme !== 'basic-light';

  const [isEditing, setIsEditing] = React.useState(false);

  const showAvatar = !sequential;
  const showHeader = !sequential;

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box
      id={`message-${message.id || message.message_id}`}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        px: 3,
        py: sequential ? 0.25 : 0,
        mb: sequential ? 0 : '20px',
        position: 'relative',
        '&:hover': {
          bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
        },
        '&:hover .message-toolbar': {
          opacity: 1,
          visibility: 'visible'
        },
        transition: 'background 0.1s ease'
      }}
      data-message-id={message.message_id || message.id}
      data-message-status={message.status}
      data-sender-type={message.sender_type}
      data-sequential={sequential}
      data-own={isOwnMessage}
      data-qa-type="message"
    >
      {/* Avatar or spacer */}
      <Box sx={{ flexShrink: 0, width: 40, pt: 0.25 }}>
        {showAvatar ? (
          <Avatar
            src={message.avatar_url}
            alt={message.sender_name}
            sx={{
              width: 40,
              height: 40,
              borderRadius: '8px',
              background: isOwnMessage
                ? (isDark ? 'linear-gradient(135deg, #1264a3 0%, #0d4f82 100%)' : 'linear-gradient(135deg, #6a9fd4 0%, #5a8fc4 100%)')
                : (isDark ? 'linear-gradient(135deg, #2eb886 0%, #1a9a6c 100%)' : 'linear-gradient(135deg, #a0c88c 0%, #90b87c 100%)'),
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {message.sender_name?.[0]?.toUpperCase()}
          </Avatar>
        ) : (
          <Box sx={{ width: 40 }} />
        )}
      </Box>

      {/* Content area */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Header: Name + Timestamp */}
        {showHeader && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
            <MessageHeader
              message={message}
              isOwnMessage={isOwnMessage}
              onNameClick={onNameClick}
              isDark={isDark}
            />
            <Typography
              variant="caption"
              sx={{
                color: isDark ? '#ABABAD' : '#9ca3af',
                fontSize: '12px',
                flexShrink: 0
              }}
            >
              {formatTime(message.created_at)}
            </Typography>
          </Box>
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
          isDark={isDark}
          isOwnMessage={isOwnMessage}
        />
      </Box>

      {/* Toolbar - appears on hover at top-right */}
      {!isEditing && (
        <Box
          className="message-toolbar"
          sx={{
            position: 'absolute',
            top: 4,
            right: 12,
            opacity: 0,
            visibility: 'hidden',
            transition: 'opacity 0.15s ease',
            zIndex: 1
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
            isDark={isDark}
          />
        </Box>
      )}
    </Box>
  );
};

export default memo(RoomMessage);
