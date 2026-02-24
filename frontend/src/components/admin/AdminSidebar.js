// Admin Sidebar - Liquid Glass Theme Support
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import ProfileDropdownMenu from './ProfileDropdownMenu';
import PreferencesModal from './PreferencesModal';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Collapse
} from '@mui/material';

import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Group as GroupIcon,
  EventAvailable as LeavesIcon,
  AccountBalance as PayrollIcon,
  Work as WorkIcon,
  Timeline as TimelineIcon,
  LocalOffer as InvitationIcon,
  FolderShared as ProfilesIcon,
  ExpandLess,
  ExpandMore,
  SupervisorAccount as ManagementIcon,
  AccountCircle as AccountCircleIcon,
  ViewKanban as KanbanIcon,
  FolderOpen as FilesIcon
} from '@mui/icons-material';

// Optima Logo import
import optimaLogo from '../../assets/images/logo3.png';

const DRAWER_WIDTH = 280;

function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, hasPermission, PERMISSIONS } = useEmployeeAuth();
  const { themeConfig } = useTheme();
  const [openEmployeeMenu, setOpenEmployeeMenu] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [preferencesOpen, setPreferencesOpen] = useState(false);

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
      title: 'Görevler',
      icon: <AssignmentIcon />,
      path: '/admin/tasks',
      permission: null
    },
    {
      title: 'Kanban Panosu',
      icon: <KanbanIcon />,
      path: '/admin/kanban',
      permission: null
    },
    {
      title: 'Dosyalar',
      icon: <FilesIcon />,
      path: '/admin/files',
      permission: null
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
      PaperProps={{
        sx: {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          background: 'var(--theme-sidebar-bg)',
          backgroundColor: 'transparent',
          backdropFilter: `blur(var(--theme-glass-blur, 20px)) saturate(var(--theme-glass-saturation, 180%))`,
          WebkitBackdropFilter: `blur(var(--theme-glass-blur, 20px)) saturate(var(--theme-glass-saturation, 180%))`,
          border: 'none',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)'
        }
      }}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
      }}
    >
      {/* Sidebar Header */}
      <Box sx={{ p: 2, textAlign: 'center', color: 'var(--theme-sidebar-text, white)' }}>
        <img
          src={optimaLogo}
          alt="Optima Logo"
          style={{
            maxWidth: '160px',
            height: 'auto',
            filter: 'brightness(0) invert(1)'
          }}
        />
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

      {/* Profil Karti - Premium Tasarim */}
      <Box
        onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
        sx={{
          mt: 'auto',
          p: 1.5,
          mx: 1,
          mb: 1,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          pt: 2,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderRadius: '12px',
          transition: 'all 0.2s ease',
          '&:hover': {
            background: 'var(--theme-sidebar-hover, rgba(255,255,255,0.08))',
          }
        }}
      >
        {/* Avatar */}
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--theme-button-primary, #1c61ab), #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '15px',
              color: 'white',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              overflow: 'hidden'
            }}
          >
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              `${currentUser?.first_name?.[0] || currentUser?.firstName?.[0] || ''}${currentUser?.last_name?.[0] || currentUser?.lastName?.[0] || ''}`.toUpperCase()
            )}
          </Box>
          {/* Online Status Dot */}
          <Box sx={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: 12,
            height: 12,
            bgcolor: '#2EB67D',
            border: '2.5px solid var(--theme-sidebar-bg, #1a1d21)',
            borderRadius: '50%',
            boxShadow: '0 0 6px rgba(46, 182, 125, 0.5)'
          }} />
        </Box>

        {/* Kullanici Bilgileri */}
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Typography
            sx={{
              color: 'var(--theme-sidebar-text, #fff)',
              fontWeight: 700,
              fontSize: '13.5px',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {currentUser?.first_name || currentUser?.firstName || ''} {currentUser?.last_name || currentUser?.lastName || ''}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 0.8,
                py: 0.15,
                borderRadius: '4px',
                bgcolor: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}
            >
              <Typography
                sx={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#a5b4fc',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}
              >
                {currentUser?.role === 'SUPER_ADMIN' ? 'Super Admin' :
                  currentUser?.role === 'ADMIN' ? 'Admin' :
                    currentUser?.role === 'HR_MANAGER' ? 'IK Yonetici' :
                      currentUser?.role === 'HR' ? 'IK' :
                        currentUser?.role === 'HR_EXPERT' ? 'IK Uzman' :
                          currentUser?.role || 'Kullanici'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Uc Nokta Menu Ikonu */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.35)',
            fontSize: '16px',
            flexShrink: 0,
          }}
        >
          ⋮
        </Box>
      </Box>

      {/* ProfileDropdownMenu - Part 2 */}
      <ProfileDropdownMenu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={() => setProfileMenuAnchor(null)}
        onPreferencesClick={() => {
          setProfileMenuAnchor(null);
          setPreferencesOpen(true);
        }}
      />

      {/* PreferencesModal - Part 3 */}
      <PreferencesModal
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />
    </Drawer>
  );
}

export default AdminSidebar;
