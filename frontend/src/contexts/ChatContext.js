/**
 * ChatContext - Merkezi chat state yonetimi
 *
 * Yonetilen state:
 * - rooms: Tum chat odalari
 * - activeRoom: Secili oda
 * - unreadCounts: Okunmamis mesaj sayilari
 * - onlineUsers: Online kullanici listesi
 * - typingUsers: Yazan kullaniciler
 * - connectionStatus: WebSocket baglanti durumu
 *
 * Metodlar:
 * - switchChannel: INTERNAL/EXTERNAL kanal degistir
 * - setActiveRoom: Aktif odayi sec
 * - markRoomAsRead: Odayi okundu olarak isaretle
 * - sendMessage: Mesaj gonder
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import webSocketService from '../services/webSocketService';
import chatApiService from '../services/chatApiService';

// Initial State
const initialState = {
  // Kanal ve Odalar
  activeChannel: 'EXTERNAL', // EXTERNAL veya INTERNAL
  rooms: [],
  activeRoom: null,
  activeRoomId: null,

  // Mesajlar
  messages: {},  // { roomId: [messages] }
  unreadCounts: {}, // { roomId: count }

  // Presence
  onlineUsers: [], // Online kullanici ID'leri
  presenceMap: {}, // { odayId: { status, lastSeen, customStatus } }

  // Typing
  typingUsers: {}, // { roomId: [{ userId, userName, userType }] }

  // Baglanti
  connectionStatus: 'disconnected', // connecting, connected, disconnected, error

  // Pagination
  pagination: {}, // { roomId: { hasMore, oldestMessageDate, isLoadingMore } }

  // UI State
  isLoading: false,
  error: null,

  // Sidebar
  sidebarCollapsed: false,
  showEmployeeDirectory: false,
};

// Action Types
const ActionTypes = {
  // Kanal
  SET_ACTIVE_CHANNEL: 'SET_ACTIVE_CHANNEL',

  // Odalar
  SET_ROOMS: 'SET_ROOMS',
  ADD_ROOM: 'ADD_ROOM',
  UPDATE_ROOM: 'UPDATE_ROOM',
  SET_ACTIVE_ROOM: 'SET_ACTIVE_ROOM',

  // Mesajlar
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  DELETE_MESSAGE: 'DELETE_MESSAGE',

  // Okunmamis
  SET_UNREAD_COUNT: 'SET_UNREAD_COUNT',
  INCREMENT_UNREAD: 'INCREMENT_UNREAD',
  CLEAR_UNREAD: 'CLEAR_UNREAD',

  // Presence
  SET_ONLINE_USERS: 'SET_ONLINE_USERS',
  UPDATE_PRESENCE: 'UPDATE_PRESENCE',
  SET_PRESENCE_MAP: 'SET_PRESENCE_MAP',

  // Typing
  SET_TYPING: 'SET_TYPING',
  CLEAR_TYPING: 'CLEAR_TYPING',

  // Baglanti
  SET_CONNECTION_STATUS: 'SET_CONNECTION_STATUS',

  // Pagination
  SET_PAGINATION: 'SET_PAGINATION',
  PREPEND_MESSAGES: 'PREPEND_MESSAGES',

  // UI
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  TOGGLE_EMPLOYEE_DIRECTORY: 'TOGGLE_EMPLOYEE_DIRECTORY',
};

// Reducer
function chatReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_ACTIVE_CHANNEL:
      return { ...state, activeChannel: action.payload };

    case ActionTypes.SET_ROOMS:
      return { ...state, rooms: action.payload };

    case ActionTypes.ADD_ROOM:
      return { ...state, rooms: [action.payload, ...state.rooms] };

    case ActionTypes.UPDATE_ROOM:
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.payload.id ? { ...room, ...action.payload } : room
        ),
      };

    case ActionTypes.SET_ACTIVE_ROOM:
      return {
        ...state,
        activeRoom: action.payload,
        activeRoomId: action.payload?.id || null,
      };

    case ActionTypes.SET_MESSAGES:
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.roomId]: action.payload.messages,
        },
      };

    case ActionTypes.ADD_MESSAGE:
      const roomMessages = state.messages[action.payload.roomId] || [];
      // Duplikasyon kontrolu
      const exists = roomMessages.some(m => m.message_id === action.payload.message.message_id);
      if (exists) return state;

      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.roomId]: [...roomMessages, action.payload.message],
        },
      };

    case ActionTypes.UPDATE_MESSAGE:
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.roomId]: (state.messages[action.payload.roomId] || []).map(msg =>
            msg.message_id === action.payload.messageId
              ? { ...msg, ...action.payload.updates }
              : msg
          ),
        },
      };

    case ActionTypes.DELETE_MESSAGE:
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.roomId]: (state.messages[action.payload.roomId] || []).map(msg =>
            msg.message_id === action.payload.messageId
              ? { ...msg, is_deleted: true, content: '' }
              : msg
          ),
        },
      };

    case ActionTypes.SET_UNREAD_COUNT:
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload.roomId]: action.payload.count,
        },
      };

    case ActionTypes.INCREMENT_UNREAD:
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload.roomId]: (state.unreadCounts[action.payload.roomId] || 0) + 1,
        },
      };

    case ActionTypes.CLEAR_UNREAD:
      return {
        ...state,
        unreadCounts: {
          ...state.unreadCounts,
          [action.payload.roomId]: 0,
        },
      };

    case ActionTypes.SET_ONLINE_USERS:
      return { ...state, onlineUsers: action.payload };

    case ActionTypes.UPDATE_PRESENCE:
      return {
        ...state,
        presenceMap: {
          ...state.presenceMap,
          [action.payload.odayId]: action.payload.presence,
        },
      };

    case ActionTypes.SET_PRESENCE_MAP:
      return { ...state, presenceMap: { ...state.presenceMap, ...action.payload } };

    case ActionTypes.SET_TYPING:
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.roomId]: action.payload.users,
        },
      };

    case ActionTypes.CLEAR_TYPING:
      const newTyping = { ...state.typingUsers };
      delete newTyping[action.payload.roomId];
      return { ...state, typingUsers: newTyping };

    case ActionTypes.SET_CONNECTION_STATUS:
      return { ...state, connectionStatus: action.payload };

    case ActionTypes.SET_PAGINATION:
      return {
        ...state,
        pagination: {
          ...state.pagination,
          [action.payload.roomId]: {
            ...(state.pagination[action.payload.roomId] || {}),
            ...action.payload.data,
          },
        },
      };

    case ActionTypes.PREPEND_MESSAGES:
      const existing = state.messages[action.payload.roomId] || [];
      const existingIds = new Set(existing.map(m => m.message_id));
      const newMsgs = action.payload.messages.filter(m => !existingIds.has(m.message_id));
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.roomId]: [...newMsgs, ...existing],
        },
      };

    case ActionTypes.SET_LOADING:
      return { ...state, isLoading: action.payload };

    case ActionTypes.SET_ERROR:
      return { ...state, error: action.payload };

    case ActionTypes.TOGGLE_SIDEBAR:
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };

    case ActionTypes.TOGGLE_EMPLOYEE_DIRECTORY:
      return { ...state, showEmployeeDirectory: !state.showEmployeeDirectory };

    default:
      return state;
  }
}

// Context
const ChatContext = createContext(null);

// Provider Component
export function ChatProvider({ children, user }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const typingTimeoutRef = useRef({});

  // ===== WEBSOCKET EVENT HANDLERS =====

  const handleWebSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'chat_message':
        dispatch({
          type: ActionTypes.ADD_MESSAGE,
          payload: {
            roomId: data.message.room_id || state.activeRoomId,
            message: data.message,
          },
        });

        // Aktif oda degilse unread artir
        if (data.message.room_id !== state.activeRoomId) {
          dispatch({
            type: ActionTypes.INCREMENT_UNREAD,
            payload: { roomId: data.message.room_id },
          });
        }
        break;

      case 'typing_indicator':
      case 'typing_start':
        const currentTyping = state.typingUsers[data.roomId] || [];
        const userExists = currentTyping.some(
          u => u.userId === data.userId && u.userType === data.userType
        );

        if (!userExists && data.is_typing !== false) {
          dispatch({
            type: ActionTypes.SET_TYPING,
            payload: {
              roomId: data.roomId,
              users: [...currentTyping, {
                userId: data.userId || data.user?.id,
                userName: data.userName || data.user?.name,
                userType: data.userType || data.user?.type,
              }],
            },
          });

          // 5 saniye sonra temizle
          const key = `${data.roomId}_${data.userId}`;
          if (typingTimeoutRef.current[key]) {
            clearTimeout(typingTimeoutRef.current[key]);
          }
          typingTimeoutRef.current[key] = setTimeout(() => {
            dispatch({
              type: ActionTypes.SET_TYPING,
              payload: {
                roomId: data.roomId,
                users: (state.typingUsers[data.roomId] || []).filter(
                  u => u.userId !== data.userId
                ),
              },
            });
          }, 5000);
        }
        break;

      case 'typing_stop':
        dispatch({
          type: ActionTypes.SET_TYPING,
          payload: {
            roomId: data.roomId,
            users: (state.typingUsers[data.roomId] || []).filter(
              u => u.userId !== (data.userId || data.user?.id)
            ),
          },
        });
        break;

      case 'message_edited':
        dispatch({
          type: ActionTypes.UPDATE_MESSAGE,
          payload: {
            roomId: state.activeRoomId,
            messageId: data.message_id,
            updates: {
              content: data.new_content,
              is_edited: true,
              edited_at: data.edited_at,
            },
          },
        });
        break;

      case 'message_deleted':
        dispatch({
          type: ActionTypes.DELETE_MESSAGE,
          payload: {
            roomId: state.activeRoomId,
            messageId: data.message_id,
          },
        });
        break;

      case 'messages_read':
      case 'room_read':
        // Mesaj okundu bildirimini isle
        if (data.message_ids) {
          data.message_ids.forEach(messageId => {
            dispatch({
              type: ActionTypes.UPDATE_MESSAGE,
              payload: {
                roomId: data.roomId || state.activeRoomId,
                messageId,
                updates: { delivery_status: 'read' },
              },
            });
          });
        }
        break;

      case 'messages_delivered':
        if (data.messageIds) {
          data.messageIds.forEach(messageId => {
            dispatch({
              type: ActionTypes.UPDATE_MESSAGE,
              payload: {
                roomId: data.roomId,
                messageId,
                updates: { delivery_status: 'delivered' },
              },
            });
          });
        }
        break;

      case 'presence_update':
      case 'presence_change':
        dispatch({
          type: ActionTypes.UPDATE_PRESENCE,
          payload: {
            odayId: data.userId,
            presence: {
              status: data.status || (data.action === 'joined' ? 'online' : 'offline'),
              lastSeen: new Date().toISOString(),
            },
          },
        });
        break;

      case 'presence_bulk':
        dispatch({
          type: ActionTypes.SET_PRESENCE_MAP,
          payload: data.presence,
        });
        break;

      case 'connection_established':
        dispatch({ type: ActionTypes.SET_CONNECTION_STATUS, payload: 'connected' });
        break;

      default:
        // Bilinmeyen event tipleri icin log
        if (data.type && !['pong', 'auth_success'].includes(data.type)) {
          console.log('[ChatContext] Unhandled event:', data.type);
        }
    }
  }, [state.activeRoomId, state.typingUsers]);

  // ===== WEBSOCKET BAGLANTISI =====

  useEffect(() => {
    if (!user) return;

    dispatch({ type: ActionTypes.SET_CONNECTION_STATUS, payload: 'connecting' });

    // WebSocket event listener
    const unsubscribe = webSocketService.addMessageListener(handleWebSocketMessage);

    // Baglanti durumu listener
    const statusListener = (status) => {
      dispatch({ type: ActionTypes.SET_CONNECTION_STATUS, payload: status });
    };

    webSocketService.addConnectionListener?.(statusListener);

    return () => {
      unsubscribe?.();
      webSocketService.removeConnectionListener?.(statusListener);
    };
  }, [user, handleWebSocketMessage]);

  // ===== ACTIONS =====

  /**
   * Kanal degistir (INTERNAL/EXTERNAL)
   */
  const switchChannel = useCallback(async (channel) => {
    dispatch({ type: ActionTypes.SET_ACTIVE_CHANNEL, payload: channel });
    dispatch({ type: ActionTypes.SET_ACTIVE_ROOM, payload: null });

    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      // Kanala gore odalari yukle
      const rooms = await chatApiService.getRooms(channel);
      dispatch({ type: ActionTypes.SET_ROOMS, payload: rooms });
    } catch (error) {
      console.error('[ChatContext] Odalar yuklenemedi:', error);
      dispatch({ type: ActionTypes.SET_ERROR, payload: 'Odalar yuklenemedi' });
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  }, []);

  /**
   * Aktif odayi sec
   */
  const setActiveRoom = useCallback(async (room) => {
    if (!room) {
      dispatch({ type: ActionTypes.SET_ACTIVE_ROOM, payload: null });
      return;
    }

    dispatch({ type: ActionTypes.SET_ACTIVE_ROOM, payload: room });
    dispatch({ type: ActionTypes.CLEAR_UNREAD, payload: { roomId: room.id } });

    // Mesajlari yukle (cache'te yoksa)
    if (!state.messages[room.id]) {
      try {
        const messages = await chatApiService.getMessages(room.id);
        dispatch({
          type: ActionTypes.SET_MESSAGES,
          payload: { roomId: room.id, messages },
        });
        // Set initial pagination state
        const msgArray = messages.messages || messages;
        dispatch({
          type: ActionTypes.SET_PAGINATION,
          payload: {
            roomId: room.id,
            data: {
              hasMore: (Array.isArray(msgArray) ? msgArray.length : 0) >= 50,
              currentPage: 1,
              isLoadingMore: false,
            },
          },
        });
      } catch (error) {
        console.error('[ChatContext] Mesajlar yuklenemedi:', error);
      }
    }

    // WebSocket'e odaya katildigini bildir
    webSocketService.send({
      type: 'join_room',
      roomId: room.id,
    });

    // Odayi okundu olarak isaretle
    webSocketService.send({
      type: 'mark_room_read',
      roomId: room.id,
    });
  }, [state.messages]);

  /**
   * Odayi okundu olarak isaretle
   */
  const markRoomAsRead = useCallback((roomId) => {
    dispatch({ type: ActionTypes.CLEAR_UNREAD, payload: { roomId } });

    webSocketService.send({
      type: 'mark_room_read',
      roomId,
    });
  }, []);

  /**
   * Mesaj gonder
   */
  const sendMessage = useCallback(async (content, options = {}) => {
    if (!state.activeRoom) return null;

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const message = {
      id: messageId,
      type: 'message',
      content,
      sender: user?.name || 'User',
      sender_type: user?.type || 'admin',
      reply_to_message_id: options.replyTo?.message_id,
      file: options.file,
    };

    // Optimistic update
    const optimisticMessage = {
      message_id: messageId,
      content,
      sender_name: user?.name,
      sender_type: user?.type,
      created_at: new Date().toISOString(),
      delivery_status: 'pending',
      file_url: options.file?.url,
      file_name: options.file?.name,
      file_size: options.file?.size,
      file_mime_type: options.file?.type,
      reply_to_message_id: options.replyTo?.message_id,
      replied_to_message: options.replyTo,
    };

    dispatch({
      type: ActionTypes.ADD_MESSAGE,
      payload: {
        roomId: state.activeRoom.id,
        message: optimisticMessage,
      },
    });

    // WebSocket ile gonder
    webSocketService.send(message);

    return messageId;
  }, [state.activeRoom, user]);

  /**
   * Daha eski mesajlari yukle (infinite scroll)
   */
  const loadMoreMessages = useCallback(async () => {
    if (!state.activeRoom) return;

    const roomId = state.activeRoom.id;
    const paginationState = state.pagination[roomId];
    if (!paginationState?.hasMore || paginationState?.isLoadingMore) return;

    const nextPage = (paginationState.currentPage || 1) + 1;

    dispatch({
      type: ActionTypes.SET_PAGINATION,
      payload: { roomId, data: { isLoadingMore: true } },
    });

    try {
      const response = await chatApiService.getMessages(roomId, nextPage, 50);
      const olderMessages = response.messages || response;
      const msgArray = Array.isArray(olderMessages) ? olderMessages : [];

      if (msgArray.length > 0) {
        dispatch({
          type: ActionTypes.PREPEND_MESSAGES,
          payload: { roomId, messages: msgArray },
        });
      }

      dispatch({
        type: ActionTypes.SET_PAGINATION,
        payload: {
          roomId,
          data: {
            hasMore: msgArray.length >= 50,
            currentPage: nextPage,
            isLoadingMore: false,
          },
        },
      });
    } catch (error) {
      console.error('[ChatContext] Eski mesajlar yuklenemedi:', error);
      dispatch({
        type: ActionTypes.SET_PAGINATION,
        payload: { roomId, data: { isLoadingMore: false } },
      });
    }
  }, [state.activeRoom, state.pagination]);

  /**
   * Yaziyor gostergesi gonder
   */
  const sendTypingIndicator = useCallback((isTyping) => {
    if (!state.activeRoom) return;

    webSocketService.send({
      type: 'typing',
      is_typing: isTyping,
    });
  }, [state.activeRoom]);

  /**
   * Tepki ekle/kaldir
   */
  const toggleReaction = useCallback((messageId, emoji) => {
    webSocketService.send({
      type: 'reaction',
      message_id: messageId,
      emoji,
      action: 'add', // veya 'remove' - backend kontrol edecek
    });
  }, []);

  /**
   * Mesaji duzenle
   */
  const editMessage = useCallback((messageId, newContent) => {
    webSocketService.send({
      type: 'message_edit',
      message_id: messageId,
      new_content: newContent,
    });
  }, []);

  /**
   * Mesaji sil
   */
  const deleteMessage = useCallback((messageId) => {
    webSocketService.send({
      type: 'message_delete',
      message_id: messageId,
    });
  }, []);

  /**
   * Calisan rehberini ac/kapat
   */
  const toggleEmployeeDirectory = useCallback(() => {
    dispatch({ type: ActionTypes.TOGGLE_EMPLOYEE_DIRECTORY });
  }, []);

  /**
   * Sidebar'i ac/kapat
   */
  const toggleSidebar = useCallback(() => {
    dispatch({ type: ActionTypes.TOGGLE_SIDEBAR });
  }, []);

  // Context value
  const value = {
    // State
    ...state,

    // Actions
    switchChannel,
    setActiveRoom,
    markRoomAsRead,
    sendMessage,
    sendTypingIndicator,
    toggleReaction,
    editMessage,
    deleteMessage,
    toggleEmployeeDirectory,
    toggleSidebar,
    loadMoreMessages,

    // Computed
    currentRoomMessages: state.messages[state.activeRoomId] || [],
    currentRoomTyping: state.typingUsers[state.activeRoomId] || [],
    currentRoomPagination: state.pagination[state.activeRoomId] || { hasMore: false, isLoadingMore: false },
    totalUnread: Object.values(state.unreadCounts).reduce((sum, count) => sum + count, 0),
    isConnected: state.connectionStatus === 'connected',
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

// Hook
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

export default ChatContext;
