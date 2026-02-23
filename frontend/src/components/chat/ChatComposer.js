// src/components/chat/ChatComposer.js - Slack-Style 3-Layer Input
import React, { memo, useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Popover,
  Tooltip,
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
  Reply as ReplyIcon,
  FlashOn as QuickReplyIcon,
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  StrikethroughS,
  InsertLink,
  FormatListBulleted,
  FormatListNumbered,
  Code,
  Add as AddIcon
} from '@mui/icons-material';
import fileUploadService from '../../services/fileUploadService';
import EmojiGifPicker from './EmojiGifPicker';
import SlashCommandAutocomplete from './SlashCommandAutocomplete';

const ChatComposer = ({
  onSendMessage,
  onFileUpload,
  onTyping,
  placeholder = 'Mesaj yazın...',
  disabled = false,
  maxLength = 5000,
  replyingTo = null,
  onCancelReply = null,
  droppedFile = null,
  onDroppedFileHandled = null,
  isDark = false
}) => {
  const [message, setMessage] = useState('');
  const [emojiAnchorEl, setEmojiAnchorEl] = useState(null);
  const [cannedResponsesAnchorEl, setCannedResponsesAnchorEl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const cannedResponses = [
    { id: 1, title: 'Selamlama', text: 'Merhaba! Optima HR platformuna hoş geldiniz. Size nasıl yardımcı olabilirim?' },
    { id: 2, title: 'Teşekkür', text: 'İlginiz için teşekkür ederiz. Başvurunuz değerlendirilmektedir.' },
    { id: 3, title: 'Belge İsteme', text: 'Lütfen CV\'nizi ve kimlik fotokopinizi yükleyebilir misiniz?' },
    { id: 4, title: 'Mülakat Daveti', text: 'Başvurunuz olumlu değerlendirilmiştir. Görüntülü görüşme için uygun olduğunuz zamanı bildirir misiniz?' },
    { id: 5, title: 'Bekleme', text: 'Değerlendirme sürecimiz devam etmektedir. En kısa sürede size dönüş yapacağız.' },
    { id: 6, title: 'Ek Bilgi', text: 'Başvurunuzla ilgili birkaç ek bilgiye ihtiyacımız var. Lütfen aşağıdaki soruları yanıtlayın:' },
    { id: 7, title: 'Video Görüşme', text: 'Video görüşme başlatmak için yukarıdaki kamera ikonuna tıklayabilirsiniz. Hazır olduğunuzda bana bildirin.' },
    { id: 8, title: 'Kapanış', text: 'Görüşmemiz için teşekkür ederiz. İyi günler dileriz!' }
  ];
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [showSlashCommands, setShowSlashCommands] = useState(false);
  const editorRef = useRef(null);
  const inputRef = useRef(null);
  const composerWrapperRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const audioPreviewRef = useRef(null);

  useEffect(() => {}, []);

  useEffect(() => {
    if (droppedFile) {
      setSelectedFile(droppedFile);
      if (onDroppedFileHandled) {
        onDroppedFileHandled();
      }
      inputRef.current?.focus();
    }
  }, [droppedFile, onDroppedFileHandled]);

  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const extension = file.type.split('/')[1] || 'png';
            const fileName = `clipboard-${Date.now()}.${extension}`;
            const namedFile = new File([file], fileName, { type: file.type });
            setSelectedFile(namedFile);
          }
          break;
        }
      }
    };

    const inputElement = inputRef.current;
    if (inputElement) {
      inputElement.addEventListener('paste', handlePaste);
      return () => inputElement.removeEventListener('paste', handlePaste);
    }
  }, []);

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

  const handleChange = (e) => {
    const newValue = typeof e === 'string' ? e : e.target.value;
    setMessage(newValue);
    const isSlashInput = newValue.startsWith('/') && !newValue.includes(' ');
    setShowSlashCommands(isSlashInput);
    handleTyping();
  };

  const handleSlashCommandSelect = (command) => {
    const commandText = `/${command.name} `;
    setMessage(commandText);
    setShowSlashCommands(false);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(commandText.length, commandText.length);
      }
    }, 0);
  };

  const handleSlashCommandClose = () => {
    setShowSlashCommands(false);
  };

  const handleKeyDown = (e) => {
    if (showSlashCommands && inputRef.current?.__slashKeyHandler) {
      const handled = inputRef.current.__slashKeyHandler(e);
      if (handled) return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (audioBlob) {
        sendVoiceMessage();
      } else {
        handleSend();
      }
    }
  };

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

  const handleEmojiGifSelect = (selection) => {
    if (selection.type === 'emoji') {
      editorRef.current?.insertText(selection.content);
      setEmojiAnchorEl(null);
    } else if (selection.type === 'gif') {
      onSendMessage?.('', { url: selection.content, name: 'animated.gif', type: 'image/gif' });
      setEmojiAnchorEl(null);
    }
  };

  const handleCannedResponseSelect = (response) => {
    editorRef.current?.insertText(response.text);
    setCannedResponsesAnchorEl(null);
  };

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

  // Toolbar button style
  const toolBtnSx = {
    width: 28,
    height: 24,
    borderRadius: '4px',
    color: isDark ? '#ABABAD' : '#6b7280',
    '&:hover': {
      bgcolor: isDark ? '#27242C' : '#e5e7eb',
      color: isDark ? '#E0E0E0' : '#374151'
    }
  };

  const actionBtnSx = {
    width: 28,
    height: 28,
    borderRadius: '4px',
    color: isDark ? '#ABABAD' : '#6b7280',
    '&:hover': {
      bgcolor: isDark ? '#27242C' : '#e5e7eb',
      color: isDark ? '#E0E0E0' : '#374151'
    }
  };

  return (
    <Box sx={{ px: 3, pb: 3, pt: 1, flexShrink: 0 }}>
      {/* Reply Preview */}
      {replyingTo && (
        <Box
          sx={{
            mb: 1,
            p: 1.25,
            backgroundColor: isDark ? 'rgba(29, 155, 209, 0.1)' : 'rgba(90, 159, 212, 0.08)',
            borderLeft: `3px solid ${isDark ? '#5CC5F8' : '#5a9fd4'}`,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5
          }}
        >
          <ReplyIcon sx={{ fontSize: 18, color: isDark ? '#5CC5F8' : '#5a9fd4', mt: 0.25 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" sx={{ color: isDark ? '#5CC5F8' : '#5a9fd4', fontWeight: 600, display: 'block' }}>
              {replyingTo.sender_name}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: isDark ? '#ABABAD' : '#718096',
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
            sx={{ color: isDark ? '#ABABAD' : '#a0aec0', '&:hover': { color: isDark ? '#E0E0E0' : '#718096' } }}
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
            p: 1.25,
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99, 102, 241, 0.05)',
            borderRadius: '8px',
            border: `1px solid ${isDark ? '#35373B' : 'rgba(99, 102, 241, 0.15)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}
        >
          {selectedFile.type?.startsWith('image/') ? (
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '6px',
                overflow: 'hidden',
                flexShrink: 0
              }}
            >
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
          ) : (
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '8px',
                backgroundColor: isDark ? '#27242C' : 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AttachFile sx={{ fontSize: 18, color: isDark ? '#ABABAD' : '#6366f1' }} />
            </Box>
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: isDark ? '#E0E0E0' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
              {selectedFile.name}
            </Typography>
            <Typography variant="caption" sx={{ color: isDark ? '#ABABAD' : '#64748b', fontSize: '11px' }}>
              {(selectedFile.size / 1024).toFixed(1)} KB
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleRemoveFile} sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Voice Recording Preview */}
      {audioBlob && !isRecording && (
        <Box
          sx={{
            mb: 1,
            p: 1.25,
            backgroundColor: isDark ? 'rgba(46, 182, 125, 0.1)' : 'rgba(139, 185, 74, 0.08)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            border: `1px solid ${isDark ? 'rgba(46, 182, 125, 0.3)' : 'rgba(139, 185, 74, 0.2)'}`
          }}
        >
          <IconButton
            size="small"
            onClick={togglePlayPreview}
            sx={{ backgroundColor: '#2EB67D', color: '#ffffff', '&:hover': { backgroundColor: '#249963' } }}
          >
            {isPlayingPreview ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: isDark ? '#E0E0E0' : '#2d3748', fontSize: '13px' }}>
              Sesli Mesaj
            </Typography>
            <Typography variant="caption" sx={{ color: isDark ? '#ABABAD' : '#718096' }}>
              {formatTime(recordingTime)}
            </Typography>
          </Box>
          <IconButton size="small" onClick={deleteAudioBlob} sx={{ color: '#fc8181', '&:hover': { backgroundColor: 'rgba(252, 129, 129, 0.1)' } }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <Box
          sx={{
            mb: 1,
            p: 1.25,
            backgroundColor: 'rgba(252, 129, 129, 0.08)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            border: '1px solid rgba(252, 129, 129, 0.2)'
          }}
        >
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: '#fc8181',
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } }
            }}
          />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#e53e3e', fontSize: '13px' }}>
              Kaydediliyor...
            </Typography>
            <Typography variant="caption" sx={{ color: isDark ? '#ABABAD' : '#718096' }}>
              {formatTime(recordingTime)}
            </Typography>
          </Box>
          <IconButton size="small" onClick={cancelRecording} sx={{ color: '#fc8181' }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={stopRecording} sx={{ backgroundColor: '#fc8181', color: '#ffffff', '&:hover': { backgroundColor: '#e53e3e' } }}>
            <Stop fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* ═══ Slack-Style 3-Layer Input Wrapper ═══ */}
      {!isRecording && !audioBlob && (
        <Box
          sx={{
            bgcolor: isDark ? '#222529' : '#ffffff',
            border: `1px solid ${isDark ? '#35373B' : '#d1d5db'}`,
            borderRadius: '8px',
            overflow: 'hidden',
            '&:focus-within': {
              borderColor: isDark ? '#1264A3' : '#6366f1',
              boxShadow: isDark ? '0 0 0 2px rgba(18, 100, 163, 0.2)' : '0 0 0 2px rgba(99, 102, 241, 0.1)'
            },
            transition: 'border-color 0.2s, box-shadow 0.2s'
          }}
        >
          {/* ── Layer 1: Formatting Toolbar ── */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 1.5,
              py: 0.75,
              gap: 0.25,
              borderBottom: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}`
            }}
          >
            <IconButton size="small" sx={toolBtnSx}><FormatBold sx={{ fontSize: 16 }} /></IconButton>
            <IconButton size="small" sx={toolBtnSx}><FormatItalic sx={{ fontSize: 16 }} /></IconButton>
            <IconButton size="small" sx={toolBtnSx}><FormatUnderlined sx={{ fontSize: 16 }} /></IconButton>
            <IconButton size="small" sx={toolBtnSx}><StrikethroughS sx={{ fontSize: 16 }} /></IconButton>
            <Box sx={{ width: '1px', height: 16, bgcolor: isDark ? '#35373B' : '#d1d5db', mx: 0.5 }} />
            <IconButton size="small" sx={toolBtnSx}><InsertLink sx={{ fontSize: 16 }} /></IconButton>
            <IconButton size="small" sx={toolBtnSx}><FormatListBulleted sx={{ fontSize: 16 }} /></IconButton>
            <IconButton size="small" sx={toolBtnSx}><FormatListNumbered sx={{ fontSize: 16 }} /></IconButton>
            <IconButton size="small" sx={toolBtnSx}><Code sx={{ fontSize: 16 }} /></IconButton>
          </Box>

          {/* ── Layer 2: Message Input ── */}
          <Box ref={composerWrapperRef} sx={{ position: 'relative' }}>
            <SlashCommandAutocomplete
              inputValue={message}
              onSelect={handleSlashCommandSelect}
              onClose={handleSlashCommandClose}
              anchorRef={inputRef}
            />
            <TextField
              inputRef={inputRef}
              fullWidth
              multiline
              minRows={2}
              maxRows={8}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              inputProps={{ maxLength }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'transparent',
                  border: 'none',
                  '& fieldset': { border: 'none' },
                  '&:hover fieldset': { border: 'none' },
                  '&.Mui-focused fieldset': { border: 'none' }
                },
                '& .MuiOutlinedInput-input': {
                  py: 1.5,
                  px: 1.5,
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: isDark ? '#E0E0E0' : '#1e293b',
                  '&::placeholder': {
                    color: isDark ? '#ABABAD' : '#9ca3af',
                    opacity: 1
                  }
                }
              }}
            />
          </Box>

          {/* ── Layer 3: Action Footer ── */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 1.5,
              py: 0.75
            }}
          >
            {/* Left: Action tools */}
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Tooltip title="Dosya Ekle">
                <IconButton
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  sx={actionBtnSx}
                >
                  <AddIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Emoji & GIF">
                <IconButton
                  size="small"
                  onClick={(e) => setEmojiAnchorEl(e.currentTarget)}
                  disabled={disabled}
                  sx={actionBtnSx}
                >
                  <EmojiEmotions sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Hazır Yanıtlar">
                <IconButton
                  size="small"
                  onClick={(e) => setCannedResponsesAnchorEl(e.currentTarget)}
                  disabled={disabled}
                  sx={actionBtnSx}
                >
                  <QuickReplyIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Dosya Ekle">
                <IconButton
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  sx={actionBtnSx}
                >
                  <AttachFile sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Sesli Mesaj">
                <IconButton
                  size="small"
                  onClick={startRecording}
                  disabled={disabled}
                  sx={actionBtnSx}
                >
                  <Mic sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Right: Send button */}
            <Tooltip title="Gönder">
              <span>
                <IconButton
                  size="small"
                  onClick={handleSend}
                  disabled={!canSend}
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '4px',
                    bgcolor: canSend
                      ? (isDark ? '#2EB67D' : '#6366f1')
                      : (isDark ? '#35373B' : '#e5e7eb'),
                    color: canSend ? '#ffffff' : (isDark ? '#ABABAD' : '#9ca3af'),
                    '&:hover': {
                      bgcolor: canSend
                        ? (isDark ? '#249963' : '#4f46e5')
                        : (isDark ? '#35373B' : '#e5e7eb')
                    },
                    '&.Mui-disabled': {
                      bgcolor: isDark ? '#35373B' : '#e5e7eb',
                      color: isDark ? '#ABABAD' : '#9ca3af'
                    }
                  }}
                >
                  {isSending ? (
                    <CircularProgress size={16} sx={{ color: '#ffffff' }} />
                  ) : (
                    <Send sx={{ fontSize: 16 }} />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      )}

      {/* Voice recording: Send button */}
      {(audioBlob && !isRecording) && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Tooltip title="Sesli Mesaj Gönder">
            <IconButton
              onClick={sendVoiceMessage}
              sx={{
                bgcolor: isDark ? '#2EB67D' : '#6366f1',
                color: '#ffffff',
                width: 40,
                height: 40,
                borderRadius: '8px',
                '&:hover': { bgcolor: isDark ? '#249963' : '#4f46e5' }
              }}
            >
              {isSending ? <CircularProgress size={18} sx={{ color: '#ffffff' }} /> : <Send sx={{ fontSize: 18 }} />}
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFileSelect}
        accept="image/*,video/*,application/pdf,.doc,.docx"
      />

      {/* Character Counter */}
      {message.length > maxLength * 0.9 && (
        <Box
          sx={{
            mt: 0.5,
            textAlign: 'right',
            fontSize: '11px',
            color: message.length >= maxLength ? '#ef4444' : (isDark ? '#ABABAD' : '#9ca3af')
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
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <EmojiGifPicker onSelect={handleEmojiGifSelect} />
      </Popover>

      {/* Canned Responses Popover */}
      <Popover
        open={Boolean(cannedResponsesAnchorEl)}
        anchorEl={cannedResponsesAnchorEl}
        onClose={() => setCannedResponsesAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{
          sx: {
            borderRadius: '8px',
            boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.12)',
            maxHeight: 400,
            width: 320,
            ...(isDark && {
              bgcolor: '#222529',
              border: '1px solid #35373B'
            })
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <QuickReplyIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: isDark ? '#E0E0E0' : '#1e293b' }}>
              Hazır Yanıtlar
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {cannedResponses.map((response) => (
              <Box
                key={response.id}
                onClick={() => handleCannedResponseSelect(response)}
                sx={{
                  p: 1.5,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: `1px solid ${isDark ? '#35373B' : '#e2e8f0'}`,
                  backgroundColor: isDark ? '#1A1D21' : '#fff',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.08)',
                    borderColor: '#f59e0b'
                  }
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#f59e0b', fontSize: '13px', mb: 0.5 }}>
                  {response.title}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: isDark ? '#ABABAD' : '#64748b',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.4
                  }}
                >
                  {response.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Popover>
    </Box>
  );
};

export default memo(ChatComposer);
