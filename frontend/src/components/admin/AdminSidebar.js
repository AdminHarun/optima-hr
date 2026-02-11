// Admin Sidebar - Liquid Glass Theme Support
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Chip,
  Collapse
} from '@mui/material';

import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Chat as ChatIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  PersonAdd as PersonAddIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
  Group as GroupIcon,
  Description as DocumentsIcon,
  EventAvailable as LeavesIcon,
  AccountBalance as PayrollIcon,
  Work as WorkIcon,
  Timeline as TimelineIcon,
  LocalOffer as InvitationIcon,
  FolderShared as ProfilesIcon,
  ExpandLess,
  ExpandMore,
  SupervisorAccount as ManagementIcon,
  AccountCircle as AccountCircleIcon
} from '@mui/icons-material';

// Optima Logo import
import optimaLogo from '../../assets/images/logo3.png';

const DRAWER_WIDTH = 280;

function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, hasPermission, PERMISSIONS, EMPLOYEE_ROLES } = useEmployeeAuth();
  const { themeConfig } = useTheme();
  const [openEmployeeMenu, setOpenEmployeeMenu] = useState(false);

  // Ana menü öğeleri
  const menuItems = [
    {
      title: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/admin/dashboard',
      permission: null
    },
    {
      title: 'Çalışan Yönetimi',
      icon: <ManagementIcon />,
      permission: PERMISSIONS.VIEW_ALL_APPLICATIONS,
      isExpandable: true,
      subItems: [
        {
          title: 'Çalışanlar',
          icon: <GroupIcon />,
          path: '/admin/employees',
          permission: PERMISSIONS.VIEW_ALL_APPLICATIONS
        },
        {
          title: 'Başvuru Formları',
          icon: <WorkIcon />,
          path: '/admin/recruitment',
          permission: PERMISSIONS.VIEW_ALL_APPLICATIONS
        },
        {
          title: 'Aday Profilleri',
          icon: <ProfilesIcon />,
          path: '/admin/profiles',
          permission: PERMISSIONS.VIEW_ALL_APPLICATIONS
        }
      ]
    },
    {
      title: 'Davetler',
      icon: <InvitationIcon />,
      path: '/admin/invitations',
      permission: PERMISSIONS.VIEW_ALL_APPLICATIONS
    },
    {
      title: 'Akış',
      icon: <TimelineIcon />,
      path: '/admin/timeline',
      permission: null
    },
    {
      title: 'İzinler',
      icon: <LeavesIcon />,
      path: '/admin/leaves',
      permission: PERMISSIONS.VIEW_LIMITED_REPORTS
    },
    {
      title: 'Bordro',
      icon: <PayrollIcon />,
      path: '/admin/payroll',
      permission: PERMISSIONS.VIEW_FULL_REPORTS
    },
    {
      title: 'Raporlar',
      icon: <AssessmentIcon />,
      path: '/admin/reports',
      permission: PERMISSIONS.VIEW_LIMITED_REPORTS
    },
    {
      title: 'Profilim',
      icon: <AccountCircleIcon />,
      path: '/admin/profile',
      permission: null
    },
    {
      title: 'Ayarlar',
      icon: <SettingsIcon />,
      path: '/admin/settings',
      permission: PERMISSIONS.MANAGE_SETTINGS
    }
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isCurrentPath = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleExpandClick = (e) => {
    e.stopPropagation();
    setOpenEmployeeMenu(!openEmployeeMenu);
  };

  const isSubMenuActive = (subItems) => {
    return subItems?.some(item => isCurrentPath(item.path)) || false;
  };

  const visibleMenuItems = menuItems.filter(item => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          background: 'var(--theme-sidebar-bg)',
          backdropFilter: `blur(var(--theme-glass-blur, 20px)) saturate(var(--theme-glass-saturation, 180%))`,
          WebkitBackdropFilter: `blur(var(--theme-glass-blur, 20px)) saturate(var(--theme-glass-saturation, 180%))`,
          border: 'none',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)'
        },
      }}
    >
      {/* Sidebar Header */}
      <Box sx={{ p: 3, textAlign: 'center', color: 'var(--theme-sidebar-text, white)' }}>
        <img
          src={optimaLogo}
          alt="Optima Logo"
          style={{
            maxWidth: '200px',
            height: 'auto',
            marginBottom: '16px',
            filter: 'brightness(0) invert(1)'
          }}
        />
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Yönetim Paneli
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Kullanıcı Bilgisi */}
      <Box sx={{ p: 2, color: 'var(--theme-sidebar-text, white)' }}>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Hoş geldiniz,
        </Typography>
        <Typography variant="body1" fontWeight="bold">
          {currentUser?.firstName} {currentUser?.lastName}
        </Typography>

        {currentUser?.role !== EMPLOYEE_ROLES.SUPER_ADMIN && (
          <Chip
            size="small"
            label={currentUser?.siteName || 'Site Atanmadı'}
            sx={{
              mt: 1,
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              fontSize: '11px'
            }}
          />
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Menü Listesi */}
      <List sx={{ px: 1, py: 2 }}>
        {visibleMenuItems.map((item) => (
          <React.Fragment key={item.title}>
            {item.isExpandable ? (
              <>
                <ListItemButton
                  onClick={handleExpandClick}
                  selected={isSubMenuActive(item.subItems)}
                  sx={{
                    mb: 0.5,
                    borderRadius: '12px',
                    mx: 1,
                    color: 'var(--theme-sidebar-text, white)',
                    '&:hover': {
                      background: 'var(--theme-sidebar-hover)',
                      transform: 'translateX(4px)',
                    },
                    '&.Mui-selected': {
                      background: 'var(--theme-sidebar-active)',
                      borderLeft: '4px solid white',
                      '&:hover': {
                        background: 'var(--theme-sidebar-active)',
                      }
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: '40px' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    primaryTypographyProps={{
                      fontSize: '14px',
                      fontWeight: isSubMenuActive(item.subItems) ? 'bold' : 'normal'
                    }}
                  />
                  {openEmployeeMenu ? <ExpandLess /> : <ExpandMore />}
                </ListItemButton>
                <Collapse in={openEmployeeMenu} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems?.filter(subItem =>
                      !subItem.permission || hasPermission(subItem.permission)
                    ).map((subItem) => (
                      <ListItemButton
                        key={subItem.path}
                        onClick={() => handleNavigation(subItem.path)}
                        selected={isCurrentPath(subItem.path)}
                        sx={{
                          pl: 4,
                          mb: 0.5,
                          borderRadius: '12px',
                          mx: 1,
                          color: 'var(--theme-sidebar-text, white)',
                          '&:hover': {
                            background: 'var(--theme-sidebar-hover)',
                            transform: 'translateX(4px)',
                          },
                          '&.Mui-selected': {
                            background: 'var(--theme-sidebar-active)',
                            borderLeft: '3px solid white',
                            '&:hover': {
                              background: 'var(--theme-sidebar-active)',
                            }
                          },
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <ListItemIcon sx={{ color: 'inherit', minWidth: '35px' }}>
                          {subItem.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={subItem.title}
                          primaryTypographyProps={{
                            fontSize: '13px',
                            fontWeight: isCurrentPath(subItem.path) ? 'bold' : 'normal'
                          }}
                        />
                      </ListItemButton>
                    ))}
                  </List>
                </Collapse>
              </>
            ) : (
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={isCurrentPath(item.path)}
                sx={{
                  mb: 0.5,
                  borderRadius: '12px',
                  mx: 1,
                  color: 'var(--theme-sidebar-text, white)',
                  '&:hover': {
                    background: 'var(--theme-sidebar-hover)',
                    transform: 'translateX(4px)',
                  },
                  '&.Mui-selected': {
                    background: 'var(--theme-sidebar-active)',
                    borderLeft: '4px solid white',
                    '&:hover': {
                      background: 'var(--theme-sidebar-active)',
                    }
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: '40px' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  primaryTypographyProps={{
                    fontSize: '14px',
                    fontWeight: isCurrentPath(item.path) ? 'bold' : 'normal'
                  }}
                />
              </ListItemButton>
            )}
          </React.Fragment>
        ))}
      </List>

      {/* Sidebar Footer */}
      <Box sx={{ mt: 'auto', p: 2, color: 'var(--theme-sidebar-text, white)', textAlign: 'center' }}>
        <Typography variant="caption" sx={{ opacity: 0.6 }}>
          v1.0.0 - OPTIMA HR Management System
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 1 }}>
          <Chip
            size="small"
            label="Güvenli"
            icon={<SecurityIcon />}
            sx={{
              background: 'rgba(76, 175, 80, 0.2)',
              color: 'white',
              fontSize: '10px'
            }}
          />
        </Box>
      </Box>
    </Drawer>
  );
}

export default AdminSidebar;
