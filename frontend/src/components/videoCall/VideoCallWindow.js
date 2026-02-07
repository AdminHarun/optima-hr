import React, { useEffect, useState } from 'react';
import { Dialog, IconButton, Box, Typography, Paper, Chip } from '@mui/material';
import { Close, Videocam, AccessTime, CallEnd } from '@mui/icons-material';

const VideoCallWindow = ({ callData, onClose }) => {
  const [open, setOpen] = useState(!!callData);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setOpen(!!callData);
    if (callData) {
      setDuration(0);
      const interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callData]);

  const handleClose = () => {
    setOpen(false);
    if (onClose) {
      onClose();
    }
  };

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!callData?.jitsi_url) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          height: '90vh',
          borderRadius: '20px',
          backgroundColor: '#f7fafc',
          boxShadow: '0 10px 40px rgba(100, 150, 200, 0.15)',
          border: 'none',
          overflow: 'hidden'
        }
      }}
    >
      <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Paper sx={{
          p: 2,
          borderRadius: 0,
          background: 'linear-gradient(135deg, rgba(100, 150, 200, 0.08) 0%, rgba(160, 200, 140, 0.06) 100%)',
          color: '#2d3748',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1000,
          boxShadow: 'none',
          borderBottom: '1px solid rgba(100, 150, 200, 0.1)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              bgcolor: 'rgba(100, 150, 200, 0.1)',
              px: 2,
              py: 1,
              borderRadius: '12px'
            }}>
              <Videocam sx={{ fontSize: 24, color: '#5a9fd4' }} />
              <Typography variant="h6" fontWeight="600" sx={{ color: '#2d3748', fontSize: '16px' }}>
                Görüntülü Görüşme
              </Typography>
            </Box>
            <Chip
              icon={<AccessTime sx={{ color: '#5a9fd4 !important', fontSize: 18 }} />}
              label={formatDuration(duration)}
              sx={{
                bgcolor: 'rgba(100, 150, 200, 0.1)',
                color: '#5a9fd4',
                fontWeight: 600,
                fontSize: '14px',
                border: 'none',
                height: '36px'
              }}
            />
          </Box>
          <IconButton
            onClick={handleClose}
            sx={{
              color: '#e53e3e',
              bgcolor: 'rgba(229, 62, 62, 0.08)',
              border: '1.5px solid rgba(229, 62, 62, 0.15)',
              boxShadow: 'none',
              '&:hover': {
                bgcolor: 'rgba(229, 62, 62, 0.15)',
                transform: 'scale(1.02)',
                border: '1.5px solid rgba(229, 62, 62, 0.25)'
              },
              transition: 'all 0.2s ease',
              width: 44,
              height: 44
            }}
          >
            <CallEnd sx={{ fontSize: 20 }} />
          </IconButton>
        </Paper>

        {/* Jitsi iFrame */}
        <Box sx={{ flex: 1, position: 'relative', bgcolor: '#ffffff', borderRadius: '12px', m: 1.5, overflow: 'hidden', boxShadow: '0 2px 12px rgba(100, 150, 200, 0.08)' }}>
          <iframe
            src={callData.jitsi_url}
            allow="camera; microphone; display-capture; fullscreen"
            title="Video Call"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '12px'
            }}
          />
        </Box>

        {/* Footer Branding */}
        <Paper sx={{
          p: 1.5,
          borderRadius: 0,
          background: 'linear-gradient(135deg, rgba(100, 150, 200, 0.06) 0%, rgba(160, 200, 140, 0.04) 100%)',
          color: '#718096',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          boxShadow: 'none',
          borderTop: '1px solid rgba(100, 150, 200, 0.1)'
        }}>
          <Typography variant="body2" sx={{
            fontWeight: 500,
            fontSize: '13px'
          }}>
            Optima HR Management System
          </Typography>
        </Paper>
      </Box>
    </Dialog>
  );
};

export default VideoCallWindow;
