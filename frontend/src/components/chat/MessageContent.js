// Adapted from Rocket.Chat MessageContentBody.tsx
// Converted to Material-UI for Optima with Link Preview
import React, { memo, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Paper,
  Chip,
  Card,
  CardMedia,
  CardContent,
  Link as MuiLink,
  Skeleton
} from '@mui/material';
import {
  AttachFile,
  Check,
  Close,
  InsertDriveFile,
  Image as ImageIcon,
  Link as LinkIcon,
  OpenInNew,
  Reply as ReplyIcon
} from '@mui/icons-material';

/**
 * Message Content Component - Displays message text, files, and reactions
 * Rocket.Chat pattern adapted for Optima
 */
const MessageContent = ({
  message,
  isEditing,
  onSaveEdit,
  onCancelEdit
}) => {
  const [editText, setEditText] = useState(message.content || '');
  const [linkPreviews, setLinkPreviews] = useState([]);
  const [loadingPreviews, setLoadingPreviews] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setEditText(message.content || '');
    }
  }, [isEditing, message.content]);

  // Extract URLs and fetch link previews
  useEffect(() => {
    if (!message.content) return;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.content.match(urlRegex);

    if (urls && urls.length > 0) {
      setLoadingPreviews(true);

      // Fetch real link previews from backend
      Promise.all(
        urls.slice(0, 3).map(async (url) => {
          try {
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';
            const response = await fetch(`${API_URL}/api/link-preview`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url })
            });
            return await response.json();
          } catch (error) {
            console.error('Error fetching link preview:', error);
            return {
              url,
              title: new URL(url).hostname,
              description: 'Link preview unavailable',
              image: null
            };
          }
        })
      ).then((previews) => {
        setLinkPreviews(previews);
        setLoadingPreviews(false);
      });
    }
  }, [message.content]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSaveEdit(editText);
    } else if (e.key === 'Escape') {
      onCancelEdit();
    }
  };

  // Render file attachment
  const FileAttachment = ({ file }) => {
    const isImage = file.file_mime_type?.startsWith('image/') ||
                    file.name?.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|tif|ico|heic|heif)$/i);
    const isVideo = file.file_mime_type?.startsWith('video/') ||
                    file.name?.match(/\.(mp4|webm|mov)$/i);
    const isPDF = file.file_mime_type === 'application/pdf' ||
                  file.name?.endsWith('.pdf');
    const isAudio = file.file_mime_type?.startsWith('audio/') ||
                    file.name?.match(/\.(mp3|wav|ogg)$/i);

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';
    const fullUrl = file.url?.startsWith('http') ? file.url : `${API_URL}${file.url}`;

    // Image preview
    if (isImage && file.url) {
      return (
        <Box
          sx={{
            mt: 1,
            maxWidth: '320px',
            borderRadius: '14px',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            '&:hover': {
              transform: 'scale(1.02)',
              boxShadow: '0 4px 16px rgba(100, 150, 200, 0.25)'
            },
            '&:hover .download-overlay': {
              opacity: 1
            }
          }}
          onClick={() => window.open(fullUrl, '_blank')}
        >
          <img
            src={fullUrl}
            alt={file.name || 'Image'}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: '14px'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <Box
            className="download-overlay"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 0.2s',
              borderRadius: '14px'
            }}
          >
            <Typography sx={{ color: 'white', fontWeight: 600 }}>
              Açmak için tıkla
            </Typography>
          </Box>
        </Box>
      );
    }

    // Video preview
    if (isVideo && file.url) {
      return (
        <Box
          sx={{
            mt: 1,
            maxWidth: '400px',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(100, 150, 200, 0.15)'
          }}
        >
          <video
            controls
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              borderRadius: '14px'
            }}
          >
            <source src={fullUrl} type={file.file_mime_type || 'video/mp4'} />
            Tarayıcınız video dosyasını desteklemiyor.
          </video>
        </Box>
      );
    }

    // Audio preview - WhatsApp/Telegram style voice message
    if (isAudio && file.url) {
      const isVoiceMessage = file.type === 'voice' || file.name?.includes('voice-');

      if (isVoiceMessage) {
        // Voice Message - WhatsApp Style
        return (
          <Box
            sx={{
              mt: 1,
              maxWidth: '280px',
              p: 1.25,
              backgroundColor: 'rgba(139, 185, 74, 0.08)',
              borderRadius: '18px',
              border: '1px solid rgba(139, 185, 74, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 1.5
            }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#8bb94a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Box
                sx={{
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid #ffffff',
                  borderTop: '6px solid transparent',
                  borderBottom: '6px solid transparent',
                  ml: 0.5
                }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <audio controls style={{ width: '100%', height: 32 }}>
                <source src={fullUrl} type={file.file_mime_type || 'audio/webm'} />
                Tarayıcınız ses dosyasını desteklemiyor.
              </audio>
            </Box>
          </Box>
        );
      }

      // Regular Audio File
      return (
        <Box
          sx={{
            mt: 1,
            maxWidth: '350px',
            p: 1.5,
            backgroundColor: 'rgba(100, 150, 200, 0.08)',
            borderRadius: '12px',
            border: '1px solid rgba(100, 150, 200, 0.15)'
          }}
        >
          <audio controls style={{ width: '100%' }}>
            <source src={fullUrl} type={file.file_mime_type || 'audio/mpeg'} />
            Tarayıcınız ses dosyasını desteklemiyor.
          </audio>
        </Box>
      );
    }

    // Other files (PDF, documents, etc.)
    return (
      <Paper
        variant="outlined"
        sx={{
          mt: 1,
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          backgroundColor: 'rgba(100, 150, 200, 0.05)',
          cursor: 'pointer',
          borderRadius: '12px',
          border: '1px solid rgba(100, 150, 200, 0.15)',
          maxWidth: '350px',
          transition: 'all 0.2s',
          '&:hover': {
            backgroundColor: 'rgba(100, 150, 200, 0.12)',
            borderColor: '#5a9fd4',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(100, 150, 200, 0.2)'
          }
        }}
        onClick={() => window.open(fullUrl, '_blank')}
      >
        <InsertDriveFile fontSize="medium" sx={{ color: '#5a9fd4' }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600, color: '#2d3748' }}>
            {file.name || 'Dosya'}
          </Typography>
          {file.size && (
            <Typography variant="caption" sx={{ color: '#718096' }}>
              {(file.size / 1024).toFixed(2)} KB • İndirmek için tıkla
            </Typography>
          )}
        </Box>
      </Paper>
    );
  };

  // Render link previews
  const LinkPreview = ({ preview }) => {
    return (
      <Card
        sx={{
          mt: 1,
          maxWidth: '400px',
          borderRadius: '12px',
          border: '1px solid rgba(100, 150, 200, 0.15)',
          boxShadow: '0 2px 6px rgba(100, 150, 200, 0.1)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: '#5a9fd4',
            boxShadow: '0 4px 12px rgba(100, 150, 200, 0.2)',
            transform: 'translateY(-2px)'
          }
        }}
        onClick={() => window.open(preview.url, '_blank')}
      >
        {preview.image && (
          <CardMedia
            component="img"
            height="160"
            image={preview.image}
            alt={preview.title}
            sx={{ objectFit: 'cover' }}
          />
        )}
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <LinkIcon sx={{ fontSize: 18, color: '#5a9fd4', mt: 0.25 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: '#2d3748',
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {preview.title}
              </Typography>
              {preview.description && (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#718096',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  {preview.description}
                </Typography>
              )}
              <Typography
                variant="caption"
                sx={{
                  color: '#a0aec0',
                  fontSize: '11px',
                  mt: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                {new URL(preview.url).hostname}
                <OpenInNew sx={{ fontSize: 12 }} />
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // Render reactions
  const MessageReactions = ({ reactions }) => {
    if (!reactions || reactions.length === 0) return null;

    return (
      <Box sx={{ display: 'flex', gap: 0.75, mt: 1, flexWrap: 'wrap' }}>
        {reactions.map((reaction, idx) => (
          <Chip
            key={idx}
            label={`${reaction.emoji} ${reaction.count || 1}`}
            size="small"
            clickable
            sx={{
              height: 26,
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              borderRadius: '13px',
              backgroundColor: 'rgba(106, 159, 212, 0.08)',
              border: '1px solid rgba(106, 159, 212, 0.15)',
              color: '#2d3748',
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'rgba(106, 159, 212, 0.15)',
                borderColor: 'rgba(106, 159, 212, 0.3)',
                transform: 'scale(1.05)',
                boxShadow: '0 2px 6px rgba(106, 159, 212, 0.15)'
              },
              '&:active': {
                transform: 'scale(0.98)'
              },
              '& .MuiChip-label': {
                px: 1.25,
                py: 0.25,
                lineHeight: 1.2
              }
            }}
          />
        ))}
      </Box>
    );
  };

  return (
    <Box>
      {/* Edit Mode */}
      {isEditing ? (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            size="small"
            multiline
            autoFocus
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{
              backgroundColor: '#fff',
              '& .MuiOutlinedInput-root': {
                borderRadius: 1
              }
            }}
          />
          <IconButton
            size="small"
            color="primary"
            onClick={() => onSaveEdit(editText)}
          >
            <Check fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={onCancelEdit}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      ) : (
        <>
          {/* Reply Reference - Telegram/WhatsApp Style */}
          {message.reply_to_message_id && message.replied_to_message && (
            <Box
              sx={{
                mb: 1,
                p: 1,
                backgroundColor: 'rgba(90, 159, 212, 0.06)',
                borderLeft: '3px solid #5a9fd4',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: 'rgba(90, 159, 212, 0.12)'
                }
              }}
              onClick={() => {
                // Scroll to original message
                const originalElement = document.getElementById(`message-${message.reply_to_message_id}`);
                if (originalElement) {
                  originalElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Highlight animation
                  originalElement.style.backgroundColor = 'rgba(90, 159, 212, 0.15)';
                  setTimeout(() => {
                    originalElement.style.backgroundColor = '';
                  }, 1000);
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <ReplyIcon sx={{ fontSize: 16, color: '#5a9fd4', mt: 0.25 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#5a9fd4',
                      fontWeight: 600,
                      fontSize: '12px',
                      display: 'block',
                      mb: 0.25
                    }}
                  >
                    {message.replied_to_message.sender_name || 'Bilinmeyen'}
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
                    {message.replied_to_message.content?.substring(0, 100) || '[Dosya]'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          {/* Message Text */}
          <Typography
            id={`${message.id}-content`}
            variant="body2"
            sx={{
              color: message.is_deleted ? '#a0aec0' : 'text.primary',
              fontStyle: message.is_deleted ? 'italic' : 'normal',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.5,
              '& a': {
                color: 'primary.main',
                textDecoration: 'underline',
                '&:hover': {
                  color: 'primary.dark'
                }
              }
            }}
          >
            {message.content}
            {message.is_edited && !message.is_deleted && (
              <Typography
                component="span"
                variant="caption"
                sx={{
                  ml: 1,
                  color: '#a0aec0',
                  fontSize: '11px',
                  fontStyle: 'italic'
                }}
              >
                (düzenlendi)
              </Typography>
            )}
          </Typography>

          {/* File Attachments */}
          {message.file_url && (
            <FileAttachment
              file={{
                url: message.file_url,
                name: message.file_name,
                size: message.file_size,
                file_mime_type: message.file_mime_type
              }}
            />
          )}

          {/* Link Previews */}
          {linkPreviews.length > 0 && !message.file_url && (
            <Box sx={{ mt: 1 }}>
              {linkPreviews.map((preview, idx) => (
                <LinkPreview key={idx} preview={preview} />
              ))}
            </Box>
          )}

          {/* Reactions */}
          <MessageReactions reactions={message.reactions} />
        </>
      )}
    </Box>
  );
};

export default memo(MessageContent);
