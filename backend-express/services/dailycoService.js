const axios = require('axios');

class DailycoService {
  constructor() {
    this.apiKey = process.env.DAILYCO_API_KEY;
    this.domain = process.env.DAILYCO_DOMAIN || 'optima-hr.daily.co';
    this.baseUrl = 'https://api.daily.co/v1';
  }

  async createRoom(roomName) {
    try {
      const response = await axios.post(`${this.baseUrl}/rooms`, {
        name: roomName,
        privacy: 'private',
        properties: {
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 saat geçerli
          enable_recording: 'cloud',
          start_video_off: false,
          start_audio_off: false,
          enable_screenshare: true,
          enable_chat: true,
          lang: 'tr'
        }
      }, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Daily.co room created:', response.data.name);
      return response.data;
    } catch (error) {
      console.error('Daily.co room creation failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async createMeetingToken(roomName, userName, isOwner = false) {
    try {
      const response = await axios.post(`${this.baseUrl}/meeting-tokens`, {
        properties: {
          room_name: roomName,
          user_name: userName,
          is_owner: isOwner,
          enable_recording: isOwner,
          exp: Math.floor(Date.now() / 1000) + 3600 // 1 saat geçerli
        }
      }, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Daily.co meeting token created for:', userName);
      return response.data.token;
    } catch (error) {
      console.error('Daily.co token creation failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async deleteRoom(roomName) {
    try {
      await axios.delete(`${this.baseUrl}/rooms/${roomName}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });
      console.log('Daily.co room deleted:', roomName);
    } catch (error) {
      // Room zaten silinmiş olabilir
      if (error.response?.status !== 404) {
        console.error('Daily.co room deletion failed:', error.response?.data || error.message);
      }
    }
  }

  async getRoom(roomName) {
    try {
      const response = await axios.get(`${this.baseUrl}/rooms/${roomName}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  getRoomUrl(roomName) {
    return `https://${this.domain}/${roomName}`;
  }
}

module.exports = new DailycoService();
