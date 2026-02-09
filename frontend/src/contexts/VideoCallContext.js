// VideoCallContext.js - Daily.co video call state management
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const VideoCallContext = createContext(null);

/**
 * VideoCallProvider - Manages video call state across the application
 * Uses Daily.co for video conferencing
 */
export const VideoCallProvider = ({ children }) => {
  const [activeCall, setActiveCall] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const callNotificationRef = useRef(null);

  /**
   * Start a video call with Daily.co
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
    const call = {
      id: `call_${Date.now()}`,
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
      status: 'active'
    };

    setActiveCall(call);

    // Add to history
    setCallHistory(prev => [...prev, {
      ...call,
      status: 'started'
    }]);

    console.log('📞 Video call started:', call);
    return call;
  }, []);

  /**
   * End current call
   */
  const endCall = useCallback(() => {
    if (!activeCall) return;

    const endedCall = {
      ...activeCall,
      endedAt: new Date().toISOString(),
      status: 'ended',
      duration: Math.floor((new Date() - new Date(activeCall.startedAt)) / 1000)
    };

    // Update history
    setCallHistory(prev =>
      prev.map(call =>
        call.id === activeCall.id
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

    // Auto-dismiss after 30 seconds
    if (callNotificationRef.current) {
      clearTimeout(callNotificationRef.current);
    }

    callNotificationRef.current = setTimeout(() => {
      setIncomingCall(null);
    }, 30000);

    console.log('📞 Incoming call:', callData);
  }, []);

  /**
   * Accept incoming call
   */
  const acceptCall = useCallback(() => {
    if (!incomingCall) return;

    startCall(incomingCall);
    setIncomingCall(null);

    if (callNotificationRef.current) {
      clearTimeout(callNotificationRef.current);
    }
  }, [incomingCall, startCall]);

  /**
   * Reject incoming call
   */
  const rejectCall = useCallback(() => {
    if (!incomingCall) return;

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

  const value = {
    // State
    activeCall,
    incomingCall,
    callHistory,

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
