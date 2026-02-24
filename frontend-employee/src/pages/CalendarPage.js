import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Badge,
  Fab,
  ToggleButtonGroup,
  ToggleButton,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
  Tooltip,
  Divider
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Add,
  Person,
  Schedule,
  Group,
  Cake,
  Flight,
  MedicalServices,
  School,
  BusinessCenter,
  FilterList,
  Notifications,
  Edit,
  Delete,
  Today,
  Assessment,
  CalendarViewMonth,
  CalendarViewWeek,
  CalendarViewDay,
  Repeat,
  VideoCall,
  Check,
  Close,
  HelpOutline,
  ContentCopy
} from '@mui/icons-material';

const EVENT_TYPES = {
  meeting: { label: 'Toplanti', color: '#1976d2', icon: <Group /> },
  interview: { label: 'Mulakat', color: '#388e3c', icon: <Person /> },
  training: { label: 'Egitim', color: '#f57c00', icon: <School /> },
  deadline: { label: 'Son Tarih', color: '#d32f2f', icon: <Schedule /> },
  birthday: { label: 'Dogum Gunu', color: '#e91e63', icon: <Cake /> },
  vacation: { label: 'Izin', color: '#7b1fa2', icon: <Flight /> },
  sickLeave: { label: 'Hastalik Izni', color: '#795548', icon: <MedicalServices /> },
  project: { label: 'Proje', color: '#455a64', icon: <BusinessCenter /> },
  reminder: { label: 'Hatirlatma', color: '#ff6f00', icon: <Notifications /> }
};

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Tekrar Yok' },
  { value: 'daily', label: 'Her Gun' },
  { value: 'weekly', label: 'Her Hafta' },
  { value: 'monthly', label: 'Her Ay' },
  { value: 'yearly', label: 'Her Yil' }
];

const REMINDER_OPTIONS = [
  { value: 0, label: 'Yok' },
  { value: 5, label: '5 dakika once' },
  { value: 10, label: '10 dakika once' },
  { value: 15, label: '15 dakika once' },
  { value: 30, label: '30 dakika once' },
  { value: 60, label: '1 saat once' },
  { value: 1440, label: '1 gun once' }
];

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 08:00 - 20:00

const emptyEvent = {
  title: '',
  type: 'meeting',
  date: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  endTime: '10:00',
  location: '',
  description: '',
  priority: 'medium',
  attendees: '',
  allDay: false,
  videoCallUrl: '',
  recurrenceRule: 'none',
  recurrenceEndDate: '',
  reminderMinutes: 15
};

function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({ ...emptyEvent });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [loading, setLoading] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    types: Object.keys(EVENT_TYPES),
    priorities: ['low', 'medium', 'high'],
    statuses: ['scheduled', 'confirmed', 'cancelled']
  });

  const API_BASE = (() => {
    try {
      const { API_BASE_URL } = require('../config/config');
      return API_BASE_URL;
    } catch (e) {
      return 'http://localhost:9000';
    }
  })();
  const siteCode = localStorage.getItem('optima_current_site') || 'FXB';

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // API'den etkinlikleri yukle
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      let url;
      if (viewMode === 'month') {
        const month = (currentDate.getMonth() + 1).toString();
        const year = currentDate.getFullYear().toString();
        url = `${API_BASE}/api/calendar/events?month=${month}&year=${year}`;
      } else if (viewMode === 'week') {
        const start = getWeekStart(currentDate);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        url = `${API_BASE}/api/calendar/events?startDate=${formatDateStr(start)}&endDate=${formatDateStr(end)}`;
      } else {
        const dateStr = formatDateStr(currentDate);
        url = `${API_BASE}/api/calendar/events?startDate=${dateStr}&endDate=${dateStr}`;
      }

      const res = await fetch(url, {
        headers: { 'X-Site-Id': siteCode }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Calendar API error:', error);
      setEvents([]);
    }
    setLoading(false);
  }, [currentDate, viewMode, API_BASE, siteCode]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Yardimci fonksiyonlar
  const formatDateStr = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getWeekStart = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    date.setDate(date.getDate() - day + 1); // Pazartesi
    return date;
  };

  const getFilteredEvents = (dayEvents) => {
    return dayEvents.filter(event =>
      selectedFilters.types.includes(event.type) &&
      selectedFilters.priorities.includes(event.priority) &&
      selectedFilters.statuses.includes(event.status)
    );
  };

  const getEventsForDate = (dateStr) => {
    return events.filter(e => e.date === dateStr);
  };

  // Takvim navigasyonu
  const navigate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => setCurrentDate(new Date());

  // Ay goruntusundeki gunleri hesapla
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();
    const days = [];

    for (let i = startingDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true });
    }
    const totalDays = days.length;
    for (let day = 1; totalDays + day - 1 < 42; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false });
    }
    return days;
  };

  // Hafta goruntusundeki gunleri hesapla
  const getWeekDays = () => {
    const start = getWeekStart(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  // Event CRUD
  const openNewEvent = (date) => {
    setEditingEvent(null);
    setFormData({ ...emptyEvent, date: date || formatDateStr(currentDate) });
    setFormDialogOpen(true);
  };

  const openEditEvent = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || '',
      type: event.type || 'meeting',
      date: event.date || '',
      startTime: event.startTime || '09:00',
      endTime: event.endTime || '10:00',
      location: event.location || '',
      description: event.description || '',
      priority: event.priority || 'medium',
      attendees: Array.isArray(event.attendees)
        ? event.attendees.map(a => typeof a === 'string' ? a : a.email).join(', ')
        : '',
      allDay: event.allDay || false,
      videoCallUrl: event.videoCallUrl || '',
      recurrenceRule: event.recurrenceRule || 'none',
      recurrenceEndDate: event.recurrenceEndDate || '',
      reminderMinutes: event.reminderMinutes != null ? event.reminderMinutes : 15
    });
    setEventDialogOpen(false);
    setFormDialogOpen(true);
  };

  const saveEvent = async () => {
    const payload = {
      title: formData.title,
      type: formData.type,
      date: formData.date,
      startTime: formData.allDay ? null : formData.startTime,
      endTime: formData.allDay ? null : formData.endTime,
      location: formData.location,
      description: formData.description,
      priority: formData.priority,
      attendees: formData.attendees.split(',').map(e => e.trim()).filter(Boolean),
      allDay: formData.allDay,
      videoCallUrl: formData.videoCallUrl,
      recurrenceRule: formData.recurrenceRule,
      recurrenceEndDate: formData.recurrenceEndDate || null,
      reminderMinutes: formData.reminderMinutes
    };

    try {
      const isEdit = !!editingEvent;
      const url = isEdit
        ? `${API_BASE}/api/calendar/events/${editingEvent.id}`
        : `${API_BASE}/api/calendar/events`;

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Site-Id': siteCode },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showSnackbar(isEdit ? 'Etkinlik guncellendi' : 'Etkinlik olusturuldu');
        loadEvents();
      } else {
        showSnackbar('Islem basarisiz', 'error');
      }
    } catch (error) {
      console.error('Save event error:', error);
      showSnackbar('Baglanti hatasi', 'error');
    }

    setFormDialogOpen(false);
    setEditingEvent(null);
    setFormData({ ...emptyEvent });
  };

  const deleteEvent = async (eventId) => {
    try {
      await fetch(`${API_BASE}/api/calendar/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'X-Site-Id': siteCode }
      });
      showSnackbar('Etkinlik silindi');
      loadEvents();
    } catch (error) {
      console.error('Delete event error:', error);
      showSnackbar('Silme hatasi', 'error');
    }
    setEventDialogOpen(false);
  };

  const respondToEvent = async (eventId, response) => {
    const email = localStorage.getItem('optima_user_email') || 'user@optima.com';
    try {
      const res = await fetch(`${API_BASE}/api/calendar/events/${eventId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Site-Id': siteCode },
        body: JSON.stringify({ email, response })
      });
      if (res.ok) {
        showSnackbar(response === 'accepted' ? 'Kabul edildi' : response === 'declined' ? 'Reddedildi' : 'Belirsiz olarak isaretlendi');
        loadEvents();
      }
    } catch (error) {
      console.error('Respond error:', error);
    }
  };

  // Baslik metni
  const getHeaderTitle = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const start = getWeekStart(currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.getDate()} - ${end.getDate()} ${end.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const weekDayNames = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];

  // ====== RENDER: Month View ======
  const renderMonthView = () => {
    const days = getDaysInMonth();
    return (
      <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(28, 97, 171, 0.1)' }}>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'rgba(28, 97, 171, 0.05)' }}>
            {weekDayNames.map((day) => (
              <Typography key={day} variant="subtitle2" sx={{ p: 2, textAlign: 'center', fontWeight: 'bold', color: '#1c61ab', borderBottom: '1px solid rgba(28, 97, 171, 0.1)' }}>
                {day}
              </Typography>
            ))}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
            {days.map((dayInfo) => {
              const dateStr = formatDateStr(dayInfo.date);
              const dayEvents = getFilteredEvents(getEventsForDate(dateStr));
              const isToday = dayInfo.date.toDateString() === new Date().toDateString();

              return (
                <Paper
                  key={dayInfo.date.toISOString()}
                  sx={{
                    minHeight: 120, p: 1, cursor: 'pointer',
                    border: '1px solid',
                    borderColor: dayInfo.isCurrentMonth ? 'rgba(28, 97, 171, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    backgroundColor: isToday ? 'rgba(28, 97, 171, 0.1)' : dayInfo.isCurrentMonth ? 'white' : 'rgba(0, 0, 0, 0.02)',
                    '&:hover': { backgroundColor: 'rgba(28, 97, 171, 0.05)', transform: 'scale(1.02)' },
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => openNewEvent(dateStr)}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{
                      fontWeight: isToday ? 'bold' : dayInfo.isCurrentMonth ? 'normal' : 300,
                      color: isToday ? '#1c61ab' : dayInfo.isCurrentMonth ? 'text.primary' : 'text.disabled'
                    }}>
                      {dayInfo.date.getDate()}
                    </Typography>
                    {dayEvents.length > 0 && (
                      <Badge badgeContent={dayEvents.length} color="primary" max={9}>
                        <Box sx={{ width: 8, height: 8 }} />
                      </Badge>
                    )}
                  </Box>
                  <Box sx={{ maxHeight: 80, overflowY: 'auto' }}>
                    {dayEvents.slice(0, 3).map((event) => (
                      <Chip
                        key={`${event.id}-${event.date}`}
                        label={event.title}
                        size="small"
                        sx={{
                          mb: 0.5, mr: 0.5,
                          backgroundColor: EVENT_TYPES[event.type]?.color, color: 'white',
                          fontSize: '10px', height: 20, maxWidth: '100%',
                          '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
                        }}
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setEventDialogOpen(true); }}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <Typography variant="caption" color="text.secondary">+{dayEvents.length - 3} daha</Typography>
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Box>
        </CardContent>
      </Card>
    );
  };

  // ====== RENDER: Week View ======
  const renderWeekView = () => {
    const weekDays = getWeekDays();
    return (
      <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(28, 97, 171, 0.1)', overflow: 'auto' }}>
        <CardContent sx={{ p: 0 }}>
          {/* Header */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', backgroundColor: 'rgba(28, 97, 171, 0.05)', position: 'sticky', top: 0, zIndex: 1 }}>
            <Box sx={{ p: 1, borderBottom: '1px solid rgba(28, 97, 171, 0.1)' }} />
            {weekDays.map((d) => {
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <Box key={d.toISOString()} sx={{ p: 1, textAlign: 'center', borderBottom: '1px solid rgba(28, 97, 171, 0.1)', backgroundColor: isToday ? 'rgba(28, 97, 171, 0.1)' : 'transparent' }}>
                  <Typography variant="caption" sx={{ color: '#1c61ab', fontWeight: 'bold' }}>
                    {weekDayNames[d.getDay()]}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: isToday ? 'bold' : 'normal', color: isToday ? '#1c61ab' : 'text.primary' }}>
                    {d.getDate()}
                  </Typography>
                </Box>
              );
            })}
          </Box>
          {/* Time slots */}
          <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
            {HOURS.map((hour) => (
              <Box key={hour} sx={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', minHeight: 60, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <Box sx={{ p: 0.5, textAlign: 'right', pr: 1, color: 'text.secondary', fontSize: '0.75rem', borderRight: '1px solid rgba(0,0,0,0.06)' }}>
                  {`${hour.toString().padStart(2, '0')}:00`}
                </Box>
                {weekDays.map((d) => {
                  const dateStr = formatDateStr(d);
                  const hourStr = hour.toString().padStart(2, '0');
                  const slotEvents = getFilteredEvents(getEventsForDate(dateStr)).filter(e => {
                    if (e.allDay) return hour === 8;
                    const startH = parseInt((e.startTime || '00:00').split(':')[0]);
                    return startH === hour;
                  });

                  return (
                    <Box
                      key={d.toISOString() + hour}
                      sx={{ p: 0.5, borderRight: '1px solid rgba(0,0,0,0.03)', cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(28, 97, 171, 0.03)' } }}
                      onClick={() => {
                        setFormData({ ...emptyEvent, date: dateStr, startTime: `${hourStr}:00`, endTime: `${(hour + 1).toString().padStart(2, '0')}:00` });
                        setEditingEvent(null);
                        setFormDialogOpen(true);
                      }}
                    >
                      {slotEvents.map((event) => (
                        <Chip
                          key={`${event.id}-${event.date}`}
                          label={`${event.startTime || ''} ${event.title}`}
                          size="small"
                          sx={{
                            mb: 0.5, width: '100%', justifyContent: 'flex-start',
                            backgroundColor: EVENT_TYPES[event.type]?.color, color: 'white',
                            fontSize: '10px', height: 22
                          }}
                          onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setEventDialogOpen(true); }}
                        />
                      ))}
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  };

  // ====== RENDER: Day View ======
  const renderDayView = () => {
    const dateStr = formatDateStr(currentDate);
    const dayEvents = getFilteredEvents(getEventsForDate(dateStr));
    const allDayEvents = dayEvents.filter(e => e.allDay);
    const timedEvents = dayEvents.filter(e => !e.allDay);

    return (
      <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(28, 97, 171, 0.1)' }}>
        <CardContent sx={{ p: 0 }}>
          {/* All day events */}
          {allDayEvents.length > 0 && (
            <Box sx={{ p: 2, backgroundColor: 'rgba(28, 97, 171, 0.05)', borderBottom: '1px solid rgba(28, 97, 171, 0.1)' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Tum Gun</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {allDayEvents.map(event => (
                  <Chip
                    key={event.id}
                    label={event.title}
                    sx={{ backgroundColor: EVENT_TYPES[event.type]?.color, color: 'white' }}
                    onClick={() => { setSelectedEvent(event); setEventDialogOpen(true); }}
                  />
                ))}
              </Box>
            </Box>
          )}
          {/* Hourly slots */}
          <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
            {HOURS.map((hour) => {
              const hourStr = hour.toString().padStart(2, '0');
              const hourEvents = timedEvents.filter(e => {
                const startH = parseInt((e.startTime || '00:00').split(':')[0]);
                return startH === hour;
              });

              return (
                <Box
                  key={hour}
                  sx={{ display: 'flex', minHeight: 70, borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(28, 97, 171, 0.02)' } }}
                  onClick={() => {
                    setFormData({ ...emptyEvent, date: dateStr, startTime: `${hourStr}:00`, endTime: `${(hour + 1).toString().padStart(2, '0')}:00` });
                    setEditingEvent(null);
                    setFormDialogOpen(true);
                  }}
                >
                  <Box sx={{ width: 80, p: 1, textAlign: 'right', pr: 2, color: 'text.secondary', fontSize: '0.85rem', borderRight: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
                    {`${hourStr}:00`}
                  </Box>
                  <Box sx={{ flex: 1, p: 1 }}>
                    {hourEvents.map(event => (
                      <Paper
                        key={event.id}
                        sx={{
                          p: 1.5, mb: 0.5, borderRadius: '8px',
                          backgroundColor: EVENT_TYPES[event.type]?.color, color: 'white',
                          cursor: 'pointer',
                          '&:hover': { opacity: 0.9 }
                        }}
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setEventDialogOpen(true); }}
                      >
                        <Typography variant="subtitle2" fontWeight="bold">{event.title}</Typography>
                        <Typography variant="caption">{event.startTime} - {event.endTime} {event.location ? `| ${event.location}` : ''}</Typography>
                      </Paper>
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <Card sx={{ mb: 3, borderRadius: '16px', boxShadow: '0 4px 20px rgba(28, 97, 171, 0.1)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h4" sx={{
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                HR Takvimi
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton onClick={() => navigate(-1)} color="primary"><ChevronLeft /></IconButton>
                <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center', fontWeight: 600 }}>
                  {getHeaderTitle()}
                </Typography>
                <IconButton onClick={() => navigate(1)} color="primary"><ChevronRight /></IconButton>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {/* View mode toggle */}
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, val) => val && setViewMode(val)}
                size="small"
                sx={{ '& .MuiToggleButton-root': { borderRadius: '8px' } }}
              >
                <ToggleButton value="month"><Tooltip title="Aylik"><CalendarViewMonth /></Tooltip></ToggleButton>
                <ToggleButton value="week"><Tooltip title="Haftalik"><CalendarViewWeek /></Tooltip></ToggleButton>
                <ToggleButton value="day"><Tooltip title="Gunluk"><CalendarViewDay /></Tooltip></ToggleButton>
              </ToggleButtonGroup>

              <Button variant="outlined" startIcon={<Today />} onClick={goToToday} sx={{ borderRadius: '12px' }}>
                Bugun
              </Button>
              <Button variant="outlined" startIcon={<FilterList />} onClick={() => setFilterDialogOpen(true)} sx={{ borderRadius: '12px' }}>
                Filtrele
              </Button>

              <Fab color="primary" size="medium" onClick={() => openNewEvent()} sx={{
                background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #155a9c 0%, #7aa63d 100%)' }
              }}>
                <Add />
              </Fab>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Calendar Views */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}

      {/* ====== Event Detail Dialog ====== */}
      <Dialog open={eventDialogOpen} onClose={() => setEventDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        {selectedEvent && (
          <>
            <DialogTitle sx={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: EVENT_TYPES[selectedEvent.type]?.color, color: 'white'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {EVENT_TYPES[selectedEvent.type]?.icon}
                <Typography variant="h6">{selectedEvent.title}</Typography>
                {selectedEvent.recurrenceRule && selectedEvent.recurrenceRule !== 'none' && (
                  <Chip label={RECURRENCE_OPTIONS.find(r => r.value === selectedEvent.recurrenceRule)?.label || 'Tekrar'} size="small" sx={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white' }} icon={<Repeat sx={{ color: 'white !important' }} />} />
                )}
              </Box>
              <Box>
                <IconButton color="inherit" onClick={() => openEditEvent(selectedEvent)}><Edit /></IconButton>
                <IconButton color="inherit" onClick={() => deleteEvent(selectedEvent.id)}><Delete /></IconButton>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Tarih</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {new Date(selectedEvent.date).toLocaleDateString('tr-TR')}
                    {selectedEvent.allDay && ' (Tum gun)'}
                  </Typography>

                  {!selectedEvent.allDay && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary">Saat</Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>{selectedEvent.startTime} - {selectedEvent.endTime}</Typography>
                    </>
                  )}

                  <Typography variant="subtitle2" color="text.secondary">Konum</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>{selectedEvent.location || 'Belirtilmemis'}</Typography>

                  {selectedEvent.videoCallUrl && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary">Video Gorusme</Typography>
                      <Button size="small" startIcon={<VideoCall />} href={selectedEvent.videoCallUrl} target="_blank" variant="outlined" sx={{ mb: 2, borderRadius: '8px' }}>
                        Gorusmeye Katil
                      </Button>
                    </>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Oncelik</Typography>
                  <Chip
                    label={selectedEvent.priority === 'high' ? 'Yuksek' : selectedEvent.priority === 'medium' ? 'Orta' : 'Dusuk'}
                    color={selectedEvent.priority === 'high' ? 'error' : selectedEvent.priority === 'medium' ? 'warning' : 'success'}
                    size="small" sx={{ mb: 2 }}
                  />

                  <Typography variant="subtitle2" color="text.secondary">Durum</Typography>
                  <Chip
                    label={selectedEvent.status === 'confirmed' ? 'Onaylandi' : selectedEvent.status === 'cancelled' ? 'Iptal' : 'Planlandi'}
                    color={selectedEvent.status === 'confirmed' ? 'success' : selectedEvent.status === 'cancelled' ? 'error' : 'default'}
                    size="small" sx={{ mb: 2 }}
                  />

                  {selectedEvent.reminderMinutes > 0 && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary">Hatirlatma</Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {REMINDER_OPTIONS.find(r => r.value === selectedEvent.reminderMinutes)?.label || `${selectedEvent.reminderMinutes} dk once`}
                      </Typography>
                    </>
                  )}
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Katilimcilar</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {(selectedEvent.attendees || []).map((attendee, index) => {
                      const email = typeof attendee === 'string' ? attendee : attendee.email;
                      const status = typeof attendee === 'object' ? attendee.status : 'pending';
                      return (
                        <Chip
                          key={index}
                          label={email}
                          size="small"
                          color={status === 'accepted' ? 'success' : status === 'declined' ? 'error' : status === 'tentative' ? 'warning' : 'default'}
                          variant={status === 'pending' ? 'outlined' : 'filled'}
                        />
                      );
                    })}
                  </Box>

                  {/* Respond buttons */}
                  {(selectedEvent.attendees || []).length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Button size="small" variant="outlined" color="success" startIcon={<Check />} onClick={() => respondToEvent(selectedEvent.id, 'accepted')}>Kabul Et</Button>
                      <Button size="small" variant="outlined" color="error" startIcon={<Close />} onClick={() => respondToEvent(selectedEvent.id, 'declined')}>Reddet</Button>
                      <Button size="small" variant="outlined" color="warning" startIcon={<HelpOutline />} onClick={() => respondToEvent(selectedEvent.id, 'tentative')}>Belirsiz</Button>
                    </Box>
                  )}

                  <Typography variant="subtitle2" color="text.secondary">Aciklama</Typography>
                  <Typography variant="body2">{selectedEvent.description || 'Aciklama bulunmuyor.'}</Typography>
                </Grid>
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>

      {/* ====== Create/Edit Event Dialog ====== */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {editingEvent ? <Edit /> : <Add />}
            <Typography variant="h6">{editingEvent ? 'Etkinligi Duzenle' : 'Yeni Etkinlik Olustur'}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth label="Etkinlik Basligi" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Etkinlik Turu</InputLabel>
                <Select value={formData.type} label="Etkinlik Turu" onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  {Object.entries(EVENT_TYPES).map(([key, t]) => (
                    <MenuItem key={key} value={key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{t.icon} {t.label}</Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Oncelik</InputLabel>
                <Select value={formData.priority} label="Oncelik" onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                  <MenuItem value="low">Dusuk</MenuItem>
                  <MenuItem value="medium">Orta</MenuItem>
                  <MenuItem value="high">Yuksek</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={formData.allDay} onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })} />}
                label="Tum gun etkinligi"
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField fullWidth type="date" label="Tarih" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>

            {!formData.allDay && (
              <>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth type="time" label="Baslangic Saati" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField fullWidth type="time" label="Bitis Saati" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} InputLabelProps={{ shrink: true }} />
                </Grid>
              </>
            )}

            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Konum" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Toplanti salonu, online link vb." />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField fullWidth label="Video Gorusme Linki" value={formData.videoCallUrl} onChange={(e) => setFormData({ ...formData, videoCallUrl: e.target.value })} placeholder="https://meet.google.com/..." InputProps={{ startAdornment: <VideoCall sx={{ mr: 1, color: 'text.secondary' }} /> }} />
            </Grid>

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Tekrarlama</InputLabel>
                <Select value={formData.recurrenceRule} label="Tekrarlama" onChange={(e) => setFormData({ ...formData, recurrenceRule: e.target.value })}>
                  {RECURRENCE_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {formData.recurrenceRule !== 'none' && (
              <Grid item xs={12} md={4}>
                <TextField fullWidth type="date" label="Tekrarlama Bitis" value={formData.recurrenceEndDate} onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })} InputLabelProps={{ shrink: true }} />
              </Grid>
            )}

            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Hatirlatma</InputLabel>
                <Select value={formData.reminderMinutes} label="Hatirlatma" onChange={(e) => setFormData({ ...formData, reminderMinutes: e.target.value })}>
                  {REMINDER_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth label="Katilimcilar (Email, virgulle ayirin)" value={formData.attendees} onChange={(e) => setFormData({ ...formData, attendees: e.target.value })} placeholder="john@optima.com, jane@optima.com" />
            </Grid>

            <Grid item xs={12}>
              <TextField fullWidth multiline rows={3} label="Aciklama" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Etkinlik hakkinda detaylar..." />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setFormDialogOpen(false)}>Iptal</Button>
          <Button variant="contained" onClick={saveEvent} disabled={!formData.title || !formData.date} sx={{
            background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #155a9c 0%, #7aa63d 100%)' }
          }}>
            {editingEvent ? 'Guncelle' : 'Olustur'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ====== Filter Dialog ====== */}
      <Dialog open={filterDialogOpen} onClose={() => setFilterDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FilterList />
            <Typography variant="h6">Takvim Filtreleri</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Etkinlik Turleri</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {Object.entries(EVENT_TYPES).map(([key, type]) => (
              <Chip key={key} label={type.label} icon={type.icon}
                color={selectedFilters.types.includes(key) ? 'primary' : 'default'}
                onClick={() => {
                  const newTypes = selectedFilters.types.includes(key)
                    ? selectedFilters.types.filter(t => t !== key) : [...selectedFilters.types, key];
                  setSelectedFilters({ ...selectedFilters, types: newTypes });
                }}
                sx={{ backgroundColor: selectedFilters.types.includes(key) ? type.color : undefined, color: selectedFilters.types.includes(key) ? 'white' : undefined }}
              />
            ))}
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>Oncelik Seviyeleri</Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            {[{ key: 'high', label: 'Yuksek', color: 'error' }, { key: 'medium', label: 'Orta', color: 'warning' }, { key: 'low', label: 'Dusuk', color: 'success' }].map((p) => (
              <Chip key={p.key} label={p.label}
                color={selectedFilters.priorities.includes(p.key) ? p.color : 'default'}
                onClick={() => {
                  const np = selectedFilters.priorities.includes(p.key)
                    ? selectedFilters.priorities.filter(x => x !== p.key) : [...selectedFilters.priorities, p.key];
                  setSelectedFilters({ ...selectedFilters, priorities: np });
                }}
              />
            ))}
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>Etkinlik Durumu</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[{ key: 'scheduled', label: 'Planlandi', color: 'default' }, { key: 'confirmed', label: 'Onaylandi', color: 'success' }, { key: 'cancelled', label: 'Iptal', color: 'error' }].map((s) => (
              <Chip key={s.key} label={s.label}
                color={selectedFilters.statuses.includes(s.key) ? s.color : 'default'}
                onClick={() => {
                  const ns = selectedFilters.statuses.includes(s.key)
                    ? selectedFilters.statuses.filter(x => x !== s.key) : [...selectedFilters.statuses, s.key];
                  setSelectedFilters({ ...selectedFilters, statuses: ns });
                }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setFilterDialogOpen(false)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default CalendarPage;
