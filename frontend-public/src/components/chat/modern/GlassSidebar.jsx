/**
 * GlassSidebar - Glassmorphism chat sidebar
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Badge,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import PeopleIcon from '@mui/icons-material/People';
import ChatIcon from '@mui/icons-material/Chat';
import CampaignIcon from '@mui/icons-material/Campaign';
import BusinessIcon from '@mui/icons-material/Business';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

import { AvatarWithStatus } from '../EmployeeDirectory/OnlineStatusBadge';
import { format, isToday, isYesterday } from 'date-fns';
import { tr } from 'date-fns/locale';

export function GlassSidebar({
  rooms = [],
  activeRoomId,
  activeChannel = 'EXTERNAL',
  unreadCounts = {},
  onRoomSelect,
  onChannelChange,
  onNewChat,
  onShowDirectory,
  showChannelTabs = true,
  isLoading = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Odalari filtrele
  const filteredRooms = rooms.filter((room) => {
    if (!searchQuery) return true;
    const name = room.room_name || room.applicant_name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Toplam okunmamis
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(var(--glass-blur))',
        borderRight: '1px solid var(--glass-border)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Mesajlar
            {totalUnread > 0 && (
              <Chip
                size="small"
                label={totalUnread}
                sx={{
                  ml: 1,
                  height: 20,
                  backgroundColor: 'var(--color-primary)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 11,
                }}
              />
            )}
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/* Yeni Chat */}
            {onNewChat && (
              <IconButton size="small" onClick={onNewChat}>
                <AddIcon />
              </IconButton>
            )}

            {/* Calisan Rehberi */}
            {onShowDirectory && (
              <IconButton size="small" onClick={onShowDirectory}>
                <PeopleIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Arama */}
        <TextField
          fullWidth
          size="small"
          placeholder="Sohbet ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'var(--text-muted)', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '20px',
              backgroundColor: 'white',
              '& fieldset': { borderColor: 'var(--border-light)' },
            },
          }}
        />
      </Box>

      {/* Kanal Tablari */}
      {showChannelTabs && (
        <Tabs
          value={activeChannel}
          onChange={(e, value) => onChannelChange?.(value)}
          variant="fullWidth"
          sx={{
            minHeight: 40,
            borderBottom: '1px solid var(--border-light)',
            '& .MuiTab-root': {
              minHeight: 40,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: 13,
            },
            '& .Mui-selected': {
              color: 'var(--color-primary)',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'var(--color-primary)',
            },
          }}
        >
          <Tab
            value="EXTERNAL"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ChatIcon sx={{ fontSize: 16 }} />
                Adaylar
              </Box>
            }
          />
          <Tab
            value="INTERNAL"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BusinessIcon sx={{ fontSize: 16 }} />
                Dahili
              </Box>
            }
          />
        </Tabs>
      )}

      {/* Oda Listesi */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'var(--border-medium)',
            borderRadius: 3,
          },
        }}
      >
        {filteredRooms.length === 0 ? (
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
            <ChatIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2">
              {searchQuery ? 'Sonuc bulunamadi' : 'Henuz sohbet yok'}
            </Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {filteredRooms.map((room) => (
              <RoomListItem
                key={room.id}
                room={room}
                isActive={room.id === activeRoomId}
                unreadCount={unreadCounts[room.id] || 0}
                onClick={() => onRoomSelect?.(room)}
              />
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
}

/**
 * Oda listesi itemi
 */
function RoomListItem({ room, isActive, unreadCount, onClick }) {
  const {
    id,
    room_type,
    room_name,
    applicant_name,
    avatar_url,
    last_message_at,
    last_message,
    is_announcement,
    members,
  } = room;

  const isDM = room_type === 'PRIVATE_DM';
  const isGroup = room_type === 'group' || room_type === 'DEPARTMENT_GROUP';
  const isAnnouncement = room_type === 'ANNOUNCEMENT' || is_announcement;

  const title = room_name || applicant_name || 'Sohbet';

  // Son mesaj zamani
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Dun';
    }
    return format(date, 'd MMM', { locale: tr });
  };

  // Ikon
  const getIcon = () => {
    if (isAnnouncement) return <CampaignIcon sx={{ fontSize: 18 }} />;
    if (isGroup) return <PeopleIcon sx={{ fontSize: 18 }} />;
    return null;
  };

  return (
    <ListItem
      button
      onClick={onClick}
      sx={{
        py: 1.5,
        px: 2,
        backgroundColor: isActive ? 'rgba(28, 97, 171, 0.08)' : 'transparent',
        borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
        '&:hover': {
          backgroundColor: isActive
            ? 'rgba(28, 97, 171, 0.12)'
            : 'var(--bg-tertiary)',
        },
      }}
    >
      {/* Avatar */}
      <ListItemAvatar sx={{ minWidth: 52 }}>
        {isGroup || isAnnouncement ? (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: isAnnouncement
                ? 'rgba(245, 158, 11, 0.15)'
                : 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isAnnouncement ? '#f59e0b' : 'white',
            }}
          >
            {getIcon()}
          </Box>
        ) : (
          <AvatarWithStatus
            src={avatar_url}
            alt={title}
            status={room.presence?.status || 'offline'}
            size={44}
          />
        )}
      </ListItemAvatar>

      {/* Icerik */}
      <ListItemText
        primary={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: unreadCount > 0 ? 700 : 500,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {title}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: unreadCount > 0 ? 'var(--color-primary)' : 'var(--text-muted)',
                fontWeight: unreadCount > 0 ? 600 : 400,
                flexShrink: 0,
                ml: 1,
              }}
            >
              {formatTime(last_message_at)}
            </Typography>
          </Box>
        }
        secondary={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: unreadCount > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: unreadCount > 0 ? 500 : 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}
            >
              {last_message?.content || (isAnnouncement ? 'Duyuru kanali' : '')}
            </Typography>

            {/* Okunmamis Badge */}
            {unreadCount > 0 && (
              <Badge
                badgeContent={unreadCount}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 10,
                    minWidth: 18,
                    height: 18,
                  },
                }}
              />
            )}
          </Box>
        }
      />
    </ListItem>
  );
}

export default GlassSidebar;
