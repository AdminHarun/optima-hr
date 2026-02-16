/**
 * electronNotificationService - Electron Native Notification Servisi
 *
 * Electron ortaminda native bildirimler,
 * Web ortaminda Web Notifications API kullanir.
 */

class ElectronNotificationService {
  constructor() {
    this.isElectronEnv = this._checkElectron();
    this.unsubscribers = [];
    this.notificationPermission = 'default';
    this.onNavigateToRoom = null;

    // Web Notifications izni iste
    if (!this.isElectronEnv) {
      this._requestWebPermission();
    }
  }

  /**
   * Electron ortaminda mi kontrol et
   */
  _checkElectron() {
    return !!(
      typeof window !== 'undefined' &&
      window.electron &&
      window.electron.isElectron
    );
  }

  /**
   * Web Notifications izni iste
   */
  async _requestWebPermission() {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        this.notificationPermission = await Notification.requestPermission();
      } else {
        this.notificationPermission = Notification.permission;
      }
    }
  }

  /**
   * Electron API'sine erisim
   */
  get electron() {
    return this.isElectronEnv ? window.electron : null;
  }

  /**
   * Bildirim goster
   */
  async showNotification(options) {
    const {
      title,
      body,
      icon,
      roomId,
      silent = false,
      tag,
      data,
    } = options;

    try {
      if (this.isElectronEnv) {
        // Electron native notification
        return await this.electron.showNativeNotification({
          title,
          body,
          icon,
          roomId,
          silent,
        });
      } else {
        // Web Notification
        return this._showWebNotification({
          title,
          body,
          icon,
          tag,
          data: { roomId, ...data },
          silent,
        });
      }
    } catch (error) {
      console.error('[ElectronNotification] Bildirim hatasi:', error);
      return false;
    }
  }

  /**
   * Web Notification goster
   */
  _showWebNotification(options) {
    if (!('Notification' in window)) {
      console.warn('[ElectronNotification] Web Notifications desteklenmiyor');
      return false;
    }

    if (this.notificationPermission !== 'granted') {
      console.warn('[ElectronNotification] Bildirim izni verilmemis');
      return false;
    }

    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      tag: options.tag,
      silent: options.silent,
      data: options.data,
    });

    notification.onclick = () => {
      window.focus();
      if (options.data?.roomId && this.onNavigateToRoom) {
        this.onNavigateToRoom(options.data.roomId);
      }
      notification.close();
    };

    return true;
  }

  /**
   * Yeni mesaj bildirimi goster
   */
  async showMessageNotification(message, room, sender) {
    // Pencere odakli ise bildirim gosterme
    if (this.isElectronEnv) {
      const windowState = await this.electron.getWindowState();
      if (windowState.focused) {
        return false;
      }
    } else if (document.hasFocus()) {
      return false;
    }

    const title = sender?.name || 'Yeni Mesaj';
    const body = this._getMessagePreview(message);

    return this.showNotification({
      title,
      body,
      roomId: room?.id,
      tag: `message-${room?.id}`,
    });
  }

  /**
   * Mesaj onizlemesi olustur
   */
  _getMessagePreview(message, maxLength = 100) {
    if (message.message_type === 'image') {
      return 'Fotograf gonderdi';
    }
    if (message.message_type === 'file') {
      return `Dosya: ${message.file_name || 'Dosya'}`;
    }

    const content = message.content || '';
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * Badge count guncelle (okunmamis mesaj sayisi)
   */
  async updateBadge(count) {
    if (this.isElectronEnv) {
      try {
        return await this.electron.setBadgeCount(count);
      } catch (error) {
        console.error('[ElectronNotification] Badge hatasi:', error);
      }
    }

    // Web icin favicon badge (opsiyonel)
    this._updateFaviconBadge(count);
    return true;
  }

  /**
   * Favicon'a badge ekle (Web)
   */
  _updateFaviconBadge(count) {
    // Basit favicon badge - production'da canvas ile daha iyi yapilabilir
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';

    if (count > 0) {
      // Badge'li favicon (eger varsa)
      link.href = '/favicon-badge.ico';
      document.title = `(${count}) Optima HR`;
    } else {
      link.href = '/favicon.ico';
      document.title = 'Optima HR';
    }

    document.getElementsByTagName('head')[0].appendChild(link);
  }

  /**
   * Tray flash baslat (dikkat cek)
   */
  async startFlashing() {
    if (this.isElectronEnv) {
      try {
        return await this.electron.flashTrayIcon(true);
      } catch (error) {
        console.error('[ElectronNotification] Flash hatasi:', error);
      }
    }
    return false;
  }

  /**
   * Tray flash durdur
   */
  async stopFlashing() {
    if (this.isElectronEnv) {
      try {
        return await this.electron.stopFlashing();
      } catch (error) {
        console.error('[ElectronNotification] Stop flash hatasi:', error);
      }
    }
    return false;
  }

  /**
   * Pencere durumunu al
   */
  async getWindowState() {
    if (this.isElectronEnv) {
      try {
        return await this.electron.getWindowState();
      } catch (error) {
        console.error('[ElectronNotification] Window state hatasi:', error);
      }
    }

    return {
      focused: document.hasFocus(),
      visible: !document.hidden,
      minimized: false,
    };
  }

  /**
   * Odaya navigasyon callback'i ayarla
   */
  setNavigateCallback(callback) {
    this.onNavigateToRoom = callback;

    // Electron event listener
    if (this.isElectronEnv) {
      const unsubscribe = this.electron.onNavigateToRoom((roomId) => {
        callback(roomId);
      });
      this.unsubscribers.push(unsubscribe);
    }
  }

  /**
   * Window event listener'lari ayarla
   */
  setupWindowListeners(callbacks = {}) {
    const { onFocus, onBlur, onShow } = callbacks;

    if (this.isElectronEnv) {
      if (onFocus) {
        const unsub = this.electron.onWindowFocused(onFocus);
        this.unsubscribers.push(unsub);
      }
      if (onBlur) {
        const unsub = this.electron.onWindowBlurred(onBlur);
        this.unsubscribers.push(unsub);
      }
      if (onShow) {
        const unsub = this.electron.onWindowShown(onShow);
        this.unsubscribers.push(unsub);
      }
    } else {
      // Web event listeners
      if (onFocus) {
        window.addEventListener('focus', onFocus);
        this.unsubscribers.push(() => window.removeEventListener('focus', onFocus));
      }
      if (onBlur) {
        window.addEventListener('blur', onBlur);
        this.unsubscribers.push(() => window.removeEventListener('blur', onBlur));
      }
      if (onShow) {
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden) onShow();
        });
      }
    }
  }

  /**
   * Tum listener'lari temizle
   */
  cleanup() {
    this.unsubscribers.forEach(unsub => {
      if (typeof unsub === 'function') {
        unsub();
      }
    });
    this.unsubscribers = [];
  }
}

// Singleton instance
const electronNotificationService = new ElectronNotificationService();

export default electronNotificationService;
