// Adapted from Rocket.Chat MessageHeader.tsx
// Converted to Material-UI for Optima
import React, { memo } from 'react';
import { Box, Typography, Chip } from '@mui/material';

/**
 * Message Header Component - Shows sender name and timestamp
 * Status indicators are shown at bottom of message (RoomMessage.js)
 */
const MessageHeader = ({ message, isOwnMessage, onNameClick }) => {
  const formatDateAndTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

      {/* Edited indicator */}
      {message.edited && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.disabled',
            fontSize: '0.7rem',
            fontStyle: 'italic'
          }}
          title={formatDateAndTime(message.edited_at || message.created_at)}
        >
          (düzenlendi)
        </Typography>
      )}
    </Box>
  );
};

export default memo(MessageHeader);
