// src/pages/ProfileManagement.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Alert,
  Tabs,
  Tab,
  Divider,
  TextField,
  Badge,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Person as PersonIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AccessTime as TimeIcon,
  Computer as DeviceIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Router as RouterIcon,
  NetworkCheck as NetworkIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Flag as FlagIcon,
  HelpOutline,
  CheckCircle as CheckCircleIcon,
  VpnLock as VpnIcon
} from '@mui/icons-material';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:9000') + '/api';

const getCurrentSiteCode = () => localStorage.getItem('optima_current_site') || 'FXB';

const getSiteHeaders = () => ({
  'Content-Type': 'application/json',
  'X-Site-Id': getCurrentSiteCode(),
});

function ProfileManagement() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [securities, setSecurities] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [detailDialog, setDetailDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [ipMacAnalysis, setIpMacAnalysis] = useState({});
  const [suspiciousProfiles, setSuspiciousProfiles] = useState([]);
  const [showNetworkDetails, setShowNetworkDetails] = useState(false);
  const [detailTab, setDetailTab] = useState(0);

  // Profilleri yükle
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/applications/profiles/all`, {
        credentials: 'include',
        headers: getSiteHeaders(),
      });

      if (response.ok) {
        const apiProfiles = await response.json();
        const formattedProfiles = apiProfiles.map(p => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          phone: p.phone,
          chatToken: p.chatToken,
          createdAt: p.createdAt,
          siteCode: p.siteCode,
          hasApplication: p.hasApplication,
          applicationStatus: p.applicationStatus,
          applications: p.applications,
          invitationLink: p.invitationLink,
          isActive: p.isActive !== false,
          deactivatedAt: p.deactivatedAt || null,
          reactivatedAt: p.reactivatedAt || null,
          // Yeni: Cihaz ve ag bilgileri
          profileCreatedIp: p.profileCreatedIp,
          profileCreatedLocation: p.profileCreatedLocation,
          deviceInfo: p.deviceInfo,
          vpnScore: p.vpnScore || 0,
          isVpn: p.isVpn || false,
          securityQuestion: p.securityQuestion
        }));

        setProfiles(formattedProfiles);

        // API'den gelen profilleri session formatina cevir (analiz icin)
        const apiSessions = formattedProfiles
          .filter(p => p.deviceInfo)
          .map(p => ({
            profileId: p.id,
            loginTime: p.createdAt,
            deviceInfo: {
              ...p.deviceInfo,
              ip_address: p.profileCreatedIp,
              ipGeo: p.profileCreatedLocation,
              vpnScore: p.vpnScore
            }
          }));

        setSessions(apiSessions);
        setSecurities(formattedProfiles.filter(p => p.securityQuestion).map(p => ({
          profileId: p.id,
          securityQuestion: p.securityQuestion
        })));
        analyzeIpMacAddresses(formattedProfiles, apiSessions);
        return;
      }
    } catch (error) {
      console.warn('API bağlantısı başarısız, localStorage kullanılıyor:', error.message);
    }

    // Fallback: localStorage
    try {
      const siteCode = getCurrentSiteCode();
      const savedProfiles = JSON.parse(localStorage.getItem(`user_profiles_${siteCode}`) || '[]');
      const savedSecurities = JSON.parse(localStorage.getItem(`user_securities_${siteCode}`) || '[]');
      const savedSessions = JSON.parse(localStorage.getItem(`all_sessions_${siteCode}`) || '[]');

      const sortedProfiles = savedProfiles.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );

      setProfiles(sortedProfiles);
      setSecurities(savedSecurities);
      setSessions(savedSessions);
      analyzeIpMacAddresses(sortedProfiles, savedSessions);
    } catch (error) {
      console.error('Profil yükleme hatası:', error);
    }
  };

  // IP ve MAC adresi analizi
  const analyzeIpMacAddresses = (profiles, sessions) => {
    const ipMap = {};
    const macMap = {};
    const analysis = {};
    const suspicious = [];

    // Tüm session'ları tarayarak IP/MAC eşlemesi yap
    sessions.forEach(session => {
      const profileId = session.profileId;
      const profile = profiles.find(p => p.id === profileId);
      
      if (profile && session.deviceInfo) {
        const ip = session.deviceInfo.ip_address;
        const userAgent = session.deviceInfo.userAgent;
        const fingerprint = generateDeviceFingerprint(session.deviceInfo);
        
        // IP analizi
        if (ip && ip !== 'unknown') {
          if (!ipMap[ip]) ipMap[ip] = [];
          if (!ipMap[ip].find(p => p.profileId === profileId)) {
            ipMap[ip].push({ 
              profileId, 
              email: profile.email, 
              name: `${profile.firstName} ${profile.lastName}`,
              loginTime: session.loginTime 
            });
          }
        }
        
        // Device fingerprint analizi (MAC benzeri)
        if (fingerprint) {
          if (!macMap[fingerprint]) macMap[fingerprint] = [];
          if (!macMap[fingerprint].find(p => p.profileId === profileId)) {
            macMap[fingerprint].push({ 
              profileId, 
              email: profile.email, 
              name: `${profile.firstName} ${profile.lastName}`,
              loginTime: session.loginTime,
              deviceInfo: session.deviceInfo
            });
          }
        }
        
        // Profil analizi oluştur
        if (!analysis[profileId]) {
          analysis[profileId] = {
            profile: profile,
            ips: new Set(),
            devices: new Set(),
            sessions: []
          };
        }
        
        if (ip) analysis[profileId].ips.add(ip);
        if (fingerprint) analysis[profileId].devices.add(fingerprint);
        analysis[profileId].sessions.push(session);
      }
    });
    
    // Şüpheli profilleri bul
    Object.values(ipMap).forEach(ipUsers => {
      if (ipUsers.length > 1) {
        ipUsers.forEach(user => {
          if (!suspicious.find(s => s.profileId === user.profileId)) {
            suspicious.push({
              profileId: user.profileId,
              email: user.email,
              name: user.name,
              reason: 'DUPLICATE_IP',
              details: `Bu IP adresi ${ipUsers.length} farklı profil tarafından kullanıldı`,
              relatedProfiles: ipUsers.filter(u => u.profileId !== user.profileId)
            });
          }
        });
      }
    });
    
    Object.values(macMap).forEach(deviceUsers => {
      if (deviceUsers.length > 1) {
        deviceUsers.forEach(user => {
          const existing = suspicious.find(s => s.profileId === user.profileId);
          if (existing) {
            existing.reason = 'DUPLICATE_IP_AND_DEVICE';
            existing.details += ` VE aynı cihaz ${deviceUsers.length} farklı profil tarafından kullanıldı`;
          } else {
            suspicious.push({
              profileId: user.profileId,
              email: user.email,
              name: user.name,
              reason: 'DUPLICATE_DEVICE',
              details: `Bu cihaz ${deviceUsers.length} farklı profil tarafından kullanıldı`,
              relatedProfiles: deviceUsers.filter(u => u.profileId !== user.profileId)
            });
          }
        });
      }
    });
    
    // VPN kullanan profilleri de supheli olarak ekle
    sessions.forEach(session => {
      const profileId = session.profileId;
      const profile = profiles.find(p => String(p.id) === String(profileId));
      if (profile && session.deviceInfo?.vpnScore > 50) {
        const existing = suspicious.find(s => s.profileId === profileId);
        if (existing) {
          existing.reason = existing.reason + '_VPN';
          existing.details += ` VE VPN kullanimi tespit edildi (skor: ${session.deviceInfo.vpnScore})`;
        } else {
          suspicious.push({
            profileId,
            email: profile.email,
            name: `${profile.firstName} ${profile.lastName}`,
            reason: 'VPN_DETECTED',
            details: `VPN kullanimi tespit edildi (skor: ${session.deviceInfo.vpnScore}). ISP: ${session.deviceInfo.ipGeo?.org || 'bilinmiyor'}`,
            relatedProfiles: []
          });
        }
      }
    });

    setIpMacAnalysis({ ipMap, macMap, analysis });
    setSuspiciousProfiles(suspicious);

    console.log('IP/MAC Analizi:', { ipMap, macMap, suspicious });
  };
  
  // Basit hash fonksiyonu (djb2 algoritması)
  const simpleHash = (str) => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // 32-bit integer'a çevir
    }
    return Math.abs(hash).toString(16).toUpperCase();
  };

  // Gelişmiş cihaz parmak izi oluştur (VPN'e dayanıklı)
  const generateDeviceFingerprint = (deviceInfo) => {
    if (!deviceInfo) return null;

    // Canvas fingerprint'ten sadece unique kısmı al (prefix'i atla)
    let canvasHash = 'no_canvas';
    if (deviceInfo.canvasFingerprint && deviceInfo.canvasFingerprint.length > 50) {
      // "data:image/png;base64," prefix'ini atla ve son 100 karakteri al
      const canvasData = deviceInfo.canvasFingerprint.slice(-100);
      canvasHash = simpleHash(canvasData);
    }

    // Çoklu katman parmak izi (IP değişse bile aynı cihazı tespit eder)
    const primaryFingerprint = [
      canvasHash,
      deviceInfo.webglFingerprint || 'no_webgl',
      deviceInfo.audioFingerprint || 'no_audio',
      deviceInfo.screenResolution || '',
      deviceInfo.screenColorDepth || '',
      deviceInfo.timezone || '',
      deviceInfo.platform || '',
      deviceInfo.hardwareConcurrency || '',
      deviceInfo.deviceMemory || ''
    ].join('|');

    // Hash oluştur ve kısa ID döndür
    const hash = simpleHash(primaryFingerprint);
    return `DEV-${hash.substring(0, 8)}`;
  };
  
  // Cihaz benzerlik skoru hesapla (0-100)
  const calculateDeviceSimilarity = (device1, device2) => {
    if (!device1 || !device2) return 0;
    
    let score = 0;
    let totalChecks = 0;
    
    // Canvas karsilastirma (en onemli - %40 agirlik)
    if (device1.canvasFingerprint && device2.canvasFingerprint) {
      totalChecks += 40;
      if (device1.canvasFingerprint === device2.canvasFingerprint) {
        score += 40;
      }
    }
    
    // WebGL karsilastirma (%20 agirlik)
    if (device1.webglFingerprint && device2.webglFingerprint) {
      totalChecks += 20;
      if (device1.webglFingerprint === device2.webglFingerprint) {
        score += 20;
      }
    }
    
    // Audio karsilastirma (%15 agirlik)
    if (device1.audioFingerprint && device2.audioFingerprint) {
      totalChecks += 15;
      if (device1.audioFingerprint === device2.audioFingerprint) {
        score += 15;
      }
    }
    
    // Diger ozellikler (%25 agirlik)
    const otherChecks = [
      { prop: 'userAgent', weight: 5 },
      { prop: 'screenResolution', weight: 5 },
      { prop: 'screenColorDepth', weight: 3 },
      { prop: 'timezone', weight: 4 },
      { prop: 'language', weight: 2 },
      { prop: 'platform', weight: 3 },
      { prop: 'hardwareConcurrency', weight: 3 }
    ];
    
    otherChecks.forEach(check => {
      totalChecks += check.weight;
      if (device1[check.prop] && device2[check.prop] && device1[check.prop] === device2[check.prop]) {
        score += check.weight;
      }
    });
    
    return totalChecks > 0 ? Math.round((score / totalChecks) * 100) : 0;
  };

  // Profili pasife alma
  const handleDeactivateProfile = async (profileId) => {
    if (window.confirm('Bu profili pasife almak istediğinizden emin misiniz? Başvuru sahibi bir daha bu profile erişemeyecek!')) {
      try {
        // API ile pasife al
        try {
          await fetch(`${API_BASE_URL}/applications/profiles/${profileId}/deactivate`, {
            method: 'PATCH',
            credentials: 'include',
            headers: getSiteHeaders(),
            body: JSON.stringify({ isActive: false }),
          });
        } catch (apiErr) {
          console.warn('API deactivate failed, using localStorage:', apiErr.message);
        }

        // localStorage guncelle
        const siteCode = getCurrentSiteCode();
        const savedProfiles = JSON.parse(localStorage.getItem(`user_profiles_${siteCode}`) || '[]');
        const updatedLocalProfiles = savedProfiles.map(p => {
          if (String(p.id) === String(profileId)) {
            return { ...p, isActive: false, deactivatedAt: new Date().toISOString() };
          }
          return p;
        });
        localStorage.setItem(`user_profiles_${siteCode}`, JSON.stringify(updatedLocalProfiles));

        // State guncelle
        setProfiles(prev => prev.map(p => {
          if (String(p.id) === String(profileId)) {
            return { ...p, isActive: false, deactivatedAt: new Date().toISOString() };
          }
          return p;
        }));

        // Chat token'ı da kaldır (varsa)
        const profile = profiles.find(p => String(p.id) === String(profileId));
        if (profile?.chatToken) {
          const chatKey = `chat_messages_applicant_${siteCode}_${profile.id}`;
          const chatMessages = JSON.parse(localStorage.getItem(chatKey) || '[]');
          if (chatMessages.length > 0) {
            chatMessages.push({
              id: Date.now(),
              text: 'Bu chat yonetici tarafindan kapatildi.',
              sender_type: 'system',
              timestamp: new Date().toISOString(),
              type: 'system'
            });
            localStorage.setItem(chatKey, JSON.stringify(chatMessages));
          }
        }

        setDetailDialog(false);
        alert('Profil pasife alindi ve chat baglantisi kapatildi.');
      } catch (error) {
        console.error('Profil pasife alma hatasi:', error);
        alert('Profil pasife alinirken hata olustu!');
      }
    }
  };

  // Profili aktif etme
  const handleActivateProfile = async (profileId) => {
    try {
      // API ile aktif et
      try {
        await fetch(`${API_BASE_URL}/applications/profiles/${profileId}/activate`, {
          method: 'PATCH',
          credentials: 'include',
          headers: getSiteHeaders(),
          body: JSON.stringify({ isActive: true }),
        });
      } catch (apiErr) {
        console.warn('API activate failed, using localStorage:', apiErr.message);
      }

      // localStorage guncelle
      const siteCode = getCurrentSiteCode();
      const savedProfiles = JSON.parse(localStorage.getItem(`user_profiles_${siteCode}`) || '[]');
      const updatedLocalProfiles = savedProfiles.map(p => {
        if (String(p.id) === String(profileId)) {
          return { ...p, isActive: true, reactivatedAt: new Date().toISOString() };
        }
        return p;
      });
      localStorage.setItem(`user_profiles_${siteCode}`, JSON.stringify(updatedLocalProfiles));

      // State guncelle
      setProfiles(prev => prev.map(p => {
        if (String(p.id) === String(profileId)) {
          return { ...p, isActive: true, reactivatedAt: new Date().toISOString() };
        }
        return p;
      }));

      alert('Profil tekrar aktif edildi.');
    } catch (error) {
      console.error('Profil aktif etme hatasi:', error);
    }
  };

  // Profil detaylarını görüntüle
  const handleViewProfile = (profile) => {
    const security = securities.find(s => s.profileId === profile.id);
    const profileSessions = sessions.filter(s => s.profileId === profile.id);
    const profileAnalysis = ipMacAnalysis.analysis ? ipMacAnalysis.analysis[profile.id] : null;
    
    setSelectedProfile({ 
      ...profile, 
      security,
      sessions: profileSessions,
      analysis: profileAnalysis
    });
    setDetailDialog(true);
  };

  // Profil sil
  const handleDeleteProfile = (profileId) => {
    if (window.confirm('Bu profili silmek istediğinizden emin misiniz?')) {
      try {
        // Profili sil
        const siteCode = getCurrentSiteCode();
        const updatedProfiles = profiles.filter(p => p.id !== profileId);
        localStorage.setItem(`user_profiles_${siteCode}`, JSON.stringify(updatedProfiles));

        // Güvenlik bilgilerini sil
        const updatedSecurities = securities.filter(s => s.profileId !== profileId);
        localStorage.setItem(`user_securities_${siteCode}`, JSON.stringify(updatedSecurities));
        
        // Session'ı da temizle (eğer bu profil aktifse)
        const currentSession = JSON.parse(localStorage.getItem('current_session') || '{}');
        if (currentSession.profileId === profileId) {
          localStorage.removeItem('current_session');
        }
        
        loadProfiles();
      } catch (error) {
        console.error('Profil silme hatası:', error);
      }
    }
  };

  // Filtrelenmiş profiller
  const filteredProfiles = profiles.filter(profile =>
    profile.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Aktif profiller
  const activeProfiles = filteredProfiles.filter(p => p.isActive);
  const inactiveProfiles = filteredProfiles.filter(p => !p.isActive);

  const getDisplayProfiles = () => {
    switch (activeTab) {
      case 0: return activeProfiles;
      case 1: return inactiveProfiles;
      case 2: return suspiciousProfiles.map(s => 
        profiles.find(p => p.id === s.profileId)
      ).filter(Boolean);
      case 3: return []; // Ağ analizi için profil listesi gereksiz
      default: return filteredProfiles;
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" sx={{
          background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: 'bold'
        }}>
          👤 Profil Yönetimi
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadProfiles}
          sx={{
            borderColor: '#1c61ab',
            color: '#1c61ab',
            '&:hover': {
              borderColor: '#8bb94a',
              backgroundColor: 'rgba(139, 185, 74, 0.1)'
            }
          }}
        >
          Yenile
        </Button>
      </Box>

      {/* Istatistikler */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Card sx={{
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.08), rgba(28, 97, 171, 0.02))',
            border: '1px solid rgba(28, 97, 171, 0.15)'
          }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: 'rgba(28, 97, 171, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PersonIcon sx={{ color: '#1c61ab' }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700} color="#1c61ab">{profiles.length}</Typography>
                  <Typography variant="caption" color="text.secondary">Toplam</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(139, 185, 74, 0.08), rgba(139, 185, 74, 0.02))',
            border: '1px solid rgba(139, 185, 74, 0.15)'
          }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: 'rgba(139, 185, 74, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircleIcon sx={{ color: '#8bb94a' }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700} color="#8bb94a">{activeProfiles.length}</Typography>
                  <Typography variant="caption" color="text.secondary">Aktif</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.08), rgba(220, 38, 38, 0.02))',
            border: '1px solid rgba(220, 38, 38, 0.15)'
          }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: 'rgba(220, 38, 38, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DeleteIcon sx={{ color: '#dc2626' }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700} color="#dc2626">{inactiveProfiles.length}</Typography>
                  <Typography variant="caption" color="text.secondary">Pasif</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card sx={{
            borderRadius: 3,
            background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.08), rgba(255, 152, 0, 0.02))',
            border: '1px solid rgba(255, 152, 0, 0.15)'
          }}>
            <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: 'rgba(255, 152, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <WarningIcon sx={{ color: '#ff9800' }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700} color="#ff9800">{suspiciousProfiles.length}</Typography>
                  <Typography variant="caption" color="text.secondary">Supheli</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Arama */}
      <Box mb={2}>
        <TextField
          fullWidth
          placeholder="Profil ara... (ad, soyad, email)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
          }}
          sx={{ maxWidth: 400 }}
        />
      </Box>

      {/* Şüpheli Profil Uyarısı */}
      {suspiciousProfiles.length > 0 && (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 3,
            background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 152, 0, 0.1))',
            border: '1px solid rgba(255, 193, 7, 0.3)'
          }}
          action={
            <Button 
              color="inherit" 
              size="small" 
              onClick={() => setActiveTab(2)}
              startIcon={<WarningIcon />}
            >
              Detayları Gör
            </Button>
          }
        >
          <Typography variant="subtitle1" fontWeight="bold">
            🚨 {suspiciousProfiles.length} Şüpheli Profil Tespit Edildi
          </Typography>
          <Typography variant="body2">
            Aynı IP adresi veya cihazdan birden fazla kayıt tespit edildi. Çoklu hesap oluşturma girişimi olabilir.
          </Typography>
        </Alert>
      )}
      <Paper sx={{ mb: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => setActiveTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label={`Aktif Profiller (${activeProfiles.length})`} />
          <Tab label={`Pasif Profiller (${inactiveProfiles.length})`} />
          <Tab 
            label={
              <Badge badgeContent={suspiciousProfiles.length} color="error">
                <Box display="flex" alignItems="center" gap={1}>
                  <WarningIcon fontSize="small" />
                  Şüpheli Profiller
                </Box>
              </Badge>
            } 
          />
          <Tab 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <NetworkIcon fontSize="small" />
                Ağ Analizi
              </Box>
            } 
          />
        </Tabs>
      </Paper>

      {/* Profil Listesi */}
      {activeTab === 3 ? (
        // Ağ Analizi Tab'ı
        <Paper sx={{
          background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.02), rgba(139, 185, 74, 0.02))',
          border: '1px solid rgba(28, 97, 171, 0.1)',
          borderRadius: '16px',
          p: 3
        }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NetworkIcon color="primary" />
            Ağ Analizi Raporu
          </Typography>
          
          {Object.keys(ipMacAnalysis.ipMap || {}).length === 0 ? (
            <Alert severity="info">
              Henüz yeterli session verisi bulunmuyor. Profil oluşturma işlemleri sonrasında analiz verileri görünecektir.
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {/* IP Adresi Analizi */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RouterIcon color="primary" />
                      IP Adresi Analizi
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>IP Adresi</TableCell>
                            <TableCell>Kullanıcı Sayısı</TableCell>
                            <TableCell>Durum</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(ipMacAnalysis.ipMap || {}).map(([ip, users]) => (
                            <TableRow key={ip} sx={{ 
                              bgcolor: users.length > 1 ? 'rgba(255, 193, 7, 0.1)' : 'transparent'
                            }}>
                              <TableCell>{ip}</TableCell>
                              <TableCell>{users.length}</TableCell>
                              <TableCell>
                                {users.length > 1 ? (
                                  <Chip 
                                    label="Şüpheli" 
                                    color="warning" 
                                    size="small"
                                    icon={<WarningIcon />}
                                  />
                                ) : (
                                  <Chip label="Normal" color="success" size="small" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Cihaz Analizi */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DeviceIcon color="primary" />
                      Cihaz Analizi
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Cihaz ID</TableCell>
                            <TableCell>Kullanıcı Sayısı</TableCell>
                            <TableCell>Durum</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(ipMacAnalysis.macMap || {}).map(([deviceId, users]) => (
                            <TableRow key={deviceId} sx={{ 
                              bgcolor: users.length > 1 ? 'rgba(255, 193, 7, 0.1)' : 'transparent'
                            }}>
                              <TableCell sx={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                {deviceId}
                              </TableCell>
                              <TableCell>{users.length}</TableCell>
                              <TableCell>
                                {users.length > 1 ? (
                                  <Chip 
                                    label="Şüpheli" 
                                    color="warning" 
                                    size="small"
                                    icon={<WarningIcon />}
                                  />
                                ) : (
                                  <Chip label="Normal" color="success" size="small" />
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Detaylı Şüpheli Profil Listesi */}
              {suspiciousProfiles.length > 0 && (
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FlagIcon color="error" />
                        Şüpheli Profiller Detayı
                      </Typography>
                      {suspiciousProfiles.map((suspicious, index) => (
                        <Alert 
                          key={suspicious.profileId}
                          severity="warning" 
                          sx={{ mb: 2 }}
                          action={
                            <Button 
                              size="small" 
                              onClick={() => {
                                const profile = profiles.find(p => p.id === suspicious.profileId);
                                handleViewProfile(profile);
                              }}
                            >
                              Detaylar
                            </Button>
                          }
                        >
                          <Typography variant="subtitle2" fontWeight="bold">
                            {suspicious.name} ({suspicious.email})
                          </Typography>
                          <Typography variant="body2">
                            {suspicious.details}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            İlişkili Profiller: {suspicious.relatedProfiles.map(p => p.name).join(', ')}
                          </Typography>
                        </Alert>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </Paper>
      ) : (
        // Normal Profil Listesi
      <Paper sx={{
        background: 'linear-gradient(135deg, rgba(28, 97, 171, 0.02), rgba(139, 185, 74, 0.02))',
        border: '1px solid rgba(28, 97, 171, 0.1)',
        borderRadius: '16px'
      }}>
        {getDisplayProfiles().length === 0 ? (
          <Box p={4} textAlign="center">
            <PersonIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {searchTerm ? 'Arama kriterlerine uygun profil bulunamadı' : 'Henüz profil bulunmuyor'}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2} sx={{ p: 2 }}>
            {getDisplayProfiles().map((profile) => {
              const suspicious = suspiciousProfiles.find(s => s.profileId === profile.id);
              const profileSession = sessions.find(s => String(s.profileId) === String(profile.id));
              const vpnScore = profile.vpnScore || profileSession?.deviceInfo?.vpnScore || 0;
              const profileIp = profile.profileCreatedIp || profileSession?.deviceInfo?.ip_address;
              return (
                <Grid item xs={12} sm={6} md={4} key={profile.id}>
                  <Card sx={{
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: !profile.isActive ? 'rgba(220, 38, 38, 0.25)'
                      : suspicious ? 'rgba(255, 193, 7, 0.35)'
                      : 'rgba(28, 97, 171, 0.12)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 12px 40px rgba(28, 97, 171, 0.15)'
                    }
                  }}>
                    <CardContent sx={{ pb: 1 }}>
                      <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={
                            <Box sx={{
                              width: 14, height: 14, borderRadius: '50%',
                              bgcolor: profile.isActive ? '#8bb94a' : '#dc2626',
                              border: '2px solid #fff'
                            }} />
                          }
                        >
                          <Avatar sx={{
                            width: 48, height: 48,
                            background: profile.isActive
                              ? 'linear-gradient(135deg, #1c61ab, #8bb94a)'
                              : 'linear-gradient(135deg, #666, #999)',
                            fontWeight: 700, fontSize: '1rem'
                          }}>
                            {profile.firstName?.[0]}{profile.lastName?.[0]}
                          </Avatar>
                        </Badge>
                        <Box flex={1} minWidth={0}>
                          <Typography variant="subtitle1" fontWeight={700} noWrap>
                            {profile.firstName} {profile.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: '0.8rem' }}>
                            {profile.email}
                          </Typography>
                        </Box>
                      </Box>

                      <Box display="flex" flexWrap="wrap" gap={0.5} mb={1.5}>
                        <Chip
                          label={profile.isActive ? 'Aktif' : 'Pasif'}
                          size="small"
                          sx={{
                            fontSize: '10px', height: 22,
                            bgcolor: profile.isActive ? 'rgba(139, 185, 74, 0.12)' : 'rgba(220, 38, 38, 0.1)',
                            color: profile.isActive ? '#6b9137' : '#dc2626',
                            fontWeight: 600
                          }}
                        />
                        {profile.chatToken && (
                          <Chip
                            label="Chat"
                            size="small"
                            sx={{
                              fontSize: '10px', height: 22,
                              bgcolor: 'rgba(28, 97, 171, 0.1)',
                              color: '#1c61ab', fontWeight: 600
                            }}
                          />
                        )}
                        {suspicious && (
                          <Chip
                            label="Supheli"
                            size="small"
                            icon={<WarningIcon sx={{ fontSize: '14px !important' }} />}
                            sx={{
                              fontSize: '10px', height: 22,
                              bgcolor: 'rgba(255, 193, 7, 0.15)',
                              color: '#e65100', fontWeight: 600
                            }}
                          />
                        )}
                        {vpnScore > 50 && (
                          <Chip
                            label="VPN"
                            size="small"
                            icon={<VpnIcon sx={{ fontSize: '14px !important' }} />}
                            sx={{
                              fontSize: '10px', height: 22,
                              bgcolor: 'rgba(156, 39, 176, 0.1)',
                              color: '#7b1fa2', fontWeight: 600
                            }}
                          />
                        )}
                      </Box>

                      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        {profile.phone && (
                          <Box display="flex" alignItems="center" gap={0.5} mb={0.3}>
                            <PhoneIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption">{profile.phone}</Typography>
                          </Box>
                        )}
                        {profileIp && (
                          <Box display="flex" alignItems="center" gap={0.5} mb={0.3}>
                            <RouterIcon sx={{ fontSize: 14 }} />
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: '10px' }}>{profileIp}</Typography>
                          </Box>
                        )}
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <TimeIcon sx={{ fontSize: 14 }} />
                          <Typography variant="caption">
                            {new Date(profile.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>

                    <Divider />

                    <Box display="flex" justifyContent="space-around" sx={{ py: 0.5 }}>
                      <Tooltip title="Detaylar">
                        <IconButton size="small" onClick={() => handleViewProfile(profile)}
                          sx={{ color: '#1c61ab' }}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton size="small" onClick={() => handleDeleteProfile(profile.id)}
                          sx={{ color: '#dc2626' }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {profile.isActive ? (
                        <Tooltip title="Pasife Al">
                          <IconButton size="small" onClick={() => handleDeactivateProfile(profile.id)}
                            sx={{ color: '#ff9800' }}>
                            <WarningIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title="Aktif Et">
                          <IconButton size="small" onClick={() => handleActivateProfile(profile.id)}
                            sx={{ color: '#8bb94a' }}>
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Paper>
      )}

      {/* Profil Detay Dialog */}
      <Dialog 
        open={detailDialog} 
        onClose={() => setDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedProfile && (
          <>
            <DialogTitle sx={{
              background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
              color: 'white'
            }}>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  {selectedProfile.firstName?.[0]}{selectedProfile.lastName?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {selectedProfile.firstName} {selectedProfile.lastName}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Profil ID: {selectedProfile.id}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tabs
                value={detailTab}
                onChange={(e, v) => setDetailTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 }
                }}
              >
                <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="Kisisel" />
                <Tab icon={<SecurityIcon fontSize="small" />} iconPosition="start" label="Guvenlik" />
                <Tab icon={<NetworkIcon fontSize="small" />} iconPosition="start" label="Ag & Cihaz" />
                <Tab icon={<TimeIcon fontSize="small" />} iconPosition="start" label="Oturumlar" />
              </Tabs>
            </Box>

            <DialogContent sx={{ pt: 3, minHeight: 350 }}>
              {/* Supheli uyarisi - tum tablarda gosterilir */}
              {suspiciousProfiles.find(s => s.profileId === selectedProfile.id) && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    Supheli Aktivite Tespit Edildi
                  </Typography>
                  <Typography variant="body2">
                    {suspiciousProfiles.find(s => s.profileId === selectedProfile.id)?.details}
                  </Typography>
                </Alert>
              )}

              {/* TAB 0: Kisisel Bilgiler */}
              {detailTab === 0 && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%', borderRadius: 3 }}>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#1c61ab' }}>
                          Iletisim Bilgileri
                        </Typography>
                        <Box display="flex" flexDirection="column" gap={2}>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(28, 97, 171, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <EmailIcon fontSize="small" sx={{ color: '#1c61ab' }} />
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Email</Typography>
                              <Typography variant="body2" fontWeight={600}>{selectedProfile.email}</Typography>
                            </Box>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(139, 185, 74, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <PhoneIcon fontSize="small" sx={{ color: '#8bb94a' }} />
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Telefon</Typography>
                              <Typography variant="body2" fontWeight={600}>{selectedProfile.phone || '-'}</Typography>
                            </Box>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1.5}>
                            <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(156, 39, 176, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <TimeIcon fontSize="small" sx={{ color: '#7b1fa2' }} />
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Kayit Tarihi</Typography>
                              <Typography variant="body2" fontWeight={600}>{new Date(selectedProfile.createdAt).toLocaleString('tr-TR')}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card sx={{ height: '100%', borderRadius: 3 }}>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#8bb94a' }}>
                          Profil Durumu
                        </Typography>
                        <Box display="flex" flexDirection="column" gap={2}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">Durum</Typography>
                            <Chip
                              label={selectedProfile.isActive ? 'Aktif' : 'Pasif'}
                              size="small"
                              sx={{
                                bgcolor: selectedProfile.isActive ? 'rgba(139, 185, 74, 0.12)' : 'rgba(220, 38, 38, 0.1)',
                                color: selectedProfile.isActive ? '#6b9137' : '#dc2626',
                                fontWeight: 700
                              }}
                            />
                          </Box>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">Chat Baglantisi</Typography>
                            <Chip
                              label={selectedProfile.chatToken ? 'Aktif' : 'Yok'}
                              size="small"
                              sx={{
                                bgcolor: selectedProfile.chatToken ? 'rgba(28, 97, 171, 0.1)' : 'rgba(0,0,0,0.05)',
                                color: selectedProfile.chatToken ? '#1c61ab' : '#999',
                                fontWeight: 600
                              }}
                            />
                          </Box>
                          {selectedProfile.deactivatedAt && (
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" color="text.secondary">Pasife Alinma</Typography>
                              <Typography variant="caption">{new Date(selectedProfile.deactivatedAt).toLocaleString('tr-TR')}</Typography>
                            </Box>
                          )}
                          {selectedProfile.reactivatedAt && (
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" color="text.secondary">Yeniden Aktif</Typography>
                              <Typography variant="caption">{new Date(selectedProfile.reactivatedAt).toLocaleString('tr-TR')}</Typography>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  {selectedProfile.chatToken && (
                    <Grid item xs={12}>
                      <Card sx={{ borderRadius: 3, border: '1px solid rgba(28, 97, 171, 0.15)' }}>
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#1c61ab' }}>
                            Chat Baglantisi
                          </Typography>
                          <Paper sx={{ p: 2, bgcolor: 'rgba(28, 97, 171, 0.04)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontFamily="monospace" sx={{ flex: 1, wordBreak: 'break-all', fontSize: '12px' }}>
                              {window.location.origin}/chat/{selectedProfile.chatToken}
                            </Typography>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => window.open(`/chat/${selectedProfile.chatToken}`, '_blank')}
                              sx={{
                                background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                                textTransform: 'none', borderRadius: 2, minWidth: 80,
                                '&:hover': { background: 'linear-gradient(135deg, #8bb94a, #1c61ab)' }
                              }}
                            >
                              Ac
                            </Button>
                          </Paper>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              )}

              {/* TAB 1: Guvenlik */}
              {detailTab === 1 && (
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#8bb94a' }}>
                      Guvenlik Bilgileri
                    </Typography>
                    {selectedProfile.security ? (
                      <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" p={1.5} bgcolor="rgba(139, 185, 74, 0.05)" borderRadius={2}>
                          <Typography variant="body2">Guvenlik Sorusu</Typography>
                          <Typography variant="body2" fontWeight={600}>{selectedProfile.security.securityQuestion}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center" p={1.5} bgcolor="rgba(28, 97, 171, 0.05)" borderRadius={2}>
                          <Typography variant="body2">Sifre Durumu</Typography>
                          <Chip label="Kayitli" size="small" color="success" sx={{ fontWeight: 600 }} />
                        </Box>
                        <Box display="flex" justifyContent="space-between" alignItems="center" p={1.5} bgcolor="rgba(139, 185, 74, 0.05)" borderRadius={2}>
                          <Typography variant="body2">Guvenlik Cevabi</Typography>
                          <Chip label="Kayitli" size="small" color="success" sx={{ fontWeight: 600 }} />
                        </Box>
                      </Box>
                    ) : (
                      <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        Guvenlik bilgileri bulunamadi
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* TAB 2: Ag & Cihaz */}
              {detailTab === 2 && (
                <Box>
                  {(selectedProfile.deviceInfo || selectedProfile.profileCreatedIp) ? (
                    <Box display="flex" flexDirection="column" gap={2}>
                      {/* IP ve Konum Bilgileri */}
                      <Card sx={{ borderRadius: 3 }}>
                        <CardContent>
                          <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#1c61ab' }}>
                            <RouterIcon fontSize="small" />
                            IP ve Konum Bilgileri
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                              <Box p={1.5} bgcolor="rgba(28, 97, 171, 0.05)" borderRadius={2}>
                                <Typography variant="caption" color="text.secondary">IP Adresi</Typography>
                                <Typography variant="body2" fontWeight={700} fontFamily="monospace">
                                  {selectedProfile.profileCreatedIp || selectedProfile.deviceInfo?.ip_address || '-'}
                                </Typography>
                              </Box>
                            </Grid>
                            {selectedProfile.profileCreatedLocation && (
                              <>
                                <Grid item xs={6} sm={3}>
                                  <Box p={1.5} bgcolor="rgba(139, 185, 74, 0.05)" borderRadius={2}>
                                    <Typography variant="caption" color="text.secondary">Ulke</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                      {selectedProfile.profileCreatedLocation.country || '-'}
                                    </Typography>
                                  </Box>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <Box p={1.5} bgcolor="rgba(139, 185, 74, 0.05)" borderRadius={2}>
                                    <Typography variant="caption" color="text.secondary">Sehir</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                      {selectedProfile.profileCreatedLocation.city || '-'}
                                    </Typography>
                                  </Box>
                                </Grid>
                                <Grid item xs={12}>
                                  <Box p={1.5} bgcolor="rgba(156, 39, 176, 0.05)" borderRadius={2}>
                                    <Typography variant="caption" color="text.secondary">ISP / Organizasyon</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                      {selectedProfile.profileCreatedLocation.org || selectedProfile.profileCreatedLocation.isp || '-'}
                                    </Typography>
                                  </Box>
                                </Grid>
                              </>
                            )}
                          </Grid>

                          {/* VPN Durumu */}
                          {(selectedProfile.vpnScore > 0 || selectedProfile.isVpn) && (
                            <Alert
                              severity={selectedProfile.vpnScore > 50 ? 'warning' : 'info'}
                              icon={<VpnIcon />}
                              sx={{ mt: 2, borderRadius: 2 }}
                            >
                              <Typography variant="body2">
                                <strong>VPN Skoru:</strong> {selectedProfile.vpnScore}/100
                                {selectedProfile.isVpn && ' - VPN Kullanimi Tespit Edildi!'}
                              </Typography>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>

                      {/* Cihaz Bilgileri */}
                      {selectedProfile.deviceInfo && (
                        <Card sx={{ borderRadius: 3 }}>
                          <CardContent>
                            <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#8bb94a' }}>
                              <DeviceIcon fontSize="small" />
                              Cihaz Bilgileri
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={6} sm={4}>
                                <Box p={1.5} bgcolor="rgba(28, 97, 171, 0.05)" borderRadius={2}>
                                  <Typography variant="caption" color="text.secondary">Platform</Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {selectedProfile.deviceInfo.platform || '-'}
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <Box p={1.5} bgcolor="rgba(28, 97, 171, 0.05)" borderRadius={2}>
                                  <Typography variant="caption" color="text.secondary">Ekran</Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {selectedProfile.deviceInfo.screenResolution || '-'}
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <Box p={1.5} bgcolor="rgba(28, 97, 171, 0.05)" borderRadius={2}>
                                  <Typography variant="caption" color="text.secondary">Zaman Dilimi</Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {selectedProfile.deviceInfo.timezone || '-'}
                                  </Typography>
                                </Box>
                              </Grid>
                              <Grid item xs={6} sm={4}>
                                <Box p={1.5} bgcolor="rgba(139, 185, 74, 0.05)" borderRadius={2}>
                                  <Typography variant="caption" color="text.secondary">Dil</Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {selectedProfile.deviceInfo.language || '-'}
                                  </Typography>
                                </Box>
                              </Grid>
                              {selectedProfile.deviceInfo.hardwareConcurrency && (
                                <Grid item xs={6} sm={4}>
                                  <Box p={1.5} bgcolor="rgba(139, 185, 74, 0.05)" borderRadius={2}>
                                    <Typography variant="caption" color="text.secondary">CPU Cekirdek</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                      {selectedProfile.deviceInfo.hardwareConcurrency}
                                    </Typography>
                                  </Box>
                                </Grid>
                              )}
                              {selectedProfile.deviceInfo.deviceMemory && (
                                <Grid item xs={6} sm={4}>
                                  <Box p={1.5} bgcolor="rgba(139, 185, 74, 0.05)" borderRadius={2}>
                                    <Typography variant="caption" color="text.secondary">RAM</Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                      {selectedProfile.deviceInfo.deviceMemory} GB
                                    </Typography>
                                  </Box>
                                </Grid>
                              )}
                              <Grid item xs={12}>
                                <Box p={1.5} bgcolor="rgba(156, 39, 176, 0.05)" borderRadius={2}>
                                  <Typography variant="caption" color="text.secondary">Tarayici</Typography>
                                  <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-all', fontSize: '11px' }}>
                                    {selectedProfile.deviceInfo.userAgent || '-'}
                                  </Typography>
                                </Box>
                              </Grid>
                            </Grid>

                            {/* Parmak Izi Detaylari */}
                            {(selectedProfile.deviceInfo.canvasFingerprint || selectedProfile.deviceInfo.webglFingerprint) && (
                              <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(28, 97, 171, 0.04)', borderRadius: 2 }}>
                                <Typography variant="caption" fontWeight={700} color="primary" display="block" mb={1}>
                                  Benzersiz Parmak Izi
                                </Typography>
                                {selectedProfile.deviceInfo.canvasFingerprint && (
                                  <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '10px', color: '#8bb94a', mb: 0.5 }}>
                                    Canvas: {selectedProfile.deviceInfo.canvasFingerprint.substring(0, 60)}...
                                  </Typography>
                                )}
                                {selectedProfile.deviceInfo.webglFingerprint && (
                                  <Typography variant="caption" display="block" sx={{ fontFamily: 'monospace', fontSize: '10px', color: '#1c61ab' }}>
                                    WebGL: {selectedProfile.deviceInfo.webglFingerprint}
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      Bu profil icin ag ve cihaz bilgisi bulunamadi. Yeni olusturulan profillerde bu bilgiler gorunecektir.
                    </Alert>
                  )}
                </Box>
              )}

              {/* TAB 3: Oturum Gecmisi */}
              {detailTab === 3 && (
                <Card sx={{ borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#7b1fa2' }}>
                      <TimeIcon fontSize="small" />
                      Giris Gecmisi
                      {selectedProfile.sessions && (
                        <Chip label={`${selectedProfile.sessions.length} oturum`} size="small"
                          sx={{ bgcolor: 'rgba(156, 39, 176, 0.1)', color: '#7b1fa2', fontWeight: 600 }} />
                      )}
                    </Typography>
                    {selectedProfile.sessions && selectedProfile.sessions.length > 0 ? (
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700 }}>Tarih</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>IP Adresi</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>Platform</TableCell>
                              <TableCell sx={{ fontWeight: 700 }}>VPN</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {selectedProfile.sessions
                              .sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime))
                              .map((session, idx) => (
                                <TableRow key={idx} sx={{ '&:last-child td': { border: 0 } }}>
                                  <TableCell>
                                    <Typography variant="caption">
                                      {new Date(session.loginTime).toLocaleString('tr-TR')}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption" fontFamily="monospace">
                                      {session.deviceInfo?.ip_address || '-'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption">
                                      {session.deviceInfo?.platform || '-'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    {session.deviceInfo?.vpnScore > 50 ? (
                                      <Chip label={`${session.deviceInfo.vpnScore}`} size="small" color="warning"
                                        icon={<VpnIcon />} sx={{ height: 22, fontSize: '10px' }} />
                                    ) : session.deviceInfo?.vpnScore > 0 ? (
                                      <Chip label={`${session.deviceInfo.vpnScore}`} size="small"
                                        sx={{ height: 22, fontSize: '10px', bgcolor: 'rgba(76, 175, 80, 0.1)', color: '#2e7d32' }} />
                                    ) : (
                                      <Typography variant="caption" color="text.secondary">-</Typography>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info" sx={{ borderRadius: 2 }}>
                        Bu profil icin oturum gecmisi bulunamadi.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => { setDetailDialog(false); setDetailTab(0); }}
                sx={{ textTransform: 'none' }}>
                Kapat
              </Button>
              {selectedProfile.isActive ? (
                <Button
                  variant="outlined" color="warning"
                  onClick={() => handleDeactivateProfile(selectedProfile.id)}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Pasife Al
                </Button>
              ) : (
                <Button
                  variant="outlined" color="success"
                  onClick={() => handleActivateProfile(selectedProfile.id)}
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Aktif Et
                </Button>
              )}
              {selectedProfile.chatToken && (
                <Button
                  variant="contained"
                  onClick={() => window.open(`/chat/${selectedProfile.chatToken}`, '_blank')}
                  sx={{
                    background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                    textTransform: 'none', borderRadius: 2,
                    '&:hover': { background: 'linear-gradient(135deg, #8bb94a, #1c61ab)' }
                  }}
                >
                  Chat Ac
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default ProfileManagement;
