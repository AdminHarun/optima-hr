// Adapted from Rocket.Chat MessageHeader.tsx
// Converted to Material-UI for Optima
import React, { memo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Check, DoneAll, Schedule, Error } from '@mui/icons-material';

/**
 * Message Header Component - Shows sender name, timestamp, and status
 * Rocket.Chat pattern adapted for Optima
 */
const MessageHeader = ({ message, isOwnMessage, onNameClick }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateAndTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Status icon for own messages (WhatsApp style)
  const StatusIcon = () => {
    const { status } = message;

    const iconProps = {
      sx: {
        fontSize: 14,
        ml: 0.5
      }
    };

    switch (status) {
      case 'sending':
        return <Schedule {...iconProps} sx={{ ...iconProps.sx, color: 'text.disabled' }} />;
      case 'sent':
        return <Check {...iconProps} sx={{ ...iconProps.sx, color: 'text.secondary' }} />;
      case 'delivered':
        return <DoneAll {...iconProps} sx={{ ...iconProps.sx, color: 'text.secondary' }} />;
      case 'read':
        return <DoneAll {...iconProps} sx={{ ...iconProps.sx, color: '#1c61ab' }} />;
      case 'failed':
        return <Error {...iconProps} sx={{ ...iconProps.sx, color: 'error.main' }} />;
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        mb: 0.5
      }}
    >
      {/* Sender Name */}
      <Typography
        id={`${message.id}-displayName`}
        variant="subtitle2"
        onClick={() => onNameClick?.()}
        sx={{
          fontWeight: 700,
          color: isOwnMessage ? '#1c61ab' : '#8bb94a',
          fontSize: '0.9rem',
          cursor: 'pointer',
          '&:hover': {
            textDecoration: 'underline',
            color: isOwnMessage ? '#144887' : '#6b9337'
          },
          transition: 'color 0.2s'
        }}
        data-username={message.sender_name}
      >
        {message.sender_name}
      </Typography>

      {/* Bot/System indicator */}
      {message.sender_type === 'system' && (
        <Chip
          label="System"
          size="small"
          sx={{
            height: 18,
            fontSize: '0.65rem',
            fontWeight: 600,
            backgroundColor: 'info.light',
            color: 'info.dark'
          }}
        />
      )}

      {/* Timestamp */}
      <Typography
        id={`${message.id}-time`}
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: '0.75rem'
        }}
        title={formatDateAndTime(message.created_at)}
      >
        {formatTime(message.created_at)}
      </Typography>

      {/* Edited indicator */}
      {message.edited && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled',
            fontSize: '0.7rem',
            fontStyle: 'italic'
          }}
        >
          (edited)
        </Typography>
      )}

      {/* Status indicator (for own messages) */}
      {isOwnMessage && <StatusIcon />}
    </Box>
  );
};

export default memo(MessageHeader);
