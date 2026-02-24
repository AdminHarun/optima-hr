// Notification Service - Ses ve görsel bildirimler
class NotificationService {
  constructor() {
    this.audio = null;
    this.soundEnabled = true;
    this.notificationPermission = 'default';

    // Notification permission kontrolü
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
    }
  }

  // Ses bildirimi çal
  playMessageSound() {
    if (!this.soundEnabled) return;

    try {
      // Önceki ses varsa durdur
      if (this.audio) {
        this.audio.pause();
        this.audio.currentTime = 0;
      }

      // Yeni ses oluştur ve çal
      this.audio = new Audio('/sounds/notification.mp3');
      this.audio.volume = 0.5;

      this.audio.play().catch(error => {
        console.warn('Notification sound could not play:', error);
      });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  // Tarayıcı bildirimi göster
  async showBrowserNotification(title, body, options = {}) {
    // Permission kontrolü
    if (!('Notification' in window)) {
      console.warn('Bu tarayıcı bildirim desteklemiyor');
      return null;
    }

    // Permission iste
    if (this.notificationPermission === 'default') {
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
    }

    // Permission varsa bildirim göster
    if (this.notificationPermission === 'granted') {
      try {
        const notification = new Notification(title, {
          body: body,
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: options.tag || 'optima-chat',
          requireInteraction: false,
          silent: true, // Kendi ses sistemimizi kullanıyoruz
          ...options
        });

        // Tıklama olayı
        notification.onclick = (event) => {
          event.preventDefault();
          window.focus();
          notification.close();

          if (options.onClick) {
            options.onClick();
          }
        };

        // 5 saniye sonra otomatik kapat
        setTimeout(() => notification.close(), 5000);

        return notification;
      } catch (error) {
        console.error('Bildirim gösterilemedi:', error);
        return null;
      }
    }

    return null;
  }

  // Yeni mesaj bildirimi (ses + görsel)
  notifyNewMessage(senderName, messageContent, roomId) {
    // Ses çal
    this.playMessageSound();

    // Tarayıcı bildirimi
    this.showBrowserNotification(
      `${senderName}`,
      messageContent.length > 50
        ? messageContent.substring(0, 50) + '...'
        : messageContent,
      {
        tag: `chat-${roomId}`,
        onClick: () => {
          // Chat sayfasına yönlendir
          window.location.hash = `#/chat/${roomId}`;
        }
      }
    );
  }

  // Sesi aç/kapat
  toggleSound(enabled) {
    this.soundEnabled = enabled;
    localStorage.setItem('notificationSoundEnabled', enabled ? 'true' : 'false');
  }

  // Ses durumunu al
  isSoundEnabled() {
    const stored = localStorage.getItem('notificationSoundEnabled');
    return stored !== 'false'; // Default true
  }

  // Bildirim permission iste
  async requestPermission() {
    if (!('Notification' in window)) return false;

    const permission = await Notification.requestPermission();
    this.notificationPermission = permission;
    return permission === 'granted';
  }
}

// Singleton instance
const notificationService = new NotificationService();

export default notificationService;
