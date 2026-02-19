// src/App.js - Updated with Employee Auth System & Liquid Glass Themes
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';

// Employee Auth System
import { EmployeeAuthProvider, PERMISSIONS } from './auth/employee/EmployeeAuthContext';
import AdminProtectedRoute from './auth/employee/AdminProtectedRoute';

// Video Call System
import { VideoCallProvider } from './contexts/VideoCallContext';

// Site Management
import { SiteProvider } from './contexts/SiteContext';

// Dynamic Theme System
import { ThemeProvider as OptimaThemeProvider } from './contexts/ThemeContext';

// Electron Integration
import ElectronTitleBar from './components/layout/ElectronTitleBar';

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
import TasksPage from './pages/TasksPage';
import KanbanBoard from './pages/KanbanBoard';
import FilesPage from './pages/FilesPage';

// Utils
import './utils/createDemoData';
import './utils/initEmployeeData';

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

// Admin Routes Component
function AdminRoutes() {
    return (
        <Routes>
            <Route path="login" element={<AdminLogin />} />
            <Route path="unauthorized" element={
                <AdminProtectedRoute>
                    <UnauthorizedPage />
                </AdminProtectedRoute>
            } />
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
                <Route path="tasks" element={<TasksPage />} />
                <Route path="kanban" element={<KanbanBoard />} />
                <Route path="files" element={<FilesPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="reports" element={
                    <AdminProtectedRoute requiredPermission={PERMISSIONS.VIEW_LIMITED_REPORTS}>
                        <div>Raporlar - Yakinda</div>
                    </AdminProtectedRoute>
                } />
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

const theme = createTheme({
    palette: {
        primary: {
            main: '#1c61ab',
            light: '#4a9eff',
            dark: '#0d4f91'
        },
        secondary: {
            main: '#8bb94a',
            light: '#a4d65e',
            dark: '#6b9137'
        },
        background: {
            default: 'transparent',
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
    return (
        <OptimaThemeProvider>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                <ElectronTitleBar />
                <Router>
                    <Routes>
                        {/* PUBLIC ROUTES */}
                        <Route path="/create-profile/:token" element={<CreateProfile />} />
                        <Route path="/apply/:token" element={<ApplicationFormSimple />} />
                        <Route path="/application-success" element={<ApplicationSuccess />} />
                        <Route path="/application/:id" element={<ApplicationDetail />} />
                        <Route path="/chat/:chatToken" element={<ApplicantChat />} />
                        <Route path="/applicant-chat/:applicantId" element={<ApplicantChat />} />
                        <Route path="/profile/:applicantId" element={<ApplicantProfile />} />
                        <Route path="/cabinet" element={<ApplicantCabinet />} />
                        <Route path="/applicant-login" element={<ApplicantLogin />} />

                        {/* ADMIN SYSTEM */}
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
            </MuiThemeProvider>
        </OptimaThemeProvider>
    );
}

export default App;
