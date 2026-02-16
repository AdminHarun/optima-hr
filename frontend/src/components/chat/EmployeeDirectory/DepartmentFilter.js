/**
 * DepartmentFilter - Departman filtreleme componenti
 */

import React from 'react';
import {
  FormControl,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

export function DepartmentFilter({
  departments = [],
  selectedDepartment,
  onDepartmentChange,
  showCounts = true,
}) {
  return (
    <FormControl fullWidth size="small">
      <Select
        value={selectedDepartment || ''}
        onChange={(e) => onDepartmentChange(e.target.value || null)}
        displayEmpty
        sx={{
          backgroundColor: 'white',
          borderRadius: '8px',
          '& .MuiSelect-select': {
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          },
        }}
      >
        <MenuItem value="">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessIcon fontSize="small" sx={{ color: 'var(--color-secondary)' }} />
            <Typography>Tum Departmanlar</Typography>
          </Box>
        </MenuItem>

        {departments.map((dept) => (
          <MenuItem key={dept.name} value={dept.name}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon fontSize="small" sx={{ color: 'var(--color-primary)' }} />
                <Typography>{dept.name}</Typography>
              </Box>

              {showCounts && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {/* Online sayisi */}
                  {dept.onlineCount > 0 && (
                    <Chip
                      size="small"
                      icon={
                        <FiberManualRecordIcon
                          sx={{ fontSize: 8, color: 'var(--presence-online) !important' }}
                        />
                      }
                      label={dept.onlineCount}
                      sx={{
                        height: 20,
                        fontSize: 11,
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        color: 'var(--presence-online)',
                      }}
                    />
                  )}

                  {/* Toplam sayisi */}
                  <Chip
                    size="small"
                    icon={<PeopleIcon sx={{ fontSize: 12 }} />}
                    label={dept.employeeCount}
                    sx={{
                      height: 20,
                      fontSize: 11,
                      backgroundColor: 'var(--bg-tertiary)',
                    }}
                  />
                </Box>
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

/**
 * Departman chip'leri (yatay scroll)
 */
export function DepartmentChips({
  departments = [],
  selectedDepartment,
  onDepartmentChange,
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        pb: 1,
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'var(--border-medium)',
          borderRadius: 2,
        },
      }}
    >
      <Chip
        label="Tumu"
        size="small"
        onClick={() => onDepartmentChange(null)}
        sx={{
          backgroundColor: !selectedDepartment ? 'var(--color-primary)' : 'var(--bg-tertiary)',
          color: !selectedDepartment ? 'white' : 'var(--text-primary)',
          fontWeight: 500,
          '&:hover': {
            backgroundColor: !selectedDepartment
              ? 'var(--color-primary-dark)'
              : 'var(--border-light)',
          },
        }}
      />

      {departments.map((dept) => (
        <Chip
          key={dept.name}
          label={`${dept.name} (${dept.employeeCount})`}
          size="small"
          onClick={() => onDepartmentChange(dept.name)}
          sx={{
            backgroundColor:
              selectedDepartment === dept.name ? 'var(--color-primary)' : 'var(--bg-tertiary)',
            color: selectedDepartment === dept.name ? 'white' : 'var(--text-primary)',
            fontWeight: 500,
            flexShrink: 0,
            '&:hover': {
              backgroundColor:
                selectedDepartment === dept.name
                  ? 'var(--color-primary-dark)'
                  : 'var(--border-light)',
            },
          }}
        />
      ))}
    </Box>
  );
}

export default DepartmentFilter;
