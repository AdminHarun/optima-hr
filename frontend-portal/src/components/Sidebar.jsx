import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Collapse, Avatar, Divider, IconButton, Tooltip
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  Apps as AppsIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  ExpandLess, ExpandMore,
  Shield as ShieldIcon,
  Group as GroupIcon,
  Apartment as ApartmentIcon,
  VpnKey as VpnKeyIcon,
  Timer as TimerIcon,
  Language as LanguageIcon,
  History as HistoryIcon,
  Business as BusinessIcon,
  Palette as PaletteIcon,
  Dns as DnsIcon,
  Logout as LogoutIcon,
  ChevronLeft as ChevronLeftIcon,
  Menu as MenuIcon,
  AdminPanelSettings
} from '@mui/icons-material';

const DRAWER_WIDTH = 280;
const DRAWER_COLLAPSED = 72;

const menuItems = [
  {
    id: 'dashboard',
    label: 'Genel Bakış',
    icon: <DashboardIcon />,
    path: '/'
  },
  {
    id: 'directory',
    label: 'Dizin',
    icon: <PeopleIcon />,
    children: [
      { id: 'users', label: 'Kullanıcılar', icon: <PeopleIcon />, path: '/users' },
      { id: 'roles', label: 'Roller & Gruplar', icon: <GroupIcon />, path: '/roles' },
      { id: 'departments', label: 'Departmanlar', icon: <ApartmentIcon />, path: '/departments' },
    ]
  },
  {
    id: 'apps',
    label: 'Uygulamalar',
    icon: <AppsIcon />,
    path: '/apps'
  },
  {
    id: 'security',
    label: 'Güvenlik',
    icon: <SecurityIcon />,
    children: [
      { id: 'auth-policies', label: 'Kimlik Doğrulama', icon: <VpnKeyIcon />, path: '/security/auth' },
      { id: 'sessions', label: 'Oturum Yönetimi', icon: <TimerIcon />, path: '/security/sessions' },
      { id: 'ip-whitelist', label: 'IP Whitelist', icon: <LanguageIcon />, path: '/security/ip' },
      { id: 'audit', label: 'Denetim Kayıtları', icon: <HistoryIcon />, path: '/security/audit' },
    ]
  },
  {
    id: 'data',
    label: 'Veri Yönetimi',
    icon: <StorageIcon />,
    path: '/data'
  },
  {
    id: 'settings',
    label: 'Ayarlar',
    icon: <SettingsIcon />,
    children: [
      { id: 'company', label: 'Şirket Profili', icon: <BusinessIcon />, path: '/settings/company' },
      { id: 'branding', label: 'Branding', icon: <PaletteIcon />, path: '/settings/branding' },
      { id: 'domains', label: 'Domain Yönetimi', icon: <DnsIcon />, path: '/settings/domains' },
    ]
  },
];

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [openSections, setOpenSections] = useState({ directory: true, security: false, settings: false });

  const toggleSection = (id) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const isActive = (path) => location.pathname === path;

  const drawerWidth = collapsed ? DRAWER_COLLAPSED : DRAWER_WIDTH;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        transition: 'width 0.3s ease',
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
          borderRight: '1px solid rgba(71, 85, 105, 0.3)',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
        },
      }}
    >
      {/* Header */}
      <Box sx={{
        p: 2, display: 'flex', alignItems: 'center', gap: 1.5,
        borderBottom: '1px solid rgba(71, 85, 105, 0.3)',
        minHeight: 64
      }}>
        <Box sx={{
          width: 40, height: 40, borderRadius: '12px',
          background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0
        }}>
          <ShieldIcon sx={{ color: '#fff', fontSize: 22 }} />
        </Box>
        {!collapsed && (
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography variant="subtitle2" sx={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
              Administration
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
              Optima HR
            </Typography>
          </Box>
        )}
        <IconButton size="small" onClick={() => setCollapsed(!collapsed)} sx={{ color: '#64748b' }}>
          {collapsed ? <MenuIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
        </IconButton>
      </Box>

      {/* Menu */}
      <List sx={{ px: 1, py: 1, flex: 1 }}>
        {menuItems.map((item) => {
          if (item.children) {
            return (
              <React.Fragment key={item.id}>
                <Tooltip title={collapsed ? item.label : ''} placement="right">
                  <ListItemButton
                    onClick={() => collapsed ? null : toggleSection(item.id)}
                    sx={{ px: collapsed ? 1.5 : 2, py: 1, minHeight: 44 }}
                  >
                    <ListItemIcon sx={{ color: '#64748b', minWidth: collapsed ? 'auto' : 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && (
                      <>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 500, color: '#cbd5e1' }}
                        />
                        {openSections[item.id] ? <ExpandLess sx={{ color: '#64748b', fontSize: 18 }} /> : <ExpandMore sx={{ color: '#64748b', fontSize: 18 }} />}
                      </>
                    )}
                  </ListItemButton>
                </Tooltip>
                {!collapsed && (
                  <Collapse in={openSections[item.id]} timeout="auto">
                    <List disablePadding>
                      {item.children.map((child) => (
                        <ListItemButton
                          key={child.id}
                          selected={isActive(child.path)}
                          onClick={() => navigate(child.path)}
                          sx={{ pl: 4, py: 0.75, minHeight: 38 }}
                        >
                          <ListItemIcon sx={{
                            color: isActive(child.path) ? '#3b82f6' : '#64748b',
                            minWidth: 32, '& .MuiSvgIcon-root': { fontSize: 18 }
                          }}>
                            {child.icon}
                          </ListItemIcon>
                          <ListItemText
                            primary={child.label}
                            primaryTypographyProps={{
                              fontSize: '0.8rem',
                              color: isActive(child.path) ? '#f1f5f9' : '#94a3b8',
                              fontWeight: isActive(child.path) ? 600 : 400
                            }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                )}
              </React.Fragment>
            );
          }

          return (
            <Tooltip key={item.id} title={collapsed ? item.label : ''} placement="right">
              <ListItemButton
                selected={isActive(item.path)}
                onClick={() => navigate(item.path)}
                sx={{ px: collapsed ? 1.5 : 2, py: 1, minHeight: 44 }}
              >
                <ListItemIcon sx={{
                  color: isActive(item.path) ? '#3b82f6' : '#64748b',
                  minWidth: collapsed ? 'auto' : 40
                }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.85rem',
                      color: isActive(item.path) ? '#f1f5f9' : '#cbd5e1',
                      fontWeight: isActive(item.path) ? 600 : 500
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      {/* User Footer */}
      <Box sx={{
        p: 2, borderTop: '1px solid rgba(71, 85, 105, 0.3)',
        display: 'flex', alignItems: 'center', gap: 1.5
      }}>
        <Avatar sx={{
          width: 36, height: 36,
          background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
          fontSize: '0.85rem', fontWeight: 700, flexShrink: 0
        }}>
          {user?.first_name?.[0] || 'A'}
        </Avatar>
        {!collapsed && (
          <>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <Typography variant="body2" sx={{ color: '#f1f5f9', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                {user?.first_name} {user?.last_name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem' }}>
                {user?.role}
              </Typography>
            </Box>
            <IconButton size="small" onClick={onLogout} sx={{ color: '#64748b' }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </>
        )}
      </Box>
    </Drawer>
  );
}
