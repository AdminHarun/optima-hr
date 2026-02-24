/**
 * EmployeeDirectoryPanel - Calisan Rehberi Ana Paneli
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
  Collapse,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import RefreshIcon from '@mui/icons-material/Refresh';

import { useEmployeeDirectory } from '../../../hooks/useEmployeeDirectory';
import { EmployeeListItem, GroupedEmployeeList } from './EmployeeListItem';
import { DepartmentFilter, DepartmentChips } from './DepartmentFilter';

export function EmployeeDirectoryPanel({
  token,
  onStartDM,
  onClose,
  onEmployeeSelect,
  showHeader = true,
  height = '100%',
}) {
  const {
    employees,
    departments,
    employeesByDepartment,
    isLoading,
    error,
    searchQuery,
    selectedDepartment,
    showOnlineOnly,
    totalCount,
    searchEmployees,
    filterByDepartment,
    toggleOnlineFilter,
    startDM,
    refresh,
  } = useEmployeeDirectory(token);

  const [localSearch, setLocalSearch] = useState('');
  const [groupByDepartment, setGroupByDepartment] = useState(false);

  // Arama (debounced)
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setLocalSearch(value);

    // Debounce
    const timeout = setTimeout(() => {
      searchEmployees(value);
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchEmployees]);

  // Aramayi temizle
  const clearSearch = () => {
    setLocalSearch('');
    searchEmployees('');
  };

  // DM baslat
  const handleStartDM = async (employeeId) => {
    const result = await startDM(employeeId);
    if (result) {
      onStartDM?.(result);
    }
    return result;
  };

  // Online calisan sayisi
  const onlineCount = employees.filter(
    (e) => e.presence?.status === 'online' || e.presence?.status === 'away' || e.presence?.status === 'busy'
  ).length;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height,
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      {showHeader && (
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid var(--border-light)',
            backgroundColor: 'var(--bg-secondary)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PeopleIcon sx={{ color: 'var(--color-primary)' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Calisan Rehberi
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton size="small" onClick={refresh} disabled={isLoading}>
                <RefreshIcon fontSize="small" />
              </IconButton>
              {onClose && (
                <IconButton size="small" onClick={onClose}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Box>

          {/* Arama */}
          <TextField
            fullWidth
            size="small"
            placeholder="Calisan ara..."
            value={localSearch}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'var(--text-muted)' }} />
                </InputAdornment>
              ),
              endAdornment: localSearch && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={clearSearch}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              mb: 1.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: '8px',
                backgroundColor: 'white',
              },
            }}
          />

          {/* Departman Filtresi */}
          <DepartmentFilter
            departments={departments}
            selectedDepartment={selectedDepartment}
            onDepartmentChange={filterByDepartment}
          />
        </Box>
      )}

      {/* Filtreler ve Istatistikler */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          borderBottom: '1px solid var(--border-light)',
          backgroundColor: 'var(--bg-tertiary)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Online Filtresi */}
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={showOnlineOnly}
                onChange={toggleOnlineFilter}
                color="success"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FiberManualRecordIcon
                  sx={{ fontSize: 10, color: 'var(--presence-online)' }}
                />
                <Typography variant="caption">Sadece Online</Typography>
              </Box>
            }
            sx={{ m: 0 }}
          />

          {/* Gruplama */}
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={groupByDepartment}
                onChange={(e) => setGroupByDepartment(e.target.checked)}
              />
            }
            label={
              <Typography variant="caption">Departmana Gore</Typography>
            }
            sx={{ m: 0 }}
          />
        </Box>

        {/* Istatistikler */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <FiberManualRecordIcon sx={{ fontSize: 10, color: 'var(--presence-online)' }} />
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              {onlineCount}
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PersonIcon sx={{ fontSize: 14, color: 'var(--text-muted)' }} />
            <Typography variant="caption" sx={{ fontWeight: 500 }}>
              {totalCount}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Calisan Listesi */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 1.5,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'var(--border-medium)',
            borderRadius: 3,
          },
        }}
      >
        {isLoading && employees.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
            }}
          >
            <CircularProgress size={32} />
          </Box>
        ) : error ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
              color: 'error.main',
            }}
          >
            <Typography variant="body2">{error}</Typography>
            <Typography
              variant="caption"
              sx={{ color: 'var(--color-primary)', cursor: 'pointer', mt: 1 }}
              onClick={refresh}
            >
              Tekrar Dene
            </Typography>
          </Box>
        ) : employees.length === 0 ? (
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
            <PeopleIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
            <Typography variant="body2">
              {searchQuery
                ? 'Arama sonucu bulunamadi'
                : showOnlineOnly
                ? 'Online calisan yok'
                : 'Calisan bulunamadi'}
            </Typography>
          </Box>
        ) : groupByDepartment ? (
          <GroupedEmployeeList
            employeesByDepartment={employeesByDepartment}
            onStartDM={handleStartDM}
            onEmployeeClick={onEmployeeSelect}
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {employees.map((employee) => (
              <EmployeeListItem
                key={employee.id}
                employee={employee}
                onStartDM={handleStartDM}
                onClick={onEmployeeSelect}
              />
            ))}
          </Box>
        )}

        {/* Loading indicator (scroll) */}
        {isLoading && employees.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default EmployeeDirectoryPanel;
