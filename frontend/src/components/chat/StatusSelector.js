import React, { useState } from 'react';
import {
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Button,
  Typography,
  Divider,
  Avatar,
  IconButton
} from '@mui/material';
import {
  Circle as CircleIcon,
  DoNotDisturb as DndIcon,
  AccessTime as AwayIcon,
  RemoveCircle as OfflineIcon,
  Edit as EditIcon,
  Clear as ClearIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';

const getSiteHeaders = () => {
  const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
  return { 'X-Site-Id': currentSite };
};

// Status options
const STATUS_OPTIONS = [
  { id: 'online', label: 'Cevrimici', color: '#22c55e', icon: CircleIcon },
  { id: 'away', label: 'Uzakta', color: '#f59e0b', icon: AwayIcon },
  { id: 'busy', label: 'Mesgul', color: '#ef4444', icon: DndIcon },
  { id: 'offline', label: 'Gorunmez', color: '#9ca3af', icon: OfflineIcon }
];

// Common custom statuses
const PRESET_STATUSES = [
  { emoji: '📅', text: 'Toplantida' },
  { emoji: '🏠', text: 'Uzaktan calisiyor' },
  { emoji: '🚗', text: 'Yolda' },
  { emoji: '🍽️', text: 'Yemekte' },
  { emoji: '🎧', text: 'Odaklanmis' },
  { emoji: '🏖️', text: 'Tatilde' },
  { emoji: '🤒', text: 'Hasta' }
];

const StatusSelector = ({
  currentStatus = 'online',
  customStatus = null,
  userName,
  userAvatar,
  onStatusChange,
  compact = false
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customEmoji, setCustomEmoji] = useState('💬');
  const [saving, setSaving] = useState(false);

  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setShowCustomInput(false);
    setCustomText('');
  };

  const handleStatusSelect = async (statusId) => {
    try {
      setSaving(true);

      const response = await fetch(`${API_BASE_URL}/api/employees/me/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getSiteHeaders()
        },
        body: JSON.stringify({ status: statusId })
      });

      if (response.ok) {
        onStatusChange?.(statusId, customStatus);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setSaving(false);
      handleClose();
    }
  };

  const handleCustomStatusSave = async () => {
    if (!customText.trim()) return;

    try {
      setSaving(true);

      const response = await fetch(`${API_BASE_URL}/api/employees/me/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getSiteHeaders()
        },
        body: JSON.stringify({
          customStatus: customText.trim(),
          customEmoji: customEmoji
        })
      });

      if (response.ok) {
        onStatusChange?.(currentStatus, { text: customText.trim(), emoji: customEmoji });
      }
    } catch (err) {
      console.error('Error updating custom status:', err);
    } finally {
      setSaving(false);
      handleClose();
    }
  };

  const handleClearCustomStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/me/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getSiteHeaders()
        },
        body: JSON.stringify({ customStatus: null, customEmoji: null })
      });

      if (response.ok) {
        onStatusChange?.(currentStatus, null);
      }
    } catch (err) {
      console.error('Error clearing custom status:', err);
    }
    handleClose();
  };

  const handlePresetSelect = (preset) => {
    setCustomEmoji(preset.emoji);
    setCustomText(preset.text);
    setShowCustomInput(true);
  };

  const currentStatusOption = STATUS_OPTIONS.find(s => s.id === currentStatus) || STATUS_OPTIONS[0];
  const StatusIcon = currentStatusOption.icon;

  // Compact mode - just show status indicator
  if (compact) {
    return (
      <IconButton size="small" onClick={handleClick} sx={{ p: 0.5 }}>
        <CircleIcon sx={{ fontSize: 12, color: currentStatusOption.color }} />
      </IconButton>
    );
  }

  return (
    <>
      {/* Status Button */}
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          p: 1,
          borderRadius: 1,
          '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <Avatar src={userAvatar} sx={{ width: 40, height: 40 }}>
            {userName?.[0]?.toUpperCase()}
          </Avatar>
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: currentStatusOption.color,
              border: '2px solid white'
            }}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.2 }}>
            {userName}
          </Typography>
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {customStatus ? (
              <>
                <span>{customStatus.emoji}</span>
                <span>{customStatus.text}</span>
              </>
            ) : (
              currentStatusOption.label
            )}
          </Typography>
        </Box>
      </Box>

      {/* Status Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 280, borderRadius: 2 }
        }}
      >
        {/* Current User Info */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e5e7eb' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {userName}
          </Typography>
          {customStatus && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <Typography variant="caption">{customStatus.emoji} {customStatus.text}</Typography>
              <IconButton size="small" onClick={handleClearCustomStatus} sx={{ p: 0.25, ml: 'auto' }}>
                <ClearIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          )}
        </Box>

        {/* Status Options */}
        {STATUS_OPTIONS.map((status) => (
          <MenuItem
            key={status.id}
            selected={currentStatus === status.id}
            onClick={() => handleStatusSelect(status.id)}
            disabled={saving}
          >
            <ListItemIcon>
              <status.icon sx={{ color: status.color, fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText primary={status.label} />
          </MenuItem>
        ))}

        <Divider sx={{ my: 1 }} />

        {/* Custom Status */}
        {!showCustomInput ? (
          <>
            <MenuItem onClick={() => setShowCustomInput(true)}>
              <ListItemIcon>
                <EditIcon sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText primary="Durum mesaji ayarla" />
            </MenuItem>

            {/* Preset Statuses */}
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
                Hizli durumlar
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {PRESET_STATUSES.map((preset, idx) => (
                  <Box
                    key={idx}
                    onClick={() => handlePresetSelect(preset)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: '#f3f4f6',
                      cursor: 'pointer',
                      fontSize: '12px',
                      '&:hover': { bgcolor: '#e5e7eb' }
                    }}
                  >
                    <span>{preset.emoji}</span>
                    <span>{preset.text}</span>
                  </Box>
                ))}
              </Box>
            </Box>
          </>
        ) : (
          <Box sx={{ px: 2, py: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                size="small"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                sx={{ width: 50 }}
                inputProps={{ style: { textAlign: 'center' } }}
              />
              <TextField
                size="small"
                fullWidth
                placeholder="Durum mesajiniz..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                autoFocus
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={() => setShowCustomInput(false)}>
                Iptal
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleCustomStatusSave}
                disabled={!customText.trim() || saving}
              >
                Kaydet
              </Button>
            </Box>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default StatusSelector;
