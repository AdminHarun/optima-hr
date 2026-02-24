/**
 * FilePreview - PDF/video/dosya onizleme
 */

import React from 'react';
import { Box, Typography, IconButton, Tooltip, Chip } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import ImageIcon from '@mui/icons-material/Image';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

// Dosya tipi konfigurasyonu
const fileTypeConfig = {
  pdf: {
    icon: PictureAsPdfIcon,
    color: '#ef4444',
    label: 'PDF',
  },
  doc: {
    icon: DescriptionIcon,
    color: '#3b82f6',
    label: 'Word',
  },
  docx: {
    icon: DescriptionIcon,
    color: '#3b82f6',
    label: 'Word',
  },
  xls: {
    icon: DescriptionIcon,
    color: '#22c55e',
    label: 'Excel',
  },
  xlsx: {
    icon: DescriptionIcon,
    color: '#22c55e',
    label: 'Excel',
  },
  zip: {
    icon: FolderZipIcon,
    color: '#f59e0b',
    label: 'ZIP',
  },
  rar: {
    icon: FolderZipIcon,
    color: '#f59e0b',
    label: 'RAR',
  },
  mp4: {
    icon: VideoFileIcon,
    color: '#8b5cf6',
    label: 'Video',
  },
  mov: {
    icon: VideoFileIcon,
    color: '#8b5cf6',
    label: 'Video',
  },
  mp3: {
    icon: AudioFileIcon,
    color: '#ec4899',
    label: 'Audio',
  },
  wav: {
    icon: AudioFileIcon,
    color: '#ec4899',
    label: 'Audio',
  },
  jpg: {
    icon: ImageIcon,
    color: '#06b6d4',
    label: 'Resim',
  },
  jpeg: {
    icon: ImageIcon,
    color: '#06b6d4',
    label: 'Resim',
  },
  png: {
    icon: ImageIcon,
    color: '#06b6d4',
    label: 'Resim',
  },
  gif: {
    icon: ImageIcon,
    color: '#06b6d4',
    label: 'GIF',
  },
  default: {
    icon: InsertDriveFileIcon,
    color: '#64748b',
    label: 'Dosya',
  },
};

// Dosya boyutunu formatla
function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Dosya uzantisini al
function getFileExtension(filename) {
  if (!filename) return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

export function FilePreview({
  url,
  fileName,
  fileSize,
  mimeType,
  onDownload,
  onOpen,
  compact = false,
  showActions = true,
  className = '',
}) {
  const extension = getFileExtension(fileName) || mimeType?.split('/')[1] || '';
  const config = fileTypeConfig[extension] || fileTypeConfig.default;
  const Icon = config.icon;

  const handleDownload = (e) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload();
    } else if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpen = (e) => {
    e.stopPropagation();
    if (onOpen) {
      onOpen();
    } else if (url) {
      window.open(url, '_blank');
    }
  };

  if (compact) {
    return (
      <Box
        className={className}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          borderRadius: '8px',
          backgroundColor: 'var(--bg-tertiary)',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'var(--border-light)',
          },
        }}
        onClick={handleOpen}
      >
        <Icon sx={{ color: config.color, fontSize: 20 }} />
        <Typography
          variant="caption"
          sx={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fileName || 'Dosya'}
        </Typography>
        <IconButton size="small" onClick={handleDownload}>
          <DownloadIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box
      className={className}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        borderRadius: '12px',
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border-light)',
        maxWidth: 300,
      }}
    >
      {/* Ikon */}
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '10px',
          backgroundColor: `${config.color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon sx={{ color: config.color, fontSize: 24 }} />
      </Box>

      {/* Bilgiler */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fileName || 'Dosya'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Chip
            label={config.label}
            size="small"
            sx={{
              height: 18,
              fontSize: 10,
              backgroundColor: `${config.color}15`,
              color: config.color,
              fontWeight: 500,
            }}
          />
          {fileSize && (
            <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
              {formatFileSize(fileSize)}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Aksiyonlar */}
      {showActions && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Tooltip title="Indir">
            <IconButton size="small" onClick={handleDownload}>
              <DownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Ac">
            <IconButton size="small" onClick={handleOpen}>
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}

/**
 * Mesaj icindeki dosya onizlemesi
 */
export function MessageFileAttachment({
  url,
  fileName,
  fileSize,
  mimeType,
  isOwn = false,
}) {
  const isImage = mimeType?.startsWith('image/');
  const isVideo = mimeType?.startsWith('video/');

  if (isImage) {
    return (
      <Box
        sx={{
          borderRadius: '12px',
          overflow: 'hidden',
          maxWidth: 250,
          cursor: 'pointer',
        }}
      >
        <img
          src={url}
          alt={fileName}
          style={{
            width: '100%',
            maxHeight: 200,
            objectFit: 'cover',
          }}
        />
      </Box>
    );
  }

  if (isVideo) {
    return (
      <Box
        sx={{
          borderRadius: '12px',
          overflow: 'hidden',
          maxWidth: 280,
        }}
      >
        <video
          src={url}
          controls
          style={{
            width: '100%',
            maxHeight: 200,
          }}
        />
      </Box>
    );
  }

  return (
    <FilePreview
      url={url}
      fileName={fileName}
      fileSize={fileSize}
      mimeType={mimeType}
      showActions={true}
    />
  );
}

export default FilePreview;
