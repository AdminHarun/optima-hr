/**
 * TypingIndicatorBubble - "Yazıyor..." animasyonu
 */

import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Animasyonlu noktalar
 */
function TypingDots() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        height: 20,
      }}
    >
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'var(--text-muted)',
            animation: 'typingBounce 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
            '@keyframes typingBounce': {
              '0%, 60%, 100%': {
                transform: 'translateY(0)',
              },
              '30%': {
                transform: 'translateY(-4px)',
              },
            },
          }}
        />
      ))}
    </Box>
  );
}

/**
 * Typing indicator baloncugu
 */
export function TypingIndicatorBubble({
  users = [],
  showAvatar = true,
  className = '',
}) {
  if (!users || users.length === 0) {
    return null;
  }

  // Kullanici isimlerini formatla
  const formatUserNames = () => {
    if (users.length === 1) {
      return `${users[0].userName || users[0].name || 'Birisi'} yaziyor`;
    }
    if (users.length === 2) {
      const names = users.map(u => u.userName || u.name || 'Birisi');
      return `${names[0]} ve ${names[1]} yaziyor`;
    }
    return `${users.length} kisi yaziyor`;
  };

  return (
    <Box
      className={`tw-animate-fade-in ${className}`}
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
        mb: 1,
        maxWidth: '70%',
      }}
    >
      {/* Avatar (opsiyonel) */}
      {showAvatar && users[0] && (
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            backgroundColor: 'var(--bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            flexShrink: 0,
          }}
        >
          {(users[0].userName || users[0].name || '?')[0].toUpperCase()}
        </Box>
      )}

      {/* Balon */}
      <Box
        sx={{
          backgroundColor: 'var(--chat-other-bg)',
          borderRadius: '18px 18px 18px 4px',
          px: 2,
          py: 1.5,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <TypingDots />
      </Box>
    </Box>
  );
}

/**
 * Inline typing indicator (header veya input alani icin)
 */
export function TypingIndicatorInline({
  users = [],
  className = '',
}) {
  if (!users || users.length === 0) {
    return null;
  }

  const formatUserNames = () => {
    if (users.length === 1) {
      return `${users[0].userName || users[0].name || 'Birisi'} yaziyor...`;
    }
    if (users.length === 2) {
      const names = users.map(u => u.userName || u.name || 'Birisi');
      return `${names[0]} ve ${names[1]} yaziyor...`;
    }
    return `${users.length} kisi yaziyor...`;
  };

  return (
    <Box
      className={`tw-animate-fade-in ${className}`}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        color: 'var(--text-muted)',
        fontSize: 12,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: 'var(--color-primary)',
              animation: 'typingBounce 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
              '@keyframes typingBounce': {
                '0%, 60%, 100%': {
                  transform: 'translateY(0)',
                },
                '30%': {
                  transform: 'translateY(-2px)',
                },
              },
            }}
          />
        ))}
      </Box>
      <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
        {formatUserNames()}
      </Typography>
    </Box>
  );
}

/**
 * Typing preview (Comm100 tarzi - yazilani goster)
 */
export function TypingPreview({
  content = '',
  userName = '',
  className = '',
}) {
  if (!content) {
    return null;
  }

  return (
    <Box
      className={`tw-animate-fade-in ${className}`}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        mb: 1,
        maxWidth: '70%',
        opacity: 0.7,
      }}
    >
      {/* Avatar */}
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          backgroundColor: 'var(--bg-tertiary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          flexShrink: 0,
        }}
      >
        {(userName || '?')[0].toUpperCase()}
      </Box>

      {/* Icerik */}
      <Box
        sx={{
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '18px 18px 18px 4px',
          px: 2,
          py: 1.5,
          border: '1px dashed var(--border-medium)',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
            wordBreak: 'break-word',
          }}
        >
          {content}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'var(--text-muted)',
            display: 'block',
            mt: 0.5,
          }}
        >
          {userName} yaziyor...
        </Typography>
      </Box>
    </Box>
  );
}

export default TypingIndicatorBubble;
