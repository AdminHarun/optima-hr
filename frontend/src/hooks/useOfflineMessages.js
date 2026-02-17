/**
 * useOfflineMessages Hook
 * Task 1.6: Offline Messaging
 *
 * Handles:
 * - Fetching pending messages when user comes online
 * - Displaying unread count badge
 * - Push notification registration
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:9000';

const getSiteHeaders = () => {
  const currentSite = localStorage.getItem('optima_current_site') || 'FXB';
  return { 'X-Site-Id': currentSite };
};

export const useOfflineMessages = (wsConnection) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch pending messages count
  const fetchPendingCount = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/me/pending-messages/count`, {
        credentials: 'include',
        headers: getSiteHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setPendingCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching pending message count:', error);
    }
  }, []);

  // Fetch and deliver pending messages
  const fetchPendingMessages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/employees/me/pending-messages`, {
        credentials: 'include',
        headers: getSiteHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setPendingMessages(data.messages);
        setPendingCount(0); // Reset count after fetching
        return data.messages;
      }
    } catch (error) {
      console.error('Error fetching pending messages:', error);
    } finally {
      setLoading(false);
    }
    return [];
  }, []);

  // Register push notification token
  const registerPushToken = useCallback(async (token, platform = 'web') => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/me/push-token`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...getSiteHeaders()
        },
        body: JSON.stringify({ token, platform })
      });

      return response.ok;
    } catch (error) {
      console.error('Error registering push token:', error);
      return false;
    }
  }, []);

  // Unregister push notification token
  const unregisterPushToken = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/employees/me/push-token`, {
        method: 'DELETE',
        credentials: 'include',
        headers: getSiteHeaders()
      });

      return response.ok;
    } catch (error) {
      console.error('Error unregistering push token:', error);
      return false;
    }
  }, []);

  // Handle WebSocket pending messages notification
  useEffect(() => {
    if (!wsConnection) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'pending_messages_available') {
          setPendingCount(data.count);
          if (data.messages) {
            setPendingMessages(data.messages);
          }
        }
      } catch (error) {
        // Ignore parse errors
      }
    };

    wsConnection.addEventListener('message', handleMessage);

    return () => {
      wsConnection.removeEventListener('message', handleMessage);
    };
  }, [wsConnection]);

  // Fetch pending count on mount
  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  // Request notification permission and get FCM token (if available)
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('Notification permission granted');

      // Try to get FCM token if available
      // This requires Firebase to be set up
      // For now, we'll just return true
      return true;
    }

    return false;
  }, []);

  // Clear pending messages
  const clearPending = useCallback(() => {
    setPendingMessages([]);
    setPendingCount(0);
  }, []);

  return {
    pendingCount,
    pendingMessages,
    loading,
    fetchPendingCount,
    fetchPendingMessages,
    registerPushToken,
    unregisterPushToken,
    requestNotificationPermission,
    clearPending
  };
};

export default useOfflineMessages;
