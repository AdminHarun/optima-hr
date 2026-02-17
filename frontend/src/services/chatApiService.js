// Enhanced Chat API service with backend integration
import axios from 'axios';

import { API_BASE_URL } from '../config/config';

class ChatApiService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/chat/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // X-Site-Id header interceptor
    this.api.interceptors.request.use((config) => {
      const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
      config.headers['X-Site-Id'] = currentSite;
      return config;
    });
  }

  // Chat Rooms
  async getChatRooms() {
    try {
      const response = await this.api.get('/rooms/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch chat rooms:', error);
      throw error;
    }
  }

  async getApplicantRooms() {
    try {
      const response = await this.api.get('/rooms/applicant_rooms/');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch applicant rooms:', error);
      throw error;
    }
  }

  async getOrCreateApplicantRoom(applicantData) {
    try {
      const response = await this.api.post('/rooms/get_or_create_applicant_room/', {
        applicant_id: applicantData.applicant_id,
        applicant_email: applicantData.applicant_email,
        applicant_name: applicantData.applicant_name
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get/create applicant room:', error);
      throw error;
    }
  }

  async getChatRoom(roomId) {
    try {
      const response = await this.api.get(`/rooms/${roomId}/`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch chat room:', error);
      throw error;
    }
  }

  // Messages
  async getMessages(roomId, page = 1, pageSize = 50) {
    try {
      const response = await this.api.get('/messages/', {
        params: { room: roomId, page, page_size: pageSize }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      throw error;
    }
  }

  async getRoomMessages(roomId, page = 1, pageSize = 50) {
    try {
      const response = await this.api.get(`/rooms/${roomId}/messages/`, {
        params: { page, page_size: pageSize }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch room messages:', error);
      throw error;
    }
  }

  async sendMessage(messageData) {
    try {
      const response = await this.api.post('/messages/', {
        message_id: messageData.message_id,
        room: messageData.room_id,
        sender_type: messageData.sender_type,
        sender_name: messageData.sender_name,
        message_type: messageData.message_type || 'text',
        content: messageData.content,
        file_url: messageData.file_url,
        file_name: messageData.file_name,
        file_size: messageData.file_size,
        reply_to: messageData.reply_to
      });
      return response.data;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  // Helper methods for frontend integration
  async loadApplicantChatsForFrontend() {
    try {
      // Get applicant rooms from database
      const rooms = await this.getApplicantRooms();

      // Transform to frontend format
      return rooms.map(room => ({
        id: `applicant_${room.applicant_id}`,
        name: room.applicant_name || room.applicant_email || 'Unknown',
        email: room.applicant_email,
        type: 'applicant',
        room_id: room.id,
        unread: room.unread_count || 0,
        hasMessages: room.last_message !== null,
        last_message: room.last_message,
        online_members: room.online_members || []
      }));
    } catch (error) {
      console.error('Failed to load applicant chats:', error);
      return [];
    }
  }

  async loadMessagesForFrontend(applicantId) {
    try {
      // Extract numeric ID
      const cleanId = applicantId.replace('applicant_', '');

      // Get or create room for applicant
      const { room } = await this.getOrCreateApplicantRoom({
        applicant_id: cleanId,
        applicant_email: `applicant_${cleanId}@temp.com`,
        applicant_name: `Applicant ${cleanId}`
      });

      // Get messages for room
      const messagesData = await this.getRoomMessages(room.id);

      // Transform to frontend format
      return messagesData.messages.map(msg => ({
        id: msg.id,
        message_id: msg.message_id,
        sender_name: msg.sender_name,
        content: msg.content,
        created_at: msg.created_at,
        is_own_message: msg.sender_type === 'admin', // From admin perspective
        sender_type: msg.sender_type,
        reactions: msg.reactions || [],
        status: msg.status,
        file: msg.file_url ? {
          url: msg.file_url,
          name: msg.file_name,
          size: msg.file_size
        } : null
      }));
    } catch (error) {
      console.error('Failed to load messages for frontend:', error);
      return [];
    }
  }

  // Search messages across all rooms
  async searchMessages(query, roomId = null, page = 1, pageSize = 20) {
    try {
      const params = { q: query, page, page_size: pageSize };
      if (roomId) {
        params.room_id = roomId;
      }
      const response = await this.api.get('/messages/search/', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to search messages:', error);
      throw error;
    }
  }

  // Mark messages as read
  async markMessagesRead(messageIds = [], roomId = null) {
    try {
      const response = await this.api.post('/messages/mark_read/', {
        message_ids: messageIds,
        room_id: roomId
      });
      return response.data;
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
      throw error;
    }
  }

  // Get online status for all rooms
  async getOnlineStatus() {
    try {
      const response = await this.api.get('/rooms/online_status');
      return response.data;
    } catch (error) {
      console.error('Failed to get online status:', error);
      throw error;
    }
  }

  // Upload file
  async uploadFile(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await this.api.post('/upload/file/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  }
}

// Create singleton instance
const chatApiService = new ChatApiService();

export default chatApiService;
export { ChatApiService };
