import React from 'react';
import { useElectron } from '../../hooks/useElectron';
import { Box, Typography } from '@mui/material';

const ElectronTitleBar = () => {
    const { isElectron, platform } = useElectron();

    if (!isElectron) return null;

    // Mac: Traffic lights are inset (top-left). We need a drag region.
    // Windows: If we used frame: false, we'd need controls. 
    // Current plan: Windows uses standard frame for safety, so no custom bar needed there yet (or minimal).
    // But for Mac, hiddenInset logic requires a drag region.

    // Mac Style
    if (platform === 'darwin') {
        return (
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '32px',
                    zIndex: 9999,
                    WebkitAppRegion: 'drag', // Electron drag
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto', // Allow dragging
                    // Background can be transparent or match sidebar
                }}
            >
                {/* Title (Optional) */}
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                    Optima HR
                </Typography>
            </Box>
        );
    }

    // Windows/Linux (Standard Frame currently, so we don't need a drag region overwriting the native bar)
    return null;
};

export default ElectronTitleBar;
