// Adapted from Rocket.Chat MessageList.tsx
// Converted to Material-UI for Optima with date separators and sequential grouping
import React, { memo, useRef, useEffect, useCallback, useState } from 'react';
import { Box, Divider, Typography, CircularProgress } from '@mui/material';
import RoomMessage from './RoomMessage';
import CallStatusMessage from './CallStatusMessage';
import webSocketService from '../../services/webSocketService';

/**
 * Message List Component - Renders messages with date separators
 * Rocket.Chat pattern: Sequential grouping + date separators
 */
const MessageList = ({
  messages = [],
  currentUserId,
  currentUserType = 'admin',
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
  onReactionMessage,
  onForwardMessage,
  onPinMessage,
  onCopyMessage,
  onNameClick,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  isDark = false
}) => {
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const isUserNearBottomRef = useRef(true);
  const observedMessagesRef = useRef(new Set());
  const intersectionObserverRef = useRef(null);
  const loadMoreTriggeredRef = useRef(false);

  // Check if user is near bottom (within 100px)
  const checkIfNearBottom = useCallback(() => {
    const list = messageListRef.current;
    if (!list) return true;

    const threshold = 100;
    const position = list.scrollTop + list.clientHeight;
    const height = list.scrollHeight;

    return position >= height - threshold;
  }, []);

  // Handle scroll event to track user position and trigger load more
  const handleScroll = useCallback(() => {
    isUserNearBottomRef.current = checkIfNearBottom();

    // Infinite scroll: load more when scrolled near top
    const list = messageListRef.current;
    if (list && list.scrollTop < 80 && hasMore && !isLoadingMore && !loadMoreTriggeredRef.current && onLoadMore) {
      loadMoreTriggeredRef.current = true;
      const prevScrollHeight = list.scrollHeight;
      onLoadMore().then(() => {
        // Maintain scroll position after prepending older messages
        requestAnimationFrame(() => {
          if (messageListRef.current) {
            const newScrollHeight = messageListRef.current.scrollHeight;
            messageListRef.current.scrollTop = newScrollHeight - prevScrollHeight;
          }
          loadMoreTriggeredRef.current = false;
        });
      }).catch(() => {
        loadMoreTriggeredRef.current = false;
      });
    }
  }, [checkIfNearBottom, hasMore, isLoadingMore, onLoadMore]);

  // Auto-scroll to bottom when new messages arrive (only if user is at bottom)
  const scrollToBottom = useCallback((force = false) => {
    if (force || isUserNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Scroll on new messages - only if user is near bottom
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    const isInitialLoad = prevMessagesLengthRef.current === 0 && messages.length > 0;

    if (isInitialLoad) {
      // Force scroll on initial load - with delay to ensure DOM is ready
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    } else if (isNewMessage && isUserNearBottomRef.current) {
      // Only scroll if user is near bottom
      scrollToBottom(false);
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages, scrollToBottom]);

  // Send read receipts for visible messages - WhatsApp/Telegram style
  useEffect(() => {
    // Create Intersection Observer
    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        const visibleMessageIds = [];

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const messageId = entry.target.getAttribute('data-message-id');
            const messageStatus = entry.target.getAttribute('data-message-status');
            const senderType = entry.target.getAttribute('data-sender-type');

            // Only mark messages that:
            // 1. Are from other users (not current user)
            // 2. Haven't been marked as read yet
            // 3. Have a valid message_id
            if (
              messageId &&
              senderType !== currentUserType &&
              messageStatus !== 'read' &&
              !observedMessagesRef.current.has(messageId)
            ) {
              visibleMessageIds.push(messageId);
              observedMessagesRef.current.add(messageId);
            }
          }
        });

        // Send read receipt for newly visible messages
        if (visibleMessageIds.length > 0) {
          console.log('📖 Sending read receipts for:', visibleMessageIds.length, 'messages');
          webSocketService.sendReadReceipt(visibleMessageIds);
        }
      },
      {
        root: messageListRef.current,
        rootMargin: '0px',
        threshold: 0.5 // Message must be 50% visible
      }
    );

    // Observe all message elements
    const messageElements = document.querySelectorAll('[data-message-id]');
    messageElements.forEach((element) => {
      intersectionObserverRef.current?.observe(element);
    });

    // Cleanup
    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, [messages, currentUserType]);

  // Clear observed messages when messages change significantly (e.g., room change)
  useEffect(() => {
    observedMessagesRef.current.clear();
  }, [messages.length === 0]);

  // Check if two messages should be grouped sequentially
  // Rocket.Chat pattern: Same sender + within 5 minutes
  const shouldBeSequential = (currentMsg, previousMsg) => {
    if (!previousMsg) return false;

    // Different sender → not sequential
    if (currentMsg.sender_type !== previousMsg.sender_type) return false;

    // Check time difference (5 minutes threshold)
    const timeDiff = new Date(currentMsg.created_at) - new Date(previousMsg.created_at);
    if (timeDiff > 5 * 60 * 1000) return false; // 5 minutes

    return true;
  };

  // Check if we need a date separator between messages
  const needsDateSeparator = (currentMsg, previousMsg) => {
    if (!previousMsg) return true; // First message always gets a separator

    const currentDate = new Date(currentMsg.created_at).toDateString();
    const previousDate = new Date(previousMsg.created_at).toDateString();

    return currentDate !== previousDate;
  };

  // Format date for separator
  const formatDateSeparator = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Bugün';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Dün';
    } else {
      return messageDate.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  // Date Separator Component - Slack Style (line + date + line)
  const DateSeparator = ({ date }) => (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        my: 3,
        px: 3
      }}
    >
      <Box sx={{ flex: 1, height: '1px', bgcolor: isDark ? '#35373B' : '#e5e7eb' }} />
      <Typography
        variant="caption"
        sx={{
          fontSize: '12px',
          fontWeight: 600,
          color: isDark ? '#ABABAD' : '#6b7280',
          px: 2,
          bgcolor: isDark ? '#1A1D21' : '#ffffff',
          whiteSpace: 'nowrap'
        }}
      >
        {formatDateSeparator(date)}
      </Typography>
      <Box sx={{ flex: 1, height: '1px', bgcolor: isDark ? '#35373B' : '#e5e7eb' }} />
    </Box>
  );

  // System Message Component (Rocket.Chat pattern)
  const SystemMessage = ({ message }) => (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        py: 1,
        px: 2
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.75rem',
          color: '#6c757d',
          fontStyle: 'italic',
          textAlign: 'center',
          backgroundColor: 'rgba(139, 185, 74, 0.1)',
          border: '1px dashed rgba(139, 185, 74, 0.3)',
          px: 2.5,
          py: 0.75,
          borderRadius: 2
        }}
      >
        {message.content}
      </Typography>
    </Box>
  );

  // Render messages with separators and sequential grouping
  const renderMessages = () => {
    return messages.map((message, index) => {
      const previousMessage = index > 0 ? messages[index - 1] : null;
      const sequential = shouldBeSequential(message, previousMessage);
      const showDateSeparator = needsDateSeparator(message, previousMessage);

      // Check if message is from current user
      const isOwnMessage =
        (message.sender_type === currentUserType) ||
        (message.sender_type === 'admin' && currentUserType === 'admin') ||
        (message.is_own_message === true);

      return (
        <React.Fragment key={message.id || message.message_id || index}>
          {/* Date Separator */}
          {showDateSeparator && <DateSeparator date={message.created_at} />}

          {/* System Message, Call Status, or Regular Message */}
          {message.sender_type === 'system' ? (
            // Check if it's a call status message
            message.content && (
              message.content.includes('Arama') ||
              message.content.includes('arama') ||
              message.content.includes('Call') ||
              message.content.includes('call') ||
              message.content.includes('Cevapsız') ||
              message.content.includes('Missed')
            ) ? (
              <CallStatusMessage message={message} />
            ) : (
              <SystemMessage message={message} />
            )
          ) : (
            <RoomMessage
              message={message}
              sequential={sequential}
              isOwnMessage={isOwnMessage}
              currentUserType={currentUserType}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
              onReply={onReplyMessage}
              onReaction={onReactionMessage}
              onForward={onForwardMessage}
              onPin={onPinMessage}
              onCopy={onCopyMessage}
              onNameClick={() => onNameClick?.(message)}
            />
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <Box
      ref={messageListRef}
      onScroll={handleScroll}
      sx={{
        flex: 1,
        overflowY: 'auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        // Solid background (no wallpaper)
        bgcolor: isDark ? '#1A1D21' : '#ffffff',
        // Smooth scrolling
        scrollBehavior: 'smooth',
        // Custom scrollbar styling
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: isDark ? '#35373B' : '#d1d5db',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: isDark ? '#4A4D52' : '#9ca3af',
          },
        },
      }}
    >
      {/* Empty state */}
      {messages.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4
          }}
        >
          <Typography variant="body2" sx={{ color: isDark ? '#ABABAD' : 'text.secondary' }}>
            Henüz mesaj yok. İlk mesajı gönderin!
          </Typography>
        </Box>
      ) : (
        <>
          {/* Load more indicator */}
          {isLoadingMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} sx={{ color: '#1c61ab' }} />
            </Box>
          )}

          {/* Messages - demo: .messages-container padding: 24px */}
          <Box sx={{ p: 3 }}>
            {renderMessages()}
          </Box>

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </>
      )}
    </Box>
  );
};

export default memo(MessageList);
