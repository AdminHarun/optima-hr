/**
 * ImageLightbox - Resim buyutme modal
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Box,
  IconButton,
  Typography,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import DownloadIcon from '@mui/icons-material/Download';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export function ImageLightbox({
  open,
  onClose,
  src,
  alt = 'Resim',
  images = [], // Galeri modu icin
  initialIndex = 0,
  showDownload = true,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const isGallery = images.length > 1;
  const currentImage = isGallery ? images[currentIndex] : { src, alt };

  // Reset state on open
  useEffect(() => {
    if (open) {
      setZoom(1);
      setIsLoading(true);
      setError(false);
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!open) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (isGallery) handlePrev();
          break;
        case 'ArrowRight':
          if (isGallery) handleNext();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isGallery, currentIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
    setZoom(1);
    setIsLoading(true);
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
    setZoom(1);
    setIsLoading(true);
  }, [images.length]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentImage.src;
    link.download = currentImage.alt || 'image';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError(true);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          outline: 'none',
        }}
        onClick={onClose}
      >
        {/* Toolbar */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)',
            zIndex: 1,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Typography sx={{ color: 'white', fontWeight: 500 }}>
            {currentImage.alt}
            {isGallery && ` (${currentIndex + 1}/${images.length})`}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handleZoomOut} sx={{ color: 'white' }}>
              <ZoomOutIcon />
            </IconButton>
            <Typography
              sx={{
                color: 'white',
                minWidth: 50,
                textAlign: 'center',
                lineHeight: '40px',
              }}
            >
              {Math.round(zoom * 100)}%
            </Typography>
            <IconButton onClick={handleZoomIn} sx={{ color: 'white' }}>
              <ZoomInIcon />
            </IconButton>
            {showDownload && (
              <IconButton onClick={handleDownload} sx={{ color: 'white' }}>
                <DownloadIcon />
              </IconButton>
            )}
            <IconButton onClick={onClose} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Navigation Arrows */}
        {isGallery && (
          <>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              sx={{
                position: 'absolute',
                left: 16,
                color: 'white',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
              }}
            >
              <ChevronLeftIcon sx={{ fontSize: 32 }} />
            </IconButton>
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              sx={{
                position: 'absolute',
                right: 16,
                color: 'white',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
              }}
            >
              <ChevronRightIcon sx={{ fontSize: 32 }} />
            </IconButton>
          </>
        )}

        {/* Image */}
        <Box
          onClick={(e) => e.stopPropagation()}
          sx={{
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isLoading && (
            <CircularProgress sx={{ color: 'white' }} />
          )}

          {error ? (
            <Typography sx={{ color: 'white' }}>Resim yuklenemedi</Typography>
          ) : (
            <img
              src={currentImage.src}
              alt={currentImage.alt}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                maxWidth: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                transform: `scale(${zoom})`,
                transition: 'transform 0.2s ease',
                display: isLoading ? 'none' : 'block',
                cursor: zoom > 1 ? 'move' : 'default',
              }}
              draggable={false}
            />
          )}
        </Box>

        {/* Thumbnail Strip (Gallery Mode) */}
        {isGallery && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 1,
              p: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 2,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((img, index) => (
              <Box
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setZoom(1);
                  setIsLoading(true);
                }}
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: index === currentIndex ? '2px solid white' : '2px solid transparent',
                  cursor: 'pointer',
                  opacity: index === currentIndex ? 1 : 0.6,
                  transition: 'all 0.2s ease',
                  '&:hover': { opacity: 1 },
                }}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Modal>
  );
}

export default ImageLightbox;
