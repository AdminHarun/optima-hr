/**
 * CustomThemeCreator - Image-to-Theme UI Component
 *
 * Allows users to upload an image and automatically extract
 * colors to create a custom theme.
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert
} from '@mui/material';
import {
  CloudUpload,
  Palette,
  Refresh,
  Save,
  Close,
  PhotoCamera,
  AutoAwesome
} from '@mui/icons-material';
import { useDynamicTheme } from '../../hooks/useDynamicTheme';
import { useTheme } from '../../contexts/ThemeContext';

const CustomThemeCreator = ({ onClose }) => {
  const [previewImage, setPreviewImage] = useState(null);
  const [themeName, setThemeName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fileInputRef = useRef(null);
  const {
    extractColors,
    applyColorsToTheme,
    generateThemeConfig,
    resetTheme,
    isExtracting,
    extractedColors,
    error
  } = useDynamicTheme();

  const { changeTheme, themes } = useTheme();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target.result;
      setPreviewImage(imageData);

      try {
        const colors = await extractColors(imageData);
        applyColorsToTheme(colors);
      } catch (err) {
        console.error('Color extraction failed:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const fakeEvent = { target: { files: [file] } };
      handleFileSelect(fakeEvent);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleReset = () => {
    setPreviewImage(null);
    resetTheme();
    setSavedSuccess(false);
  };

  const handleSaveTheme = () => {
    if (!extractedColors || !previewImage) return;

    const themeConfig = generateThemeConfig(
      extractedColors,
      themeName || 'Custom Theme',
      previewImage
    );

    // Save to localStorage
    const customThemes = JSON.parse(localStorage.getItem('optima_custom_themes') || '[]');
    customThemes.push(themeConfig);
    localStorage.setItem('optima_custom_themes', JSON.stringify(customThemes));

    // Apply as current theme
    localStorage.setItem('optima_current_custom_theme', JSON.stringify(themeConfig));

    setSaveDialogOpen(false);
    setSavedSuccess(true);
    setThemeName('');
  };

  return (
    <Card
      sx={{
        backdropFilter: 'blur(20px)',
        background: 'var(--theme-card-bg, rgba(255, 255, 255, 0.12))',
        border: '1px solid var(--theme-card-border, rgba(255, 255, 255, 0.25))',
        borderRadius: 3,
        p: 0,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: 'linear-gradient(135deg, var(--theme-primary, #8B5CF6), var(--theme-accent, #EC4899))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AutoAwesome sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ color: 'var(--theme-card-text, #fff)', fontWeight: 600 }}>
                Ozel Tema Olustur
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--theme-card-text, #fff)', opacity: 0.7 }}>
                Resimden renk cikar
              </Typography>
            </Box>
          </Box>

          {onClose && (
            <IconButton onClick={onClose} size="small" sx={{ color: 'var(--theme-card-text, #fff)' }}>
              <Close />
            </IconButton>
          )}
        </Box>

        {/* Success Alert */}
        {savedSuccess && (
          <Alert
            severity="success"
            sx={{ mb: 2, borderRadius: 2 }}
            onClose={() => setSavedSuccess(false)}
          >
            Tema basariyla kaydedildi!
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Upload Area */}
          <Box
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            sx={{
              width: 220,
              height: 160,
              border: '2px dashed',
              borderColor: previewImage ? 'var(--theme-primary, rgba(255,255,255,0.3))' : 'rgba(255,255,255,0.3)',
              borderRadius: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundImage: previewImage ? `url(${previewImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transition: 'all 0.3s ease',
              position: 'relative',
              overflow: 'hidden',
              '&:hover': {
                borderColor: 'var(--theme-primary, #8B5CF6)',
                transform: 'scale(1.02)'
              }
            }}
          >
            {!previewImage && (
              <>
                <CloudUpload sx={{ fontSize: 48, opacity: 0.5, color: 'var(--theme-card-text, #fff)' }} />
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.7, color: 'var(--theme-card-text, #fff)' }}>
                  Resim Yukle
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.5, color: 'var(--theme-card-text, #fff)' }}>
                  veya suruklleyip birakin
                </Typography>
              </>
            )}

            {isExtracting && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(4px)'
                }}
              >
                <CircularProgress size={40} sx={{ color: 'white' }} />
              </Box>
            )}
          </Box>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {/* Color Preview & Actions */}
          <Box sx={{ flex: 1, minWidth: 200 }}>
            {extractedColors ? (
              <>
                <Typography variant="body2" sx={{ mb: 1.5, color: 'var(--theme-card-text, #fff)', fontWeight: 500 }}>
                  Cikarilan Renkler:
                </Typography>

                {/* Color Palette */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {extractedColors.palette.map((color, i) => (
                    <Tooltip key={i} title={color} arrow>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          backgroundColor: color,
                          border: '2px solid rgba(255,255,255,0.3)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'scale(1.15)',
                            boxShadow: `0 4px 12px ${color}40`
                          }
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>

                {/* Dominant Color Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1,
                      backgroundColor: extractedColors.dominant,
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}
                  />
                  <Typography variant="caption" sx={{ color: 'var(--theme-card-text, #fff)', opacity: 0.7 }}>
                    Ana renk: {extractedColors.dominant}
                  </Typography>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Save />}
                    onClick={() => setSaveDialogOpen(true)}
                    sx={{
                      background: 'var(--theme-button-primary, linear-gradient(135deg, #8B5CF6, #EC4899))',
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      px: 2
                    }}
                  >
                    Kaydet
                  </Button>

                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Refresh />}
                    onClick={handleReset}
                    sx={{
                      borderColor: 'rgba(255,255,255,0.3)',
                      color: 'var(--theme-card-text, #fff)',
                      borderRadius: 2,
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: 'rgba(255,255,255,0.5)',
                        background: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    Sifirla
                  </Button>
                </Box>
              </>
            ) : (
              <Box sx={{ py: 3, textAlign: 'center' }}>
                <PhotoCamera sx={{ fontSize: 48, opacity: 0.3, color: 'var(--theme-card-text, #fff)' }} />
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.5, color: 'var(--theme-card-text, #fff)' }}>
                  Renkleri cikarMak icin bir resim secin
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>

      {/* Save Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            background: 'var(--theme-card-bg, rgba(30, 41, 59, 0.95))',
            border: '1px solid var(--theme-card-border, rgba(255,255,255,0.2))'
          }
        }}
      >
        <DialogTitle sx={{ color: 'var(--theme-card-text, #fff)' }}>
          Temayi Kaydet
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Tema Adi"
            placeholder="Ornegin: Mavi Okyanus"
            fullWidth
            value={themeName}
            onChange={(e) => setThemeName(e.target.value)}
            sx={{
              mt: 1,
              '& .MuiOutlinedInput-root': {
                color: 'var(--theme-card-text, #fff)',
                '& fieldset': {
                  borderColor: 'rgba(255,255,255,0.3)'
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255,255,255,0.5)'
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'var(--theme-primary, #8B5CF6)'
                }
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255,255,255,0.7)'
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setSaveDialogOpen(false)}
            sx={{ color: 'var(--theme-card-text, #fff)', opacity: 0.7 }}
          >
            Iptal
          </Button>
          <Button
            onClick={handleSaveTheme}
            variant="contained"
            sx={{
              background: 'var(--theme-button-primary, linear-gradient(135deg, #8B5CF6, #EC4899))',
              borderRadius: 2
            }}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default CustomThemeCreator;
