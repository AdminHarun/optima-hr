/**
 * GlassComposer - Glassmorphism mesaj yazma alani
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Tooltip,
  Collapse,
  Typography,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import MicIcon from '@mui/icons-material/Mic';
import InsertEmoticoIcon from '@mui/icons-material/InsertEmoticon';
import CloseIcon from '@mui/icons-material/Close';
import ReplyIcon from '@mui/icons-material/Reply';

export function GlassComposer({
  onSend,
  onTyping,
  onFileSelect,
  onVoiceRecord,
  replyTo = null,
  onCancelReply,
  disabled = false,
  placeholder = 'Mesaj yazin...',
  maxLength = 5000,
  showEmojiPicker = true,
  showFileAttach = true,
  showVoiceRecord = true,
}) {
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Reply varsa input'a focus
  useEffect(() => {
    if (replyTo) {
      inputRef.current?.focus();
    }
  }, [replyTo]);

  // Mesaj degisikligi
  const handleChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);

      // Typing indicator
      if (onTyping) {
        onTyping(true);

        // 2 saniye sonra typing'i durdur
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false);
        }, 2000);
      }
    }
  };

  // Mesaj gonder
  const handleSend = useCallback(() => {
    if (!message.trim() || disabled) return;

    onSend?.(message.trim(), { replyTo });
    setMessage('');
    onCancelReply?.();

    // Typing'i durdur
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    onTyping?.(false);
  }, [message, disabled, onSend, replyTo, onCancelReply, onTyping]);

  // Enter ile gonder (Shift+Enter yeni satir)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Dosya secimi
  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleFileChange = async (e, type = 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await onFileSelect?.(file, type);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const canSend = message.trim().length > 0 && !disabled && !isUploading;

  return (
    <Box
      sx={{
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        borderTop: '1px solid var(--glass-border)',
      }}
    >
      {/* Reply Preview */}
      <Collapse in={!!replyTo}>
        {replyTo && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              backgroundColor: 'rgba(28, 97, 171, 0.08)',
              borderBottom: '1px solid var(--border-light)',
            }}
          >
            <ReplyIcon sx={{ fontSize: 18, color: 'var(--color-primary)' }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                sx={{ color: 'var(--color-primary)', fontWeight: 600 }}
              >
                {replyTo.sender_name}'a yanit
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {replyTo.content}
              </Typography>
            </Box>
            <IconButton size="small" onClick={onCancelReply}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Collapse>

      {/* Input Area */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          p: 1.5,
        }}
      >
        {/* Sol Aksiyonlar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {showEmojiPicker && (
            <Tooltip title="Emoji">
              <IconButton
                size="small"
                disabled={disabled}
                sx={{ color: 'var(--text-muted)' }}
              >
                <InsertEmoticoIcon />
              </IconButton>
            </Tooltip>
          )}

          {showFileAttach && (
            <>
              <Tooltip title="Dosya ekle">
                <IconButton
                  size="small"
                  onClick={handleFileClick}
                  disabled={disabled || isUploading}
                  sx={{ color: 'var(--text-muted)' }}
                >
                  <AttachFileIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Resim ekle">
                <IconButton
                  size="small"
                  onClick={handleImageClick}
                  disabled={disabled || isUploading}
                  sx={{ color: 'var(--text-muted)' }}
                >
                  <ImageIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>

        {/* Input */}
        <TextField
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={4}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          variant="outlined"
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '20px',
              backgroundColor: 'white',
              '& fieldset': {
                borderColor: 'var(--border-light)',
              },
              '&:hover fieldset': {
                borderColor: 'var(--border-medium)',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'var(--color-primary)',
                borderWidth: 1,
              },
            },
            '& .MuiInputBase-input': {
              py: 1,
              px: 1.5,
            },
          }}
        />

        {/* Sag Aksiyonlar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* Ses Kaydi veya Gonder */}
          {canSend ? (
            <Tooltip title="Gonder">
              <IconButton
                onClick={handleSend}
                sx={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'var(--color-primary-dark)',
                  },
                }}
              >
                {isUploading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SendIcon />
                )}
              </IconButton>
            </Tooltip>
          ) : showVoiceRecord ? (
            <Tooltip title="Sesli mesaj">
              <IconButton
                onClick={onVoiceRecord}
                disabled={disabled}
                sx={{ color: 'var(--text-muted)' }}
              >
                <MicIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <IconButton
              disabled
              sx={{ color: 'var(--text-muted)', opacity: 0.5 }}
            >
              <SendIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Karakter Sayaci */}
      {message.length > maxLength * 0.8 && (
        <Box
          sx={{
            px: 2,
            pb: 1,
            textAlign: 'right',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: message.length >= maxLength ? 'error.main' : 'var(--text-muted)',
            }}
          >
            {message.length}/{maxLength}
          </Typography>
        </Box>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={(e) => handleFileChange(e, 'file')}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
      />
      <input
        ref={imageInputRef}
        type="file"
        hidden
        onChange={(e) => handleFileChange(e, 'image')}
        accept="image/*"
      />
    </Box>
  );
}

export default GlassComposer;
