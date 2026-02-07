// src/pages/CreateProfile.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import applicationService from '../services/applicationService';
import sessionManager from '../utils/sessionManager';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
  IconButton,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogActions,
  Fade,
  Grid,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Security as SecurityIcon,
  Block as BlockIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Lock as LockIcon,
  AccountCircle as AccountCircleIcon,
  HelpOutline,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

const steps = ['Email Doğrulama', 'Profil Bilgileri', 'Güvenlik Ayarları'];

const securityQuestions = [
  'İlk evcil hayvanınızın adı neydi?',
  'İlk öğretmeninizin adı neydi?',
  'Çocukken en sevdiğiniz oyuncağınız neydi?',
  'İlk yaşadığınız sokağın adı neydi?',
  'En sevdiğiniz yemek nedir?',
  'İlk gittiğiniz okul neydi?',
  'Annenizin kızlık soyadı nedir?',
  'En sevdiğiniz şarkıcı/müzik grubu nedir?',
  'İlk arabanızın markası neydi?',
  'En sevdiğiniz film nedir?'
];

// Token'i tum site-specific invitation_links key'lerinde ara
const findTokenAcrossSites = (tokenValue) => {
  const siteCodes = (() => {
    try {
      const sites = JSON.parse(localStorage.getItem('sites') || '[]');
      if (sites.length > 0) return sites.map(s => s.code);
    } catch (e) {}
    return ['FXB', 'MTD', 'ZBH'];
  })();
  for (const siteCode of siteCodes) {
    const links = JSON.parse(localStorage.getItem(`invitation_links_${siteCode}`) || '[]');
    const found = links.find(inv => inv.token === tokenValue);
    if (found) return { invitation: found, siteCode, links };
  }
  // Legacy global key fallback
  const globalLinks = JSON.parse(localStorage.getItem('invitation_links') || '[]');
  const found = globalLinks.find(inv => inv.token === tokenValue);
  if (found) return { invitation: found, siteCode: null, links: globalLinks };
  return null;
};

function CreateProfile() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [linkExpiredDialog, setLinkExpiredDialog] = useState(false);
  const [emailFromToken, setEmailFromToken] = useState(false);
  const [detectedSiteCode, setDetectedSiteCode] = useState(null);

  const [profileData, setProfileData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: '',
    securityQuestion: '',
    securityAnswer: ''
  });

  // Token geçerliliğini kontrol et ve IP kaydet
  useEffect(() => {
    const checkAndUpdateToken = async () => {
      if (!token) {
        navigate('/');
        return;
      }

      // Token doğrulama - API ile
      try {
        const validation = await applicationService.validateToken(token);

        if (!validation.valid) {
          setLinkExpiredDialog(true);
          return;
        }

        // Email'i otomatik doldur
        if (validation.email) {
          setEmailFromToken(true);
        }
        setProfileData(prev => ({
          ...prev,
          email: validation.email || ''
        }));
      } catch (error) {
        console.error('Token doğrulama hatası:', error);
        if (error.message.includes('kullanılmış')) {
          setLinkExpiredDialog(true);
          return;
        }

        // Fallback: Tum site-specific localStorage key'lerinden kontrol et
        const tokenResult = findTokenAcrossSites(token);
        const invitationLinks = tokenResult?.links || [];
        const currentLink = tokenResult?.invitation || null;
        if (tokenResult?.siteCode) setDetectedSiteCode(tokenResult.siteCode);

        if (currentLink && currentLink.status === 'used') {
          setLinkExpiredDialog(true);
          return;
        }

        if (currentLink && currentLink.email) {
          setEmailFromToken(true);
          setProfileData(prev => ({
            ...prev,
            email: currentLink.email
          }));
        }

        // Link ilk açıldığında IP'yi kaydet
        if (currentLink && !currentLink.first_accessed_ip) {
        try {
          // IP adresi al
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipResponse.json();
          
          // Link'e IP bilgisini ekle
          const updatedLinks = invitationLinks.map(link => {
            if (link.token === token) {
              return {
                ...link,
                first_accessed_at: link.first_accessed_at || new Date().toISOString(),
                first_accessed_ip: ipData.ip || 'unknown',
                device_info: link.device_info || {
                  userAgent: navigator.userAgent,
                  platform: navigator.platform,
                  language: navigator.language
                }
              };
            }
            return link;
          });
          
          if (tokenResult?.siteCode) {
            localStorage.setItem(`invitation_links_${tokenResult.siteCode}`, JSON.stringify(updatedLinks));
          } else {
            localStorage.setItem('invitation_links', JSON.stringify(updatedLinks));
          }
          console.log('Link IP ile güncellendi:', ipData.ip);
        } catch (error) {
          console.log('IP alınamadı, fallback IP kullanılıyor');
          // Fallback olarak başka bir servis dene
          try {
            const fallbackResponse = await fetch('https://ipapi.co/json/');
            const fallbackData = await fallbackResponse.json();
            
            const updatedLinksWithFallback = invitationLinks.map(link => {
              if (link.token === token) {
                return {
                  ...link,
                  first_accessed_at: link.first_accessed_at || new Date().toISOString(),
                  first_accessed_ip: fallbackData.ip || 'unknown',
                  device_info: link.device_info || {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language
                  }
                };
              }
              return link;
            });
            
            if (tokenResult?.siteCode) {
              localStorage.setItem(`invitation_links_${tokenResult.siteCode}`, JSON.stringify(updatedLinksWithFallback));
            } else {
              localStorage.setItem('invitation_links', JSON.stringify(updatedLinksWithFallback));
            }
            console.log('Fallback IP ile güncellendi:', fallbackData.ip);
          } catch (fallbackError) {
            console.log('IP hiç alınamadı');
          }
        }
        }

        // Eğer link var ve profil zaten oluşturulmuşsa, forma yönlendir
        const profilesKey = tokenResult?.siteCode ? `user_profiles_${tokenResult.siteCode}` : 'user_profiles';
        const profiles = JSON.parse(localStorage.getItem(profilesKey) || '[]');
        const existingProfile = profiles.find(p => p.token === token);

        if (existingProfile && currentLink) {
          // Profil var ama link henüz kullanılmamış, forma git
          navigate(`/apply/${token}`);
          return;
        }
      }
    };
    
    checkAndUpdateToken();
  }, [token, navigate]);

  // Link kullanılmışsa 30 saniye sonra otomatik kapat
  useEffect(() => {
    if (linkExpiredDialog) {
      const timer = setTimeout(() => {
        window.close();
        // Eğer pencere kapanmazsa (ana sekmeyse) boş sayfaya yönlendir
        window.location.href = 'about:blank';
      }, 30000); // 30 saniye
      
      return () => clearTimeout(timer);
    }
  }, [linkExpiredDialog]);

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    
    // Hata varsa temizle
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 0: // Email Doğrulama
        if (!profileData.email) {
          newErrors.email = 'Email adresi gerekli';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
          newErrors.email = 'Geçerli bir email adresi girin';
        }
        break;

      case 1: // Profil Bilgileri
        if (!profileData.firstName.trim()) {
          newErrors.firstName = 'Ad gerekli';
        }
        if (!profileData.lastName.trim()) {
          newErrors.lastName = 'Soyad gerekli';
        }
        if (!profileData.phone.trim()) {
          newErrors.phone = 'Telefon numarası gerekli';
        } else if (!/^(\+90|0)?(5\d{2})(\d{3})(\d{2})(\d{2})$/.test(profileData.phone.replace(/\s/g, ''))) {
          newErrors.phone = 'Geçerli bir Türkiye telefon numarası girin';
        }
        break;

      case 2: // Güvenlik
        if (!profileData.password) {
          newErrors.password = 'Şifre gerekli';
        } else if (profileData.password.length < 8) {
          newErrors.password = 'Şifre en az 8 karakter olmalı';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(profileData.password)) {
          newErrors.password = 'Şifre en az 1 büyük harf, 1 küçük harf ve 1 rakam içermeli';
        }
        
        if (profileData.password !== profileData.confirmPassword) {
          newErrors.confirmPassword = 'Şifreler eşleşmiyor';
        }
        
        if (!profileData.securityQuestion.trim()) {
          newErrors.securityQuestion = 'Güvenlik sorusu gerekli';
        }
        
        if (!profileData.securityAnswer.trim()) {
          newErrors.securityAnswer = 'Güvenlik cevabı gerekli';
        }
        break;
      
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) {
      console.log('Validasyon hatası:', errors);
      return;
    }

    setLoading(true);
    console.log('Profil oluşturma başlatıldı:', profileData);
    
    try {
      // Profil bilgilerini kaydet
      const profileId = Date.now().toString();
      console.log('Profile ID oluşturuldu:', profileId);
      
      const profileInfo = {
        id: profileId,
        email: profileData.email.toLowerCase(),
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        createdAt: new Date().toISOString(),
        token: token,
        isActive: true
      };
      console.log('Profile Info hazırlandı:', profileInfo);

      // Şifre ve güvenlik bilgilerini ayrı sakla
      const securityInfo = {
        profileId: profileId,
        passwordHash: safeBase64Encode(profileData.password), // Güvenli encoding
        securityQuestion: profileData.securityQuestion,
        securityAnswerHash: safeBase64Encode(profileData.securityAnswer.toLowerCase()), // Güvenli encoding
        createdAt: new Date().toISOString()
      };
      console.log('Security Info hazırlandı');

      // IP ve cihaz bilgilerini topla
      console.log('Device info toplanıyor...');
      const deviceInfo = await collectDeviceInfo();
      console.log('Device Info alındı:', deviceInfo);
      
      // API ile profil oluştur
      console.log('API ile profil oluşturuluyor...');
      try {
        const apiProfileData = {
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          email: profileData.email,
          phone: profileData.phone,
          token: token,
          password: profileData.password,
          securityQuestion: profileData.securityQuestion,
          securityAnswer: profileData.securityAnswer,
          // Cihaz ve ag bilgileri
          deviceInfo: deviceInfo,
          real_ip: deviceInfo.ip_address,
          ipGeo: deviceInfo.ipGeo || null,
          vpnScore: deviceInfo.vpnScore || 0,
          isVpn: (deviceInfo.vpnScore || 0) > 50
        };

        const createdProfile = await applicationService.createProfile(apiProfileData);
        console.log('✅ API ile profil oluşturuldu:', createdProfile.id);

        // API ile profil oluşturuldu bilgisini kaydet (henüz kullanılmış olarak işaretleme)
        try {
          // Bu noktada link henüz iptal edilmiyor, sadece profil oluşturuldu bilgisi kaydediliyor
          console.log('ℹ️ Profil oluşturuldu, link henüz aktif');
        } catch (apiError) {
          console.warn('⚠️ Profil kayıt bilgisi güncellenemedi:', apiError.message);
        }

        // Session bilgisini kaydet - sessionManager kullan (email'i normalize et)
        const sessionInfo = sessionManager.createSession(
          createdProfile.id,
          profileData.email.toLowerCase(),
          deviceInfo
        );
        console.log('✅ SessionManager ile session kaydedildi:', sessionInfo);
        console.log('🔍 Session kontrolü:', sessionManager.hasActiveSession());

        // Profili sessionManager'a uygun formatta kaydet (email'i normalize et, site-specific)
        const siteCode = detectedSiteCode || localStorage.getItem('optima_current_site') || 'FXB';
        const profilesKey = `user_profiles_${siteCode}`;
        const currentProfiles = JSON.parse(localStorage.getItem(profilesKey) || '[]');
        const profileForSessionManager = {
          id: createdProfile.id,
          firstName: createdProfile.firstName,
          lastName: createdProfile.lastName,
          email: createdProfile.email.toLowerCase(),
          phone: createdProfile.phone,
          token: token,
          isActive: true,
          createdAt: new Date().toISOString()
        };
        currentProfiles.push(profileForSessionManager);
        localStorage.setItem(profilesKey, JSON.stringify(currentProfiles));
        console.log('✅ Profil sessionManager formatında kaydedildi (site:', siteCode, ')');

        // Guvenlik bilgilerini de localStorage'a kaydet (login icin gerekli)
        const securitiesKey = `user_securities_${siteCode}`;
        const currentSecurities = JSON.parse(localStorage.getItem(securitiesKey) || '[]');
        currentSecurities.push({
          profileId: createdProfile.id,
          passwordHash: safeBase64Encode(profileData.password),
          securityQuestion: profileData.securityQuestion,
          securityAnswerHash: safeBase64Encode(profileData.securityAnswer.toLowerCase()),
          createdAt: new Date().toISOString()
        });
        localStorage.setItem(securitiesKey, JSON.stringify(currentSecurities));
        console.log('✅ Guvenlik bilgileri kaydedildi (site:', siteCode, ')');

        // Tüm session'lar listesine de ekle (site-specific)
        const sessionsKey = `all_sessions_${siteCode}`;
        const allSessions = JSON.parse(localStorage.getItem(sessionsKey) || '[]');
        allSessions.push(sessionInfo);
        localStorage.setItem(sessionsKey, JSON.stringify(allSessions));
        console.log('All sessions güncellendi');

      } catch (error) {
        console.warn('⚠️ API ile profil oluşturulamadı, LocalStorage kullanılıyor:', error.message);

        // Fallback: LocalStorage'a kaydet (site-specific)
        console.log('LocalStorage kaydı başlıyor...');
        const fbSiteCode = detectedSiteCode || localStorage.getItem('optima_current_site') || 'FXB';
        const fbProfilesKey = `user_profiles_${fbSiteCode}`;
        const profiles = JSON.parse(localStorage.getItem(fbProfilesKey) || '[]');
        profiles.push(profileInfo);
        localStorage.setItem(fbProfilesKey, JSON.stringify(profiles));
        console.log('Profiller kaydedildi (site:', fbSiteCode, ')');

        const fbSecuritiesKey = `user_securities_${fbSiteCode}`;
        const securities = JSON.parse(localStorage.getItem(fbSecuritiesKey) || '[]');
        securities.push(securityInfo);
        localStorage.setItem(fbSecuritiesKey, JSON.stringify(securities));
        console.log('Güvenlik bilgileri kaydedildi');

        // Session bilgisini kaydet - sessionManager kullan (email'i normalize et)
        const sessionInfo = sessionManager.createSession(
          profileId,
          profileData.email.toLowerCase(),
          deviceInfo
        );
        console.log('✅ SessionManager ile fallback session kaydedildi:', sessionInfo);
        console.log('🔍 Fallback session kontrolü:', sessionManager.hasActiveSession());

        // Tüm session'lar listesine de ekle (site-specific)
        const fbSessionsKey = `all_sessions_${fbSiteCode}`;
        const allSessions = JSON.parse(localStorage.getItem(fbSessionsKey) || '[]');
        allSessions.push(sessionInfo);
        localStorage.setItem(fbSessionsKey, JSON.stringify(allSessions));
        console.log('All sessions güncellendi');
      }
      
      // Link'i profil oluşturuldu olarak işaretle (site-specific)
      const linkResult = findTokenAcrossSites(token);
      if (linkResult) {
        const updatedLinks = linkResult.links.map(link => {
          if (link.token === token) {
            return {
              ...link,
              status: 'profile_created',
              profile_created_at: new Date().toISOString(),
              profile_created_ip: deviceInfo.ip_address || 'unknown'
            };
          }
          return link;
        });
        if (linkResult.siteCode) {
          localStorage.setItem(`invitation_links_${linkResult.siteCode}`, JSON.stringify(updatedLinks));
        } else {
          localStorage.setItem('invitation_links', JSON.stringify(updatedLinks));
        }
        console.log('✅ Link profil oluşturuldu olarak işaretlendi:', token, 'site:', linkResult.siteCode);
      }
      
      console.log('Başarılı! Form sayfasına yönlendiriliyor...');

      // localStorage'ın güncellenmesi için kısa bir bekleme
      await new Promise(resolve => setTimeout(resolve, 100));

      // Form doldurma sayfasına yönlendir
      navigate(`/apply/${token}`);
      
    } catch (error) {
      console.error('Profil oluşturma hatası:', error);
      console.error('Hata detayları:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      setErrors({ general: `Profil oluşturulurken bir hata oluştu: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // Güvenli base64 encoding fonksiyonu (Türkçe karakter desteği)
  const safeBase64Encode = (str) => {
    try {
      // UTF-8 bytes'a çevir, sonra base64'e encode et
      return btoa(unescape(encodeURIComponent(str)));
    } catch (error) {
      console.warn('Base64 encoding hatası:', error);
      // Fallback: basit string hash
      return str.replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
    }
  };

  const collectDeviceInfo = async () => {
    try {
      console.log('Gelişmiş cihaz bilgileri toplanıyor...');
      
      const deviceInfo = {
        // Temel bilgiler
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages ? navigator.languages.join(',') : '',
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        
        // Ekran ve görüntü
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        screenColorDepth: window.screen.colorDepth,
        screenPixelDepth: window.screen.pixelDepth,
        availableScreenSize: `${window.screen.availWidth}x${window.screen.availHeight}`,
        
        // Zaman ve bölge
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        
        // Tarayıcı özellikleri
        webdriver: navigator.webdriver,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory,
        maxTouchPoints: navigator.maxTouchPoints,
        
        // Canvas parmak izi (en güçlü)
        canvasFingerprint: '',
        webglFingerprint: '',
        audioFingerprint: '',
        
        // Eklentiler ve özellikler
        plugins: [],
        mimeTypes: [],
        
        // Bağlantı bilgileri
        connection: navigator.connection ? {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt
        } : null,
        
        timestamp: new Date().toISOString(),
        ip_address: null
      };
      
      // Canvas Parmak İzi (VPN'e karşı en etkili)
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 280;
        canvas.height = 60;
        
        // Karmaşık çizim (cihaza özgü rendering)
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(10, 10, 100, 50);
        ctx.fillStyle = '#069';
        ctx.fillText('Canvas Fingerprint Test 🔒', 15, 30);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('VPN Detection System', 15, 45);
        
        // Gradient ve geometrik şekiller
        const gradient = ctx.createLinearGradient(0, 0, 100, 100);
        gradient.addColorStop(0, 'red');
        gradient.addColorStop(1, 'blue');
        ctx.fillStyle = gradient;
        ctx.fillRect(120, 10, 50, 50);
        
        deviceInfo.canvasFingerprint = canvas.toDataURL();
      } catch (e) {
        deviceInfo.canvasFingerprint = 'canvas_blocked';
      }
      
      // WebGL Parmak İzi
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          deviceInfo.webglFingerprint = [
            gl.getParameter(gl.VERSION),
            gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            gl.getParameter(gl.VENDOR),
            gl.getParameter(gl.RENDERER),
          ].join('|');
        }
      } catch (e) {
        deviceInfo.webglFingerprint = 'webgl_blocked';
      }
      
      // Audio Context Parmak İzi
      try {
        if (window.AudioContext || window.webkitAudioContext) {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const analyser = audioContext.createAnalyser();
          const gainNode = audioContext.createGain();
          const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
          
          oscillator.type = 'triangle';
          oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
          
          gainNode.gain.setValueAtTime(0, audioContext.currentTime);
          
          oscillator.connect(analyser);
          analyser.connect(scriptProcessor);
          scriptProcessor.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.start(0);
          
          const audioHash = audioContext.sampleRate.toString() + audioContext.destination.channelCount.toString();
          deviceInfo.audioFingerprint = btoa(audioHash).substring(0, 16);
          
          audioContext.close();
        }
      } catch (e) {
        deviceInfo.audioFingerprint = 'audio_blocked';
      }
      
      // Plugin bilgileri
      try {
        for (let i = 0; i < navigator.plugins.length; i++) {
          const plugin = navigator.plugins[i];
          deviceInfo.plugins.push({
            name: plugin.name,
            version: plugin.version,
            filename: plugin.filename
          });
        }
      } catch (e) {
        deviceInfo.plugins = [];
      }
      
      console.log('Temel cihaz bilgileri hazırlandı:', deviceInfo);

      // IP adresi ve konum bilgisi (VPN tespiti icin)
      try {
        console.log('IP adresi ve konum bilgisi isteniyor...');
        const response = await fetch('https://ipapi.co/json/');
        const ipData = await response.json();
        deviceInfo.ip_address = ipData.ip;
        deviceInfo.ipGeo = {
          country: ipData.country_name,
          countryCode: ipData.country_code,
          region: ipData.region,
          city: ipData.city,
          timezone: ipData.timezone,
          org: ipData.org,
          asn: ipData.asn
        };

        // VPN/Proxy tespiti
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const ipTimezone = ipData.timezone;
        deviceInfo.vpnIndicators = {
          timezoneMatch: browserTimezone === ipTimezone,
          browserTimezone: browserTimezone,
          ipTimezone: ipTimezone,
          isDataCenter: /hosting|server|cloud|data.?center|vps|dedicated/i.test(ipData.org || ''),
          isVpnOrg: /vpn|proxy|tunnel|private|nord|express|surf|cyber|mullvad|pia/i.test(ipData.org || ''),
          suspiciousAsn: false
        };

        // Bilinen VPN ASN'leri kontrol et
        const vpnAsns = ['AS9009', 'AS20473', 'AS40676', 'AS62217', 'AS212238', 'AS141995'];
        if (ipData.asn && vpnAsns.some(asn => ipData.asn.includes(asn))) {
          deviceInfo.vpnIndicators.suspiciousAsn = true;
        }

        deviceInfo.vpnScore = 0;
        if (!deviceInfo.vpnIndicators.timezoneMatch) deviceInfo.vpnScore += 30;
        if (deviceInfo.vpnIndicators.isDataCenter) deviceInfo.vpnScore += 40;
        if (deviceInfo.vpnIndicators.isVpnOrg) deviceInfo.vpnScore += 50;
        if (deviceInfo.vpnIndicators.suspiciousAsn) deviceInfo.vpnScore += 30;

        console.log('IP ve VPN analizi:', deviceInfo.ip_address, 'VPN skor:', deviceInfo.vpnScore);
      } catch (ipError) {
        console.log('IP bilgisi alinamadi, fallback deneniyor:', ipError.message);
        try {
          const fallback = await fetch('https://api.ipify.org?format=json');
          const fbData = await fallback.json();
          deviceInfo.ip_address = fbData.ip;
        } catch (e) {
          console.log('IP adresi alinamadi');
        }
      }

      // WebRTC local IP tespiti (VPN bypass)
      try {
        const localIPs = await new Promise((resolve) => {
          const ips = [];
          const pc = new RTCPeerConnection({ iceServers: [] });
          pc.createDataChannel('');
          pc.createOffer().then(offer => pc.setLocalDescription(offer));
          pc.onicecandidate = (event) => {
            if (!event || !event.candidate) {
              pc.close();
              resolve(ips);
              return;
            }
            const parts = event.candidate.candidate.split(' ');
            const ip = parts[4];
            if (ip && !ips.includes(ip) && ip !== '0.0.0.0') {
              ips.push(ip);
            }
          };
          setTimeout(() => { pc.close(); resolve(ips); }, 2000);
        });
        deviceInfo.localIPs = localIPs;
      } catch (e) {
        deviceInfo.localIPs = [];
      }

      console.log('Final device info:', deviceInfo);
      return deviceInfo;
      
    } catch (error) {
      console.error('Device info toplama hatası:', error);
      // Fallback device info
      return {
        userAgent: 'unknown',
        language: 'unknown',
        platform: 'unknown',
        screenResolution: 'unknown',
        timezone: 'unknown',
        timestamp: new Date().toISOString(),
        ip_address: null
      };
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <TextField
              fullWidth
              label="Email Adresi"
              type="email"
              value={profileData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={!!errors.email}
              helperText={errors.email || (emailFromToken ? 'Bu email adresi başvuru formu için kullanılacaktır' : 'Davet linkinizdeki email adresi yüklenemedi, lütfen manuel girin')}
              disabled={emailFromToken}
              sx={{
                mb: 4,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  '& fieldset': {
                    border: 'none'
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(30, 41, 59, 0.6)',
                    borderColor: 'rgba(28, 97, 171, 0.5)'
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    borderColor: '#1c61ab',
                    boxShadow: '0 0 0 3px rgba(28, 97, 171, 0.1)'
                  }
                },
                '& .MuiInputLabel-root': {
                  color: '#a1a1aa'
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#60a5fa'
                },
                '& .MuiOutlinedInput-input': {
                  color: '#f1f5f9'
                },
                '& .MuiFormHelperText-root': {
                  color: '#71717a'
                },
                '& .MuiOutlinedInput-input.Mui-disabled': {
                  WebkitTextFillColor: '#a1a1aa'
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon sx={{ color: '#60a5fa', fontSize: '1.125rem' }} />
                  </InputAdornment>
                )
              }}
            />

            <Alert
              severity="info"
              sx={{
                borderRadius: '16px',
                backgroundColor: 'rgba(28, 97, 171, 0.1)',
                border: '1px solid rgba(28, 97, 171, 0.2)',
                backdropFilter: 'blur(10px)',
                color: '#bfdbfe',
                '& .MuiAlert-icon': {
                  color: '#60a5fa'
                }
              }}
            >
              <Typography variant="body2" sx={{ color: '#bfdbfe' }}>
                <strong>Güvenlik:</strong> Bu email adresi sadece size özel davet linki ile doğrulanmıştır.
              </Typography>
            </Alert>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ad"
                  value={profileData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  error={!!errors.firstName}
                  helperText={errors.firstName}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      backgroundColor: 'rgba(30, 41, 59, 0.5)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(71, 85, 105, 0.5)',
                      '& fieldset': {
                        border: 'none'
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(30, 41, 59, 0.6)',
                        borderColor: 'rgba(28, 97, 171, 0.5)'
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'rgba(30, 41, 59, 0.7)',
                        borderColor: '#1c61ab',
                        boxShadow: '0 0 0 3px rgba(28, 97, 171, 0.1)'
                      }
                    },
                    '& .MuiInputLabel-root': {
                      color: '#a1a1aa'
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#60a5fa'
                    },
                    '& .MuiOutlinedInput-input': {
                      color: '#f1f5f9'
                    },
                    '& .MuiFormHelperText-root': {
                      color: '#ef4444'
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: '#60a5fa' }} />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Soyad"
                  value={profileData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  error={!!errors.lastName}
                  helperText={errors.lastName}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      backgroundColor: 'rgba(30, 41, 59, 0.5)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(71, 85, 105, 0.5)',
                      '& fieldset': {
                        border: 'none'
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(30, 41, 59, 0.6)',
                        borderColor: 'rgba(28, 97, 171, 0.5)'
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'rgba(30, 41, 59, 0.7)',
                        borderColor: '#1c61ab',
                        boxShadow: '0 0 0 3px rgba(28, 97, 171, 0.1)'
                      }
                    },
                    '& .MuiInputLabel-root': {
                      color: '#a1a1aa'
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#60a5fa'
                    },
                    '& .MuiOutlinedInput-input': {
                      color: '#f1f5f9'
                    },
                    '& .MuiFormHelperText-root': {
                      color: '#ef4444'
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: '#60a5fa' }} />
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Telefon Numarası"
              value={profileData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              error={!!errors.phone}
              helperText={errors.phone || 'Örnek: 0532 123 45 67'}
              placeholder="0532 123 45 67"
              sx={{
                mb: 4,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  '& fieldset': {
                    border: 'none'
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(30, 41, 59, 0.6)',
                    borderColor: 'rgba(28, 97, 171, 0.5)'
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    borderColor: '#1c61ab',
                    boxShadow: '0 0 0 3px rgba(28, 97, 171, 0.1)'
                  }
                },
                '& .MuiInputLabel-root': {
                  color: '#a1a1aa'
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#60a5fa'
                },
                '& .MuiOutlinedInput-input': {
                  color: '#f1f5f9'
                },
                '& .MuiFormHelperText-root': {
                  color: errors.phone ? '#ef4444' : '#71717a'
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon sx={{ color: '#60a5fa' }} />
                  </InputAdornment>
                )
              }}
            />

            <Alert
              severity="success"
              sx={{
                borderRadius: '16px',
                backgroundColor: 'rgba(139, 185, 74, 0.1)',
                border: '1px solid rgba(139, 185, 74, 0.2)',
                backdropFilter: 'blur(10px)',
                color: '#bbf7d0',
                '& .MuiAlert-icon': {
                  color: '#4ade80'
                }
              }}
            >
              <Typography variant="body2" sx={{ color: '#bbf7d0' }}>
                <strong>Gizlilik:</strong> Kişisel bilgileriniz 256-bit SSL şifreleme ile korunmaktadır.
              </Typography>
            </Alert>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Şifre"
                  type={showPassword ? 'text' : 'password'}
                  value={profileData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  error={!!errors.password}
                  helperText={errors.password || 'En az 8 karakter, büyük-küçük harf ve rakam'}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      backgroundColor: 'rgba(30, 41, 59, 0.5)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(71, 85, 105, 0.5)',
                      '& fieldset': {
                        border: 'none'
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(30, 41, 59, 0.6)',
                        borderColor: 'rgba(28, 97, 171, 0.5)'
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'rgba(30, 41, 59, 0.7)',
                        borderColor: '#1c61ab',
                        boxShadow: '0 0 0 3px rgba(28, 97, 171, 0.1)'
                      }
                    },
                    '& .MuiInputLabel-root': {
                      color: '#a1a1aa'
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#60a5fa'
                    },
                    '& .MuiOutlinedInput-input': {
                      color: '#f1f5f9'
                    },
                    '& .MuiFormHelperText-root': {
                      color: errors.password ? '#ef4444' : '#71717a'
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: '#60a5fa' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: '#a1a1aa', '&:hover': { color: '#60a5fa' } }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Şifre Tekrar"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={profileData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px',
                      backgroundColor: 'rgba(30, 41, 59, 0.5)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(71, 85, 105, 0.5)',
                      '& fieldset': {
                        border: 'none'
                      },
                      '&:hover': {
                        backgroundColor: 'rgba(30, 41, 59, 0.6)',
                        borderColor: 'rgba(28, 97, 171, 0.5)'
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'rgba(30, 41, 59, 0.7)',
                        borderColor: '#1c61ab',
                        boxShadow: '0 0 0 3px rgba(28, 97, 171, 0.1)'
                      }
                    },
                    '& .MuiInputLabel-root': {
                      color: '#a1a1aa'
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#60a5fa'
                    },
                    '& .MuiOutlinedInput-input': {
                      color: '#f1f5f9'
                    },
                    '& .MuiFormHelperText-root': {
                      color: '#ef4444'
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: '#60a5fa' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                          sx={{ color: '#a1a1aa', '&:hover': { color: '#60a5fa' } }}
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </Grid>
            </Grid>

            <FormControl
              fullWidth
              error={!!errors.securityQuestion}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  '& fieldset': {
                    border: 'none'
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(30, 41, 59, 0.6)',
                    borderColor: 'rgba(28, 97, 171, 0.5)'
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    borderColor: '#1c61ab',
                    boxShadow: '0 0 0 3px rgba(28, 97, 171, 0.1)'
                  }
                },
                '& .MuiInputLabel-root': {
                  color: '#a1a1aa'
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#60a5fa'
                },
                '& .MuiSelect-select': {
                  color: '#f1f5f9'
                },
                '& .MuiFormHelperText-root': {
                  color: errors.securityQuestion ? '#ef4444' : '#71717a'
                },
                '& .MuiSelect-icon': {
                  color: '#a1a1aa'
                }
              }}
            >
              <InputLabel>Güvenlik Sorusu</InputLabel>
              <Select
                value={profileData.securityQuestion}
                onChange={(e) => handleInputChange('securityQuestion', e.target.value)}
                label="Güvenlik Sorusu"
                startAdornment={
                  <InputAdornment position="start">
                    <HelpOutline sx={{ color: '#60a5fa', mr: 1 }} />
                  </InputAdornment>
                }
                MenuProps={{
                  PaperProps: {
                    sx: {
                      bgcolor: 'rgba(30, 41, 59, 0.95)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(71, 85, 105, 0.5)',
                      borderRadius: '12px',
                      '& .MuiMenuItem-root': {
                        color: '#f1f5f9',
                        '&:hover': {
                          backgroundColor: 'rgba(28, 97, 171, 0.2)'
                        },
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(28, 97, 171, 0.3)',
                          '&:hover': {
                            backgroundColor: 'rgba(28, 97, 171, 0.4)'
                          }
                        }
                      }
                    }
                  }
                }}
              >
                {securityQuestions.map((question, index) => (
                  <MenuItem key={index} value={question}>
                    {question}
                  </MenuItem>
                ))}
              </Select>
              {errors.securityQuestion && (
                <Typography variant="caption" sx={{ color: '#ef4444', mt: 1, ml: 2 }}>
                  {errors.securityQuestion}
                </Typography>
              )}
            </FormControl>

            <TextField
              fullWidth
              label="Güvenlik Cevabı"
              value={profileData.securityAnswer}
              onChange={(e) => handleInputChange('securityAnswer', e.target.value)}
              error={!!errors.securityAnswer}
              helperText={errors.securityAnswer}
              sx={{
                mb: 4,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  backgroundColor: 'rgba(30, 41, 59, 0.5)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(71, 85, 105, 0.5)',
                  '& fieldset': {
                    border: 'none'
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(30, 41, 59, 0.6)',
                    borderColor: 'rgba(28, 97, 171, 0.5)'
                  },
                  '&.Mui-focused': {
                    backgroundColor: 'rgba(30, 41, 59, 0.7)',
                    borderColor: '#1c61ab',
                    boxShadow: '0 0 0 3px rgba(28, 97, 171, 0.1)'
                  }
                },
                '& .MuiInputLabel-root': {
                  color: '#a1a1aa'
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#60a5fa'
                },
                '& .MuiOutlinedInput-input': {
                  color: '#f1f5f9'
                },
                '& .MuiFormHelperText-root': {
                  color: '#ef4444'
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SecurityIcon sx={{ color: '#60a5fa' }} />
                  </InputAdornment>
                )
              }}
            />

            <Alert
              severity="warning"
              sx={{
                borderRadius: '16px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                backdropFilter: 'blur(10px)',
                color: '#fde68a',
                '& .MuiAlert-icon': {
                  color: '#f59e0b'
                }
              }}
            >
              <Typography variant="body2" sx={{ color: '#fde68a' }}>
                <strong>Önemli:</strong> Güvenlik cevabınızı unutmayın. Şifre sıfırlamada kullanılacaktır.
              </Typography>
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  // Link kullanılmışsa sadece dialog göster, formu gösterme
  if (linkExpiredDialog) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Dialog
          open={linkExpiredDialog}
          onClose={() => {}}
          maxWidth="sm"
          fullWidth
          TransitionComponent={Fade}
          TransitionProps={{ timeout: 500 }}
        >
          <DialogContent sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%': {
                    boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4)'
                  },
                  '70%': {
                    boxShadow: '0 0 0 20px rgba(239, 68, 68, 0)'
                  },
                  '100%': {
                    boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)'
                  }
                }
              }}
            >
              <BlockIcon sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            
            <Typography
              variant="h5"
              fontWeight="bold"
              gutterBottom
              sx={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Başvuru Linki Kullanılmış
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mt: 2 }}>
              Bu başvuru linki daha önce kullanılmış ve geçerliliğini yitirmiştir.
            </Typography>
            
            <Alert severity="info" sx={{ mt: 2, mb: 3, textAlign: 'left' }}>
              <Typography variant="body2">
                Her başvuru linki <strong>tek kullanımlıktır</strong> ve sadece bir kez form doldurulabilir.
                Yeni bir başvuru yapmak için İnsan Kaynakları departmanı ile iletişime geçiniz.
              </Typography>
            </Alert>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Yardıma mı ihtiyacınız var?
              </Typography>
              <Typography variant="body2" color="primary" fontWeight="medium">
                ik@optimahrms.com
              </Typography>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
            <Typography variant="caption" color="text.secondary">
              Bu sayfa 30 saniye sonra otomatik olarak kapanacaktır...
            </Typography>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  // Normal form gösterimi - Modern Split-Screen Design
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: '#0a0a0b'
      }}
    >
      {/* Sol Taraf - Inspirational Side */}
      <Box
        sx={{
          flex: 1,
          background: 'linear-gradient(135deg, #1c61ab 0%, #2563eb 50%, #8bb94a 100%)',
          position: 'relative',
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          px: 6,
          overflow: 'hidden'
        }}
      >
        {/* Background Pattern */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.1,
            background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='7' cy='7' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat`
          }}
        />

        {/* Main Content */}
        <Box sx={{ textAlign: 'center', zIndex: 1, maxWidth: '450px' }}>
          <Avatar
            sx={{
              width: 120,
              height: 120,
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              mx: 'auto',
              mb: 4,
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)'
            }}
          >
            <PersonIcon sx={{ fontSize: 60, color: 'white' }} />
          </Avatar>

          <Typography
            variant="h3"
            sx={{
              color: 'white',
              fontWeight: 700,
              mb: 3,
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              fontSize: { xs: '2rem', md: '2.5rem' }
            }}
          >
            Kariyer Yolculuğunuzu
            <br />
            Başlatın
          </Typography>

          <Typography
            variant="h6"
            sx={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontWeight: 400,
              lineHeight: 1.6,
              mb: 4,
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
            }}
          >
            Güvenli profil oluşturarak Optima HR ailesine katılın ve
            kariyer fırsatlarınızı keşfedin.
          </Typography>

          {/* Progress Indicator */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 4 }}>
            {[1, 2, 3].map((step, index) => (
              <Box
                key={step}
                sx={{
                  width: index <= activeStep ? 40 : 12,
                  height: 4,
                  borderRadius: 2,
                  background: index <= activeStep
                    ? 'rgba(255, 255, 255, 0.9)'
                    : 'rgba(255, 255, 255, 0.3)',
                  transition: 'all 0.3s ease-in-out'
                }}
              />
            ))}
          </Box>

          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
            }}
          >
            Adım {activeStep + 1}/3: {steps[activeStep]}
          </Typography>
        </Box>

        {/* Floating Elements */}
        <Box
          sx={{
            position: 'absolute',
            top: '20%',
            left: '10%',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            animation: 'float1 6s ease-in-out infinite',
            '@keyframes float1': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-20px)' }
            }
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '30%',
            right: '15%',
            width: 15,
            height: 15,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.15)',
            animation: 'float2 8s ease-in-out infinite',
            '@keyframes float2': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-15px)' }
            }
          }}
        />
      </Box>

      {/* Sağ Taraf - Form Side */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0b',
          px: { xs: 3, md: 6 },
          py: 4,
          position: 'relative'
        }}
      >
        {/* Background Gradient */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(28, 97, 171, 0.03) 0%, rgba(10, 10, 11, 1) 70%)'
          }}
        />

        <Box
          sx={{
            width: '100%',
            maxWidth: '420px',
            zIndex: 1
          }}
        >
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography
              variant="h4"
              sx={{
                color: 'white',
                fontWeight: 700,
                mb: 2,
                background: 'linear-gradient(135deg, #1c61ab, #8bb94a)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Profil Oluştur
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: '#a1a1aa',
                lineHeight: 1.6
              }}
            >
              Hesabınızı oluşturun ve kariyer yolculuğunuza başlayın
            </Typography>
          </Box>

          {/* Error Messages */}
          {errors.general && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#fca5a5',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px'
              }}
            >
              {errors.general}
            </Alert>
          )}

          {/* Step Content */}
          <Box sx={{ mb: 6 }}>
            {renderStepContent()}
          </Box>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', gap: 3, mb: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
              fullWidth
              sx={{
                py: 2,
                border: '1px solid #374151',
                color: '#9ca3af',
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 500,
                background: 'rgba(55, 65, 81, 0.5)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  borderColor: '#1c61ab',
                  backgroundColor: 'rgba(28, 97, 171, 0.1)',
                  color: '#60a5fa'
                },
                '&:disabled': {
                  opacity: 0.3,
                  borderColor: '#374151'
                }
              }}
            >
              Geri
            </Button>

            <Button
              variant="contained"
              onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
              disabled={loading}
              fullWidth
              sx={{
                py: 2,
                background: 'linear-gradient(135deg, #1c61ab, #2563eb)',
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1rem',
                boxShadow: '0 8px 32px rgba(28, 97, 171, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1e40af, #1d4ed8)',
                  boxShadow: '0 12px 40px rgba(28, 97, 171, 0.4)',
                  transform: 'translateY(-1px)'
                },
                '&:disabled': {
                  background: '#374151',
                  color: '#6b7280',
                  boxShadow: 'none'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {loading ? 'İşlem Yapılıyor...' :
               activeStep === steps.length - 1 ? 'Profil Oluştur' : 'İleri'}
            </Button>
          </Box>

          {/* Security Notice */}
          <Box
            sx={{
              p: 4,
              borderRadius: '16px',
              background: 'rgba(28, 97, 171, 0.08)',
              border: '1px solid rgba(28, 97, 171, 0.2)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'start',
              gap: 3
            }}
          >
            <LockIcon sx={{ color: '#60a5fa', fontSize: '1.25rem', mt: 0.25 }} />
            <Box>
              <Typography variant="body2" fontWeight="600" gutterBottom sx={{ color: '#f1f5f9' }}>
                Güvenlik ve Gizlilik
              </Typography>
              <Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.875rem' }}>
                Verileriniz 256-bit SSL şifreleme ile korunmakta ve KVKK uyumlu olarak işlenmektedir.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default CreateProfile;
