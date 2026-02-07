// Call Status Message Component - WhatsApp/Telegram style
import React, { memo } from 'react';
import { Box, Typography } from '@mui/material';
import {
  Call,
  CallEnd,
  CallMissed,
  PhoneCallback,
  VideocamOff
} from '@mui/icons-material';

/**
 * Call Status Message - Shows call status in chat
 * Types: ended, missed, incoming, outgoing
 */
const CallStatusMessage = ({ message }) => {
  const getCallInfo = () => {
    const content = message.content || '';

    // Parse call info from content
    // Format examples:
    // "Arama sona erdi - 07:32"
    // "Cevapsız arama"
    // "Gelen arama"
    // "Giden arama"

    if (content.includes('sona erdi') || content.includes('ended')) {
      const durationMatch = content.match(/(\d+):(\d+)/);
      const duration = durationMatch ? durationMatch[0] : null;
      return {
        type: 'ended',
        icon: CallEnd,
        text: duration ? `Arama sona erdi` : 'Arama sona erdi',
        duration,
        color: '#48bb78', // Green
        bgColor: 'rgba(72, 187, 120, 0.1)'
      };
    }

    if (content.includes('Cevapsız') || content.includes('Missed') || content.includes('missed')) {
      return {
        type: 'missed',
        icon: CallMissed,
        text: 'Cevapsız arama',
        color: '#fc8181', // Red
        bgColor: 'rgba(252, 129, 129, 0.1)'
      };
    }

    if (content.includes('Gelen') || content.includes('Incoming')) {
      return {
        type: 'incoming',
        icon: PhoneCallback,
        text: 'Gelen arama',
        color: '#5a9fd4', // Blue
        bgColor: 'rgba(90, 159, 212, 0.1)'
      };
    }

    if (content.includes('Giden') || content.includes('Outgoing')) {
      return {
        type: 'outgoing',
        icon: Call,
        text: 'Giden arama',
        color: '#5a9fd4', // Blue
        bgColor: 'rgba(90, 159, 212, 0.1)'
      };
    }

    if (content.includes('Video') || content.includes('video')) {
      return {
        type: 'video_missed',
        icon: VideocamOff,
        text: 'Cevapsız görüntülü arama',
        color: '#fc8181', // Red
        bgColor: 'rgba(252, 129, 129, 0.1)'
      };
    }

    // Default
    return {
      type: 'call',
      icon: Call,
      text: content,
      color: '#718096',
      bgColor: 'rgba(113, 128, 150, 0.1)'
    };
  };

  const callInfo = getCallInfo();
  const Icon = callInfo.icon;

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        py: 1.5,
        px: 2
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          backgroundColor: callInfo.bgColor,
          border: `1px solid ${callInfo.color}20`,
          px: 2.5,
          py: 1.25,
          borderRadius: '16px',
          maxWidth: '320px'
        }}
      >
        <Icon
          sx={{
            fontSize: 20,
            color: callInfo.color
          }}
        />
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: '13px',
              fontWeight: 600,
              color: callInfo.color,
              lineHeight: 1.4
            }}
          >
            {callInfo.text}
          </Typography>
          {callInfo.duration && (
            <Typography
              variant="caption"
              sx={{
                fontSize: '12px',
                color: '#718096',
                fontWeight: 500
              }}
            >
              {callInfo.duration}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default memo(CallStatusMessage);
