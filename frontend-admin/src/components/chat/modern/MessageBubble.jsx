/**
 * MessageBubble - Glassmorphism message bubble component
 */

import React, { useState } from 'react';
import { Box, Typography, IconButton, Tooltip, Avatar } from '@mui/material';
import {
  Reply,
  Edit,
  Delete,
  EmojiEmotions,
  DoneAll,
  Done,
  Schedule,
  InsertDriveFile,
  Image as ImageIcon,
  PlayArrow
} from '@mui/icons-material';
import { format, isToday, isYesterday } from 'date-fns';
import { tr } from 'date-fns/locale';

const MessageBubble = ({
  message,
  isOwn,
  showSenderName = false,
  onReply,
  onReact,
  onEdit,
  onDelete
}) => {
  const [showActions, setShowActions] = useState(false);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return format(date, 'HH:mm', { locale: tr });
  };

  const renderStatus = () => {
    if (!isOwn) return null;

    const status = message.status || 'sent';
    const iconStyle = { fontSize: 14, opacity: 0.7 };

    switch (status) {
      case 'read':
        return <DoneAll sx={{ ...iconStyle, color: '#10B981' }} />;
      case 'delivered':
        return <DoneAll sx={iconStyle} />;
      case 'sent':
        return <Done sx={iconStyle} />;
      default:
        return <Schedule sx={iconStyle} />;
    }
  };

  const renderFileAttachment = () => {
    if (!message.file_url) return null;

    const mimeType = message.file_mime_type || '';
    const fileName = message.file_name || 'File';
    const fileUrl = message.file_url;

    // Image
    if (mimeType.startsWith('image/')) {
      return (
        <Box
          component="img"
          src={fileUrl}
          alt={fileName}
          sx={{
            maxWidth: '100%',
            maxHeight: 300,
            borderRadius: 2,
            mt: 1,
            cursor: 'pointer',
            transition: 'transform 0.2s ease',
            '&:hover': {
              transform: 'scale(1.02)'
            }
          }}
          onClick={() => window.open(fileUrl, '_blank')}
        />
      );
    }

    // Video
    if (mimeType.startsWith('video/')) {
      return (
        <Box
          sx={{
            position: 'relative',
            mt: 1,
            borderRadius: 2,
            overflow: 'hidden',
            maxWidth: 300
          }}
        >
          <video
            src={fileUrl}
            controls
            style={{ width: '100%', borderRadius: 8 }}
          />
        </Box>
      );
    }

    // Audio
    if (mimeType.startsWith('audio/')) {
      return (
        <Box sx={{ mt: 1, maxWidth: 280 }}>
          <audio src={fileUrl} controls style={{ width: '100%' }} />
        </Box>
      );
    }

    // Other files
    return (
      <Box
        onClick={() => window.open(fileUrl, '_blank')}
        sx={{
          mt: 1,
          p: 1.5,
          borderRadius: 2,
          background: 'rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.15)'
          }
        }}
      >
        <InsertDriveFile sx={{ fontSize: 28, opacity: 0.8 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {fileName}
          </Typography>
          {message.file_size && (
            <Typography variant="caption" sx={{ opacity: 0.6 }}>
              {formatFileSize(message.file_size)}
            </Typography>
          )}
        </Box>
      </Box>
    );
  };

  const renderReplyPreview = () => {
    if (!message.replied_to_message) return null;

    const replied = message.replied_to_message;
    return (
      <Box
        sx={{
          pl: 1.5,
          py: 0.5,
          mb: 1,
          borderLeft: '3px solid var(--theme-primary, rgba(255,255,255,0.5))',
          opacity: 0.8
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
          {replied.sender_name}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {replied.content || '[Dosya]'}
        </Typography>
      </Box>
    );
  };

  const renderReactions = () => {
    if (!message.reactions?.length) return null;

    // Group reactions by emoji
    const grouped = message.reactions.reduce((acc, r) => {
      acc[r.emoji] = acc[r.emoji] || [];
      acc[r.emoji].push(r);
      return acc;
    }, {});

    return (
      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
        {Object.entries(grouped).map(([emoji, reactions]) => (
          <Tooltip
            key={emoji}
            title={reactions.map(r => r.user_name || r.user_type).join(', ')}
          >
            <Box
              onClick={() => onReact && onReact(emoji)}
              sx={{
                px: 0.8,
                py: 0.2,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: '0.75rem',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'rgba(255, 255, 255, 0.25)'
                }
              }}
            >
              <span>{emoji}</span>
              {reactions.length > 1 && <span>{reactions.length}</span>}
            </Box>
          </Tooltip>
        ))}
      </Box>
    );
  };

  return (
    <Box
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      sx={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        mb: 1.5,
        position: 'relative',
        px: 1
      }}
    >
      {/* Message Content */}
      <Box
        sx={{
          maxWidth: '70%',
          minWidth: 100,
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          background: isOwn
            ? 'linear-gradient(135deg, rgba(var(--theme-primary-rgb, 139, 92, 246), 0.3), rgba(var(--theme-accent-rgb, 236, 72, 153), 0.2))'
            : 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          p: 1.5,
          transition: 'all 0.2s ease',
          position: 'relative',
          '&:hover': {
            background: isOwn
              ? 'linear-gradient(135deg, rgba(var(--theme-primary-rgb, 139, 92, 246), 0.35), rgba(var(--theme-accent-rgb, 236, 72, 153), 0.25))'
              : 'rgba(255, 255, 255, 0.12)'
          }
        }}
      >
        {/* Sender Name (for group chats) */}
        {!isOwn && showSenderName && message.sender_name && (
          <Typography
            variant="caption"
            sx={{
              color: 'var(--theme-primary, #8B5CF6)',
              fontWeight: 600,
              display: 'block',
              mb: 0.5
            }}
          >
            {message.sender_name}
          </Typography>
        )}

        {/* Reply Preview */}
        {renderReplyPreview()}

        {/* Deleted Message */}
        {message.is_deleted ? (
          <Typography
            variant="body2"
            sx={{
              fontStyle: 'italic',
              opacity: 0.6,
              color: 'var(--theme-card-text, #fff)'
            }}
          >
            Bu mesaj silindi
          </Typography>
        ) : (
          <>
            {/* Text Content */}
            {message.content && (
              <Typography
                variant="body2"
                sx={{
                  color: 'var(--theme-card-text, #fff)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {message.content}
              </Typography>
            )}

            {/* File Attachment */}
            {renderFileAttachment()}
          </>
        )}

        {/* Reactions */}
        {renderReactions()}

        {/* Timestamp + Status */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 0.5,
            mt: 0.5
          }}
        >
          {message.is_edited && (
            <Typography
              variant="caption"
              sx={{ opacity: 0.5, fontSize: '0.65rem', color: 'var(--theme-card-text, #fff)' }}
            >
              (duzenlendi)
            </Typography>
          )}
          <Typography
            variant="caption"
            sx={{ opacity: 0.6, fontSize: '0.7rem', color: 'var(--theme-card-text, #fff)' }}
          >
            {formatTime(message.created_at)}
          </Typography>
          {renderStatus()}
        </Box>
      </Box>

      {/* Action Toolbar */}
      {showActions && !message.is_deleted && (
        <Box
          sx={{
            position: 'absolute',
            top: -8,
            [isOwn ? 'right' : 'left']: isOwn ? 'calc(70% + 8px)' : 'calc(70% + 8px)',
            display: 'flex',
            gap: 0.5,
            background: 'rgba(30, 41, 59, 0.9)',
            backdropFilter: 'blur(10px)',
            borderRadius: 2,
            p: 0.5,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {onReply && (
            <Tooltip title="Yanitla" arrow>
              <IconButton
                size="small"
                onClick={() => onReply(message)}
                sx={{ color: 'var(--theme-card-text, #fff)', p: 0.5 }}
              >
                <Reply fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onReact && (
            <Tooltip title="Tepki" arrow>
              <IconButton
                size="small"
                onClick={() => onReact(message)}
                sx={{ color: 'var(--theme-card-text, #fff)', p: 0.5 }}
              >
                <EmojiEmotions fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {isOwn && onEdit && (
            <Tooltip title="Duzenle" arrow>
              <IconButton
                size="small"
                onClick={() => onEdit(message)}
                sx={{ color: 'var(--theme-card-text, #fff)', p: 0.5 }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {isOwn && onDelete && (
            <Tooltip title="Sil" arrow>
              <IconButton
                size="small"
                onClick={() => onDelete(message.message_id)}
                sx={{ color: '#EF4444', p: 0.5 }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}
    </Box>
  );
};

// Utility function
const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default MessageBubble;
