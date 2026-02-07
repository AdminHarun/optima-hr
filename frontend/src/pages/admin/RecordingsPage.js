import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  Search,
  PlayArrow,
  Download,
  Delete,
  Videocam,
  Storage,
  CalendarToday,
  Person,
  Close
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';

function RecordingsPage() {
  const [recordings, setRecordings] = useState([]);
  const [filteredRecordings, setFilteredRecordings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Video player dialog
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [playerOpen, setPlayerOpen] = useState(false);

  // Fetch recordings on mount
  useEffect(() => {
    fetchRecordings();
    fetchStats();
  }, []);

  // Filter recordings based on search
  useEffect(() => {
    if (searchTerm) {
      const filtered = recordings.filter(rec =>
        rec.participant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.initiator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.recording_file_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRecordings(filtered);
    } else {
      setFilteredRecordings(recordings);
    }
  }, [searchTerm, recordings]);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/recordings`);
      setRecordings(response.data.recordings || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching recordings:', err);
      setError('Kayıtlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/recordings/stats`);
      setStats(response.data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handlePlay = (recording) => {
    setSelectedRecording(recording);
    setPlayerOpen(true);
  };

  const handleDownload = async (recording) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/recordings/download/${recording.recording_file_name}`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', recording.recording_file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading recording:', err);
      setError('Kayıt indirilemedi');
    }
  };

  const handleDelete = async (recording) => {
    if (!window.confirm(`"${recording.recording_file_name}" kaydını silmek istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/recordings/${recording.recording_file_name}`);
      fetchRecordings();
      fetchStats();
    } catch (err) {
      console.error('Error deleting recording:', err);
      setError('Kayıt silinemedi');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    const mb = (bytes / (1024 * 1024)).toFixed(2);
    return `${mb} MB`;
  };

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
          📹 Görüşme Kayıtları Arşivi
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tüm görüntülü görüşme kayıtlarınız burada arşivlenir
        </Typography>
      </Box>

      {/* Statistics Cards */}
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
                    {recordings.length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Toplam Kayıt
                  </Typography>
                </Box>
                <Videocam sx={{ fontSize: 40, opacity: 0.5 }} />
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
                    {stats?.totalSizeMB || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    MB Depolama
                  </Typography>
                </Box>
                <Storage sx={{ fontSize: 40, opacity: 0.5 }} />
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
                    {recordings.filter(r => {
                      const today = new Date();
                      const recDate = new Date(r.started_at);
                      return recDate.toDateString() === today.toDateString();
                    }).length}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Bugünkü Kayıtlar
                  </Typography>
                </Box>
                <CalendarToday sx={{ fontSize: 40, opacity: 0.5 }} />
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
                    {new Set(recordings.map(r => r.participant_name)).size}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Farklı Aday
                  </Typography>
                </Box>
                <Person sx={{ fontSize: 40, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search & Actions */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Aday adı, dosya adı ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 }
              }}
            />
          </Grid>
          <Grid item xs={12} md={6} sx={{ textAlign: 'right' }}>
            <Button
              variant="outlined"
              startIcon={<CalendarToday />}
              sx={{ mr: 1 }}
            >
              Tarih Filtrele
            </Button>
            <Button
              variant="contained"
              onClick={fetchRecordings}
              sx={{
                background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #155090, #7aa042)'
                }
              }}
            >
              Yenile
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Recordings Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'rgba(28, 97, 171, 0.05)' }}>
              <TableCell><strong>Tarih & Saat</strong></TableCell>
              <TableCell><strong>Aday</strong></TableCell>
              <TableCell><strong>Başlatan</strong></TableCell>
              <TableCell><strong>Süre</strong></TableCell>
              <TableCell><strong>Boyut</strong></TableCell>
              <TableCell><strong>Dosya Adı</strong></TableCell>
              <TableCell align="center"><strong>İşlemler</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    Yükleniyor...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredRecordings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz kayıt bulunmuyor'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredRecordings.map((recording) => (
                <TableRow key={recording.id} hover>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(recording.started_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight={600}>
                        {recording.participant_name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {recording.initiator_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={formatDuration(recording.duration_seconds)}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatFileSize(recording.recording_file_size)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                      {recording.recording_file_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handlePlay(recording)}
                      title="Oynat"
                    >
                      <PlayArrow />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => handleDownload(recording)}
                      title="İndir"
                    >
                      <Download />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(recording)}
                      title="Sil"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Video Player Dialog */}
      <Dialog
        open={playerOpen}
        onClose={() => setPlayerOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(90deg, #1c61ab 0%, #8bb94a 100%)',
          color: 'white'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Videocam />
            <Typography variant="h6">
              {selectedRecording?.participant_name} - Görüşme Kaydı
            </Typography>
          </Box>
          <IconButton
            onClick={() => setPlayerOpen(false)}
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedRecording && (
            <video
              controls
              autoPlay
              style={{
                width: '100%',
                maxHeight: '70vh',
                backgroundColor: '#000'
              }}
              src={`${API_BASE_URL}/api/recordings/stream/${selectedRecording.recording_file_name}`}
            >
              Tarayıcınız video oynatmayı desteklemiyor.
            </video>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            Tarih: {selectedRecording && formatDate(selectedRecording.started_at)}
          </Typography>
          <Button onClick={() => setPlayerOpen(false)}>
            Kapat
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default RecordingsPage;
