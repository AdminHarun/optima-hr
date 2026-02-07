// Forward Message Modal - Telegram/WhatsApp style
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Avatar,
  TextField,
  InputAdornment,
  Button,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Chip,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Send as SendIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';

const getSiteHeaders = () => {
  const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
  return { 'X-Site-Id': currentSite };
};

/**
 * Forward Message Modal - Telegram/WhatsApp style message forwarding
 *
 * Features:
 * - Select multiple recipients
 * - Search contacts
 * - Preview selected contacts
 * - Send to multiple chats at once
 */
const ForwardMessageModal = ({
  open,
  onClose,
  message,
  currentRoomId,
  onForward
}) => {
  const [rooms, setRooms] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load available chat rooms
  useEffect(() => {
    if (open) {
      loadChatRooms();
    }
  }, [open]);

  const loadChatRooms = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/api/rooms/applicant_rooms/`, {
        credentials: 'include',
        headers: getSiteHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to load chat rooms');
      }

      const data = await response.json();

      // Filter out current room
      const availableRooms = data
        .filter(room => room.room_id !== currentRoomId)
        .map(room => ({
          id: room.id,
          roomId: room.room_id,
          name: room.applicant_name || room.applicant_email || 'Unknown',
          email: room.applicant_email,
          avatar: null
        }));

      setRooms(availableRooms);
    } catch (error) {
      console.error('❌ Error loading chat rooms:', error);
    }
  };

  // Get avatar initials
  const getInitials = (name) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Toggle room selection
  const toggleRoom = (room) => {
    setSelectedRooms(prev => {
      const isSelected = prev.some(r => r.id === room.id);
      if (isSelected) {
        return prev.filter(r => r.id !== room.id);
      } else {
        return [...prev, room];
      }
    });
  };

  // Remove from selection
  const removeFromSelection = (roomId) => {
    setSelectedRooms(prev => prev.filter(r => r.id !== roomId));
  };

  // Handle forward
  const handleForward = async () => {
    if (selectedRooms.length === 0) return;

    setLoading(true);
    try {
      // Call onForward for each selected room
      for (const room of selectedRooms) {
        await onForward(message, room.roomId);
      }

      // Close modal and reset
      handleClose();
    } catch (error) {
      console.error('❌ Error forwarding message:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle close
  const handleClose = () => {
    setSelectedRooms([]);
    setSearchTerm('');
    onClose();
  };

  // Filter rooms by search term
  const filteredRooms = rooms.filter(room => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      room.name.toLowerCase().includes(searchLower) ||
      room.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          maxHeight: '80vh'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          borderBottom: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)'
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px' }}>
          İlet
        </Typography>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Selected Rooms Preview */}
        {selectedRooms.length > 0 && (
          <Box
            sx={{
              p: 2,
              bgcolor: 'rgba(106, 159, 212, 0.05)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)'
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mb: 1,
                color: '#718096',
                fontSize: '11px',
                fontWeight: 600
              }}
            >
              {selectedRooms.length} alıcı seçildi
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {selectedRooms.map(room => (
                <Chip
                  key={room.id}
                  label={room.name}
                  onDelete={() => removeFromSelection(room.id)}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(106, 159, 212, 0.12)',
                    '& .MuiChip-deleteIcon': {
                      color: '#5a9fd4'
                    }
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Search */}
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            fullWidth
            placeholder="Kişi ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 20, color: '#9ca3af' }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchTerm('')}
                  >
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </InputAdornment>
              ),
              sx: {
                borderRadius: '12px',
                bgcolor: '#f3f4f6',
                '& fieldset': { border: 'none' }
              }
            }}
          />
        </Box>

        {/* Rooms List */}
        <List sx={{ px: 1, maxHeight: 400, overflowY: 'auto' }}>
          {filteredRooms.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                {searchTerm ? 'Sonuç bulunamadı' : 'Başka sohbet yok'}
              </Typography>
            </Box>
          ) : (
            filteredRooms.map(room => {
              const isSelected = selectedRooms.some(r => r.id === room.id);

              return (
                <ListItem
                  key={room.id}
                  disablePadding
                  secondaryAction={
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleRoom(room)}
                      sx={{
                        color: '#cbd5e0',
                        '&.Mui-checked': {
                          color: '#5a9fd4'
                        }
                      }}
                    />
                  }
                >
                  <ListItemButton
                    onClick={() => toggleRoom(room)}
                    sx={{
                      borderRadius: '12px',
                      '&:hover': {
                        bgcolor: 'rgba(106, 159, 212, 0.05)'
                      }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          background: isSelected
                            ? 'linear-gradient(135deg, #6a9fd4 0%, #5a8fc4 100%)'
                            : 'linear-gradient(135deg, #a0aec0 0%, #cbd5e0 100%)',
                          fontSize: '14px',
                          fontWeight: 600
                        }}
                      >
                        {getInitials(room.name)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={room.name}
                      secondary={room.email}
                      primaryTypographyProps={{
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                      secondaryTypographyProps={{
                        fontSize: '12px',
                        color: '#9ca3af'
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })
          )}
        </List>
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'rgba(0, 0, 0, 0.08)'
        }}
      >
        <Button
          onClick={handleClose}
          variant="outlined"
          sx={{
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            borderColor: 'rgba(0, 0, 0, 0.12)',
            color: '#718096',
            '&:hover': {
              borderColor: 'rgba(0, 0, 0, 0.2)',
              bgcolor: 'rgba(0, 0, 0, 0.02)'
            }
          }}
        >
          İptal
        </Button>
        <Button
          onClick={handleForward}
          disabled={selectedRooms.length === 0 || loading}
          variant="contained"
          startIcon={<SendIcon />}
          sx={{
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            bgcolor: '#5a9fd4',
            boxShadow: 'none',
            '&:hover': {
              bgcolor: '#4a8fc4',
              boxShadow: '0 4px 12px rgba(90, 159, 212, 0.3)'
            },
            '&:disabled': {
              bgcolor: '#cbd5e0'
            }
          }}
        >
          {loading ? 'Gönderiliyor...' : `İlet (${selectedRooms.length})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ForwardMessageModal;
