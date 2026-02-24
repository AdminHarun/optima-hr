// WorkflowsPage - Workflow Builder UI (Phase 5.4)
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Button, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch,
  FormControlLabel, MenuItem, Select, FormControl, InputLabel, Stack,
  Card, CardContent, CircularProgress, Alert, Snackbar, Tooltip, Divider,
  List, ListItem, ListItemText, ListItemIcon, Grid
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  History as HistoryIcon,
  Send as SendIcon,
  Assignment as TaskIcon,
  Description as LogIcon,
  Close as CloseIcon,
  AccountTree as WorkflowIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Message as MessageIcon,
  PersonAdd as PersonAddIcon,
  CheckCircle as CheckCircleIcon,
  MoreVert as MoreVertIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useSite } from '../../contexts/SiteContext';

import { API_BASE_URL } from '../../config/config';
const API_BASE = API_BASE_URL;

// ============================================================
// OPTIMA RENK PALETI
// ============================================================
const COLORS = {
  primary: '#1c61ab',
  primaryLight: '#2d7bcc',
  primaryDark: '#0d4f91',
  secondary: '#8bb94a',
  secondaryLight: '#9dcc5e',
  gradient: 'linear-gradient(135deg, #1c61ab 0%, #2d7bcc 50%, #8bb94a 100%)',
  gradientBlue: 'linear-gradient(135deg, #1c61ab 0%, #2d7bcc 100%)',
  gradientGreen: 'linear-gradient(135deg, #8bb94a 0%, #9dcc5e 100%)',
  headerGradient: 'linear-gradient(135deg, #1c61ab 0%, #1a6fc2 50%, #4a8c3f 100%)',
};

// ============================================================
// TRIGGER TYPE CONFIG
// ============================================================
const TRIGGER_TYPES = {
  'message.created': { label: 'Mesaj Olusturuldu', icon: <MessageIcon />, color: '#1c61ab', bgColor: '#e3f2fd' },
  'user.joined': { label: 'Kullanici Katildi', icon: <PersonAddIcon />, color: '#2e7d32', bgColor: '#e8f5e9' },
  'task.completed': { label: 'Gorev Tamamlandi', icon: <CheckCircleIcon />, color: '#f57c00', bgColor: '#fff3e0' },
  'schedule': { label: 'Zamanlanmis', icon: <ScheduleIcon />, color: '#7b1fa2', bgColor: '#f3e5f5' },
};

// ============================================================
// ACTION TYPE CONFIG
// ============================================================
const ACTION_TYPES = {
  'send_message': { label: 'Mesaj Gonder', icon: <SendIcon />, color: '#1c61ab' },
  'create_task': { label: 'Gorev Olustur', icon: <TaskIcon />, color: '#8bb94a' },
  'log_event': { label: 'Olay Kaydet', icon: <LogIcon />, color: '#f57c00' },
};

// Default empty action templates
const DEFAULT_ACTION_DATA = {
  'send_message': { room_id: '', message: '' },
  'create_task': { title: '', assignee: '' },
  'log_event': { message: '' },
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function WorkflowsPage() {
  const { currentSite } = useSite();

  // Workflows state
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingWorkflow, setDeletingWorkflow] = useState(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'message.created',
    trigger_config: {},
    actions: [{ type: 'send_message', data: { room_id: '', message: '' } }],
    is_active: true,
  });

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Saving state
  const [saving, setSaving] = useState(false);

  // ============================================================
  // API HELPERS
  // ============================================================
  const siteCode = currentSite?.code || 'FXB';

  const api = useCallback(async (path, options = {}) => {
    const url = `${API_BASE}/api/workflows${path}`;
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'x-site-id': siteCode,
        ...options.headers,
      },
      ...options,
    });
    if (options.method === 'DELETE' && res.status === 204) return { success: true };
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, [siteCode]);

  // ============================================================
  // DATA LOADING
  // ============================================================
  const loadWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api('');
      setWorkflows(data);
    } catch (err) {
      console.error('Error loading workflows:', err);
      setError('Workflow listesi yuklenemedi');
      setWorkflows([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // ============================================================
  // CRUD OPERATIONS
  // ============================================================
  const handleSave = async () => {
    try {
      setSaving(true);

      if (!formData.name.trim()) {
        setSnackbar({ open: true, message: 'Workflow adi zorunludur', severity: 'error' });
        return;
      }

      if (!formData.actions || formData.actions.length === 0) {
        setSnackbar({ open: true, message: 'En az bir aksiyon ekleyin', severity: 'error' });
        return;
      }

      if (editingWorkflow) {
        await api(`/${editingWorkflow.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        setSnackbar({ open: true, message: 'Workflow guncellendi', severity: 'success' });
      } else {
        await api('', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        setSnackbar({ open: true, message: 'Workflow olusturuldu', severity: 'success' });
      }

      setEditDialogOpen(false);
      setEditingWorkflow(null);
      resetForm();
      loadWorkflows();
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api(`/${deletingWorkflow.id}`, { method: 'DELETE' });
      setSnackbar({ open: true, message: 'Workflow silindi', severity: 'success' });
      setDeleteDialogOpen(false);
      setDeletingWorkflow(null);
      loadWorkflows();
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleToggle = async (workflow) => {
    try {
      await api(`/${workflow.id}/toggle`, { method: 'POST' });
      setSnackbar({
        open: true,
        message: workflow.is_active ? 'Workflow durduruldu' : 'Workflow aktif edildi',
        severity: 'success',
      });
      loadWorkflows();
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleViewHistory = async (workflow) => {
    try {
      setHistoryLoading(true);
      setHistoryDialogOpen(true);
      const data = await api(`/${workflow.id}/history`);
      setHistoryData(data);
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
      setHistoryDialogOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ============================================================
  // FORM HELPERS
  // ============================================================
  const resetForm = () => {
    setFormData({
      name: '',
      trigger_type: 'message.created',
      trigger_config: {},
      actions: [{ type: 'send_message', data: { room_id: '', message: '' } }],
      is_active: true,
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingWorkflow(null);
    setEditDialogOpen(true);
  };

  const openEditDialog = (workflow) => {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name,
      trigger_type: workflow.trigger_type,
      trigger_config: workflow.trigger_config || {},
      actions: workflow.actions || [],
      is_active: workflow.is_active,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (workflow) => {
    setDeletingWorkflow(workflow);
    setDeleteDialogOpen(true);
  };

  // Action management
  const addAction = () => {
    setFormData(prev => ({
      ...prev,
      actions: [...prev.actions, { type: 'send_message', data: { ...DEFAULT_ACTION_DATA['send_message'] } }],
    }));
  };

  const removeAction = (index) => {
    setFormData(prev => ({
      ...prev,
      actions: prev.actions.filter((_, i) => i !== index),
    }));
  };

  const updateAction = (index, field, value) => {
    setFormData(prev => {
      const newActions = [...prev.actions];
      if (field === 'type') {
        newActions[index] = { type: value, data: { ...DEFAULT_ACTION_DATA[value] } };
      } else {
        newActions[index] = {
          ...newActions[index],
          data: { ...newActions[index].data, [field]: value },
        };
      }
      return { ...prev, actions: newActions };
    });
  };

  const updateTriggerConfig = (field, value) => {
    setFormData(prev => ({
      ...prev,
      trigger_config: { ...prev.trigger_config, [field]: value },
    }));
  };

  // ============================================================
  // FORMAT HELPERS
  // ============================================================
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Henuz calistirilmadi';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // ============================================================
  // RENDER - PAGE HEADER
  // ============================================================
  const renderHeader = () => (
    <Box sx={{
      background: COLORS.headerGradient,
      borderRadius: '20px',
      p: { xs: 3, md: 4 },
      mb: 3,
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative circles */}
      <Box sx={{
        position: 'absolute', top: -30, right: -30,
        width: 120, height: 120, borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
      }} />
      <Box sx={{
        position: 'absolute', bottom: -20, right: 80,
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, letterSpacing: '-0.5px' }}>
            Workflow Otomasyonu
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.85 }}>
            Olay tabanli otomasyon kurallari olusturun ve yonetin
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadWorkflows}
            sx={{
              color: 'white', borderColor: 'rgba(255,255,255,0.4)',
              '&:hover': { borderColor: 'white', background: 'rgba(255,255,255,0.1)' },
              borderRadius: '12px', textTransform: 'none', fontWeight: 600,
            }}
          >
            Yenile
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
            sx={{
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              color: 'white',
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              '&:hover': { background: 'rgba(255,255,255,0.3)' },
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            }}
          >
            Yeni Workflow
          </Button>
        </Box>
      </Box>

      {/* Stats row */}
      <Box sx={{ display: 'flex', gap: 3, mt: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'Toplam', value: workflows.length, icon: <WorkflowIcon /> },
          { label: 'Aktif', value: workflows.filter(w => w.is_active).length, icon: <PlayIcon /> },
          { label: 'Durdurulmus', value: workflows.filter(w => !w.is_active).length, icon: <PauseIcon /> },
          { label: 'Toplam Calistirma', value: workflows.reduce((sum, w) => sum + (w.run_count || 0), 0), icon: <TrendingUpIcon /> },
        ].map((stat) => (
          <Box key={stat.label} sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            background: 'rgba(255,255,255,0.1)', borderRadius: '12px',
            px: 2, py: 1, backdropFilter: 'blur(5px)',
          }}>
            <Box sx={{ opacity: 0.8, display: 'flex' }}>{stat.icon}</Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{stat.value}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>{stat.label}</Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );

  // ============================================================
  // RENDER - EMPTY STATE
  // ============================================================
  const renderEmptyState = () => (
    <Paper sx={{
      p: 6, textAlign: 'center', borderRadius: '16px',
      border: '2px dashed rgba(28, 97, 171, 0.2)',
      background: 'rgba(28, 97, 171, 0.02)',
    }}>
      <Box sx={{
        width: 80, height: 80, borderRadius: '50%', mx: 'auto', mb: 3,
        background: `linear-gradient(135deg, ${COLORS.primary}15, ${COLORS.secondary}15)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <WorkflowIcon sx={{ fontSize: 40, color: COLORS.primary }} />
      </Box>
      <Typography variant="h5" sx={{ fontWeight: 700, color: '#333', mb: 1 }}>
        Henuz Workflow Olusturulmadi
      </Typography>
      <Typography variant="body1" sx={{ color: '#777', mb: 3, maxWidth: 400, mx: 'auto' }}>
        Olay tabanli otomasyon kurallari olusturarak tekrar eden islerinizi otomatize edin.
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={openCreateDialog}
        sx={{
          background: COLORS.gradient,
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 600,
          px: 4, py: 1.5,
          '&:hover': { opacity: 0.9 },
        }}
      >
        Ilk Workflow'unuzu Olusturun
      </Button>
    </Paper>
  );

  // ============================================================
  // RENDER - WORKFLOW CARD
  // ============================================================
  const renderWorkflowCard = (workflow) => {
    const trigger = TRIGGER_TYPES[workflow.trigger_type] || TRIGGER_TYPES['message.created'];

    return (
      <Card
        key={workflow.id}
        sx={{
          borderRadius: '16px',
          border: '1px solid',
          borderColor: workflow.is_active ? 'rgba(139, 185, 74, 0.3)' : 'rgba(0,0,0,0.08)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 30px rgba(28, 97, 171, 0.12)',
            borderColor: COLORS.primary,
          },
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* Active indicator */}
        <Box sx={{
          position: 'absolute', top: 16, right: 16,
          width: 10, height: 10, borderRadius: '50%',
          background: workflow.is_active ? '#8bb94a' : '#bdbdbd',
          boxShadow: workflow.is_active ? '0 0 8px rgba(139, 185, 74, 0.5)' : 'none',
        }} />

        <CardContent sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: '12px',
              background: trigger.bgColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: trigger.color, flexShrink: 0,
            }}>
              {trigger.icon}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{
                fontWeight: 700, fontSize: '1rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {workflow.name}
              </Typography>
              <Chip
                size="small"
                label={trigger.label}
                sx={{
                  mt: 0.5, fontSize: '0.7rem', fontWeight: 600,
                  background: trigger.bgColor, color: trigger.color,
                  height: 22,
                }}
              />
            </Box>
          </Box>

          {/* Status and stats */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 2, mb: 2,
            p: 1.5, borderRadius: '10px', background: '#f8f9fa',
          }}>
            <Chip
              size="small"
              label={workflow.is_active ? 'Aktif' : 'Durdurulmus'}
              icon={workflow.is_active ? <PlayIcon sx={{ fontSize: 14 }} /> : <PauseIcon sx={{ fontSize: 14 }} />}
              sx={{
                fontWeight: 600, fontSize: '0.7rem',
                background: workflow.is_active ? '#e8f5e9' : '#fafafa',
                color: workflow.is_active ? '#2e7d32' : '#999',
                '& .MuiChip-icon': {
                  color: workflow.is_active ? '#2e7d32' : '#999',
                },
              }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TrendingUpIcon sx={{ fontSize: 14, color: '#999' }} />
              <Typography variant="caption" sx={{ color: '#666', fontWeight: 600 }}>
                {workflow.run_count || 0} calistirma
              </Typography>
            </Box>
          </Box>

          {/* Actions summary */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Aksiyonlar ({(workflow.actions || []).length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
              {(workflow.actions || []).map((action, i) => {
                const actionConfig = ACTION_TYPES[action.type];
                return actionConfig ? (
                  <Chip
                    key={i}
                    size="small"
                    icon={React.cloneElement(actionConfig.icon, { sx: { fontSize: 12 } })}
                    label={actionConfig.label}
                    sx={{
                      fontSize: '0.65rem', height: 22,
                      background: `${actionConfig.color}12`,
                      color: actionConfig.color,
                      '& .MuiChip-icon': { color: actionConfig.color },
                    }}
                  />
                ) : null;
              })}
            </Box>
          </Box>

          {/* Last run */}
          <Typography variant="caption" sx={{ color: '#999', display: 'block', mb: 2 }}>
            Son calistirma: {formatDate(workflow.last_run_at)}
          </Typography>

          {/* Actions */}
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title={workflow.is_active ? 'Durdur' : 'Aktif Et'}>
                <IconButton
                  size="small"
                  onClick={() => handleToggle(workflow)}
                  sx={{
                    color: workflow.is_active ? '#f57c00' : '#8bb94a',
                    '&:hover': { background: workflow.is_active ? '#fff3e0' : '#f1f8e9' },
                  }}
                >
                  {workflow.is_active ? <PauseIcon fontSize="small" /> : <PlayIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Gecmis">
                <IconButton
                  size="small"
                  onClick={() => handleViewHistory(workflow)}
                  sx={{ color: '#666', '&:hover': { background: '#f5f5f5' } }}
                >
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Duzenle">
                <IconButton
                  size="small"
                  onClick={() => openEditDialog(workflow)}
                  sx={{ color: COLORS.primary, '&:hover': { background: '#e3f2fd' } }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Sil">
                <IconButton
                  size="small"
                  onClick={() => openDeleteDialog(workflow)}
                  sx={{ color: '#e53935', '&:hover': { background: '#ffebee' } }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // ============================================================
  // RENDER - TRIGGER CONFIG FIELDS
  // ============================================================
  const renderTriggerConfigFields = () => {
    switch (formData.trigger_type) {
      case 'message.created':
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Anahtar Kelimeler (virgul ile ayirin)"
              placeholder="ornek: yardim, destek, acil"
              value={(formData.trigger_config.keywords || []).join(', ')}
              onChange={(e) => updateTriggerConfig('keywords', e.target.value.split(',').map(k => k.trim()).filter(Boolean))}
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Oda ID (opsiyonel)"
              placeholder="Belirli bir odayi dinle"
              value={formData.trigger_config.room_id || ''}
              onChange={(e) => updateTriggerConfig('room_id', e.target.value)}
              size="small"
            />
          </Box>
        );
      case 'user.joined':
        return (
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Kullanici Tipi (opsiyonel)</InputLabel>
              <Select
                value={formData.trigger_config.user_type || ''}
                onChange={(e) => updateTriggerConfig('user_type', e.target.value)}
                label="Kullanici Tipi (opsiyonel)"
              >
                <MenuItem value="">Tumu</MenuItem>
                <MenuItem value="employee">Calisan</MenuItem>
                <MenuItem value="applicant">Aday</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );
      case 'task.completed':
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Proje ID (opsiyonel)"
              placeholder="Belirli bir projedeki gorevler"
              value={formData.trigger_config.project_id || ''}
              onChange={(e) => updateTriggerConfig('project_id', e.target.value)}
              size="small"
            />
          </Box>
        );
      case 'schedule':
        return (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Cron Ifadesi"
              placeholder="0 9 * * * (Her gun saat 09:00)"
              value={formData.trigger_config.schedule || ''}
              onChange={(e) => updateTriggerConfig('schedule', e.target.value)}
              size="small"
              helperText="Ornek: 0 9 * * * = Her gun 09:00, */30 * * * * = Her 30 dakika"
            />
          </Box>
        );
      default:
        return null;
    }
  };

  // ============================================================
  // RENDER - ACTION FIELDS
  // ============================================================
  const renderActionFields = (action, index) => {
    return (
      <Paper
        key={index}
        elevation={0}
        sx={{
          p: 2, mb: 2, borderRadius: '12px',
          border: '1px solid rgba(0,0,0,0.08)',
          background: '#fafafa',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: '8px',
              background: COLORS.gradient, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700,
            }}>
              {index + 1}
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Aksiyon {index + 1}</Typography>
          </Box>
          {formData.actions.length > 1 && (
            <IconButton size="small" onClick={() => removeAction(index)} sx={{ color: '#e53935' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Aksiyon Tipi</InputLabel>
          <Select
            value={action.type}
            onChange={(e) => updateAction(index, 'type', e.target.value)}
            label="Aksiyon Tipi"
          >
            {Object.entries(ACTION_TYPES).map(([key, config]) => (
              <MenuItem key={key} value={key}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {React.cloneElement(config.icon, { sx: { fontSize: 18, color: config.color } })}
                  {config.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {action.type === 'send_message' && (
          <>
            <TextField
              fullWidth
              label="Kanal / Oda ID"
              placeholder="Mesajin gonderilecegi oda"
              value={action.data?.room_id || ''}
              onChange={(e) => updateAction(index, 'room_id', e.target.value)}
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Mesaj Icerigi"
              placeholder="Merhaba {{userName}}, hosgeldiniz!"
              value={action.data?.message || ''}
              onChange={(e) => updateAction(index, 'message', e.target.value)}
              size="small"
              multiline
              rows={2}
              helperText="Degiskenler: {{userName}}, {{userId}}, {{roomName}}"
            />
          </>
        )}

        {action.type === 'create_task' && (
          <>
            <TextField
              fullWidth
              label="Gorev Basligi"
              placeholder="Yeni gorev basligi"
              value={action.data?.title || ''}
              onChange={(e) => updateAction(index, 'title', e.target.value)}
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Atanan Kisi ID"
              placeholder="Gorev atanacak calisan ID"
              value={action.data?.assignee || ''}
              onChange={(e) => updateAction(index, 'assignee', e.target.value)}
              size="small"
            />
          </>
        )}

        {action.type === 'log_event' && (
          <TextField
            fullWidth
            label="Log Mesaji"
            placeholder="Olay kaydi mesaji"
            value={action.data?.message || ''}
            onChange={(e) => updateAction(index, 'message', e.target.value)}
            size="small"
            multiline
            rows={2}
          />
        )}
      </Paper>
    );
  };

  // ============================================================
  // RENDER - EDIT/CREATE DIALOG
  // ============================================================
  const renderEditDialog = () => (
    <Dialog
      open={editDialogOpen}
      onClose={() => { setEditDialogOpen(false); setEditingWorkflow(null); }}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '16px', maxHeight: '90vh' },
      }}
    >
      <DialogTitle sx={{
        background: COLORS.headerGradient,
        color: 'white',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WorkflowIcon />
          {editingWorkflow ? 'Workflow Duzenle' : 'Yeni Workflow Olustur'}
        </Box>
        <IconButton
          onClick={() => { setEditDialogOpen(false); setEditingWorkflow(null); }}
          sx={{ color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, mt: 1 }}>
        {/* Name & Active Toggle */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
          <TextField
            fullWidth
            label="Workflow Adi"
            placeholder="Ornek: Hosgeldiniz Mesaji"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            sx={{ flex: 1 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: COLORS.secondary },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: COLORS.secondary },
                }}
              />
            }
            label={formData.is_active ? 'Aktif' : 'Pasif'}
            sx={{ minWidth: 100 }}
          />
        </Box>

        {/* Trigger Type */}
        <Paper elevation={0} sx={{
          p: 2.5, mb: 3, borderRadius: '12px',
          border: '1px solid rgba(28, 97, 171, 0.15)',
          background: 'rgba(28, 97, 171, 0.02)',
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: COLORS.primary }}>
            Tetikleyici
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Tetikleyici Tipi</InputLabel>
            <Select
              value={formData.trigger_type}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                trigger_type: e.target.value,
                trigger_config: {},
              }))}
              label="Tetikleyici Tipi"
            >
              {Object.entries(TRIGGER_TYPES).map(([key, config]) => (
                <MenuItem key={key} value={key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {React.cloneElement(config.icon, { sx: { fontSize: 20, color: config.color } })}
                    <Typography variant="body2">{config.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Trigger config fields */}
          {renderTriggerConfigFields()}
        </Paper>

        {/* Conditions (JSON editor) */}
        <Paper elevation={0} sx={{
          p: 2.5, mb: 3, borderRadius: '12px',
          border: '1px solid rgba(0,0,0,0.08)',
          background: '#fafafa',
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: '#333' }}>
            Kosullar (JSON)
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            size="small"
            placeholder='{"keywords": ["yardim", "destek"], "room_id": "123"}'
            value={JSON.stringify(formData.trigger_config, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setFormData(prev => ({ ...prev, trigger_config: parsed }));
              } catch {
                // Allow invalid JSON while typing
              }
            }}
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'monospace', fontSize: '0.85rem',
              },
            }}
            helperText="Tetikleyici kosullarini JSON olarak duzenleyin"
          />
        </Paper>

        {/* Actions */}
        <Paper elevation={0} sx={{
          p: 2.5, mb: 1, borderRadius: '12px',
          border: '1px solid rgba(139, 185, 74, 0.2)',
          background: 'rgba(139, 185, 74, 0.02)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#333' }}>
              Aksiyonlar
            </Typography>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={addAction}
              sx={{
                textTransform: 'none', fontWeight: 600,
                color: COLORS.secondary, borderRadius: '8px',
              }}
            >
              Aksiyon Ekle
            </Button>
          </Box>

          {formData.actions.map((action, index) => renderActionFields(action, index))}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={() => { setEditDialogOpen(false); setEditingWorkflow(null); }}
          sx={{ textTransform: 'none', borderRadius: '10px', color: '#666' }}
        >
          Iptal
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !formData.name.trim()}
          sx={{
            background: COLORS.gradient,
            borderRadius: '10px',
            textTransform: 'none',
            fontWeight: 600,
            px: 4,
            '&:hover': { opacity: 0.9 },
          }}
        >
          {saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : (editingWorkflow ? 'Guncelle' : 'Olustur')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ============================================================
  // RENDER - DELETE DIALOG
  // ============================================================
  const renderDeleteDialog = () => (
    <Dialog
      open={deleteDialogOpen}
      onClose={() => { setDeleteDialogOpen(false); setDeletingWorkflow(null); }}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}
    >
      <DialogTitle sx={{ fontWeight: 700, color: '#e53935' }}>
        Workflow'u Sil
      </DialogTitle>
      <DialogContent>
        <Typography>
          <strong>"{deletingWorkflow?.name}"</strong> workflow'unu silmek istediginizden emin misiniz?
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, color: '#999' }}>
          Bu islem geri alinamaz. Tum calistirma gecmisi kaybolacaktir.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={() => { setDeleteDialogOpen(false); setDeletingWorkflow(null); }}
          sx={{ textTransform: 'none', borderRadius: '10px' }}
        >
          Iptal
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          sx={{ textTransform: 'none', borderRadius: '10px', fontWeight: 600 }}
        >
          Sil
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ============================================================
  // RENDER - HISTORY DIALOG
  // ============================================================
  const renderHistoryDialog = () => (
    <Dialog
      open={historyDialogOpen}
      onClose={() => { setHistoryDialogOpen(false); setHistoryData(null); }}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: '16px' } }}
    >
      <DialogTitle sx={{
        background: COLORS.gradientBlue,
        color: 'white',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon />
          Calistirma Gecmisi
        </Box>
        <IconButton
          onClick={() => { setHistoryDialogOpen(false); setHistoryData(null); }}
          sx={{ color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, mt: 1 }}>
        {historyLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: COLORS.primary }} />
          </Box>
        ) : historyData ? (
          <>
            {/* Summary */}
            <Paper elevation={0} sx={{
              p: 2, mb: 3, borderRadius: '12px',
              background: '#f8f9fa', border: '1px solid #eee',
            }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                {historyData.workflow_name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 3 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#999' }}>Toplam Calistirma</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.primary }}>
                    {historyData.total_runs}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#999' }}>Son Calistirma</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatDate(historyData.last_run_at)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#999' }}>Durum</Typography>
                  <Chip
                    size="small"
                    label={historyData.is_active ? 'Aktif' : 'Pasif'}
                    sx={{
                      mt: 0.5,
                      background: historyData.is_active ? '#e8f5e9' : '#fafafa',
                      color: historyData.is_active ? '#2e7d32' : '#999',
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </Box>
            </Paper>

            {/* Execution list */}
            {historyData.executions.length > 0 ? (
              <List sx={{ p: 0 }}>
                {historyData.executions.map((exec, i) => (
                  <ListItem
                    key={exec.id}
                    sx={{
                      px: 2, py: 1.5, mb: 1, borderRadius: '10px',
                      background: '#fafafa', border: '1px solid #f0f0f0',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CheckCircleIcon sx={{ color: '#8bb94a', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Calistirma #{exec.id}
                        </Typography>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                          <Typography variant="caption" sx={{ color: '#999' }}>
                            {formatDate(exec.executed_at)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#999' }}>
                            {exec.actions_executed} aksiyon
                          </Typography>
                        </Box>
                      }
                    />
                    <Chip
                      size="small"
                      label={exec.status === 'success' ? 'Basarili' : 'Hata'}
                      sx={{
                        fontSize: '0.65rem',
                        background: exec.status === 'success' ? '#e8f5e9' : '#ffebee',
                        color: exec.status === 'success' ? '#2e7d32' : '#e53935',
                        fontWeight: 600,
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <HistoryIcon sx={{ fontSize: 48, color: '#ddd', mb: 1 }} />
                <Typography variant="body2" sx={{ color: '#999' }}>
                  Henuz calistirma gecmisi yok
                </Typography>
              </Box>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      {renderHeader()}

      {/* Error state */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: '12px' }}
          action={
            <Button color="inherit" size="small" onClick={loadWorkflows}>
              Tekrar Dene
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CircularProgress sx={{ color: COLORS.primary, mb: 2 }} />
            <Typography variant="body2" sx={{ color: '#999' }}>
              Workflow'lar yukleniyor...
            </Typography>
          </Box>
        </Box>
      ) : workflows.length === 0 ? (
        renderEmptyState()
      ) : (
        /* Workflow cards grid */
        <Grid container spacing={3}>
          {workflows.map(workflow => (
            <Grid item xs={12} sm={6} md={4} key={workflow.id}>
              {renderWorkflowCard(workflow)}
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialogs */}
      {renderEditDialog()}
      {renderDeleteDialog()}
      {renderHistoryDialog()}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: '12px', fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
