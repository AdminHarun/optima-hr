// src/pages/Recruitment.js - Basvuru Listesi Sayfasi (Liste Gorunumu)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Avatar,
  InputAdornment,
  Tooltip,
  Paper,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Skeleton
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  CheckCircle as CheckIcon,
  Visibility as ViewIcon,
  Link as LinkIcon,
  Search as SearchIcon,
  Chat as ChatIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Assignment as AssignmentIcon,
  HourglassEmpty as PendingIcon,
  EventAvailable as InterviewIcon,
  ThumbUp as ApprovedIcon,
  ThumbDown as RejectedIcon
} from '@mui/icons-material';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:9000') + '/api';

const getSiteHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Site-Id': localStorage.getItem('optima_current_site') || 'FXB',
});

const STATUS_CONFIG = {
  submitted: { label: 'Gonderildi', color: '#1976d2', bgColor: '#e3f2fd', icon: <AssignmentIcon sx={{ fontSize: 16 }} /> },
  form_completed: { label: 'Tamamlandi', color: '#1976d2', bgColor: '#e3f2fd', icon: <AssignmentIcon sx={{ fontSize: 16 }} /> },
  form_pending: { label: 'Bekliyor', color: '#f57c00', bgColor: '#fff3e0', icon: <PendingIcon sx={{ fontSize: 16 }} /> },
  in_review: { label: 'Inceleniyor', color: '#f57c00', bgColor: '#fff3e0', icon: <PendingIcon sx={{ fontSize: 16 }} /> },
  under_review: { label: 'Inceleniyor', color: '#f57c00', bgColor: '#fff3e0', icon: <PendingIcon sx={{ fontSize: 16 }} /> },
  interview_scheduled: { label: 'Mulakat', color: '#7b1fa2', bgColor: '#f3e5f5', icon: <InterviewIcon sx={{ fontSize: 16 }} /> },
  approved: { label: 'Onaylandi', color: '#2e7d32', bgColor: '#e8f5e9', icon: <ApprovedIcon sx={{ fontSize: 16 }} /> },
  hired: { label: 'Ise Alindi', color: '#2e7d32', bgColor: '#e8f5e9', icon: <CheckIcon sx={{ fontSize: 16 }} /> },
  rejected: { label: 'Reddedildi', color: '#c62828', bgColor: '#ffebee', icon: <RejectedIcon sx={{ fontSize: 16 }} /> }
};

function Recruitment() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [statusDialog, setStatusDialog] = useState({ open: false, app: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, app: null });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/applications`, {
        credentials: 'include',
        headers: getSiteHeaders(),
      });

      if (response.ok) {
        const apiData = await response.json();
        const formattedApps = apiData.map(app => ({
          id: app.id,
          email: app.email || '',
          firstName: app.firstName || app.first_name || '',
          lastName: app.lastName || app.last_name || '',
          phone: app.phone || '',
          status: app.status || 'submitted',
          submittedAt: app.submitted_at || app.submittedAt,
          city: app.city || '',
          educationLevel: app.education_level || app.educationLevel || '',
          hasSectorExperience: app.has_sector_experience || app.hasSectorExperience,
          internetDownload: app.internet_download || app.internetDownload,
          internetUpload: app.internet_upload || app.internetUpload,
          typingSpeed: app.typing_speed || app.typingSpeed,
          profileId: app.applicant_profile_id || app.profileId,
          chatToken: app.chatToken,
          ...app
        }));
        setApplications(formattedApps);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.warn('API baglantisi basarisiz, localStorage kullaniliyor:', error.message);
    }

    // Fallback: localStorage
    const siteCode = localStorage.getItem('optima_current_site') || 'FXB';
    const applicationsData = JSON.parse(localStorage.getItem(`applications_${siteCode}`) || '[]');
    const savedApplications = Array.isArray(applicationsData) ? applicationsData : [applicationsData].filter(Boolean);
    setApplications(savedApplications.map(app => ({
      ...app,
      firstName: app.firstName || '',
      lastName: app.lastName || '',
      status: app.status || 'form_completed'
    })));
    setLoading(false);
  };

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await fetch(`${API_BASE_URL}/applications/${appId}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: getSiteHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (error) {
      console.warn('API status guncelleme basarisiz:', error.message);
    }

    const siteCode = localStorage.getItem('optima_current_site') || 'FXB';
    const savedApplications = JSON.parse(localStorage.getItem(`applications_${siteCode}`) || '[]');
    const updated = savedApplications.map(app =>
      String(app.id) === String(appId) ? { ...app, status: newStatus } : app
    );
    localStorage.setItem(`applications_${siteCode}`, JSON.stringify(updated));

    setApplications(prev => prev.map(app =>
      app.id === appId ? { ...app, status: newStatus } : app
    ));
    setStatusDialog({ open: false, app: null });
    setAnchorEl(null);
  };

  const handleDeleteApplication = async (appId) => {
    try {
      await fetch(`${API_BASE_URL}/applications/${appId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getSiteHeaders(),
      });
    } catch (error) {
      console.warn('API silme basarisiz:', error.message);
    }

    const siteCode = localStorage.getItem('optima_current_site') || 'FXB';
    const savedApplications = JSON.parse(localStorage.getItem(`applications_${siteCode}`) || '[]');
    const updated = savedApplications.filter(app => String(app.id) !== String(appId));
    localStorage.setItem(`applications_${siteCode}`, JSON.stringify(updated));

    setApplications(prev => prev.filter(app => app.id !== appId));
    setDeleteConfirm({ open: false, app: null });
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch =
      (app.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${app.firstName} ${app.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.phone || '').includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.submitted;

  const stats = {
    total: applications.length,
    pending: applications.filter(a => ['form_pending', 'submitted', 'form_completed'].includes(a.status)).length,
    inReview: applications.filter(a => ['in_review', 'under_review', 'interview_scheduled'].includes(a.status)).length,
    approved: applications.filter(a => ['approved', 'hired'].includes(a.status)).length,
    rejected: applications.filter(a => a.status === 'rejected').length
  };

  const paginatedApplications = filteredApplications.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={70} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={50} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2, border: '1px solid rgba(28, 97, 171, 0.1)' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a2e">
              Basvuru Formlari
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {applications.length} basvuru
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadApplications}
              sx={{ borderColor: '#1c61ab', color: '#1c61ab', textTransform: 'none', borderRadius: 2 }}
            >
              Yenile
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<LinkIcon />}
              onClick={() => navigate('/admin/invitations')}
              sx={{
                background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 600
              }}
            >
              Davet Yonetimi
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Stats Row */}
      <Box display="flex" gap={1} mb={2} flexWrap="wrap">
        <Chip
          label={`Toplam: ${stats.total}`}
          onClick={() => setStatusFilter('all')}
          sx={{
            bgcolor: statusFilter === 'all' ? '#1c61ab' : 'rgba(28, 97, 171, 0.1)',
            color: statusFilter === 'all' ? 'white' : '#1c61ab',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        />
        <Chip
          label={`Bekleyen: ${stats.pending}`}
          onClick={() => setStatusFilter('form_completed')}
          sx={{
            bgcolor: statusFilter === 'form_completed' ? '#1976d2' : '#e3f2fd',
            color: statusFilter === 'form_completed' ? 'white' : '#1976d2',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        />
        <Chip
          label={`Incelenen: ${stats.inReview}`}
          onClick={() => setStatusFilter('in_review')}
          sx={{
            bgcolor: statusFilter === 'in_review' ? '#f57c00' : '#fff3e0',
            color: statusFilter === 'in_review' ? 'white' : '#f57c00',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        />
        <Chip
          label={`Onaylanan: ${stats.approved}`}
          onClick={() => setStatusFilter('approved')}
          sx={{
            bgcolor: statusFilter === 'approved' ? '#2e7d32' : '#e8f5e9',
            color: statusFilter === 'approved' ? 'white' : '#2e7d32',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        />
        <Chip
          label={`Reddedilen: ${stats.rejected}`}
          onClick={() => setStatusFilter('rejected')}
          sx={{
            bgcolor: statusFilter === 'rejected' ? '#c62828' : '#ffebee',
            color: statusFilter === 'rejected' ? 'white' : '#c62828',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        />
      </Box>

      {/* Search */}
      <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
        <TextField
          fullWidth
          placeholder="Ad, email veya telefon ile ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#999' }} /></InputAdornment>,
            sx: { borderRadius: 2, bgcolor: '#fafafa' }
          }}
        />
      </Paper>

      {/* Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(28, 97, 171, 0.04)' }}>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Ad Soyad</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Telefon</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Sehir</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Hiz (D/U)</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Klavye</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Tarih</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Durum</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5, width: 100 }} align="center">Islem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedApplications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    <AssignmentIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                    <Typography color="text.secondary">
                      {searchTerm || statusFilter !== 'all' ? 'Sonuc bulunamadi' : 'Henuz basvuru yok'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedApplications.map((app) => {
                  const statusConfig = getStatusConfig(app.status);
                  const fullName = `${app.firstName || ''} ${app.lastName || ''}`.trim() || '-';

                  return (
                    <TableRow
                      key={app.id}
                      hover
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(28, 97, 171, 0.02)' }
                      }}
                      onClick={() => navigate(`/application/${app.id}`)}
                    >
                      <TableCell sx={{ py: 1.2 }}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{
                            width: 28,
                            height: 28,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #1c61ab, #8bb94a)'
                          }}>
                            {fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </Avatar>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 120 }}>
                            {fullName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 150, fontSize: '0.8rem' }}>
                          {app.email || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {app.phone || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {app.city || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {app.internetDownload ? `${app.internetDownload}/${app.internetUpload || '?'}` : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {app.typingSpeed ? `${app.typingSpeed} WPM` : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('tr-TR') : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Chip
                          icon={statusConfig.icon}
                          label={statusConfig.label}
                          size="small"
                          sx={{
                            bgcolor: statusConfig.bgColor,
                            color: statusConfig.color,
                            fontWeight: 600,
                            fontSize: '0.7rem',
                            height: 24,
                            '& .MuiChip-icon': { color: statusConfig.color }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }} align="center" onClick={(e) => e.stopPropagation()}>
                        <Box display="flex" gap={0.5} justifyContent="center">
                          <Tooltip title="Detay">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/application/${app.id}`)}
                              sx={{ color: '#1c61ab' }}
                            >
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {app.chatToken && (
                            <Tooltip title="Chat">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/chat?applicant=applicant_${app.profileId}`)}
                                sx={{ color: '#8bb94a' }}
                              >
                                <ChatIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Daha Fazla">
                            <IconButton
                              size="small"
                              onClick={(e) => { setAnchorEl(e.currentTarget); setSelectedApp(app); }}
                            >
                              <MoreIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredApplications.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 15, 25, 50]}
          labelRowsPerPage="Sayfa basina:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          sx={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}
        />
      </Paper>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => { setAnchorEl(null); setSelectedApp(null); }}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 160 } }}
      >
        <MenuItem onClick={() => { navigate(`/application/${selectedApp?.id}`); setAnchorEl(null); }}>
          <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Detay</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setStatusDialog({ open: true, app: selectedApp }); setAnchorEl(null); }}>
          <ListItemIcon><FilterIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Durum Degistir</ListItemText>
        </MenuItem>
        {selectedApp?.chatToken && (
          <MenuItem onClick={() => { navigate(`/chat?applicant=applicant_${selectedApp?.profileId}`); setAnchorEl(null); }}>
            <ListItemIcon><ChatIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Mesaj</ListItemText>
          </MenuItem>
        )}
        <MenuItem
          onClick={() => { setDeleteConfirm({ open: true, app: selectedApp }); setAnchorEl(null); }}
          sx={{ color: '#c62828' }}
        >
          <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: '#c62828' }} /></ListItemIcon>
          <ListItemText>Sil</ListItemText>
        </MenuItem>
      </Menu>

      {/* Status Dialog */}
      <Dialog
        open={statusDialog.open}
        onClose={() => setStatusDialog({ open: false, app: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Durum Degistir
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {statusDialog.app?.firstName} {statusDialog.app?.lastName}
          </Typography>
          <Box display="flex" flexDirection="column" gap={0.5}>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                size="small"
                variant={statusDialog.app?.status === key ? 'contained' : 'outlined'}
                startIcon={config.icon}
                onClick={() => handleStatusChange(statusDialog.app?.id, key)}
                sx={{
                  justifyContent: 'flex-start',
                  textTransform: 'none',
                  borderRadius: 1.5,
                  py: 0.8,
                  bgcolor: statusDialog.app?.status === key ? config.color : 'transparent',
                  borderColor: config.color,
                  color: statusDialog.app?.status === key ? 'white' : config.color,
                  '&:hover': {
                    bgcolor: statusDialog.app?.status === key ? config.color : `${config.color}15`,
                    borderColor: config.color
                  }
                }}
              >
                {config.label}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button size="small" onClick={() => setStatusDialog({ open: false, app: null })} sx={{ textTransform: 'none' }}>
            Iptal
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, app: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#c62828' }}>
          Basvuruyu Sil
        </DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{deleteConfirm.app?.firstName} {deleteConfirm.app?.lastName}</strong> basvurusunu silmek istediginize emin misiniz?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2, borderRadius: 1.5 }}>
            Bu islem geri alinamaz!
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setDeleteConfirm({ open: false, app: null })} sx={{ textTransform: 'none' }}>
            Vazgec
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => handleDeleteApplication(deleteConfirm.app?.id)}
            sx={{ bgcolor: '#c62828', '&:hover': { bgcolor: '#b71c1c' }, textTransform: 'none' }}
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Recruitment;
