// Admin Layout - Yönetici sayfaları için genel layout
import React from 'react';
import { Outlet } from 'react-router-dom';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';
import { Box, CircularProgress } from '@mui/material';
import { NotificationProvider } from '../../contexts/NotificationContext';

function AdminLayout() {
  const { isLoading, isAuthenticated } = useEmployeeAuth();

  if (isLoading) {
    return (
      <Box 
        sx={{ 
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: "url('/site_background.jpg')",
          backgroundSize: "cover"
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return null; // ProtectedRoute yönlendirecek
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
            backgroundImage: "url('/site_background.jpg')",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
            backgroundPosition: "center center",
            minHeight: '100vh'
          }}
        >
          {/* Header */}
          <AdminHeader />

          {/* Page Content */}
          <Box
            sx={{
              flex: 1,
              p: 3,
              overflow: 'auto',
              // Overlay for better content readability
              '&::before': {
                content: '""',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(255, 255, 255, 0.05)',
                zIndex: -1,
                pointerEvents: 'none'
              }
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