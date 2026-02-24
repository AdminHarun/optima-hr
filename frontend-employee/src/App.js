// src/App.js - Employee Self-Service Portal
// Bu uygulama SADECE calisan (employee) sayfalarini icerir.
// Admin yonetim sayfalari (Bordro, Calisanlar, Ayarlar vb.) YOKTUR.
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Typography } from '@mui/material';

// Employee Auth System
import { EmployeeAuthProvider, PERMISSIONS } from './auth/employee/EmployeeAuthContext';
import AdminProtectedRoute from './auth/employee/AdminProtectedRoute';

// Video Call System
import { VideoCallProvider } from './contexts/VideoCallContext';

// Site Management
import { SiteProvider } from './contexts/SiteContext';

// Dynamic Theme System
import { ThemeProvider as OptimaThemeProvider } from './contexts/ThemeContext';

// Keyboard Shortcuts
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import KeyboardShortcutsModal from './components/common/KeyboardShortcutsModal';

// Employee Login
import AdminLogin from './pages/admin/AdminLogin';

// Employee Pages
import ChatPageNew from './pages/admin/ChatPageNew';
import CallsPage from './pages/admin/CallsPageNew';
import CalendarPage from './pages/CalendarPage';
import ProfilePage from './pages/admin/ProfilePage';
import TasksPage from './pages/TasksPage';
import FilesPage from './pages/FilesPage';

// Simple Employee Dashboard
const EmployeeDashboard = () => (
    <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
            Hosgeldiniz
        </Typography>
        <Typography variant="body1" color="text.secondary">
            Calisan portaliniz. Sol menuden sayfalar arasinda gezinebilirsiniz.
        </Typography>
    </Box>
);

// Izinlerim placeholder
const MyLeavesPage = () => (
    <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            Izinlerim
        </Typography>
        <Typography color="text.secondary">
            Izin taleplerinizi buradan yonetebilirsiniz. (Yapim asamasinda)
        </Typography>
    </Box>
);

// Employee Routes
function EmployeeRoutes() {
    return (
        <Routes>
            <Route path="login" element={<AdminLogin />} />
            <Route path="*" element={
                <AdminProtectedRoute>
                    <Routes>
                        <Route path="dashboard" element={<EmployeeDashboard />} />
                        <Route path="chat" element={<ChatPageNew />} />
                        <Route path="calls" element={<CallsPage />} />
                        <Route path="tasks" element={<TasksPage />} />
                        <Route path="calendar" element={<CalendarPage />} />
                        <Route path="files" element={<FilesPage />} />
                        <Route path="leaves" element={<MyLeavesPage />} />
                        <Route path="profile" element={<ProfilePage />} />
                        <Route path="*" element={<Navigate to="dashboard" replace />} />
                    </Routes>
                </AdminProtectedRoute>
            } />
        </Routes>
    );
}

const theme = createTheme({
    palette: {
        primary: { main: '#1c61ab', light: '#4a9eff', dark: '#0d4f91' },
        secondary: { main: '#8bb94a', light: '#a4d65e', dark: '#6b9137' },
        background: { default: 'transparent' },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
        MuiButton: {
            styleOverrides: {
                contained: {
                    borderRadius: '12px', textTransform: 'none', fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(28, 97, 171, 0.3)',
                    '&:hover': { boxShadow: '0 8px 20px rgba(28, 97, 171, 0.4)', transform: 'translateY(-2px)' },
                    transition: 'all 0.3s ease'
                }
            }
        }
    }
});

function App() {
    const [showShortcuts, setShowShortcuts] = React.useState(false);

    useKeyboardShortcuts({
        showShortcuts: () => setShowShortcuts(true),
        closeModal: () => setShowShortcuts(false)
    });

    return (
        <OptimaThemeProvider>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
                <Router>
                    <Routes>
                        <Route path="/employee/*" element={
                            <EmployeeAuthProvider>
                                <SiteProvider>
                                    <VideoCallProvider>
                                        <EmployeeRoutes />
                                    </VideoCallProvider>
                                </SiteProvider>
                            </EmployeeAuthProvider>
                        } />

                        <Route path="/" element={<Navigate to="/employee/login" replace />} />
                        <Route path="*" element={<Navigate to="/employee/login" replace />} />
                    </Routes>
                </Router>
            </MuiThemeProvider>
        </OptimaThemeProvider>
    );
}

export default App;
