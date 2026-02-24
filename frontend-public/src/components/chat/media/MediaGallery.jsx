/**
 * MediaGallery - Lazy loading medya galerisi
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, CircularProgress, IconButton } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import LinkIcon from '@mui/icons-material/Link';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import { ImageLightbox } from './ImageLightbox';
import { FilePreview } from './FilePreview';

export function MediaGallery({
  media = [],
  onLoadMore,
  hasMore = false,
  isLoading = false,
  className = '',
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Medyayi kategorilere ayir
  const categorizedMedia = {
    images: media.filter(m => m.type === 'image' || m.mimeType?.startsWith('image/')),
    videos: media.filter(m => m.type === 'video' || m.mimeType?.startsWith('video/')),
    files: media.filter(m =>
      m.type === 'file' ||
      (!m.mimeType?.startsWith('image/') && !m.mimeType?.startsWith('video/'))
    ),
    links: media.filter(m => m.type === 'link'),
  };

  const tabs = [
    { label: 'Resimler', icon: <ImageIcon />, key: 'images', count: categorizedMedia.images.length },
    { label: 'Videolar', icon: <VideoFileIcon />, key: 'videos', count: categorizedMedia.videos.length },
    { label: 'Dosyalar', icon: <InsertDriveFileIcon />, key: 'files', count: categorizedMedia.files.length },
    { label: 'Linkler', icon: <LinkIcon />, key: 'links', count: categorizedMedia.links.length },
  ];

  const currentTabKey = tabs[activeTab]?.key || 'images';
  const currentItems = categorizedMedia[currentTabKey] || [];

  // Lightbox icin resimler
  const lightboxImages = categorizedMedia.images.map(img => ({
    src: img.url,
    alt: img.fileName || 'Resim',
  }));

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore?.();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, onLoadMore]);

  const handleImageClick = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <Box className={className} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        variant="fullWidth"
        sx={{
          borderBottom: '1px solid var(--border-light)',
          '& .MuiTab-root': {
            minHeight: 48,
            textTransform: 'none',
          },
        }}
      >
        {tabs.map((tab, index) => (
          <Tab
            key={tab.key}
            icon={tab.icon}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {tab.label}
                {tab.count > 0 && (
                  <Typography
                    component="span"
                    variant="caption"
                    sx={{
                      backgroundColor: 'var(--bg-tertiary)',
                      px: 0.75,
                      py: 0.25,
                      borderRadius: '10px',
                      fontSize: 10,
                    }}
                  >
                    {tab.count}
                  </Typography>
                )}
              </Box>
            }
            iconPosition="start"
            sx={{ fontSize: 12 }}
          />
        ))}
      </Tabs>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'var(--border-medium)',
            borderRadius: 3,
          },
        }}
      >
        {currentItems.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              color: 'var(--text-muted)',
            }}
          >
            {tabs[activeTab]?.icon}
            <Typography variant="body2" sx={{ mt: 1 }}>
              {tabs[activeTab]?.label} bulunamadi
            </Typography>
          </Box>
        ) : currentTabKey === 'images' ? (
          <ImageGrid
            images={currentItems}
            onImageClick={handleImageClick}
          />
        ) : currentTabKey === 'videos' ? (
          <VideoGrid videos={currentItems} />
        ) : currentTabKey === 'files' ? (
          <FileList files={currentItems} />
        ) : (
          <LinkList links={currentItems} />
        )}

        {/* Load More */}
        {hasMore && (
          <Box ref={loadMoreRef} sx={{ textAlign: 'center', py: 2 }}>
            {isLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Typography
                variant="caption"
                sx={{ color: 'var(--color-primary)', cursor: 'pointer' }}
                onClick={onLoadMore}
              >
                Daha fazla yukle
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Lightbox */}
      <ImageLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={lightboxImages}
        initialIndex={lightboxIndex}
      />
    </Box>
  );
}

/**
 * Resim Grid
 */
function ImageGrid({ images, onImageClick }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 0.5,
      }}
    >
      {images.map((img, index) => (
        <LazyImage
          key={img.id || index}
          src={img.url}
          alt={img.fileName}
          onClick={() => onImageClick(index)}
        />
      ))}
    </Box>
  );
}

/**
 * Lazy loading resim
 */
function LazyImage({ src, alt, onClick }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && imgRef.current) {
          imgRef.current.src = src;
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return (
    <Box
      onClick={onClick}
      sx={{
        aspectRatio: '1',
        borderRadius: '4px',
        overflow: 'hidden',
        cursor: 'pointer',
        backgroundColor: 'var(--bg-tertiary)',
        position: 'relative',
        '&:hover': {
          opacity: 0.9,
        },
      }}
    >
      <img
        ref={imgRef}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.2s',
        }}
      />
      {!loaded && !error && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CircularProgress size={20} />
        </Box>
      )}
    </Box>
  );
}

/**
 * Video Grid
 */
function VideoGrid({ videos }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {videos.map((video, index) => (
        <Box
          key={video.id || index}
          sx={{
            position: 'relative',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: '#000',
          }}
        >
          <video
            src={video.url}
            style={{ width: '100%', maxHeight: 200, objectFit: 'contain' }}
            controls
            preload="metadata"
          />
        </Box>
      ))}
    </Box>
  );
}

/**
 * Dosya Listesi
 */
function FileList({ files }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {files.map((file, index) => (
        <FilePreview
          key={file.id || index}
          url={file.url}
          fileName={file.fileName}
          fileSize={file.fileSize}
          mimeType={file.mimeType}
          compact
        />
      ))}
    </Box>
  );
}

/**
 * Link Listesi
 */
function LinkList({ links }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {links.map((link, index) => (
        <Box
          key={link.id || index}
          component="a"
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.5,
            borderRadius: '8px',
            backgroundColor: 'var(--bg-tertiary)',
            textDecoration: 'none',
            color: 'inherit',
            '&:hover': {
              backgroundColor: 'var(--border-light)',
            },
          }}
        >
          <LinkIcon sx={{ color: 'var(--color-primary)' }} />
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
              {link.title || link.url}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {link.url}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export default MediaGallery;
