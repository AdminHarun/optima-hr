// src/pages/admin/CallsPage.js
import React, { useState } from 'react';
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
  Tooltip
} from '@mui/material';
import {
  VideoCall as VideoCallIcon,
  Call as CallIcon,
  CallEnd as CallEndIcon,
  Search as SearchIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  ScreenShare as ScreenShareIcon,
  Chat as ChatIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PhoneMissed as PhoneMissedIcon,
  PhoneInTalk as PhoneInTalkIcon,
  AddIcCall as AddIcCallIcon
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

  // Mock data - Görüntülü görüşme için adaylar
  const candidates = [
    {
      id: 1,
      name: 'Ahmet Yılmaz',
      position: 'X Operatör',
      email: 'ahmet@example.com',
      phone: '0532 123 45 67',
      avatar: null,
      applicationDate: '2024-01-15',
      status: 'scheduled',
      scheduledTime: '2024-01-20 14:00',
      available: true
    },
    {
      id: 2,
      name: 'Ayşe Demir',
      position: 'Chat Operatörü',
      email: 'ayse@example.com',
      phone: '0533 234 56 78',
      avatar: null,
      applicationDate: '2024-01-14',
      status: 'waiting',
      available: false
    },
    {
      id: 3,
      name: 'Mehmet Kaya',
      position: 'Senior Operatör',
      email: 'mehmet@example.com',
      phone: '0534 345 67 89',
      avatar: null,
      applicationDate: '2024-01-13',
      status: 'completed',
      completedTime: '2024-01-18 15:30',
      available: false
    }
  ];

  // Geçmiş aramalar
  const callHistory = [
    {
      id: 1,
      candidate: 'Mehmet Kaya',
      type: 'video',
      date: '2024-01-18',
      time: '15:30',
      duration: '25 dk',
      status: 'completed',
      notes: 'Başarılı görüşme, olumlu'
    },
    {
      id: 2,
      candidate: 'Ali Veli',
      type: 'audio',
      date: '2024-01-17',
      time: '10:00',
      duration: '15 dk',
      status: 'missed',
      notes: 'Aday katılmadı'
    },
    {
      id: 3,
      candidate: 'Zeynep Ak',
      type: 'video',
      date: '2024-01-16',
      time: '16:45',
      duration: '30 dk',
      status: 'completed',
      notes: 'Teknik yetkinlikler iyi'
    }
  ];

  // Planlanmış görüşmeler
  const scheduledCalls = candidates.filter(c => c.status === 'scheduled');

  const handleCall = (candidate, type = 'video') => {
    // Görüntülü/sesli arama başlatma
    console.log(`${type} araması başlatılıyor:`, candidate);
    alert(`${candidate.name} ile ${type === 'video' ? 'görüntülü' : 'sesli'} görüşme başlatılıyor...`);
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      scheduled: { label: 'Planlandı', color: 'primary', icon: <ScheduleIcon /> },
      waiting: { label: 'Bekliyor', color: 'warning', icon: <PersonIcon /> },
      completed: { label: 'Tamamlandı', color: 'success', icon: <CheckCircleIcon /> },
      missed: { label: 'Cevapsız', color: 'error', icon: <PhoneMissedIcon /> },
      inCall: { label: 'Görüşmede', color: 'success', icon: <PhoneInTalkIcon /> }
    };

    const config = statusConfig[status] || statusConfig.waiting;
    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        icon={config.icon}
      />
    );
  };

  const filteredCandidates = candidates.filter(candidate =>
    candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{
          background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold',
          mb: 1
        }}>
          Görüşme Merkezi
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Adaylarla görüntülü ve sesli görüşmeler yapın
        </Typography>
      </Box>

      {/* İstatistik Kartları */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #1c61ab, #155090)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {scheduledCalls.length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Planlı Görüşme
                  </Typography>
                </Box>
                <ScheduleIcon sx={{ fontSize: 40, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #8bb94a, #7aa042)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {callHistory.filter(c => c.status === 'completed').length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Tamamlanan
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 40, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #ff9800, #f57c00)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {candidates.filter(c => c.available).length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Çevrimiçi Aday
                  </Typography>
                </Box>
                <PersonIcon sx={{ fontSize: 40, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #e91e63, #c2185b)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {callHistory.filter(c => c.status === 'missed').length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Cevapsız
                  </Typography>
                </Box>
                <PhoneMissedIcon sx={{ fontSize: 40, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Ana İçerik */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 2,
            '& .MuiTab-root': {
              fontWeight: 600
            }
          }}
        >
          <Tab label="Adaylar" icon={<PersonIcon />} iconPosition="start" />
          <Tab label="Planlı Görüşmeler" icon={<ScheduleIcon />} iconPosition="start" />
          <Tab label="Arama Geçmişi" icon={<CallIcon />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Arama Kutusu */}
          <TextField
            fullWidth
            placeholder="Aday ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              sx: { borderRadius: 2 }
            }}
          />

          {/* Adaylar Sekmesi */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              {filteredCandidates.map((candidate) => (
                <Grid item xs={12} md={6} lg={4} key={candidate.id}>
                  <Card sx={{ 
                    borderRadius: 2,
                    '&:hover': {
                      boxShadow: '0 8px 32px rgba(28, 97, 171, 0.15)',
                      transform: 'translateY(-2px)',
                      transition: 'all 0.3s ease'
                    }
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={
                            candidate.available ? 
                            <Box sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: '50%', 
                              bgcolor: '#4caf50',
                              border: '2px solid white'
                            }} /> : null
                          }
                        >
                          <Avatar sx={{ 
                            width: 56, 
                            height: 56,
                            background: 'linear-gradient(135deg, #1c61ab, #8bb94a)'
                          }}>
                            {candidate.name.split(' ').map(n => n[0]).join('')}
                          </Avatar>
                        </Badge>
                        
                        <Box sx={{ ml: 2, flex: 1 }}>
                          <Typography variant="h6" fontWeight="bold">
                            {candidate.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {candidate.position}
                          </Typography>
                        </Box>
                        
                        {getStatusChip(candidate.status)}
                      </Box>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          📧 {candidate.email}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          📱 {candidate.phone}
                        </Typography>
                        {candidate.scheduledTime && (
                          <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                            ⏰ {new Date(candidate.scheduledTime).toLocaleString('tr-TR')}
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          startIcon={<VideocamIcon />}
                          onClick={() => handleCall(candidate, 'video')}
                          disabled={!candidate.available}
                          fullWidth
                          sx={{
                            background: candidate.available ? 
                              'linear-gradient(135deg, #1c61ab, #8bb94a)' : '#ccc',
                            '&:hover': {
                              background: candidate.available ?
                                'linear-gradient(135deg, #155090, #7aa042)' : '#ccc'
                            }
                          }}
                        >
                          Görüntülü Ara
                        </Button>
                        
                        <Tooltip title="Sesli Ara">
                          <IconButton
                            onClick={() => handleCall(candidate, 'audio')}
                            disabled={!candidate.available}
                            sx={{ 
                              border: '1px solid',
                              borderColor: candidate.available ? '#1c61ab' : '#ccc',
                              color: candidate.available ? '#1c61ab' : '#ccc'
                            }}
                          >
                            <CallIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Planlı Görüşmeler Sekmesi */}
          <TabPanel value={tabValue} index={1}>
            {scheduledCalls.length > 0 ? (
              <List>
                {scheduledCalls.map((call) => (
                  <ListItem
                    key={call.id}
                    sx={{
                      mb: 2,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ 
                        background: 'linear-gradient(135deg, #1c61ab, #8bb94a)'
                      }}>
                        {call.name.split(' ').map(n => n[0]).join('')}
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={call.name}
                      secondary={
                        <>
                          <Typography variant="body2">
                            {call.position} • {call.phone}
                          </Typography>
                          <Typography variant="body2" color="primary" fontWeight="bold">
                            ⏰ {new Date(call.scheduledTime).toLocaleString('tr-TR')}
                          </Typography>
                        </>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Button
                        variant="contained"
                        startIcon={<VideoCallIcon />}
                        onClick={() => handleCall(call)}
                        sx={{
                          background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #155090, #7aa042)'
                          }
                        }}
                      >
                        Görüşmeyi Başlat
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info">
                Planlanmış görüşme bulunmuyor
              </Alert>
            )}
          </TabPanel>

          {/* Arama Geçmişi Sekmesi */}
          <TabPanel value={tabValue} index={2}>
            <List>
              {callHistory.map((call) => (
                <ListItem
                  key={call.id}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ 
                      bgcolor: call.status === 'completed' ? '#4caf50' : '#f44336'
                    }}>
                      {call.type === 'video' ? <VideocamIcon /> : <CallIcon />}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={call.candidate}
                    secondary={
                      <>
                        <Typography variant="body2">
                          {call.date} • {call.time} • {call.duration}
                        </Typography>
                        {call.notes && (
                          <Typography variant="body2" color="text.secondary">
                            📝 {call.notes}
                          </Typography>
                        )}
                      </>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    {getStatusChip(call.status)}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </TabPanel>
        </Box>
      </Paper>

      {/* Gelecekte eklenecek özellikler için not */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2" fontWeight="bold">
          🚀 Yakında eklenecek özellikler:
        </Typography>
        <Typography variant="body2">
          • WebRTC ile gerçek zamanlı görüntülü görüşme<br />
          • Ekran paylaşımı ve beyaz tahta<br />
          • Görüşme kayıt ve tekrar izleme<br />
          • Çoklu katılımcı desteği<br />
          • Görüşme notları ve değerlendirme formları
        </Typography>
      </Alert>
    </Container>
  );
}

export default CallsPage;
