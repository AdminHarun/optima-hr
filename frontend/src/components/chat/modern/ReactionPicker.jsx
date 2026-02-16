/**
 * ReactionPicker - Emoji tepki secici
 */

import React, { useState, useRef } from 'react';
import { Box, IconButton, Popover, Tooltip } from '@mui/material';
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';

// Hizli tepki emojileri
const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// Tum kategoriler
const emojiCategories = {
  'Sık Kullanılanlar': ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥', '✅', '👀'],
  'Yüzler': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷'],
  'El Hareketleri': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Kalpler': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
  'İşaretler': ['✅', '❌', '⭕', '❗', '❓', '💯', '🔥', '✨', '⚡', '💫', '🎉', '🎊', '🏆', '🥇', '🎯', '💪', '👀', '👁️'],
};

export function ReactionPicker({
  onReact,
  existingReactions = [],
  currentUserReaction = null,
  size = 'small',
  disabled = false,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const buttonRef = useRef(null);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleReact = (emoji) => {
    onReact?.(emoji);
    handleClose();
  };

  const open = Boolean(anchorEl);

  return (
    <>
      {/* Tepki Butonu */}
      <IconButton
        ref={buttonRef}
        size={size}
        onClick={handleOpen}
        disabled={disabled}
        sx={{
          color: 'var(--text-muted)',
          '&:hover': {
            color: 'var(--color-primary)',
            backgroundColor: 'rgba(28, 97, 171, 0.08)',
          },
        }}
      >
        <AddReactionOutlinedIcon fontSize={size} />
      </IconButton>

      {/* Emoji Picker Popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          },
        }}
      >
        <Box sx={{ p: 1 }}>
          {/* Hizli Tepkiler */}
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              p: 1,
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            {quickReactions.map((emoji) => (
              <EmojiButton
                key={emoji}
                emoji={emoji}
                onClick={() => handleReact(emoji)}
                isSelected={currentUserReaction === emoji}
              />
            ))}
          </Box>

          {/* Tum Emojiler */}
          <Box
            sx={{
              maxHeight: 250,
              overflowY: 'auto',
              p: 1,
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'var(--border-medium)',
                borderRadius: 3,
              },
            }}
          >
            {Object.entries(emojiCategories).map(([category, emojis]) => (
              <Box key={category} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    mb: 0.5,
                    px: 0.5,
                  }}
                >
                  {category}
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    gap: 0.25,
                  }}
                >
                  {emojis.map((emoji) => (
                    <EmojiButton
                      key={emoji}
                      emoji={emoji}
                      onClick={() => handleReact(emoji)}
                      isSelected={currentUserReaction === emoji}
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Popover>
    </>
  );
}

/**
 * Emoji Butonu
 */
function EmojiButton({ emoji, onClick, isSelected = false, size = 'medium' }) {
  const sizeMap = {
    small: 28,
    medium: 36,
    large: 44,
  };

  const buttonSize = sizeMap[size] || sizeMap.medium;
  const fontSize = buttonSize * 0.55;

  return (
    <Tooltip title={emoji} placement="top">
      <Box
        onClick={onClick}
        sx={{
          width: buttonSize,
          height: buttonSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: fontSize,
          borderRadius: '8px',
          cursor: 'pointer',
          backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
          transition: 'all 0.15s ease',
          '&:hover': {
            backgroundColor: isSelected
              ? 'var(--color-primary-dark)'
              : 'var(--bg-tertiary)',
            transform: 'scale(1.15)',
          },
        }}
      >
        {emoji}
      </Box>
    </Tooltip>
  );
}

/**
 * Mesaj altinda gosterilen tepkiler
 */
export function MessageReactions({
  reactions = [],
  onReact,
  currentUserId,
  currentUserType,
}) {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  // Emoji bazinda grupla
  const groupedReactions = reactions.reduce((acc, reaction) => {
    const emoji = reaction.emoji;
    if (!acc[emoji]) {
      acc[emoji] = {
        emoji,
        count: 0,
        users: [],
        currentUserReacted: false,
      };
    }
    acc[emoji].count++;
    acc[emoji].users.push(reaction.user_name || reaction.user_type);
    if (
      reaction.user_type === currentUserType &&
      (reaction.user_id === currentUserId || reaction.user_name === currentUserId)
    ) {
      acc[emoji].currentUserReacted = true;
    }
    return acc;
  }, {});

  const reactionList = Object.values(groupedReactions);

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        mt: 0.5,
      }}
    >
      {reactionList.map(({ emoji, count, users, currentUserReacted }) => (
        <Tooltip
          key={emoji}
          title={users.join(', ')}
          placement="top"
        >
          <Box
            onClick={() => onReact?.(emoji)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.25,
              borderRadius: '12px',
              fontSize: 14,
              cursor: 'pointer',
              backgroundColor: currentUserReacted
                ? 'rgba(28, 97, 171, 0.15)'
                : 'var(--bg-tertiary)',
              border: currentUserReacted
                ? '1px solid var(--color-primary)'
                : '1px solid transparent',
              '&:hover': {
                backgroundColor: currentUserReacted
                  ? 'rgba(28, 97, 171, 0.25)'
                  : 'var(--border-light)',
              },
              transition: 'all 0.15s ease',
            }}
          >
            <span>{emoji}</span>
            {count > 1 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: currentUserReacted
                    ? 'var(--color-primary)'
                    : 'var(--text-secondary)',
                }}
              >
                {count}
              </span>
            )}
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}

export default ReactionPicker;
