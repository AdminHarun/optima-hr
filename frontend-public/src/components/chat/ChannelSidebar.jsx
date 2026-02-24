import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Divider,
  Badge,
  Collapse,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Tag as TagIcon,
  Lock as LockIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Settings as SettingsIcon,
  Forum as ForumIcon,
  Campaign as CampaignIcon,
  EmojiEmotions as EmojiIcon,
  VolumeOff as MuteIcon
} from '@mui/icons-material';

import { API_BASE_URL } from '../../config/config';

// Site headers helper
const getSiteHeaders = () => {
  const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
  return { 'X-Site-Id': currentSite };
};

// Icon mapping
const channelIcons = {
  tag: TagIcon,
  forum: ForumIcon,
  campaign: CampaignIcon,
  emoji_emotions: EmojiIcon,
  default: TagIcon
};

const ChannelSidebar = ({
  onChannelSelect,
  selectedChannelId,
  collapsed = false,
  onCollapseToggle,
  isDark = false
}) => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    starred: true,
    channels: true
  });
  const [newChannel, setNewChannel] = useState({
    name: '',
    displayName: '',
    description: '',
    type: 'public'
  });

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/channels`, {
        credentials: 'include',
        headers: getSiteHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch channels');
      }

      const data = await response.json();
      console.log('📺 Channels loaded:', data.length);
      setChannels(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching channels:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();

    // Refresh every 30 seconds
    const interval = setInterval(fetchChannels, 30000);
    return () => clearInterval(interval);
  }, [fetchChannels]);

  // Create channel
  const handleCreateChannel = async () => {
    if (!newChannel.name.trim() || !newChannel.displayName.trim()) {
      return;
    }

    try {
      setCreating(true);
      const response = await fetch(`${API_BASE_URL}/api/channels`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getSiteHeaders()
        },
        body: JSON.stringify(newChannel)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to create channel');
      }

      const created = await response.json();
      console.log('Channel created:', created);

      setCreateDialogOpen(false);
      setNewChannel({ name: '', displayName: '', description: '', type: 'public' });
      fetchChannels();

      // Auto-select the new channel
      onChannelSelect(created);
    } catch (err) {
      console.error('Error creating channel:', err);
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Join channel
  const handleJoinChannel = async (channel) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/channels/${channel.id}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: getSiteHeaders()
      });

      if (response.ok) {
        fetchChannels();
        onChannelSelect(channel);
      }
    } catch (err) {
      console.error('Error joining channel:', err);
    }
  };

  // Toggle star
  const handleToggleStar = async (e, channel) => {
    e.stopPropagation();
    try {
      await fetch(`${API_BASE_URL}/api/channels/${channel.id}/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getSiteHeaders()
        },
        body: JSON.stringify({ starred: !channel.membership?.starred })
      });
      fetchChannels();
    } catch (err) {
      console.error('Error toggling star:', err);
    }
  };

  // Toggle section
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Get channel icon component
  const getChannelIcon = (channel) => {
    if (channel.type === 'private') {
      return <LockIcon fontSize="small" sx={{ color: isDark ? '#ABABAD' : '#9ca3af' }} />;
    }
    const IconComponent = channelIcons[channel.icon] || channelIcons.default;
    return <IconComponent fontSize="small" sx={{ color: isDark ? '#ABABAD' : '#9ca3af' }} />;
  };

  // Separate starred and regular channels
  const starredChannels = channels.filter(c => c.membership?.starred);
  const regularChannels = channels.filter(c => !c.membership?.starred);

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'az önce';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}dk`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}sa`;
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  if (collapsed) {
    return (
      <Box sx={{ width: 60, borderRight: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}`, bgcolor: isDark ? '#19181D' : '#f9fafb' }}>
        <Tooltip title="Kanallar" placement="right">
          <IconButton onClick={onCollapseToggle} sx={{ m: 1 }}>
            <TagIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 260,
        borderRight: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}`,
        bgcolor: isDark ? '#19181D' : '#f9fafb',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${isDark ? '#35373B' : '#e5e7eb'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: isDark ? '#E0E0E0' : '#1f2937' }}>
          Kanallar
        </Typography>
        <Tooltip title="Yeni Kanal">
          <IconButton size="small" onClick={() => setCreateDialogOpen(true)} sx={{ color: isDark ? '#ABABAD' : undefined }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Loading */}
      {loading && channels.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ m: 1 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Channel List */}
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {/* Starred Channels */}
        {starredChannels.length > 0 && (
          <>
            <ListItemButton
              onClick={() => toggleSection('starred')}
              sx={{ py: 0.5, px: 2, '&:hover': { bgcolor: isDark ? '#27242C' : undefined } }}
            >
              <ListItemIcon sx={{ minWidth: 28 }}>
                <StarIcon fontSize="small" sx={{ color: '#f59e0b' }} />
              </ListItemIcon>
              <ListItemText
                primary="Yildizli"
                primaryTypographyProps={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isDark ? '#ABABAD' : '#6b7280',
                  textTransform: 'uppercase'
                }}
              />
              {expandedSections.starred ? <ExpandLessIcon fontSize="small" sx={{ color: isDark ? '#ABABAD' : undefined }} /> : <ExpandMoreIcon fontSize="small" sx={{ color: isDark ? '#ABABAD' : undefined }} />}
            </ListItemButton>

            <Collapse in={expandedSections.starred}>
              <List disablePadding>
                {starredChannels.map(channel => (
                  <ChannelListItem
                    key={channel.id}
                    channel={channel}
                    selected={selectedChannelId === channel.id}
                    onSelect={() => onChannelSelect(channel)}
                    onToggleStar={(e) => handleToggleStar(e, channel)}
                    getIcon={getChannelIcon}
                    formatTime={formatTime}
                    isDark={isDark}
                  />
                ))}
              </List>
            </Collapse>

            <Divider sx={{ my: 1, borderColor: isDark ? '#35373B' : undefined }} />
          </>
        )}

        {/* Regular Channels */}
        <ListItemButton
          onClick={() => toggleSection('channels')}
          sx={{ py: 0.5, px: 2, '&:hover': { bgcolor: isDark ? '#27242C' : undefined } }}
        >
          <ListItemIcon sx={{ minWidth: 28 }}>
            <TagIcon fontSize="small" sx={{ color: isDark ? '#ABABAD' : '#6b7280' }} />
          </ListItemIcon>
          <ListItemText
            primary="Kanallar"
            primaryTypographyProps={{
              fontSize: '12px',
              fontWeight: 600,
              color: isDark ? '#ABABAD' : '#6b7280',
              textTransform: 'uppercase'
            }}
          />
          {expandedSections.channels ? <ExpandLessIcon fontSize="small" sx={{ color: isDark ? '#ABABAD' : undefined }} /> : <ExpandMoreIcon fontSize="small" sx={{ color: isDark ? '#ABABAD' : undefined }} />}
        </ListItemButton>

        <Collapse in={expandedSections.channels}>
          <List disablePadding>
            {regularChannels.map(channel => (
              <ChannelListItem
                key={channel.id}
                channel={channel}
                selected={selectedChannelId === channel.id}
                onSelect={() => channel.isMember ? onChannelSelect(channel) : handleJoinChannel(channel)}
                onToggleStar={(e) => handleToggleStar(e, channel)}
                getIcon={getChannelIcon}
                formatTime={formatTime}
                isDark={isDark}
              />
            ))}
          </List>
        </Collapse>
      </Box>

      {/* Create Channel Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: isDark ? {
            bgcolor: '#222529',
            color: '#E0E0E0',
            border: '1px solid #35373B'
          } : {}
        }}
      >
        <DialogTitle sx={isDark ? { color: '#E0E0E0' } : {}}>Yeni Kanal Olustur</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Kanal Adi"
              placeholder="ornek-kanal"
              value={newChannel.name}
              onChange={(e) => setNewChannel({
                ...newChannel,
                name: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-')
              })}
              helperText="Kucuk harf, rakam, tire ve alt cizgi kullanilabilir"
              sx={isDark ? {
                '& .MuiOutlinedInput-root': {
                  color: '#E0E0E0',
                  '& fieldset': { borderColor: '#35373B' },
                  '&:hover fieldset': { borderColor: '#ABABAD' },
                  '&.Mui-focused fieldset': { borderColor: '#5CC5F8' }
                },
                '& .MuiInputLabel-root': { color: '#ABABAD' },
                '& .MuiFormHelperText-root': { color: '#ABABAD' }
              } : {}}
            />

            <TextField
              fullWidth
              label="Gorunen Ad"
              placeholder="Ornek Kanal"
              value={newChannel.displayName}
              onChange={(e) => setNewChannel({ ...newChannel, displayName: e.target.value })}
              sx={isDark ? {
                '& .MuiOutlinedInput-root': {
                  color: '#E0E0E0',
                  '& fieldset': { borderColor: '#35373B' },
                  '&:hover fieldset': { borderColor: '#ABABAD' },
                  '&.Mui-focused fieldset': { borderColor: '#5CC5F8' }
                },
                '& .MuiInputLabel-root': { color: '#ABABAD' }
              } : {}}
            />

            <TextField
              fullWidth
              multiline
              rows={2}
              label="Aciklama"
              placeholder="Bu kanal ne icin kullanilacak?"
              value={newChannel.description}
              onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
              sx={isDark ? {
                '& .MuiOutlinedInput-root': {
                  color: '#E0E0E0',
                  '& fieldset': { borderColor: '#35373B' },
                  '&:hover fieldset': { borderColor: '#ABABAD' },
                  '&.Mui-focused fieldset': { borderColor: '#5CC5F8' }
                },
                '& .MuiInputLabel-root': { color: '#ABABAD' }
              } : {}}
            />

            <FormControl fullWidth>
              <InputLabel sx={isDark ? { color: '#ABABAD' } : {}}>Kanal Turu</InputLabel>
              <Select
                value={newChannel.type}
                label="Kanal Turu"
                onChange={(e) => setNewChannel({ ...newChannel, type: e.target.value })}
                sx={isDark ? {
                  color: '#E0E0E0',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#35373B' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ABABAD' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#5CC5F8' },
                  '& .MuiSvgIcon-root': { color: '#ABABAD' }
                } : {}}
                MenuProps={isDark ? {
                  PaperProps: {
                    sx: { bgcolor: '#222529', border: '1px solid #35373B' }
                  }
                } : {}}
              >
                <MenuItem value="public" sx={isDark ? { color: '#E0E0E0', '&:hover': { bgcolor: '#27242C' } } : {}}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TagIcon fontSize="small" />
                    <span>Acik - Herkes gorebilir ve katilabilir</span>
                  </Box>
                </MenuItem>
                <MenuItem value="private" sx={isDark ? { color: '#E0E0E0', '&:hover': { bgcolor: '#27242C' } } : {}}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LockIcon fontSize="small" />
                    <span>Ozel - Sadece davet edilenler</span>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} sx={isDark ? { color: '#ABABAD' } : {}}>Iptal</Button>
          <Button
            variant="contained"
            onClick={handleCreateChannel}
            disabled={creating || !newChannel.name.trim() || !newChannel.displayName.trim()}
            sx={isDark ? { bgcolor: '#2EB67D', '&:hover': { bgcolor: '#249963' } } : {}}
          >
            {creating ? <CircularProgress size={20} /> : 'Olustur'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Channel List Item Component
const ChannelListItem = ({
  channel,
  selected,
  onSelect,
  onToggleStar,
  getIcon,
  formatTime,
  isDark = false
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <ListItem
      disablePadding
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ListItemButton
        selected={selected}
        onClick={onSelect}
        sx={{
          py: 0.75,
          px: 2,
          '&:hover': {
            bgcolor: isDark ? '#27242C' : undefined
          },
          '&.Mui-selected': {
            bgcolor: isDark ? '#1264A3' : 'rgba(99, 102, 241, 0.08)',
            '&:hover': {
              bgcolor: isDark ? 'rgba(18, 100, 163, 0.8)' : 'rgba(99, 102, 241, 0.12)'
            }
          }
        }}
      >
        <ListItemIcon sx={{ minWidth: 28 }}>
          {getIcon(channel)}
        </ListItemIcon>

        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: channel.membership?.unreadCount > 0 ? 600 : 400,
                  color: channel.isMember
                    ? (isDark ? '#E0E0E0' : '#1f2937')
                    : (isDark ? '#6b7280' : '#9ca3af')
                }}
              >
                {channel.displayName}
              </Typography>
              {channel.membership?.muted && (
                <MuteIcon sx={{ fontSize: 14, color: isDark ? '#ABABAD' : '#9ca3af' }} />
              )}
            </Box>
          }
          secondary={channel.lastMessagePreview ? (
            <Typography
              variant="caption"
              sx={{
                color: isDark ? '#ABABAD' : '#6b7280',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 150
              }}
            >
              {channel.lastMessagePreview}
            </Typography>
          ) : null}
        />

        {/* Unread Badge */}
        {channel.membership?.unreadCount > 0 && (
          <Badge
            badgeContent={channel.membership.unreadCount}
            color={isDark ? 'error' : 'primary'}
            sx={{ mr: 1 }}
          />
        )}

        {/* Star Button (on hover) */}
        {hovered && channel.isMember && (
          <IconButton
            size="small"
            onClick={onToggleStar}
            sx={{ p: 0.25 }}
          >
            {channel.membership?.starred ? (
              <StarIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
            ) : (
              <StarBorderIcon sx={{ fontSize: 16, color: isDark ? '#ABABAD' : '#9ca3af' }} />
            )}
          </IconButton>
        )}

        {/* Join indicator for non-members */}
        {!channel.isMember && channel.type === 'public' && (
          <Typography variant="caption" sx={{ color: isDark ? '#5CC5F8' : '#6366f1', fontWeight: 500 }}>
            Katil
          </Typography>
        )}
      </ListItemButton>
    </ListItem>
  );
};

export default ChannelSidebar;
