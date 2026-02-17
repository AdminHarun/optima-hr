// Invitation Service - API ile LocalStorage hibrit yaklaşım
import { API_BASE_URL as BASE_URL } from '../config/config';
const API_BASE_URL = BASE_URL + '/api';

class InvitationService {
  _getCurrentSite() {
    return localStorage.getItem('optima_current_site') || 'FXB';
  }

  _getSiteHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Site-Id': this._getCurrentSite(),
    };
  }

  // Site-specific localStorage key
  _getStorageKey() {
    return `invitation_links_${this._getCurrentSite()}`;
  }

  // API'den verileri çek, başarısız olursa LocalStorage'dan
  async loadInvitations() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}/invitations`, {
        signal: controller.signal,
        method: 'GET',
        credentials: 'include',
        headers: this._getSiteHeaders(),
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const apiData = await response.json();
        // Site-specific localStorage key
        localStorage.setItem(this._getStorageKey(), JSON.stringify(apiData));
        return apiData;
      } else {
        throw new Error(`API Error: ${response.status}`);
      }
    } catch (error) {
      console.warn('API baglantisi basarisiz, LocalStorage kullaniliyor:', error.message);
      const localData = JSON.parse(localStorage.getItem(this._getStorageKey()) || '[]');
      return localData;
    }
  }

  // Yeni invitation link oluştur
  async createInvitation(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/invitations`, {
        method: 'POST',
        credentials: 'include',
        headers: this._getSiteHeaders(),
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        const newInvitation = await response.json();
        // Site-specific localStorage
        const currentLinks = JSON.parse(localStorage.getItem(this._getStorageKey()) || '[]');
        const updatedLinks = [newInvitation, ...currentLinks];
        localStorage.setItem(this._getStorageKey(), JSON.stringify(updatedLinks));
        return newInvitation;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API Error');
      }
    } catch (error) {
      console.warn('API ile link olusturulamadi, LocalStorage kullaniliyor:', error.message);
      return this.createInvitationFallback(email);
    }
  }

  // LocalStorage fallback
  createInvitationFallback(email) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const newInvitation = {
      id: Date.now(),
      email: email,
      token: token,
      status: 'active',
      createdAt: new Date().toISOString(),
      clickedAt: null,
      usedAt: null,
      ipAddress: null,
      applicantName: null,
      applicantPhone: null
    };

    const currentLinks = JSON.parse(localStorage.getItem(this._getStorageKey()) || '[]');
    const updatedLinks = [newInvitation, ...currentLinks];
    localStorage.setItem(this._getStorageKey(), JSON.stringify(updatedLinks));

    return newInvitation;
  }

  // Invitation link sil
  async deleteInvitation(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/invitations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: this._getSiteHeaders()
      });

      if (response.ok) {
        const currentLinks = JSON.parse(localStorage.getItem(this._getStorageKey()) || '[]');
        const updatedLinks = currentLinks.filter(inv => inv.id !== id);
        localStorage.setItem(this._getStorageKey(), JSON.stringify(updatedLinks));
        return true;
      } else {
        throw new Error('API Delete Error');
      }
    } catch (error) {
      console.warn('API ile silinemedi, LocalStorage kullaniliyor:', error.message);
      const currentLinks = JSON.parse(localStorage.getItem(this._getStorageKey()) || '[]');
      const updatedLinks = currentLinks.filter(inv => inv.id !== id);
      localStorage.setItem(this._getStorageKey(), JSON.stringify(updatedLinks));
      return true;
    }
  }

  // LocalStorage verilerini API'ye sync et
  async syncToDatabase() {
    try {
      const localData = JSON.parse(localStorage.getItem(this._getStorageKey()) || '[]');

      if (localData.length === 0) {
        return { synced: 0, total: 0 };
      }

      const response = await fetch(`${API_BASE_URL}/invitations/sync`, {
        method: 'POST',
        credentials: 'include',
        headers: this._getSiteHeaders(),
        body: JSON.stringify({ invitations: localData })
      });

      if (response.ok) {
        const result = await response.json();
        return { synced: result.synced.length, total: localData.length };
      } else {
        throw new Error('Sync API Error');
      }
    } catch (error) {
      console.error('Sync basarisiz:', error.message);
      return { synced: 0, total: 0, error: error.message };
    }
  }

  // Token doğrula (Public endpoint)
  async validateToken(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/invitations/validate/${token}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        return result;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Token gecersiz');
      }
    } catch (error) {
      console.warn('Token dogrulama API hatasi:', error.message);

      // Fallback: Site-specific localStorage
      const localData = JSON.parse(localStorage.getItem(this._getStorageKey()) || '[]');
      const invitation = localData.find(inv => inv.token === token);

      if (!invitation) {
        throw new Error('Gecersiz davet linki');
      }

      if (invitation.status === 'used') {
        throw new Error('Bu davet linki daha once kullanilmis');
      }

      return { valid: true, email: invitation.email, token: token };
    }
  }
}

export default new InvitationService();
