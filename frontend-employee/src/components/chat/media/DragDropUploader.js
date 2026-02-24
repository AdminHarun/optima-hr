/**
 * DragDropUploader - Surukle-birak dosya yukleme
 */

import React, { useState, useRef, useCallback } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

export function DragDropUploader({
  onFilesSelected,
  accept = '*/*',
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  disabled = false,
  children,
  className = '',
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const validateFiles = useCallback((files) => {
    const validFiles = [];
    const errors = [];

    for (const file of files) {
      if (validFiles.length >= maxFiles) {
        errors.push(`Maksimum ${maxFiles} dosya yukleyebilirsiniz`);
        break;
      }

      if (file.size > maxSize) {
        errors.push(`${file.name}: Dosya boyutu cok buyuk (max ${maxSize / (1024 * 1024)}MB)`);
        continue;
      }

      if (accept !== '*/*') {
        const acceptedTypes = accept.split(',').map(t => t.trim());
        const fileType = file.type;
        const fileExt = `.${file.name.split('.').pop()}`;

        const isAccepted = acceptedTypes.some(type => {
          if (type.startsWith('.')) return fileExt.toLowerCase() === type.toLowerCase();
          if (type.endsWith('/*')) return fileType.startsWith(type.replace('/*', '/'));
          return fileType === type;
        });

        if (!isAccepted) {
          errors.push(`${file.name}: Desteklenmeyen dosya tipi`);
          continue;
        }
      }

      validFiles.push(file);
    }

    return { validFiles, errors };
  }, [accept, maxSize, maxFiles]);

  const handleFiles = useCallback(async (files) => {
    if (disabled || files.length === 0) return;

    setError(null);
    const { validFiles, errors } = validateFiles(Array.from(files));

    if (errors.length > 0) {
      setError(errors[0]);
    }

    if (validFiles.length > 0) {
      setIsUploading(true);
      try {
        await onFilesSelected?.(validFiles);
      } catch (err) {
        setError(err.message || 'Yukleme sirasinda hata olustu');
      } finally {
        setIsUploading(false);
      }
    }
  }, [disabled, validateFiles, onFilesSelected]);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  // Eger children varsa wrapper olarak kullan
  if (children) {
    return (
      <Box
        className={className}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        sx={{ position: 'relative' }}
      >
        {children}

        {/* Drag Overlay */}
        {isDragging && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(28, 97, 171, 0.1)',
              border: '2px dashed var(--color-primary)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <CloudUploadIcon sx={{ fontSize: 48, color: 'var(--color-primary)', mb: 1 }} />
              <Typography sx={{ color: 'var(--color-primary)', fontWeight: 500 }}>
                Dosyalari birakin
              </Typography>
            </Box>
          </Box>
        )}

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleFileChange}
        />
      </Box>
    );
  }

  // Standalone dropzone
  return (
    <Box
      className={className}
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      sx={{
        p: 4,
        border: '2px dashed',
        borderColor: isDragging ? 'var(--color-primary)' : 'var(--border-medium)',
        borderRadius: '12px',
        backgroundColor: isDragging ? 'rgba(28, 97, 171, 0.05)' : 'var(--bg-tertiary)',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.5 : 1,
        '&:hover': {
          borderColor: disabled ? 'var(--border-medium)' : 'var(--color-primary)',
          backgroundColor: disabled ? 'var(--bg-tertiary)' : 'rgba(28, 97, 171, 0.05)',
        },
      }}
    >
      {isUploading ? (
        <CircularProgress size={40} />
      ) : (
        <>
          <CloudUploadIcon
            sx={{
              fontSize: 48,
              color: isDragging ? 'var(--color-primary)' : 'var(--text-muted)',
              mb: 1,
            }}
          />
          <Typography
            variant="body1"
            sx={{ fontWeight: 500, color: 'var(--text-primary)', mb: 0.5 }}
          >
            {isDragging ? 'Dosyalari birakin' : 'Dosya yuklemek icin tiklayin veya surukleyin'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
            Maksimum {maxSize / (1024 * 1024)}MB, {maxFiles} dosya
          </Typography>
        </>
      )}

      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 1 }}>
          {error}
        </Typography>
      )}

      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept={accept}
        multiple={maxFiles > 1}
        onChange={handleFileChange}
      />
    </Box>
  );
}

export default DragDropUploader;
