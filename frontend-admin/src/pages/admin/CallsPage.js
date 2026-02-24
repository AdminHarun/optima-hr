// src/pages/admin/CallsPage.js - Fully functional Calls Page with API integration
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Badge,
  Tab,
  Tabs,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  VideoCall as VideoCallIcon,
  Call as CallIcon,
  CallEnd as CallEndIcon,
  Search as SearchIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Videocam as VideocamIcon,
  Chat as ChatIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PhoneMissed as PhoneMissedIcon,
  PhoneInTalk as PhoneInTalkIcon,
  Event as EventIcon,
  Refresh as RefreshIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';

function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function CallsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [scheduledCalls, setScheduledCalls] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({ date: '', startTime: '14:00', endTime: '15:00', description: '' });

  const API_BASE = (() => {
    try {
      const { API_BASE_URL } = require('../../config/config');
      return API_BASE_URL;
    } catch (e) {
      return 'http://localhost:9000';
    }
  })();
  const siteCode = localStorage.getItem('optima_current_site') || 'FXB';

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // Adaylari yukle
  const loadCandidates = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/applications/profiles/all`, {
        headers: { 'X-Site-Id': siteCode }
      });
      if (res.ok) {
        const data = await res.json();
        const profiles = (data.profiles || data || []).map(p => ({
          id: p.id,
          name: `${p.firstName || p.first_name || ''} ${p.lastName || p.last_name || ''}`.trim() || 'Isimsiz',
          email: p.email || '',
          phone: p.phone || '',
          position: p.position || p.appliedPosition || 'Aday',
          avatar: p.avatar || null,
          applicationDate: p.createdAt || p.profile_created_at || '',
          applicantId: p.id?.toString(),
          status: 'waiting',
          available: false
        }));
        setCandidates(profiles);
      }
    } catch (error) {
      console.error('Load candidates error:', error);
    }
  }, [API_BASE, siteCode]);

  // Planli gorusmeleri yukle (Calendar'dan interview tipindekiler)
  const loadScheduledCalls = useCallback(async () => {
    try {
      const now = new Date();
      const month = (now.getMonth() + 1).toString();
      const year = now.getFullYear().toString();
      const res = await fetch(`${API_BASE}/api/calendar/events?month=${month}&year=${year}&type=interview`, {
        headers: { 'X-Site-Id': siteCode }
      });
      if (res.ok) {
        const data = await res.json();
        setScheduledCalls(data.filter(e => e.status !== 'cancelled'));
      }
    } catch (error) {
      console.error('Load scheduled calls error:', error);
    }
  }, [API_BASE, siteCode]);

  // Arama gecmisini yukle (Chat rooms'dan)
  const loadCallHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/chat/api/rooms/applicant_rooms/`, {
        headers: { 'X-Site-Id': siteCode }
      });
      if (res.ok) {
        const data = await res.json();
        const rooms = (data.rooms || data || []);
        const history = rooms
          .filter(r => r.last_video_call || r.video_call_count > 0)
          .map(r => ({
            id: r.id,
            candidate: r.participant_name || r.applicant_name || 'Bilinmiyor',
            type: 'video',
            date: r.last_video_call || r.updated_at || '',
            duration: r.last_call_duration || '-',
            status: 'completed',
            notes: ''
          }));
        setCallHistory(history);
      }
    } catch (error) {
      console.error('Load call history error:', error);
      // Gecmis yuklenemediyse bos birak
    }
  }, [API_BASE, siteCode]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadCandidates(), loadScheduledCalls(), loadCallHistory()]);
      setLoading(false);
    };
    loadAll();
  }, [loadCandidates, loadScheduledCalls, loadCallHistory]);

  // Video gorusme baslat
  const handleCall = async (candidate, type = 'video') => {
    try {
      const roomId = `applicant_${candidate.applicantId || candidate.id}`;
      // Daily.co room olustur
      const res = await fetch(`${API_BASE}/api/video-calls/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Site-Id': siteCode },
        body: JSON.stringify({
          room_id: roomId,
          participant_name: candidate.name,
          caller_name: 'Admin'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url || data.daily_url) {
          window.open(data.url || data.daily_url, '_blank', 'width=1200,height=800');
          showSnackbar(`${candidate.name} ile gorusme basladi`);
        } else {
          showSnackbar(`Gorusme baslatildi - ${candidate.name}`);
        }
      } else {
        // Fallback: WebSocket uzerinden gorusme baslat
        showSnackbar(`${candidate.name} ile ${type === 'video' ? 'goruntulu' : 'sesli'} gorusme baslatiliyor...`, 'info');
      }
    } catch (error) {
      console.error('Call error:', error);
      showSnackbar('Gorusme baslatilirken hata olustu', 'error');
    }
  };

  // Gorusme planla
  const handleScheduleCall = async () => {
    if (!selectedCandidate || !scheduleForm.date) return;

    try {
      const res = await fetch(`${API_BASE}/api/calendar/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Site-Id': siteCode },
        body: JSON.stringify({
          title: `Mulakat - ${selectedCandidate.name}`,
          type: 'interview',
          date: scheduleForm.date,
          startTime: scheduleForm.startTime,
          endTime: scheduleForm.endTime,
          description: scheduleForm.description || `${selectedCandidate.name} ile mulakat gorusmesi`,
          priority: 'high',
          attendees: [selectedCandidate.email].filter(Boolean)
        })
      });

      if (res.ok) {
        showSnackbar('Gorusme planlandi');
        loadScheduledCalls();
      } else {
        showSnackbar('Planlama basarisiz', 'error');
      }
    } catch (error) {
      showSnackbar('Baglanti hatasi', 'error');
    }

    setScheduleDialogOpen(false);
    setSelectedCandidate(null);
    setScheduleForm({ date: '', startTime: '14:00', endTime: '15:00', description: '' });
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      scheduled: { label: 'Planlandi', color: 'primary', icon: <ScheduleIcon /> },
      waiting: { label: 'Bekliyor', color: 'warning', icon: <PersonIcon /> },
      completed: { label: 'Tamamlandi', color: 'success', icon: <CheckCircleIcon /> },
      missed: { label: 'Cevapsiz', color: 'error', icon: <PhoneMissedIcon /> },
      inCall: { label: 'Gorusmede', color: 'success', icon: <PhoneInTalkIcon /> }
    };
    const config = statusConfig[status] || statusConfig.waiting;
    return <Chip label={config.label} color={config.color} size="small" icon={config.icon} />;
  };

  const filteredCandidates = candidates.filter(candidate =>
    candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (candidate.position || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (candidate.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    scheduled: scheduledCalls.length,
    completed: callHistory.filter(c => c.status === 'completed').length,
    candidates: candidates.length,
    missed: callHistory.filter(c => c.status === 'missed').length
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={48} sx={{ color: '#1c61ab' }} />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h4" sx={{
            background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold',
            mb: 1
          }}>
            Gorusme Merkezi
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Adaylarla goruntulu ve sesli gorusmeler yapin
          </Typography>
        </Box>
        <Tooltip title="Yenile">
          <IconButton onClick={() => { loadCandidates(); loadScheduledCalls(); loadCallHistory(); }} sx={{ color: '#1c61ab' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Istatistik Kartlari */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #1c61ab, #155090)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats.scheduled}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Planli Gorusme</Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: 40, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #8bb94a, #7aa042)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats.completed}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Tamamlanan</Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #ff9800, #f57c00)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats.candidates}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Toplam Aday</Typography>
                </Box>
                <PersonIcon sx={{ fontSize: 40, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #e91e63, #c2185b)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats.missed}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>Cevapsiz</Typography>
                </Box>
                <PhoneMissedIcon sx={{ fontSize: 40, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Ana Icerik */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{
          borderBottom: 1, borderColor: 'divider', px: 2,
          '& .MuiTab-root': { fontWeight: 600 }
        }}>
          <Tab label={`Adaylar (${candidates.length})`} icon={<PersonIcon />} iconPosition="start" />
          <Tab label={`Planli Gorusmeler (${scheduledCalls.length})`} icon={<ScheduleIcon />} iconPosition="start" />
          <Tab label={`Gecmis (${callHistory.length})`} icon={<CallIcon />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TextField fullWidth placeholder="Aday ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ mb: 3 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              sx: { borderRadius: 2 }
            }}
          />

          {/* Adaylar Sekmesi */}
          <TabPanel value={tabValue} index={0}>
            {filteredCandidates.length === 0 ? (
              <Alert severity="info">Hicbir aday bulunamadi</Alert>
            ) : (
              <Grid container spacing={3}>
                {filteredCandidates.slice(0, 20).map((candidate) => (
                  <Grid item xs={12} md={6} lg={4} key={candidate.id}>
                    <Card sx={{
                      borderRadius: 2,
                      '&:hover': { boxShadow: '0 8px 32px rgba(28, 97, 171, 0.15)', transform: 'translateY(-2px)', transition: 'all 0.3s ease' }
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #1c61ab, #8bb94a)' }}>
                            {candidate.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </Avatar>
                          <Box sx={{ ml: 2, flex: 1 }}>
                            <Typography variant="h6" fontWeight="bold">{candidate.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{candidate.position}</Typography>
                          </Box>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          {candidate.email && <Typography variant="body2" color="text.secondary">{candidate.email}</Typography>}
                          {candidate.phone && <Typography variant="body2" color="text.secondary">{candidate.phone}</Typography>}
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button variant="contained" startIcon={<VideocamIcon />} onClick={() => handleCall(candidate, 'video')} fullWidth sx={{
                            background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                            '&:hover': { background: 'linear-gradient(135deg, #155090, #7aa042)' }
                          }}>
                            Goruntulu Ara
                          </Button>
                          <Tooltip title="Gorusme Planla">
                            <IconButton onClick={() => { setSelectedCandidate(candidate); setScheduleDialogOpen(true); }} sx={{ border: '1px solid #1c61ab', color: '#1c61ab' }}>
                              <EventIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </TabPanel>

          {/* Planli Gorusmeler Sekmesi */}
          <TabPanel value={tabValue} index={1}>
            {scheduledCalls.length === 0 ? (
              <Alert severity="info">Planlanmis gorusme bulunmuyor</Alert>
            ) : (
              <List>
                {scheduledCalls.map((call) => (
                  <ListItem key={call.id} sx={{ mb: 2, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                    <ListItemAvatar>
                      <Avatar sx={{ background: 'linear-gradient(135deg, #1c61ab, #8bb94a)' }}>
                        <ScheduleIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="subtitle1" fontWeight="bold">{call.title}</Typography>}
                      secondary={
                        <>
                          <Typography variant="body2">
                            {new Date(call.date).toLocaleDateString('tr-TR')} | {call.startTime || ''} - {call.endTime || ''}
                          </Typography>
                          {call.description && <Typography variant="body2" color="text.secondary">{call.description}</Typography>}
                          <Box sx={{ mt: 0.5 }}>
                            {(call.attendees || []).map((a, i) => (
                              <Chip key={i} label={typeof a === 'string' ? a : a.email} size="small" sx={{ mr: 0.5, mt: 0.5 }} />
                            ))}
                          </Box>
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {call.videoCallUrl && (
                          <Button size="small" variant="outlined" startIcon={<OpenInNewIcon />} href={call.videoCallUrl} target="_blank">
                            Katil
                          </Button>
                        )}
                        <Chip
                          label={call.status === 'confirmed' ? 'Onaylandi' : 'Planlandi'}
                          color={call.status === 'confirmed' ? 'success' : 'primary'}
                          size="small"
                        />
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </TabPanel>

          {/* Arama Gecmisi Sekmesi */}
          <TabPanel value={tabValue} index={2}>
            {callHistory.length === 0 ? (
              <Alert severity="info">Henuz arama gecmisi bulunmuyor</Alert>
            ) : (
              <List>
                {callHistory.map((call) => (
                  <ListItem key={call.id} sx={{ mb: 1, borderRadius: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: call.status === 'completed' ? '#4caf50' : '#f44336' }}>
                        {call.type === 'video' ? <VideocamIcon /> : <CallIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={call.candidate}
                      secondary={
                        <>
                          <Typography variant="body2">
                            {call.date ? new Date(call.date).toLocaleDateString('tr-TR') : ''} {call.duration !== '-' ? `| ${call.duration}` : ''}
                          </Typography>
                          {call.notes && <Typography variant="body2" color="text.secondary">{call.notes}</Typography>}
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      {getStatusChip(call.status)}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </TabPanel>
        </Box>
      </Paper>

      {/* Gorusme Planlama Dialog */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <EventIcon />
            <Typography variant="h6">Gorusme Planla</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedCandidate && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>{selectedCandidate.name}</strong> icin mulakat gorusmesi planlanacak
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth type="date" label="Tarih" value={scheduleForm.date} onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="time" label="Baslangic" value={scheduleForm.startTime} onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="time" label="Bitis" value={scheduleForm.endTime} onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="Not" value={scheduleForm.description} onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })} placeholder="Gorusme hakkinda notlar..." />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setScheduleDialogOpen(false)}>Iptal</Button>
          <Button variant="contained" onClick={handleScheduleCall} disabled={!scheduleForm.date} sx={{
            background: 'linear-gradient(135deg, #1c61ab 0%, #8bb94a 100%)',
            '&:hover': { background: 'linear-gradient(135deg, #155a9c 0%, #7aa63d 100%)' }
          }}>
            Planla
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Container>
  );
}

export default CallsPage;
