// src/pages/admin/CallsPageNew.js - Chat Integrated Calls Page
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
  Badge,
  Divider,
  Alert
} from '@mui/material';
import {
  VideoCall as VideoCallIcon,
  Call as CallIcon,
  Search as SearchIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  PhoneMissed as PhoneMissedIcon,
  Chat as ChatIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { ChatContainer } from '../../components/chat';

function CallsPageNew() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showChat, setShowChat] = useState(false);

  // Mock data - Candidates
  const candidates = [
    {
      id: 1,
      applicantId: '123',
      name: 'Ahmet Yılmaz',
      position: 'X Operatör',
      email: 'ahmet@example.com',
      phone: '0532 123 45 67',
      avatar: null,
      applicationDate: '2024-01-15',
      status: 'scheduled',
      scheduledTime: '2024-01-20 14:00',
      available: true,
      unreadMessages: 3
    },
    {
      id: 2,
      applicantId: '124',
      name: 'Ayşe Demir',
      position: 'Chat Operatörü',
      email: 'ayse@example.com',
      phone: '0533 234 56 78',
      avatar: null,
      applicationDate: '2024-01-14',
      status: 'waiting',
      available: true,
      unreadMessages: 0
    },
    {
      id: 3,
      applicantId: '125',
      name: 'Mehmet Kaya',
      position: 'Senior Operatör',
      email: 'mehmet@example.com',
      phone: '0534 345 67 89',
      avatar: null,
      applicationDate: '2024-01-13',
      status: 'completed',
      completedTime: '2024-01-18 15:30',
      available: false,
      unreadMessages: 1
    },
    {
      id: 4,
      applicantId: '126',
      name: 'Fatma Şahin',
      position: 'Chat Operatörü',
      email: 'fatma@example.com',
      phone: '0535 456 78 90',
      avatar: null,
      applicationDate: '2024-01-12',
      status: 'waiting',
      available: true,
      unreadMessages: 5
    }
  ];

  const getStatusChip = (status) => {
    const statusConfig = {
      scheduled: { label: 'Planlandı', color: 'primary', icon: <ScheduleIcon /> },
      waiting: { label: 'Bekliyor', color: 'warning', icon: <PersonIcon /> },
      completed: { label: 'Tamamlandı', color: 'success', icon: <CheckCircleIcon /> },
      missed: { label: 'Cevapsız', color: 'error', icon: <PhoneMissedIcon /> }
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

  const handleOpenChat = (candidate) => {
    setSelectedCandidate(candidate);
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
    setSelectedCandidate(null);
  };

  const handleVideoCall = (candidate) => {
    alert(`${candidate.name} ile görüntülü görüşme başlatılacak...`);
    // Video call integration will be here
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
          Görüşme & Chat Merkezi
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Adaylarla görüntülü görüşme yapın ve mesajlaşın
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
                    {candidates.filter(c => c.status === 'scheduled').length}
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
            background: 'linear-gradient(135deg, #ff9800, #f57c00)',
            color: 'white'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {candidates.reduce((sum, c) => sum + c.unreadMessages, 0)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Okunmamış Mesaj
                  </Typography>
                </Box>
                <ChatIcon sx={{ fontSize: 40, opacity: 0.5 }} />
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
                    {candidates.length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Toplam Aday
                  </Typography>
                </Box>
                <PersonIcon sx={{ fontSize: 40, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content - Split Screen */}
      <Grid container spacing={3}>
        {/* Left Side - Candidate List */}
        <Grid item xs={12} md={showChat ? 4 : 12}>
          <Paper sx={{ borderRadius: 3, height: showChat ? 'calc(100vh - 450px)' : 'auto', overflow: 'hidden' }}>
            <Box sx={{
              p: 2,
              background: 'linear-gradient(90deg, #1c61ab 0%, #8bb94a 100%)',
              color: 'white'
            }}>
              <Typography variant="h6" fontWeight="bold">
                Adaylar
              </Typography>
            </Box>

            {/* Search */}
            <Box sx={{ p: 2 }}>
              <TextField
                fullWidth
                placeholder="Aday ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 2 }
                }}
              />
            </Box>

            {/* Candidate List */}
            <Box sx={{ overflowY: 'auto', maxHeight: showChat ? 'calc(100vh - 600px)' : '500px' }}>
              <List sx={{ p: 0 }}>
                {filteredCandidates.map((candidate) => (
                  <React.Fragment key={candidate.id}>
                    <ListItem
                      button
                      selected={selectedCandidate?.id === candidate.id}
                      onClick={() => handleOpenChat(candidate)}
                      sx={{
                        py: 2,
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(28, 97, 171, 0.08)',
                          borderLeft: '4px solid #1c61ab'
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(28, 97, 171, 0.04)'
                        }
                      }}
                    >
                      <ListItemAvatar>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          variant="dot"
                          sx={{
                            '& .MuiBadge-badge': {
                              backgroundColor: candidate.available ? '#8bb94a' : '#bdbdbd',
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              border: '2px solid white'
                            }
                          }}
                        >
                          <Avatar sx={{
                            width: 48,
                            height: 48,
                            background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                            fontWeight: 700
                          }}>
                            {candidate.name.split(' ').map(n => n[0]).join('')}
                          </Avatar>
                        </Badge>
                      </ListItemAvatar>

                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {candidate.name}
                            </Typography>
                            {candidate.unreadMessages > 0 && (
                              <Chip
                                label={candidate.unreadMessages}
                                size="small"
                                sx={{
                                  height: 20,
                                  minWidth: 20,
                                  fontSize: '0.7rem',
                                  fontWeight: 'bold',
                                  background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                                  color: 'white'
                                }}
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box component="span" sx={{ display: 'block' }}>
                            <Typography variant="caption" color="text.secondary" component="span">
                              {candidate.position}
                            </Typography>
                            <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                              {getStatusChip(candidate.status)}
                            </Box>
                          </Box>
                        }
                        secondaryTypographyProps={{ component: 'div' }}
                      />
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </Box>
          </Paper>
        </Grid>

        {/* Right Side - Chat */}
        {showChat && selectedCandidate && (
          <Grid item xs={12} md={8}>
            <Paper sx={{
              borderRadius: 3,
              height: 'calc(100vh - 450px)',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* Close Button */}
              <IconButton
                onClick={handleCloseChat}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: 8,
                  zIndex: 1000,
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 1)'
                  }
                }}
              >
                <CloseIcon />
              </IconButton>

              {/* Chat Container */}
              <ChatContainer
                roomId={`applicant_${selectedCandidate.applicantId}`}
                roomName={`Chat with ${selectedCandidate.name}`}
                participantId={selectedCandidate.applicantId}
                participantName={selectedCandidate.name}
                participantAvatar={selectedCandidate.avatar}
                currentUserId="admin_1"
                currentUserType="admin"
                onVideoCall={() => handleVideoCall(selectedCandidate)}
              />
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Help Message */}
      {!showChat && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2" fontWeight="bold">
            💬 Nasıl kullanılır?
          </Typography>
          <Typography variant="body2">
            Sol taraftaki aday listesinden bir adaya tıklayarak mesajlaşmaya başlayabilirsiniz.
            Video call butonuyla görüntülü görüşme başlatabilirsiniz.
          </Typography>
        </Alert>
      )}
    </Container>
  );
}

export default CallsPageNew;
