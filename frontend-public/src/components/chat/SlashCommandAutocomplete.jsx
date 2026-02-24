import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Paper,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box
} from '@mui/material';
import {
  HelpOutline,
  Circle,
  TaskAlt,
  NotificationsActive,
  Poll,
  CleaningServices
} from '@mui/icons-material';

/**
 * Slash Command definitions for Optima HR
 * Matches backend SlashCommandService registered commands
 */
const SLASH_COMMANDS = [
  {
    name: 'help',
    description: 'Kullanilabilir komutlari goster',
    usage: '/help',
    icon: HelpOutline,
    category: 'general'
  },
  {
    name: 'status',
    description: 'Durum mesajini guncelle',
    usage: '/status [metin]',
    icon: Circle,
    category: 'general'
  },
  {
    name: 'task',
    description: 'Hizli gorev olustur',
    usage: '/task [baslik]',
    icon: TaskAlt,
    category: 'productivity'
  },
  {
    name: 'remind',
    description: 'Hatirlatici kur',
    usage: '/remind [sure] [mesaj]',
    icon: NotificationsActive,
    category: 'productivity'
  },
  {
    name: 'poll',
    description: 'Anket olustur',
    usage: '/poll [soru] | [secenek1] | [secenek2]',
    icon: Poll,
    category: 'engagement'
  },
  {
    name: 'clear',
    description: 'Mesajlari temizle',
    usage: '/clear',
    icon: CleaningServices,
    category: 'admin'
  }
];

/**
 * SlashCommandAutocomplete - Floating dropdown for slash command suggestions
 *
 * Shows above the chat input when user types "/" at the start of a message.
 * Supports keyboard navigation (Up/Down/Enter/Tab/Escape) and mouse click.
 *
 * @param {string} inputValue - Current text input value
 * @param {function} onSelect - Callback when a command is selected, receives the command object
 * @param {function} onClose - Callback to close the dropdown
 * @param {object} anchorRef - Ref to the input element for positioning
 */
const SlashCommandAutocomplete = ({ inputValue, onSelect, onClose, anchorRef }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  // Determine if slash menu should be visible and filter commands
  const query = inputValue.startsWith('/') ? inputValue.slice(1).toLowerCase() : '';
  const isVisible = inputValue.startsWith('/') && !inputValue.includes(' ');

  const filteredCommands = isVisible
    ? SLASH_COMMANDS.filter((cmd) => cmd.name.startsWith(query))
    : [];

  const hasResults = filteredCommands.length > 0;
  const shouldShow = isVisible && hasResults;

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll the selected item into view
  useEffect(() => {
    if (shouldShow && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex, shouldShow]);

  // Handle keyboard events - this is called from the parent's onKeyDown
  const handleKeyDown = useCallback(
    (e) => {
      if (!shouldShow) return false;

      switch (e.key) {
        case 'ArrowUp': {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev <= 0 ? filteredCommands.length - 1 : prev - 1
          );
          return true;
        }
        case 'ArrowDown': {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev >= filteredCommands.length - 1 ? 0 : prev + 1
          );
          return true;
        }
        case 'Enter':
        case 'Tab': {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            onSelect(filteredCommands[selectedIndex]);
          }
          return true;
        }
        case 'Escape': {
          e.preventDefault();
          onClose();
          return true;
        }
        default:
          return false;
      }
    },
    [shouldShow, filteredCommands, selectedIndex, onSelect, onClose]
  );

  // Expose handleKeyDown to parent via ref-like pattern
  // We use useEffect to attach/detach instead
  useEffect(() => {
    if (anchorRef && anchorRef.current) {
      // Store the handler on the ref element for parent access
      anchorRef.current.__slashKeyHandler = handleKeyDown;
    }
  }, [handleKeyDown, anchorRef]);

  if (!shouldShow) return null;

  return (
    <Paper
      ref={listRef}
      elevation={8}
      sx={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        mb: 1,
        borderRadius: '14px',
        overflow: 'hidden',
        border: '1px solid rgba(28, 97, 171, 0.12)',
        boxShadow: '0 8px 32px rgba(28, 97, 171, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
        zIndex: 1300,
        maxHeight: 320,
        overflowY: 'auto',
        // Custom scrollbar
        '&::-webkit-scrollbar': {
          width: 6
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent'
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(28, 97, 171, 0.15)',
          borderRadius: 3
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: '1px solid rgba(28, 97, 171, 0.08)',
          background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.04) 0%, rgba(139, 185, 74, 0.04) 100%)'
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: '#1c61ab',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontSize: '11px'
          }}
        >
          Komutlar
        </Typography>
      </Box>

      {/* Command List */}
      <List disablePadding sx={{ py: 0.5 }}>
        {filteredCommands.map((cmd, index) => {
          const IconComponent = cmd.icon;
          const isSelected = index === selectedIndex;

          return (
            <ListItemButton
              key={cmd.name}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              selected={isSelected}
              onClick={() => onSelect(cmd)}
              onMouseEnter={() => setSelectedIndex(index)}
              sx={{
                px: 2,
                py: 1,
                mx: 0.5,
                borderRadius: '10px',
                transition: 'all 0.15s ease',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(28, 97, 171, 0.08)',
                  '&:hover': {
                    backgroundColor: 'rgba(28, 97, 171, 0.12)'
                  }
                },
                '&:hover': {
                  backgroundColor: 'rgba(28, 97, 171, 0.06)'
                }
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: isSelected ? '#1c61ab' : '#94a3b8',
                  transition: 'color 0.15s ease'
                }}
              >
                <IconComponent fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      component="span"
                      sx={{
                        fontWeight: 600,
                        fontSize: '13.5px',
                        color: isSelected ? '#1c61ab' : '#334155',
                        fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
                        transition: 'color 0.15s ease'
                      }}
                    >
                      /{cmd.name}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace'
                      }}
                    >
                      {cmd.usage !== `/${cmd.name}` && cmd.usage.replace(`/${cmd.name} `, '')}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Typography
                    component="span"
                    sx={{
                      fontSize: '12px',
                      color: '#64748b',
                      lineHeight: 1.4
                    }}
                  >
                    {cmd.description}
                  </Typography>
                }
                sx={{ my: 0 }}
              />
              {isSelected && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    ml: 1,
                    flexShrink: 0
                  }}
                >
                  <Box
                    component="kbd"
                    sx={{
                      px: 0.75,
                      py: 0.25,
                      borderRadius: '4px',
                      border: '1px solid rgba(28, 97, 171, 0.2)',
                      backgroundColor: 'rgba(28, 97, 171, 0.05)',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#1c61ab',
                      fontFamily: 'inherit',
                      lineHeight: 1.4
                    }}
                  >
                    Enter
                  </Box>
                </Box>
              )}
            </ListItemButton>
          );
        })}
      </List>
    </Paper>
  );
};

export { SLASH_COMMANDS };
export default memo(SlashCommandAutocomplete);
