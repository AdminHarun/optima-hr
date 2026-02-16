/**
 * OnlineStatusBadge - Online/Offline/Away/Busy durum gostergesi
 */

import React from 'react';
import { Tooltip } from '@mui/material';

const statusConfig = {
  online: {
    color: 'var(--presence-online)',
    label: 'Cevrimici',
  },
  offline: {
    color: 'var(--presence-offline)',
    label: 'Cevrimdisi',
  },
  away: {
    color: 'var(--presence-away)',
    label: 'Uzakta',
  },
  busy: {
    color: 'var(--presence-busy)',
    label: 'Mesgul',
  },
  dnd: {
    color: 'var(--presence-dnd)',
    label: 'Rahatsiz Etmeyin',
  },
};

export function OnlineStatusBadge({
  status = 'offline',
  size = 'medium',
  showTooltip = true,
  customStatus = null,
  className = '',
}) {
  const config = statusConfig[status] || statusConfig.offline;

  const sizeMap = {
    small: 8,
    medium: 12,
    large: 16,
  };

  const dotSize = sizeMap[size] || sizeMap.medium;

  const badge = (
    <span
      className={`tw-inline-block tw-rounded-full tw-border-2 tw-border-white tw-flex-shrink-0 ${className}`}
      style={{
        width: dotSize,
        height: dotSize,
        backgroundColor: config.color,
        boxShadow: status === 'online' ? `0 0 0 2px ${config.color}33` : undefined,
      }}
    />
  );

  if (!showTooltip) {
    return badge;
  }

  const tooltipContent = customStatus
    ? `${config.label} - ${customStatus}`
    : config.label;

  return (
    <Tooltip title={tooltipContent} placement="top" arrow>
      {badge}
    </Tooltip>
  );
}

/**
 * Avatar ile birlesik status badge
 */
export function AvatarWithStatus({
  src,
  alt,
  status = 'offline',
  size = 40,
  customStatus = null,
  onClick,
}) {
  const badgeSize = size <= 32 ? 'small' : size <= 48 ? 'medium' : 'large';

  return (
    <div
      className="tw-relative tw-inline-block tw-flex-shrink-0"
      style={{ width: size, height: size }}
      onClick={onClick}
    >
      {/* Avatar */}
      {src ? (
        <img
          src={src}
          alt={alt}
          className="tw-w-full tw-h-full tw-rounded-full tw-object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}

      {/* Fallback initials */}
      <div
        className="tw-w-full tw-h-full tw-rounded-full tw-bg-primary-100 tw-flex tw-items-center tw-justify-center tw-text-primary-600 tw-font-medium"
        style={{
          display: src ? 'none' : 'flex',
          fontSize: size * 0.4,
        }}
      >
        {alt?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
      </div>

      {/* Status Badge */}
      <div
        className="tw-absolute tw-bottom-0 tw-right-0"
        style={{
          transform: 'translate(25%, 25%)',
        }}
      >
        <OnlineStatusBadge
          status={status}
          size={badgeSize}
          customStatus={customStatus}
        />
      </div>
    </div>
  );
}

export default OnlineStatusBadge;
