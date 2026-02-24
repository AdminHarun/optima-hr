/**
 * DoubleCheckmark - WhatsApp tarzı mesaj durumu ikonu
 *
 * Durumlar:
 * - pending: Saat ikonu (beklemede)
 * - sent: Tek tik (gri)
 * - delivered: Çift tik (gri)
 * - read: Çift tik (mavi)
 * - failed: Ünlem ikonu (kırmızı)
 */

import React from 'react';
import { Tooltip } from '@mui/material';

// SVG ikonlari
const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
    <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
  </svg>
);

const SingleCheckIcon = () => (
  <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
    <path d="M14.354 0.354a.5.5 0 0 1 0 .707l-8 8a.5.5 0 0 1-.708 0L1.646 5.061a.5.5 0 1 1 .708-.708L6 8.001l7.646-7.647a.5.5 0 0 1 .708 0z"/>
  </svg>
);

const DoubleCheckIcon = () => (
  <svg width="20" height="11" viewBox="0 0 20 11" fill="currentColor">
    <path d="M14.354 0.354a.5.5 0 0 1 0 .707l-8 8a.5.5 0 0 1-.708 0L1.646 5.061a.5.5 0 1 1 .708-.708L6 8.001l7.646-7.647a.5.5 0 0 1 .708 0z"/>
    <path d="M18.354 0.354a.5.5 0 0 1 0 .707l-8 8a.5.5 0 0 1-.708 0l-1-1a.5.5 0 1 1 .708-.708l.646.647 7.646-7.646a.5.5 0 0 1 .708 0z"/>
  </svg>
);

const FailedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
    <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
  </svg>
);

// Durum konfigürasyonu
const statusConfig = {
  pending: {
    icon: ClockIcon,
    color: 'var(--check-sent)',
    label: 'Gonderiliyor...',
  },
  sent: {
    icon: SingleCheckIcon,
    color: 'var(--check-sent)',
    label: 'Gonderildi',
  },
  delivered: {
    icon: DoubleCheckIcon,
    color: 'var(--check-delivered)',
    label: 'Iletildi',
  },
  read: {
    icon: DoubleCheckIcon,
    color: 'var(--check-read)',
    label: 'Okundu',
  },
  failed: {
    icon: FailedIcon,
    color: '#ef4444',
    label: 'Gonderilemedi',
  },
};

export function DoubleCheckmark({
  status = 'sent',
  showTooltip = true,
  size = 'small',
  timestamp = null,
  className = '',
}) {
  const config = statusConfig[status] || statusConfig.sent;
  const Icon = config.icon;

  const sizeMap = {
    small: 14,
    medium: 16,
    large: 18,
  };

  const iconSize = sizeMap[size] || sizeMap.small;

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const checkmark = (
    <span
      className={`tw-inline-flex tw-items-center tw-gap-1 ${className}`}
      style={{ color: config.color }}
    >
      {timestamp && (
        <span
          className="tw-text-xs tw-opacity-70"
          style={{ fontSize: iconSize - 4 }}
        >
          {formatTime(timestamp)}
        </span>
      )}
      <span style={{ width: iconSize, height: iconSize }}>
        <Icon />
      </span>
    </span>
  );

  if (!showTooltip) {
    return checkmark;
  }

  return (
    <Tooltip title={config.label} placement="top" arrow>
      {checkmark}
    </Tooltip>
  );
}

/**
 * Mesaj baloncugu icin status bar
 */
export function MessageStatusBar({
  status,
  timestamp,
  isEdited = false,
  className = '',
}) {
  return (
    <div
      className={`tw-flex tw-items-center tw-justify-end tw-gap-1 tw-mt-1 ${className}`}
    >
      {isEdited && (
        <span className="tw-text-xs tw-opacity-50 tw-italic">duzenlendi</span>
      )}
      <DoubleCheckmark
        status={status}
        timestamp={timestamp}
        size="small"
      />
    </div>
  );
}

export default DoubleCheckmark;
