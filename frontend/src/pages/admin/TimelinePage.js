import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  TextField,
  Button,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Work as WorkIcon,
  Email as EmailIcon,
  Assignment as AssignmentIcon,
  EventNote as EventNoteIcon,
  Payment as PaymentIcon,
  MoreVert as MoreVertIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';

function TimelinePage() {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Gerçek API endpoint'i buraya eklenecek
      // const response = await axios.get(`${API_URL}/api/timeline/events`);
      // setEvents(response.data);
      
      // Şu an için boş liste
      setEvents([]);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('tr-TR', options);
  };

  const getEventColor = (type) => {
    const colors = {
      'employee_hired': '#4caf50',
      'employee_terminated': '#f44336',
      'leave_approved': '#1c61ab',
      'application_received': '#2196f3',
      'payroll_completed': '#ff9800',
      'email_sent': '#9c27b0'
    };
    return colors[type] || '#1c61ab';
  };

  const getEventIcon = (type) => {
    switch(type) {
      case 'employee_hired': return <PersonAddIcon />;
      case 'employee_terminated': return <PersonRemoveIcon />;
      case 'leave_approved': return <EventNoteIcon />;
      case 'application_received': return <AssignmentIcon />;
      case 'payroll_completed': return <PaymentIcon />;
      case 'email_sent': return <EmailIcon />;
      default: return <WorkIcon />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" fontWeight="bold">
            Sistem Akışı
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filtrele</InputLabel>
              <Select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                label="Filtrele"
              >
                <MenuItem value="all">Tümü</MenuItem>
                <MenuItem value="employee_hired">İşe Alımlar</MenuItem>
                <MenuItem value="employee_terminated">İşten Ayrılmalar</MenuItem>
                <MenuItem value="leave_approved">İzinler</MenuItem>
                <MenuItem value="application_received">Başvurular</MenuItem>
                <MenuItem value="payroll_completed">Ödemeler</MenuItem>
                <MenuItem value="email_sent">E-postalar</MenuItem>
              </Select>
            </FormControl>
            
            <IconButton onClick={loadEvents} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Events List */}
      <Paper sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : events.length > 0 ? (
          <List>
            {events.map((event, index) => (
              <React.Fragment key={event.id}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: getEventColor(event.type) }}>
                      {getEventIcon(event.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" component="span" fontWeight="bold">
                          {event.title}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <TimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(new Date(event.timestamp))}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {event.description}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>
                            {event.user_name?.[0] || 'S'}
                          </Avatar>
                          <Typography variant="caption" color="text.secondary">
                            {event.user_name || 'Sistem'}
                          </Typography>
                        </Box>
                      </>
                    }
                  />
                </ListItem>
                {index < events.length - 1 && <Divider component="li" />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Alert severity="info">
            Henüz sistem aktivitesi bulunmuyor. Sistem kullanıldıkça aktiviteler burada görünecektir.
          </Alert>
        )}
      </Paper>
    </Box>
  );
}

export default TimelinePage;