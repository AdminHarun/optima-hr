import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  TextField,
  InputAdornment,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Message as MessageIcon,
  Tag as TagIcon,
  Person as PersonIcon,
  AttachFile as FileIcon,
  Schedule as TimeIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';

const getSiteHeaders = () => {
  const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
  return { 'X-Site-Id': currentSite };
};

const GlobalSearchModal = ({
  open,
  onClose,
  onSelectMessage,
  onSelectChannel,
  onSelectUser
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0); // 0: All, 1: Messages, 2: Channels, 3: Users
  const [results, setResults] = useState({ messages: [], channels: [], users: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Clear on close
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults({ messages: [], channels: [], users: [], total: 0 });
    }
  }, [open]);

  // Debounced search
  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults({ messages: [], channels: [], users: [], total: 0 });
      return;
    }

    try {
      setLoading(true);
      const typeMap = ['all', 'messages', 'channels', 'users'];
      const searchType = typeMap[activeTab];

      const response = await fetch(
        `${API_BASE_URL}/api/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}&limit=20`,
        {
          credentials: 'include',
          headers: getSiteHeaders()
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Handle query change with debounce
  const handleQueryChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(newQuery);
    }, 300);
  };

  // Handle tab change
  const handleTabChange = (e, newValue) => {
    setActiveTab(newValue);
    if (query.length >= 2) {
      performSearch(query);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 86400000) {
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 604800000) {
      return date.toLocaleDateString('tr-TR', { weekday: 'short' });
    }
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  // Get initials
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Render highlighted content
  const renderHighlightedContent = (content) => {
    if (!content) return '';
    // Remove HTML tags for security, then display
    const cleanContent = content.replace(/<mark>/g, '**').replace(/<\/mark>/g, '**');
    return cleanContent.length > 150 ? cleanContent.substring(0, 150) + '...' : cleanContent;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '80vh'
        }
      }}
      onKeyDown={handleKeyDown}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid #e5e7eb' }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          placeholder="Mesaj, kanal veya kisi ara..."
          value={query}
          onChange={handleQueryChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#9ca3af' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {loading && <CircularProgress size={20} />}
                {query && !loading && (
                  <IconButton size="small" onClick={() => setQuery('')}>
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                )}
              </InputAdornment>
            ),
            sx: {
              bgcolor: '#f3f4f6',
              borderRadius: 2,
              '& fieldset': { border: 'none' }
            }
          }}
        />

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ mt: 2, minHeight: 36 }}
        >
          <Tab
            label={`Tumu ${results.total > 0 ? `(${results.total})` : ''}`}
            sx={{ minHeight: 36, fontSize: '13px', textTransform: 'none' }}
          />
          <Tab
            icon={<MessageIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label={`Mesajlar ${results.messages?.length > 0 ? `(${results.messages.length})` : ''}`}
            sx={{ minHeight: 36, fontSize: '13px', textTransform: 'none' }}
          />
          <Tab
            icon={<TagIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label={`Kanallar ${results.channels?.length > 0 ? `(${results.channels.length})` : ''}`}
            sx={{ minHeight: 36, fontSize: '13px', textTransform: 'none' }}
          />
          <Tab
            icon={<PersonIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
            label={`Kisiler ${results.users?.length > 0 ? `(${results.users.length})` : ''}`}
            sx={{ minHeight: 36, fontSize: '13px', textTransform: 'none' }}
          />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0, minHeight: 300 }}>
        {!query && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <SearchIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
            <Typography variant="body1" sx={{ color: '#6b7280' }}>
              Aramak icin yazmaya baslayin
            </Typography>
            <Typography variant="caption" sx={{ color: '#9ca3af' }}>
              Mesajlar, kanallar ve kisiler icinde arama yapin
            </Typography>
          </Box>
        )}

        {query && results.total === 0 && !loading && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#6b7280' }}>
              "{query}" icin sonuc bulunamadi
            </Typography>
          </Box>
        )}

        {/* Messages Results */}
        {(activeTab === 0 || activeTab === 1) && results.messages?.length > 0 && (
          <Box>
            {activeTab === 0 && (
              <Typography variant="subtitle2" sx={{ px: 2, pt: 2, pb: 1, color: '#6b7280', fontWeight: 600 }}>
                Mesajlar
              </Typography>
            )}
            <List dense>
              {results.messages.map((msg) => (
                <ListItem
                  key={msg.id}
                  button
                  onClick={() => {
                    onSelectMessage?.(msg);
                    onClose();
                  }}
                  sx={{
                    '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.04)' }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={msg.senderAvatar}
                      sx={{ width: 36, height: 36, bgcolor: '#6366f1' }}
                    >
                      {getInitials(msg.senderName)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {msg.senderName}
                        </Typography>
                        {msg.channelName && (
                          <Chip
                            size="small"
                            label={`#${msg.channelName}`}
                            sx={{ height: 18, fontSize: '11px' }}
                          />
                        )}
                        <Typography variant="caption" sx={{ color: '#9ca3af', ml: 'auto' }}>
                          {formatTime(msg.createdAt)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        sx={{ color: '#6b7280', fontSize: '13px' }}
                      >
                        {renderHighlightedContent(msg.contentHighlight || msg.content)}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Channels Results */}
        {(activeTab === 0 || activeTab === 2) && results.channels?.length > 0 && (
          <Box>
            {activeTab === 0 && results.messages?.length > 0 && <Divider />}
            {activeTab === 0 && (
              <Typography variant="subtitle2" sx={{ px: 2, pt: 2, pb: 1, color: '#6b7280', fontWeight: 600 }}>
                Kanallar
              </Typography>
            )}
            <List dense>
              {results.channels.map((channel) => (
                <ListItem
                  key={channel.id}
                  button
                  onClick={() => {
                    onSelectChannel?.(channel);
                    onClose();
                  }}
                  sx={{
                    '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.04)' }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: '#10b981' }}>
                      <TagIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          #{channel.displayName || channel.name}
                        </Typography>
                        {channel.type === 'private' && (
                          <Chip size="small" label="Ozel" sx={{ height: 18, fontSize: '11px' }} />
                        )}
                        <Chip
                          size="small"
                          label={`${channel.memberCount} uye`}
                          variant="outlined"
                          sx={{ height: 18, fontSize: '11px', ml: 'auto' }}
                        />
                      </Box>
                    }
                    secondary={channel.description}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Users Results */}
        {(activeTab === 0 || activeTab === 3) && results.users?.length > 0 && (
          <Box>
            {activeTab === 0 && (results.messages?.length > 0 || results.channels?.length > 0) && <Divider />}
            {activeTab === 0 && (
              <Typography variant="subtitle2" sx={{ px: 2, pt: 2, pb: 1, color: '#6b7280', fontWeight: 600 }}>
                Kisiler
              </Typography>
            )}
            <List dense>
              {results.users.map((user) => (
                <ListItem
                  key={user.id}
                  button
                  onClick={() => {
                    onSelectUser?.(user);
                    onClose();
                  }}
                  sx={{
                    '&:hover': { bgcolor: 'rgba(99, 102, 241, 0.04)' }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={user.avatar}
                      sx={{ width: 36, height: 36, bgcolor: '#8b5cf6' }}
                    >
                      {getInitials(user.name)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {user.name}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {user.department && (
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>
                            {user.department}
                          </Typography>
                        )}
                        {user.position && (
                          <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                            - {user.position}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearchModal;
