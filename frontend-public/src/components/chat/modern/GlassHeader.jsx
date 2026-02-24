/**
 * GlassHeader - Glassmorphism chat header
 */

import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VideocamIcon from '@mui/icons-material/Videocam';
import CallIcon from '@mui/icons-material/Call';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import PushPinIcon from '@mui/icons-material/PushPin';

import { AvatarWithStatus } from '../EmployeeDirectory/OnlineStatusBadge';
import { TypingIndicatorInline } from './TypingIndicatorBubble';

export function GlassHeader({
  room,
  otherUser,
  typingUsers = [],
  onBack,
  onVideoCall,
  onVoiceCall,
  onSearch,
  onMenu,
  showBackButton = false,
  pinnedMessage = null,
}) {
  const isGroup = room?.room_type === 'group' || room?.room_type === 'DEPARTMENT_GROUP';
  const isAnnouncement = room?.room_type === 'ANNOUNCEMENT';
  const isDM = room?.room_type === 'PRIVATE_DM';

  // Baslik ve alt baslik
  const title = isDM && otherUser
    ? otherUser.fullName || otherUser.name
    : room?.room_name || room?.applicant_name || 'Sohbet';

  const subtitle = isDM && otherUser
    ? otherUser.jobTitle || otherUser.department
    : isGroup
    ? `${room?.members?.length || 0} uye`
    : isAnnouncement
    ? 'Duyuru Kanali'
    : room?.applicant_email;

  // Presence durumu
  const presenceStatus = isDM && otherUser?.presence
    ? otherUser.presence.status
    : null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1.5,
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        borderBottom: '1px solid var(--glass-border)',
        minHeight: 64,
      }}
    >
      {/* Geri Butonu */}
      {showBackButton && (
        <IconButton
          onClick={onBack}
          size="small"
          sx={{ mr: -1 }}
        >
          <ArrowBackIcon />
        </IconButton>
      )}

      {/* Avatar */}
      <AvatarWithStatus
        src={otherUser?.profilePicture || room?.avatar_url}
        alt={title}
        status={presenceStatus || 'offline'}
        size={44}
      />

      {/* Bilgiler */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </Typography>

        {/* Alt bilgi veya typing indicator */}
        {typingUsers.length > 0 ? (
          <TypingIndicatorInline users={typingUsers} />
        ) : (
          <Typography
            variant="caption"
            sx={{
              color: presenceStatus === 'online'
                ? 'var(--presence-online)'
                : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
            }}
          >
            {presenceStatus === 'online' ? 'Cevrimici' : subtitle}
          </Typography>
        )}
      </Box>

      {/* Aksiyonlar */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {/* Arama */}
        {onSearch && (
          <Tooltip title="Mesajlarda ara">
            <IconButton size="small" onClick={onSearch}>
              <SearchIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* Sesli Arama */}
        {onVoiceCall && !isAnnouncement && (
          <Tooltip title="Sesli arama">
            <IconButton size="small" onClick={onVoiceCall}>
              <CallIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* Video Arama */}
        {onVideoCall && !isAnnouncement && (
          <Tooltip title="Goruntulu arama">
            <IconButton
              size="small"
              onClick={onVideoCall}
              sx={{
                color: 'var(--color-primary)',
                '&:hover': {
                  backgroundColor: 'rgba(28, 97, 171, 0.1)',
                },
              }}
            >
              <VideocamIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* Menu */}
        {onMenu && (
          <IconButton size="small" onClick={onMenu}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <PinnedMessageBanner message={pinnedMessage} />
      )}
    </Box>
  );
}

/**
 * Sabitlenmis mesaj banner'i
 */
function PinnedMessageBanner({ message, onClick }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 2,
        py: 1,
        backgroundColor: 'rgba(28, 97, 171, 0.08)',
        borderBottom: '1px solid var(--border-light)',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'rgba(28, 97, 171, 0.12)',
        },
      }}
    >
      <PushPinIcon
        sx={{ fontSize: 16, color: 'var(--color-primary)', transform: 'rotate(45deg)' }}
      />
      <Typography
        variant="caption"
        sx={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'var(--text-secondary)',
        }}
      >
        <strong>{message.sender_name}:</strong> {message.content}
      </Typography>
    </Box>
  );
}

export default GlassHeader;
