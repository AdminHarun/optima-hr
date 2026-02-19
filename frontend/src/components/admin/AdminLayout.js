// Admin Layout - Liquid Glass Theme System
import React from 'react';
import { Outlet } from 'react-router-dom';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useElectron } from '../../hooks/useElectron';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import { Box, CircularProgress } from '@mui/material';
import { NotificationProvider } from '../../contexts/NotificationContext';

function AdminLayout() {
  const { isLoading, isAuthenticated } = useEmployeeAuth();
  const { themeConfig } = useTheme();
  const { isElectron, platform } = useElectron();

  if (isLoading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: `url(${themeConfig?.wallpaper || '/site_background.jpg'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <CircularProgress sx={{ color: 'var(--theme-primary, #1c61ab)' }} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <NotificationProvider>
      {/* Full-page wallpaper background - behind everything including sidebar */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${themeConfig?.wallpaper || '/site_background.jpg'})`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          backgroundPosition: 'center center',
          zIndex: -1
        }}
      />

      <Box sx={{
        display: 'flex',
        minHeight: '100vh',
        paddingTop: isElectron && platform === 'darwin' ? '32px' : 0
      }}>
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content Area */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            position: 'relative'
          }}
        >
          {/* Dark overlay for better readability on wallpaper themes */}
          {!themeConfig?.isBasic && (
            <Box
              sx={{
                position: 'fixed',
                top: 0,
                left: 280, // Sidebar width
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.3)',
                pointerEvents: 'none',
                zIndex: 0
              }}
            />
          )}

          {/* Header */}
          <AdminHeader />

          {/* Page Content */}
          <Box
            sx={{
              flex: 1,
              p: 3,
              overflow: 'auto'
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </NotificationProvider>
  );
}

export default AdminLayout;
