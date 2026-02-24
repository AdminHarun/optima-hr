// src/utils/sessionManager.js

// Oturum süresi (8 saat = 8 * 60 * 60 * 1000 ms)
const SESSION_DURATION = 8 * 60 * 60 * 1000;

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

// Güvenli base64 decoding fonksiyonu
const safeBase64Decode = (str) => {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (error) {
    console.warn('Base64 decoding hatası:', error);
    return str; // Fallback: orijinal string
  }
};

class SessionManager {
  constructor() {
    this.sessionKey = 'current_session';
    this.profilesKey = 'user_profiles';
    this.securitiesKey = 'user_securities';
  }

  // Aktif oturum var mı kontrol et
  hasActiveSession() {
    const session = this.getCurrentSession();
    if (!session) return false;

    const now = new Date().getTime();
    const loginTime = new Date(session.loginTime).getTime();
    const timeDiff = now - loginTime;

    // 8 saat geçmişse oturum sonlandır
    if (timeDiff > SESSION_DURATION) {
      this.clearSession();
      return false;
    }

    return true;
  }

  // Mevcut oturumu al
  getCurrentSession() {
    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('Session verisi okunamadı:', error);
      return null;
    }
  }

  // Mevcut oturumu manuel olarak ayarla
  setCurrentSession(sessionInfo) {
    try {
      localStorage.setItem(this.sessionKey, JSON.stringify(sessionInfo));
      return true;
    } catch (error) {
      console.error('Session kaydetme hatası:', error);
      return false;
    }
  }

  // Yeni oturum oluştur
  createSession(profileId, email, deviceInfo) {
    const sessionInfo = {
      profileId: profileId,
      email: email,
      loginTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      deviceInfo: deviceInfo,
      isActive: true
    };

    localStorage.setItem(this.sessionKey, JSON.stringify(sessionInfo));
    return sessionInfo;
  }

  // Oturum süresini uzat (aktivite kaydı)
  updateLastActivity() {
    const session = this.getCurrentSession();
    if (session) {
      session.lastActivity = new Date().toISOString();
      localStorage.setItem(this.sessionKey, JSON.stringify(session));
    }
  }

  // Oturumu sonlandır
  clearSession() {
    localStorage.removeItem(this.sessionKey);
  }

  // Profil bilgilerini al
  getProfile(email) {
    try {
      const profiles = JSON.parse(localStorage.getItem(this.profilesKey) || '[]');
      return profiles.find(profile => profile.email === email && profile.isActive);
    } catch (error) {
      console.error('Profil verisi okunamadı:', error);
      return null;
    }
  }

  // Şifre doğrulama
  validatePassword(email, password) {
    try {
      const profile = this.getProfile(email);
      if (!profile) return false;

      const securities = JSON.parse(localStorage.getItem(this.securitiesKey) || '[]');
      const security = securities.find(s => s.profileId === profile.id);
      
      if (!security) return false;

      // Basit şifre kontrolü (gerçek uygulamada proper hash karşılaştırması)
      const hashedInput = safeBase64Encode(password);
      return security.passwordHash === hashedInput;
    } catch (error) {
      console.error('Şifre doğrulama hatası:', error);
      return false;
    }
  }

  // Güvenlik sorusu doğrulama
  validateSecurityAnswer(email, answer) {
    try {
      const profile = this.getProfile(email);
      if (!profile) return false;

      const securities = JSON.parse(localStorage.getItem(this.securitiesKey) || '[]');
      const security = securities.find(s => s.profileId === profile.id);
      
      if (!security) return false;

      const hashedInput = safeBase64Encode(answer.toLowerCase());
      return security.securityAnswerHash === hashedInput;
    } catch (error) {
      console.error('Güvenlik sorusu doğrulama hatası:', error);
      return false;
    }
  }

  // Token'a göre profil bul
  getProfileByToken(token) {
    try {
      const profiles = JSON.parse(localStorage.getItem(this.profilesKey) || '[]');
      return profiles.find(profile => profile.token === token && profile.isActive);
    } catch (error) {
      console.error('Token ile profil bulunamadı:', error);
      return null;
    }
  }

  // Chat token ile profil ilişkilendir
  linkChatToken(profileId, chatToken) {
    try {
      const profiles = JSON.parse(localStorage.getItem(this.profilesKey) || '[]');
      const updatedProfiles = profiles.map(profile => {
        if (profile.id === profileId) {
          return { ...profile, chatToken: chatToken };
        }
        return profile;
      });
      localStorage.setItem(this.profilesKey, JSON.stringify(updatedProfiles));
    } catch (error) {
      console.error('Chat token bağlama hatası:', error);
    }
  }

  // Chat token ile profil bul
  getProfileByChatToken(chatToken) {
    try {
      const profiles = JSON.parse(localStorage.getItem(this.profilesKey) || '[]');
      return profiles.find(profile => profile.chatToken === chatToken && profile.isActive);
    } catch (error) {
      console.error('Chat token ile profil bulunamadı:', error);
      return null;
    }
  }

  // Oturum süresini kontrol et (dakika cinsinden)
  getSessionTimeLeft() {
    const session = this.getCurrentSession();
    if (!session) return 0;

    const now = new Date().getTime();
    const loginTime = new Date(session.loginTime).getTime();
    const timeLeft = SESSION_DURATION - (now - loginTime);
    
    return Math.max(0, Math.floor(timeLeft / (1000 * 60))); // Dakika cinsinden
  }

  // IP ve cihaz bilgisi karşılaştır (şüpheli giriş tespiti)
  isDeviceRecognized(currentDeviceInfo) {
    const session = this.getCurrentSession();
    if (!session || !session.deviceInfo) return false;

    const savedDevice = session.deviceInfo;
    
    // Temel cihaz bilgilerini karşılaştır
    return (
      savedDevice.userAgent === currentDeviceInfo.userAgent &&
      savedDevice.screenResolution === currentDeviceInfo.screenResolution &&
      savedDevice.timezone === currentDeviceInfo.timezone
    );
  }

  // Güvenlik sorusunu al
  getSecurityQuestion(email) {
    try {
      const profile = this.getProfile(email);
      if (!profile) return null;

      const securities = JSON.parse(localStorage.getItem(this.securitiesKey) || '[]');
      const security = securities.find(s => s.profileId === profile.id);
      
      return security ? security.securityQuestion : null;
    } catch (error) {
      console.error('Güvenlik sorusu alınamadı:', error);
      return null;
    }
  }
}

// Singleton instance
const sessionManager = new SessionManager();
export default sessionManager;
