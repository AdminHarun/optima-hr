import React, { useState, useEffect } from 'react';
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
  Fab
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
  Assessment
} from '@mui/icons-material';
// Date picker kütüphanesi olmadan çalışacak şekilde güncellendi

// Event kategorileri ve renkleri
const EVENT_TYPES = {
  meeting: { label: 'Toplantı', color: '#1976d2', icon: <Group /> },
  interview: { label: 'Mülakat', color: '#388e3c', icon: <Person /> },
  training: { label: 'Eğitim', color: '#f57c00', icon: <School /> },
  deadline: { label: 'Son Tarih', color: '#d32f2f', icon: <Schedule /> },
  birthday: { label: 'Doğum Günü', color: '#e91e63', icon: <Cake /> },
  vacation: { label: 'İzin', color: '#7b1fa2', icon: <Flight /> },
  sickLeave: { label: 'Hastalık İzni', color: '#795548', icon: <MedicalServices /> },
  project: { label: 'Proje', color: '#455a64', icon: <BusinessCenter /> },
  reminder: { label: 'Hatırlatma', color: '#ff6f00', icon: <Notifications /> }
};

// Örnek etkinlik verisi
const getInitialEvents = () => {
  const today = new Date();
  const events = [];

  // Bu ay için örnek etkinlikler
  for (let i = 0; i < 30; i++) {
    const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
    const randomEvents = Math.floor(Math.random() * 3);

    for (let j = 0; j < randomEvents; j++) {
      const types = Object.keys(EVENT_TYPES);
      const randomType = types[Math.floor(Math.random() * types.length)];
      const startHour = 9 + Math.floor(Math.random() * 8);

      events.push({
        id: `event_${i}_${j}`,
        title: getEventTitle(randomType),
        type: randomType,
        date: date.toISOString().split('T')[0],
        startTime: `${startHour.toString().padStart(2, '0')}:00`,
        endTime: `${(startHour + 1).toString().padStart(2, '0')}:00`,
        location: Math.random() > 0.5 ? 'Toplantı Salonu A' : 'Online',
        attendees: ['john.doe@optima.com', 'jane.smith@optima.com'],
        description: 'Örnek etkinlik açıklaması...',
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        status: ['scheduled', 'confirmed', 'cancelled'][Math.floor(Math.random() * 3)],
        createdBy: 'current-user'
      });
    }
  }

  return events;
};

const getEventTitle = (type) => {
  const titles = {
    meeting: ['Haftalık Değerlendirme', 'Proje Toplantısı', 'Departman Toplantısı'],
    interview: ['Yazılım Geliştirici Mülakatı', 'İK Uzmanı Mülakatı', 'Proje Yöneticisi Mülakatı'],
    training: ['React Eğitimi', 'İletişim Becerileri', 'Liderlik Gelişimi'],
    deadline: ['Proje Teslimi', 'Rapor Sunumu', 'Bütçe Planlaması'],
    birthday: ['Ahmet Yılmaz', 'Ayşe Demir', 'Mehmet Kaya'],
    vacation: ['Yıllık İzin', 'Kısa İzin', 'Uzun İzin'],
    sickLeave: ['Hastalık İzni', 'Doktor Raporu'],
    project: ['Yeni Proje Başlangıcı', 'Proje Gözden Geçirme'],
    reminder: ['Performans Değerlendirmesi', 'Sözleşme Yenileme']
  };

  const typeList = titles[type] || ['Genel Etkinlik'];
  return typeList[Math.floor(Math.random() * typeList.length)];
};

function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [newEventDialogOpen, setNewEventDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    types: Object.keys(EVENT_TYPES),
    priorities: ['low', 'medium', 'high'],
    statuses: ['scheduled', 'confirmed', 'cancelled']
  });
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'meeting',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    description: '',
    priority: 'medium',
    attendees: []
  });

  useEffect(() => {
    const initialEvents = getInitialEvents();
    setEvents(initialEvents);
  }, []);

  // Takvim günlerini oluştur
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];

    // Önceki ayın günleri
    for (let i = startingDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        events: []
      });
    }

    // Bu ayın günleri
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDay = new Date(year, month, day);
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.toDateString() === currentDay.toDateString() &&
               selectedFilters.types.includes(event.type) &&
               selectedFilters.priorities.includes(event.priority) &&
               selectedFilters.statuses.includes(event.status);
      });

      days.push({
        date: currentDay,
        isCurrentMonth: true,
        events: dayEvents
      });
    }

    // Sonraki ayın günleri (42 gün için)
    const totalDays = days.length;
    for (let day = 1; totalDays + day - 1 < 42; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        events: []
      });
    }

    return days;
  };

  // Takvim navigasyonu
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Event işlemleri
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setEventDialogOpen(true);
  };

  const handleNewEvent = () => {
    setNewEventDialogOpen(true);
  };

  const saveNewEvent = () => {
    const eventId = `event_${Date.now()}`;
    const eventToAdd = {
      ...newEvent,
      id: eventId,
      status: 'scheduled',
      createdBy: 'current-user',
      attendees: newEvent.attendees.split(',').map(email => email.trim()).filter(email => email)
    };

    setEvents([...events, eventToAdd]);
    setNewEventDialogOpen(false);
    setNewEvent({
      title: '',
      type: 'meeting',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      location: '',
      description: '',
      priority: 'medium',
      attendees: []
    });
  };

  const deleteEvent = (eventId) => {
    setEvents(events.filter(event => event.id !== eventId));
    setEventDialogOpen(false);
  };

  // Günleri render et
  const renderCalendarDay = (dayInfo) => {
    const isToday = dayInfo.date.toDateString() === new Date().toDateString();
    const hasEvents = dayInfo.events.length > 0;

    return (
      <Paper
        key={dayInfo.date.toISOString()}
        sx={{
          minHeight: 120,
          p: 1,
          cursor: 'pointer',
          border: '1px solid',
          borderColor: dayInfo.isCurrentMonth ? 'rgba(28, 97, 171, 0.1)' : 'rgba(0, 0, 0, 0.05)',
          backgroundColor: isToday
            ? 'rgba(28, 97, 171, 0.1)'
            : dayInfo.isCurrentMonth
              ? 'white'
              : 'rgba(0, 0, 0, 0.02)',
          '&:hover': {
            backgroundColor: 'rgba(28, 97, 171, 0.05)',
            transform: 'scale(1.02)'
          },
          transition: 'all 0.2s ease'
        }}
        onClick={() => {
          setNewEvent({
            ...newEvent,
            date: dayInfo.date.toISOString().split('T')[0]
          });
          setNewEventDialogOpen(true);
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: isToday ? 'bold' : dayInfo.isCurrentMonth ? 'normal' : 300,
              color: isToday
                ? '#1c61ab'
                : dayInfo.isCurrentMonth
                  ? 'text.primary'
                  : 'text.disabled'
            }}
          >
            {dayInfo.date.getDate()}
          </Typography>
          {hasEvents && (
            <Badge badgeContent={dayInfo.events.length} color="primary" max={9}>
              <Box sx={{ width: 8, height: 8 }} />
            </Badge>
          )}
        </Box>

        <Box sx={{ maxHeight: 80, overflowY: 'auto' }}>
          {dayInfo.events.slice(0, 3).map((event, index) => (
            <Chip
              key={event.id}
              label={event.title}
              size="small"
              sx={{
                mb: 0.5,
                mr: 0.5,
                backgroundColor: EVENT_TYPES[event.type]?.color,
                color: 'white',
                fontSize: '10px',
                height: 20,
                maxWidth: '100%',
                '& .MuiChip-label': {
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleEventClick(event);
              }}
            />
          ))}
          {dayInfo.events.length > 3 && (
            <Typography variant="caption" color="text.secondary">
              +{dayInfo.events.length - 3} daha
            </Typography>
          )}
        </Box>
      </Paper>
    );
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        {/* Header */}
        <Card sx={{ mb: 3, borderRadius: '16px', boxShadow: '0 4px 20px rgba(28, 97, 171, 0.1)' }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              {/* Sol taraf - Başlık ve navigasyon */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h4" sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  📅 HR Takvimi
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton onClick={() => navigateMonth(-1)} color="primary">
                    <ChevronLeft />
                  </IconButton>
                  <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center', fontWeight: 600 }}>
                    {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                  </Typography>
                  <IconButton onClick={() => navigateMonth(1)} color="primary">
                    <ChevronRight />
                  </IconButton>
                </Box>
              </Box>

              {/* Sağ taraf - Kontroller */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<Today />}
                  onClick={goToToday}
                  sx={{ borderRadius: '12px' }}
                >
                  Bugün
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  onClick={() => setFilterDialogOpen(true)}
                  sx={{ borderRadius: '12px' }}
                >
                  Filtrele
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<Assessment />}
                  sx={{ borderRadius: '12px' }}
                >
                  Rapor
                </Button>

                <Fab
                  color="primary"
                  size="medium"
                  onClick={handleNewEvent}
                  sx={{
                    background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #155a9c 0%, #7aa63d 100%)',
                    }
                  }}
                >
                  <Add />
                </Fab>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Takvim */}
        <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 20px rgba(28, 97, 171, 0.1)' }}>
          <CardContent sx={{ p: 0 }}>
            {/* Hafta günleri başlığı */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'rgba(28, 97, 171, 0.05)' }}>
              {weekDays.map((day) => (
                <Typography
                  key={day}
                  variant="subtitle2"
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: '#1c61ab',
                    borderBottom: '1px solid rgba(28, 97, 171, 0.1)'
                  }}
                >
                  {day}
                </Typography>
              ))}
            </Box>

            {/* Takvim günleri */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 }}>
              {days.map((dayInfo) => renderCalendarDay(dayInfo))}
            </Box>
          </CardContent>
        </Card>

        {/* Etkinlik Detay Dialog */}
        <Dialog
          open={eventDialogOpen}
          onClose={() => setEventDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: '16px' }
          }}
        >
          {selectedEvent && (
            <>
              <DialogTitle sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: EVENT_TYPES[selectedEvent.type]?.color,
                color: 'white'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {EVENT_TYPES[selectedEvent.type]?.icon}
                  <Typography variant="h6">{selectedEvent.title}</Typography>
                </Box>
                <Box>
                  <IconButton color="inherit" onClick={() => {}}>
                    <Edit />
                  </IconButton>
                  <IconButton color="inherit" onClick={() => deleteEvent(selectedEvent.id)}>
                    <Delete />
                  </IconButton>
                </Box>
              </DialogTitle>
              <DialogContent sx={{ mt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">📅 Tarih</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {new Date(selectedEvent.date).toLocaleDateString('tr-TR')}
                    </Typography>

                    <Typography variant="subtitle2" color="text.secondary">⏰ Saat</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedEvent.startTime} - {selectedEvent.endTime}
                    </Typography>

                    <Typography variant="subtitle2" color="text.secondary">📍 Konum</Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {selectedEvent.location || 'Belirtilmemiş'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">⚡ Öncelik</Typography>
                    <Chip
                      label={selectedEvent.priority === 'high' ? 'Yüksek' : selectedEvent.priority === 'medium' ? 'Orta' : 'Düşük'}
                      color={selectedEvent.priority === 'high' ? 'error' : selectedEvent.priority === 'medium' ? 'warning' : 'success'}
                      size="small"
                      sx={{ mb: 2 }}
                    />

                    <Typography variant="subtitle2" color="text.secondary">📊 Durum</Typography>
                    <Chip
                      label={selectedEvent.status === 'confirmed' ? 'Onaylandı' : selectedEvent.status === 'cancelled' ? 'İptal' : 'Planlandı'}
                      color={selectedEvent.status === 'confirmed' ? 'success' : selectedEvent.status === 'cancelled' ? 'error' : 'default'}
                      size="small"
                      sx={{ mb: 2 }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">👥 Katılımcılar</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {selectedEvent.attendees?.map((attendee, index) => (
                        <Chip key={index} label={attendee} size="small" />
                      ))}
                    </Box>

                    <Typography variant="subtitle2" color="text.secondary">📝 Açıklama</Typography>
                    <Typography variant="body2">
                      {selectedEvent.description || 'Açıklama bulunmuyor.'}
                    </Typography>
                  </Grid>
                </Grid>
              </DialogContent>
            </>
          )}
        </Dialog>

        {/* Yeni Etkinlik Dialog */}
        <Dialog
          open={newEventDialogOpen}
          onClose={() => setNewEventDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { borderRadius: '16px' }
          }}
        >
          <DialogTitle sx={{
            background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
            color: 'white'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Add />
              <Typography variant="h6">Yeni Etkinlik Oluştur</Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Etkinlik Başlığı"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  sx={{ mb: 2 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Etkinlik Türü</InputLabel>
                  <Select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
                  >
                    {Object.entries(EVENT_TYPES).map(([key, type]) => (
                      <MenuItem key={key} value={key}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {type.icon}
                          {type.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Öncelik</InputLabel>
                  <Select
                    value={newEvent.priority}
                    onChange={(e) => setNewEvent({...newEvent, priority: e.target.value})}
                  >
                    <MenuItem value="low">Düşük</MenuItem>
                    <MenuItem value="medium">Orta</MenuItem>
                    <MenuItem value="high">Yüksek</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Tarih"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="time"
                  label="Başlangıç Saati"
                  value={newEvent.startTime}
                  onChange={(e) => setNewEvent({...newEvent, startTime: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="time"
                  label="Bitiş Saati"
                  value={newEvent.endTime}
                  onChange={(e) => setNewEvent({...newEvent, endTime: e.target.value})}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Konum"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  placeholder="Toplantı salonu, online link vb."
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Katılımcılar (Email adresleri, virgülle ayırın)"
                  value={newEvent.attendees}
                  onChange={(e) => setNewEvent({...newEvent, attendees: e.target.value})}
                  placeholder="john@optima.com, jane@optima.com"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Açıklama"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  placeholder="Etkinlik hakkında detaylar..."
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setNewEventDialogOpen(false)}>
              İptal
            </Button>
            <Button
              variant="contained"
              onClick={saveNewEvent}
              disabled={!newEvent.title}
              sx={{
                background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #155a9c 0%, #7aa63d 100%)',
                }
              }}
            >
              Oluştur
            </Button>
          </DialogActions>
        </Dialog>

        {/* Filtre Dialog */}
        <Dialog
          open={filterDialogOpen}
          onClose={() => setFilterDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: { borderRadius: '16px' }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FilterList />
              <Typography variant="h6">Takvim Filtreleri</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>Etkinlik Türleri</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {Object.entries(EVENT_TYPES).map(([key, type]) => (
                <Chip
                  key={key}
                  label={type.label}
                  icon={type.icon}
                  color={selectedFilters.types.includes(key) ? 'primary' : 'default'}
                  onClick={() => {
                    const newTypes = selectedFilters.types.includes(key)
                      ? selectedFilters.types.filter(t => t !== key)
                      : [...selectedFilters.types, key];
                    setSelectedFilters({...selectedFilters, types: newTypes});
                  }}
                  sx={{
                    backgroundColor: selectedFilters.types.includes(key) ? type.color : undefined,
                    color: selectedFilters.types.includes(key) ? 'white' : undefined
                  }}
                />
              ))}
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>Öncelik Seviyeleri</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              {[
                { key: 'high', label: 'Yüksek', color: 'error' },
                { key: 'medium', label: 'Orta', color: 'warning' },
                { key: 'low', label: 'Düşük', color: 'success' }
              ].map((priority) => (
                <Chip
                  key={priority.key}
                  label={priority.label}
                  color={selectedFilters.priorities.includes(priority.key) ? priority.color : 'default'}
                  onClick={() => {
                    const newPriorities = selectedFilters.priorities.includes(priority.key)
                      ? selectedFilters.priorities.filter(p => p !== priority.key)
                      : [...selectedFilters.priorities, priority.key];
                    setSelectedFilters({...selectedFilters, priorities: newPriorities});
                  }}
                />
              ))}
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 1 }}>Etkinlik Durumu</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[
                { key: 'scheduled', label: 'Planlandı', color: 'default' },
                { key: 'confirmed', label: 'Onaylandı', color: 'success' },
                { key: 'cancelled', label: 'İptal', color: 'error' }
              ].map((status) => (
                <Chip
                  key={status.key}
                  label={status.label}
                  color={selectedFilters.statuses.includes(status.key) ? status.color : 'default'}
                  onClick={() => {
                    const newStatuses = selectedFilters.statuses.includes(status.key)
                      ? selectedFilters.statuses.filter(s => s !== status.key)
                      : [...selectedFilters.statuses, status.key];
                    setSelectedFilters({...selectedFilters, statuses: newStatuses});
                  }}
                />
              ))}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setFilterDialogOpen(false)}>
              Kapat
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
  );
}

export default CalendarPage;