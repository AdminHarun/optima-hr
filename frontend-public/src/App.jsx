// Optima HR - Public Career Portal (Applicant System)
// Bu uygulama SADECE aday (applicant) sayfalarini icerir.
// Admin ve Employee kodlari YOKTUR.

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

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
      default: '#f8fafc',
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
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Landing / Ana Sayfa */}
          <Route path="/" element={<LandingPage />} />

          {/* Basvuru Akisi */}
          <Route path="/create-profile/:token" element={<CreateProfile />} />
          <Route path="/apply/:token" element={<ApplicationFormSimple />} />
          <Route path="/application-success" element={<ApplicationSuccess />} />
          <Route path="/application/:id" element={<ApplicationDetail />} />

          {/* Aday Paneli */}
          <Route path="/applicant-login" element={<ApplicantLogin />} />
          <Route path="/cabinet" element={<ApplicantCabinet />} />
          <Route path="/profile/:applicantId" element={<ApplicantProfile />} />

          {/* Aday Chat */}
          <Route path="/chat/:chatToken" element={<ApplicantChat />} />
          <Route path="/applicant-chat/:applicantId" element={<ApplicantChat />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </MuiThemeProvider>
  );
}

export default App;
