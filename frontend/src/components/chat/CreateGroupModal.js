// CreateGroupModal.js - Modal for creating group chats
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Avatar,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Checkbox,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  Group as GroupIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';

const getSiteHeaders = () => {
  const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
  return { 'X-Site-Id': currentSite };
};

const CreateGroupModal = ({ open, onClose, onGroupCreated }) => {
  const [step, setStep] = useState(1); // 1: name, 2: select members
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableMembers, setAvailableMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Load available members (applicants from chat rooms)
  useEffect(() => {
    if (open && step === 2) {
      loadAvailableMembers();
    }
  }, [open, step]);

  const loadAvailableMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chat/api/rooms/applicant_rooms/`, {
        credentials: 'include',
        headers: getSiteHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        const members = data.map(room => ({
          id: room.applicant_id,
          name: room.applicant_name || room.applicant_email,
          email: room.applicant_email,
          type: 'applicant'
        }));
        setAvailableMembers(members);
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMember = (member) => {
    setSelectedMembers(prev => {
      const exists = prev.find(m => m.id === member.id && m.type === member.type);
      if (exists) {
        return prev.filter(m => !(m.id === member.id && m.type === member.type));
      }
      return [...prev, member];
    });
  };

  const handleRemoveMember = (member) => {
    setSelectedMembers(prev =>
      prev.filter(m => !(m.id === member.id && m.type === member.type))
    );
  };

  const handleNext = () => {
    if (step === 1 && groupName.trim()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/chat/api/groups/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getSiteHeaders()
        },
        body: JSON.stringify({
          group_name: groupName.trim(),
          description: description.trim() || null,
          creator_name: 'Admin',
          creator_type: 'admin',
          creator_id: 1,
          members: selectedMembers.map(m => ({
            id: m.id,
            name: m.name,
            email: m.email,
            type: m.type,
            role: 'member'
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Group created:', data);
        onGroupCreated?.(data.room);
        handleClose();
      } else {
        console.error('Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setGroupName('');
    setDescription('');
    setSelectedMembers([]);
    setSearchTerm('');
    onClose();
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2);
  };

  const filteredMembers = availableMembers.filter(member => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return member.name?.toLowerCase().includes(search) ||
           member.email?.toLowerCase().includes(search);
  });

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          maxHeight: '80vh'
        }
      }}
    >
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e5e7eb',
        pb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <GroupIcon sx={{ color: 'white' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px' }}>
              Yeni Grup Oluştur
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              {step === 1 ? 'Adım 1/2: Grup bilgileri' : 'Adım 2/2: Üye seçimi'}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {step === 1 ? (
          // Step 1: Group name and description
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  fontSize: '28px',
                  fontWeight: 600
                }}
              >
                {groupName ? getInitials(groupName) : <GroupIcon sx={{ fontSize: 36 }} />}
              </Avatar>
            </Box>

            <TextField
              label="Grup Adı"
              placeholder="örn: Proje Ekibi, Mülakat Grubu"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              fullWidth
              required
              autoFocus
              inputProps={{ maxLength: 100 }}
              helperText={`${groupName.length}/100`}
            />

            <TextField
              label="Açıklama (isteğe bağlı)"
              placeholder="Grup hakkında kısa bir açıklama..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={2}
              inputProps={{ maxLength: 500 }}
            />
          </Box>
        ) : (
          // Step 2: Member selection
          <Box>
            {/* Selected members chips */}
            {selectedMembers.length > 0 && (
              <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedMembers.map((member) => (
                  <Chip
                    key={`${member.type}-${member.id}`}
                    avatar={<Avatar sx={{ bgcolor: '#6366f1' }}>{getInitials(member.name)}</Avatar>}
                    label={member.name}
                    onDelete={() => handleRemoveMember(member)}
                    sx={{ bgcolor: '#f3f4f6' }}
                  />
                ))}
              </Box>
            )}

            {/* Search */}
            <TextField
              placeholder="Üye ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#9ca3af', fontSize: 20 }} />
                  </InputAdornment>
                )
              }}
            />

            {/* Member list */}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                {filteredMembers.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm ? 'Sonuç bulunamadı' : 'Henüz eklenecek üye yok'}
                    </Typography>
                  </Box>
                ) : (
                  filteredMembers.map((member) => {
                    const isSelected = selectedMembers.some(
                      m => m.id === member.id && m.type === member.type
                    );
                    return (
                      <ListItem
                        key={`${member.type}-${member.id}`}
                        onClick={() => handleToggleMember(member)}
                        sx={{
                          cursor: 'pointer',
                          borderRadius: '8px',
                          mb: 0.5,
                          '&:hover': { bgcolor: '#f3f4f6' }
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          sx={{ mr: 1 }}
                        />
                        <ListItemAvatar>
                          <Avatar sx={{
                            bgcolor: isSelected ? '#6366f1' : '#9ca3af',
                            width: 40,
                            height: 40
                          }}>
                            {getInitials(member.name)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={member.name}
                          secondary={member.email}
                          primaryTypographyProps={{ fontWeight: 500 }}
                        />
                      </ListItem>
                    );
                  })
                )}
              </List>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 2, borderTop: '1px solid #e5e7eb' }}>
        {step === 2 && (
          <Button onClick={handleBack} sx={{ mr: 'auto' }}>
            Geri
          </Button>
        )}
        <Button onClick={handleClose} color="inherit">
          İptal
        </Button>
        {step === 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={!groupName.trim()}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
              }
            }}
          >
            İleri
          </Button>
        ) : (
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={creating}
            startIcon={creating ? <CircularProgress size={16} sx={{ color: 'white' }} /> : <PersonAddIcon />}
            sx={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
              }
            }}
          >
            {creating ? 'Oluşturuluyor...' : `Grup Oluştur${selectedMembers.length > 0 ? ` (${selectedMembers.length} üye)` : ''}`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateGroupModal;
