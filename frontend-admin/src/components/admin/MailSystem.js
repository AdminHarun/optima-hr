import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Snackbar
} from '@mui/material';
import {
  Send as SendIcon,
  Delete as DeleteIcon,
  Reply as ReplyIcon,
  Search as SearchIcon,
  AttachFile as AttachFileIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Archive as ArchiveIcon,
  MoreVert as MoreVertIcon,
  Inbox as InboxIcon,
  Drafts as DraftsIcon,
  Send as SentIcon,
  Delete as TrashIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  Sync as SyncIcon
} from '@mui/icons-material';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';
import axios from 'axios';

import { API_BASE_URL } from '../../config/config';
const API_URL = `${API_BASE_URL}/mail/api`;

function MailSystem() {
  const { currentUser } = useEmployeeAuth();

  // States
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [selectedMail, setSelectedMail] = useState(null);
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mails, setMails] = useState([]);
  const [emailSettings, setEmailSettings] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });

  // Compose mail states
  const [composeMail, setComposeMail] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
  });

  // Settings states
  const [settingsForm, setSettingsForm] = useState({
    email_address: '',
    password: '',
    provider: 'gmail',
    imap_host: '',
    imap_port: 993,
    smtp_host: '',
    smtp_port: 587,
    use_ssl: true,
    // Gmail uyumluluk
    gmail_address: '',
    gmail_app_password: ''
  });

  // Auto-sync emails every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (emailSettings && !syncing) {
        syncEmails();
      }
    }, 30000); // 30 saniyede bir

    return () => clearInterval(interval);
  }, [emailSettings, syncing]);

  // Load emails on mount and folder change
  useEffect(() => {
    loadEmails();
    loadSettings();
  }, [selectedFolder]);

  // Load emails from backend
  const loadEmails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = token ? { 'Authorization': `Token ${token}` } : {};

      const response = await axios.get(`${API_URL}/emails/`, {
        headers,
        params: {
          folder: selectedFolder.toUpperCase() // inbox -> INBOX
        }
      });

      const emails = response.data.results || response.data || [];

      // Klasöre göre filtreleme
      let filteredEmails = emails;
      if (selectedFolder === 'sent') {
        filteredEmails = emails.filter(mail =>
          mail.sender_email === currentUser?.email ||
          mail.from_email === currentUser?.email ||
          mail.is_sent === true
        );
      } else if (selectedFolder === 'inbox') {
        filteredEmails = emails.filter(mail =>
          mail.recipient_email === currentUser?.email ||
          mail.to_email === currentUser?.email ||
          mail.folder === 'inbox' ||
          (!mail.is_sent && !mail.is_draft && !mail.is_trash && !mail.is_spam)
        );
      } else if (selectedFolder === 'drafts') {
        filteredEmails = emails.filter(mail => mail.is_draft === true);
      } else if (selectedFolder === 'trash') {
        filteredEmails = emails.filter(mail => mail.is_deleted === true || mail.is_trash === true);
      } else if (selectedFolder === 'spam') {
        filteredEmails = emails.filter(mail => mail.is_spam === true);
      }

      setMails(filteredEmails);
    } catch (error) {
      console.error('Error loading emails:', error);
      if (error.response?.status !== 401) {
        // Session timeout değilse hata göster
        showAlert('E-postalar yüklenirken hata oluştu', 'error');
      }
      setMails([]);
    } finally {
      setLoading(false);
    }
  };

  // Load email settings
  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = token ? { 'Authorization': `Token ${token}` } : {};

      const response = await axios.get(`${API_URL}/settings/`, { headers });
      if (response.data && (response.data.gmail_address || response.data.email_address)) {
        setEmailSettings(response.data);
        setSettingsForm(prev => ({
          ...prev,
          email_address: response.data.email_address || response.data.gmail_address || '',
          provider: response.data.provider || 'gmail',
          imap_host: response.data.imap_host || '',
          imap_port: response.data.imap_port || 993,
          smtp_host: response.data.smtp_host || '',
          smtp_port: response.data.smtp_port || 587,
          use_ssl: response.data.use_ssl !== false,
          gmail_address: response.data.gmail_address || response.data.email_address || '',
          gmail_app_password: '',
          password: ''
        }));
      }
    } catch (error) {
      console.warn('API settings yuklenemedi, localStorage kontrol ediliyor:', error.message);
      // Fallback: localStorage
      try {
        const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
        const saved = JSON.parse(localStorage.getItem(`mail_settings_${currentSite}`) || 'null');
        if (saved) {
          setEmailSettings(saved);
          setSettingsForm(prev => ({
            ...prev,
            email_address: saved.email_address || saved.gmail_address || '',
            provider: saved.provider || 'gmail',
            imap_host: saved.imap_host || '',
            imap_port: saved.imap_port || 993,
            smtp_host: saved.smtp_host || '',
            smtp_port: saved.smtp_port || 587,
            use_ssl: saved.use_ssl !== false,
            gmail_address: saved.gmail_address || saved.email_address || '',
            gmail_app_password: '',
            password: ''
          }));
        }
      } catch (e) {
        console.error('localStorage settings hatasi:', e);
      }
    }
  };

  // Save email settings
  const saveSettings = async () => {
    // Validasyon
    const emailAddr = settingsForm.email_address || settingsForm.gmail_address;
    if (!emailAddr) {
      showAlert('E-posta adresi zorunludur', 'error');
      return;
    }

    // Gmail uyumluluk - gmail_address alanini senkronize et
    const dataToSave = {
      ...settingsForm,
      gmail_address: emailAddr,
      email_address: emailAddr,
    };

    // Provider'a gore IMAP/SMTP varsayilanlarini ayarla
    if (settingsForm.provider === 'gmail' && !settingsForm.imap_host) {
      dataToSave.imap_host = 'imap.gmail.com';
      dataToSave.smtp_host = 'smtp.gmail.com';
      dataToSave.imap_port = 993;
      dataToSave.smtp_port = 587;
    } else if (settingsForm.provider === 'outlook' && !settingsForm.imap_host) {
      dataToSave.imap_host = 'outlook.office365.com';
      dataToSave.smtp_host = 'smtp.office365.com';
      dataToSave.imap_port = 993;
      dataToSave.smtp_port = 587;
    } else if (settingsForm.provider === 'yandex' && !settingsForm.imap_host) {
      dataToSave.imap_host = 'imap.yandex.com';
      dataToSave.smtp_host = 'smtp.yandex.com';
      dataToSave.imap_port = 993;
      dataToSave.smtp_port = 465;
    }

    try {
      const token = localStorage.getItem('authToken');
      const headers = token ? { 'Authorization': `Token ${token}` } : {};

      const response = await axios.post(`${API_URL}/settings/`, dataToSave, { headers });
      if (response.data.success) {
        setEmailSettings(response.data.settings || dataToSave);
        showAlert(response.data.message || 'E-posta ayarlari kaydedildi', 'success');
        setSettingsDialogOpen(false);
        loadEmails();
      } else {
        showAlert(response.data.message || 'Ayarlar kaydedilemedi', 'error');
      }
    } catch (error) {
      console.warn('API ile kayit basarisiz, localStorage kullaniliyor:', error.message);
      // Fallback: localStorage
      try {
        const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
        const settingsToStore = { ...dataToSave };
        delete settingsToStore.password;
        delete settingsToStore.gmail_app_password;
        localStorage.setItem(`mail_settings_${currentSite}`, JSON.stringify(settingsToStore));
        setEmailSettings(settingsToStore);
        showAlert('E-posta ayarlari kaydedildi (lokal mod)', 'success');
        setSettingsDialogOpen(false);
      } catch (e) {
        showAlert('Ayarlar kaydedilirken hata olustu: ' + error.message, 'error');
      }
    }
  };

  // Sync emails from Gmail
  const syncEmails = async () => {
    if (!emailSettings) {
      showAlert('Lütfen önce e-posta ayarlarınızı yapın', 'warning');
      setSettingsDialogOpen(true);
      return;
    }

    setSyncing(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = token ? { 'Authorization': `Token ${token}` } : {};

      const response = await axios.post(`${API_URL}/emails/sync/`, {}, { headers });
      if (response.data.success) {
        showAlert(`${response.data.new_emails || 0} yeni e-posta senkronize edildi`, 'success');
        loadEmails();
      } else {
        showAlert(response.data.message || 'Senkronizasyon başarısız', 'error');
      }
    } catch (error) {
      console.error('Error syncing emails:', error);
      showAlert('Senkronizasyon sırasında hata oluştu', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Send email
  const handleSendMail = async () => {
    if (!emailSettings) {
      showAlert('Lütfen önce e-posta ayarlarınızı yapın', 'warning');
      setSettingsDialogOpen(true);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const headers = token ? { 'Authorization': `Token ${token}` } : {};

      const response = await axios.post(`${API_URL}/emails/send/`, composeMail, { headers });
      if (response.data.success) {
        showAlert('E-posta başarıyla gönderildi', 'success');
        setComposeDialogOpen(false);
        setComposeMail({ to: '', cc: '', bcc: '', subject: '', body: '' });
        if (selectedFolder === 'sent') {
          loadEmails();
        }
      } else {
        showAlert(response.data.message || 'E-posta gönderilemedi', 'error');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      showAlert('E-posta gönderilirken hata oluştu', 'error');
    }
  };

  // Mark email as read
  const markAsRead = async (emailId) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = token ? { 'Authorization': `Token ${token}` } : {};

      await axios.post(`${API_URL}/emails/${emailId}/mark_read/`, {}, { headers });
      setMails(prevMails =>
        prevMails.map(m =>
          m.id === emailId ? { ...m, is_read: true } : m
        )
      );
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  };

  // Toggle star
  const toggleStar = async (email) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = token ? { 'Authorization': `Token ${token}` } : {};

      const response = await axios.post(`${API_URL}/emails/${email.id}/toggle_star/`, {}, { headers });
      if (response.data.success) {
        setMails(prevMails =>
          prevMails.map(m =>
            m.id === email.id ? { ...m, is_starred: response.data.starred } : m
          )
        );
      }
    } catch (error) {
      console.error('Error toggling star:', error);
    }
  };

  // Move to trash
  const moveToTrash = async (emailId) => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = token ? { 'Authorization': `Token ${token}` } : {};

      await axios.post(`${API_URL}/emails/${emailId}/move_to_trash/`, {}, { headers });
      showAlert('E-posta çöp kutusuna taşındı', 'success');
      loadEmails();
      setSelectedMail(null);
    } catch (error) {
      console.error('Error moving to trash:', error);
      showAlert('E-posta taşınamadı', 'error');
    }
  };

  // Show alert
  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  // Filter emails based on search
  const filteredMails = mails.filter(mail => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      mail.subject?.toLowerCase().includes(query) ||
      mail.sender_name?.toLowerCase().includes(query) ||
      mail.sender_email?.toLowerCase().includes(query) ||
      mail.body?.toLowerCase().includes(query)
    );
  });

  // Format date
  const formatDate = (date) => {
    if (!date) return '';
    const mailDate = new Date(date);
    const now = new Date();
    const diff = now - mailDate;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return mailDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Dün';
    } else {
      return mailDate.toLocaleDateString('tr-TR');
    }
  };

  // Get folder counts
  const getUnreadCount = (folder) => {
    if (folder === 'inbox') {
      return mails.filter(m => !m.is_read).length;
    }
    return 0;
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', bgcolor: '#f5f5f5' }}>
      {/* Sidebar */}
      <Paper sx={{
        width: 240,
        p: 2,
        borderRadius: 0,
        borderRight: '1px solid #e0e0e0'
      }}>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => setComposeDialogOpen(true)}
          sx={{
            mb: 2,
            background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
            '&:hover': {
              background: 'linear-gradient(135deg, #155090, #7aa042)'
            }
          }}
          fullWidth
        >
          Yeni Mail
        </Button>

        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <IconButton
            onClick={syncEmails}
            disabled={syncing}
            title="Gmail'den senkronize et"
            size="small"
          >
            {syncing ? <CircularProgress size={20} /> : <SyncIcon />}
          </IconButton>

          <IconButton
            onClick={() => setSettingsDialogOpen(true)}
            title="E-posta ayarları"
            size="small"
          >
            <SettingsIcon />
          </IconButton>

          <IconButton
            onClick={loadEmails}
            title="Yenile"
            size="small"
          >
            <RefreshIcon />
          </IconButton>
        </Box>

        <List>
          <ListItem
            button
            selected={selectedFolder === 'inbox'}
            onClick={() => setSelectedFolder('inbox')}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: 'rgba(28, 97, 171, 0.1)',
                borderLeft: '3px solid #1c61ab'
              }
            }}
          >
            <ListItemAvatar>
              <InboxIcon color={selectedFolder === 'inbox' ? 'primary' : 'action'} />
            </ListItemAvatar>
            <ListItemText primary="Gelen Kutusu" />
            {getUnreadCount('inbox') > 0 && (
              <Chip size="small" label={getUnreadCount('inbox')} color="error" />
            )}
          </ListItem>

          <ListItem
            button
            selected={selectedFolder === 'sent'}
            onClick={() => setSelectedFolder('sent')}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: 'rgba(139, 185, 74, 0.1)',
                borderLeft: '3px solid #8bb94a'
              }
            }}
          >
            <ListItemAvatar>
              <SentIcon color={selectedFolder === 'sent' ? 'success' : 'action'} />
            </ListItemAvatar>
            <ListItemText primary="Gönderilenler" />
          </ListItem>

          <ListItem
            button
            selected={selectedFolder === 'drafts'}
            onClick={() => setSelectedFolder('drafts')}
            sx={{
              borderRadius: 2,
              mb: 0.5
            }}
          >
            <ListItemAvatar>
              <DraftsIcon color={selectedFolder === 'drafts' ? 'primary' : 'action'} />
            </ListItemAvatar>
            <ListItemText primary="Taslaklar" />
          </ListItem>

          <ListItem
            button
            selected={selectedFolder === 'spam'}
            onClick={() => setSelectedFolder('spam')}
            sx={{
              borderRadius: 2,
              mb: 0.5
            }}
          >
            <ListItemAvatar>
              <ArchiveIcon color={selectedFolder === 'spam' ? 'warning' : 'action'} />
            </ListItemAvatar>
            <ListItemText primary="Spam" />
          </ListItem>

          <ListItem
            button
            selected={selectedFolder === 'trash'}
            onClick={() => setSelectedFolder('trash')}
            sx={{
              borderRadius: 2
            }}
          >
            <ListItemAvatar>
              <TrashIcon color={selectedFolder === 'trash' ? 'primary' : 'action'} />
            </ListItemAvatar>
            <ListItemText primary="Çöp Kutusu" />
          </ListItem>
        </List>

        {emailSettings && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Bağlı hesap:
            </Typography>
            <Typography variant="caption" display="block" sx={{ fontWeight: 500 }}>
              {emailSettings.gmail_address}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Mail List */}
      <Box sx={{
        width: 400,
        borderRight: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'white'
      }}>
        {/* Header */}
        <Box sx={{
          p: 2,
          borderBottom: '1px solid #e0e0e0',
          background: selectedFolder === 'sent' ?
            'linear-gradient(135deg, rgba(139, 185, 74, 0.1), rgba(139, 185, 74, 0.05))' :
            'linear-gradient(135deg, rgba(28, 97, 171, 0.1), rgba(28, 97, 171, 0.05))'
        }}>
          <Typography variant="h6" sx={{
            fontWeight: 600,
            color: selectedFolder === 'sent' ? '#8bb94a' : '#1c61ab',
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            {selectedFolder === 'inbox' && <><InboxIcon /> Gelen Kutusu</>}
            {selectedFolder === 'sent' && <><SentIcon /> Gönderilenler</>}
            {selectedFolder === 'drafts' && <><DraftsIcon /> Taslaklar</>}
            {selectedFolder === 'spam' && <><ArchiveIcon /> Spam</>}
            {selectedFolder === 'trash' && <><TrashIcon /> Çöp Kutusu</>}
          </Typography>
        </Box>

        {/* Search */}
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Mail ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Mails */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List sx={{
            p: 1,
            flexGrow: 1,
            overflow: 'auto',
            maxHeight: 'calc(100vh - 200px)'
          }}>
            {filteredMails.length === 0 ? (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  {searchQuery ? 'Arama sonucu bulunamadı' :
                    selectedFolder === 'inbox' ? 'Gelen kutunuzda mail yok' :
                      selectedFolder === 'sent' ? 'Gönderilmiş mail yok' :
                        'Bu klasörde mail yok'}
                </Typography>
                {selectedFolder === 'inbox' && !emailSettings && (
                  <Button
                    onClick={() => setSettingsDialogOpen(true)}
                    sx={{ mt: 2 }}
                    variant="outlined"
                  >
                    E-posta Ayarlarını Yap
                  </Button>
                )}
              </Box>
            ) : (
              filteredMails.map((mail) => (
                <ListItem
                  key={mail.id}
                  button
                  selected={selectedMail?.id === mail.id}
                  onClick={() => {
                    setSelectedMail(mail);
                    if (!mail.is_read) {
                      markAsRead(mail.id);
                    }
                  }}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    bgcolor: mail.is_read ? 'white' : 'rgba(28, 97, 171, 0.05)',
                    border: '1px solid #e0e0e0'
                  }}
                >
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Avatar sx={{
                        width: 32,
                        height: 32,
                        mr: 1.5,
                        bgcolor: selectedFolder === 'sent' ? '#8bb94a' : '#1c61ab'
                      }}>
                        {selectedFolder === 'sent' ?
                          (mail.recipient_name?.[0] || mail.to_email?.[0] || 'K') :
                          (mail.sender_name?.[0] || mail.from_email?.[0] || 'G')
                        }
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: mail.is_read ? 400 : 600 }}
                        >
                          {selectedFolder === 'sent' ?
                            `Kime: ${mail.recipient_name || mail.to_email || 'Alıcı'}` :
                            (mail.sender_name || mail.from_email || 'Gönderen')
                          }
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(mail.created_at || mail.date)}
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      sx={{ fontWeight: mail.is_read ? 400 : 600, mb: 0.5 }}
                    >
                      {mail.subject}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {mail.body || mail.snippet}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                      {mail.is_important && (
                        <Chip size="small" label="Önemli" color="error" sx={{ height: 20 }} />
                      )}
                      {mail.attachments?.length > 0 && (
                        <AttachFileIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar(mail);
                        }}
                      >
                        {mail.is_starred ? (
                          <StarIcon sx={{ fontSize: 16, color: '#ffa726' }} />
                        ) : (
                          <StarBorderIcon sx={{ fontSize: 16 }} />
                        )}
                      </IconButton>
                    </Box>
                  </Box>
                </ListItem>
              ))
            )}
          </List>
        )}
      </Box>

      {/* Mail Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedMail ? (
          <>
            {/* Actions */}
            <Box sx={{
              p: 2,
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              gap: 1
            }}>
              {selectedFolder !== 'sent' && (
                <Button
                  startIcon={<ReplyIcon />}
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setComposeMail({
                      to: selectedMail.sender_email || selectedMail.from_email,
                      subject: `Re: ${selectedMail.subject}`,
                      body: `\n\n--- Orijinal Mesaj ---\n${selectedMail.body}`,
                      cc: '',
                      bcc: ''
                    });
                    setComposeDialogOpen(true);
                  }}
                >
                  Yanıtla
                </Button>
              )}
              <Button
                startIcon={<DeleteIcon />}
                variant="outlined"
                size="small"
                color="error"
                onClick={() => moveToTrash(selectedMail.id)}
              >
                Sil
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              <IconButton><ArchiveIcon /></IconButton>
              <IconButton><MoreVertIcon /></IconButton>
            </Box>

            {/* Content */}
            <Box sx={{
              flexGrow: 1,
              p: 3,
              overflow: 'auto',
              maxHeight: 'calc(100vh - 200px)'
            }}>
              <Typography variant="h5" gutterBottom>
                {selectedMail.subject}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ bgcolor: selectedFolder === 'sent' ? '#8bb94a' : '#1c61ab' }}>
                  {selectedFolder === 'sent' ?
                    (selectedMail.recipient_name?.[0] || selectedMail.to_email?.[0] || 'K') :
                    (selectedMail.sender_name?.[0] || selectedMail.from_email?.[0] || 'G')
                  }
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {selectedFolder === 'sent' ?
                      `Kime: ${selectedMail.recipient_name || selectedMail.to_email || 'Alıcı'}` :
                      (selectedMail.sender_name || selectedMail.from_email || 'Bilinmeyen')
                    }
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedFolder === 'sent' ?
                      `${selectedMail.to_email || ''} • ${new Date(selectedMail.created_at || selectedMail.date).toLocaleString('tr-TR')}` :
                      `${selectedMail.sender_email || selectedMail.from_email} • ${new Date(selectedMail.created_at || selectedMail.date).toLocaleString('tr-TR')}`
                    }
                  </Typography>
                </Box>
              </Box>

              {selectedMail.html_body ? (
                <Box
                  sx={{
                    '& *': {
                      maxWidth: '100%',
                      wordBreak: 'break-word'
                    },
                    lineHeight: 1.6
                  }}
                  dangerouslySetInnerHTML={{
                    __html: selectedMail.html_body
                  }}
                />
              ) : (
                <Typography
                  variant="body1"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: 1.6
                  }}
                >
                  {selectedMail.body || selectedMail.snippet}
                </Typography>
              )}

              {selectedMail.attachments?.length > 0 && (
                <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                  <Typography variant="body2" fontWeight="medium">
                    Ekler
                  </Typography>
                  {selectedMail.attachments.map((attachment, index) => (
                    <Chip
                      key={index}
                      icon={<AttachFileIcon />}
                      label={attachment.filename || attachment.name}
                      sx={{ mt: 1, mr: 1 }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </>
        ) : (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <InboxIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
              <Typography variant="h6" color="text.secondary">
                Bir mail seçin
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Compose Dialog */}
      <Dialog
        open={composeDialogOpen}
        onClose={() => setComposeDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{
          background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
          color: 'white'
        }}>
          Yeni Mail
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Kime"
            value={composeMail.to}
            onChange={(e) => setComposeMail({ ...composeMail, to: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="CC"
            value={composeMail.cc}
            onChange={(e) => setComposeMail({ ...composeMail, cc: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Konu"
            value={composeMail.subject}
            onChange={(e) => setComposeMail({ ...composeMail, subject: e.target.value })}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Mesaj"
            multiline
            rows={10}
            value={composeMail.body}
            onChange={(e) => setComposeMail({ ...composeMail, body: e.target.value })}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setComposeDialogOpen(false)}>İptal</Button>
          <Button
            variant="contained"
            onClick={handleSendMail}
            startIcon={<SendIcon />}
            sx={{
              background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
              '&:hover': {
                background: 'linear-gradient(135deg, #155090, #7aa042)'
              }
            }}
          >
            Gönder
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          E-posta Ayarlari
        </DialogTitle>

        <DialogContent sx={{ mt: 2 }}>
          {/* Provider secimi */}
          <TextField
            fullWidth
            select
            label="E-posta Saglayicisi"
            value={settingsForm.provider}
            onChange={(e) => {
              const provider = e.target.value;
              const defaults = {
                gmail: { imap_host: 'imap.gmail.com', smtp_host: 'smtp.gmail.com', imap_port: 993, smtp_port: 587 },
                outlook: { imap_host: 'outlook.office365.com', smtp_host: 'smtp.office365.com', imap_port: 993, smtp_port: 587 },
                yandex: { imap_host: 'imap.yandex.com', smtp_host: 'smtp.yandex.com', imap_port: 993, smtp_port: 465 },
                custom: { imap_host: '', smtp_host: '', imap_port: 993, smtp_port: 587 }
              };
              setSettingsForm(prev => ({
                ...prev,
                provider,
                ...(defaults[provider] || defaults.custom)
              }));
            }}
            sx={{ mb: 2 }}
            SelectProps={{ native: true }}
          >
            <option value="gmail">Gmail</option>
            <option value="outlook">Outlook / Office 365</option>
            <option value="yandex">Yandex Mail</option>
            <option value="custom">Ozel IMAP/SMTP</option>
          </TextField>

          {settingsForm.provider === 'gmail' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Gmail icin "Uygulama Sifresi" gereklidir: 2 adimli dogrulamayi acin, guvenlik ayarlarindan uygulama sifresi olusturun.
            </Alert>
          )}

          {settingsForm.provider === 'custom' && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Ozel mail sunucusu icin IMAP ve SMTP bilgilerinizi girin. Ornegin: application@fixbet.com, application@matadorbet.com
            </Alert>
          )}

          <TextField
            fullWidth
            label="E-posta Adresi"
            value={settingsForm.email_address || settingsForm.gmail_address}
            onChange={(e) => setSettingsForm({ ...settingsForm, email_address: e.target.value, gmail_address: e.target.value })}
            placeholder={settingsForm.provider === 'gmail' ? 'ornek@gmail.com' : 'application@sirket.com'}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label={settingsForm.provider === 'gmail' ? 'Uygulama Sifresi' : 'E-posta Sifresi'}
            type="password"
            value={settingsForm.password || settingsForm.gmail_app_password}
            onChange={(e) => setSettingsForm({ ...settingsForm, password: e.target.value, gmail_app_password: e.target.value })}
            placeholder={settingsForm.provider === 'gmail' ? '16 haneli uygulama sifresi' : 'E-posta sifresi'}
            sx={{ mb: 2 }}
          />

          {/* IMAP/SMTP ayarlari (custom icin) */}
          {settingsForm.provider === 'custom' && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>IMAP Ayarlari (Gelen)</Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  label="IMAP Sunucusu"
                  value={settingsForm.imap_host}
                  onChange={(e) => setSettingsForm({ ...settingsForm, imap_host: e.target.value })}
                  placeholder="imap.sirket.com"
                />
                <TextField
                  label="Port"
                  value={settingsForm.imap_port}
                  onChange={(e) => setSettingsForm({ ...settingsForm, imap_port: parseInt(e.target.value) || 993 })}
                  sx={{ width: 100 }}
                  type="number"
                />
              </Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>SMTP Ayarlari (Giden)</Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  fullWidth
                  label="SMTP Sunucusu"
                  value={settingsForm.smtp_host}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smtp_host: e.target.value })}
                  placeholder="smtp.sirket.com"
                />
                <TextField
                  label="Port"
                  value={settingsForm.smtp_port}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smtp_port: parseInt(e.target.value) || 587 })}
                  sx={{ width: 100 }}
                  type="number"
                />
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>Iptal</Button>
          <Button
            variant="contained"
            onClick={saveSettings}
            sx={{
              background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
              '&:hover': {
                background: 'linear-gradient(135deg, #155090, #7aa042)'
              }
            }}
          >
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setAlert({ ...alert, open: false })}
          severity={alert.severity}
          sx={{ width: '100%' }}
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default MailSystem;
