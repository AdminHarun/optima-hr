// Chat Container with WebSocket Integration
// Connects ChatRoom component with WebSocket service
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatRoom from './ChatRoom';
import ForwardMessageModal from './ForwardMessageModal';
import VideoCallModal from './VideoCallModal';
import webSocketService from '../../services/webSocketService';
import notificationService from '../../services/notificationService';
import { IncomingCallNotification } from '../videoCall';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:9000';

const getSiteHeaders = () => {
  const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
  return { 'X-Site-Id': currentSite };
};

/**
 * Chat Container - Manages WebSocket connection and state
 * Bridges ChatRoom UI with WebSocket service
 *
 * Features:
 * - WebSocket connection management
 * - Message state management
 * - Real-time message updates
 * - Typing indicators
 * - File uploads
 */
const ChatContainer = ({
  roomId,
  roomName,
  participantId,
  participantName,
  participantFirstName,
  participantLastName,
  participantAvatar,
  participantEmail,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  currentUserEmail,
  currentUserType = 'admin',
  onBack,
  onVideoCall,
  onMessagesRead // Callback to notify parent when messages are marked as read
}) => {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [typingPreview, setTypingPreview] = useState(null); // Live typing preview (Comm100 style)
  const [participantOnline, setParticipantOnline] = useState(false);
  const typingTimeoutRef = useRef({});
  const typingPreviewTimeoutRef = useRef(null);

  // Video Call States
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);

  // Forward Modal State
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!roomId) return;

    console.log('💬 ChatContainer: Initializing chat room', roomId);
    setIsLoading(true);
    setError(null);

    // Connect to WebSocket - WSL IP kullanılıyor
    const wsUrl = `${WS_BASE_URL}/ws/admin-chat/${roomId}`;
    webSocketService.connect(wsUrl, currentUserType);

    // Connection handler
    const unsubscribeConnection = webSocketService.onConnection((event) => {
      console.log('🔌 Connection event:', event);

      if (event.type === 'connected') {
        setIsConnected(true);
        setError(null);
        // Load initial messages
        loadMessages();
      } else if (event.type === 'disconnected') {
        setIsConnected(false);
        setError('Connection lost. Trying to reconnect...');
      }
    });

    // Message handler
    const unsubscribeMessage = webSocketService.onMessage((data) => {
      console.log('📨 Message received:', data);
      handleIncomingMessage(data);
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 ChatContainer: Cleaning up');
      unsubscribeConnection();
      unsubscribeMessage();
      webSocketService.disconnect();
      setMessages([]);
      setTypingUsers([]);
    };
  }, [roomId, currentUserType]);

  // Load messages from server
  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/chat/api/rooms/${roomId}/messages`, {
        credentials: 'include',
        headers: getSiteHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      console.log('📥 Messages loaded:', data.messages.length);

      setMessages(data.messages || []);
      setError(null);

      // Mark all messages in this room as read (admin has opened the chat)
      if (currentUserType === 'admin') {
        markMessagesAsRead();
      }
    } catch (err) {
      console.error('❌ Error loading messages:', err);
      setError('Failed to load messages');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark messages as read when admin opens chat
  const markMessagesAsRead = async () => {
    try {
      await fetch(`${API_BASE_URL}/chat/api/messages/mark_read/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getSiteHeaders() },
        body: JSON.stringify({ room_id: roomId })
      });
      console.log('✅ Messages marked as read for room:', roomId);

      // Notify parent component to refresh unread counts
      if (onMessagesRead) {
        onMessagesRead(roomId);
      }
    } catch (err) {
      console.error('❌ Error marking messages as read:', err);
    }
  };

  // Handle incoming WebSocket messages
  const handleIncomingMessage = useCallback((data) => {
    console.log('🎯 ChatContainer handleIncomingMessage called:', data);

    switch (data.type) {
      case 'chat_message':
      case 'message':
        // New message received
        const messageData = data.message || data;
        console.log('💬 Processing chat message:', messageData);

        setMessages(prev => {
          console.log('📝 Current messages count:', prev.length);
          // Check if message already exists
          const exists = prev.some(msg =>
            msg.id === messageData.id ||
            msg.message_id === messageData.message_id ||
            msg.id === messageData.message_id
          );
          if (exists) {
            // Update existing message status
            return prev.map(msg => {
              if (msg.id === messageData.message_id || msg.message_id === messageData.message_id) {
                return { ...msg, status: 'sent', id: messageData.id };
              }
              return msg;
            });
          }

          // Play notification sound if message from other user
          if (messageData.sender_type !== currentUserType) {
            notificationService.playMessageSound();

            // Show browser notification if available
            const messagePreview = messageData.content || 'Dosya gönderdi';
            notificationService.notifyNewMessage(
              messageData.sender_name || participantName || 'Kullanıcı',
              messagePreview,
              roomId
            );
          }

          // Add new message
          const newMessage = {
            id: messageData.id,
            message_id: messageData.message_id || messageData.id,
            content: messageData.content,
            sender_type: messageData.sender_type,
            sender_name: messageData.sender_name,
            created_at: messageData.created_at || new Date().toISOString(),
            file_url: messageData.file_url,
            file_name: messageData.file_name,
            file_size: messageData.file_size,
            file_mime_type: messageData.file_mime_type,
            reactions: messageData.reactions || [],
            status: messageData.status || 'delivered',
            reply_to_message_id: messageData.reply_to_message_id || null,
            replied_to_message: messageData.replied_to_message || null
          };

          return [...prev, newMessage];
        });
        break;

      case 'typing':
        // Typing indicator
        const senderName = data.sender;

        if (data.is_typing) {
          // Add user to typing list
          setTypingUsers(prev => {
            if (!prev.includes(senderName)) {
              return [...prev, senderName];
            }
            return prev;
          });

          // Clear existing timeout
          if (typingTimeoutRef.current[senderName]) {
            clearTimeout(typingTimeoutRef.current[senderName]);
          }

          // Remove user after 3 seconds
          typingTimeoutRef.current[senderName] = setTimeout(() => {
            setTypingUsers(prev => prev.filter(name => name !== senderName));
            delete typingTimeoutRef.current[senderName];
          }, 3000);
        } else {
          // Remove user from typing list
          setTypingUsers(prev => prev.filter(name => name !== senderName));
          if (typingTimeoutRef.current[senderName]) {
            clearTimeout(typingTimeoutRef.current[senderName]);
            delete typingTimeoutRef.current[senderName];
          }
        }
        break;

      case 'typing_preview':
        // Live typing preview (Comm100 style) - admin can see what applicant is typing
        console.log('👀 Typing preview received:', data);
        if (data.sender_type !== currentUserType && data.content) {
          // Show preview content
          setTypingPreview({
            content: data.content,
            sender_type: data.sender_type,
            timestamp: data.timestamp
          });

          // Clear existing timeout
          if (typingPreviewTimeoutRef.current) {
            clearTimeout(typingPreviewTimeoutRef.current);
          }

          // Clear preview after 5 seconds of inactivity
          typingPreviewTimeoutRef.current = setTimeout(() => {
            setTypingPreview(null);
          }, 5000);
        } else if (!data.content || !data.is_typing) {
          // Clear preview when user stops typing
          setTypingPreview(null);
          if (typingPreviewTimeoutRef.current) {
            clearTimeout(typingPreviewTimeoutRef.current);
          }
        }
        break;

      case 'reaction':
        // Message reaction
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.message_id || msg.message_id === data.message_id) {
            const reactions = msg.reactions || [];
            const existingReaction = reactions.find(r => r.emoji === data.emoji);

            if (data.action === 'add') {
              if (existingReaction) {
                existingReaction.count = (existingReaction.count || 1) + 1;
              } else {
                reactions.push({ emoji: data.emoji, count: 1 });
              }
            } else if (data.action === 'remove' && existingReaction) {
              existingReaction.count = Math.max(0, (existingReaction.count || 1) - 1);
              if (existingReaction.count === 0) {
                reactions.splice(reactions.indexOf(existingReaction), 1);
              }
            }

            return { ...msg, reactions };
          }
          return msg;
        }));
        break;

      case 'message_edited':
        // Message edited
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.message_id || msg.message_id === data.message_id) {
            return {
              ...msg,
              content: data.new_content,
              is_edited: true,
              edited_at: data.edited_at
            };
          }
          return msg;
        }));
        break;

      case 'message_deleted':
        // Message deleted - soft delete (show "Message deleted")
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.message_id || msg.message_id === data.message_id) {
            return {
              ...msg,
              content: 'Bu mesaj silindi',
              is_deleted: true,
              deleted_at: data.timestamp
            };
          }
          return msg;
        }));
        break;

      case 'messages_read':
        // Messages read receipt
        setMessages(prev => prev.map(msg => {
          if (data.message_ids.includes(msg.message_id)) {
            return { ...msg, status: 'read' };
          }
          return msg;
        }));
        break;

      case 'user_status':
        // User online/offline status
        if (data.user_id === participantId) {
          setParticipantOnline(data.online);
        }
        break;

      case 'presence_update':
        // WebSocket presence update (joined/left)
        console.log('👤 Presence update:', data);
        // Only update if this event is for the current room
        if (data.roomId === roomId) {
          if (data.action === 'joined') {
            // Check if it's the other user (not current user)
            if (data.userType !== currentUserType) {
              setParticipantOnline(true);
            }
          } else if (data.action === 'left') {
            if (data.userType !== currentUserType) {
              setParticipantOnline(false);
            }
          }
        }
        break;

      case 'message_status':
        // Message status update (sent, delivered, read)
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.message_id || msg.message_id === data.message_id) {
            return { ...msg, status: data.status };
          }
          return msg;
        }));
        break;

      // ==================== VIDEO CALL EVENTS ====================
      case 'video_call_incoming':
        // Applicant: Gelen arama bildirimi
        console.log('📞 Incoming video call:', data);
        setIncomingCall({
          call_id: data.call_id,
          caller_name: data.caller_name,
          caller_type: data.caller_type,
          room_id: data.room_id
        });
        break;

      case 'video_call_response':
        // Admin: Applicant'ın cevabı
        console.log('📞 Video call response:', data);
        if (data.action === 'accept') {
          console.log('✅ Call accepted by applicant');
        } else if (data.action === 'reject') {
          console.log('❌ Call rejected by applicant');
          setError('Arama reddedildi');
          setTimeout(() => setError(null), 3000);
        }
        break;

      case 'video_call_ready':
        // Her iki taraf: Jitsi odası hazır
        console.log('📞 Video call ready:', data);
        console.log('🔥 CRITICAL: Backend sent room_name:', data.room_name);
        setActiveCall({
          call_id: data.call_id,
          jitsi_url: data.jitsi_url,
          room_name: data.room_name  // ⭐ CRITICAL: Must pass this to VideoCallModal
        });
        setIncomingCall(null); // Bildirimi kapat
        break;

      case 'video_call_ended':
        // Call sonlandı
        console.log('📞 Video call ended:', data);
        setActiveCall(null);
        setIncomingCall(null);
        break;

      case 'video_call_expired':
        // Call timeout (30 seconds passed without answer)
        console.log('⏰ Video call expired:', data);
        setIncomingCall(null);
        setActiveCall(null);
        setError('Arama süresi doldu (30 saniye)');
        setTimeout(() => setError(null), 3000);
        break;

      case 'video_call_error':
        // Video call hatası
        console.error('📞 Video call error:', data);
        setError(data.error || 'Video arama hatası');
        setTimeout(() => setError(null), 3000);
        break;

      case 'error':
        console.error('WebSocket error:', data.message);
        setError(data.message);
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  }, [participantId, roomId, currentUserType]);

  // Send message (with optional file and reply)
  const handleSendMessage = useCallback(async (content, fileData = null, replyToMessageId = null) => {
    // Allow empty content if there's a file
    if (!content?.trim() && !fileData) return;

    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Send via WebSocket with file data and reply_to_message_id
      const success = webSocketService.sendMessage(
        content?.trim() || '',
        messageId,
        fileData ? {
          url: fileData.url,
          name: fileData.name,
          size: fileData.size,
          type: fileData.mime_type || fileData.type // mime_type veya type alanını kullan
        } : null,
        replyToMessageId // reply_to_message_id parametresi eklendi
      );

      if (!success) {
        throw new Error('Failed to send message');
      }

      // Optimistically add message to UI
      // Eğer reply varsa, mesaj listesinden replied_to_message'ı bul
      let repliedToMessageData = null;
      if (replyToMessageId) {
        const replyMsg = messages.find(m => m.message_id === replyToMessageId || m.id === replyToMessageId);
        if (replyMsg) {
          repliedToMessageData = {
            id: replyMsg.id,
            message_id: replyMsg.message_id,
            content: replyMsg.content,
            sender_name: replyMsg.sender_name,
            sender_type: replyMsg.sender_type,
            created_at: replyMsg.created_at
          };
        }
      }

      const optimisticMessage = {
        id: messageId,
        message_id: messageId,
        content: content?.trim() || '',
        sender_type: currentUserType,
        sender_name: currentUserType === 'admin' ? 'Admin' : 'Applicant',
        created_at: new Date().toISOString(),
        file_url: fileData?.url || null,
        file_name: fileData?.name || null,
        file_size: fileData?.size || null,
        file_mime_type: fileData?.mime_type || null,
        reactions: [],
        status: 'sending',
        is_own_message: true,
        reply_to_message_id: replyToMessageId || null,
        replied_to_message: repliedToMessageData
      };

      setMessages(prev => [...prev, optimisticMessage]);

      // Update status to sent after a delay
      setTimeout(() => {
        setMessages(prev => prev.map(msg =>
          msg.id === messageId ? { ...msg, status: 'sent' } : msg
        ));
      }, 500);

    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  }, [currentUserType, messages]);

  // File upload
  const handleFileUpload = useCallback(async (file, roomId) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('room_id', roomId);

      const response = await fetch(`${API_BASE_URL}/chat/api/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: getSiteHeaders(),
        body: formData
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const data = await response.json();

      // Send message with file attachment
      await handleSendMessage('', {
        url: data.file_url,
        name: data.file_name,
        size: data.file_size,
        mime_type: data.mime_type
      });

    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file');
    }
  }, []);

  // Edit message
  const handleEditMessage = useCallback(async (messageId, newContent) => {
    try {
      // Send edit via WebSocket
      const success = webSocketService.sendMessageEdit(messageId, newContent);

      if (!success) {
        throw new Error('Failed to send edit request');
      }

      // Optimistically update local state (will be confirmed by broadcast)
      setMessages(prev => prev.map(msg =>
        msg.id === messageId || msg.message_id === messageId
          ? { ...msg, content: newContent, is_edited: true }
          : msg
      ));
    } catch (err) {
      console.error('Error editing message:', err);
      setError('Failed to edit message');
    }
  }, []);

  // Delete message
  const handleDeleteMessage = useCallback(async (messageId) => {
    try {
      // Send delete via WebSocket
      const success = webSocketService.sendMessageDelete(messageId);

      if (!success) {
        throw new Error('Failed to send delete request');
      }

      // Optimistically update local state (will be confirmed by broadcast)
      setMessages(prev => prev.map(msg =>
        msg.id === messageId || msg.message_id === messageId
          ? { ...msg, content: 'Bu mesaj silindi', is_deleted: true }
          : msg
      ));
    } catch (err) {
      console.error('Error deleting message:', err);
      setError('Failed to delete message');
    }
  }, []);

  // Reply to message
  const handleReplyMessage = useCallback((message) => {
    // Reply fonksiyonelliği ChatRoom'da yönetiliyor, burada sadece log
    console.log('Reply to message:', message);
  }, []);

  // Forward message
  const handleForwardMessage = useCallback((message) => {
    console.log('Forward message:', message);
    setMessageToForward(message);
    setForwardModalOpen(true);
  }, []);

  // Actually forward the message to selected room
  const handleForwardToRoom = useCallback(async (message, targetRoomId) => {
    try {
      // Send message to target room via REST API
      const response = await fetch(`${API_BASE_URL}/chat/api/rooms/${targetRoomId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getSiteHeaders()
        },
        body: JSON.stringify({
          content: `📨 İletilen mesaj:\n\n${message.content}`,
          sender_type: currentUserType,
          forwarded_from: message.message_id || message.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to forward message');
      }

      console.log(`✅ Message forwarded to room: ${targetRoomId}`);
    } catch (error) {
      console.error('❌ Error forwarding message:', error);
      throw error;
    }
  }, [currentUserType]);

  // Pin message
  const handlePinMessage = useCallback((message) => {
    console.log('Pin message:', message);
    alert(`Sabitle özelliği: Mesaj sohbetin üstüne sabitlenecek`);
  }, []);

  // Add reaction
  const handleReactionMessage = useCallback((messageId, emoji) => {
    webSocketService.sendReaction(messageId, emoji, 'add');
  }, []);

  // ==================== VIDEO CALL HANDLERS ====================

  // Start video call (Admin initiates)
  const handleVideoCallRequest = useCallback(() => {
    const callId = `call_${Date.now()}`;
    console.log('📞 Starting video call request:', callId);

    const ws = webSocketService.getConnection();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'video_call_request',
        call_id: callId,
        room_id: roomId,
        caller_name: currentUserType === 'admin' ? 'Admin' : currentUserName || participantName
      }));
      console.log('✅ Video call request sent');
    } else {
      setError('WebSocket bağlantısı yok');
    }

    // Also call parent callback if exists
    if (onVideoCall) {
      onVideoCall();
    }
  }, [roomId, currentUserType, currentUserName, participantName, onVideoCall]);

  // Accept incoming call (Applicant accepts) with mic/cam preferences
  const handleAcceptCall = useCallback((callId, preferences = { mic: true, cam: true }) => {
    console.log('📞 Accepting call:', callId, 'Preferences:', preferences);
    const ws = webSocketService.getConnection();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'video_call_response',
        call_id: callId,
        action: 'accept',
        participant_name: currentUserType === 'applicant' ? participantName : 'Admin',
        preferences // Mic/Cam preferences from IncomingCallNotification
      }));
      console.log('✅ Call acceptance sent with preferences:', preferences);
    }
  }, [currentUserType, participantName]);

  // Reject incoming call (Applicant rejects)
  const handleRejectCall = useCallback((callId) => {
    console.log('📞 Rejecting call:', callId);
    const ws = webSocketService.getConnection();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'video_call_response',
        call_id: callId,
        action: 'reject',
        participant_name: currentUserType === 'applicant' ? participantName : 'Admin'
      }));
      console.log('✅ Call rejection sent');
    }
    setIncomingCall(null);
  }, [currentUserType, participantName]);

  // End active call
  const handleEndCall = useCallback(() => {
    if (activeCall) {
      console.log('📞 Ending call:', activeCall.call_id);
      const ws = webSocketService.getConnection();
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'video_call_end',
          call_id: activeCall.call_id,
          room_id: roomId
        }));
        console.log('✅ Call end sent');
      }
      setActiveCall(null);
    }
  }, [activeCall, roomId]);

  return (
    <>
      <ChatRoom
        roomId={roomId}
        roomName={roomName}
        participantId={participantId}
        participantName={participantName}
        participantFirstName={participantFirstName}
        participantLastName={participantLastName}
        participantAvatar={participantAvatar}
        participantEmail={participantEmail}
        participantOnline={participantOnline}
        messages={messages}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        currentUserEmail={currentUserEmail}
        currentUserType={currentUserType}
        isLoading={isLoading}
        error={error}
        typingUsers={typingUsers}
        typingPreview={typingPreview}
        onSendMessage={handleSendMessage}
        onFileUpload={handleFileUpload}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onReplyMessage={handleReplyMessage}
        onReactionMessage={handleReactionMessage}
        onForwardMessage={handleForwardMessage}
        onPinMessage={handlePinMessage}
        onBack={onBack}
        onVideoCall={handleVideoCallRequest}
      />

      {/* Incoming Call Notification */}
      <IncomingCallNotification
        callData={incomingCall}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      {/* Video Call Modal - Jitsi with Optima branding */}
      {/* ⭐ CRITICAL: Pass backend-provided room name to ensure both parties join same Jitsi room */}
      <VideoCallModal
        open={!!activeCall}
        onClose={handleEndCall}
        roomId={roomId}
        roomName={roomName}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        currentUserEmail={currentUserEmail}
        participantId={participantId}
        participantName={participantName}
        participantAvatar={participantAvatar}
        participantEmail={participantEmail}
        isModerator={currentUserType === 'admin'}
        jitsiRoomName={activeCall?.room_name}
      />

      {/* Forward Message Modal */}
      <ForwardMessageModal
        open={forwardModalOpen}
        onClose={() => setForwardModalOpen(false)}
        message={messageToForward}
        currentRoomId={roomId}
        onForward={handleForwardToRoom}
      />
    </>
  );
};

export default ChatContainer;
