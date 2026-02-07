// Site Selector - Confluence tarzı site seçici
import React, { useState } from 'react';
import { Box, Menu, MenuItem, Typography, Chip } from '@mui/material';
import { KeyboardArrowDown as ArrowDownIcon } from '@mui/icons-material';
import { useSite } from '../../contexts/SiteContext';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';

function SiteSelector() {
  const { currentSite, sites, changeSite } = useSite();
  const { currentUser } = useEmployeeAuth();
  const [anchorEl, setAnchorEl] = useState(null);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const handleClick = (event) => {
    if (!isSuperAdmin) return;
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSiteChange = (siteCode) => {
    changeSite(siteCode);
    handleClose();
  };

  return (
    <>
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 2,
          py: 0.5,
          borderRadius: '8px',
          cursor: isSuperAdmin ? 'pointer' : 'default',
          background: 'rgba(255, 255, 255, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          transition: 'all 0.2s ease',
          '&:hover': isSuperAdmin ? {
            background: 'rgba(255, 255, 255, 0.25)',
            transform: 'translateY(-1px)'
          } : {}
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: 'white',
            fontWeight: 600,
            fontSize: '0.9rem'
          }}
        >
          {currentSite.name}
        </Typography>
        {isSuperAdmin && <ArrowDownIcon sx={{ color: 'white', fontSize: 18 }} />}
      </Box>

      {isSuperAdmin && (
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            sx: {
              mt: 1,
              minWidth: 200,
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(28, 97, 171, 0.1)',
              boxShadow: '0 8px 32px rgba(28, 97, 171, 0.2)'
            }
          }}
        >
          {sites.map((site) => (
            <MenuItem
              key={site.code}
              onClick={() => handleSiteChange(site.code)}
              selected={site.code === currentSite.code}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 1.5
              }}
            >
              <Typography variant="body2" fontWeight={site.code === currentSite.code ? 600 : 400}>
                {site.name}
              </Typography>
              {site.code === currentSite.code && (
                <Chip
                  label="Aktif"
                  size="small"
                  color="primary"
                  sx={{ height: 20, fontSize: '10px' }}
                />
              )}
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
}

export default SiteSelector;
