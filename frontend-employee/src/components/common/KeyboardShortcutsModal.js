import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    Typography,
    Box,
    IconButton
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { shortcuts } from '../../hooks/useKeyboardShortcuts';

const KeyboardShortcutsModal = ({ open, onClose }) => {
    const formatKey = (combo) => {
        return combo
            .split('+')
            .map(key => {
                if (key === 'ctrl') return '⌘/Ctrl';
                if (key === 'shift') return 'Shift';
                if (key === 'alt') return 'Alt';
                return key.toUpperCase();
            })
            .join(' + ');
    };

    // Group shortcuts by category (inferred from action capability or manual grouping)
    const groupedShortcuts = Object.entries(shortcuts).reduce((acc, [combo, { action, description }]) => {
        let category = 'Diğer';
        if (action.startsWith('open') || action.startsWith('toggle')) category = 'Navigasyon';
        else if (action.startsWith('new') || action.startsWith('send')) category = 'Eylemler';
        else if (action.includes('Modal') || action.includes('show')) category = 'Genel';

        if (!acc[category]) acc[category] = [];
        acc[category].push({ combo, description });
        return acc;
    }, {});

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #f7fafc 100%)'
                }
            }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#2d3748' }}>
                    Klavye Kısayolları
                </Typography>
                <IconButton onClick={onClose} size="small">
                    <Close />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pb: 4 }}>
                {Object.entries(groupedShortcuts).map(([category, items]) => (
                    <Box key={category} sx={{ mb: 3 }}>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                color: '#718096',
                                fontWeight: 600,
                                mb: 1.5,
                                textTransform: 'uppercase',
                                fontSize: '0.75rem',
                                letterSpacing: '0.5px'
                            }}
                        >
                            {category}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {items.map(({ combo, description }) => (
                                <Box
                                    key={combo}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        p: 1,
                                        borderRadius: '8px',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' }
                                    }}
                                >
                                    <Typography variant="body2" sx={{ color: '#4a5568' }}>
                                        {description}
                                    </Typography>
                                    <Box
                                        component="kbd"
                                        sx={{
                                            px: 1,
                                            py: 0.5,
                                            bgcolor: '#edf2f7',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: '#4a5568',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                            fontFamily: 'Monaco, monospace'
                                        }}
                                    >
                                        {formatKey(combo)}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                ))}
            </DialogContent>
        </Dialog>
    );
};

export default KeyboardShortcutsModal;
