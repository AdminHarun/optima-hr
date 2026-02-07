// Adapted from Rocket.Chat MessageComposer
// Converted to Material-UI for Optima
import React, { memo, useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Popover,
  Tooltip,
  Paper,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  Send,
  EmojiEmotions,
  AttachFile,
  Close,
  Mic,
  Stop,
  Delete as DeleteIcon,
  PlayArrow
} from '@mui/icons-material';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import fileUploadService from '../../services/fileUploadService';

/**
 * Chat Composer Component - Message input area
 * Rocket.Chat pattern adapted for Optima
 *
 * Features:
 * - Multi-line text input with auto-resize
 * - Emoji picker
 * - File attachment
 * - Typing indicator
 * - Send on Enter (Shift+Enter for new line)
 */
const ChatComposer = ({
  onSendMessage,
  onFileUpload,
  onTyping,
  placeholder = 'Type a message...',
  disabled = false,
  maxLength = 5000
}) => {
  const [message, setMessage] = useState('');
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]); // Çoklu dosya
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Typing indicator
  const handleTyping = () => {
    if (onTyping) {
      onTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 3 seconds
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

  // Handle key down (Enter to send, Shift+Enter for new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Send message
  const handleSend = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage && !selectedFile && selectedFiles.length === 0) return;
    if (isSending || isUploading) return;

    setIsSending(true);

    try {
      // Clear typing indicator
      if (onTyping) onTyping(false);

      // Upload file(s) first if selected
      let uploadedFile = null;
      let uploadedFiles = [];

      if (selectedFile) {
        setIsUploading(true);
        uploadedFile = await fileUploadService.uploadFile(selectedFile, setUploadProgress);
        setIsUploading(false);
      } else if (selectedFiles.length > 0) {
        setIsUploading(true);
        uploadedFiles = await fileUploadService.uploadFiles(selectedFiles, setUploadProgress);
        setIsUploading(false);
      }

      // Send message with file info
      if (trimmedMessage || uploadedFile || uploadedFiles.length > 0) {
        await onSendMessage?.(trimmedMessage, uploadedFile || uploadedFiles[0]);
        setMessage('');
        setSelectedFile(null);
        setSelectedFiles([]);
        setUploadProgress(0);
      }

      // Clear input and refocus
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

    // Restore cursor position
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

  // Remove selected file
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

      // Start timer
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

  const sendVoiceMessage = async () => {
    if (!audioBlob) return;

    setIsSending(true);
    try {
      // Create File from Blob
      const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
        type: 'audio/webm'
      });

      // Upload as file
      setIsUploading(true);
      const uploadedFile = await fileUploadService.uploadFile(audioFile, setUploadProgress);
      setIsUploading(false);

      // Send with type indicator
      await onSendMessage?.('[Sesli Mesaj]', { ...uploadedFile, type: 'voice' });

      // Clear audio
      setAudioBlob(null);
      setRecordingTime(0);
    } catch (error) {
      console.error('Error sending voice message:', error);
      setIsUploading(false);
    } finally {
      setIsSending(false);
    }
  };

  // Format recording time
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
      {/* File Preview */}
      {selectedFile && (
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
            <Box
              sx={{
                fontSize: '0.875rem',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {selectedFile.name}
            </Box>
            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {(selectedFile.size / 1024).toFixed(2)} KB
            </Box>
          </Box>
          <IconButton size="small" onClick={handleRemoveFile}>
            <Close fontSize="small" />
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
        {/* Emoji Button */}
        <Tooltip title="Add Emoji">
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
        <Tooltip title="Attach File">
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
          accept="image/*,application/pdf,.doc,.docx"
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

        {/* Send Button */}
        <Tooltip title={canSend ? 'Send' : 'Type a message'}>
          <span>
            <IconButton
              onClick={handleSend}
              disabled={!canSend}
              sx={{
                background: canSend
                  ? 'linear-gradient(135deg, #6a9fd4 0%, #a0c88c 100%)'
                  : 'rgba(160, 174, 192, 0.15)',
                color: canSend ? '#ffffff' : '#cbd5e0',
                width: 42,
                height: 42,
                borderRadius: '12px',
                boxShadow: canSend ? '0 2px 8px rgba(106, 159, 212, 0.25)' : 'none',
                '&:hover': {
                  background: canSend
                    ? 'linear-gradient(135deg, #5a8fc4 0%, #90b87c 100%)'
                    : 'rgba(160, 174, 192, 0.15)',
                  transform: canSend ? 'scale(1.03)' : 'none',
                  boxShadow: canSend ? '0 4px 12px rgba(106, 159, 212, 0.3)' : 'none'
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
