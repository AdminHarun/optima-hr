/**
 * OnlineIndicator - Shows online/offline status
 */

import React from 'react';
import { Box, Tooltip } from '@mui/material';

const OnlineIndicator = ({
  isOnline = false,
  size = 12,
  showTooltip = true,
  lastSeen = null
}) => {
  const getStatusText = () => {
    if (isOnline) return 'Cevrimici';
    if (lastSeen) {
      const date = new Date(lastSeen);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Simdi ayrildi';
      if (diffMins < 60) return `${diffMins} dk once`;
      if (diffHours < 24) return `${diffHours} saat once`;
      return `${diffDays} gun once`;
    }
    return 'Cevrimdisi';
  };

  const indicator = (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: isOnline ? '#10B981' : '#6B7280',
        border: '2px solid rgba(255, 255, 255, 0.8)',
        boxShadow: isOnline ? '0 0 8px #10B981' : 'none',
        transition: 'all 0.3s ease',
        animation: isOnline ? 'pulse 2s infinite' : 'none',
        '@keyframes pulse': {
          '0%': {
            boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.4)'
          },
          '70%': {
            boxShadow: '0 0 0 6px rgba(16, 185, 129, 0)'
          },
          '100%': {
            boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)'
          }
        }
      }}
    />
  );

  if (!showTooltip) return indicator;

  return (
    <Tooltip title={getStatusText()} arrow>
      {indicator}
    </Tooltip>
  );
};

export default OnlineIndicator;
