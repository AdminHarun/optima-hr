/**
 * NotificationDispatcher - Merkezi bildirim yonetimi
 *
 * Sorumluluklar:
 * - Chat bildirimleri (yeni mesaj, mention, tepki)
 * - Sistem bildirimleri (onboarding, duyuru)
 * - Admin/Yonetici bildirimleri
 * - Desktop/Mobile push notification
 * - E-posta bildirimleri (ileride)
 */

const ChatMessage = require('../models/ChatMessage');
const ChatRoom = require('../models/ChatRoom');
const ChatRoomMember = require('../models/ChatRoomMember');
const AdminUser = require('../models/AdminUser');
const Employee = require('../models/Employee');
const redisService = require('./RedisService');

class NotificationDispatcher {
  constructor() {
    this.wsService = null; // ChatWebSocketService referansi
  }

  /**
   * WebSocket service'i baglama
   */
  setWebSocketService(wsService) {
    this.wsService = wsService;
  }

  // =====================================================
  // CHAT BILDIRIMLERI
  // =====================================================

  /**
   * Yeni mesaj bildirimi
   */
  async notifyNewMessage(message, room, sender) {
    try {
      // Odadaki tum uyeleri bul (gonderen haric)
      const members = await ChatRoomMember.findAll({
        where: {
          room_id: room.id,
          is_active: true,
          notifications_enabled: true
        }
      });

      const recipients = members.filter(m =>
        !(m.member_type === sender.type && m.member_id === sender.id)
      );

      // Susturulmus kullanicilari filtrele
      const now = new Date();
      const activeRecipients = recipients.filter(m =>
        !m.muted_until || m.muted_until < now
      );

      // Her aliciya bildirim gonder
      for (const recipient of activeRecipients) {
        await this._sendNotification(recipient, {
          type: 'new_message',
          title: this._getRoomTitle(room, sender),
          body: this._getMessagePreview(message),
          data: {
            roomId: room.id,
            messageId: message.id,
            senderId: sender.id,
            senderType: sender.type,
            senderName: sender.name
          }
        });
      }

      // Redis uzerinden yayin (multi-instance)
      await redisService.publish(`room:${room.id}:notification`, {
        type: 'new_message',
        messageId: message.id,
        senderId: sender.id,
        senderName: sender.name,
        preview: this._getMessagePreview(message)
      });

    } catch (error) {
      console.error('[NotificationDispatcher] Mesaj bildirimi hatasi:', error);
    }
  }

  /**
   * Mesaj okundu bildirimi
   */
  async notifyMessageRead(messageId, roomId, reader) {
    try {
      const message = await ChatMessage.findByPk(messageId);
      if (!message) return;

      // Mesaji gonderen kisiye bildirim
      if (message.sender_type !== reader.type || message.sender_id !== reader.id) {
        await this._sendToUser(message.sender_type, message.sender_id, {
          type: 'message_read',
          event: 'message_read_by',
          data: {
            messageId,
            roomId,
            readBy: {
              type: reader.type,
              id: reader.id,
              name: reader.name
            },
            readAt: new Date().toISOString()
          }
        });
      }

      // Redis uzerinden durum guncellemesi
      await redisService.publishMessageStatus(roomId, messageId, 'read', {
        type: reader.type,
        id: reader.id,
        name: reader.name
      });

    } catch (error) {
      console.error('[NotificationDispatcher] Okundu bildirimi hatasi:', error);
    }
  }

  /**
   * Yaziyor bildirimi
   */
  async notifyTyping(roomId, user, isTyping) {
    try {
      if (isTyping) {
        await redisService.setTyping(roomId, user.type, user.id, user.name);
      } else {
        await redisService.clearTyping(roomId, user.type, user.id);
      }

      // WebSocket ile anlik bildirim
      if (this.wsService) {
        this.wsService.broadcastToRoom(roomId, {
          type: isTyping ? 'typing_start' : 'typing_stop',
          roomId,
          user: {
            type: user.type,
            id: user.id,
            name: user.name
          }
        }, user);
      }
    } catch (error) {
      console.error('[NotificationDispatcher] Typing bildirimi hatasi:', error);
    }
  }

  /**
   * Tepki eklendi bildirimi
   */
  async notifyReaction(message, reaction, reactor) {
    try {
      // Mesaj sahibine bildirim (kendisi degilse)
      if (message.sender_type !== reactor.type || message.sender_id !== reactor.id) {
        await this._sendToUser(message.sender_type, message.sender_id, {
          type: 'reaction_added',
          title: `${reactor.name} mesajiniza tepki verdi`,
          body: reaction.emoji,
          data: {
            messageId: message.id,
            roomId: message.room_id,
            reaction: reaction.emoji,
            reactorName: reactor.name
          }
        });
      }
    } catch (error) {
      console.error('[NotificationDispatcher] Tepki bildirimi hatasi:', error);
    }
  }

  // =====================================================
  // SISTEM BILDIRIMLERI
  // =====================================================

  /**
   * Hos geldin bildirimi (yeni kullanici)
   */
  async notifyWelcome(userId, userType = 'admin') {
    try {
      await this._sendToUser(userType, userId, {
        type: 'welcome',
        title: 'Optima HR\'a Hos Geldiniz!',
        body: 'Profilinizi tamamlayarak baslayabilirsiniz.',
        data: {
          action: 'start_onboarding'
        }
      });

      // Sistem mesaji olarak da kaydet
      // (Kullanicinin kendi chat odasina)
    } catch (error) {
      console.error('[NotificationDispatcher] Hosgeldin bildirimi hatasi:', error);
    }
  }

  /**
   * Onboarding hatirlatmasi
   */
  async notifyOnboardingReminder(userId, step) {
    try {
      const messages = {
        1: 'Profil fotografinizi yuklemeyi unutmayin!',
        2: 'Temel bilgilerinizi tamamlayin.',
        3: 'Departmaninizi secin.',
        4: 'Son adim: KVKK onayi.'
      };

      await this._sendToUser('admin', userId, {
        type: 'onboarding_reminder',
        title: 'Profilinizi Tamamlayin',
        body: messages[step] || 'Onboarding surecini tamamlayin.',
        data: {
          step,
          action: 'continue_onboarding'
        }
      });
    } catch (error) {
      console.error('[NotificationDispatcher] Onboarding hatirlatma hatasi:', error);
    }
  }

  /**
   * Duyuru bildirimi
   */
  async notifyAnnouncement(announcement, roomId, sender) {
    try {
      // Duyuru kanalindaki tum uyelere gonder
      const members = await ChatRoomMember.findAll({
        where: {
          room_id: roomId,
          is_active: true
        }
      });

      for (const member of members) {
        if (member.member_type !== sender.type || member.member_id !== sender.id) {
          await this._sendNotification(member, {
            type: 'announcement',
            title: 'Yeni Duyuru',
            body: this._getMessagePreview(announcement),
            data: {
              roomId,
              messageId: announcement.id,
              priority: 'high'
            }
          });
        }
      }
    } catch (error) {
      console.error('[NotificationDispatcher] Duyuru bildirimi hatasi:', error);
    }
  }

  // =====================================================
  // ADMIN BILDIRIMLERI
  // =====================================================

  /**
   * Admin'lere bildirim gonder
   */
  async notifyAdmins(notification, siteCode = null) {
    try {
      const where = {
        role: ['SUPER_ADMIN', 'ADMIN', 'HR'],
        is_active: true
      };

      if (siteCode) {
        where.site_code = siteCode;
      }

      const admins = await AdminUser.findAll({ where });

      for (const admin of admins) {
        await this._sendToUser('admin', admin.id, notification);
      }
    } catch (error) {
      console.error('[NotificationDispatcher] Admin bildirimi hatasi:', error);
    }
  }

  /**
   * Yeni kullanici katildi bildirimi
   */
  async notifyNewUserJoined(user, siteCode) {
    await this.notifyAdmins({
      type: 'new_user',
      title: 'Yeni Kullanici Katildi',
      body: `${user.name} sisteme katildi.`,
      data: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email
      }
    }, siteCode);
  }

  /**
   * Yeni basvuru bildirimi
   */
  async notifyNewApplication(application, siteCode) {
    await this.notifyAdmins({
      type: 'new_application',
      title: 'Yeni Is Basvurusu',
      body: `${application.applicant_name} basvuru yapti.`,
      data: {
        applicationId: application.id,
        applicantName: application.applicant_name,
        position: application.position
      }
    }, siteCode);
  }

  // =====================================================
  // PRESENCE BILDIRIMLERI
  // =====================================================

  /**
   * Kullanici online oldu
   */
  async notifyUserOnline(userType, userId, userName) {
    await redisService.publishPresenceChange(userType, userId, 'online');

    // WebSocket ile anlik bildirim
    if (this.wsService) {
      this.wsService.broadcastPresenceChange(userType, userId, 'online', userName);
    }
  }

  /**
   * Kullanici offline oldu
   */
  async notifyUserOffline(userType, userId) {
    await redisService.publishPresenceChange(userType, userId, 'offline');

    if (this.wsService) {
      this.wsService.broadcastPresenceChange(userType, userId, 'offline');
    }
  }

  // =====================================================
  // YARDIMCI METODLAR
  // =====================================================

  /**
   * Kullaniciya bildirim gonder
   */
  async _sendToUser(userType, userId, notification) {
    // WebSocket ile anlik bildirim
    if (this.wsService) {
      const sent = this.wsService.sendToUser(userType, userId, {
        type: 'notification',
        ...notification
      });

      if (sent) return true;
    }

    // Kullanici offline ise push notification kuyruguna ekle
    // (Ileride push notification servisi eklenecek)
    console.log(`[NotificationDispatcher] Offline bildirim kuyruguna eklendi: ${userType}:${userId}`);

    return false;
  }

  /**
   * ChatRoomMember'a bildirim gonder
   */
  async _sendNotification(member, notification) {
    return this._sendToUser(member.member_type, member.member_id, notification);
  }

  /**
   * Oda basligi olustur
   */
  _getRoomTitle(room, sender) {
    if (room.room_type === 'PRIVATE_DM') {
      return sender.name;
    }
    if (room.room_type === 'DEPARTMENT_GROUP' || room.room_type === 'group') {
      return `${room.room_name}: ${sender.name}`;
    }
    if (room.room_type === 'ANNOUNCEMENT') {
      return `Duyuru: ${room.room_name}`;
    }
    return sender.name;
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
    if (message.message_type === 'system') {
      return message.content;
    }

    const content = message.content || '';
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength - 3) + '...';
  }
}

// Singleton instance
const notificationDispatcher = new NotificationDispatcher();

module.exports = notificationDispatcher;
