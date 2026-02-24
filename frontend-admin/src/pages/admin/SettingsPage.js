// Settings Page - Confluence Tarzi Ayarlar Sayfasi
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Button, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Switch,
  FormControlLabel, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Avatar, Tooltip, Alert, Snackbar, MenuItem, Select, FormControl,
  InputLabel, Stack, Grid, Checkbox, TableSortLabel, Collapse, Divider,
  TablePagination, Badge, LinearProgress, InputAdornment, Card, CardContent,
  List, ListItemButton, ListItemIcon, ListItemText
} from '@mui/material';
import {
  Business as BusinessIcon, People as PeopleIcon, Security as SecurityIcon,
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  CheckCircle as CheckIcon, Search as SearchIcon,
  FileDownload as FileDownloadIcon, History as HistoryIcon,
  KeyboardArrowDown as ArrowDownIcon, KeyboardArrowUp as ArrowUpIcon,
  FilterList as FilterIcon, Clear as ClearIcon, BarChart as BarChartIcon,
  Refresh as RefreshIcon, SelectAll as SelectAllIcon,
  CheckBox as CheckBoxIcon, IndeterminateCheckBox as IndeterminateIcon,
  Block as BlockIcon, ToggleOn as ToggleOnIcon, ToggleOff as ToggleOffIcon,
  Upload as UploadIcon, Info as InfoIcon, Circle as CircleIcon,
  ExpandMore as ExpandMoreIcon, Close as CloseIcon, Save as SaveIcon,
  VpnKey as PermissionsIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  Devices as DevicesIcon,
  Timer as TimerIcon,
  Lock as LockIcon,
  Login as LoginIcon
} from '@mui/icons-material';
import { useSite } from '../../contexts/SiteContext';
import { useEmployeeAuth, PERMISSIONS } from '../../auth/employee/EmployeeAuthContext';

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

const ROLE_CONFIG = {
  SUPER_ADMIN: { label: 'Super Admin', color: '#1c61ab', bgColor: '#e3f2fd' },
  ADMIN: { label: 'Admin', color: '#1c61ab', bgColor: '#e3f2fd' },
  HR_MANAGER: { label: 'HR Muduru', color: '#2e7d32', bgColor: '#e8f5e9' },
  HR: { label: 'Insan Kaynaklari', color: '#8bb94a', bgColor: '#f1f8e9' },
  HR_EXPERT: { label: 'HR Uzmani', color: '#0277bd', bgColor: '#e1f5fe' },
  RECRUITER: { label: 'Ise Alim Uzmani', color: '#8bb94a', bgColor: '#f1f8e9' },
  HR_ASSISTANT: { label: 'HR Asistani', color: '#f57c00', bgColor: '#fff3e0' },
  USER: { label: 'Kullanici', color: '#1c61ab', bgColor: '#e3f2fd' },
};

const PERMISSION_LIST = [
  { key: 'dashboard_view', label: 'Dashboard Goruntuleme' },
  { key: 'application_manage', label: 'Basvuru Yonetimi' },
  { key: 'profile_manage', label: 'Profil Yonetimi' },
  { key: 'user_manage', label: 'Kullanici Yonetimi' },
  { key: 'site_manage', label: 'Site Yonetimi' },
  { key: 'permission_manage', label: 'Yetki Yonetimi' },
  { key: 'document_manage', label: 'Dokuman Yonetimi' },
  { key: 'mail_send', label: 'Mail Gonderme' },
  { key: 'report_view', label: 'Rapor Goruntuleme' },
  { key: 'system_settings', label: 'Sistem Ayarlari' },
  { key: 'chat_manage', label: 'Chat Yonetimi' },
  { key: 'employee_manage', label: 'Calisan Yonetimi' },
  { key: 'payroll_view', label: 'Maas Goruntuleme' },
  { key: 'calendar_manage', label: 'Takvim Yonetimi' },
];

const DEFAULT_PERMISSION_MATRIX = {
  SUPER_ADMIN: Object.fromEntries(PERMISSION_LIST.map(p => [p.key, true])),
  ADMIN: {
    dashboard_view: true, application_manage: true, profile_manage: true,
    user_manage: true, site_manage: false, permission_manage: false,
    document_manage: true, mail_send: true, report_view: true,
    system_settings: false, chat_manage: true, employee_manage: true,
    payroll_view: true, calendar_manage: true,
  },
  HR: {
    dashboard_view: true, application_manage: true, profile_manage: true,
    user_manage: false, site_manage: false, permission_manage: false,
    document_manage: true, mail_send: true, report_view: true,
    system_settings: false, chat_manage: true, employee_manage: true,
    payroll_view: false, calendar_manage: true,
  },
  HR_MANAGER: {
    dashboard_view: true, application_manage: true, profile_manage: true,
    user_manage: false, site_manage: false, permission_manage: false,
    document_manage: true, mail_send: true, report_view: true,
    system_settings: false, chat_manage: true, employee_manage: true,
    payroll_view: true, calendar_manage: true,
  },
  HR_EXPERT: {
    dashboard_view: true, application_manage: true, profile_manage: true,
    user_manage: false, site_manage: false, permission_manage: false,
    document_manage: false, mail_send: true, report_view: true,
    system_settings: false, chat_manage: false, employee_manage: false,
    payroll_view: false, calendar_manage: true,
  },
  RECRUITER: {
    dashboard_view: true, application_manage: true, profile_manage: true,
    user_manage: false, site_manage: false, permission_manage: false,
    document_manage: false, mail_send: true, report_view: false,
    system_settings: false, chat_manage: true, employee_manage: false,
    payroll_view: false, calendar_manage: true,
  },
  HR_ASSISTANT: {
    dashboard_view: true, application_manage: false, profile_manage: false,
    user_manage: false, site_manage: false, permission_manage: false,
    document_manage: false, mail_send: false, report_view: false,
    system_settings: false, chat_manage: false, employee_manage: false,
    payroll_view: false, calendar_manage: false,
  },
  USER: {
    dashboard_view: true, application_manage: false, profile_manage: false,
    user_manage: false, site_manage: false, permission_manage: false,
    document_manage: false, mail_send: false, report_view: false,
    system_settings: false, chat_manage: false, employee_manage: false,
    payroll_view: false, calendar_manage: false,
  },
};

const COLOR_PALETTE = ['#FF0000', '#0000FF', '#00FF00', '#FF9800', '#9C27B0', '#00BCD4'];

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function SettingsPage() {
  const { sites: contextSites, addSite: ctxAddSite, updateSite: ctxUpdateSite, deleteSite: ctxDeleteSite } = useSite();
  const { currentUser, isLoading: authLoading, hasPermission } = useEmployeeAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Section state (Confluence-style navigation)
  const [activeSection, setActiveSection] = useState(searchParams.get('section') || 'profile');

  // Backend connection
  const [useBackend, setUseBackend] = useState(false);
  const [backendLoading, setBackendLoading] = useState(false);

  // Sites state
  const [sites, setSites] = useState([]);
  const [siteSearch, setSiteSearch] = useState('');
  const [siteSort, setSiteSort] = useState({ field: 'created_at', order: 'desc' });
  const [sitePage, setSitePage] = useState(0);
  const [siteRowsPerPage, setSiteRowsPerPage] = useState(10);
  const [siteFilter, setSiteFilter] = useState({ status: 'all' });
  const [selectedSites, setSelectedSites] = useState([]);
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [siteForm, setSiteForm] = useState({ code: '', name: '', color: '#1c61ab', is_active: true, description: '' });

  // Users state
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSort, setUserSort] = useState({ field: 'created_at', order: 'desc' });
  const [userPage, setUserPage] = useState(0);
  const [userRowsPerPage, setUserRowsPerPage] = useState(10);
  const [userFilter, setUserFilter] = useState({ role: 'all', status: 'all', site: 'all' });
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ first_name: '', last_name: '', email: '', role: 'USER', site_code: '', is_active: true, password: '' });

  // Permissions state
  const [permissionMatrix, setPermissionMatrix] = useState(DEFAULT_PERMISSION_MATRIX);
  const [editingRole, setEditingRole] = useState(null);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [tempPermissions, setTempPermissions] = useState({});

  // Audit log state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilter, setAuditFilter] = useState({ module: 'all', action: 'all' });
  const [auditPage, setAuditPage] = useState(0);
  const [auditRowsPerPage, setAuditRowsPerPage] = useState(20);
  const [auditSort, setAuditSort] = useState({ field: 'created_at', order: 'desc' });
  const [expandedLog, setExpandedLog] = useState(null);

  // Stats state
  const [stats, setStats] = useState(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Delete confirm
  const [deleteDialog, setDeleteDialog] = useState({ open: false, type: '', item: null });

  // ============================================================
  // API HELPERS
  // ============================================================
  const api = useCallback(async (path, options = {}) => {
    try {
      const url = `${API_BASE}/api/management${path}`;
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
      });
      if (options.method === 'DELETE' && res.status === 204) return { success: true };
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/csv')) {
        return res.blob();
      }
      return res.json();
    } catch (err) {
      throw err;
    }
  }, []);

  // ============================================================
  // DATA LOADING
  // ============================================================
  const loadSitesFromLocal = useCallback(() => {
    const localSites = contextSites.map((s, i) => ({
      id: i + 1,
      code: s.code,
      name: s.name,
      color: s.color || '#1c61ab',
      is_active: s.isActive !== false,
      description: s.description || '',
      total_employees: s.totalEmployees || 0,
      total_applications: s.totalApplications || 0,
      created_at: s.createdAt || new Date().toLocaleDateString('tr-TR'),
      updated_at: s.updatedAt || new Date().toLocaleDateString('tr-TR'),
    }));
    setSites(localSites);
  }, [contextSites]);

  const loadSitesFromBackend = useCallback(async () => {
    try {
      setBackendLoading(true);
      const result = await api(`/sites?page=${sitePage + 1}&limit=${siteRowsPerPage}&search=${siteSearch}&sort_by=${siteSort.field}&sort_order=${siteSort.order}${siteFilter.status !== 'all' ? `&is_active=${siteFilter.status === 'active'}` : ''}`);
      // brand_color -> color mapping
      const mapped = (result.data || []).map(s => ({ ...s, color: s.brand_color || s.color || '#1c61ab' }));
      setSites(mapped);
    } catch {
      // Backend unavailable, load from local without changing useBackend to avoid loop
      loadSitesFromLocal();
    } finally {
      setBackendLoading(false);
    }
  }, [api, sitePage, siteRowsPerPage, siteSearch, siteSort, siteFilter, loadSitesFromLocal]);

  const loadUsersFromLocal = useCallback(() => {
    const stored = JSON.parse(localStorage.getItem(`management_users_${localStorage.getItem('optima_current_site') || 'FXB'}`) || '[]');
    if (stored.length === 0) {
      const defaultUsers = [{
        id: 1, first_name: 'Super', last_name: 'Admin', email: 'admin@optima.com',
        role: 'SUPER_ADMIN', site_code: null, is_active: true,
        created_at: '15.01.2024', last_login: new Date().toLocaleDateString('tr-TR'),
      }];
      localStorage.setItem(`management_users_${localStorage.getItem('optima_current_site') || 'FXB'}`, JSON.stringify(defaultUsers));
      setUsers(defaultUsers);
    } else {
      setUsers(stored);
    }
  }, []);

  const loadUsersFromBackend = useCallback(async () => {
    try {
      setBackendLoading(true);
      const params = new URLSearchParams({
        page: String(userPage + 1), limit: String(userRowsPerPage),
        search: userSearch, sort_by: userSort.field, sort_order: userSort.order,
      });
      if (userFilter.role !== 'all') params.set('role', userFilter.role);
      if (userFilter.status !== 'all') params.set('is_active', String(userFilter.status === 'active'));
      if (userFilter.site !== 'all') params.set('site_code', userFilter.site);

      const result = await api(`/users?${params}`);
      setUsers(result.data || []);
    } catch {
      loadUsersFromLocal();
    } finally {
      setBackendLoading(false);
    }
  }, [api, userPage, userRowsPerPage, userSearch, userSort, userFilter, loadUsersFromLocal]);

  const loadAuditLogs = useCallback(async () => {
    if (!useBackend) {
      const stored = JSON.parse(localStorage.getItem(getAuditStorageKey()) || '[]');
      setAuditLogs(stored);
      return;
    }
    try {
      setBackendLoading(true);
      const params = new URLSearchParams({
        page: String(auditPage + 1), limit: String(auditRowsPerPage),
        search: auditSearch, sort_by: auditSort.field, sort_order: auditSort.order,
      });
      if (auditFilter.module !== 'all') params.set('module', auditFilter.module);
      if (auditFilter.action !== 'all') params.set('action', auditFilter.action);

      const result = await api(`/audit-logs?${params}`);
      setAuditLogs(result.data || []);
    } catch {
      const stored = JSON.parse(localStorage.getItem(getAuditStorageKey()) || '[]');
      setAuditLogs(stored);
    } finally {
      setBackendLoading(false);
    }
  }, [useBackend, api, auditPage, auditRowsPerPage, auditSearch, auditSort, auditFilter]);

  const sitesRef = React.useRef(sites);
  sitesRef.current = sites;
  const usersRef = React.useRef(users);
  usersRef.current = users;
  const auditLogsRef = React.useRef(auditLogs);
  auditLogsRef.current = auditLogs;

  const loadStats = useCallback(async () => {
    if (!useBackend) {
      setStats({
        sites: { total: sitesRef.current.length, active: sitesRef.current.filter(s => s.is_active).length },
        users: { total: usersRef.current.length, active: usersRef.current.filter(u => u.is_active).length },
        auditLogs: { total: auditLogsRef.current.length },
      });
      return;
    }
    try {
      const result = await api('/stats');
      setStats(result);
    } catch {
      setStats({
        sites: { total: sitesRef.current.length, active: sitesRef.current.filter(s => s.is_active).length },
        users: { total: usersRef.current.length, active: usersRef.current.filter(u => u.is_active).length },
        auditLogs: { total: auditLogsRef.current.length },
      });
    }
  }, [useBackend, api]);

  // Check backend availability
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${API_BASE}/health`);
        if (res.ok) {
          setUseBackend(true);
          // Init tables
          try { await api('/init', { method: 'POST' }); } catch { }
        }
      } catch {
        setUseBackend(false);
      }
    };
    checkBackend();
  }, [api]);

  // Sync URL search params with activeSection
  const handleSectionChange = (section) => {
    setActiveSection(section);
    setSearchParams({ section });
  };

  // Load data on section change or useBackend change
  useEffect(() => {
    if (activeSection === 'sites') {
      useBackend ? loadSitesFromBackend() : loadSitesFromLocal();
    } else if (activeSection === 'users') {
      useBackend ? loadUsersFromBackend() : loadUsersFromLocal();
    } else if (activeSection === 'stats') {
      loadStats();
    } else if (activeSection === 'audit') {
      loadAuditLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, useBackend]);

  // Reload sites on search/filter/sort/page changes
  useEffect(() => {
    if (activeSection === 'sites') useBackend ? loadSitesFromBackend() : loadSitesFromLocal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteSearch, siteSort, sitePage, siteRowsPerPage, siteFilter]);

  // Reload users on search/filter/sort/page changes
  useEffect(() => {
    if (activeSection === 'users') useBackend ? loadUsersFromBackend() : loadUsersFromLocal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch, userSort, userPage, userRowsPerPage, userFilter]);

  // Reload audit logs on search/filter/sort/page changes
  useEffect(() => {
    if (activeSection === 'audit') loadAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditSearch, auditSort, auditPage, auditRowsPerPage, auditFilter]);

  // ============================================================
  // LOCAL AUDIT LOG HELPER
  // ============================================================
  const getCurrentUserInfo = () => {
    try {
      const session = JSON.parse(localStorage.getItem('employee_session') || '{}');
      const employees = JSON.parse(localStorage.getItem('employees') || '[]');
      const user = employees.find(e => e.id === session.userId);
      return {
        id: user?.id || session.userId,
        name: user ? `${user.firstName} ${user.lastName}` : 'Bilinmiyor',
        email: user?.email || session.email || 'bilinmiyor',
        role: user?.role || 'UNKNOWN',
        roleLabel: ROLE_CONFIG[user?.role]?.label || user?.role || 'Bilinmiyor',
        siteCode: user?.siteCode || localStorage.getItem('optima_current_site') || 'FXB',
      };
    } catch {
      return { id: null, name: 'Sistem', email: 'system', role: 'SYSTEM', roleLabel: 'Sistem', siteCode: 'FXB' };
    }
  };

  // Gercek IP adresini cache'le
  const realIpRef = React.useRef(null);
  React.useEffect(() => {
    const fetchRealIP = async () => {
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        realIpRef.current = data.ip;
      } catch {
        realIpRef.current = null;
      }
    };
    fetchRealIP();
  }, []);

  const getAuditStorageKey = () => {
    const siteCode = localStorage.getItem('optima_current_site') || 'FXB';
    return `management_audit_logs_${siteCode}`;
  };

  const addLocalAuditLog = (action, module, targetName, details = {}) => {
    const userInfo = getCurrentUserInfo();
    const now = new Date();
    const log = {
      id: Date.now(),
      action,
      module,
      target_name: targetName,
      details: {
        ...details,
        tarayici: navigator.userAgent?.substring(0, 80),
      },
      user_id: userInfo.id,
      user_name: userInfo.name,
      user_email: userInfo.email,
      user_role: userInfo.role,
      user_role_label: userInfo.roleLabel,
      site_code: userInfo.siteCode,
      created_at: now.toISOString(),
      formatted_date: now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      formatted_time: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ip_address: realIpRef.current || 'bekleniyor',
      platform: navigator.platform,
    };
    const storageKey = getAuditStorageKey();
    const logs = JSON.parse(localStorage.getItem(storageKey) || '[]');
    logs.unshift(log);
    localStorage.setItem(storageKey, JSON.stringify(logs.slice(0, 500)));
  };

  // ============================================================
  // SITE CRUD (with fallback)
  // ============================================================
  const handleSaveSite = async () => {
    if (!siteForm.code || !siteForm.name) {
      setSnackbar({ open: true, message: 'Site kodu ve adi zorunludur', severity: 'error' });
      return;
    }

    try {
      if (useBackend) {
        if (editingSite) {
          await api(`/sites/${editingSite.id}`, { method: 'PUT', body: JSON.stringify(siteForm) });
        } else {
          await api('/sites', { method: 'POST', body: JSON.stringify(siteForm) });
        }
        loadSitesFromBackend();
      } else {
        if (editingSite) {
          const updated = sites.map(s => s.id === editingSite.id ? {
            ...s, ...siteForm, updated_at: new Date().toLocaleDateString('tr-TR')
          } : s);
          setSites(updated);
          try { ctxUpdateSite(editingSite.code, { name: siteForm.name, color: siteForm.color, isActive: siteForm.is_active }); } catch { }
          addLocalAuditLog('UPDATE', 'SITE', siteForm.name, {
            eski: { ad: editingSite.name, kod: editingSite.code, durum: editingSite.is_active ? 'Aktif' : 'Pasif' },
            yeni: { ad: siteForm.name, kod: siteForm.code, durum: siteForm.is_active ? 'Aktif' : 'Pasif' }
          });
        } else {
          const newSite = { ...siteForm, id: Date.now(), total_employees: 0, total_applications: 0, created_at: new Date().toLocaleDateString('tr-TR'), updated_at: new Date().toLocaleDateString('tr-TR') };
          setSites([...sites, newSite]);
          try { ctxAddSite({ code: siteForm.code, name: siteForm.name, color: siteForm.color, isActive: siteForm.is_active }); } catch { }
          addLocalAuditLog('CREATE', 'SITE', siteForm.name, {
            site_kodu: siteForm.code, aciklama: siteForm.description || '-', durum: siteForm.is_active ? 'Aktif' : 'Pasif'
          });
        }
      }
      setSiteDialogOpen(false);
      setEditingSite(null);
      resetSiteForm();
      setSnackbar({ open: true, message: editingSite ? 'Site guncellendi' : 'Site olusturuldu', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Hata olustu', severity: 'error' });
    }
  };

  const handleDeleteSite = async () => {
    const item = deleteDialog.item;
    try {
      if (useBackend) {
        await api(`/sites/${item.id}`, { method: 'DELETE' });
        loadSitesFromBackend();
      } else {
        setSites(sites.filter(s => s.id !== item.id));
        try { ctxDeleteSite(item.code); } catch { }
        addLocalAuditLog('DELETE', 'SITE', item.name, { site_kodu: item.code, durum: item.is_active ? 'Aktif' : 'Pasif' });
      }
      setDeleteDialog({ open: false, type: '', item: null });
      setSnackbar({ open: true, message: 'Site silindi', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Silme hatasi', severity: 'error' });
    }
  };

  const handleToggleSite = async (site) => {
    try {
      if (useBackend) {
        await api(`/sites/${site.id}/toggle`, { method: 'PATCH', body: JSON.stringify({}) });
        loadSitesFromBackend();
      } else {
        const updated = sites.map(s => s.id === site.id ? { ...s, is_active: !s.is_active, updated_at: new Date().toLocaleDateString('tr-TR') } : s);
        setSites(updated);
        try { ctxUpdateSite(site.code, { isActive: !site.is_active }); } catch { }
        addLocalAuditLog(site.is_active ? 'DEACTIVATE' : 'ACTIVATE', 'SITE', site.name, { site_kodu: site.code, yeni_durum: site.is_active ? 'Pasif' : 'Aktif' });
      }
      setSnackbar({ open: true, message: `Site ${site.is_active ? 'deaktif' : 'aktif'} edildi`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleBulkSiteAction = async (action) => {
    if (selectedSites.length === 0) return;
    try {
      if (useBackend) {
        await api('/sites/bulk', { method: 'POST', body: JSON.stringify({ action, ids: selectedSites }) });
        loadSitesFromBackend();
      } else {
        if (action === 'activate') {
          setSites(sites.map(s => selectedSites.includes(s.id) ? { ...s, is_active: true } : s));
        } else if (action === 'deactivate') {
          setSites(sites.map(s => selectedSites.includes(s.id) ? { ...s, is_active: false } : s));
        } else if (action === 'delete') {
          setSites(sites.filter(s => !selectedSites.includes(s.id)));
        }
        addLocalAuditLog('BULK_ACTION', 'SITE', `${selectedSites.length} site`, { action });
      }
      setSelectedSites([]);
      setSnackbar({ open: true, message: `Toplu islem tamamlandi (${selectedSites.length} site)`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  // ============================================================
  // USER CRUD (with fallback)
  // ============================================================
  // Sync user to login-compatible employees localStorage
  const syncUserToEmployees = (user, password) => {
    try {
      const employees = JSON.parse(localStorage.getItem('employees') || '[]');
      const existingIdx = employees.findIndex(e => e.email.toLowerCase() === user.email.toLowerCase());
      const employeeData = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        siteId: user.site_code || null,
        siteName: user.site_code || 'Tum Siteler',
        isActive: user.is_active,
        passwordHash: btoa(unescape(encodeURIComponent(password))),
        createdAt: user.created_at || new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        // Update - preserve passwordHash if no new password
        if (!password) employeeData.passwordHash = employees[existingIdx].passwordHash;
        employees[existingIdx] = { ...employees[existingIdx], ...employeeData };
      } else {
        employees.push(employeeData);
      }
      localStorage.setItem('employees', JSON.stringify(employees));
    } catch (err) {
      console.error('Employee sync error:', err);
    }
  };

  const handleSaveUser = async () => {
    if (!userForm.first_name || !userForm.last_name || !userForm.email) {
      setSnackbar({ open: true, message: 'Ad, soyad ve email zorunludur', severity: 'error' });
      return;
    }
    if (!editingUser && !userForm.password) {
      setSnackbar({ open: true, message: 'Yeni kullanici icin sifre zorunludur', severity: 'error' });
      return;
    }

    try {
      if (useBackend) {
        if (editingUser) {
          await api(`/users/${editingUser.id}`, { method: 'PUT', body: JSON.stringify(userForm) });
          syncUserToEmployees({ ...editingUser, ...userForm }, userForm.password);
        } else {
          const result = await api('/users', { method: 'POST', body: JSON.stringify(userForm) });
          syncUserToEmployees({ ...userForm, id: result?.id || Date.now(), created_at: new Date().toISOString() }, userForm.password);
        }
        loadUsersFromBackend();
      } else {
        if (editingUser) {
          const updated = users.map(u => u.id === editingUser.id ? { ...u, ...userForm } : u);
          setUsers(updated);
          localStorage.setItem(`management_users_${localStorage.getItem('optima_current_site') || 'FXB'}`, JSON.stringify(updated));
          syncUserToEmployees({ ...editingUser, ...userForm }, userForm.password);
          addLocalAuditLog('UPDATE', 'USER', `${userForm.first_name} ${userForm.last_name}`, {
            degisiklikler: { email: userForm.email, rol: ROLE_CONFIG[userForm.role]?.label, site: userForm.site_code || 'Tum Siteler', durum: userForm.is_active ? 'Aktif' : 'Pasif' }
          });
        } else {
          const newUser = { ...userForm, id: Date.now(), created_at: new Date().toISOString(), last_login: null };
          const updated = [...users, newUser];
          setUsers(updated);
          localStorage.setItem(`management_users_${localStorage.getItem('optima_current_site') || 'FXB'}`, JSON.stringify(updated));
          syncUserToEmployees(newUser, userForm.password);
          addLocalAuditLog('CREATE', 'USER', `${userForm.first_name} ${userForm.last_name}`, {
            email: userForm.email, rol: ROLE_CONFIG[userForm.role]?.label, site: userForm.site_code || 'Tum Siteler'
          });
        }
      }
      setUserDialogOpen(false);
      setEditingUser(null);
      resetUserForm();
      setSnackbar({ open: true, message: editingUser ? 'Kullanici guncellendi' : 'Kullanici olusturuldu', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Hata olustu', severity: 'error' });
    }
  };

  const handleDeleteUser = async () => {
    const item = deleteDialog.item;
    try {
      if (useBackend) {
        await api(`/users/${item.id}`, { method: 'DELETE' });
        loadUsersFromBackend();
      } else {
        const updated = users.filter(u => u.id !== item.id);
        setUsers(updated);
        localStorage.setItem(`management_users_${localStorage.getItem('optima_current_site') || 'FXB'}`, JSON.stringify(updated));
        addLocalAuditLog('DELETE', 'USER', `${item.first_name} ${item.last_name}`, { email: item.email, rol: ROLE_CONFIG[item.role]?.label, site: item.site_code || 'Tum Siteler' });
      }
      setDeleteDialog({ open: false, type: '', item: null });
      setSnackbar({ open: true, message: 'Kullanici silindi', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleToggleUser = async (user) => {
    try {
      if (useBackend) {
        await api(`/users/${user.id}/toggle`, { method: 'PATCH', body: JSON.stringify({}) });
        loadUsersFromBackend();
      } else {
        const updated = users.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u);
        setUsers(updated);
        localStorage.setItem(`management_users_${localStorage.getItem('optima_current_site') || 'FXB'}`, JSON.stringify(updated));
        addLocalAuditLog(user.is_active ? 'DEACTIVATE' : 'ACTIVATE', 'USER', `${user.first_name} ${user.last_name}`, { email: user.email, yeni_durum: user.is_active ? 'Pasif' : 'Aktif' });
      }
      setSnackbar({ open: true, message: `Kullanici ${user.is_active ? 'deaktif' : 'aktif'} edildi`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  const handleBulkUserAction = async (action) => {
    if (selectedUsers.length === 0) return;
    try {
      if (useBackend) {
        await api('/users/bulk', { method: 'POST', body: JSON.stringify({ action, ids: selectedUsers }) });
        loadUsersFromBackend();
      } else {
        let updated;
        if (action === 'activate') {
          updated = users.map(u => selectedUsers.includes(u.id) ? { ...u, is_active: true } : u);
        } else if (action === 'deactivate') {
          updated = users.map(u => selectedUsers.includes(u.id) ? { ...u, is_active: false } : u);
        } else if (action === 'delete') {
          updated = users.filter(u => !selectedUsers.includes(u.id));
        } else {
          return;
        }
        setUsers(updated);
        localStorage.setItem(`management_users_${localStorage.getItem('optima_current_site') || 'FXB'}`, JSON.stringify(updated));
        addLocalAuditLog('BULK_ACTION', 'USER', `${selectedUsers.length} kullanici`, { action });
      }
      setSelectedUsers([]);
      setSnackbar({ open: true, message: `Toplu islem tamamlandi (${selectedUsers.length} kullanici)`, severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  // ============================================================
  // PERMISSION SAVE
  // ============================================================
  const handleSavePermissions = async () => {
    try {
      const updatedMatrix = { ...permissionMatrix, [editingRole]: tempPermissions };
      if (useBackend) {
        await api(`/permissions/${editingRole}`, { method: 'PUT', body: JSON.stringify({ permissions: tempPermissions }) });
      }
      setPermissionMatrix(updatedMatrix);
      localStorage.setItem(`management_permissions_${localStorage.getItem('optima_current_site') || 'FXB'}`, JSON.stringify(updatedMatrix));
      addLocalAuditLog('PERMISSION_CHANGE', 'PERMISSION', editingRole);
      setPermDialogOpen(false);
      setEditingRole(null);
      setSnackbar({ open: true, message: 'Yetkiler guncellendi', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message, severity: 'error' });
    }
  };

  // ============================================================
  // CSV EXPORT
  // ============================================================
  const handleExport = async (type) => {
    try {
      if (useBackend) {
        const blob = await api(`/${type}/export`);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type === 'sites' ? 'siteler' : type === 'users' ? 'kullanicilar' : 'audit-log'}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        let csv = '\uFEFF'; // BOM
        if (type === 'sites') {
          csv += 'Kod;Ad;Durum;Olusturulma;Guncelleme\n';
          filteredSites.forEach(s => {
            csv += `${s.code};${s.name};${s.is_active ? 'Aktif' : 'Pasif'};${s.created_at};${s.updated_at}\n`;
          });
        } else if (type === 'users') {
          csv += 'Ad;Soyad;E-posta;Rol;Site;Durum;Kayit Tarihi;Son Giris\n';
          filteredUsers.forEach(u => {
            csv += `${u.first_name};${u.last_name};${u.email};${ROLE_CONFIG[u.role]?.label || u.role};${u.site_code || 'Tum Siteler'};${u.is_active ? 'Aktif' : 'Pasif'};${u.created_at || ''};${u.last_login || 'Henuz giris yok'}\n`;
          });
        } else if (type === 'audit-logs') {
          csv += 'Tarih;Modul;Islem;Hedef;Kullanici;IP\n';
          filteredAuditLogs.forEach(l => {
            csv += `${formatDate(l.created_at)};${l.module};${l.action};${l.target_name || '-'};${l.user_name || '-'};${l.ip_address || '-'}\n`;
          });
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type === 'sites' ? 'siteler' : type === 'users' ? 'kullanicilar' : 'audit-log'}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      setSnackbar({ open: true, message: 'CSV indirildi', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: 'Export hatasi: ' + err.message, severity: 'error' });
    }
  };

  // ============================================================
  // HELPERS
  // ============================================================
  const resetSiteForm = () => setSiteForm({ code: '', name: '', color: '#1c61ab', is_active: true, description: '' });
  const resetUserForm = () => setUserForm({ first_name: '', last_name: '', email: '', role: 'USER', site_code: '', is_active: true, password: '' });

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setUserForm(prev => ({ ...prev, password }));
    return password;
  };

  const formatDate = (d) => {
    if (!d) return '-';
    if (typeof d === 'string' && d.includes('.')) return d;
    try { return new Date(d).toLocaleDateString('tr-TR'); } catch { return d; }
  };

  const formatDateTime = (d) => {
    if (!d) return '-';
    try { return new Date(d).toLocaleString('tr-TR'); } catch { return d; }
  };

  // Sort helper for local data
  const sortData = (data, sortConfig) => {
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.field] || '';
      const bVal = b[sortConfig.field] || '';
      const cmp = String(aVal).localeCompare(String(bVal), 'tr');
      return sortConfig.order === 'asc' ? cmp : -cmp;
    });
  };

  // ============================================================
  // FILTERED & SORTED DATA (local mode)
  // ============================================================
  const filteredSites = useMemo(() => {
    if (useBackend) return sites; // Backend handles filtering
    let data = [...sites];
    if (siteSearch) {
      const s = siteSearch.toLowerCase();
      data = data.filter(site => site.name.toLowerCase().includes(s) || site.code.toLowerCase().includes(s));
    }
    if (siteFilter.status !== 'all') {
      data = data.filter(site => siteFilter.status === 'active' ? site.is_active : !site.is_active);
    }
    data = sortData(data, siteSort);
    return data;
  }, [sites, siteSearch, siteFilter, siteSort, useBackend]);

  const paginatedSites = useMemo(() => {
    if (useBackend) return filteredSites;
    return filteredSites.slice(sitePage * siteRowsPerPage, (sitePage + 1) * siteRowsPerPage);
  }, [filteredSites, sitePage, siteRowsPerPage, useBackend]);

  const filteredUsers = useMemo(() => {
    if (useBackend) return users;
    let data = [...users];
    if (userSearch) {
      const s = userSearch.toLowerCase();
      data = data.filter(u => `${u.first_name} ${u.last_name}`.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    if (userFilter.role !== 'all') data = data.filter(u => u.role === userFilter.role);
    if (userFilter.status !== 'all') data = data.filter(u => userFilter.status === 'active' ? u.is_active : !u.is_active);
    if (userFilter.site !== 'all') data = data.filter(u => u.site_code === userFilter.site);
    data = sortData(data, userSort);
    return data;
  }, [users, userSearch, userFilter, userSort, useBackend]);

  const paginatedUsers = useMemo(() => {
    if (useBackend) return filteredUsers;
    return filteredUsers.slice(userPage * userRowsPerPage, (userPage + 1) * userRowsPerPage);
  }, [filteredUsers, userPage, userRowsPerPage, useBackend]);

  const filteredAuditLogs = useMemo(() => {
    if (useBackend) return auditLogs;
    let data = [...auditLogs];
    if (auditSearch) {
      const s = auditSearch.toLowerCase();
      data = data.filter(l => (l.target_name || '').toLowerCase().includes(s) || (l.user_name || '').toLowerCase().includes(s));
    }
    if (auditFilter.module !== 'all') data = data.filter(l => l.module === auditFilter.module);
    if (auditFilter.action !== 'all') data = data.filter(l => l.action === auditFilter.action);
    data = sortData(data, auditSort);
    return data;
  }, [auditLogs, auditSearch, auditFilter, auditSort, useBackend]);

  const paginatedAuditLogs = useMemo(() => {
    if (useBackend) return filteredAuditLogs;
    return filteredAuditLogs.slice(auditPage * auditRowsPerPage, (auditPage + 1) * auditRowsPerPage);
  }, [filteredAuditLogs, auditPage, auditRowsPerPage, useBackend]);

  // ============================================================
  // SORT HANDLER
  // ============================================================
  const createSortHandler = (setter) => (field) => {
    setter(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
    }));
  };
  const handleSiteSort = createSortHandler(setSiteSort);
  const handleUserSort = createSortHandler(setUserSort);
  const handleAuditSort = createSortHandler(setAuditSort);

  // ============================================================
  // TABLE HEADER STYLE (InvitationsPage uyumlu minimal stil)
  // ============================================================
  const headerCellSx = {
    fontWeight: 700,
    fontSize: '0.85rem',
    py: 1.5,
    whiteSpace: 'nowrap',
    color: '#1a1a2e',
  };

  const rowHoverSx = {
    transition: 'all 0.15s ease',
    '&:hover': {
      backgroundColor: 'rgba(28, 97, 171, 0.02)',
    },
  };

  // ============================================================
  // RENDER: SITE TAB
  // ============================================================
  const renderSiteTab = () => (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small" placeholder="Site ara..." value={siteSearch}
            onChange={(e) => { setSiteSearch(e.target.value); setSitePage(0); }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: COLORS.primary }} /></InputAdornment>,
              endAdornment: siteSearch && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSiteSearch('')}><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: 2, '&:hover fieldset': { borderColor: COLORS.primary }, '&.Mui-focused fieldset': { borderColor: COLORS.primary } } }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select value={siteFilter.status} onChange={(e) => { setSiteFilter({ ...siteFilter, status: e.target.value }); setSitePage(0); }}
              sx={{ borderRadius: 2, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: COLORS.primary } }}>
              <MenuItem value="all">Tum Durumlar</MenuItem>
              <MenuItem value="active">Aktif</MenuItem>
              <MenuItem value="inactive">Pasif</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {selectedSites.length > 0 && (
            <>
              <Chip label={`${selectedSites.length} secili`} color="primary" size="small" onDelete={() => setSelectedSites([])} sx={{ fontWeight: 600 }} />
              <Button size="small" startIcon={<CheckIcon />} onClick={() => handleBulkSiteAction('activate')}
                sx={{ background: COLORS.gradientGreen, color: '#fff', borderRadius: 2, textTransform: 'none', fontSize: '0.8rem', '&:hover': { opacity: 0.9 } }}>
                Aktif Et
              </Button>
              <Button size="small" startIcon={<BlockIcon />} onClick={() => handleBulkSiteAction('deactivate')}
                sx={{ background: 'linear-gradient(135deg, #ef6c00, #ff9800)', color: '#fff', borderRadius: 2, textTransform: 'none', fontSize: '0.8rem', '&:hover': { opacity: 0.9 } }}>
                Pasif Et
              </Button>
              <Button size="small" startIcon={<DeleteIcon />} onClick={() => handleBulkSiteAction('delete')}
                sx={{ background: 'linear-gradient(135deg, #c62828, #e53935)', color: '#fff', borderRadius: 2, textTransform: 'none', fontSize: '0.8rem', '&:hover': { opacity: 0.9 } }}>
                Sil
              </Button>
            </>
          )}
          <Tooltip title="CSV Indir">
            <IconButton onClick={() => handleExport('sites')} sx={{ color: COLORS.primary, '&:hover': { backgroundColor: 'rgba(28, 97, 171, 0.08)' } }}>
              <FileDownloadIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetSiteForm(); setEditingSite(null); setSiteDialogOpen(true); }}
            sx={{ background: COLORS.gradientBlue, borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: '0 4px 12px rgba(28, 97, 171, 0.3)', '&:hover': { boxShadow: '0 6px 16px rgba(28, 97, 171, 0.4)' } }}>
            Yeni Site
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(28, 97, 171, 0.04)' }}>
              <TableCell padding="checkbox" sx={headerCellSx}>
                <Checkbox
                  sx={{ color: COLORS.primary, '&.Mui-checked': { color: COLORS.primary } }}
                  indeterminate={selectedSites.length > 0 && selectedSites.length < paginatedSites.length}
                  checked={paginatedSites.length > 0 && selectedSites.length === paginatedSites.length}
                  onChange={(e) => setSelectedSites(e.target.checked ? paginatedSites.map(s => s.id) : [])}
                />
              </TableCell>
              <TableCell sx={headerCellSx}>
                <TableSortLabel active={siteSort.field === 'name'} direction={siteSort.field === 'name' ? siteSort.order : 'asc'} onClick={() => handleSiteSort('name')}>
                  Site
                </TableSortLabel>
              </TableCell>
              <TableCell sx={headerCellSx}>
                <TableSortLabel active={siteSort.field === 'code'} direction={siteSort.field === 'code' ? siteSort.order : 'asc'} onClick={() => handleSiteSort('code')}>
                  Site Kodu
                </TableSortLabel>
              </TableCell>
              <TableCell sx={headerCellSx}>
                <TableSortLabel active={siteSort.field === 'created_at'} direction={siteSort.field === 'created_at' ? siteSort.order : 'asc'} onClick={() => handleSiteSort('created_at')}>
                  Olusturulma
                </TableSortLabel>
              </TableCell>
              <TableCell sx={headerCellSx}>
                <TableSortLabel active={siteSort.field === 'updated_at'} direction={siteSort.field === 'updated_at' ? siteSort.order : 'asc'} onClick={() => handleSiteSort('updated_at')}>
                  Son Guncelleme
                </TableSortLabel>
              </TableCell>
              <TableCell sx={headerCellSx} align="center">Durum</TableCell>
              <TableCell sx={headerCellSx} align="center">Islemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedSites.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: '#999' }}>Kayit bulunamadi</TableCell></TableRow>
            ) : paginatedSites.map((site) => (
              <TableRow key={site.id} sx={rowHoverSx} selected={selectedSites.includes(site.id)}>
                <TableCell padding="checkbox">
                  <Checkbox checked={selectedSites.includes(site.id)}
                    onChange={(e) => setSelectedSites(e.target.checked ? [...selectedSites, site.id] : selectedSites.filter(id => id !== site.id))}
                    sx={{ color: COLORS.primary, '&.Mui-checked': { color: COLORS.primary } }} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 36, height: 36, background: site.color || COLORS.gradientBlue, fontSize: '0.85rem', fontWeight: 700 }}>
                      {site.name?.charAt(0)}
                    </Avatar>
                    <Typography sx={{ fontWeight: 600, color: '#333', fontSize: '0.9rem' }}>{site.name}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={site.code} size="small"
                    sx={{ backgroundColor: 'rgba(28, 97, 171, 0.1)', color: COLORS.primary, fontWeight: 700, fontSize: '0.8rem', letterSpacing: 0.5 }} />
                </TableCell>
                <TableCell><Typography variant="body2" sx={{ color: '#555' }}>{formatDate(site.created_at)}</Typography></TableCell>
                <TableCell><Typography variant="body2" sx={{ color: '#555' }}>{formatDate(site.updated_at)}</Typography></TableCell>
                <TableCell align="center">
                  <Chip label={site.is_active ? 'Aktif' : 'Pasif'} size="small"
                    sx={{
                      background: site.is_active ? COLORS.gradientGreen : 'linear-gradient(135deg, #999, #bbb)',
                      color: '#fff', fontWeight: 600, fontSize: '0.75rem', minWidth: 60,
                    }} />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                    <Tooltip title="Duzenle">
                      <IconButton size="small" onClick={() => { setEditingSite(site); setSiteForm({ code: site.code, name: site.name, color: site.color, is_active: site.is_active, description: site.description || '' }); setSiteDialogOpen(true); }}
                        sx={{ color: COLORS.primary, '&:hover': { backgroundColor: 'rgba(28, 97, 171, 0.1)' } }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={site.is_active ? 'Deaktif Et' : 'Aktif Et'}>
                      <IconButton size="small" onClick={() => handleToggleSite(site)}
                        sx={{ color: site.is_active ? '#ef6c00' : COLORS.secondary, '&:hover': { backgroundColor: site.is_active ? 'rgba(239, 108, 0, 0.1)' : 'rgba(139, 185, 74, 0.1)' } }}>
                        {site.is_active ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton size="small" onClick={() => setDeleteDialog({ open: true, type: 'site', item: site })}
                        sx={{ color: '#e53935', '&:hover': { backgroundColor: 'rgba(229, 57, 53, 0.1)' } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div" count={useBackend ? (sites.length || 0) : filteredSites.length}
          page={sitePage} rowsPerPage={siteRowsPerPage}
          onPageChange={(_, p) => setSitePage(p)}
          onRowsPerPageChange={(e) => { setSiteRowsPerPage(parseInt(e.target.value)); setSitePage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Sayfa basina:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          sx={{ borderTop: '1px solid rgba(28, 97, 171, 0.08)' }}
        />
      </TableContainer>
    </Box>
  );

  // ============================================================
  // RENDER: USER TAB
  // ============================================================
  const renderUserTab = () => (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small" placeholder="Kullanici ara..." value={userSearch}
            onChange={(e) => { setUserSearch(e.target.value); setUserPage(0); }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: COLORS.primary }} /></InputAdornment>,
              endAdornment: userSearch && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setUserSearch('')}><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: 2, '&:hover fieldset': { borderColor: COLORS.primary }, '&.Mui-focused fieldset': { borderColor: COLORS.primary } } }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select value={userFilter.role} onChange={(e) => { setUserFilter({ ...userFilter, role: e.target.value }); setUserPage(0); }}
              sx={{ borderRadius: 2 }}>
              <MenuItem value="all">Tum Roller</MenuItem>
              {Object.entries(ROLE_CONFIG).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select value={userFilter.status} onChange={(e) => { setUserFilter({ ...userFilter, status: e.target.value }); setUserPage(0); }}
              sx={{ borderRadius: 2 }}>
              <MenuItem value="all">Tum Durumlar</MenuItem>
              <MenuItem value="active">Aktif</MenuItem>
              <MenuItem value="inactive">Pasif</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select value={userFilter.site} onChange={(e) => { setUserFilter({ ...userFilter, site: e.target.value }); setUserPage(0); }}
              sx={{ borderRadius: 2 }}>
              <MenuItem value="all">Tum Siteler</MenuItem>
              {sites.map(s => <MenuItem key={s.code} value={s.code}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {selectedUsers.length > 0 && (
            <>
              <Chip label={`${selectedUsers.length} secili`} color="primary" size="small" onDelete={() => setSelectedUsers([])} sx={{ fontWeight: 600 }} />
              <Button size="small" startIcon={<CheckIcon />} onClick={() => handleBulkUserAction('activate')}
                sx={{ background: COLORS.gradientGreen, color: '#fff', borderRadius: 2, textTransform: 'none', fontSize: '0.8rem', '&:hover': { opacity: 0.9 } }}>
                Aktif Et
              </Button>
              <Button size="small" startIcon={<BlockIcon />} onClick={() => handleBulkUserAction('deactivate')}
                sx={{ background: 'linear-gradient(135deg, #ef6c00, #ff9800)', color: '#fff', borderRadius: 2, textTransform: 'none', fontSize: '0.8rem', '&:hover': { opacity: 0.9 } }}>
                Pasif Et
              </Button>
              <Button size="small" startIcon={<DeleteIcon />} onClick={() => handleBulkUserAction('delete')}
                sx={{ background: 'linear-gradient(135deg, #c62828, #e53935)', color: '#fff', borderRadius: 2, textTransform: 'none', fontSize: '0.8rem', '&:hover': { opacity: 0.9 } }}>
                Sil
              </Button>
            </>
          )}
          <Tooltip title="CSV Indir">
            <IconButton onClick={() => handleExport('users')} sx={{ color: COLORS.primary, '&:hover': { backgroundColor: 'rgba(28, 97, 171, 0.08)' } }}>
              <FileDownloadIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetUserForm(); setEditingUser(null); setUserDialogOpen(true); }}
            sx={{ background: COLORS.gradientBlue, borderRadius: 2, textTransform: 'none', fontWeight: 600, boxShadow: '0 4px 12px rgba(28, 97, 171, 0.3)', '&:hover': { boxShadow: '0 6px 16px rgba(28, 97, 171, 0.4)' } }}>
            Yeni Kullanici
          </Button>
        </Box>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(28, 97, 171, 0.04)' }}>
              <TableCell padding="checkbox" sx={headerCellSx}>
                <Checkbox sx={{ color: COLORS.primary, '&.Mui-checked': { color: COLORS.primary } }}
                  indeterminate={selectedUsers.length > 0 && selectedUsers.length < paginatedUsers.length}
                  checked={paginatedUsers.length > 0 && selectedUsers.length === paginatedUsers.length}
                  onChange={(e) => setSelectedUsers(e.target.checked ? paginatedUsers.map(u => u.id) : [])} />
              </TableCell>
              <TableCell sx={headerCellSx}>
                <TableSortLabel active={userSort.field === 'first_name'} direction={userSort.field === 'first_name' ? userSort.order : 'asc'} onClick={() => handleUserSort('first_name')}>
                  Kullanici
                </TableSortLabel>
              </TableCell>
              <TableCell sx={headerCellSx}>
                <TableSortLabel active={userSort.field === 'email'} direction={userSort.field === 'email' ? userSort.order : 'asc'} onClick={() => handleUserSort('email')}>
                  E-posta
                </TableSortLabel>
              </TableCell>
              <TableCell sx={headerCellSx}>
                <TableSortLabel active={userSort.field === 'role'} direction={userSort.field === 'role' ? userSort.order : 'asc'} onClick={() => handleUserSort('role')}>
                  Rol
                </TableSortLabel>
              </TableCell>
              <TableCell sx={headerCellSx}>Site</TableCell>
              <TableCell sx={headerCellSx}>Kayit Tarihi</TableCell>
              <TableCell sx={headerCellSx}>Son Giris</TableCell>
              <TableCell sx={headerCellSx} align="center">Durum</TableCell>
              <TableCell sx={headerCellSx} align="center">Islemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedUsers.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center" sx={{ py: 4, color: '#999' }}>Kayit bulunamadi</TableCell></TableRow>
            ) : paginatedUsers.map((user) => (
              <TableRow key={user.id} sx={rowHoverSx} selected={selectedUsers.includes(user.id)}>
                <TableCell padding="checkbox">
                  <Checkbox checked={selectedUsers.includes(user.id)}
                    onChange={(e) => setSelectedUsers(e.target.checked ? [...selectedUsers, user.id] : selectedUsers.filter(id => id !== user.id))}
                    sx={{ color: COLORS.primary, '&.Mui-checked': { color: COLORS.primary } }} />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 36, height: 36, background: COLORS.gradientBlue, fontSize: '0.85rem', fontWeight: 700 }}>
                      {user.first_name?.charAt(0)}{user.last_name?.charAt(0)}
                    </Avatar>
                    <Typography sx={{ fontWeight: 600, color: '#333', fontSize: '0.9rem' }}>{user.first_name} {user.last_name}</Typography>
                  </Box>
                </TableCell>
                <TableCell><Typography variant="body2" sx={{ color: '#555' }}>{user.email}</Typography></TableCell>
                <TableCell>
                  <Chip label={ROLE_CONFIG[user.role]?.label || user.role} size="small"
                    sx={{ backgroundColor: ROLE_CONFIG[user.role]?.bgColor || '#eceff1', color: ROLE_CONFIG[user.role]?.color || '#546e7a', fontWeight: 700, fontSize: '0.75rem' }} />
                </TableCell>
                <TableCell>
                  <Chip label={user.site_code || 'Tum Siteler'} size="small"
                    sx={{ backgroundColor: 'rgba(28, 97, 171, 0.1)', color: COLORS.primary, fontWeight: 600, fontSize: '0.75rem' }} />
                </TableCell>
                <TableCell><Typography variant="body2" sx={{ color: '#555' }}>{formatDate(user.created_at)}</Typography></TableCell>
                <TableCell><Typography variant="body2" sx={{ color: '#555' }}>{user.last_login ? formatDate(user.last_login) : 'Henuz giris yok'}</Typography></TableCell>
                <TableCell align="center">
                  <Chip label={user.is_active ? 'Aktif' : 'Pasif'} size="small"
                    sx={{ background: user.is_active ? COLORS.gradientGreen : 'linear-gradient(135deg, #999, #bbb)', color: '#fff', fontWeight: 600, fontSize: '0.75rem', minWidth: 60 }} />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                    <Tooltip title="Duzenle">
                      <IconButton size="small" onClick={() => {
                        setEditingUser(user);
                        setUserForm({ first_name: user.first_name, last_name: user.last_name, email: user.email, role: user.role, site_code: user.site_code || '', is_active: user.is_active, password: '' });
                        setUserDialogOpen(true);
                      }} sx={{ color: COLORS.primary, '&:hover': { backgroundColor: 'rgba(28, 97, 171, 0.1)' } }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={user.is_active ? 'Deaktif Et' : 'Aktif Et'}>
                      <IconButton size="small" onClick={() => handleToggleUser(user)}
                        sx={{ color: user.is_active ? '#ef6c00' : COLORS.secondary, '&:hover': { backgroundColor: user.is_active ? 'rgba(239, 108, 0, 0.1)' : 'rgba(139, 185, 74, 0.1)' } }}>
                        {user.is_active ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <IconButton size="small" onClick={() => setDeleteDialog({ open: true, type: 'user', item: user })}
                        sx={{ color: '#e53935', '&:hover': { backgroundColor: 'rgba(229, 57, 53, 0.1)' } }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div" count={useBackend ? (users.length || 0) : filteredUsers.length}
          page={userPage} rowsPerPage={userRowsPerPage}
          onPageChange={(_, p) => setUserPage(p)}
          onRowsPerPageChange={(e) => { setUserRowsPerPage(parseInt(e.target.value)); setUserPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Sayfa basina:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          sx={{ borderTop: '1px solid rgba(28, 97, 171, 0.08)' }}
        />
      </TableContainer>
    </Box>
  );

  // ============================================================
  // RENDER: PERMISSION TAB
  // ============================================================
  const renderPermissionTab = () => (
    <Box>
      <Grid container spacing={2}>
        {Object.entries(ROLE_CONFIG).map(([role, config]) => (
          <Grid item xs={12} sm={6} md={4} key={role}>
            <Paper sx={{
              borderRadius: 3, overflow: 'hidden', transition: 'all 0.3s ease',
              border: `1px solid ${config.color}22`,
              '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 8px 24px ${config.color}22` },
            }}>
              <Box sx={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>{config.label}</Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
                    {PERMISSION_LIST.filter(p => permissionMatrix[role]?.[p.key]).length} / {PERMISSION_LIST.length} yetki
                  </Typography>
                </Box>
                <Tooltip title="Yetkileri Duzenle">
                  <IconButton size="small" onClick={() => { setEditingRole(role); setTempPermissions({ ...permissionMatrix[role] }); setPermDialogOpen(true); }}
                    sx={{ color: '#fff', backgroundColor: 'rgba(255,255,255,0.2)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' } }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box sx={{ p: 2 }}>
                {PERMISSION_LIST.map((perm) => (
                  <Box key={perm.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <Typography sx={{ fontSize: '0.8rem', color: '#555' }}>{perm.label}</Typography>
                    {permissionMatrix[role]?.[perm.key] ? (
                      <CheckIcon sx={{ fontSize: 18, color: COLORS.secondary }} />
                    ) : (
                      <CloseIcon sx={{ fontSize: 18, color: '#ccc' }} />
                    )}
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // ============================================================
  // RENDER: STATS TAB
  // ============================================================
  const renderStatsTab = () => {
    const localStats = stats || {
      sites: { total: sites.length, active: sites.filter(s => s.is_active).length },
      users: { total: users.length, active: users.filter(u => u.is_active).length },
      auditLogs: { total: auditLogs.length },
    };

    const statCards = [
      { title: 'Toplam Site', value: localStats.sites?.total || 0, sub: `${localStats.sites?.active || 0} aktif`, color: COLORS.primary, icon: <BusinessIcon /> },
      { title: 'Toplam Kullanici', value: localStats.users?.total || 0, sub: `${localStats.users?.active || 0} aktif`, color: '#7b1fa2', icon: <PeopleIcon /> },
      { title: 'Audit Log', value: localStats.auditLogs?.total || 0, sub: 'kayit', color: '#ef6c00', icon: <HistoryIcon /> },
      { title: 'Sistem Durumu', value: useBackend ? 'Online' : 'Lokal', sub: useBackend ? 'Backend bagli' : 'LocalStorage', color: useBackend ? COLORS.secondary : '#999', icon: <InfoIcon /> },
    ];

    // Role dagilimi
    const roleCounts = {};
    users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });

    // Site dagilimi
    const siteCounts = {};
    users.forEach(u => { const s = u.site_code || 'Tum Siteler'; siteCounts[s] = (siteCounts[s] || 0) + 1; });

    return (
      <Box>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {statCards.map((card, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Paper sx={{
                borderRadius: 3, p: 2.5, transition: 'all 0.3s ease',
                border: `1px solid ${card.color}22`,
                '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 6px 20px ${card.color}22` },
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ color: '#999', fontSize: '0.8rem', fontWeight: 500, mb: 0.5 }}>{card.title}</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.8rem', color: card.color, lineHeight: 1 }}>{card.value}</Typography>
                    <Typography sx={{ color: '#aaa', fontSize: '0.75rem', mt: 0.5 }}>{card.sub}</Typography>
                  </Box>
                  <Avatar sx={{ background: `${card.color}15`, color: card.color, width: 44, height: 44 }}>
                    {card.icon}
                  </Avatar>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={2}>
          {/* Role Dagilimi */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ borderRadius: 3, p: 2.5, border: '1px solid rgba(28, 97, 171, 0.08)' }}>
              <Typography sx={{ fontWeight: 700, color: COLORS.primary, mb: 2, fontSize: '0.95rem' }}>Rol Dagilimi</Typography>
              {Object.entries(ROLE_CONFIG).map(([role, config]) => {
                const count = roleCounts[role] || 0;
                const pct = users.length ? Math.round((count / users.length) * 100) : 0;
                return (
                  <Box key={role} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircleIcon sx={{ fontSize: 10, color: config.color }} />
                        <Typography sx={{ fontSize: '0.83rem', color: '#555' }}>{config.label}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: '0.83rem', fontWeight: 600, color: '#333' }}>{count} ({pct}%)</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{ height: 8, borderRadius: 4, backgroundColor: `${config.color}15`, '& .MuiLinearProgress-bar': { borderRadius: 4, background: `linear-gradient(90deg, ${config.color}, ${config.color}bb)` } }} />
                  </Box>
                );
              })}
            </Paper>
          </Grid>

          {/* Site Dagilimi */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ borderRadius: 3, p: 2.5, border: '1px solid rgba(28, 97, 171, 0.08)' }}>
              <Typography sx={{ fontWeight: 700, color: COLORS.primary, mb: 2, fontSize: '0.95rem' }}>Site Bazli Kullanici Dagilimi</Typography>
              {Object.entries(siteCounts).map(([siteCode, count]) => {
                const pct = users.length ? Math.round((count / users.length) * 100) : 0;
                const site = sites.find(s => s.code === siteCode);
                const color = site?.color || COLORS.primary;
                return (
                  <Box key={siteCode} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircleIcon sx={{ fontSize: 10, color }} />
                        <Typography sx={{ fontSize: '0.83rem', color: '#555' }}>{site?.name || siteCode}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: '0.83rem', fontWeight: 600, color: '#333' }}>{count} ({pct}%)</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{ height: 8, borderRadius: 4, backgroundColor: `${color}15`, '& .MuiLinearProgress-bar': { borderRadius: 4, background: `linear-gradient(90deg, ${color}, ${color}bb)` } }} />
                  </Box>
                );
              })}
              {Object.keys(siteCounts).length === 0 && (
                <Typography sx={{ color: '#999', fontSize: '0.85rem', textAlign: 'center', py: 3 }}>Henuz kullanici yok</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button startIcon={<RefreshIcon />} onClick={loadStats}
            sx={{ color: COLORS.primary, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: 'rgba(28, 97, 171, 0.06)' } }}>
            Istatistikleri Yenile
          </Button>
        </Box>
      </Box>
    );
  };

  // ============================================================
  // RENDER: AUDIT LOG TAB
  // ============================================================
  const ACTION_LABELS = {
    CREATE: { label: 'Olusturma', color: '#4caf50' },
    UPDATE: { label: 'Guncelleme', color: '#2196f3' },
    DELETE: { label: 'Silme', color: '#f44336' },
    LOGIN: { label: 'Giris', color: '#9c27b0' },
    LOGOUT: { label: 'Cikis', color: '#795548' },
    ACTIVATE: { label: 'Aktif Etme', color: '#8bc34a' },
    DEACTIVATE: { label: 'Deaktif Etme', color: '#ff9800' },
    PERMISSION_CHANGE: { label: 'Yetki Degisikligi', color: '#673ab7' },
    EXPORT: { label: 'Disa Aktarma', color: '#00bcd4' },
    IMPORT: { label: 'Icerik Yukleme', color: '#009688' },
    BULK_ACTION: { label: 'Toplu Islem', color: '#607d8b' },
  };

  const MODULE_LABELS = {
    SITE: { label: 'Site', color: COLORS.primary },
    USER: { label: 'Kullanici', color: '#7b1fa2' },
    PERMISSION: { label: 'Yetki', color: '#ef6c00' },
    SYSTEM: { label: 'Sistem', color: '#546e7a' },
  };

  const renderAuditLogTab = () => (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small" placeholder="Log ara..." value={auditSearch}
            onChange={(e) => { setAuditSearch(e.target.value); setAuditPage(0); }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: COLORS.primary }} /></InputAdornment>,
              endAdornment: auditSearch && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setAuditSearch('')}><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: 2, '&:hover fieldset': { borderColor: COLORS.primary }, '&.Mui-focused fieldset': { borderColor: COLORS.primary } } }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select value={auditFilter.module} onChange={(e) => { setAuditFilter({ ...auditFilter, module: e.target.value }); setAuditPage(0); }}
              sx={{ borderRadius: 2 }}>
              <MenuItem value="all">Tum Moduller</MenuItem>
              {Object.entries(MODULE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <Select value={auditFilter.action} onChange={(e) => { setAuditFilter({ ...auditFilter, action: e.target.value }); setAuditPage(0); }}
              sx={{ borderRadius: 2 }}>
              <MenuItem value="all">Tum Islemler</MenuItem>
              {Object.entries(ACTION_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Box>
        <Tooltip title="CSV Indir">
          <IconButton onClick={() => handleExport('audit-logs')} sx={{ color: COLORS.primary, '&:hover': { backgroundColor: 'rgba(28, 97, 171, 0.08)' } }}>
            <FileDownloadIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(28, 97, 171, 0.04)' }}>
              <TableCell sx={{ ...headerCellSx, width: 40 }} />
              <TableCell sx={headerCellSx}>
                <TableSortLabel active={auditSort.field === 'created_at'} direction={auditSort.field === 'created_at' ? auditSort.order : 'asc'} onClick={() => handleAuditSort('created_at')}>
                  Tarih
                </TableSortLabel>
              </TableCell>
              <TableCell sx={headerCellSx}>Modul</TableCell>
              <TableCell sx={headerCellSx}>Islem</TableCell>
              <TableCell sx={headerCellSx}>Hedef</TableCell>
              <TableCell sx={headerCellSx}>Kullanici</TableCell>
              <TableCell sx={headerCellSx}>IP Adresi</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedAuditLogs.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: '#999' }}>Kayit bulunamadi</TableCell></TableRow>
            ) : paginatedAuditLogs.map((log) => (
              <React.Fragment key={log.id}>
                <TableRow sx={rowHoverSx}>
                  <TableCell sx={{ width: 40, py: 1 }}>
                    {(log.details || log.old_values || log.new_values) && (
                      <IconButton size="small" onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                        {expandedLog === log.id ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />}
                      </IconButton>
                    )}
                  </TableCell>
                  <TableCell><Typography variant="body2" sx={{ color: '#555', fontSize: '0.83rem' }}>{formatDateTime(log.created_at)}</Typography></TableCell>
                  <TableCell>
                    <Chip label={MODULE_LABELS[log.module]?.label || log.module} size="small"
                      sx={{ backgroundColor: `${MODULE_LABELS[log.module]?.color || '#999'}15`, color: MODULE_LABELS[log.module]?.color || '#999', fontWeight: 600, fontSize: '0.73rem' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={ACTION_LABELS[log.action]?.label || log.action} size="small"
                      sx={{ backgroundColor: `${ACTION_LABELS[log.action]?.color || '#999'}15`, color: ACTION_LABELS[log.action]?.color || '#999', fontWeight: 600, fontSize: '0.73rem' }} />
                  </TableCell>
                  <TableCell><Typography variant="body2" sx={{ color: '#333', fontWeight: 500, fontSize: '0.85rem' }}>{log.target_name || '-'}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: '#333', fontWeight: 500, fontSize: '0.83rem' }}>{log.user_name || '-'}</Typography>
                    {log.user_role_label && <Typography variant="caption" sx={{ color: '#999', fontSize: '0.7rem' }}>{log.user_role_label}</Typography>}
                  </TableCell>
                  <TableCell><Typography variant="body2" sx={{ color: '#999', fontSize: '0.8rem', fontFamily: 'monospace' }}>{log.ip_address === 'bekleniyor' || log.ip_address === '127.0.0.1' || log.ip_address === 'localhost' ? '-' : (log.ip_address || '-')}</Typography></TableCell>
                </TableRow>
                {expandedLog === log.id && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ backgroundColor: 'rgba(28, 97, 171, 0.02)', py: 2, px: 4 }}>
                      <Grid container spacing={2}>
                        {/* Ozet bilgi */}
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                            <Chip size="small" label={`Yapan: ${log.user_name || '-'}`} sx={{ fontSize: '0.75rem', backgroundColor: 'rgba(28, 97, 171, 0.08)', color: COLORS.primary }} />
                            {log.user_email && <Chip size="small" label={log.user_email} sx={{ fontSize: '0.75rem', backgroundColor: 'rgba(0,0,0,0.04)' }} />}
                            {log.user_role_label && <Chip size="small" label={log.user_role_label} sx={{ fontSize: '0.75rem', backgroundColor: 'rgba(139, 185, 74, 0.1)', color: '#558b2f' }} />}
                            {log.site_code && <Chip size="small" label={`Site: ${log.site_code}`} sx={{ fontSize: '0.75rem', backgroundColor: 'rgba(33,150,243,0.08)', color: '#1565c0' }} />}
                            <Chip size="small" label={`IP: ${log.ip_address || '-'}`} sx={{ fontSize: '0.75rem', fontFamily: 'monospace', backgroundColor: 'rgba(0,0,0,0.05)' }} />
                            <Chip size="small" label={log.formatted_date && log.formatted_time ? `${log.formatted_date} ${log.formatted_time}` : formatDateTime(log.created_at)} sx={{ fontSize: '0.75rem', backgroundColor: 'rgba(0,0,0,0.05)' }} />
                            {log.platform && <Chip size="small" label={log.platform} sx={{ fontSize: '0.75rem', backgroundColor: 'rgba(0,0,0,0.04)' }} />}
                          </Box>
                        </Grid>
                        {/* Detaylar - okunabilir format */}
                        {log.details && Object.keys(log.details).length > 0 && (
                          <Grid item xs={12} md={log.old_values || log.new_values ? 4 : 12}>
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: COLORS.primary, mb: 1 }}>Detaylar</Typography>
                            <Box sx={{ backgroundColor: '#fff', borderRadius: 2, p: 1.5, border: '1px solid rgba(28, 97, 171, 0.1)' }}>
                              {Object.entries(log.details).filter(([k]) => k !== 'tarayici').map(([key, val]) => (
                                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                  <Typography sx={{ fontSize: '0.78rem', color: '#777', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</Typography>
                                  <Typography sx={{ fontSize: '0.78rem', color: '#333', fontWeight: 500 }}>
                                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </Grid>
                        )}
                        {log.old_values && (
                          <Grid item xs={12} md={4}>
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#e53935', mb: 1 }}>Onceki Durum</Typography>
                            <Box sx={{ backgroundColor: '#fff', borderRadius: 2, p: 1.5, border: '1px solid rgba(229, 57, 53, 0.15)' }}>
                              {Object.entries(typeof log.old_values === 'object' ? log.old_values : {}).map(([key, val]) => (
                                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                  <Typography sx={{ fontSize: '0.78rem', color: '#777', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</Typography>
                                  <Typography sx={{ fontSize: '0.78rem', color: '#e53935', fontWeight: 500 }}>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</Typography>
                                </Box>
                              ))}
                            </Box>
                          </Grid>
                        )}
                        {log.new_values && (
                          <Grid item xs={12} md={4}>
                            <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: '#4caf50', mb: 1 }}>Yeni Durum</Typography>
                            <Box sx={{ backgroundColor: '#fff', borderRadius: 2, p: 1.5, border: '1px solid rgba(76, 175, 80, 0.15)' }}>
                              {Object.entries(typeof log.new_values === 'object' ? log.new_values : {}).map(([key, val]) => (
                                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                  <Typography sx={{ fontSize: '0.78rem', color: '#777', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</Typography>
                                  <Typography sx={{ fontSize: '0.78rem', color: '#4caf50', fontWeight: 500 }}>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</Typography>
                                </Box>
                              ))}
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div" count={useBackend ? (auditLogs.length || 0) : filteredAuditLogs.length}
          page={auditPage} rowsPerPage={auditRowsPerPage}
          onPageChange={(_, p) => setAuditPage(p)}
          onRowsPerPageChange={(e) => { setAuditRowsPerPage(parseInt(e.target.value)); setAuditPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]}
          labelRowsPerPage="Sayfa basina:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}`}
          sx={{ borderTop: '1px solid rgba(28, 97, 171, 0.08)' }}
        />
      </TableContainer>
    </Box>
  );

  // ============================================================
  // DIALOGS
  // ============================================================
  const renderSiteDialog = () => (
    <Dialog open={siteDialogOpen} onClose={() => setSiteDialogOpen(false)} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogTitle sx={{ background: COLORS.gradientBlue, color: '#fff', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {editingSite ? 'Site Duzenle' : 'Yeni Site Ekle'}
        <IconButton onClick={() => setSiteDialogOpen(false)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, mt: 1 }}>
        <Stack spacing={2.5}>
          <TextField label="Site Kodu" value={siteForm.code} onChange={(e) => setSiteForm({ ...siteForm, code: e.target.value.toUpperCase() })}
            disabled={!!editingSite} fullWidth size="small" placeholder="Orn: FXB"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField label="Site Adi" value={siteForm.name} onChange={(e) => setSiteForm({ ...siteForm, name: e.target.value })}
            fullWidth size="small" placeholder="Orn: FIXBET"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <TextField label="Aciklama" value={siteForm.description} onChange={(e) => setSiteForm({ ...siteForm, description: e.target.value })}
            fullWidth size="small" multiline rows={2}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <FormControlLabel
            control={<Switch checked={siteForm.is_active} onChange={(e) => setSiteForm({ ...siteForm, is_active: e.target.checked })}
              sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: COLORS.secondary }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: COLORS.secondary } }} />}
            label={<Typography sx={{ fontSize: '0.85rem' }}>Aktif</Typography>}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setSiteDialogOpen(false)} sx={{ color: '#999', textTransform: 'none', borderRadius: 2 }}>Iptal</Button>
        <Button variant="contained" onClick={handleSaveSite} startIcon={<SaveIcon />}
          sx={{ background: COLORS.gradientBlue, textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { opacity: 0.9 } }}>
          {editingSite ? 'Guncelle' : 'Olustur'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderUserDialog = () => (
    <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogTitle sx={{ background: COLORS.gradientBlue, color: '#fff', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {editingUser ? 'Kullanici Duzenle' : 'Yeni Kullanici Ekle'}
        <IconButton onClick={() => setUserDialogOpen(false)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, mt: 1 }}>
        <Stack spacing={2.5}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Ad" value={userForm.first_name} onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
              fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField label="Soyad" value={userForm.last_name} onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
              fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          </Box>
          <TextField label="E-posta" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            fullWidth size="small" type="email" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField label="Sifre" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              fullWidth size="small" placeholder={editingUser ? 'Degistirmek icin yeni sifre girin' : 'Sifre girin'}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              helperText={userForm.password ? `Sifre: ${userForm.password}` : ''}
            />
            <Tooltip title="Rastgele Sifre Uret">
              <Button variant="outlined" onClick={generateRandomPassword}
                sx={{ minWidth: 44, height: 40, borderRadius: 2, borderColor: COLORS.primary, color: COLORS.primary, '&:hover': { borderColor: COLORS.primaryDark, backgroundColor: 'rgba(28, 97, 171, 0.06)' } }}>
                <RefreshIcon fontSize="small" />
              </Button>
            </Tooltip>
          </Box>
          <FormControl fullWidth size="small">
            <InputLabel>Rol</InputLabel>
            <Select value={userForm.role} label="Rol" onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              sx={{ borderRadius: 2 }}>
              {Object.entries(ROLE_CONFIG).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircleIcon sx={{ fontSize: 10, color: v.color }} />
                    {v.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Site</InputLabel>
            <Select value={userForm.site_code} label="Site" onChange={(e) => setUserForm({ ...userForm, site_code: e.target.value })}
              sx={{ borderRadius: 2 }}>
              <MenuItem value="">Tum Siteler</MenuItem>
              {sites.map(s => <MenuItem key={s.code} value={s.code}>{s.name} ({s.code})</MenuItem>)}
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={userForm.is_active} onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
              sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: COLORS.secondary }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: COLORS.secondary } }} />}
            label={<Typography sx={{ fontSize: '0.85rem' }}>Aktif</Typography>}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setUserDialogOpen(false)} sx={{ color: '#999', textTransform: 'none', borderRadius: 2 }}>Iptal</Button>
        <Button variant="contained" onClick={handleSaveUser} startIcon={<SaveIcon />}
          sx={{ background: COLORS.gradientBlue, textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { opacity: 0.9 } }}>
          {editingUser ? 'Guncelle' : 'Olustur'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderPermissionDialog = () => (
    <Dialog open={permDialogOpen} onClose={() => setPermDialogOpen(false)} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}>
      <DialogTitle sx={{ background: `linear-gradient(135deg, ${ROLE_CONFIG[editingRole]?.color || COLORS.primary}, ${ROLE_CONFIG[editingRole]?.color || COLORS.primary}cc)`, color: '#fff', fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {ROLE_CONFIG[editingRole]?.label || editingRole} - Yetki Duzenle
        <IconButton onClick={() => setPermDialogOpen(false)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 2, mt: 1 }}>
        {editingRole === 'SUPER_ADMIN' ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>Super Admin tum yetkilere sahiptir ve degistirilemez.</Alert>
        ) : (
          <Box>
            {PERMISSION_LIST.map((perm) => (
              <FormControlLabel key={perm.key}
                control={<Checkbox checked={!!tempPermissions[perm.key]}
                  onChange={(e) => setTempPermissions({ ...tempPermissions, [perm.key]: e.target.checked })}
                  sx={{ color: ROLE_CONFIG[editingRole]?.color, '&.Mui-checked': { color: ROLE_CONFIG[editingRole]?.color } }} />}
                label={<Typography sx={{ fontSize: '0.85rem' }}>{perm.label}</Typography>}
                sx={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.04)', py: 0.3 }}
              />
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setPermDialogOpen(false)} sx={{ color: '#999', textTransform: 'none', borderRadius: 2 }}>Iptal</Button>
        {editingRole !== 'SUPER_ADMIN' && (
          <Button variant="contained" onClick={handleSavePermissions} startIcon={<SaveIcon />}
            sx={{ background: `linear-gradient(135deg, ${ROLE_CONFIG[editingRole]?.color || COLORS.primary}, ${ROLE_CONFIG[editingRole]?.color || COLORS.primary}cc)`, textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { opacity: 0.9 } }}>
            Kaydet
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );

  const renderDeleteDialog = () => (
    <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, type: '', item: null })} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, color: '#e53935' }}>Silme Onayi</DialogTitle>
      <DialogContent>
        <Typography>
          <strong>{deleteDialog.type === 'site' ? deleteDialog.item?.name : `${deleteDialog.item?.first_name} ${deleteDialog.item?.last_name}`}</strong> {deleteDialog.type === 'site' ? 'sitesini' : 'kullanicisini'} silmek istediginizden emin misiniz?
        </Typography>
        <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>Bu islem geri alinamaz.</Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setDeleteDialog({ open: false, type: '', item: null })} sx={{ color: '#999', textTransform: 'none', borderRadius: 2 }}>Iptal</Button>
        <Button variant="contained" onClick={deleteDialog.type === 'site' ? handleDeleteSite : handleDeleteUser}
          sx={{ background: 'linear-gradient(135deg, #c62828, #e53935)', textTransform: 'none', borderRadius: 2, fontWeight: 600, '&:hover': { opacity: 0.9 } }}>
          Sil
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ============================================================
  // SECTION NAV CONFIG
  // ============================================================
  const NAV_SECTIONS = [
    { key: 'sites', label: 'Site Yonetimi', icon: <BusinessIcon />, permission: PERMISSIONS.MANAGE_SITES },
    { key: 'users', label: 'Kullanici Yonetimi', icon: <PeopleIcon />, permission: PERMISSIONS.MANAGE_USERS },
    { key: 'security', label: 'Guvenlik', icon: <SecurityIcon />, permission: PERMISSIONS.MANAGE_SETTINGS },
    { key: 'permissions', label: 'Yetki Yonetimi', icon: <PermissionsIcon />, permission: PERMISSIONS.MANAGE_SETTINGS },
    { key: 'stats', label: 'Istatistikler', icon: <BarChartIcon />, permission: PERMISSIONS.MANAGE_SETTINGS },
    { key: 'audit', label: 'Audit Log', icon: <HistoryIcon />, permission: PERMISSIONS.MANAGE_SETTINGS },
  ];

  const visibleSections = NAV_SECTIONS.filter(
    section => !section.permission || hasPermission(section.permission)
  );

  // Redirect to first visible section if current section is not accessible
  useEffect(() => {
    const isVisible = visibleSections.some(s => s.key === activeSection);
    if (!isVisible && visibleSections.length > 0) {
      handleSectionChange(visibleSections[0].key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleSections.length]);

  // ============================================================
  // RENDER: SECURITY SECTION
  // ============================================================
  const renderSecuritySection = () => {
    // Session info
    let sessionInfo = { loginTime: null, deviceInfo: {} };
    try {
      const session = JSON.parse(localStorage.getItem('employee_session') || '{}');
      sessionInfo = session;
    } catch { }

    const loginTime = sessionInfo.loginTime ? new Date(sessionInfo.loginTime) : null;
    const now = new Date();
    const sessionDurationMs = loginTime ? now - loginTime : 0;
    const sessionHours = Math.floor(sessionDurationMs / (1000 * 60 * 60));
    const sessionMinutes = Math.floor((sessionDurationMs % (1000 * 60 * 60)) / (1000 * 60));
    const maxSessionHours = 8;
    const remainingMs = loginTime ? Math.max(0, maxSessionHours * 60 * 60 * 1000 - sessionDurationMs) : 0;
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const sessionProgress = loginTime ? Math.min(100, (sessionDurationMs / (maxSessionHours * 60 * 60 * 1000)) * 100) : 0;

    const deviceInfo = sessionInfo.deviceInfo || {};

    // Parse browser from user agent
    const getBrowserName = (ua) => {
      if (!ua) return 'Bilinmiyor';
      if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Google Chrome';
      if (ua.includes('Edg')) return 'Microsoft Edge';
      if (ua.includes('Firefox')) return 'Mozilla Firefox';
      if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
      return 'Diger';
    };

    // Login history from audit logs
    const loginLogs = auditLogs
      .filter(l => l.action === 'LOGIN' || l.action === 'LOGOUT')
      .slice(0, 10);

    return (
      <Box>
        <Grid container spacing={2}>
          {/* Oturum Bilgileri */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ borderRadius: 3, p: 3, border: '1px solid rgba(28, 97, 171, 0.08)', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TimerIcon sx={{ color: COLORS.primary }} />
                <Typography sx={{ fontWeight: 700, color: COLORS.primary, fontSize: '1rem' }}>Oturum Bilgileri</Typography>
              </Box>
              <Stack spacing={2}>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', color: '#999', mb: 0.3 }}>Giris Zamani</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>
                    {loginTime ? loginTime.toLocaleString('tr-TR') : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', color: '#999', mb: 0.3 }}>Oturum Suresi</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>
                    {loginTime ? `${sessionHours} saat ${sessionMinutes} dakika` : '-'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', color: '#999', mb: 0.5 }}>Kalan Sure</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress variant="determinate" value={sessionProgress}
                      sx={{
                        flex: 1, height: 8, borderRadius: 4,
                        backgroundColor: 'rgba(28, 97, 171, 0.1)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          background: sessionProgress > 80
                            ? 'linear-gradient(90deg, #ef6c00, #f44336)'
                            : COLORS.gradientBlue,
                        }
                      }}
                    />
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: sessionProgress > 80 ? '#f44336' : '#333', minWidth: 80 }}>
                      {loginTime ? `${remainingHours}s ${remainingMinutes}dk` : '-'}
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', color: '#999', mb: 0.3 }}>Maks. Oturum Suresi</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>8 saat</Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Aktif Oturum - Cihaz Bilgileri */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ borderRadius: 3, p: 3, border: '1px solid rgba(28, 97, 171, 0.08)', height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <DevicesIcon sx={{ color: COLORS.primary }} />
                <Typography sx={{ fontWeight: 700, color: COLORS.primary, fontSize: '1rem' }}>Aktif Oturum</Typography>
              </Box>
              <Stack spacing={2}>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', color: '#999', mb: 0.3 }}>Tarayici</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>
                    {getBrowserName(deviceInfo.userAgent)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', color: '#999', mb: 0.3 }}>Platform</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>
                    {deviceInfo.platform || 'Bilinmiyor'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', color: '#999', mb: 0.3 }}>Ekran Cozunurlugu</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>
                    {deviceInfo.screenResolution || 'Bilinmiyor'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', color: '#999', mb: 0.3 }}>Zaman Dilimi</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 600, color: '#333' }}>
                    {deviceInfo.timezone || 'Bilinmiyor'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Sifre Politikasi */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ borderRadius: 3, p: 3, border: '1px solid rgba(28, 97, 171, 0.08)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LockIcon sx={{ color: COLORS.primary }} />
                <Typography sx={{ fontWeight: 700, color: COLORS.primary, fontSize: '1rem' }}>Sifre Politikasi</Typography>
              </Box>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <Typography sx={{ fontSize: '0.85rem', color: '#555' }}>Minimum Sifre Uzunlugu</Typography>
                  <Chip label="6 karakter" size="small" sx={{ fontWeight: 600, fontSize: '0.75rem', backgroundColor: 'rgba(28, 97, 171, 0.1)', color: COLORS.primary }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <Typography sx={{ fontSize: '0.85rem', color: '#555' }}>Oturum Suresi</Typography>
                  <Chip label="8 saat" size="small" sx={{ fontWeight: 600, fontSize: '0.75rem', backgroundColor: 'rgba(139, 185, 74, 0.1)', color: COLORS.secondary }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                  <Typography sx={{ fontSize: '0.85rem', color: '#555' }}>Iki Faktorlu Dogrulama (2FA)</Typography>
                  <Chip label="Yakin Zamanda" size="small" sx={{ fontWeight: 600, fontSize: '0.75rem', backgroundColor: 'rgba(255, 152, 0, 0.1)', color: '#f57c00' }} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                  <Typography sx={{ fontSize: '0.85rem', color: '#555' }}>Sifre Degistirme</Typography>
                  <Chip label="Aktif" size="small" sx={{ fontWeight: 600, fontSize: '0.75rem', backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50' }} />
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Giris Gecmisi */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ borderRadius: 3, p: 3, border: '1px solid rgba(28, 97, 171, 0.08)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <LoginIcon sx={{ color: COLORS.primary }} />
                <Typography sx={{ fontWeight: 700, color: COLORS.primary, fontSize: '1rem' }}>Giris Gecmisi</Typography>
              </Box>
              {loginLogs.length === 0 ? (
                <Typography sx={{ color: '#999', fontSize: '0.85rem', textAlign: 'center', py: 3 }}>Henuz giris kaydi yok</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'rgba(28, 97, 171, 0.04)' }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a1a2e', py: 1.5 }}>Tarih</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a1a2e', py: 1.5 }}>Islem</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a1a2e', py: 1.5 }}>Kullanici</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1a1a2e', py: 1.5 }}>IP</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {loginLogs.map((log) => (
                        <TableRow key={log.id} sx={{ '&:hover': { backgroundColor: 'rgba(28, 97, 171, 0.03)' } }}>
                          <TableCell sx={{ fontSize: '0.78rem', color: '#555', py: 0.8 }}>{formatDateTime(log.created_at)}</TableCell>
                          <TableCell sx={{ py: 0.8 }}>
                            <Chip label={log.action === 'LOGIN' ? 'Giris' : 'Cikis'} size="small"
                              sx={{
                                fontSize: '0.7rem', height: 22, fontWeight: 600,
                                backgroundColor: log.action === 'LOGIN' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(121, 85, 72, 0.1)',
                                color: log.action === 'LOGIN' ? '#4caf50' : '#795548'
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', color: '#555', py: 0.8 }}>{log.user_name || log.user_email || '-'}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: '#999', fontFamily: 'monospace', py: 0.8 }}>{log.ip_address || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // ============================================================
  // RENDER: PROFILE SECTION (Profilim - Sifre Degistirme)
  // ============================================================
  // RENDER: SECTION CONTENT
  // ============================================================
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'sites': return renderSiteTab();
      case 'users': return renderUserTab();
      case 'security': return renderSecuritySection();
      case 'permissions': return renderPermissionTab();
      case 'stats': return renderStatsTab();
      case 'audit': return renderAuditLogTab();
      default: return renderSiteTab();
    }
  };

  // ============================================================
  // MAIN RENDER
  // ============================================================
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
        <LinearProgress sx={{ width: 200, borderRadius: 1, '& .MuiLinearProgress-bar': { background: COLORS.gradient } }} />
        <Typography sx={{ color: '#999', fontSize: '0.9rem' }}>Yukleniyor...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      backgroundImage: "url('/site_background.jpg')",
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      backgroundPosition: 'center center',
    }}>
      {/* Top Bar - Drag region + geri butonu */}
      <Box sx={{
        background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.95), rgba(139, 185, 74, 0.95))',
        backdropFilter: 'blur(20px)',
        px: 3, pl: { xs: 3, md: 10 }, py: 1,
        display: 'flex', alignItems: 'center', gap: 2,
        WebkitAppRegion: 'drag',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 20px rgba(28, 97, 171, 0.2)'
      }}>
        <IconButton
          onClick={() => navigate('/admin/dashboard')}
          sx={{ color: 'white', WebkitAppRegion: 'no-drag', '&:hover': { background: 'rgba(255,255,255,0.15)' } }}
        >
          <CloseIcon />
        </IconButton>
        <SettingsIcon sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 22 }} />
        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
          Ayarlar
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Chip
          icon={<CircleIcon sx={{ fontSize: '10px !important', color: useBackend ? '#4caf50 !important' : '#ff9800 !important' }} />}
          label={useBackend ? 'Backend Bagli' : 'Lokal Mod'}
          size="small"
          sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, fontSize: '0.75rem', WebkitAppRegion: 'no-drag' }}
        />
      </Box>

      <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1400, mx: 'auto' }}>

        {/* Loading bar */}
        {backendLoading && <LinearProgress sx={{ mb: 1, borderRadius: 1, '& .MuiLinearProgress-bar': { background: COLORS.gradient } }} />}

        {/* Confluence-style: Left Nav + Content */}
        <Box sx={{ display: 'flex', gap: 3 }}>
          {/* Left Navigation */}
          <Paper sx={{
            width: 260, minWidth: 260, borderRadius: 3, overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(28, 97, 171, 0.08)',
            border: '1px solid rgba(28, 97, 171, 0.08)',
            alignSelf: 'flex-start',
            position: 'sticky', top: 24,
          }}>
            <List sx={{ py: 1 }}>
              {visibleSections.map((section) => (
                <ListItemButton
                  key={section.key}
                  selected={activeSection === section.key}
                  onClick={() => handleSectionChange(section.key)}
                  sx={{
                    mx: 1, my: 0.3, borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(28, 97, 171, 0.06)',
                    },
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(28, 97, 171, 0.1)',
                      borderLeft: `3px solid ${COLORS.primary}`,
                      '&:hover': {
                        backgroundColor: 'rgba(28, 97, 171, 0.14)',
                      },
                    },
                  }}
                >
                  <ListItemIcon sx={{
                    minWidth: 36,
                    color: activeSection === section.key ? COLORS.primary : '#999',
                  }}>
                    {section.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={section.label}
                    primaryTypographyProps={{
                      fontSize: '0.88rem',
                      fontWeight: activeSection === section.key ? 700 : 500,
                      color: activeSection === section.key ? COLORS.primary : '#555',
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>

          {/* Content Area */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {renderSectionContent()}
          </Box>
        </Box>

        {/* Dialogs */}
        {renderSiteDialog()}
        {renderUserDialog()}
        {renderPermissionDialog()}
        {renderDeleteDialog()}

        {/* Snackbar */}
        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}
            sx={{ borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
