// Admin Protected Routes - Yetki kontrolü
import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';

function AdminProtectedRoute({ children, requiredPermission = null, requiredRole = null }) {
  const { isAuthenticated, isLoading, currentUser, hasPermission } = useEmployeeAuth();

  // Yükleniyor durumu
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="primary">
          Yetki kontrol ediliyor...
        </Typography>
      </Box>
    );
  }

  // Giriş yapmamışsa login sayfasına yönlendir
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Yetki kontrolü
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  // Rol kontrolü  
  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  return children;
}

export default AdminProtectedRoute;
