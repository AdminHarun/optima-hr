// Application Service - Form ve profil API entegrasyonu
const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:9000') + '/api';

class ApplicationService {
  // Site kodlarini al
  _getSiteCodes() {
    try {
      const sites = JSON.parse(localStorage.getItem('sites') || '[]');
      if (sites.length > 0) return sites.map(s => s.code);
    } catch (e) {}
    return ['FXB', 'MTD', 'ZBH'];
  }

  // Token'i tum site-specific invitation_links key'lerinde ara
  _findTokenAcrossSites(token) {
    const siteCodes = this._getSiteCodes();
    for (const siteCode of siteCodes) {
      const links = JSON.parse(localStorage.getItem(`invitation_links_${siteCode}`) || '[]');
      const found = links.find(inv => inv.token === token);
      if (found) return { invitation: found, siteCode, links };
    }
    // Legacy global key fallback
    const globalLinks = JSON.parse(localStorage.getItem('invitation_links') || '[]');
    const found = globalLinks.find(inv => inv.token === token);
    if (found) return { invitation: found, siteCode: null, links: globalLinks };
    return null;
  }

  // Site-specific invitation_links key'ini guncelle
  _updateInvitationLinks(siteCode, updatedLinks) {
    if (siteCode) {
      localStorage.setItem(`invitation_links_${siteCode}`, JSON.stringify(updatedLinks));
    } else {
      localStorage.setItem('invitation_links', JSON.stringify(updatedLinks));
    }
  }

  // Site-specific localStorage key
  _getProfilesKey(siteCode) {
    return siteCode ? `user_profiles_${siteCode}` : 'user_profiles';
  }

  _getApplicationsKey(siteCode) {
    return siteCode ? `applications_${siteCode}` : 'applications';
  }

  // Token doğrula (LinkValidation için)
  async validateToken(token) {
    try {
      console.log('🔄 Token doğrulanıyor:', token);

      // Önce gerçek IP adresini al
      let realIP = null;
      try {
        console.log('🌐 Gerçek IP adresi alınıyor...');
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        realIP = ipData.ip;
        console.log('✅ Gerçek IP adresi:', realIP);
      } catch (ipError) {
        console.warn('⚠️ IP adresi alınamadı:', ipError.message);
        // Fallback IP servisi dene
        try {
          const fallbackResponse = await fetch('https://ipapi.co/ip/');
          realIP = await fallbackResponse.text();
          console.log('✅ Fallback IP adresi:', realIP);
        } catch (fallbackError) {
          console.warn('⚠️ Fallback IP servisi de başarısız:', fallbackError.message);
        }
      }

      // API'ye gerçek IP ile beraber gönder
      const apiUrl = realIP
        ? `${API_BASE_URL}/invitations/validate/${token}?real_ip=${encodeURIComponent(realIP)}`
        : `${API_BASE_URL}/invitations/validate/${token}`;

      console.log('🌐 Token validation URL:', apiUrl);
      console.log('🌐 Gönderilen IP:', realIP);

      const response = await fetch(apiUrl, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Token geçerli:', result);
        return result;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token geçersiz');
      }
    } catch (error) {
      console.warn('⚠️ Token doğrulama API hatası:', error.message);

      // Fallback: Tum site-specific localStorage key'lerinden kontrol et
      const result = this._findTokenAcrossSites(token);

      if (!result) {
        throw new Error('Geçersiz davet linki');
      }

      const { invitation, siteCode } = result;

      if (invitation.status === 'used') {
        throw new Error('Bu davet linki daha önce kullanılmış');
      }

      console.log('📦 LocalStorage\'dan token doğrulandı (site:', siteCode, ')');
      return { valid: true, email: invitation.email, token: token, siteCode: siteCode };
    }
  }

  // Profil oluştur
  async createProfile(profileData) {
    try {
      console.log('🔄 API ile profil oluşturuluyor:', profileData.email);

      // Gerçek IP adresini al ve profil verisine ekle
      let realIP = null;
      try {
        console.log('🌐 Profil oluşturma için gerçek IP adresi alınıyor...');
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        realIP = ipData.ip;
        console.log('✅ Profil oluşturma IP adresi:', realIP);
      } catch (ipError) {
        console.warn('⚠️ Profil oluşturma IP adresi alınamadı:', ipError.message);
        try {
          const fallbackResponse = await fetch('https://ipapi.co/ip/');
          realIP = await fallbackResponse.text();
          console.log('✅ Fallback profil oluşturma IP adresi:', realIP);
        } catch (fallbackError) {
          console.warn('⚠️ Fallback IP servisi de başarısız:', fallbackError.message);
        }
      }

      // Profil verisine gerçek IP'yi ekle
      const profileDataWithIP = {
        ...profileData,
        real_ip: realIP
      };

      const response = await fetch(`${API_BASE_URL}/applications/profiles`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileDataWithIP)
      });

      if (response.ok) {
        const newProfile = await response.json();
        console.log('✅ API\'den profil oluşturuldu:', newProfile.id);

        // LocalStorage'a da yedekle (site-specific)
        const tokenResult = this._findTokenAcrossSites(profileData.token);
        const profileSiteCode = tokenResult?.siteCode || localStorage.getItem('optima_current_site') || 'FXB';
        const profilesKey = this._getProfilesKey(profileSiteCode);
        const currentProfiles = JSON.parse(localStorage.getItem(profilesKey) || '[]');
        const localProfile = {
          id: newProfile.id,
          firstName: newProfile.firstName,
          lastName: newProfile.lastName,
          email: newProfile.email,
          phone: newProfile.phone,
          sessionToken: newProfile.sessionToken,
          token: newProfile.token,
          createdAt: new Date().toISOString()
        };
        currentProfiles.push(localProfile);
        localStorage.setItem(profilesKey, JSON.stringify(currentProfiles));

        return newProfile;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Profil oluşturulamadı');
      }
    } catch (error) {
      console.warn('⚠️ API ile profil oluşturulamadı, LocalStorage kullanılıyor:', error.message);

      // Fallback: LocalStorage ile oluştur
      return this.createProfileFallback(profileData);
    }
  }

  // LocalStorage fallback profil oluşturma
  createProfileFallback(profileData) {
    const sessionToken = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newProfile = {
      id: Date.now(),
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      phone: profileData.phone,
      sessionToken: sessionToken,
      token: profileData.token,
      createdAt: new Date().toISOString()
    };

    const tokenResult = this._findTokenAcrossSites(profileData.token);
    const profileSiteCode = tokenResult?.siteCode || localStorage.getItem('optima_current_site') || 'FXB';
    const profilesKey = this._getProfilesKey(profileSiteCode);
    const currentProfiles = JSON.parse(localStorage.getItem(profilesKey) || '[]');
    currentProfiles.push(newProfile);
    localStorage.setItem(profilesKey, JSON.stringify(currentProfiles));

    console.log('📦 LocalStorage ile profil oluşturuldu:', newProfile.id, '(site:', profileSiteCode, ')');
    return newProfile;
  }

  // Form gönder
  async submitApplication(formData, files = {}) {
    try {
      console.log('🔄 API ile form gönderiliyor:', formData.email);

      const formDataObj = new FormData();

      // Form verilerini ekle
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          formDataObj.append(key, formData[key]);
        }
      });

      // Dosyaları ekle
      Object.keys(files).forEach(key => {
        if (files[key]) {
          formDataObj.append(key, files[key]);
        }
      });

      const response = await fetch(`${API_BASE_URL}/applications/submit`, {
        method: 'POST',
        credentials: 'include',
        body: formDataObj
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ API\'den form gönderildi:', result.applicationId);

        // LocalStorage'a da yedekle (site-specific)
        const tokenResult = this._findTokenAcrossSites(formData.token);
        const appSiteCode = tokenResult?.siteCode || localStorage.getItem('optima_current_site') || 'FXB';
        const appsKey = this._getApplicationsKey(appSiteCode);
        const currentApplications = JSON.parse(localStorage.getItem(appsKey) || '[]');
        const localApplication = {
          id: result.applicationId,
          ...formData,
          status: 'form_completed',
          submittedAt: new Date().toISOString(),
          chatToken: result.chatToken,
          filesUploaded: result.filesUploaded
        };
        currentApplications.push(localApplication);
        localStorage.setItem(appsKey, JSON.stringify(currentApplications));

        // Link'i used olarak işaretle
        await this.markLinkAsUsed(formData.token, formData.firstName, formData.lastName, formData.phone);

        return result;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Form gönderilemedi');
      }
    } catch (error) {
      console.warn('⚠️ API ile form gönderilemedi, LocalStorage kullanılıyor:', error.message);

      // Fallback: LocalStorage ile kaydet
      return this.submitApplicationFallback(formData, files);
    }
  }

  // LocalStorage fallback form gönderme
  async submitApplicationFallback(formData, files) {
    const applicationId = Date.now();
    const chatToken = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const application = {
      id: applicationId,
      ...formData,
      status: 'form_completed',
      submittedAt: new Date().toISOString(),
      chatToken: chatToken,
      filesUploaded: Object.keys(files).length
    };

    const tokenResult = this._findTokenAcrossSites(formData.token);
    const appSiteCode = tokenResult?.siteCode || localStorage.getItem('optima_current_site') || 'FXB';
    const appsKey = this._getApplicationsKey(appSiteCode);
    const applicationsData = JSON.parse(localStorage.getItem(appsKey) || '[]');
    const currentApplications = Array.isArray(applicationsData) ? applicationsData : [applicationsData].filter(Boolean);
    currentApplications.push(application);
    localStorage.setItem(appsKey, JSON.stringify(currentApplications));

    // Link'i used olarak işaretle
    await this.markLinkAsUsed(formData.token, formData.firstName, formData.lastName, formData.phone);

    console.log('📦 LocalStorage ile form kaydedildi:', applicationId);
    return {
      success: true,
      applicationId: applicationId,
      chatToken: chatToken,
      filesUploaded: Object.keys(files).length
    };
  }

  // Link'i kullanılmış olarak işaretle
  async markLinkAsUsed(token, firstName, lastName, phone) {
    try {
      // Gerçek IP adresi al
      let formSubmitIP = 'unknown';
      try {
        console.log('🌐 Form submit için gerçek IP adresi alınıyor...');
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        formSubmitIP = ipData.ip;
        console.log('✅ Form submit IP adresi:', formSubmitIP);
      } catch (ipError) {
        console.warn('⚠️ Form submit IP adresi alınamadı:', ipError.message);
        // Fallback IP servisi dene
        try {
          const fallbackResponse = await fetch('https://ipapi.co/ip/');
          formSubmitIP = await fallbackResponse.text();
          console.log('✅ Fallback form submit IP adresi:', formSubmitIP);
        } catch (fallbackError) {
          console.warn('⚠️ Fallback IP servisi de başarısız:', fallbackError.message);
        }
      }

      // LocalStorage'daki linkleri güncelle (site-specific)
      const tokenResult = this._findTokenAcrossSites(token);
      if (tokenResult) {
        const updatedLinks = tokenResult.links.map(link => {
          if (link.token === token) {
            return {
              ...link,
              status: 'used',
              usedAt: new Date().toISOString(),
              form_submitted_ip: formSubmitIP,
              applicantName: `${firstName} ${lastName}`,
              applicantPhone: phone
            };
          }
          return link;
        });
        this._updateInvitationLinks(tokenResult.siteCode, updatedLinks);
        console.log('📦 Link used olarak işaretlendi:', token, 'site:', tokenResult.siteCode, 'IP:', formSubmitIP);
      }
    } catch (error) {
      console.error('❌ Link güncellenemedi:', error);
    }
  }

  // Session doğrula
  async validateSession(sessionToken) {
    try {
      console.log('🔄 Session doğrulanıyor:', sessionToken);

      const response = await fetch(`${API_BASE_URL}/applications/session/${sessionToken}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Session geçerli:', result.id);
        return result;
      } else {
        throw new Error('Session geçersiz');
      }
    } catch (error) {
      console.warn('⚠️ Session doğrulama API hatası:', error.message);

      // Fallback: Tum site-specific localStorage key'lerinden kontrol et
      let profile = null;
      const siteCodes = this._getSiteCodes();
      for (const sc of siteCodes) {
        const localProfiles = JSON.parse(localStorage.getItem(`user_profiles_${sc}`) || '[]');
        profile = localProfiles.find(p => p.sessionToken === sessionToken);
        if (profile) break;
      }
      // Legacy key fallback
      if (!profile) {
        const legacyProfiles = JSON.parse(localStorage.getItem('profiles') || '[]');
        profile = legacyProfiles.find(p => p.sessionToken === sessionToken);
      }

      if (!profile) {
        throw new Error('Geçersiz session');
      }

      console.log('📦 LocalStorage\'dan session doğrulandı');
      return {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        token: profile.token,
        valid: true
      };
    }
  }

  // Davet linkini kullanılmış olarak işaretle
  async markInvitationAsUsed(token) {
    try {
      console.log('🔄 Link kullanılmış olarak işaretleniyor:', token);

      const response = await fetch(`${API_BASE_URL}/invitations/mark-used/${token}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          used_at: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Link başarıyla kullanılmış olarak işaretlendi');
        return result;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Link işaretlenemedi');
      }
    } catch (error) {
      console.warn('⚠️ Link işaretleme API hatası:', error.message);

      // Fallback: Site-specific localStorage'da isaretle
      try {
        const tokenResult = this._findTokenAcrossSites(token);
        if (tokenResult) {
          const updatedLinks = tokenResult.links.map(link => {
            if (link.token === token) {
              return {
                ...link,
                status: 'used',
                used_at: new Date().toISOString(),
                marked_via_fallback: true
              };
            }
            return link;
          });
          this._updateInvitationLinks(tokenResult.siteCode, updatedLinks);
          console.log('📦 LocalStorage\'da link kullanılmış olarak işaretlendi (site:', tokenResult.siteCode, ')');
        }
        return { success: true, fallback: true };
      } catch (fallbackError) {
        console.error('❌ Fallback link işaretleme de başarısız:', fallbackError.message);
        throw error;
      }
    }
  }
  // Aday giris - API uzerinden
  async applicantLogin(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/applications/applicant-login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mode: 'password' })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Giris basarisiz');
      }
      return data;
    } catch (error) {
      console.warn('API login hatasi:', error.message);
      throw error;
    }
  }

  // Guvenlik sorusunu getir
  async getSecurityQuestion(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/applications/get-security-question`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Guvenlik sorusu alinamadi');
      }
      return data;
    } catch (error) {
      console.warn('API security question hatasi:', error.message);
      throw error;
    }
  }

  // Guvenlik sorusu ile giris
  async applicantLoginWithSecurity(email, securityAnswer) {
    try {
      const response = await fetch(`${API_BASE_URL}/applications/applicant-login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, securityAnswer, mode: 'security' })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Giris basarisiz');
      }
      return data;
    } catch (error) {
      console.warn('API security login hatasi:', error.message);
      throw error;
    }
  }
}

export default new ApplicationService();