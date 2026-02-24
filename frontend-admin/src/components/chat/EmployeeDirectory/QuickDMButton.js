/**
 * QuickDMButton - Hizli DM baslat butonu
 */

import React, { useState } from 'react';
import { IconButton, Tooltip, CircularProgress } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';

export function QuickDMButton({
  employeeId,
  employeeName,
  onStartDM,
  size = 'small',
  disabled = false,
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e) => {
    e.stopPropagation();

    if (isLoading || disabled) return;

    setIsLoading(true);
    try {
      await onStartDM(employeeId);
    } catch (error) {
      console.error('[QuickDMButton] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Tooltip title={`${employeeName} ile mesajlas`} placement="top">
      <span>
        <IconButton
          size={size}
          onClick={handleClick}
          disabled={isLoading || disabled}
          sx={{
            color: 'var(--color-primary)',
            '&:hover': {
              backgroundColor: 'var(--color-primary)',
              color: 'white',
            },
            transition: 'all 0.2s ease',
          }}
        >
          {isLoading ? (
            <CircularProgress size={size === 'small' ? 16 : 20} color="inherit" />
          ) : (
            <ChatBubbleOutlineIcon fontSize={size} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default QuickDMButton;
