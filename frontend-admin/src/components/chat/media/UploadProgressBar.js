/**
 * UploadProgressBar - Yukleme ilerleme cubugu
 */

import React from 'react';
import { Box, Typography, LinearProgress, IconButton, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

// Dosya boyutunu formatla
function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadProgressBar({
  fileName,
  fileSize,
  progress = 0,
  status = 'uploading', // uploading, completed, error
  error = null,
  onCancel,
  onRetry,
  className = '',
}) {
  const isUploading = status === 'uploading';
  const isCompleted = status === 'completed';
  const isError = status === 'error';

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        borderRadius: '10px',
        backgroundColor: isError ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-tertiary)',
        border: '1px solid',
        borderColor: isError ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-light)',
      }}
    >
      {/* Ikon */}
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '8px',
          backgroundColor: isError
            ? 'rgba(239, 68, 68, 0.15)'
            : isCompleted
            ? 'rgba(34, 197, 94, 0.15)'
            : 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isError ? (
          <ErrorIcon sx={{ color: '#ef4444' }} />
        ) : isCompleted ? (
          <CheckCircleIcon sx={{ color: '#22c55e' }} />
        ) : (
          <InsertDriveFileIcon sx={{ color: 'white' }} />
        )}
      </Box>

      {/* Bilgiler */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {fileName}
          </Typography>

          {isUploading && (
            <Typography variant="caption" sx={{ color: 'var(--text-muted)', ml: 1 }}>
              {progress}%
            </Typography>
          )}
        </Box>

        {/* Progress Bar */}
        {isUploading && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 4,
              borderRadius: 2,
              backgroundColor: 'var(--border-light)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: 'var(--color-primary)',
                borderRadius: 2,
              },
            }}
          />
        )}

        {/* Status */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          {isCompleted && (
            <Chip
              label="Yuklendi"
              size="small"
              sx={{
                height: 18,
                fontSize: 10,
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                color: '#22c55e',
              }}
            />
          )}

          {isError && (
            <>
              <Typography variant="caption" sx={{ color: '#ef4444' }}>
                {error || 'Yukleme basarisiz'}
              </Typography>
              {onRetry && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                  onClick={onRetry}
                >
                  Tekrar dene
                </Typography>
              )}
            </>
          )}

          {isUploading && fileSize && (
            <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
              {formatFileSize((fileSize * progress) / 100)} / {formatFileSize(fileSize)}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Iptal Butonu */}
      {(isUploading || isError) && onCancel && (
        <IconButton size="small" onClick={onCancel}>
          <CloseIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
}

/**
 * Coklu yukleme listesi
 */
export function UploadProgressList({
  uploads = [],
  onCancel,
  onRetry,
  className = '',
}) {
  if (uploads.length === 0) return null;

  return (
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {uploads.map((upload, index) => (
        <UploadProgressBar
          key={upload.id || index}
          fileName={upload.fileName}
          fileSize={upload.fileSize}
          progress={upload.progress}
          status={upload.status}
          error={upload.error}
          onCancel={() => onCancel?.(upload.id || index)}
          onRetry={() => onRetry?.(upload.id || index)}
        />
      ))}
    </Box>
  );
}

export default UploadProgressBar;
