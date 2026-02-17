import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Popper
} from '@mui/material';
import {
  Person as PersonIcon,
  Tag as TagIcon,
  Group as GroupIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';

const getSiteHeaders = () => {
  const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
  return { 'X-Site-Id': currentSite };
};

const MentionInput = ({
  value,
  onChange,
  onKeyPress,
  placeholder,
  channelId,
  disabled,
  multiline = true,
  maxRows = 4,
  sx = {}
}) => {
  const [mentionAnchor, setMentionAnchor] = useState(null);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionType, setMentionType] = useState(null); // '@' for users, '#' for channels
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef(null);

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (type, search) => {
    try {
      let endpoint = '';
      if (type === '@') {
        // Fetch channel members or all employees
        endpoint = channelId
          ? `${API_BASE_URL}/api/channels/${channelId}/members`
          : `${API_BASE_URL}/api/employees?search=${encodeURIComponent(search)}&limit=10`;
      } else if (type === '#') {
        // Fetch channels
        endpoint = `${API_BASE_URL}/api/channels?search=${encodeURIComponent(search)}`;
      }

      const response = await fetch(endpoint, {
        credentials: 'include',
        headers: getSiteHeaders()
      });

      if (response.ok) {
        const data = await response.json();

        // Filter and format based on type
        if (type === '@') {
          const members = Array.isArray(data) ? data : (data.members || []);
          const filtered = members
            .filter(m => {
              const name = m.name || `${m.first_name || ''} ${m.last_name || ''}`.trim();
              return name.toLowerCase().includes(search.toLowerCase());
            })
            .slice(0, 8);

          // Add special mentions
          const specialMentions = [];
          if ('here'.includes(search.toLowerCase())) {
            specialMentions.push({ id: 'here', name: 'here', type: 'special', description: 'Aktif kullanicilari bilgilendir' });
          }
          if ('channel'.includes(search.toLowerCase()) || 'kanal'.includes(search.toLowerCase())) {
            specialMentions.push({ id: 'channel', name: 'channel', type: 'special', description: 'Tum kanal uyelerini bilgilendir' });
          }
          if ('everyone'.includes(search.toLowerCase()) || 'herkes'.includes(search.toLowerCase())) {
            specialMentions.push({ id: 'everyone', name: 'everyone', type: 'special', description: 'Herkesi bilgilendir' });
          }

          setSuggestions([...specialMentions, ...filtered]);
        } else {
          const channels = Array.isArray(data) ? data : [];
          const filtered = channels
            .filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.displayName?.toLowerCase().includes(search.toLowerCase()))
            .slice(0, 8);
          setSuggestions(filtered);
        }
      }
    } catch (err) {
      console.error('Error fetching mention suggestions:', err);
      setSuggestions([]);
    }
  }, [channelId]);

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    setCursorPosition(cursorPos);

    // Check for mention trigger
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/[@#](\w*)$/);

    if (mentionMatch) {
      const type = mentionMatch[0][0];
      const search = mentionMatch[1] || '';

      setMentionType(type);
      setMentionSearch(search);
      setMentionAnchor(inputRef.current);
      setSelectedIndex(0);
      fetchSuggestions(type, search);
    } else {
      setMentionAnchor(null);
      setMentionType(null);
      setMentionSearch('');
      setSuggestions([]);
    }

    onChange(e);
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e) => {
    if (!mentionAnchor || suggestions.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
      case 'Tab':
        if (mentionAnchor) {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setMentionAnchor(null);
        break;
      default:
        break;
    }
  };

  // Insert mention into text
  const insertMention = (item) => {
    if (!item) return;

    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);

    // Find the mention trigger position
    const triggerMatch = textBeforeCursor.match(/[@#]\w*$/);
    if (!triggerMatch) return;

    const triggerStart = textBeforeCursor.length - triggerMatch[0].length;
    const beforeTrigger = value.substring(0, triggerStart);

    // Format mention
    let mentionText = '';
    if (mentionType === '@') {
      if (item.type === 'special') {
        mentionText = `@${item.name}`;
      } else {
        mentionText = `@${item.name || item.first_name}`;
      }
    } else {
      mentionText = `#${item.name}`;
    }

    const newValue = beforeTrigger + mentionText + ' ' + textAfterCursor;

    // Create synthetic event
    const syntheticEvent = {
      target: { value: newValue }
    };
    onChange(syntheticEvent);

    // Close suggestions
    setMentionAnchor(null);
    setMentionType(null);
    setMentionSearch('');
    setSuggestions([]);

    // Focus back to input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPos = beforeTrigger.length + mentionText.length + 1;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Get avatar/icon for suggestion item
  const getSuggestionIcon = (item) => {
    if (mentionType === '#') {
      return <TagIcon sx={{ color: '#6366f1' }} />;
    }
    if (item.type === 'special') {
      return <GroupIcon sx={{ color: '#f59e0b' }} />;
    }
    if (item.avatar || item.profile_picture) {
      return <Avatar src={item.avatar || item.profile_picture} sx={{ width: 32, height: 32 }} />;
    }
    return (
      <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366f1' }}>
        {(item.name?.[0] || item.first_name?.[0] || '?').toUpperCase()}
      </Avatar>
    );
  };

  // Get display name for suggestion item
  const getDisplayName = (item) => {
    if (mentionType === '#') {
      return item.displayName || item.name;
    }
    return item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim();
  };

  return (
    <Box sx={{ position: 'relative', ...sx }}>
      <TextField
        inputRef={inputRef}
        fullWidth
        multiline={multiline}
        maxRows={maxRows}
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onKeyPress={onKeyPress}
        disabled={disabled}
        size="small"
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            bgcolor: '#f9fafb'
          }
        }}
      />

      {/* Mention Suggestions Popper */}
      <Popper
        open={Boolean(mentionAnchor) && suggestions.length > 0}
        anchorEl={mentionAnchor}
        placement="top-start"
        style={{ zIndex: 1300 }}
      >
        <Paper
          elevation={8}
          sx={{
            width: 280,
            maxHeight: 300,
            overflow: 'auto',
            mb: 1,
            borderRadius: 2
          }}
        >
          <List dense>
            {suggestions.map((item, index) => (
              <ListItem
                key={item.id}
                button
                selected={index === selectedIndex}
                onClick={() => insertMention(item)}
                sx={{
                  py: 1,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(99, 102, 241, 0.08)'
                  },
                  '&:hover': {
                    bgcolor: 'rgba(99, 102, 241, 0.04)'
                  }
                }}
              >
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  {getSuggestionIcon(item)}
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {mentionType}{getDisplayName(item)}
                    </Typography>
                  }
                  secondary={
                    item.type === 'special' ? item.description : (item.email || item.department || null)
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Popper>
    </Box>
  );
};

export default MentionInput;
