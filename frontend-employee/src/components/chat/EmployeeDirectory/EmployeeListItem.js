/**
 * EmployeeListItem - Calisan listesi satiri
 */

import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { AvatarWithStatus } from './OnlineStatusBadge';
import { QuickDMButton } from './QuickDMButton';

// Departman renkleri
const departmentColors = {
  CHAT: '#3b82f6',
  FOLLOW_UP: '#8b5cf6',
  WITHDRAWAL: '#ef4444',
  SUPPORT: '#22c55e',
  SALES: '#f59e0b',
  ACCOUNTING: '#06b6d4',
  HR: '#ec4899',
  IT: '#6366f1',
  MARKETING: '#f97316',
  FINANCE: '#14b8a6',
  OPERATIONS: '#84cc16',
  ADMIN: '#64748b',
};

export function EmployeeListItem({
  employee,
  onStartDM,
  onClick,
  isSelected = false,
  showDepartment = true,
  showPosition = true,
  compact = false,
}) {
  const {
    id,
    fullName,
    firstName,
    lastName,
    email,
    department,
    position,
    jobTitle,
    profilePicture,
    presence = { status: 'offline' },
  } = employee;

  const displayName = fullName || `${firstName} ${lastName}`;
  const deptColor = departmentColors[department] || '#64748b';

  const handleClick = () => {
    onClick?.(employee);
  };

  const handleStartDM = async (employeeId) => {
    const result = await onStartDM?.(employeeId);
    return result;
  };

  if (compact) {
    return (
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 1,
          borderRadius: '8px',
          cursor: 'pointer',
          backgroundColor: isSelected ? 'var(--color-primary)' : 'transparent',
          color: isSelected ? 'white' : 'inherit',
          '&:hover': {
            backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--bg-tertiary)',
          },
          transition: 'all 0.15s ease',
        }}
      >
        <AvatarWithStatus
          src={profilePicture}
          alt={displayName}
          status={presence.status}
          size={32}
        />

        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {displayName}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        borderRadius: '12px',
        cursor: 'pointer',
        backgroundColor: isSelected ? 'rgba(28, 97, 171, 0.08)' : 'transparent',
        borderLeft: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent',
        '&:hover': {
          backgroundColor: 'var(--bg-tertiary)',
        },
        transition: 'all 0.15s ease',
      }}
    >
      {/* Avatar */}
      <AvatarWithStatus
        src={profilePicture}
        alt={displayName}
        status={presence.status}
        customStatus={presence.customStatus}
        size={44}
      />

      {/* Bilgiler */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Isim */}
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'var(--text-primary)',
          }}
        >
          {displayName}
        </Typography>

        {/* Pozisyon */}
        {showPosition && jobTitle && (
          <Typography
            variant="caption"
            sx={{
              color: 'var(--text-secondary)',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {jobTitle}
          </Typography>
        )}

        {/* Departman */}
        {showDepartment && department && (
          <Chip
            label={department}
            size="small"
            sx={{
              height: 18,
              fontSize: 10,
              mt: 0.5,
              backgroundColor: `${deptColor}15`,
              color: deptColor,
              fontWeight: 500,
              '& .MuiChip-label': { px: 1 },
            }}
          />
        )}

        {/* Custom Status */}
        {presence.customStatus && (
          <Typography
            variant="caption"
            sx={{
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 0.5,
              fontStyle: 'italic',
            }}
          >
            {presence.statusEmoji} {presence.customStatus}
          </Typography>
        )}
      </Box>

      {/* DM Butonu */}
      {onStartDM && (
        <QuickDMButton
          employeeId={id}
          employeeName={displayName}
          onStartDM={handleStartDM}
        />
      )}
    </Box>
  );
}

/**
 * Gruplu calisan listesi (departmana gore)
 */
export function GroupedEmployeeList({
  employeesByDepartment,
  onStartDM,
  onEmployeeClick,
  selectedEmployeeId,
}) {
  const departments = Object.keys(employeesByDepartment).sort();

  if (departments.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          color: 'var(--text-muted)',
        }}
      >
        <Typography variant="body2">Calisan bulunamadi</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {departments.map((dept) => (
        <Box key={dept}>
          {/* Departman Basligi */}
          <Typography
            variant="overline"
            sx={{
              color: 'var(--text-muted)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1,
              mb: 0.5,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: departmentColors[dept] || '#64748b',
              }}
            />
            {dept} ({employeesByDepartment[dept].length})
          </Typography>

          {/* Calisanlar */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {employeesByDepartment[dept].map((employee) => (
              <EmployeeListItem
                key={employee.id}
                employee={employee}
                onStartDM={onStartDM}
                onClick={onEmployeeClick}
                isSelected={employee.id === selectedEmployeeId}
                showDepartment={false}
              />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export default EmployeeListItem;
