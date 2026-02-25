import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  InputAdornment,
  Skeleton,
  Divider,
  Snackbar,
  Slide,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  CheckCircle as ActiveIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Link as LinkIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  MoreVert as MoreIcon,
  Visibility as ViewIcon,
  HourglassEmpty as PendingIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import invitationService from '../../services/invitationService';
import { PUBLIC_URL } from '../../config/config';

const STATUS_CONFIG = {
  active: { label: 'Aktif', color: '#2e7d32', bgColor: '#e8f5e9', icon: <ActiveIcon sx={{ fontSize: 16 }} /> },
  clicked: { label: 'Tiklanmis', color: '#f57c00', bgColor: '#fff3e0', icon: <LocationIcon sx={{ fontSize: 16 }} /> },
  profile_created: { label: 'Profil Olusturuldu', color: '#1976d2', bgColor: '#e3f2fd', icon: <PersonIcon sx={{ fontSize: 16 }} /> },
  used: { label: 'Kullanildi', color: '#616161', bgColor: '#f5f5f5', icon: <CheckCircleIcon sx={{ fontSize: 16 }} /> }
};

function InvitationsPage() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newEmail, setNewEmail] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [successSnackbar, setSuccessSnackbar] = useState({ open: false, email: '', link: '' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedInv, setSelectedInv] = useState(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      const invitationData = await invitationService.loadInvitations();
      setInvitations(invitationData);
    } catch (error) {
      console.error('Error loading invitations:', error);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  };

  const checkDuplicateEmail = () => {
    if (!newEmail) {
      alert('Lutfen e-posta adresini girin');
      return;
    }

    const emailLower = newEmail.toLowerCase();
    let existingLink = invitations.find(inv =>
      inv.email.toLowerCase() === emailLower &&
      (inv.status === 'active' || inv.status === 'clicked' || inv.status === 'profile_created')
    );

    if (!existingLink) {
      try {
        const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
        const siteLinks = JSON.parse(localStorage.getItem(`invitation_links_${currentSite}`) || '[]');
        const globalLinks = JSON.parse(localStorage.getItem('invitation_links') || '[]');
        const allLinks = [...siteLinks, ...globalLinks];

        existingLink = allLinks.find(inv =>
          inv.email && inv.email.toLowerCase() === emailLower &&
          (inv.status === 'active' || inv.status === 'clicked' || inv.status === 'profile_created')
        );
      } catch (e) {
        console.warn('localStorage kontrol hatasi:', e);
      }
    }

    if (existingLink) {
      setDuplicateWarning(existingLink);
      setShowDuplicateDialog(true);
    } else {
      createLink();
    }
  };

  const createLink = async () => {
    try {
      const newInvitation = await invitationService.createInvitation(newEmail);
      const updatedInvitations = [newInvitation, ...invitations];
      setInvitations(updatedInvitations);

      const link = `${PUBLIC_URL}/apply/${newInvitation.token}`;
      navigator.clipboard.writeText(link);

      setSuccessSnackbar({
        open: true,
        email: newEmail,
        link: link
      });

      setOpenDialog(false);
      setShowDuplicateDialog(false);
      setNewEmail('');
      setDuplicateWarning(null);

    } catch (error) {
      console.error('Link olusturma hatasi:', error);

      if (error.message.includes('aktif bir link zaten mevcut')) {
        alert('Bu e-posta adresine aktif bir link zaten mevcut!');
      } else {
        alert('Link olusturulurken bir hata olustu: ' + error.message);
      }
    }
  };

  const copyLink = (token) => {
    const link = `${PUBLIC_URL}/apply/${token}`;
    navigator.clipboard.writeText(link);
    setSuccessSnackbar({
      open: true,
      email: 'Link kopyalandi!',
      link: ''
    });
  };

  const deleteInvitation = async (id) => {
    if (window.confirm('Bu kaydi silmek istediginize emin misiniz?')) {
      try {
        await invitationService.deleteInvitation(id);
        const updated = invitations.filter(inv => inv.id !== id);
        setInvitations(updated);
      } catch (error) {
        console.error('Silme hatasi:', error);
        alert('Link silinirken bir hata olustu: ' + error.message);
      }
    }
  };

  const getStatusConfig = (invitation) => {
    if (invitation.status === 'used') {
      return STATUS_CONFIG.used;
    } else if (invitation.status === 'profile_created') {
      return STATUS_CONFIG.profile_created;
    } else if (invitation.clickedAt) {
      return STATUS_CONFIG.clicked;
    } else {
      return STATUS_CONFIG.active;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.toLocaleDateString('tr-TR')} ${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const filteredInvitations = invitations.filter(inv => {
    const matchesSearch =
      (inv.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.applicantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.applicantPhone?.includes(searchQuery) ||
      inv.ipAddress?.includes(searchQuery));

    let matchesStatus = statusFilter === 'all';
    if (statusFilter === 'active') matchesStatus = inv.status === 'active' && !inv.clickedAt;
    if (statusFilter === 'clicked') matchesStatus = inv.clickedAt && inv.status !== 'used';
    if (statusFilter === 'used') matchesStatus = inv.status === 'used';

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invitations.length,
    active: invitations.filter(i => i.status === 'active' && !i.clickedAt).length,
    clicked: invitations.filter(i => i.clickedAt && i.status !== 'used').length,
    used: invitations.filter(i => i.status === 'used').length
  };

  const paginatedInvitations = filteredInvitations.slice(
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
              Davet Linkleri
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {invitations.length} davet linki
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadInvitations}
              sx={{ borderColor: '#1c61ab', color: '#1c61ab', textTransform: 'none', borderRadius: 2 }}
            >
              Yenile
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<LinkIcon />}
              onClick={() => setOpenDialog(true)}
              sx={{
                background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 600
              }}
            >
              Yeni Link Olustur
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
          label={`Aktif: ${stats.active}`}
          onClick={() => setStatusFilter('active')}
          sx={{
            bgcolor: statusFilter === 'active' ? '#2e7d32' : '#e8f5e9',
            color: statusFilter === 'active' ? 'white' : '#2e7d32',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        />
        <Chip
          label={`Tiklanmis: ${stats.clicked}`}
          onClick={() => setStatusFilter('clicked')}
          sx={{
            bgcolor: statusFilter === 'clicked' ? '#f57c00' : '#fff3e0',
            color: statusFilter === 'clicked' ? 'white' : '#f57c00',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        />
        <Chip
          label={`Kullanildi: ${stats.used}`}
          onClick={() => setStatusFilter('used')}
          sx={{
            bgcolor: statusFilter === 'used' ? '#616161' : '#f5f5f5',
            color: statusFilter === 'used' ? 'white' : '#616161',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        />
      </Box>

      {/* Search */}
      <Paper sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
        <TextField
          fullWidth
          placeholder="E-posta, ad, telefon veya IP ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
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
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>E-posta</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Basvuran</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Olusturulma</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Tiklanma</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Form Doldurulma</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>IP Adresi</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5 }}>Durum</TableCell>
                <TableCell sx={{ fontWeight: 700, py: 1.5, width: 100 }} align="center">Islem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedInvitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    <AssignmentIcon sx={{ fontSize: 48, color: '#ccc', mb: 1 }} />
                    <Typography color="text.secondary">
                      {searchQuery || statusFilter !== 'all' ? 'Sonuc bulunamadi' : 'Henuz davet linki olusturulmamis'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedInvitations.map((invitation) => {
                  const statusConfig = getStatusConfig(invitation);
                  const applicantName = invitation.applicantName || '-';
                  const initials = applicantName !== '-'
                    ? applicantName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    : invitation.email?.substring(0, 2).toUpperCase() || '?';

                  return (
                    <TableRow
                      key={invitation.id}
                      hover
                      sx={{
                        '&:hover': { bgcolor: 'rgba(28, 97, 171, 0.02)' }
                      }}
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
                            {initials}
                          </Avatar>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 180, fontSize: '0.85rem' }}>
                            {invitation.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        {invitation.applicantName ? (
                          <Box>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>
                              {invitation.applicantName}
                            </Typography>
                            {invitation.applicantPhone && (
                              <Typography variant="caption" color="text.secondary">
                                {invitation.applicantPhone}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {formatDate(invitation.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {formatDate(invitation.clickedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {formatDate(invitation.form_submitted_at || invitation.usedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {invitation.first_accessed_ip || invitation.form_submitted_ip || invitation.ipAddress || '-'}
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
                      <TableCell sx={{ py: 1.2 }} align="center">
                        <Box display="flex" gap={0.5} justifyContent="center">
                          <Tooltip title={invitation.status === 'used' ? 'Link kullanildi' : 'Linki Kopyala'}>
                            <IconButton
                              size="small"
                              onClick={() => copyLink(invitation.token)}
                              disabled={invitation.status === 'used'}
                              sx={{ color: '#1c61ab' }}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Daha Fazla">
                            <IconButton
                              size="small"
                              onClick={(e) => { setAnchorEl(e.currentTarget); setSelectedInv(invitation); }}
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
          count={filteredInvitations.length}
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
        onClose={() => { setAnchorEl(null); setSelectedInv(null); }}
        PaperProps={{ sx: { borderRadius: 2, minWidth: 160 } }}
      >
        <MenuItem
          onClick={() => { copyLink(selectedInv?.token); setAnchorEl(null); }}
          disabled={selectedInv?.status === 'used'}
        >
          <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Linki Kopyala</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => { deleteInvitation(selectedInv?.id); setAnchorEl(null); }}
          sx={{ color: '#c62828' }}
        >
          <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: '#c62828' }} /></ListItemIcon>
          <ListItemText>Sil</ListItemText>
        </MenuItem>
      </Menu>

      {/* Yeni Link Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => {setOpenDialog(false); setNewEmail('');}}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Tek Kullanimlik Basvuru Linki Olustur
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info" icon={<InfoIcon />} sx={{ borderRadius: 1.5 }}>
              <strong>Otomatik Takip Sistemi:</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                <li>Link tiklandiginda IP adresi kaydedilir</li>
                <li>Form dolduruldugunda ad-soyad ve telefon otomatik gorunur</li>
                <li>Form gonderildikten sonra link otomatik iptal olur</li>
              </ul>
            </Alert>

            <TextField
              fullWidth
              label="Kime verilecek? (Takip icin e-posta)*"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              helperText="Bu e-posta sadece kime verdiginizi takip etmek icindir"
              autoFocus
              sx={{
                '& .MuiOutlinedInput-root': { borderRadius: 2 }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => {setOpenDialog(false); setNewEmail('');}}
            sx={{ textTransform: 'none' }}
          >
            Iptal
          </Button>
          <Button
            variant="contained"
            onClick={checkDuplicateEmail}
            startIcon={<LinkIcon />}
            disabled={!newEmail}
            sx={{
              background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
              textTransform: 'none',
              borderRadius: 2,
              '&:hover': {
                background: 'linear-gradient(135deg, #155090, #7aa042)'
              }
            }}
          >
            Link Olustur ve Kopyala
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Uyari Dialog */}
      <Dialog
        open={showDuplicateDialog}
        onClose={() => setShowDuplicateDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}>
          <WarningIcon color="warning" />
          Ayni E-posta Uyarisi
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Bu e-posta adresine (<strong>{newEmail}</strong>) daha once link verilmis.
          </Typography>

          {duplicateWarning && (
            <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default', borderRadius: 1.5 }}>
              {duplicateWarning.status === 'used' ? (
                <>
                  <Typography variant="body2" color="error" fontWeight="bold" gutterBottom>
                    Link KULLANILMIS
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    <strong>Basvuran:</strong> {duplicateWarning.applicantName || 'Bilinmiyor'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Kullanim Tarihi:</strong> {formatDate(duplicateWarning.usedAt)}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body2" color="warning.main" fontWeight="bold" gutterBottom>
                    Link henuz KULLANILMAMIS
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="body2">
                    <strong>Olusturulma:</strong> {formatDate(duplicateWarning.createdAt)}
                  </Typography>
                </>
              )}
            </Paper>
          )}

          <Typography variant="body2" sx={{ mt: 3 }} color="text.secondary">
            Yine de yeni bir link olusturmak istiyor musunuz?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setShowDuplicateDialog(false)} sx={{ textTransform: 'none' }}>
            Iptal
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowDuplicateDialog(false);
              createLink();
            }}
            color="warning"
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Yine de Olustur
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={successSnackbar.open}
        autoHideDuration={4000}
        onClose={() => setSuccessSnackbar({ ...successSnackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        TransitionComponent={Slide}
        TransitionProps={{ direction: 'down' }}
      >
        <Alert
          onClose={() => setSuccessSnackbar({ ...successSnackbar, open: false })}
          severity="success"
          variant="filled"
          sx={{
            width: '100%',
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)'
          }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Link Basariyla Olusturuldu!
            </Typography>
            {successSnackbar.link && (
              <>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Kayit: {successSnackbar.email}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.9 }}>
                  Link panoya kopyalandi
                </Typography>
              </>
            )}
          </Box>
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default InvitationsPage;
