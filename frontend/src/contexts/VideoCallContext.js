// VideoCallContext.js - Daily.co video call state management with WebSocket notifications
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const VideoCallContext = createContext(null);

const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:9000';

/**
 * VideoCallProvider - Manages video call state and notifications across the admin application
 * Maintains a WebSocket connection for receiving video call events globally
 */
export const VideoCallProvider = ({ children }) => {
  const [activeCall, setActiveCall] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const callNotificationRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const currentRoomRef = useRef(null);

  /**
   * Connect to WebSocket for a specific room
   */
  const connectToRoom = useCallback((roomId) => {
    if (!roomId) return;

    // Aynı odaya zaten bağlıysak skip et
    if (currentRoomRef.current === roomId && wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Eski bağlantıyı kapat
    if (wsRef.current) {
      wsRef.current.close(1000, 'Switching rooms');
    }

    currentRoomRef.current = roomId;
    const wsUrl = `${WS_BASE_URL}/ws/admin-chat/${roomId}`;
    console.log(`📞 VideoCallContext: Connecting to ${wsUrl}`);

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('📞 VideoCallContext: WebSocket connected');
        setIsConnected(true);
        startHeartbeat();
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle pong
          if (data.type === 'pong') return;

          // Handle video call events
          handleVideoCallEvent(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('📞 VideoCallContext: WebSocket closed', event.code);
        setIsConnected(false);
        stopHeartbeat();

        // Auto-reconnect if not intentional
        if (event.code !== 1000 && currentRoomRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connectToRoom(currentRoomRef.current);
          }, 3000);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('📞 VideoCallContext: WebSocket error', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, []);

  /**
   * Disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    stopHeartbeat();
    if (wsRef.current) {
      wsRef.current.close(1000, 'Disconnecting');
      wsRef.current = null;
    }
    currentRoomRef.current = null;
    setIsConnected(false);
  }, []);

  /**
   * Heartbeat to keep connection alive
   */
  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, 25000);
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  /**
   * Handle video call WebSocket events
   */
  const handleVideoCallEvent = useCallback((data) => {
    switch (data.type) {
      case 'video_call_incoming':
        console.log('📞 Incoming call:', data);
        setIncomingCall({
          call_id: data.call_id,
          caller_name: data.caller_name,
          caller_type: data.caller_type,
          room_id: data.room_id
        });
        break;

      case 'video_call_response':
        if (data.action === 'accept') {
          console.log('📞 Call accepted');
        } else if (data.action === 'reject') {
          console.log('📞 Call rejected');
          setActiveCall(null);
        }
        break;

      case 'video_call_ready':
        console.log('📞 Call ready:', data);
        setActiveCall({
          call_id: data.call_id,
          daily_url: data.daily_url,
          room_name: data.room_name,
          participant_ip: data.participant_ip
        });
        setIncomingCall(null);
        break;

      case 'video_call_ended':
        console.log('📞 Call ended');
        setActiveCall(null);
        setIncomingCall(null);
        break;

      case 'video_call_expired':
        console.log('📞 Call expired');
        setIncomingCall(null);
        break;

      case 'video_call_error':
        console.error('📞 Call error:', data.error);
        break;

      default:
        // Diğer mesaj türleri (chat_message vs.) burada işlenmez
        break;
    }
  }, []);

  /**
   * Start a video call
   */
  const startCall = useCallback(({
    roomId,
    roomName,
    participantId,
    participantName,
    participantAvatar,
    participantEmail,
    currentUserId,
    currentUserName,
    currentUserAvatar,
    currentUserEmail,
    isModerator = true
  }) => {
    // Connect to the room if not already connected
    if (currentRoomRef.current !== roomId) {
      connectToRoom(roomId);
    }

    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Send video call request via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'video_call_request',
        call_id: callId,
        room_id: roomId,
        caller_name: currentUserName || 'Admin'
      }));
    }

    const call = {
      id: callId,
      roomId,
      roomName,
      participantId,
      participantName,
      participantAvatar,
      participantEmail,
      currentUserId,
      currentUserName,
      currentUserAvatar,
      currentUserEmail,
      isModerator,
      startedAt: new Date().toISOString(),
      status: 'calling'
    };

    // Add to history
    setCallHistory(prev => [...prev, call]);

    console.log('📞 Video call initiated:', call);
    return call;
  }, [connectToRoom]);

  /**
   * End current call
   */
  const endCall = useCallback(() => {
    if (!activeCall) return;

    // Send end call via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'video_call_end',
        call_id: activeCall.call_id,
        room_id: currentRoomRef.current
      }));
    }

    const endedCall = {
      ...activeCall,
      endedAt: new Date().toISOString(),
      status: 'ended',
      duration: Math.floor((new Date() - new Date(activeCall.startedAt)) / 1000)
    };

    // Update history
    setCallHistory(prev =>
      prev.map(call =>
        call.id === activeCall.call_id
          ? endedCall
          : call
      )
    );

    setActiveCall(null);
    console.log('📞 Video call ended:', endedCall);
  }, [activeCall]);

  /**
   * Handle incoming call notification
   */
  const receiveCall = useCallback((callData) => {
    setIncomingCall(callData);
    console.log('📞 Incoming call:', callData);
  }, []);

  /**
   * Accept incoming call
   */
  const acceptCall = useCallback((preferences = { mic: true, cam: true }) => {
    if (!incomingCall) return;

    // Send accept via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'video_call_response',
        call_id: incomingCall.call_id,
        action: 'accept',
        participant_name: 'Admin',
        preferences
      }));
    }

    if (callNotificationRef.current) {
      clearTimeout(callNotificationRef.current);
    }
  }, [incomingCall]);

  /**
   * Reject incoming call
   */
  const rejectCall = useCallback(() => {
    if (!incomingCall) return;

    // Send reject via WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'video_call_response',
        call_id: incomingCall.call_id,
        action: 'reject',
        participant_name: 'Admin'
      }));
    }

    console.log('📞 Call rejected:', incomingCall);
    setIncomingCall(null);

    if (callNotificationRef.current) {
      clearTimeout(callNotificationRef.current);
    }
  }, [incomingCall]);

  /**
   * Get call history for a specific room
   */
  const getCallHistoryForRoom = useCallback((roomId) => {
    return callHistory.filter(call => call.roomId === roomId);
  }, [callHistory]);

  /**
   * Clear call history
   */
  const clearCallHistory = useCallback(() => {
    setCallHistory([]);
  }, []);

  /**
   * Get WebSocket connection for direct use
   */
  const getConnection = useCallback(() => {
    return wsRef.current;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const value = {
    // State
    activeCall,
    incomingCall,
    callHistory,
    isConnected,

    // Connection
    connectToRoom,
    disconnect,
    getConnection,
    currentRoom: currentRoomRef.current,

    // Actions
    startCall,
    endCall,
    receiveCall,
    acceptCall,
    rejectCall,
    getCallHistoryForRoom,
    clearCallHistory,

    // Status
    isInCall: !!activeCall,
    hasIncomingCall: !!incomingCall
  };

  return (
    <VideoCallContext.Provider value={value}>
      {children}
    </VideoCallContext.Provider>
  );
};

/**
 * useVideoCall hook - Access video call context
 */
export const useVideoCall = () => {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error('useVideoCall must be used within VideoCallProvider');
  }
  return context;
};

export default VideoCallContext;
