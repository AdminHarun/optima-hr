/**
 * GlassCard - Reusable glassmorphism card component
 */

import React from 'react';
import { Box } from '@mui/material';

const GlassCard = ({
  children,
  sx = {},
  blur = 20,
  opacity = 0.12,
  borderOpacity = 0.25,
  borderRadius = 3,
  padding = 2,
  hover = false,
  onClick,
  ...props
}) => {
  return (
    <Box
      onClick={onClick}
      sx={{
        backdropFilter: `blur(${blur}px) saturate(180%)`,
        WebkitBackdropFilter: `blur(${blur}px) saturate(180%)`,
        background: `rgba(255, 255, 255, ${opacity})`,
        border: `1px solid rgba(255, 255, 255, ${borderOpacity})`,
        borderRadius,
        padding,
        transition: 'all 0.3s ease',
        cursor: onClick ? 'pointer' : 'default',
        ...(hover && {
          '&:hover': {
            background: `rgba(255, 255, 255, ${opacity + 0.05})`,
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
          }
        }),
        ...sx
      }}
      {...props}
    >
      {children}
    </Box>
  );
};

export default GlassCard;
