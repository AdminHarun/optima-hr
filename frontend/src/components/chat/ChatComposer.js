// Adapted from Rocket.Chat MessageComposer
// Converted to Material-UI for Optima with Voice Recording
import React, { memo, useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Popover,
  Tooltip,
  Paper,
  CircularProgress,
  Typography
} from '@mui/material';
import {
  Send,
  EmojiEmotions,
  AttachFile,
  Close,
  Mic,
  Stop,
  Delete as DeleteIcon,
  PlayArrow,
  Pause,
  Reply as ReplyIcon
} from '@mui/icons-material';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import fileUploadService from '../../services/fileUploadService';

/**
 * Chat Composer Component - Message input area with voice recording
 * WhatsApp/Telegram pattern adapted for Optima
 */
const ChatComposer = ({
  onSendMessage,
  onFileUpload,
  onTyping,
  placeholder = 'Type a message...',
  disabled = false,
  maxLength = 5000,
  replyingTo = null,
  onCancelReply = null
}) => {
  const [message, setMessage] = useState('');
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const audioPreviewRef = useRef(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Typing indicator
  const handleTyping = () => {
    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    }
  };

  // Handle input change
  const handleChange = (e) => {
    setMessage(e.target.value);
    handleTyping();
  };

  // Handle key down
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (audioBlob) {
        sendVoiceMessage();
      } else {
        handleSend();
      }
    }
  };

  // Send text message
  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !selectedFile) return;
    if (isSending || isUploading) return;

    setIsSending(true);
    try {
      if (onTyping) onTyping(false);

      let uploadedFile = null;
      if (selectedFile) {
        setIsUploading(true);
        uploadedFile = await fileUploadService.uploadFile(selectedFile, setUploadProgress);
        setIsUploading(false);
      }

      if (trimmedMessage || uploadedFile) {
        await onSendMessage?.(trimmedMessage, uploadedFile);
        setMessage('');
        setSelectedFile(null);
        setUploadProgress(0);
      }

      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      setIsUploading(false);
    } finally {
      setIsSending(false);
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const newMessage = message.substring(0, start) + emoji.native + message.substring(end);
    setMessage(newMessage);
    setEmojiAnchorEl(null);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.native.length, start + emoji.native.length);
    }, 0);
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks = [];
      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });

      mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      });

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Mikrofon erişimi reddedildi. Lütfen mikrofon izinlerini kontrol edin.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      setAudioBlob(null);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const deleteAudioBlob = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setIsPlayingPreview(false);
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
  };

  const togglePlayPreview = () => {
    if (!audioBlob) return;

    if (isPlayingPreview) {
      audioPreviewRef.current?.pause();
      setIsPlayingPreview(false);
    } else {
      if (!audioPreviewRef.current) {
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPreviewRef.current = new Audio(audioUrl);
        audioPreviewRef.current.onended = () => setIsPlayingPreview(false);
      }
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;

    setIsSending(true);
    try {
      const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
        type: 'audio/webm'
      });

      setIsUploading(true);
      const uploadedFile = await fileUploadService.uploadFile(audioFile, setUploadProgress);
      setIsUploading(false);

      await onSendMessage?.('[Sesli Mesaj]', { ...uploadedFile, type: 'voice', duration: recordingTime });

      deleteAudioBlob();
    } catch (error) {
      console.error('Error sending voice message:', error);
      setIsUploading(false);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canSend = (message.trim() || selectedFile || audioBlob) && !disabled && !isSending;

  return (
    <Paper
      elevation={0}
      sx={{
        borderTop: '1px solid rgba(100, 150, 200, 0.12)',
        background: '#ffffff',
        p: 0.75,
        boxShadow: 'none',
        flexShrink: 0
      }}
    >
      {/* Reply Box - Telegram/WhatsApp Style */}
      {replyingTo && (
        <Box
          sx={{
            mb: 1,
            p: 1.25,
            backgroundColor: 'rgba(90, 159, 212, 0.08)',
            borderLeft: '3px solid #5a9fd4',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5
          }}
        >
          <ReplyIcon sx={{ fontSize: 18, color: '#5a9fd4', mt: 0.25 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: '#5a9fd4', fontWeight: 600, display: 'block' }}>
              {replyingTo.sender_name}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#718096',
                fontSize: '13px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {replyingTo.content?.substring(0, 100) || '[Dosya]'}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onCancelReply}
            sx={{
              color: '#a0aec0',
              '&:hover': {
                backgroundColor: 'rgba(160, 174, 192, 0.15)',
                color: '#718096'
              }
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* File Preview */}
      {selectedFile && !audioBlob && (
        <Box
          sx={{
            mb: 1,
            p: 1,
            backgroundColor: '#f5f6f7',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <AttachFile fontSize="small" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedFile.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {(selectedFile.size / 1024).toFixed(2)} KB
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleRemoveFile}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Voice Recording Preview */}
      {audioBlob && !isRecording && (
        <Box
          sx={{
            mb: 1,
            p: 1.5,
            backgroundColor: 'rgba(139, 185, 74, 0.08)',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            border: '1px solid rgba(139, 185, 74, 0.2)'
          }}
        >
          <IconButton
            size="small"
            onClick={togglePlayPreview}
            sx={{
              backgroundColor: '#8bb94a',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#7aa439'
              }
            }}
          >
            {isPlayingPreview ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
          </IconButton>

          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#2d3748' }}>
              Sesli Mesaj
            </Typography>
            <Typography variant="caption" sx={{ color: '#718096' }}>
              {formatTime(recordingTime)}
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={deleteAudioBlob}
            sx={{
              color: '#fc8181',
              '&:hover': {
                backgroundColor: 'rgba(252, 129, 129, 0.1)'
              }
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <Box
          sx={{
            mb: 1,
            p: 1.5,
            backgroundColor: 'rgba(252, 129, 129, 0.08)',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            border: '1px solid rgba(252, 129, 129, 0.2)'
          }}
        >
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: '#fc8181',
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.5 }
              }
            }}
          />

          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#e53e3e' }}>
              Kaydediliyor...
            </Typography>
            <Typography variant="caption" sx={{ color: '#718096' }}>
              {formatTime(recordingTime)}
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={cancelRecording}
            sx={{
              color: '#fc8181',
              '&:hover': {
                backgroundColor: 'rgba(252, 129, 129, 0.1)'
              }
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>

          <IconButton
            size="small"
            onClick={stopRecording}
            sx={{
              backgroundColor: '#fc8181',
              color: '#ffffff',
              '&:hover': {
                backgroundColor: '#e53e3e'
              }
            }}
          >
            <Stop fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Composer Input Area */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1
        }}
      >
        {!isRecording && !audioBlob && (
          <>
            {/* Emoji Button */}
            <Tooltip title="Emoji Ekle">
              <IconButton
                size="small"
                onClick={(e) => setEmojiAnchorEl(e.currentTarget)}
                disabled={disabled}
                sx={{
                  color: '#a0aec0',
                  backgroundColor: 'rgba(100, 150, 200, 0.08)',
                  borderRadius: '10px',
                  '&:hover': {
                    color: '#5a9fd4',
                    backgroundColor: 'rgba(100, 150, 200, 0.15)',
                    transform: 'scale(1.03)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <EmojiEmotions fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* File Upload Button */}
            <Tooltip title="Dosya Ekle">
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                sx={{
                  color: '#a0aec0',
                  backgroundColor: 'rgba(100, 150, 200, 0.08)',
                  borderRadius: '10px',
                  '&:hover': {
                    color: '#5a9fd4',
                    backgroundColor: 'rgba(100, 150, 200, 0.15)',
                    transform: 'scale(1.03)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                <AttachFile fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFileSelect}
              accept="image/*,video/*,application/pdf,.doc,.docx"
            />

            {/* Message Input */}
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              maxRows={6}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              inputProps={{ maxLength }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(100, 150, 200, 0.04)',
                  borderRadius: '14px',
                  border: '1.5px solid transparent',
                  '& fieldset': {
                    borderColor: 'transparent'
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(100, 150, 200, 0.06)',
                    borderColor: 'rgba(100, 150, 200, 0.15)',
                    '& fieldset': {
                      borderColor: 'transparent'
                    }
                  },
                  '&.Mui-focused': {
                    backgroundColor: '#ffffff',
                    borderColor: 'rgba(90, 159, 212, 0.3)',
                    boxShadow: '0 0 0 3px rgba(90, 159, 212, 0.08)',
                    '& fieldset': {
                      borderColor: 'transparent'
                    }
                  },
                  transition: 'all 0.2s ease'
                },
                '& .MuiOutlinedInput-input': {
                  py: 1,
                  px: 1.75,
                  fontSize: '14px',
                  lineHeight: 1.5,
                  color: '#2d3748'
                }
              }}
            />
          </>
        )}

        {/* Voice Record Button (when no text) */}
        {!message.trim() && !selectedFile && !audioBlob && !isRecording && (
          <Tooltip title="Sesli Mesaj Kaydet">
            <IconButton
              onClick={startRecording}
              disabled={disabled}
              sx={{
                background: 'linear-gradient(135deg, #8bb94a 0%, #7aa439 100%)',
                color: '#ffffff',
                width: 42,
                height: 42,
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(139, 185, 74, 0.25)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #7aa439 0%, #6b9137 100%)',
                  transform: 'scale(1.03)',
                  boxShadow: '0 4px 12px rgba(139, 185, 74, 0.3)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              <Mic fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* Send Button */}
        {(canSend || isRecording || audioBlob) && (
          <Tooltip title={audioBlob ? 'Sesli Mesaj Gönder' : 'Gönder'}>
            <span>
              <IconButton
                onClick={audioBlob ? sendVoiceMessage : handleSend}
                disabled={!canSend && !audioBlob}
                sx={{
                  background: (canSend || audioBlob)
                    ? 'linear-gradient(135deg, #6a9fd4 0%, #a0c88c 100%)'
                    : 'rgba(160, 174, 192, 0.15)',
                  color: (canSend || audioBlob) ? '#ffffff' : '#cbd5e0',
                  width: 42,
                  height: 42,
                  borderRadius: '12px',
                  boxShadow: (canSend || audioBlob) ? '0 2px 8px rgba(106, 159, 212, 0.25)' : 'none',
                  '&:hover': {
                    background: (canSend || audioBlob)
                      ? 'linear-gradient(135deg, #5a8fc4 0%, #90b87c 100%)'
                      : 'rgba(160, 174, 192, 0.15)',
                    transform: (canSend || audioBlob) ? 'scale(1.03)' : 'none',
                    boxShadow: (canSend || audioBlob) ? '0 4px 12px rgba(106, 159, 212, 0.3)' : 'none'
                  },
                  '&.Mui-disabled': {
                    background: 'rgba(160, 174, 192, 0.15)',
                    color: '#cbd5e0'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                {isSending ? (
                  <CircularProgress size={20} sx={{ color: '#ffffff' }} />
                ) : (
                  <Send fontSize="small" />
                )}
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      {/* Character Counter */}
      {message.length > maxLength * 0.9 && (
        <Box
          sx={{
            mt: 0.5,
            textAlign: 'right',
            fontSize: '0.75rem',
            color: message.length >= maxLength ? 'error.main' : 'text.secondary'
          }}
        >
          {message.length}/{maxLength}
        </Box>
      )}

      {/* Emoji Picker Popover */}
      <Popover
        open={Boolean(emojiAnchorEl)}
        anchorEl={emojiAnchorEl}
        onClose={() => setEmojiAnchorEl(null)}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Picker
          data={data}
          onEmojiSelect={handleEmojiSelect}
          theme="light"
          previewPosition="none"
          skinTonePosition="search"
        />
      </Popover>
    </Paper>
  );
};

export default memo(ChatComposer);
