// Site Selector - Modern & Stylish Design
import React, { useState } from 'react';
import {
  Box,
  Menu,
  MenuItem,
  Typography,
  Chip,
  Avatar,
  Divider,
  ListItemIcon,
  ListItemText,
  alpha,
  Fade
} from '@mui/material';
import {
  KeyboardArrowDown as ArrowDownIcon,
  Business as BusinessIcon,
  Check as CheckIcon,
  Circle as CircleIcon,
  SwapHoriz as SwapIcon
} from '@mui/icons-material';
import { useSite } from '../../contexts/SiteContext';
import { useEmployeeAuth } from '../../auth/employee/EmployeeAuthContext';

// Optima Colors
const COLORS = {
  primary: '#1c61ab',
  secondary: '#8bb94a',
  gradient: 'linear-gradient(135deg, #1c61ab 0%, #2d7bcc 50%, #8bb94a 100%)',
};

function SiteSelector() {
  const { currentSite, sites, changeSite } = useSite();
  const { currentUser } = useEmployeeAuth();
  const [anchorEl, setAnchorEl] = useState(null);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const open = Boolean(anchorEl);

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

  // Get site color or default
  const getSiteColor = (site) => site?.color || COLORS.primary;

  // Get initials from site name
  const getSiteInitials = (name) => {
    if (!name) return 'S';
    const words = name.split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Trigger Button */}
      <Box
        onClick={handleClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1,
          borderRadius: 2.5,
          cursor: isSuperAdmin ? 'pointer' : 'default',
          background: 'rgba(255, 255, 255, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': isSuperAdmin ? {
            background: 'rgba(255, 255, 255, 0.22)',
            borderColor: 'rgba(255, 255, 255, 0.35)',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
          } : {}
        }}
      >
        {/* Site Avatar */}
        <Avatar
          sx={{
            width: 32,
            height: 32,
            fontSize: 12,
            fontWeight: 700,
            background: 'rgba(255, 255, 255, 0.2)',
            color: '#fff',
            border: '2px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          {getSiteInitials(currentSite?.name)}
        </Avatar>

        {/* Site Info */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.65rem',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              lineHeight: 1
            }}
          >
            Aktif Site
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#fff',
              fontWeight: 600,
              fontSize: '0.9rem',
              lineHeight: 1.2
            }}
          >
            {currentSite?.name || 'Site Seç'}
          </Typography>
        </Box>

        {/* Arrow Icon */}
        {isSuperAdmin && (
          <ArrowDownIcon
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: 20,
              transition: 'transform 0.3s ease',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          />
        )}
      </Box>

      {/* Dropdown Menu */}
      {isSuperAdmin && (
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          TransitionComponent={Fade}
          transitionDuration={200}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          PaperProps={{
            elevation: 0,
            sx: {
              mt: 1.5,
              minWidth: 280,
              maxWidth: 320,
              borderRadius: 3,
              background: '#fff',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 25px rgba(28, 97, 171, 0.12)',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: COLORS.gradient
              }
            }
          }}
        >
          {/* Header */}
          <Box sx={{ px: 2.5, py: 2, bgcolor: alpha(COLORS.primary, 0.03) }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SwapIcon sx={{ color: COLORS.primary, fontSize: 20 }} />
              <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                Site Değiştir
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {sites.length} site mevcut
            </Typography>
          </Box>

          <Divider />

          {/* Site List */}
          <Box sx={{ py: 1, maxHeight: 320, overflow: 'auto' }}>
            {sites.map((site, index) => {
              const isActive = site.code === currentSite?.code;
              const siteColor = getSiteColor(site);

              return (
                <MenuItem
                  key={site.code}
                  onClick={() => handleSiteChange(site.code)}
                  selected={isActive}
                  sx={{
                    mx: 1,
                    my: 0.5,
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    bgcolor: isActive ? alpha(COLORS.primary, 0.08) : 'transparent',
                    '&:hover': {
                      bgcolor: isActive ? alpha(COLORS.primary, 0.12) : alpha(COLORS.primary, 0.05),
                      transform: 'translateX(4px)'
                    },
                    '&.Mui-selected': {
                      bgcolor: alpha(COLORS.primary, 0.08),
                      '&:hover': {
                        bgcolor: alpha(COLORS.primary, 0.12)
                      }
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 44 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        fontSize: 13,
                        fontWeight: 700,
                        background: `linear-gradient(135deg, ${siteColor}, ${alpha(siteColor, 0.7)})`,
                        color: '#fff',
                        boxShadow: `0 2px 8px ${alpha(siteColor, 0.4)}`
                      }}
                    >
                      {getSiteInitials(site.name)}
                    </Avatar>
                  </ListItemIcon>

                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? COLORS.primary : 'text.primary'
                        }}
                      >
                        {site.name}
                      </Typography>
                    }
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                        <Chip
                          label={site.code}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            bgcolor: alpha(siteColor, 0.1),
                            color: siteColor,
                            '& .MuiChip-label': { px: 1 }
                          }}
                        />
                        {site.isActive !== false && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            <CircleIcon sx={{ fontSize: 6, color: '#4caf50' }} />
                            <Typography variant="caption" sx={{ color: '#4caf50', fontSize: '0.6rem' }}>
                              Aktif
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    }
                  />

                  {isActive && (
                    <CheckIcon
                      sx={{
                        color: COLORS.primary,
                        fontSize: 20,
                        ml: 1
                      }}
                    />
                  )}
                </MenuItem>
              );
            })}
          </Box>

          {/* Footer */}
          <Divider />
          <Box sx={{ px: 2.5, py: 1.5, bgcolor: alpha(COLORS.primary, 0.02) }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              💡 Site değiştirmek tüm verileri günceller
            </Typography>
          </Box>
        </Menu>
      )}
    </>
  );
}

export default SiteSelector;
