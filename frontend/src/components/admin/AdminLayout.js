// Admin Layout - Liquid Glass Theme System
import React from 'react';
import { Outlet } from 'react-router-dom';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import { Box, CircularProgress } from '@mui/material';
import { NotificationProvider } from '../../contexts/NotificationContext';

function AdminLayout() {
  const { isLoading, isAuthenticated } = useEmployeeAuth();
  const { themeConfig } = useTheme();

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
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content Area */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundImage: `url(${themeConfig?.wallpaper || '/site_background.jpg'})`,
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
            backgroundPosition: 'center center',
            minHeight: '100vh',
            position: 'relative'
          }}
        >
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
