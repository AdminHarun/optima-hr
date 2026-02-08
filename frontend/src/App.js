// src/App.js - Updated with Employee Auth System
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, GlobalStyles } from '@mui/material';

// Employee Auth System
import { EmployeeAuthProvider, PERMISSIONS } from './auth/employee/EmployeeAuthContext';
import AdminProtectedRoute from './auth/employee/AdminProtectedRoute';

// Video Call System
import { VideoCallProvider } from './contexts/VideoCallContext';

// Site Management
import { SiteProvider } from './contexts/SiteContext';

// Public Pages (Applicant System)
import CreateProfile from './pages/CreateProfile';
import ApplicationFormSimple from './pages/ApplicationFormSimple';
import ApplicationSuccess from './pages/ApplicationSuccess';
import ApplicationDetail from './pages/ApplicationDetail';
import ApplicantChat from './pages/ApplicantChat';
import ApplicantProfile from './pages/ApplicantProfile';
import ApplicantCabinet from './pages/ApplicantCabinet';
import ApplicantLogin from './pages/ApplicantLogin';
import LandingPage from './pages/LandingPage';

// Admin Pages (Employee System)
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLayout from './components/admin/AdminLayout';

// Admin Pages
import Employees from './pages/Employees';
import Recruitment from './pages/Recruitment';
import ProfileManagement from './pages/ProfileManagement';
import ChatPageNew from './pages/admin/ChatPageNew';
import MailPage from './pages/MailPage';
import TimelinePage from './pages/admin/TimelinePage';
import InvitationsPage from './pages/admin/InvitationsPage';
import Payroll from './pages/Payroll';
import CallsPage from './pages/admin/CallsPageNew';
import CalendarPage from './pages/CalendarPage';
import SettingsPage from './pages/admin/SettingsPage';
import ProfilePage from './pages/admin/ProfilePage';

// Utils
import './utils/createDemoData'; // Demo data creator
import './utils/initEmployeeData'; // Employee demo data

// Unauthorized Page
const UnauthorizedPage = () => (
    <Box sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', textAlign: 'center', p: 3
    }}>
        <Box sx={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(244, 67, 54, 0.1), rgba(244, 67, 54, 0.05))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3
        }}>
            <Box sx={{ fontSize: '2.5rem' }}>&#128274;</Box>
        </Box>
        <Box sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#333', mb: 1 }}>
            Erisim Engellendi
        </Box>
        <Box sx={{ fontSize: '0.95rem', color: '#777', mb: 3, maxWidth: 400 }}>
            Bu sayfayi goruntuleme yetkiniz bulunmamaktadir. Erisim icin yetkilinizle iletisime gecin.
        </Box>
    </Box>
);

// Admin Routes Component - Auth provider içinde
function AdminRoutes() {
    return (
        <Routes>
            <Route path="login" element={<AdminLogin />} />
            <Route path="unauthorized" element={
                <AdminProtectedRoute>
                    <UnauthorizedPage />
                </AdminProtectedRoute>
            } />
            {/* Settings - Tam ekran, sidebar/header olmadan */}
            <Route path="settings" element={
                <AdminProtectedRoute>
                    <SettingsPage />
                </AdminProtectedRoute>
            } />
            <Route path="*" element={
                <AdminProtectedRoute>
                    <AdminLayout />
                </AdminProtectedRoute>
            }>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="mail" element={<MailPage />} />
                <Route path="chat" element={
                    <AdminProtectedRoute requiredPermission={PERMISSIONS.VIEW_CHAT}>
                        <ChatPageNew />
                    </AdminProtectedRoute>
                } />
                <Route path="calls" element={<CallsPage />} />
                <Route path="recruitment" element={
                    <AdminProtectedRoute requiredPermission={PERMISSIONS.VIEW_ALL_APPLICATIONS}>
                        <Recruitment />
                    </AdminProtectedRoute>
                } />
                <Route path="employees" element={
                    <AdminProtectedRoute requiredPermission={PERMISSIONS.VIEW_ALL_APPLICATIONS}>
                        <Employees />
                    </AdminProtectedRoute>
                } />
                <Route path="invitations" element={
                    <AdminProtectedRoute requiredPermission={PERMISSIONS.VIEW_ALL_APPLICATIONS}>
                        <InvitationsPage />
                    </AdminProtectedRoute>
                } />
                <Route path="timeline" element={<TimelinePage />} />
                <Route path="leaves" element={
                    <AdminProtectedRoute requiredPermission={PERMISSIONS.VIEW_LIMITED_REPORTS}>
                        <LeavesPage />
                    </AdminProtectedRoute>
                } />
                <Route path="payroll" element={
                    <AdminProtectedRoute requiredPermission={PERMISSIONS.VIEW_FULL_REPORTS}>
                        <Payroll />
                    </AdminProtectedRoute>
                } />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="reports" element={
                    <AdminProtectedRoute requiredPermission={PERMISSIONS.VIEW_LIMITED_REPORTS}>
                        <div>Raporlar - Yakinda</div>
                    </AdminProtectedRoute>
                } />
                {/* Redirects for old URLs */}
                <Route path="management" element={<Navigate to="/admin/settings" replace />} />
                <Route path="profiles" element={
                    <AdminProtectedRoute requiredPermission={PERMISSIONS.VIEW_ALL_APPLICATIONS}>
                        <ProfileManagement />
                    </AdminProtectedRoute>
                } />
                <Route path="users" element={<Navigate to="/admin/settings?section=users" replace />} />
                <Route path="sites" element={<Navigate to="/admin/settings?section=sites" replace />} />
                <Route path="security" element={<Navigate to="/admin/settings?section=security" replace />} />
                <Route path="documents" element={<Navigate to="/admin/settings" replace />} />
            </Route>
        </Routes>
    );
}

// Lazy load placeholder components
const LeavesPage = () => (
    <Box p={3}>
        <h2>İzinler Sayfası</h2>
        <p>Bu sayfa yapım aşamasında...</p>
    </Box>
);

// Global scrollbar stilleri
const globalStyles = (
  <GlobalStyles
    styles={{
      '*::-webkit-scrollbar': {
        width: '12px',
        height: '12px',
      },
      '*::-webkit-scrollbar-track': {
        background: 'rgba(28, 97, 171, 0.03)',
        borderRadius: '10px',
        margin: '5px',
      },
      '*::-webkit-scrollbar-thumb': {
        background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.2) 0%, rgba(139, 185, 74, 0.2) 100%)',
        borderRadius: '10px',
        border: '3px solid transparent',
        backgroundClip: 'content-box',
        transition: 'all 0.3s ease',
        '&:hover': {
          background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.4) 0%, rgba(139, 185, 74, 0.4) 100%)',
          backgroundClip: 'content-box',
        },
        '&:active': {
          background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.6) 0%, rgba(139, 185, 74, 0.6) 100%)',
          backgroundClip: 'content-box',
        },
      },
      '*::-webkit-scrollbar-corner': {
        background: 'transparent',
      },
      // Firefox scrollbar stilleri
      '*': {
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(28, 97, 171, 0.2) rgba(28, 97, 171, 0.03)',
      },
      // Smooth scrolling
      'html': {
        scrollBehavior: 'smooth',
      },
      // Body scrollbar - daha şeffaf
      'body::-webkit-scrollbar': {
        width: '14px',
      },
      'body::-webkit-scrollbar-track': {
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(10px)',
      },
      'body::-webkit-scrollbar-thumb': {
        background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.15) 0%, rgba(139, 185, 74, 0.15) 100%)',
        backdropFilter: 'blur(10px)',
        border: '4px solid transparent',
        backgroundClip: 'content-box',
      },
      // Table scrollbars
      '.MuiTableContainer-root::-webkit-scrollbar': {
        height: '8px',
        width: '8px',
      },
      '.MuiTableContainer-root::-webkit-scrollbar-track': {
        background: 'rgba(0, 0, 0, 0.05)',
        borderRadius: '4px',
      },
      '.MuiTableContainer-root::-webkit-scrollbar-thumb': {
        background: 'rgba(28, 97, 171, 0.3)',
        borderRadius: '4px',
        '&:hover': {
          background: 'rgba(28, 97, 171, 0.5)',
        },
      },
      // Dialog scrollbars
      '.MuiDialog-paper::-webkit-scrollbar': {
        width: '8px',
      },
      '.MuiDialog-paper::-webkit-scrollbar-track': {
        background: 'rgba(0, 0, 0, 0.05)',
        borderRadius: '4px',
      },
      '.MuiDialog-paper::-webkit-scrollbar-thumb': {
        background: 'rgba(139, 185, 74, 0.3)',
        borderRadius: '4px',
        '&:hover': {
          background: 'rgba(139, 185, 74, 0.5)',
        },
      },
      // Drawer scrollbars
      '.MuiDrawer-paper::-webkit-scrollbar': {
        width: '6px',
      },
      '.MuiDrawer-paper::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '.MuiDrawer-paper::-webkit-scrollbar-thumb': {
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '3px',
        '&:hover': {
          background: 'rgba(255, 255, 255, 0.3)',
        },
      },
    }}
  />
);

const theme = createTheme({
    palette: {
        primary: {
            main: '#1c61ab', // Optima mavi
            light: '#4a9eff',
            dark: '#0d4f91'
        },
        secondary: {
            main: '#8bb94a', // Optima yeşil
            light: '#a4d65e',
            dark: '#6b9137'
        },
        background: {
            default: 'transparent', // Şeffaf yapıldı
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
        MuiButton: {
            styleOverrides: {
                contained: {
                    borderRadius: '12px',
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(28, 97, 171, 0.3)',
                    '&:hover': {
                        boxShadow: '0 8px 20px rgba(28, 97, 171, 0.4)',
                        transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.3s ease'
                }
            }
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: '16px',
                    transition: 'all 0.3s ease'
                }
            }
        }
    }
});

function App() {
    // Sayfa yüklendiğinde body'ye arka plan ekleme
    useEffect(() => {
        document.body.style.backgroundImage = "url('/site_background.jpg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundRepeat = "no-repeat";
        document.body.style.backgroundAttachment = "fixed";
        document.body.style.backgroundPosition = "center center";
        document.body.style.minHeight = "100vh";
        
        return () => {
            // Cleanup function (component unmount olduğunda)
            document.body.style.backgroundImage = "";
        };
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            {globalStyles}
            <Router>
                <Routes>
                    {/* PUBLIC ROUTES - Başvuru Sahipleri İçin */}
                    <Route path="/create-profile/:token" element={<CreateProfile />} />
                    <Route path="/apply/:token" element={<ApplicationFormSimple />} />
                    <Route path="/application-success" element={<ApplicationSuccess />} />
                    <Route path="/application/:id" element={<ApplicationDetail />} />
                    <Route path="/chat/:chatToken" element={<ApplicantChat />} />
                    <Route path="/applicant-chat/:applicantId" element={<ApplicantChat />} />
                    <Route path="/profile/:applicantId" element={<ApplicantProfile />} />
                    <Route path="/cabinet" element={<ApplicantCabinet />} />
                    <Route path="/applicant-login" element={<ApplicantLogin />} />
                    
                    {/* ADMIN SİSTEMİ - Auth Provider, Site Provider ve Video Call Provider ile sarmalanmış */}
                    <Route path="/admin/*" element={
                        <EmployeeAuthProvider>
                            <SiteProvider>
                                <VideoCallProvider>
                                    <AdminRoutes />
                                </VideoCallProvider>
                            </SiteProvider>
                        </EmployeeAuthProvider>
                    } />
                    
                    {/* LANDING PAGE */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
                    
                    {/* 404 */}
                    <Route path="*" element={<div>404: Sayfa Bulunamadı</div>} />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;
