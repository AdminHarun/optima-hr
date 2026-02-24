// Adapted from Rocket.Chat MessageToolbar.tsx
// Converted to Material-UI for Optima with 3-dot menu pattern
import React, { memo, useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  MoreVert,
  Reply,
  Forward,
  ContentCopy,
  Edit,
  Delete,
  PushPin,
  PushPinOutlined
} from '@mui/icons-material';

/**
 * Message Toolbar Component - 3-dot menu for message actions
 * WhatsApp/Telegram pattern adapted for Optima
 */
const MessageToolbar = ({
  message,
  isOwnMessage,
  currentUserType,
  onEdit,
  onDelete,
  onReply,
  onForward,
  onCopy,
  onPin,
  isPinned = false,
  isDark = false
}) => {
  // Admin her mesajı silebilir
  const canDelete = isOwnMessage || currentUserType === 'admin';
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuAction = (action) => {
    handleClose();
    action();
  };

  return (
    <>
      {/* 3-Dot Menu Button */}
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{
          width: 24,
          height: 24,
          borderRadius: '8px',
          color: isDark ? '#ABABAD' : '#718096',
          backgroundColor: open ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(100, 150, 200, 0.15)') : 'transparent',
          '&:hover': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(100, 150, 200, 0.12)',
            color: isDark ? '#E0E0E0' : '#5a9fd4'
          },
          transition: 'all 0.2s ease'
        }}
      >
        <MoreVert sx={{ fontSize: 18 }} />
      </IconButton>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        anchorOrigin={{
          vertical: 'top',
          horizontal: isOwnMessage ? 'left' : 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: isOwnMessage ? 'right' : 'left',
        }}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: isDark ? '0 4px 20px rgba(0, 0, 0, 0.4)' : '0 4px 20px rgba(0, 0, 0, 0.15)',
            minWidth: 180,
            mt: 0.5,
            ...(isDark && {
              bgcolor: '#222529',
              border: '1px solid #35373B'
            }),
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1,
              borderRadius: '8px',
              mx: 0.5,
              my: 0.25,
              fontSize: '14px',
              color: isDark ? '#E0E0E0' : undefined,
              '&:hover': {
                backgroundColor: isDark ? '#27242C' : 'rgba(100, 150, 200, 0.08)'
              }
            }
          }
        }}
      >
        {/* Yanıtla */}
        <MenuItem onClick={() => handleMenuAction(() => onReply?.(message))}>
          <ListItemIcon>
            <Reply fontSize="small" sx={{ color: isDark ? '#5CC5F8' : '#5a9fd4' }} />
          </ListItemIcon>
          <ListItemText>Yanıtla</ListItemText>
        </MenuItem>

        {/* İlet */}
        <MenuItem onClick={() => handleMenuAction(() => onForward?.(message))}>
          <ListItemIcon>
            <Forward fontSize="small" sx={{ color: isDark ? '#5CC5F8' : '#5a9fd4' }} />
          </ListItemIcon>
          <ListItemText>İlet</ListItemText>
        </MenuItem>

        {/* Kopyala */}
        <MenuItem onClick={() => handleMenuAction(() => {
          navigator.clipboard.writeText(message.content);
          onCopy?.();
        })}>
          <ListItemIcon>
            <ContentCopy fontSize="small" sx={{ color: isDark ? '#5CC5F8' : '#5a9fd4' }} />
          </ListItemIcon>
          <ListItemText>Kopyala</ListItemText>
        </MenuItem>

        {/* Sabitle / Sabitlemeyi Kaldır */}
        <MenuItem onClick={() => handleMenuAction(() => onPin?.(message))}>
          <ListItemIcon>
            {isPinned ? (
              <PushPin fontSize="small" sx={{ color: '#8bb94a' }} />
            ) : (
              <PushPinOutlined fontSize="small" sx={{ color: '#718096' }} />
            )}
          </ListItemIcon>
          <ListItemText>{isPinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}</ListItemText>
        </MenuItem>

        {/* Divider before dangerous actions */}
        {(isOwnMessage || canDelete) && <Divider sx={{ my: 0.5 }} />}

        {/* Düzenle (sadece kendi mesajları için) */}
        {isOwnMessage && (
          <MenuItem onClick={() => handleMenuAction(onEdit)}>
            <ListItemIcon>
              <Edit fontSize="small" sx={{ color: '#ed8936' }} />
            </ListItemIcon>
            <ListItemText>Düzenle</ListItemText>
          </MenuItem>
        )}

        {/* Sil (kendi mesajları veya admin ise tüm mesajlar) */}
        {canDelete && (
          <MenuItem
            onClick={() => handleMenuAction(() => {
              if (window.confirm('Bu mesajı silmek istediğinize emin misiniz?')) {
                onDelete();
              }
            })}
            sx={{
              color: '#fc8181',
              '&:hover': {
                backgroundColor: 'rgba(252, 129, 129, 0.08)'
              }
            }}
          >
            <ListItemIcon>
              <Delete fontSize="small" sx={{ color: '#fc8181' }} />
            </ListItemIcon>
            <ListItemText>Sil</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default memo(MessageToolbar);
