import api from './api';

const chatService = {
  // Chat odalarını listele
  getChatRooms: async () => {
    const response = await api.get('/api/chat-rooms/');
    return response.data;
  },

  // Chat odası oluştur
  createChatRoom: async (roomData) => {
    const response = await api.post('/api/chat-rooms/', roomData);
    return response.data;
  },

  // Odaya katıl
  joinRoom: async (roomId) => {
    const response = await api.post(`/api/chat-rooms/${roomId}/join/`);
    return response.data;
  },

  // Odadan ayrıl
  leaveRoom: async (roomId) => {
    const response = await api.post(`/api/chat-rooms/${roomId}/leave/`);
    return response.data;
  },

  // Mesajları getir
  getMessages: async (roomId) => {
    const response = await api.get('/api/messages/', {
      params: { room: roomId }
    });
    return response.data;
  },

  // Mesaj gönder
  sendMessage: async (messageData) => {
    const response = await api.post('/api/chat/send-message/', messageData);
    return response.data;
  },

  // Mesaj sil
  deleteMessage: async (messageId) => {
    const response = await api.delete(`/api/chat/messages/${messageId}/delete/`);
    return response.data;
  },

  // Online durumu güncelle
  updateOnlineStatus: async (isOnline, currentRoom = null) => {
    const response = await api.post('/api/chat/update-status/', {
      is_online: isOnline,
      current_room: currentRoom,
    });
    return response.data;
  },

  // Online kullanıcıları getir
  getOnlineUsers: async (roomId = null) => {
    const params = roomId ? { room: roomId } : {};
    const response = await api.get('/api/chat/online-users/', { params });
    return response.data;
  },
};

export default chatService;
