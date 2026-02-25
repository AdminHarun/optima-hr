import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box, Typography } from '@mui/material';
import theme from './theme';
import Sidebar from './components/Sidebar';
import PortalLogin from './pages/PortalLogin';
import Dashboard from './pages/Dashboard';
import UsersPage from './pages/UsersPage';
import AppsPage from './pages/AppsPage';
import PlaceholderPage from './pages/PlaceholderPage';
import { API_BASE_URL } from './config';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Session kontrolü — sayfa yenilendiğinde cookie'den user bilgisi al
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            const allowedRoles = ['SUPER_ADMIN', 'DEVELOPER', 'ADMIN'];
            if (allowedRoles.includes(data.user.role)) {
              setUser(data.user);
            }
          }
        }
      } catch (err) {
        // Session yok veya expired
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) { /* ignore */ }
    setUser(null);
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0f172a'
        }}>
          <Typography sx={{ color: '#64748b' }}>Yükleniyor...</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <PortalLogin onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Box sx={{ display: 'flex', minHeight: '100vh', background: '#0f172a' }}>
          <Sidebar user={user} onLogout={handleLogout} />
          <Box component="main" sx={{
            flexGrow: 1, p: 4, overflow: 'auto',
            background: 'linear-gradient(180deg, #0f172a 0%, #1a2332 100%)'
          }}>
            <Routes>
              <Route path="/" element={<Dashboard user={user} />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/apps" element={<AppsPage />} />
              <Route path="/roles" element={<PlaceholderPage title="Roller & Gruplar" description="Kullanıcı rollerini ve grup yetkilerini yönetin" />} />
              <Route path="/departments" element={<PlaceholderPage title="Departmanlar" description="Organizasyon departmanlarını yönetin" />} />
              <Route path="/security/auth" element={<PlaceholderPage title="Kimlik Doğrulama" description="2FA politikaları ve MFA ayarları" />} />
              <Route path="/security/sessions" element={<PlaceholderPage title="Oturum Yönetimi" description="Aktif oturumlar ve session süreleri" />} />
              <Route path="/security/ip" element={<PlaceholderPage title="IP Whitelist" description="İzin verilen IP adresleri" />} />
              <Route path="/security/audit" element={<PlaceholderPage title="Denetim Kayıtları" description="Kullanıcı aktivite logları" />} />
              <Route path="/data" element={<PlaceholderPage title="Veri Yönetimi" description="Dosya depolama ve yedekleme" />} />
              <Route path="/settings/company" element={<PlaceholderPage title="Şirket Profili" description="Şirket bilgileri ve ayarları" />} />
              <Route path="/settings/branding" element={<PlaceholderPage title="Branding" description="Logo, renk teması ve görsel kimlik" />} />
              <Route path="/settings/domains" element={<PlaceholderPage title="Domain Yönetimi" description="Subdomain yapılandırması" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Box>
        </Box>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
