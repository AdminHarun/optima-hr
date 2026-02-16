/**
 * useMessageStatus Hook - Mesaj Durumu Yonetimi
 *
 * Ozellikler:
 * - Mesaj gonderme (optimistic update)
 * - Delivery status takibi (sent -> delivered -> read)
 * - Read receipts
 * - Typing indicator
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import webSocketService from '../services/webSocketService';

// Mesaj durumu enum'u
export const MessageStatus = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
};

export function useMessageStatus(roomId, user) {
  // Pending mesajlar (gonderim bekleyenler)
  const [pendingMessages, setPendingMessages] = useState(new Map());

  // Typing state
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  // Message send queue
  const sendQueueRef = useRef([]);
  const isProcessingRef = useRef(false);

  /**
   * Mesaj gonder
   */
  const sendMessage = useCallback(async (content, options = {}) => {
    if (!roomId || !content?.trim()) return null;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const message = {
      id: messageId,
      type: 'message',
      content: content.trim(),
      sender: user?.name || 'User',
      sender_type: user?.type || 'admin',
      reply_to_message_id: options.replyTo?.message_id,
      file: options.file,
    };

    // Pending listesine ekle
    setPendingMessages(prev => new Map(prev).set(messageId, {
      ...message,
      status: MessageStatus.PENDING,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    }));

    // WebSocket ile gonder
    try {
      webSocketService.send(message);

      // Gonderildi olarak isaretle (WebSocket'ten onay gelmeden)
      setTimeout(() => {
        setPendingMessages(prev => {
          const updated = new Map(prev);
          const msg = updated.get(messageId);
          if (msg && msg.status === MessageStatus.PENDING) {
            updated.set(messageId, { ...msg, status: MessageStatus.SENT });
          }
          return updated;
        });
      }, 100);

      return messageId;
    } catch (error) {
      console.error('[useMessageStatus] Send error:', error);

      // Basarisiz olarak isaretle
      setPendingMessages(prev => {
        const updated = new Map(prev);
        const msg = updated.get(messageId);
        if (msg) {
          updated.set(messageId, { ...msg, status: MessageStatus.FAILED });
        }
        return updated;
      });

      return null;
    }
  }, [roomId, user]);

  /**
   * Mesaji yeniden gonder
   */
  const retryMessage = useCallback(async (messageId) => {
    const pendingMessage = pendingMessages.get(messageId);
    if (!pendingMessage) return false;

    // Retry sayisini artir
    setPendingMessages(prev => {
      const updated = new Map(prev);
      const msg = updated.get(messageId);
      if (msg) {
        updated.set(messageId, {
          ...msg,
          status: MessageStatus.PENDING,
          retryCount: (msg.retryCount || 0) + 1,
        });
      }
      return updated;
    });

    try {
      webSocketService.send({
        id: messageId,
        type: 'message',
        content: pendingMessage.content,
        sender: pendingMessage.sender,
        sender_type: pendingMessage.sender_type,
        reply_to_message_id: pendingMessage.reply_to_message_id,
      });

      return true;
    } catch (error) {
      console.error('[useMessageStatus] Retry error:', error);
      return false;
    }
  }, [pendingMessages]);

  /**
   * Delivery durumunu guncelle
   */
  const updateDeliveryStatus = useCallback((messageId, status) => {
    setPendingMessages(prev => {
      const updated = new Map(prev);
      const msg = updated.get(messageId);
      if (msg) {
        updated.set(messageId, { ...msg, status });

        // Read durumuna ulastiysa pending'den cikar
        if (status === MessageStatus.READ) {
          setTimeout(() => {
            setPendingMessages(p => {
              const u = new Map(p);
              u.delete(messageId);
              return u;
            });
          }, 1000);
        }
      }
      return updated;
    });
  }, []);

  /**
   * Mesajlari iletildi olarak isaretle
   */
  const markAsDelivered = useCallback((messageIds) => {
    if (!Array.isArray(messageIds) || !messageIds.length) return;

    webSocketService.send({
      type: 'message_delivered',
      messageIds,
      roomId,
    });
  }, [roomId]);

  /**
   * Mesajlari okundu olarak isaretle
   */
  const markAsRead = useCallback((messageIds) => {
    if (!Array.isArray(messageIds) || !messageIds.length) return;

    webSocketService.send({
      type: 'message_read',
      message_ids: messageIds,
      roomId,
    });
  }, [roomId]);

  /**
   * Odayi okundu olarak isaretle
   */
  const markRoomAsRead = useCallback(() => {
    if (!roomId) return;

    webSocketService.send({
      type: 'mark_room_read',
      roomId,
    });
  }, [roomId]);

  /**
   * Mesaj read receipt'lerini al
   */
  const getMessageReceipts = useCallback(async (messageId) => {
    // Bu normalde API uzerinden alinir
    // Simdilik WebSocket ile istek gonderiyoruz
    return new Promise((resolve) => {
      // Placeholder - backend'den gelecek
      resolve([]);
    });
  }, []);

  /**
   * Typing indicator baslat
   */
  const startTyping = useCallback(() => {
    if (isTyping) {
      // Zaten yaziyor, timeout'u yenile
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    } else {
      setIsTyping(true);
      webSocketService.send({
        type: 'typing',
        is_typing: true,
      });
    }

    // 3 saniye sonra typing'i durdur
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [isTyping]);

  /**
   * Typing indicator durdur
   */
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      setIsTyping(false);
      webSocketService.send({
        type: 'typing',
        is_typing: false,
      });
    }
  }, [isTyping]);

  /**
   * Typing preview gonder (Comm100 tarzı)
   */
  const sendTypingPreview = useCallback((content) => {
    webSocketService.send({
      type: 'typing_preview',
      content,
      is_typing: content.length > 0,
    });
  }, []);

  // WebSocket eventlerini dinle
  useEffect(() => {
    const handleMessage = (data) => {
      switch (data.type) {
        case 'messages_delivered':
          if (data.messageIds) {
            data.messageIds.forEach(id => {
              updateDeliveryStatus(id, MessageStatus.DELIVERED);
            });
          }
          break;

        case 'messages_read':
        case 'room_read':
          if (data.message_ids) {
            data.message_ids.forEach(id => {
              updateDeliveryStatus(id, MessageStatus.READ);
            });
          }
          break;

        case 'chat_message':
          // Kendi mesajimizsa pending'den cikar
          if (data.message?.message_id) {
            setPendingMessages(prev => {
              const updated = new Map(prev);
              if (updated.has(data.message.message_id)) {
                updated.delete(data.message.message_id);
              }
              return updated;
            });
          }
          break;
      }
    };

    const unsubscribe = webSocketService.addMessageListener(handleMessage);
    return () => unsubscribe?.();
  }, [updateDeliveryStatus]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    pendingMessages: Array.from(pendingMessages.values()),
    isTyping,

    // Actions
    sendMessage,
    retryMessage,
    updateDeliveryStatus,
    markAsDelivered,
    markAsRead,
    markRoomAsRead,
    getMessageReceipts,

    // Typing
    startTyping,
    stopTyping,
    sendTypingPreview,

    // Utils
    getPendingMessage: (id) => pendingMessages.get(id),
    hasPendingMessages: pendingMessages.size > 0,
    failedMessages: Array.from(pendingMessages.values()).filter(
      m => m.status === MessageStatus.FAILED
    ),
  };
}

export default useMessageStatus;
